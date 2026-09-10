/**
 * Alma parle comme Alma : identité de chienne de la maison, registre de
 * petite conversation, humeur transmise à la conversation, et animations
 * qui utilisent les sept états déjà écrits.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { detectRegister } from "../../supabase/functions/_shared/alma-system-prompt";
import { ALMA_MOOD_KEYS, MOOD_AVATAR } from "@/lib/alma/mood";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const promptSource = read("supabase/functions/_shared/alma-system-prompt.ts");
const edgeSource = read("supabase/functions/alma-chat/index.ts");
const storeSource = read("src/lib/alma/conversation-store.ts");
const avatarSource = read("src/components/ai/alma/AlmaAvatarAnimated.tsx");

describe("identité d'Alma dans le prompt", () => {
  it("porte une section IDENTITÉ de chienne de la maison", () => {
    expect(promptSource).toContain("IDENTITÉ");
    expect(promptSource).toContain("bichon frisé");
    expect(promptSource).toContain("Tu as une humeur du jour");
  });

  it("répond oui quand on lui demande si elle est une intelligence artificielle", () => {
    expect(promptSource).toContain("tu réponds oui, tu es une assistante");
    expect(promptSource).not.toContain("SI ON TE DEMANDE SI TU ES UNE IA");
  });

  it("ne contient aucune phrase où Alma nierait avoir une humeur", () => {
    expect(promptSource).not.toMatch(/n['’]ai pas d['’]humeur/i);
    expect(promptSource).not.toMatch(/n['’]ai pas d['’][ée]tat d['’][âa]me/i);
  });

  it("ajoute la petite conversation en quatrième registre", () => {
    expect(promptSource).toContain("QUATRE REGISTRES");
    expect(promptSource).toContain("La petite conversation");
  });

  it("verrouille la variation des ouvertures", () => {
    expect(promptSource).toContain("les mêmes trois mots que la précédente");
    expect(promptSource).toContain('"Je suis Alma"');
  });

  it("garde le vouvoiement et refuse les tirets cadratins", () => {
    expect(promptSource).toContain("Vouvoiement absolu");
    expect(promptSource.includes("\u2014")).toBe(false);
    expect(promptSource.includes("\u2013")).toBe(false);
  });
});

describe("detectRegister", () => {
  it("retourne perso sur une question de petite conversation", () => {
    for (const q of [
      "Comment ça va ?",
      "Tu es de quelle humeur aujourd'hui ?",
      "Tu fais quoi ?",
      "Es-tu une IA ?",
      "Tu es une vraie chienne ?",
      "Tu dors parfois ?",
    ]) {
      expect(detectRegister(q)).toBe("perso");
    }
  });

  it("laisse les autres registres intacts", () => {
    expect(detectRegister("Mon chien convulse, urgence")).toBe("sensible");
    expect(detectRegister("Où en est ma candidature ?")).toBe("dossier");
    expect(detectRegister("Comment fonctionne le guide de la maison ?")).toBe("reassurance");
  });
});

describe("humeur transmise à la conversation", () => {
  it("le store expose un setter et envoie mood et mood_line", () => {
    expect(storeSource).toContain("setAlmaMoodContext");
    expect(storeSource).toContain("mood_line");
  });

  it("la fonction alma-chat pose un message système d'humeur et monte la température", () => {
    expect(edgeSource).toContain("Votre humeur en ce moment");
    expect(edgeSource).toContain("temperature: 0.85");
  });
});

describe("avatar, humeurs et vie non linéaire", () => {
  it("chaque humeur pointe vers une animation distincte", () => {
    expect(ALMA_MOOD_KEYS).toHaveLength(6);
    expect(MOOD_AVATAR.petillante).toBe("playful");
    expect(MOOD_AVATAR.attentive).toBe("attentive");
    expect(MOOD_AVATAR.chiffonnee).toBe("thinking");
    expect(MOOD_AVATAR.reveuse).toBe("gentle");
    expect(MOOD_AVATAR.pelotonnee).toBe("idle");
    expect(MOOD_AVATAR.endormie).toBe("sleepy");
    expect(new Set(Object.values(MOOD_AVATAR)).size).toBe(6);
  });

  it("porte les deux animations ponctuelles, sous prefers-reduced-motion", () => {
    expect(avatarSource).toContain("@keyframes alma-pirouette");
    expect(avatarSource).toContain("@keyframes alma-pounce");
    expect(avatarSource).toContain("prefers-reduced-motion: reduce");
    const burstRules = avatarSource.slice(avatarSource.indexOf("data-burst=\"pirouette\""));
    expect(avatarSource.slice(0, avatarSource.indexOf("data-burst=\"pirouette\""))).toContain(
      "prefers-reduced-motion: no-preference",
    );
    expect(burstRules.length).toBeGreaterThan(0);
  });

  it("programme un intervalle aléatoire entre 25 et 50 secondes", () => {
    expect(avatarSource).toContain("25000 + Math.random() * 25000");
  });
});
