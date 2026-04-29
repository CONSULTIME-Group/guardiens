import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageMeta from "@/components/PageMeta";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BadgeSceauLarge } from "@/components/badges/BadgeSceauLarge";
import FounderBadge from "@/components/badges/FounderBadge";
// Helmet removed — PageMeta handles all meta tags
import EntraideLibreBanner from "@/components/subscription/EntraideLibreBanner";
import PricingCardsCheckout from "@/components/subscription/PricingCardsCheckout";
import { safeUUID } from "@/lib/uuid";

import {
  Star, Home, Clock, Loader2, Check, Copy,
  Send, MessageSquare, Search as SearchIcon,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

import { LAUNCH_DATE, LAUNCH_START, GRACE_END, FOUNDER_START } from "@/lib/constants";

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

// ──── ADVANTAGES ────
const FOUNDER_ADVANTAGES = [
  "Postuler aux gardes",
  "Messagerie avec les propriétaires",
  "Apparaître dans la recherche",
  "Mode «Je suis disponible»",
  "Fiches races complètes",
  "Guides locaux détaillés",
  "Articles en accès complet",
  "Écussons et métriques de fiabilité",
];

const EXPIRED_HIGHLIGHTS = [
  { icon: Send, label: "Postuler aux gardes près de chez vous" },
  { icon: SearchIcon, label: "Apparaître dans la recherche des propriétaires" },
  { icon: MessageSquare, label: "Messagerie illimitée avec les propriétaires" },
];

// ──── GA4 TRACK ────
const trackEvent = (eventName: string, params?: Record<string, string>) => {
  try {
    if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
      (window as any).gtag("event", eventName, params ?? {});
    }
  } catch {
    // Silencieux
  }
};


// ──── REFERRAL SECTION ────
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

// ──── PRE-LAUNCH ADVANTAGES ────
const PRE_LAUNCH_ADVANTAGES: { label: string; href: string | null }[] = [
  { label: "Postuler aux gardes", href: "/search" },
  { label: "Messagerie avec les propriétaires", href: null },
  { label: "Apparaître dans la recherche", href: null },
  { label: "Mode «Je suis disponible»", href: "/dashboard" },
  { label: "Fiches races complètes", href: "/actualites" },
  { label: "Guides locaux détaillés", href: "/guides" },
  { label: "Articles en accès complet", href: "/actualites" },
  { label: "Écussons et métriques", href: null },
];

const FOUNDER_FAQ = [
  {
    q: "C’est vraiment gratuit jusqu’au 13 juin ?",
    a: "Oui. Aucune carte bancaire demandée avant le 13 juin. Après cette date, vous choisissez librement de souscrire — rien ne démarre automatiquement.",
  },
  {
    q: "Que se passe-t-il après le 13 juin ?",
    a: "Une seule formule : 6,99 €/mois sans engagement, avec 7 jours d’essai. Vous décidez librement au moment voulu.",
  },
  {
    q: "Qu’est-ce que le badge Fondateur ?",
    a: "Un écusson permanent visible sur votre profil public. Il distingue les membres qui ont rejoint Guardiens dès le début.",
  },
];

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

  // Countdown timer
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
    setCopyLabel("Lien copié ✓");
    trackEvent("referral_link_copied", { source: "pre_launch_page" });
    setTimeout(() => setCopyLabel("Copier mon lien"), 2500);
  };

  const loadData = useCallback(async () => {
    if (!user) { setView("never_subscribed"); return; }
    try {
      // Check welcome params
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

      // Referral URL
      const code = (p?.referral_code as string) ?? "";
      setReferralUrl(code ? `https://guardiens.fr/inscription?ref=${code}` : "https://guardiens.fr/inscription");

      // Member count
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      if (typeof count === "number") setMemberCount(count);

      // Determine role — use activeRole (UI choice)
      const isOwner = activeRole === "owner";

      // Pre-launch check — FIRST, before any other view determination
      const isPrelaunched = new Date() < LAUNCH_DATE;
      if (isPrelaunched && !isOwner) {
        setView("pre_launch");
        trackEvent("page_view_pre_launch");
        return;
      }

      // Post-launch view determination
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
    : sub?.plan === "yearly" ? "Accès 2026"
    : "Abonnement";
  const showReferral = effectiveRole !== "owner";

  // Founder countdown calculations (for founder_active view)
  const now = new Date();
  const totalMs = GRACE_END.getTime() - FOUNDER_START.getTime();
  const remainingMs = Math.max(0, GRACE_END.getTime() - now.getTime());
  const daysLeft = Math.ceil(remainingMs / 86400000);
  const progressPct = Math.min(100, Math.round(((totalMs - remainingMs) / totalMs) * 100));

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto animate-fade-in space-y-8">
      <PageMeta title="Mon abonnement | Guardiens" description="Gérez votre abonnement Guardiens." noindex />

      {/* ══ VUE — PRE_LAUNCH ══ */}
      {view === "pre_launch" && (
        <>
          <div className="max-w-2xl mx-auto w-full px-0 pb-12 space-y-5 bg-background">
            {/* Welcome message */}
            {isNewMember && (
              <div className="bg-primary/10 border border-primary/20 rounded-xl px-5 py-4 flex items-start gap-3" role="status" aria-live="polite">
                <span className="text-primary text-lg mt-0.5 flex-shrink-0" aria-hidden="true">{"✓"}</span>
                <div>
                  <p className="text-sm font-semibold text-primary font-body">Bienvenue chez Guardiens.</p>
                  <p className="text-sm text-foreground/70 font-body mt-0.5">Votre compte est actif. Toutes les fonctionnalités sont disponibles jusqu'au 13 mai.</p>
                </div>
              </div>
            )}

            {/* Main card */}
            <div className="bg-card border border-primary/20 rounded-2xl shadow-sm overflow-hidden">
              {/* Header */}
              <div className="px-6 sm:px-8 pt-7 pb-6 flex flex-col items-center text-center space-y-3 border-b border-border/50">
                <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-[11px] font-medium px-3 py-1.5 rounded-full font-body tracking-widest uppercase select-none">
                  Pré-lancement {"·"} Bêta
                </span>
                <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-foreground leading-tight">
                  Tout est offert jusqu'au 13 mai.
                </h1>
                <p className="text-base text-foreground/70 font-body max-w-sm leading-relaxed">
                  Guardiens est en version bêta. Toutes les fonctionnalités sont ouvertes — sans restriction.
                </p>
                {memberCount !== null && memberCount > 0 && memberCount < 200 && (
                  <p className="text-xs text-foreground/50 font-body" aria-live="polite">
                    Vous êtes parmi les {memberCount} premiers membres.
                  </p>
                )}
                {memberCount !== null && memberCount >= 200 && (
                  <p className="text-xs text-foreground/50 font-body" aria-live="polite">
                    {memberCount} membres ont déjà rejoint Guardiens.
                  </p>
                )}
              </div>

              {/* Timeline */}
              <div className="px-6 sm:px-8 py-5 border-b border-border/50">
                <div className="flex items-start justify-between gap-2 relative" role="list" aria-label="Calendrier du lancement">
                  <div className="absolute top-3 left-8 right-8 h-px bg-border" aria-hidden="true" />
                  {[
                    { label: "Maintenant", sub: "Accès complet", active: true, amber: false },
                    { label: "13 mai", sub: "Badge Fondateur", active: false, amber: true },
                    { label: "13 juin", sub: "Fin de grâce", active: false, amber: false },
                    { label: "Ensuite", sub: "6,99 €/mois · 7 jours d’essai", active: false, amber: false },
                  ].map(({ label, sub: subText, active, amber }) => (
                    <div key={label} role="listitem" className="flex flex-col items-center gap-1.5 z-10 flex-1">
                      <div className={[
                        "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                        active ? "bg-primary" : amber ? "bg-amber-100 border-2 border-amber-400" : "bg-muted border-2 border-border/60",
                      ].join(" ")}>
                        <div className={[
                          "w-2 h-2 rounded-full",
                          active ? "bg-primary-foreground" : amber ? "bg-amber-400" : "bg-border/60",
                        ].join(" ")} />
                      </div>
                      <p className={[
                        "text-[10px] font-medium font-body text-center leading-tight",
                        active ? "text-primary" : amber ? "text-amber-700" : "text-foreground/40",
                      ].join(" ")}>{label}</p>
                      <p className="text-[10px] font-body text-center leading-tight text-foreground/40">{subText}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Countdown */}
              <div className="px-6 sm:px-8 py-5 border-b border-border/50 space-y-3">
                <div className="flex items-baseline justify-between gap-4 flex-wrap">
                  <p className="text-sm font-medium text-foreground/80 font-body">Il reste encore</p>
                  <p className="font-heading text-3xl font-bold text-amber-600 whitespace-nowrap tabular-nums" aria-live="polite" aria-atomic="true">
                    {countdown.daysLeft}
                    <span className="text-base font-body font-normal text-foreground/60 ml-1.5">
                      jour{countdown.daysLeft > 1 ? "s" : ""} pour rejoindre les Fondateurs
                    </span>
                  </p>
                </div>
                <div className="w-full bg-amber-100 rounded-full h-2 overflow-hidden" role="progressbar" aria-valuenow={countdown.progressPct} aria-valuemin={0} aria-valuemax={100} aria-label="Progression vers le lancement">
                  <div className="bg-amber-400 h-2 rounded-full transition-all duration-700" ref={(el) => { if (el) el.style.width = `${countdown.progressPct}%`; }} />
                </div>
                <p className="text-xs text-foreground/50 font-body">Lancement officiel le 13 mai 2026</p>
              </div>

              {/* Profile nudge */}
              {profileCompletion < 60 && (
                <div className="px-6 sm:px-8 py-4 border-b border-border/50 bg-muted/30 flex items-center justify-between gap-4 flex-wrap">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground font-body">Complétez votre profil pour être visible le 13 mai.</p>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-border rounded-full h-1.5 overflow-hidden flex-shrink-0">
                        <div className="bg-primary h-1.5 rounded-full transition-all" ref={(el) => { if (el) el.style.width = `${profileCompletion}%`; }} />
                      </div>
                      <span className="text-xs text-foreground/50 font-body whitespace-nowrap">{profileCompletion} % complété</span>
                    </div>
                  </div>
                  <a
                    href={effectiveRole === "owner" ? "/owner-profile" : "/profile"}
                    className="text-sm font-medium text-primary font-body hover:underline whitespace-nowrap flex-shrink-0"
                    onClick={() => trackEvent("cta_complete_profile", { source: "pre_launch_nudge" })}
                  >
                    Compléter {"→"}
                  </a>
                </div>
              )}

              {/* Advantages */}
              <div className="px-6 sm:px-8 py-6 border-b border-border/50 space-y-4">
                <p className="text-xs uppercase tracking-widest text-foreground/50 font-body">Tout ce que vous débloquez</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                  {PRE_LAUNCH_ADVANTAGES.map(({ label, href }) => (
                    <div key={label} className="flex items-center gap-2.5 min-w-0 group">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
                      {href ? (
                        <a
                          href={href}
                          className="text-sm text-foreground/80 font-body leading-snug group-hover:text-primary group-hover:underline transition-colors"
                          onClick={() => trackEvent("advantage_link_click", { label })}
                        >
                          {label}
                        </a>
                      ) : (
                        <span className="text-sm text-foreground/80 font-body leading-snug">{label}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Founder block */}
              {countdown.daysLeft > 0 && (
                <div className="px-6 sm:px-8 py-6 border-b border-border/50 bg-amber-50/60">
                  <div className="flex items-start gap-3 mb-3">
                    <FounderBadge size="lg" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-amber-800 font-body">Vous devenez Fondateur le 13 mai.</p>
                      <p className="text-sm text-amber-700 font-body leading-relaxed">
                        Chaque membre inscrit avant le 13 mai bénéficie d'un mois supplémentaire offert jusqu'au 13 juin, et reçoit le badge Fondateur à vie, visible sur son profil public.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 border-t border-amber-200/70 pt-4">
                    {FOUNDER_FAQ.map(({ q, a }) => (
                      <details key={q} className="group cursor-pointer">
                        <summary className="text-xs font-medium text-amber-700 font-body list-none flex items-center gap-1.5 hover:text-amber-900 transition-colors select-none">
                          <ChevronRight className="w-3 h-3 flex-shrink-0 transition-transform duration-200 group-open:rotate-90" aria-hidden="true" />
                          {q}
                        </summary>
                        <p className="mt-1.5 pl-[18px] text-xs text-amber-700/80 font-body leading-relaxed">{a}</p>
                      </details>
                    ))}
                  </div>
                </div>
              )}

              {/* Main CTA */}
              <div className="px-6 sm:px-8 py-6 flex flex-col items-center gap-2">
                <a
                  href="/search"
                  className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-body font-medium text-sm px-6 py-3.5 rounded-xl hover:bg-primary/90 transition-colors min-h-[44px]"
                  onClick={() => trackEvent("cta_prelaunched_explore", { source: "pre_launch_main_cta" })}
                >
                  <SearchIcon className="w-4 h-4" aria-hidden="true" />
                  Explorer les annonces
                </a>
                <p className="text-xs text-foreground/40 font-body text-center">Revenez ici le 13 mai pour choisir votre formule.</p>
              </div>
            </div>

            {/* Pricing preview */}
            <div className="bg-card border border-border/60 rounded-xl p-5 space-y-3">
              <p className="text-xs uppercase tracking-widest text-foreground/50 font-body">Après le 13 juin — la formule</p>
              <div className="flex flex-col items-center text-center space-y-1">
                <p className="font-heading text-3xl font-bold text-primary">6,99 €<span className="text-sm font-normal text-foreground/50">/mois</span></p>
                <p className="text-xs text-foreground/60 font-body">Sans engagement · 7 jours d’essai</p>
              </div>
              <p className="text-xs text-foreground/40 font-body text-center">Aucun prélèvement automatique avant votre choix.</p>
            </div>

            {/* Entraide banner */}
            <EntraideLibreBanner />

            {/* Referral section */}
            <div className="bg-muted/50 rounded-xl px-5 sm:px-6 py-5 space-y-4">
              <div className="space-y-1">
                <p className="font-heading text-base font-semibold text-foreground">Invitez quelqu'un du coin.</p>
                <p className="text-sm text-foreground/70 font-body leading-relaxed">
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
                  className="flex-1 text-sm bg-background border border-border rounded-lg px-3 py-2.5 text-foreground/70 font-body truncate cursor-default focus:outline-none focus:ring-1 focus:ring-primary/30 min-w-0"
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
              <p className="text-xs text-foreground/40 font-body italic">
                Le mois offert est crédité dès que votre filleul active son compte.
              </p>
            </div>
          </div>
        </>
      )}

      {/* ══ VUE — PROPRIÉTAIRE ══ */}
      {view === "owner" && (
        <>
          <div className="bg-card border border-border rounded-xl p-8 max-w-2xl mx-auto space-y-4">
            <div className="flex items-center gap-3">
              <Home className="h-7 w-7 text-primary" />
              <h2 className="text-2xl font-heading font-semibold">Guardiens est offert pour les propriétaires.</h2>
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
            <div className="flex flex-col items-center text-center space-y-3">
              <BadgeSceauLarge id="fondateur" size={52} />
              <h2 className="font-heading text-2xl font-semibold text-foreground">Vous êtes Fondateur Guardiens.</h2>
              <p className="text-base text-foreground/70 font-body">Votre accès complet est offert jusqu'au 13 juin 2026.</p>
            </div>

            <div className="bg-amber-50 rounded-xl py-4 px-6 space-y-2">
              <p className="text-sm font-medium text-amber-800 font-body">Il reste {daysLeft} jour{daysLeft > 1 ? "s" : ""} sur votre période fondateur</p>
              <div className="w-full bg-amber-200 rounded-full h-2 overflow-hidden">
                <div className="bg-amber-400 h-2 rounded-full transition-all duration-500" ref={(el) => { if (el) el.style.width = `${progressPct}%`; }} />
              </div>
              <p className="text-xs text-amber-600 font-body">Accès offert jusqu'au 13 juin 2026</p>
            </div>

            <div className="bg-muted/30 rounded-xl p-5">
              <p className="text-xs uppercase tracking-widest text-foreground/50 font-body mb-4">Ce que vous débloquez</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                {FOUNDER_ADVANTAGES.map((a) => (
                  <div key={a} className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span className="text-sm text-foreground/80 font-body">{a}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 pt-2">
              <Button variant="outline" className="border-primary text-primary hover:bg-primary/5 font-body" onClick={() => setShowSupportDialog(true)}>
                Soutenir Guardiens maintenant
              </Button>
              <p className="text-xs text-foreground/50 italic text-center max-w-xs font-body">
                Votre abonnement démarrera le 14 juin — vous ne perdrez pas un seul jour.
              </p>
            </div>

            <p className="text-xs text-foreground/40 italic text-center font-body">
              Votre badge Fondateur reste à vie, quelle que soit votre situation future.
            </p>
          </div>

          {showReferral && <ReferralSection referralCode={profile?.referral_code} userId={user!.id} />}

          <Dialog open={showSupportDialog} onOpenChange={setShowSupportDialog}>
            <DialogContent className="max-w-3xl w-full p-6 sm:p-8">
              <DialogHeader>
                <DialogTitle className="font-heading text-xl">Choisissez votre formule</DialogTitle>
              </DialogHeader>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 font-body mb-4">
                En choisissant maintenant, votre abonnement démarrera le 14 juin 2026. Votre accès fondateur reste intact jusqu'à cette date.
              </div>
              <PricingCardsCheckout />
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ══ VUE — FONDATEUR POST-GRÂCE ══ */}
      {view === "founder_post_grace" && (
        <div className="max-w-2xl mx-auto w-full px-4 space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <BadgeSceauLarge id="fondateur" size={52} />
            <h2 className="font-heading text-2xl font-semibold text-foreground">Votre période fondateur est terminée.</h2>
            <p className="text-sm text-foreground/70 font-body">Merci d'avoir été là dès le premier jour. Choisissez votre formule.</p>
          </div>
          <EntraideLibreBanner />
          <PricingCardsCheckout />
          <p className="text-xs text-amber-700 italic text-center mt-2 font-body">Votre badge Fondateur reste permanent à vie.</p>
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

          {/* Trial highlight */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl px-5 py-4 flex items-center gap-3">
            <Star className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground font-body">7 jours d'essai offerts sur le mensuel</p>
              <p className="text-xs text-foreground/60 font-body">Testez tout sans engagement. Annulable en un clic.</p>
            </div>
          </div>

          {/* Key benefits recap */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {EXPIRED_HIGHLIGHTS.map(h => (
              <div key={h.label} className="flex items-center gap-2.5 bg-card border border-border/40 rounded-xl px-4 py-3">
                <h.icon className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm text-foreground/70 font-body">{h.label}</span>
              </div>
            ))}
          </div>

          <EntraideLibreBanner />
          <PricingCardsCheckout />

          {isFounder && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-foreground/70 text-center flex items-center justify-center gap-2 font-body">
              <FounderBadge size="lg" /> Badge Fondateur permanent
            </div>
          )}

          {showReferral && <ReferralSection referralCode={profile?.referral_code} userId={user!.id} />}
        </>
      )}

      {/* ══ VUE — ABONNÉ ACTIF ══ */}
      {view === "subscribed" && (
        <>
          <div className="bg-card border border-border rounded-xl p-6 space-y-5 max-w-2xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Check className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-heading text-xl font-semibold">Abonnement actif</h2>
                <p className="text-sm text-foreground/60 font-body">{planLabel}</p>
              </div>
            </div>

            <div className="bg-muted/30 rounded-xl p-4 space-y-2">
              {sub?.plan === "monthly" && (
                <div className="flex justify-between text-sm font-body">
                  <span className="text-foreground/60">Prochain renouvellement</span>
                  <span className="font-medium text-foreground">{renewalFormatted}</span>
                </div>
              )}
              {sub?.plan === "oneshot" && (
                <div className="flex justify-between text-sm font-body">
                  <span className="text-foreground/60">Accès jusqu'au</span>
                  <span className="font-medium text-foreground">{renewalFormatted}</span>
                </div>
              )}
              {sub?.plan === "yearly" && (
                <div className="flex justify-between text-sm font-body">
                  <span className="text-foreground/60">Accès jusqu'au</span>
                  <span className="font-medium text-foreground">31 décembre 2026</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-body">
                <span className="text-foreground/60">Tarif</span>
                <span className="font-medium text-foreground">
                  {sub?.plan === "monthly" ? "6,99 €/mois" : "Formule 2026"}
                </span>
              </div>
            </div>

            <Button variant="outline" className="w-full font-body" onClick={openPortal} disabled={portalLoading}>
              {portalLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Gérer mon abonnement
            </Button>

            {sub?.plan === "monthly" && (
              <button
                onClick={openPortal}
                className="w-full text-xs text-destructive/60 hover:text-destructive transition-colors text-center font-body py-1"
              >
                Annuler l'abonnement
              </button>
            )}
          </div>

          {isFounder && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-foreground/70 text-center flex items-center justify-center gap-2 font-body">
              <FounderBadge size="lg" /> Badge Fondateur permanent
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
            <p className="text-sm text-foreground/70 font-body">Votre profil n'est plus visible et vos candidatures sont suspendues.</p>
          </div>

          {/* What you're missing */}
          <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-5 space-y-3 max-w-md mx-auto">
            <p className="text-xs uppercase tracking-widest text-destructive/60 font-body font-medium">Ce que vous perdez sans abonnement</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 text-sm text-foreground/70 font-body">
                <SearchIcon className="h-4 w-4 text-destructive/50 shrink-0" />
                Invisible dans les résultats de recherche
              </div>
              <div className="flex items-center gap-2.5 text-sm text-foreground/70 font-body">
                <Send className="h-4 w-4 text-destructive/50 shrink-0" />
                Plus de candidatures aux gardes
              </div>
              <div className="flex items-center gap-2.5 text-sm text-foreground/70 font-body">
                <MessageSquare className="h-4 w-4 text-destructive/50 shrink-0" />
                Messagerie désactivée
              </div>
            </div>
          </div>

          <EntraideLibreBanner />
          <PricingCardsCheckout />

          {isFounder && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-foreground/70 text-center flex items-center justify-center gap-2 font-body">
              <FounderBadge size="lg" /> Badge Fondateur permanent à vie
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
