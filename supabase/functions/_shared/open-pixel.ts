/**
 * Lot MAIL2 (14/11/2026) : pixel d'ouverture maison pour les envois groupés.
 * Le suivi des ouvertures de Resend est coupé au niveau du domaine : un seul
 * pixel par email, servi par track-email-pixel, qui tient à jour les mêmes
 * colonnes que le webhook Resend (first_opened_at, last_opened_at, open_count).
 *
 * Identifiants passés dans l'adresse : la campagne (c) et, pour reconnaître le
 * destinataire, soit son jeton de désinscription (t, déjà présent dans le lien
 * de désinscription du même email), soit son identifiant de profil (u).
 */
export function massOpenPixelHtml(
  supabaseUrl: string,
  campaignId: string,
  who: { token?: string | null; userId?: string | null },
): string {
  const params = new URLSearchParams({ c: campaignId });
  if (who.token) params.set("t", who.token);
  else if (who.userId) params.set("u", who.userId);
  else return "";
  const src = `${supabaseUrl}/functions/v1/track-email-pixel?${params.toString()}`;
  return `<img src="${src.replace(/&/g, "&amp;")}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;" />`;
}

/** Place le pixel juste avant </body>, ou en fin de document. */
export function withOpenPixel(html: string, pixel: string): string {
  if (!pixel) return html;
  const i = html.lastIndexOf("</body>");
  return i >= 0 ? `${html.slice(0, i)}${pixel}${html.slice(i)}` : `${html}${pixel}`;
}
