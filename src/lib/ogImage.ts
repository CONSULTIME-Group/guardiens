/**
 * Construit l'URL de l'image OG dynamique (edge function og-page).
 * Utilisable dans toutes les pages éditoriales (ville, département, race, article…).
 */
const PROJECT_REF = import.meta.env.VITE_SUPABASE_PROJECT_ID || "erhccyqevdyevpyctsjj";
const OG_BASE = `https://${PROJECT_REF}.supabase.co/functions/v1/og-page`;

export type OgKind = "ville" | "departement" | "race" | "article" | "guide" | "faq" | "generic";

export function buildOgImageUrl(opts: {
  title: string;
  subtitle?: string;
  kind?: OgKind;
}): string {
  const params = new URLSearchParams();
  params.set("title", opts.title.slice(0, 120));
  if (opts.subtitle) params.set("subtitle", opts.subtitle.slice(0, 180));
  params.set("kind", opts.kind || "generic");
  return `${OG_BASE}?${params.toString()}`;
}
