/**
 * Lot Y1 (13/10/2026), défauts P1 de la passe 4 de l'audit (emails,
 * notifications, push) : P4-01, P4-03, P4-04, P4-05, P4-06, P4-07, P4-08.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  DORMANT_PAST_SENDS_FILTER,
  dormantDuplicateFilter,
  dormantLogKey,
  dormantSendDecision,
  tallyDormantSends,
} from "../../../supabase/functions/_shared/dormant-sitter-cap.ts";
import { deepLinkOutcome, safeDeepLinkPath } from "@/lib/emailDeepLink";

const read = (p: string) => readFileSync(p, "utf8");
const TPL = "supabase/functions/_shared/transactional-email-templates";
const sql = read("supabase/prepared-migrations/20261013200000_y1_plafond_messages.sql");
const block = (start: string, end: string) => {
  const a = sql.indexOf(start);
  const b = sql.indexOf(end, a + 1);
  expect(a, `début introuvable : ${start}`).toBeGreaterThan(-1);
  expect(b, `fin introuvable : ${end}`).toBeGreaterThan(a);
  return sql.slice(a, b);
};

const SITTER = "5a49f6a4-b1ee-4a28-b61f-c659e2b5f601";
const NOW = Date.UTC(2026, 9, 13, 11, 0, 0);
const iso = (daysAgo: number) => new Date(NOW - daysAgo * 86400_000).toISOString();
/** Ligne au format réel du journal depuis le 01/10/2026 : UUID en message_id. */
const realRow = (week: string, daysAgo: number, status = "sent") => ({
  message_id: "06bc6182-e5b9-411e-8486-421ffd80f136",
  created_at: iso(daysAgo),
  status,
  metadata: { idempotency_key: `dormant-sitter-${SITTER}-${week}` },
});

describe("Y1, migration", () => {
  it("aucun tiret cadratin ni demi-cadratin", () => {
    expect(sql).not.toMatch(/[–—]/);
  });
  it("aucune instruction UPDATE ou DELETE sans WHERE (pg_safeupdate)", () => {
    const stripped = sql.replace(/--[^\n]*/g, " ");
    for (const stmt of stripped.split(";")) {
      const s = stmt.replace(/\s+/g, " ");
      if (/\bUPDATE\s+public\.\w+(\s+\w+)?\s+SET\b/i.test(s)) expect(s, s.slice(0, 120)).toMatch(/\bWHERE\b/i);
      if (/\bDELETE\s+FROM\b/i.test(s)) expect(s, s.slice(0, 120)).toMatch(/\bWHERE\b/i);
    }
  });
});

describe("Y1, P4-01 : plafond des relances « gardien dormant »", () => {
  it("la clé se lit dans metadata.idempotency_key, et dans message_id pour l'historique", () => {
    expect(dormantLogKey(realRow("202642", 1))).toBe(`dormant-sitter-${SITTER}-202642`);
    expect(dormantLogKey({ message_id: `dormant-sitter-${SITTER}-202638` })).toBe(`dormant-sitter-${SITTER}-202638`);
    expect(dormantLogKey({ message_id: "06bc6182-e5b9-411e-8486-421ffd80f136", metadata: {} })).toBeNull();
  });
  it("trois envois au format réel bloquent le quatrième (cap_reached)", () => {
    const { sentCounts, lastSentAt } = tallyDormantSends([
      realRow("202641", 22),
      realRow("202642", 15),
      realRow("202640", 29),
    ]);
    expect(sentCounts.get(SITTER)).toBe(3);
    const last = lastSentAt.get(SITTER)!;
    const decision = dormantSendDecision({
      daysSinceSignup: 120,
      alreadySentCount: sentCounts.get(SITTER) ?? 0,
      isAdmin: false,
      daysSinceLastSend: (NOW - Date.parse(last)) / 86400_000,
      nowMs: NOW,
    });
    expect(decision).toEqual({ send: false, reason: "cap_reached" });
  });
  it("un envoi d'il y a 7 jours bloque le suivant (too_soon_since_last_send)", () => {
    const { sentCounts, lastSentAt } = tallyDormantSends([realRow("202642", 7)]);
    const decision = dormantSendDecision({
      daysSinceSignup: 120,
      alreadySentCount: sentCounts.get(SITTER) ?? 0,
      isAdmin: false,
      daysSinceLastSend: (NOW - Date.parse(lastSentAt.get(SITTER)!)) / 86400_000,
      nowMs: NOW,
    });
    expect(decision).toEqual({ send: false, reason: "too_soon_since_last_send" });
  });
  it("une même clé compte une fois, un envoi abandonné ne compte pas", () => {
    const { sentCounts } = tallyDormantSends([
      realRow("202642", 1, "deferred"),
      realRow("202642", 1, "sent"),
      realRow("202641", 8, "abandoned"),
    ]);
    expect(sentCounts.get(SITTER)).toBe(1);
  });
  it("la fonction lit les deux formats et échoue si la lecture échoue", () => {
    expect(DORMANT_PAST_SENDS_FILTER).toContain("message_id.like.dormant-sitter-%");
    expect(DORMANT_PAST_SENDS_FILTER).toContain("template_name.eq.dormant-sitter-nudge");
    expect(dormantDuplicateFilter("k")).toContain("metadata->>idempotency_key.eq.k");
    const fn = read("supabase/functions/nudge-sitter-dormant/index.ts");
    expect(fn).toContain(".or(DORMANT_PAST_SENDS_FILTER)");
    expect(fn).toContain(".or(dormantDuplicateFilter(messageId))");
    expect(fn).not.toContain('.like("message_id", "dormant-sitter-%")');
    expect(fn).toContain("if (pastSendsErr) throw");
  });
  it("même lecture pour la relance « garde à confirmer »", () => {
    const fn = read("supabase/functions/nudge-owner-unconfirmed-sit/index.ts");
    expect(fn).toContain("metadata->>idempotency_key.eq.${messageId},template_name.eq.owner-sit-unconfirmed");
  });
});

describe("Y1, P4-03 : besoins retirés", () => {
  it("l'auteur clôt un besoin ouvert au lieu de l'effacer", () => {
    const page = read("src/pages/SmallMissionDetail.tsx");
    expect(page).toContain('close_reason: "author_withdrew"');
    expect(page).toContain("Retirer cette publication");
    expect(page).not.toContain("Supprimer cette publication");
  });
  it("un besoin effacé emporte ses notifications non lues, un besoin retiré ses invitations", () => {
    const fn = block("CREATE OR REPLACE FUNCTION public.purge_unread_notifications_of_mission", "-- Rattrapage");
    expect(fn).toMatch(/CREATE TRIGGER trg_purge_unread_notifications_of_deleted_mission\s+AFTER DELETE ON public\.small_missions/);
    expect(fn).toMatch(/CREATE TRIGGER trg_purge_help_invitations_of_cancelled_mission\s+AFTER UPDATE OF status ON public\.small_missions/);
    expect(fn).toContain("n.read_at IS NULL");
    expect(fn).toContain("n.type = 'mission_help_needed'");
  });
  it("la page d'un besoin absent dit qu'il a été retiré et propose les besoins proches", () => {
    const fr = JSON.parse(read("src/i18n/locales/fr/common.json"));
    expect(fr.mission_detail.not_found_title).toBe("Ce besoin a été retiré par son auteur");
    expect(fr.mission_detail.see_open).toBe("Voir les besoins près de chez moi");
  });
});

describe("Y1, P4-04 et P4-05 : diffusion d'une nouvelle annonce", () => {
  const fn = block("CREATE OR REPLACE FUNCTION public.notify_sitters_on_new_sit", "-- P4-04 suite");
  it("un compte propriétaire seul sort du réservoir et du récapitulatif", () => {
    expect(fn).toContain("AND pr.role::text IS DISTINCT FROM 'owner'");
    const digest = read("supabase/functions/send-sitter-daily-digest/index.ts");
    expect(digest).toContain("if (profile.role === 'owner')");
    expect(digest).toContain("'not_sitter_role'");
  });
  it("retirer son espace gardien coupe alertes et file", () => {
    const deact = block("CREATE OR REPLACE FUNCTION public.deactivate_my_space", "-- Rattrapage : lignes encore en file");
    expect(deact).toContain("UPDATE public.alert_preferences SET active = false");
    expect(deact).toContain("skip_reason = 'not_sitter_role'");
    expect(deact).toContain("RAISE EXCEPTION 'ACTIVE_APPLICATIONS:");
  });
  it("la notification in-app ne part qu'à 100 km au plus ou dans une zone d'alerte", () => {
    expect(fn).toContain("c_notify_max_km constant integer := 100;");
    expect(fn).toMatch(/IF \(sitter\.alert_priority\s+OR \(sitter\.distance_km IS NOT NULL AND sitter\.distance_km <= c_notify_max_km\)\)\s+AND NOT EXISTS/);
  });
  it("le reste de la diffusion est celui de la production (X3a)", () => {
    expect(fn).toContain("c_rank_cap constant integer := 100;");
    expect(fn).toContain("AND (sp.smoker IS DISTINCT FROM true OR NOT v_smokers_refused)");
    expect(fn).toContain("INSERT INTO public.sitter_digest_queue (sitter_id, sit_id, distance_km)");
  });
});

describe("Y1, P4-06 : lien d'email et session", () => {
  const consume = block("CREATE OR REPLACE FUNCTION public.consume_email_deep_link", "REVOKE ALL ON FUNCTION public.consume_email_deep_link");
  it("session seulement pour un email immédiat, dans les 2 heures, sans autre compte", () => {
    expect(sql).toContain("DROP FUNCTION IF EXISTS public.consume_email_deep_link(text);");
    expect(consume).toContain("p_caller uuid DEFAULT NULL");
    expect(consume).toContain("c_session_window constant interval := interval '2 hours';");
    expect(consume).toContain("'reason', 'other_account'");
    expect(consume).toContain("'same_account', true");
    expect(consume).toContain("'reason', 'login_required'");
    // Un autre compte ne consomme pas le jeton.
    const other = consume.indexOf("'other_account'");
    const firstConsume = consume.indexOf("SET consumed_at = now()");
    expect(other).toBeGreaterThan(0);
    expect(firstConsume).toBeGreaterThan(other);
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.consume_email_deep_link(text, uuid) TO service_role;");
  });
  it("la liste des gabarits qui ouvrent une session est la même côté base et côté envoi", () => {
    const sender = read("supabase/functions/send-transactional-email/index.ts");
    const senderSet = sender.slice(sender.indexOf("const DEEP_LINK_SESSION_TEMPLATES"), sender.indexOf("const DEEP_LINK_SESSION_NOTICE"));
    const names = Array.from(senderSet.matchAll(/'([a-z0-9-]+)'/g), (m) => m[1]).sort();
    expect(names).toEqual(["first-application-received", "new-application", "new-message", "review-received"]);
    for (const n of names) expect(consume).toContain(`'${n}'`);
    for (const reminder of ["unread-messages-reminder", "owner-pending-application-nudge", "discussion-stalled-nudge", "review-reminder", "relance-cp-manquant"]) {
      expect(names).not.toContain(reminder);
    }
    expect(sender).toContain("Le bouton de cet email vous connecte directement pendant 2 heures : gardez ce message pour vous.");
  });
  it("la fonction edge transmet le compte connecté", () => {
    const edge = read("supabase/functions/email-deep-link/index.ts");
    expect(edge).toContain("p_caller: callerId");
    expect(edge).toContain("sameAccount: true");
  });
  it("issue lue par la page", () => {
    expect(deepLinkOutcome({ ok: true, url: "https://x.supabase.co/auth/v1/verify?t=1", next: "/messages/a" })).toEqual({
      kind: "session", url: "https://x.supabase.co/auth/v1/verify?t=1", next: "/messages/a",
    });
    expect(deepLinkOutcome({ ok: true, sameAccount: true, next: "/messages/a" })).toEqual({ kind: "same_account", next: "/messages/a" });
    expect(deepLinkOutcome({ ok: false, reason: "other_account", next: "/messages/a" })).toEqual({ kind: "other_account", next: "/messages/a" });
    expect(deepLinkOutcome({ ok: false, reason: "login_required", next: "/sits/1#candidatures" })).toEqual({ kind: "login", next: "/sits/1#candidatures" });
    expect(deepLinkOutcome(null)).toEqual({ kind: "login", next: "/messages" });
    expect(safeDeepLinkPath("//evil.example")).toBe("/messages");
    expect(safeDeepLinkPath("https://evil.example")).toBe("/messages");
  });
  it("la page garde la session d'un autre compte et propose d'en changer", () => {
    const page = read("src/pages/EmailDeepLink.tsx");
    expect(page).toContain('outcome.kind === "other_account"');
    expect(page).toContain("Changer de compte");
    expect(page).toContain("await logout()");
  });
});

describe("Y1, P4-07 : gratuité dite simplement", () => {
  it("l'appel au partage dit « Guardiens est gratuit », sans chiffre non sourcé", () => {
    const src = read(`${TPL}/referral-boost-monthly.tsx`);
    expect(src).toContain("Guardiens est gratuit.");
    expect(src).not.toMatch(/pour le moment|1 200|700 personnes|200 articles|Tahiti/);
    expect(src).not.toMatch(/[–—]/);
  });
  it("le mot du fondateur est affirmatif", () => {
    const src = read(`${TPL}/founder-personal-notice.tsx`);
    expect(src).toContain("Guardiens est gratuit, et c'est un échange");
    expect(src).not.toMatch(/ce n'est pas un cadeau|offre de lancement/i);
  });
  it("plus aucun email d'abonnement expiré depuis Stripe", () => {
    const hook = read("supabase/functions/stripe-webhook/index.ts");
    expect(hook).not.toContain("subscription-expired");
    expect(hook).not.toContain("sendExpiredEmail");
  });
});

describe("Y1, P4-08 : rencontre toujours facultative", () => {
  it("aucun gabarit ne présente la rencontre comme une étape", () => {
    expect(read(`${TPL}/sitter-encourage-candidature.tsx`)).not.toMatch(/vous vous rencontrez\s+avant de vous engager/);
    expect(read(`${TPL}/sitter-encourage-candidature.tsx`)).toMatch(/vous pouvez vous\s+rencontrer avant de vous engager si vous le souhaitez tous les deux/);
    expect(read(`${TPL}/owner-no-sit-j10.tsx`)).not.toContain("Vous rencontrez chaque candidat");
    expect(read(`${TPL}/owner-no-sit-j10.tsx`)).toContain("Guardiens est gratuit.");
    expect(read(`${TPL}/owner-no-sit-j10.tsx`)).not.toContain("gratuit pour les propriétaires");
    expect(read(`${TPL}/sit-reminder-j7.tsx`)).not.toContain("prévoir une rencontre");
    expect(read(`${TPL}/sit-reminder-j7.tsx`)).toContain("si vous le souhaitez");
    expect(read(`${TPL}/seasonal-nurture.tsx`)).not.toContain("de rencontrer la personne");
    expect(read(`${TPL}/first-application-received.tsx`)).toContain("avant de confirmer, si vous le souhaitez");
  });
});
