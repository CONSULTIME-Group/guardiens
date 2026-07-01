import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BadgeSceauLarge } from "@/components/badges/BadgeSceauLarge";
import FounderBadge from "@/components/badges/FounderBadge";
import EntraideLibreBanner from "@/components/subscription/EntraideLibreBanner";
import PricingCardsCheckout from "@/components/subscription/PricingCardsCheckout";
import MySubscriptionFAQ from "@/components/subscription/MySubscriptionFAQ";
import { safeUUID } from "@/lib/uuid";

import {
  Star, Home, Clock, Loader2, Check, Copy,
  Send, MessageSquare, Search as SearchIcon,
  CreditCard, FileText, ArrowRight, Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { useSearchParams, Link } from "react-router-dom";

import { LAUNCH_DATE, LAUNCH_START, GRACE_END, FOUNDER_START } from "@/lib/constants";
import { SITTER_PRICE_START } from "@/lib/pricing";

function calcCountdown() {
  const now = new Date();
  const msLeft = Math.max(0, LAUNCH_DATE.getTime() - now.getTime());
  const daysLeft = Math.ceil(msLeft / 86400000);
  const totalMs = LAUNCH_DATE.getTime() - LAUNCH_START.getTime();
  const elapsed = Math.max(0, totalMs - msLeft);
  const progressPct = Math.min(100, Math.round((elapsed / totalMs) * 100));
  return { daysLeft, progressPct };
}

type ViewState = "owner" | "founder_active" | "founder_post_grace" | "subscribed" | "expired" | "never_subscribed" | "pre_launch" | "loading";

interface SubRow {
  status: string | null;
  plan: string | null;
  expires_at: string | null;
  stripe_subscription_id: string | null;
}

// Source unique de vérité pour les avantages (utilisée dans toutes les vues)
const ADVANTAGES: { label: string; href: string | null }[] = [
  { label: "Postuler aux gardes", href: "/search" },
  { label: "Messagerie avec les propriétaires", href: null },
  { label: "Apparaître dans la recherche", href: null },
  { label: "Mode «Je suis disponible»", href: "/dashboard" },
  { label: "Fiches races complètes", href: "/actualites" },
  { label: "Guides locaux détaillés", href: "/guides" },
  { label: "Articles en accès complet", href: "/actualites" },
  { label: "Écussons et métriques de fiabilité", href: null },
];

const trackEvent = (eventName: string, params?: Record<string, string>) => {
  try {
    if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
      (window as any).gtag("event", eventName, params ?? {});
    }
  } catch {
    // silencieux
  }
};

// ──── REFERRAL SECTION (utilisé hors pré-lancement) ────
function ReferralSection({ referralCode, userId }: { referralCode: string | null; userId: string }) {
  const [code, setCode] = useState(referralCode);

  useEffect(() => {
    if (code) return;
    const generated = safeUUID().replace(/-/g, "").slice(0, 8);
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
    <div id="parrainage" className="bg-muted rounded-xl px-6 py-5 scroll-mt-24">
      <h3 className="font-heading text-lg font-semibold mb-1">Parrainez un proche.</h3>
      <p className="text-sm text-muted-foreground font-body mb-4">
        Votre filleul rejoint Guardiens <strong className="text-foreground">gratuitement</strong> jusqu'au {SITTER_PRICE_START}.
        Quand l'abonnement gardien deviendra payant, vous recevez tous les deux
        un mois d'accès offert dès son activation.
      </p>
      <div className="flex gap-2">
        <input
          readOnly
          value={url}
          className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground font-body truncate"
        />
        <Button variant="outline" size="sm" onClick={handleCopy}>
          <Copy className="h-4 w-4" /> Copier
        </Button>
      </div>
      <p className="text-xs text-muted-foreground font-body mt-2">
        Le mois offert est crédité dès que votre filleul active son compte.
      </p>
    </div>
  );
}

const FOUNDER_FAQ = [
  {
    q: "C'est vraiment offert jusqu'au 30 septembre 2026 ?",
    a: "Oui. Aucune carte bancaire demandée avant le 1er octobre 2026. Après cette date, vous choisissez librement de souscrire, rien ne démarre automatiquement.",
  },
  {
    q: "Que se passe-t-il après le 30 septembre 2026 ?",
    a: "Une seule formule récurrente : 6,99 €/mois sans engagement, résiliable en un clic. Une formule « accès un mois » à 10 € en paiement unique reste également disponible.",
  },
  {
    q: "Qu'est-ce que le badge Fondateur ?",
    a: "Un écusson permanent visible sur votre profil public. Il distingue les membres qui ont rejoint Guardiens dès le début.",
  },
];

// Wrapper standardisé : breadcrumb + h1 commun à toutes les vues
const PageShell = ({ subtitle, children }: { subtitle?: string; children: React.ReactNode }) => (
  <div className="animate-fade-in">
    <PageMeta title="Mon abonnement | Guardiens" description="Gérez votre abonnement Guardiens." noindex />
    <PageBreadcrumb items={[{ label: "Mon abonnement" }]} />
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-2 pb-12">
      <header className="mb-6">
        <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-foreground">Mon abonnement</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground font-body mt-1">{subtitle}</p>
        )}
      </header>
      <div className="space-y-8">{children}</div>
    </div>
  </div>
);

// ──── MAIN PAGE ────
const MySubscription = () => {
  const { user, activeRole } = useAuth();
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<ViewState>("loading");
  const [profile, setProfile] = useState<any>(null);
  const [sub, setSub] = useState<SubRow | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showSupportDialog, setShowSupportDialog] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Pre-launch states
  const [referralUrl, setReferralUrl] = useState<string>("");
  const [copyLabel, setCopyLabel] = useState<string>("Copier mon lien");
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [profileCompletion, setProfileCompletion] = useState<number>(0);
  const [isNewMember, setIsNewMember] = useState<boolean>(false);
  const [countdown, setCountdown] = useState(calcCountdown);

  const effectiveRole = user?.role === "both" ? activeRole : user?.role;

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(calcCountdown());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyReferral = async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
    } catch {
      try {
        const el = document.createElement("textarea");
        el.value = referralUrl;
        el.style.cssText = "position:fixed;opacity:0;top:0;left:0";
        document.body.appendChild(el);
        el.focus();
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      } catch { /* silencieux */ }
    }
    setCopyLabel("Lien copié");
    trackEvent("referral_link_copied", { source: "pre_launch_page" });
    setTimeout(() => setCopyLabel("Copier mon lien"), 2500);
  };

  const loadData = useCallback(async () => {
    if (!user) { setView("never_subscribed"); return; }
    try {
      const params = new URLSearchParams(window.location.search);
      const isWelcome = params.get("success") === "true" || params.get("welcome") === "true";
      setIsNewMember(isWelcome);
      if (isWelcome) {
        window.history.replaceState({}, "", "/mon-abonnement");
      }

      const [profileRes, subRes] = await Promise.all([
        supabase.from("profiles").select("is_founder, created_at, role, referral_code, profile_completion, identity_verified").eq("id", user.id).maybeSingle(),
        supabase.from("subscriptions").select("status, plan, expires_at, stripe_subscription_id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);

      const p = profileRes.data;
      const pData = p ?? { is_founder: false, referral_code: null, profile_completion: 0, role: null };
      setProfile(pData);
      setSub(subRes.data);
      setProfileCompletion((p?.profile_completion as number) ?? 0);

      const code = (p?.referral_code as string) ?? "";
      setReferralUrl(code ? `https://guardiens.fr/inscription?ref=${code}` : "https://guardiens.fr/inscription");

      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      if (typeof count === "number") setMemberCount(count);

      const isOwner = activeRole === "owner";

      const isPrelaunched = new Date() < LAUNCH_DATE;
      if (isPrelaunched && !isOwner) {
        setView("pre_launch");
        trackEvent("page_view_pre_launch");
        return;
      }

      const isFounder = p?.is_founder === true;
      const subStatut = (subRes.data?.status as string) ?? null;
      const now = new Date();

      if (isOwner) {
        setView("owner");
      } else if (subStatut === "active" || subStatut === "trial") {
        setView("subscribed");
      } else if (isFounder && now < GRACE_END) {
        setView("founder_active");
      } else if (isFounder && now >= GRACE_END) {
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
    } catch {
      setLoadError(true);
      setView("never_subscribed");
    }
  }, [user, activeRole]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (view !== "loading") return;
    const t = setTimeout(() => {
      setView("never_subscribed");
      setLoadError(true);
    }, 5000);
    return () => clearTimeout(t);
  }, [view]);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      const formula = searchParams.get("formula");
      const messages: Record<string, string> = {
        monthly: "Votre abonnement gardien est activé, bienvenue chez Guardiens.",
        one_shot: "Votre accès d'un mois est actif. Bonne garde !",
        prorata: "Votre accès 2026 est activé. Merci pour votre soutien.",
      };
      toast.success(messages[formula || ""] || "Votre abonnement est activé !");
      setTimeout(() => loadData(), 2000);
      window.history.replaceState({}, "", "/mon-abonnement");
    } else if (searchParams.get("cancelled") === "true") {
      toast("Paiement annulé, vous pouvez choisir une formule à tout moment.");
      window.history.replaceState({}, "", "/mon-abonnement");
    }
  }, [searchParams, loadData]);

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

  if (view === "loading") {
    return (
      <div className="animate-fade-in">
        <PageMeta title="Mon abonnement | Guardiens" description="Gérez votre abonnement Guardiens." noindex />
        <PageBreadcrumb items={[{ label: "Mon abonnement" }]} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-2 pb-12 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Skeleton className="h-60 rounded-xl" />
            <Skeleton className="h-60 rounded-xl" />
            <Skeleton className="h-60 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const isFounder = !!profile?.is_founder;
  const renewalFormatted = sub?.expires_at ? format(new Date(sub.expires_at), "d MMMM yyyy", { locale: fr }) : ",";
  const planLabel = sub?.plan === "monthly" ? "Formule mensuelle"
    : sub?.plan === "yearly" ? "Accès 2026"
    : sub?.plan === "oneshot" ? "Accès d'un mois"
    : "Abonnement actif";
  const showReferral = effectiveRole !== "owner";

  // Founder countdown calculations (for founder_active view)
  const now = new Date();
  const totalMs = GRACE_END.getTime() - FOUNDER_START.getTime();
  const remainingMs = Math.max(0, GRACE_END.getTime() - now.getTime());
  const daysLeft = Math.ceil(remainingMs / 86400000);
  const progressPct = Math.min(100, Math.round(((totalMs - remainingMs) / totalMs) * 100));

  // ══════════════════════════════════════════════════════════
  // VUE, PRE_LAUNCH
  // ══════════════════════════════════════════════════════════
  if (view === "pre_launch") {
    return (
      <PageShell subtitle="Tout est offert pendant la bêta, aucun paiement avant le 1er octobre 2026.">
        {isNewMember && (
          <div className="bg-primary/10 border border-primary/20 rounded-xl px-5 py-4 flex items-start gap-3" role="status" aria-live="polite">
            <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-primary font-body">Bienvenue chez Guardiens.</p>
              <p className="text-sm text-muted-foreground font-body mt-0.5">
                Votre compte est actif. Toutes les fonctionnalités sont disponibles jusqu'au 1er octobre 2026.
              </p>
            </div>
          </div>
        )}

        {/* Carte principale */}
        <section className="bg-card border border-primary/20 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 sm:px-8 pt-7 pb-6 flex flex-col items-center text-center space-y-3 border-b border-border/50">
            <span className="hidden md:inline-flex items-center gap-1.5 bg-primary/10 text-primary text-[11px] font-medium px-3 py-1.5 rounded-full font-body tracking-widest uppercase select-none">
              Pré-lancement · Bêta
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-foreground leading-tight">
              Tout est offert jusqu'au 30 septembre 2026.
            </h2>
            <p className="text-base text-muted-foreground font-body max-w-sm leading-relaxed">
              Guardiens est en version bêta. Toutes les fonctionnalités sont ouvertes, sans restriction.
            </p>
            {memberCount !== null && memberCount > 0 && memberCount < 200 && (
              <p className="text-xs text-muted-foreground font-body" aria-live="polite">
                Vous êtes parmi les {memberCount} premiers membres.
              </p>
            )}
            {memberCount !== null && memberCount >= 200 && (
              <p className="text-xs text-muted-foreground font-body" aria-live="polite">
                {memberCount} membres ont déjà rejoint Guardiens.
              </p>
            )}
          </div>

          {/* Timeline */}
          <div className="px-6 sm:px-8 py-5 border-b border-border/50">
            <ol className="flex items-start justify-between gap-2 relative" aria-label="Calendrier du lancement">
              <div className="absolute top-3 left-8 right-8 h-px bg-border" aria-hidden="true" />
              {[
                { label: "Maintenant", sub: "Accès complet", state: "active" as const },
                { label: "14 juillet", sub: "Badge Fondateur", state: "founder" as const },
                { label: "15 juillet", sub: "Fin de la grâce", state: "future" as const },
                { label: "Ensuite", sub: "6,99 €/mois · sans engagement", state: "future" as const },
              ].map(({ label, sub: subText, state }) => (
                <li key={label} className="flex flex-col items-center gap-1.5 z-10 flex-1">
                  <div className={[
                    "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                    state === "active" ? "bg-primary"
                    : state === "founder" ? "bg-founder-soft border-2 border-founder-border"
                    : "bg-muted border-2 border-border/60",
                  ].join(" ")}>
                    <div className={[
                      "w-2 h-2 rounded-full",
                      state === "active" ? "bg-primary-foreground"
                      : state === "founder" ? "bg-founder"
                      : "bg-border",
                    ].join(" ")} />
                  </div>
                  <p className={[
                    "text-[10px] font-medium font-body text-center leading-tight",
                    state === "active" ? "text-primary"
                    : state === "founder" ? "text-founder"
                    : "text-muted-foreground",
                  ].join(" ")}>{label}</p>
                  <p className="text-[10px] font-body text-center leading-tight text-muted-foreground">{subText}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Countdown */}
          <div className="px-6 sm:px-8 py-5 border-b border-border/50 space-y-3">
            <div className="flex items-baseline justify-between gap-4 flex-wrap">
              <p className="text-sm font-medium text-foreground font-body">Il reste encore</p>
              <p className="font-heading text-2xl md:text-3xl font-bold text-founder whitespace-nowrap tabular-nums" aria-live="polite" aria-atomic="true">
                {countdown.daysLeft}
                <span className="text-base font-body font-normal text-muted-foreground ml-1.5">
                  jour{countdown.daysLeft > 1 ? "s" : ""} pour rejoindre les Fondateurs
                </span>
              </p>
            </div>
            <div className="w-full bg-founder-soft rounded-full h-2 overflow-hidden" role="progressbar" aria-valuenow={countdown.progressPct} aria-valuemin={0} aria-valuemax={100} aria-label="Progression vers le lancement">
              <div className="bg-founder h-2 rounded-full transition-all duration-700" style={{ width: `${countdown.progressPct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground font-body">Lancement officiel le 30 septembre 2026.</p>
          </div>

          {/* Profile nudge */}
          {profileCompletion < 60 && (
            <div className="px-6 sm:px-8 py-4 border-b border-border/50 bg-muted/30 flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-1.5 flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground font-body">
                  Complétez votre profil pour être visible dès le lancement.
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-border rounded-full h-1.5 overflow-hidden flex-shrink-0">
                    <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${profileCompletion}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground font-body whitespace-nowrap">{profileCompletion} % complété</span>
                </div>
              </div>
              <Link
                to={effectiveRole === "owner" ? "/owner-profile" : "/profile"}
                className="text-sm font-medium text-primary font-body hover:underline whitespace-nowrap flex-shrink-0 inline-flex items-center gap-1"
                onClick={() => trackEvent("cta_complete_profile", { source: "pre_launch_nudge" })}
              >
                Compléter <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* Avantages */}
          <div className="px-6 sm:px-8 py-6 border-b border-border/50 space-y-4">
            <p className="hidden md:block text-xs uppercase tracking-widest text-muted-foreground font-body">Tout ce que vous débloquez</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {ADVANTAGES.map(({ label, href }) => (
                <div key={label} className="flex items-center gap-2.5 min-w-0 group">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
                  {href ? (
                    <Link
                      to={href}
                      className="text-sm text-foreground font-body leading-snug group-hover:text-primary group-hover:underline transition-colors"
                      onClick={() => trackEvent("advantage_link_click", { label })}
                    >
                      {label}
                    </Link>
                  ) : (
                    <span className="text-sm text-foreground font-body leading-snug">{label}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Founder block */}
          {countdown.daysLeft > 0 && (
            <div className="px-6 sm:px-8 py-6 border-b border-border/50 bg-founder-soft">
              <div className="flex items-start gap-3 mb-3">
                <FounderBadge size="lg" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-founder-foreground font-body">
                    Vous devenez Fondateur le 14 juillet.
                  </p>
                  <p className="text-sm text-founder-foreground/80 font-body leading-relaxed">
                    Chaque membre inscrit avant le 30 septembre 2026 reçoit le badge Fondateur, visible sur son profil public. L'accès offert, lui, est étendu à tous les inscrits jusqu'au 30 septembre 2026.
                  </p>
                </div>
              </div>
              <Accordion type="single" collapsible className="mt-2 border-t border-founder-border/60 pt-2">
                {FOUNDER_FAQ.map(({ q, a }, i) => (
                  <AccordionItem key={q} value={`founder-faq-${i}`} className="border-founder-border/40 last:border-b-0">
                    <AccordionTrigger className="text-xs font-medium text-founder-foreground font-body hover:no-underline py-3">
                      {q}
                    </AccordionTrigger>
                    <AccordionContent className="text-xs text-founder-foreground/80 font-body leading-relaxed">
                      {a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}

          {/* CTA principal */}
          <div className="px-6 sm:px-8 py-6 flex flex-col items-center gap-2">
            <Link
              to="/search"
              className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-body font-medium text-sm px-6 py-3.5 rounded-xl hover:bg-primary/90 transition-colors min-h-[44px]"
              onClick={() => trackEvent("cta_prelaunched_explore", { source: "pre_launch_main_cta" })}
            >
              <SearchIcon className="w-4 h-4" aria-hidden="true" />
              Explorer les annonces
            </Link>
            <p className="text-xs text-muted-foreground font-body text-center">
              Revenez ici à partir du 1er octobre 2026 pour choisir votre formule.
            </p>
          </div>
        </section>

        {/* Pricing preview */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <p className="hidden md:block text-xs uppercase tracking-widest text-muted-foreground font-body">Après le 15 juillet, la formule</p>
          <div className="flex flex-col items-center text-center space-y-1">
            <p className="font-heading text-3xl font-bold text-primary">
              6,99 €<span className="text-sm font-normal text-muted-foreground">/mois</span>
            </p>
            <p className="text-xs text-muted-foreground font-body">Sans engagement · Résiliable à tout moment</p>
          </div>
          <p className="text-xs text-muted-foreground font-body text-center">Aucun prélèvement automatique avant votre choix.</p>
        </div>

        <EntraideLibreBanner />

        {/* Referral */}
        <div className="bg-muted/50 rounded-xl px-5 sm:px-6 py-5 space-y-4">
          <div className="space-y-1">
            <p className="font-heading text-base font-semibold text-foreground">Invitez quelqu'un du coin.</p>
            <p className="text-sm text-muted-foreground font-body leading-relaxed">
              Si un proche s'inscrit avec votre lien et active son compte, vous recevez tous les deux un mois d'accès offert.
            </p>
          </div>
          <div className="flex items-stretch gap-2">
            <input
              readOnly
              value={referralUrl || "Chargement…"}
              aria-label="Votre lien de parrainage"
              onFocus={(e) => {
                const input = e.target as HTMLInputElement;
                setTimeout(() => input.setSelectionRange(0, input.value.length), 0);
              }}
              onClick={(e) => {
                const input = e.target as HTMLInputElement;
                setTimeout(() => input.setSelectionRange(0, input.value.length), 0);
              }}
              className="flex-1 text-sm bg-background border border-border rounded-lg px-3 py-2.5 text-muted-foreground font-body truncate cursor-default focus:outline-none focus:ring-1 focus:ring-primary/30 min-w-0"
            />
            <button
              type="button"
              onClick={handleCopyReferral}
              disabled={!referralUrl || referralUrl === "Chargement…"}
              className="shrink-0 inline-flex items-center gap-1.5 font-body text-sm font-medium px-4 py-2.5 rounded-lg border border-primary text-primary hover:bg-primary/5 transition-colors disabled:opacity-40 disabled:pointer-events-none min-h-[44px] whitespace-nowrap"
            >
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              {copyLabel}
            </button>
          </div>
          <p className="text-xs text-muted-foreground font-body italic">
            Le mois offert est crédité dès que votre filleul active son compte.
          </p>
        </div>
      </PageShell>
    );
  }

  // ══════════════════════════════════════════════════════════
  // VUE, PROPRIÉTAIRE
  // ══════════════════════════════════════════════════════════
  if (view === "owner") {
    return (
      <PageShell subtitle="L'espace propriétaire est offert, sans frais ni engagement.">
        <section className="bg-card border border-border rounded-xl p-6 sm:p-8 space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Home className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-heading font-semibold">Tout est offert pour les propriétaires.</h2>
              <p className="text-sm text-muted-foreground font-body">
                Publiez vos annonces, recevez des candidatures et échangez avec les gardiens, sans frais.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <Link
              to="/dashboard"
              className="group flex items-center justify-between gap-3 bg-muted/40 hover:bg-muted/70 transition-colors rounded-lg px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Home className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm font-medium text-foreground font-body truncate">Tableau de bord</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
            </Link>
            <Link
              to="/sits"
              className="group flex items-center justify-between gap-3 bg-muted/40 hover:bg-muted/70 transition-colors rounded-lg px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm font-medium text-foreground font-body truncate">Mes annonces</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
            </Link>
            <Link
              to="/sits/create"
              className="group flex items-center justify-between gap-3 bg-muted/40 hover:bg-muted/70 transition-colors rounded-lg px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm font-medium text-foreground font-body truncate">Publier une annonce</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
            </Link>
            <Link
              to="/messages"
              className="group flex items-center justify-between gap-3 bg-muted/40 hover:bg-muted/70 transition-colors rounded-lg px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <MessageSquare className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm font-medium text-foreground font-body truncate">Messagerie</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
            </Link>
          </div>

          <p className="text-xs text-muted-foreground font-body pt-2 border-t border-border">
            Aucun moyen de paiement n'est demandé pour l'espace propriétaire.
          </p>
        </section>

        <EntraideLibreBanner />
        <ReferralSection referralCode={profile?.referral_code} userId={user!.id} />
        <MySubscriptionFAQ />
      </PageShell>
    );
  }

  // ══════════════════════════════════════════════════════════
  // VUE, FONDATEUR ACTIF
  // ══════════════════════════════════════════════════════════
  if (view === "founder_active") {
    return (
      <PageShell>
        <section className="bg-card border border-founder-border rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <BadgeSceauLarge id="fondateur" size={52} />
            <h2 className="font-heading text-2xl font-semibold text-foreground">Vous êtes Fondateur Guardiens.</h2>
            <p className="text-base text-muted-foreground font-body">
              Votre accès complet est offert jusqu'au 1er octobre 2026.
            </p>
          </div>

          <div className="bg-founder-soft rounded-xl py-4 px-6 space-y-2">
            <p className="text-sm font-medium text-founder-foreground font-body">
              Il reste {daysLeft} jour{daysLeft > 1 ? "s" : ""} sur votre période fondateur
            </p>
            <div className="w-full bg-founder-border/40 rounded-full h-2 overflow-hidden">
              <div className="bg-founder h-2 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="text-xs text-founder-foreground/70 font-body">Accès offert jusqu'au 1er octobre 2026.</p>
          </div>

          <div className="bg-muted/30 rounded-xl p-5">
            <p className="hidden md:block text-xs uppercase tracking-widest text-muted-foreground font-body mb-4">Ce que vous débloquez</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {ADVANTAGES.map((a) => (
                <div key={a.label} className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span className="text-sm text-foreground font-body">{a.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 pt-2">
            <Button variant="outline" className="border-primary text-primary hover:bg-primary/5 font-body" onClick={() => setShowSupportDialog(true)}>
              Choisir ma formule pour le 15 juillet
            </Button>
            <p className="text-xs text-muted-foreground italic text-center max-w-xs font-body">
              Votre abonnement démarrera le 15 juillet, vous ne perdrez pas un seul jour.
            </p>
          </div>

          <p className="text-xs text-muted-foreground italic text-center font-body">
            Votre badge Fondateur reste affiché sur votre profil, quelle que soit votre situation future.
          </p>
        </section>

        {showReferral && <ReferralSection referralCode={profile?.referral_code} userId={user!.id} />}
        <MySubscriptionFAQ />

        <Dialog open={showSupportDialog} onOpenChange={setShowSupportDialog}>
          <DialogContent className="max-w-3xl w-full p-6 sm:p-8">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">Choisissez votre formule</DialogTitle>
            </DialogHeader>
            <div className="bg-founder-soft border border-founder-border rounded-lg p-3 text-sm text-founder-foreground font-body mb-4">
              En choisissant maintenant, votre abonnement démarrera le 1er octobre 2026. Votre accès fondateur reste intact jusqu'à cette date.
            </div>
            <PricingCardsCheckout />
          </DialogContent>
        </Dialog>
      </PageShell>
    );
  }

  // ══════════════════════════════════════════════════════════
  // VUE, FONDATEUR POST-GRÂCE
  // ══════════════════════════════════════════════════════════
  if (view === "founder_post_grace") {
    return (
      <PageShell>
        <div className="flex flex-col items-center text-center space-y-3">
          <BadgeSceauLarge id="fondateur" size={52} />
          <h2 className="font-heading text-2xl font-semibold text-foreground">Reprenez là où vous vous êtes arrêté.</h2>
          <p className="text-sm text-muted-foreground font-body max-w-md">
            Merci d'avoir été là dès le premier jour. Choisissez librement votre formule, votre profil et votre historique sont conservés.
          </p>
        </div>
        <EntraideLibreBanner />
        <PricingCardsCheckout />
        <p className="text-xs text-founder italic text-center font-body">Votre badge Fondateur reste permanent.</p>
        {showReferral && <ReferralSection referralCode={profile?.referral_code} userId={user!.id} />}
        <MySubscriptionFAQ />
      </PageShell>
    );
  }

  // ══════════════════════════════════════════════════════════
  // VUE, NON ABONNÉ
  // ══════════════════════════════════════════════════════════
  if (view === "never_subscribed") {
    return (
      <PageShell subtitle="Choisissez la formule qui vous convient et démarrez quand vous voulez.">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-primary/70 font-body">Votre abonnement</p>
          <h2 className="text-2xl font-heading font-semibold">Postulez aux gardes près de chez vous.</h2>
          <p className="text-sm text-muted-foreground font-body">Aucun engagement. Annulable en un clic.</p>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-xl px-5 py-4 flex items-center gap-3">
          <Star className="h-5 w-5 text-primary flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground font-body">Sans engagement · Résiliable en un clic</p>
            <p className="text-xs text-muted-foreground font-body">Aucune commission, aucun frais caché. Une formule « accès un mois » à 10 € est aussi disponible si vous préférez un paiement unique.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-2.5 bg-card border border-border/40 rounded-xl px-4 py-3">
            <Send className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm text-muted-foreground font-body">Postuler aux gardes près de chez vous</span>
          </div>
          <div className="flex items-center gap-2.5 bg-card border border-border/40 rounded-xl px-4 py-3">
            <SearchIcon className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm text-muted-foreground font-body">Apparaître dans la recherche des propriétaires</span>
          </div>
          <div className="flex items-center gap-2.5 bg-card border border-border/40 rounded-xl px-4 py-3">
            <MessageSquare className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm text-muted-foreground font-body">Messagerie illimitée avec les propriétaires</span>
          </div>
        </div>

        <EntraideLibreBanner />
        <PricingCardsCheckout />

        {isFounder && (
          <div className="bg-founder-soft border border-founder-border rounded-lg px-4 py-3 text-sm text-founder-foreground text-center flex items-center justify-center gap-2 font-body">
            <FounderBadge size="lg" /> Badge Fondateur permanent
          </div>
        )}

        {showReferral && <ReferralSection referralCode={profile?.referral_code} userId={user!.id} />}
        <MySubscriptionFAQ />
        <p className="text-xs text-muted-foreground font-body text-center">
          Besoin d'en savoir plus ? Consultez la <Link to="/tarifs" className="text-primary hover:underline">page tarifs</Link>.
        </p>
      </PageShell>
    );
  }

  // ══════════════════════════════════════════════════════════
  // VUE, ABONNÉ ACTIF
  // ══════════════════════════════════════════════════════════
  if (view === "subscribed") {
    return (
      <PageShell subtitle="Gérez votre formule, vos paiements et vos factures.">
        <section className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Check className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-semibold">Abonnement actif</h2>
              <p className="text-sm text-muted-foreground font-body">{planLabel}</p>
            </div>
          </div>

          <div className="bg-muted/30 rounded-xl p-4 space-y-2">
            {sub?.plan === "monthly" && (
              <div className="flex justify-between text-sm font-body">
                <span className="text-muted-foreground">Prochain renouvellement</span>
                <span className="font-medium text-foreground">{renewalFormatted}</span>
              </div>
            )}
            {sub?.plan === "oneshot" && (
              <div className="flex justify-between text-sm font-body">
                <span className="text-muted-foreground">Accès jusqu'au</span>
                <span className="font-medium text-foreground">{renewalFormatted}</span>
              </div>
            )}
            {sub?.plan === "yearly" && (
              <div className="flex justify-between text-sm font-body">
                <span className="text-muted-foreground">Accès jusqu'au</span>
                <span className="font-medium text-foreground">31 décembre 2026</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-body">
              <span className="text-muted-foreground">Tarif</span>
              <span className="font-medium text-foreground">
                {sub?.plan === "monthly"
                  ? "6,99 €/mois"
                  : sub?.plan === "oneshot"
                    ? "Accès d'un mois"
                    : sub?.plan === "yearly"
                      ? "Accès 2026 prorata"
                      : ","}
              </span>
            </div>
            <div className="flex justify-between text-sm font-body items-center pt-2 border-t border-border">
              <span className="text-muted-foreground">Moyen de paiement</span>
              <span className="text-xs text-muted-foreground font-body inline-flex items-center gap-1">
                <CreditCard className="h-3.5 w-3.5" /> Géré par Stripe
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button variant="outline" className="font-body justify-start gap-2" onClick={openPortal} disabled={portalLoading}>
              {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Voir mes factures
            </Button>
            <Button variant="outline" className="font-body justify-start gap-2" onClick={openPortal} disabled={portalLoading}>
              {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Changer de moyen de paiement
            </Button>
          </div>

          <Button variant="default" className="w-full font-body" onClick={openPortal} disabled={portalLoading}>
            {portalLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Gérer mon abonnement
          </Button>

          {sub?.plan === "monthly" && (
            <button
              type="button"
              onClick={openPortal}
              className="w-full text-xs text-destructive/70 hover:text-destructive transition-colors text-center font-body py-1"
            >
              Annuler l'abonnement
            </button>
          )}
        </section>

        {isFounder && (
          <div className="bg-founder-soft border border-founder-border rounded-lg px-4 py-3 text-sm text-founder-foreground text-center flex items-center justify-center gap-2 font-body">
            <FounderBadge size="lg" /> Badge Fondateur permanent
          </div>
        )}

        {showReferral && <ReferralSection referralCode={profile?.referral_code} userId={user!.id} />}
        <MySubscriptionFAQ />
      </PageShell>
    );
  }

  // ══════════════════════════════════════════════════════════
  // VUE, EXPIRÉ
  // ══════════════════════════════════════════════════════════
  if (view === "expired") {
    return (
      <PageShell subtitle="Reprenez là où vous vous êtes arrêté, votre profil est conservé.">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <Clock className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-heading font-semibold">Votre accès est en pause.</h2>
          <p className="text-sm text-muted-foreground font-body max-w-md mx-auto">
            Votre profil, vos avis et votre historique sont conservés. Réactivez votre accès quand vous le souhaitez.
          </p>
        </div>

        {(sub?.plan || sub?.expires_at) && (
          <div className="bg-muted/30 border border-border rounded-xl p-4 max-w-md mx-auto space-y-2">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-body">Votre formule précédente</p>
            <div className="flex justify-between text-sm font-body">
              <span className="text-muted-foreground">Formule</span>
              <span className="font-medium text-foreground">{planLabel}</span>
            </div>
            {sub?.expires_at && (
              <div className="flex justify-between text-sm font-body">
                <span className="text-muted-foreground">Terminé le</span>
                <span className="font-medium text-foreground">{renewalFormatted}</span>
              </div>
            )}
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-5 space-y-3 max-w-md mx-auto">
          <p className="text-xs uppercase tracking-widest text-primary/70 font-body font-medium">Ce que vous retrouvez en réactivant</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 text-sm text-foreground font-body">
              <Check className="h-4 w-4 text-primary shrink-0" />
              Visible dans les résultats de recherche
            </div>
            <div className="flex items-center gap-2.5 text-sm text-foreground font-body">
              <Check className="h-4 w-4 text-primary shrink-0" />
              Postulez à toutes les gardes
            </div>
            <div className="flex items-center gap-2.5 text-sm text-foreground font-body">
              <Check className="h-4 w-4 text-primary shrink-0" />
              Messagerie illimitée avec les propriétaires
            </div>
          </div>
        </div>

        <EntraideLibreBanner />
        <PricingCardsCheckout />

        {isFounder && (
          <div className="bg-founder-soft border border-founder-border rounded-lg px-4 py-3 text-sm text-founder-foreground text-center flex items-center justify-center gap-2 font-body">
            <FounderBadge size="lg" /> Badge Fondateur permanent
          </div>
        )}

        {showReferral && <ReferralSection referralCode={profile?.referral_code} userId={user!.id} />}
        <MySubscriptionFAQ />
        <p className="text-xs text-muted-foreground font-body text-center">
          Besoin d'en savoir plus ? Consultez la <Link to="/tarifs" className="text-primary hover:underline">page tarifs</Link>.
        </p>
      </PageShell>
    );
  }

  // Fallback (ne devrait jamais s'afficher)
  return (
    <PageShell>
      {loadError && (
        <p className="text-xs text-muted-foreground text-center font-body">
          Impossible de charger votre statut, réessayez.
        </p>
      )}
    </PageShell>
  );
};

export default MySubscription;
