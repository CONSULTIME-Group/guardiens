import { Helmet } from "react-helmet-async";
import type { CityData } from "@/data/cities";
import type { CityStats } from "@/hooks/useCityStats";
import { slugify } from "@/lib/normalize";

interface Props {
 city: CityData;
 stats: CityStats;
}

const LYON_FAQ = [
 {
 q: "Comment rencontrer un gardien avant de confier ma maison ?",
 a: "Après avoir accepté une candidature, vous organisez une rencontre directement via la messagerie Guardiens. La plupart des propriétaires à Lyon choisissent un café de quartier ou une visite du logement. Cette étape est systématique et fortement recommandée.",
 },
 {
 q: "Que se passe-t-il en cas d'urgence ou d'imprévu ?",
 a: "Guardiens dispose d'un réseau de gardiens d'urgence à Lyon, mobilisables rapidement. En cas de problème vétérinaire, le gardien contacte la clinique indiquée dans le guide de la maison. En cas de problème technique, il suit les consignes laissées par le propriétaire.",
 },
 {
 q: "Comment sont vérifiés les gardiens à Lyon ?",
 a: "Chaque gardien fournit une pièce d'identité vérifiée manuellement par l'équipe Guardiens. Les avis croisés après chaque garde et les badges de fiabilité complètent le dispositif de confiance.",
 },
 {
 q: "Puis-je publier une annonce pour un chien ET un chat ?",
 a: "Absolument. Votre annonce peut inclure tous vos animaux. Les gardiens qui postulent voient la composition exacte de votre foyer et décident en connaissance de cause.",
 },
 {
 q: "Combien de temps à l'avance faut-il publier mon annonce ?",
 a: "Pour les vacances d'été à Lyon, nous recommandons un mois à l'avance. Pour un week-end, une à deux semaines suffisent généralement. Plus l'annonce est publiée tôt, plus vous recevez de candidatures de gardiens de qualité.",
 },
 {
 q: "Que faire si mon gardien annule au dernier moment ?",
 a: "C'est rare mais cela peut arriver. Guardiens active alors le réseau de gardiens d'urgence de votre zone. Le système de fiabilité pénalise les annulations répétées pour garantir la qualité du réseau.",
 },
 {
 q: "Comment se passe la remise des clés à Lyon ?",
 a: "Lors de la rencontre préalable ou le jour du départ, vous remettez les clés en main propre à votre gardien. Certains propriétaires lyonnais laissent un double dans une boîte à clés sécurisée.",
 },
 {
 q: "Guardiens fonctionne-t-il pour les gardes de plusieurs semaines ?",
 a: "Oui. La plateforme est conçue pour les gardes de toute durée, du week-end prolongé aux absences de plusieurs semaines. Les gardiens indiquent leurs disponibilités sur leur profil.",
 },
];

const ANNECY_FAQ = [
 {
 q: "Comment trouver un gardien de confiance à Annecy ?",
 a: "Vous publiez votre annonce gratuitement et les gardiens disponibles à Annecy et en Haute-Savoie postulent. Chaque profil est vérifié manuellement (pièce d'identité, avis croisés, badges de fiabilité). Vous échangez avec les candidats via la messagerie et organisez une rencontre avant de confier vos clés.",
 },
 {
 q: "Les gardiens à Annecy sont-ils habitués aux logements de montagne ?",
 a: "Oui. Nos gardiens locaux connaissent les spécificités hivernales : gestion du chauffage, prévention du gel des canalisations, accès difficiles par grand froid. Ils anticipent aussi l'affluence estivale autour du lac et adaptent les sorties chien aux pistes forestières moins fréquentées.",
 },
 {
 q: "Puis-je faire garder un chien actif qui a besoin de longues balades ?",
 a: "Absolument. Annecy et ses alentours (Forêt du Crêt du Maure, tour du lac, Semnoz) sont un terrain de jeu idéal. Précisez le rythme habituel de votre chien dans l'annonce, les gardiens sélectionnent leurs candidatures en conséquence.",
 },
 {
 q: "Que se passe-t-il en cas d'urgence vétérinaire à Annecy ?",
 a: "Le guide de la maison que vous remplissez avant le départ contient les coordonnées de votre vétérinaire et de la clinique d'urgence la plus proche. En cas d'imprévu, le gardien suit ces consignes. Le réseau Gardien d'Urgence Guardiens est mobilisable en quelques heures sur la Haute-Savoie.",
 },
 {
 q: "Combien coûte une garde de maison à Annecy ?",
 a: "Pour les propriétaires, Guardiens est gratuit : aucun frais, aucune commission. Les gardiens accèdent à la plateforme via un abonnement modeste (6,99 €/mois), et tous les gardiens sont gratuits jusqu'au 14 juillet 2026.",
 },
 {
 q: "Combien de temps à l'avance publier mon annonce pour les vacances d'été ?",
 a: "Annecy est très demandée en été. Pour juillet-août, publiez idéalement 4 à 6 semaines à l'avance pour recevoir un large choix de candidatures. Pour un week-end hors saison, 1 à 2 semaines suffisent généralement.",
 },
];

const GRENOBLE_FAQ = [
 {
 q: "Comment trouver un home sitter à Grenoble et en Isère ?",
 a: "Vous publiez gratuitement votre annonce sur Guardiens et les gardiens vérifiés disponibles à Grenoble et dans le bassin grenoblois postulent. Vous choisissez le profil qui vous convient après échange et rencontre.",
 },
 {
 q: "Les gardiens à Grenoble connaissent-ils les sorties chien adaptées en montagne ?",
 a: "Oui. Beaucoup de nos gardiens grenoblois pratiquent eux-mêmes la randonnée ou le trail. Ils connaissent les sentiers de la Bastille, du Vercors et de la Chartreuse, ainsi que les zones à éviter en été (forte chaleur en plaine) et en hiver (neige, sel de déneigement).",
 },
 {
 q: "Comment se passe la garde dans un appartement en centre-ville ?",
 a: "La majorité de nos gardes à Grenoble se font en appartement. Les gardiens organisent les sorties chien selon les habitudes que vous décrivez (Jardin de Ville, parc Paul-Mistral, berges de l'Isère). Pour les chats, ils respectent les rituels alimentaires et de litière indiqués dans le guide de la maison.",
 },
 {
 q: "Mon animal a un traitement médical, est-ce gérable ?",
 a: "Oui. Vous renseignez précisément le protocole dans le guide de la maison (médicament, posologie, horaires). Les gardiens confirment au candidatant qu'ils sont à l'aise avec l'administration de traitements.",
 },
 {
 q: "Est-ce que Guardiens couvre les communes autour de Grenoble ?",
 a: "Oui. Le maillage couvre l'ensemble du bassin grenoblois : Échirolles, Saint-Martin-d'Hères, Meylan, Voiron, Vif. Indiquez votre commune exacte dans l'annonce, les gardiens géolocalisés à proximité reçoivent une alerte.",
 },
 {
 q: "À combien revient une garde de chien à Grenoble ?",
 a: "Pour les propriétaires, c'est gratuit : aucun frais ni commission sur la plateforme. Les gardiens souscrivent un abonnement à 6,99 €/mois et sont gratuits jusqu'au 14 juillet 2026.",
 },
];

const CHAMBERY_FAQ = [
 {
 q: "Comment trouver un gardien de confiance à Chambéry ?",
 a: "Vous publiez votre annonce gratuitement sur Guardiens, les gardiens vérifiés disponibles à Chambéry et en Savoie postulent. Vous échangez avec eux et organisez une rencontre avant la garde.",
 },
 {
 q: "Les gardiens à Chambéry connaissent-ils les contraintes saisonnières ?",
 a: "Oui. Nos gardiens savoyards gèrent le chauffage en hiver, la prévention du gel, ainsi que la chaleur estivale en cluse. Ils adaptent les sorties chien : tôt le matin l'été, sentiers ombragés (Charvet, Lac du Bourget) en demi-saison.",
 },
 {
 q: "Puis-je faire garder mon animal pour une absence longue en Savoie ?",
 a: "Oui. Guardiens accepte les gardes de toute durée, du week-end à plusieurs semaines. Précisez la durée exacte dans l'annonce, les gardiens disponibles sur la période vous contactent.",
 },
 {
 q: "Que se passe-t-il en cas de problème pendant la garde ?",
 a: "Le gardien suit les consignes du guide de la maison (vétérinaire, contact technique, personne de confiance). Le réseau Gardien d'Urgence Guardiens peut être mobilisé sur la Savoie en cas d'imprévu majeur.",
 },
 {
 q: "Combien coûte Guardiens à Chambéry ?",
 a: "Pour les propriétaires, c'est entièrement gratuit. Les gardiens accèdent à la plateforme via un abonnement à 6,99 €/mois (ou 12 € en one-shot), et tous les gardiens sont gratuits jusqu'au 14 juillet 2026.",
 },
];

const DEFAULT_FAQ = (cityName: string) => [
 {
 q: `Comment trouver un gardien de maison à ${cityName} ?`,
 a: `Sur Guardiens, vous publiez une annonce gratuite et les gardiens disponibles à ${cityName} et ses environs postulent directement. Chaque gardien est vérifié manuellement avant d'apparaître sur la plateforme.`,
 },
 {
 q: `Est-ce vraiment gratuit pour les propriétaires à ${cityName} ?`,
 a: "Oui. Guardiens est gratuit pour tous les propriétaires : aucun frais, aucune commission. Seuls les gardiens souscrivent un abonnement (6,99 €/mois) pour accéder aux annonces et postuler.",
 },
 {
 q: `Que se passe-t-il en cas d'urgence pendant la garde à ${cityName} ?`,
 a: "Guardiens dispose d'un réseau de Gardiens d'Urgence dans chaque zone. En cas d'imprévu (animal malade, problème technique), le gardien en poste peut déclencher une alerte directement depuis l'application.",
 },
];

const FAQ_BY_SLUG: Record<string, Array<{ q: string; a: string }>> = {
 lyon: LYON_FAQ,
 annecy: ANNECY_FAQ,
 grenoble: GRENOBLE_FAQ,
 chambery: CHAMBERY_FAQ,
};

const CitySchemaOrg = ({ city }: Props) => {
 const isLyon = city.slug === "lyon";
 const faqItems = FAQ_BY_SLUG[city.slug] || DEFAULT_FAQ(city.name);

 const graph: any[] = [
 {
 "@type": "Service",
 name: isLyon
 ? "Garde de chien et de chat à Lyon"
 : `House-sitting et garde d'animaux à ${city.name}`,
 description: city.metaDescription,
 serviceType: ["House Sitting", "Pet Sitting", "Dog Sitting", "Cat Sitting"],
 provider: {
 "@type": "Organization",
 name: "Guardiens",
 url: "https://guardiens.fr",
 },
 areaServed: {
 "@type": "City",
 name: city.name,
 containedInPlace: {
 "@type": "Country",
 name: "France",
 },
 },
 offers: {
 "@type": "Offer",
 price: "0",
 priceCurrency: "EUR",
 eligibleCustomerType: "Owner",
 description: "À 0 € pour les propriétaires, sans abonnement requis.",
 },
 },
 {
 "@type": "BreadcrumbList",
 itemListElement: [
 {
 "@type": "ListItem",
 position: 1,
 name: "Accueil",
 item: "https://guardiens.fr",
 },
 {
 "@type": "ListItem",
 position: 2,
 name: city.department,
 // Slug département dérivé du nom (ex: "Haute-Savoie" → "haute-savoie",
 // "Puy-de-Dôme" → "puy-de-dome"). Cohérent avec /departement/:slug.
 item: `https://guardiens.fr/departement/${slugify(city.department)}`,
 },
 {
 "@type": "ListItem",
 position: 3,
 name: isLyon
 ? "Garde chien et chat Lyon"
 : `House-sitting à ${city.name}`,
 // Google exige un "item" (URL) sur TOUS les éléments, y compris le dernier.
 item: `https://guardiens.fr/house-sitting/${city.slug}`,
 },
 ],
 },
 {
 "@type": "FAQPage",
 mainEntity: faqItems.map((f) => ({
 "@type": "Question",
 name: f.q,
 acceptedAnswer: {
 "@type": "Answer",
 text: f.a,
 },
 })),
 },
 ];

 // LocalBusiness pour toutes les villes hub (Lyon, Annecy, Grenoble, Chambéry…)
 // Éligibilité Google Local Pack + AI Overviews.
 const LOCAL_BUSINESS_CITIES = ["lyon", "annecy", "grenoble", "chambery", "caluire-et-cuire"];
 if (LOCAL_BUSINESS_CITIES.includes(city.slug)) {
 graph.push({
 "@type": "LocalBusiness",
 name: `Guardiens, Garde d'animaux à ${city.name}`,
 description: `Plateforme de garde de chien, de chat et de home sitting à ${city.name}. Gardiens de proximité vérifiés, sans commission.`,
 url: `https://guardiens.fr/house-sitting/${city.slug}`,
 address: {
 "@type": "PostalAddress",
 addressLocality: city.name,
 addressRegion: city.department,
 addressCountry: "FR",
 },
 geo: {
 "@type": "GeoCoordinates",
 latitude: city.coordinates?.lat,
 longitude: city.coordinates?.lng,
 },
 areaServed: {
 "@type": "City",
 name: city.name,
 },
 priceRange: "Gratuit pour les propriétaires",
 });
 }

 return (
 <Helmet>
 <script type="application/ld+json">
 {JSON.stringify({ "@context": "https://schema.org", "@graph": graph })}
 </script>
 </Helmet>
 );
};

export default CitySchemaOrg;
