/**
 * Détecteur naïf de mention de rencontre / rendez-vous dans un texte libre.
 * Utilisé par le whisper "conversation stagnante" pour éviter de proposer
 * une rencontre alors qu'elle est déjà en discussion.
 */
const MEETING_REGEX =
  /(rencontr\w*|se voir|nous voir|un caf[ée]|rendez[- ]?vous\b|\brdv\b|un appel|visio\w*|face[- ]?à[- ]?face|se rencontrer)/i;

export function detectMeetingMention(text: string): boolean {
  if (!text) return false;
  return MEETING_REGEX.test(text);
}
