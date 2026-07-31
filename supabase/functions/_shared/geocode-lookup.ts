// Résolution d'une ville dans `geocode_cache`.
//
// Le cache porte historiquement trois formes de clé : la forme brute
// (`houlgate`), la forme suffixée pays (`hyeres|france`) et la forme préfixée
// écrite par la fonction `geocode` (`city:givors|france`). Une lecture qui ne
// teste qu'une seule forme rate la majorité des entrées, sans erreur visible :
// elle retombe simplement sur le repli départemental.
export function normalizeCityKey(city: string): string {
  return city
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, " ");
}

export function geocodeKeyCandidates(city: string): string[] {
  const raw = city.trim().toLowerCase();
  const n = normalizeCityKey(city);
  return [...new Set([`city:${n}|france`, `${n}|france`, n, raw])].filter(Boolean);
}

export async function lookupCityCoords(
  supabase: any,
  city: string | null | undefined,
): Promise<{ lat: number; lng: number } | null> {
  const value = (city ?? "").toString().trim();
  if (!value) return null;
  const { data } = await supabase
    .from("geocode_cache")
    .select("normalized_name, lat, lng")
    .in("normalized_name", geocodeKeyCandidates(value));
  if (!data || data.length === 0) return null;
  const row = data[0];
  if (row.lat == null || row.lng == null) return null;
  return { lat: Number(row.lat), lng: Number(row.lng) };
}
