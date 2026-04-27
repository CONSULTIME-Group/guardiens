import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertTriangle, CheckCircle2, RefreshCw, Search, Trash2, ExternalLink, Archive, ShieldAlert, Info,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import NetworkErrorsSection from "@/components/admin/NetworkErrorsSection";

interface ErrorLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  message: string;
  stack: string | null;
  source: string | null;
  line_no: number | null;
  col_no: number | null;
  url: string | null;
  user_agent: string | null;
  severity: string;
  context: any;
  fingerprint: string;
  occurrences: number;
  first_seen_at: string;
  last_seen_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  admin_notes: string | null;
  created_at: string;
}

/**
 * Erreurs filtrées automatiquement parce qu'elles proviennent de JS injecté
 * par une source tierce (WebView in-app, extension, pixel marketing…).
 * Voir src/lib/errorLogger.ts → detectThirdPartySource.
 */
const THIRD_PARTY_REASON_LABELS: Record<string, { label: string; explanation: string }> = {
  in_app_webview: {
    label: "WebView in-app (FB, IG, TikTok…)",
    explanation:
      "L'utilisateur a ouvert le site depuis le navigateur intégré d'une application (Facebook FB_IAB/FBAV, Instagram, TikTok, Snapchat…). Ces WebViews injectent du JS instable (autofill, bridges natifs, trackers) qui génère des erreurs hors de notre contrôle. Toutes les erreurs reçues depuis ces sessions sont automatiquement écartées.",
  },
  webview_bridge: {
    label: "Bridge WebView in-app",
    explanation:
      "L'erreur a été déclenchée par un script natif injecté par l'application Facebook, Instagram, TikTok… (ex : autofill de contact). Ce code ne fait pas partie de notre bundle et nous ne pouvons pas le corriger.",
  },
  extension: {
    label: "Extension navigateur",
    explanation:
      "L'erreur provient d'une extension installée par l'utilisateur (chrome-extension://, moz-extension://…). Hors de notre périmètre.",
  },
  tracking_pixel: {
    label: "Pixel marketing / analytics",
    explanation:
      "L'erreur vient d'un script tiers de tracking (Google Tag Manager, Meta Pixel, Hotjar, Intercom…). Non actionnable depuis notre code.",
  },
  cross_origin_script: {
    label: "Script cross-origin",
    explanation:
      "L'erreur provient d'un script chargé depuis un autre domaine que le nôtre. Probablement un service tiers intégré.",
  },
  anonymous_inline: {
    label: "Script inline anonyme",
    explanation:
      "Aucune source identifiable et stack majoritairement anonyme — typique d'un JS injecté inline par un WebView ou un script tiers.",
  },
  empty_source: {
    label: "Source vide",
    explanation: "Le navigateur n'a pas fourni de source pour cette erreur (souvent cross-origin masqué).",
  },
};

function getThirdPartyInfo(ctx: any): { reason: string; label: string; explanation: string } | null {
  if (!ctx || ctx.filtered !== true) return null;
  const reason = typeof ctx.filter_reason === "string" ? ctx.filter_reason : null;
  if (!reason) return null;
  const meta = THIRD_PARTY_REASON_LABELS[reason] ?? {
    label: "Source tierce",
    explanation: "Erreur ignorée car elle ne provient pas de notre code.",
  };
  return { reason, ...meta };
}

const AdminErrors = () => {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"unresolved" | "resolved" | "all">("unresolved");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ErrorLog | null>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("error_logs").select("*").order("last_seen_at", { ascending: false }).limit(200);
    if (filter === "unresolved") q = q.is("resolved_at", null);
    if (filter === "resolved") q = q.not("resolved_at", "is", null);
    if (severityFilter !== "all") q = q.eq("severity", severityFilter);
    // Par défaut, on masque les erreurs marquées tierces (autofill WebView FB/IG, extensions…)
    // — elles polluent le panneau alors qu'elles ne viennent pas de notre bundle.
    else q = q.neq("severity", "ignored_third_party");
    const { data, error } = await q;
    if (error) toast.error("Erreur de chargement");
    setErrors((data as ErrorLog[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter, severityFilter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return errors;
    const s = search.toLowerCase();
    return errors.filter(
      (e) =>
        e.message?.toLowerCase().includes(s) ||
        e.url?.toLowerCase().includes(s) ||
        e.user_email?.toLowerCase().includes(s) ||
        e.source?.toLowerCase().includes(s),
    );
  }, [errors, search]);

  const stats = useMemo(() => {
    const unresolved = errors.filter((e) => !e.resolved_at).length;
    const totalOcc = errors.reduce((sum, e) => sum + (e.occurrences || 1), 0);
    const last24h = errors.filter(
      (e) => new Date(e.last_seen_at).getTime() > Date.now() - 24 * 3600_000,
    ).length;
    const affected = new Set(errors.filter((e) => e.user_email).map((e) => e.user_email)).size;
    return { unresolved, totalOcc, last24h, affected };
  }, [errors]);

  const resolve = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("error_logs")
      .update({ resolved_at: new Date().toISOString(), resolved_by: user?.id })
      .eq("id", id);
    if (error) toast.error("Échec");
    else {
      toast.success("Erreur marquée résolue");
      window.dispatchEvent(new Event("admin-badges-refresh"));
      load();
      setSelected(null);
    }
  };

  const reopen = async (id: string) => {
    const { error } = await supabase
      .from("error_logs")
      .update({ resolved_at: null, resolved_by: null })
      .eq("id", id);
    if (error) toast.error("Échec");
    else { load(); window.dispatchEvent(new Event("admin-badges-refresh")); }
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer définitivement cette erreur ?")) return;
    const { error } = await supabase.from("error_logs").delete().eq("id", id);
    if (error) toast.error("Échec");
    else { toast.success("Supprimée"); load(); setSelected(null); window.dispatchEvent(new Event("admin-badges-refresh")); }
  };

  const [archiving, setArchiving] = useState(false);
  const archiveAll = async () => {
    const targets = filtered.filter((e) => !e.resolved_at);
    if (targets.length === 0) {
      toast.info("Aucune erreur non résolue à archiver");
      return;
    }
    if (!confirm(`Archiver (marquer comme résolues) ${targets.length} erreur(s) ?`)) return;
    setArchiving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const ids = targets.map((e) => e.id);
    const { error } = await supabase
      .from("error_logs")
      .update({ resolved_at: new Date().toISOString(), resolved_by: user?.id })
      .in("id", ids);
    setArchiving(false);
    if (error) toast.error("Échec de l'archivage");
    else {
      toast.success(`${ids.length} erreur(s) archivée(s)`);
      window.dispatchEvent(new Event("admin-badges-refresh"));
      load();
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            Erreurs utilisateurs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Erreurs JavaScript et exceptions captées dans le navigateur des utilisateurs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={archiveAll}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={archiving || loading || filtered.filter((e) => !e.resolved_at).length === 0}
          >
            <Archive className="h-4 w-4" />
            {archiving ? "Archivage…" : "Tout archiver"}
          </Button>
          <Button onClick={load} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" /> Actualiser
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Non résolues</CardDescription></CardHeader>
          <CardContent><p className="text-3xl font-bold text-destructive">{stats.unresolved}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Occurrences totales</CardDescription></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats.totalOcc}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Dernières 24h</CardDescription></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats.last24h}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Utilisateurs affectés</CardDescription></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats.affected}</p></CardContent>
        </Card>
      </div>

      {/* Section dédiée aux erreurs réseau (NetworkErrorMonitor) */}
      <NetworkErrorsSection />

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="unresolved">Non résolues</SelectItem>
            <SelectItem value="resolved">Résolues</SelectItem>
            <SelectItem value="all">Toutes</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes sévérités</SelectItem>
            <SelectItem value="error">Erreur</SelectItem>
            <SelectItem value="unhandled_rejection">Promise rejetée</SelectItem>
            <SelectItem value="warning">Avertissement</SelectItem>
            <SelectItem value="ignored_third_party">Ignorée (script tiers)</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher message, URL, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Liste */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Chargement…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-primary" />
              Aucune erreur à afficher.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((e) => (
                <li
                  key={e.id}
                  className="p-4 hover:bg-accent/40 cursor-pointer transition-colors"
                  onClick={() => setSelected(e)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {(() => {
                          const tp = getThirdPartyInfo(e.context);
                          if (tp) {
                            return (
                              <Badge
                                className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/40 hover:bg-amber-500/20 gap-1"
                                title={tp.explanation}
                              >
                                <ShieldAlert className="h-3 w-3" />
                                Ignorée · {tp.label}
                              </Badge>
                            );
                          }
                          return (
                            <Badge variant={e.severity === "error" ? "destructive" : "secondary"}>
                              {e.severity}
                            </Badge>
                          );
                        })()}
                        <Badge variant="outline">×{e.occurrences}</Badge>
                        {e.resolved_at && (
                          <Badge variant="outline" className="text-primary border-primary">
                            résolue
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(e.last_seen_at), { addSuffix: true, locale: fr })}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground line-clamp-2">{e.message}</p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {e.url ?? "—"}
                        {e.source ? ` · ${e.source}${e.line_no ? `:${e.line_no}` : ""}` : ""}
                      </p>
                      {e.user_email && (
                        <p className="text-xs text-muted-foreground mt-0.5">👤 {e.user_email}</p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Détails de l'erreur
                </DialogTitle>
                <DialogDescription>
                  Vue ×{selected.occurrences} fois — première fois{" "}
                  {format(new Date(selected.first_seen_at), "Pp", { locale: fr })}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {(() => {
                  const tp = getThirdPartyInfo(selected.context);
                  if (!tp) return null;
                  return (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 flex gap-3">
                      <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-1.5 text-sm">
                        <p className="font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-2 flex-wrap">
                          Erreur ignorée automatiquement
                          <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-300 font-normal">
                            {tp.label}
                          </Badge>
                        </p>
                        <p className="text-amber-900/80 dark:text-amber-100/80 leading-relaxed">
                          {tp.explanation}
                        </p>
                        <p className="text-xs text-amber-900/70 dark:text-amber-100/70 flex items-center gap-1 pt-1">
                          <Info className="h-3 w-3" />
                          Conservée à titre informatif (1 entrée max par heure et par empreinte). Aucune action requise.
                        </p>
                      </div>
                    </div>
                  );
                })()}

                <div>
                  <p className="text-xs uppercase text-muted-foreground mb-1">Message</p>
                  <p className="text-sm font-mono bg-muted p-3 rounded">{selected.message}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground mb-1">Sévérité</p>
                    <Badge variant={selected.severity === "error" ? "destructive" : "secondary"}>
                      {selected.severity}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground mb-1">Empreinte</p>
                    <p className="font-mono text-xs">{selected.fingerprint}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground mb-1">Première vue</p>
                    <p>{format(new Date(selected.first_seen_at), "PPp", { locale: fr })}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground mb-1">Dernière vue</p>
                    <p>{format(new Date(selected.last_seen_at), "PPp", { locale: fr })}</p>
                  </div>
                </div>

                {selected.user_email && (
                  <div>
                    <p className="text-xs uppercase text-muted-foreground mb-1">Utilisateur</p>
                    <p className="text-sm">{selected.user_email}</p>
                  </div>
                )}

                {selected.url && (
                  <div>
                    <p className="text-xs uppercase text-muted-foreground mb-1">URL</p>
                    <a
                      href={selected.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1 break-all"
                    >
                      {selected.url} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {selected.source && (
                  <div>
                    <p className="text-xs uppercase text-muted-foreground mb-1">Source</p>
                    <p className="text-sm font-mono">
                      {selected.source}
                      {selected.line_no ? `:${selected.line_no}` : ""}
                      {selected.col_no ? `:${selected.col_no}` : ""}
                    </p>
                  </div>
                )}

                {selected.stack && (
                  <div>
                    <p className="text-xs uppercase text-muted-foreground mb-1">Stack trace</p>
                    <pre className="text-xs font-mono bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap max-h-64">
                      {selected.stack}
                    </pre>
                  </div>
                )}

                {selected.context && (
                  <div>
                    <p className="text-xs uppercase text-muted-foreground mb-1">Contexte</p>
                    <pre className="text-xs font-mono bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap max-h-48">
                      {JSON.stringify(selected.context, null, 2)}
                    </pre>
                  </div>
                )}

                {selected.user_agent && (
                  <div>
                    <p className="text-xs uppercase text-muted-foreground mb-1">User Agent</p>
                    <p className="text-xs text-muted-foreground break-all">{selected.user_agent}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                  {selected.resolved_at ? (
                    <Button onClick={() => reopen(selected.id)} variant="outline">
                      Rouvrir
                    </Button>
                  ) : (
                    <Button onClick={() => resolve(selected.id)} className="gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Marquer résolue
                    </Button>
                  )}
                  <Button onClick={() => remove(selected.id)} variant="destructive" className="gap-2 ml-auto">
                    <Trash2 className="h-4 w-4" /> Supprimer
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminErrors;
