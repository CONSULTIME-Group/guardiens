// Moteur de vagues de l'Entraide : logique pure (selection, rythme, phrases).
import { describe, it, expect } from "vitest";
import {
  WAVE_SIZE,
  pickNextWave,
  shouldSendNextWave,
  waveHeadline,
  roundDistanceKm,
  WAVE_RELAUNCH_MESSAGE,
  WAVE_EMPTY_MESSAGE,
} from "../../supabase/functions/_shared/mission-wave";

const candidates = Array.from({ length: 25 }, (_, i) => ({
  helper_id: `h${String(i + 1).padStart(2, "0")}`,
  distance_km: (i + 1) * 1.1,
}));

describe("selection des dix plus proches", () => {
  it("retient dix personnes, les plus proches d'abord", () => {
    const wave = pickNextWave(candidates, []);
    expect(wave).toHaveLength(WAVE_SIZE);
    expect(wave.map((c) => c.helper_id)).toEqual(candidates.slice(0, 10).map((c) => c.helper_id));
  });

  it("ne previent jamais deux fois la meme personne", () => {
    const first = pickNextWave(candidates, []);
    const second = pickNextWave(candidates, first.map((c) => c.helper_id));
    expect(second).toHaveLength(10);
    expect(second.some((c) => first.some((f) => f.helper_id === c.helper_id))).toBe(false);
  });

  it("place les personnes sans distance connue en dernier", () => {
    const wave = pickNextWave(
      [{ helper_id: "sans", distance_km: null }, { helper_id: "proche", distance_km: 4 }],
      [],
    );
    expect(wave.map((c) => c.helper_id)).toEqual(["proche", "sans"]);
  });
});

describe("rythme des vagues", () => {
  const now = new Date("2026-09-21T10:00:00Z");
  const base = { status: "open", wave_count: 1, response_count: 0, last_wave_at: null as string | null };

  it("part tout de suite quand aucune vague n'est encore partie", () => {
    expect(shouldSendNextWave(base, now)).toBe(true);
  });

  it("attend quarante-huit heures avant la vague suivante", () => {
    expect(shouldSendNextWave({ ...base, last_wave_at: "2026-09-20T10:00:00Z" }, now)).toBe(false);
    expect(shouldSendNextWave({ ...base, last_wave_at: "2026-09-19T09:59:00Z" }, now)).toBe(true);
  });

  it("s'arrete des qu'une personne a repondu ou que le besoin est ferme", () => {
    expect(shouldSendNextWave({ ...base, response_count: 1 }, now)).toBe(false);
    expect(shouldSendNextWave({ ...base, status: "in_progress" }, now)).toBe(false);
    expect(shouldSendNextWave({ ...base, status: "completed" }, now)).toBe(false);
  });
});

describe("phrases envoyees", () => {
  it("annonce le prenom, la distance arrondie, le besoin et la date", () => {
    expect(waveHeadline("Jeanne", 3.4, "arroser les plantes", "22 septembre")).toBe(
      "Jeanne, à 3 km, a besoin de quelqu'un pour arroser les plantes, 22 septembre.",
    );
  });

  it("reste lisible sans distance ni date connues", () => {
    expect(waveHeadline("Paul", null, "promener un chien", null)).toBe(
      "Paul a besoin de quelqu'un pour promener un chien.",
    );
  });

  it("arrondit toujours la distance a l'entier", () => {
    expect(roundDistanceKm(12.6)).toBe(13);
    expect(roundDistanceKm(null)).toBeNull();
  });

  it("garde des messages affirmatifs, sans tiret cadratin", () => {
    for (const m of [WAVE_RELAUNCH_MESSAGE, WAVE_EMPTY_MESSAGE]) {
      expect(m).not.toMatch(/[—–]/);
      expect(m.length).toBeGreaterThan(20);
    }
  });
});
