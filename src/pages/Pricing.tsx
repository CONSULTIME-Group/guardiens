import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import { Check, MapPin } from "lucide-react";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import FreeAccountSection from "@/components/subscription/FreeAccountSection";
import SecurityTrustSection from "@/components/subscription/SecurityTrustSection";
import { LAUNCH_DATE, isBeforeLaunch, isInGracePeriod } from "@/lib/constants";

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
  { label: "Entraide & petites missions", value: "Gratuites à vie", positive: true },
  { label: "Carte bancaire à l'inscription", value: "Jamais", positive: true },
  { label: "Frais de mise en relation", value: "Aucun", positive: true },
  { label: "Engagement de durée", value: "Aucun", positive: true },
];

const faqItems = [
  {
    q: "L'accès est-il vraiment gratuit pour tout le monde jusqu'au 13 juin 2026 ?",
    a: `Oui. Jusqu'au 13 juin 2026, **l'accès complet à Guardiens est 100% gratuit pour tout le monde** — gardiens comme propriétaires, sans aucune exception.

Aucune carte bancaire n'est demandée à l'inscription. Vous accédez à toutes les fonctionnalités : publier une annonce, postuler aux gardes, échanger en messagerie, laisser des avis, utiliser l'entraide.

Cette gratuité totale ne dépend pas du programme Fondateur. Que vous vous inscriviez le 1er février ou le 12 juin 2026, vous ne payez rien jusqu'au 13 juin 2026.

À partir du 14 juin 2026, l'abonnement gardien à 6,99 €/mois devient nécessaire pour postuler aux gardes. L'espace propriétaire, lui, reste à 0 € à vie.`,
  },
  {
    q: "Quelle est la différence entre la gratuité jusqu'au 13 juin et le programme Fondateur ?",
    a: `Ce sont deux choses distinctes qui se cumulent.

**La gratuité totale jusqu'au 13 juin 2026** concerne **tous les inscrits**, sans condition de date. Personne ne paie avant cette date.

**Le programme Fondateur** est un statut symbolique réservé aux personnes inscrites **avant le 13 mai 2026**. Il donne droit à un badge Fondateur affiché à vie sur le profil — ce badge ne sera plus jamais attribué après cette date.

En clair : tout le monde est gratuit jusqu'au 13 juin, et seuls les premiers inscrits (avant le 13 mai) reçoivent en plus le badge Fondateur.`,
  },
  {
    q: "Pourquoi c'est gratuit pour les propriétaires ?",
    a: `Parce qu'on ne facture pas l'accès à ceux qui ouvrent leur maison.

Publier une annonce, recevoir des candidatures, échanger avec les gardiens, laisser un avis — tout ça reste gratuit, pour toujours. Ce n'est pas une offre d'appel : c'est une décision de fond sur le modèle économique.

Guardiens gagne de l'argent uniquement sur l'abonnement des gardiens. Les propriétaires n'ont aucune raison de payer pour accéder à des gens de confiance qui veulent garder leur maison — c'est l'échange qui a de la valeur, pas l'accès.

Pour comprendre comment fonctionne la mise en relation : [Comment bien choisir son gardien →](/actualites/choisir-gardien-bons-criteres)`,
  },
  {
    q: "Comment fonctionne l'essai gratuit de 7 jours ?",
    a: `Cet essai s'applique **après le 13 juin 2026**, lorsque l'abonnement gardien devient payant.

Vous vous inscrivez en tant que gardien, sans carte bancaire. Pendant 7 jours, vous accédez à toutes les fonctionnalités : postuler aux gardes, échanger avec les propriétaires, créer votre profil de confiance.

Aucun prélèvement automatique. À la fin de l'essai, vous choisissez si vous souhaitez activer l'abonnement à 6,99 €/mois. Si vous ne faites rien, l'accès s'interrompt sans frais.

Avant le 13 juin 2026, cet essai n'a pas lieu d'être : tout est déjà gratuit pour tout le monde.`,
  },
  {
    q: "Pourquoi le 13 mai ?",
    a: `C'est l'anniversaire de Jérémie, cofondateur de Guardiens.

Plutôt que de recevoir des cadeaux, il a décidé de marquer cette date avec le programme Fondateur : les personnes inscrites avant le 13 mai 2026 reçoivent un **badge Fondateur affiché à vie** sur leur profil. Ce badge ne sera plus jamais attribué après cette date.

À ne pas confondre avec la gratuité : **tout le monde est gratuit jusqu'au 13 juin 2026**, qu'il s'inscrive avant ou après le 13 mai. Le 13 mai concerne uniquement le badge.`,
  },
  {
    q: "Y a-t-il des frais cachés ?",
    a: `Non. **Jusqu'au 13 juin 2026 :** rien à payer pour personne, sans carte bancaire.

**Après le 13 juin 2026 — ce que paient les gardiens :** 6,99 €/mois, 12 € pour un mois, ou la formule 2026 à -20%. C'est tout.

**Ce que paient les propriétaires :** Rien, jamais. Publier, recevoir des candidatures, choisir, évaluer — gratuit en permanence.

**Ce qu'on ne prend pas :** Aucune commission sur les gardes. Pas d'assurance obligatoire, pas de booking fee, pas de frais de mise en relation.`,
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
  const before = isBeforeLaunch();
  const grace = isInGracePeriod();
  const [formule, setFormule] = useState<'one_shot' | 'mensuel' | 'prorata'>('mensuel');

  const msLeft = Math.max(0, LAUNCH_DATE.getTime() - new Date().getTime());
  const daysLeft = Math.ceil(msLeft / 86400000);

  const ctaLabels: Record<typeof formule, string> = {
    one_shot: "Accéder un mois — 12€",
    mensuel: "Commencer — 7 jours offerts",
    prorata: "Choisir le prorata 2026",
  };

  const registerLink = (role?: string) => {
    const params = new URLSearchParams();
    if (role) params.set("role", role);
    if (formule) params.set("plan", formule);
    const qs = params.toString();
    return `/inscription${qs ? `?${qs}` : ""}`;
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

  return (
    <>
      <PageMeta
        title={
          before
            ? "Tarifs Guardiens — 0 € pour tous jusqu'au 13 juin 2026"
            : "Tarifs Guardiens — 0 € pour les propriétaires, 6,99 €/mois pour les gardiens"
        }
        description={
          before
            ? "0 € jusqu'au 13 juin 2026 pour tous, gardiens comme propriétaires. Sans carte bancaire, sans commission, sans frais cachés."
            : "0 € à vie pour les propriétaires. 6,99 €/mois pour les gardiens avec 7 jours d'essai. Sans commission, sans frais cachés."
        }
        path="/tarifs"
      />

      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(faqJsonLd)}
        </script>
      </Helmet>
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <PageBreadcrumb items={[{ label: "Tarifs" }]} />

        <main className="max-w-6xl mx-auto px-4">
          {/* ═══ HERO ═══ */}
          <section className="py-10 md:py-14 text-center max-w-2xl mx-auto">
            <p className="inline-block bg-primary/10 text-primary text-xs font-body font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
              Sans commission, sans frais cachés
            </p>
            <h1 className="font-heading text-3xl md:text-5xl font-bold text-foreground leading-tight mb-4">
              {before ? (
                <>Offert. <span className="text-primary">Pour tout le monde.</span></>
              ) : (
                <>Un seul prix. <span className="text-primary">Transparent.</span></>
              )}
            </h1>
            <p className="text-base md:text-lg font-body text-foreground/65 leading-relaxed">
              {before
                ? "Jusqu'au 13 juin 2026, l'accès complet est offert — gardiens comme propriétaires. Aucune carte bancaire demandée."
                : "Offert à vie pour les propriétaires. 6,99 €/mois pour les gardiens, avec 7 jours d'essai. C'est tout."}
            </p>
          </section>

          {/* Founder Banner — urgence */}
          {before && (
            <section className="mb-12 md:mb-16">
              <div className="w-full max-w-5xl mx-auto bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/60 rounded-2xl overflow-hidden">
                <div className="bg-amber-100 px-6 py-2.5 text-center">
                  <span className="text-sm font-medium text-amber-800 font-body tracking-wide">
                    Programme Fondateur — clôture le 13 mai 2026
                  </span>
                </div>

                <div className="px-6 sm:px-10 py-7">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="text-center md:text-left">
                      <p className="font-heading text-3xl font-bold text-amber-700 tabular-nums leading-none">
                        {daysLeft} jour{daysLeft > 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-amber-600/80 font-body mt-1">
                        pour rejoindre les Fondateurs
                      </p>
                    </div>

                    <div className="flex-1 text-center md:text-left">
                      <p className="font-heading text-lg md:text-xl font-semibold text-amber-900 leading-snug mb-1">
                        Inscrivez-vous avant le 13 mai pour recevoir le badge Fondateur à vie
                      </p>
                      <p className="text-xs md:text-sm text-amber-800/80 font-body">
                        Un sceau honorifique gravé sur votre profil — il ne sera plus jamais attribué après cette date.
                      </p>
                    </div>

                    <Link
                      to="/inscription"
                      className="shrink-0 inline-flex items-center gap-2 bg-primary text-primary-foreground font-body font-medium text-sm px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors min-h-[44px] whitespace-nowrap"
                    >
                      Devenir Fondateur
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          )}

          {grace && (
            <section className="rounded-2xl p-6 md:p-8 text-center space-y-3 border-2 border-amber-300 bg-amber-50 mb-12 max-w-5xl mx-auto">
              <h2 className="font-heading text-2xl font-bold text-foreground">Les Fondateurs ont jusqu'au 13 juin</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto font-body">
                Les membres inscrits avant le 13 mai conservent leur accès gratuit jusqu'au 13 juin.
                Après cette date, l'abonnement à 6,99 €/mois sera nécessaire. Le badge Fondateur reste à vie.
              </p>
            </section>
          )}

          {/* Section informative — placée AVANT les cartes payantes pour
              installer la valeur (ce qui reste gratuit) avant le prix. */}
          <div className="max-w-5xl mx-auto mb-10">
            <FreeAccountSection />
          </div>

          {/* ═══ Cartes pricing détaillées ═══ */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto items-stretch mb-12 md:mb-16">
            {/* Owner Card */}
            <Card className="bg-card border border-border/40 rounded-2xl h-full flex flex-col relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary/10 text-primary text-xs font-body font-medium px-3 py-1 rounded-full">
                Gratuit pour toujours
              </div>
              <CardHeader className="text-center pb-2 p-8 pt-10">
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 font-body">Propriétaire</div>
                <CardTitle className="font-heading text-5xl font-bold text-foreground">0 €</CardTitle>
                <p className="text-sm font-body text-foreground/60 mt-2">
                  À vie, sans condition.
                </p>
              </CardHeader>
              <CardContent className="space-y-5 px-8 pb-8 pt-2 flex-1 flex flex-col">
                <ul className="space-y-3 flex-1">
                  {ownerFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
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
                      Publier une annonce
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Sitter Card */}
            <Card className="border-2 border-primary/30 relative shadow-xl rounded-2xl h-full flex flex-col bg-primary/5">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-100 text-amber-800 text-xs font-body font-medium px-3 py-1 rounded-full">
                Le plus choisi
              </div>
              <CardHeader className="text-center pb-2 p-8 pt-10">
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 font-body">Gardien</div>
                {before ? (
                  <div className="text-center space-y-1.5 py-2">
                    <p className="font-heading text-5xl font-bold text-primary leading-none">
                      0 €
                    </p>
                    <p className="text-xs text-foreground/55 font-body pt-1">
                      Puis <span className="font-semibold text-foreground">6,99 €/mois</span> à partir du 14 juin 2026
                    </p>
                  </div>
                ) : (
                  <div className="text-center space-y-1.5 py-2">
                    <p className="font-heading text-5xl font-bold text-foreground">
                      <span className="text-lg font-body font-normal text-foreground/60 mr-1">à partir de</span>
                      6,99€
                      <span className="text-lg font-body font-normal text-foreground/60 ml-1">/mois</span>
                    </p>
                    <p className="text-xs text-foreground/50 font-body">
                      7 jours d'essai · Sans CB · Résiliable à tout moment
                    </p>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-5 px-8 pb-8 pt-2 flex-1 flex flex-col">
                <ul className="space-y-3">
                  {sitterFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-foreground/70 font-body">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* Bloc formules — masqué pendant la période de gratuité totale */}
                {!before && (
                  <div className="bg-background border border-border/50 rounded-xl p-4 space-y-3 text-left">
                    <p className="text-xs uppercase tracking-widest text-foreground/50 font-body">
                      Trois formules
                    </p>
                    <div
                      onClick={() => setFormule('one_shot')}
                      className={`flex items-start justify-between gap-3 border rounded-lg p-3 cursor-pointer transition-all ${formule === 'one_shot' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground font-body">Accès un mois</p>
                        <p className="text-xs text-foreground/50 font-body">Paiement immédiat · Sans renouvellement</p>
                      </div>
                      <span className="text-sm font-semibold text-foreground font-body flex-shrink-0">12€</span>
                    </div>
                    <div
                      onClick={() => setFormule('mensuel')}
                      className={`flex items-start justify-between gap-3 border rounded-lg p-3 cursor-pointer transition-all ${formule === 'mensuel' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground font-body">Mensuel</p>
                          <span className="text-xs font-body text-primary/70">Le plus choisi</span>
                        </div>
                        <p className="text-xs text-foreground/50 font-body">7 jours d'essai · Annulable à tout moment</p>
                      </div>
                      <span className="text-sm font-semibold text-primary font-body flex-shrink-0">6,99€/mois</span>
                    </div>
                    <div
                      onClick={() => setFormule('prorata')}
                      className={`flex items-start justify-between gap-3 border rounded-lg p-3 cursor-pointer transition-all ${formule === 'prorata' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground font-body">Jusqu'à fin 2026</p>
                          <span className="text-[10px] font-body font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full leading-none">-20%</span>
                        </div>
                        <p className="text-xs text-foreground/50 font-body">Un seul paiement pour tous les mois restants en 2026</p>
                        <p className="text-xs text-foreground/40 italic font-body">Ex. aujourd'hui : ~8 mois → environ 45€ au lieu de 56€</p>
                      </div>
                      <span className="text-sm font-semibold text-primary font-body flex-shrink-0">5,59€/mois</span>
                    </div>
                  </div>
                )}

                {/* CTA */}
                <div className="space-y-1 pt-2 mt-auto">
                  <Link
                    to={registerLink("sitter")}
                    className="w-full inline-flex items-center justify-center bg-primary text-primary-foreground font-body font-medium text-sm px-6 py-3.5 rounded-xl hover:bg-primary/90 transition-colors min-h-[44px]"
                  >
                    {before ? "Devenir gardien" : ctaLabels[formule]}
                  </Link>
                  <p className="text-xs font-body text-foreground/50 text-center mt-2">
                    {before
                      ? "Aucune carte bancaire demandée."
                      : "Inscription sans carte bancaire. L'abonnement mensuel inclut 7 jours d'essai offerts."}
                  </p>
                </div>
              </CardContent>
            </Card>
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
                Six promesses concrètes, sans astérisque ni frais cachés.
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
                    <Check className="h-4 w-4" />
                    {row.value}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Témoignage retiré : aucun avis vérifié à afficher tant que la
              base d'avis réels n'est pas suffisante. Évite les fausses preuves. */}

          {/* ═══ Internal links — villes ═══ */}
          <section className="max-w-3xl mx-auto mb-12 md:mb-16">
            <h2 className="font-heading text-xl font-bold text-foreground text-center mb-4">House-sitting par ville</h2>
            <p className="text-sm text-muted-foreground text-center font-body mb-6">
              Découvrez les gardiens vérifiés disponibles dans votre ville. Un imprévu ? Nos{" "}
              <Link to="/gardien-urgence" className="text-primary hover:underline">gardiens d'urgence</Link>{" "}
              sont mobilisables en quelques heures.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {cityLinks.map((city) => (
                <Link
                  key={city.to}
                  to={city.to}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-body text-foreground hover:border-primary/40 hover:text-primary transition-colors"
                >
                  <MapPin className="h-3.5 w-3.5" /> {city.label}
                </Link>
              ))}
            </div>
          </section>

          {/* ═══ FAQ ═══ */}
          <section className="max-w-3xl mx-auto mb-12 md:mb-16">
            <h2 className="text-2xl font-heading font-semibold text-foreground text-center mb-3">Questions fréquentes</h2>
            <p className="text-sm font-body text-foreground/60 text-center mb-8">
              Des questions sur le modèle ? Voici les réponses directes.
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
              <Link to="/faq" className="text-sm font-body text-primary hover:underline">
                Voir toutes les questions →
              </Link>
            </div>
          </section>

          {/* ═══ Lien article détaillé ═══ */}
          <section className="rounded-xl border border-border bg-accent/30 p-6 text-center mb-12 max-w-3xl mx-auto">
            <p className="text-sm text-muted-foreground mb-2">Vous voulez tout comprendre en détail ?</p>
            <Link to="/actualites/nouveaux-tarifs-2026" className="text-primary font-medium hover:underline text-sm">
              Découvrir nos tarifs en détail →
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
              Sans carte bancaire à l'inscription. Vous décidez ensuite.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center px-4">
              <Link to={registerLink("sitter")}>
                <Button className="bg-background text-foreground font-body font-medium px-8 py-4 rounded-xl text-base hover:bg-background/90 transition-colors min-h-[52px] w-full sm:w-auto" size="xl">
                  Devenir gardien
                </Button>
              </Link>
              <Link to={registerLink("owner")}>
                <Button variant="outline" className="bg-transparent text-primary-foreground border-2 border-primary-foreground/30 hover:bg-primary-foreground/10 hover:border-primary-foreground/50 font-body font-medium px-8 py-4 rounded-xl text-base min-h-[52px] w-full sm:w-auto" size="xl">
                  Publier une annonce
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
