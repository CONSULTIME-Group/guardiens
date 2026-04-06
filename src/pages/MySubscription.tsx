import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageMeta from "@/components/PageMeta";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BadgeSceauLarge } from "@/components/badges/BadgeSceauLarge";

import {
  Star, Home, Clock, Loader2, Check, Copy,
  Send, MessageSquare, Search as SearchIcon,
} from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

const GRACE_END = new Date("2026-06-14T00:00:00Z");

type ViewState = "proprio" | "founder_grace" | "founder_switch" | "active" | "expired" | "start" | "loading";

interface SubRow {
  status: string | null;
  plan: string | null;
  expires_at: string | null;
  stripe_subscription_id: string | null;
}

// ──── Pricing helpers ────
const calculateProrata = () => {
  const now = new Date();
  const nextMonth = now.getMonth() + 1; // 0-indexed, so +1 = next month (1-indexed)
  const monthsRemaining = Math.max(0, 12 - nextMonth); // months from next month through December
  const fullPrice = monthsRemaining * 9;
  const discountedPrice = Math.round(fullPrice * 0.8);
  const savings = fullPrice - discountedPrice;
  return { months: monthsRemaining, price: discountedPrice, savings };
};

// ──── ADVANTAGES ────
const FOUNDER_ADVANTAGES = [
  "Postuler aux gardes",
  "Messagerie avec les propriétaires",
  "Apparaître dans la recherche",
  "Mode « Je suis disponible »",
  "Fiches races complètes",
  "Guides locaux détaillés",
  "Articles en accès complet",
  "Gardes longue durée (+ frais de service)",
  "Écussons et métriques de fiabilité",
];

const EXPIRED_HIGHLIGHTS = [
  { icon: Send, label: "Postuler aux gardes près de chez vous" },
  { icon: SearchIcon, label: "Apparaître dans la recherche des propriétaires" },
  { icon: MessageSquare, label: "Messagerie illimitée avec les propriétaires" },
];

// ──── PRICING CARDS ────
function PricingCardsNew({ context }: { context?: "founder" }) {
  const [loading, setLoading] = useState<"oneshot" | "monthly" | "prorata" | null>(null);
  const { months, price: prorataPrice, savings } = calculateProrata();

  const handleCheckout = async (type: "oneshot" | "monthly" | "prorata") => {
    setLoading(type);
    try {
      const lookupMap: Record<string, string> = {
        oneshot: "gardien_oneshot",
        monthly: "gardien_mensuel",
        prorata: "gardien_annuel_2026",
      };
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { lookup_key: lookupMap[type] },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      else throw new Error(data?.error || "no url");
    } catch {
      toast.error("Impossible de lancer le paiement. Veuillez réessayer.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* CARD A — One shot */}
      <div className="bg-card border border-border rounded-xl p-5 flex flex-col">
        <p className="font-heading text-lg font-semibold mb-2">Un mois</p>
        <p className="mb-1"><span className="text-3xl font-heading font-bold">12€</span><span className="text-sm text-muted-foreground">/mois</span></p>
        <p className="text-xs text-muted-foreground mb-4">Paiement immédiat. Sans renouvellement.</p>
        <ul className="text-sm space-y-2 mb-6 flex-1">
          <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Accès complet 30 jours</li>
          <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Aucun engagement</li>
          <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Aucune CB mémorisée</li>
        </ul>
        <Button variant="outline" className="w-full" onClick={() => handleCheckout("oneshot")} disabled={loading !== null}>
          {loading === "oneshot" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accéder un mois"}
        </Button>
      </div>

      {/* CARD B — Monthly (recommended) */}
      <div className="relative flex flex-col">
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3 py-0.5 rounded-full font-medium z-10">Le plus choisi</span>
        <div className="bg-card border-2 border-primary rounded-xl p-5 flex flex-col flex-1">
          <p className="font-heading text-lg font-semibold mb-2">Mois après mois</p>
          <p className="mb-1"><span className="text-3xl font-heading font-bold">9€</span><span className="text-sm text-muted-foreground">/mois</span></p>
           <p className="text-xs text-muted-foreground mb-4">7 jours d'essai. Annulable à tout moment.</p>
           <ul className="text-sm space-y-2 mb-6 flex-1">
             <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> 7 jours d'essai offerts</li>
            <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Sans engagement</li>
            <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Annulable en un clic</li>
          </ul>
          <Button className="w-full" onClick={() => handleCheckout("monthly")} disabled={loading !== null}>
            {loading === "monthly" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Commencer gratuitement"}
          </Button>
        </div>
      </div>

      {/* CARD C — Prorata 2026 */}
      <div className="bg-card border border-border rounded-xl p-5 flex flex-col">
        <span className="inline-flex self-start bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium mb-2">Offre 2026</span>
        <p className="font-heading text-lg font-semibold mb-2">Jusqu'à la fin 2026</p>
        <p className="mb-1"><span className="text-3xl font-heading font-bold">{prorataPrice}€</span><span className="text-sm text-muted-foreground"> pour {months} mois</span></p>
        <p className="text-xs text-green-600 font-medium mb-4">Économie de {savings}€</p>
        <ul className="text-sm space-y-2 mb-6 flex-1">
           <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Accès au 31 décembre</li>
           <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> -20% sur le tarif mensuel</li>
           <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Pas de renouvellement en 2027</li>
        </ul>
        <Button variant="outline" className="w-full" onClick={() => handleCheckout("prorata")} disabled={loading !== null}>
          {loading === "prorata" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Choisir cette formule"}
        </Button>
      </div>
    </div>
  );
}

// ──── REFERRAL SECTION ────
function ReferralSection({ referralCode, userId }: { referralCode: string | null; userId: string }) {
  const [code, setCode] = useState(referralCode);

  useEffect(() => {
    if (code) return;
    // Generate and persist referral code
    const generated = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    supabase.from("profiles").update({ referral_code: generated }).eq("id", userId).then(() => {
      setCode(generated);
    });
  }, [code, userId]);

  const url = code ? `https://guardiens.fr/inscription?ref=${code}` : "";

  const handleCopy = () => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    toast.success("Lien copié !");
  };

  if (!code) return null;

  return (
    <div className="bg-muted rounded-xl px-6 py-5">
      <h3 className="font-heading text-lg font-semibold mb-1">Parrainez un proche.</h3>
      <p className="text-sm text-foreground/70 mb-4">
        Si quelqu'un s'inscrit avec votre lien et active son compte,
        vous recevez tous les deux un mois d'accès offert.
      </p>
      <div className="flex gap-2">
        <input
          readOnly
          value={url}
          className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground/70 truncate"
        />
        <Button variant="outline" size="sm" onClick={handleCopy}>
          <Copy className="h-4 w-4" /> Copier
        </Button>
      </div>
      <p className="text-xs text-foreground/40 mt-2">
        Le mois offert est crédité dès que votre filleul active son compte.
      </p>
    </div>
  );
}

// ──── MAIN PAGE ────
const MySubscription = () => {
  const { user, activeRole } = useAuth();
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<ViewState>("loading");
  const [profile, setProfile] = useState<any>(null);
  const [sub, setSub] = useState<SubRow | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [founderModalOpen, setFounderModalOpen] = useState(false);

  const effectiveRole = user?.role === "both" ? activeRole : user?.role;

  const [loadError, setLoadError] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) { setView("start"); return; }
    try {
      const [profileRes, subRes] = await Promise.all([
        supabase.from("profiles").select("is_founder, created_at, role, referral_code, identity_verified").eq("id", user.id).maybeSingle(),
        supabase.from("subscriptions").select("status, plan, expires_at, stripe_subscription_id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (profileRes.error) {
        setLoadError(true);
        setView("start");
        return;
      }
      setProfile(profileRes.data ?? { is_founder: false, referral_code: null });
      setSub(subRes.data);
    } catch {
      setLoadError(true);
      setView("start");
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Safety timeout — never stay on skeleton forever
  useEffect(() => {
    if (view !== "loading") return;
    const t = setTimeout(() => {
      setView("start");
      setLoadError(true);
    }, 5000);
    return () => clearTimeout(t);
  }, [view]);

  // Toast on return from Stripe
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      const formula = searchParams.get("formula");
      const messages: Record<string, string> = {
        monthly: "Votre essai de 7 jours démarre — bienvenue chez Guardiens.",
        one_shot: "Votre accès d'un mois est actif. Bonne garde !",
        prorata: "Votre accès 2026 est activé. Merci pour votre soutien.",
      };
      toast.success(messages[formula || ""] || "Votre abonnement est activé !");
      // Re-fetch after 2s to let webhook process
      setTimeout(() => loadData(), 2000);
      window.history.replaceState({}, "", "/mon-abonnement");
    } else if (searchParams.get("cancelled") === "true") {
      toast("Paiement annulé — vous pouvez choisir une formule à tout moment.");
      window.history.replaceState({}, "", "/mon-abonnement");
    }
  }, [searchParams, loadData]);

  // Determine view
  useEffect(() => {
    if (!profile) return;
    const now = new Date();
    const isFounder = !!profile.is_founder;
    const currentStatus = sub?.status || null;

    if (effectiveRole === "owner") {
      setView("proprio");
    } else if (isFounder && now < GRACE_END && currentStatus !== "active") {
      setView("founder_grace");
    } else if (isFounder && now >= GRACE_END && currentStatus !== "active") {
      setView("founder_switch");
    } else if (currentStatus === "active") {
      setView("active");
    } else if (currentStatus === "expired" || currentStatus === "canceled") {
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
        <PageMeta title="Mon abonnement | Guardiens" description="Gérez votre abonnement Guardiens." noindex />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-60 rounded-xl" />
          <Skeleton className="h-60 rounded-xl" />
          <Skeleton className="h-60 rounded-xl" />
        </div>
      </div>
    );
  }

  const now = new Date();
  const isFounder = !!profile?.is_founder;
  const daysLeftGrace = Math.max(0, differenceInDays(GRACE_END, now));
  // Grace bar: 31 days from May 13 to June 13
  const graceProgress = Math.min(100, Math.max(0, Math.round(((31 - daysLeftGrace) / 31) * 100)));

  const renewalFormatted = sub?.expires_at ? format(new Date(sub.expires_at), "d MMMM yyyy", { locale: fr }) : "—";

  const planLabel = sub?.plan === "monthly" ? "Formule mensuelle"
    : sub?.plan === "oneshot" ? "Accès un mois"
    : sub?.plan === "yearly" ? "Accès 2026"
    : "Abonnement";

  const showReferral = effectiveRole !== "owner";

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto animate-fade-in space-y-8">
      <PageMeta title="Mon abonnement | Guardiens" description="Gérez votre abonnement Guardiens." noindex />

      {/* ══ VUE 6 — PROPRIO ══ */}
      {view === "proprio" && (
        <>
          <div className="bg-card border border-border rounded-xl p-8 max-w-2xl mx-auto space-y-4">
            <div className="flex items-center gap-3">
              <Home className="h-7 w-7 text-primary" />
              <h2 className="text-2xl font-heading font-semibold">Guardiens est gratuit pour les propriétaires.</h2>
            </div>
            <p className="text-sm text-foreground/70">
              Publiez vos annonces, recevez des candidatures et échangez avec les gardiens — sans frais, pour toujours.
            </p>
          </div>
          <ReferralSection referralCode={profile?.referral_code} userId={user!.id} />
        </>
      )}

      {/* ══ VUE 1 — FONDATEUR ACTIF ══ */}
      {view === "founder_grace" && (
        <>
          <div className="bg-card border border-amber-200 rounded-xl p-8 max-w-2xl mx-auto space-y-6 text-center shadow-sm">
            {/* Badge */}
            <div className="flex flex-col items-center gap-1">
              <BadgeSceauLarge id="fondateur" size={52} />
              <span className="text-xs uppercase tracking-widest text-amber-600 font-body">Fondateur</span>
            </div>

            <h2 className="font-heading text-2xl font-semibold">Vous êtes Fondateur Guardiens.</h2>
            <p className="text-base text-foreground/70">Votre accès complet est gratuit jusqu'au 13 juin 2026.</p>

            {/* Countdown */}
            <div className="bg-amber-50 rounded-lg py-4 px-6 text-left">
              <p className="text-sm text-foreground/60 mb-2">Il reste {daysLeftGrace} jour{daysLeftGrace > 1 ? "s" : ""} sur votre période fondateur</p>
              <Progress value={graceProgress} className="h-2 [&>div]:bg-amber-400" />
            </div>

            {/* Advantages grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
              {FOUNDER_ADVANTAGES.map(a => (
                <div key={a} className="flex items-center gap-2 text-sm text-foreground/70">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" /> {a}
                </div>
              ))}
            </div>

            {/* CTA */}
            <Button variant="outline" onClick={() => setFounderModalOpen(true)} className="border-primary text-primary hover:bg-primary/5">
              Soutenir Guardiens maintenant
            </Button>
            <p className="text-xs text-foreground/50 italic">
              Votre abonnement démarrera le 14 juin — vous ne perdez pas un seul jour.
            </p>
          </div>

          <p className="text-xs text-foreground/40 italic text-center">
            Votre badge Fondateur reste à vie, quelle que soit votre situation future.
          </p>

          {showReferral && <ReferralSection referralCode={profile?.referral_code} userId={user!.id} />}

          {/* Founder early checkout modal */}
          <Dialog open={founderModalOpen} onOpenChange={setFounderModalOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="font-heading text-xl">Choisissez votre formule</DialogTitle>
              </DialogHeader>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-foreground/70 mb-4">
                En choisissant une option maintenant, votre abonnement démarrera automatiquement le 14 juin 2026.
                Votre accès fondateur reste intact jusqu'à cette date.
              </div>
              <PricingCardsNew context="founder" />
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* ══ VUE 2 — FONDATEUR POST-GRÂCE ══ */}
      {view === "founder_switch" && (
        <>
          <div className="text-center space-y-3 mb-6">
            <div className="flex flex-col items-center gap-1">
              <BadgeSceauLarge id="fondateur" size={52} />
              <span className="text-xs uppercase tracking-widest text-amber-600 font-body">Fondateur</span>
            </div>
            <h2 className="font-heading text-2xl font-semibold">Votre période fondateur est terminée.</h2>
            <p className="text-sm text-foreground/70">Merci d'avoir été là dès le premier jour. Choisissez votre formule.</p>
          </div>
          <PricingCardsNew />
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-foreground/70 text-center">
            Votre badge Fondateur reste permanent à vie.
          </div>
          {showReferral && <ReferralSection referralCode={profile?.referral_code} userId={user!.id} />}
        </>
      )}

      {/* ══ VUE 3 — STANDARD NON ABONNÉ ══ */}
      {view === "start" && (
        <>
          <div className="space-y-2 mb-2">
            <p className="text-xs uppercase tracking-widest text-primary/60">Votre abonnement</p>
            <h2 className="text-2xl font-heading font-semibold">Accédez à toutes les gardes.</h2>
            <p className="text-sm text-foreground/70">Choisissez ce qui vous convient.</p>
          </div>
          <PricingCardsNew />
          {showReferral && <ReferralSection referralCode={profile?.referral_code} userId={user!.id} />}
        </>
      )}

      {/* ══ VUE 4 — ABONNÉ ACTIF ══ */}
      {view === "active" && (
        <>
          <div className="bg-card border border-border rounded-xl p-6 space-y-4 max-w-2xl mx-auto">
            <h2 className="font-heading text-2xl font-semibold">Abonnement actif.</h2>
            <p className="text-sm text-foreground/70">Formule : <span className="font-medium text-foreground">{planLabel}</span></p>
            {sub?.plan === "monthly" && (
              <p className="text-sm text-foreground/70">Prochain renouvellement le <span className="font-medium text-foreground">{renewalFormatted}</span></p>
            )}
            {sub?.plan === "oneshot" && (
              <p className="text-sm text-foreground/70">Accès jusqu'au <span className="font-medium text-foreground">{renewalFormatted}</span></p>
            )}
            {sub?.plan === "yearly" && (
              <p className="text-sm text-foreground/70">Accès jusqu'au <span className="font-medium text-foreground">31 décembre 2026</span></p>
            )}

            <Button variant="outline" className="w-full" onClick={openPortal} disabled={portalLoading}>
              {portalLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Gérer mon abonnement
            </Button>

            {sub?.plan === "monthly" && (
              <button onClick={openPortal} className="w-full text-sm text-foreground/50 hover:text-foreground transition-colors text-center">
                Annuler l'abonnement
              </button>
            )}
          </div>

          {isFounder && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-foreground/70 text-center flex items-center justify-center gap-2">
              <Star className="h-4 w-4 text-amber-500" fill="currentColor" /> Badge Fondateur permanent
            </div>
          )}

          {showReferral && <ReferralSection referralCode={profile?.referral_code} userId={user!.id} />}
        </>
      )}

      {/* ══ VUE 5 — EXPIRÉ ══ */}
      {view === "expired" && (
        <>
          <div className="text-center space-y-3 mb-4">
            <Clock className="h-10 w-10 text-muted-foreground mx-auto" />
            <h2 className="text-2xl font-heading font-semibold">Votre accès est terminé.</h2>
            <p className="text-sm text-foreground/70">Reprenez là où vous en étiez.</p>
          </div>

          <div className="flex flex-col gap-3 max-w-md mx-auto mb-6">
            {EXPIRED_HIGHLIGHTS.map(h => (
              <div key={h.label} className="flex items-center gap-3 text-sm text-foreground/70">
                <h.icon className="h-5 w-5 text-primary shrink-0" />
                {h.label}
              </div>
            ))}
          </div>

          <PricingCardsNew />

          {isFounder && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-foreground/70 text-center">
              Votre badge Fondateur reste permanent à vie.
            </div>
          )}

          {showReferral && <ReferralSection referralCode={profile?.referral_code} userId={user!.id} />}
      </>
      )}

      {loadError && (
        <p className="text-xs text-foreground/40 text-center mt-4">
          Impossible de charger votre statut — réessayez.
        </p>
      )}
    </div>
  );
};

export default MySubscription;
