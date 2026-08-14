/**
 * Réécriture d'une URL Supabase Storage vers l'endpoint de transformation
 * d'image, afin de servir une largeur adaptée à l'affichage réel plutôt que
 * l'original téléversé.
 *
 * Règle de prudence : toute URL qui n'est pas une URL publique du storage de
 * ce projet (asset importé, URL externe, valeur vide) est retournée telle
 * quelle. Aucune image qui fonctionne aujourd'hui ne peut casser.
 */

const PUBLIC_OBJECT_SEGMENT = "/storage/v1/object/public/";
const PUBLIC_RENDER_SEGMENT = "/storage/v1/render/image/public/";

export interface StorageImageOptions {
  width: number;
  /**
   * Hauteur exacte à servir. À fournir dès que le cadre d'affichage impose un
   * ratio : l'endpoint de transformation conserve la hauteur d'origine quand
   * seule la largeur est demandée, l'image servie est alors déformée.
   */
  height?: number;
  quality?: number;
  resize?: "cover" | "contain" | "fill";
}

export function storageImageUrl(
  url: string | null | undefined,
  { width, height, quality = 75, resize = "cover" }: StorageImageOptions,
): string {
  if (!url) return "";
  if (typeof url !== "string") return "";
  if (!url.includes(PUBLIC_OBJECT_SEGMENT)) return url;
  if (!/^https?:\/\//i.test(url)) return url;
  if (!/\.supabase\.co\//i.test(url)) return url;

  const [base, existingQuery] = url.split("?");
  const rewritten = base.replace(PUBLIC_OBJECT_SEGMENT, PUBLIC_RENDER_SEGMENT);
  const params = new URLSearchParams(existingQuery || "");
  params.set("width", String(Math.round(width)));
  if (height) params.set("height", String(Math.round(height)));
  params.set("quality", String(quality));
  params.set("resize", resize);
  return `${rewritten}?${params.toString()}`;
}

/**
 * Construit un srcset à plusieurs largeurs, vide si l'URL n'est pas transformable.
 * `ratio` (largeur / hauteur du cadre) ajoute la hauteur proportionnelle à
 * chaque largeur, pour la même raison que `height` ci-dessus.
 */
export function storageImageSrcSet(
  url: string | null | undefined,
  widths: number[],
  quality = 75,
  ratio?: number,
): string | undefined {
  if (!url || !url.includes(PUBLIC_OBJECT_SEGMENT)) return undefined;
  return widths
    .map((w) => `${storageImageUrl(url, { width: w, quality, height: ratio ? Math.round(w / ratio) : undefined })} ${w}w`)
    .join(", ");
}

/**
 * Raccourci avatar : le cadre de rendu est toujours carré et le recadrage
 * cover centré côté serveur est visuellement équivalent au object-cover
 * centré appliqué côté client. `size` = taille réelle du cadre en px CSS.
 *
 * Règle absolue, valable pour tout appel à storageImageUrl : toujours
 * fournir width ET height. L'endpoint conserve la hauteur d'origine quand
 * seule la largeur est demandée, l'image servie est alors déformée (et
 * plus lourde que la version recadrée). Un appel avec width sans height
 * n'est jamais acceptable, quel que soit le sujet de l'image.
 */
export function avatarImageUrl(
  url: string | null | undefined,
  size: number,
  quality = 75,
): string {
  return storageImageUrl(url, { width: size, height: size, quality });
}
