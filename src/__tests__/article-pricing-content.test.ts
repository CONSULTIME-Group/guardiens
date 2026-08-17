import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { isPricingActive } from "@/lib/pricing";

/**
 * Garantit que l'article pilier `/actualites/nouveaux-tarifs-2026`
 * reflète toujours la tarification en vigueur :
 *  - PROSCRIT : « 9€/mois », « 9 €/mois », « trois formules », « 3 formules »,
 *    et le mot « gratuit » (vocabulaire éditorial — on dit « offert »).
 *  - REQUIS  : « 6,99 €/mois » et « offert ».
 *
 * Les champs vérifiés sont : title, meta_title, meta_description, content.
 *
 * Si ce test casse, l'article a été désynchronisé du modèle économique.
 * Mettre à jour la ligne en BDD (table `articles`, slug `nouveaux-tarifs-2026`)
 * avant de toucher ce test.
 */

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? "https://erhccyqevdyevpyctsjj.supabase.co";
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaGNjeXFldmR5ZXZweWN0c2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMzMzQsImV4cCI6MjA4OTk5OTMzNH0.ltBQtcouoqd5tuv_wQXb92x5Q5YYa9mkEQvZUx0wLTY";

const SLUG = "nouveaux-tarifs-2026";

// Patterns interdits — on cible « 9€/mois » et « 9 €/mois » sans matcher « 6,99 € »
const FORBIDDEN_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: "9€/mois (ancien tarif gardien)", regex: /(?<!,)\b9\s*€\s*\/\s*mois/i },
  { label: "trois formules", regex: /trois\s+formules/i },
  { label: "3 formules", regex: /\b3\s+formules\b/i },
  { label: "gratuit (utiliser « offert »)", regex: /\bgratuit(?:e|s|es)?\b/i },
];

const REQUIRED_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: "6,99 €/mois", regex: /6\s*[.,]\s*99\s*€\s*\/\s*mois/i },
  { label: "offert", regex: /\boffert(?:e|s|es)?\b/i },
];

// Décision produit du 17/08/2026 : la dépublication de l'article
// « nouveaux-tarifs-2026 » est volontaire, Guardiens est gratuit jusqu'à
// nouvel ordre. Tant que isPricingActive() est faux, cette suite est ignorée
// proprement (skip, pas de requête réseau). Elle se réactivera d'elle-même le
// jour où le pricing repassera à vrai : l'article devra alors être republié
// et resynchronisé avec les tarifs en vigueur.
describe.skipIf(!isPricingActive())("Article /actualites/nouveaux-tarifs-2026 — cohérence tarifaire", () => {
  let combined = "";
  let fields: { title: string; meta_title: string; meta_description: string; content: string };

  beforeAll(async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data, error } = await supabase
      .from("articles")
      .select("title, meta_title, meta_description, content")
      .eq("slug", SLUG)
      .maybeSingle();

    expect(error, `Erreur Supabase : ${error?.message ?? ""}`).toBeNull();
    expect(data, `Article ${SLUG} introuvable en BDD`).not.toBeNull();

    fields = data as typeof fields;
    combined = [fields.title, fields.meta_title, fields.meta_description, fields.content]
      .filter(Boolean)
      .join("\n\n");
  }, 15000);

  it.each(FORBIDDEN_PATTERNS)(
    "ne contient jamais : $label",
    ({ regex }) => {
      const match = combined.match(regex);
      expect(
        match,
        `Vocabulaire interdit trouvé (${regex}) :\n…${match ? combined.slice(Math.max(0, (match.index ?? 0) - 60), (match.index ?? 0) + 80) : ""}…`,
      ).toBeNull();
    },
  );

  it.each(REQUIRED_PATTERNS)(
    "contient bien : $label",
    ({ regex }) => {
      expect(
        regex.test(combined),
        `Mention requise absente (${regex}) dans title/meta/content de l'article ${SLUG}`,
      ).toBe(true);
    },
  );
});
