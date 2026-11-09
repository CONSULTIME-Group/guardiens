/**
 * Lot ADM16 (lot B E2) : adresse d'un compte effacé, masquée à l'écran
 * (« ch•••@gmail.com »). Le domaine reste lisible pour le suivi.
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at <= 0) return "•••";
  const local = email.slice(0, at);
  return `${local.slice(0, Math.min(2, local.length))}•••${email.slice(at)}`;
}
