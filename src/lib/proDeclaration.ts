/**
 * Spécialités de la déclaration professionnelle, saisies depuis le profil.
 *
 * Les clés `petsitter_pro` et `other` sont historiques et déjà utilisées par
 * des membres déclarés : les retirer leur ferait perdre leur statut.
 *
 * La valeur écrite alimente `profiles.pro_specialty`. Le statut `pro_status`
 * en est dérivé côté base par déclencheur, il ne s'écrit jamais depuis ici.
 */
export const PRO_DECLARATION_OPTIONS = [
  { value: "petsitter_pro", label: "Pet-sitter ou pension" },
  { value: "veterinaire", label: "Vétérinaire ou auxiliaire" },
  { value: "educateur", label: "Éducateur ou comportementaliste" },
  { value: "toiletteur", label: "Toiletteur" },
  { value: "osteopathe", label: "Ostéopathe" },
  { value: "transporteur", label: "Transport d'animaux" },
  { value: "other", label: "Autre" },
] as const;

export const PRO_DECLARATION_NOTICE =
  "Cette déclaration nous indique que vous exercez à titre professionnel. Guardiens reste un réseau entre particuliers, et votre fiche garde la même présentation que les autres.";
