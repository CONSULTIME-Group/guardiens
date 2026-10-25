/**
 * Lot E13 (24/10/2026) : extrait lisible de la description d'un besoin.
 * Lot E18 (25/10/2026) : la logique vit dans supabase/functions/_shared/needExcerpt.ts,
 * lue aussi par l'email aux aidants. Ce module la réexporte pour le site.
 */
export { needExcerpt, NEED_EXCERPT_MAX, NEED_EXCERPT_EMAIL_MAX } from "../../supabase/functions/_shared/needExcerpt.ts";
