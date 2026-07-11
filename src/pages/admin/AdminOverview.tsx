import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AlertTriangle, CheckCircle2, ArrowRight, RefreshCw, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Severity = "critical" | "todo" | "info";

interface Reco {
  key: string;
  severity: Severity;
  title: string;
  count?: number;
  analysis: string;
  action: string;
  to: string;
  details?: Array<{ label: string; to?: string }>;
}

interface Summary {
  generated_at: string;
  reports: { count: number; avg_days: number };
  missions_money: { count: number; items: Array<{ id: string; title: string; slug?: string }> };
  reviews_pending: { count: number };
  identity_pending: { count: number };
  pros_pending: { count: number; items: Array<{ id: string; name: string; user_id: string }> };
  email_pipeline: { critical: boolean; reasons: string[] };
  mass_emails_paused: { count: number; items: Array<{ id: string; subject: string }> };
  deferred_stuck: { count: number };
  sits_zero_apps: { count: number; items: Array<{ id: string; title: string; slug?: string }> };
  sits_overdue: { count: number; items: Array<{ id: string; title: string; end_date: string }> };
  new_incomplete: { count: number };
}

const SEVERITY_META: Record<Severity, { label: string; badge: string; ring: string; icon: typeof AlertTriangle }> = {
  critical: {
    label: "Critique",
    badge: "bg-destructive/15 text-destructive border-destructive/30",
    ring: "ring-destructive/40 bg-destructive/5",
    icon: AlertTriangle,
  },
  todo: {
    label: "À traiter",
    badge: "bg-warning/15 text-warning-foreground border-warning/30",
    ring: "ring-warning/40 bg-warning/5",
    icon: AlertTriangle,
  },
  info: {
    label: "Info",
    badge: "bg-muted text-muted-foreground border-border",
    ring: "ring-border bg-card",
    icon: Info,
  },
};

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, todo: 1, info: 2 };

function buildRecos(s: Summary): Reco[] {
  const list: Reco[] = [];

  if (s.reports.count > 0) {
    list.push({
      key: "reports",
      severity: "critical",
      title: "Signalements non traités",
      count: s.reports.count,
      analysis: `${s.reports.count} signalement${s.reports.count > 1 ? "s" : ""} en attente depuis en moyenne ${s.reports.avg_days} jour${s.reports.avg_days > 1 ? "s" : ""}.`,
      action: "Trancher chaque signalement (résoudre ou classer).",
      to: "/admin/reports",
    });
  }

  if (s.email_pipeline.critical) {
    list.push({
      key: "email_pipeline",
      severity: "critical",
      title: "Anomalie pipeline email",
      analysis: s.email_pipeline.reasons.length > 0 ? s.email_pipeline.reasons.join(", ") + "." : "Le pipeline d'envoi présente une anomalie.",
      action: "Vérifier le worker et les logs edge.",
      to: "/admin/errors",
    });
  }

  if (s.missions_money.count > 0) {
    list.push({
      key: "missions_money",
      severity: "todo",
      title: "Missions d'entraide avec mention d'argent",
      count: s.missions_money.count,
      analysis: `${s.missions_money.count} mission${s.missions_money.count > 1 ? "s" : ""} ouverte${s.missions_money.count > 1 ? "s" : ""} évoque${s.missions_money.count > 1 ? "nt" : ""} de l'argent, ce qui contredit la promesse d'entraide gratuite.`,
      action: "Contacter le posteur ou masquer.",
      to: "/admin/small-missions",
      details: s.missions_money.items.map((m) => ({ label: m.title, to: `/petites-missions/${m.slug ?? m.id}` })),
    });
  }

  if (s.reviews_pending.count > 0) {
    list.push({
      key: "reviews_pending",
      severity: "todo",
      title: "Avis en attente de modération",
      count: s.reviews_pending.count,
      analysis: `${s.reviews_pending.count} avis à valider ou masquer.`,
      action: "Passer la file de modération.",
      to: "/admin/reviews",
    });
  }

  if (s.identity_pending.count > 0) {
    list.push({
      key: "identity_pending",
      severity: "todo",
      title: "Vérifications d'identité en attente",
      count: s.identity_pending.count,
      analysis: `${s.identity_pending.count} profil${s.identity_pending.count > 1 ? "s" : ""} en attente de contrôle ID.`,
      action: "Vérifier les documents envoyés.",
      to: "/admin/verifications",
    });
  }

  if (s.pros_pending.count > 0) {
    list.push({
      key: "pros_pending",
      severity: "todo",
      title: "Dossiers Gardien Pro à valider",
      count: s.pros_pending.count,
      analysis: `${s.pros_pending.count} dossier${s.pros_pending.count > 1 ? "s" : ""} pro en attente.`,
      action: "Valider ou rejeter.",
      to: "/admin/pros",
      details: s.pros_pending.items.map((p) => ({ label: p.name || "(sans nom commercial)" })),
    });
  }

  if (s.mass_emails_paused.count > 0) {
    list.push({
      key: "mass_paused",
      severity: "todo",
      title: "Campagnes de masse en pause",
      count: s.mass_emails_paused.count,
      analysis: `${s.mass_emails_paused.count} campagne${s.mass_emails_paused.count > 1 ? "s" : ""} en pause.`,
      action: "Reprendre ou annuler.",
      to: "/admin/envois-groupes",
      details: s.mass_emails_paused.items.map((m) => ({ label: m.subject })),
    });
  }

  if (s.sits_overdue.count > 0) {
    list.push({
      key: "sits_overdue",
      severity: "todo",
      title: "Gardes en retard de clôture",
      count: s.sits_overdue.count,
      analysis: `${s.sits_overdue.count} garde${s.sits_overdue.count > 1 ? "s" : ""} confirmée${s.sits_overdue.count > 1 ? "s" : ""} dont la date de fin est passée sans passage en « terminée ».`,
      action: "Clôturer ou relancer les parties.",
      to: "/admin/sits-management",
      details: s.sits_overdue.items.map((x) => ({ label: `${x.title} (fin ${x.end_date})` })),
    });
  }

  if (s.deferred_stuck.count > 0) {
    list.push({
      key: "deferred_stuck",
      severity: "info",
      title: "Emails différés bloqués",
      count: s.deferred_stuck.count,
      analysis: `${s.deferred_stuck.count} email${s.deferred_stuck.count > 1 ? "s" : ""} en attente depuis plus d'une heure.`,
      action: "Vérifier le worker flush-deferred-emails.",
      to: "/admin/emails",
    });
  }

  if (s.sits_zero_apps.count > 0) {
    list.push({
      key: "sits_zero_apps",
      severity: "info",
      title: "Annonces sans candidature depuis 7 jours",
      count: s.sits_zero_apps.count,
      analysis: `${s.sits_zero_apps.count} annonce${s.sits_zero_apps.count > 1 ? "s" : ""} publiée${s.sits_zero_apps.count > 1 ? "s" : ""} n'a reçu aucune candidature depuis plus d'une semaine.`,
      action: "Pousser via l'envoi de proximité.",
      to: "/admin/listings",
      details: s.sits_zero_apps.items.map((x) => ({ label: x.title })),
    });
  }

  if (s.new_incomplete.count > 0) {
    list.push({
      key: "new_incomplete",
      severity: "info",
      title: "Nouveaux inscrits à profil incomplet",
      count: s.new_incomplete.count,
      analysis: `${s.new_incomplete.count} inscription${s.new_incomplete.count > 1 ? "s" : ""} des 7 derniers jours sous 60 % de complétion.`,
      action: "Lancer une relance ciblée.",
      to: "/admin/relance-incomplet",
    });
  }

  return list.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

const AdminOverview = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    const { data, error } = await supabase.rpc("admin_dashboard_summary" as never);
    if (error) {
      toast.error("Impossible de charger la vue d'ensemble");
      console.error(error);
    } else {
      setSummary(data as unknown as Summary);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const recos = summary ? buildRecos(summary) : [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Vue d'ensemble"
        description="Ce qui se passe maintenant et ce qu'il faut traiter, priorisé par sévérité."
        actions={
          <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing || loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Rafraîchir
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0,1,2,3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : recos.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-success mb-3" aria-hidden="true" />
            <p className="font-heading text-lg font-semibold">Rien ne demande votre attention.</p>
            <p className="text-sm text-muted-foreground mt-1">Aucun signal critique, à traiter ou d'alerte pour l'instant.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {recos.map((r) => {
            const meta = SEVERITY_META[r.severity];
            const Icon = meta.icon;
            return (
              <Card key={r.key} className={cn("ring-1", meta.ring)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      <CardTitle className="text-base">{r.title}</CardTitle>
                    </div>
                    <Badge variant="outline" className={cn("shrink-0", meta.badge)}>
                      {meta.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {typeof r.count === "number" && (
                    <p className="font-heading text-3xl font-bold text-foreground">{r.count}</p>
                  )}
                  <p className="text-sm text-foreground/80">{r.analysis}</p>
                  <p className="text-sm text-muted-foreground">{r.action}</p>
                  {r.details && r.details.length > 0 && (
                    <ul className="text-xs text-muted-foreground space-y-1 border-t border-border pt-2">
                      {r.details.slice(0, 5).map((d, idx) => (
                        <li key={idx} className="truncate">
                          {d.to ? (
                            <a href={d.to} target="_blank" rel="noreferrer" className="hover:text-foreground underline-offset-2 hover:underline">
                              {d.label}
                            </a>
                          ) : d.label}
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                    <Link to={r.to}>
                      Ouvrir
                      <ArrowRight className="h-4 w-4 ml-1" aria-hidden="true" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {summary && (
        <p className="text-xs text-muted-foreground">
          Généré à {new Date(summary.generated_at).toLocaleString("fr-FR")}
        </p>
      )}
    </div>
  );
};

export default AdminOverview;
