/**
 * Lot SRC1 (12/11/2026) : source d'arrivée enregistrée à l'inscription.
 * Capture unique, aucun stockage sans accord, type d'identifiant de clic
 * sans sa valeur, canal identique côté site et côté base.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const consent = vi.hoisted(() => ({ value: null as "granted" | "denied" | null }));
vi.mock("@/lib/cookieConsent", () => ({ getStoredConsent: () => consent.value }));
const rpc = vi.hoisted(() => vi.fn(async (..._args: unknown[]) => ({ data: true, error: null })));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));

import {
  buildSignupSource, captureSignupSource, getSignupSource, deriveSignupChannel,
  encodeSignupSource, decodeSignupSource, maskClickIds, withSignupSrcParam,
  shouldRecordSignupSource, recordPendingSignupSource, __resetSignupSourceForTests,
  SIGNUP_SOURCE_SESSION_KEY, SIGNUP_SRC_MAX_LENGTH, type SignupSource,
} from "@/lib/signupSource";
import cases from "./channel-cases.json";
import { normalizeSignupSourceRows, signupSourceRange, totalSignupSources, signupChannelLabel } from "@/lib/admin/signupSources";

const read = (f: string) => readFileSync(resolve(process.cwd(), f), "utf8");
const migration = read("drizzle/migrations/0142_src1_source_inscription.sql");
const ARRIVAL = { search: "?utm_source=Test&utm_medium=cpc&utm_campaign=recette&gclid=ABC123xyz", pathname: "/", referrer: "https://www.google.fr/search?q=house+sitting" };

beforeEach(() => {
  consent.value = null;
  rpc.mockClear();
  __resetSignupSourceForTests();
  sessionStorage.clear();
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});

describe("capture", () => {
  it("retient utm, type de clic, domaine, chemin, jamais la valeur du clic", () => {
    const src = buildSignupSource({ ...ARRIVAL, now: new Date("2026-11-12T08:00:00Z") });
    expect(src).toEqual({ us: "test", um: "cpc", uc: "recette", ck: "gclid", rd: "google.fr", lp: "/", ts: "2026-11-12T08:00:00.000Z" });
    expect(JSON.stringify(src)).not.toContain("ABC123xyz");
  });
  it("le site lui-même n'est pas une provenance", () => {
    expect(buildSignupSource({ search: "", pathname: "/inscription", referrer: "https://guardiens.fr/annonces" }).rd).toBeUndefined();
    expect(buildSignupSource({ search: "", pathname: "/", referrer: "https://guardiens.lovable.app/" }).rd).toBeUndefined();
  });
  it("le chemin d'entrée part sans paramètres, le parrainage est un simple drapeau", () => {
    const src = buildSignupSource({ search: "?ref=AB12", pathname: "/inscription", referrer: "" });
    expect(src.lp).toBe("/inscription");
    expect(src.rf).toBe(1);
    expect(JSON.stringify(src)).not.toContain("AB12");
  });
  it("la première source n'est jamais écrasée pendant la visite", () => {
    captureSignupSource(ARRIVAL);
    captureSignupSource({ search: "?utm_source=autre", pathname: "/annonces", referrer: "" });
    expect(getSignupSource()?.us).toBe("test");
    expect(getSignupSource()?.lp).toBe("/");
  });
});

describe("consentement", () => {
  it("sans réponse ou refus : rien n'est écrit sur l'appareil, la source existe quand même", () => {
    captureSignupSource(ARRIVAL);
    expect(sessionStorage.length).toBe(0);
    expect(localStorage.length).toBe(0);
    expect(getSignupSource()?.ck).toBe("gclid");
    consent.value = "denied";
    window.dispatchEvent(new CustomEvent("consent-changed"));
    expect(sessionStorage.length).toBe(0);
    expect(localStorage.length).toBe(0);
  });
  it("accord donné : copie en sessionStorage seulement, sans valeur de clic", () => {
    captureSignupSource(ARRIVAL);
    consent.value = "granted";
    window.dispatchEvent(new CustomEvent("consent-changed"));
    const stored = sessionStorage.getItem(SIGNUP_SOURCE_SESSION_KEY) ?? "";
    expect(stored).toContain('"ck":"gclid"');
    expect(stored).not.toContain("ABC123xyz");
    expect(localStorage.length).toBe(0);
  });
  it("accord retiré : la copie est effacée", () => {
    consent.value = "granted";
    captureSignupSource(ARRIVAL);
    expect(sessionStorage.getItem(SIGNUP_SOURCE_SESSION_KEY)).not.toBeNull();
    consent.value = "denied";
    window.dispatchEvent(new CustomEvent("consent-changed"));
    expect(sessionStorage.getItem(SIGNUP_SOURCE_SESSION_KEY)).toBeNull();
  });
  it("le module n'écrit jamais en localStorage", () => {
    expect(read("src/lib/signupSource.ts")).not.toContain("localStorage.setItem");
  });
});

describe("transport", () => {
  it("JSON compact de 300 caractères au plus, relu à l'identique", () => {
    const long: SignupSource = { us: "a".repeat(80), um: "b".repeat(80), uc: "c".repeat(120), ck: "gclid", rd: "d".repeat(100) + ".fr", lp: "/" + "e".repeat(150), ts: "2026-11-12T08:00:00.000Z" };
    const encoded = encodeSignupSource(long);
    expect(encoded.length).toBeLessThanOrEqual(SIGNUP_SRC_MAX_LENGTH);
    expect(decodeSignupSource(encoded)?.ck).toBe("gclid");
    const short = buildSignupSource({ ...ARRIVAL, now: new Date("2026-11-12T08:00:00Z") });
    expect(decodeSignupSource(encodeSignupSource(short))).toEqual(short);
  });
  it("une valeur forgée est nettoyée ou refusée", () => {
    expect(decodeSignupSource('{"ck":"autre","us":"<script>","lp":"javascript:1","rd":"A B"}')).toEqual({ us: "script" });
    expect(decodeSignupSource("pas du json")).toBeNull();
    expect(decodeSignupSource("x".repeat(301))).toBeNull();
  });
  it("au retour de Google, la source de l'URL prime et l'URL est nettoyée après lecture", async () => {
    captureSignupSource(ARRIVAL);
    const back = withSignupSrcParam("/dashboard?signup_role=owner");
    expect(back.startsWith("/dashboard?signup_role=owner&signup_src=")).toBe(true);
    expect(back).not.toContain("ABC123xyz");
    __resetSignupSourceForTests();
    window.history.replaceState(null, "", back);
    captureSignupSource({ search: window.location.search, pathname: "/dashboard", referrer: "https://accounts.google.com/" });
    expect(getSignupSource()?.ck).toBe("gclid");
    expect(getSignupSource()?.rd).toBe("google.fr");
    await recordPendingSignupSource({ created_at: new Date().toISOString(), app_metadata: { provider: "google" } });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][0]).toBe("record_signup_source");
    expect(window.location.search).toBe("?signup_role=owner");
  });
});

describe("appel au retour : seulement pour un compte Google tout neuf", () => {
  const now = Date.parse("2026-11-12T09:00:00Z");
  it("membre de plus de 30 minutes : aucun appel", async () => {
    expect(shouldRecordSignupSource({ created_at: "2026-11-12T08:29:00Z", app_metadata: { provider: "google" } }, now)).toBe(false);
    captureSignupSource(ARRIVAL);
    await recordPendingSignupSource({ created_at: "2026-01-01T00:00:00Z", app_metadata: { provider: "google" } });
    expect(rpc).not.toHaveBeenCalled();
  });
  it("compte par email : la source est déjà partie avec signUp", () => {
    expect(shouldRecordSignupSource({ created_at: "2026-11-12T08:59:00Z", app_metadata: { provider: "email" } }, now)).toBe(false);
  });
  it("compte Google de 5 minutes : un appel, pas deux", async () => {
    expect(shouldRecordSignupSource({ created_at: "2026-11-12T08:55:00Z", app_metadata: { provider: "google" } }, now)).toBe(true);
    captureSignupSource(ARRIVAL);
    const user = { created_at: new Date().toISOString(), app_metadata: { provider: "google" } };
    await recordPendingSignupSource(user);
    await recordPendingSignupSource(user);
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});

describe("pages vues : la valeur d'un identifiant de clic n'est jamais stockée", () => {
  it("la valeur devient 1, le reste est gardé", () => {
    expect(maskClickIds("?utm_source=test&gclid=ABC123xyz")).toBe("?utm_source=test&gclid=1");
    expect(maskClickIds("?fbclid=IwAR0x&ref=AB")).toBe("?fbclid=1&ref=AB");
    expect(maskClickIds("?ville=lyon")).toBe("?ville=lyon");
    expect(maskClickIds("")).toBeUndefined();
  });
  it("PageViewTracker masque et capture", () => {
    const src = read("src/components/analytics/PageViewTracker.tsx");
    expect(src).toContain("search: maskClickIds(location.search)");
    expect(src).toContain("captureSignupSource({");
    expect(src).not.toContain("search: location.search || undefined");
  });
});

describe("canal : même règle que la base", () => {
  for (const c of cases as Array<{ name: string; src: SignupSource; channel: string }>) {
    it(c.name, () => expect(deriveSignupChannel(c.src)).toBe(c.channel));
  }
  it("sans source : direct", () => expect(deriveSignupChannel(null)).toBe("direct"));
});

describe("branchements", () => {
  const auth = read("src/contexts/AuthContext.tsx");
  it("inscription par email : la source part dans les métadonnées de signUp", () => {
    expect(auth).toContain("...(signupSource ? { signup_source: signupSource } : {})");
  });
  it("fetchProfile appelle l'enregistrement au retour", () => {
    expect(auth).toContain("void recordPendingSignupSource(supabaseUser);");
  });
  it("le retour de Google porte la source, à l'inscription et à la connexion", () => {
    expect(read("src/pages/Register.tsx")).toContain("withSignupSrcParam(selectedRole ? withSignupRoleParam(postAuthTarget, selectedRole) : postAuthTarget)");
    expect(read("src/pages/Login.tsx")).toContain("withSignupSrcParam(postAuthTarget)");
  });
  it("signup_completed porte le canal", () => {
    expect((read("src/pages/Register.tsx").match(/channel: deriveSignupChannel\(getSignupSource\(\)\)/g) ?? []).length).toBe(2);
  });
  it("la conversion Google Ads laisse une ligne quand elle part vraiment", () => {
    const conv = read("src/lib/ownerSignupConversion.ts");
    expect(conv).toContain('if (reportSignupConversion(user.id)) {');
    expect(conv).toContain('trackEvent("ads_signup_conversion_sent"');
    expect(read("src/lib/cookieConsent.ts")).toContain("export function reportSignupConversion(userId: string): boolean");
  });
});

describe("migration : écrite, sûre, non bloquante", () => {
  it("table fermée aux membres, écriture unique", () => {
    expect(migration).toContain("ALTER TABLE public.profile_signup_sources ENABLE ROW LEVEL SECURITY;");
    expect(migration).toContain("REVOKE ALL ON TABLE public.profile_signup_sources FROM PUBLIC, anon, authenticated;");
    expect(migration).not.toMatch(/CREATE POLICY/);
    expect(migration).toContain("ON CONFLICT (user_id) DO NOTHING;");
  });
  it("seul le type d'identifiant de clic a une colonne", () => {
    expect(migration).toContain("click_id_type text CHECK (click_id_type IN ('gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid'))");
    expect(migration).not.toMatch(/click_id_value|gclid text/);
  });
  it("handle_new_user ne peut pas échouer pour la source", () => {
    const fn = migration.slice(migration.indexOf("CREATE OR REPLACE FUNCTION public.handle_new_user()"), migration.indexOf("-- Lecture de l'équipe"));
    const block = fn.slice(fn.indexOf("src1_source_inscription"));
    expect(block).toMatch(/BEGIN[\s\S]*signup_source_insert[\s\S]*EXCEPTION WHEN OTHERS THEN\s+NULL;\s+END;/);
    expect(fn.indexOf("signup_source_insert")).toBeGreaterThan(fn.lastIndexOf("INSERT INTO public.profiles"));
  });
  it("droits : REVOKE nommé puis GRANT (règle Y2), lecture réservée à l'équipe", () => {
    for (const sig of ["signup_source_insert(uuid, jsonb, text)", "record_signup_source(jsonb)", "admin_signup_sources(date, date)"]) {
      expect(migration).toContain(`REVOKE ALL ON FUNCTION public.${sig} FROM PUBLIC, anon, authenticated;`);
    }
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.signup_source_insert(uuid, jsonb, text) TO service_role;");
    expect(migration).toContain("NOT public.has_role(auth.uid(), 'admin'::public.app_role)");
    expect(migration).toContain("v_created < now() - interval '30 minutes'");
  });
  it("le contrat de production couvre la migration", () => {
    expect(read("scripts/db/production-contracts.json")).toContain("0142_src1_source_inscription.sql");
  });
});

describe("lecture admin", () => {
  it("le total par canal égale la somme des lignes, « Inconnu » compris", () => {
    const rows = normalizeSignupSourceRows([
      { channel: "google_ads", signups: 3, owners: 2, sitters: 1, boths: 0, google_accounts: 1, email_accounts: 2, members_with_published_sit: 1, published_sits: 1 },
      { channel: "inconnu", signups: "100", owners: 20, sitters: 70, boths: 10, google_accounts: 30, email_accounts: 70, members_with_published_sit: 3, published_sits: 4 },
    ]);
    expect(totalSignupSources(rows).signups).toBe(103);
    expect(signupChannelLabel("inconnu")).toBe("Inconnu");
    expect(signupChannelLabel("recherche_naturelle")).toBe("Recherche naturelle");
  });
  it("périodes en jours de Paris, bornes comprises", () => {
    expect(signupSourceRange(7, new Date("2026-11-12T08:00:00Z"))).toEqual({ from: "2026-11-06", to: "2026-11-12" });
  });
  it("le bloc vit sur /admin/traffic", () => {
    expect(read("src/pages/admin/AdminTraffic.tsx")).toContain("<SignupSourcesCard />");
  });
});

describe("information du membre", () => {
  it("la politique de confidentialité porte la phrase", () => {
    expect(read("src/pages/Privacy.tsx")).toContain("Nous enregistrons le canal par lequel vous êtes arrivé (par exemple un moteur de recherche ou une publicité) pour mesurer nos actions, sans identifiant publicitaire.");
  });
});
