import { useCallback, useEffect, useState } from "react";
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
import { Search, ShieldAlert, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface RequestRow {
  id: string;
  user_id: string | null;
  requester_email: string | null;
  source: string;
  status: string;
  requested_at: string;
  processed_at: string | null;
  processed_by: string | null;
  notes: string | null;
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
}

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  completed: "Traitée",
  cancelled: "Annulée",
};

const SOURCE_LABEL: Record<string, string> = {
  self: "Depuis le compte",
  admin: "Reçue par email",
};

function fmt(date: string | null): string {
  if (!date) return "·";
  return new Date(date).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

export default function AdminDeletionRequests() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [admins, setAdmins] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("account_deletion_requests")
      .select("id, user_id, requester_email, source, status, requested_at, processed_at, processed_by, notes")
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
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") {
        try {
          const j = await ctx.json();
          if (j?.error) message = j.error;
        } catch { /* corps non JSON */ }
      }
      throw new Error(message);
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

  const handleExecute = async () => {
    setConfirmOpen(false);
    setBusy(true);
    try {
      const res = await callFunction({
        action: "execute",
        email: (lookup?.email ?? email).trim(),
        notes: notes.trim() || null,
      });
      if ((res as { accountFound?: boolean }).accountFound === false) {
        toast.warning(
          "Aucun compte pour cette adresse. Demande enregistrée comme traitée et adresse ajoutée à la liste de blocage.",
        );
      } else {
        toast.success("Effacement exécuté. Accusé de traitement envoyé et adresse bloquée.");
      }
      setLookup(null);
      setEmail("");
      setNotes("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Effacement impossible");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Demandes de suppression / RGPD"
        description="Traçabilité des demandes d'effacement, y compris celles reçues par email. Chaque exécution supprime le compte, envoie un accusé de traitement et bloque l'adresse."
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
                      Engagements actifs détectés. L'effacement est refusé tant que ces gardes ou
                      candidatures ne sont pas finalisées ou annulées.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">
                  Aucun compte ne correspond à cette adresse. L'exécution enregistrera tout de même la
                  demande comme traitée et ajoutera l'adresse à la liste de blocage.
                </p>
              )}

              <Textarea
                placeholder="Notes de conformité (canal de la demande, pièce justificative, référence)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />

              <Button
                variant="destructive"
                disabled={busy || (lookup.found && lookup.blocked)}
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Exécuter l'effacement
              </Button>
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
                    <TableHead>Traitée le</TableHead>
                    <TableHead>Traitée par</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Badge variant={r.status === "completed" ? "secondary" : "outline"}>
                          {STATUS_LABEL[r.status] ?? r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.requester_email ?? (r.user_id ? r.user_id : "·")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {SOURCE_LABEL[r.source] ?? r.source}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmt(r.requested_at)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmt(r.processed_at)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.processed_by ? (admins[r.processed_by] ?? r.processed_by) : "·"}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground" title={r.notes ?? ""}>
                        {r.notes ?? "·"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'effacement définitif</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprime définitivement le compte associé à {lookup?.email ?? email} et
              l'ensemble de ses données. Un accusé de traitement est envoyé au demandeur et son
              adresse est ajoutée à la liste de blocage. L'opération est irréversible.
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
