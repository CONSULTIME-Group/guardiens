/**
 * Lot ADM9 : lien de l'email « Écrire à ce membre ».
 *
 * Même règle que le serveur (supabase/functions/_shared/admin-personal-message.ts) :
 * un lien entier (libellé et adresse https) ou aucun lien. La boîte préremplit
 * l'adresse de l'annonce avec le libellé SIT_LINK_LABEL, l'envoi part donc tel quel.
 */
import { isSafeLinkUrl, LINK_LABEL_MAX } from "../../../supabase/functions/_shared/admin-personal-message";

export const SIT_LINK_LABEL = "Voir l'annonce";

export const sitLinkUrl = (sitId: string) => `https://guardiens.fr/sits/${sitId}`;

/** Lien prérempli à l'ouverture : celui de l'annonce, sinon aucun. */
export function prefilledLink(sitId?: string | null): { linkLabel: string; linkUrl: string } {
  return sitId ? { linkLabel: SIT_LINK_LABEL, linkUrl: sitLinkUrl(sitId) } : { linkLabel: "", linkUrl: "" };
}

export interface LinkCheck {
  ok: boolean;
  link?: { linkLabel: string; linkUrl: string } | null;
  error?: string;
}

/** Contrôle du lien, messages identiques à ceux du serveur. */
export function checkLink(linkLabel: string, linkUrl: string): LinkCheck {
  const label = linkLabel.trim();
  const url = linkUrl.trim();
  if (!label && !url) return { ok: true, link: null };
  if (!label || !url) return { ok: false, error: "Le lien demande un libellé et une adresse." };
  if (label.length > LINK_LABEL_MAX) return { ok: false, error: `Le libellé dépasse ${LINK_LABEL_MAX} caractères.` };
  if (!isSafeLinkUrl(url)) return { ok: false, error: "L'adresse du lien doit commencer par https://." };
  return { ok: true, link: { linkLabel: label, linkUrl: url } };
}
