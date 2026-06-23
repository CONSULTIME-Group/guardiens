// Construit l'URL publique d'une annonce.
// Préfère le slug SEO ; retombe sur l'UUID si le slug n'est pas encore généré.
// Les URLs UUID legacy sont automatiquement 301-redirigées vers la version slug
// par PublicSitDetail.
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function sitSlugOrId(sit: { slug?: string | null; id: string } | null | undefined): string {
  if (!sit) return "";
  return (sit.slug && sit.slug.trim().length > 0) ? sit.slug : sit.id;
}

export function sitPath(sit: { slug?: string | null; id: string } | null | undefined): string {
  const seg = sitSlugOrId(sit);
  return seg ? `/annonces/${seg}` : "/annonces";
}

export function sitAbsoluteUrl(sit: { slug?: string | null; id: string } | null | undefined, origin = "https://guardiens.fr"): string {
  return `${origin}${sitPath(sit)}`;
}

export function isUuid(value: string | undefined | null): boolean {
  return !!value && UUID_RE.test(value.trim());
}
