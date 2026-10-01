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
 /** FAQ visible et JSON-LD FAQPage : source unique pour les villes refondues. */
 faq?: { q: string; a: string }[];
}

const cityContent: Record<string, CityContentData> = {
 annecy: {
 heroAlt: "Le lac d'Annecy et les montagnes qui l'entourent",
 subtitle: "Un gardien séjourne chez vous pendant votre absence et veille sur votre logement, votre jardin et vos animaux. La garde n'est pas rémunérée sur Guardiens, et tout se convient avec lui avant le départ.",
 articleSections: [
 {
 id: "en-bref",
 title: "Organiser une garde à domicile à Annecy",
 content: `Faire garder sa maison à Annecy, c'est confier son logement à une personne qui y séjourne et s'occupe de ce qui compte pour vous : animaux, plantes, courrier, chauffage. Sur Guardiens, vous publiez une annonce, des gardiens postulent, vous échangez avec eux, vous pouvez les rencontrer, puis vous choisissez. Le gardien n'est pas payé pour la garde ; il est hébergé chez vous. Les frais éventuels (courses, nourriture des animaux, transport) se décident à part, par écrit.

Aucun délai de réponse n'est garanti : le nombre de candidatures dépend de vos dates, de la saison et de votre secteur. L'été, l'agglomération attire beaucoup de monde ; une annonce publiée tôt laisse le temps d'échanger sereinement. [Comprendre le house-sitting en détail](/actualites/c-est-quoi-le-house-sitting).`,
 },
 {
 id: "a-convenir",
 title: "Ce qu'il faut convenir avant de partir",
 content: `- **Présence réelle** : combien de temps le gardien peut s'absenter dans la journée, et si votre animal supporte la solitude. Une garde n'est pas une présence 24h/24.
- **Expérience attendue** : chien qui tire en laisse, chat âgé, traitement à donner. Dites-le dans l'annonce, puis vérifiez en échangeant.
- **Remise des clés** : en main propre lors d'une rencontre, ou selon une solution que vous maîtrisez. Prévoyez un double chez une personne relais.
- **Frais** : qui paie la nourriture des animaux, une éventuelle consultation vétérinaire, le bois ou le chauffage. Mieux vaut l'écrire que le supposer.
- **Personne relais et vétérinaire** : un contact du coin joignable, et les coordonnées de votre vétérinaire habituel.
- **Hiver** : en altitude ou en zone exposée, consignes précises sur le chauffage, la mise hors gel et le déneigement des accès.`,
 },
 {
 id: "sorties-chien",
 title: "Sorties avec un chien : les règles locales à transmettre",
 content: `Votre gardien découvre peut-être le secteur. Quelques repères à lui transmettre, à partir de sources officielles :

- L'Office de tourisme du lac rappelle qu'en ville, en balade comme en randonnée, **les chiens doivent être tenus en laisse**, et que **les plages autour du lac n'autorisent pas les chiens** ([Lac Annecy Tourisme](https://www.lac-annecy.com/idees-de-sejour/que-faire-au-lac-d-annecy-avec-un-chien/)).
- Un arrêté municipal de 2025 autorise la promenade sans laisse sur quelques sites précis (dont une portion de la promenade du Thiou), **sauf du 15 avril au 30 juin**, période où la laisse est obligatoire partout dans les espaces naturels ([arrêté CN-2025-281](https://www.annecy.fr/fileadmin/mediatheque_annecy/Actes_administratifs/Arretes-municipaux/2025/2025_juillet/CN_2025_281.pdf)).
- Certains parcs ferment leurs portes aux animaux : le règlement du parc du Haras les interdit, même tenus en laisse, sauf chiens guides ([arrêté CN-2026-564](https://www.annecy.fr/api/fileadmin/mediatheque_annecy/Ma_ville/Grands_projets/CN_2026_564.pdf)).

Les panneaux à l'entrée de chaque lieu restent la référence. Le [guide des sorties avec un chien à Annecy](/guides/annecy) rassemble les lieux et les règles vérifiées, et l'article [parcs et balades avec un chien à Annecy](/actualites/parcs-balades-chiens-annecy-guide) donne d'autres idées.`,
 },
 {
 id: "comparer",
 title: "Garde à domicile, visites ou pension : comment choisir",
 content: `| Option | Où vit l'animal | Présence | Coût | À vérifier |
|---|---|---|---|---|
| Gardien qui séjourne chez vous | Chez vous | Selon l'accord, pas en continu | Pas de rémunération de la garde, frais convenus à part | Expérience, absences dans la journée, relais |
| Visites d'un pet-sitter | Chez vous | Passages ponctuels | Sur devis | Nombre de passages, adapté surtout aux chats autonomes |
| Pension | Chez le professionnel | Encadrement par une équipe | Sur devis | Vaccins demandés, conditions d'accueil, places en saison |

Aucune solution ne convient à tous les animaux. Un chien très anxieux ou un animal qui demande des soins peut justifier un avis vétérinaire avant de choisir. [Comparer les alternatives à la pension](/actualites/pension-chien-alternatives-guide).`,
 },
 {
 id: "urgence",
 title: "En cas d'imprévu",
 content: `Notez dans l'accord le vétérinaire habituel, une clinique de garde et une personne relais. Pour les adresses de garde vétérinaire du département, consultez [vétérinaires d'urgence à Annecy et en Haute-Savoie](/actualites/veterinaire-urgence-annecy-haute-savoie), en vérifiant les horaires par téléphone. Le réseau de gardiens d'urgence de Guardiens n'est pas encore activé : prévoyez votre propre solution de secours. [Gérer un imprévu pendant une garde](/actualites/gerer-imprevu-pendant-garde).`,
 },
 ],
 faq: [
 { q: "Comment trouver un gardien à Annecy ?", a: "Publiez une annonce décrivant votre logement, vos animaux et vos dates. Les gardiens intéressés postulent ; vous lisez leur profil et leurs avis, échangez par messagerie et pouvez les rencontrer avant de choisir. Aucun délai de réponse n'est garanti." },
 { q: "Le gardien est-il payé ?", a: "Non, la garde n'est pas rémunérée sur Guardiens : le gardien est hébergé chez vous. Les frais éventuels, comme la nourriture des animaux ou une consultation vétérinaire, se conviennent à l'avance. Les tarifs de la plateforme sont détaillés sur la page Tarifs." },
 { q: "Mon chien peut-il être promené sans laisse à Annecy ?", a: "En règle générale, non : la laisse est demandée en ville et en balade, et les plages du lac n'acceptent pas les chiens. Un arrêté municipal prévoit quelques sites sans laisse, sauf du 15 avril au 30 juin. Suivez toujours les panneaux sur place." },
 { q: "Le gardien sera-t-il présent en permanence ?", a: "Pas forcément. Le temps de présence et les absences possibles dans la journée se décident entre vous avant la garde, en fonction des besoins de vos animaux." },
 { q: "Que prévoir pour une garde en hiver ?", a: "Des consignes écrites sur le chauffage, la mise hors gel et l'accès au logement par temps de neige, ainsi que le numéro d'un chauffagiste ou d'une personne relais." },
 { q: "Que se passe-t-il si le gardien annule ?", a: "Prévenez-vous mutuellement au plus tôt et gardez une solution de secours personnelle. Le réseau de gardiens d'urgence de Guardiens n'est pas encore activé." },
 ],
 pois: [],
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
 heroAlt: "Vue de Lyon depuis la colline de Fourvière",
 subtitle: "Un gardien séjourne chez vous pendant votre absence et veille sur votre logement, votre chien ou votre chat. La garde n'est pas rémunérée sur Guardiens ; présence, clés et frais se conviennent avant le départ.",
 articleSections: [
 {
 id: "en-bref",
 title: "Faire garder son chien, son chat et son logement à Lyon",
 content: `À Lyon, le house-sitting permet de laisser votre animal chez lui, dans ses repères, pendant qu'une personne séjourne dans votre logement. Sur Guardiens, vous publiez une annonce, des gardiens postulent, vous échangez, vous pouvez les rencontrer, puis vous décidez. Le gardien n'est pas rémunéré pour la garde ; il est hébergé. Les frais éventuels (nourriture des animaux, transport, soins) se décident à part.

Le nombre de candidatures dépend de vos dates, de votre quartier et de la période ; aucun délai n'est garanti. Pour les vacances scolaires, publiez tôt. [Comprendre le house-sitting en détail](/actualites/c-est-quoi-le-house-sitting).`,
 },
 {
 id: "a-convenir",
 title: "Ce qu'il faut convenir avant de partir",
 content: `- **Présence** : combien d'heures votre animal peut rester seul, et si le gardien télétravaille ou s'absente en journée.
- **Logement en ville** : étage sans ascenseur, interphone, local à vélos, règles de copropriété, voisinage sensible aux aboiements.
- **Clés et badges** : remise en main propre, badge de parking ou de résidence, double chez une personne relais.
- **Expérience** : chien réactif, chat qui sort, traitement à donner. Parlez-en franchement, puis vérifiez en rencontrant le gardien.
- **Frais** : nourriture, litière, éventuelle consultation vétérinaire : qui avance, qui rembourse.
- **Chaleur** : en été, horaires de sortie tôt le matin et tard le soir, volets, eau à disposition.

[Préparer sa maison avant une garde](/actualites/preparer-maison-avant-garde) détaille la check-list.`,
 },
 {
 id: "sorties-chien",
 title: "Sorties avec un chien à Lyon : repères à transmettre",
 content: `- Sur les berges du Rhône, comme partout en ville, **les chiens doivent être tenus en laisse** ; des espaces canins de liberté et des espaces sanitaires existent sur les quais hauts ([ONLYLYON Tourisme, berges du Rhône](https://www.visiterlyon.com/sortir/parcs-jardins-et-lieux-de-balade/les-berges-du-rhone)).
- La Ville a aménagé des aires canines, notamment au parc de la Tête d'Or (près du vélodrome) et au parc Blandan ; de nombreux parcs acceptent les chiens en laisse ([Lyon avec un chien, ONLYLYON Tourisme](https://www.visiterlyon.com/lyon-pratique/bons-plans/lyon-avec-un-chien)).
- Autour de Lyon, le parc de la Feyssine et le Grand Parc de Miribel-Jonage accueillent les chiens tenus en laisse (même source).
- Dans les TCL, un chien voyage dans un panier, ou avec le ticket dédié pour les chiens de plus de 6 kg (même source, à confirmer sur le site TCL).

Les panneaux d'entrée de chaque parc font foi. Pour aller plus loin : le [guide des sorties avec un chien à Lyon](/guides/lyon) et l'article [parcs et balades avec un chien à Lyon](/actualites/parcs-chiens-lyon-guide-complet).`,
 },
 {
 id: "comparer",
 title: "Garde à domicile, visites ou pension",
 content: `| Option | Où vit l'animal | Présence | Coût | À vérifier |
|---|---|---|---|---|
| Gardien qui séjourne chez vous | Chez vous | Selon l'accord, pas en continu | Pas de rémunération de la garde, frais convenus à part | Expérience, absences, personne relais |
| Visites d'un pet-sitter | Chez vous | Passages ponctuels | Sur devis | Nombre de passages, adapté surtout aux chats autonomes |
| Pension | Chez le professionnel | Équipe sur place | Sur devis | Vaccins demandés, conditions d'accueil |

Le bon choix dépend de votre animal, de la durée et de votre logement. [Où faire garder son chien à Lyon pendant les vacances](/actualites/ou-faire-garder-chien-lyon-vacances) et [garde de chat à domicile à Lyon](/actualites/garde-chat-domicile-lyon) détaillent les options.`,
 },
 {
 id: "urgence",
 title: "En cas d'imprévu",
 content: `Écrivez dans l'accord le nom de votre vétérinaire, une clinique de garde et une personne relais joignable. Les cliniques de garde de l'agglomération sont listées dans [vétérinaires d'urgence à Lyon](/actualites/veterinaire-urgence-lyon-guide) ; vérifiez leurs horaires par téléphone avant le départ. Le réseau de gardiens d'urgence de Guardiens n'est pas encore activé : gardez une solution de secours personnelle. [Gérer un imprévu pendant une garde](/actualites/gerer-imprevu-pendant-garde).`,
 },
 ],
 faq: [
 { q: "Comment trouver un gardien pour mon chien ou mon chat à Lyon ?", a: "Publiez une annonce avec vos animaux, vos dates et votre quartier. Les gardiens intéressés postulent ; vous lisez leur profil et leurs avis, échangez par messagerie et pouvez les rencontrer avant de confirmer. Aucun délai de réponse n'est garanti." },
 { q: "Le gardien est-il payé ?", a: "Non, la garde n'est pas rémunérée sur Guardiens : le gardien est hébergé chez vous. Les frais éventuels se conviennent à l'avance, par écrit. Les tarifs de la plateforme sont détaillés sur la page Tarifs." },
 { q: "Mon chien peut-il être promené sans laisse à Lyon ?", a: "La laisse est la règle en ville, y compris sur les berges du Rhône. Des espaces canins de liberté et des aires canines existent, par exemple au parc de la Tête d'Or et au parc Blandan. Suivez les panneaux sur place." },
 { q: "Le gardien sera-t-il là toute la journée ?", a: "Pas forcément. Les absences possibles dans la journée et le rythme des sorties se décident entre vous avant la garde." },
 { q: "Comment se passe la remise des clés ?", a: "Le plus souvent en main propre, lors d'une rencontre ou le jour du départ. Pensez aux badges de résidence et à un double confié à une personne relais." },
 { q: "Que se passe-t-il si le gardien annule ?", a: "Prévenez-vous mutuellement au plus tôt et prévoyez une solution de secours personnelle. Le réseau de gardiens d'urgence de Guardiens n'est pas encore activé." },
 ],
 pois: [],
 nearbyTowns: [
 "Villeurbanne",
 "Caluire-et-Cuire",
 "Vénissieux",
 "Bron",
 "Écully",
 "Tassin-la-Demi-Lune",
 "Oullins",
 "Sainte-Foy-lès-Lyon",
 ],
 },

 grenoble: {
 heroAlt: "Grenoble et les massifs qui l'entourent",
 subtitle: "Un gardien séjourne chez vous pendant votre absence et veille sur votre logement et vos animaux. La garde n'est pas rémunérée sur Guardiens ; présence, clés et frais se conviennent avant le départ.",
 articleSections: [
 {
 id: "en-bref",
 title: "Organiser une garde à domicile à Grenoble",
 content: `À Grenoble, beaucoup de logements sont des appartements en ville, d'autres des maisons sur les coteaux ou au pied des massifs. Dans les deux cas, le principe est le même : une personne séjourne chez vous et veille sur le logement et les animaux. Sur Guardiens, vous publiez une annonce, des gardiens postulent, vous échangez, vous pouvez les rencontrer, puis vous choisissez. Le gardien n'est pas rémunéré pour la garde ; les frais éventuels se décident à part.

Aucun délai de réponse n'est garanti, il dépend de vos dates et de votre secteur. [Comprendre le house-sitting en détail](/actualites/c-est-quoi-le-house-sitting).`,
 },
 {
 id: "a-convenir",
 title: "Ce qu'il faut convenir avant de partir",
 content: `- **Présence** : temps de présence attendu, absences possibles en journée (randonnée, travail), besoins de l'animal.
- **Pollution et chaleur** : en cas d'épisode de pollution ou de forte chaleur, quels horaires et quelle durée de sortie vous souhaitez.
- **Accès au logement** : clés, badge, stationnement, et pour une maison en pente, accès par temps de neige.
- **Expérience** : chien réactif, chat âgé, traitement. Dites-le dans l'annonce et vérifiez lors de la rencontre.
- **Frais** : nourriture, litière, soins éventuels : qui avance, qui rembourse.
- **Relais** : une personne joignable du coin et votre vétérinaire habituel.`,
 },
 {
 id: "sorties-chien",
 title: "Sorties avec un chien : les règles de la Ville",
 content: `Grenoble distingue trois types de zones dans ses parcs ([zonage des parcs, Ville de Grenoble](https://www.grenoble.fr/1039-zonage-des-parcs.htm)) :

- **Zones en laisse** : c'est la règle générale en ville.
- **Zones de liberté** : depuis l'été 2025, des secteurs signalés de plusieurs parcs (dont le parc Paul-Mistral, le jardin Hoche ou le parc Vallier-Catane) permettent la promenade sans laisse, sous conditions de contrôle du chien ([le chien dans la ville](https://www.grenoble.fr/804-le-chien-dans-la-ville.htm)).
- **Zones interdites** : notamment autour des aires de jeux, et certains jardins entiers listés par le règlement, comme le Jardin des Plantes ([règlement des espaces verts](https://www.grenoble.fr/803-reglement-des-espaces-verts.htm)).

Dans les bus et tramways, la Ville indique que les chiens voyagent portés, ou tenus en laisse et muselés. La signalétique sur place reste la référence. Pour d'autres idées : [parcs et balades avec un chien à Grenoble](/actualites/parcs-balades-chiens-grenoble-guide).`,
 },
 {
 id: "comparer",
 title: "Garde à domicile, visites ou pension",
 content: `| Option | Où vit l'animal | Présence | Coût | À vérifier |
|---|---|---|---|---|
| Gardien qui séjourne chez vous | Chez vous | Selon l'accord, pas en continu | Pas de rémunération de la garde, frais convenus à part | Expérience, absences, relais |
| Visites d'un pet-sitter | Chez vous | Passages ponctuels | Sur devis | Nombre de passages, adapté surtout aux chats autonomes |
| Pension | Chez le professionnel | Équipe sur place | Sur devis | Vaccins demandés, conditions d'accueil |

[Comparer les alternatives à la pension](/actualites/pension-chien-alternatives-guide).`,
 },
 {
 id: "urgence",
 title: "En cas d'imprévu",
 content: `Notez dans l'accord votre vétérinaire, une clinique de garde et une personne relais. Les adresses de garde de l'agglomération sont réunies dans [vétérinaires d'urgence à Grenoble et en Isère](/actualites/veterinaire-urgence-grenoble-isere) ; vérifiez les horaires par téléphone. Le réseau de gardiens d'urgence de Guardiens n'est pas encore activé : prévoyez votre propre solution de secours. [Gérer un imprévu pendant une garde](/actualites/gerer-imprevu-pendant-garde).`,
 },
 ],
 faq: [
 { q: "Comment trouver un gardien à Grenoble ?", a: "Publiez une annonce avec votre logement, vos animaux et vos dates. Les gardiens intéressés postulent ; vous consultez leur profil et leurs avis, échangez par messagerie et pouvez les rencontrer avant de choisir. Aucun délai de réponse n'est garanti." },
 { q: "Le gardien est-il payé ?", a: "Non, la garde n'est pas rémunérée sur Guardiens : le gardien est hébergé chez vous. Les frais éventuels se conviennent à l'avance. Les tarifs de la plateforme sont détaillés sur la page Tarifs." },
 { q: "Où un chien peut-il être lâché à Grenoble ?", a: "Seulement dans les zones de liberté signalées de certains parcs, comme le parc Paul-Mistral, sous conditions de contrôle du chien. Ailleurs, la laisse est la règle, et certains jardins sont interdits aux chiens." },
 { q: "Le gardien sera-t-il présent en permanence ?", a: "Pas forcément. Les absences possibles dans la journée se décident entre vous avant la garde, selon les besoins de vos animaux." },
 { q: "Mon animal a un traitement, est-ce possible ?", a: "Oui si le gardien s'en sent capable. Décrivez le traitement dans l'annonce, montrez les gestes lors de la rencontre et laissez les consignes écrites avec le contact du vétérinaire." },
 { q: "Que se passe-t-il si le gardien annule ?", a: "Prévenez-vous mutuellement au plus tôt et gardez une solution de secours personnelle. Le réseau de gardiens d'urgence de Guardiens n'est pas encore activé." },
 ],
 pois: [],
 nearbyTowns: [
 "Meylan",
 "Saint-Martin-d'Hères",
 "Échirolles",
 "Fontaine",
 "Sassenage",
 "La Tronche",
 "Corenc",
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
