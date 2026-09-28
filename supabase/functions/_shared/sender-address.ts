// Adresse d'expédition unique des campagnes et emails signés Guardiens.
//
// Vérifié le 07/08/2026 : `bonjour@guardiens.fr` n'a jamais reçu le moindre
// message (aucune ligne dans email_send_log depuis la création du projet),
// rien ne prouve qu'une boîte existe derrière. `contact@guardiens.fr` reçoit
// et délivre (15 emails reçus entre le 28/05 et le 06/08, zéro rebond).
//
// Les campagnes demandent des réponses : l'expéditeur doit donc être une
// adresse réellement relevée, jamais une adresse non répondable.
//
// Toute fonction d'envoi consomme ces constantes. Aucune adresse d'expédition
// en dur ailleurs : un test de non-régression le vérifie.

export const SENDER_ADDRESS = "contact@guardiens.fr";
export const SENDER_NAME = "Guardiens";
export const SENDER_FROM = `${SENDER_NAME} <${SENDER_ADDRESS}>`;
export const REPLY_TO_ADDRESS = SENDER_ADDRESS;

// Expéditeur des messages écrits à la première personne, adressés à des
// organisations et non à des membres (demandes d'accord aux associations).
export const PERSONAL_SENDER_NAME = "Jérémie et Elisa de Guardiens";
export const PERSONAL_SENDER_FROM = `${PERSONAL_SENDER_NAME} <${SENDER_ADDRESS}>`;

// Adresse de réponse de contact-reply, réutilisée par les campagnes signées
// des fondateurs (famille entraide) pour que chaque réponse aboutisse.
export const CONTACT_REPLY_ADDRESS = "contact.guardiens@gmail.com";

// Gabarits de campagne signés par les fondateurs.
export const FOUNDER_CAMPAIGN_TEMPLATES: readonly string[] = [
  "entraide-ligne-relance",
  "entraide-ligne-helps-with",
  "entraide-demander-coup-de-main",
];
export const FOUNDER_SENDER_NAME = "Elisa et Jérémie, Guardiens";

// Gabarits signés par un fondateur hors campagne : l'expéditeur par défaut
// est conservé, seule l'adresse de réponse est ajoutée pour que la réponse
// d'un membre aboutisse dans une boîte relevée.
export const FOUNDER_SIGNED_TEMPLATES: readonly string[] = [
  "admin-personal-message",
  "founder-personal-notice",
  "application-message-restored",
  "availability-nudge",
  "dormant-sitter-nudge",
  "owner-activation-nudge",
  "owner-no-sit-j3",
  "owner-no-sit-j10",
  "owner-no-sit-j21",
  "relance-cp-manquant",
  "relance-profil-incomplet",
  "sitter-encourage-candidature",
];

/** Nom affiché et adresse de réponse selon le gabarit. */
export function transactionalSender(templateName: string, siteName: string, fromDomain: string): { from: string; reply_to?: string } {
  if (FOUNDER_CAMPAIGN_TEMPLATES.includes(templateName)) {
    // Nom entre guillemets : la virgule séparerait sinon deux adresses (RFC 5322).
    return { from: `"${FOUNDER_SENDER_NAME}" <noreply@${fromDomain}>`, reply_to: REPLY_TO_ADDRESS };
  }
  if (templateName === "contact-reply") {
    return { from: `${siteName} <noreply@${fromDomain}>`, reply_to: CONTACT_REPLY_ADDRESS };
  }
  if (FOUNDER_SIGNED_TEMPLATES.includes(templateName)) {
    return { from: `${siteName} <noreply@${fromDomain}>`, reply_to: REPLY_TO_ADDRESS };
  }
  return { from: `${siteName} <noreply@${fromDomain}>` };
}
