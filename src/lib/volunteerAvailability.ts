/**
 * Bénévolat en association animalière, référentiel partagé.
 *
 * Une seule source de vérité pour les deux profils (gardien et propriétaire),
 * car une même personne peut porter les deux rôles : la déclaration vit dans
 * `public.volunteer_availability`, une ligne par personne.
 *
 * Invariant produit : ces champs restent hors du barème de complétion du
 * profil, côté client comme côté SQL. Voir le test
 * `src/__tests__/volunteer-availability-out-of-completion.test.ts`.
 */

export const VOLUNTEER_CHECKBOX_LABEL =
  "J'aimerais donner un coup de main à une association animalière près de chez moi";

export const VOLUNTEER_WAITING_SENTENCE =
  "Cette déclaration nous aide à savoir où se trouvent les personnes prêtes à donner un coup de main.";

export const VOLUNTEER_STRUCTURE_TYPES: readonly string[] = [
  "Centre de soins et faune sauvage",
  "Refuge et fourrière",
  "Sanctuaire et ferme",
  "Association de familles d'accueil",
  "Autre",
];

export const VOLUNTEER_SKILLS: readonly string[] = [
  "Accueillir un animal chez moi",
  "Transporter un animal",
  "Donner un coup de main sur place, nourrissage et nettoyage",
  "Accueillir du public",
  "Communication et réseaux",
  "Comptabilité",
  "Juridique",
  "Informatique",
  "Bricolage",
  "Autre",
];

export const VOLUNTEER_FREQUENCIES: readonly { value: string; label: string }[] = [
  { value: "ponctuel", label: "Ponctuellement" },
  { value: "mensuel", label: "Une fois par mois" },
  { value: "hebdomadaire", label: "Une fois par semaine" },
];

export interface VolunteerAvailabilityRow {
  available: boolean;
  structure_types: string[];
  skills: string[];
  departments: string[];
  frequency: string | null;
  current_association: string | null;
}

export const EMPTY_VOLUNTEER_AVAILABILITY: VolunteerAvailabilityRow = {
  available: false,
  structure_types: [],
  skills: [],
  departments: [],
  frequency: null,
  current_association: null,
};
