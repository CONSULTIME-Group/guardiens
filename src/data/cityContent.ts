import { slugify } from "@/lib/normalize";
/**
 * City-specific content for geo-localized destination pages.
 * Each city entry enriches the base DB data with editorial content,
 * hero images, POIs, and article sections for the CRO template.
 * Replicable: just add a new key per city.
 */

export interface CityPOI {
  title: string;
  description: string;
  icon: "mountain" | "water" | "stethoscope" | "tree" | "building" | "map";
}

export interface CityArticleSection {
  id: string;
  title: string;
  content: string;
}

export interface CityContentData {
  heroImage?: string;
  heroAlt: string;
  h1Override?: string;
  subtitle: string;
  articleSections: CityArticleSection[];
  pois: CityPOI[];
  nearbyTowns: string[];
}

const cityContent: Record<string, CityContentData> = {
  annecy: {
    heroAlt: "Vue panoramique du lac d'Annecy et des montagnes enneigées",
    subtitle: "Confiez votre maison et vos animaux à un home sitter de confiance en Haute-Savoie.",
    articleSections: [
      {
        id: "pourquoi",
        title: "Pourquoi le house-sitting à Annecy ?",
        content: `Annecy, c'est le cadre de vie dont rêvent beaucoup de Français : le lac, les montagnes, une vieille ville colorée. Mais quand on part en vacances ou en déplacement, la question se pose : **qui s'occupe de la maison et des animaux ?**

Les pensions pour animaux autour d'Annecy coûtent entre 25 et 45 € par jour. Pour deux semaines, ça fait vite 350 à 600 €. Et votre chat qui déteste les cages ? Votre chien qui a besoin de son jardin ?

Le house-sitting (parfois appelé home sitting en français), c'est la solution de bon sens : un gardien vérifié vient chez vous, s'occupe de vos animaux dans leur environnement, arrose le jardin, et veille sur la maison. **Gratuit pour le propriétaire. Logement offert pour le gardien.**

À Annecy, cette logique de proximité est naturelle. Les gens se connaissent entre quartiers, l'entraide est dans l'ADN savoyard. Guardiens digitalise cette confiance de proximité.`,
      },
      {
        id: "securite",
        title: "Sécurité et vigilance : gel, jardin, montagne",
        content: `En Haute-Savoie, les hivers sont rudes. Un house-sitter à Annecy, ce n'est pas juste quelqu'un qui nourrit le chat — c'est quelqu'un qui :

- **Surveille les canalisations** quand il fait -10°C
- **Déneige les accès** pour éviter les chutes et les dégâts
- **Aère la maison** pour prévenir l'humidité
- **Vérifie le chauffage** et la chaudière en votre absence

En été, c'est l'arrosage du jardin, la gestion des volets contre la chaleur, et une présence dissuasive contre les cambriolages — un vrai sujet dans les zones résidentielles autour du lac.

**Un gardien local connaît ces réalités.** Il sait que la route du Semnoz peut geler en novembre, que les jardins en bord de lac demandent un arrosage spécifique, et que les vétos d'urgence sont à Seynod ou Meythet.`,
      },
      {
        id: "match",
        title: "Le match : pension animale vs Guardiens",
        content: `| | Pension | Guardiens |
|---|---|---|
| **Coût** | 25-45 €/jour | Gratuit |
| **Environnement** | Cage / box collectif | Chez vous |
| **Stress animal** | Élevé (changement) | Minimal (habitudes) |
| **Maison surveillée** | Non | Oui |
| **Jardin entretenu** | Non | Oui |
| **Lien humain** | Personnel de pension | Gardien de confiance |

Pour un séjour de 14 jours avec un chien et un chat, **vous économisez 500 à 800 € en moyenne** tout en offrant un meilleur confort à vos animaux.`,
      },
      {
        id: "comment",
        title: "Comment ça marche ?",
        content: `**1. Inscrivez-vous** — gratuit en 2 minutes, que vous soyez propriétaire ou gardien.

**2. Publiez votre annonce** — décrivez votre maison, vos animaux, les dates, et vos attentes.

**3. Recevez des candidatures** — les gardiens vérifiés de la région postulent. Regardez leurs avis, leur profil, leur expérience.

**4. Choisissez et partez serein** — échangez par messagerie, organisez la passation, et c'est parti.

Tout est sur la plateforme : messagerie, avis croisés, guide de la maison, et même des gardiens d'urgence en cas d'imprévu.`,
      },
    ],
    pois: [
      {
        title: "Balades au Semnoz",
        description: "Randonnées accessibles à 20 min d'Annecy. Parfait pour les gardiens avec chien — sentiers balisés et panoramas sur le lac.",
        icon: "mountain",
      },
      {
        title: "Baignades à Veyrier",
        description: "Plages dog-friendly en été. Les gardiens qui aiment la nature apprécient ce coin préservé au pied de la Tournette.",
        icon: "water",
      },
      {
        title: "Urgences vétérinaires 74",
        description: "Clinique VetAdom à Seynod et Urgences Vétérinaires du Lac à Meythet — ouvertes week-end et nuit.",
        icon: "stethoscope",
      },
    ],
    nearbyTowns: [
      "Annecy-le-Vieux",
      "Seynod",
      "Cran-Gevrier",
      "Meythet",
      "Pringy",
      "Argonay",
      "Veyrier-du-Lac",
      "Talloires",
      "Thônes",
      "La Clusaz",
    ],
  },

  lyon: {
    heroAlt: "Garde de chien et de chat à Lyon - Vue panoramique depuis Fourvière au coucher du soleil - Guardiens",
    subtitle: "Faites garder votre chien, votre chat ou votre maison à Lyon par un home sitter de proximité vérifié. Sans commission, sans frais de pension.",
    articleSections: [
      {
        id: "introduction",
        title: "Lyon, ville d'animaux : pourquoi la garde de proximité change tout",
        content: `Lyon est l'une des villes les plus accueillantes de France pour les animaux de compagnie. Près d'un quart des foyers lyonnais vivent avec un chien ou un chat. Du parc de la Tête d'Or aux quais de Saône, la ville offre un cadre de vie où les animaux ont toute leur place.

Mais quand vient le moment de partir — vacances, déplacement professionnel, week-end en famille — la question se pose : **à qui confier votre animal et votre maison à Lyon ?**

Guardiens est une plateforme de garde d'animaux et de home sitting fondée en Auvergne-Rhône-Alpes par Jérémie et Elisa, installés dans le Vieux-Lyon, rue Juiverie. Après cinq ans de house-sitting en AURA — 37 maisons gardées, 234 animaux accompagnés — ils ont construit un outil pensé pour les propriétaires lyonnais : des gardiens de proximité, une rencontre physique systématique avant chaque garde, et un système de confiance vérifiée.

Ce que Guardiens propose concrètement : vous publiez votre annonce, des gardiens de votre quartier postulent, vous les rencontrez autour d'un café ou lors d'une visite de votre logement, puis vous confirmez la garde. Votre animal reste chez lui, dans ses repères. Votre maison reste vivante. [Inscrivez-vous pour publier votre annonce](/inscription?role=owner).`,
      },
      {
        id: "pourquoi-proximite",
        title: "Pourquoi Lyon a besoin d'une plateforme de proximité",
        content: `### Une ville où les animaux font partie de la famille

Lyon compte plus de 150 000 chiens et chats dans son agglomération. Les Lyonnais sont attachés à leurs compagnons : promenades quotidiennes à la Tête d'Or, terrasses dog-friendly dans le Vieux-Lyon, cliniques vétérinaires de quartier ouvertes le samedi. L'animal n'est pas un accessoire — c'est un membre du foyer.

Pourtant, quand il faut partir, les solutions classiques restent inadaptées : pension collective stressante pour l'animal, personne de l'immeuble peu disponible, ou — solution par défaut — annuler le voyage.

### Les limites des pensions classiques

Les pensions pour animaux autour de Lyon facturent entre 25 et 50 euros par nuit et par animal. Pour deux semaines avec un chien, comptez 350 à 700 euros. Et le stress du changement d'environnement est réel : un chat arraché à son territoire peut cesser de s'alimenter, un chien anxieux peut développer des troubles du comportement.

Sans compter que votre maison reste vide. Boîte aux lettres qui déborde, plantes qui sèchent, volets fermés en plein jour — autant de signaux qui attirent l'attention.

### Le home sitting : une alternative qui a fait ses preuves, désormais à Lyon

Le home sitting existe depuis des décennies dans les pays anglo-saxons. Le principe est simple : un gardien de confiance s'installe chez vous, s'occupe de vos animaux dans leur environnement habituel, et veille sur votre maison. Pas de frais de pension, pas de stress pour l'animal, pas de maison vide.

À Lyon, cette logique de proximité prend tout son sens. Les quartiers ont une identité forte, les personnes du coin se reconnaissent. Guardiens structure cette confiance de proximité avec des outils de vérification et un cadre clair.`,
      },
      {
        id: "fonctionnement",
        title: "Comment fonctionne Guardiens à Lyon",
        content: `### Etape 1 — Publiez votre annonce

Décrivez votre maison, vos animaux, les dates de votre absence et vos attentes. La publication est entièrement sans frais pour les propriétaires. Précisez votre arrondissement ou votre commune pour que les gardiens de proximité vous trouvent. [Voir les tarifs](/tarifs).

### Etape 2 — Rencontrez les gardiens intéressés

Les gardiens vérifiés de Lyon et de ses environs consultent votre annonce et postulent avec un message personnalisé. Vous consultez leur profil, leurs avis, leur expérience. Puis vous organisez une rencontre : un café dans votre quartier, une visite de votre logement, une promenade avec votre chien. C'est cette rencontre physique qui fait la différence.

### Etape 3 — Confirmez la garde

Une fois le gardien choisi, vous échangez les informations pratiques via la messagerie intégrée : clés, routine de l'animal, contacts du vétérinaire. Un [guide de la maison](/guides/lyon) optionnel vous permet de tout centraliser.

### Etape 4 — Partez l'esprit libre avec des nouvelles régulières

Pendant la garde, votre gardien envoie des photos et des nouvelles de vos animaux. En cas d'imprévu, le réseau de [gardiens d'urgence à Lyon](/gardien-urgence) peut intervenir rapidement.`,
      },
      {
        id: "quartiers",
        title: "Les quartiers de Lyon couverts par nos gardiens",
        content: `Lyon se compose de neuf arrondissements et d'une ceinture de communes limitrophes, chacun avec ses particularités pour la garde d'animaux. Nos gardiens à Lyon connaissent les spécificités de chaque quartier.

**Lyon 1er — Terreaux, Croix-Rousse pentes.** Quartier dense, rues pavées et montées. Les chiens de petite taille s'y adaptent bien. Les gardiens du 1er connaissent les passages piétons vers les quais de Saône pour des promenades au calme. Peu de jardins privatifs — les sorties régulières sont essentielles.

**Lyon 2ème — Presqu'île, Bellecour, Perrache.** Coeur historique et commercial de Lyon, entre Rhône et Saône. Appartements souvent en étage, copropriétés avec règlements stricts sur les animaux. Les gardiens de la Presqu'île utilisent le jardin des Chartreux ou la place Bellecour pour les sorties.

**Lyon 3ème — Part-Dieu, Montchat.** Quartier résidentiel avec un bon équilibre entre appartements et maisons de ville côté Montchat. Le parc Bazin et le square Jussieu offrent des espaces verts de proximité pour les promenades quotidiennes à Lyon.

**Lyon 4ème — Croix-Rousse plateau.** Village dans la ville. Ambiance familiale, marchés, places arborées. Les gardiens de la Croix-Rousse apprécient le boulevard pour les balades avec vue sur les Alpes. Logements atypiques : canuts, lofts, terrasses.

**Lyon 5ème — Vieux-Lyon, Saint-Just, Point-du-Jour.** Le berceau de Guardiens. Ruelles médiévales côté Vieux-Lyon, quartiers résidentiels calmes côté Point-du-Jour. Les gardiens du 5ème connaissent les sentiers de Fourvière, les montées secrètes et les parcs en terrasse. Idéal pour les chats d'appartement avec vue.

**Lyon 6ème — Brotteaux, Tête d'Or, Masséna.** Le quartier le plus prisé de Lyon pour la garde d'animaux. Le parc de la Tête d'Or — 105 hectares — est à quelques minutes à pied. Résidences bourgeoises avec jardins, gardiens souvent sollicités pour des gardes de chiens de grande taille.

**Lyon 7ème — Guillotière, Jean-Macé, Gerland.** Quartier en pleine transformation. Les berges du Rhône offrent un parcours de 5 km idéal pour les chiens sportifs. Le quartier Gerland, plus calme, attire des familles avec jardin. Les gardiens du 7ème gèrent aussi la proximité du marché Jean-Macé.

**Lyon 8ème — Monplaisir, Bachut.** Quartier populaire et vivant, avec des rues commerçantes et des squares de proximité. Les gardiens de Monplaisir connaissent les cliniques vétérinaires du secteur — dont VetEmergency, ouverte 24h/24 — et les parcs de Parilly à quelques stations de tram.

**Lyon 9ème — Vaise, Valmy.** Quartier en renouveau côté Confluence, résidentiel et verdoyant côté Vaise. L'Île Barbe, accessible à pied, est un paradis pour les promenades avec chien. Les gardiens du 9ème apprécient le calme des bords de Saône et la proximité de l'autoroute pour les propriétaires qui voyagent.

**Communes limitrophes.** Nos gardiens couvrent également [Caluire-et-Cuire](/house-sitting/caluire-et-cuire) (résidences avec jardin, bords de Saône), Villeurbanne (proximité Tête d'Or, quartier Gratte-Ciel), Bron (maisons individuelles, parc de Parilly), Oullins (quartiers calmes, accès Confluence), et Ecully (résidentiel, campus universitaire, jardins). Chaque commune a ses gardiens de proximité référencés sur la plateforme.`,
      },
      {
        id: "proprietaires",
        title: "Propriétaires — ce que vous offre Guardiens",
        content: `Confier votre animal et votre maison à Lyon est une décision importante. Voici ce que Guardiens met en place pour que vous partiez l'esprit libre :

**Votre animal reste chez lui, dans ses repères.** Pas de cage, pas de box collectif, pas de transport stressant. Votre chien dort dans son panier, votre chat garde son territoire. Le gardien s'adapte à la routine de votre animal — horaires de repas, promenades habituelles, médicaments si nécessaire.

**Votre maison reste vivante.** Le gardien relève le courrier, arrose les plantes, aère les pièces, allume les lumières le soir. Une maison occupée est une maison protégée. À Lyon, où les absences prolongées sont visibles depuis la rue, cette présence fait la différence.

**Vous rencontrez votre gardien avant de lui confier vos clés.** C'est un principe fondamental de Guardiens : pas de garde sans rencontre préalable. Un café dans votre quartier, une visite de votre logement, une promenade avec votre chien. Vous évaluez le contact humain, votre animal aussi.

**Aucune commission sur les gardes.** Guardiens ne prélève aucun pourcentage sur les gardes. Le modèle repose sur l'abonnement des gardiens — [consultez les tarifs détaillés](/tarifs). Pour les propriétaires, tout est sans frais.

**Un accord de garde clair.** Un document optionnel formalise les engagements de chaque partie : dates, responsabilités, contacts d'urgence. Jamais contraignant, toujours rassurant.

**Des gardiens vérifiés.** Chaque gardien passe par une vérification d'identité et une rencontre physique. Les avis croisés après chaque garde construisent un historique de confiance visible sur le profil.`,
      },
      {
        id: "gardiens",
        title: "Gardiens — qui sont les personnes de confiance à Lyon",
        content: `Les gardiens Guardiens à Lyon ne correspondent pas à un profil unique. C'est cette diversité qui permet de trouver la bonne personne pour chaque situation :

**Retraités actifs** du Vieux-Lyon ou des Brotteaux, qui ont du temps, de l'expérience avec les animaux et une connaissance fine de leur quartier. Ils apprécient la compagnie d'un animal et la responsabilité de veiller sur une maison.

**Jeunes actifs** en télétravail ou en horaires flexibles, passionnés d'animaux, qui cherchent à contribuer à la vie de leur quartier. Ils sont souvent disponibles pour les gardes de courte durée ou les [petites missions](/petites-missions) ponctuelles.

**Familles** qui souhaitent offrir à leurs enfants l'expérience de s'occuper d'un animal sans l'engagement permanent. Une garde de deux semaines avec un labrador, c'est une aventure pour toute la famille.

**Etudiants vérifiés** — pour les gardes courtes, les week-ends ou les ponts. Leur disponibilité et leur énergie conviennent parfaitement aux chiens actifs qui ont besoin de longues promenades.

Tous passent par le même processus de vérification : identité contrôlée, profil détaillé, rencontre physique avec le propriétaire avant chaque garde.`,
      },
      {
        id: "tarifs",
        title: "Tarifs Guardiens : transparents et sans surprise",
        content: `Le modèle économique de Guardiens est conçu pour être lisible :

**Propriétaires : sans frais.** Vous publiez votre annonce, vous recevez des candidatures, vous choisissez votre gardien. Tout cela sans débourser un centime, toute l'année 2026.

**Gardiens : trois formules au choix.** L'abonnement mensuel à 6,99 euros par mois (résiliable à tout moment), la formule ponctuelle à 12 euros (pour une garde unique), ou l'abonnement annuel avec une réduction de 20 pour cent. [Consultez le détail des formules sur la page tarifs](/tarifs).

**Aucune commission par garde.** Contrairement aux plateformes qui prélèvent 15 à 20 pour cent sur chaque transaction, Guardiens ne touche rien sur les gardes elles-mêmes. Le gardien paie son abonnement, le propriétaire ne paie rien. C'est tout.`,
      },
      {
        id: "histoire",
        title: "L'histoire de Guardiens à Lyon",
        content: `Guardiens est né dans le Vieux-Lyon, rue Juiverie, dans l'appartement de Jérémie et Elisa. Pendant cinq ans, ils ont pratiqué le house-sitting à travers toute la région Auvergne-Rhône-Alpes : 37 maisons gardées, de la ferme isolée en Ardèche à l'appartement haussmannien des Brotteaux, en passant par les chalets de Haute-Savoie.

234 animaux accompagnés — des chiens de berger aux chats craintifs, des poules de jardin aux tortues de terrarium. Chaque garde leur a appris quelque chose : comment gérer un chien anxieux en l'absence de son maître, comment rassurer un chat qui se cache pendant trois jours, comment intervenir quand une chaudière tombe en panne un dimanche soir.

C'est cette expérience de terrain qui structure aujourd'hui la plateforme : la rencontre physique obligatoire avant chaque garde, le guide de la maison qui centralise toutes les informations pratiques, le réseau de gardiens d'urgence mobilisables en quelques heures, les avis croisés qui construisent la confiance au fil du temps.

Guardiens lance officiellement le 13 mai 2026 avec les premiers fondateurs — ceux qui rejoignent la plateforme avant le lancement public et qui contribuent à façonner l'outil. Lyon est le point de départ, l'Auvergne-Rhône-Alpes le terrain naturel d'expansion.`,
      },
      {
        id: "faq",
        title: "Questions fréquentes des propriétaires à Lyon",
        content: `**Comment rencontrer un gardien avant de confier ma maison ?**
Après avoir accepté une candidature, vous organisez une rencontre directement via la messagerie Guardiens. La plupart des propriétaires à Lyon choisissent un café de quartier ou une visite du logement. Cette étape est systématique et fortement recommandée.

**Que se passe-t-il en cas d'urgence ou d'imprévu ?**
Guardiens dispose d'un réseau de [gardiens d'urgence à Lyon](/gardien-urgence), mobilisables rapidement. En cas de problème vétérinaire, le gardien contacte la clinique indiquée dans le guide de la maison. En cas de problème technique (fuite, panne), il suit les consignes laissées par le propriétaire.

**Comment sont vérifiés les gardiens à Lyon ?**
Chaque gardien fournit une pièce d'identité vérifiée manuellement par l'équipe Guardiens. Les avis croisés après chaque garde et les badges de fiabilité complètent le dispositif de confiance. [En savoir plus dans la FAQ](/faq).

**Puis-je publier une annonce pour un chien ET un chat ?**
Absolument. Votre annonce peut inclure tous vos animaux. Les gardiens qui postulent voient la composition exacte de votre foyer et décident en connaissance de cause.

**Combien de temps à l'avance faut-il publier mon annonce ?**
Pour les vacances d'été à Lyon, nous recommandons un mois à l'avance. Pour un week-end, une à deux semaines suffisent généralement. Plus l'annonce est publiée tôt, plus vous recevez de candidatures de gardiens de qualité.

**Que faire si mon gardien annule au dernier moment ?**
C'est rare mais cela peut arriver. Guardiens active alors le réseau de gardiens d'urgence de votre zone. Le système de fiabilité pénalise les annulations répétées pour garantir la qualité du réseau.

**Comment se passe la remise des clés à Lyon ?**
Lors de la rencontre préalable ou le jour du départ, vous remettez les clés en main propre à votre gardien. Certains propriétaires lyonnais laissent un double dans une boîte à clés sécurisée — c'est à votre convenance.

**Guardiens fonctionne-t-il pour les gardes de plusieurs semaines ?**
Oui. La plateforme est conçue pour les gardes de toute durée, du week-end prolongé aux absences de plusieurs semaines. Les gardiens indiquent leurs disponibilités sur leur profil.`,
      },
      {
        id: "conclusion",
        title: "Lyon, point de départ de Guardiens en Auvergne-Rhône-Alpes",
        content: `Lyon est le coeur du réseau Guardiens. C'est ici que la plateforme est née, ici que les premiers gardiens et propriétaires se sont rencontrés, ici que le modèle de confiance de proximité a été testé et validé.

Que vous viviez dans le Vieux-Lyon, à la Croix-Rousse, à Monplaisir ou à Villeurbanne, Guardiens vous connecte avec des gardiens vérifiés de votre quartier. Votre animal reste dans ses repères, votre maison reste vivante, et vous partez l'esprit libre.

Le réseau s'étend progressivement à toute l'Auvergne-Rhône-Alpes : [Annecy](/actualites/house-sitting-annecy), Grenoble, Chambéry, et au-delà. Mais Lyon reste le pilier, la ville de référence, celle où tout a commencé.

[Publiez votre première annonce](/inscription?role=owner) — c'est sans frais pour les propriétaires.

[Devenez gardien à Lyon](/inscription?role=guardian) — rejoignez le réseau de confiance.

Consultez également le [guide complet du gardien à Lyon](/guides/lyon), la page [département du Rhône](/departement/rhone), ou découvrez [ce qu'est le house-sitting](/actualites/c-est-quoi-le-house-sitting).`,
      },
    ],
    pois: [
      {
        title: "Parc de la Tête d'Or",
        description: "105 hectares en plein coeur de Lyon. Le plus grand parc urbain de France, idéal pour les promenades quotidiennes avec un chien. Sentiers ombragés et zones enherbées.",
        icon: "tree",
      },
      {
        title: "Berges du Rhône",
        description: "5 km de promenades aménagées le long du fleuve. Zones dog-friendly, ambiance familiale. Les gardiens sportifs apprécient ce parcours en plein coeur de Lyon.",
        icon: "water",
      },
      {
        title: "Quais de Saône",
        description: "Promenade piétonne de Saint-Paul à Ile Barbe. Calme et verdure en bord de rivière, parfait pour les chiens anxieux qui ont besoin de tranquillité à Lyon.",
        icon: "water",
      },
      {
        title: "Urgences vétérinaires Lyon",
        description: "VetEmergency Lyon 8ème et Clinique Vétérinaire de Garde — ouvertes 24h/24, 7j/7. Numéros dans chaque guide de la maison.",
        icon: "stethoscope",
      },
    ],
    nearbyTowns: [
      "Villeurbanne",
      "Caluire-et-Cuire",
      "Ecully",
      "Tassin-la-Demi-Lune",
      "Sainte-Foy-lès-Lyon",
      "Oullins",
      "Bron",
      "Vénissieux",
      "Rillieux-la-Pape",
      "Saint-Priest",
    ],
  },

  grenoble: {
    heroAlt: "Vue de Grenoble avec les Alpes et la Bastille en arrière-plan",
    subtitle: "Trouvez un home sitter de confiance au pied des Alpes — gardiens vérifiés dans l'agglomération grenobloise.",
    articleSections: [
      {
        id: "pourquoi",
        title: "Pourquoi le house-sitting à Grenoble ?",
        content: `Grenoble, ceinturée par trois massifs montagneux — Chartreuse, Vercors, Belledonne — attire des passionnés d'outdoor. Mais quand on part randonner, skier ou voyager, qui garde la maison et les animaux ?

Le house-sitting (parfois appelé home sitting en français) à Grenoble, c'est la réponse locale : un home sitter vérifié s'installe chez vous, s'occupe de vos animaux dans leur environnement, et veille sur votre logement. **Gratuit pour le propriétaire.**

La cuvette grenobloise crée des contraintes spécifiques : pics de pollution en hiver, chaleur estivale concentrée, et quartiers en pente parfois difficiles d'accès par temps de neige. Un home sitter local connaît ces réalités.`,
      },
      {
        id: "securite",
        title: "Pollution, montagne et vigilance : les réflexes d'un gardien grenoblois",
        content: `Grenoble est régulièrement touchée par des épisodes de pollution aux particules fines, surtout entre novembre et février. Un house-sitter averti sait :

- **Limiter les sorties** des animaux lors des alertes pollution (seuil PM10)
- **Fermer les fenêtres** et utiliser la VMC en mode recirculation
- **Adapter les promenades** vers les hauteurs mieux ventilées (Bastille, Meylan)

En hiver, les quartiers en pente de La Tronche, Corenc ou Eybens peuvent geler. Un gardien grenoblois anticipe le salage, connaît les parkings en contrebas et sait gérer un chauffage collectif.

En été, la cuvette concentre la chaleur : un bon gardien maintient les volets fermés la journée et aère en soirée — un réflexe vital pour les animaux sensibles.`,
      },
      {
        id: "match",
        title: "Pension vs Guardiens à Grenoble",
        content: `Les pensions pour chiens autour de Grenoble facturent entre 25 et 40 €/jour. Pour un chat, comptez 15 à 20 €.

| | Pension | Guardiens |
|---|---|---|
| **Coût** | 25-40 €/jour | Gratuit |
| **Environnement** | Cage / box | Chez vous |
| **Stress animal** | Élevé | Minimal |
| **Maison surveillée** | Non | Oui |
| **Jardin entretenu** | Non | Oui |

Pour un séjour ski de 10 jours avec un chien, **vous économisez 250 à 400 €** et votre animal reste dans son environnement.`,
      },
      {
        id: "quartiers",
        title: "Grenoble quartier par quartier",
        content: `Chaque quartier grenoblois a ses spécificités pour le house-sitting :

- **Centre-ville / Championnet** : appartements, copropriétés strictes, sorties chien au Parc Paul Mistral
- **Île Verte** : résidentiel calme, proximité Isère, idéal familles avec jardin
- **Bastille / Saint-Laurent** : logements en pente, vue exceptionnelle, accès parfois compliqué en hiver
- **Eybens / Échirolles** : maisons avec jardin, parking facile, quartiers familiaux
- **Meylan / La Tronche** : résidentiel chic, grands jardins, altitude = meilleur air mais risque verglas

Nos gardiens grenoblois connaissent ces spécificités et adaptent leur approche en conséquence.`,
      },
    ],
    pois: [
      {
        title: "Bastille & sentiers",
        description: "Réseau de randonnées accessible depuis le centre-ville. Montée à pied ou en téléphérique. Parfait pour les gardiens avec chien actif.",
        icon: "mountain",
      },
      {
        title: "Parc Paul Mistral",
        description: "Grand parc urbain central avec pelouses et zones ombragées — le poumon vert des gardiens en ville.",
        icon: "tree",
      },
      {
        title: "Urgences vétérinaires 38",
        description: "Clinique vétérinaire de garde à Échirolles — urgences 24h/24. Clinique du Drac à Fontaine en journée.",
        icon: "stethoscope",
      },
    ],
    nearbyTowns: [
      "Meylan",
      "Saint-Martin-d'Hères",
      "Échirolles",
      "Fontaine",
      "Sassenage",
      "La Tronche",
      "Corenc",
      "Voiron",
      "Eybens",
      "Seyssinet-Pariset",
    ],
  },
};

/**
 * Get city content by slug (normalized: lowercase, no accents, dashes).
 * Falls back to a generic structure if no specific content exists.
 */
export function getCityContent(slug: string): CityContentData | null {
  const normalized = slugify(slug);
  return cityContent[normalized] || null;
}

export default cityContent;
