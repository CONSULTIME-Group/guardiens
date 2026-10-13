/**
 * Données de l'accord de garde (lot Z).
 *
 * Avant ce lot, l'accord se construisait avec `profiles.phone` (colonne
 * absente en base : téléphone vide sur 5 accords sur 5), un plafond de soins
 * vétérinaires fixé d'office à 300 € et des règles de vie, contacts d'urgence
 * et personne de confiance toujours vides, alors que le propriétaire les
 * renseigne dans son guide de la maison et ses préférences.
 *
 * Désormais tout vient de ce que le propriétaire a saisi :
 *   - house_guides de la propriété : vétérinaire, voisin de confiance,
 *     contact d'urgence, pièces réservées ;
 *   - owner_profiles : invités (overnight_guest), tabac (smoker_accepted),
 *     précisions (rules_notes) ;
 *   - montantVetMax reste null tant qu'aucun montant n'est saisi (aucune
 *     colonne ne le porte aujourd'hui) : l'accord dit qu'il se convient entre
 *     les deux parties.
 *
 * Fonction pure, sans client Supabase : le chargement reçoit le client en
 * paramètre (testable, aucun import de l'entrée).
 */

/** Valeur d'une règle : Oui, Non, un texte nuancé, ou à confirmer (null). */
export type AccordRuleValue = boolean | string | null;

export type AccordDeGardeData = {
  gardeId: string;
  dateDebut: string;
  dateFin: string;
  adresse: string;
  proprio: {
    prenom: string;
    /** Vide quand aucun numéro n'est saisi : l'accord renvoie alors à la messagerie. */
    telephone: string;
    plagesDisponibilite?: string;
  };
  gardien: {
    prenom: string;
  };
  animaux: Array<{
    prenom: string;
    espece: string;
    race?: string;
    age?: string;
  }>;
  reglesVie: {
    animauxPartout?: AccordRuleValue;
    invites?: AccordRuleValue;
    tabac?: AccordRuleValue;
    autresPrecisions?: string | null;
  };
  voisinConfiance?: {
    prenom: string;
    telephone: string;
  } | null;
  /** Contact d'urgence saisi dans le guide de la maison. */
  contactUrgence?: {
    nom: string;
    telephone: string;
  } | null;
  urgences?: {
    vetNom?: string;
    vetTel?: string;
    vetAdresse?: string;
    urgences24h?: string;
  } | null;
  montantVetMax?: number | null;
  montantLogementMax?: number | null;
  estLongueDuree?: boolean;
  contributionCharges?: string | null;
};

export interface AccordHouseGuide {
  vet_name?: string | null;
  vet_phone?: string | null;
  vet_address?: string | null;
  neighbor_name?: string | null;
  neighbor_phone?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  forbidden_zones?: string | null;
}

export interface AccordOwnerRules {
  overnight_guest?: string | null;
  smoker_accepted?: string | null;
  rules_notes?: string | null;
}

export interface AccordPet {
  name?: string | null;
  species?: string | null;
  breed?: string | null;
}

export interface BuildAccordInput {
  sitId: string;
  dateDebut: string;
  dateFin: string;
  adresse: string;
  ownerFirstName: string;
  sitterFirstName: string;
  pets: AccordPet[] | null | undefined;
  guide: AccordHouseGuide | null | undefined;
  ownerRules: AccordOwnerRules | null | undefined;
}

/** Colonnes de house_guides lues pour l'accord. */
export const ACCORD_HOUSE_GUIDE_COLUMNS =
  "vet_name, vet_phone, vet_address, neighbor_name, neighbor_phone, emergency_contact_name, emergency_contact_phone, forbidden_zones";

const clean = (v: string | null | undefined): string => (typeof v === "string" ? v.trim() : "");

/** Assemble les éléments renseignés, séparés par « · » (aucun séparateur orphelin). */
export function joinFilled(parts: Array<string | null | undefined>): string {
  return parts.map((x) => clean(x)).filter(Boolean).join(" · ");
}

/** owner_profiles.overnight_guest : "Non", "Oui conjoint/ami", "À discuter", "". */
export function mapOvernightGuest(raw: string | null | undefined): AccordRuleValue {
  const v = clean(raw);
  if (!v) return null;
  const lower = v.toLowerCase();
  if (lower === "non") return false;
  if (lower.startsWith("à discuter") || lower.startsWith("a discuter")) return null;
  if (lower === "oui conjoint/ami") return "Oui, conjoint ou ami";
  if (lower === "oui") return true;
  return v;
}

/** owner_profiles.smoker_accepted : "Non", "Oui dehors uniquement", "". */
export function mapSmokerAccepted(raw: string | null | undefined): AccordRuleValue {
  const v = clean(raw);
  if (!v) return null;
  const lower = v.toLowerCase();
  if (lower === "non") return false;
  if (lower === "oui dehors uniquement") return "Dehors uniquement";
  if (lower === "oui") return true;
  return v;
}

export function buildAccordDeGardeData(input: BuildAccordInput): AccordDeGardeData {
  const guide = input.guide ?? {};
  const rules = input.ownerRules ?? {};

  const vetNom = clean(guide.vet_name);
  const vetTel = clean(guide.vet_phone);
  const vetAdresse = clean(guide.vet_address);
  const urgences =
    vetNom || vetTel || vetAdresse
      ? {
          ...(vetNom ? { vetNom } : {}),
          ...(vetTel ? { vetTel } : {}),
          ...(vetAdresse ? { vetAdresse } : {}),
        }
      : null;

  const voisinNom = clean(guide.neighbor_name);
  const voisinTel = clean(guide.neighbor_phone);
  const voisinConfiance = voisinNom || voisinTel ? { prenom: voisinNom || "Voisin", telephone: voisinTel } : null;

  const urgNom = clean(guide.emergency_contact_name);
  const urgTel = clean(guide.emergency_contact_phone);
  const contactUrgence = urgNom || urgTel ? { nom: urgNom || "Contact d'urgence", telephone: urgTel } : null;

  const precisions: string[] = [];
  const notes = clean(rules.rules_notes);
  if (notes) precisions.push(notes);
  const zones = clean(guide.forbidden_zones);
  if (zones) precisions.push(`Pièces réservées : ${zones}`);

  return {
    gardeId: input.sitId,
    dateDebut: input.dateDebut,
    dateFin: input.dateFin,
    adresse: input.adresse,
    proprio: {
      prenom: input.ownerFirstName || "Le propriétaire",
      // Aucun numéro de téléphone n'est stocké pour le propriétaire :
      // l'accord renvoie à la messagerie Guardiens.
      telephone: "",
    },
    gardien: { prenom: input.sitterFirstName || "Le gardien" },
    animaux: (input.pets ?? []).map((pet) => ({
      prenom: clean(pet?.name) || "Animal",
      espece: clean(pet?.species),
      race: clean(pet?.breed) || undefined,
    })),
    reglesVie: {
      animauxPartout: null,
      invites: mapOvernightGuest(rules.overnight_guest),
      tabac: mapSmokerAccepted(rules.smoker_accepted),
      autresPrecisions: precisions.length > 0 ? precisions.join("\n") : null,
    },
    voisinConfiance,
    contactUrgence,
    urgences,
    // Aucun montant imposé : null tant que le propriétaire n'en a pas saisi.
    montantVetMax: null,
    montantLogementMax: null,
    estLongueDuree: false,
    contributionCharges: null,
  };
}

/**
 * Lit le guide de la maison de la propriété (le plus récent), sans exiger
 * sa publication : ce sont les informations du propriétaire lui-même.
 * Une lecture en échec rend null (l'accord s'ouvre avec les champs à confirmer).
 */
export async function fetchAccordHouseGuide(
  client: { from: (table: string) => any },
  propertyId: string | null | undefined,
): Promise<AccordHouseGuide | null> {
  if (!propertyId) return null;
  try {
    const { data, error } = await client
      .from("house_guides")
      .select(ACCORD_HOUSE_GUIDE_COLUMNS)
      .eq("property_id", propertyId)
      .order("updated_at", { ascending: false })
      .limit(1);
    if (error || !Array.isArray(data) || data.length === 0) return null;
    return data[0] as AccordHouseGuide;
  } catch {
    return null;
  }
}
