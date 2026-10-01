export interface LocalSpot {
 name: string;
 type: "parc" | "balade" | "quartier" | "vétérinaire" | "marché";
 tip: string;
}

export type ZoneProfile = "montagne" | "urbain" | "périurbain";

export interface CityData {
 slug: string;
 name: string;
 department: string;
 departmentCode: string;
 coordinates: { lat: number; lng: number };
 zoneProfile: ZoneProfile;
 keywordPrimary: string;
 keywordSecondary: string[];
 h1: string;
 metaDescription: string;
 localSpots: LocalSpot[];
 riskProfile: string[];
 expertiseTips: string[];
 heroImageAlt: string;
}

export const CITIES: CityData[] = [
 {
 slug: "annecy",
 name: "Annecy",
 department: "Haute-Savoie",
 departmentCode: "74",
 coordinates: { lat: 45.8992, lng: 6.1294 },
 zoneProfile: "montagne",
 keywordPrimary: "house-sitting Annecy",
 keywordSecondary: [
 "garde maison Annecy",
 "pet sitting Haute-Savoie",
 "gardien de maison Annecy",
 "home sitter Annecy",
 ],
 h1: "House-sitting à Annecy : faire garder sa maison et ses animaux",
 metaDescription:
 "Faire garder sa maison et ses animaux à Annecy : un gardien séjourne chez vous, sans rémunération. Ce qu'il faut convenir, règles chiens et lac, imprévus.",
 localSpots: [
 {
 name: "Promenade du Thiou",
 type: "balade",
 tip: "Une portion est ouverte aux chiens sans laisse par arrêté municipal, sauf du 15 avril au 30 juin.",
 },
 {
 name: "Bords du lac",
 type: "balade",
 tip: "Laisse demandée en balade ; les plages du lac n'acceptent pas les chiens.",
 },
 {
 name: "Parc du Haras",
 type: "parc",
 tip: "Interdit aux animaux, même tenus en laisse, sauf chiens guides.",
 },
 ],
 riskProfile: [
 "Hiver : gel et neige possibles, consignes de chauffage et d'accès à prévoir",
 "Été : forte affluence autour du lac, sorties à décaler tôt le matin",
 ],
 expertiseTips: [
 "Précisez par écrit le réglage du chauffage et la mise hors gel si vous partez en hiver.",
 "Indiquez les lieux de promenade habituels de votre chien et les règles de laisse.",
 ],
 heroImageAlt:
 "Le lac d'Annecy et les montagnes qui l'entourent",
 },
 {
 slug: "lyon",
 name: "Lyon",
 department: "Rhône",
 departmentCode: "69",
 coordinates: { lat: 45.764, lng: 4.8357 },
 zoneProfile: "urbain",
  keywordPrimary: "home sitter Lyon",
  keywordSecondary: [
  "pet sitter Lyon",
  "home sitting Lyon",
  "home sitter Lyon",
  "garde animaux Lyon",
  "gardien maison Lyon",
  "house-sitting Lyon",
  "garde chien Lyon",
  ],
  h1: "Home sitting à Lyon : faire garder son chien, son chat et son logement",
  metaDescription:
  "Home sitting à Lyon : un gardien séjourne chez vous et veille sur votre chien, votre chat et votre logement, sans rémunération. Règles, clés, frais, sorties.",
 localSpots: [
 {
 name: "Parc de la Tête d'Or",
 type: "parc",
 tip: "Aire canine près du vélodrome ; laisse dans le reste du parc, interdictions signalées sur place.",
 },
 {
 name: "Berges du Rhône",
 type: "balade",
 tip: "Laisse obligatoire ; espaces canins de liberté sur les quais hauts.",
 },
 {
 name: "Parc Blandan",
 type: "parc",
 tip: "Aire canine derrière les terrains de sport.",
 },
 ],
 riskProfile: [
 "Été : fortes chaleurs en ville, sorties tôt le matin et tard le soir",
 "Logements en étage : ascenseur, interphone et règles de copropriété à expliquer",
 ],
 expertiseTips: [
 "Laissez les badges de résidence et une liste des contacts de l'immeuble.",
 "Précisez les horaires de sortie souhaités en cas de forte chaleur.",
 ],
 heroImageAlt:
 "Vue de Lyon depuis la colline de Fourvière",
 },
 {
 slug: "grenoble",
 name: "Grenoble",
 department: "Isère",
 departmentCode: "38",
 coordinates: { lat: 45.1885, lng: 5.7245 },
 zoneProfile: "urbain",
 keywordPrimary: "house-sitting Grenoble",
 keywordSecondary: [
 "garde maison Grenoble",
 "pet sitting Isère",
 "house sitter Grenoble",
 "home sitter Grenoble",
 "home sitting Grenoble",
 ],
 h1: "House-sitting à Grenoble : faire garder sa maison et ses animaux",
 metaDescription:
 "House-sitting à Grenoble : un gardien séjourne chez vous, sans rémunération de la garde. Ce qu'il faut convenir, zones chiens des parcs, imprévus.",
 localSpots: [
 {
 name: "Parc Paul-Mistral",
 type: "parc",
 tip: "Zone de liberté signalée pour les chiens depuis l'été 2025 ; laisse ailleurs dans le parc.",
 },
 {
 name: "Jardin Hoche",
 type: "parc",
 tip: "Zonage chiens en place : repérez les secteurs en laisse, libres ou interdits.",
 },
 {
 name: "Jardin des Plantes",
 type: "parc",
 tip: "Interdit aux chiens selon le règlement des espaces verts.",
 },
 ],
 riskProfile: [
 "Hiver : épisodes de pollution possibles, durée des sorties à convenir",
 "Maisons en pente : accès par temps de neige à anticiper",
 ],
 expertiseTips: [
 "Indiquez quelle durée de sortie vous souhaitez en cas d'épisode de pollution.",
 "Expliquez l'accès au logement et le stationnement.",
 ],
 heroImageAlt:
 "Grenoble et les massifs qui l'entourent",
 },
 {
 slug: "caluire-et-cuire",
 name: "Caluire-et-Cuire",
 department: "Rhône",
 departmentCode: "69",
 coordinates: { lat: 45.796, lng: 4.851 },
 zoneProfile: "périurbain",
 keywordPrimary: "house-sitting Caluire-et-Cuire",
 keywordSecondary: [
 "garde maison Caluire",
 "pet sitting nord Lyon",
 "gardien maison Caluire",
 ],
 h1: "House-sitting à Caluire-et-Cuire : votre gardien de confiance",
 metaDescription:
 "Garde de maison et animaux à Caluire-et-Cuire. Gardiens du coin à 15 min. Résidences avec jardin, chiens et chats bienvenus. Gratuit propriétaires.",
 localSpots: [
 {
 name: "Parc de Montribloud",
 type: "parc",
 tip: "Espace vert calme, peu fréquenté, idéal pour les chiens anxieux ou en rééducation.",
 },
 {
 name: "Rives de Saône (Rochetaillée)",
 type: "balade",
 tip: "Chemin naturel 4 km, sans voiture. Praticable toute l'année sauf crue hivernale.",
 },
 {
 name: "Centre-ville Caluire",
 type: "quartier",
 tip: "Commerces de proximité ouverts le dimanche matin, utile pour les urgences vétérinaires mineures.",
 },
 ],
 riskProfile: [
 "Inondations Saône : quais bas inondables décembre à mars, logements proches à surveiller",
 "Jardins avec piscine : fermeture sécurisée à vérifier avant chaque mission",
 ],
 expertiseTips: [
 "Nos gardiens Caluire connaissent les zones inondables et savent gérer les accès en période de crue.",
 "Pour les maisons avec jardin et piscine, nos gardiens appliquent le protocole de sécurité piscine standard.",
 ],
 heroImageAlt:
 "House-sitting Caluire-et-Cuire - Garde maison nord Lyon - Guardiens",
 },
 {
 slug: "chambery",
 name: "Chambéry",
 department: "Savoie",
 departmentCode: "73",
 coordinates: { lat: 45.5646, lng: 5.9178 },
 zoneProfile: "montagne",
 keywordPrimary: "house-sitting Chambéry",
 keywordSecondary: [
 "garde maison Chambéry",
 "pet sitting Savoie",
 "gardien maison Chambéry",
 "home sitter Chambéry",
 "home sitting Chambéry",
 ],
 h1: "House-sitting à Chambéry : partez sans inquiétude",
 metaDescription:
 "Home sitting à Chambéry : trouvez un home sitter de confiance en Savoie. Gardiens du coin, disponibles rapidement. 0 € pour les propriétaires.",
 localSpots: [
 {
 name: "Lac du Bourget (rive sud)",
 type: "balade",
 tip: "Sentier plat 8 km, chiens acceptés. Parking gratuit à Brison-Saint-Innocent.",
 },
 {
 name: "Parc du Verney",
 type: "parc",
 tip: "Central, ombragé, point d'eau pour les chiens. Ouvert jusqu'à 21h en été.",
 },
 {
 name: "Les Halles de l'Île",
 type: "quartier",
 tip: "Marchés mardi et samedi matin, excellent ancrage de proximité pour les gardiens locaux.",
 },
 ],
 riskProfile: [
 "Verglas fréquent novembre à mars, notamment sur les hauteurs de Jacob-Bellecombette",
 "Brouillard matinal automnal persistent : vigilance pour les sorties tôt le matin",
 ],
 expertiseTips: [
 "Nos gardiens chambériens anticipent le verglas et adaptent les horaires de sorties animaux en conséquence.",
 "Pour les résidences avec cave ou sous-sol humide, nos gardiens vérifient les pompes de relevage en hiver.",
 ],
 heroImageAlt:
 "House-sitting Chambéry - Garde maison Savoie - Guardiens",
 },
];
