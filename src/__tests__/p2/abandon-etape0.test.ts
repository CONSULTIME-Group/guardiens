/**
 * Lot P2 (arène du 19/10/2026) : l'abandon à l'étape 0 porte le nom du
 * dernier champ touché et l'atteinte du brouillon, jamais la valeur saisie.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  STEP0_FIELDS,
  aggregateStep0Abandons,
  buildAbandonMetadata,
  resolveStep0Field,
  sanitizeStep0Field,
} from "@/lib/sitCreateAbandon";

const SECRET = "Marie Dupont 06 12 34 56 78, 12 rue des Lilas";

describe("métadonnées d'abandon à l'étape 0", () => {
  it("portent le nom du champ et l'atteinte du brouillon", () => {
    const m = buildAbandonMetadata({
      step: 0, hasDraftParam: false, exit: "page_close", formShown: true, lastField: "title", draftSaved: true,
    });
    expect(m).toEqual({
      step: 0, has_draft: false, exit: "page_close",
      step0_form_shown: true, step0_last_field: "title", step0_draft_saved: true,
    });
  });

  it("écartent toute valeur saisie, même passée à la place du nom de champ", () => {
    const m = buildAbandonMetadata({
      step: 0, hasDraftParam: true, exit: "route_change", formShown: true, lastField: SECRET, draftSaved: false,
    });
    expect(m.step0_last_field).toBeNull();
    const serialized = JSON.stringify(m);
    expect(serialized).not.toContain("Marie");
    expect(serialized).not.toContain("Lilas");
    for (const v of Object.values(m)) {
      expect(["string", "number", "boolean"].includes(typeof v) || v === null).toBe(true);
      if (typeof v === "string") expect(["route_change", "page_close", ...STEP0_FIELDS]).toContain(v);
    }
  });

  it("restent identiques à l'existant hors étape 0", () => {
    const m = buildAbandonMetadata({
      step: 2, hasDraftParam: false, exit: "route_change", formShown: true, lastField: "title", draftSaved: true,
    });
    expect(m).toEqual({ step: 2, has_draft: false, exit: "route_change" });
  });

  it("résout le champ depuis l'élément touché, sans lire sa valeur", () => {
    const wrapper = { id: "title-field", parentElement: null };
    const input = { id: "title-input", value: SECRET, parentElement: wrapper };
    expect(resolveStep0Field(input)).toBe("title");
    const start = { id: "start-date", value: "2026-11-02", parentElement: { id: "dates-field", parentElement: null } };
    expect(resolveStep0Field(start)).toBe("start_date");
    const textarea = { id: "description-textarea", parentElement: { id: "absence-reason-field", parentElement: { id: "description-field", parentElement: null } } };
    expect(resolveStep0Field(textarea)).toBe("absence_reason");
    expect(resolveStep0Field({ id: "ailleurs", parentElement: null })).toBeNull();
    expect(sanitizeStep0Field("owner_message")).toBe("owner_message");
    expect(sanitizeStep0Field(42)).toBeNull();
  });

  it("CreateSit émet l'événement existant, sans nouvel événement", () => {
    const src = readFileSync("src/pages/CreateSit.tsx", "utf8");
    expect(src).toContain('trackEvent("sits_create_abandoned"');
    expect(src).toContain("buildAbandonMetadata(");
    expect(src).toContain('"pagehide"');
    expect(src).toContain("draftSavedRef.current = true");
    expect(src).not.toMatch(/sits_create_step0_/);
    expect(src).toMatch(/onFocusCapture=\{\(e\) => noteStep0Field\(e\.target\)\}/);
  });
});

describe("agrégat admin par dernier champ touché", () => {
  it("classe les abandons, isole les relevés antérieurs et l'écran de prérequis", () => {
    const rows = aggregateStep0Abandons([
      { step: 0, step0_last_field: "title", step0_draft_saved: true, step0_form_shown: true },
      { step: 0, step0_last_field: "title", step0_draft_saved: false, step0_form_shown: true },
      { step: 0, step0_last_field: null, step0_draft_saved: false, step0_form_shown: true },
      { step: 0, step0_last_field: null, step0_draft_saved: false, step0_form_shown: false },
      { step: 0, has_draft: false },
      { step: 1, step0_last_field: "title" },
      null,
    ]);
    expect(rows[0]).toMatchObject({ bucket: "title", count: 2, draftSaved: 1 });
    const byBucket = Object.fromEntries(rows.map((r) => [r.bucket, r.count]));
    expect(byBucket).toEqual({ title: 2, none: 1, setup_only: 1, before_measure: 1 });
  });

  it("la carte Trafic lit analytics_events en lecture seule", () => {
    const src = readFileSync("src/components/admin/Step0AbandonsCard.tsx", "utf8");
    expect(src).toContain('.from("analytics_events")');
    expect(src).toContain('"sits_create_abandoned"');
    expect(src).toContain("Abandons à l'étape 0, par dernier champ touché, 30 jours");
    expect(src).not.toMatch(/\.(insert|update|upsert|delete)\(/);
    expect(readFileSync("src/pages/admin/AdminTraffic.tsx", "utf8")).toContain("<Step0AbandonsCard />");
  });
});
