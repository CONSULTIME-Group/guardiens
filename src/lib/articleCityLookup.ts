/**
 * Lot STAT1 : rattache un article (articles.city) à une page ville ou à un
 * guide de ville publiés.
 *
 * Avant : .ilike("city", `%${ville}%`).maybeSingle(). Pour « Lyon », deux
 * pages publiées répondent (Lyon, Monts du Lyonnais) : maybeSingle rendait
 * une erreur, la page ville restait introuvable, le bloc « En savoir plus »
 * disparaissait et les variables ville tombaient (18 articles city = Lyon au
 * 16/11/2026 ; city_guides : même cas pour Valence et Saint-Marcel-lès-Valence).
 *
 * Règle : d'abord l'égalité sans tenir compte de la casse (ilike sans joker,
 * % et _ échappés), puis seulement si rien ne répond la recherche partielle
 * bornée, en préférant le nom de ville le plus court (le plus proche de la
 * ville cherchée). Jamais maybeSingle sur plusieurs lignes.
 */

export type CityLookupTable = "seo_city_pages" | "city_guides";

export interface CityRow {
  slug: string;
  city: string | null;
}

/** Nombre de lignes lues au plus pour la recherche partielle. */
export const PARTIAL_CITY_CANDIDATES = 20;

/** Échappe les jokers de LIKE pour une égalité stricte (casse ignorée). */
export const escapeLike = (value: string): string => value.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Parmi des lignes candidates, la ville au nom le plus court, puis l'ordre alphabétique. */
export const pickClosestCity = (rows: CityRow[]): CityRow | null => {
  const usable = rows.filter((r) => r && typeof r.slug === "string" && r.slug);
  if (usable.length === 0) return null;
  return [...usable].sort((a, b) => {
    const la = (a.city ?? "").length;
    const lb = (b.city ?? "").length;
    if (la !== lb) return la - lb;
    return (a.city ?? "").localeCompare(b.city ?? "", "fr");
  })[0];
};

type QueryResult = { data: unknown; error: unknown };

// Constructeur de requête minimal (client Supabase), typé au plus juste pour
// rester testable avec une base simulée.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = { from: (table: any) => any };

const readRows = (res: QueryResult): CityRow[] =>
  !res || res.error || !Array.isArray(res.data) ? [] : (res.data as CityRow[]);

/**
 * Rend le slug de la ligne publiée qui correspond à la ville de l'article, ou
 * null. Une lecture en erreur compte comme « rien trouvé » ; une exception
 * réseau remonte à l'appelant (qui clôt alors la recherche).
 */
export const findCitySlug = async (
  client: SupabaseLike,
  table: CityLookupTable,
  city: string
): Promise<string | null> => {
  const wanted = city.trim();
  if (!wanted) return null;

  const base = () => {
    let q = client.from(table).select("slug, city").eq("published", true);
    if (table === "seo_city_pages") q = q.not("slug", "like", "test-%");
    return q;
  };

  const exact = readRows(await base().ilike("city", escapeLike(wanted)).order("slug").limit(1));
  if (exact.length > 0) return exact[0].slug;

  const partial = readRows(
    await base().ilike("city", `%${escapeLike(wanted)}%`).order("city").limit(PARTIAL_CITY_CANDIDATES)
  );
  return pickClosestCity(partial)?.slug ?? null;
};
