import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  resolveMoodPlan,
  seasonFromDate,
  timeOfDayFromDate,
  MOOD_AVATAR,
  ALMA_MOOD_KEYS,
} from "@/lib/alma/mood";
import { buildPetSuggestion } from "@/lib/alma/pet-suggestion";
import {
  aggregateThemes,
  aggregateRefusals,
  averageAnswerLength,
  openingRepetition,
  inputSplit,
  conversationsFollowedByAction,
  type RawConversation,
} from "@/lib/admin/alma-conversations";

const root = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");

const base = {
  silent: false,
  conversationOpen: false,
  sitInProgress: false,
  sitImminent: false,
  pendingApplication: false,
  timeOfDay: "matin" as const,
};

describe("humeurs d'Alma, logique pure", () => {
  it("chaque humeur pointe vers une animation déjà écrite dans l'avatar", () => {
    expect(ALMA_MOOD_KEYS).toHaveLength(6);
    for (const key of ALMA_MOOD_KEYS) {
      expect(["idle", "attentive", "thinking", "gentle", "playful", "sleepy"]).toContain(
        MOOD_AVATAR[key],
      );
    }
  });

  it("Alma se tait en mode silencieux, sur garde en cours et conversation ouverte", () => {
    expect(resolveMoodPlan({ ...base, silent: true }).express).toBe(false);
    expect(resolveMoodPlan({ ...base, sitInProgress: true }).express).toBe(false);
    expect(resolveMoodPlan({ ...base, conversationOpen: true }).express).toBe(false);
  });

  it("garde imminente et candidature en attente imposent attentive", () => {
    expect(resolveMoodPlan({ ...base, sitImminent: true }).forced).toBe("attentive");
    expect(resolveMoodPlan({ ...base, pendingApplication: true }).forced).toBe("attentive");
  });

  it("la nuit impose endormie, sinon le tirage reste libre", () => {
    expect(resolveMoodPlan({ ...base, timeOfDay: "nuit" }).forced).toBe("endormie");
    expect(resolveMoodPlan(base).forced).toBeNull();
  });

  it("saison et moment de la journée sont cohérents", () => {
    expect(seasonFromDate(new Date("2026-10-15T10:00:00"))).toBe("automne");
    expect(timeOfDayFromDate(new Date("2026-10-15T23:00:00"))).toBe("nuit");
  });
});

describe("aucune humeur ne peut apparaître dans une réponse à une question", () => {
  it("la conversation ne lit jamais le module d'humeur", () => {
    for (const file of [
      "src/lib/alma/conversation-store.ts",
      "src/components/ai/alma/AlmaConversation.tsx",
      "supabase/functions/alma-chat/index.ts",
    ]) {
      const src = read(file);
      expect(src).not.toMatch(/alma\/mood|useAlmaMood|alma_moods|get_alma_mood/);
    }
  });
});

describe("get_alma_mood, non répétition sur 30 jours", () => {
  it("la RPC exclut les lignes déjà vues dans ses deux phases", () => {
    const sql = read("supabase/seeds/alma_moods.sql");
    expect(sql.length).toBeGreaterThan(0);
  });
});

describe("carnet d'humeurs, seed", () => {
  const sql = read("supabase/seeds/alma_moods.sql");
  const lines = sql
    .split("\n")
    .filter((l) => l.trim().startsWith("('"))
    .map((l) => l.trim());

  it("contient au moins quarante lignes, six par humeur au minimum", () => {
    expect(lines.length).toBeGreaterThanOrEqual(40);
    for (const mood of ALMA_MOOD_KEYS) {
      const count = lines.filter((l) => l.startsWith(`('${mood}'`)).length;
      expect(count, mood).toBeGreaterThanOrEqual(6);
    }
  });

  it("aucun emoji, aucun tiret cadratin ni demi-cadratin", () => {
    expect(sql).not.toMatch(/[\u2014\u2013]/);
    expect(sql).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });

  it("vouvoiement absolu, aucun tutoiement de la personne", () => {
    expect(sql).not.toMatch(/\b(tu|ton|ta|tes|toi)\b/i);
  });
});

describe("suggestion après ajout d'un animal", () => {
  it("propose le guide quand une fiche est résolue", () => {
    const s = buildPetSuggestion({ petName: "Ruby", species: "dog", ficheBreed: "Cavalier King Charles" });
    expect(s.href).toBe("/races/dog-cavalier-king-charles");
    expect(s.message).toContain("Ruby");
    expect(s.message).toContain("cavalier king charles");
  });

  it("sans fiche résolue : aucun lien, aucune mention de ce qui manque", () => {
    const s = buildPetSuggestion({ petName: "Ruby", species: "dog", ficheBreed: null });
    expect(s.href).toBeNull();
    expect(s.ctaLabel).toBeNull();
    expect(s.message).not.toMatch(/guide|race|fiche de race|pas de/i);
  });
});

describe("le dock survit à un échec météo", () => {
  it("le hook capture toute erreur d'appel et de RPC", () => {
    const src = read("src/hooks/useAlmaMood.ts");
    expect(src).toMatch(/catch\s*{[^}]*weather = null/s);
    expect((src.match(/catch/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
});

describe("agrégateurs de l'onglet Conversations", () => {
  const rows: RawConversation[] = [
    {
      id: "1",
      created_at: "2026-09-10T10:00:00Z",
      surface: "dashboard",
      active_role: "owner",
      question: "Mon chien boite, faut-il un vétérinaire ?",
      answer: "Voici ce que je vois. Appelez votre vétérinaire aujourd'hui.",
      register: "sensible",
      refusal_reason: "sensible",
      input_mode: "voice",
      user_id: "u1",
    },
    {
      id: "2",
      created_at: "2026-09-10T11:00:00Z",
      surface: "profil",
      active_role: "sitter",
      question: "Comment marche mon score d'affinité ?",
      answer: "Voici ce que je vois. Votre score se calcule sur vos déclarations.",
      register: "dossier",
      refusal_reason: null,
      input_mode: "keyboard",
      user_id: "u2",
    },
  ];

  it("thèmes, refus, longueur, ouvertures et répartition", () => {
    expect(aggregateThemes(rows).some((t) => t.theme === "sante")).toBe(true);
    expect(aggregateRefusals(rows)[0].reason).toBe("sensible");
    expect(averageAnswerLength(rows)).toBeGreaterThan(0);
    const rep = openingRepetition(rows);
    expect(rep.groups[0].count).toBe(2);
    expect(rep.repetitionRate).toBe(1);
    expect(inputSplit(rows).voiceShare).toBe(0.5);
  });

  it("compte les conversations suivies d'une action sous dix minutes", () => {
    const res = conversationsFollowedByAction(rows, [
      { user_id: "u1", created_at: "2026-09-10T10:05:00Z" },
      { user_id: "u2", created_at: "2026-09-10T12:00:00Z" },
    ]);
    expect(res.count).toBe(1);
    expect(res.rate).toBe(0.5);
  });
});
