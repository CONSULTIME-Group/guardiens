import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import { Loader2 } from "lucide-react";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import PublicHeader from "@/components/layout/PublicHeader";
import FreePeriodBanner from "@/components/marketing/FreePeriodBanner";
import PublicFooter from "@/components/layout/PublicFooter";
import FreeAccountSection from "@/components/subscription/FreeAccountSection";
import SecurityTrustSection from "@/components/subscription/SecurityTrustSection";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LAUNCH_DATE, isBeforeLaunch, isInGracePeriod } from "@/lib/constants";
import {
  SITTER_PRICE,
  SITTER_PRICE_START,
  SITTER_PRICE_NUMERIC,
  SITTER_PRICE_CURRENCY,
  SITTER_PRICE_START_ISO,
  SITTER_PRICE_ANNUAL_NUMERIC,
  SITTER_PRICE_ANNUAL_DISCOUNT_PCT,
  SITTER_PRICE_ONESHOT_NUMERIC,
} from "@/lib/pricing";

// Économie annuelle réelle, calculée pour rester cohérente avec les constantes prix.
const ANNUAL_SAVINGS_EUR = (
  SITTER_PRICE_NUMERIC * 12 - SITTER_PRICE_ANNUAL_NUMERIC
).toFixed(2).replace(".", ",");
const ANNUAL_MONTHLY_EQUIV = (
  SITTER_PRICE_ANNUAL_NUMERIC / 12
).toFixed(2).replace(".", ",");

const ownerFeatures = [
 "Publiez une annonce en 5 minutes",
 "Recevez des candidatures de gardiens dont l'identité est vérifiée",
 "Échangez avec eux avant de choisir",
 "Vos animaux restent dans leur maison, leurs habitudes, leurs repères",
 "Laissez un avis après chaque garde",
];

const sitterFeatures = [
 "Postulez aux gardes près de chez vous",
 "Accédez aux annonces complètes (animaux, maison, dates, attentes)",
 "Messagerie directe avec les propriétaires",
 "Profil de confiance avec avis croisés et écussons",
 "Mode « Je suis disponible » pour être trouvé sans chercher",
 "Guides locaux et fiches races complètes",
];

// Comparatif "vs autres plateformes" supprimé (mémoire core : never mention competitors).
// Remplacé par une grille "ce qu'on facture / ce qu'on ne facture pas" Guardiens-only.
const promiseRows: Array<{ label: string; value: string; positive: boolean }> = [
 { label: "Commission sur la garde", value: "0 %", positive: true },
 { label: "Vérification d'identité", value: "Incluse", positive: true },
 { label: "Entraide & petites missions", value: `Gratuit`, positive: true },
 { label: "Carte bancaire à l'inscription", value: "Jamais", positive: true },
 { label: "Frais de mise en relation", value: "Aucun", positive: true },
 { label: "Engagement de durée", value: "Aucun", positive: true },
];

const faqItems = [
 {
  q: `L'accès est-il vraiment gratuit pour tout le monde jusqu'au ${SITTER_PRICE_START} ?`,
  a: `Oui. Jusqu'au ${SITTER_PRICE_START}, **l'accès complet à Guardiens est gratuit pour tout le monde**, gardiens comme propriétaires, sans exception.

Aucune carte bancaire n'est demandée à l'inscription. Vous accédez à toutes les fonctionnalités : publier une annonce, postuler aux gardes, échanger par messagerie, laisser des avis, utiliser l'entraide.

Cet accès gratuit ne dépend pas du programme Fondateur : que vous vous inscriviez le 1ᵉʳ février ou le 12 juin 2026, vous ne payez rien jusqu'au ${SITTER_PRICE_START}.

À partir du 1er octobre 2026, l'abonnement gardien à ${SITTER_PRICE} devient nécessaire pour postuler aux gardes. L'espace propriétaire, lui, reste gratuit.`,
 },
 {
  q: `Qu'est-ce que le programme Fondateur ?`,
  a: `Le **programme Fondateur** distingue les premiers membres inscrits sur Guardiens. Ils reçoivent un **badge Fondateur permanent** sur leur profil, un sceau honorifique qui ne sera plus jamais attribué une fois la fenêtre d'inscription refermée.

Le badge ne change rien à votre accès ni à votre tarif : c'est uniquement une distinction symbolique pour celles et ceux qui ont rejoint l'aventure dès le départ.

À ne pas confondre avec l'accès gratuit : **tout le monde accède à Guardiens gratuit jusqu'au ${SITTER_PRICE_START}**, Fondateur ou non.`,
 },
 {
  q: `Pourquoi c'est gratuit pour les propriétaires ?`,
  a: `Parce que nous ne facturons pas l'accès à celles et ceux qui ouvrent leur maison.

Publier une annonce, recevoir des candidatures, échanger avec les gardiens, laisser un avis : tout reste gratuit. Ce n'est pas une offre d'appel, c'est un choix de fond sur notre modèle économique.

Guardiens se rémunère uniquement via l'abonnement des gardiens. Côté propriétaire, payer pour rencontrer des personnes de confiance n'aurait pas de sens : ce qui a de la valeur, c'est l'échange, pas l'accès.

Pour aller plus loin : [Comment bien choisir son gardien →](/actualites/choisir-gardien-bons-criteres)`,
 },
 {
  q: `Puis-je annuler à tout moment ?`,
  a: `Oui. L'abonnement gardien est **résiliable en un clic depuis votre espace abonnement**, sans frais ni justification.

Aucun engagement de durée. Si vous résiliez en cours de mois, l'accès reste actif jusqu'à la prochaine date d'échéance, puis s'interrompt sans nouveau prélèvement.

La formule **accès un mois (10 €)** est un paiement unique sans renouvellement : rien à résilier, l'accès s'interrompt seul à la fin du mois.

La formule **annuelle (65 €/an)** est résiliable à tout moment ; le renouvellement annuel n'a lieu qu'à la date anniversaire.`,
 },
 {
  q: `Pourquoi le 1er octobre 2026 ?`,
  a: `Il fallait une date après plusieurs mois d'accès gratuit, un repère simple et partagé par toutes et tous. Le **${SITTER_PRICE_START}** s'est imposé naturellement comme point de bascule.

C'est ce jour-là que l'accès gratuit prend fin pour les gardiens. À partir du **${SITTER_PRICE_START}**, l'abonnement gardien à ${SITTER_PRICE} devient nécessaire pour postuler aux gardes. L'espace propriétaire, lui, reste gratuit en permanence.`,
 },
 {
  q: "Y a-t-il des frais cachés ?",
  a: `Non. **Jusqu'au 30 septembre 2026 inclus :** rien à payer pour personne, sans carte bancaire.

**À partir du ${SITTER_PRICE_START}, ce que paient les gardiens :** ${SITTER_PRICE}, 10\u00A0€ pour un mois, ou 65\u00A0€/an (−22\u00A0%). C'est tout.

**Ce que paient les propriétaires :** Rien, jamais. Publier, recevoir des candidatures, choisir, évaluer, accès gratuit en permanence.

**Ce qu'on ne prend pas :** Aucune commission sur les gardes. Pas d'assurance obligatoire, pas de booking fee, pas de frais de mise en relation.`,
 },
 {
  q: "Guardiens, c'est uniquement pour la garde d'animaux ?",
  a: `Non. Guardiens héberge **deux usages indépendants**, à parts égales.

**La garde d'animaux à domicile (home sitting)** : un gardien vient chez vous prendre soin de votre maison et de vos animaux pendant votre absence.

**Les petites missions d'entraide entre gens du coin** : un coup de main ponctuel, sans nuitée, sans animal nécessaire, arroser des plantes, ramasser les légumes du jardin, monter un meuble, prêter une perceuse, partager un trajet.

Les deux usages sont indépendants : vous pouvez activer l'un, l'autre, ou les deux. L'entraide reste gratuit pour toutes et tous, sans abonnement.`,
 },
 {
  q: "Quels types d'échanges sont possibles ?",
  a: `Les échanges sur Guardiens passent par **du temps, des compétences ou des objets**, jamais par un paiement direct entre membres.

**Côté garde :** vous accueillez un gardien chez vous, il prend soin de votre maison et de vos animaux. Aucun argent ne circule entre vous : l'échange se joue dans le service rendu, un toit contre une présence.

**Côté entraide :** un service rendu peut être remercié par un autre service, un objet partagé, un repas, un cours ou simplement du temps. Quelques exemples concrets :
- Ramasser des légumes contre un plat maison.
- Arroser des plantes le temps d'un week-end.
- Prêter une perceuse, un sécateur, une remorque.
- Partager un trajet jusqu'à la gare ou au marché.
- Donner un cours (pain, couture, jardinage, informatique).
- Garder un colis, réceptionner une livraison.
- Aider à porter un meuble, monter une étagère.

Chaque échange est libre, négocié entre les deux personnes et n'engage que vous. Guardiens fournit l'outil et la mise en relation, pas la facture.`,
 },
];

const cityLinks = [
 { label: "Lyon", to: "/house-sitting/lyon" },
 { label: "Annecy", to: "/house-sitting/annecy" },
 { label: "Grenoble", to: "/house-sitting/grenoble" },
 { label: "Chambéry", to: "/house-sitting/chambery" },
 { label: "Caluire", to: "/house-sitting/caluire-et-cuire" },
 { label: "Villeurbanne", to: "/house-sitting/villeurbanne" },
];

const Pricing = () => {
 const { t } = useTranslation();
 const ownerFeatures = t("pricing.owner_card.features", { returnObjects: true }) as string[];
 const sitterFeatures = t("pricing.sitter_card.features", { returnObjects: true }) as string[];
 const promiseRows = [
  { label: t("pricing.promise.rows.commission"), value: t("pricing.promise.rows.commission_val"), positive: true },
  { label: t("pricing.promise.rows.verification"), value: t("pricing.promise.rows.verification_val"), positive: true },
  { label: t("pricing.promise.rows.mutual"), value: t("pricing.promise.rows.mutual_val"), positive: true },
  { label: t("pricing.promise.rows.card"), value: t("pricing.promise.rows.card_val"), positive: true },
  { label: t("pricing.promise.rows.intro"), value: t("pricing.promise.rows.intro_val"), positive: true },
  { label: t("pricing.promise.rows.commit"), value: t("pricing.promise.rows.commit_val"), positive: true },
 ];
 const before = isBeforeLaunch();
 const grace = isInGracePeriod();
 const [searchParams] = useSearchParams();
 const initialPlan = ((): 'one_shot' | 'mensuel' | 'annuel' => {
  const p = searchParams.get('plan');
  return p === 'one_shot' || p === 'annuel' || p === 'mensuel' ? p : 'mensuel';
 })();
 const [formule, setFormule] = useState<'one_shot' | 'mensuel' | 'annuel'>(initialPlan);
 const [checkoutLoading, setCheckoutLoading] = useState(false);
 const { user } = useAuth();

 // Synchronise le state si le paramètre `?plan=` change après mount (deep-link).
 useEffect(() => {
  const p = searchParams.get('plan');
  if (p === 'one_shot' || p === 'annuel' || p === 'mensuel') setFormule(p);
 }, [searchParams]);

 const msLeft = Math.max(0, LAUNCH_DATE.getTime() - new Date().getTime());
 const daysLeft = Math.ceil(msLeft / 86400000);

 const ctaLabels: Record<typeof formule, string> = {
  one_shot: "Accéder un mois, 10\u00A0€",
  mensuel: "S'abonner, 6,99\u00A0€/mois",
  annuel: "Choisir l'annuel, 65\u00A0€/an",
 };

 const registerLink = (role?: string) => {
  const params = new URLSearchParams();
  if (role) params.set("role", role);
  if (formule) params.set("plan", formule);
  const qs = params.toString();
  return `/inscription${qs ? `?${qs}` : ""}`;
 };

 // Mapping formule UI (FR) → contrat backend (`create-checkout-session`).
 // CRITIQUE : sans ce mapping, `mensuel` produisait une 400 « formula_type invalide ».
 const FORMULA_TO_BACKEND: Record<typeof formule, 'monthly' | 'one_shot' | 'annuel'> = {
  mensuel: 'monthly',
  one_shot: 'one_shot',
  annuel: 'annuel',
 };

 // Lance le checkout Stripe correspondant à la formule sélectionnée.
 // Pré-condition : utilisateur connecté ET hors période gratuite (`before === false`).
 const startCheckout = async () => {
  if (!user) return;
  setCheckoutLoading(true);
  try {
   const { data, error } = await supabase.functions.invoke("create-checkout-session", {
    body: { formula_type: FORMULA_TO_BACKEND[formule] },
   });
   if (error) throw error;
   const url = (data as { url?: string } | null)?.url;
   if (!url) throw new Error("URL de paiement introuvable.");
   // Ouvre Stripe Checkout dans un nouvel onglet (pattern recommandé Lovable + évite la perte de contexte).
   window.open(url, "_blank", "noopener,noreferrer");
  } catch (err) {
   const msg = err instanceof Error ? err.message : "Impossible d'ouvrir le paiement.";
   toast.error(msg);
  } finally {
   setCheckoutLoading(false);
  }
 };

 const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
   "@type": "Question",
   name: item.q,
   acceptedAnswer: {
    "@type": "Answer",
    text: item.a.replace(/\[.*?\]\(.*?\)/g, "").replace(/\*\*/g, ""),
   },
  })),
 };

  const productJsonLd = {
   "@context": "https://schema.org",
   "@type": "Service",
   serviceType: "Abonnement plateforme de gardiennage entre particuliers",
   name: "Abonnement Gardien Guardiens",
   description:
    "Accès gardien à Guardiens : postuler aux gardes d'animaux à domicile, messagerie directe avec les propriétaires, profil de confiance vérifié, alertes locales.",
   image: [
    "https://guardiens.fr/og/og-sit-1.jpg",
    "https://guardiens.fr/og/og-sit-2.jpg",
   ],
   provider: { "@type": "Organization", name: "Guardiens", url: "https://guardiens.fr" },
   areaServed: { "@type": "Country", name: "France" },
   url: "https://guardiens.fr/tarifs",
  offers: [
   {
    "@type": "Offer",
    name: "Espace propriétaire",
    description: "À 0 € pour les propriétaires, sans abonnement requis.",
    price: "0",
    priceCurrency: SITTER_PRICE_CURRENCY,
    eligibleCustomerType: "Owner",
    availability: "https://schema.org/InStock",
    url: "https://guardiens.fr/inscription?role=owner",
    priceValidUntil: "2027-12-31",
    seller: { "@type": "Organization", name: "Guardiens" },
   },
   {
    "@type": "Offer",
    name: "Abonnement Gardien, Mensuel",
    description: `Abonnement gardien à 6,99 €/mois à partir du 1er octobre 2026. Sans engagement, résiliable à tout moment.`,
    price: String(SITTER_PRICE_NUMERIC),
    priceCurrency: SITTER_PRICE_CURRENCY,
    eligibleCustomerType: "Sitter",
    availabilityStarts: SITTER_PRICE_START_ISO,
    priceSpecification: {
     "@type": "UnitPriceSpecification",
     price: String(SITTER_PRICE_NUMERIC),
     priceCurrency: SITTER_PRICE_CURRENCY,
     unitText: "MONTH",
     referenceQuantity: { "@type": "QuantitativeValue", value: "1", unitCode: "MON" },
    },
    availability: "https://schema.org/InStock",
    url: "https://guardiens.fr/inscription?role=sitter&plan=mensuel",
     priceValidUntil: "2027-12-31",
    seller: { "@type": "Organization", name: "Guardiens" },
   },
   {
    "@type": "Offer",
    name: "Accès Gardien, Un mois",
    description: "Paiement unique pour un mois d'accès, sans renouvellement automatique.",
    price: "10.00",
    priceCurrency: SITTER_PRICE_CURRENCY,
    eligibleCustomerType: "Sitter",
    availabilityStarts: SITTER_PRICE_START_ISO,
    availability: "https://schema.org/InStock",
    url: "https://guardiens.fr/inscription?role=sitter&plan=one_shot",
    priceValidUntil: "2026-12-31",
    seller: { "@type": "Organization", name: "Guardiens" },
   },
   {
    "@type": "Offer",
    name: "Abonnement Gardien, Annuel",
    description: "Abonnement gardien annuel à 65 €/an, soit 5,42 €/mois équivalent (-22 % vs mensuel). Renouvellement annuel automatique, résiliable à tout moment.",
    price: "65.00",
    priceCurrency: SITTER_PRICE_CURRENCY,
    eligibleCustomerType: "Sitter",
    availabilityStarts: SITTER_PRICE_START_ISO,
    priceSpecification: {
     "@type": "UnitPriceSpecification",
     price: "65.00",
     priceCurrency: SITTER_PRICE_CURRENCY,
     unitText: "YEAR",
     referenceQuantity: { "@type": "QuantitativeValue", value: "12", unitCode: "MON" },
    },
    availability: "https://schema.org/InStock",
    url: "https://guardiens.fr/inscription?role=sitter&plan=annuel",
    priceValidUntil: "2027-12-31",
    seller: { "@type": "Organization", name: "Guardiens" },
   },
   ],
 };

 return (
  <>
   <PageMeta
    title={
     before
      ? t("pricing.meta.title_before", { date: SITTER_PRICE_START })
      : t("pricing.meta.title_after", { price: SITTER_PRICE })
    }
    description={
     before
      ? t("pricing.meta.desc_before", { date: SITTER_PRICE_START })
      : t("pricing.meta.desc_after", { price: SITTER_PRICE })
    }
    path="/tarifs"
   />

   <Helmet>
    <script type="application/ld+json">
     {JSON.stringify(faqJsonLd)}
    </script>
    <script type="application/ld+json">
     {JSON.stringify(productJsonLd)}
    </script>
   </Helmet>
   <div className="min-h-screen bg-background">
    <PublicHeader />
    <FreePeriodBanner />
    <PageBreadcrumb items={[{ label: "Tarifs" }]} />

    <main className="max-w-6xl mx-auto px-4">
     {/* ═══ HERO ═══ */}
     <section data-testid="pricing-hero" className="py-10 md:py-14 text-center max-w-2xl mx-auto">
      <p className="hidden md:inline-block bg-primary/10 text-primary text-xs font-body font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
       {t("pricing.hero.eyebrow")}
      </p>
      <h1 className="font-heading text-3xl md:text-5xl font-bold text-foreground leading-tight mb-4">
       {before ? (
        <>{t("pricing.hero.title_before_a")} <span className="text-primary">{t("pricing.hero.title_before_b")}</span></>
       ) : (
        <>{t("pricing.hero.title_after_a")} <span className="text-primary">{t("pricing.hero.title_after_b")}</span></>
       )}
      </h1>
      <p className="text-base md:text-lg font-body text-foreground/65 leading-relaxed mb-7">
       {before
        ? t("pricing.hero.lede_before", { date: SITTER_PRICE_START })
        : t("pricing.hero.lede_after", { price: SITTER_PRICE })}
      </p>
      <div data-testid="pricing-hero-cta" className="flex flex-col sm:flex-row gap-3 justify-center">
       <Link
        to={registerLink("owner")}
        className="inline-flex items-center justify-center bg-primary text-primary-foreground font-body font-semibold text-sm px-7 py-3.5 rounded-full hover:bg-primary/90 transition-colors min-h-[44px]"
       >
        {t("pricing.hero.cta_owner")}
       </Link>
       <Link
        to={registerLink("sitter")}
        className="inline-flex items-center justify-center bg-transparent text-foreground border border-foreground/30 font-body font-medium text-sm px-7 py-3.5 rounded-full hover:bg-foreground/5 transition-colors min-h-[44px]"
       >
        {t("pricing.hero.cta_sitter")}
       </Link>
      </div>
     </section>

     {/* Founder Banner, urgence */}
     {before && (
      <section className="mb-12 md:mb-16">
       <div className="w-full max-w-5xl mx-auto bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/60 rounded-2xl overflow-hidden">
        <div className="bg-amber-100 px-6 py-2.5 text-center">
         <span className="text-sm font-medium text-amber-800 font-body tracking-wide">
          {t("pricing.founder.window")}
         </span>
        </div>

        <div className="px-6 sm:px-10 py-7">
         <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="text-center md:text-left">
           <p className="font-heading text-3xl font-bold text-amber-700 tabular-nums leading-none">
            {daysLeft > 1 ? t("pricing.founder.days_other", { count: daysLeft }) : t("pricing.founder.days_one", { count: daysLeft })}
           </p>
           <p className="text-xs text-amber-600/80 font-body mt-1">
            {t("pricing.founder.before_sub")}
           </p>
          </div>

          <div className="flex-1 text-center md:text-left">
           <p className="font-heading text-lg md:text-xl font-semibold text-amber-900 leading-snug mb-1">
            {t("pricing.founder.join_title")}
           </p>
           <p className="text-xs md:text-sm text-amber-800/80 font-body">
            {t("pricing.founder.join_text")}
           </p>
          </div>

          <Link
           to="/inscription"
           className="shrink-0 inline-flex items-center gap-2 bg-primary text-primary-foreground font-body font-medium text-sm px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors min-h-[44px] whitespace-nowrap"
          >
           {t("pricing.founder.cta")}
          </Link>
         </div>
        </div>
       </div>
      </section>
     )}

     {grace && (
      <section className="rounded-2xl p-6 md:p-8 text-center space-y-3 border-2 border-amber-300 bg-amber-50 mb-12 max-w-5xl mx-auto">
       <h2 className="font-heading text-2xl font-bold text-foreground">{t("pricing.grace.title", { date: SITTER_PRICE_START })}</h2>
       <p className="text-muted-foreground max-w-2xl mx-auto font-body">
        {t("pricing.grace.text", { date: SITTER_PRICE_START, price: SITTER_PRICE })}
       </p>
      </section>
     )}

     {/* Section informative, placée AVANT les cartes payantes pour
         installer la valeur (ce qui reste à 0€) avant le prix. */}
     <div className="max-w-5xl mx-auto mb-10">
      <FreeAccountSection />
     </div>

     {/* ═══ Cartes pricing détaillées ═══ */}
     <section data-testid="pricing-cards" className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto items-stretch mb-12 md:mb-16">
      {/* Owner Card */}
      <Card data-testid="owner-card" className="bg-card border border-border/40 rounded-2xl h-full flex flex-col relative">
       <div data-testid="badge-owner" className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center justify-center bg-foreground/90 text-background text-[11px] sm:text-xs font-body font-medium tracking-wide leading-none px-3.5 py-1.5 rounded-full whitespace-nowrap max-w-[calc(100%-1.5rem)] shadow-sm">
        {t("pricing.owner_card.badge")}
       </div>
       <CardHeader className="text-center pb-2 p-8 pt-10">
        <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 font-body">{t("pricing.owner_card.label")}</div>
        <CardTitle className="font-heading text-4xl md:text-5xl font-bold text-foreground">{t("pricing.owner_card.price")}</CardTitle>
        <p className="text-sm font-body text-foreground/60 mt-2">
         {t("pricing.owner_card.subtitle")}
        </p>
       </CardHeader>
       <CardContent className="space-y-5 px-8 pb-8 pt-2 flex-1 flex flex-col">
        <ul className="space-y-3 flex-1">
         {ownerFeatures.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm">
           <span aria-hidden className="text-primary font-body mt-0.5 shrink-0 select-none">,</span>
           <span className="font-body text-foreground/70">{f}</span>
          </li>
         ))}
        </ul>
        <div className="mt-auto">
         <Link to={registerLink("owner")} className="block">
          <Button
           variant="secondary"
           className="w-full min-h-[44px] font-body"
           size="lg"
          >
           {t("pricing.owner_card.cta")}
          </Button>
         </Link>
        </div>
       </CardContent>
      </Card>

      {/* Sitter Card */}
      <Card data-testid="sitter-card" className="border-2 border-primary/30 relative shadow-xl rounded-2xl h-full flex flex-col bg-primary/5">
       <div data-testid="badge-sitter" className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center justify-center bg-primary text-primary-foreground text-[11px] sm:text-xs font-body font-semibold tracking-wide leading-none px-3.5 py-1.5 rounded-full whitespace-nowrap max-w-[calc(100%-1.5rem)] shadow-sm">
        {before
         ? (daysLeft > 99
          ? t("pricing.sitter_card.badge_offered_months", { count: Math.ceil(daysLeft / 30) })
          : daysLeft > 1
           ? t("pricing.sitter_card.badge_offered_days_other", { count: daysLeft })
           : t("pricing.sitter_card.badge_offered_days_one", { count: daysLeft }))
         : t("pricing.sitter_card.badge_most_chosen")}
       </div>
       <CardHeader className="text-center pb-2 p-8 pt-10">
        <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 font-body">{t("pricing.sitter_card.label")}</div>
        {before ? (
         <div className="text-center space-y-1.5 py-2">
          <p className="font-heading text-4xl md:text-5xl font-bold text-primary leading-none">
           {t("pricing.sitter_card.price_free")}
          </p>
          <p className="text-xs text-foreground/55 font-body pt-2">
           {t("pricing.sitter_card.free_until", { date: SITTER_PRICE_START, price: SITTER_PRICE })}
          </p>
         </div>
        ) : (
         <div className="text-center space-y-1.5 py-2">
          {formule === 'annuel' ? (
           <p className="font-heading text-4xl md:text-5xl font-bold text-foreground">
            {SITTER_PRICE_ANNUAL_NUMERIC}&nbsp;€
            <span className="text-lg font-body font-normal text-foreground/60 ml-1">{t("pricing.sitter_card.per_year")}</span>
           </p>
          ) : formule === 'one_shot' ? (
           <p className="font-heading text-4xl md:text-5xl font-bold text-foreground">
            {SITTER_PRICE_ONESHOT_NUMERIC}&nbsp;€
            <span className="text-lg font-body font-normal text-foreground/60 ml-1">{t("pricing.sitter_card.per_month_short")}</span>
           </p>
          ) : (
           <p className="font-heading text-4xl md:text-5xl font-bold text-foreground">
            <span className="text-lg font-body font-normal text-foreground/60 mr-1">{t("pricing.sitter_card.from")}</span>
            6,99&nbsp;€
            <span className="text-lg font-body font-normal text-foreground/60 ml-1">{t("pricing.sitter_card.per_month")}</span>
           </p>
          )}
          <p className="text-xs text-foreground/50 font-body">
           {formule === 'mensuel'
            ? t("pricing.sitter_card.note_monthly")
            : formule === 'annuel'
             ? t("pricing.sitter_card.note_annual", { equiv: ANNUAL_MONTHLY_EQUIV })
             : t("pricing.sitter_card.note_oneshot")}
          </p>
         </div>
        )}
       </CardHeader>
       <CardContent className="space-y-5 px-8 pb-8 pt-2 flex-1 flex flex-col">
        <ul className="space-y-3">
         {sitterFeatures.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm">
           <span aria-hidden className="text-primary font-body mt-0.5 shrink-0 select-none">,</span>
           <span className="text-foreground/70 font-body">{f}</span>
          </li>
         ))}
        </ul>

        {/* Bloc formules, masqué pendant la période gratuite totale.
            Pattern radiogroup accessible (rôle + arrow keys via tabIndex et aria-checked). */}
        {!before && (
         <div role="radiogroup" aria-label={t("pricing.sitter_card.formulas_label")} className="bg-background border border-border/50 rounded-xl p-4 space-y-3 text-left">
          <p className="text-xs uppercase tracking-widest text-foreground/50 font-body">
           {t("pricing.sitter_card.three_formulas")}
          </p>
          <div
           role="radio"
           aria-checked={formule === 'one_shot'}
           tabIndex={0}
           onClick={() => setFormule('one_shot')}
           onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFormule('one_shot'); } }}
           className={`flex items-start justify-between gap-3 border rounded-lg p-3 cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${formule === 'one_shot' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
          >
           <div className="min-w-0">
            <p className="text-sm font-medium text-foreground font-body">{t("pricing.sitter_card.oneshot_title")}</p>
            <p className="text-xs text-foreground/50 font-body">{t("pricing.sitter_card.oneshot_sub")}</p>
           </div>
           <span className="text-sm font-semibold text-foreground font-body flex-shrink-0">{SITTER_PRICE_ONESHOT_NUMERIC}&nbsp;€</span>
          </div>
          <div
           role="radio"
           aria-checked={formule === 'mensuel'}
           tabIndex={0}
           onClick={() => setFormule('mensuel')}
           onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFormule('mensuel'); } }}
           className={`flex items-start justify-between gap-3 border rounded-lg p-3 cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${formule === 'mensuel' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
          >
           <div className="min-w-0">
            <div className="flex items-center gap-2">
             <p className="text-sm font-medium text-foreground font-body">{t("pricing.sitter_card.monthly_title")}</p>
             <span className="text-xs font-body text-primary/70">{t("pricing.sitter_card.monthly_tag")}</span>
            </div>
            <p className="text-xs text-foreground/50 font-body">{t("pricing.sitter_card.monthly_sub")}</p>
           </div>
           <span className="text-sm font-semibold text-primary font-body flex-shrink-0">{SITTER_PRICE}</span>
          </div>
          <div
           role="radio"
           aria-checked={formule === 'annuel'}
           tabIndex={0}
           onClick={() => setFormule('annuel')}
           onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFormule('annuel'); } }}
           className={`flex items-start justify-between gap-3 border rounded-lg p-3 cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${formule === 'annuel' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
          >
           <div className="min-w-0">
            <div className="flex items-center gap-2">
             <p className="text-sm font-medium text-foreground font-body">{t("pricing.sitter_card.annual_title")}</p>
             <span className="text-[10px] font-body font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full leading-none">-{SITTER_PRICE_ANNUAL_DISCOUNT_PCT}%</span>
            </div>
            <p className="text-xs text-foreground/50 font-body">{t("pricing.sitter_card.annual_sub")}</p>
            <p className="text-xs text-foreground/40 italic font-body">Soit ~{ANNUAL_MONTHLY_EQUIV}&nbsp;€/mois équivalent · Économie de {ANNUAL_SAVINGS_EUR}&nbsp;€/an</p>
           </div>
           <span className="text-sm font-semibold text-primary font-body flex-shrink-0">{SITTER_PRICE_ANNUAL_NUMERIC}&nbsp;€/an</span>
          </div>
         </div>
        )}

        {/* CTA, bascule entre /inscription (visiteur ou période gratuite) et Stripe Checkout (utilisateur connecté, post-launch) */}
        <div className="space-y-1 pt-2 mt-auto">
         {before || !user ? (
          <Link
           to={registerLink("sitter")}
           className="w-full inline-flex items-center justify-center bg-primary text-primary-foreground font-body font-medium text-sm px-6 py-3.5 rounded-xl hover:bg-primary/90 transition-colors min-h-[44px]"
          >
           {before ? t("pricing.sitter_card.cta_become_sitter") : ctaLabels[formule]}
          </Link>
         ) : (
          <Button
           type="button"
           onClick={startCheckout}
           disabled={checkoutLoading}
           className="w-full bg-primary text-primary-foreground font-body font-medium text-sm px-6 py-3.5 rounded-xl hover:bg-primary/90 min-h-[44px]"
          >
           {checkoutLoading ? (
            <>
             <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
             {t("pricing.sitter_card.opening_checkout")}
            </>
           ) : (
            ctaLabels[formule]
           )}
          </Button>
         )}
         <p className="text-xs font-body text-foreground/50 text-center mt-2">
           {before
            ? t("pricing.sitter_card.note_before")
            : !user
             ? t("pricing.sitter_card.note_visitor")
             : formule === "mensuel"
              ? t("pricing.sitter_card.note_after_monthly")
              : formule === "annuel"
               ? t("pricing.sitter_card.note_after_annual")
               : t("pricing.sitter_card.note_after_oneshot")}
         </p>
        </div>
       </CardContent>
      </Card>
     </section>

     {/* ═══ Entraide, exemple concret, hors animaux ═══ */}
     <section className="mb-12 md:mb-16 max-w-4xl mx-auto">
      <div className="rounded-2xl border border-border/40 bg-card p-6 md:p-8">
       <div className="flex items-baseline justify-between flex-wrap gap-3 mb-4">
        <h2 className="font-heading text-xl md:text-2xl font-semibold text-foreground">
         L'entraide, indépendante de la garde
        </h2>
        <span className="text-xs uppercase tracking-wider font-body text-primary">
         {t("pricing.mutual.free_tag")}
        </span>
       </div>
       <p className="text-sm md:text-base font-body text-foreground/70 leading-relaxed mb-4">
        {t("pricing.mutual.p1")}
       </p>
       <p className="text-sm font-body text-foreground/55 italic mb-5">
        {t("pricing.mutual.p2")}
       </p>
       <Link
        to="/petites-missions"
        className="inline-flex items-center gap-2 text-sm font-body font-medium text-primary hover:underline"
       >
        {t("pricing.mutual.cta")}
       </Link>
      </div>
     </section>

     {/* ═══ SÉCURITÉ & VÉRIFICATIONS ═══ */}
     <SecurityTrustSection />

     {/* ═══ Comparatif ═══ */}
     <section className="mb-12 md:mb-16 max-w-4xl mx-auto">
      <div className="text-center mb-8">
       <h2 className="font-heading text-2xl md:text-3xl font-semibold text-foreground mb-3">
        Notre engagement tarifaire
       </h2>
       <p className="text-sm font-body text-foreground/60">
        {t("pricing.promise.lede")}
       </p>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
       {promiseRows.map((row) => (
        <li
         key={row.label}
         className="flex items-center justify-between gap-4 rounded-xl border border-border/40 bg-card px-4 py-3"
        >
         <span className="text-sm font-body text-foreground/75">{row.label}</span>
         <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary font-body whitespace-nowrap">
          {row.value}
         </span>
        </li>
       ))}
      </ul>
     </section>

     {/* Témoignage retiré : aucun avis vérifié à afficher tant que la
         base d'avis réels n'est pas suffisante. Évite les fausses preuves. */}

     {/* ═══ Internal links, villes ═══ */}
     <section className="max-w-3xl mx-auto mb-12 md:mb-16">
      <h2 className="font-heading text-xl font-bold text-foreground text-center mb-4">{t("pricing.cities.title")}</h2>
      <p className="text-sm text-muted-foreground text-center font-body mb-6">
       {t("pricing.cities.lede_a")}{" "}
       <Link to="/gardien-urgence" className="text-primary hover:underline">{t("pricing.cities.lede_link")}</Link>{" "}
       {t("pricing.cities.lede_b")}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
       {cityLinks.map((city) => (
        <Link
         key={city.to}
         to={city.to}
         className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-body text-foreground hover:border-primary/40 hover:text-primary transition-colors"
        >
         {city.label}
        </Link>
       ))}
      </div>
     </section>

     {/* ═══ FAQ ═══ */}
     <section className="max-w-3xl mx-auto mb-12 md:mb-16">
      <h2 className="text-2xl font-heading font-semibold text-foreground text-center mb-3">{t("pricing.faq_section.title")}</h2>
      <p className="text-sm font-body text-foreground/60 text-center mb-8">
       {t("pricing.faq_section.lede")}
      </p>
      <Accordion type="single" collapsible className="w-full list-none">
       {faqItems.map((item, i) => (
        <AccordionItem key={i} value={`faq-${i}`} className="border-b border-border/40 py-1">
         <AccordionTrigger className="text-left text-base font-body font-medium text-foreground hover:text-primary transition-colors py-5">
          {item.q}
         </AccordionTrigger>
         <AccordionContent className="text-sm font-body text-foreground/65 leading-relaxed pt-1 pb-4">
          <ReactMarkdown
           components={{
            p: ({ children }) => <p className="mb-3 last:mb-0 font-body text-foreground/65 leading-relaxed">{children}</p>,
            strong: ({ children }) => <strong className="font-semibold text-foreground/80">{children}</strong>,
            a: ({ href, children }) => (
             <Link to={href || "/"} className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors">
              {children}
             </Link>
            ),
            ul: ({ children }) => <ul className="list-disc pl-5 space-y-1.5 mb-3 text-sm font-body text-foreground/65">{children}</ul>,
            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
           }}
          >
           {item.a}
          </ReactMarkdown>
         </AccordionContent>
        </AccordionItem>
       ))}
      </Accordion>
      <div className="text-center mt-6">
       <Link to="/faq#tarifs-abonnements" className="text-sm font-body text-primary hover:underline">
        {t("pricing.faq_section.see_all")}
       </Link>
      </div>
     </section>

     {/* ═══ Lien article détaillé ═══ */}
     <section className="rounded-xl border border-border bg-accent/30 p-6 text-center mb-12 max-w-3xl mx-auto">
      <p className="text-sm text-muted-foreground mb-2">{t("pricing.detail_article.intro")}</p>
      <Link to="/actualites/nouveaux-tarifs-2026" className="text-primary font-medium hover:underline text-sm">
       {t("pricing.detail_article.link")}
      </Link>
     </section>

     {/* ═══ CTA final ═══ */}
     <section className="text-center py-10 md:py-14 bg-gradient-to-br from-primary to-primary/85 rounded-2xl mb-12">
      <h2 className="text-xl md:text-2xl font-heading font-semibold text-primary-foreground text-center mb-3 px-4">
       {before
        ? "Rejoignez Guardiens dès maintenant"
        : "Prêt à rejoindre Guardiens ?"}
      </h2>
      <p className="text-sm md:text-base font-body text-primary-foreground/85 text-center mb-8 max-w-xl mx-auto px-4">
       {t("pricing.final_cta.lede")}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center px-4">
       <Link to={registerLink("sitter")}>
        <Button className="bg-background text-foreground font-body font-medium px-8 py-4 rounded-xl text-base hover:bg-background/90 transition-colors min-h-[52px] w-full sm:w-auto" size="xl">
         {t("pricing.final_cta.cta_sitter")}
        </Button>
       </Link>
       <Link to={registerLink("owner")}>
        <Button variant="outline" className="bg-transparent text-primary-foreground border-2 border-primary-foreground/30 hover:bg-primary-foreground/10 hover:border-primary-foreground/50 font-body font-medium px-8 py-4 rounded-xl text-base min-h-[52px] w-full sm:w-auto" size="xl">
         {t("pricing.final_cta.cta_owner")}
        </Button>
       </Link>
      </div>
     </section>
    </main>

    <PublicFooter />
   </div>
  </>
 );
};

export default Pricing;
