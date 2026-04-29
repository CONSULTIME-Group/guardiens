import { memo } from "react";
import { Link } from "react-router-dom";

interface ResItem {
  title: string;
  description: string;
  href: string;
}

interface ContextualResourcesProps {
  annoncesCount: number;
  gardesCount: number;
}

const ContextualResources = memo(({ annoncesCount, gardesCount }: ContextualResourcesProps) => {
  let resTitle = "";
  let resItems: ResItem[] = [];

  if (annoncesCount === 0) {
    resTitle = "Avant de publier votre première annonce";
    resItems = [
      { title: "Rédiger une bonne annonce", description: "Ce qui attire les bonnes personnes en 48h.", href: "/actualites/rediger-bonne-annonce-house-sitting" },
      { title: "Choisir son gardien : les bons critères", description: "Ce qui compte, ce qui ne sert à rien.", href: "/actualites/choisir-gardien-bons-criteres" },
      { title: "Préparer sa maison avant une garde", description: "Guide de la maison, sécurité, animaux.", href: "/actualites/preparer-maison-avant-garde" },
    ];
  } else if (gardesCount === 0) {
    resTitle = "Préparer votre première garde";
    resItems = [
      { title: "Accueillir son gardien", description: "Remise des clés, visite, jour du départ.", href: "/actualites/accueillir-gardien-bonnes-pratiques" },
      { title: "Préparer sa maison avant une garde", description: "Ce qu'on oublie dans le guide de la maison.", href: "/actualites/preparer-maison-avant-garde" },
      { title: "Que faire si quelque chose se passe mal", description: "Animal malade, panne, gardien défaillant.", href: "/actualites/que-faire-probleme-pendant-garde" },
    ];
  } else {
    resTitle = "Optimiser vos prochaines gardes";
    resItems = [
      { title: "Choisir son gardien : les bons critères", description: "Affinez votre sélection à chaque garde.", href: "/actualites/choisir-gardien-bons-criteres" },
      { title: "Que faire si quelque chose se passe mal", description: "Animal malade, panne, gardien défaillant.", href: "/actualites/que-faire-probleme-pendant-garde" },
      { title: "Accueillir son gardien", description: "Ce qui fait qu'un gardien prend soin de tout.", href: "/actualites/accueillir-gardien-bonnes-pratiques" },
    ];
  }

  if (resItems.length === 0) return null;

  return (
    <section aria-label={resTitle} className="animate-fade-in">
      <h2 className="font-body text-base font-semibold mb-3">{resTitle}</h2>
      <ul className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {resItems.map((r) => (
          <li key={r.href}>
            <Link
              to={r.href}
              className="block h-full rounded-xl border border-border bg-card hover:bg-primary/5 hover:border-primary/30 transition-colors p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <p className="text-sm font-semibold text-foreground leading-snug">
                {r.title}
                <span className="text-primary ml-1" aria-hidden="true">→</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{r.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
});

ContextualResources.displayName = "ContextualResources";
export default ContextualResources;
