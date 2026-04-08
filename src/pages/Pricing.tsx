import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import { Check, Star, Gift, MapPin, ShieldCheck, Map, PawPrint, Heart, Siren, BadgeCheck, CreditCard } from "lucide-react";
import PageMeta from "@/components/PageMeta";

const LAUNCH_DATE = new Date("2026-05-14T00:00:00Z");
const GRACE_END = new Date("2026-06-13T00:00:00");
const isBeforeLaunch = () => new Date() < LAUNCH_DATE;
const isInGracePeriod = () => { const n = new Date(); return n >= LAUNCH_DATE && n < GRACE_END; };

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
  { icon: MapPin, title: "Gardiens de proximité", desc: "Vos gardiens sont près de chez vous — pas à l'autre bout du pays. Un problème ? Quelqu'un est à 15 minutes." },
  { icon: ShieldCheck, title: "Profils vérifiés", desc: "Identité vérifiée, avis croisés détaillés, écussons qualitatifs. Vous savez à qui vous confiez vos animaux." },
  { icon: Map, title: "Guides locaux", desc: "Parcs, vétérinaires, balades, cafés dog-friendly — tout ce qu'il faut pour que votre gardien se sente chez lui." },
  { icon: PawPrint, title: "Fiches races", desc: "Caractère, besoins, conseils de garde — votre gardien sait exactement comment s'occuper de votre animal." },
  { icon: Heart, title: "Petites missions", desc: "Des coups de main entre gens du coin. Promener un chien, arroser un potager. En échange : un repas, un service rendu. Jamais d'argent." },
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
    a: "Parce qu'on ne facture pas l'accès à ceux qui ouvrent leur maison. Publier une annonce, recevoir des candidatures, choisir un gardien, laisser un avis — tout ça reste gratuit, pour toujours. Les propriétaires font confiance en ouvrant leur porte. On ne fait pas payer ça.",
  },
  {
    q: "Pourquoi le 13 mai ?",
    a: "C'est l'anniversaire de Jérémie, cofondateur de Guardiens. Il a préféré offrir l'accès à la communauté plutôt que recevoir des cadeaux. Les inscrits avant cette date reçoivent le badge Fondateur à vie — une marque de première heure qui ne sera plus jamais attribuée.",
  },
  {
    q: "Que se passe-t-il après le 13 mai pour les Fondateurs ?",
    a: "Votre accès reste gratuit jusqu'au 13 juin 2026. Trois formules sont ensuite proposées : 12 € pour un mois, 9 €/mois avec 7 jours d'essai, ou un tarif 2026 en paiement unique à -20 %. Rien ne démarre automatiquement. Votre badge Fondateur reste à vie.",
  },
  {
    q: "Y a-t-il des frais cachés ?",
    a: "Non. L'accès gardien : 9 €/mois, 12 € pour un mois, ou la formule 2026 à -20 %. L'accès propriétaire : gratuit en permanence. Aucune commission sur les gardes. Un prix. Transparent.",
  },
];


const Pricing = () => {
  const before = isBeforeLaunch();
  const grace = isInGracePeriod();

  const msLeft = Math.max(0, LAUNCH_DATE.getTime() - new Date().getTime());
  const daysLeft = Math.ceil(msLeft / 86400000);

  return (
    <>
      <PageMeta
        title="Tarifs Guardiens — 9€/mois pour les gardiens"
        description="Gratuit pour les propriétaires. 9€/mois pour les gardiens avec 30 jours d'essai offerts."
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
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-body">
              Pas de frais cachés, pas de commission sur les gardes. Un abonnement mensuel pour les gardiens, résiliable à tout moment.
            </p>
          </section>

          {/* Founder Banner */}
          {before && (
            <section>
              <div className="w-full max-w-3xl mx-auto bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
                {/* Bande supérieure */}
                <div className="bg-amber-100 px-6 py-3 flex items-center justify-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" aria-hidden="true" />
                  <span className="text-sm font-medium text-amber-800 font-body tracking-wide">
                    Offre Fondateur — jusqu'au 13 mai 2026
                  </span>
                  <Star className="w-4 h-4 text-amber-500" aria-hidden="true" />
                </div>

                {/* Corps */}
                <div className="px-6 sm:px-10 py-8 space-y-6 text-center">
                  {/* Compte à rebours */}
                  <div className="space-y-1">
                    <p className="font-heading text-5xl font-bold text-amber-700 tabular-nums">
                      {daysLeft}
                    </p>
                    <p className="text-sm text-amber-600 font-body">
                      jour{daysLeft > 1 ? 's' : ''} restants pour rejoindre les Fondateurs
                    </p>
                  </div>

                  {/* 3 avantages en ligne */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-8">
                    <div className="flex items-center gap-2 text-sm text-amber-800 font-body">
                      <BadgeCheck className="w-4 h-4 text-amber-600 flex-shrink-0" aria-hidden="true" />
                      Badge Fondateur à vie
                    </div>
                    <div className="flex items-center gap-2 text-sm text-amber-800 font-body">
                      <Gift className="w-4 h-4 text-amber-600 flex-shrink-0" aria-hidden="true" />
                      Accès gratuit jusqu'au 13 juin
                    </div>
                    <div className="flex items-center gap-2 text-sm text-amber-800 font-body">
                      <CreditCard className="w-4 h-4 text-amber-600 flex-shrink-0" aria-hidden="true" />
                      Sans carte bancaire
                    </div>
                  </div>

                  {/* Anecdote */}
                  <p className="text-sm text-amber-700/80 font-body italic max-w-md mx-auto leading-relaxed">
                    Pourquoi le 13 mai ? C'est l'anniversaire de Jérémie, cofondateur de Guardiens.
                    Il préfère offrir l'accès plutôt que recevoir des chaussettes.
                  </p>

                  {/* CTA */}
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 bg-primary text-white font-body font-medium text-sm px-8 py-3.5 rounded-xl hover:bg-primary/90 transition-colors min-h-[44px]"
                  >
                    S'inscrire avant le 13 mai
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* Grace period banner (between May 14 and June 13) */}
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
              <p className="text-muted-foreground max-w-2xl mx-auto font-body">
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
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2 font-body">Propriétaire</div>
                <CardTitle className="font-heading text-4xl font-bold text-foreground">Gratuit</CardTitle>
                <p className="text-muted-foreground text-sm mt-1 font-body">Gratuit en 2026. C'est une décision de fond.</p>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <ul className="space-y-3">
                  {ownerFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-foreground font-body">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/register" className="block">
                  <Button className="w-full min-h-[44px]" size="lg">S'inscrire gratuitement</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Sitter Card — highlighted */}
            <Card className="border-primary border-2 relative shadow-lg md:scale-105">
              {before && (
                <div
                  className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1.5 font-body"
                  style={{ backgroundColor: "hsl(24 36% 60%)", color: "white" }}
                >
                  <Star className="h-3.5 w-3.5" fill="white" />
                  Badge Fondateur à vie
                </div>
              )}
              <CardHeader className="text-center pb-2 pt-8">
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2 font-body">Gardien</div>
                {before ? (
                  <div className="text-center space-y-1 py-2">
                    <p className="text-xs uppercase tracking-widest text-primary font-body font-medium">
                      Gratuit jusqu'au 13 juin
                    </p>
                    <p className="font-heading text-4xl font-bold text-foreground">
                      à partir de 9€
                      <span className="text-base font-body font-normal text-foreground/60 ml-1">
                        /mois
                      </span>
                    </p>
                    <p className="text-xs text-foreground/50 font-body">
                      Sans engagement · Résiliable à tout moment
                    </p>
                  </div>
                ) : (
                  <div className="text-center space-y-1 py-2">
                    <p className="font-heading text-4xl font-bold text-foreground">
                      à partir de 9€
                      <span className="text-base font-body font-normal text-foreground/60 ml-1">
                        /mois
                      </span>
                    </p>
                    <p className="text-xs text-foreground/50 font-body">
                      Sans engagement · Résiliable à tout moment
                    </p>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <ul className="space-y-3">
                  {sitterFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-foreground font-body">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* Bloc formules */}
                <div className="bg-muted/50 rounded-xl px-5 py-4 space-y-3 text-left">
                  <p className="text-xs uppercase tracking-widest text-foreground/50 font-body">
                    Trois formules
                  </p>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground font-body">
                        Accès un mois
                      </p>
                      <p className="text-xs text-foreground/50 font-body">
                        Paiement immédiat · Sans renouvellement
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-foreground font-body flex-shrink-0">
                      12€
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground font-body">
                        Mensuel
                      </p>
                      <p className="text-xs text-foreground/50 font-body">
                        7 jours d'essai · Annulable à tout moment
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-primary font-body flex-shrink-0">
                      9€/mois
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground font-body">
                        Jusqu'au 31 décembre 2026
                      </p>
                      <p className="text-xs text-foreground/50 font-body">
                        Paiement unique · -20% sur le mensuel
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-primary font-body flex-shrink-0">
                      Offre 2026
                    </span>
                  </div>
                </div>

                {/* CTA */}
                <div className="space-y-2 pt-2">
                  <Link
                    to="/register"
                    className="w-full inline-flex items-center justify-center bg-primary text-white font-body font-medium text-sm px-6 py-3.5 rounded-xl hover:bg-primary/90 transition-colors min-h-[44px]"
                  >
                    S'inscrire gratuitement
                  </Link>
                  <Link
                    to="/faq#formules"
                    className="w-full inline-flex items-center justify-center text-sm font-body text-foreground/60 hover:text-foreground transition-colors py-2"
                  >
                    Questions sur les formules →
                  </Link>
                </div>
              </CardContent>
            </Card>
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
                    <p className="text-sm text-muted-foreground leading-relaxed font-body">{block.desc}</p>
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
                <p key={line} className="text-lg text-foreground/80 leading-relaxed font-body">{line}</p>
              ))}
            </div>
          </section>

          {/* Internal links — city pages + urgence */}
          <section className="max-w-3xl mx-auto space-y-4">
            <h2 className="font-heading text-xl font-bold text-foreground text-center">House-sitting par ville</h2>
            <p className="text-sm text-muted-foreground text-center font-body">
              Découvrez les gardiens vérifiés disponibles dans votre ville. Un imprévu ? Nos{" "}
              <Link to="/gardien-urgence" className="text-primary hover:underline">gardiens d'urgence</Link>{" "}
              sont mobilisables en quelques heures.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/house-sitting/lyon" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-body text-foreground hover:border-primary/40 hover:text-primary transition-colors">
                <MapPin className="h-3.5 w-3.5" /> Lyon
              </Link>
              <Link to="/house-sitting/annecy" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-body text-foreground hover:border-primary/40 hover:text-primary transition-colors">
                <MapPin className="h-3.5 w-3.5" /> Annecy
              </Link>
              <Link to="/house-sitting/grenoble" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-body text-foreground hover:border-primary/40 hover:text-primary transition-colors">
                <MapPin className="h-3.5 w-3.5" /> Grenoble
              </Link>
               <Link to="/house-sitting/valence" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-body text-foreground hover:border-primary/40 hover:text-primary transition-colors">
                 <MapPin className="h-3.5 w-3.5" /> Valence
               </Link>
            </div>
          </section>

          {/* FAQ */}
          <section className="max-w-3xl mx-auto space-y-6">
            <h2 className="font-heading text-2xl font-bold text-foreground text-center">Questions fréquentes</h2>
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left font-medium font-body">{item.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground font-body">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          {/* CTA final */}
          <section className="text-center space-y-4 py-8">
            <p className="text-lg text-muted-foreground max-w-xl mx-auto font-body">
              {before
                ? "Rejoignez les Fondateurs avant le 13 mai — badge à vie, accès jusqu'au 13 juin."
                : "9€/mois pour les gardiens. Gratuit pour les propriétaires. Sans engagement."}
            </p>
            <Link to="/register">
              <Button variant="hero" size="xl" className="min-h-[44px]">S'inscrire</Button>
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
