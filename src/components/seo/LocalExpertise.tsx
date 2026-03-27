import type { CityData } from "@/data/cities";
import { Mountain, Building2, Home, CheckCircle2 } from "lucide-react";

interface Props {
  city: CityData;
}

const zoneContent: Record<
  CityData["zoneProfile"],
  { title: string; icon: React.ElementType; items: string[] }
> = {
  montagne: {
    title: "Résidence en montagne : ce que ça change",
    icon: Mountain,
    items: [
      "Gestion du gel et canalisations hors-gel pendant les absences prolongées",
      "Déneigement des accès et maintien du chauffage en mode hors-gel",
      "Isolation thermique adaptée pour le confort des animaux en période froide",
    ],
  },
  urbain: {
    title: "Logement en ville : les réflexes qui comptent",
    icon: Building2,
    items: [
      "Sécurité intrusion : vérification systématique des fermetures et volets",
      "Gestion des sorties en parcs urbains sans véhicule, vigilance canicule et pollution",
      "Respect des règles de copropriété et des horaires de parties communes",
    ],
  },
  périurbain: {
    title: "Maison avec jardin : les points de vigilance",
    icon: Home,
    items: [
      "Sécurité piscine : protocole de fermeture et vérification quotidienne",
      "Arrosage du potager et du jardin selon les consignes du propriétaire",
      "Gestion des boîtes aux lettres et surveillance des animaux en liberté dans l'espace extérieur",
    ],
  },
};

const LocalExpertise = ({ city }: Props) => {
  const content = zoneContent[city.zoneProfile];
  const Icon = content.icon;

  return (
    <section className="max-w-5xl mx-auto px-4 py-12 border-t border-border">
      <div className="flex items-center gap-3 mb-6">
        <Icon className="h-6 w-6 text-primary" />
        <h2 className="font-serif text-2xl font-bold text-foreground">
          Ce que savent nos gardiens à {city.name}
        </h2>
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-4">
        {content.title}
      </h3>

      <ul className="space-y-3 mb-8">
        {content.items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <p className="text-sm font-medium text-foreground mb-3">
        Nos gardiens {city.name} maîtrisent ces contraintes et savent quoi faire sans appeler le propriétaire.
      </p>

      <ul className="space-y-2">
        {city.expertiseTips.map((tip, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
            <span className="text-primary font-bold">→</span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default LocalExpertise;
