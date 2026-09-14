/**
 * Formations et certifications déclarées par un membre.
 *
 * Liste fermée, groupée par domaine : deux fiches se comparent parce que les
 * intitulés sont les mêmes pour tout le monde. Aucune saisie libre.
 *
 * Périmètre volontaire : uniquement des diplômes, titres et attestations de
 * compétence. Les autorisations d'exécuter un acte dangereux (habilitations,
 * conduite d'engins, travail en hauteur) restent hors de cette liste, rien
 * n'étant vérifié sur pièce ici.
 */

export const MAX_CERTIFICATIONS = 3;

export interface CertificationOption {
  value: string;
  label: string;
}

export interface CertificationDomain {
  key: string;
  label: string;
  options: CertificationOption[];
}

export const CERTIFICATION_DOMAINS: CertificationDomain[] = [
  {
    key: "animaux",
    label: "Animaux",
    options: [
      { value: "acaced_chien", label: "ACACED, chien" },
      { value: "acaced_chat", label: "ACACED, chat" },
      { value: "acaced_autres", label: "ACACED, autres animaux de compagnie" },
      { value: "certificat_capacite", label: "Certificat de capacité, animaux domestiques" },
      { value: "veterinaire", label: "Vétérinaire" },
      { value: "asv", label: "Auxiliaire spécialisé vétérinaire" },
      { value: "educateur_canin", label: "Éducateur canin, titre RNCP" },
      { value: "educateur_comportementaliste", label: "Éducateur comportementaliste canin, félin et NAC, titre RNCP" },
      { value: "toiletteur", label: "Toiletteur, CAP ou BP" },
      { value: "elevage_canin_felin", label: "Élevage canin et félin, diplôme agricole" },
      { value: "osteopathe_animalier", label: "Ostéopathe animalier" },
      { value: "secours_animaliers", label: "Premiers secours animaliers" },
    ],
  },
  {
    key: "secours_sante",
    label: "Secours et santé",
    options: [
      { value: "psc1", label: "PSC1, prévention et secours civiques" },
      { value: "sst", label: "SST, sauveteur secouriste du travail" },
      { value: "profession_sante", label: "Profession de santé en exercice" },
    ],
  },
  {
    key: "jardin_nature",
    label: "Jardin, nature et agriculture",
    options: [
      { value: "paysagiste", label: "Aménagements paysagers, CAP, BP ou Bac pro" },
      { value: "bprea", label: "BPREA, responsable d'entreprise agricole" },
      { value: "arboriste", label: "Arboriste grimpeur" },
      { value: "apiculture", label: "Apiculture" },
    ],
  },
  {
    key: "construction",
    label: "Construction et artisanat",
    options: [
      { value: "maconnerie", label: "Maçonnerie, CAP ou BP" },
      { value: "charpente_menuiserie", label: "Charpente ou menuiserie, CAP ou BP" },
      { value: "couverture", label: "Couverture, CAP ou BP" },
      { value: "pierre_seche", label: "CQP pierre sèche" },
      { value: "compagnon_devoir", label: "Compagnon du Devoir" },
    ],
  },
];

const LABELS: Record<string, string> = Object.fromEntries(
  CERTIFICATION_DOMAINS.flatMap((d) => d.options.map((o) => [o.value, o.label])),
);

export function certificationLabel(value: string): string | null {
  return LABELS[value] ?? null;
}

/** Intitulés des clés connues, dans l'ordre de la liste fermée, plafonnés. */
export function certificationLabels(values?: string[] | null): string[] {
  if (!values?.length) return [];
  const set = new Set(values);
  return CERTIFICATION_DOMAINS.flatMap((d) => d.options)
    .filter((o) => set.has(o.value))
    .slice(0, MAX_CERTIFICATIONS)
    .map((o) => o.label);
}
