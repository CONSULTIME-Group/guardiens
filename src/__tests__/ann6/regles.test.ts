/**
 * Lot ANN-6 (17/11/2026) : tri, synthèse des brouillons, règles de la
 * diffusion nationale ciblée, câblage serveur et gabarit.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  compareListings, defaultSortFor, effectiveSortKey, sortOptionsFor, sortScopeOf,
} from "@/lib/admin/listingSort";
import { draftSummaryHead, draftSummaryParts, summarizeDrafts } from "@/lib/admin/draftSummary";
import type { OwnerDraftContext } from "@/lib/admin/draftReadiness";
import {
  CUSTOM_HOOK_MAX, CUSTOM_SUBJECT_MAX, checkCustomHook, checkCustomSubject, coversChristmas,
  parseAudience, recentSeenCutoff, suggestBroadcastTexts,
} from "../../../supabase/functions/_shared/proximity-broadcast";

const SERVER = readFileSync("supabase/functions/send-listing-proximity/index.ts", "utf8");
const TPL = readFileSync("supabase/functions/_shared/transactional-email-templates/nearby-sit-alert.tsx", "utf8");
const CARD = readFileSync("src/components/admin/ListingProximityCard.tsx", "utf8");
const PAGE = readFileSync("src/pages/admin/AdminListings.tsx", "utf8");

describe("ANN-6, tri", () => {
  it("défauts : urgence en ligne, modifiée récemment pour les brouillons, création sinon", () => {
    expect(defaultSortFor("published", true)).toBe("urgency");
    expect(defaultSortFor("ready", false)).toBe("updated");
    expect(defaultSortFor("preparing", false)).toBe("updated");
    for (const f of ["withdrawn", "closed", "cancelled", "all"]) expect(defaultSortFor(f, false)).toBe("created");
  });
  it("l'urgence n'existe que pour les annonces en ligne", () => {
    expect(sortOptionsFor(true)).toContain("urgency");
    expect(sortOptionsFor(false)).not.toContain("urgency");
  });
  it("un choix ne vaut que pour son périmètre", () => {
    const pick = { scope: sortScopeOf("published", true), key: "published" as const };
    expect(effectiveSortKey(pick, "waiting_long", true)).toBe("published");
    expect(effectiveSortKey(pick, "ready", false)).toBe("updated");
    expect(effectiveSortKey({ scope: "ready", key: "urgency" }, "ready", false)).toBe("updated");
  });
  it("plus récent d'abord, date absente en dernier, identifiant en départage", () => {
    const rows = [
      { id: "c", published_at: null },
      { id: "b", published_at: "2026-11-10T10:00:00Z" },
      { id: "a", published_at: "2026-11-10T10:00:00Z" },
      { id: "d", published_at: "2026-11-15T10:00:00Z" },
    ];
    rows.sort((x, y) => compareListings("published", x, y));
    expect(rows.map((r) => r.id)).toEqual(["d", "a", "b", "c"]);
  });
});

describe("ANN-6, synthèse des brouillons", () => {
  const ctx = new Map<string, OwnerDraftContext>();
  const today = "2026-11-17";
  const d = (id: string, o: Record<string, unknown>) => ({ id, user_id: `u-${id}`, status: "draft", title: "T", city: "Lyon", start_date: "2026-12-20", end_date: "2026-12-27", ...o });
  it("chaque brouillon jamais publié tombe dans une seule case, les autres sont ignorés", () => {
    const s = summarizeDrafts([
      d("1", { city: null }),
      d("2", { start_date: "2026-11-01" }),
      d("3", {}),
      d("4", { published_at: "2026-10-01T00:00:00Z" }),
      d("5", { unpublished_at: "2026-10-01T00:00:00Z" }),
      { id: "6", status: "published" },
    ], ctx, today);
    expect(s).toMatchObject({ total: 3, noCity: 1, past: 1, ready: 0, toComplete: 1 });
    expect(s.ready + s.noCity + s.past + s.toComplete).toBe(s.total);
  });
  it("phrases accordées", () => {
    expect(draftSummaryHead(1)).toBe("1 brouillon jamais publié");
    expect(draftSummaryHead(31)).toBe("31 brouillons jamais publiés");
    const parts = draftSummaryParts({ total: 4, ready: 1, noCity: 0, past: 2, toComplete: 1 });
    expect(parts.map((p) => `${p.count} ${p.label}`)).toEqual(["1 prêt à publier", "2 avec dates dépassées", "1 à compléter"]);
  });
  it("la page lit draftReadiness, aucune seconde règle", () => {
    expect(readFileSync("src/lib/admin/draftSummary.ts", "utf8")).toContain("draftReadiness(");
    expect(PAGE).toContain("summarizeDrafts(listings, draftCtx, today)");
  });
});

describe("ANN-6, règles de la diffusion nationale ciblée", () => {
  it("audience : seule « recent_90d » restreint, absente ou inconnue vaut « all » comme avant", () => {
    expect(parseAudience("recent_90d")).toBe("recent_90d");
    expect(parseAudience("all")).toBe("all");
    expect(parseAudience(undefined)).toBe("all");
    expect(parseAudience("nimporte")).toBe("all");
  });
  it("90 jours avant maintenant", () => {
    const now = new Date("2026-11-17T08:00:00Z");
    expect(recentSeenCutoff(now)).toBe("2026-08-19T08:00:00.000Z");
  });
  it("objet : normalisé, apostrophe typographique, refus du « ! », des tirets longs, des émojis et de plus de 90 signes", () => {
    expect(checkCustomSubject("  Et si votre   Noël\nétait à Papeete ? ")).toEqual({ value: "Et si votre Noël était à Papeete ?", error: null });
    expect(checkCustomSubject("L'île").value).toBe("L’île");
    expect(checkCustomSubject("Venez !").error).not.toBeNull();
    expect(checkCustomSubject("Papeete — Tahiti").error).not.toBeNull();
    expect(checkCustomSubject("Papeete – Tahiti").error).not.toBeNull();
    expect(checkCustomSubject("Soleil ☀️").error).not.toBeNull();
    expect(checkCustomSubject("x".repeat(CUSTOM_SUBJECT_MAX + 1)).error).not.toBeNull();
    expect(checkCustomSubject("x".repeat(CUSTOM_SUBJECT_MAX)).error).toBeNull();
    expect(checkCustomSubject(undefined)).toEqual({ value: "", error: null });
    expect(checkCustomSubject("   ")).toEqual({ value: "", error: null });
  });
  it("accroche : 220 signes au plus, espaces normalisés, HTML laissé en texte", () => {
    expect(CUSTOM_HOOK_MAX).toBe(220);
    expect(checkCustomHook("x".repeat(300)).error).not.toBeNull();
    expect(checkCustomHook("x".repeat(220)).error).toBeNull();
    expect(checkCustomHook("Bonjour\n\n  vous").value).toBe("Bonjour vous");
    expect(checkCustomHook("<b>gras</b>").value).toBe("<b>gras</b>");
    expect(checkCustomHook("Un tiret — long").error).not.toBeNull();
  });
  it("suggestions : Noël quand les dates couvrent le 24 ou le 25, sinon « {Prénom} cherche un gardien à {ville} »", () => {
    expect(coversChristmas("2026-12-20", "2027-01-03")).toBe(true);
    expect(coversChristmas("2026-12-25", "2026-12-26")).toBe(true);
    expect(coversChristmas("2026-12-26", "2027-01-03")).toBe(false);
    expect(coversChristmas(null, "2026-12-26")).toBe(false);
    const noel = suggestBroadcastTexts({ city: "Papeete", ownerFirstName: "Virginie", startDate: "2026-12-20", endDate: "2027-01-03", dateRange: "du 20 décembre au 3 janvier" });
    expect(noel.subject).toBe("Et si votre Noël avait lieu à Papeete ?");
    expect(noel.hook).toBe("Virginie cherche quelqu'un pour garder son logement à Papeete, du 20 décembre au 3 janvier. Nous avons pensé à vous.");
    const autre = suggestBroadcastTexts({ city: "Papeete", ownerFirstName: "Virginie", startDate: "2027-02-01", endDate: "2027-02-10" });
    expect(autre.subject).toBe("Virginie cherche un gardien à Papeete");
    expect(suggestBroadcastTexts({ city: "" })).toEqual({ subject: "", hook: "" });
    for (const t of [noel, autre]) {
      expect(checkCustomSubject(t.subject).error).toBeNull();
      expect(checkCustomHook(t.hook).error).toBeNull();
    }
  });
});

describe("ANN-6, serveur et gabarit", () => {
  it("la fonction lit audience, custom_subject et custom_hook, refuse un texte invalide avant tout calcul", () => {
    expect(SERVER).toContain("parseAudience(payload.audience)");
    expect(SERVER).toContain("checkCustomSubject(payload.custom_subject)");
    expect(SERVER).toContain("checkCustomHook(payload.custom_hook)");
    expect(SERVER.indexOf("customError")).toBeLessThan(SERVER.indexOf("await computeRecipients("));
    expect(SERVER).toContain('status: 400');
  });
  it("le filtre de 90 jours ne vaut que pour une diffusion nationale", () => {
    expect(SERVER).toContain('if (nationwide && audience === "recent_90d") {');
    expect(SERVER).toContain('q = q.gte("last_seen_at", recentSeenCutoff());');
  });
  it("l'envoi transmet hook et customSubject, l'aperçu renvoie l'objet effectif", () => {
    expect(SERVER).toContain("hook: hookCheck.value || undefined,");
    expect(SERVER).toContain("customSubject: subjectCheck.value || undefined,");
    expect(SERVER).toContain("const subject = subjectCheck.value || buildSubject(");
  });
  it("gabarit : l'objet saisi prime sur celui du gabarit, l'accroche s'ajoute au-dessus de la carte", () => {
    const subjectFn = TPL.slice(TPL.indexOf("subject: (data"), TPL.indexOf("displayName:"));
    expect(subjectFn.indexOf("customSubject")).toBeGreaterThan(-1);
    expect(subjectFn.indexOf("customSubject")).toBeLessThan(subjectFn.indexOf("isFarAlert(data)"));
    expect(subjectFn).toContain("farSubject(data.ownerFirstName, data.city)");
    expect(TPL.indexOf("{hook ?")).toBeLessThan(TPL.indexOf("<Section style={card}>"));
    expect(TPL).toContain("hook?: string");
  });
  it("l'écran envoie le rayon national et l'audience, bascule seul quand le propriétaire est loin et que personne n'est ciblé", () => {
    expect(CARD).toContain("NATIONWIDE_RADIUS_KM");
    expect(CARD).toContain("body.audience = ov?.audience ?? audience;");
    expect(CARD).toContain("pv.owner_far && pv.count === 0");
    expect(CARD).toContain("1 000 km et plus : diffusion nationale, tous les gardiens du pays sont visés.");
  });
});
