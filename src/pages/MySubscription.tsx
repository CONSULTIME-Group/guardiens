import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageMeta from "@/components/PageMeta";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import PricingCards from "@/components/subscription/PricingCards";
import AdvantagesList from "@/components/subscription/AdvantagesList";
import SubscriptionFAQ from "@/components/subscription/SubscriptionFAQ";
import {
  Star, BadgeCheck, Home, AlertCircle, Clock, Loader2,
  Check, X, FileText,
} from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

const LAUNCH_DATE = new Date("2026-05-13T00:00:00Z");
const GRACE_END = new Date("2026-06-13T00:00:00Z");

type ViewState =
  | "proprio"
  | "founder_grace"
  | "founder_switch"
  | "active"
  | "expired"
  | "start"
  | "loading";

interface SubRow {
  statut: string | null;
  trial_end: string | null;
  current_period_end: string | null;
  created_at: string | null;
}

const MySubscription = () => {
  const { user, activeRole } = useAuth();
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<ViewState>("loading");
  const [profile, setProfile] = useState<any>(null);
  const [sub, setSub] = useState<SubRow | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const effectiveRole = user?.role === "both" ? activeRole : user?.role;

  const loadData = useCallback(async () => {
    if (!user) return;
    const [profileRes, subRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("is_founder, created_at, role")
        .eq("id", user.id)
        .single(),
      supabase
        .from("abonnements")
        .select("statut, trial_end, current_period_end, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    setProfile(profileRes.data);
    setSub(subRes.data);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toast on return from Stripe
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Votre abonnement est active !");
      loadData();
      window.history.replaceState({}, "", "/mon-abonnement");
    } else if (searchParams.get("cancelled") === "true") {
      toast("Retour a votre espace abonnement");
      window.history.replaceState({}, "", "/mon-abonnement");
    }
  }, [searchParams, loadData]);

  // Determine view — strict order
  useEffect(() => {
    if (!profile) return;
    const now = new Date();
    const isFounder =
      profile.is_founder || (profile.created_at && new Date(profile.created_at) < LAUNCH_DATE);
    const statut = sub?.statut || null;

    if (effectiveRole === "owner") {
      setView("proprio");
    } else if (isFounder && now < GRACE_END && !["trial", "active"].includes(statut as string)) {
      setView("founder_grace");
    } else if (isFounder && now >= GRACE_END && !["trial", "active"].includes(statut as string)) {
      setView("founder_switch");
    } else if (["trial", "active"].includes(statut as string)) {
      setView("active");
    } else if (statut === "expired" && !isFounder) {
      setView("expired");
    } else {
      setView("start");
    }
  }, [profile, sub, effectiveRole]);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch {
      toast.error("Impossible d'ouvrir la gestion de l'abonnement.");
    } finally {
      setPortalLoading(false);
    }
  };

  // Skeleton
  if (view === "loading") {
    return (
      <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-6">
        <PageMeta title="Mon abonnement | Guardiens" description="Gerez votre abonnement Guardiens." noindex />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-60 rounded-2xl" />
          <Skeleton className="h-60 rounded-2xl" />
        </div>
      </div>
    );
  }

  const now = new Date();
  const isFounder =
    profile?.is_founder || (profile?.created_at && new Date(profile.created_at) < LAUNCH_DATE);

  // Grace bar calculations
  const daysLeftGrace = Math.max(0, differenceInDays(GRACE_END, now));
  const totalGrace = differenceInDays(GRACE_END, LAUNCH_DATE);
  const graceProgress = totalGrace > 0 ? Math.min(100, Math.max(0, Math.round((daysLeftGrace / totalGrace) * 100))) : 0;

  // Active sub calculations
  const subscribedDays = sub?.created_at ? differenceInDays(now, new Date(sub.created_at)) : 0;
  const daysUntilRenewal = sub?.current_period_end
    ? differenceInDays(new Date(sub.current_period_end), now)
    : null;
  const trialEndFormatted = sub?.trial_end
    ? format(new Date(sub.trial_end), "dd/MM/yyyy", { locale: fr })
    : "\u2014";
  const renewalFormatted = sub?.current_period_end
    ? format(new Date(sub.current_period_end), "dd/MM/yyyy", { locale: fr })
    : "\u2014";

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto animate-fade-in space-y-8">
      <PageMeta title="Mon abonnement | Guardiens" description="Gerez votre abonnement Guardiens." noindex />
      <h1 className="font-heading text-3xl font-bold">Mon abonnement</h1>

      {/* ══ VUE PROPRIO ══ */}
      {view === "proprio" && (
        <div className="bg-card border border-border rounded-2xl p-8 max-w-xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Home className="h-8 w-8 text-primary" />
            <h2 className="text-2xl font-heading font-semibold">
              Votre acces est gratuit en 2026.
            </h2>
          </div>
          <p className="text-sm font-body text-muted-foreground">
            Publiez des annonces, recevez des candidatures et choisissez votre gardien — sans aucun frais.
          </p>
          <div className="bg-muted/40 border border-border rounded-xl p-5">
            <p className="text-sm font-body font-semibold text-foreground mb-3">Ce que vous pouvez faire</p>
            <ul className="space-y-2">
              {[
                "Publier des annonces de garde",
                "Recevoir et consulter les candidatures",
                "Echanger avec les gardiens via la messagerie",
                "Acceder aux petites missions",
                "Consulter les profils et avis des gardiens",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm font-body text-foreground/70">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ══ VUE FONDATEUR GRACE ══ */}
      {view === "founder_grace" && (
        <div className="bg-[#FDF8EC] border border-amber-200 rounded-2xl p-8 max-w-xl mx-auto space-y-6 text-center">
          <Star className="h-12 w-12 text-amber-500 mx-auto" fill="currentColor" />
          <span className="inline-flex items-center gap-1.5 text-xs font-body bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
            <Star className="h-3 w-3" fill="currentColor" /> Fondateur
          </span>
          <h2 className="text-2xl font-heading font-semibold">Vous etes Fondateur Guardiens</h2>
          <p className="text-sm font-body text-foreground/70 max-w-md mx-auto">
            Votre acces complet est gratuit jusqu'au 13 juin 2026. Apres cette date, l'abonnement sera a 9&#8364;/mois.
          </p>

          {now >= LAUNCH_DATE && now < GRACE_END && (
            <div className="text-left">
              <div className="flex justify-between text-xs font-body text-muted-foreground mb-1">
                <span>{daysLeftGrace} jour{daysLeftGrace > 1 ? "s" : ""} restant{daysLeftGrace > 1 ? "s" : ""} sur votre periode fondateur</span>
              </div>
              <Progress
                value={graceProgress}
                className={`h-2 ${daysLeftGrace <= 14 ? "[&>div]:bg-amber-500" : "[&>div]:bg-primary"}`}
              />
            </div>
          )}

          <AdvantagesList title="Ce que vous debloquez" />

          <p className="text-xs font-body text-muted-foreground">
            Votre badge Fondateur est permanent a vie, quelle que soit votre situation future.
          </p>
        </div>
      )}

      {/* ══ VUE FONDATEUR BASCULE ══ */}
      {view === "founder_switch" && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="text-center space-y-3">
            <Star className="h-10 w-10 text-amber-500 mx-auto" fill="currentColor" />
            <span className="inline-flex items-center gap-1.5 text-xs font-body bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
              <Star className="h-3 w-3" fill="currentColor" /> Fondateur
            </span>
            <h2 className="text-2xl font-heading font-semibold">Votre periode fondateur est terminee</h2>
            <p className="text-sm font-body text-muted-foreground max-w-md mx-auto">
              Votre badge Fondateur reste a vie. Choisissez votre formule pour continuer a postuler aux gardes.
            </p>
          </div>
          <PricingCards />
          <SubscriptionFAQ />
        </div>
      )}

      {/* ══ VUE ABONNE ACTIF ══ */}
      {view === "active" && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs font-body bg-primary/10 text-primary px-3 py-1 rounded-full">
              <BadgeCheck className="h-3.5 w-3.5" /> Abonne Guardiens
            </span>
            {isFounder && (
              <span className="inline-flex items-center gap-1.5 text-xs font-body bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
                <Star className="h-3 w-3" fill="currentColor" /> Fondateur
              </span>
            )}
          </div>

          {/* Trial banner */}
          {sub?.statut === "trial" && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2 text-sm font-body text-foreground/70">
              <Clock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                Periode d'essai — premier prelevement le {trialEndFormatted}.
                Aucun montant debite avant cette date.
              </span>
            </div>
          )}

          {/* Renewal warning */}
          {sub?.statut === "active" && daysUntilRenewal !== null && daysUntilRenewal <= 7 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2 text-sm font-body text-foreground/70">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                Votre abonnement se renouvelle dans {daysUntilRenewal} jour{daysUntilRenewal > 1 ? "s" : ""}.
                Assurez-vous que votre moyen de paiement est a jour.
                <button
                  onClick={openPortal}
                  className="block mt-1 text-primary hover:underline font-medium"
                >
                  Gerer mon abonnement
                </button>
              </div>
            </div>
          )}

          {/* Subscription info card */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm font-body">
              <div>
                <p className="text-muted-foreground mb-1">Abonne depuis</p>
                <p className="font-medium">{subscribedDays} jour{subscribedDays > 1 ? "s" : ""}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Prochain renouvellement</p>
                <p className="font-medium">{renewalFormatted}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Montant</p>
                <p className="font-medium">9&#8364;/mois</p>
              </div>
              {sub?.statut === "active" && daysUntilRenewal !== null && daysUntilRenewal > 7 && (
                <div>
                  <p className="text-muted-foreground mb-1">Acces garanti encore</p>
                  <p className="font-medium">{daysUntilRenewal} jour{daysUntilRenewal > 1 ? "s" : ""}</p>
                </div>
              )}
            </div>
            <p className="text-xs font-body text-muted-foreground">
              Conformement a la loi francaise, vous recevrez un email 30 jours avant tout renouvellement automatique.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="w-full py-3 rounded-xl border border-primary text-primary font-body font-medium text-sm hover:bg-primary/5 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {portalLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Gerer mon abonnement
            </button>
            <button
              onClick={openPortal}
              className="w-full py-2 text-xs font-body text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
            >
              <FileText className="h-3.5 w-3.5" />
              Telecharger ma derniere facture
            </button>
          </div>

          <AdvantagesList title="Vos avantages actifs" />
        </div>
      )}

      {/* ══ VUE EXPIRE ══ */}
      {view === "expired" && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
            <h2 className="text-2xl font-heading font-semibold">Votre abonnement est expire</h2>
            <p className="text-sm font-body text-muted-foreground max-w-md mx-auto">
              Vos donnees et votre historique sont conserves. Reactivez votre abonnement pour postuler a nouveau aux gardes.
            </p>
          </div>

          {/* Comparison table */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Fonctionnalite</th>
                  <th className="px-4 py-3 text-center text-muted-foreground font-medium">Actif</th>
                  <th className="px-4 py-3 text-center text-muted-foreground font-medium">Expire</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Postuler aux gardes", active: true, expired: false },
                  { label: "Messagerie gardes", active: true, expired: false },
                  { label: "Apparaitre dans la recherche", active: true, expired: false },
                  { label: "Petites missions", active: true, expired: true },
                  { label: "Profil et historique", active: true, expired: true },
                ].map((row) => (
                  <tr key={row.label} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-2.5 text-foreground/70">{row.label}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Check className="h-4 w-4 text-primary mx-auto" />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {row.expired ? (
                        <Check className="h-4 w-4 text-primary mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PricingCards />
        </div>
      )}

      {/* ══ VUE DEMARRAGE ══ */}
      {view === "start" && (
        <div className="max-w-xl mx-auto space-y-6 text-center">
          <h2 className="text-2xl font-heading font-semibold">Demarrez votre essai gratuit</h2>
          <p className="text-sm font-body text-muted-foreground max-w-md mx-auto">
            30 jours gratuits pour decouvrir Guardiens. Aucun prelevement pendant la periode d'essai.
          </p>
          <p className="text-lg font-body font-medium text-foreground">
            Puis 9&#8364;/mois — sans engagement
          </p>
          <StartTrialButton />
          <AdvantagesList title="Ce que vous debloquerez" />
        </div>
      )}
    </div>
  );
};

function StartTrialButton() {
  const [loading, setLoading] = useState(false);
  const handleStart = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { lookup_key: "gardien_mensuel" },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch {
      toast.error("Impossible de lancer le paiement. Veuillez reessayer.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <button
      onClick={handleStart}
      disabled={loading}
      className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-body font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {loading ? "Redirection..." : "Demarrer mon essai gratuit"}
    </button>
  );
}

export default MySubscription;
