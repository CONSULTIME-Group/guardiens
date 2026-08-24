import { useEffect, useMemo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import QuestionCard from "@/components/community/QuestionCard";
import { useCommunityQuestions } from "@/hooks/useCommunityQuestions";
import { DEPT_NAMES, getDeptCode } from "@/lib/departments";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import MissionCardCover from "@/components/missions/MissionCardCover";
import MissionBadgesReceived from "@/components/missions/MissionBadgesReceived";
import ProximityFilter from "@/components/missions/ProximityFilter";
import EntraideGeolocBanner from "@/components/missions/EntraideGeolocBanner";
import { sanitizeUserTitle } from "@/lib/sanitizeTitle";
import { useMissionDistance } from "@/hooks/useMissionDistance";
import { trackEvent } from "@/lib/analytics";
import MobileEntraideFeed from "@/components/community/MobileEntraideFeed";
import { MISSION_CATEGORIES, MISSION_CATEGORY_LABEL } from "@/lib/missionCategories";

/**
 * EntraideHub — fil unique de l'entraide.
 *
 * Un seul flux chronologique mêlant Questions, Demandes et Offres, étiqueté
 * par nature. Quatre catégories alignées sur l'enum `small_mission_category`
 * (source unique : `src/lib/missionCategories.ts`). La position du membre
 * sert au tri par proximité, jamais au filtrage par défaut : la limitation
 * au rayon est un choix explicite, pour ne jamais ouvrir sur du vide.
 * Un seul appel à l'action : « Publier ».
 */

type NatureFilter = "all" | "question" | "demande" | "offre";
type MissionStatus = "all" | "open" | "in_progress" | "completed";

const PAGE_SIZE = 20;

/** Les catégories de questions rejoignent les 4 catégories de missions. */
const QUESTION_CAT_TO_MISSION: Record<string, string> = {
  animaux: "animals",
  jardin: "garden",
  maison: "house",
};

interface MissionRow {
  id: string;
  slug?: string | null;
  title: string;
  description: string | null;
  category: string;
  city: string | null;
  postal_code: string | null;
  created_at: string;
  date_needed: string | null;
  end_date: string | null;
  duration_estimate: string | null;
  status: string;
  mission_type: "besoin" | "offre" | null;
  user_id: string;
  photos?: string[] | null;
  profiles?: { first_name: string | null; avatar_url: string | null } | null;
}

const VALID_M_STATUS: MissionStatus[] = ["all", "open", "in_progress", "completed"];

const M_STATUS_LABEL: Record<MissionStatus, string> = {
  all: "Tous statuts",
  open: "Ouvertes",
  in_progress: "En cours",
  completed: "Terminées",
};

const NATURE_CHIPS: { key: NatureFilter; label: string }[] = [
  { key: "all", label: "Tout" },
  { key: "question", label: "Questions" },
  { key: "demande", label: "Demandes" },
  { key: "offre", label: "Offres" },
];

// Retourne une période lisible :
//  - start + end : « Du 5 juil. au 12 sept. 2026 »
//  - end seul    : « Jusqu'au 12 sept. 2026 »
//  - start seul  : « Pour le 5 juil. 2026 »
const formatMissionPeriod = (start: string | null, end: string | null) => {
  const fmtShort = (iso: string) => {
    try { return format(new Date(iso), "d MMM yyyy", { locale: fr }); } catch { return null; }
  };
  if (start && end) {
    const s = fmtShort(start); const e = fmtShort(end);
    if (s && e) return { prefix: "Du ", value: `${s} au ${e}` };
  }
  if (end) {
    const e = fmtShort(end);
    if (e) return { prefix: "Jusqu'au ", value: e };
  }
  if (start) {
    const s = fmtShort(start);
    if (s) return { prefix: "Pour le ", value: s };
  }
  return null;
};

const formatRelative = (iso: string) => {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: fr });
  } catch {
    return "";
  }
};

type FeedItem =
  | { kind: "question"; date: string; q: any }
  | { kind: "mission"; date: string; m: MissionRow };

const EntraideHub = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [params, setParams] = useSearchParams();

  // Compatibilité ascendante des liens existants :
  // ?tab=questions → nature=question, ?mode=offer → nature=offre, ?mode=need → nature=demande.
  const initialNature: NatureFilter = (() => {
    const tab = params.get("tab");
    const mode = params.get("mode");
    if (tab === "questions") return "question";
    if (mode === "offer") return "offre";
    if (mode === "need") return "demande";
    return "all";
  })();
  const [nature, setNature] = useState<NatureFilter>(initialNature);

  const { items: questions, loading: qLoading } = useCommunityQuestions({
    category: "all",
    status: "all",
    limit: 50,
  });

  /* Missions */
  const [missions, setMissions] = useState<MissionRow[]>([]);
  const [mLoading, setMLoading] = useState(true);
  const initialMCat = params.get("cat") || "all";
  const [category, setCategory] = useState<string>(
    initialMCat === "all" || MISSION_CATEGORIES.some((c) => c.key === initialMCat)
      ? initialMCat
      : "all",
  );
  const initialMStatus = (params.get("status") as MissionStatus) || "open";
  const [mStatus, setMStatus] = useState<MissionStatus>(
    VALID_M_STATUS.includes(initialMStatus) ? initialMStatus : "open",
  );
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  /* Sync querystring */
  useEffect(() => {
    const next = new URLSearchParams(params);
    next.delete("tab");
    next.delete("mode");
    next.delete("sort");
    if (nature !== "all") next.set("tab", nature === "question" ? "questions" : nature === "offre" ? "offres" : "besoins");
    else next.delete("tab");
    if (category !== "all") next.set("cat", category);
    else next.delete("cat");
    if (mStatus !== "open") next.set("status", mStatus);
    else next.delete("status");
    setParams(next, { replace: true });
    setVisibleCount(PAGE_SIZE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nature, category, mStatus]);

  /* Toggle "Mes publications" */
  const initialMine = params.get("mine") === "1";
  const [mineOnly, setMineOnly] = useState<boolean>(initialMine && isAuthenticated);

  useEffect(() => {
    const next = new URLSearchParams(params);
    if (mineOnly) next.set("mine", "1");
    else next.delete("mine");
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mineOnly]);

  // Fallback status=all si peu de missions en base : jamais d'ouverture sur du vide.
  const autoSwitchedStatusRef = useRef(false);
  const allStatusFallbackTrackedRef = useRef(false);
  useEffect(() => {
    // Attendre la résolution de la session : les visiteurs anonymes lisent la vue
    // publique (colonnes d'affichage uniquement), les membres la table complète.
    if (authLoading) return;
    const load = async () => {
      setMLoading(true);
      const { data } = await supabase
        .from(isAuthenticated ? "small_missions" : ("public_small_missions" as any))
        .select(
          "id, slug, title, description, category, city, postal_code, created_at, date_needed, end_date, duration_estimate, status, mission_type, user_id, photos",
        )
        .in("status", ["open", "in_progress", "completed"] as any)
        .order("created_at", { ascending: false })
        .limit(120);
      const baseRows = (data || []) as any[];

      // Hydratation RLS-safe des auteurs via la vue publique (alias "profiles").
      const authorIds = Array.from(new Set(
        baseRows.map((r: any) => r.user_id).filter(Boolean),
      )) as string[];
      if (authorIds.length > 0) {
        const { data: authorProfs } = await supabase
          .from("public_profiles")
          .select("id, first_name, avatar_url")
          .in("id", authorIds);
        const authorMap = new Map<string, any>();
        (authorProfs ?? []).forEach((p: any) => authorMap.set(p.id, { first_name: p.first_name, avatar_url: p.avatar_url }));
        baseRows.forEach((r: any) => {
          r.profiles = r.user_id ? authorMap.get(r.user_id) ?? null : null;
        });
      }

      const rows = baseRows as unknown as MissionRow[];
      setMissions(rows);
      setMLoading(false);
      if (!autoSwitchedStatusRef.current && rows.length < 20 && !params.get("status")) {
        autoSwitchedStatusRef.current = true;
        setMStatus("all");
        if (!allStatusFallbackTrackedRef.current) {
          allStatusFallbackTrackedRef.current = true;
          void trackEvent("entraide_all_status_default_used", { metadata: { missions_count: rows.length } });
        }
      }
    };
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  /* Proximité : la même origine sert au tri des missions et des questions. */
  const geoItems = useMemo(
    () => [
      ...missions.map((m) => ({ id: m.id, postal_code: m.postal_code, city: m.city })),
      ...(questions as any[]).map((q) => ({ id: q.id as string, postal_code: null, city: (q.city as string | null) ?? null })),
    ],
    [missions, questions],
  );
  const proximity = useMissionDistance(geoItems);

  // Une OFFRE (disponibilité) n'expire jamais par date : elle ne devient passée
  // que si son statut est explicitement clôturé (completed).
  // Seules les DEMANDES ont une échéance (end_date, sinon date_needed).
  const isMissionExpired = (m: MissionRow) => {
    if ((m.mission_type ?? "besoin") === "offre") return false;
    const ref = m.end_date || m.date_needed;
    if (!ref) return false;
    try {
      const today = new Date(new Date().setHours(0, 0, 0, 0));
      return new Date(ref) < today;
    } catch { return false; }
  };
  const isMissionPast = (m: MissionRow) => m.status === "completed" || isMissionExpired(m);

  const visibleQuestions = useMemo(() => {
    if (!mineOnly || !currentUserId) return questions as any[];
    return (questions as any[]).filter((q) => q.author_id === currentUserId);
  }, [questions, mineOnly, currentUserId]);

  /** Missions après filtres statut + « mes publications », avant nature/catégorie. */
  const baseMissions = useMemo(
    () =>
      missions.filter((m) => {
        if (mStatus !== "all" && m.status !== mStatus) return false;
        if (mineOnly && currentUserId && m.user_id !== currentUserId) return false;
        return true;
      }),
    [missions, mStatus, mineOnly, currentUserId],
  );

  /** Questions après « mes publications », avant nature/catégorie. */
  const baseQuestions = visibleQuestions;

  /* Compteurs facettés : les chips nature comptent dans la catégorie courante,
     les chips catégorie comptent dans la nature courante. */
  const natureCounts = useMemo(() => {
    const countMissions = baseMissions.filter(
      (m) => category === "all" || m.category === category,
    );
    const countQuestions = baseQuestions.filter(
      (q) => category === "all" || QUESTION_CAT_TO_MISSION[q.category as string] === category,
    );
    const demandes = countMissions.filter((m) => (m.mission_type ?? "besoin") !== "offre").length;
    const offres = countMissions.filter((m) => (m.mission_type ?? "besoin") === "offre").length;
    return {
      all: countMissions.length + countQuestions.length,
      question: countQuestions.length,
      demande: demandes,
      offre: offres,
    } as Record<NatureFilter, number>;
  }, [baseMissions, baseQuestions, category]);

  const categoryCounts = useMemo(() => {
    const natMissions = baseMissions.filter((m) => {
      const nat = (m.mission_type ?? "besoin") === "offre" ? "offre" : "demande";
      return nature === "all" || nature === nat;
    });
    const natQuestions = baseQuestions.filter(
      () => nature === "all" || nature === "question",
    );
    const counts: Record<string, number> = { all: natMissions.length + natQuestions.length };
    for (const c of MISSION_CATEGORIES) {
      const mCount = natMissions.filter((m) => m.category === c.key).length;
      const qCount = natQuestions.filter(
        (q) => QUESTION_CAT_TO_MISSION[q.category as string] === c.key,
      ).length;
      counts[c.key] = mCount + qCount;
    }
    return counts;
  }, [baseMissions, baseQuestions, nature]);

  const feed = useMemo(() => {
    const items: FeedItem[] = [];
    if (nature === "all" || nature === "question") {
      for (const q of baseQuestions) {
        if (category !== "all" && QUESTION_CAT_TO_MISSION[q.category as string] !== category) continue;
        items.push({ kind: "question", date: q.created_at, q });
      }
    }
    for (const m of baseMissions) {
      const nat = (m.mission_type ?? "besoin") === "offre" ? "offre" : "demande";
      if (nature !== "all" && nature !== nat) continue;
      if (category !== "all" && m.category !== category) continue;
      // Limitation au rayon : uniquement si le membre l'a explicitement demandée.
      if (proximity.active && proximity.filterEnabled) {
        const d = proximity.getDistance(m.id);
        if (d == null || d > proximity.radius) continue;
      }
      items.push({ kind: "mission", date: m.created_at, m });
    }
    // Tri : distance croissante si la position est connue, sinon chronologique.
    items.sort((a, b) => {
      if (proximity.active) {
        const da = proximity.getDistance(a.kind === "mission" ? a.m.id : (a.q as any).id);
        const db = proximity.getDistance(b.kind === "mission" ? b.m.id : (b.q as any).id);
        if (da != null && db != null && da !== db) return da - db;
        if (da != null) return -1;
        if (db != null) return 1;
      }
      return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
    });
    // Publications passées en fin de fil, quel que soit le tri.
    return items.sort((a, b) => {
      const pa = a.kind === "mission" && isMissionPast(a.m) ? 1 : 0;
      const pb = b.kind === "mission" && isMissionPast(b.m) ? 1 : 0;
      return pa - pb;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseMissions, baseQuestions, nature, category, proximity.active, proximity.filterEnabled, proximity.radius, proximity.getDistance]);

  const visibleFeed = feed.slice(0, visibleCount);

  const goPublish = () =>
    navigate(
      isAuthenticated
        ? "/petites-missions/creer"
        : "/inscription?redirect=/petites-missions/creer",
    );

  const hasFilters = category !== "all" || mStatus !== "open" || (proximity.active && proximity.filterEnabled);
  const resetFilters = () => {
    setCategory("all");
    setMStatus("open");
    proximity.setFilterEnabled(false);
  };

  const renderMissionCard = (m: MissionRow) => {
    const code = getDeptCode(m.postal_code);
    const dept = code ? DEPT_NAMES[code] : null;
    const period = formatMissionPeriod(m.date_needed, m.end_date);
    const isMine = currentUserId && m.user_id === currentUserId;
    const authorName = publicFirstName(m.profiles?.first_name) || "Membre";
    const initial = authorName.charAt(0).toUpperCase();
    const natureLabel = (m.mission_type ?? "besoin") === "offre" ? "Offre" : "Demande";
    const natureCls =
      (m.mission_type ?? "besoin") === "offre"
        ? "bg-accent/25 text-accent-foreground"
        : "bg-secondary/15 text-secondary-foreground";
    const statusBadge =
      m.status === "in_progress"
        ? { label: "En cours", aria: "Statut : en cours" }
        : m.status === "completed"
          ? { label: "Terminée", aria: "Statut : terminée" }
          : null;
    const expired = isMissionExpired(m);
    const d = proximity.active ? proximity.getDistance(m.id) : null;
    const hasDist = proximity.active ? proximity.hasDistance(m.id) : false;
    const distanceLabel =
      proximity.active
        ? d != null
          ? d < 1
            ? "moins d'1 km"
            : `à ${Math.round(d)} km`
          : proximity.computing || !hasDist
            ? "Distance en cours de calcul"
            : "Distance indisponible"
        : null;
    const cardAria = [
      `Voir la mission : ${sanitizeUserTitle(m.title) || m.title}`,
      m.city ? `à ${m.city}` : "",
      proximity.active && d != null
        ? d < 1
          ? "à moins d'1 kilomètre de vous"
          : `à environ ${Math.round(d)} kilomètres de vous`
        : "",
    ]
      .filter(Boolean)
      .join(", ");
    return (
      <li key={m.id}>
        <Link
          to={`/petites-missions/${m.slug || m.id}`}
          aria-label={cardAria}
          className="flex gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/40 hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <MissionCardCover
            photo={m.photos && m.photos[0] ? m.photos[0] : null}
            category={m.category}
            title={m.title}
            className="w-24 sm:w-32 shrink-0 aspect-[4/3] rounded-lg"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${natureCls}`}>
                  {natureLabel}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wide">
                  {MISSION_CATEGORY_LABEL[m.category as keyof typeof MISSION_CATEGORY_LABEL] || "Autre"}
                </span>
                {statusBadge && (
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wide"
                    aria-label={statusBadge.aria}
                  >
                    {statusBadge.label}
                  </span>
                )}
                {isMine && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground uppercase tracking-wide">
                    Vous
                  </span>
                )}
                {expired && m.status !== "completed" && (
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-warning/15 text-warning-foreground uppercase tracking-wide border border-warning/30"
                    aria-label="Statut : période passée"
                  >
                    Passée
                  </span>
                )}
              </div>
              {proximity.active && (
                d != null ? (
                  <span
                    className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary tabular-nums"
                    aria-label={
                      d < 1
                        ? "Distance : moins d'un kilomètre"
                        : `Distance : environ ${Math.round(d)} kilomètres`
                    }
                  >
                    {distanceLabel}
                  </span>
                ) : proximity.computing || !hasDist ? (
                  <span
                    className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground italic"
                    aria-live="polite"
                    aria-busy="true"
                    aria-label="Calcul de la distance en cours"
                  >
                    …
                  </span>
                ) : (
                  <span
                    className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                    aria-label="Distance indisponible"
                    title="Distance indisponible"
                  >
                    – km
                  </span>
                )
              )}
            </div>
            <p className="font-heading text-base font-semibold text-foreground line-clamp-2">
              {sanitizeUserTitle(m.title) || m.title}
            </p>
            {m.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {m.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground flex-wrap">
              <Avatar className="h-5 w-5 shrink-0">
                <AvatarImage src={m.profiles?.avatar_url || undefined} alt="" loading="lazy" />
                <AvatarFallback className="text-[9px]">{initial}</AvatarFallback>
              </Avatar>
              <span className="truncate max-w-[10rem]">{authorName}</span>
              <MissionBadgesReceived profileId={m.user_id} variant="compact" />
              {m.city && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{m.city}{dept ? `, ${dept}` : ""}</span>
                </>
              )}
              {period && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{period.prefix}{period.value}</span>
                </>
              )}
              <span className="ml-auto">{formatRelative(m.created_at)}</span>
            </div>
          </div>
        </Link>
      </li>
    );
  };

  return (
    <>
      <PageMeta
        title="Entraide, questions et coups de main entre gens du coin, Guardiens"
        description="Posez une question, demandez un coup de main (garde animaux, jardin, promenade) ou proposez votre aide près de chez vous, sans engagement."
        path="/petites-missions"
      />
      <div className="bg-background">
        <PageBreadcrumb items={[{ label: t("nav.small_missions", "Entraide") }]} />

        <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 pb-28 sm:pt-6 sm:pb-8 min-w-0">
          <EntraideGeolocBanner
            hasCoords={proximity.active}
            onUseMyLocation={proximity.useMyLocation}
          />
          <div className="mb-5">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-col items-start gap-2 md:flex-row md:items-center md:flex-wrap">
                  <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
                    Entraide
                  </h1>
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                    Sans engagement
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1.5 md:max-w-xl">
                  Questions à la communauté, demandes et offres de coup de main entre gens du coin.
                </p>
              </div>
              <Button onClick={goPublish} size="sm" className="hidden md:inline-flex shrink-0 h-9">
                Publier
              </Button>
            </div>
          </div>

          {/* Fil unifié mobile. */}
          <MobileEntraideFeed
            missions={missions}
            questions={questions as any}
            loading={mLoading || qLoading}
            onPublish={goPublish}
          />

          {/* Desktop : fil unique. */}
          <div className="hidden md:block">
            {/* Chips nature, compteurs réels */}
            <div
              role="group"
              aria-label="Filtrer par nature de publication"
              className="mb-3 flex items-center gap-2 flex-wrap"
            >
              {NATURE_CHIPS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setNature(c.key)}
                  aria-pressed={nature === c.key}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors inline-flex items-center gap-1.5 ${
                    nature === c.key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:bg-accent"
                  }`}
                >
                  <span>{c.label}</span>
                  <span
                    className={`text-[10px] tabular-nums px-1.5 py-px rounded-full ${
                      nature === c.key ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {natureCounts[c.key]}
                  </span>
                </button>
              ))}
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={() => setMineOnly((v) => !v)}
                  aria-pressed={mineOnly}
                  aria-label={mineOnly ? "Afficher toutes les publications" : "N'afficher que mes publications"}
                  className={`ml-auto text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                    mineOnly
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-transparent text-muted-foreground border-border/70 hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {mineOnly ? "Mes publications ✓" : "Toutes"}
                </button>
              )}
            </div>

            {/* Chips catégories, alignées sur l'enum small_mission_category */}
            <div
              role="group"
              aria-label="Filtrer par catégorie"
              className="mb-4 flex items-center gap-2 flex-wrap"
            >
              <button
                type="button"
                onClick={() => setCategory("all")}
                aria-pressed={category === "all"}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors inline-flex items-center gap-1.5 ${
                  category === "all"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:bg-accent"
                }`}
              >
                <span>Tout</span>
                <span className={`text-[10px] tabular-nums px-1.5 py-px rounded-full ${category === "all" ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"}`}>
                  {categoryCounts.all}
                </span>
              </button>
              {MISSION_CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategory(c.key)}
                  aria-pressed={category === c.key}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors inline-flex items-center gap-1.5 ${
                    category === c.key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:bg-accent"
                  }`}
                >
                  <span>{c.label}</span>
                  <span className={`text-[10px] tabular-nums px-1.5 py-px rounded-full ${category === c.key ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"}`}>
                    {categoryCounts[c.key] ?? 0}
                  </span>
                </button>
              ))}
            </div>

            {/* Filtres secondaires : statut + proximité */}
            <div className="mb-6 rounded-2xl border border-border bg-card/50 p-3 sm:p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Select value={mStatus} onValueChange={(v) => setMStatus(v as MissionStatus)}>
                  <SelectTrigger className="h-8 w-auto min-w-[140px] text-xs" aria-label="Filtrer par statut">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VALID_M_STATUS.map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">
                        {M_STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
              <div className="pt-2 border-t border-border/60">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Proximité
                </p>
                <ProximityFilter
                  postal={proximity.postal}
                  onPostalChange={proximity.setPostal}
                  radius={proximity.radius}
                  onRadiusChange={proximity.setRadius}
                  active={proximity.active}
                  resolving={proximity.resolving}
                  isValidPostal={proximity.isValidPostal}
                  onUseMyLocation={proximity.useMyLocation}
                  onClear={() => proximity.setPostal("")}
                  originError={proximity.originError}
                  filterEnabled={proximity.filterEnabled}
                  onFilterEnabledChange={proximity.setFilterEnabled}
                />
                <p className="text-[11px] text-muted-foreground mt-2">
                  {proximity.active
                    ? proximity.filterEnabled
                      ? `Seules les publications à moins de ${proximity.radius} km sont affichées.`
                      : "Le fil est trié par proximité, rien n'est masqué. Cochez « Limiter à ce rayon » pour filtrer."
                    : "Saisissez un code postal ou utilisez votre position pour trier par proximité."}
                </p>
              </div>
              <p className="sr-only" role="status" aria-live="polite">
                {proximity.active
                  ? proximity.computing
                    ? "Calcul des distances autour de votre position."
                    : `Tri par proximité activé. ${feed.length} publication${feed.length > 1 ? "s" : ""} affichée${feed.length > 1 ? "s" : ""}.`
                  : "Tri par proximité désactivé."}
              </p>
            </div>

            {mLoading || qLoading ? (
              <div className="space-y-3" aria-busy="true" aria-live="polite">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-32 rounded-xl bg-muted/40 animate-pulse" />
                ))}
              </div>
            ) : visibleFeed.length > 0 ? (
              <>
                <ul className="space-y-3">
                  {visibleFeed.map((item) =>
                    item.kind === "question" ? (
                      <li key={`q-${(item.q as any).id}`}>
                        <QuestionCard q={item.q} showNatureBadge />
                      </li>
                    ) : (
                      renderMissionCard(item.m)
                    ),
                  )}
                </ul>
                {feed.length > visibleCount ? (
                  <div className="mt-4 flex justify-center">
                    <Button
                      variant="outline"
                      onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    >
                      Charger plus ({feed.length - visibleCount} restantes)
                    </Button>
                  </div>
                ) : (
                  <div className="mt-8 p-5 rounded-2xl border border-dashed border-border bg-accent/20 text-center">
                    <p className="text-sm text-muted-foreground">
                      Vous avez vu {feed.length === 1 ? "l'unique publication" : `les ${feed.length} publications`} qui correspondent.
                    </p>
                    <div className="mt-3">
                      <Button size="sm" onClick={goPublish}>
                        Publier
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                title={
                  mineOnly
                    ? "Vous n'avez pas encore publié."
                    : hasFilters || nature !== "all"
                      ? "Rien ne correspond à ces filtres."
                      : "Les premières publications s'afficheront ici."
                }
                hint={
                  hasFilters || nature !== "all"
                    ? "Élargissez la sélection, ou publiez la première."
                    : "Lancez le mouvement, votre publication apparaît immédiatement."
                }
                ctaLabel="Publier"
                onCta={goPublish}
                onReset={hasFilters || nature !== "all" ? () => { resetFilters(); setNature("all"); } : undefined}
                howSteps={[
                  "Vous publiez une question, une demande ou une offre de coup de main.",
                  "Les membres intéressés vous répondent en message privé ou en commentaire.",
                  "Vous convenez ensemble du jour et du cadre, sans engagement.",
                ]}
              />
            )}
          </div>
        </section>
      </div>
    </>
  );
};

const EmptyState = ({
  title,
  hint,
  ctaLabel,
  onCta,
  onReset,
  howSteps,
}: {
  title: string;
  hint?: string;
  ctaLabel: string;
  onCta: () => void;
  onReset?: () => void;
  howSteps?: string[];
}) => (
  <div className="p-8 rounded-2xl border border-dashed border-border bg-accent/20 text-center">
    <p className="font-heading text-lg text-foreground">{title}</p>
    {hint && <p className="text-sm text-muted-foreground mt-2">{hint}</p>}
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
      <Button onClick={onCta}>{ctaLabel}</Button>
      {onReset && (
        <Button variant="ghost" onClick={onReset}>
          Réinitialiser les filtres
        </Button>
      )}
    </div>
    {howSteps && howSteps.length > 0 && (
      <div className="mt-6 pt-5 border-t border-border/60 text-left">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 text-center">
          Comment ça marche
        </p>
        <ol className="space-y-2 text-sm text-foreground/80 list-decimal list-inside">
          {howSteps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>
    )}
  </div>
);

export default EntraideHub;
