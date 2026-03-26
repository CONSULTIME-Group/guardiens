import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Calendar, MapPin, MessageSquare, Star, Search, Clock, ChevronRight, CheckCircle2, Eye, XCircle, Send as SendIcon, PawPrint, CircleDot, Clock3, Lock } from "lucide-react";
import VerificationBanner from "./VerificationBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

const appStatusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  pending: { label: "Envoyée", icon: SendIcon, className: "text-muted-foreground" },
  viewed: { label: "Vue", icon: Eye, className: "text-blue-600" },
  discussing: { label: "En discussion", icon: MessageSquare, className: "text-blue-600" },
  accepted: { label: "Acceptée", icon: CheckCircle2, className: "text-green-600" },
  rejected: { label: "Déclinée", icon: XCircle, className: "text-destructive" },
  cancelled: { label: "Annulée", icon: XCircle, className: "text-muted-foreground" },
};

const SitterDashboard = () => {
  const { user } = useAuth();
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [mySits, setMySits] = useState<any[]>([]);
  const [nearbyListings, setNearbyListings] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAvailable, setIsAvailable] = useState(false);
  const [metrics, setMetrics] = useState({ completed: 0, avgRating: null as string | null, reviewCount: 0 });
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [appsRes, unreadRes, reviewsRes, listingsRes, sitterRes] = await Promise.all([
        supabase.from("applications").select("*, sit:sits(id, title, start_date, end_date, status)").eq("sitter_id", user.id).order("created_at", { ascending: false }),
        supabase.from("messages").select("id", { count: "exact", head: true }).neq("sender_id", user.id).is("read_at", null),
        supabase.from("reviews").select("overall_rating").eq("reviewee_id", user.id).eq("published", true),
        supabase.from("sits").select("id, title, start_date, end_date, user_id, property_id, status").eq("status", "published").order("created_at", { ascending: false }).limit(5),
        supabase.from("sitter_profiles").select("is_available").eq("user_id", user.id).single(),
      ]);

      setIsAvailable(sitterRes.data?.is_available || false);

      setMyApplications(appsRes.data || []);
      setUnreadCount(unreadRes.count || 0);

      // Filter sits where I'm confirmed as sitter
      const acceptedApps = (appsRes.data || []).filter((a: any) => a.status === "accepted");
      const confirmedSits = acceptedApps.map((a: any) => ({ ...a.sit, appStatus: "accepted" }));
      setMySits(confirmedSits);

      // Metrics
      const reviews = reviewsRes.data || [];
      const avg = reviews.length > 0 ? (reviews.reduce((s: number, r: any) => s + r.overall_rating, 0) / reviews.length).toFixed(1) : null;
      const completedCount = acceptedApps.filter((a: any) => a.sit?.status === "completed").length;
      setMetrics({ completed: completedCount, avgRating: avg, reviewCount: reviews.length });

      // Nearby listings (exclude own sits)
      setNearbyListings((listingsRes.data || []).filter((s: any) => s.user_id !== user.id));

      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) return <div className="p-6 text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold">
          Bonjour{user?.firstName ? `, ${user.firstName}` : ""} 👋
        </h1>
        {user && user.profileCompletion < 100 && (
          <Link to="/profile" className="text-sm text-primary hover:underline mt-1 inline-block">
            Profil complété à {user.profileCompletion}% — Compléter mon profil →
          </Link>
        )}
      </div>

      {/* Availability toggle */}
      <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-4">
        <div className="flex items-center gap-3">
          <CircleDot className={`h-5 w-5 ${isAvailable ? "text-green-600" : "text-muted-foreground"}`} />
          <div>
            <p className="font-semibold text-sm">{isAvailable ? "Vous êtes visible et disponible" : "Mode indisponible"}</p>
            <p className="text-xs text-muted-foreground">Les propriétaires {isAvailable ? "peuvent" : "ne peuvent pas"} vous trouver.</p>
          </div>
        </div>
        <Switch
          checked={isAvailable}
          onCheckedChange={async (v) => {
            setIsAvailable(v);
            await supabase.from("sitter_profiles").update({ is_available: v }).eq("user_id", user!.id);
          }}
        />
      </div>

      {/* Mes gardes (confirmed) */}
      {mySits.length > 0 && (
        <DashSection title="Mes gardes" icon={Calendar}>
          <div className="grid gap-3">
            {mySits.map((sit: any) => {
              const daysUntil = sit.start_date ? differenceInDays(new Date(sit.start_date), new Date()) : null;
              const now = new Date();
              const ongoing = sit.start_date && new Date(sit.start_date) <= now && sit.end_date && new Date(sit.end_date) >= now;

              return (
                <Link key={sit.id} to={`/sits/${sit.id}`} className="block p-4 rounded-xl border border-border bg-card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{ongoing ? "🟢" : "🟠"} {sit.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {sit.start_date && sit.end_date
                          ? `${format(new Date(sit.start_date), "d MMM", { locale: fr })} → ${format(new Date(sit.end_date), "d MMM yyyy", { locale: fr })}`
                          : ""}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                  {!ongoing && daysUntil !== null && daysUntil > 0 && (
                    <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Dans {daysUntil} jour{daysUntil > 1 ? "s" : ""}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        </DashSection>
      )}

      {/* Mes candidatures */}
      <DashSection title="Mes candidatures" icon={SendIcon} action={
        myApplications.length > 0 ? <Link to="/sits" className="text-xs text-primary hover:underline">Voir tout</Link> : undefined
      }>
        {myApplications.length === 0 ? (
          <EmptyCard text="Pas encore de candidature envoyée." cta="Trouver une garde" to="/search" />
        ) : (
          <div className="space-y-2">
            {myApplications.slice(0, 5).map(app => {
              const cfg = appStatusConfig[app.status] || appStatusConfig.pending;
              const StatusIcon = cfg.icon;
              return (
                <Link key={app.id} to={`/sits/${app.sit_id}`} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:shadow-sm transition-shadow">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{app.sit?.title || "Garde"}</p>
                    <p className="text-xs text-muted-foreground">
                      {app.sit?.start_date && app.sit?.end_date
                        ? `${format(new Date(app.sit.start_date), "d MMM", { locale: fr })} → ${format(new Date(app.sit.end_date), "d MMM", { locale: fr })}`
                        : ""}
                    </p>
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-medium ${cfg.className}`}>
                    <StatusIcon className="h-3.5 w-3.5" /> {cfg.label}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </DashSection>

      {/* Nouvelles annonces */}
      <DashSection title="Annonces récentes" icon={Search} action={
        <Link to="/search" className="text-xs text-primary hover:underline">Voir tout</Link>
      }>
        {nearbyListings.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Aucune annonce pour le moment.</p>
        ) : (
          <div className="grid gap-3">
            {nearbyListings.slice(0, 3).map(sit => (
              <Link key={sit.id} to={`/sits/${sit.id}`} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border hover:shadow-sm transition-shadow">
                <div>
                  <p className="text-sm font-medium">{sit.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {sit.start_date && sit.end_date
                      ? `${format(new Date(sit.start_date), "d MMM", { locale: fr })} → ${format(new Date(sit.end_date), "d MMM", { locale: fr })}`
                      : ""}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </DashSection>

      {/* Gardes longue durée */}
      <DashSection title="Gardes longue durée" icon={Clock3} action={
        <Link to="/search" className="text-xs text-primary hover:underline">Voir toutes</Link>
      }>
        {metrics.completed >= 3 && metrics.avgRating && parseFloat(metrics.avgRating) >= 4.7 ? (
          <p className="text-sm text-muted-foreground italic">Explorez les gardes longue durée dans la recherche.</p>
        ) : (() => {
          const sitterSteps = [
            { done: metrics.completed >= 3, label: `${Math.min(metrics.completed, 3)}/3 gardes complétées` },
            { done: metrics.avgRating !== null && parseFloat(metrics.avgRating) >= 4.7, label: `Note ≥ 4.7 ${metrics.avgRating ? `(${metrics.avgRating}/5)` : "(pas encore d'avis)"}` },
            { done: false, label: "Identité vérifiée", hint: "Vérifier →", hintTo: "/settings#verification" },
          ];
          const doneCount = sitterSteps.filter(s => s.done).length;
          return (
            <div className="p-5 rounded-xl border border-dashed border-border">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Longue durée verrouillée</p>
                  <p className="text-xs text-muted-foreground">Complétez les étapes ci-dessous pour débloquer.</p>
                </div>
              </div>
              <div className="space-y-2.5">
                {sitterSteps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {step.done ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                    )}
                    <span className={`text-xs ${step.done ? "text-foreground line-through" : "text-muted-foreground"}`}>{step.label}</span>
                    {step.hint && !step.done && (step.hintTo ? (
                      <Link to={step.hintTo} className="text-[10px] text-primary hover:underline">{step.hint}</Link>
                    ) : (
                      <span className="text-[10px] text-primary">{step.hint}</span>
                    ))}
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                  <span>Progression</span>
                  <span>{Math.round((doneCount / sitterSteps.length) * 100)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(doneCount / sitterSteps.length) * 100}%` }} />
                </div>
              </div>
            </div>
          );
        })()}
      </DashSection>

      {/* Messages non lus */}
      {unreadCount > 0 && (
        <Link to="/messages" className="block p-4 rounded-xl bg-primary/5 border border-primary/10 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{unreadCount} message{unreadCount > 1 ? "s" : ""} non lu{unreadCount > 1 ? "s" : ""}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </Link>
      )}

      {/* Métriques */}
      <DashSection title="Mes métriques" icon={Star}>
        <div className="grid grid-cols-3 gap-3">
          <MetricCard label="Gardes complétées" value={String(metrics.completed)} />
          <MetricCard label="Note moyenne" value={metrics.avgRating ? `${metrics.avgRating}/5` : "—"} sub={`${metrics.reviewCount} avis`} />
          <MetricCard label="Fiabilité" value={metrics.completed > 0 ? "100%" : "—"} />
        </div>
      </DashSection>
    </div>
  );
};

// Shared
const DashSection = ({ title, icon: Icon, action, children }: {
  title: string; icon: React.ElementType; action?: React.ReactNode; children: React.ReactNode;
}) => (
  <div>
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="font-heading text-lg font-semibold">{title}</h2>
      </div>
      {action}
    </div>
    {children}
  </div>
);

const EmptyCard = ({ text, cta, to }: { text: string; cta: string; to: string }) => (
  <div className="p-6 rounded-xl border border-dashed border-border text-center">
    <p className="text-sm text-muted-foreground mb-3">{text}</p>
    <Link to={to}><Button size="sm">{cta}</Button></Link>
  </div>
);

const MetricCard = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="p-4 rounded-xl bg-card border border-border text-center">
    <p className="text-xl font-bold font-heading">{value}</p>
    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
  </div>
);

export default SitterDashboard;
