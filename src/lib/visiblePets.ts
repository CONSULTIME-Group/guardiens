/**
 * Animaux des annonces vues par un gardien (lot Y2, constat P3-10).
 *
 * La table pets n'est lisible que par le propriétaire et le gardien retenu :
 * pour toute autre annonce, la lecture revient vide sans erreur. La vue
 * public_pets sert les animaux des annonces publiées ou archivées, non
 * masquées. Les propriétés absentes de la vue (garde confirmée ou en cours
 * du gardien retenu) sont relues dans pets, une seule fois.
 */
import { supabase } from "@/integrations/supabase/client";

export async function readVisiblePets(propertyIds: string[], columns: string): Promise<any[]> {
  const ids = Array.from(new Set(propertyIds.filter(Boolean)));
  if (ids.length === 0) return [];
  const { data: publicRows } = await (supabase as any)
    .from("public_pets")
    .select(columns)
    .in("property_id", ids);
  const rows: any[] = Array.isArray(publicRows) ? [...publicRows] : [];
  const covered = new Set(rows.map((p) => p.property_id));
  const missing = ids.filter((id) => !covered.has(id));
  if (missing.length > 0) {
    const { data: ownRows } = await supabase
      .from("pets")
      .select(columns)
      .in("property_id", missing);
    if (Array.isArray(ownRows)) rows.push(...(ownRows as any[]));
  }
  return rows;
}
