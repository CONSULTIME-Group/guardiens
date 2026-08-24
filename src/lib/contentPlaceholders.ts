/**
 * Moteur de variables dynamiques du contenu éditorial.
 *
 * Les rédacteurs peuvent insérer des placeholders du type {{profils_gardien}}
 * dans les articles, les pages villes et les pages départements. Les valeurs
 * proviennent de la RPC get_content_stats (source de vérité unique, les
 * chiffres ville et département sont lus dans les mêmes colonnes que les
 * compteurs affichés sur la page, jamais recalculés).
 *
 * Règle absolue : aucune accolade ne doit jamais rester visible, ni pour un
 * humain ni pour un robot. Deux passes garantissent cette règle :
 *
 * 1. La passe stricte substitue les clés bien formées ({{cle}}, {{ cle }},
 *    préfixe stats., ville. ou departement. optionnel). Une clé inconnue ou
 *    une valeur absente est retirée avec un console.warn.
 * 2. Le filet de sécurité retire tout ce qui reste entre doubles accolades
 *    (majuscules, tirets, espaces internes, double séparateur, {{}}) avec un
 *    console.warn indiquant le placeholder malformé et son contenu brut.
 *
 * Une faute de casse n'est jamais résolue en silence : {{Profils_Gardien}}
 * est retiré et signalé, pas substitué. Le rédacteur corrige sa clé.
 *
 * Exception documentée : les zones de code markdown (blocs fenced et code
 * inline) sont exclues du filet de sécurité et de la détection admin, pour
 * ne pas altérer un extrait légitime du type style={{ color: 'red' }}.
 * La passe stricte, elle, s'applique partout (comportement d'origine).
 *
 * Fonctions pures, sans dépendance React.
 */

export type PlaceholderValue = number | string | null | undefined;
export type PlaceholderScope = "global" | "ville" | "departement";

export interface PlaceholderDefinition {
  /** Clé canonique, identique à la clé renvoyée par la RPC get_content_stats. */
  key: string;
  /** Étiquette lisible, affichée dans l'éditeur admin. */
  label: string;
  scope: PlaceholderScope;
}

export const KNOWN_PLACEHOLDERS: readonly PlaceholderDefinition[] = [
  { key: "total_inscrits", label: "Inscrits au total", scope: "global" },
  { key: "profils_gardien", label: "Profils gardiens", scope: "global" },
  { key: "profils_proprio", label: "Profils propriétaires", scope: "global" },
  { key: "inscrits_30j", label: "Inscriptions sur les 30 derniers jours", scope: "global" },
  { key: "city_guides", label: "Guides de ville publiés", scope: "global" },
  { key: "city_guide_places", label: "Lieux référencés dans les guides", scope: "global" },
  { key: "breed_profiles", label: "Fiches races", scope: "global" },
  { key: "villes_couvertes", label: "Villes couvertes", scope: "global" },
  { key: "departements_couverts", label: "Départements couverts", scope: "global" },
  { key: "ville_nom", label: "Nom de la ville", scope: "ville" },
  { key: "ville_departement", label: "Département de la ville", scope: "ville" },
  { key: "ville_gardiens", label: "Gardiens habitant la ville", scope: "ville" },
  { key: "ville_gardiens_proximite", label: "Gardiens intervenant dans le secteur", scope: "ville" },
  { key: "ville_gardiens_total", label: "Gardiens au total (ville et proximité)", scope: "ville" },
  { key: "ville_annonces_actives", label: "Annonces actives dans la ville", scope: "ville" },
  { key: "departement_nom", label: "Nom du département", scope: "departement" },
  { key: "departement_gardiens", label: "Gardiens du département", scope: "departement" },
  { key: "departement_annonces_actives", label: "Annonces actives du département", scope: "departement" },
] as const;

const KNOWN_KEYS = new Set<string>(KNOWN_PLACEHOLDERS.map((p) => p.key));

// {{cle}} ou {{ cle }}, clé [a-z][a-z0-9_]* éventuellement préfixée par
// stats., ville. ou departement.
const PLACEHOLDER_REGEX = /\{\{\s*((?:(?:stats|ville|departement)\.)?[a-z][a-z0-9_]*)\s*\}\}/g;

// Filet de sécurité : toute paire d'accolades doubles, même malformée.
// Appliquée en dernière étape de interpolatePlaceholders, uniquement hors
// zones de code. Sert aussi de détection côté éditeur admin.
const RESIDUAL_PLACEHOLDER_REGEX = /\{\{[^{}]*\}\}/g;
const RESIDUAL_PLACEHOLDER_TEST = /\{\{[^{}]*\}\}/;

// Zones de code markdown : blocs fenced ``` ... ``` et code inline `...`.
// Elles sont exclues du balayage résiduel et de la détection admin, pour ne
// pas altérer des extraits légitimes (JSX style={{ ... }}, templates).
const CODE_ZONE_REGEX = /(```[\s\S]*?```|`[^`\n]*`)/g;

const numberFormatter = new Intl.NumberFormat("fr-FR");

/**
 * Résout une clé brute vers sa clé canonique connue.
 * « stats.profils_gardien » et « profils_gardien » pointent la même valeur,
 * « ville.gardiens » pointe « ville_gardiens ».
 */
const resolveKey = (raw: string): string | null => {
  if (KNOWN_KEYS.has(raw)) return raw;
  const underscored = raw.replace(".", "_");
  if (KNOWN_KEYS.has(underscored)) return underscored;
  const stripped = raw.replace(/^(?:stats|ville|departement)\./, "");
  if (stripped !== raw && KNOWN_KEYS.has(stripped)) return stripped;
  return null;
};

const warnDropped = (raw: string, reason: string) => {
  console.warn(`[contentPlaceholders] Placeholder retiré : {{${raw}}} (${reason})`);
};

const warnMalformed = (raw: string) => {
  console.warn(
    `[contentPlaceholders] Placeholder malformé retiré : ${raw} (format attendu : {{cle}} en minuscules, chiffres et underscores, préfixe stats., ville. ou departement. optionnel)`
  );
};

/**
 * Filet de sécurité : retire tout ce qui ressemble à un placeholder mais n'a
 * pas été résolu par la passe stricte (majuscules, tirets, espaces internes,
 * préfixes en cascade, {{}}). La boucle rattrape les formes imbriquées du
 * type {{ a {{ b }} c }}. Les zones de code ne sont jamais touchées.
 */
const sweepResidualPlaceholders = (content: string): string => {
  if (content.indexOf("{{") === -1) return content;
  return content
    .split(CODE_ZONE_REGEX)
    .map((segment, index) => {
      if (index % 2 === 1) return segment; // zone de code, intouchée
      let out = segment;
      for (let i = 0; i < 10 && RESIDUAL_PLACEHOLDER_TEST.test(out); i++) {
        out = out.replace(RESIDUAL_PLACEHOLDER_REGEX, (match) => {
          warnMalformed(match);
          return "";
        });
      }
      return out;
    })
    .join("");
};

/**
 * Remplace les placeholders par leurs valeurs formatées (nombres au format
 * français avec séparateur de milliers). Tout placeholder non résolu est
 * retiré du texte : la sortie ne contient jamais d'accolades résiduelles,
 * jamais de « undefined » ni de « NaN ».
 */
export const interpolatePlaceholders = (
  content: string,
  values: Record<string, PlaceholderValue>
): string => {
  if (!content || content.indexOf("{{") === -1) return content;
  const substituted = content.replace(PLACEHOLDER_REGEX, (_match, raw: string) => {
    const key = resolveKey(raw);
    if (!key) {
      warnDropped(raw, "clé inconnue");
      return "";
    }
    const value = values[key];
    if (value === null || value === undefined) {
      warnDropped(raw, "valeur absente ou pas encore chargée");
      return "";
    }
    if (typeof value === "number") {
      if (Number.isNaN(value)) {
        warnDropped(raw, "valeur NaN");
        return "";
      }
      return numberFormatter.format(value);
    }
    return value;
  });
  return sweepResidualPlaceholders(substituted);
};

/**
 * Liste les clés présentes dans un contenu mais absentes de
 * KNOWN_PLACEHOLDERS (dédupliquées, forme brute sans les accolades). La
 * détection est permissive : les formes malformées (majuscules, tirets,
 * espaces, double séparateur, {{}}) sont remontées elles aussi, pour que le
 * rédacteur les corrige avant publication. Les zones de code ne sont pas
 * signalées. Un placeholder vide est remonté sous le libellé « (vide) ».
 */
export const findUnknownPlaceholders = (content: string): string[] => {
  if (!content || content.indexOf("{{") === -1) return [];
  const unknown = new Set<string>();
  const segments = content.split(CODE_ZONE_REGEX);
  for (let i = 0; i < segments.length; i++) {
    if (i % 2 === 1) continue; // zone de code : jamais signalée
    for (const match of segments[i].matchAll(RESIDUAL_PLACEHOLDER_REGEX)) {
      const raw = match[0].slice(2, -2).trim();
      if (!resolveKey(raw)) unknown.add(raw === "" ? "(vide)" : raw);
    }
  }
  return Array.from(unknown);
};
