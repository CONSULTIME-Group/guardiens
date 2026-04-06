import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageMeta from "@/components/PageMeta";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BadgeSceauLarge } from "@/components/badges/BadgeSceauLarge";

import {
  Star, Home, Clock, Loader2, Check, Copy,
  Send, MessageSquare, Search as SearchIcon,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

const GRACE_END = new Date("2026-06-14T00:00:00Z");
const FOUNDER_START = new Date("2026-05-13T00:00:00Z");

type ViewState = "owner" | "founder_active" | "founder_post_grace" | "subscribed" | "expired" | "never_subscribed" | "loading";

interface SubRow {
  status: string | null;
  plan: string | null;
  expires_at: string | null;
  stripe_subscription_id: string | null;
}

// ──── Pricing helpers ────
const calculateProrata = () => {
  const now = new Date();
  const nextMonth = now.getMonth() + 1;
  const monthsRemaining = Math.max(0, 12 - nextMonth);
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
  "Mode \"Je suis disponible\"",
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
function PricingCardsNew() {
  const [loading, setLoading] = useState<"oneshot" | "monthly" | "prorata" | null>(null);
  const { months, price: prorataPrice, savings } = calculateProrata();

  const handleCheckout = async (type: "oneshot" | "monthly" | "prorata") => {
    setLoading(type);
    try {
      const formulaMap: Record<string, string> = {
        oneshot: "one_shot",
        monthly: "monthly",
        prorata: "prorata",
      };
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { formula_type: formulaMap[type] },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      else throw new Error(data?.error || "no url");
    } catch {
      toast.error("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* CARD A — One shot */}
      <div className="bg-card border border-border rounded-xl p-5 flex flex-col">
        <p className="font-heading text-lg font-semibold mb-2">Un mois</p>
        <p className="mb-1"><span className="text-3xl font-heading font-bold">12€</span><span className="text-sm text-muted-foreground font-body">/mois</span></p>
        <p className="text-xs text-muted-foreground font-body mb-4">Paiement immédiat. Sans renouvellement.</p>
        <ul className="text-sm font-body space-y-2 mb-6 flex-1">
          <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Accès complet 30 jours</li>
          <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Aucun engagement</li>
          <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Aucune CB mémorisée</li>
        </ul>
        <Button variant="outline" className="w-full font-body" onClick={() => handleCheckout("oneshot")} disabled={loading !== null}>
          {loading === "oneshot" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accéder un mois"}
        </Button>
      </div>

      {/* CARD B — Monthly (recommended) */}
      <div className="relative flex flex-col">
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3 py-0.5 rounded-full font-medium font-body z-10">Le plus choisi</span>
        <div className="bg-card border-2 border-primary rounded-xl p-5 flex flex-col flex-1">
          <p className="font-heading text-lg font-semibold mb-2">Mois après mois</p>
          <p className="mb-1"><span className="text-3xl font-heading font-bold">9€</span><span className="text-sm text-muted-foreground font-body">/mois</span></p>
          <p className="text-xs text-muted-foreground font-body mb-4">7 jours d'essai. Annulable à tout moment.</p>
          <ul className="text-sm font-body space-y-2 mb-6 flex-1">
            <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> 7 jours d'essai offerts</li>
            <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Sans engagement</li>
            <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Annulable en un clic</li>
          </ul>
          <Button className="w-full font-body" onClick={() => handleCheckout("monthly")} disabled={loading !== null}>
            {loading === "monthly" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Commencer gratuitement"}
          </Button>
        </div>
      </div>

      {/* CARD C — Prorata 2026 */}
      <div className="bg-card border border-border rounded-xl p-5 flex flex-col">
        <span className="inline-flex self-start bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium font-body mb-2">Offre 2026</span>
        <p className="font-heading text-lg font-semibold mb-2">Jusqu'à la fin 2026</p>
        <p className="mb-1"><span className="text-3xl font-heading font-bold">{prorataPrice}€</span><span className="text-sm text-muted-foreground font-body"> pour {months} mois</span></p>
        <p className="text-xs text-green-600 font-medium font-body mb-4">Économie de {savings}€</p>
        <ul className="text-sm font-body space-y-2 mb-6 flex-1">
          <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Accès au 31 décembre</li>
          <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> -20% sur le tarif mensuel</li>
          <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Pas de renouvellement en 2027</li>
        </ul>
        <Button variant="outline" className="w-full font-body" onClick={() => handleCheckout("prorata")} disabled={loading !== null}>
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
      <p className="text-sm text-foreground/70 font-body mb-4">
        Si quelqu'un s'inscrit avec votre lien et active son compte,
        vous recevez tous les deux un mois d'accès offert.
      </p>
      <div className="flex gap-2">
        <input
          readOnly
          value={url}
          className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground/70 font-body truncate"
        />
        <Button variant="outline" size="sm" onClick={handleCopy}>
          <Copy className="h-4 w-4" /> Copier
        </Button>
      </div>
      <p className="text-xs text-foreground/40 font-body mt-2">
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
  const [showSupportDialog, setShowSupportDialog] = useState(false);

  const effectiveRole = user?.role === "both" ? activeRole : user?.role;

  const [loadError, setLoadError] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) { setView("never_subscribed"); return; }
    try {
      const [profileRes, subRes] = await Promise.all([
        supabase.from("profiles").select("is_founder, created_at, role, referral_code, identity_verified").eq("id", user.id).maybeSingle(),
        supabase.from("subscriptions").select("status, plan, expires_at, stripe_subscription_id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (profileRes.error) {
        setLoadError(true);
        setView("never_subscribed");
        return;
      }
      setProfile(profileRes.data ?? { is_founder: false, referral_code: null });
      setSub(subRes.data);
    } catch {
      setLoadError(true);
      setView("never_subscribed");
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Safety timeout
  useEffect(() => {
    if (view !== "loading") return;
    const t = setTimeout(() => {
      setView("never_subscribed");
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
      setTimeout(() => loadData(), 2000);
      window.history.replaceState({}, "", "/mon-abonnement");
    } else if (searchParams.get("cancelled") === "true") {
      toast("Paiement annulé — vous pouvez choisir une formule à tout moment.");
      window.history.replaceState({}, "", "/mon-abonnement");
    }
  }, [searchParams, loadData]);

  // Determine view — strict order
  useEffect(() => {
    if (!profile) return;
    const today = new Date();

    const isOwner =
      effectiveRole === "owner" ||
      profile?.role === "owner" ||
      profile?.active_role === "owner" ||
      profile?.default_role === "owner";

    const isFounder = profile?.is_founder === true;

    const subStatut = sub?.status ?? null;

    if (isOwner) {
      setView("owner");
    } else if (subStatut === "active" || subStatut === "trial") {
      setView("subscribed");
    } else if (isFounder && today < GRACE_END) {
      setView("founder_active");
    } else if (isFounder && today >= GRACE_END) {
      setView("founder_post_grace");
    } else if (
      subStatut === "expired" ||
      subStatut === "canceled" ||
      subStatut === "cancelled" ||
      subStatut === "past_due"
    ) {
      setView("expired");
    } else {
      setView("never_subscribed");
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-60 rounded-xl" />
          <Skeleton className="h-60 rounded-xl" />
          <Skeleton className="h-60 rounded-xl" />
        </div>
      </div>
    );
  }

  const isFounder = !!profile?.is_founder;

  const renewalFormatted = sub?.expires_at ? format(new Date(sub.expires_at), "d MMMM yyyy", { locale: fr }) : "—";

  const planLabel = sub?.plan === "monthly" ? "Formule mensuelle"
    : sub?.plan === "oneshot" ? "Accès un mois"
    : sub?.plan === "yearly" ? "Accès 2026"
    : "Abonnement";

  const showReferral = effectiveRole !== "owner";

  // Founder countdown calculations
  const now = new Date();
  const totalMs = GRACE_END.getTime() - FOUNDER_START.getTime();
  const remainingMs = Math.max(0, GRACE_END.getTime() - now.getTime());
  const daysLeft = Math.ceil(remainingMs / 86400000);
  const progressPct = Math.min(100, Math.round(((totalMs - remainingMs) / totalMs) * 100));

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto animate-fade-in space-y-8">
      <PageMeta title="Mon abonnement | Guardiens" description="Gérez votre abonnement Guardiens." noindex />

      {/* ══ VUE — PROPRIÉTAIRE ══ */}
      {view === "owner" && (
        <>
          <div className="bg-card border border-border rounded-xl p-8 max-w-2xl mx-auto space-y-4">
            <div className="flex items-center gap-3">
              <Home className="h-7 w-7 text-primary" />
              <h2 className="text-2xl font-heading font-semibold">Guardiens est gratuit pour les propriétaires.</h2>
            </div>
            <p className="text-sm text-foreground/70 font-body">
              Publiez vos annonces, recevez des candidatures et échangez avec les gardiens — sans frais, pour toujours.
            </p>
          </div>
          <ReferralSection referralCode={profile?.referral_code} userId={user!.id} />
        </>
      )}

      {/* ══ VUE — FONDATEUR ACTIF ══ */}
      {view === "founder_active" && (
        <div className="max-w-2xl mx-auto w-full px-4 space-y-6">
          <div className="bg-card border border-amber-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6 w-full">
            {/* En-tête */}
            <div className="flex flex-col items-center text-center space-y-3">
              <BadgeSceauLarge id="fondateur" size={52} />
              <h2 className="font-heading text-2xl font-semibold text-foreground">
                Vous êtes Fondateur Guardiens.
              </h2>
              <p className="text-base text-foreground/70 font-body">
                Votre accès complet est gratuit jusqu'au 13 juin 2026.
              </p>
            </div>

            {/* Compte à rebours */}
            <div className="bg-amber-50 rounded-xl py-4 px-6 space-y-2">
              <p className="text-sm font-medium text-amber-800 font-body">
                Il reste {daysLeft} jour{daysLeft > 1 ? "s" : ""} sur votre période fondateur
              </p>
              <div className="w-full bg-amber-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-400 h-2 rounded-full transition-all duration-500"
                  ref={(el) => {
                    if (el) el.style.width = `${progressPct}%`;
                  }}
                />
              </div>
              <p className="text-xs text-amber-600 font-body">
                Accès gratuit jusqu'au 13 juin 2026
              </p>
            </div>

            {/* Grille avantages */}
            <div className="bg-muted/30 rounded-xl p-5">
              <p className="text-xs uppercase tracking-widest text-foreground/50 font-body mb-4">
                Ce que vous débloquez
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                {FOUNDER_ADVANTAGES.map((a) => (
                  <div key={a} className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span className="text-sm text-foreground/80 font-body">{a}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA discret */}
            <div className="flex flex-col items-center gap-2 pt-2">
              <Button
                variant="outline"
                className="border-primary text-primary hover:bg-primary/5 font-body"
                onClick={() => setShowSupportDialog(true)}
              >
                Soutenir Guardiens maintenant
              </Button>
              <p className="text-xs text-foreground/50 italic text-center max-w-xs font-body">
                Votre abonnement démarrera le 14 juin — vous ne perdrez pas un seul jour.
              </p>
            </div>

            {/* Texte permanent */}
            <p className="text-xs text-foreground/40 italic text-center font-body">
              Votre badge Fondateur reste à vie, quelle que soit votre situation future.
            </p>
          </div>

          {showReferral && <ReferralSection referralCode={profile?.referral_code} userId={user!.id} />}

          {/* Dialog "Soutenir maintenant" */}
          <Dialog open={showSupportDialog} onOpenChange={setShowSupportDialog}>
            <DialogContent className="max-w-3xl w-full p-6 sm:p-8">
              <DialogHeader>
                <DialogTitle className="font-heading text-xl">
                  Choisissez votre formule
                </DialogTitle>
              </DialogHeader>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 font-body mb-4">
                En choisissant maintenant, votre abonnement démarrera le 14 juin 2026. Votre accès fondateur reste intact jusqu'à cette date.
              </div>
              <PricingCardsNew />
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ══ VUE — FONDATEUR POST-GRÂCE ══ */}
      {view === "founder_post_grace" && (
        <div className="max-w-2xl mx-auto w-full px-4 space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <BadgeSceauLarge id="fondateur" size={52} />
            <h2 className="font-heading text-2xl font-semibold text-foreground">
              Votre période fondateur est terminée.
            </h2>
            <p className="text-sm text-foreground/70 font-body">
              Merci d'avoir été là dès le premier jour. Choisissez votre formule.
            </p>
          </div>

          <PricingCardsNew />

          <p className="text-xs text-amber-700 italic text-center mt-2 font-body">
            Votre badge Fondateur reste permanent à vie.
          </p>

          {showReferral && <ReferralSection referralCode={profile?.referral_code} userId={user!.id} />}
        </div>
      )}

      {/* ══ VUE — NON ABONNÉ ══ */}
      {view === "never_subscribed" && (
        <>
          <div className="space-y-2 mb-2">
            <p className="text-xs uppercase tracking-widest text-primary/60 font-body">Votre abonnement</p>
            <h2 className="text-2xl font-heading font-semibold">Accédez à toutes les gardes.</h2>
            <p className="text-sm text-foreground/70 font-body">Choisissez ce qui vous convient.</p>
          </div>
          <PricingCardsNew />
          {showReferral && <ReferralSection referralCode={profile?.referral_code} userId={user!.id} />}
        </>
      )}

      {/* ══ VUE — ABONNÉ ACTIF ══ */}
      {view === "subscribed" && (
        <>
          <div className="bg-card border border-border rounded-xl p-6 space-y-4 max-w-2xl mx-auto">
            <h2 className="font-heading text-2xl font-semibold">Abonnement actif.</h2>
            <p className="text-sm text-foreground/70 font-body">Formule : <span className="font-medium text-foreground">{planLabel}</span></p>
            {sub?.plan === "monthly" && (
              <p className="text-sm text-foreground/70 font-body">Prochain renouvellement le <span className="font-medium text-foreground">{renewalFormatted}</span></p>
            )}
            {sub?.plan === "oneshot" && (
              <p className="text-sm text-foreground/70 font-body">Accès jusqu'au <span className="font-medium text-foreground">{renewalFormatted}</span></p>
            )}
            {sub?.plan === "yearly" && (
              <p className="text-sm text-foreground/70 font-body">Accès jusqu'au <span className="font-medium text-foreground">31 décembre 2026</span></p>
            )}

            <Button variant="outline" className="w-full font-body" onClick={openPortal} disabled={portalLoading}>
              {portalLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Gérer mon abonnement
            </Button>

            {sub?.plan === "monthly" && (
              <button onClick={openPortal} className="w-full text-sm text-foreground/50 hover:text-foreground transition-colors text-center font-body">
                Annuler l'abonnement
              </button>
            )}
          </div>

          {isFounder && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-foreground/70 text-center flex items-center justify-center gap-2 font-body">
              <Star className="h-4 w-4 text-amber-500" fill="currentColor" /> Badge Fondateur permanent
            </div>
          )}

          {showReferral && <ReferralSection referralCode={profile?.referral_code} userId={user!.id} />}
        </>
      )}

      {/* ══ VUE — EXPIRÉ ══ */}
      {view === "expired" && (
        <>
          <div className="text-center space-y-3 mb-4">
            <Clock className="h-10 w-10 text-muted-foreground mx-auto" />
            <h2 className="text-2xl font-heading font-semibold">Votre accès est terminé.</h2>
            <p className="text-sm text-foreground/70 font-body">Reprenez là où vous en étiez.</p>
          </div>

          <div className="flex flex-col gap-3 max-w-md mx-auto mb-6">
            {EXPIRED_HIGHLIGHTS.map(h => (
              <div key={h.label} className="flex items-center gap-3 text-sm text-foreground/70 font-body">
                <h.icon className="h-5 w-5 text-primary shrink-0" />
                {h.label}
              </div>
            ))}
          </div>

          <PricingCardsNew />

          {isFounder && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-foreground/70 text-center font-body">
              Votre badge Fondateur reste permanent à vie.
            </div>
          )}

          {showReferral && <ReferralSection referralCode={profile?.referral_code} userId={user!.id} />}
        </>
      )}

      {loadError && (
        <p className="text-xs text-foreground/40 text-center mt-4 font-body">
          Impossible de charger votre statut — réessayez.
        </p>
      )}
    </div>
  );
};

export default MySubscription;
