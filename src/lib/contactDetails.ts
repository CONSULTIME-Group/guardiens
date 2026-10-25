/**
 * Détection de coordonnées personnelles dans un texte public.
 *
 * Source unique dans supabase/functions/_shared/contact-details.ts (lot E19),
 * lue aussi par moderate-content et mission-quick-action : le site et le
 * serveur détectent à l'identique téléphone, email et adresse postale.
 */
export * from "../../supabase/functions/_shared/contact-details.ts";
