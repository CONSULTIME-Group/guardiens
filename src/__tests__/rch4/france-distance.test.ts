import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { proposedAlertRadius, searchAlertRadius } from "@/lib/alertRadius";
import { petSpeciesCountLabel } from "@/lib/petLabels";
import { isNewlyPublished, publishedAgoLabel } from "@/lib/publishedAgo";

const read = (p: string) => readFileSync(p, "utf8");
const search = read("src/components/search/SearchSitter.tsx");

describe("RCH4 · liste France triée par distance", () => {
  it("France entière par défaut, rayon seulement s'il est demandé", () => {
    expect(search).toContain('if (searchParams.get("rayon")) return "radius";\n return "france";');
    expect(search).toContain('setZoneMode("france");\n  };');
  });

  it("ligne d'état, intertitres de distance, aucune annonce d'exemple", () => {
    expect(search).toContain('t("search_results.count_france_nearest", { count: resultCount, km: nearestFranceKm })');
    expect(search).toContain('r.distance < 30 ? 0 : r.distance <= 100 ? 1 : 2');
    expect(search).toContain("const demoLimit = 0;");
    const fr = JSON.parse(read("src/i18n/locales/fr/common.json"));
    const sr = fr.search_results ?? Object.values(fr).find((v: any) => v && v.band_near);
    expect(sr.band_near).toBe("À moins de 30 km");
    expect(sr.band_mid).toBe("De 30 à 100 km");
    expect(sr.band_far).toBe("Au-delà de 100 km");
  });

  it("published_at lu par la recherche et par le préchargement", () => {
    expect(search).toContain("created_at, published_at, unpublished_at");
    expect(read("scripts/vite-plugin-listings-prefetch.mjs")).toContain("created_at, published_at, unpublished_at");
  });

  it("rayon d'alerte : jamais France entière, 30 km au moins", () => {
    expect(proposedAlertRadius(null)).toBe(100);
    expect(proposedAlertRadius(20)).toBe(30);
    expect(proposedAlertRadius(30)).toBe(30);
    expect(proposedAlertRadius(45)).toBe(50);
    expect(proposedAlertRadius(80)).toBe(100);
    expect(searchAlertRadius(5)).toBe(30);
    expect(searchAlertRadius(15)).toBe(30);
    expect(searchAlertRadius(50)).toBe(50);
    expect(searchAlertRadius(100)).toBe(100);
    const hook = read("src/hooks/search/useSearchAlert.tsx");
    expect(hook).not.toContain('p_region_code: "FR"');
    expect(hook).toContain('p_zone_type: "rayon"');
  });

  it("espèces en toutes lettres, ancienneté de publication", () => {
    expect(petSpeciesCountLabel("cat", 2)).toBe("2 chats");
    expect(petSpeciesCountLabel("dog", 1)).toBe("1 chien");
    expect(petSpeciesCountLabel("horse", 3)).toBe("3 chevaux");
    expect(petSpeciesCountLabel("farm_animal", 2)).toBe("2 animaux de ferme");
    expect(petSpeciesCountLabel("inconnu", 2)).toBeNull();
    const now = new Date("2026-11-14T12:00:00Z");
    expect(publishedAgoLabel("2026-11-12T10:00:00Z", now)).toBe("Publiée il y a 2 jours");
    expect(publishedAgoLabel("2026-11-14T11:00:00Z", now)).toBe("Publiée il y a 1 heure");
    expect(publishedAgoLabel(null, now)).toBeNull();
    expect(isNewlyPublished("2026-11-13T12:00:00Z", now)).toBe(true);
    expect(isNewlyPublished("2026-11-10T12:00:00Z", now)).toBe(false);
    expect(isNewlyPublished(null, now)).toBe(false);
  });
});
