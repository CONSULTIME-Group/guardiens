/**
 * Contenu éditorial dédié à la page /petites-missions/lyon (pilote SEO).
 * Indépendant de cityContent.ts (centré house-sitting). Aucun chevauchement
 * sémantique avec /petites-missions (parent) ni /house-sitting/lyon.
 */

export interface MissionsCityFAQ {
  q: string;
  a: string;
}

export interface MissionsCityContent {
  slug: string;
  cityName: string;
  coordinates: { lat: number; lng: number };
  radiusKm: number;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  sections: { heading: string; body: string }[];
  faq: MissionsCityFAQ[];
}

export const MISSIONS_LYON: MissionsCityContent = {
  slug: "lyon",
  cityName: "Lyon",
  coordinates: { lat: 45.764, lng: 4.8357 },
  radiusKm: 25,
  metaTitle: "Petites missions d'entraide à domicile à Lyon | Guardiens",
  metaDescription:
    "Petites missions d'entraide à domicile à Lyon : garde animaux, jardin, courses. Sans contrepartie financière, entre gens du coin. Publiez ou aidez.",
  h1: "Petites missions d'entraide à domicile à Lyon",
  intro:
    "À Lyon, les petites missions d'entraide rassemblent des gens du coin qui rendent service à domicile sans contrepartie financière. Une promenade de chien à la Croix-Rousse, un arrosage de plantes à Villeurbanne, un coup de main pour réceptionner un colis à Vaise : autant d'échanges concrets qui se nouent entre habitants des 9 arrondissements lyonnais et des communes proches comme Caluire-et-Cuire, Tassin-la-Demi-Lune, Bron, Vénissieux ou Écully.",
  sections: [
    {
      heading: "Pourquoi l'entraide à domicile prend tout son sens à Lyon",
      body:
        "Lyon est une ville dense où la vie de quartier reste forte malgré la taille de la métropole. Entre les pentes de la Croix-Rousse, les traboules du Vieux-Lyon, les immeubles haussmanniens de la Presqu'île et les maisons de Monchat ou de Saint-Just, on croise des personnes de palier sans jamais leur parler. Les petites missions inversent cette logique. Elles donnent un prétexte simple, un service ponctuel à domicile, pour entrer en relation avec quelqu'un qui habite à quelques rues. Pas besoin d'attendre une panne de courant ou un déménagement pour faire connaissance.",
    },
    {
      heading: "Quelles missions s'échangent à Lyon et autour",
      body:
        "Les demandes les plus fréquentes à Lyon tournent autour de quatre univers. Les animaux : nourrir un chat pendant un week-end à Lyon, sortir un chien en semaine quand la journée de travail est trop longue, accompagner un vétérinaire dans le 6e ou le 7e. Le jardin et les plantes : arrosage des balcons fleuris en été, taille d'une petite haie dans une maison de Tassin, ramassage de fruits dans un jardin de Sainte-Foy-lès-Lyon. La maison : réception d'un colis dans un immeuble sans gardien, montage d'un meuble, petit bricolage. Les courses et le quotidien : aller chercher un médicament en pharmacie, dépanner pour une course oubliée, partager un trajet vers un marché de quartier. À chaque fois, l'échange se fait sans argent, un panier de légumes, un café partagé, un service rendu en retour plus tard.",
    },
    {
      heading: "Comment publier ou répondre à une mission près de chez vous",
      body:
        "Si vous habitez à Lyon ou dans un rayon de 25 kilomètres autour de Bellecour, vous pouvez à la fois publier une mission et proposer votre aide. Pour publier, vous décrivez en quelques lignes ce dont vous avez besoin, vous précisez votre quartier ou votre commune, et vous indiquez ce que vous proposez en échange, un produit, un service futur, un simple moment partagé. Les gens du coin voient votre demande et vous contactent par messagerie privée. Si vous voulez aider, vous parcourez les missions ouvertes affichées plus bas sur cette page : elles sont triées par proximité avec Lyon. Les missions d'entraide sont accessibles à toutes les personnes inscrites, sans abonnement, sans commission.",
    },
    {
      heading: "Une logique d'échange, pas de prestation",
      body:
        "Les petites missions d'entraide à Lyon ne sont pas des micro-jobs rémunérés. Aucune somme d'argent ne circule entre les participants : c'est une règle fondamentale. Cette absence de contrepartie financière protège l'esprit de l'échange et place chacun sur un pied d'égalité. Vous donnez parce que vous le pouvez, vous recevez parce que vous en avez besoin, et l'équilibre se trouve dans la durée. À Lyon comme ailleurs, c'est cette mécanique qui fait fonctionner la confiance : on aide quelqu'un aujourd'hui, on est aidé demain, pas forcément par la même personne.",
    },
  ],
  faq: [
    {
      q: "Peut-on demander un coup de main à Villeurbanne ou Caluire depuis Lyon ?",
      a: "Oui. Les missions affichées sur cette page couvrent un rayon de 25 kilomètres autour du centre de Lyon, ce qui inclut Villeurbanne, Caluire-et-Cuire, Tassin-la-Demi-Lune, Vénissieux, Bron, Écully, Sainte-Foy-lès-Lyon et la plupart des communes de la Métropole. Vous publiez votre mission depuis votre domicile et les personnes proches géographiquement la voient en priorité.",
    },
    {
      q: "Y a-t-il des missions disponibles tous les jours à Lyon ?",
      a: "La fréquence dépend de l'activité de la communauté locale. Lyon est l'une des premières villes où Guardiens développe les petites missions, donc le volume augmente régulièrement. Si aucune mission ne correspond à votre besoin aujourd'hui, vous pouvez publier votre propre demande : elle restera visible jusqu'à ce qu'une personne du coin y réponde.",
    },
    {
      q: "Faut-il un abonnement pour publier une mission à Lyon ?",
      a: "Non. Les petites missions d'entraide sont accessibles à tous les membres inscrits sur Guardiens, sans abonnement et sans frais. L'espace gardien, pour les longues gardes à domicile, est également gratuit aujourd'hui, sans engagement.",
    },
    {
      q: "Quelle différence avec une garde de maison à Lyon ?",
      a: "Une petite mission est un coup de main ponctuel et court à domicile : une heure de promenade, un arrosage le temps d'un week-end, un colis à réceptionner. Une garde de maison est un séjour de plusieurs jours pendant lequel un gardien dort sur place et prend soin du logement et des animaux. Les deux logiques sont distinctes et complémentaires sur Guardiens.",
    },
  ],
};
