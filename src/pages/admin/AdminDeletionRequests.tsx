import { adminLabel } from "@/lib/admin/labels";
import { useCallback, useEffect, useState } from "react";
import { refreshAdminBadges } from "@/hooks/useAdminBadges";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, ShieldAlert, Trash2, RefreshCw, ClipboardList } from "lucide-react";
import { toast } from "sonner";

interface RequestRow {
  id: string;
  user_id: string | null;
  requester_email: string | null;
  source: string;
  status: string;
  requested_at: string;
  scheduled_deletion_at: string | null;
  processed_at: string | null;
  processed_by: string | null;
  notes: string | null;
}

interface PendingRequest {
  id: string;
  requestedAt: string | null;
  scheduledDeletionAt: string | null;
}

interface LookupResult {
  found: boolean;
  userId: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  confirmedSits: number;
  pendingApplications: number;
  blocked: boolean;
  pendingRequest?: PendingRequest | null;
}

/** Demande à exécuter : adresse et, si elle existe, ligne déjà enregistrée. */
interface ExecuteTarget {
  email: string;
  requestId: string | null;
}

class FunctionCallError extends Error {
  status: number | null;
  body: Record<string, unknown> | null;
  constructor(message: string, status: number | null, body: Record<string, unknown> | null) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  completed: "Traitée",
  cancelled: "Annulée",
};

const SOURCE_LABEL: Record<string, string> = {
  self: "Depuis le compte",
  admin: "Saisie par l'équipe",
};

function fmt(date: string | null | undefined): string {
  if (!date) return "·";
  return new Date(date).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

function fmtDay(date: string | null | undefined): string {
  if (!date) return "·";
  return new Date(date).toLocaleDateString("fr-FR", { dateStyle: "short" });
}

export default function AdminDeletionRequests() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [admins, setAdmins] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState<ExecuteTarget | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("account_deletion_requests")
      .select("id, user_id, requester_email, source, status, requested_at, scheduled_deletion_at, processed_at, processed_by, notes")
      .order("requested_at", { ascending: false })
      .limit(200);
    if (error) {
      toast.error("Chargement impossible : " + error.message);
      setRows([]);
    } else {
      const list = (data ?? []) as RequestRow[];
      setRows(list);
      const ids = Array.from(new Set(list.map((r) => r.processed_by).filter(Boolean))) as string[];
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", ids);
        const map: Record<string, string> = {};
        (profs ?? []).forEach((p) => {
          map[p.id] = [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || p.id;
        });
        setAdmins(map);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const callFunction = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("admin-delete-account", { body });
    if (error) {
      // L'edge function renvoie un corps JSON même en erreur : on tente de le lire.
      let message = error.message;
      let status: number | null = null;
      let parsed: Record<string, unknown> | null = null;
      const ctx = (error as { context?: Response }).context;
      if (ctx) {
        status = typeof ctx.status === "number" ? ctx.status : null;
        if (typeof ctx.json === "function") {
          try {
            parsed = await ctx.json();
            if (parsed && typeof parsed.error === "string") message = parsed.error;
          } catch { /* corps non JSON */ }
        }
      }
      throw new FunctionCallError(message, status, parsed);
    }
    return data as Record<string, unknown>;
  };

  const handleLookup = async () => {
    if (!email.trim()) return;
    setBusy(true);
    setLookup(null);
    try {
      const res = await callFunction({ action: "lookup", email: email.trim() });
      setLookup(res as unknown as LookupResult);
      if (!(res as { found?: boolean }).found) {
        toast.warning("Aucun compte ne correspond à cette adresse.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Recherche impossible");
    } finally {
      setBusy(false);
    }
  };

  const handleRecord = async () => {
    const address = (lookup?.email ?? email).trim();
    if (!address) return;
    setBusy(true);
    try {
      const res = await callFunction({
        action: "record",
        email: address,
        notes: notes.trim() || null,
      });
      const pending: PendingRequest = {
        id: String(res.requestId ?? ""),
        requestedAt: (res.requestedAt as string | null) ?? null,
        scheduledDeletionAt: (res.scheduledDeletionAt as string | null) ?? null,
      };
      setLookup((l) => (l ? { ...l, pendingRequest: pending } : l));
      toast.success(
        res.created
          ? `Demande enregistrée. À traiter avant le ${fmtDay(pending.scheduledDeletionAt)}.`
          : `Demande déjà enregistrée le ${fmtDay(pending.requestedAt)}. À traiter avant le ${fmtDay(pending.scheduledDeletionAt)}.`,
      );
      await load();
      refreshAdminBadges();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible");
    } finally {
      setBusy(false);
    }
  };

  const openExecute = (next: ExecuteTarget) => setTarget(next);

  const handleExecute = async () => {
    const current = target;
    setTarget(null);
    if (!current) return;
    setBusy(true);
    try {
      const res = await callFunction({
        action: "execute",
        email: current.email,
        notes: notes.trim() || null,
        ...(current.requestId ? { requestId: current.requestId } : {}),
      });
      if ((res as { accountFound?: boolean }).accountFound === false) {
        toast.warning(
          res.suppressed
            ? "Aucun compte pour cette adresse. Demande enregistrée comme traitée et adresse ajoutée à la liste de blocage."
            : "Aucun compte pour cette adresse. Demande enregistrée comme traitée. Le blocage de l'adresse a échoué : à reprendre dans Emails.",
        );
      } else {
        const failures = Array.isArray(res.storageFailures) ? res.storageFailures.length : 0;
        const parts = ["Effacement exécuté"];
        parts.push(res.acknowledged ? "accusé de traitement envoyé" : "accusé à envoyer à la main");
        parts.push(res.suppressed ? "adresse bloquée" : "adresse à bloquer à la main");
        if (failures > 0) parts.push(`${failures} espace(s) de fichiers à purger à la main`);
        const text = parts.join(", ") + ".";
        if (res.acknowledged && res.suppressed && failures === 0) toast.success(text);
        else toast.warning(text);
      }
      setLookup(null);
      setEmail("");
      setNotes("");
      await load();
      refreshAdminBadges();
    } catch (e) {
      if (e instanceof FunctionCallError && e.status === 409) {
        // Engagements actifs : la fonction a enregistré la demande en attente.
        toast.warning(
          e.body?.recorded
            ? "Engagements actifs. La demande est enregistrée en attente, à exécuter après la fin des gardes et candidatures."
            : e.message,
        );
        await load();
        refreshAdminBadges();
      } else {
        toast.error(e instanceof Error ? e.message : "Effacement impossible");
      }
    } finally {
      setBusy(false);
    }
  };

  const pending = lookup?.pendingRequest ?? null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Demandes RGPD"
        description="Traçabilité des demandes d'effacement, y compris celles reçues par email. Une demande enregistrée garde sa date de réception et son échéance d'un mois. Chaque exécution anonymise le compte, envoie un accusé de traitement et bloque l'adresse."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Traiter une demande reçue par email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              placeholder="adresse@exemple.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="sm:max-w-sm"
              aria-label="Adresse email du demandeur"
            />
            <Button onClick={handleLookup} disabled={busy || !email.trim()} variant="secondary">
              <Search className="mr-2 h-4 w-4" />
              Rechercher le compte
            </Button>
          </div>

          {lookup && (
            <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2 text-sm">
              {lookup.found ? (
                <>
                  <p className="font-medium text-foreground">
                    Compte trouvé : {[lookup.firstName, lookup.lastName].filter(Boolean).join(" ") || lookup.email}
                  </p>
                  <p className="text-muted-foreground">Identifiant : {lookup.userId}</p>
                  <ul className="text-muted-foreground space-y-1">
                    <li>Gardes confirmées : {lookup.confirmedSits}</li>
                    <li>Candidatures en attente : {lookup.pendingApplications}</li>
                  </ul>
                  {lookup.blocked && (
                    <p className="flex items-start gap-2 text-destructive">
                      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      Engagements actifs détectés. Enregistrez la demande dès aujourd'hui : l'effacement
                      s'exécute une fois ces gardes ou candidatures finalisées ou annulées.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">
                  Aucun compte ne correspond à cette adresse. L'exécution enregistrera tout de même la
                  demande comme traitée et ajoutera l'adresse à la liste de blocage.
                </p>
              )}

              {pending && (
                <p className="text-foreground" data-testid="pending-request">
                  Demande enregistrée le {fmtDay(pending.requestedAt)}, à traiter avant le{" "}
                  {fmtDay(pending.scheduledDeletionAt)}.
                </p>
              )}

              <Textarea
                placeholder="Notes de conformité (canal de la demande, pièce justificative, référence)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant={lookup.found && lookup.blocked ? "default" : "secondary"}
                  disabled={busy || Boolean(pending)}
                  onClick={handleRecord}
                >
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Enregistrer la demande
                </Button>
                <Button
                  variant="destructive"
                  disabled={busy || (lookup.found && lookup.blocked)}
                  onClick={() =>
                    openExecute({ email: (lookup.email ?? email).trim(), requestId: pending?.id ?? null })
                  }
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Exécuter l'effacement
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Historique des demandes</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Rafraîchir
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune demande enregistrée.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Statut</TableHead>
                    <TableHead>Demandeur</TableHead>
                    <TableHead>Origine</TableHead>
                    <TableHead>Demandée le</TableHead>
                    <TableHead>À traiter avant</TableHead>
                    <TableHead>Traitée le</TableHead>
                    <TableHead>Traitée par</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Badge variant={r.status === "completed" ? "secondary" : "outline"}>
                          {STATUS_LABEL[r.status] ?? adminLabel(r.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.requester_email ?? (r.user_id ? r.user_id : "·")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {SOURCE_LABEL[r.source] ?? adminLabel(r.source)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmt(r.requested_at)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.status === "pending" ? fmtDay(r.scheduled_deletion_at) : "·"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmt(r.processed_at)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.processed_by ? (admins[r.processed_by] ?? r.processed_by) : "·"}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground" title={r.notes ?? ""}>
                        {r.notes ?? "·"}
                      </TableCell>
                      <TableCell>
                        {r.status === "pending" && r.requester_email ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            aria-label={`Exécuter la demande de ${r.requester_email}`}
                            onClick={() => openExecute({ email: r.requester_email as string, requestId: r.id })}
                          >
                            Exécuter
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">·</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={target !== null} onOpenChange={(o) => { if (!o) setTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'effacement définitif</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action anonymise définitivement le compte associé à {target?.email} et supprime
              ses fichiers. Un accusé de traitement est envoyé au demandeur et son adresse est ajoutée
              à la liste de blocage. Avec une garde ou une candidature en cours, la demande reste
              enregistrée en attente. L'opération est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleExecute}>Exécuter l'effacement</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
