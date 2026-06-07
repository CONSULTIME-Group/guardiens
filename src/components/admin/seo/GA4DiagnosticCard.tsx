import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface DailyPoint { date: string; events: number; sessions: number }
interface Diag {
  measurement_id: string;
  property_id: string;
  service_account_configured: boolean;
  service_account_email?: string;
  realtime_active_users?: number;
  realtime_error?: string;
  last_event_date?: string | null;
  last_event_count?: number;
  total_events_30d?: number;
  total_sessions_30d?: number;
  last_event_error?: string;
  daily_series?: DailyPoint[];
  error?: string;
  checked_at: string;
}

const formatGa4Date = (d: string) => {
  if (!d || d.length !== 8) return d;
  const date = new Date(`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}T00:00:00Z`);
  return format(date, "dd MMM yyyy", { locale: fr });
};

const GA4DiagnosticCard = () => {
  const [data, setData] = useState<Diag | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [tagDetected, setTagDetected] = useState<boolean | null>(null);
  const [localLastEvent, setLocalLastEvent] = useState<string | null>(null);

  const fetchLocalLast = async () => {
    const { data: row } = await supabase
      .from("analytics_events")
      .select("created_at")
      .eq("event_type", "admin_ga4_diag_test")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (row?.created_at) {
      setLocalLastEvent(row.created_at);
      return;
    }
    const { data: anyRow } = await supabase
      .from("analytics_events")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setLocalLastEvent(anyRow?.created_at ?? null);
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("ga4-diagnostic");
      if (error) throw error;
      setData(res as Diag);
    } catch (e) {
      setData({
        measurement_id: "",
        property_id: "",
        service_account_configured: false,
        checked_at: new Date().toISOString(),
        error: (e as Error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  const sendTestEvent = async () => {
    setSending(true);
    try {
      // 1) Fire GA4 event via gtag (if present)
      const gtag = (window as any).gtag;
      let gtagSent = false;
      if (typeof gtag === "function") {
        gtag("event", "admin_ga4_diag_test", {
          event_category: "admin_diagnostic",
          event_label: new Date().toISOString(),
          send_to: data?.measurement_id,
        });
        gtagSent = true;
      }
      // 2) Insert local analytics_events row
      const { data: { user } } = await supabase.auth.getUser();
      const { error: insertError } = await supabase.from("analytics_events").insert({
        event_type: "admin_ga4_diag_test",
        source: "admin/seo",
        user_id: user?.id ?? null,
        metadata: { ts: new Date().toISOString(), gtag: gtagSent },
      });
      if (insertError) throw insertError;
      await fetchLocalLast();
      toast({
        title: "Événement de test envoyé",
        description: gtagSent
          ? "Envoyé à GA4 et à la table locale. GA4 peut mettre quelques minutes à le refléter."
          : "Tag GA4 absent sur cette page. Événement local enregistré.",
      });
    } catch (e) {
      toast({
        title: "Échec de l'envoi",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    load();
    fetchLocalLast();
    // Poll pour gtag pendant 6 s : le script est chargé en async via
    // requestIdleCallback, il peut ne pas être encore prêt au mount.
    let elapsed = 0;
    const interval = window.setInterval(() => {
      const present = typeof (window as any).gtag === "function";
      if (present) {
        setTagDetected(true);
        window.clearInterval(interval);
        return;
      }
      elapsed += 500;
      if (elapsed >= 6000) {
        setTagDetected(false);
        window.clearInterval(interval);
      }
    }, 500);
    return () => window.clearInterval(interval);
  }, []);


  const ga4Healthy =
    data?.service_account_configured &&
    !data?.realtime_error &&
    !data?.last_event_error &&
    (data?.total_events_30d ?? 0) > 0;

  const StatusIcon = ({ ok, warn }: { ok: boolean; warn?: boolean }) =>
    ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> :
    warn ? <AlertTriangle className="h-4 w-4 text-warning" /> :
    <XCircle className="h-4 w-4 text-destructive" />;

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" /> Diagnostic GA4
          {data && (
            <Badge variant={ga4Healthy ? "default" : "destructive"} className="ml-2">
              {ga4Healthy ? "OK" : "À vérifier"}
            </Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={sendTestEvent} disabled={sending}>
            <Send className={`h-3.5 w-3.5 mr-1 ${sending ? "animate-pulse" : ""}`} />
            Envoyer un événement test
          </Button>
          <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
            Recharger
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* Identifiants */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-md border bg-muted/30 px-3 py-2">
            <p className="text-xs text-muted-foreground">Measurement ID</p>
            <code className="text-sm font-mono">{data?.measurement_id || "–"}</code>
          </div>
          <div className="rounded-md border bg-muted/30 px-3 py-2">
            <p className="text-xs text-muted-foreground">Property ID</p>
            <code className="text-sm font-mono">{data?.property_id || "–"}</code>
          </div>
        </div>

        {/* Statuts */}
        <div className="space-y-2 border rounded-md p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Tag gtag.js chargé sur cette page</span>
            <span className="flex items-center gap-1.5">
              <StatusIcon ok={!!tagDetected} />
              <span className="font-medium">{tagDetected ? "Présent" : "Absent"}</span>
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Compte de service Google</span>
            <span className="flex items-center gap-1.5">
              <StatusIcon ok={!!data?.service_account_configured} />
              <span className="font-medium">
                {data?.service_account_configured ? "Configuré" : "Manquant"}
              </span>
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Utilisateurs actifs (temps réel · 30 min)</span>
            <span className="flex items-center gap-1.5">
              <StatusIcon
                ok={(data?.realtime_active_users ?? 0) > 0}
                warn={!data?.realtime_error && (data?.realtime_active_users ?? 0) === 0}
              />
              <span className="font-medium tabular-nums">
                {data?.realtime_error ? "Erreur" : (data?.realtime_active_users ?? "–")}
              </span>
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Dernier événement reçu (GA4)</span>
            <span className="flex items-center gap-1.5">
              <StatusIcon
                ok={!!data?.last_event_date}
                warn={!data?.last_event_error && !data?.last_event_date}
              />
              <span className="font-medium">
                {data?.last_event_error
                  ? "Erreur"
                  : data?.last_event_date
                    ? `${formatGa4Date(data.last_event_date)} · ${(data.last_event_count ?? 0).toLocaleString()} ev.`
                    : "Aucun"}
              </span>
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Dernier événement local (table analytics_events)</span>
            <span className="flex items-center gap-1.5">
              <StatusIcon ok={!!localLastEvent} />
              <span className="font-medium">
                {localLastEvent
                  ? format(new Date(localLastEvent), "dd MMM yyyy HH:mm", { locale: fr })
                  : "Aucun"}
              </span>
            </span>
          </div>
        </div>

        {/* Totaux 30j */}
        {data && !data.last_event_error && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border bg-muted/30 px-3 py-2">
              <p className="text-xs text-muted-foreground">Événements (30j)</p>
              <p className="text-lg font-bold tabular-nums">
                {(data.total_events_30d ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-md border bg-muted/30 px-3 py-2">
              <p className="text-xs text-muted-foreground">Sessions (30j)</p>
              <p className="text-lg font-bold tabular-nums">
                {(data.total_sessions_30d ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Erreurs */}
        {(data?.error || data?.realtime_error || data?.last_event_error) && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-1 text-xs text-destructive">
            {data.error && <p><strong>Erreur :</strong> {data.error}</p>}
            {data.realtime_error && <p><strong>Realtime :</strong> {data.realtime_error}</p>}
            {data.last_event_error && <p><strong>Historique :</strong> {data.last_event_error}</p>}
          </div>
        )}

        {data?.service_account_email && (
          <p className="text-[11px] text-muted-foreground">
            Compte de service : <code>{data.service_account_email}</code>
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default GA4DiagnosticCard;
