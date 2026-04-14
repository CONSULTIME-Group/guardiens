import { memo } from "react";
import ResourceSection from "@/components/shared/ResourceSection";
import type { ResourceItem } from "@/components/shared/ResourceCard";

interface ContextualResourcesProps {
  annoncesCount: number;
  gardesCount: number;
}

const ContextualResources = memo(({ annoncesCount, gardesCount }: ContextualResourcesProps) => {
  let resTitle = "";
  let resItems: ResourceItem[] = [];

  if (annoncesCount === 0) {
    resTitle = "Avant de publier votre première annonce";
    resItems = [
      { title: "Rédiger une bonne annonce", description: "Ce qui attire les bons gardiens en 48h.", href: "/actualites/rediger-bonne-annonce-house-sitting", icon: "maison" },
      { title: "Choisir son gardien : les bons critères", description: "Ce qui compte, ce qui ne sert à rien.", href: "/actualites/choisir-gardien-bons-criteres", icon: "proprio" },
      { title: "Préparer sa maison avant une garde", description: "Guide de la maison, sécurité, animaux.", href: "/actualites/preparer-maison-avant-garde", icon: "maison" },
    ];
  } else if (gardesCount === 0) {
    resTitle = "Préparer votre première garde";
    resItems = [
      { title: "Accueillir son gardien", description: "Remise des clés, visite, jour du départ.", href: "/actualites/accueillir-gardien-bonnes-pratiques", icon: "proprio" },
      { title: "Préparer sa maison avant une garde", description: "Ce qu'on oublie dans le guide de la maison.", href: "/actualites/preparer-maison-avant-garde", icon: "maison" },
      { title: "Que faire si quelque chose se passe mal", description: "Animal malade, panne, gardien défaillant.", href: "/actualites/que-faire-probleme-pendant-garde", icon: "proprio" },
    ];
  } else {
    resTitle = "Optimiser vos prochaines gardes";
    resItems = [
      { title: "Choisir son gardien : les bons critères", description: "Affinez votre sélection à chaque garde.", href: "/actualites/choisir-gardien-bons-criteres", icon: "proprio" },
      { title: "Que faire si quelque chose se passe mal", description: "Animal malade, panne, gardien défaillant.", href: "/actualites/que-faire-probleme-pendant-garde", icon: "proprio" },
      { title: "Accueillir son gardien", description: "Ce qui fait qu'un gardien prend soin de tout.", href: "/actualites/accueillir-gardien-bonnes-pratiques", icon: "proprio" },
    ];
  }

  return resItems.length > 0 ? <ResourceSection title={resTitle} resources={resItems} /> : null;
});

ContextualResources.displayName = "ContextualResources";
export default ContextualResources;
