// Lot SORT1 (12/11/2026) : sorties à places comptées, rubrique « Entraide & sorties ».
// Règles pures de src/lib/outings.ts, câblage des écrans et invariants de la migration.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  EMPTY_OUTING_DRAFT,
  JOIN_REFUSAL,
  OUTING_CATEGORIES,
  OUTING_COPY,
  OUTING_PLACE_KINDS,
  draftStartsAt,
  feeLabel,
  joinSourceFromSearch,
  outingDateLabel,
  outingDraftErrors,
  outingInsertFromDraft,
  outingPlaceLine,
  outingShareText,
  outingShareUrl,
  outingState,
  parseFee,
  placesLeft,
  placesLine,
  takenLine,
  type OutingDraft,
} from "@/lib/outings";

const read = (p: string) => readFileSync(p, "utf8");
const NOW = new Date("2026-11-12T10:00:00Z");
const base = { status: "open" as const, starts_at: "2026-12-12T17:00:00Z", capacity: 4, taken: 3 };

describe("places comptées", () => {
  it("dit les places à prendre, puis complet", () => {
    expect(placesLeft(base)).toBe(1);
    expect(placesLine(base)).toBe("1 place sur 4");
    expect(placesLine({ capacity: 8, taken: 3 })).toBe("5 places sur 8");
    expect(placesLine({ capacity: 4, taken: 4 })).toBe("Complet, 4 sur 4");
    expect(placesLine({ capacity: 4, taken: 6 })).toBe("Complet, 4 sur 4");
    expect(takenLine(1)).toBe("1 personne déjà là");
    expect(takenLine(3)).toBe("3 personnes déjà là");
  });

  it("état d'une sortie : annulée avant tout, passée, complète, ouverte", () => {
    expect(outingState(base, NOW)).toBe("open");
    expect(outingState({ ...base, taken: 4 }, NOW)).toBe("full");
    expect(outingState({ ...base, starts_at: "2026-11-12T09:00:00Z" }, NOW)).toBe("past");
    expect(outingState({ ...base, status: "cancelled", taken: 4 }, NOW)).toBe("cancelled");
  });
});

describe("textes de la fiche", () => {
  it("gratuit par défaut, sinon le montant par personne", () => {
    expect(feeLabel(null)).toBe("Gratuit");
    expect(feeLabel(0)).toBe("Gratuit");
    expect(feeLabel(3)).toBe("Participation : 3 €");
    expect(feeLabel(3.5)).toBe("Participation : 3,50 €");
    expect(parseFee("3,50")).toBe(3.5);
    expect(parseFee("abc")).toBeNull();
    expect(parseFee("0")).toBeNull();
  });

  it("date à l'heure de Paris, sans secondes", () => {
    expect(outingDateLabel("2026-12-12T17:00:00Z")).toBe("Samedi 12 décembre, 18 h");
    expect(outingDateLabel("2026-12-12T17:30:00Z")).toBe("Samedi 12 décembre, 18 h 30");
    expect(outingDateLabel("pas une date")).toBe("");
  });

  it("le lieu d'une sortie à domicile reste le quartier", () => {
    expect(outingPlaceLine({ place_kind: "home", place_label: "Lyon 5e", city: "Lyon", organizer_first_name: "Martine" })).toBe("Lyon 5e, chez Martine");
    expect(outingPlaceLine({ place_kind: "public", place_label: "Parc de Lacroix-Laval", city: "Marcy-l'Étoile", organizer_first_name: "Léa" })).toBe("Parc de Lacroix-Laval, Marcy-l'Étoile");
    expect(outingPlaceLine({ place_kind: "public", place_label: "Berges du Rhône, Lyon 7e", city: "Lyon", organizer_first_name: null })).toBe("Berges du Rhône, Lyon 7e");
    expect(outingPlaceLine({ place_kind: "online", place_label: "", city: "", organizer_first_name: null })).toBe("En ligne");
  });

  it("lien de partage marqué « proche », origine relue à l'inscription", () => {
    const url = outingShareUrl("belote-a-quatre-1a2b3c4d", "https://guardiens.fr/");
    expect(url).toBe("https://guardiens.fr/sorties/belote-a-quatre-1a2b3c4d?via=proche");
    expect(joinSourceFromSearch("?via=proche")).toBe("lien");
    expect(joinSourceFromSearch("?via=alerte")).toBe("alerte");
    expect(joinSourceFromSearch("?via=n-importe")).toBe("site");
    expect(joinSourceFromSearch("")).toBe("site");
    expect(outingShareText({ title: "Belote à quatre", ...base })).toBe("Belote à quatre, samedi 12 décembre, 18 h : il reste une place. Vous venez ?");
  });
});

describe("formulaire « Proposer une sortie »", () => {
  const valid: OutingDraft = {
    ...EMPTY_OUTING_DRAFT,
    title: "Belote à quatre",
    category: "jeux",
    date: "2026-12-12",
    time: "18:00",
    placeKind: "home",
    placeLabel: "Lyon 5e",
    city: "Lyon",
    postalCode: "69005",
    capacity: 4,
    reserved: 3,
  };

  it("un brouillon complet passe, gratuit et sans accord d'agenda par défaut", () => {
    expect(outingDraftErrors(valid, NOW)).toEqual({});
    expect(EMPTY_OUTING_DRAFT.free).toBe(true);
    expect(EMPTY_OUTING_DRAFT.agendaConsent).toBe(false);
    const row = outingInsertFromDraft(valid, "u1");
    expect(row.participation_eur).toBeNull();
    expect(row.agenda_consent).toBe(false);
    expect(row.capacity).toBe(4);
    expect(row.reserved).toBe(3);
    expect(row.starts_at).toBe(draftStartsAt(valid)!.toISOString());
  });

  it("chaque manque a son message", () => {
    const errors = outingDraftErrors(EMPTY_OUTING_DRAFT, NOW);
    expect(Object.keys(errors).sort()).toEqual(["category", "date", "placeKind", "time", "title"]);
    expect(outingDraftErrors({ ...valid, date: "2026-11-01" }, NOW).date).toBe("Choisissez un jour à venir.");
    expect(outingDraftErrors({ ...valid, placeKind: "public", placeLabel: "" }, NOW).placeLabel).toBeTruthy();
    expect(outingDraftErrors({ ...valid, city: "" }, NOW).city).toBeTruthy();
    expect(outingDraftErrors({ ...valid, capacity: 21 }, NOW).capacity).toBeTruthy();
    expect(outingDraftErrors({ ...valid, reserved: 4 }, NOW).capacity).toBe("Gardez au moins une place à prendre.");
    expect(outingDraftErrors({ ...valid, free: false, fee: "" }, NOW).fee).toBeTruthy();
    expect(outingDraftErrors({ ...valid, free: false, fee: "250" }, NOW).fee).toBeTruthy();
    expect(outingDraftErrors({ ...valid, free: false, fee: "3" }, NOW)).toEqual({});
  });

  it("une sortie en ligne part sans commune", () => {
    const online = { ...valid, placeKind: "online" as const, city: "", postalCode: "", placeLabel: "" };
    expect(outingDraftErrors(online, NOW)).toEqual({});
    expect(outingInsertFromDraft(online, "u1").city).toBe("");
  });
});

describe("textes membres", () => {
  const texts = [
    ...Object.values(OUTING_COPY).flatMap((v) => (typeof v === "function" ? [v("Crest"), v(null)] : typeof v === "string" ? [v] : Object.values(v))),
    ...Object.values(JOIN_REFUSAL),
    ...OUTING_CATEGORIES.map((c) => c.label),
    ...OUTING_PLACE_KINDS.flatMap((p) => [p.label, p.help]),
  ] as string[];

  it("ponctuation du projet et formulations affirmatives", () => {
    for (const t of texts) {
      expect(t, t).not.toMatch(/[—–]/);
      expect(t, t).not.toMatch(/\b(ne|pas|jamais|aucun|aucune|rien)\b|n['’]/i);
      expect(t, t).not.toMatch(/voisin/i);
      expect(t, t).not.toMatch(/\bminutes?\b/i);
    }
  });

  it("les écrans du lot tiennent la même règle de ponctuation", () => {
    for (const f of ["src/pages/Sorties.tsx", "src/pages/SortieCreate.tsx", "src/pages/SortieDetail.tsx", "src/components/outings/OutingCard.tsx", "src/components/outings/EntraideSortiesTabs.tsx"]) {
      expect(read(f), f).not.toMatch(/[—–]/);
    }
  });

  it("neuf catégories validées le 11/11, dans l'ordre", () => {
    expect(OUTING_CATEGORIES.map((c) => c.value)).toEqual(["jeux", "balades", "chiens", "velo", "jardin", "repas", "culture", "ateliers", "autre"]);
  });
});

describe("câblage", () => {
  const app = read("src/App.tsx");
  it("trois adresses, la fiche lisible sans compte, la publication réservée aux membres", () => {
    expect(app).toContain('<Route path="/sorties" element={<PublicShellRoute><Sorties /></PublicShellRoute>} />');
    expect(app).toContain('<Route path="/sorties/proposer" element={<ProtectedRoute><SortieCreate /></ProtectedRoute>} />');
    expect(app).toContain('<Route path="/sorties/:slug" element={<PublicShellRoute><SortieDetail /></PublicShellRoute>} />');
    expect(app.indexOf('path="/sorties/proposer"')).toBeLessThan(app.indexOf('path="/sorties/:slug"'));
  });

  it("drapeau éteint : les trois écrans renvoient vers l'entraide, l'équipe garde un aperçu", () => {
    for (const f of ["src/pages/Sorties.tsx", "src/pages/SortieCreate.tsx", "src/pages/SortieDetail.tsx"]) {
      const src = read(f);
      expect(src, f).toContain("useOutingsEnabled()");
      expect(src, f).toContain('<Navigate to="/petites-missions" replace />');
    }
    const hook = read("src/hooks/useOutingsEnabled.ts");
    expect(hook).toContain("enabled: flagOn || isAdmin");
    expect(read("src/pages/EntraideHub.tsx")).toContain("{outingsOn && ");
  });

  it("fiche et formulaire hors index (décision du 12/11)", () => {
    const detail = read("src/pages/SortieDetail.tsx");
    expect(detail.match(/<PageMeta/g)?.length).toBe(2);
    expect(detail.match(/\bnoindex\b/g)?.length).toBe(2);
    expect(read("src/pages/SortieCreate.tsx")).toMatch(/<PageMeta[^>]*noindex/);
    expect(read("scripts/generate-sitemap.mjs")).not.toContain("/sorties/");
  });

  it("la porte d'affinité laisse la fiche ouverte, le signalement connaît la sortie", () => {
    expect(read("src/lib/onboardingGateRules.ts")).toContain('"/sorties",');
    const report = read("src/components/reports/ReportButton.tsx");
    expect(report).toContain('| "outing"');
    expect(report).toContain('label: "cette sortie"');
  });
});

describe("migration 0145", () => {
  const sql = read("drizzle/migrations/0145_sort1_sorties.sql");
  it("tables à part, small_missions intacte", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.outings");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.outing_attendees");
    expect(sql).not.toMatch(/ALTER\s+(TABLE|TYPE)\s+public\.(small_missions|mission_type_enum)/i);
    expect(sql).not.toMatch(/\b(UPDATE|DELETE FROM|INSERT INTO)\s+public\.small_missions/i);
  });
  it("vue publique en lecture seule, sans position ni masquage", () => {
    expect(sql).toContain("REVOKE ALL ON public.public_outings FROM PUBLIC, anon, authenticated;");
    expect(sql).toContain("GRANT SELECT ON public.public_outings TO anon, authenticated;");
    const view = sql.slice(sql.indexOf("CREATE OR REPLACE VIEW public.public_outings"), sql.indexOf("REVOKE ALL ON public.public_outings"));
    expect(view).not.toMatch(/latitude|longitude|agenda_consent|o\.hidden_at,/);
    expect(view).toContain("WHERE o.hidden_at IS NULL");
  });
  it("places de 2 à 20, drapeau créé éteint, fonctions fermées aux visiteurs", () => {
    expect(sql).toContain("CHECK (capacity BETWEEN 2 AND 20)");
    expect(sql).toContain("VALUES ('sorties', false,");
    for (const fn of ["outing_join(uuid, text)", "outing_leave(uuid)", "outing_remove_attendee(uuid, uuid)", "outing_cancel(uuid, text)", "outing_attendee_list(uuid)"]) {
      expect(sql).toContain(`REVOKE ALL ON FUNCTION public.${fn} FROM PUBLIC, anon;`);
    }
    expect(sql).toContain("IF v_reporters >= 2 THEN");
  });
});
