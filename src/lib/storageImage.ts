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
  quality?: number;
  resize?: "cover" | "contain" | "fill";
}

export function storageImageUrl(
  url: string | null | undefined,
  { width, quality = 75, resize = "cover" }: StorageImageOptions,
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
  params.set("quality", String(quality));
  params.set("resize", resize);
  return `${rewritten}?${params.toString()}`;
}

/** Construit un srcset à plusieurs largeurs, vide si l'URL n'est pas transformable. */
export function storageImageSrcSet(
  url: string | null | undefined,
  widths: number[],
  quality = 75,
): string | undefined {
  if (!url || !url.includes(PUBLIC_OBJECT_SEGMENT)) return undefined;
  return widths
    .map((w) => `${storageImageUrl(url, { width: w, quality })} ${w}w`)
    .join(", ");
}
