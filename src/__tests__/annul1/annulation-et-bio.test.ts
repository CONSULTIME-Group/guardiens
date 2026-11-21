import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Verrou ANNUL1 du 21/11/2026.
// 1. Une garde confirmée s'annule : les déclencheurs qui écrivent les
//    compteurs d'annulation posent le drapeau interne, sinon le garde-fou des
//    champs sensibles du profil défait toute l'annulation (message de Sophie).
// 2. L'étape « Écrire votre bio » du tableau de bord mène au champ Bio, dans
//    l'onglet Identité (message de Marc : 64 membres renvoyés vers Profil
//    gardien en 30 jours, onglet sans champ Bio).
const read = (path: string) => readFileSync(path, "utf8");
const sql = read("drizzle/migrations/0179_annul1_annulation_garde.sql");

const fnBody = (name: string) => {
  const start = sql.indexOf(`FUNCTION public.${name}(`);
  expect(start).toBeGreaterThan(-1);
  const end = sql.indexOf("$function$;", start);
  return sql.slice(start, end);
};

describe("ANNUL1, annulation d'une garde", () => {
  it("notify_sit_cancelled encadre l'écriture du compteur par le drapeau interne", () => {
    const body = fnBody("notify_sit_cancelled");
    const on = body.indexOf("set_config('app.allow_internal_profile_update', 'on', true)");
    const write = body.indexOf("UPDATE public.profiles SET cancellation_count");
    const off = body.indexOf("set_config('app.allow_internal_profile_update', 'off', true)");
    expect(on).toBeGreaterThan(-1);
    expect(write).toBeGreaterThan(on);
    expect(off).toBeGreaterThan(write);
    expect(body).toContain("SECURITY DEFINER");
  });

  it("recalculate_cancellations lit l'auteur par uuid et pose le drapeau", () => {
    const body = fnBody("recalculate_cancellations");
    expect(body).toContain("set_config('app.allow_internal_profile_update', 'on', true)");
    expect(body).not.toMatch(/cancelled_by\s*=\s*'(gardien|proprio)'/);
    expect(body).toContain("cancelled_by = p_user_id");
    expect(body).toContain("SECURITY DEFINER");
  });

  it("la migration porte son repère et son contrat de production", () => {
    expect(sql).toContain("annul1_annulation_garde");
    const contracts = JSON.parse(read("scripts/db/production-contracts.json"));
    const c = contracts.contracts.find((x: { migration: string }) => x.migration === "0179_annul1_annulation_garde.sql");
    expect(c?.checks?.length).toBeGreaterThanOrEqual(2);
  });
});

describe("ANNUL1, étape bio du tableau de bord", () => {
  it("le lien mène à l'onglet Identité, champ Bio", () => {
    const card = read("src/components/dashboard/sitter/SitterOpeningCard.tsx");
    expect(card).toContain('to: "/profile?section=identite&focus=bio"');
    const bioStep = card.slice(card.indexOf('key: "bio"'), card.indexOf('key: "postal"'));
    expect(bioStep).not.toContain("section=profil");
  });

  it("la page profil gardien sait ouvrir et viser le champ Bio", () => {
    const page = read("src/pages/SitterProfile.tsx");
    const branch = page.slice(page.indexOf('focus === "bio"'), page.indexOf('focus === "interests"'));
    expect(branch).toContain('setActiveSection("identity")');
    expect(branch).toContain('getElementById("bio")');
    const identity = read("src/components/profile/StepIdentity.tsx");
    expect(identity).toContain('id="bio"');
  });
});
