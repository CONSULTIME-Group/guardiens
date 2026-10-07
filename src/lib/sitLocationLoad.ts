import { supabase } from "@/integrations/supabase/client";
import { deptCodeFromPostal, sitLocationLabel } from "@/lib/sitLocation";
import { DEPT_NAMES } from "@/lib/departments";

/**
 * Calcule le libellé de localisation d'une annonce depuis ses lignes brutes.
 * Une seule lecture de `departements` (nom, jamais nom_region), et seulement
 * quand aucune commune n'est connue.
 */
export async function loadSitLocationLabel(
  sit: { city?: string | null; departement_code?: string | null } | null | undefined,
  owner: { city?: string | null; postal_code?: string | null } | null | undefined,
): Promise<string> {
  const base = { sitCity: sit?.city, ownerCity: owner?.city, postalCode: owner?.postal_code };
  if ((sit?.city || "").trim() || (owner?.city || "").trim()) return sitLocationLabel(base);
  const code = (sit?.departement_code || "").trim() || deptCodeFromPostal(owner?.postal_code);
  let departementName: string | null = null;
  if (code) {
    try {
      const { data } = await supabase
        .from("departements" as any)
        .select("nom")
        .eq("code", code)
        .maybeSingle();
      departementName = ((data as any)?.nom as string | undefined) ?? null;
    } catch {
      departementName = null;
    }
  }
  return sitLocationLabel({ ...base, departementName });
}

/**
 * Variante synchrone, sans aucune lecture réseau : le nom du département vient
 * de la table locale DEPT_NAMES. Pour les listes et blocs du tableau de bord,
 * dont le budget de lectures est verrouillé.
 */
export function sitLocationLabelLocal(
  sit: { city?: string | null; departement_code?: string | null } | null | undefined,
  owner: { city?: string | null; postal_code?: string | null } | null | undefined,
): string {
  const code = (sit?.departement_code || "").trim() || deptCodeFromPostal(owner?.postal_code);
  const departementName = code ? DEPT_NAMES[code] ?? DEPT_NAMES[code.padStart(2, "0")] ?? null : null;
  return sitLocationLabel({
    sitCity: sit?.city,
    ownerCity: owner?.city,
    postalCode: owner?.postal_code,
    departementName,
  });
}
