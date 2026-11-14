import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { ownerLineText } from "@/components/search/listing/OwnerVisitorLine";
import { itemListDescription, itemListPlace, itemListSpecies } from "@/lib/itemListFacts";
import { publishedThisWeekCount } from "@/lib/listingsWeek";

const read = (p: string) => readFileSync(p, "utf8");

describe("RCH7 · suite côté propriétaire et /annonces", () => {
  it("ligne propriétaire : nombre de gardiens à 30 km quand il est lu, jamais de zéro", () => {
    expect(ownerLineText("Besançon", 5)).toBe("Vous partez bientôt ? 5 gardiens inscrits à moins de 30 km de Besançon. Votre annonce leur part par email.");
    expect(ownerLineText("Gap", 1)).toBe("Vous partez bientôt ? 1 gardien inscrit à moins de 30 km de Gap. Votre annonce leur part par email.");
    expect(ownerLineText("Gap", 0)).toBe("Vous partez bientôt ? Votre annonce part par email aux gardiens proches de chez vous.");
    expect(ownerLineText(null, 12)).toBe("Vous partez bientôt ? Votre annonce part par email aux gardiens proches de chez vous.");
    expect(read("src/components/search/listing/OwnerVisitorLine.tsx")).toContain('supabase.rpc("count_eligible_sitters"');
  });

  it("ItemList : animaux et commune de la garde", () => {
    const sit = { locationCity: "Chazay-d'Azergues", pets: [{ species: "dog" }, { species: "cat" }, { species: "cat" }] };
    expect(itemListPlace(sit)).toBe("Chazay-d'Azergues");
    expect(itemListSpecies(sit)).toBe("1 chien, 2 chats");
    expect(itemListDescription({ place: "Chazay-d'Azergues", species: "1 chien, 2 chats" })).toBe("1 chien, 2 chats · Chazay-d'Azergues");
    expect(itemListDescription({ place: null, species: null })).toBeNull();
    expect(read("src/pages/PublicListings.tsx")).toContain("...(itemListDescription(s) ? { description: itemListDescription(s) } : {}),");
  });

  it("surtitre : publiées cette semaine, même règle pour la page et la vue de démarrage", () => {
    const now = new Date("2026-11-14T12:00:00Z").getTime();
    expect(publishedThisWeekCount([{ published_at: "2026-11-12T08:00:00Z" }, { published_at: "2026-11-01T08:00:00Z" }, { published_at: null }], now)).toBe(1);
    const fr = JSON.parse(read("src/i18n/locales/fr/common.json")).public_listings;
    expect(fr.eyebrow_stats_other).toBe("{{count}} annonces ouvertes · {{cities}} · {{fresh}}");
    expect(fr.week_count_other).toBe("{{count}} publiées cette semaine");
    expect(fr.fresh_daily).toBe("mise à jour quotidienne");
    expect(read("src/boot/bootListingsView.ts")).toContain("weekCount: publishedThisWeekCount(openFr)");
    expect(read("src/pages/PublicListings.tsx")).toContain("setWeekCount(publishedThisWeekCount(data || []));");
  });

  it("garde en ligne : « Inviter sur ma garde » sur chaque carte de gardien", () => {
    const owner = read("src/components/search/SearchOwner.tsx");
    expect(owner).toContain("est en ligne. Invitez les gardiens qui vous plaisent.");
    expect(owner).toContain("canInvite={!!myOpenSit}");
    expect(read("src/components/search/SitterResultCard.tsx")).toContain('label="Inviter sur ma garde"');
  });
});
