/**
 * Verrou du lot SC1 (10/11/2026, arène claude/arene/2026-11-10-score-completion) :
 * rangement du profil à barème inchangé.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen, fireEvent } from "@testing-library/react";
import { computeOwnerCompletion, computeSitterCompletion, BAREME_MAX } from "@/lib/profileCompletion";
import { OWNER_SCORE_GROUP, SITTER_SCORE_GROUP } from "@/lib/profileScoreGroups";
import { hasTripsAnswer, tripsAnswerOf, tripsColumns, TRIPS_OPTIONS } from "@/lib/trips";
import ScoreBreakdown from "@/components/profile/ScoreBreakdown";
import TripsQuestion from "@/components/profile/TripsQuestion";
import fr from "@/i18n/locales/fr/common.json";

const groupSums = (items: { key: string; points: number }[], map: Record<string, string>) =>
  items.reduce<Record<string, number>>((acc, i) => {
    const g = map[i.key];
    acc[g] = (acc[g] ?? 0) + i.points;
    return acc;
  }, {});

describe("lot SC1 : panneau rangé par rôle, mêmes points", () => {
  it("chaque critère gardien a un groupe, rassure 65, matchs 20, entraide 15", () => {
    const { items } = computeSitterCompletion({ role: "sitter" });
    for (const i of items) expect(SITTER_SCORE_GROUP[i.key], i.key).toBeDefined();
    expect(groupSums(items, SITTER_SCORE_GROUP)).toEqual({ trust: 65, match: 20, help: 15 });
    expect(items.reduce((s, i) => s + i.points, 0)).toBe(BAREME_MAX.sitter);
  });

  it("chaque critère propriétaire a un groupe, rassure 60, matchs 30, entraide 10", () => {
    const { items } = computeOwnerCompletion({ role: "owner" });
    for (const i of items) expect(OWNER_SCORE_GROUP[i.key], i.key).toBeDefined();
    expect(groupSums(items, OWNER_SCORE_GROUP)).toEqual({ trust: 60, match: 30, help: 10 });
    expect(items.reduce((s, i) => s + i.points, 0)).toBe(BAREME_MAX.owner);
  });

  it("le barème ne bouge pas : profil complet à 100, vide à 0", () => {
    const full = computeSitterCompletion({
      role: "sitter", first_name: "A", postal_code: "69005", avatar_url: "x", bio: "x".repeat(50),
      identity_verified: true, competences: ["Bricolage"], lifestyle: ["Joueur"], sitter_gallery_count: 3,
      interests: ["a", "b", "c"], languages: ["Anglais"], life_pace: "calme", animal_types: ["Chiens"],
    });
    expect(full.score).toBe(100);
    expect(computeSitterCompletion({ role: "sitter" }).score).toBe(0);
  });

  it("le panneau affiche trois groupes, la présence et les trajets hors jauge, et sa note", () => {
    render(
      <ScoreBreakdown
        role="sitter"
        total={40}
        defaultOpen
        groups={[
          { id: "trust", title: "Ce qui rassure sur votre fiche", criteria: [{ label: "Photo de profil", points: 20, ok: true }] },
          { id: "match", title: "Ce qui affine vos matchs", criteria: [{ label: "Vos habitudes", points: 10, ok: false }] },
          { id: "help", title: "Ce qui sert l'entraide", criteria: [{ label: "Savoir-faire", points: 15, ok: true }] },
        ]}
        matchSignals={[{ label: "Votre présence pendant la garde", effect: "Compte double.", ok: false }]}
        footnote="Hors jauge, et utilisés pour vos matchs."
      />,
    );
    expect(screen.getByTestId("score-group-trust")).toBeInTheDocument();
    expect(screen.getByTestId("score-group-match")).toBeInTheDocument();
    expect(screen.getByTestId("score-group-help")).toBeInTheDocument();
    expect(screen.getAllByTestId("match-signal")).toHaveLength(1);
    expect(screen.queryByText(/Essentiels|Bonus|Ignorés du score/)).toBeNull();
  });
});

describe("lot SC1 : une question pour les trajets", () => {
  it("trois réponses, chacune écrit le couple attendu", () => {
    expect(TRIPS_OPTIONS.map(o => o.value)).toEqual(["own_vehicle", "license_only", "other_means"]);
    expect(tripsColumns("own_vehicle")).toEqual({ has_license: true, has_vehicle: true });
    expect(tripsColumns("license_only")).toEqual({ has_license: true, has_vehicle: false });
    expect(tripsColumns("other_means")).toEqual({ has_license: false, has_vehicle: false });
    expect(tripsColumns(null)).toEqual({ has_license: null, has_vehicle: null });
  });

  it("les combinaisons existantes se relisent sans rien inventer", () => {
    expect(tripsAnswerOf({ has_license: true, has_vehicle: true })).toBe("own_vehicle");
    expect(tripsAnswerOf({ has_license: null, has_vehicle: true })).toBe("own_vehicle");
    expect(tripsAnswerOf({ has_license: true, has_vehicle: false })).toBe("license_only");
    expect(tripsAnswerOf({ has_license: false, has_vehicle: false })).toBe("other_means");
    expect(tripsAnswerOf({ has_license: null, has_vehicle: false })).toBeNull();
    expect(tripsAnswerOf({ has_license: true, has_vehicle: null })).toBeNull();
    expect(hasTripsAnswer({ has_vehicle: false })).toBe(true);
    expect(hasTripsAnswer({ has_vehicle: null })).toBe(false);
  });

  it("un second toucher sur la réponse choisie efface la réponse", () => {
    const calls: unknown[] = [];
    render(<TripsQuestion value={{ has_license: true, has_vehicle: true }} onChange={c => calls.push(c)} />);
    fireEvent.click(screen.getByRole("radio", { name: "J'ai mon véhicule" }));
    expect(calls.at(-1)).toEqual({ has_license: null, has_vehicle: null });
    fireEvent.click(screen.getByRole("radio", { name: "Je me déplace autrement" }));
    expect(calls.at(-1)).toEqual({ has_license: false, has_vehicle: false });
  });
});

describe("lot SC1 : libellés", () => {
  const pp = (fr as any).profile_page;
  const text = JSON.stringify({ criteria: pp.criteria, hints: pp.hints, sitter_sections: pp.sitter_sections, owner_sections: pp.owner_sections });

  it("aucun symbole ni jargon dans les libellés du score", () => {
    for (const bad of ["≥", "→", "proprio", "mode de vie", "Rayon géographique"]) {
      expect(text.includes(bad), bad).toBe(false);
    }
  });

  it("la section s'appelle Savoir-faire des deux côtés", () => {
    expect(pp.sitter_sections.skills.label).toBe("Savoir-faire");
    expect(pp.owner_sections.skills.label).toBe("Savoir-faire");
  });

  it("chaque champ annoncé « Visible sur votre fiche » est lu par la fiche publique", () => {
    const fiche = readFileSync("src/pages/PublicSitterProfile.tsx", "utf8");
    for (const col of ["work_during_sit", "has_vehicle", "has_license", "life_pace", "special_animal_skills"]) {
      expect(fiche.includes(col), col).toBe(true);
    }
  });

  it("permis et véhicule ne se posent plus en section Mobilité", () => {
    const mobility = readFileSync("src/components/profile/StepMobility.tsx", "utf8");
    expect(mobility.includes("lbl-has-vehicle")).toBe(false);
    const sitter = readFileSync("src/components/profile/StepSitterProfile.tsx", "utf8");
    expect(sitter.includes("<TripsQuestion")).toBe(true);
    expect(sitter.includes("work_during_sit")).toBe(true);
  });
});
