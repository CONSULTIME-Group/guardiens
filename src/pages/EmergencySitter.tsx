import { Zap, Bell, Home, Heart, Shield, Clock, Star, MapPin, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import PageMeta from "@/components/PageMeta";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";

const steps = [
  {
    icon: Zap,
    title: "Un proprio a un besoin urgent",
    desc: "Annulation de dernière minute, imprévu familial, départ professionnel… la vie ne prévient pas toujours.",
  },
  {
    icon: Bell,
    title: "Les gardiens d'urgence sont alertés",
    desc: "Notification automatique envoyée aux gardiens d'urgence disponibles dans un rayon de 35 km.",
  },
  {
    icon: Home,
    title: "La garde est organisée en quelques heures",
    desc: "Échange rapide, confirmation, c'est parti. Les animaux sont entre de bonnes mains.",
  },
];

const ownerCards = [
  { icon: Clock, title: "Mobilisable en quelques heures", desc: "Pas besoin d'attendre des jours. Les gardiens d'urgence répondent vite." },
  { icon: Shield, title: "Vérifié et expérimenté", desc: "5+ gardes réalisées, note 4.7+, 0 annulation, identité vérifiée." },
  { icon: MapPin, title: "Des gens du coin", desc: "Sollicités automatiquement dans un rayon de 35 km, ce sont des gens du coin, pas des inconnus." },
];

const conditions = [
  "5 gardes réalisées sur Guardiens",
  "Note moyenne ≥ 4.7/5",
  "0 annulation sur les 6 derniers mois",
  "Identité vérifiée",
  "Abonnement actif",
];

const advantages = [
  "Visibilité prioritaire dans les résultats de recherche",
  "Alertes urgentes reçues en premier",
  "Écusson distinctif « Gardien d'urgence »",
  "1 mois d'abonnement offert par intervention",
];

const stories = [
  {
    name: "Hélène, Lyon 6e",
    text: "Hospitalisation programmée mais avancée à la dernière minute. Deux chats à la maison, personne autour pour s'en occuper. Elle active l'alerte le mardi soir. Un gardien d'urgence, déjà vérifié, déjà noté, répond dans les deux heures. Rendez-vous le lendemain matin avant qu'elle parte. Au retour, les chats sont toujours là, le frigo aussi.",
  },
  {
    name: "Pierre, Annecy",
    text: "Berger australien de 5 ans, magnifique mais réactif avec les inconnus. Pierre doit partir cinq jours pour un déplacement pro. Pas question de l'envoyer en pension. Il active l'alerte. Un gardien d'urgence formé aux chiens à fort caractère répond le soir même. Première rencontre dehors, en terrain neutre, comme il faut. Pierre est parti rassuré.",
  },
  {
    name: "Camille, Grenoble",
    text: "Décès soudain d'un proche en région parisienne. Camille doit partir quatre jours, son chat de 14 ans ne supporte plus les déménagements. L'alerte part le matin, un gardien d'urgence du coin répond avant midi. Le chat n'a pas bougé de la maison. Camille non plus, en quelque sorte.",
  },
  {
    name: "Sophie, Vieux-Lyon",
    text: "Chien diabétique, deux injections par jour à heures fixes. Personne dans son entourage ne sait faire. Sophie doit s'absenter trois jours. Elle active l'alerte en précisant la compétence soin. Un gardien d'urgence avec expérience véto répond dans la journée. Démonstration de l'injection le matin du départ. Tout s'est passé comme prévu.",
  },
  {
    name: "Thomas, Chambéry",
    text: "Mission consulting imprévue à l'étranger, départ dans 36 heures. Deux chats à la maison, pas de famille en ville. Thomas active l'alerte le jeudi soir. Vendredi matin, un gardien d'urgence est passé pour rencontrer les chats et récupérer les clés. Six jours de mission, zéro stress côté chats.",
  },
  {
    name: "Élise, Saint-Étienne",
    text: "Déménagement précipité, l'ancien proprio a avancé l'état des lieux d'une semaine. Deux chats stressés, un logement en chantier, pas le temps de s'en occuper. L'alerte passe à 9h, un gardien d'urgence répond à 11h. Les chats ont fini la semaine au calme chez le gardien, le temps que tout soit en place.",
  },
];

const comparisonRows = [
  { criteria: "Délai", classic: "Anticipé (semaines)", urgent: "Moins de 24h" },
  { criteria: "Durée typique", classic: "7 à 21 jours", urgent: "Souvent courte (1 à 7 jours)" },
  { criteria: "Profil gardien", classic: "Tout gardien vérifié", urgent: "5+ gardes, note 4.7+, 0 annulation" },
  { criteria: "Type de demande", classic: "Planifiée", urgent: "Imprévue" },
  { criteria: "Type d'animaux", classic: "Tous", urgent: "Tous (y compris réactifs)" },
];

const faqs = [
  {
    q: "Combien de temps pour être contacté(e) en cas d'urgence ?",
    a: "Sur Guardiens, les alertes d'urgence sont prioritaires : les gardiens d'urgence éligibles dans votre rayon sont notifiés instantanément (SMS, email, push). En moyenne, vous recevez une réponse en moins de 4 heures, et un rendez-vous dans les 24 heures.",
  },
  {
    q: "Et la nuit ou le week-end, ça fonctionne ?",
    a: "Oui. Les alertes d'urgence sont actives 24/7. La nuit et le week-end, les notifications sont envoyées en priorité aux gardiens ayant indiqué une disponibilité étendue. Les délais de réponse peuvent être un peu plus longs en plages atypiques (jusqu'à 6 heures), mais le service reste actif.",
  },
  {
    q: "Mon chien est réactif ou anxieux, est-ce possible quand même ?",
    a: "Oui, c'est même un cas typique d'urgence. Quand vous activez l'alerte, vous précisez le profil de votre animal (réactif, anxieux, soin particulier, etc.). Seuls les gardiens d'urgence ayant l'expérience et la compétence requises sont notifiés. Aucun gardien ne prend une garde sans rencontrer l'animal d'abord, c'est la règle.",
  },
  {
    q: "Combien ça coûte une garde d'urgence ?",
    a: "Pour les propriétaires, l'inscription et l'utilisation de Guardiens (y compris l'alerte d'urgence) sont sans frais. Aucun supplément n'est appliqué pour une garde d'urgence par rapport à une garde classique. La logique reste celle du house-sitting : pas d'argent qui circule entre vous et le gardien.",
  },
  {
    q: "Quelle différence avec une garde classique ?",
    a: "Une garde classique se prépare à l'avance : vous publiez votre annonce, recevez plusieurs candidatures, choisissez. Une garde d'urgence est immédiate : un gardien éligible (5 gardes minimum, note 4.7+, 0 annulation, ID vérifiée) répond rapidement, vous le rencontrez le jour même ou le lendemain, la garde commence dans les 24h.",
  },
  {
    q: "Et si je suis hospitalisé(e), comment ça se passe ?",
    a: "C'est l'un des cas les plus fréquents. Vous (ou un proche) activez l'alerte directement depuis votre dashboard ou par téléphone. Si vous n'êtes pas en état, un proche peut le faire à votre place avec votre accord. Le gardien d'urgence prend le relais : maison, animaux, courrier si besoin. Vous reprenez tout en main au retour.",
  },
  {
    q: "Comment devenir gardien d'urgence sur Guardiens ?",
    a: "Quatre conditions : avoir réalisé au moins 5 gardes complètes sur Guardiens, avoir une note moyenne supérieure à 4.7/5, n'avoir annulé aucune garde, et avoir une identité vérifiée. Une fois ces critères remplis, vous pouvez activer le statut depuis votre dashboard.",
  },
  {
    q: "À quoi je m'engage exactement comme gardien d'urgence ?",
    a: "À répondre rapidement aux alertes que vous recevez (notification push, SMS, email). Vous n'êtes pas obligé(e) d'accepter chaque demande : vous pouvez décliner si vous n'êtes pas disponible. Mais vous vous engagez à répondre, pas à ignorer.",
  },
  {
    q: "Que se passe-t-il si je refuse une demande d'urgence ?",
    a: "Le premier refus n'a aucune conséquence, c'est normal de ne pas être toujours disponible. En revanche, un deuxième refus consécutif entraîne la perte du statut pendant 6 mois. C'est notre garantie pour les propriétaires : un gardien d'urgence est vraiment disponible.",
  },
  {
    q: "Qu'est-ce que je gagne à être gardien d'urgence ?",
    a: "Visibilité prioritaire dans les résultats de recherche, accès anticipé à des gardes intéressantes, écusson distinctif sur votre profil, et un mois d'abonnement offert par intervention d'urgence. Surtout : vous rendez un service réel à des gens du coin qui en ont vraiment besoin.",
  },
  {
    q: "Comment je suis prévenu(e) d'une urgence ?",
    a: "SMS + email + notification push (si activée). Vous configurez vos préférences depuis le dashboard : rayon d'intervention (5 à 200 km), plages horaires de disponibilité, types d'animaux acceptés. Seules les alertes correspondant à vos préférences vous parviennent.",
  },
  {
    q: "Puis-je perdre mon statut de gardien d'urgence ?",
    a: "Oui, dans plusieurs cas : note qui descend sous 4.7 (statut mis en pause, récupérable), annulation d'une garde acceptée (perte immédiate, réactivable après 5 nouvelles gardes sans incident), deuxième refus d'urgence consécutif (suspension 6 mois), abonnement expiré (statut en pause).",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Garde animaux d'urgence",
  url: "https://guardiens.fr/gardien-urgence",
  serviceType: ["pet sitting d'urgence", "garde d'animaux à domicile en urgence"],
  provider: {
    "@type": "Organization",
    name: "Guardiens",
    url: "https://guardiens.fr",
  },
  areaServed: {
    "@type": "Country",
    name: "France",
  },
  audience: {
    "@type": "Audience",
    audienceType: "Propriétaires d'animaux ayant un besoin de garde imprévu",
  },
  description:
    "Trouvez un gardien vérifié près de chez vous en moins de 24h pour vos animaux et votre maison en cas d'imprévu : hospitalisation, deuil, déplacement professionnel.",
};

const stepColors = [
  { bg: "bg-accent", text: "text-accent-foreground" },
  { bg: "bg-primary/10", text: "text-primary" },
  { bg: "bg-primary/5", text: "text-primary" },
];

const EmergencySitter = () => {
  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title="Gardien d'urgence, Garde en moins de 24h | Guardiens"
        description="Besoin d'un gardien en urgence pour vos animaux ? Activez l'alerte Guardiens et trouvez un gardien vérifié près de chez vous en moins de 24 heures."
        path="/gardien-urgence"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(serviceJsonLd)}</script>
      </Helmet>
      <PublicHeader />

      {/* Bandeau Bientôt disponible */}
      <section className="bg-warning/15 border-b border-warning/25 py-3">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sm font-medium text-warning-foreground">
            Bientôt disponible, Le réseau de gardiens d'urgence sera activé dès que nous aurons suffisamment de profils vérifiés et éprouvés.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Notre plateforme est jeune. Nous prenons le temps de désigner des gardiens d'urgence sur des critères stricts pour garantir la fiabilité du service.
          </p>
        </div>
      </section>

      <PageBreadcrumb items={[{ label: "Gardien d'urgence" }]} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-accent via-background to-primary/5 py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-accent-foreground/80 to-accent-foreground text-accent shadow-lg mb-6">
            <Zap className="h-8 w-8" fill="currentColor" />
          </div>
          <h1 className="font-heading text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Les gardiens d'urgence
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Votre filet de sécurité local. Un imprévu, une annulation de dernière minute, un départ précipité ?
            Des gens du coin formés à l'urgence, vérifiés, mobilisables en moins de 24h.
          </p>
          <p className="mt-3 text-base text-muted-foreground">
            C'est la force de la proximité : une solution en quelques heures, pas en quelques jours.
          </p>
        </div>
      </section>

      {/* 3 étapes */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="font-heading text-2xl font-bold text-center mb-10">Comment ça marche ?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="text-center space-y-4">
              <div className={`inline-flex items-center justify-center h-14 w-14 rounded-full ${stepColors[i].bg} mx-auto`}>
                <step.icon className={`h-7 w-7 ${stepColors[i].text}`} />
              </div>
              <h3 className="font-heading font-semibold text-lg">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cas concrets d'urgence */}
      <section className="bg-background py-16 border-t border-border">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <p className="text-xs text-muted-foreground tracking-[0.2em] uppercase mb-3">
              Six cas, six urgences
            </p>
            <h2 className="font-heading text-2xl md:text-3xl font-bold mb-4">
              Quand le besoin est réel.
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              L'urgence ne ressemble pas toujours à ce qu'on imagine. Voici six situations rencontrées sur Guardiens, toutes résolues en moins de 24 heures.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {stories.map((s) => (
              <article key={s.name} className="bg-card border border-border rounded-lg p-6">
                <h3 className="font-heading font-semibold mb-3">{s.name}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Comparatif classique vs urgence */}
      <section className="bg-muted/30 py-16 border-t border-border">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="font-heading text-2xl md:text-3xl font-bold mb-3">
              Garde classique vs garde d'urgence
            </h2>
            <p className="text-muted-foreground">Deux modes, une même confiance.</p>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-heading font-semibold">Critère</th>
                  <th className="text-left p-4 font-heading font-semibold">Garde classique</th>
                  <th className="text-left p-4 font-heading font-semibold">Garde d'urgence</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={row.criteria} className={i > 0 ? "border-t border-border" : ""}>
                    <td className="p-4 font-medium">{row.criteria}</td>
                    <td className="p-4 text-muted-foreground">{row.classic}</td>
                    <td className="p-4 text-muted-foreground">{row.urgent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section proprio */}
      <section className="bg-muted/50 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="font-heading text-2xl font-bold text-center mb-3">
            La tranquillité d'avoir des gens du coin de confiance
          </h2>
          <p className="text-center text-muted-foreground mb-10">Pour les propriétaires</p>
          <div className="grid md:grid-cols-3 gap-6">
            {ownerCards.map((card, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-6 space-y-3">
                <card.icon className="h-6 w-6 text-primary" />
                <h3 className="font-heading font-semibold">{card.title}</h3>
                <p className="text-sm text-muted-foreground">{card.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/inscription?role=owner">
              <Button size="lg" className="gap-2">
                <MapPin className="h-4 w-4" />
                M'inscrire et être averti(e) du lancement
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Section gardien */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="font-heading text-2xl font-bold text-center mb-3">Devenez gardien d'urgence</h2>
        <p className="text-center text-muted-foreground mb-10">
          Quand vous remplissez les conditions, l'invitation apparaîtra sur votre dashboard. C'est vous qui choisissez.
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Conditions
            </h3>
            <ul className="space-y-2">
              {conditions.map((c, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
              <Star className="h-5 w-5 text-accent-foreground" /> Avantages
            </h3>
            <ul className="space-y-2">
              {advantages.map((a, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-accent-foreground shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="text-center mt-8">
          <Button variant="outline" size="lg" className="gap-2" disabled>
            <Zap className="h-4 w-4" />
            Éligibilité (à venir)
          </Button>
        </div>
      </section>

      {/* Engagement */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <div className="rounded-xl border border-border bg-accent/30 p-6 space-y-3">
          <h3 className="font-heading font-semibold flex items-center gap-2">
            <Heart className="h-5 w-5 text-destructive" />
            Un engagement, pas juste un badge
          </h3>
          <p className="text-sm text-muted-foreground">
            Être gardien d'urgence, c'est un engagement. Si vous refusez une demande d'urgence, pas de souci, ça arrive.
            Mais si vous refusez plus d'une fois, le statut est retiré et vous ne pourrez pas le réactiver avant 6 mois.
            Les propriétaires comptent sur la disponibilité des gardiens d'urgence.
          </p>
          <p className="text-sm text-muted-foreground">
            Les annulations sont réévaluées tous les 6 mois : seules celles des 6 derniers mois comptent pour l'éligibilité.
          </p>
        </div>
      </section>

      {/* FAQ, Accordion */}
      <section className="bg-muted/50 py-16">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-heading text-2xl font-bold text-center mb-10">Questions fréquentes</h2>
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="bg-card border border-border rounded-xl px-4">
                <AccordionTrigger className="text-sm font-semibold text-left hover:no-underline py-4">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Villes couvertes */}
      <section className="max-w-4xl mx-auto px-4 py-12 border-t border-border">
        <h2 className="font-heading text-xl font-bold text-center mb-3">Gardiens d'urgence par ville</h2>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Le réseau d'urgence s'appuie sur des gardiens locaux partout en France. Voici les villes où les gardiens d'urgence y sont les plus actifs.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {[
            { label: "Lyon", to: "/house-sitting/lyon" },
            { label: "Annecy", to: "/house-sitting/annecy" },
            { label: "Grenoble", to: "/house-sitting/grenoble" },
            { label: "Chambéry", to: "/house-sitting/chambery" },
          ].map((city) => (
            <Link
              key={city.label}
              to={city.to}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm hover:border-primary/40 hover:text-primary transition-colors"
            >
              <MapPin className="h-3.5 w-3.5" /> {city.label}
            </Link>
          ))}
          <Link
            to="/tarifs"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm hover:border-primary/40 hover:text-primary transition-colors"
          >
            Voir les tarifs
          </Link>
        </div>
      </section>

      {/* Pour aller plus loin, maillage interne */}
      <section className="py-12 bg-muted/30 border-t border-border">
        <div className="container max-w-4xl mx-auto px-4">
          <p className="text-xs text-muted-foreground tracking-[0.2em] uppercase mb-6 text-center">
            Pour aller plus loin
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link to="/petites-missions" className="group block bg-card border border-border rounded-lg p-6 hover:border-primary transition">
              <p className="font-semibold mb-2 group-hover:text-primary transition">Petites missions d'entraide</p>
              <p className="text-sm text-muted-foreground">Pour des coups de main ponctuels (sans urgence) entre gens du coin.</p>
            </Link>
            <Link to="/guides" className="group block bg-card border border-border rounded-lg p-6 hover:border-primary transition">
              <p className="font-semibold mb-2 group-hover:text-primary transition">Guides locaux par ville</p>
              <p className="text-sm text-muted-foreground">Vétos, parcs, cafés dog-friendly et bonnes adresses près de chez vous.</p>
            </Link>
            <Link to="/actualites/devenir-gardien-urgence-guardiens" className="group block bg-card border border-border rounded-lg p-6 hover:border-primary transition">
              <p className="font-semibold mb-2 group-hover:text-primary transition">Devenir gardien d'urgence</p>
              <p className="text-sm text-muted-foreground">Le guide complet pour rejoindre le réseau de gardiens d'urgence Guardiens.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-8 text-center border-t border-border">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link to="/inscription?role=owner">
            <Button size="sm">S'inscrire, lancement prochain</Button>
          </Link>
          <Button size="sm" variant="outline" disabled>
            Voir mon éligibilité (à venir)
          </Button>
          <Link to="/faq#gardien-d-urgence" className="text-sm text-primary hover:underline">FAQ complète</Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};

export default EmergencySitter;
