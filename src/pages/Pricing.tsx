import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import { Check, Star, Gift, MapPin, ShieldCheck, Map, PawPrint, Heart, Siren } from "lucide-react";
import PageMeta from "@/components/PageMeta";

const LAUNCH_DATE = new Date("2026-05-13T00:00:00");
const GRACE_END = new Date("2026-06-13T00:00:00");
const isBeforeLaunch = () => new Date() < LAUNCH_DATE;
const isInGracePeriod = () => { const n = new Date(); return n >= LAUNCH_DATE && n < GRACE_END; };

const calculateYearlyProrata = (): { price: number; months: number } => {
  const now = new Date();
  const endOfYear = new Date(2026, 11, 31);
  const months = Math.ceil(
    (endOfYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  );
  const fullPrice = months * 9;
  const discounted = Math.round(fullPrice * 0.8);
  return { price: discounted, months };
};

const ownerFeatures = [
  "Créer votre profil complet",
  "Publier vos annonces de garde",
  "Recevoir des candidatures",
  "Messagerie illimitée",
  "Avis croisés détaillés",
  "Guide de la maison intégré",
  "Accès aux gardiens vérifiés",
  "Guides locaux (parcs, vétos, balades)",
  "Support",
];

const sitterFeatures = [
  "Créer votre profil complet",
  "Accéder à toutes les annonces en détail",
  "Postuler aux gardes",
  "Messagerie illimitée",
  "Avis croisés détaillés",
  "Mode « Je suis disponible »",
  "Fiches races complètes (caractère, conseils de garde)",
  "Guides locaux complets (parcs, vétos, balades, cafés)",
  "Articles du blog en accès complet",
  "Badges et métriques de fiabilité",
  "Support",
];

const strengthBlocks = [
  { icon: MapPin, title: "Gardiens de proximité", desc: "Vos gardiens sont dans votre quartier — pas à l'autre bout du pays. Un problème ? Quelqu'un est à 15 minutes." },
  { icon: ShieldCheck, title: "Profils vérifiés", desc: "Identité vérifiée, avis croisés détaillés, écussons qualitatifs. Vous savez à qui vous confiez vos animaux." },
  { icon: Map, title: "Guides locaux", desc: "Parcs, vétérinaires, balades, cafés dog-friendly — tout ce qu'il faut pour que votre gardien se sente chez lui." },
  { icon: PawPrint, title: "Fiches races", desc: "Caractère, besoins, conseils de garde — votre gardien sait exactement comment s'occuper de votre animal." },
  { icon: Heart, title: "Petites missions", desc: "Entraide entre voisins : promener un chien, arroser un jardin. Pas d'argent — un bon repas, un coup de main, du lien." },
  { icon: Siren, title: "Gardiens d'urgence", desc: "Des gardiens expérimentés, mobilisables rapidement parce qu'ils sont à côté. Le filet de sécurité que vous méritez." },
];

const promiseLines = [
  "L'échange entre le propriétaire et le gardien se décide entre vous.",
  "Guardiens fournit l'espace — pas la transaction.",
  "Un prix. Transparent. C'est tout.",
];

const faqItems = [
  {
    q: "Pourquoi c'est gratuit pour les propriétaires ?",
    a: "Plus il y a d'annonces, plus les gardiens ont de choix, plus la communauté est vivante. Les propriétaires alimentent la plateforme — c'est logique qu'ils publient gratuitement.",
  },
  {
    q: "Pourquoi le 13 mai ?",
    a: "C'est l'anniversaire de Jérémie, cofondateur de Guardiens. Il a préféré offrir l'accès gratuit à la communauté plutôt que recevoir des chaussettes. Les inscrits avant cette date reçoivent le badge Fondateur et un accès gratuit jusqu'au 13 juin.",
  },
  {
    q: "Que se passe-t-il après le 13 mai pour les Fondateurs ?",
    a: "Les Fondateurs (inscrits avant le 13 mai) conservent un accès gratuit jusqu'au 13 juin 2026 — un mois de grâce pour décider. Après le 13 juin, l'abonnement à 9€/mois est nécessaire pour garder l'accès complet. Le badge Fondateur reste à vie dans tous les cas.",
  },
  {
    q: "Est-ce que 9€/mois c'est rentable ?",
    a: "Un seul week-end en house-sitting, c'est 0€ de logement. Comparez avec un Airbnb à 80€/nuit ou un hôtel : 9€/mois c'est rentabilisé dès la première garde.",
  },
  {
    q: "Y a-t-il des frais cachés ?",
    a: "Non. 9€/mois pour les gardiens (ou moins avec le tarif annuel proratisé), gratuit pour les propriétaires, aucune commission sur les gardes classiques. Le seul supplément : 70€ par partie pour les gardes longue durée de 30 jours et plus.",
  },
  {
    q: "Pourquoi pas d'assurance ou de protection logement ?",
    a: "Les couvertures proposées par d'autres plateformes reposent en réalité sur l'assurance habitation que vous avez déjà — avec des conditions, des plafonds, et des formulaires. On préfère être honnêtes : votre assurance habitation vous couvre. Ce qu'on vous offre en plus, c'est un réseau de gardiens locaux mobilisables, un annuaire de vétos partenaires, et la tranquillité de savoir que quelqu'un de confiance est à 15 minutes de chez vous.",
  },
];


const Pricing = () => {
  const before = isBeforeLaunch();
  const grace = isInGracePeriod();
  const { price: prorataPrice, months: prorataMonths } = calculateYearlyProrata();
  return (
    <>
      <PageMeta
        title="Tarifs Guardiens — 9€/mois gardien, gratuit propriétaire | House-sitting AURA"
        description="Guardiens : 9€/mois pour les gardiens (ou tarif annuel proratisé -20%), gratuit pour les propriétaires. Aucune commission sur les gardes."
      />

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="font-heading text-2xl font-bold tracking-tight">
              <span className="text-primary">g</span>
              <span className="text-foreground">uardiens</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/actualites" className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline">Guides & Conseils</Link>
              <Link to="/guides" className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline">Guides</Link>
              <Link to="/faq" className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline">FAQ</Link>
              <Link to="/login">
                <Button variant="outline" size="sm">Connexion</Button>
              </Link>
              <Link to="/register">
                <Button size="sm">S'inscrire</Button>
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-12 space-y-16">
          {/* H1 */}
          <section className="text-center space-y-4">
            <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground">
              Des tarifs simples et honnêtes
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Pas de frais cachés, pas de commission sur les gardes. Un abonnement mensuel pour les gardiens, résiliable à tout moment.
            </p>
          </section>

          {/* Founder Banner */}
          {before && (
            <section
              className="rounded-2xl p-6 md:p-8 text-center space-y-4 border-2"
              style={{
                backgroundColor: "hsl(45 100% 96%)",
                borderColor: "hsl(24 36% 60%)",
              }}
            >
              <div className="flex items-center justify-center gap-2">
                <Star className="h-6 w-6" style={{ color: "hsl(24 36% 60%)" }} fill="hsl(24 36% 60%)" />
                <h2 className="font-heading text-2xl font-bold text-foreground">Inscrivez-vous avant le 13 mai 2026</h2>
                <Star className="h-6 w-6" style={{ color: "hsl(24 36% 60%)" }} fill="hsl(24 36% 60%)" />
              </div>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Badge Fondateur à vie + accès gratuit jusqu'au 13 juin 2026 (1 mois de grâce après le lancement).
                Pourquoi le 13 mai ? C'est l'anniversaire de Jérémie, cofondateur de Guardiens.
                Et comme cadeau, il préfère vous offrir l'accès gratuit plutôt que recevoir des chaussettes.
              </p>
              <Link to="/register">
                <Button variant="hero" size="xl" className="mt-2">
                  <Gift className="h-5 w-5 mr-2" />
                  En profiter avant le 13 mai
                </Button>
              </Link>
            </section>
          )}

          {/* Grace period banner (between May 13 and June 13) */}
          {grace && (
            <section
              className="rounded-2xl p-6 md:p-8 text-center space-y-4 border-2"
              style={{
                backgroundColor: "hsl(45 100% 96%)",
                borderColor: "hsl(24 36% 60%)",
              }}
            >
              <div className="flex items-center justify-center gap-2">
                <Star className="h-6 w-6" style={{ color: "hsl(24 36% 60%)" }} fill="hsl(24 36% 60%)" />
                <h2 className="font-heading text-2xl font-bold text-foreground">Les Fondateurs ont jusqu'au 13 juin</h2>
                <Star className="h-6 w-6" style={{ color: "hsl(24 36% 60%)" }} fill="hsl(24 36% 60%)" />
              </div>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Les membres inscrits avant le 13 mai conservent un accès gratuit jusqu'au 13 juin.
                Après cette date, l'abonnement à 9€/mois sera nécessaire. Le badge Fondateur reste à vie.
              </p>
            </section>
          )}

          {/* 2 Pricing Cards */}
          <section className="grid md:grid-cols-2 gap-6 md:gap-8 items-start">
            {/* Owner Card */}
            <Card className="border-border">
              <CardHeader className="text-center pb-2">
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Propriétaire</div>
                <CardTitle className="font-heading text-4xl font-bold text-foreground">Gratuit</CardTitle>
                <p className="text-muted-foreground text-sm mt-1">Gratuit en 2026. Pas de piège.</p>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <ul className="space-y-3">
                  {ownerFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/register" className="block">
                  <Button className="w-full" size="lg">S'inscrire gratuitement</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Sitter Card — highlighted */}
            <Card className="border-primary border-2 relative shadow-lg md:scale-105">
              {before && (
                <div
                  className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1.5"
                  style={{ backgroundColor: "hsl(24 36% 60%)", color: "white" }}
                >
                  <Star className="h-3.5 w-3.5" fill="white" />
                  Badge Fondateur à vie
                </div>
              )}
              <CardHeader className="text-center pb-2 pt-8">
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Gardien</div>
                {before ? (
                  <div className="space-y-1">
                    <span className="text-sm font-semibold text-primary uppercase">GRATUIT jusqu'au 13 juin</span>
                    <CardTitle className="font-heading text-4xl font-bold text-muted-foreground line-through">9€/mois</CardTitle>
                    <p className="text-xs text-muted-foreground">Inscription avant le 13 mai → accès gratuit jusqu'au 13 juin 2026</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <CardTitle className="font-heading text-4xl font-bold text-foreground">9€<span className="text-lg font-normal text-muted-foreground"> / mois</span></CardTitle>
                    <p className="text-sm text-muted-foreground">Sans engagement · ou {prorataPrice}€ pour finir 2026 (-20%)</p>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <ul className="space-y-3">
                  {sitterFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/register" className="block">
                  <Button className="w-full" variant="hero" size="lg">
                    {before ? "S'inscrire gratuitement" : "Commencer à 9€/mois"}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </section>

          {/* Long stays */}
          <section className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="font-heading text-2xl font-bold text-foreground">Pour les gardes de 30 jours et plus</h2>
            <p className="text-muted-foreground">
              Les gardes longue durée nécessitent des frais de service de <strong className="text-foreground">70€ par partie</strong> (propriétaire et gardien) à la confirmation.
              C'est un gage d'engagement mutuel : quelqu'un qui paye 70€ ne confirme pas à la légère.
            </p>
          </section>

          {/* Strengths Grid */}
          <section className="space-y-6">
            <h2 className="font-heading text-2xl font-bold text-foreground text-center">Tout ça, c'est Guardiens</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {strengthBlocks.map((block) => (
                <Card key={block.title} className="border-border">
                  <CardContent className="pt-6 space-y-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <block.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-heading font-bold text-foreground">{block.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{block.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Promise */}
          <section className="max-w-2xl mx-auto space-y-6 text-center">
            <h2 className="font-heading text-2xl font-bold text-foreground">Notre promesse — Simple, honnête, et c'est tout</h2>
            <div className="space-y-4">
              {promiseLines.map((line) => (
                <p key={line} className="text-lg text-foreground/80 leading-relaxed">{line}</p>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="max-w-3xl mx-auto space-y-6">
            <h2 className="font-heading text-2xl font-bold text-foreground text-center">Questions fréquentes</h2>
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left font-medium">{item.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          {/* CTA final */}
          <section className="text-center space-y-4 py-8">
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              {before
                ? "Inscrivez-vous maintenant — accès gratuit jusqu'au 13 juin + badge Fondateur à vie."
                : "49€/an pour les gardiens. Gratuit pour les propriétaires. Sans engagement."}
            </p>
            <Link to="/register">
              <Button variant="hero" size="xl">S'inscrire</Button>
            </Link>
          </section>

          {/* Schema.org FAQPage */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: faqItems.map((item) => ({
                  "@type": "Question",
                  name: item.q,
                  acceptedAnswer: { "@type": "Answer", text: item.a },
                })),
              }),
            }}
          />
        </main>

        {/* Footer */}
        <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
          <div className="max-w-6xl mx-auto px-4 flex flex-wrap justify-center gap-4">
            <Link to="/a-propos" className="hover:text-foreground">À propos</Link>
            <Link to="/contact" className="hover:text-foreground">Contact</Link>
            <Link to="/cgu" className="hover:text-foreground">CGU</Link>
            <Link to="/confidentialite" className="hover:text-foreground">Confidentialité</Link>
            <Link to="/mentions-legales" className="hover:text-foreground">Mentions légales</Link>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Pricing;
