import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageMeta from "@/components/PageMeta";
import { Star, CheckCircle2, Lock, Loader2, Home } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

const LAUNCH_DATE = new Date("2026-05-13T00:00:00Z");
const GRACE_END_DATE = new Date("2026-06-13T00:00:00Z");

type ViewState = "founder_grace" | "switch" | "active" | "owner" | "expired" | "loading";

interface StripeSubInfo {
  subscribed: boolean;
  plan: string | null;
  subscription_end: string | null;
  has_yearly_access: boolean;
  cancel_at_period_end?: boolean;
}

const calculateYearlyProrata = (): { price: number; months: number; savings: number } => {
  const now = new Date();
  const endOfYear = new Date(2026, 11, 31);
  const months = Math.max(0, Math.floor(
    (endOfYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  ));
  const fullPrice = months * 9;
  const discounted = Math.floor(fullPrice * 0.8);
  return { price: discounted, months, savings: Math.floor(fullPrice * 0.2) };
};

const MySubscription = () => {
  const { user, activeRole } = useAuth();
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<ViewState>("loading");
  const [profile, setProfile] = useState<any>(null);
  const [stripeSub, setStripeSub] = useState<StripeSubInfo | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const effectiveRole = user?.role === "both" ? activeRole : user?.role;

  const checkSubscription = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      setStripeSub(data as StripeSubInfo);
    } catch (e) {
      console.warn("check-subscription failed:", e);
      setStripeSub({ subscribed: false, plan: null, subscription_end: null, has_yearly_access: false });
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("is_founder, created_at, role")
        .eq("id", user.id)
        .single();
      setProfile(p);
      await checkSubscription();
    };
    load();
  }, [user, checkSubscription]);

  // Show success toast on return from Stripe
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Abonnement activé avec succès !");
      checkSubscription();
    }
  }, [searchParams, checkSubscription]);

  // Determine view state
  useEffect(() => {
    if (!profile || !stripeSub) return;

    const now = new Date();
    const createdDate = profile.created_at ? new Date(profile.created_at) : new Date();
    const isFounder = profile.is_founder || createdDate < LAUNCH_DATE;

    if (effectiveRole === "owner") {
      setView("owner");
    } else if (stripeSub.subscribed) {
      setView("active");
    } else if (isFounder && now < GRACE_END_DATE) {
      setView("founder_grace");
    } else {
      // Expired, never subscribed, or founder grace ended
      setView(stripeSub.plan || isFounder ? "expired" : "switch");
    }
  }, [profile, stripeSub, effectiveRole]);

  const handleCheckout = async (type: "monthly" | "yearly_prorata") => {
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { type },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e: any) {
      toast.error("Erreur lors de la redirection vers le paiement.");
      console.error(e);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const openPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error("Impossible d'ouvrir la gestion de l'abonnement.");
    }
  };

  if (view === "loading") {
    return (
      <div className="p-6 md:p-10 max-w-3xl mx-auto">
        <PageMeta title="Mon abonnement | Guardiens" description="Gérez votre abonnement Guardiens." noindex />
        <div className="h-64 flex items-center justify-center text-foreground/40">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  const { price: prorataPrice, months: monthsRemaining, savings } = calculateYearlyProrata();
  const now = new Date();
  const daysLeftGrace = Math.max(0, differenceInDays(GRACE_END_DATE, now));
  const totalGraceDays = differenceInDays(GRACE_END_DATE, LAUNCH_DATE);
  const graceProgressPct = Math.min(100, Math.max(0, Math.round((daysLeftGrace / totalGraceDays) * 100)));

  // ═════════════════════════════════════════════
  // PRICING OPTIONS COMPONENT (reused in switch + expired)
  // ═════════════════════════════════════════════
  const PricingOptions = ({ headerText }: { headerText: string }) => (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-heading font-semibold text-center mb-2">
        Choisissez comment continuer
      </h2>
      <p className="text-sm font-body text-foreground/60 text-center mb-8">
        {headerText}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Monthly */}
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col">
          <p className="text-xs tracking-widest uppercase text-foreground/40 font-body mb-3">
            Sans engagement
          </p>
          <p className="text-3xl font-heading font-bold mb-1">9€</p>
          <p className="text-sm font-body text-foreground/60 mb-4">/mois · résiliable à tout moment</p>
          <ul className="text-sm font-body text-foreground/70 space-y-2 mb-6 flex-1">
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" /> Postuler aux gardes</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" /> Messagerie illimitée</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" /> Visible dans la recherche</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" /> Résiliation en 1 clic</li>
          </ul>
          <button
            onClick={() => handleCheckout("monthly")}
            disabled={checkoutLoading}
            className="w-full py-3 rounded-xl border border-primary text-primary font-body font-medium text-sm hover:bg-primary/5 transition-colors disabled:opacity-50"
          >
            {checkoutLoading ? "Redirection..." : "Commencer à 9€/mois"}
          </button>
        </div>

        {/* Yearly prorata — highlighted */}
        <div className="bg-primary text-primary-foreground rounded-2xl p-6 flex flex-col relative overflow-hidden">
          <span className="absolute top-4 right-4 bg-white/20 text-white text-xs font-body px-2 py-0.5 rounded-full">
            -20%
          </span>
          <p className="text-xs tracking-widest uppercase text-white/60 font-body mb-3">
            Meilleur prix
          </p>
          <p className="text-3xl font-heading font-bold mb-1">{prorataPrice}€</p>
          <p className="text-sm font-body text-white/70 mb-4">
            jusqu'au 31 déc 2026 · {monthsRemaining} mois restants
          </p>
          <ul className="text-sm font-body text-white/80 space-y-2 mb-6 flex-1">
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-white/90 shrink-0" /> Tout du mensuel</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-white/90 shrink-0" /> Économie de {savings}€ vs mensuel</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-white/90 shrink-0" /> Renouvellement auto jan 2027</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-white/90 shrink-0" /> Résiliable avant le 1er jan</li>
          </ul>
          <button
            onClick={() => handleCheckout("yearly_prorata")}
            disabled={checkoutLoading}
            className="w-full py-3 rounded-xl bg-white text-primary font-body font-medium text-sm hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {checkoutLoading ? "Redirection..." : `Payer ${prorataPrice}€ pour 2026`}
          </button>
        </div>
      </div>

      <p className="text-xs font-body text-foreground/40 text-center">
        Renouvellement automatique au 1er janvier 2027 à 9€/mois sauf résiliation avant cette date.
        Vous recevrez un rappel 30 jours avant.
      </p>
    </div>
  );

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto animate-fade-in space-y-8">
      <PageMeta title="Mon abonnement | Guardiens" description="Gérez votre abonnement Guardiens." noindex />

      <h1 className="font-heading text-3xl font-bold">Mon abonnement</h1>

      {/* ═══ VUE 1 — FONDATEUR EN GRÂCE ═══ */}
      {view === "founder_grace" && (
        <div className="bg-[#FDF8EC] border border-amber-200 rounded-2xl p-8 text-center max-w-xl mx-auto">
          <Star className="h-12 w-12 text-amber-500 mx-auto mb-4" fill="currentColor" />

          <h2 className="text-2xl font-heading font-semibold mb-2">Vous êtes Fondateur</h2>

          <p className="text-sm font-body text-foreground/70 mb-6 max-w-md mx-auto">
            Inscrit avant le 13 mai — votre accès gratuit court jusqu'au{" "}
            <strong>13 juin 2026</strong>. Après cette date, choisissez comment continuer.
            Votre badge Fondateur reste à vie, quoi qu'il arrive.
          </p>

          <div className="grid grid-cols-2 gap-4 text-left mb-6">
            <div>
              <p className="text-xs font-body text-foreground/50 mb-1">Plan</p>
              <p className="text-sm font-body font-medium">Fondateur (gratuit)</p>
            </div>
            <div>
              <p className="text-xs font-body text-foreground/50 mb-1">Accès gratuit jusqu'au</p>
              <p className="text-sm font-body font-medium">13 juin 2026</p>
            </div>
            <div>
              <p className="text-xs font-body text-foreground/50 mb-1">Badge</p>
              <p className="text-sm font-body font-medium flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-amber-500" fill="currentColor" />
                Fondateur — permanent
              </p>
            </div>
            <div>
              <p className="text-xs font-body text-foreground/50 mb-1">Après le 13 juin</p>
              <p className="text-sm font-body font-medium">9€/mois ou {prorataPrice}€ pour finir 2026</p>
            </div>
          </div>

          {/* Grace progress */}
          {now >= LAUNCH_DATE && now < GRACE_END_DATE && (
            <div className="mb-6">
              <div className="flex justify-between text-xs font-body text-foreground/50 mb-1">
                <span>{daysLeftGrace} jour{daysLeftGrace > 1 ? "s" : ""} restant{daysLeftGrace > 1 ? "s" : ""}</span>
                <span>{graceProgressPct}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    daysLeftGrace < 7 ? "bg-red-500" : daysLeftGrace < 14 ? "bg-amber-500" : "bg-primary"
                  }`}
                  style={{ width: `${graceProgressPct}%` }}
                />
              </div>
            </div>
          )}

          {now < LAUNCH_DATE && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 mb-6 text-sm font-body text-foreground/70">
              <CheckCircle2 className="h-4 w-4 text-primary inline mr-1.5" />
              C'est <strong>gratuit pour tout le monde</strong> jusqu'au 13 mai 2026
            </div>
          )}

          <p className="text-xs font-body text-foreground/40">
            Aucun paiement requis avant le 13 juin. Vous serez notifié 30 jours avant.
          </p>
        </div>
      )}

      {/* ═══ VUE 2 — BASCULE (période gratuite terminée, pas encore abonné) ═══ */}
      {view === "switch" && (
        <PricingOptions headerText="Votre accès gratuit est terminé. Choisissez l'option qui vous convient." />
      )}

      {/* ═══ VUE 3 — ABONNÉ ACTIF ═══ */}
      {view === "active" && stripeSub && (
        <div className="max-w-xl mx-auto">
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-body text-foreground/50 mb-1">Plan actuel</p>
                <p className="text-base font-body font-medium">
                  {stripeSub.plan === "monthly"
                    ? "9€/mois"
                    : stripeSub.plan === "yearly_prorata"
                    ? `Accès 2026`
                    : "Abonnement actif"}
                </p>
              </div>
              <span className="bg-primary/10 text-primary text-xs font-body px-3 py-1 rounded-full">
                Actif
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm font-body">
              <div>
                <p className="text-foreground/50 mb-1">
                  {stripeSub.cancel_at_period_end ? "Accès jusqu'au" : "Prochain paiement"}
                </p>
                <p className="font-medium">
                  {stripeSub.subscription_end
                    ? format(new Date(stripeSub.subscription_end), "d MMMM yyyy", { locale: fr })
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-foreground/50 mb-1">Renouvellement</p>
                <p className="font-medium">
                  {stripeSub.cancel_at_period_end
                    ? "Annulé"
                    : stripeSub.plan === "monthly"
                    ? "Mensuel automatique"
                    : "1er janvier 2027"}
                </p>
              </div>
            </div>

            {stripeSub.cancel_at_period_end && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm font-body text-foreground/70">
                Votre abonnement ne sera pas renouvelé. Vous conservez l'accès jusqu'à la fin de la période en cours.
              </div>
            )}
          </div>

          {/* Founder badge */}
          {profile && (profile.is_founder || (profile.created_at && new Date(profile.created_at) < LAUNCH_DATE)) && (
            <div className="bg-[#FDF8EC] border border-amber-200 rounded-xl px-4 py-3 mb-6 text-sm font-body flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500 shrink-0" fill="currentColor" />
              Badge <strong>Fondateur</strong> — permanent
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={openPortal}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-body font-medium text-sm hover:bg-primary/90 transition-colors"
            >
              Gérer mon abonnement
            </button>
            <button
              onClick={openPortal}
              className="w-full py-3 rounded-xl border border-border text-foreground/70 font-body font-medium text-sm hover:bg-muted/50 transition-colors"
            >
              Télécharger ma facture
            </button>
            <button
              onClick={openPortal}
              className="w-full py-2 text-xs font-body text-foreground/40 hover:text-foreground/70 transition-colors"
            >
              Résilier mon abonnement
            </button>
          </div>
        </div>
      )}

      {/* ═══ VUE 4 — PROPRIO ═══ */}
      {view === "owner" && (
        <div className="bg-card border border-border rounded-2xl p-8 text-center max-w-xl mx-auto">
          <Home className="h-10 w-10 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-heading font-semibold mb-3">
            Gratuit pour vous en 2026.
          </h2>
          <p className="text-sm font-body text-foreground/70 max-w-sm mx-auto">
            Publier des annonces, recevoir des candidatures, échanger des messages —
            tout est gratuit. C'est notre engagement envers les propriétaires.
          </p>
        </div>
      )}

      {/* ═══ VUE 5 — EXPIRÉ / RÉSILIÉ ═══ */}
      {view === "expired" && (
        <PricingOptions headerText="Votre abonnement est terminé. Vos gardes passées et votre profil sont conservés. Reprenez quand vous voulez." />
      )}
    </div>
  );
};

export default MySubscription;
