import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageMeta from "@/components/PageMeta";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BadgeSceauLarge } from "@/components/badges/BadgeSceauLarge";
import { Helmet } from "react-helmet-async";

import {
  Star, Home, Clock, Loader2, Check, Copy,
  Send, MessageSquare, Search as SearchIcon,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

const LAUNCH_DATE = new Date("2026-05-14T00:00:00Z");
const LAUNCH_START = new Date("2026-04-07T00:00:00Z");
const GRACE_END = new Date("2026-06-14T00:00:00Z");
const FOUNDER_START = new Date("2026-05-13T00:00:00Z");

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
  "Messagerie avec les propri\u00e9taires",
  "Appara\u00eetre dans la recherche",
  "Mode \u00abJe suis disponible\u00bb",
  "Fiches races compl\u00e8tes",
  "Guides locaux d\u00e9taill\u00e9s",
  "Articles en acc\u00e8s complet",
  "Gardes longue dur\u00e9e (+ frais de service)",
  "\u00c9cussons et m\u00e9triques de fiabilit\u00e9",
];

const EXPIRED_HIGHLIGHTS = [
  { icon: Send, label: "Postuler aux gardes pr\u00e8s de chez vous" },
  { icon: SearchIcon, label: "Appara\u00eetre dans la recherche des propri\u00e9taires" },
  { icon: MessageSquare, label: "Messagerie illimit\u00e9e avec les propri\u00e9taires" },
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
      toast.error("Une erreur est survenue. Veuillez r\u00e9essayer.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="bg-card border border-border rounded-xl p-5 flex flex-col">
        <p className="font-heading text-lg font-semibold mb-2">Un mois</p>
        <p className="mb-1"><span className="text-3xl font-heading font-bold">12\u20ac</span><span className="text-sm text-muted-foreground font-body">/mois</span></p>
        <p className="text-xs text-muted-foreground font-body mb-4">Paiement imm\u00e9diat. Sans renouvellement.</p>
        <ul className="text-sm font-body space-y-2 mb-6 flex-1">
          <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Acc\u00e8s complet 30 jours</li>
          <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Aucun engagement</li>
          <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Aucune CB m\u00e9moris\u00e9e</li>
        </ul>
        <Button variant="outline" className="w-full font-body" onClick={() => handleCheckout("oneshot")} disabled={loading !== null}>
          {loading === "oneshot" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Acc\u00e9der un mois"}
        </Button>
      </div>

      <div className="relative flex flex-col">
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3 py-0.5 rounded-full font-medium font-body z-10">Le plus choisi</span>
        <div className="bg-card border-2 border-primary rounded-xl p-5 flex flex-col flex-1">
          <p className="font-heading text-lg font-semibold mb-2">Mois apr\u00e8s mois</p>
          <p className="mb-1"><span className="text-3xl font-heading font-bold">9\u20ac</span><span className="text-sm text-muted-foreground font-body">/mois</span></p>
          <p className="text-xs text-muted-foreground font-body mb-4">7 jours d'essai. Annulable \u00e0 tout moment.</p>
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

      <div className="bg-card border border-border rounded-xl p-5 flex flex-col">
        <span className="inline-flex self-start bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium font-body mb-2">Offre 2026</span>
        <p className="font-heading text-lg font-semibold mb-2">Jusqu'\u00e0 la fin 2026</p>
        <p className="mb-1"><span className="text-3xl font-heading font-bold">{prorataPrice}\u20ac</span><span className="text-sm text-muted-foreground font-body"> pour {months} mois</span></p>
        <p className="text-xs text-green-600 font-medium font-body mb-4">\u00c9conomie de {savings}\u20ac</p>
        <ul className="text-sm font-body space-y-2 mb-6 flex-1">
          <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Acc\u00e8s au 31 d\u00e9cembre</li>
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
    toast.success("Lien copi\u00e9 !");
  };

  if (!code) return null;

  return (
    <div className="bg-muted rounded-xl px-6 py-5">
      <h3 className="font-heading text-lg font-semibold mb-1">Parrainez un proche.</h3>
      <p className="text-sm text-foreground/70 font-body mb-4">
        Si quelqu'un s'inscrit avec votre lien et active son compte,
        vous recevez tous les deux un mois d'acc\u00e8s offert.
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
        Le mois offert est cr\u00e9dit\u00e9 d\u00e8s que votre filleul active son compte.
      </p>
    </div>
  );
}

// ──── PRE-LAUNCH ADVANTAGES ────
const PRE_LAUNCH_ADVANTAGES: { label: string; href: string | null }[] = [
  { label: "Postuler aux gardes", href: "/recherche" },
  { label: "Messagerie avec les propri\u00e9taires", href: null },
  { label: "Appara\u00eetre dans la recherche", href: null },
  { label: "Mode \u00abJe suis disponible\u00bb", href: "/dashboard" },
  { label: "Fiches races compl\u00e8tes", href: "/actualites" },
  { label: "Guides locaux d\u00e9taill\u00e9s", href: "/guides" },
  { label: "Articles en acc\u00e8s complet", href: "/actualites" },
  { label: "Gardes longue dur\u00e9e", href: null },
  { label: "\u00c9cussons et m\u00e9triques", href: null },
];

const FOUNDER_FAQ = [
  {
    q: "C\u2019est vraiment gratuit jusqu\u2019au 13 juin\u00a0?",
    a: "Oui. Aucune carte bancaire demand\u00e9e avant le 13 juin. Apr\u00e8s cette date, vous choisissez librement une formule \u2014 rien ne d\u00e9marre automatiquement.",
  },
  {
    q: "Que se passe-t-il apr\u00e8s le 13 juin\u00a0?",
    a: "Trois options : 12\u20ac pour un mois, 9\u20ac/mois sans engagement, ou un tarif annuel r\u00e9duit. Vous d\u00e9cidez au moment voulu.",
  },
  {
    q: "Qu\u2019est-ce que le badge Fondateur\u00a0?",
    a: "Un \u00e9cusson permanent visible sur votre profil public. Il distingue les membres qui ont rejoint Guardiens d\u00e8s le d\u00e9but.",
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
    setCopyLabel("Lien copi\u00e9 \u2713");
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

      if (profileRes.error) {
        setLoadError(true);
        setView("never_subscribed");
        return;
      }

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

      // Determine role
      const isOwner =
        effectiveRole === "owner" ||
        (p?.role as string) === "owner";

      // Pre-launch check
      const isPrelaunched = new Date() < LAUNCH_DATE;
      if (isPrelaunched && !isOwner) {
        setView("pre_launch");
        trackEvent("page_view_pre_launch");
        return;
      }

      // Post-launch view determination
      const isFounder = p.is_founder === true;
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
  }, [user, effectiveRole]);

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
        monthly: "Votre essai de 7 jours d\u00e9marre \u2014 bienvenue chez Guardiens.",
        one_shot: "Votre acc\u00e8s d'un mois est actif. Bonne garde !",
        prorata: "Votre acc\u00e8s 2026 est activ\u00e9. Merci pour votre soutien.",
      };
      toast.success(messages[formula || ""] || "Votre abonnement est activ\u00e9 !");
      setTimeout(() => loadData(), 2000);
      window.history.replaceState({}, "", "/mon-abonnement");
    } else if (searchParams.get("cancelled") === "true") {
      toast("Paiement annul\u00e9 \u2014 vous pouvez choisir une formule \u00e0 tout moment.");
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
        <PageMeta title="Mon abonnement | Guardiens" description="G\u00e9rez votre abonnement Guardiens." noindex />
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
  const renewalFormatted = sub?.expires_at ? format(new Date(sub.expires_at), "d MMMM yyyy", { locale: fr }) : "\u2014";
  const planLabel = sub?.plan === "monthly" ? "Formule mensuelle"
    : sub?.plan === "oneshot" ? "Acc\u00e8s un mois"
    : sub?.plan === "yearly" ? "Acc\u00e8s 2026"
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
      <PageMeta title="Mon abonnement | Guardiens" description="G\u00e9rez votre abonnement Guardiens." noindex />

      {/* ══ VUE — PRE_LAUNCH ══ */}
      {view === "pre_launch" && (
        <>
          <Helmet>
            <title>Guardiens {"\u00B7"} Acc\u00e8s fondateur \u2014 b\u00eata</title>
            <meta name="description" content="Guardiens est en pr\u00e9-lancement. Toutes les fonctionnalit\u00e9s sont gratuites jusqu'au 13 mai 2026. Rejoignez les Fondateurs." />
            <meta property="og:title" content="Guardiens \u00B7 Acc\u00e8s fondateur b\u00eata" />
            <meta property="og:description" content="Acc\u00e8s complet gratuit jusqu'au 13 mai. Badge Fondateur \u00e0 vie pour les premiers membres." />
            <meta property="og:url" content="https://guardiens.fr/mon-abonnement" />
            <meta property="og:type" content="website" />
            <meta name="robots" content="noindex, follow" />
          </Helmet>

          <div className="max-w-2xl mx-auto w-full px-0 pb-12 space-y-5 bg-background">
            {/* Welcome message */}
            {isNewMember && (
              <div className="bg-primary/10 border border-primary/20 rounded-xl px-5 py-4 flex items-start gap-3" role="status" aria-live="polite">
                <span className="text-primary text-lg mt-0.5 flex-shrink-0" aria-hidden="true">{"\u2713"}</span>
                <div>
                  <p className="text-sm font-semibold text-primary font-body">Bienvenue chez Guardiens.</p>
                  <p className="text-sm text-foreground/70 font-body mt-0.5">Votre compte est actif. Toutes les fonctionnalit\u00e9s sont disponibles jusqu'au 13 mai.</p>
                </div>
              </div>
            )}

            {/* Main card */}
            <div className="bg-card border border-primary/20 rounded-2xl shadow-sm overflow-hidden">
              {/* Header */}
              <div className="px-6 sm:px-8 pt-7 pb-6 flex flex-col items-center text-center space-y-3 border-b border-border/50">
                <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-[11px] font-medium px-3 py-1.5 rounded-full font-body tracking-widest uppercase select-none">
                  Pr\u00e9-lancement {"\u00B7"} B\u00eata
                </span>
                <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-foreground leading-tight">
                  Tout est gratuit jusqu'au 13 mai.
                </h1>
                <p className="text-base text-foreground/70 font-body max-w-sm leading-relaxed">
                  Guardiens est en version b\u00eata. Toutes les fonctionnalit\u00e9s sont ouvertes \u2014 sans restriction.
                </p>
                {memberCount !== null && memberCount > 0 && memberCount < 200 && (
                  <p className="text-xs text-foreground/50 font-body" aria-live="polite">
                    Vous \u00eates parmi les {memberCount} premiers membres.
                  </p>
                )}
                {memberCount !== null && memberCount >= 200 && (
                  <p className="text-xs text-foreground/50 font-body" aria-live="polite">
                    {memberCount} membres ont d\u00e9j\u00e0 rejoint Guardiens.
                  </p>
                )}
              </div>

              {/* Timeline */}
              <div className="px-6 sm:px-8 py-5 border-b border-border/50">
                <div className="flex items-start justify-between gap-2 relative" role="list" aria-label="Calendrier du lancement">
                  <div className="absolute top-3 left-8 right-8 h-px bg-border" aria-hidden="true" />
                  {[
                    { label: "Maintenant", sub: "Acc\u00e8s complet", active: true, amber: false },
                    { label: "13 mai", sub: "Badge Fondateur", active: false, amber: true },
                    { label: "13 juin", sub: "Fin de gr\u00e2ce", active: false, amber: false },
                    { label: "Ensuite", sub: "9\u20ac/mois", active: false, amber: false },
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
                    <p className="text-sm font-medium text-foreground font-body">Compl\u00e9tez votre profil pour \u00eatre visible le 13 mai.</p>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-border rounded-full h-1.5 overflow-hidden flex-shrink-0">
                        <div className="bg-primary h-1.5 rounded-full transition-all" ref={(el) => { if (el) el.style.width = `${profileCompletion}%`; }} />
                      </div>
                      <span className="text-xs text-foreground/50 font-body whitespace-nowrap">{profileCompletion}\u00a0% compl\u00e9t\u00e9</span>
                    </div>
                  </div>
                  <a
                    href="/mon-profil"
                    className="text-sm font-medium text-primary font-body hover:underline whitespace-nowrap flex-shrink-0"
                    onClick={() => trackEvent("cta_complete_profile", { source: "pre_launch_nudge" })}
                  >
                    Compl\u00e9ter {"\u2192"}
                  </a>
                </div>
              )}

              {/* Advantages */}
              <div className="px-6 sm:px-8 py-6 border-b border-border/50 space-y-4">
                <p className="text-xs uppercase tracking-widest text-foreground/50 font-body">Tout ce que vous d\u00e9bloquez</p>
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
                  <div className="space-y-2.5">
                    <p className="text-sm font-semibold text-amber-800 font-body">Vous devenez Fondateur le 13 mai.</p>
                    <p className="text-sm text-amber-700 font-body leading-relaxed">
                      Chaque membre inscrit avant le 13 mai b\u00e9n\u00e9ficie d'un mois suppl\u00e9mentaire gratuit jusqu'au 13 juin, et re\u00e7oit le badge Fondateur \u00e0 vie, visible sur son profil public.
                    </p>
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
                </div>
              )}

              {/* Main CTA */}
              <div className="px-6 sm:px-8 py-6 flex flex-col items-center gap-2">
                <a
                  href="/recherche"
                  className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-body font-medium text-sm px-6 py-3.5 rounded-xl hover:bg-primary/90 transition-colors min-h-[44px]"
                  onClick={() => trackEvent("cta_prelaunched_explore", { source: "pre_launch_main_cta" })}
                >
                  <SearchIcon className="w-4 h-4" aria-hidden="true" />
                  Explorer les annonces
                </a>
                <p className="text-xs text-foreground/40 font-body text-center">Revenez ici le 13 mai pour choisir votre formule.</p>
              </div>
            </div>

            {/* Referral section */}
            <div className="bg-muted/50 rounded-xl px-5 sm:px-6 py-5 space-y-4">
              <div className="space-y-1">
                <p className="font-heading text-base font-semibold text-foreground">Invitez quelqu'un du coin.</p>
                <p className="text-sm text-foreground/70 font-body leading-relaxed">
                  Si un proche s'inscrit avec votre lien et active son compte, vous recevez tous les deux un mois d'acc\u00e8s offert.
                </p>
              </div>
              <div className="flex items-stretch gap-2">
                <input
                  readOnly
                  value={referralUrl || "Chargement\u2026"}
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
                  disabled={!referralUrl || referralUrl === "Chargement\u2026"}
                  className="shrink-0 inline-flex items-center gap-1.5 font-body text-sm font-medium px-4 py-2.5 rounded-lg border border-primary text-primary hover:bg-primary/5 transition-colors disabled:opacity-40 disabled:pointer-events-none min-h-[44px] whitespace-nowrap"
                >
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  {copyLabel}
                </button>
              </div>
              <p className="text-xs text-foreground/40 font-body italic">
                Le mois offert est cr\u00e9dit\u00e9 d\u00e8s que votre filleul active son compte.
              </p>
            </div>
          </div>
        </>
      )}

      {/* ══ VUE — PROPRI\u00c9TAIRE ══ */}
      {view === "owner" && (
        <>
          <div className="bg-card border border-border rounded-xl p-8 max-w-2xl mx-auto space-y-4">
            <div className="flex items-center gap-3">
              <Home className="h-7 w-7 text-primary" />
              <h2 className="text-2xl font-heading font-semibold">Guardiens est gratuit pour les propri\u00e9taires.</h2>
            </div>
            <p className="text-sm text-foreground/70 font-body">
              Publiez vos annonces, recevez des candidatures et \u00e9changez avec les gardiens \u2014 sans frais, pour toujours.
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
              <h2 className="font-heading text-2xl font-semibold text-foreground">Vous \u00eates Fondateur Guardiens.</h2>
              <p className="text-base text-foreground/70 font-body">Votre acc\u00e8s complet est gratuit jusqu'au 13 juin 2026.</p>
            </div>

            <div className="bg-amber-50 rounded-xl py-4 px-6 space-y-2">
              <p className="text-sm font-medium text-amber-800 font-body">Il reste {daysLeft} jour{daysLeft > 1 ? "s" : ""} sur votre p\u00e9riode fondateur</p>
              <div className="w-full bg-amber-200 rounded-full h-2 overflow-hidden">
                <div className="bg-amber-400 h-2 rounded-full transition-all duration-500" ref={(el) => { if (el) el.style.width = `${progressPct}%`; }} />
              </div>
              <p className="text-xs text-amber-600 font-body">Acc\u00e8s gratuit jusqu'au 13 juin 2026</p>
            </div>

            <div className="bg-muted/30 rounded-xl p-5">
              <p className="text-xs uppercase tracking-widest text-foreground/50 font-body mb-4">Ce que vous d\u00e9bloquez</p>
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
                Votre abonnement d\u00e9marrera le 14 juin \u2014 vous ne perdrez pas un seul jour.
              </p>
            </div>

            <p className="text-xs text-foreground/40 italic text-center font-body">
              Votre badge Fondateur reste \u00e0 vie, quelle que soit votre situation future.
            </p>
          </div>

          {showReferral && <ReferralSection referralCode={profile?.referral_code} userId={user!.id} />}

          <Dialog open={showSupportDialog} onOpenChange={setShowSupportDialog}>
            <DialogContent className="max-w-3xl w-full p-6 sm:p-8">
              <DialogHeader>
                <DialogTitle className="font-heading text-xl">Choisissez votre formule</DialogTitle>
              </DialogHeader>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 font-body mb-4">
                En choisissant maintenant, votre abonnement d\u00e9marrera le 14 juin 2026. Votre acc\u00e8s fondateur reste intact jusqu'\u00e0 cette date.
              </div>
              <PricingCardsNew />
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ══ VUE — FONDATEUR POST-GR\u00c2CE ══ */}
      {view === "founder_post_grace" && (
        <div className="max-w-2xl mx-auto w-full px-4 space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <BadgeSceauLarge id="fondateur" size={52} />
            <h2 className="font-heading text-2xl font-semibold text-foreground">Votre p\u00e9riode fondateur est termin\u00e9e.</h2>
            <p className="text-sm text-foreground/70 font-body">Merci d'avoir \u00e9t\u00e9 l\u00e0 d\u00e8s le premier jour. Choisissez votre formule.</p>
          </div>
          <PricingCardsNew />
          <p className="text-xs text-amber-700 italic text-center mt-2 font-body">Votre badge Fondateur reste permanent \u00e0 vie.</p>
          {showReferral && <ReferralSection referralCode={profile?.referral_code} userId={user!.id} />}
        </div>
      )}

      {/* ══ VUE — NON ABONN\u00c9 ══ */}
      {view === "never_subscribed" && (
        <>
          <div className="space-y-2 mb-2">
            <p className="text-xs uppercase tracking-widest text-primary/60 font-body">Votre abonnement</p>
            <h2 className="text-2xl font-heading font-semibold">Acc\u00e9dez \u00e0 toutes les gardes.</h2>
            <p className="text-sm text-foreground/70 font-body">Choisissez ce qui vous convient.</p>
          </div>
          <PricingCardsNew />
          {showReferral && <ReferralSection referralCode={profile?.referral_code} userId={user!.id} />}
        </>
      )}

      {/* ══ VUE — ABONN\u00c9 ACTIF ══ */}
      {view === "subscribed" && (
        <>
          <div className="bg-card border border-border rounded-xl p-6 space-y-4 max-w-2xl mx-auto">
            <h2 className="font-heading text-2xl font-semibold">Abonnement actif.</h2>
            <p className="text-sm text-foreground/70 font-body">Formule : <span className="font-medium text-foreground">{planLabel}</span></p>
            {sub?.plan === "monthly" && (
              <p className="text-sm text-foreground/70 font-body">Prochain renouvellement le <span className="font-medium text-foreground">{renewalFormatted}</span></p>
            )}
            {sub?.plan === "oneshot" && (
              <p className="text-sm text-foreground/70 font-body">Acc\u00e8s jusqu'au <span className="font-medium text-foreground">{renewalFormatted}</span></p>
            )}
            {sub?.plan === "yearly" && (
              <p className="text-sm text-foreground/70 font-body">Acc\u00e8s jusqu'au <span className="font-medium text-foreground">31 d\u00e9cembre 2026</span></p>
            )}
            <Button variant="outline" className="w-full font-body" onClick={openPortal} disabled={portalLoading}>
              {portalLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              G\u00e9rer mon abonnement
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

      {/* ══ VUE — EXPIR\u00c9 ══ */}
      {view === "expired" && (
        <>
          <div className="text-center space-y-3 mb-4">
            <Clock className="h-10 w-10 text-muted-foreground mx-auto" />
            <h2 className="text-2xl font-heading font-semibold">Votre acc\u00e8s est termin\u00e9.</h2>
            <p className="text-sm text-foreground/70 font-body">Reprenez l\u00e0 o\u00f9 vous en \u00e9tiez.</p>
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
              Votre badge Fondateur reste permanent \u00e0 vie.
            </div>
          )}
          {showReferral && <ReferralSection referralCode={profile?.referral_code} userId={user!.id} />}
        </>
      )}

      {loadError && (
        <p className="text-xs text-foreground/40 text-center mt-4 font-body">
          Impossible de charger votre statut \u2014 r\u00e9essayez.
        </p>
      )}
    </div>
  );
};

export default MySubscription;
