/**
 * Lot 1, parcours d'arrivée v2 : logique pure (drapeau, C3, P1, P2, P3, P4).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolvePostAuthTarget, OWNER_SIGNUP_TUNNEL_TARGET } from "@/lib/postAuthTarget";
import {
  ARRIVAL_PRESENCE_OPTIONS, alsoNextSteps, arrivalCreateUrl, canSkipP1, isArrivalV2Account, mailboxFor,
  resolveProximity, upcomingPeriods, welcomeUsesOrder,
} from "@/lib/arrival";
import { PRESENCE_EXPECTED_OPTIONS } from "@/lib/profileMatchingOptions";
import { buildP1Writes, p1Valid } from "@/pages/arrival/ArriveeVous";
import { initialLanguages } from "@/pages/arrival/ArriveeAffinites";
import { isFreshAccount } from "@/pages/AuthConfirm";

describe("drapeau arrival_v2", () => {
  it("éteint : destination propriétaire inchangée", () => {
    expect(resolvePostAuthTarget("owner", null)).toBe(OWNER_SIGNUP_TUNNEL_TARGET);
    expect(resolvePostAuthTarget("owner", null, false)).toBe("/sits/create?source=signup");
    expect(resolvePostAuthTarget("sitter", null)).toBe("/dashboard");
  });
  it("allumé : passage par /bienvenue avec la destination prévue", () => {
    expect(resolvePostAuthTarget("owner", null, true)).toBe(`/bienvenue?next=${encodeURIComponent("/sits/create?source=signup")}`);
    expect(resolvePostAuthTarget("sitter", "/annonces/x", true)).toBe(`/bienvenue?next=${encodeURIComponent("/annonces/x")}`);
  });
  it("C4 et suite : comptes créés après applies_since seulement", () => {
    const flag = { enabled: true, appliesSince: "2026-10-10T00:00:00Z" };
    expect(isArrivalV2Account(flag, "2026-10-11T00:00:00Z")).toBe(true);
    expect(isArrivalV2Account(flag, "2026-10-01T00:00:00Z")).toBe(false);
    expect(isArrivalV2Account({ enabled: true, appliesSince: null }, "2026-10-11T00:00:00Z")).toBe(false);
    expect(isArrivalV2Account({ enabled: false, appliesSince: flag.appliesSince }, "2026-10-11T00:00:00Z")).toBe(false);
  });
});

describe("C3, bouton messagerie", () => {
  it.each([
    ["a@gmail.com", "Ouvrir Gmail", "https://mail.google.com"],
    ["a@googlemail.com", "Ouvrir Gmail", "https://mail.google.com"],
    ["a@hotmail.fr", "Ouvrir Outlook", "https://outlook.live.com/mail"],
    ["a@outlook.com", "Ouvrir Outlook", "https://outlook.live.com/mail"],
    ["a@live.fr", "Ouvrir Outlook", "https://outlook.live.com/mail"],
    ["a@msn.com", "Ouvrir Outlook", "https://outlook.live.com/mail"],
    ["a@yahoo.fr", "Ouvrir Yahoo Mail", "https://mail.yahoo.com"],
    ["a@orange.fr", "Ouvrir ma messagerie Orange", "https://mail.orange.fr"],
    ["a@wanadoo.fr", "Ouvrir ma messagerie Orange", "https://mail.orange.fr"],
    ["a@free.fr", "Ouvrir ma messagerie Free", "https://zimbra.free.fr"],
    ["a@sfr.fr", "Ouvrir ma messagerie SFR", "https://webmail.sfr.fr"],
    ["a@neuf.fr", "Ouvrir ma messagerie SFR", "https://webmail.sfr.fr"],
    ["a@laposte.net", "Ouvrir ma messagerie La Poste", "https://www.laposte.net/accueil"],
    ["a@icloud.com", "Ouvrir iCloud Mail", "https://www.icloud.com/mail"],
    ["a@me.com", "Ouvrir iCloud Mail", "https://www.icloud.com/mail"],
  ])("%s", (email, label, url) => {
    expect(mailboxFor(email)).toMatchObject({ label, url });
  });
  it("autre domaine : aucun bouton", () => expect(mailboxFor("a@exemple.org")).toBeNull());
});

describe("P1, logement sans valeurs par défaut", () => {
  it("aucune pièce, chambre ni environnement pré-rempli", () => {
    const w = buildP1Writes({ userId: "u", firstName: "Marie", postalCode: "69001", city: "Lyon", country: "FR", type: "apartment", hasProperty: false });
    expect(w.property).toEqual({ user_id: "u", type: "apartment", environment: null, rooms_count: null, bedrooms_count: null });
    expect(w.profile).toMatchObject({ first_name: "Marie", postal_code: "69001", city: "Lyon", country: "FR", departement_code: "69", onboarding_minimal_completed: true });
  });
  it("logement existant : aucun nouveau logement", () => {
    expect(buildP1Writes({ userId: "u", firstName: "M", postalCode: "", city: "", country: "FR", type: "", hasProperty: true }).property).toBeNull();
  });
  it("le type est requis", () => {
    expect(p1Valid({ firstName: "Marie", postalCode: "69001", city: "Lyon", country: "FR", type: "" })).toBe(false);
    expect(p1Valid({ firstName: "Marie", postalCode: "69001", city: "Lyon", country: "FR", type: "house" })).toBe(true);
  });
  it("P1 sautée si prénom, commune et logement existent", () => {
    expect(canSkipP1({ firstName: "Marie", city: "Lyon", hasProperty: true })).toBe(true);
    expect(canSkipP1({ firstName: "Marie", city: "Lyon", hasProperty: false })).toBe(false);
  });
});

describe("P2, périodes et proximité", () => {
  it("périodes passées masquées, trois prochaines", () => {
    expect(upcomingPeriods("2026-10-07")).toEqual(["noel", "hiver", "printemps"]);
    expect(upcomingPeriods("2027-01-10")).toEqual(["hiver", "printemps", "ete"]);
  });
  it("mêmes valeurs et dates que finishUrl, plus source=signup", () => {
    expect(arrivalCreateUrl("noel")).toBe("/sits/create?express=1&periode=noel&debut=2026-12-19&fin=2027-01-03&source=signup");
    expect(arrivalCreateUrl("plus_tard")).toBe("/sits/create?express=1&periode=plus_tard&source=signup");
    expect(arrivalCreateUrl(null)).toBe("/sits/create?express=1&source=signup");
  });
  const counter = (m: Record<number, number>) => {
    const calls: number[] = [];
    return { calls, fn: async (r: number) => { calls.push(r); return m[r]; } };
  };
  it("20 km suffit dès 5 gardiens", async () => {
    const c = counter({ 20: 7, 30: 9, 50: 12 });
    expect(await resolveProximity(c.fn)).toEqual({ count: 7, radius: 20 });
    expect(c.calls).toEqual([20]);
  });
  it("élargi à 30 puis 50 km", async () => {
    expect(await resolveProximity(counter({ 20: 2, 30: 6, 50: 9 }).fn)).toEqual({ count: 6, radius: 30 });
    expect(await resolveProximity(counter({ 20: 1, 30: 2, 50: 3 }).fn)).toEqual({ count: 3, radius: 50 });
  });
  it("masqué à 0 à 50 km", async () => {
    expect(await resolveProximity(counter({ 20: 0, 30: 0, 50: 0 }).fn)).toBeNull();
  });
});

describe("P3, P4, C4", () => {
  it("présence : libellés de maquette sur valeurs existantes", () => {
    expect(ARRIVAL_PRESENCE_OPTIONS.map((o) => o.value)).toEqual(PRESENCE_EXPECTED_OPTIONS);
  });
  it("langues : Français seulement si vide", () => {
    expect(initialLanguages(["Français", "Anglais"])).toEqual(["Français", "Anglais"]);
    expect(initialLanguages([])).toEqual(["Français"]);
  });
  it("P4 : garder d'abord, coup de main ensuite", () => {
    expect(alsoNextSteps({ garder: true, coupDeMain: false, sitPath: "/sits/1" })).toBe(`/onboarding/affinity?redirect=${encodeURIComponent("/sits/1")}`);
    expect(alsoNextSteps({ garder: false, coupDeMain: true, sitPath: "/sits/1" })).toBe("/profile?section=competences");
    expect(alsoNextSteps({ garder: true, coupDeMain: true, sitPath: "/sits/1" })).toContain(encodeURIComponent("/profile?section=competences"));
  });
  it("C4 : entraide d'abord pour l'intention entraide", () => {
    expect(welcomeUsesOrder(false)[0]).toBe("gardes");
    expect(welcomeUsesOrder(true)[0]).toBe("entraide");
  });
  it("signup_email_confirmed : comptes de moins de 24 h", () => {
    const now = Date.parse("2026-10-07T12:00:00Z");
    expect(isFreshAccount("2026-10-07T01:00:00Z", now)).toBe(true);
    expect(isFreshAccount("2026-10-05T01:00:00Z", now)).toBe(false);
  });
  it("textes arrival.* sans tiret cadratin ni demi-cadratin", () => {
    const raw = readFileSync(resolve(__dirname, "../../i18n/locales/fr/arrival.json"), "utf8");
    expect(raw).not.toMatch(/[\u2013\u2014]/);
  });
});
