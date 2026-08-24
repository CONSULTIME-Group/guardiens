/**
 * Grammaire des noms de départements et territoires.
 *
 * Table exhaustive, écrite à la main : aucune règle devinée à l'exécution,
 * aucune heuristique sur les préfixes ou le genre. Si un nom est absent de
 * la table, les fonctions retournent le nom seul, sans article inventé.
 *
 * Format de la table : nom : locatif | génitif.
 */

interface DepartmentForms {
  /** Forme locative complète, article compris : « dans le Rhône », « en Savoie ». */
  in: string;
  /** Forme génitive : « du Rhône », « de Savoie ». */
  of: string;
}

const DEPARTMENT_GRAMMAR: Record<string, DepartmentForms> = {
  "Ain": { in: "dans l'Ain", of: "de l'Ain" },
  "Aisne": { in: "dans l'Aisne", of: "de l'Aisne" },
  "Allier": { in: "dans l'Allier", of: "de l'Allier" },
  "Alpes-de-Haute-Provence": { in: "dans les Alpes-de-Haute-Provence", of: "des Alpes-de-Haute-Provence" },
  "Hautes-Alpes": { in: "dans les Hautes-Alpes", of: "des Hautes-Alpes" },
  "Alpes-Maritimes": { in: "dans les Alpes-Maritimes", of: "des Alpes-Maritimes" },
  "Ardèche": { in: "en Ardèche", of: "d'Ardèche" },
  "Ardennes": { in: "dans les Ardennes", of: "des Ardennes" },
  "Ariège": { in: "en Ariège", of: "d'Ariège" },
  "Aube": { in: "dans l'Aube", of: "de l'Aube" },
  "Aude": { in: "dans l'Aude", of: "de l'Aude" },
  "Aveyron": { in: "dans l'Aveyron", of: "de l'Aveyron" },
  "Bouches-du-Rhône": { in: "dans les Bouches-du-Rhône", of: "des Bouches-du-Rhône" },
  "Calvados": { in: "dans le Calvados", of: "du Calvados" },
  "Cantal": { in: "dans le Cantal", of: "du Cantal" },
  "Charente": { in: "en Charente", of: "de Charente" },
  "Charente-Maritime": { in: "en Charente-Maritime", of: "de Charente-Maritime" },
  "Cher": { in: "dans le Cher", of: "du Cher" },
  "Corrèze": { in: "en Corrèze", of: "de Corrèze" },
  "Corse-du-Sud": { in: "en Corse-du-Sud", of: "de Corse-du-Sud" },
  "Haute-Corse": { in: "en Haute-Corse", of: "de Haute-Corse" },
  "Côte-d'Or": { in: "en Côte-d'Or", of: "de Côte-d'Or" },
  "Côtes-d'Armor": { in: "dans les Côtes-d'Armor", of: "des Côtes-d'Armor" },
  "Creuse": { in: "en Creuse", of: "de Creuse" },
  "Dordogne": { in: "en Dordogne", of: "de Dordogne" },
  "Doubs": { in: "dans le Doubs", of: "du Doubs" },
  "Drôme": { in: "dans la Drôme", of: "de la Drôme" },
  "Eure": { in: "dans l'Eure", of: "de l'Eure" },
  "Eure-et-Loir": { in: "en Eure-et-Loir", of: "d'Eure-et-Loir" },
  "Finistère": { in: "dans le Finistère", of: "du Finistère" },
  "Gard": { in: "dans le Gard", of: "du Gard" },
  "Haute-Garonne": { in: "en Haute-Garonne", of: "de Haute-Garonne" },
  "Gers": { in: "dans le Gers", of: "du Gers" },
  "Gironde": { in: "en Gironde", of: "de Gironde" },
  "Hérault": { in: "dans l'Hérault", of: "de l'Hérault" },
  "Ille-et-Vilaine": { in: "en Ille-et-Vilaine", of: "d'Ille-et-Vilaine" },
  "Indre": { in: "dans l'Indre", of: "de l'Indre" },
  "Indre-et-Loire": { in: "en Indre-et-Loire", of: "d'Indre-et-Loire" },
  "Isère": { in: "en Isère", of: "d'Isère" },
  "Jura": { in: "dans le Jura", of: "du Jura" },
  "Landes": { in: "dans les Landes", of: "des Landes" },
  "Loir-et-Cher": { in: "en Loir-et-Cher", of: "de Loir-et-Cher" },
  "Loire": { in: "dans la Loire", of: "de la Loire" },
  "Haute-Loire": { in: "en Haute-Loire", of: "de Haute-Loire" },
  "Loire-Atlantique": { in: "en Loire-Atlantique", of: "de Loire-Atlantique" },
  "Loiret": { in: "dans le Loiret", of: "du Loiret" },
  "Lot": { in: "dans le Lot", of: "du Lot" },
  "Lot-et-Garonne": { in: "en Lot-et-Garonne", of: "de Lot-et-Garonne" },
  "Lozère": { in: "en Lozère", of: "de Lozère" },
  "Maine-et-Loire": { in: "en Maine-et-Loire", of: "de Maine-et-Loire" },
  "Manche": { in: "dans la Manche", of: "de la Manche" },
  "Marne": { in: "dans la Marne", of: "de la Marne" },
  "Haute-Marne": { in: "en Haute-Marne", of: "de Haute-Marne" },
  "Mayenne": { in: "en Mayenne", of: "de Mayenne" },
  "Meurthe-et-Moselle": { in: "en Meurthe-et-Moselle", of: "de Meurthe-et-Moselle" },
  "Meuse": { in: "dans la Meuse", of: "de la Meuse" },
  "Morbihan": { in: "dans le Morbihan", of: "du Morbihan" },
  "Moselle": { in: "en Moselle", of: "de Moselle" },
  "Nièvre": { in: "dans la Nièvre", of: "de la Nièvre" },
  "Nord": { in: "dans le Nord", of: "du Nord" },
  "Oise": { in: "dans l'Oise", of: "de l'Oise" },
  "Orne": { in: "dans l'Orne", of: "de l'Orne" },
  "Pas-de-Calais": { in: "dans le Pas-de-Calais", of: "du Pas-de-Calais" },
  "Puy-de-Dôme": { in: "dans le Puy-de-Dôme", of: "du Puy-de-Dôme" },
  "Pyrénées-Atlantiques": { in: "dans les Pyrénées-Atlantiques", of: "des Pyrénées-Atlantiques" },
  "Hautes-Pyrénées": { in: "dans les Hautes-Pyrénées", of: "des Hautes-Pyrénées" },
  "Pyrénées-Orientales": { in: "dans les Pyrénées-Orientales", of: "des Pyrénées-Orientales" },
  "Bas-Rhin": { in: "dans le Bas-Rhin", of: "du Bas-Rhin" },
  "Haut-Rhin": { in: "dans le Haut-Rhin", of: "du Haut-Rhin" },
  "Rhône": { in: "dans le Rhône", of: "du Rhône" },
  "Haute-Saône": { in: "en Haute-Saône", of: "de Haute-Saône" },
  "Saône-et-Loire": { in: "en Saône-et-Loire", of: "de Saône-et-Loire" },
  "Sarthe": { in: "dans la Sarthe", of: "de la Sarthe" },
  "Savoie": { in: "en Savoie", of: "de Savoie" },
  "Haute-Savoie": { in: "en Haute-Savoie", of: "de Haute-Savoie" },
  "Paris": { in: "à Paris", of: "de Paris" },
  "Seine-Maritime": { in: "en Seine-Maritime", of: "de Seine-Maritime" },
  "Seine-et-Marne": { in: "en Seine-et-Marne", of: "de Seine-et-Marne" },
  "Yvelines": { in: "dans les Yvelines", of: "des Yvelines" },
  "Deux-Sèvres": { in: "dans les Deux-Sèvres", of: "des Deux-Sèvres" },
  "Somme": { in: "dans la Somme", of: "de la Somme" },
  "Tarn": { in: "dans le Tarn", of: "du Tarn" },
  "Tarn-et-Garonne": { in: "en Tarn-et-Garonne", of: "de Tarn-et-Garonne" },
  "Var": { in: "dans le Var", of: "du Var" },
  "Vaucluse": { in: "dans le Vaucluse", of: "du Vaucluse" },
  "Vendée": { in: "en Vendée", of: "de Vendée" },
  "Vienne": { in: "dans la Vienne", of: "de la Vienne" },
  "Haute-Vienne": { in: "en Haute-Vienne", of: "de Haute-Vienne" },
  "Vosges": { in: "dans les Vosges", of: "des Vosges" },
  "Yonne": { in: "dans l'Yonne", of: "de l'Yonne" },
  "Territoire de Belfort": { in: "dans le Territoire de Belfort", of: "du Territoire de Belfort" },
  "Essonne": { in: "dans l'Essonne", of: "de l'Essonne" },
  "Hauts-de-Seine": { in: "dans les Hauts-de-Seine", of: "des Hauts-de-Seine" },
  "Seine-Saint-Denis": { in: "en Seine-Saint-Denis", of: "de Seine-Saint-Denis" },
  "Val-de-Marne": { in: "dans le Val-de-Marne", of: "du Val-de-Marne" },
  "Val-d'Oise": { in: "dans le Val-d'Oise", of: "du Val-d'Oise" },
  "Guadeloupe": { in: "en Guadeloupe", of: "de Guadeloupe" },
  "Martinique": { in: "en Martinique", of: "de Martinique" },
  "Guyane": { in: "en Guyane", of: "de Guyane" },
  "La Réunion": { in: "à La Réunion", of: "de La Réunion" },
  "Mayotte": { in: "à Mayotte", of: "de Mayotte" },
  "Polynésie française": { in: "en Polynésie française", of: "de Polynésie française" },
  "Nouvelle-Calédonie": { in: "en Nouvelle-Calédonie", of: "de Nouvelle-Calédonie" },
};

const lookup = (name: string | null | undefined): DepartmentForms | null => {
  if (!name) return null;
  return DEPARTMENT_GRAMMAR[name.trim()] ?? null;
};

/**
 * Forme locative complète, article compris : « dans le Rhône », « en Haute-Savoie »,
 * « dans l'Ain », « dans les Yvelines », « à Paris », « à La Réunion ».
 * Nom inconnu : le nom seul, jamais une forme inventée.
 */
export const departmentIn = (name: string | null | undefined): string => {
  const forms = lookup(name);
  return forms ? forms.in : (name ?? "").trim();
};

/** Même chaîne que `departmentIn` avec une majuscule initiale, pour un début de phrase. */
export const departmentInCapitalized = (name: string | null | undefined): string => {
  const s = departmentIn(name);
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
};

/**
 * Forme génitive : « du Rhône », « de Haute-Savoie », « de l'Ain », « des Yvelines »,
 * « de Paris », « de La Réunion ». Nom inconnu : le nom seul.
 */
export const departmentOf = (name: string | null | undefined): string => {
  const forms = lookup(name);
  return forms ? forms.of : (name ?? "").trim();
};

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Lettre ou tiret : la borne interdit toute reconnaissance partielle du nom
// (« Haute-Loire » sur la page Loire, « Bouches-du-Rhône », « Haute-Savoie »).
const BOUNDARY_CHARS = "A-Za-zÀ-ÖØ-öø-ÿ-";

// Préfixes reconnus immédiatement devant le nom, du plus long au plus court.
// Les formes à apostrophe (droite ou typographique) ne prennent pas d'espace.
const MENTION_PREFIX =
  "(dans\\s+les?|dans\\s+l['’]|dans|en|aux|au|à|des|du|de|d['’]|les|le|la|l['’])\\s*";

// Génitifs et déterminants simples : le passage est déjà correct, on n'y
// touche pas. Le réécrire produirait une faute (« les communes de en ... »).
const KEEP_PREFIXES = new Set(["de", "du", "des", "d'", "le", "la", "les", "l'"]);

/**
 * Répare une chaîne stockée (titre H1, meta title, meta description) dont la
 * mention du département est fautive : préposition inadaptée (« dans Ain »,
 * « en Rhône », « dans le Savoie ») ou nom nu (« Garde d'animaux Rhône : »).
 *
 * Une seule expression régulière, un callback qui décide :
 * - préfixe génitif ou déterminant simple (de, du, des, d', le, la, les, l') :
 *   passage laissé totalement inchangé,
 * - préfixe absent ou préposition locative (dans, en, au, aux, à et formes
 *   composées) : préfixe et nom remplacés par la forme locative de la table.
 *
 * Aucune règle grammaticale n'est devinée : seule la table décide de la forme
 * produite. Nom inconnu, nom sans accent (« Rhone » pour « Rhône ») ou texte
 * vide : la chaîne est retournée telle quelle.
 */
export const rewriteDepartmentMention = (
  text: string | null | undefined,
  name: string | null | undefined
): string => {
  if (!text) return text ?? "";
  const forms = lookup(name);
  if (!forms || !name) return text;
  const loc = forms.in;
  const re = new RegExp(
    `(?<![${BOUNDARY_CHARS}])${MENTION_PREFIX}?(${escapeRegExp(name.trim())})(?![${BOUNDARY_CHARS}])`,
    "g"
  );
  return text.replace(re, (match, prefix: string | undefined) => {
    if (!prefix) return loc;
    const key = prefix.toLowerCase().replace(/’/g, "'").replace(/\s+/g, " ").trim();
    return KEEP_PREFIXES.has(key) ? match : loc;
  });
};
