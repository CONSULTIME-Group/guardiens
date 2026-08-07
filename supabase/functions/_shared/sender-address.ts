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
