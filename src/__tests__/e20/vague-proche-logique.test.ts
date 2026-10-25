// Lot E20 « Vague proche » : logique pure du moteur de vagues et câblage de
// notify-mission-wave et des gabarits.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  WAVE_SIZE,
  WAVE_INTERVAL_HOURS,
  WAVE_MAX_RADIUS_KM,
  WAVE_PREFERRED_RADIUS_KM,
  effectiveHelperRadiusKm,
  pickNextWave,
  shouldSendNextWave,
  waveExhaustedAfterRun,
  waveExhaustedMessage,
  waveTierKm,
} from "../../../supabase/functions/_shared/mission-wave";

const read = (p: string) => readFileSync(p, "utf8");
const NEG = /\b(ne|pas|jamais|aucun|aucune|rien)\b|n'|n’/i;

describe("décision du 25/10 : 30 km au plus, 15 km de préférence, groupes de 10", () => {
  it("constantes", () => {
    expect(WAVE_MAX_RADIUS_KM).toBe(30);
    expect(WAVE_PREFERRED_RADIUS_KM).toBe(15);
    expect(WAVE_SIZE).toBe(10);
    expect(WAVE_INTERVAL_HOURS).toBe(48);
  });

  it("le rayon d'un aidant peut seulement réduire", () => {
    expect(effectiveHelperRadiusKm(null)).toBe(30);
    expect(effectiveHelperRadiusKm(15)).toBe(15);
    expect(effectiveHelperRadiusKm(50)).toBe(30);
    expect(effectiveHelperRadiusKm(100)).toBe(30);
  });

  it("aucune personne au-delà de 30 km, les plus proches d'abord, 10 au plus", () => {
    const candidates = [
      { helper_id: "loin", distance_km: 31 },
      { helper_id: "tres-loin", distance_km: 80 },
      ...Array.from({ length: 14 }, (_, i) => ({ helper_id: `h${String(i).padStart(2, "0")}`, distance_km: 29 - i * 2 })),
    ];
    const wave = pickNextWave(candidates, [], 50);
    expect(wave).toHaveLength(10);
    expect(wave.every((c) => (c.distance_km ?? 0) <= 30)).toBe(true);
    const d = wave.map((c) => c.distance_km as number);
    expect(d).toEqual([...d].sort((a, b) => a - b));
    expect(wave.map((c) => c.helper_id)).not.toContain("loin");
  });

  it("vague 1 à 15 km quand au moins une personne y est, puis jusqu'à 30 km", () => {
    const candidates = [
      { helper_id: "a", distance_km: 22 },
      { helper_id: "b", distance_km: 4 },
      { helper_id: "c", distance_km: 12 },
    ];
    const wave = pickNextWave(candidates, []);
    expect(wave.map((c) => c.helper_id)).toEqual(["b", "c", "a"]);
    expect(waveTierKm(wave.slice(0, 2))).toBe(15);
    expect(waveTierKm(wave)).toBe(30);
  });

  it("plus aucune vague une fois le vivier épuisé", () => {
    const base = { status: "open", wave_count: 1, response_count: 0, last_wave_at: "2026-10-20T10:00:00Z" };
    const now = new Date("2026-10-25T10:00:00Z");
    expect(shouldSendNextWave(base, now)).toBe(true);
    expect(shouldSendNextWave({ ...base, wave_exhausted_at: "2026-10-21T10:00:00Z" }, now)).toBe(false);
  });

  it("épuisement seulement quand plus personne ne reste et qu'aucun envoi n'attend", () => {
    expect(waveExhaustedAfterRun(0, 0)).toBe(true);
    expect(waveExhaustedAfterRun(0, 2)).toBe(false);
    expect(waveExhaustedAfterRun(3, 0)).toBe(false);
    expect(waveExhaustedAfterRun(null, 0)).toBe(false);
  });
});

describe("message d'épuisement au demandeur", () => {
  it("texte affirmatif exact, sans tiret", () => {
    const m = waveExhaustedMessage(9);
    expect(m).toBe("Toutes les personnes disponibles à moins de 30 km ont reçu votre besoin (9). Partagez-le autour de vous :");
    expect(m).not.toMatch(NEG);
    expect(m).not.toMatch(/[—–]/);
    expect(m).not.toMatch(/voisin|mission|annonce|candidature|preneur/i);
  });

  it("notify-mission-wave pose le marqueur une fois et envoie la variante du gabarit existant", () => {
    const src = read("supabase/functions/notify-mission-wave/index.ts");
    expect(src).toContain('rpc("mark_mission_wave_exhausted"');
    expect(src).toContain("idempotencyKey: `mission-wave-exhausted-${mission.id}`");
    expect(src).toContain('templateName: "mission-wave-status"');
    expect(src).toContain("exhaustedCount: count");
    expect(src).toContain("waveExhaustedAfterRun(remaining, deferred)");
    expect(src).toContain("wave_exhausted_at: (m.wave_exhausted_at as string | null) ?? null");
  });

  it("mission-wave-status : variante exhaustedCount avec le lien du besoin, sans nouveau gabarit", () => {
    const tpl = read("supabase/functions/_shared/transactional-email-templates/mission-wave-status.tsx");
    expect(tpl).toContain("exhaustedCount?: number");
    expect(tpl).toContain("{exhausted && pageUrl && (");
    expect(tpl).not.toMatch(/[—–]/);
    const registry = read("supabase/functions/_shared/transactional-email-templates/registry.ts");
    expect(registry).not.toMatch(/wave-exhausted/);
  });
});

describe("mission-help-needed", () => {
  const tpl = read("supabase/functions/_shared/transactional-email-templates/mission-help-needed.tsx");
  it("plus de ligne « Personne de plus proche » ni de lien de rayon, la distance reste dans l'accroche", () => {
    expect(tpl).not.toContain("Personne de plus proche pour le moment");
    expect(tpl).not.toContain("section=alerts");
    expect(tpl).toContain("<Text style={text}>{headline}</Text>");
  });
});

describe("migration 0098", () => {
  const sql = read("drizzle/migrations/0098_e20_vague_proche.sql");
  it("plafond de 30 km dans l'audience, le rayon de l'aidant réduit seulement", () => {
    expect(sql).toContain("AND d.dist <= least(coalesce(p_floor, 30), 30)::double precision");
    expect(sql).toContain("AND d.dist <= public.mutual_aid_radius_km(p.id)::double precision");
    expect(sql).not.toMatch(/array\[30, 50, 100/);
  });
  it("10 au plus par vague, plus proches d'abord", () => {
    expect(sql).toContain("v_size integer := least(greatest(coalesce(p_size, 10), 0), 10);");
    expect(sql).toContain("ORDER BY a.distance_km ASC, a.helper_id ASC");
  });
  it("fonctions du moteur réservées à service_role", () => {
    expect(sql).not.toMatch(/GRANT[^;]*(enqueue_mission_wave|mission_wave_audience_floor|mark_mission_wave_exhausted)[^;]*TO[^;]*\b(anon|authenticated|PUBLIC)\b/i);
  });
  it("entrée de journal", () => {
    expect(read("drizzle/migrations/meta/_journal.json")).toContain('"tag": "0098_e20_vague_proche"');
  });
});
