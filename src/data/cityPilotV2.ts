/**
 * Lot VIL1 (16/11/2026) : pilote du gabarit ville v2, liste fermée de pages
 * servies par la base. Mesure à J+28 contre 5 pages témoins laissées
 * intactes (Villeurbanne, Le Havre, Aix-en-Provence, Avignon, Perpignan).
 *
 * Chaque guide local cite ses sources primaires (Ville, Métropole,
 * Département, office de tourisme). Une ville sans guide vérifié garde son
 * corps éditorial en base, rendu dans le cadre v2.
 *
 * La FAQ visible et le JSON-LD FAQPage lisent la même liste.
 */

export interface PilotGuideSource {
  label: string;
  url: string;
}

export interface PilotGuidePlace {
  name: string;
  text: string;
}

export interface PilotGuide {
  title: string;
  intro: string;
  places: PilotGuidePlace[];
  rules: string[];
  tips: string[];
  sources: PilotGuideSource[];
  /** Date de vérification des sources, format JJ/MM/AAAA. */
  verifiedOn: string;
}

export interface CityPilotV2 {
  /** Phrase d'ouverture propre à la ville, après la définition du home sitting. */
  cityLine: string;
  guide: PilotGuide | null;
  /** Réponse locale à « Où promener un chien à X ? ». */
  walkAnswer: string;
}

export const PILOT_V2_SLUGS = ["poitiers", "montreuil", "marseille", "dunkerque", "toulouse"] as const;

export const CITY_PILOT_V2: Record<string, CityPilotV2> = {
  poitiers: {
    cityLine:
      "À Poitiers, le parc de Blossac, les bords du Clain et le Jardin des Plantes offrent de belles promenades à deux pas du centre.",
    walkAnswer:
      "Au parc de Blossac, terrasse de 9 hectares au-dessus du Clain, et le long du Clain vers Saint-Benoît. Un arrêté municipal impose la laisse sur tout le domaine public : gardez le chien attaché, aussi au bord de l'eau.",
    guide: {
      title: "Sortir avec un chien à Poitiers",
      intro:
        "Les lieux et les règles ci-dessous viennent des documents de la Ville de Poitiers et de Grand Poitiers. Ils aident votre gardien à prendre ses repères dès le premier jour.",
      places: [
        {
          name: "Parc de Blossac",
          text:
            "Terrasse de 9 hectares dessinée au XVIIIe siècle au-dessus du Clain. Entrées place de l'Appel du 18 juin 1940, rue de la Tranchée et rue du Grand Chêne, arrêt de bus Blossac. Un petit parc animalier accueille poules, lapins et chèvres naines. Horaires saisonniers sur parcsetjardins.poitiers.fr.",
        },
        {
          name: "Bords du Clain",
          text:
            "Une promenade au départ de Blossac vers Saint-Benoît. La Ville rappelle que le Clain est très profond et que ses berges sont abruptes : le chien reste en laisse.",
        },
        {
          name: "Jardin des Plantes",
          text: "Un jardin d'1,5 hectare dans la vallée du Clain, au calme, pour une sortie courte.",
        },
        {
          name: "Îlot Tison",
          text:
            "Une passerelle relie les deux rives. Le verger Tison fait partie du parc naturel urbain de Grand Poitiers.",
        },
      ],
      rules: [
        "Chiens tenus en laisse sur tout le domaine public (arrêté n° 2018-0115 du 29/01/2018).",
        "Rassemblements de chiens interdits de 8 h à 23 h dans les rues piétonnes, squares, jardins, places et parkings.",
        "Déjections ramassées : la Ville installe des distributeurs de sacs depuis 2003.",
        "Animal errant conduit à la fourrière intercommunale, site de la Folie, frais à la charge du propriétaire.",
      ],
      tips: [
        "La direction Salubrité santé publique propose des ateliers gratuits avec un éthologue.",
        "Le guide de l'animal en ville est téléchargeable sur poitiers.fr.",
      ],
      sources: [
        {
          label: "Arrêté animaux, Ville de Poitiers",
          url: "https://www.poitiers.fr/sites/default/files/2024-07/arrete_reglementation_salubrite_securite_publique_animaux.pdf",
        },
        {
          label: "Guide des espaces verts, Ville de Poitiers",
          url: "https://www.poitiers.fr/sites/default/files/2022-05/poitiers_guide_espaces_verts.pdf",
        },
        {
          label: "La ville, Ville de Poitiers",
          url: "https://www.poitiers.fr/sites/default/files/2024-03/03_la_ville.pdf",
        },
        {
          label: "Balade 4A, Grand Poitiers",
          url: "https://www.grandpoitiers.fr/fileadmin/medias/Balade/4A.pdf",
        },
      ],
      verifiedOn: "16/11/2026",
    },
  },

  marseille: {
    cityLine:
      "À Marseille, chaque parc a sa règle pour les chiens : certains les accueillent en liberté, d'autres en laisse, d'autres les réservent aux promeneurs.",
    walkAnswer:
      "Au parc des 7 Collines (11e), où la Ville autorise les chiens en liberté, ou dans les parcs ouverts aux chiens en laisse, comme le parc de la Pelouque (16e). La Ville publie la règle parc par parc sur ses pages d'arrondissement : consultez-la avant la sortie.",
    guide: {
      title: "Sortir avec un chien à Marseille",
      intro:
        "La Ville de Marseille indique pour chaque parc si les chiens sont admis, en laisse ou en liberté. Voici quelques repères tirés de ces fiches, à transmettre à votre gardien.",
      places: [
        {
          name: "Parc des 7 Collines (11e)",
          text:
            "10 hectares, traverse de la Buzine, ouvert 24 h sur 24. La Ville y autorise les chiens en liberté.",
        },
        {
          name: "Jardin de Saint-Marcel (11e)",
          text:
            "1,4 hectare le long du canal. Chiens en laisse pour rejoindre la partie haute boisée, où ils peuvent évoluer en liberté.",
        },
        {
          name: "Parc de la Pelouque (16e)",
          text: "2,5 hectares, 16 chemin de la Pelouque, ouvert 24 h sur 24, chiens autorisés en laisse.",
        },
        {
          name: "Parcs avec caniparc",
          text:
            "Dans plusieurs parcs du 7e et du 9e, les chiens en laisse empruntent les allées pour traverser le parc ou rejoindre le caniparc.",
        },
      ],
      rules: [
        "Chaque parc affiche sa règle : chiens en liberté, en laisse, sur les allées seulement, ou interdits.",
        "Dans les parcs à caniparc, la laisse reste de mise sur les allées.",
      ],
      tips: [
        "Repérez avec votre gardien le parc ouvert aux chiens le plus proche de chez vous, fiche de la Ville à l'appui.",
      ],
      sources: [
        {
          label: "Parcs et jardins du 11e, Ville de Marseille",
          url: "https://www.marseille.fr/environnement/parcs-et-jardins-du-11e-arrondissement",
        },
        {
          label: "Parcs et jardins du 16e, Ville de Marseille",
          url: "https://www.marseille.fr/index.php/environnement/parcs-et-jardins-du-16e-arrondissement",
        },
        {
          label: "Parcs et jardins du 7e, Ville de Marseille",
          url: "https://www.marseille.fr/index.php/environnement/parcs-et-jardins-du-7e-arrondissement",
        },
        {
          label: "Parcs et jardins du 9e, Ville de Marseille",
          url: "https://www.marseille.fr/index.php/environnement/parcs-et-jardins-du-9e-arrondissement",
        },
      ],
      verifiedOn: "16/11/2026",
    },
  },

  toulouse: {
    cityLine:
      "À Toulouse, les bords de Garonne, le canal du Midi et les caniparcs des jardins du centre rythment les sorties avec un chien.",
    walkAnswer:
      "Le long de la Garonne et du canal du Midi, et dans les jardins ouverts aux chiens comme Compans-Caffarelli, le Jardin Royal ou la Prairie des Filtres, équipés de caniparcs. Dans l'espace public, le chien reste en laisse.",
    guide: {
      title: "Sortir avec un chien à Toulouse",
      intro:
        "La mairie de Toulouse équipe plusieurs parcs de caniparcs, des enclos où le chien se dépense en liberté sous l'œil de son maître. Voici les repères utiles à votre gardien.",
      places: [
        {
          name: "Bords de Garonne et canaux",
          text: "Les bords de Garonne, le canal du Midi et le canal de Brienne se prêtent aux longues promenades.",
        },
        {
          name: "Jardins à caniparc",
          text: "Jardin Compans-Caffarelli, Jardin Raymond VI, Jardin Royal et Prairie des Filtres.",
        },
        {
          name: "Île du Ramier et parc de la Maourine",
          text: "Deux grands espaces verts ouverts aux chiens, la Maourine hors jardin du Muséum.",
        },
      ],
      rules: [
        "Chien sous surveillance et tenu en laisse dans l'espace public.",
        "Déjections ramassées : l'amende peut atteindre 450 €.",
        "Caniparcs : enclos de 45 à 800 m², chien identifié (puce ou tatouage) et porteur d'un collier ou d'un harnais, mêmes horaires que le parc.",
        "Dans les jardins listés, chiens de 2e catégorie muselés, chiens de 1re catégorie interdits.",
      ],
      tips: [
        "Pôle Animal dans la ville : 5 chemin de Perpignan, 05 61 22 23 43, du lundi au vendredi de 8 h 30 à 16 h 30.",
        "La carte des caniparcs est publiée en données ouvertes par Toulouse Métropole.",
      ],
      sources: [
        {
          label: "Les animaux de compagnie, Toulouse Métropole",
          url: "https://metropole.toulouse.fr/mon-environnement/nature-et-climat/animal-dans-la-ville/les-animaux-de-compagnie",
        },
        {
          label: "Règlement des caniparcs, Toulouse Métropole",
          url: "https://metropole.toulouse.fr/sites/toulouse-fr/files/2025-12/reglement_caniparc.pdf",
        },
        {
          label: "Caniparcs de Toulouse, data.gouv.fr",
          url: "https://www.data.gouv.fr/datasets/caniparcs-toulouse",
        },
        {
          label: "Magazine À Toulouse, février 2026",
          url: "https://metropole.toulouse.fr/sites/toulouse-fr/files/2026-01/at121_fev2026.pdf",
        },
        {
          label: "Toulouse avec son chien, Toulouse Tourisme",
          url: "https://www.toulouse-tourisme.com/?p=163711",
        },
      ],
      verifiedOn: "16/11/2026",
    },
  },

  dunkerque: {
    cityLine:
      "À Dunkerque, la digue de Malo-les-Bains, le parc du Vent et les parcs de Rosendaël composent un terrain de jeu entre mer et dunes.",
    walkAnswer:
      "Dans les parcs que l'Office de tourisme indique accessibles aux chiens tenus en laisse, comme le parc du Vent ou le parc du château Coquelle. Sur la plage de Malo-les-Bains, les chiens sont interdits du 1er avril au 31 octobre.",
    guide: null,
  },

  montreuil: {
    cityLine:
      "À Montreuil, le parc des Beaumonts et sa vue sur Paris, le parc Montreau et le parc départemental Jean-Moulin Les Guilands offrent de grands espaces verts.",
    walkAnswer:
      "Au parc des Beaumonts, au parc Montreau ou au parc départemental Jean-Moulin Les Guilands. Dans les parcs départementaux, la laisse se détache uniquement dans les caniparcs, signalés sur les plans affichés aux entrées.",
    guide: null,
  },
};

export function getCityPilotV2(slug: string | null | undefined): CityPilotV2 | null {
  if (!slug) return null;
  return CITY_PILOT_V2[slug] ?? null;
}

/** Ouverture commune du gabarit v2 : « home sitting » dans la première phrase. */
export function pilotIntro(city: string, pilot: CityPilotV2): string {
  return `Le home sitting à ${city}, c'est confier sa maison et ses animaux à un gardien qui s'installe chez vous pendant votre absence. Vos animaux gardent leurs habitudes, votre maison reste habitée. ${pilot.cityLine}`;
}

/** FAQ du gabarit v2 : une seule liste, visible et JSON-LD. */
export function pilotFaq(city: string, pilot: CityPilotV2): { q: string; a: string }[] {
  return [
    {
      q: `Faut-il rencontrer le gardien avant la garde à ${city} ?`,
      a: "La rencontre est facultative. Vous échangez par la messagerie et vous vous voyez avant le départ si vous le souhaitez, chez vous ou en visio.",
    },
    {
      q: `Combien coûte Guardiens à ${city} ?`,
      a: "Guardiens est gratuit. Les frais liés à la garde, nourriture des animaux ou soins par exemple, se règlent entre vous sur justificatifs.",
    },
    {
      q: `Où promener un chien à ${city} ?`,
      a: pilot.walkAnswer,
    },
    {
      q: "Que prévoir si un imprévu survient pendant la garde ?",
      a: "Le réseau des gardiens d'urgence ouvrira bientôt. D'ici là, convenez avec votre gardien d'une personne relais, un proche par exemple, et notez le vétérinaire habituel dans le guide de la maison.",
    },
    {
      q: "Mon animal suit un traitement, comment faire ?",
      a: "Indiquez le traitement dans l'annonce, avec les horaires et le contact de votre vétérinaire. Les gardiens qui postulent savent ainsi à quoi s'engager, et vous en parlez ensemble avant de confirmer.",
    },
  ];
}

/**
 * Ligne de preuve de l'écran 1. Jamais de zéro affiché, accords au
 * singulier. residents = gardiens qui habitent la ville, nearby = gardiens
 * qui interviennent dans le secteur.
 */
export function pilotProofLine(city: string, residents: number, nearby: number): string | null {
  const r = Math.max(0, Math.floor(residents || 0));
  const n = Math.max(0, Math.floor(nearby || 0));
  const total = r + n;
  if (total === 0) return null;
  const g = (k: number) => `${k} gardien${k > 1 ? "s" : ""}`;
  if (n === 0) return `${g(r)} à ${city}`;
  if (r === 0) return `${g(n)} à proximité de ${city}`;
  return `${g(total)} à proximité de ${city}, dont ${r} en ville`;
}
