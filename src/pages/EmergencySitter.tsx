import { Zap, Bell, Home, Heart, Shield, Clock, Star, MapPin, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PageMeta from "@/components/PageMeta";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";

const steps = [
  {
    icon: Zap,
    title: "Un proprio a un besoin urgent",
    desc: "Annulation de dernière minute, imprévu familial, départ professionnel… la vie ne prévient pas toujours.",
    color: "text-amber-500",
    bg: "bg-amber-100 dark:bg-amber-900/30",
  },
  {
    icon: Bell,
    title: "Les gardiens d'urgence sont alertés",
    desc: "Notification automatique envoyée aux gardiens d'urgence disponibles dans un rayon de 35 km.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Home,
    title: "La garde est organisée en quelques heures",
    desc: "Échange rapide, confirmation, c'est parti. Les animaux sont entre de bonnes mains.",
    color: "text-green-600",
    bg: "bg-green-100 dark:bg-green-900/30",
  },
];

const ownerCards = [
  { icon: Clock, title: "Mobilisable en quelques heures", desc: "Pas besoin d'attendre des jours. Les gardiens d'urgence répondent vite." },
  { icon: Shield, title: "Vérifié et expérimenté", desc: "3+ gardes réalisées, note 4.7+, 0 annulation, identité vérifiée." },
  { icon: MapPin, title: "Près de chez vous", desc: "Sollicités automatiquement dans un rayon de 35 km du lieu de garde." },
];

const conditions = [
  "3 gardes réalisées sur Guardiens",
  "Note moyenne ≥ 4.7/5",
  "0 annulation sur les 6 derniers mois",
  "Identité vérifiée",
  "Abonnement actif",
];

const advantages = [
  "Visibilité prioritaire dans les résultats de recherche",
  "Alertes urgentes reçues en premier",
  "Accès anticipé aux gardes longue durée",
  "Écusson distinctif « Gardien d'urgence »",
  "3 mois d'abonnement offerts par intervention",
];

const EmergencySitter = () => {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
        title="Gardien d'urgence — Intervention rapide en AURA"
        description="Besoin d'un gardien en urgence ? Des gardiens vérifiés disponibles rapidement en Auvergne-Rhône-Alpes."
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-background to-green-50/30 dark:from-amber-950/20 dark:via-background dark:to-green-950/10 py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-lg mb-6">
            <Zap className="h-8 w-8" fill="currentColor" />
          </div>
          <h1 className="font-heading text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Les gardiens d'urgence
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Votre filet de sécurité local. Un imprévu, une annulation de dernière minute, un départ précipité ?
            Les gardiens d'urgence sont des membres expérimentés, mobilisables rapidement parce qu'ils sont près de chez vous.
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
              <div className={`inline-flex items-center justify-center h-14 w-14 rounded-full ${step.bg} mx-auto`}>
                <step.icon className={`h-7 w-7 ${step.color}`} />
              </div>
              <h3 className="font-heading font-semibold text-lg">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section proprio */}
      <section className="bg-muted/50 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="font-heading text-2xl font-bold text-center mb-3">
            La tranquillité d'avoir quelqu'un de confiance à côté
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
            <Link to="/search?emergency=true">
              <Button size="lg" className="gap-2">
                <MapPin className="h-4 w-4" />
                Trouver un gardien d'urgence près de chez moi
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Section gardien */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="font-heading text-2xl font-bold text-center mb-3">Devenez gardien d'urgence</h2>
        <p className="text-center text-muted-foreground mb-10">
          Quand vous remplissez les conditions, l'invitation apparaît sur votre dashboard. C'est vous qui choisissez.
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Conditions
            </h3>
            <ul className="space-y-2">
              {conditions.map((c, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" /> Avantages
            </h3>
            <ul className="space-y-2">
              {advantages.map((a, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="text-center mt-8">
          <Link to="/dashboard">
            <Button variant="outline" size="lg" className="gap-2">
              <Zap className="h-4 w-4" />
              Voir si je suis éligible
            </Button>
          </Link>
        </div>
      </section>

      {/* Engagement */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-6 space-y-3">
          <h3 className="font-heading font-semibold flex items-center gap-2">
            <Heart className="h-5 w-5 text-amber-600" />
            Un engagement, pas juste un badge
          </h3>
          <p className="text-sm text-muted-foreground">
            Être gardien d'urgence, c'est un engagement. Si vous refusez une demande d'urgence, pas de souci — ça arrive.
            Mais si vous refusez plus d'une fois, le statut est retiré et vous ne pourrez pas le réactiver avant 6 mois.
            Les propriétaires comptent sur la disponibilité des gardiens d'urgence.
          </p>
          <p className="text-sm text-muted-foreground">
            Les annulations sont réévaluées tous les 6 mois : seules celles des 6 derniers mois comptent pour l'éligibilité.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-muted/50 py-16">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-heading text-2xl font-bold text-center mb-10">Questions fréquentes</h2>
          <div className="space-y-6">
            {[
              {
                q: "Qu'est-ce qu'un gardien d'urgence ?",
                a: "Un gardien expérimenté : 3+ gardes, note 4.7+, zéro annulation sur 6 mois, ID vérifiée. Disponible rapidement dans son rayon. C'est le plus haut niveau de confiance sur Guardiens."
              },
              {
                q: "Comment trouver un gardien d'urgence ?",
                a: "Filtrez la recherche par « Gardiens d'urgence ». Ou utilisez le bouton « Besoin d'aide » pendant une garde — les gardiens d'urgence seront alertés."
              },
              {
                q: "Comment devenir gardien d'urgence ?",
                a: "Remplissez les conditions (3 gardes, 4.7+, 0 annulation sur 6 mois, ID vérifiée, abonnement actif). L'invitation apparaît automatiquement sur votre dashboard."
              },
              {
                q: "Est-ce que le gardien d'urgence est payé plus ?",
                a: "Non, pas d'échange d'argent. Mais chaque intervention vous offre 3 mois d'abonnement gratuit. Plus la visibilité prioritaire et l'accès anticipé aux gardes longue durée."
              },
              {
                q: "Que se passe-t-il si je refuse une demande d'urgence ?",
                a: "Premier refus : pas de conséquence. Deuxième refus : perte du statut pour 6 mois. Les propriétaires comptent sur la disponibilité des gardiens d'urgence."
              },
              {
                q: "Que se passe-t-il si je perds le statut ?",
                a: "Note < 4.7 → pause (remontez la note). Annulation → perte, réactivable quand 0 annulation sur 6 mois. 2ᵉ refus urgence → perte 6 mois."
              },
            ].map((faq, i) => (
              <div key={i} className="space-y-1.5">
                <h3 className="font-semibold text-sm">{faq.q}</h3>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Villes couvertes */}
      <section className="max-w-4xl mx-auto px-4 py-12 border-t border-border">
        <h2 className="font-heading text-xl font-bold text-center mb-3">Gardiens d'urgence par ville</h2>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Le réseau d'urgence couvre l'ensemble de la région Auvergne-Rhône-Alpes. Voici les villes où nos gardiens sont les plus actifs.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/house-sitting/lyon" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm hover:border-primary/40 hover:text-primary transition-colors">
            <MapPin className="h-3.5 w-3.5" /> Lyon
          </Link>
          <Link to="/house-sitting/annecy" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm hover:border-primary/40 hover:text-primary transition-colors">
            <MapPin className="h-3.5 w-3.5" /> Annecy
          </Link>
          <Link to="/house-sitting/grenoble" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm hover:border-primary/40 hover:text-primary transition-colors">
            <MapPin className="h-3.5 w-3.5" /> Grenoble
          </Link>
          <Link to="/house-sitting/chambery" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm hover:border-primary/40 hover:text-primary transition-colors">
            <MapPin className="h-3.5 w-3.5" /> Chambéry
          </Link>
          <Link to="/tarifs" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm hover:border-primary/40 hover:text-primary transition-colors">
            Voir les tarifs
          </Link>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-12 text-center">
        <p className="text-muted-foreground text-sm mb-4">Guardiens © {new Date().getFullYear()}</p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link to="/search?emergency=true">
            <Button size="sm">Trouver un gardien d'urgence</Button>
          </Link>
          <Link to="/dashboard">
            <Button size="sm" variant="outline">Voir mon éligibilité</Button>
          </Link>
          <Link to="/faq" className="text-sm text-primary hover:underline">FAQ complète</Link>
        </div>
      </section>
    </div>
  );
};

export default EmergencySitter;