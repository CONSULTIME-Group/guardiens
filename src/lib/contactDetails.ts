/**
 * Détection de coordonnées personnelles dans un texte public.
 *
 * Source unique dans supabase/functions/_shared/contact-details.ts (lot E19),
 * lue aussi par moderate-content et mission-quick-action : le site et le
 * serveur détectent à l'identique téléphone et email, et l'adresse postale
 * pour le seul mot laissé après un coup de main.
 */
export * from "../../supabase/functions/_shared/contact-details.ts";
