import { useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import { Check, CheckCircle, Star, Gift, MapPin, ShieldCheck, Map, PawPrint, Heart, Siren, BadgeCheck, CreditCard } from "lucide-react";
import PageMeta from "@/components/PageMeta";

const LAUNCH_DATE = new Date("2026-05-14T00:00:00Z");
const GRACE_END = new Date("2026-06-13T00:00:00");
const isBeforeLaunch = () => new Date() < LAUNCH_DATE;
const isInGracePeriod = () => { const n = new Date(); return n >= LAUNCH_DATE && n < GRACE_END; };

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

const strengthBlocks = [
  { icon: MapPin, title: "Gardiens de proximité", desc: "Tes gardiens sont des gens du coin — pas à l'autre bout du pays. Un problème ? Quelqu'un est à 15 minutes." },
  { icon: ShieldCheck, title: "Identités confirmées", desc: "Identité confirmée, avis croisés détaillés, écussons qualitatifs. Tu sais à qui tu confies tes animaux." },
  { icon: Map, title: "Guides locaux", desc: "Parcs, vétérinaires, balades, cafés dog-friendly — tout ce qu'il faut pour que ton gardien se sente chez lui." },
  { icon: PawPrint, title: "Fiches races", desc: "Caractère, besoins, conseils de garde — ton gardien sait exactement comment s'occuper de ton animal." },
  { icon: Heart, title: "Petites missions", desc: "Des coups de main entre gens du coin. Promener un chien, arroser un potager. En échange : un repas, un service rendu. Jamais d'argent." },
  { icon: Siren, title: "Gardiens d'urgence", desc: "Des gardiens expérimentés, mobilisables rapidement parce qu'ils sont à côté. Le filet de sécurité que tu mérites." },
];

const promiseLines = [
  { text: "L'échange entre le propriétaire et le gardien se décide entre vous.", weight: "text-base md:text-lg font-medium text-foreground/80" },
  { text: "Guardiens fournit l'espace — pas la transaction.", weight: "text-sm text-foreground/60" },
  { text: "Un prix. Transparent. C'est tout.", weight: "text-base font-heading font-semibold text-foreground mt-2" },
];

const faqItems = [
  {
    q: "Pourquoi c'est gratuit pour les propriétaires ?",
    a: `Parce qu'on ne facture pas l'accès à ceux qui ouvrent leur maison.

Publier une annonce, recevoir des candidatures, échanger avec les gardiens, laisser un avis — tout ça reste gratuit, pour toujours. Ce n'est pas une offre d'appel : c'est une décision de fond sur le modèle économique.

Guardiens gagne de l'argent uniquement sur l'abonnement des gardiens. Les propriétaires n'ont aucune raison de payer pour accéder à des gens de confiance qui veulent garder leur maison — c'est l'échange qui a de la valeur, pas l'accès.

Pour comprendre comment fonctionne la mise en relation : [Comment bien choisir son gardien →](/actualites/choisir-gardien-bons-criteres)`,
  },
  {
    q: "Pourquoi le 13 mai ?",
    a: `C'est l'anniversaire de Jérémie, cofondateur de Guardiens.

Quand on a fixé la date de lancement, il aurait pu choisir une date "stratégique". Il a préféré son anniversaire. Et plutôt que de recevoir des cadeaux, il a décidé d'offrir l'accès gratuit à ceux qui nous rejoignent avant cette date.

Les inscrits avant le 13 mai 2026 deviennent **Fondateurs** : accès gratuit jusqu'au 13 juin pour choisir leur formule, badge Fondateur affiché à vie sur leur profil. Ce badge ne sera plus jamais attribué après cette date.

Pourquoi le 13 juin et pas le 13 mai ? Un mois de grâce. Le lancement, c'est le début d'une aventure — pas d'une facture.

Toutes les questions sur les formules : [FAQ complète →](/faq)`,
  },
  {
    q: "Que se passe-t-il après le 13 mai pour les Fondateurs ?",
    a: `Votre accès reste gratuit jusqu'au 13 juin 2026. Rien ne démarre automatiquement.

Avant le 13 juin, vous choisissez la formule qui vous convient depuis votre espace abonnement :

- **Accès un mois — 12 €** : paiement immédiat, aucun renouvellement
- **Mensuel — 9 €/mois** : 7 jours d'essai offerts, annulable à tout moment
- **Formule 2026 — tarif réduit** : paiement unique jusqu'au 31 décembre, -20 % sur le mensuel

Votre badge Fondateur reste affiché à vie sur votre profil, quelle que soit la formule choisie ensuite.

Si vous attendez après le 13 juin sans avoir souscrit, votre accès s'interrompt temporairement. Votre profil, vos avis et votre historique sont conservés.

Pour bien démarrer en tant que gardien : [Créer un profil qui attire des missions →](/actualites/creer-profil-gardien-attractif)`,
  },
  {
    q: "Y a-t-il des frais cachés ?",
    a: `Non. Et on préfère l'expliquer clairement plutôt que de le promettre.

**Ce que paient les gardiens :** 9 €/mois, 12 € pour un mois, ou la formule 2026 à -20 %. C'est tout. L'abonnement donne accès à la plateforme — postuler aux gardes, envoyer des messages, apparaître dans les résultats.

**Ce que paient les propriétaires :** Rien. Publier, recevoir des candidatures, choisir, évaluer — gratuit en permanence.

**Ce qu'on ne prend pas :** Aucune commission sur les gardes. L'échange entre gardien et propriétaire se décide entre eux, sans que Guardiens ne touche quoi que ce soit.

Pas d'assurance obligatoire, pas de booking fee, pas de frais de mise en relation. Un abonnement. Transparent.

Pour comprendre le bien-être de vos animaux pendant la garde : [Bien-être animal pendant votre absence →](/actualites/bien-etre-animal-pendant-absence)`,
  },
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

        <main className="max-w-6xl mx-auto px-4">
          {/* ═══ ZONE 1 — Compréhension rapide ═══ */}
          <section className="text-center py-12 md:py-16 space-y-4">
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground leading-tight">
              Des tarifs simples et honnêtes
            </h1>
            <p className="text-lg font-body text-foreground/60 max-w-xl mx-auto">
              Pas de frais cachés, pas de commission sur les gardes. Un abonnement mensuel pour les gardiens, résiliable à tout moment.
            </p>
          </section>

          {/* Founder Banner */}
          {before && (
            <section className="mt-0 mb-10 md:mb-14">
              <div className="w-full max-w-3xl mx-auto bg-amber-50 border border-amber-200/60 rounded-2xl overflow-hidden">
                {/* Bande supérieure */}
                <div className="bg-amber-100 px-6 py-3 flex items-center justify-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" aria-hidden="true" />
                  <span className="text-sm font-medium text-amber-800 font-body tracking-wide">
                    Offre Fondateur — jusqu'au 13 mai 2026
                  </span>
                  <Star className="w-4 h-4 text-amber-500" aria-hidden="true" />
                </div>

                <div className="px-6 sm:px-10 py-8 flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
                  {/* Colonne gauche — Compte à rebours */}
                  <div className="flex-1 text-center space-y-1">
                    <p className="font-heading text-4xl font-bold text-amber-700 tabular-nums">
                      {daysLeft}
                    </p>
                    <p className="text-xs text-amber-600/80 font-body">
                      jour{daysLeft > 1 ? 's' : ''} restants
                    </p>
                  </div>

                  {/* Colonne centre — 3 avantages */}
                  <div className="flex-1 flex flex-col items-center md:items-start gap-3">
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

                  {/* Colonne droite — Anecdote + CTA */}
                  <div className="flex-1 flex flex-col items-center gap-4 text-center">
                    <p className="text-xs italic text-amber-700/70 font-body max-w-xs leading-relaxed">
                      Pourquoi le 13 mai ? C'est l'anniversaire de Jérémie, cofondateur de Guardiens.
                      Il préfère offrir l'accès plutôt que recevoir des chaussettes.
                    </p>
                    <Link
                      to="/register"
                      className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-body font-medium text-sm px-8 py-3.5 rounded-xl hover:bg-primary/90 transition-colors min-h-[44px]"
                    >
                      S'inscrire avant le 13 mai
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Grace period banner (between May 14 and June 13) */}
          {grace && (
            <section
              className="rounded-2xl p-6 md:p-8 text-center space-y-4 border-2 mb-16 md:mb-24"
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

          {/* Bandeau entraide */}
          <div className="max-w-3xl mx-auto mb-12">
            <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
              <h2 className="font-heading text-xl md:text-2xl font-semibold text-foreground mb-3">
                L'entraide entre gens du coin reste libre pour tous
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Arroser un potager, promener un chien le weekend, garder des poules pendant le marché — ces coups de main ponctuels entre gens du coin ne coûteront jamais rien. Ni aux propriétaires, ni aux gardiens. Pas d'argent, pas d'abonnement.
              </p>
              <p className="text-sm text-muted-foreground">
                Les tarifs ci-dessous concernent uniquement les gardes avec hébergement.
              </p>
            </div>
          </div>

          {/* ═══ ZONE 2 — Détail des offres ═══ */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto items-stretch mb-10 md:mb-14">
            {/* Owner Card */}
            <Card className="bg-card border border-border/40 rounded-2xl h-full flex flex-col relative">
              {before && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary/10 text-primary text-xs font-body font-medium px-3 py-1 rounded-full flex items-center gap-1.5">
                  <CheckCircle className="h-3 w-3" />
                  Gratuit pour toujours
                </div>
              )}
              <CardHeader className={`text-center pb-2 p-8 ${before ? 'pt-10' : ''}`}>
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 font-body">Propriétaire</div>
                <CardTitle className="font-heading text-5xl font-bold text-foreground">Gratuit</CardTitle>
                <p className="text-sm font-body text-foreground/60 italic mt-2">Parce qu'on ne facture pas ceux qui ouvrent leur maison.</p>
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
                <p className="text-xs font-body text-foreground/50 text-center italic">Gratuit maintenant, gratuit toujours.</p>
                <div className="mt-auto">
                  <Link to="/register" className="block">
                    <Button variant="outline" className="w-full min-h-[44px] font-body border-2 border-foreground/20 hover:border-foreground/40 text-foreground/60 hover:text-foreground bg-transparent transition-colors duration-200" size="lg">S'inscrire gratuitement</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Sitter Card — highlighted */}
            <Card className="border-2 border-primary/20 relative shadow-xl rounded-2xl md:scale-105 h-full flex flex-col bg-primary/5">
              {before && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-100 text-amber-800 text-xs font-body font-medium px-3 py-1 rounded-full flex items-center gap-1.5">
                  <Star className="h-3 w-3" fill="currentColor" />
                  Badge Fondateur à vie
                </div>
              )}
              <CardHeader className="text-center pb-2 p-8 pt-10">
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 font-body">Gardien</div>
                {before ? (
                  <div className="text-center space-y-1.5 py-2">
                    <p className="text-xs uppercase tracking-widest text-primary font-body font-semibold">
                      Gratuit jusqu'au 13 juin
                    </p>
                    <p className="font-heading text-5xl font-bold text-foreground">
                      <span className="text-lg font-body font-normal text-foreground/60 mr-1">à partir de</span>
                      9€
                      <span className="text-lg font-body font-normal text-foreground/60 ml-1">
                        /mois
                      </span>
                    </p>
                    <p className="text-xs text-foreground/50 font-body">
                      Sans engagement · Résiliable à tout moment
                    </p>
                  </div>
                ) : (
                  <div className="text-center space-y-1.5 py-2">
                    <p className="font-heading text-5xl font-bold text-foreground">
                      <span className="text-lg font-body font-normal text-foreground/60 mr-1">à partir de</span>
                      9€
                      <span className="text-lg font-body font-normal text-foreground/60 ml-1">
                        /mois
                      </span>
                    </p>
                    <p className="text-xs text-foreground/50 font-body">
                      Sans engagement · Résiliable à tout moment
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

                {/* Bloc formules */}
                <div className="bg-background border border-border/50 rounded-xl p-4 space-y-3 text-left">
                  <p className="text-xs uppercase tracking-widest text-foreground/50 font-body">
                    Trois formules
                  </p>
                  <div
                    onClick={() => setFormule('one_shot')}
                    className={`flex items-start justify-between gap-3 border rounded-lg p-3 cursor-pointer transition-all ${formule === 'one_shot' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                  >
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
                  <div
                    onClick={() => setFormule('mensuel')}
                    className={`flex items-start justify-between gap-3 border rounded-lg p-3 cursor-pointer transition-all ${formule === 'mensuel' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground font-body">
                          Mensuel
                        </p>
                        <span className="text-xs font-body text-primary/70">Le plus choisi</span>
                      </div>
                      <p className="text-xs text-foreground/50 font-body">
                        7 jours d'essai · Annulable à tout moment
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-primary font-body flex-shrink-0">
                      9€/mois
                    </span>
                  </div>
                  <div
                    onClick={() => setFormule('prorata')}
                    className={`flex items-start justify-between gap-3 border rounded-lg p-3 cursor-pointer transition-all ${formule === 'prorata' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground font-body">
                        Prorata 2026
                      </p>
                      <p className="text-xs text-foreground/50 font-body">
                        Mois restants en 2026 × 9€ × 0,8 — paiement unique
                      </p>
                      <p className="text-xs text-foreground/40 italic font-body">
                        Ex. en mai : 7 mois × 9€ × 0,8 = 50,40€
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-primary font-body flex-shrink-0">
                      -20%
                    </span>
                  </div>
                </div>

                {/* CTA */}
                <div className="space-y-1 pt-2 mt-auto">
                  <Link
                    to="/register"
                    className="w-full inline-flex items-center justify-center bg-primary text-primary-foreground font-body font-medium text-sm px-6 py-3.5 rounded-xl hover:bg-primary/90 transition-colors min-h-[44px]"
                  >
                    {ctaLabels[formule]}
                  </Link>
                  <p className="text-xs font-body text-foreground/50 text-center mt-2">
                    Inscription sans carte bancaire. L'abonnement mensuel inclut 7 jours d'essai offerts.
                  </p>
                  <Link
                    to="/faq"
                    className="w-full inline-flex items-center justify-center text-sm font-body text-foreground/60 hover:text-foreground transition-colors py-2"
                  >
                    Consulter la FAQ →
                  </Link>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* ═══ ZONE 3 — Réassurance + action ═══ */}

          {/* Strengths Grid */}
          <section className="mb-10 md:mb-14">
            <h2 className="font-heading text-2xl md:text-3xl font-semibold text-foreground text-center mb-12">Tout ça, c'est Guardiens</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {strengthBlocks.map((block) => (
                <div key={block.title} className="bg-card border border-border/40 rounded-2xl p-6 space-y-3 hover:border-border/80 transition-colors duration-200 h-full flex flex-col">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <block.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-base font-heading font-semibold text-foreground">{block.title}</h3>
                  <p className="text-sm font-body text-foreground/60 leading-relaxed flex-1">{block.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Promise */}
          <section className="max-w-2xl mx-auto text-center mb-10 md:mb-14">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-6">Notre promesse — Simple, honnête, et c'est tout</h2>
            <div className="space-y-3">
              {promiseLines.map((line) => (
                <p key={line.text} className={`leading-relaxed font-body ${line.weight}`}>{line.text}</p>
              ))}
            </div>
          </section>

          {/* Internal links — city pages + urgence */}
          <section className="max-w-3xl mx-auto mb-10 md:mb-14">
            <h2 className="font-heading text-xl font-bold text-foreground text-center mb-4">House-sitting par ville</h2>
            <p className="text-sm text-muted-foreground text-center font-body mb-6">
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
            </div>
          </section>

          {/* FAQ */}
          <section className="max-w-3xl mx-auto mb-10 md:mb-14">
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
          </section>

          {/* CTA final */}
          <section className="text-center py-10 md:py-14 bg-muted/30 rounded-2xl mb-10">
            <p className="text-lg md:text-xl font-heading font-semibold text-foreground text-center mb-2">
              {before
                ? "Rejoignez les Fondateurs avant le 13 mai"
                : "Prêt à rejoindre Guardiens ?"}
            </p>
            <p className="text-sm font-body text-foreground/60 text-center mb-8">
              {before
                ? "Badge à vie, accès jusqu'au 13 juin."
                : "9€/mois pour les gardiens. Gratuit pour les propriétaires. Sans engagement."}
            </p>
            <Link to="/register">
              <Button className="bg-primary text-primary-foreground font-body font-medium px-10 py-4 rounded-xl text-base hover:bg-primary/90 transition-colors min-h-[52px]" size="xl">
                S'inscrire
              </Button>
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
