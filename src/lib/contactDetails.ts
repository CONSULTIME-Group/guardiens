/**
 * Détection de coordonnées personnelles dans un texte public.
 *
 * Une annonce d'entraide est une page publique indexable : y laisser un
 * numéro de téléphone ou une adresse email expose le membre et sort
 * l'échange de la plateforme. La détection est bloquante à la publication,
 * contrairement à la messagerie privée où l'échange de coordonnées est
 * légitime.
 */

const PHONE_RE = /(?:(?:\+33|0033|0)\s?[1-9](?:[\s.\-]?\d{2}){4})/;
const EMAIL_RE = /[\w.+-]+\s?(?:@|\(at\)|\[at\]|\sarobase\s)\s?[\w-]+\.[\w.-]+/i;
const OBFUSCATED_PHONE_RE = /\b0\s?[1-9](?:[\s.\-]*\d){8}\b/;

export type ContactDetailKind = "phone" | "email";

export function detectContactDetails(input: string | null | undefined): ContactDetailKind[] {
  if (!input || !input.trim()) return [];
  const found: ContactDetailKind[] = [];
  if (PHONE_RE.test(input) || OBFUSCATED_PHONE_RE.test(input)) found.push("phone");
  if (EMAIL_RE.test(input)) found.push("email");
  return found;
}

export function contactDetailsMessage(kinds: ContactDetailKind[]): string {
  const labels = kinds.map((k) => (k === "phone" ? "un numéro de téléphone" : "une adresse email"));
  const list =
    labels.length > 1 ? `${labels.slice(0, -1).join(", ")} et ${labels[labels.length - 1]}` : labels[0];
  return `Votre annonce contient ${list}. Une annonce d'entraide est une page publique : retirez ces coordonnées, vos échanges se poursuivront dans la messagerie une fois la mise en relation faite.`;
}
