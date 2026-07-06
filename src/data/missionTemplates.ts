/**
 * Modèles de petites missions, pré-remplissent le formulaire de création
 * pour lever la friction de la page blanche.
 *
 * Règles :
 *  - Pas d'emoji ni d'icône Lucide décorative dans les libellés visibles
 *  - Vouvoiement systématique
 *  - Pas de nuitée (entraide ponctuelle uniquement)
 *  - Catégorie ∈ animals | garden | house | skills
 *  - Durée ∈ "1-2h" | "half_day" | "several" | "weekend"
 */
export type MissionTemplate = {
  id: string;
  type: "besoin" | "offre";
  category: "animals" | "garden" | "house" | "skills";
  duration: "1-2h" | "half_day" | "several" | "weekend";
  label: string;          // libellé court affiché sur le bouton-modèle
  title: string;          // pré-remplit le champ Titre
  description: string;    // pré-remplit la description
  exchange: string;       // pré-remplit l'idée d'échange (modifiable)
};

export const MISSION_TEMPLATES: MissionTemplate[] = [
  // ─── BESOINS, Animaux ───
  {
    id: "need-dog-walk",
    type: "besoin",
    category: "animals",
    duration: "1-2h",
    label: "Promener mon chien",
    title: "Promener mon chien cette semaine",
    description:
      "Bonjour, je cherche quelqu'un pour promener mon chien (gentil, sociable, taille moyenne) une heure environ, idéalement en fin d'après-midi. Je peux vous montrer son parcours préféré.",
    exchange: "Un bon café et des biscuits maison à votre retour",
  },
  {
    id: "need-cat-feed",
    type: "besoin",
    category: "animals",
    duration: "several",
    label: "Nourrir mon chat",
    title: "Passages quotidiens pour nourrir le chat",
    description:
      "Je m'absente quelques jours et cherche quelqu'un pour passer une fois par jour nourrir mon chat, changer l'eau et nettoyer la litière. Pas de garde de nuit, juste un passage rapide. Tout est préparé.",
    exchange: "Un panier garni à mon retour, ou ce qui vous fait plaisir",
  },
  {
    id: "need-vet-visit",
    type: "besoin",
    category: "animals",
    duration: "1-2h",
    label: "Accompagner chez le véto",
    title: "Accompagner mon chien chez le vétérinaire",
    description:
      "J'ai un rendez-vous chez le vétérinaire et je n'ai pas de voiture / je ne peux pas m'absenter du travail. Je cherche quelqu'un de patient et doux avec les animaux pour l'emmener et le ramener.",
    exchange: "Je rembourse les frais et offre un repas pour vous remercier",
  },
  {
    id: "need-poultry",
    type: "besoin",
    category: "animals",
    duration: "weekend",
    label: "Garder les poules",
    title: "Donner à manger aux poules ce week-end",
    description:
      "Je pars 2 jours et cherche quelqu'un pour passer matin et soir donner à manger à mes poules, vérifier l'eau et fermer le poulailler le soir. Très simple, je vous explique tout.",
    exchange: "Les œufs de la semaine sont pour vous",
  },

  // ─── BESOINS, Maison ───
  {
    id: "need-mail",
    type: "besoin",
    category: "house",
    duration: "several",
    label: "Récupérer le courrier",
    title: "Relever ma boîte aux lettres pendant mon absence",
    description:
      "Je m'absente une semaine. Je cherche une personne de confiance pour passer relever le courrier deux ou trois fois et le glisser à l'intérieur. Présence rassurante pour la maison aussi.",
    exchange: "Un petit cadeau souvenir de mon voyage",
  },
  {
    id: "need-plants",
    type: "besoin",
    category: "house",
    duration: "several",
    label: "Arroser les plantes",
    title: "Arroser mes plantes pendant 5 jours",
    description:
      "Je cherche quelqu'un pour arroser mes plantes d'intérieur (une dizaine) tous les deux jours pendant mon absence. Je vous montre lesquelles avant et vous laisse les consignes par écrit.",
    exchange: "Vous repartez avec des boutures si ça vous tente",
  },
  {
    id: "need-handyman",
    type: "besoin",
    category: "house",
    duration: "1-2h",
    label: "Petit bricolage",
    title: "Coup de main pour fixer une étagère",
    description:
      "J'ai une étagère à fixer au mur et je n'ai ni les outils ni l'expérience. Je cherche quelqu'un de bricoleur pour me donner un coup de main une heure ou deux.",
    exchange: "Un bon repas partagé, je cuisine bien",
  },

  // ─── BESOINS, Jardin ───
  {
    id: "need-watering",
    type: "besoin",
    category: "garden",
    duration: "several",
    label: "Arroser le potager",
    title: "Arroser le potager pendant mon absence",
    description:
      "Je pars une semaine en plein été. Je cherche quelqu'un pour passer le soir arroser le potager (tomates, courgettes, salades). C'est rapide, le tuyau est sur place.",
    exchange: "Servez-vous dans les légumes, ils sont à vous",
  },
  {
    id: "need-hedge",
    type: "besoin",
    category: "garden",
    duration: "half_day",
    label: "Tailler la haie",
    title: "Coup de main pour tailler la haie samedi",
    description:
      "J'ai une haie à tailler et je n'y arriverai pas seul·e. Je cherche quelqu'un pour me donner un coup de main une demi-journée samedi. Outils sur place.",
    exchange: "Barbecue à midi, je m'occupe de tout",
  },
  {
    id: "need-pickup",
    type: "besoin",
    category: "garden",
    duration: "half_day",
    label: "Verger à ramasser",
    title: "Ramasser les pommes du verger",
    description:
      "Mes pommiers débordent et je n'arrive pas à tout ramasser. Je cherche quelqu'un qui aurait envie de venir une demi-journée, vous repartez avec votre récolte.",
    exchange: "La moitié de ce que vous ramassez est à vous",
  },

  // ─── OFFRES ───
  {
    id: "offer-dog-walk",
    type: "offre",
    category: "animals",
    duration: "1-2h",
    label: "Promener un chien",
    title: "Je peux promener un chien le week-end",
    description:
      "J'aime marcher et j'ai du temps libre le week-end. Je peux promener votre chien une heure ou deux, parc ou campagne. Calme, à l'aise avec les animaux, je reviens avec lui en pleine forme.",
    exchange: "À voir ensemble, un café, un fruit du jardin, ce qui vous fait plaisir",
  },
  {
    id: "offer-cat-feed",
    type: "offre",
    category: "animals",
    duration: "several",
    label: "Nourrir un chat",
    title: "Je peux passer nourrir votre chat en semaine",
    description:
      "Je travaille à proximité et peux facilement passer une fois par jour nourrir votre chat, changer l'eau et la litière. Habitué·e aux animaux, ponctuel·le, discret·e.",
    exchange: "À voir ensemble, un petit geste suffit",
  },
  {
    id: "offer-garden",
    type: "offre",
    category: "garden",
    duration: "half_day",
    label: "Coup de main jardin",
    title: "Je donne un coup de main au jardin",
    description:
      "Je suis disponible certaines demi-journées pour aider au jardin : arrosage, désherbage, tonte, taille. J'aime le travail dehors et je sais y faire.",
    exchange: "Quelques légumes du jardin ou un repas partagé",
  },
  {
    id: "offer-handyman",
    type: "offre",
    category: "house",
    duration: "1-2h",
    label: "Petit bricolage",
    title: "Je peux donner un coup de main bricolage",
    description:
      "Étagères, ampoules, petits montages, dépannage simple : je peux passer une heure ou deux. J'ai mes outils. Honnête sur ce que je sais faire et ce que je ne sais pas faire.",
    exchange: "Un café, un repas, à voir ensemble",
  },
  {
    id: "offer-skill",
    type: "offre",
    category: "skills",
    duration: "1-2h",
    label: "Partager un savoir",
    title: "Je partage mon savoir (à préciser)",
    description:
      "J'ai une compétence que j'aime partager (à compléter : cuisine, couture, informatique, langue, musique, etc.). Je peux donner une ou deux heures pour vous transmettre les bases ou vous dépanner.",
    exchange: "Le plaisir de transmettre, ou ce que vous voulez offrir en retour",
  },

  // ─── Exemples empty state hub EntraideHub (Pass 1) ───
  {
    id: "need-garden-august",
    type: "besoin",
    category: "garden",
    duration: "several",
    label: "Arroser mon potager 15 jours en août",
    title: "Arroser mon potager 15 jours en août",
    description:
      "Je pars 15 jours en août et cherche quelqu'un pour passer arroser mon potager (tomates, courgettes, salades) un jour sur deux. Le tuyau est sur place, c'est rapide.",
    exchange: "Servez-vous dans les légumes mûrs, ils sont à vous",
  },
  {
    id: "need-amazon-pickup",
    type: "besoin",
    category: "house",
    duration: "1-2h",
    label: "Récupérer un colis Amazon samedi",
    title: "Récupérer un colis Amazon en mon absence, samedi 12",
    description:
      "Je serai absent samedi entre 10h et 18h. Je cherche une personne de confiance à proximité pour réceptionner un colis Amazon devant chez moi (le livreur passe entre 14h et 16h) et le mettre à l'abri. Rapide.",
    exchange: "Un café ou une petite attention à mon retour, comme vous voulez",
  },
  {
    id: "need-ikea-bookshelf",
    type: "besoin",
    category: "house",
    duration: "half_day",
    label: "Monter une bibliothèque IKEA",
    title: "Un coup de main pour monter une bibliothèque IKEA",
    description:
      "J'ai une grande bibliothèque IKEA à monter et je préfère m'y mettre à deux. Je cherche quelqu'un de patient, un bon tournevis et une demi-journée devraient suffire. Notice fournie.",
    exchange: "Repas partagé à midi, je m'occupe de tout",
  },
  {
    id: "offer-cat-weekend",
    type: "offre",
    category: "animals",
    duration: "weekend",
    label: "Garder votre chat le week-end",
    title: "Je peux vous garder votre chat le week-end si vous partez",
    description:
      "Je suis disponible plusieurs week-ends par mois pour venir nourrir votre chat, changer l'eau et la litière, jouer un peu. Habitué·e aux félins, calme et régulier·e.",
    exchange: "Un petit geste à votre retour, à voir ensemble",
  },
  {
    id: "offer-yoga-barter",
    type: "offre",
    category: "skills",
    duration: "1-2h",
    label: "Prof de yoga contre bricolage",
    title: "Prof de yoga bénévole en échange de bricolage",
    description:
      "Prof de yoga, je peux donner un cours particulier chez vous ou en extérieur. En échange, j'aimerais un coup de main sur des petits travaux (étagère, meuble à monter, luminaire à installer).",
    exchange: "Une séance de yoga contre un coup de main bricolage",
  },
  {
    id: "offer-electricity",
    type: "offre",
    category: "skills",
    duration: "1-2h",
    label: "Dépannage électricité",
    title: "Compétences en électricité, je peux dépanner un ami",
    description:
      "Électricien de formation, je peux venir jeter un œil et dépanner les petites choses courantes (prise, interrupteur, luminaire, disjoncteur qui saute). Honnête sur ce que je sais faire et ce qui demande un vrai pro.",
    exchange: "Un café, un repas partagé, ce qui vous fait plaisir",
  },
];

export function templatesFor(type: "besoin" | "offre"): MissionTemplate[] {
  return MISSION_TEMPLATES.filter((t) => t.type === type);
}
