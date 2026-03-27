import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, Star, Gift } from "lucide-react";
import PageMeta from "@/components/PageMeta";

const LAUNCH_DATE = new Date("2026-05-13T00:00:00");
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

const comparisonRows = [
  { label: "Propriétaire", guardiens: "Gratuit", trusted: "$149–$299/an", nomador: "34€/3 mois à 179€/an" },
  { label: "Gardien", guardiens: "49€/an", trusted: "$129–$259/an + $10/garde", nomador: "34€/3 mois à 179€/an" },
  { label: "Frais par garde", guardiens: "Aucun", trusted: "$10 par garde", nomador: "Aucun" },
  { label: "Nombre de formules", guardiens: "1 seule — simple", trusted: "3 niveaux", nomador: "3 formules" },
  { label: "Proximité locale", guardiens: true, trusted: false, nomador: false },
  { label: "Guide de la maison", guardiens: true, trusted: true, nomador: false },
  { label: "Vétos", guardiens: "Annuaire local", trusted: "Hotline (Standard+)", nomador: false },
  { label: "Couvertures / assurances", guardiens: "Votre assurance habitation", trusted: "Plans avec conditions", nomador: "Repose sur votre assurance" },
  { label: "Fiches races auto-générées", guardiens: true, trusted: false, nomador: false },
  { label: "Guides locaux (parcs, vétos, balades)", guardiens: true, trusted: false, nomador: false },
  { label: "Gardiens d'urgence", guardiens: true, trusted: false, nomador: false },
  { label: "Avis croisés", guardiens: "Détaillés avec sous-critères", trusted: "Blind reviews", nomador: "Badges" },
  { label: "Vérification ID", guardiens: true, trusted: true, nomador: true },
  { label: "Simplicité", guardiens: "1 prix, 0 frais", trusted: "3 niveaux × 2 rôles", nomador: "3 formules, conditions variables" },
];

const faqItems = [
  {
    q: "Pourquoi c'est gratuit pour les propriétaires ?",
    a: "Plus il y a d'annonces, plus les gardiens ont de choix, plus la communauté est vivante. Les propriétaires alimentent la plateforme — c'est logique qu'ils publient gratuitement.",
  },
  {
    q: "Pourquoi le 13 mai ?",
    a: "C'est l'anniversaire de Jérémie, cofondateur de Guardiens. Il a préféré offrir l'accès gratuit à la communauté plutôt que recevoir des chaussettes. Les inscrits avant cette date reçoivent le badge Fondateur et 1 an d'accès gratuit.",
  },
  {
    q: "Que se passe-t-il quand mon année gratuite expire ?",
    a: "Vous recevez un rappel 30 jours avant. Vous pouvez renouveler pour 49€/an. Votre profil, vos avis et votre historique sont conservés. Vos gardes en cours ne sont pas affectées.",
  },
  {
    q: "Est-ce que 49€/an c'est rentable ?",
    a: "Un seul week-end en house-sitting, c'est 0€ de logement. Comparez avec un Airbnb à 80€/nuit ou un hôtel : 49€ c'est rentabilisé dès la première garde.",
  },
  {
    q: "Y a-t-il des frais cachés ?",
    a: "Non. 49€/an pour les gardiens, gratuit pour les propriétaires, aucune commission sur les gardes classiques. Le seul supplément : 70€ par partie pour les gardes longue durée de 30 jours et plus.",
  },
  {
    q: "Pourquoi pas d'assurance ou de protection logement ?",
    a: "Les couvertures proposées par d'autres plateformes reposent en réalité sur l'assurance habitation que vous avez déjà — avec des conditions, des plafonds, et des formulaires. On préfère être honnêtes : votre assurance habitation vous couvre. Ce qu'on vous offre en plus, c'est un réseau de gardiens locaux mobilisables, un annuaire de vétos partenaires, et la tranquillité de savoir que quelqu'un de confiance est à 15 minutes de chez vous.",
  },
];

const CellValue = ({ value }: { value: boolean | string }) => {
  if (typeof value === "string") return <span className="font-semibold">{value}</span>;
  return value ? (
    <Check className="h-5 w-5 text-primary mx-auto" />
  ) : (
    <X className="h-5 w-5 text-muted-foreground/40 mx-auto" />
  );
};

const Pricing = () => {
  const before = isBeforeLaunch();

  return (
    <>
      <PageMeta
        title="Tarifs Guardiens — 49€/an gardien, gratuit propriétaire | Comparatif house-sitting"
        description="Guardiens : 49€/an pour les gardiens, gratuit pour les propriétaires. Aucune commission. Comparez avec TrustedHousesitters ($129-$299/an + $10/garde) et Nomador (34-179€/an)."
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
              <Link to="/actualites" className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline">Actualités</Link>
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
              Pas de frais cachés, pas de commission sur les gardes. Juste un abonnement annuel pour les gardiens.
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
                <h2 className="font-heading text-2xl font-bold text-foreground">Gratuit jusqu'au 13 mai 2026</h2>
                <Star className="h-6 w-6" style={{ color: "hsl(24 36% 60%)" }} fill="hsl(24 36% 60%)" />
              </div>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Inscrivez-vous avant le 13 mai et profitez d'1 an d'accès gratuit + le badge Fondateur à vie.
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
                    <span className="text-sm font-semibold text-primary uppercase">GRATUIT jusqu'au 13 mai</span>
                    <CardTitle className="font-heading text-4xl font-bold text-muted-foreground line-through">49€/an</CardTitle>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <CardTitle className="font-heading text-4xl font-bold text-foreground">49€<span className="text-lg font-normal text-muted-foreground"> / an</span></CardTitle>
                    <p className="text-sm text-muted-foreground">Moins de 5€ par mois pour des expériences incroyables</p>
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
                    {before ? "S'inscrire gratuitement" : "S'abonner — 49€/an"}
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

          {/* Comparison Table */}
          <section className="space-y-6">
            <h2 className="font-heading text-2xl font-bold text-foreground text-center">Comparez en toute transparence</h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/4"></TableHead>
                    <TableHead className="text-center font-bold text-primary">Guardiens</TableHead>
                    <TableHead className="text-center">TrustedHousesitters</TableHead>
                    <TableHead className="text-center">Nomador</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonRows.map((row) => (
                    <TableRow key={row.label}>
                      <TableCell className="font-medium">{row.label}</TableCell>
                      <TableCell className="text-center">
                        <CellValue value={row.guardiens} />
                      </TableCell>
                      <TableCell className="text-center">
                        <CellValue value={row.trusted} />
                      </TableCell>
                      <TableCell className="text-center">
                        <CellValue value={row.nomador} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground text-center max-w-3xl mx-auto">
              Comparaison réalisée de bonne foi à titre informatif, sur la base des tarifs publics affichés sur les sites respectifs en mars 2026. Elle ne constitue ni un dénigrement ni une publicité comparative au sens de l'article L. 122-1 du Code de la consommation. TrustedHousesitters facture en dollars US — les prix en euros varient selon le taux de change. Nomador propose des formules trimestrielles et annuelles. Les fonctionnalités listées reflètent les offres publiquement disponibles à la date indiquée et peuvent évoluer. Sources :{" "}
              <a href="https://www.trustedhousesitters.com/pricing" target="_blank" rel="noopener noreferrer" className="underline">trustedhousesitters.com/pricing</a>,{" "}
              <a href="https://www.nomador.com/tarifs" target="_blank" rel="noopener noreferrer" className="underline">nomador.com/tarifs</a>. Si vous constatez une inexactitude, merci de nous contacter à{" "}
              <a href="mailto:contact@guardiens.fr" className="underline">contact@guardiens.fr</a>.
            </p>
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
                ? "Inscrivez-vous maintenant — c'est gratuit et vous serez Fondateur à vie."
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
