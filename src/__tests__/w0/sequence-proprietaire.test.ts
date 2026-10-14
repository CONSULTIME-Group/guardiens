import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  isPublishedSit,
  publishedOwnerIdsFrom,
  ownerHasPublished,
} from "../../../supabase/functions/_shared/published-sit.ts";
import { publishedOwnerIds } from "../../../supabase/functions/_shared/owner-noel-audience.ts";
import {
  decideStep,
  departureHoldsPublishAsk,
  draftResumeUrl,
  j3CardsIntro,
  j3Preheader,
  lastHumanAnswer,
  ONCE_PER_PERSON_TEMPLATES,
  PUBLISH_ASK_TEMPLATES,
  sitterVoiceBlocked,
  type StepFacts,
} from "../../../supabase/functions/_shared/owner-sequence-rules.ts";
import {
  nearbySittersLabel,
  ownerNearbyContext,
  OWNER_NEARBY_RADIUS_KM,
} from "../../../supabase/functions/_shared/owner-nearby.ts";
import { excludeStaffSitters } from "../../../supabase/functions/_shared/owner-noel-audience.ts";
import { isAccountBlockedForMarketing } from "../../../supabase/functions/_shared/account-email-block.ts";
import {
  countRecentEmails,
  emailLookupVariants,
  loadRecentEmailCounts,
} from "../../../supabase/functions/_shared/owner-campaign-pressure.ts";
import { cohortRefusal, filterToFrozenCohort } from "../../../supabase/functions/send-seasonal-nurture/cohort.ts";
import { routeBothAlert, isBothNeverPublished, parisDay } from "../../../supabase/functions/_shared/both-alert-cap.ts";

// Verrous du lot W0 « Séquence propriétaire propre » (14/10/2026).
// Un bloc par point du brief, chaque bloc prouve la règle par un test pur
// ou par la lecture du code qui l'applique.

const ROOT = resolve(__dirname, "../../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");
const FN = "supabase/functions";
const TPL = `${FN}/_shared/transactional-email-templates`;
const MIGRATION = "supabase/prepared-migrations/20261014160000_w0_sequence_proprietaire.sql";

const NOW = new Date("2026-10-14T10:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86400000).toISOString();

const facts = (over: Partial<StepFacts>): StepFacts => ({
  template: "owner-no-sit-j3",
  exitMet: false,
  skipMet: false,
  alreadySent: false,
  role: "owner",
  hasPublished: false,
  departureHold: false,
  ...over,
});

// Point 1 ---------------------------------------------------------------------
describe("W0.1 une seule définition de « jamais publié »", () => {
  it("published_at renseigné = publié, quel que soit le statut ; un brouillon seul ne compte pas", () => {
    expect(isPublishedSit({ published_at: "2026-09-01T10:00:00Z" })).toBe(true);
    expect(isPublishedSit({ published_at: null })).toBe(false);
    expect(isPublishedSit({ published_at: "" })).toBe(false);
    const set = publishedOwnerIdsFrom([
      { user_id: "brouillon", published_at: null },
      { user_id: "republie-en-brouillon", published_at: "2026-08-01" },
      { user_id: "expiree", published_at: "2026-07-01" },
    ]);
    expect([...set].sort()).toEqual(["expiree", "republie-en-brouillon"]);
  });

  it("owner-noel-audience délègue à la même règle (un archivé jamais mis en ligne reste jamais publié)", () => {
    const set = publishedOwnerIds([
      { user_id: "archive-sans-publication", status: "archived", published_at: null },
      { user_id: "publie", status: "published", published_at: "2026-10-01" },
    ]);
    expect(set.has("archive-sans-publication")).toBe(false);
    expect(set.has("publie")).toBe(true);
  });

  it("ownerHasPublished lit published_at et lève si la lecture échoue", async () => {
    const calls: string[] = [];
    const client = {
      from: () => {
        const q: Record<string, unknown> = {};
        q.select = () => q;
        q.eq = () => q;
        q.not = (col: string, op: string, v: unknown) => { calls.push(`${col} ${op} ${v}`); return Promise.resolve({ count: 1, error: null }); };
        return q;
      },
    };
    expect(await ownerHasPublished(client, "u")).toBe(true);
    expect(calls).toEqual(["published_at is null"]);
    const failing = { from: () => ({ select: () => ({ eq: () => ({ not: () => Promise.resolve({ count: null, error: { message: "boom" } }) }) }) }) };
    await expect(ownerHasPublished(failing, "u")).rejects.toThrow(/boom/);
  });

  it("les cinq lecteurs passent par published-sit.ts, plus aucune autre règle", () => {
    for (const f of [
      `${FN}/evaluate-journeys/index.ts`,
      `${FN}/send-sit-draft-reminder/index.ts`,
      `${FN}/ma-periode/index.ts`,
      `${FN}/_shared/owner-noel-audience.ts`,
    ]) {
      const src = read(f);
      expect(src, f).toContain("published-sit.ts");
      expect(src, f).not.toMatch(/status\.neq\.draft/);
      expect(src, f).not.toMatch(/\[\s*['"]published['"],\s*['"]confirmed['"]/);
    }
    const mass = read(`${FN}/send-mass-email/index.ts`);
    expect(mass).toContain("filters.no_sit_published_ever || filters.never_published_sit");
    expect(mass).not.toMatch(/from\("sits"\)\s*\.select\("user_id"\);/);
  });

  it("équivalent SQL has_published_sit, réservé au service_role", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.has_published_sit\(_user_id uuid\)/);
    expect(sql).toMatch(/s\.published_at IS NOT NULL/);
    expect(sql).toContain("REVOKE EXECUTE ON FUNCTION public.has_published_sit(uuid) FROM PUBLIC, anon, authenticated;");
    // Annonces mises en ligne avant le remplissage de published_at : rattrapées.
    expect(sql).toMatch(/SET published_at = h\.first_published[\s\S]*new_status = 'published'[\s\S]*s\.published_at IS NULL;/);
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.has_published_sit(uuid) TO service_role;");
  });
});

// Point 2 ---------------------------------------------------------------------
describe("W0.2 une seule séquence propriétaire", () => {
  const sql = read(MIGRATION);
  it("onboarding-owner : J+1 onboarding-j1, J+3, J+10, J+21 owner-no-sit, sortie à la publication", () => {
    expect(sql).toContain("'1:onboarding-j1,2:owner-no-sit-j3,3:owner-no-sit-j10,4:owner-no-sit-j21'");
    for (const [order, hours, tpl] of [[1, 24, "onboarding-j1"], [2, 72, "owner-no-sit-j3"], [3, 240, "owner-no-sit-j10"], [4, 504, "owner-no-sit-j21"]] as const) {
      const re = new RegExp(`SET delay_hours = ${hours},\\s+template_name = '${tpl}',\\s+exit_condition = '\\{"type": "has_published_sit"\\}'::jsonb[\\s\\S]*?st\\.step_order = ${order};`);
      expect(sql, tpl).toMatch(re);
    }
    // Le taux de profil saute l'étape J+1 seule, il ne sort plus du parcours.
    expect(sql).toContain(`skip_condition = '{"type": "profile_complete", "threshold": 60}'::jsonb`);
  });

  it("conseils et relance profil quittent la séquence, owner-no-sit-relance s'éteint", () => {
    const steps = sql.slice(sql.indexOf("W0.3"), sql.indexOf("W0.4"));
    expect(steps).not.toMatch(/template_name = 'conseils-/);
    expect(steps).not.toMatch(/template_name = 'relance-profil-incomplet'/);
    expect(sql).toMatch(/SET active = false,[\s\S]*WHERE key = 'owner-no-sit-relance' AND active = true;/);
  });

  it("transition rejouable des parcours en cours, aucun parcours ne reste sur la séquence éteinte", () => {
    expect(sql).toContain("CASE current_step WHEN 3 THEN 2 WHEN 4 THEN 3 ELSE current_step END");
    expect(sql).toContain("SET sequence_key = 'onboarding-owner',");
    expect((sql.match(/s0\.key = 'owner-no-sit-relance' AND s0\.active/g) ?? []).length).toBe(3);
    expect(sql).toContain("W0 : % parcours actifs restent sur owner-no-sit-relance");
  });

  it("saut d'étape : profil à 60 % saute onboarding-j1 sans sortir ; la publication sort", () => {
    expect(decideStep(facts({ template: "onboarding-j1", skipMet: true }))).toEqual({ kind: "skip", reason: "skip_condition_met" });
    expect(decideStep(facts({ template: "owner-no-sit-j10", exitMet: true }))).toEqual({ kind: "exit", reason: "exit_condition_met" });
    expect(decideStep(facts({ template: "owner-no-sit-j3" }))).toEqual({ kind: "send" });
  });

  it("evaluate-journeys lit skip_condition, avance après un saut, clé d'envoi par gabarit pour owner-no-sit", () => {
    const src = read(`${FN}/evaluate-journeys/index.ts`);
    expect(src).toContain("exit_condition, skip_condition");
    expect(src).toContain("checkExitCondition(supabase, j.user_id, nextStep.skip_condition ?? null)");
    expect(src).toMatch(/verdict\.kind === 'skip'[\s\S]*?current_step: nextStep\.step_order/);
    expect(src).toContain("`journey-${j.sequence_key}-${j.id}-${template}`");
    // Ordre de déploiement : une lecture d'étapes en échec arrête le passage
    // au lieu de clore tous les parcours, et la colonne absente a son repli.
    expect(src).toContain("throw new Error(`nurturing_steps lookup failed:");
    expect(src).toMatch(/stepsErr && \/skip_condition\/\.test/);
    expect(src).toContain("if (steps.length === 0) continue");
    // Une relance de brouillon de moins de 48 h fait attendre owner-no-sit.
    expect(src).toContain("template.startsWith('owner-no-sit-') && recentDraftReminder.has(profile.email.toLowerCase())");
    expect(read(`${FN}/send-sit-draft-reminder/index.ts`)).toContain('.filter("metadata->>source", "like", "journey:%")');
    // Égalité de priorité : onboarding-owner passe avant onboarding-sitter.
    expect(src).toContain("|| a.key.localeCompare(b.key))");
    expect("onboarding-owner".localeCompare("onboarding-sitter")).toBeLessThan(0);
  });
});

// Point 3 ---------------------------------------------------------------------
describe("W0.3 gabarits J+3, J+21 et textes affirmatifs", () => {
  it("J+3 : préentête et introduction accordées au nombre de cartes", () => {
    expect(j3Preheader(0)).toBe("Votre première annonce se publie en quelques minutes.");
    expect(j3Preheader(1)).toBe("En voici un, à proximité de chez vous.");
    expect(j3Preheader(2)).toBe("En voici deux, à proximité de chez vous.");
    expect(j3Preheader(3)).toBe("En voici trois, à proximité de chez vous.");
    expect(j3Preheader(7)).toBe("En voici trois, à proximité de chez vous.");
    expect(j3CardsIntro(0)).toBeNull();
    expect(j3CardsIntro(2)).toBe("En voici deux :");
  });

  it("J+3 : brouillon fourni par evaluate-journeys, bloc « Reprendre mon brouillon » vers le brouillon", () => {
    const tpl = read(`${TPL}/owner-no-sit-j3.tsx`);
    expect(tpl).toContain("<a href={draftUrl} style={inlineLink}>Reprendre mon brouillon</a>");
    expect(tpl).toContain("<Preview>{j3Preheader(label ? cards.length : 0)}</Preview>");
    const ev = read(`${FN}/evaluate-journeys/index.ts`);
    expect(ev).toContain("hasDraft: true, resumeUrl: draftResumeUrl(draft.id as string)");
    expect(draftResumeUrl("abc")).toMatch(/^https:\/\/guardiens\.fr\/sits\/create\?resume=abc&/);
  });

  it("J+21 : lien de désinscription à jeton et une seule signature", () => {
    const tpl = read(`${TPL}/owner-no-sit-j21.tsx`);
    expect(tpl).not.toContain("scope=all");
    expect(tpl).toContain("const unsubUrl = unsubscribeAllUrl ||");
    expect(tpl).not.toMatch(/<AlmaSignature|<AlmaSignoff/);
    expect((tpl.match(/style=\{sig\}/g) ?? []).length).toBe(1);
    const ste = read(`${FN}/send-transactional-email/index.ts`);
    expect(ste).toContain("templateData = { ...templateData, unsubscribeAllUrl: `${SITE_URL}/unsubscribe?token=${unsubscribeToken}` }");
    expect(ste).toContain("new Set(['owner-no-sit-j21'])");
    expect(ste.indexOf("unsubscribeAllUrl")).toBeLessThan(ste.indexOf("let html = render("));
  });

  const visible = (src: string) => src
    .split("\n")
    .filter((l) => !/^\s*(import|const \w+ = \{|\/\/|\*|\/\*\*)/.test(l))
    .filter((l) => !/^\s*(fontSize|color|margin|padding|backgroundColor|borderRadius|display|textDecoration|fontWeight|lineHeight|textAlign|width|height|border\w*|fontFamily|maxWidth|verticalAlign|fontStyle|marginBottom):/.test(l))
    .join("\n");

  for (const name of ["onboarding-j1", "owner-no-sit-j3", "owner-no-sit-j10", "owner-no-sit-j21", "sit-draft-reminder"]) {
    it(`${name} : aucune construction négative, aucun accord présumé, aucun tiret`, () => {
      const text = visible(read(`${TPL}/${name}.tsx`));
      expect(text).not.toMatch(/\bne\s+(?:\S+\s+){0,2}(pas|plus|jamais|rien)\b/i);
      expect(text).not.toMatch(/\bn['’]\S+\s+(pas|plus|jamais|rien)\b/i);
      expect(text).not.toMatch(/\binscrit(\(e\))?\b/i);
      expect(text).not.toMatch(/[–—]/);
      expect(text).not.toMatch(/\bvoisin/i);
      expect(text).not.toMatch(/disponibles?\b/i);
    });
  }
});

// Point 4 ---------------------------------------------------------------------
describe("W0.4 un seul calcul des gardiens à proximité", () => {
  const owner = { id: "o", first_name: "Camille", city: "Lyon", latitude: 45.764, longitude: 4.8357 };
  const sitter = (id: string, lat: number, extra: Record<string, unknown> = {}) => ({
    id, first_name: id, city: "Ailleurs", avatar_url: null, latitude: lat, longitude: 4.8357,
    profile_completion: 80, identity_verified: false, ...extra,
  });

  it("libellé « N gardiens à moins de 50 km de {commune} », accord, sans « vérifiés »", () => {
    expect(OWNER_NEARBY_RADIUS_KM).toBe(50);
    expect(nearbySittersLabel(137, "Lyon")).toBe("137 gardiens à moins de 50 km de Lyon");
    expect(nearbySittersLabel(1, "Lyon")).toBe("1 gardien à moins de 50 km de Lyon");
    expect(nearbySittersLabel(4, null)).toBe("4 gardiens à moins de 50 km de chez vous");
    expect(nearbySittersLabel(0, "Lyon")).toBeNull();
  });

  it("50 km stricts autour du propriétaire, trois cartes au plus, aucune coordonnée transmise", () => {
    // 0,44° de latitude ≈ 48,9 km ; 0,46° ≈ 51,2 km.
    const pool = [sitter("pres", 45.764 + 0.2), sitter("limite", 45.764 + 0.44), sitter("loin", 45.764 + 0.46), sitter("o", 45.764)];
    const ctx = ownerNearbyContext(owner, pool);
    expect(ctx.count).toBe(2);
    expect(ctx.label).toBe("2 gardiens à moins de 50 km de Lyon");
    expect(ctx.cards.map((c) => c.id)).toEqual(["pres", "limite"]);
    expect(JSON.stringify(ctx.cards)).not.toMatch(/latitude|longitude/);
  });

  it("onboarding-j1 : cartes tirées des seuls gardiens à moins de 50 km", () => {
    const src = read(`${FN}/send-onboarding-j1/index.ts`);
    expect(src).toContain("nearbyIds.has(p.id) && !isAccountBlockedForMarketing(p)");
  });

  it("vivier : fondateurs et admins exclus, comptes suspendus exclus", () => {
    const rows = [{ id: "7bf29905-d372-4669-93b1-ec7def9b06d5" }, { id: "admin" }, { id: "membre" }];
    expect(excludeStaffSitters(rows, new Set(["admin"])).map((r) => r.id)).toEqual(["membre"]);
    const noel = read(`${FN}/_shared/owner-noel-audience.ts`);
    expect(noel).toMatch(/\.in\("role", \["sitter", "both"\]\)\s*\.eq\("account_status", "active"\)/);
    expect(noel).toContain("excludeStaffSitters(rows.filter((r) => !isSuspended(r, now)), admins)");
  });

  it("les quatre émetteurs propriétaires lisent owner-nearby.ts, plus aucun autre rayon", () => {
    for (const f of [`${FN}/evaluate-journeys/index.ts`, `${FN}/send-onboarding-j1/index.ts`, `${FN}/send-sit-draft-reminder/index.ts`]) {
      const src = read(f);
      expect(src, f).toContain("ownerNearbyContext(");
      expect(src, f).not.toContain("get_owner_nurturing_context");
      expect(src, f).not.toMatch(/NEARBY_RADIUS_KM = 30/);
    }
    for (const t of ["onboarding-j1", "owner-no-sit-j3", "owner-no-sit-j10", "owner-no-sit-j21", "sit-draft-reminder"]) {
      const src = read(`${TPL}/${t}.tsx`);
      expect(src, t).toContain("nearbySittersLabel");
      expect(src, t).not.toMatch(/gardien\{?[^}]*\}? vérifié/);
      expect(src, t).not.toMatch(/rayon de 30 km/);
    }
  });
});

// Point 5 ---------------------------------------------------------------------
describe("W0.5 textes de gardien jamais vers un propriétaire jamais publié", () => {
  it("reactivation-d30 et relance-profil-incomplet bloqués pour owner jamais publié seulement", () => {
    expect(sitterVoiceBlocked("reactivation-d30", "owner", false)).toBe(true);
    expect(sitterVoiceBlocked("relance-profil-incomplet", "owner", false)).toBe(true);
    expect(sitterVoiceBlocked("reactivation-d30", "owner", true)).toBe(false);
    expect(sitterVoiceBlocked("reactivation-d30", "both", false)).toBe(false);
    expect(sitterVoiceBlocked("reactivation-d30", "sitter", false)).toBe(false);
    expect(decideStep(facts({ template: "reactivation-d30" }))).toEqual({ kind: "exit", reason: "owner_never_published" });
  });

  it("exclusion à l'enrôlement, à l'envoi, dans l'envoi manuel et dans la migration", () => {
    const ev = read(`${FN}/evaluate-journeys/index.ts`);
    expect(ev).toContain("SEQUENCES_EXCLUDING_NEVER_PUBLISHED_OWNER.has(seq.key)");
    const manual = read(`${FN}/send-relance-profil-incomplet/index.ts`);
    expect(manual).toContain('sitterVoiceBlocked("relance-profil-incomplet"');
    expect(read(MIGRATION)).toMatch(/sequence_key = 'reactivation-d30'[\s\S]*p\.role = 'owner'[\s\S]*NOT public\.has_published_sit\(j\.user_id\)/);
  });
});

// Point 6 ---------------------------------------------------------------------
describe("W0.6 réponse à la question de départ respectée", () => {
  it("printemps, été, plus tard de moins de 30 jours : les relances « publier » attendent", () => {
    for (const period of ["printemps", "ete", "plus_tard"]) {
      expect(departureHoldsPublishAsk({ period, answered_at: daysAgo(5) }, NOW), period).toBe(true);
      expect(departureHoldsPublishAsk({ period, answered_at: daysAgo(31) }, NOW), period).toBe(false);
    }
  });

  it("Noël et hiver ne bloquent rien, un clic de robot ne compte pas", () => {
    expect(departureHoldsPublishAsk({ period: "noel", answered_at: daysAgo(1) }, NOW)).toBe(false);
    expect(departureHoldsPublishAsk({ period: "hiver", answered_at: daysAgo(1) }, NOW)).toBe(false);
    const last = lastHumanAnswer([
      { period: "printemps", answered_at: daysAgo(1), source: "scanner_suspect" },
      { period: "noel", answered_at: daysAgo(3), source: "email" },
    ]);
    expect(last?.period).toBe("noel");
  });

  it("seules les relances « publier » attendent ; onboarding-j1 part", () => {
    expect([...PUBLISH_ASK_TEMPLATES].sort()).toEqual(["owner-no-sit-j10", "owner-no-sit-j21", "owner-no-sit-j3", "sit-draft-reminder"]);
    expect(decideStep(facts({ template: "owner-no-sit-j10", departureHold: true }))).toEqual({ kind: "hold", reason: "departure_hold" });
    expect(decideStep(facts({ template: "onboarding-j1", departureHold: true }))).toEqual({ kind: "send" });
    const draft = read(`${FN}/send-sit-draft-reminder/index.ts`);
    expect(draft).toContain("departureHoldsPublishAsk(await loadLastDepartureAnswer(supabase, draft.user_id))");
    const ev = read(`${FN}/evaluate-journeys/index.ts`);
    expect(ev).toMatch(/verdict\.kind === 'hold'[\s\S]{0,400}continue/);
  });
});

// Point 7 ---------------------------------------------------------------------
describe("W0.7 comptes suspendus : aucun email non transactionnel par aucune voie", () => {
  it("suspension à échéance future, sans échéance, ou compte inactif = bloqué", () => {
    expect(isAccountBlockedForMarketing({ account_status: "active", suspended_at: daysAgo(40), suspended_until: "2036-08-31T17:36:46Z" }, NOW)).toBe(true);
    expect(isAccountBlockedForMarketing({ account_status: "active", suspended_at: daysAgo(40), suspended_until: null }, NOW)).toBe(true);
    expect(isAccountBlockedForMarketing({ account_status: "active", suspended_at: daysAgo(40), suspended_until: daysAgo(1) }, NOW)).toBe(false);
    expect(isAccountBlockedForMarketing({ account_status: "deactivated" }, NOW)).toBe(true);
  });

  // Toute fonction qui parle à Resend sans passer par send-transactional-email
  // applique la garde, ou figure ici avec sa raison.
  const RESEND_DIRECT_ALLOWED: Record<string, string> = {
    "send-transactional-email": "garde C2 sur toute catégorie non transactionnelle",
    "send-email-direct": "destinataires internes seulement (guardiens.fr)",
    "send-test-email": "envoi de test admin",
    "admin-send-test-email": "envoi de test admin",
    "admin-resend-domain-tracking": "configuration du domaine, aucun email",
    "email-pipeline-watchdog": "alerte interne",
    "admin-manage-identity-verification": "transactionnel (vérification d'identité)",
    "verify-identity": "transactionnel (vérification d'identité)",
    "send-association-consent-email": "association destinataire, hors compte membre",
  };
  it("chaque voie directe vers Resend applique la garde de suspension", () => {
    const dirs = readdirSync(resolve(ROOT, FN), { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith("_"));
    const unguarded: string[] = [];
    for (const d of dirs) {
      const file = resolve(ROOT, FN, d.name, "index.ts");
      if (!existsSync(file)) continue;
      const src = readFileSync(file, "utf8");
      if (!/api\.resend\.com/.test(src)) continue;
      if (RESEND_DIRECT_ALLOWED[d.name]) continue;
      if (!src.includes("isAccountBlockedForMarketing(")) unguarded.push(d.name);
    }
    expect(unguarded).toEqual([]);
  });

  it("send-mass-email exclut toujours, la file vérifie au moment de l'envoi", () => {
    const mass = read(`${FN}/send-mass-email/index.ts`);
    expect(mass).toContain("if (isAccountBlockedForMarketing(p)) continue;");
    expect(mass).not.toContain("filters.exclude_suspended && p.suspended_at");
    const queue = read(`${FN}/process-mass-email-queue/index.ts`);
    expect(queue).toContain('category !== "transactional" && isAccountBlockedForMarketing(profile as any)');
    expect(queue).toContain('last_error: "account_suspended"');
    // Lecture du compte en échec : rien ne part, le verrou est rendu.
    expect(queue).toMatch(/if \(profileErr\) \{[\s\S]*?update\(\{ status: "queued" \}\)[\s\S]*?continue;/);
  });
});

// Point 8 ---------------------------------------------------------------------
describe("W0.8 un seul onboarding-j1 par personne", () => {
  it("le parcours saute un gabarit à envoi unique déjà parti par une autre voie", () => {
    expect(ONCE_PER_PERSON_TEMPLATES.has("onboarding-j1")).toBe(true);
    expect(decideStep(facts({ template: "onboarding-j1", alreadySent: true }))).toEqual({ kind: "skip", reason: "already_sent_other_path" });
    const ev = read(`${FN}/evaluate-journeys/index.ts`);
    expect(ev).toMatch(/async function templateAlreadySent[\s\S]*\.ilike\('recipient_email', pattern\)[\s\S]*\.in\('status', ALREADY_SENT_STATUSES/);
  });

  it("le déclenchement manuel lit tous les envois, sans casse, et s'abstient si la lecture échoue", () => {
    const src = read(`${FN}/send-onboarding-j1/index.ts`);
    expect(src).toContain(".ilike('recipient_email', pattern)");
    expect(src).toContain(".in('status', ALREADY_SENT_STATUSES as string[])");
    expect(src).toContain("if (alreadyErr || (alreadySent && alreadySent.length > 0))");
  });
});

// Point 9 ---------------------------------------------------------------------
describe("W0.9 owner-campaign-pressure sans casse", () => {
  it("cherche l'adresse fournie et sa forme en minuscules, compte en minuscules", async () => {
    expect(emailLookupVariants(["Jean.Dupont@Gmail.com", " jean.dupont@gmail.com ", null]).sort())
      .toEqual(["Jean.Dupont@Gmail.com", "jean.dupont@gmail.com"]);
    const seen: string[][] = [];
    const rows = [
      { recipient_email: "Jean.Dupont@Gmail.com", template_name: "owner-noel-2026", status: "sent", message_id: "a" },
      { recipient_email: "jean.dupont@gmail.com", template_name: "owner-no-sit-j3", status: "sent", message_id: "b" },
      { recipient_email: "jean.dupont@gmail.com", template_name: "new-message", status: "sent", message_id: "c" },
    ];
    const client = {
      from: () => {
        const q: Record<string, unknown> = {};
        let emails: string[] = [];
        q.select = () => q;
        q.in = (col: string, v: string[]) => { if (col === "recipient_email") { emails = v; seen.push(v); } return q; };
        q.gte = () => q;
        q.order = () => q;
        q.range = () => Promise.resolve({ data: rows.filter((r) => emails.includes(r.recipient_email)), error: null });
        return q;
      },
    };
    const counts = await loadRecentEmailCounts(client, ["Jean.Dupont@Gmail.com"]);
    expect(seen[0]).toContain("Jean.Dupont@Gmail.com");
    expect(seen[0]).toContain("jean.dupont@gmail.com");
    expect(counts.get("jean.dupont@gmail.com")).toBe(2);
    expect(countRecentEmails(rows).get("jean.dupont@gmail.com")).toBe(2);
  });
});

// Point 10 --------------------------------------------------------------------
describe("W0.10 send-seasonal-nurture : 409 sans cohorte gelée", () => {
  const plan = [{ user_id: "a" }, { user_id: "b" }];
  it("aucune cohorte pour la période : envoi refusé, jamais tout le plan", () => {
    const f = filterToFrozenCohort(plan, []);
    expect(cohortRefusal(f, "noel-2026")).toBe("aucune cohorte figée pour noel-2026, envoi refusé");
    expect(cohortRefusal(f, "noel-2026", true)).toBeNull();
  });
  it("croisement vide refusé même à blanc, cohorte valable acceptée", () => {
    expect(cohortRefusal(filterToFrozenCohort(plan, [{ user_id: "z", groupe: "cible" }]), "p", true)).toMatch(/croisement vide/);
    expect(cohortRefusal(filterToFrozenCohort(plan, [{ user_id: "a", groupe: "cible" }]), "p")).toBeNull();
  });
  it("la fonction répond 409 avec la raison", () => {
    const src = read(`${FN}/send-seasonal-nurture/index.ts`);
    expect(src).toMatch(/const reason = cohortRefusal\(cohortFilter, periodKey, !!body\.dry_run\)[\s\S]*?\}, 409\)/);
  });
});

// Point 11 --------------------------------------------------------------------
describe("W0.11 comptes « both » jamais publiés : une alerte immédiate par jour", () => {
  it("première alerte du jour immédiate, les suivantes au récapitulatif", () => {
    expect(routeBothAlert({ role: "both", hasPublished: false, immediateToday: 0 })).toBe("immediate");
    expect(routeBothAlert({ role: "both", hasPublished: false, immediateToday: 1 })).toBe("digest");
    expect(routeBothAlert({ role: "both", hasPublished: true, immediateToday: 4 })).toBe("immediate");
    expect(routeBothAlert({ role: "sitter", hasPublished: false, immediateToday: 4 })).toBe("immediate");
    expect(isBothNeverPublished("both", false)).toBe(true);
    expect(parisDay(new Date("2026-10-14T22:30:00Z"))).toBe("2026-10-15");
  });

  it("aucune alerte perdue : file du récapitulatif, sans réservation immédiate, repli immédiat en cas d'échec", () => {
    const src = read(`${FN}/notify-sitters-on-publish/index.ts`);
    const capBlock = src.slice(src.indexOf("Lot W0 (point 11) : plafond quotidien"), src.indexOf('const { error: claimErr } = await supabase.from("sit_notification_log").insert'));
    expect(capBlock).toContain('from("sitter_digest_queue").upsert(');
    expect(capBlock).toContain('onConflict: "sitter_id,sit_id", ignoreDuplicates: true');
    expect(capBlock).toContain('route === "digest" && digestServes.get(t.user_id) === true');
    expect(capBlock).toMatch(/if \(!queueErr && !requeueErr\) \{\s*metrics\.deferred_to_digest\+\+;\s*continue;\s*\}/);
    // Une ligne déjà écartée par un récapitulatif repart en file.
    expect(capBlock).toMatch(/update\(\{ status: "queued", skip_reason: null[\s\S]*?\.eq\("status", "skipped"\)/);
    // L'alerte différée n'écrit pas de réservation : le récapitulatif ne la
    // retire donc pas comme « déjà alertée ».
    expect(capBlock).not.toContain('from("sit_notification_log").insert');
    const digest = read(`${FN}/send-sitter-daily-digest/index.ts`);
    expect(digest).toContain("`publish-alert-${r.sit_id}-${sitterId}`");
  });
});
