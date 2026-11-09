/**
 * Lot L9 (09/11/2026) : la première ouverture du guide de la maison par le
 * gardien retenu est enregistrée (applications.guide_read_at, fonction
 * mark_house_guide_read, drizzle/migrations/0122_l9_guide_lu.sql). Le
 * propriétaire lit alors « {Gardien} a lu le guide de la maison. » sur son
 * accueil. Toute erreur est ignorée : la lecture du guide ne dépend jamais de
 * cet enregistrement.
 */
import { supabase } from "@/integrations/supabase/client";

export async function markHouseGuideRead(propertyId: string): Promise<boolean> {
  try {
    // Fonction ajoutée par la migration 0122, absente des types générés.
    const rpc = supabase.rpc.bind(supabase) as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: unknown }>;
    const { data, error } = await rpc("mark_house_guide_read", { p_property_id: propertyId });
    return !error && data === true;
  } catch {
    return false;
  }
}
