import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ENTRAIDE_FILTER_CATEGORIES, MISSION_CATEGORY_LABEL, missionCategoryLabel } from "@/lib/missionCategories";
import { fetchAllRows } from "@/lib/admin/fetchAllRows";
import { createSeqGuard } from "@/lib/admin/requestSeq";
import { buildCsv, downloadCsv, TRUNCATED_NOTICE } from "@/lib/admin/csv";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Search, Archive, Trash2, Eye, RotateCcw, Mail, AlertTriangle, ArrowUpDown, Download, Send, Info, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ErrorState } from "@/components/admin/ui";
import DossierDetailSheet from "@/components/admin/DossierDetailSheet";
import { missionSituation } from "@/lib/admin/listingSituation";
import { proximityBlockReason } from "@/lib/admin/missionDiffusion";
import { loadNotifiedCounts, NOTIFIED_SCOPE } from "@/lib/admin/missionNotified";
import { useNavigate, useSearchParams } from "react-router-dom";
import ProximityCampaignCard from "@/components/admin/mass-email/ProximityCampaignCard";
import { avatarImageUrl } from "@/lib/storageImage";

// Audit du 10/10/2026 : situation humaine, clôtures équipe et automatiques distinguées.
function resolveStatusBadge(m: any) {
  const sx = missionSituation(m);
  return { label: sx.label, variant: sx.tone, detail: sx.detail };
}

const MISSION_STATUSES = ["open", "in_progress", "completed", "cancelled"];

/** Libellés catégories : miroir de la source unique, jamais de valeur brute anglaise. */
const categoryLabels: Record<string, string> = MISSION_CATEGORY_LABEL as Record<string, string>;

const PAGE_SIZE = 25;
const RESPONSE_CHUNK = 200;
// view_count = vues uniques (hors auteur, 1 par session) : libellé unifié partout.
const VIEWS_LABEL = "Vues uniques";
const VIEWS_HINT = "Vues uniques (hors auteur, 1 par session)";
// Detect money mentions, symbol/word boundary based, lower false positives
const moneyPattern = /(\d+\s*€|€\s*\d+|\beuros?\b|\brémunér|\brémuner|\bremuner|\bsalaire\b|\btarif\b|\bpayer\b|\bpaiement\b|\bcash\b|\bespèces?\b)/i;

type SortKey = "created_at" | "view_count" | "response_count";

/** Indicateurs des projets participatifs, calculés par `admin_projet_kpis`. */
type ProjetKpis = {
  published: number;
  open: number;
  median_responses: number | null;
  median_days_first_response: number | null;
  zero_response_14d: { id: string; title: string; slug: string | null; created_at: string }[];
  closed_count: number;
  closed_filled: number;
  cross_members: number;
};

async function logAdminAction(action: string, targetId: string, metadata?: Record<string, unknown>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("admin_action_logs").insert({
    admin_id: user.id,
    action,
    target_type: "small_mission",
    target_id: targetId,
    metadata: (metadata ?? null) as any,
  });
}

const AdminSmallMissions = () => {
  const navigate = useNavigate();
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: "entraide" | "projets" = searchParams.get("tab") === "projets" ? "projets" : "entraide";
  const [filterCategory, setFilterCategory] = useState(() => (tab === "projets" ? "projet" : "all"));
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [responseCounts, setResponseCounts] = useState<Record<string, number>>({});
  const [responseCountsReady, setResponseCountsReady] = useState(false);
  const [missionsTruncated, setMissionsTruncated] = useState(false);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [proximityMission, setProximityMission] = useState<{ id: string; title: string } | null>(null);
  const [contactMission, setContactMission] = useState<any | null>(null);
  const [contactReason, setContactReason] = useState("");
  const [contactSending, setContactSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [responseError, setResponseError] = useState<string | null>(null);
  const [notifiedError, setNotifiedError] = useState<string | null>(null);
  const [notifiedNonce, setNotifiedNonce] = useState(0);
  const [responseNonce, setResponseNonce] = useState(0);
  const [detailMission, setDetailMission] = useState<any | null>(null);
  // Onglet courant, lu dans l'URL pour que le menu latéral puisse pointer
  // directement sur les projets. Les projets participatifs ont leurs propres
  // indicateurs, et la liste est la même, filtrée sur la catégorie côté serveur.
  const [projetKpis, setProjetKpis] = useState<ProjetKpis | null>(null);
  // Diffusion différée : le premier projet d'un porteur attend douze heures
  // avant d'être annoncé aux membres. L'administration peut l'avancer.
  const [releasingId, setReleasingId] = useState<string | null>(null);
  // Destinataires réellement prévenus, par publication. C'est ce qui explique
  // les zéro réponse : sans notifiés, il n'y a rien à convertir.
  const [notifiedCounts, setNotifiedCounts] = useState<Record<string, number> | null>(null);

  // Destinataires réellement prévenus, toutes sources d'envoi réussi lisibles.
  useEffect(() => {
    let cancelled = false;
    setNotifiedError(null);
    setNotifiedCounts(null);
    loadNotifiedCounts()
      .then((c) => { if (!cancelled) setNotifiedCounts(c); })
      .catch((e) => { if (!cancelled) { setNotifiedCounts(null); setNotifiedError(e?.message || "lecture refusée"); } });
    return () => { cancelled = true; };
  }, [notifiedNonce]);

  // Indicateurs des projets, calculés en base : les candidatures aux gardes
  // vivent dans `applications`, table que l'administration ne lit pas en
  // direct, le croisement passe donc par une fonction réservée aux admins.
  useEffect(() => {
    if (tab !== "projets") return;
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any).rpc("admin_projet_kpis");
      if (error) {
        toast.error("Indicateurs projets indisponibles");
        return;
      }
      if (!cancelled) setProjetKpis(data as ProjetKpis);
    })();
    return () => { cancelled = true; };
  }, [tab]);

  const switchTab = (next: "entraide" | "projets") => {
    setPage(0);
    setFilterCategory(next === "projets" ? "projet" : "all");
    setRenderedTab(next);
    const params = new URLSearchParams(searchParams);
    if (next === "projets") params.set("tab", "projets");
    else params.delete("tab");
    setSearchParams(params, { replace: true });
  };

  // Changement d'URL externe (menu latéral, historique) : on réaligne la
  // catégorie dans le même rendu, sans effet ni second fetch.
  const [renderedTab, setRenderedTab] = useState(tab);
  if (renderedTab !== tab) {
    setRenderedTab(tab);
    setFilterCategory(tab === "projets" ? "projet" : "all");
    setPage(0);
  }

  const missionsSeq = useRef(createSeqGuard());
  const fetchMissions = useCallback(async () => {
    const token = missionsSeq.current.next();
    setLoading(true);
    const buildQuery = () => {
      let query = supabase
        .from("small_missions")
        .select("*, poster:profiles!small_missions_user_id_fkey(first_name, last_name, avatar_url)");

      if (MISSION_STATUSES.includes(filterStatus)) query = query.eq("status", filterStatus as any);
      // L'onglet borne toujours la catégorie, la catégorie choisie s'ajoute.
      if (tab === "projets") query = query.eq("category", "projet" as any);
      else {
        query = query.neq("category", "projet" as any);
        if (filterCategory !== "all" && filterCategory !== "projet") {
          query = query.eq("category", filterCategory as any);
        }
      }
      if (filterPeriod !== "all") {
        const days = filterPeriod === "7d" ? 7 : filterPeriod === "30d" ? 30 : 90;
        const since = new Date(Date.now() - days * 86400000).toISOString();
        query = query.gte("created_at", since);
      }

      const ascending = sortDir === "asc";
      if (sortBy === "response_count" || sortBy === "created_at") {
        query = query.order("created_at", { ascending: sortBy === "created_at" ? ascending : false });
      } else {
        query = query.order(sortBy, { ascending }).order("created_at", { ascending: false });
      }
      return query.order("id", { ascending: true });
    };

    try {
      const { rows, truncated } = await fetchAllRows<any>((from, to) => buildQuery().range(from, to));
      if (!missionsSeq.current.isCurrent(token)) return;
      setLoadError(null);
      setMissions(rows);
      setTotalCount(rows.length);
      setMissionsTruncated(truncated);
    } catch (e: any) {
      if (!missionsSeq.current.isCurrent(token)) return;
      // Jamais la liste d'un filtre précédent présentée comme le résultat actuel.
      setMissions([]);
      setLoadError(e?.message || "lecture refusée");
    }
    setLoading(false);
  }, [filterStatus, filterCategory, filterPeriod, sortBy, sortDir, tab]);

  useEffect(() => { fetchMissions(); }, [fetchMissions]);
  useEffect(() => { setPage(0); }, [filterStatus, filterCategory, filterPeriod, search]);

  // Fetch response counts pour l'ensemble des missions chargées.
  // .in() est chunké par lots de 200 ids pour rester sous les limites de PostgREST.
  useEffect(() => {
    setResponseCountsReady(false);
    setResponseError(null);
    setResponseCounts({});
    if (loadError) return;
    if (!missions.length) {
      setResponseCounts({});
      setResponseCountsReady(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const ids = missions.map(m => m.id);
      const counts: Record<string, number> = {};
      for (let i = 0; i < ids.length; i += RESPONSE_CHUNK) {
        const chunk = ids.slice(i, i + RESPONSE_CHUNK);
        let data: any[];
        try {
          // Lecture paginée exhaustive, ordre stable : jamais plafonnée à 1 000 lignes.
          ({ rows: data } = await fetchAllRows<any>((from, to) => supabase
            .from("small_mission_responses")
            .select("id, mission_id")
            .in("mission_id", chunk)
            .order("id", { ascending: true })
            .range(from, to)));
        } catch (e: any) {
          if (!cancelled) { setResponseCounts({}); setResponseError(e?.message || "lecture refusée"); }
          return;
        }
        data.forEach((r: any) => {
          counts[r.mission_id] = (counts[r.mission_id] || 0) + 1;
        });
      }
      if (!cancelled) {
        setResponseCounts(counts);
        setResponseCountsReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [missions, responseNonce, loadError]);

  const filtered = useMemo(() => {
    let list = missions;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((m) =>
        m.title?.toLowerCase().includes(s) ||
        m.city?.toLowerCase().includes(s) ||
        m.poster?.first_name?.toLowerCase().includes(s)
      );
    }
    if (filterStatus === "no_response") {
      // Sans compteurs fiables, on n'affirme pas qu'une mission est sans réponse.
      list = responseCountsReady && !responseError ? list.filter((m) => !responseCounts[m.id]) : [];
    }
    if (sortBy === "response_count") {
      list = [...list].sort((a, b) => {
        const d = (responseCounts[b.id] || 0) - (responseCounts[a.id] || 0);
        return sortDir === "asc" ? -d : d;
      });
    }
    return list;
  }, [missions, search, sortBy, sortDir, responseCounts, filterStatus, responseCountsReady, responseError]);

  const paginated = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page]);

  // Projets publiés mais dont l'annonce aux membres attend encore.
  const pendingProjets = useMemo(
    () =>
      missions.filter(
        (m) =>
          m.category === "projet" &&
          m.notify_after &&
          new Date(m.notify_after).getTime() > Date.now(),
      ),
    [missions],
  );

  const releaseProjet = async (id: string) => {
    setReleasingId(id);
    const { error } = await (supabase as any).rpc("admin_release_projet", { _mission_id: id });
    setReleasingId(null);
    if (error) {
      toast.error("Diffusion impossible");
      return;
    }
    await logAdminAction("release_projet", id);
    toast.success("Projet diffusé");
    fetchMissions();
  };

  // Une publication annulée, masquée ou terminée n'est plus visible de
  // personne : elle ne doit plus allumer l'alerte, sinon le bandeau reste
  // allumé en permanence et on cesse de le regarder.
  const suspectMissions = useMemo(
    () =>
      filtered.filter(
        (m) =>
          (m.status === "open" || m.status === "in_progress") &&
          (moneyPattern.test(m.description || "") || moneyPattern.test(m.exchange_offer || "")),
      ),
    [filtered],
  );

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(key); setSortDir("desc"); }
  };

  const handleArchive = async () => {
    if (!archiveId) return;
    const id = archiveId;
    const { data: { user } } = await supabase.auth.getUser();
    const current = missions.find((m: any) => m.id === id);
    const { error } = await supabase
      .from("small_missions")
      .update({
        // Lot A9 : statut mémorisé pour que « Restaurer » le rende tel quel.
        status_before_hidden: current?.status && current.status !== "cancelled" ? current.status : null,
        status: "cancelled" as any,
        hidden_by: user?.id ?? null,
        hidden_at: new Date().toISOString(),
      } as any)
      .eq("id", id);
    if (error) {
      toast.error(`Masquage impossible : ${error.message}`);
      return;
    }
    await logAdminAction("small_mission_hide", id);
    toast.success("Mission masquée");
    setArchiveId(null);
    fetchMissions();
  };

  const handleRestore = async () => {
    if (!restoreId) return;
    const id = restoreId;
    const { error } = await supabase
      .from("small_missions")
      .update({
        status: (missions.find((m: any) => m.id === id)?.status_before_hidden || "open") as any,
        status_before_hidden: null,
        hidden_by: null,
        hidden_at: null,
      } as any)
      .eq("id", id);
    if (error) {
      toast.error(`Restauration impossible : ${error.message}`);
      return;
    }
    await logAdminAction("small_mission_restore", id);
    toast.success("Mission restaurée");
    setRestoreId(null);
    fetchMissions();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const id = deleteId;
    const { data, error } = await supabase.functions.invoke("admin-delete-small-mission", {
      body: { missionId: id },
    });
    setDeleting(false);
    if (error || !data?.success) {
      const msg = (data as any)?.error || error?.message || "Suppression impossible";
      toast.error(msg);
      return;
    }
    toast.success(`Mission supprimée (${data.responses_deleted ?? 0} réponse${(data.responses_deleted ?? 0) > 1 ? "s" : ""} nettoyée${(data.responses_deleted ?? 0) > 1 ? "s" : ""})`);
    setDeleteId(null);
    fetchMissions();
  };

  const openContact = (mission: any) => {
    setContactMission(mission);
    setContactReason("");
  };

  const handleContactConfirm = async () => {
    if (!contactMission) return;
    setContactSending(true);
    const mission = contactMission;
    const reason = contactReason.trim();
    // Lot A9 : messagerie admin, l'auteur peut répondre dans la conversation.
    const content = `Bonjour, l'équipe Guardiens vous écrit au sujet de votre demande « ${mission.title || "d'entraide"} ».\n\n${reason}`;
    const { error } = await supabase.rpc("admin_send_message_to_user", {
      p_target_user_id: mission.user_id,
      p_content: content,
    });
    setContactSending(false);
    if (error) {
      toast.error(`Envoi impossible : ${error.message}`);
      return;
    }
    toast.success("Message envoyé à l'auteur dans sa messagerie");
    setContactMission(null);
    setContactReason("");
  };

  const exportCsv = () => {
    if (!responseCountsReady || responseError) return;
    const csv = buildCsv(
      ["Titre", "Auteur", "Catégorie", "Ville", "Date", "Statut", "Notifiés", "Réponses", VIEWS_LABEL],
      filtered.map(m => [
        m.title, `${m.poster?.first_name || ""} ${m.poster?.last_name || ""}`.trim(),
        categoryLabels[m.category] || missionCategoryLabel(m.category), m.city || "",
        format(new Date(m.created_at), "yyyy-MM-dd"),
        resolveStatusBadge(m).label,
        notifiedCounts ? String(notifiedCounts[m.id] || 0) : "",
        responseError ? "" : String(responseCounts[m.id] || 0), String(m.view_count ?? 0),
      ]),
    );
    downloadCsv(csv, `${tab === "projets" ? "projets" : "entraide"}-${format(new Date(), "yyyy-MM-dd")}.csv`);
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Compteurs alignés sur la liste affichée (filtres et période compris).
  const listOk = !loading && !loadError;
  const shownKpis = {
    total: listOk ? filtered.length : null,
    open: listOk ? filtered.filter((m) => m.status === "open").length : null,
    views: filtered.reduce((a, m) => a + (m.view_count || 0), 0),
    responses: !listOk || responseError || !responseCountsReady ? null : filtered.reduce((a, m) => a + (responseCounts[m.id] || 0), 0),
    noResponse: !listOk || responseError || !responseCountsReady ? null : filtered.filter((m) => !responseCounts[m.id]).length,
    notified: listOk && notifiedCounts ? filtered.reduce((a, m) => a + (notifiedCounts[m.id] || 0), 0) : null,
    zeroReach: listOk && notifiedCounts ? filtered.filter((m) => !notifiedCounts[m.id]).length : null,
  };
  const anyError = !!(loadError || responseError || notifiedError);
  const kpiValue = (v: number | null) => (v === null ? (anyError ? "Indisponible" : "…") : v.toLocaleString("fr-FR"));

  const projetFilled = projetKpis && projetKpis.closed_count > 0
    ? Math.round((projetKpis.closed_filled / projetKpis.closed_count) * 100)
    : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={tab === "projets" ? "Projets" : "Entraide"}
        description={tab === "projets" ? "Projets participatifs publiés par les membres." : "Demandes et offres d'entraide entre membres."}
        actions={<Button variant="outline" size="sm" onClick={exportCsv} disabled={!responseCountsReady || !!responseError || !listOk}>
          <Download className="h-4 w-4 mr-2" /> Exporter CSV
        </Button>}
      />

      {missionsTruncated && (
        <p role="status" className="text-sm text-warning">{TRUNCATED_NOTICE}</p>
      )}
      <div className="flex gap-2" role="tablist">
        {([["entraide", "Entraide"], ["projets", "Projets"]] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => switchTab(key)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              tab === key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:bg-accent"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "projets" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Projets publiés</p>
              <p className="text-2xl font-bold tabular-nums">{projetKpis?.published ?? 0}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{projetKpis?.open ?? 0} ouverts</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground" title="Médiane des candidatures reçues par projet">Candidatures par projet, médiane</p>
              <p className="text-2xl font-bold tabular-nums">
                {projetKpis?.median_responses != null ? Number(projetKpis.median_responses).toFixed(1) : "·"}
              </p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Délai jusqu'à la première candidature, médiane</p>
              <p className="text-2xl font-bold tabular-nums">
                {projetKpis?.median_days_first_response != null
                  ? `${Number(projetKpis.median_days_first_response).toFixed(1)} j`
                  : "·"}
              </p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground" title="Projets clôturés avec au moins une candidature acceptée">Taux de projets pourvus</p>
              <p className="text-2xl font-bold tabular-nums">{projetFilled != null ? `${projetFilled}%` : "·"}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {projetKpis?.closed_filled ?? 0} sur {projetKpis?.closed_count ?? 0} clôturés
              </p>
            </CardContent></Card>
            <Card className="border-primary/40"><CardContent className="p-4">
              <p className="text-xs text-muted-foreground" title="Membres ayant candidaté à une garde et à un projet">Gardes et projets, mêmes membres</p>
              <p className="text-2xl font-bold tabular-nums">{projetKpis?.cross_members ?? 0}</p>
            </CardContent></Card>
          </div>

          <Card className={((projetKpis?.zero_response_14d?.length ?? 0) > 0) ? "border-warning-border bg-warning-soft" : undefined}>
            <CardContent className="p-4 space-y-2">
              <p className="text-xs text-muted-foreground">Projets sans candidature après 14 jours</p>
              {(projetKpis?.zero_response_14d?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">Tous les projets ouverts ont reçu au moins une candidature.</p>
              ) : (
                <ul className="space-y-1">
                  {projetKpis!.zero_response_14d.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="text-sm font-medium text-primary hover:underline text-left"
                        onClick={() => navigate(`/projets/${p.slug || p.id}`)}
                      >
                        {p.title}
                      </button>
                      <span className="text-xs text-muted-foreground ml-2">
                        publié le {format(new Date(p.created_at), "d MMM yyyy", { locale: fr })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent></Card>

          {pendingProjets.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Projets en attente de diffusion aux membres. Ils sont déjà visibles sur le site.
                </p>
                <ul className="space-y-2">
                  {pendingProjets.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 flex-wrap">
                      <button
                        type="button"
                        className="text-sm font-medium text-primary hover:underline text-left"
                        onClick={() => navigate(`/projets/${p.slug || p.id}`)}
                      >
                        {p.title}
                      </button>
                      <Badge variant="secondary">
                        Diffusion le {format(new Date(p.notify_after), "d MMM yyyy à HH:mm", { locale: fr })}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={releasingId === p.id}
                        onClick={() => releaseProjet(p.id)}
                      >
                        <Send className="h-4 w-4 mr-2" /> Valider et diffuser
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* KPIs entraide, sur les publications affichées */}
      {tab === "entraide" && (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Chiffres calculés sur les {filtered.length} publications affichées (filtres et période en cours).</p>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            { label: "Publications affichées", value: kpiValue(shownKpis.total) },
            { label: "Ouvertes", value: kpiValue(shownKpis.open) },
            { label: "Réponses reçues", value: kpiValue(shownKpis.responses) },
            { label: "Sans réponse", value: kpiValue(shownKpis.noResponse) },
            { label: "Personnes notifiées (somme par publication)", value: kpiValue(shownKpis.notified) },
            { label: "Sans envoi réussi enregistré", value: kpiValue(shownKpis.zeroReach) },
          ].map((k) => (
            <Card key={k.label}><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-2xl font-bold tabular-nums">{k.value}</p>
            </CardContent></Card>
          ))}
        </div>
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Périmètre de « Notifiés »</summary>
          <p className="mt-1">{NOTIFIED_SCOPE} {listOk ? shownKpis.views.toLocaleString("fr-FR") : "Indisponible :"} vues uniques au total sur ces publications.</p>
        </details>
      </div>
      )}
      {notifiedError && <ErrorState detail={`Notifiés : ${notifiedError}`} onRetry={() => setNotifiedNonce((n) => n + 1)} />}
      {responseError && <ErrorState detail={`Réponses : ${responseError}`} onRetry={() => setResponseNonce((n) => n + 1)} />}
      {loadError && <ErrorState detail={`Liste : ${loadError}`} onRetry={fetchMissions} />}

      {suspectMissions.length > 0 && (
        <Card className="border-warning-border bg-warning-soft">
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
            <p className="text-sm flex-1">{suspectMissions.length} mission{suspectMissions.length > 1 ? "s" : ""} avec mention d'argent détectée{suspectMissions.length > 1 ? "s" : ""}, à vérifier</p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher titre, ville, auteur…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[200px]" aria-label="Situation"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes situations</SelectItem>
            <SelectItem value="open">Ouvertes</SelectItem>
            <SelectItem value="no_response">Sans réponse</SelectItem>
            <SelectItem value="in_progress">Personne retenue</SelectItem>
            <SelectItem value="completed">Clôturées</SelectItem>
            <SelectItem value="cancelled">Annulées, expirées ou masquées</SelectItem>
          </SelectContent>
        </Select>
        {tab === "entraide" && (
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[150px]" aria-label="Catégorie"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {ENTRAIDE_FILTER_CATEGORIES.map((c) => (
                <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toute période</SelectItem>
            <SelectItem value="7d">7 derniers jours</SelectItem>
            <SelectItem value="30d">30 derniers jours</SelectItem>
            <SelectItem value="90d">90 derniers jours</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} mission{filtered.length > 1 ? "s" : ""} · Page {page + 1}/{totalPages}
      </p>
      {missions.length >= 5000 && (
        <p className="text-xs text-muted-foreground">
          Vue plafonnée à 5000 missions. Recherche et export portent sur ces missions uniquement.
        </p>
      )}

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table className="table-fixed min-w-[900px]">
          <colgroup>
            <col className="w-[30%]" /><col className="w-[19%]" /><col className="w-[19%]" />
            <col className="w-[8%]" /><col className="w-[8%]" /><col className="w-[260px]" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead>Publication</TableHead>
              <TableHead>
                <button onClick={() => toggleSort("created_at")} className="inline-flex items-center gap-1 hover:text-foreground" title="Tri par date de publication">
                  Lieu et dates <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>Situation</TableHead>
              <TableHead title={NOTIFIED_SCOPE}>Notifiés</TableHead>
              <TableHead>
                <button onClick={() => toggleSort("response_count")} className="inline-flex items-center gap-1 hover:text-foreground">
                  Réponses <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
            ) : loadError ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-destructive">Indisponible</TableCell></TableRow>
            ) : filterStatus === "no_response" && (responseError || !responseCountsReady) ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{responseError ? "Indisponible : les réponses n'ont pas pu être lues." : "Lecture des réponses…"}</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucune mission</TableCell></TableRow>
            ) : paginated.map((m) => {
              const status = resolveStatusBadge(m);
              const isSuspect = moneyPattern.test(m.description || "") || moneyPattern.test(m.exchange_offer || "");
                            const notified = notifiedCounts ? notifiedCounts[m.id] || 0 : null;
              const blocked = proximityBlockReason(m);
              return (
                <TableRow key={m.id} className={isSuspect ? "bg-warning-soft/50" : ""}>
                  <TableCell className="min-w-0">
                    <div className="font-medium line-clamp-2">
                      {isSuspect && <AlertTriangle className="h-3 w-3 text-warning inline mr-1" />}
                      {m.title}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                      {m.poster?.avatar_url && <img src={avatarImageUrl(m.poster.avatar_url, 20)} className="w-4 h-4 rounded-full object-cover" alt="" />}
                      <span className="truncate">{m.poster?.first_name} {m.poster?.last_name}</span>
                      <span>·</span>
                      <span>{categoryLabels[m.category] || missionCategoryLabel(m.category)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground min-w-0">
                    <div className="truncate">{m.city || "·"}</div>
                    <div className="text-xs">{missionDateLine(m)}</div>
                    <div className="text-[11px]">publiée le {format(new Date(m.created_at), "d MMM yyyy", { locale: fr })}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                    {status.detail && <p className="text-[11px] text-muted-foreground mt-0.5">{status.detail}</p>}
                  </TableCell>
                  <TableCell className="text-sm font-medium tabular-nums">{notified === null ? "·" : notified}</TableCell>
                  <TableCell className="text-sm font-medium tabular-nums">{responseError ? "Indisponible" : !responseCountsReady ? "·" : responseCounts[m.id] || 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-1 whitespace-nowrap">
                      <Button variant="outline" size="sm" onClick={() => setDetailMission(m)}>
                        <Info className="h-4 w-4 mr-1" /> Détails
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openContact(m)}>
                        <Mail className="h-4 w-4 mr-1" /> Contacter
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Autres actions" title="Autres actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                          <DropdownMenuItem onSelect={() => navigate(`/petites-missions/${(m as any).slug || m.id}`)}><Eye className="h-4 w-4 mr-2" /> Voir la publication</DropdownMenuItem>
                          <DropdownMenuItem disabled={!!blocked} onSelect={() => { if (!blocked) setProximityMission({ id: m.id, title: m.title }); }}>
                            <Send className="h-4 w-4 mr-2" />
                            <span className="flex flex-col">
                              <span>Envoyer aux inscrits à proximité</span>
                              {blocked && <span className="text-[11px] text-muted-foreground">{blocked}</span>}
                            </span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {m.status !== "cancelled" ? (
                            <DropdownMenuItem onSelect={() => setArchiveId(m.id)}><Archive className="h-4 w-4 mr-2" /> Masquer la mission</DropdownMenuItem>
                          ) : m.hidden_by ? (
                            <DropdownMenuItem onSelect={() => setRestoreId(m.id)}><RotateCcw className="h-4 w-4 mr-2" /> Restaurer la mission</DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleteId(m.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Supprimer la mission
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <DossierDetailSheet
        kind="mission"
        item={detailMission}
        open={!!detailMission}
        onOpenChange={(o) => { if (!o) setDetailMission(null); }}
        extra={detailMission ? (
          <div className="text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">Notifiés : </span>
              {notifiedCounts ? `${notifiedCounts[detailMission.id] || 0} personne${(notifiedCounts[detailMission.id] || 0) > 1 ? "s" : ""}` : "Indisponible"}
            </p>
            <p className="text-xs text-muted-foreground">{NOTIFIED_SCOPE}</p>
            <p><span className="text-muted-foreground">{VIEWS_LABEL} : </span>{detailMission.view_count ?? 0}</p>
            {proximityBlockReason(detailMission) && <p className="text-xs text-muted-foreground">Diffusion : {proximityBlockReason(detailMission)}</p>}
          </div>
        ) : null}
        footer={detailMission ? (
          <Button size="sm" variant="outline" onClick={() => navigate(`/petites-missions/${detailMission.slug || detailMission.id}`)}>Voir la publication</Button>
        ) : null}
      />

      {/* Pagination */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{PAGE_SIZE} par page</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Précédent</Button>
          <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>Suivant</Button>
        </div>
      </div>

      <Dialog open={!!deleteId} onOpenChange={() => !deleting && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Supprimer cette mission ?</DialogTitle></DialogHeader>
          <DialogDescription>Cette action est irréversible. La mission et toutes ses réponses seront supprimées.</DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? "Suppression…" : "Supprimer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!archiveId} onOpenChange={() => setArchiveId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Masquer cette mission ?</DialogTitle></DialogHeader>
          <DialogDescription>La mission sera retirée de la recherche. Vous pourrez la restaurer plus tard.</DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveId(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handleArchive}>Masquer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!restoreId} onOpenChange={() => setRestoreId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Restaurer cette mission ?</DialogTitle></DialogHeader>
          <DialogDescription>La demande retrouve son statut d'avant masquage.</DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreId(null)}>Annuler</Button>
            <Button onClick={handleRestore}>Restaurer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!contactMission} onOpenChange={(open) => { if (!open && !contactSending) { setContactMission(null); setContactReason(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Contacter l'auteur</AlertDialogTitle>
            <AlertDialogDescription>
              Le message part dans la messagerie de l'auteur de « {contactMission?.title} », qui peut vous répondre directement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="contact-reason">Message à l'auteur</Label>
            <Textarea
              id="contact-reason"
              value={contactReason}
              onChange={(e) => setContactReason(e.target.value.slice(0, 500))}
              placeholder="Ex : votre mission mentionne une rémunération, non autorisée dans l'entraide."
              rows={4}
              disabled={contactSending}
            />
            <p className="text-xs text-muted-foreground">{contactReason.length}/500</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={contactSending}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleContactConfirm} disabled={contactSending || !contactReason.trim()}>
              {contactSending ? "Envoi…" : "Envoyer le message"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!proximityMission} onOpenChange={(open) => { if (!open) { setProximityMission(null); setNotifiedNonce((n) => n + 1); } }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Envoyer aux inscrits à proximité</DialogTitle>
            <DialogDescription>
              Mission : <strong>{proximityMission?.title}</strong>. Rayon pré-rempli à 15 km.
              Vérifiez l'aperçu, puis confirmez explicitement pour envoyer. Aucun envoi automatique.
            </DialogDescription>
          </DialogHeader>
          {proximityMission && (
            <ProximityCampaignCard
              key={proximityMission.id}
              initialMissionId={proximityMission.id}
              initialRadiusKm={15}
              autoPreview
              hideHeader
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

/** Date de besoin ou de fin quand elle est connue. */
function missionDateLine(m: { date_needed?: string | null; end_date?: string | null }): string {
  const f = (d: string) => format(new Date(d), "d MMM yyyy", { locale: fr });
  if (m.date_needed && m.end_date) return `Du ${f(m.date_needed)} au ${f(m.end_date)}`;
  if (m.date_needed) return `Le ${f(m.date_needed)}`;
  if (m.end_date) return `Jusqu'au ${f(m.end_date)}`;
  return "Sans date de besoin";
}

export default AdminSmallMissions;
