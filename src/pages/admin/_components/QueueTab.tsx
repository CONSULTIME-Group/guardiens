import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Search, Inbox, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface DeferredRow {
  id: string;
  recipient_email: string;
  template_name: string;
  status: string;
  attempts: number;
  scheduled_for: string;
  defer_reason: string;
  last_error: string | null;
  last_attempt_at: string | null;
  created_at: string;
  idempotency_key: string | null;
}

interface SendLogRow {
  id: string;
  resend_id: string | null;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  delivered_at: string | null;
  bounced_at: string | null;
  complained_at: string | null;
  open_count: number;
  first_opened_at: string | null;
  last_opened_at: string | null;
  click_count: number;
  first_clicked_at: string | null;
  last_clicked_at: string | null;
  last_clicked_url: string | null;
  created_at: string;
  metadata: { bypass?: boolean; isUrgent?: boolean } | null;
}

const statusBadge = (s: string) => {
  const cls: Record<string, string> = {
    pending: "bg-warning/15 text-warning border-warning/30",
    processing: "bg-info/15 text-info border-info/30",
    sent: "bg-success/15 text-success border-success/30",
    delivered: "bg-success/15 text-success border-success/30",
    failed: "bg-destructive/15 text-destructive border-destructive/30",
    dlq: "bg-destructive/15 text-destructive border-destructive/30",
    bounced: "bg-destructive/15 text-destructive border-destructive/30",
    complained: "bg-destructive/15 text-destructive border-destructive/30",
    suppressed: "bg-muted text-muted-foreground border-border",
    cancelled: "bg-muted text-muted-foreground border-border",
  };
  return <Badge variant="outline" className={cls[s] ?? ""}>{s}</Badge>;
};

const fmt = (d: string | null) =>
  d ? format(new Date(d), "dd/MM/yyyy HH:mm", { locale: fr }) : ",";

const urgencyBadge = (metadata: SendLogRow["metadata"]) => {
  if (!metadata) return null;
  if (metadata.isUrgent) {
    return <Badge variant="outline" className="bg-warning-soft text-warning border-warning-border text-[10px]">Urgent</Badge>;
  }
  if (metadata.bypass) {
    return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">Bypass</Badge>;
  }
  return <Badge variant="outline" className="text-muted-foreground text-[10px]">Standard</Badge>;
};

export function QueueTab() {
  // ── Deferred queue ──
  const [rows, setRows] = useState<DeferredRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const loadQueue = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("email_deferred_queue")
      .select("*")
      .order("scheduled_for", { ascending: true })
      .limit(200);
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    const { data, error } = await q;
    if (error) toast.error("Impossible de charger la file");
    else setRows((data ?? []) as DeferredRow[]);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // ── Idempotency hits (alertes doublons) ──
  type IdemRow = { day: string; template_name: string; hit_type: string; hits: number };
  const [idemRows, setIdemRows] = useState<IdemRow[]>([]);
  const [idemDays, setIdemDays] = useState<7 | 14 | 30>(7);
  const [idemLoading, setIdemLoading] = useState(false);

  const loadIdemHits = useCallback(async () => {
    setIdemLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - idemDays);
    const sinceIso = since.toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("email_idempotency_daily_counts" as any)
      .select("*")
      .gte("day", sinceIso)
      .order("day", { ascending: false });
    if (error) toast.error("Impossible de charger les doublons");
    else setIdemRows(((data ?? []) as any[]) as IdemRow[]);
    setIdemLoading(false);
  }, [idemDays]);

  useEffect(() => {
    loadIdemHits();
  }, [loadIdemHits]);

  const idemTotals = idemRows.reduce(
    (acc, r) => {
      if (r.hit_type === "duplicate_send") acc.dup += Number(r.hits);
      else if (r.hit_type === "already_queued") acc.queued += Number(r.hits);
      acc.total += Number(r.hits);
      return acc;
    },
    { dup: 0, queued: 0, total: 0 },
  );

  // ── Lookup par resend_id ──
  const [lookup, setLookup] = useState("");
  const [logRows, setLogRows] = useState<SendLogRow[] | null>(null);
  const [searching, setSearching] = useState(false);

  const search = async () => {
    const term = lookup.trim();
    if (!term) {
      toast.info("Saisissez un resend_id, message_id ou email");
      return;
    }
    setSearching(true);
    const { data, error } = await supabase
      .from("email_send_log")
      .select("*")
      .or(
        `resend_id.eq.${term},message_id.eq.${term},recipient_email.eq.${term}`
      )
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      toast.error("Recherche échouée");
    } else {
      setLogRows((data ?? []) as SendLogRow[]);
    }
    setSearching(false);
  };

  return (
    <div className="space-y-6">
      {/* === File différée === */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-body text-lg font-semibold flex items-center gap-2">
                <Inbox className="h-4 w-4" /> File d'envoi différée
              </h2>
              <p className="text-sm text-muted-foreground">
                Emails en attente, en cours, ou échoués après plusieurs tentatives.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="processing">En traitement</SelectItem>
                  <SelectItem value="sent">Envoyés</SelectItem>
                  <SelectItem value="failed">Échoués</SelectItem>
                  <SelectItem value="dlq">DLQ</SelectItem>
                  <SelectItem value="cancelled">Annulés</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={loadQueue} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destinataire</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-center">Tentatives</TableHead>
                  <TableHead>Prochaine tentative</TableHead>
                  <TableHead>Dernière tentative</TableHead>
                  <TableHead>Raison / Erreur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                      {loading ? "Chargement…" : "Aucun email dans la file."}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">{r.recipient_email}</TableCell>
                      <TableCell className="text-xs font-mono">{r.template_name}</TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell className="text-center text-sm">{r.attempts}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{fmt(r.scheduled_for)}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{fmt(r.last_attempt_at)}</TableCell>
                      <TableCell className="text-xs max-w-xs truncate" title={r.last_error ?? r.defer_reason}>
                        {r.last_error || r.defer_reason}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {rows.length === 200 && (
            <p className="text-xs text-muted-foreground">
              Affichage limité à 200 lignes, affinez le filtre pour voir le reste.
            </p>
          )}
        </CardContent>
      </Card>

      {/* === Doublons de clé d'idempotence === */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-body text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" /> Doublons de clé d'idempotence
              </h2>
              <p className="text-sm text-muted-foreground">
                Comptage par jour et par template des appels où la même <code className="text-xs">idempotencyKey</code> a été détectée comme déjà envoyée ou déjà en file.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={String(idemDays)} onValueChange={(v) => setIdemDays(Number(v) as 7 | 14 | 30)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 jours</SelectItem>
                  <SelectItem value="14">14 jours</SelectItem>
                  <SelectItem value="30">30 jours</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={loadIdemHits} disabled={idemLoading}>
                <RefreshCw className={`h-4 w-4 ${idemLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Card><CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold">{idemTotals.total}</div>
              <div className="text-xs text-muted-foreground">Total ({idemDays} j)</div>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-info">{idemTotals.dup}</div>
              <div className="text-xs text-muted-foreground">duplicate_send</div>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-warning">{idemTotals.queued}</div>
              <div className="text-xs text-muted-foreground">already_queued</div>
            </CardContent></Card>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jour</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Hits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {idemRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                      {idemLoading ? "Chargement…" : "Aucun doublon sur la période, l'idempotence fait son travail."}
                    </TableCell>
                  </TableRow>
                ) : (
                  idemRows.map((r, i) => (
                    <TableRow key={`${r.day}-${r.template_name}-${r.hit_type}-${i}`}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(r.day), "dd/MM/yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{r.template_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          r.hit_type === "duplicate_send"
                            ? "bg-info/15 text-info border-info/30 text-[10px]"
                            : "bg-warning/15 text-warning border-warning/30 text-[10px]"
                        }>
                          {r.hit_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold">{r.hits}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <h2 className="font-body text-lg font-semibold flex items-center gap-2">
              <Search className="h-4 w-4" /> Recherche par resend_id, message_id ou email
            </h2>
            <p className="text-sm text-muted-foreground">
              Affiche le statut détaillé (envoi, ouverture, clic, bounce, plainte) depuis email_send_log.
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="ex : 4ef9b2d8-… ou destinataire@email.com"
              value={lookup}
              onChange={(e) => setLookup(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
            <Button onClick={search} disabled={searching}>
              <Search className="h-4 w-4 mr-2" />
              Rechercher
            </Button>
          </div>

          {logRows !== null && (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Destinataire</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Délivré</TableHead>
                    <TableHead className="text-center">Ouv.</TableHead>
                    <TableHead className="text-center">Clics</TableHead>
                    <TableHead>Bounce / Plainte</TableHead>
                    <TableHead>resend_id</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">
                        Aucun résultat.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logRows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs whitespace-nowrap">{fmt(r.created_at)}</TableCell>
                        <TableCell className="text-xs font-mono">{r.template_name}</TableCell>
                        <TableCell>{urgencyBadge(r.metadata)}</TableCell>
                        <TableCell className="text-sm">{r.recipient_email}</TableCell>
                        <TableCell>{statusBadge(r.status)}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{fmt(r.delivered_at)}</TableCell>
                        <TableCell className="text-center text-sm">
                          {r.open_count > 0 ? (
                            <span title={`Dernière : ${fmt(r.last_opened_at)}`}>{r.open_count}</span>
                          ) : (
                            ","
                          )}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {r.click_count > 0 ? (
                            <span title={r.last_clicked_url ?? ""}>{r.click_count}</span>
                          ) : (
                            ","
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.bounced_at && <div className="text-destructive">Bounce {fmt(r.bounced_at)}</div>}
                          {r.complained_at && <div className="text-destructive">Plainte {fmt(r.complained_at)}</div>}
                          {r.error_message && (
                            <div className="text-muted-foreground truncate max-w-[200px]" title={r.error_message}>
                              {r.error_message}
                            </div>
                          )}
                          {!r.bounced_at && !r.complained_at && !r.error_message && ","}
                        </TableCell>
                        <TableCell className="text-xs font-mono truncate max-w-[160px]" title={r.resend_id ?? ""}>
                          {r.resend_id ?? ","}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
