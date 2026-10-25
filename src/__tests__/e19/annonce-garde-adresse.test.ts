/**
 * Lot E19 (correction du 25/10/2026) : la détection d'adresse postale vaut
 * pour le seul mot laissé après un coup de main. Une annonce de garde (type
 * « sit ») qui contient une adresse passe comme avant ; téléphone et email
 * restent retenus comme avant.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { heuristics } from "../../../supabase/functions/_shared/moderation-heuristics.ts";
import { AUTOMATED_RULE_STATEMENTS } from "../../../supabase/functions/_shared/moderation-rules.ts";
import { detectContactDetails } from "@/lib/contactDetails";

const SIT_DESCRIPTION =
  "Notre maison est au 12 rue des Lilas, avec un grand jardin. Nos deux chats, Gribouille et Pistache, " +
  "attendent un gardien attentif. Le 14, place de la mairie, il y a un marché le samedi.";

describe("annonce de garde avec une adresse", () => {
  it("passe les heuristiques de moderate-content comme avant", () => {
    expect(heuristics(SIT_DESCRIPTION, "sit")).toEqual({ reasons: [], block: false, rule: null });
  });

  it("passe le contrôle du formulaire comme avant", () => {
    expect(detectContactDetails(SIT_DESCRIPTION)).toEqual([]);
  });

  it("reste retenue pour un téléphone ou un email, comme avant", () => {
    expect(heuristics(`${SIT_DESCRIPTION} Appelez le 06 12 34 56 78.`, "sit")).toMatchObject({ block: true, rule: "contact_details" });
    expect(heuristics(`${SIT_DESCRIPTION} Écrivez à odile@exemple.fr.`, "sit")).toMatchObject({ block: true, rule: "contact_details" });
  });

  it("le contenu de test reste retenu", () => {
    expect(heuristics("Annonce de test interne", "sit")).toMatchObject({ block: true, rule: "test_content" });
  });
});

describe("mot laissé après un coup de main", () => {
  it("l'option explicite retient l'adresse postale", () => {
    expect(heuristics("Passez au 12 rue des Lilas", "sit", { checkPostalAddress: true }))
      .toEqual({ reasons: ["Adresse postale détectée"], block: true, rule: "contact_details" });
  });

  it("l'option reste sans effet hors du type « sit »", () => {
    expect(heuristics("Passez au 12 rue des Lilas", "message", { checkPostalAddress: true }).block).toBe(false);
  });
});

describe("textes du type « sit » inchangés", () => {
  it("consigne du modèle et règle citée restent celles d'avant", () => {
    const fn = readFileSync("supabase/functions/moderate-content/index.ts", "utf8");
    expect(fn).toContain("coordonnées personnelles en clair (téléphone, email), ou contenu");
    expect(AUTOMATED_RULE_STATEMENTS.contact_details).toContain("(téléphone, email)");
  });
});
