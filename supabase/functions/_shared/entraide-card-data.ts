/**
 * Données de la carte du destinataire pour le gabarit entraide-ligne-relance.
 * avatarUrl suit la même règle que avatarImageUrl côté front (src/lib/storageImage.ts) :
 * URL publique du storage réécrite vers l'endpoint de transformation, 112 x 112, cover.
 */
const PUBLIC_OBJECT_SEGMENT = "/storage/v1/object/public/";
const PUBLIC_RENDER_SEGMENT = "/storage/v1/render/image/public/";

export function emailAvatarUrl(url: string | null | undefined, size = 112, quality = 75): string | undefined {
  if (typeof url !== "string" || !url.trim()) return undefined;
  const u = url.trim();
  if (!u.includes(PUBLIC_OBJECT_SEGMENT) || !/^https?:\/\//i.test(u) || !/\.supabase\.co\//i.test(u)) return u;
  const [base, q] = u.split("?");
  const params = new URLSearchParams(q || "");
  params.set("width", String(size));
  params.set("height", String(size));
  params.set("quality", String(quality));
  params.set("resize", "cover");
  return `${base.replace(PUBLIC_OBJECT_SEGMENT, PUBLIC_RENDER_SEGMENT)}?${params.toString()}`;
}

export function emailCity(city: string | null | undefined): string | undefined {
  if (typeof city !== "string") return undefined;
  const c = city.trim();
  if (!c) return undefined;
  return c.charAt(0).toLocaleUpperCase("fr-FR") + c.slice(1);
}

export function entraideCardData(p: { city?: string | null; avatar_url?: string | null }): { city?: string; avatarUrl?: string } {
  const city = emailCity(p.city);
  const avatarUrl = emailAvatarUrl(p.avatar_url);
  return { ...(city ? { city } : {}), ...(avatarUrl ? { avatarUrl } : {}) };
}
