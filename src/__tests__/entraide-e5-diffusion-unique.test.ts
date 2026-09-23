/**
 * Lot E5 : une seule diffusion par besoin, vraie promesse, gardes redirigées.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  WAVE_MAX_COUNT,
  shouldSendNextWave,
  WAVE_RELAUNCH_MESSAGE,
  WAVE_EMPTY_MESSAGE,
} from "../../supabase/functions/_shared/mission-wave";
import { isParisQuietHour } from "../../supabase/functions/_shared/paris-hour";
import { looksLikeMultiDaySit } from "@/lib/missionSitRedirect";
import { waveAudienceMessage } from "@/lib/missionAudienceMessage";
import { HELPS_WITH_ANCHOR } from "@/components/dashboard/HelpsWithReminder";

const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("plafond de trois vagues", () => {
  const base = { status: "open", response_count: 0, last_wave_at: "2026-09-01T10:00:00Z" };
  const now = new Date("2026-09-21T10:00:00Z");

  it("laisse partir les trois premières vagues", () => {
    expect(WAVE_MAX_COUNT).toBe(3);
    for (const wave_count of [0, 1, 2]) {
      expect(shouldSendNextWave({ ...base, wave_count }, now)).toBe(true);
    }
  });

  it("arrête la diffusion après la troisième vague", () => {
    expect(shouldSendNextWave({ ...base, wave_count: 3 }, now)).toBe(false);
    expect(shouldSendNextWave({ ...base, wave_count: 7 }, now)).toBe(false);
  });
});

describe("heures calmes de Paris", () => {
  it("diffère un besoin créé à 23 h", () => {
    expect(isParisQuietHour(new Date("2026-09-22T21:10:00Z"))).toBe(true);
  });

  it("laisse partir le passage de 8 h", () => {
    expect(isParisQuietHour(new Date("2026-09-22T06:25:00Z"))).toBe(false);
  });
});

describe("diffusion unique des besoins", () => {
  it("les digests de proximité portent les offres seulement", () => {
    expect(read("supabase/functions/send-nearby-daily-digest/index.ts")).toContain(
      "'mission_type', 'offre'",
    );
    expect(read("supabase/functions/send-weekly-nearby-digest/index.ts")).toContain(
      '"mission_type", "offre"',
    );
  });

  it("le digest de file écarte les besoins", () => {
    expect(read("supabase/functions/send-mission-daily-digest/index.ts")).toContain(
      "besoin_handled_by_wave",
    );
  });
});

describe("promesse d'audience", () => {
  it("annonce le nombre réel sous dix personnes", () => {
    expect(waveAudienceMessage(4)).toBe(
      "Les 4 personnes disponibles autour de chez vous seront prévenues.",
    );
    expect(waveAudienceMessage(1)).toContain("la plus proche");
  });

  it("plafonne la promesse à dix personnes", () => {
    expect(waveAudienceMessage(10)).toContain("10 personnes disponibles les plus proches");
    expect(waveAudienceMessage(180)).toBe(waveAudienceMessage(10));
  });

  it("reste affirmative quand personne n'est encore disponible", () => {
    expect(waveAudienceMessage(0)).toContain("reste visible");
  });

  it("le formulaire interroge la fonction du moteur de vagues", () => {
    expect(read("src/pages/CreateSmallMission.tsx")).toContain("mission_wave_audience_preview");
  });
});

describe("gardes de plusieurs jours redirigées", () => {
  const positifs: Array<[string, string, string | null, string | null]> = [
    ["Garder mon chien à Noël", "Du 23 au 28 décembre", null, null],
    ["Nourrir le chat pendant mon absence", "Je pars loin", null, null],
    ["Besoin d'une garde", "Pour mes deux chats", null, null],
    ["Quelqu'un pendant les vacances", "Pour la maison et le jardin", null, null],
    ["Présence à la maison", "Passage quotidien", "2026-12-20", "2026-12-28"],
  ];
  const negatifs: Array<[string, string, string | null, string | null]> = [
    ["Nourrir les poules samedi", "Une visite le matin", "2026-10-03", "2026-10-03"],
    ["Ramasser les pommes du jardin", "Deux heures suffisent", null, null],
    ["Monter une étagère", "Un coup de main dimanche", "2026-10-04", "2026-10-05"],
    ["Promener mon chien mardi", "Une heure au parc", null, null],
    ["Arroser les plantes", "Deux passages", "2026-10-01", "2026-10-02"],
  ];

  it("reconnaît cinq gardes de plusieurs jours", () => {
    for (const [t, d, s, e] of positifs) {
      expect(looksLikeMultiDaySit(t, d, s, e), t).toBe(true);
    }
  });

  it("laisse passer cinq coups de main courts", () => {
    for (const [t, d, s, e] of negatifs) {
      expect(looksLikeMultiDaySit(t, d, s, e), t).toBe(false);
    }
  });
});

describe("textes envoyés au demandeur", () => {
  it("relance affirmative, sans tiret cadratin", () => {
    expect(WAVE_RELAUNCH_MESSAGE).toBe("On prévient dix autres personnes du coin.");
    expect(WAVE_RELAUNCH_MESSAGE).not.toMatch(/[—–]/);
  });

  it("message d'attente affirmatif", () => {
    expect(WAVE_EMPTY_MESSAGE).toBe(
      "Votre besoin est visible sur la page Entraide. Dès qu'une personne disponible rejoint votre secteur, elle le découvre et peut vous répondre.",
    );
    expect(WAVE_EMPTY_MESSAGE).not.toMatch(/[—–]/);
  });
});

describe("ancre du tableau de bord", () => {
  it("l'email pointe sur l'ancre du bloc", () => {
    expect(HELPS_WITH_ANCHOR).toBe("ce-que-je-propose");
    expect(
      read("supabase/functions/_shared/transactional-email-templates/entraide-ligne-helps-with.tsx"),
    ).toContain("#ce-que-je-propose");
  });

  it("la connexion conserve le fragment demandé", () => {
    expect(read("src/App.tsx")).toContain("${location.pathname}${location.search}${location.hash}");
  });
});
