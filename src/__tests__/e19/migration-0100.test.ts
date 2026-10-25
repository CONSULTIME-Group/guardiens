/**
 * Lot E19 : assertions sur la migration 0100 et sur le câblage serveur.
 * La recette exécutable est dans recette-e19.sql (même dossier), jouée sur
 * une base PostgreSQL vide.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8");
const sql = read("drizzle/migrations/0100_e19_confiance_parole_publique.sql");
const active = (text: string) => text.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
const between = (start: string, end: string) => {
  const from = sql.indexOf(start);
  const to = sql.indexOf(end, from + start.length);
  expect(from, start).toBeGreaterThanOrEqual(0);
  expect(to, end).toBeGreaterThan(from);
  return sql.slice(from, to);
};

describe("migration 0100 : accord par défaut", () => {
  it("public_ok vaut false par défaut, en table et en paramètre", () => {
    expect(sql).toContain("ALTER COLUMN public_ok SET DEFAULT false");
    expect(sql).toContain("p_public_ok boolean DEFAULT false");
    expect(sql).toContain("COALESCE(p_public_ok, false)");
    expect(active(sql)).not.toMatch(/COALESCE\(p_public_ok, true\)/);
  });

  it("retire l'ancienne signature et garde la fonction au seul rôle de service", () => {
    expect(sql).toContain("DROP FUNCTION IF EXISTS public.confirm_mission_meetup(text, text, boolean);");
    expect(sql).toContain("REVOKE EXECUTE ON FUNCTION public.confirm_mission_meetup(text, text, boolean, text, text) FROM PUBLIC, anon, authenticated;");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.confirm_mission_meetup(text, text, boolean, text, text) TO service_role;");
  });

  it("un insert du navigateur reste privé", () => {
    const guard = between("CREATE OR REPLACE FUNCTION public.guard_mission_feedback_public_fields", "$function$;");
    expect(guard).toContain("IF current_user IN ('anon', 'authenticated') THEN");
    expect(guard).toContain("NEW.public_ok := false;");
    expect(guard).toContain("NEW.comment_moderation := NULL;");
    expect(sql).toContain("BEFORE INSERT OR UPDATE ON public.mission_feedbacks");
  });
});

describe("migration 0100 : preuve publique", () => {
  const view = between("CREATE OR REPLACE VIEW public.public_entraide_proofs AS", "GRANT SELECT ON public.public_entraide_proofs");

  it("les prénoms demandent le double accord", () => {
    expect(view).toContain("CASE WHEN consent.both_ok THEN hp.first_name END AS helper_first_name");
    expect(view).toContain("CASE WHEN consent.both_ok THEN op.first_name END AS owner_first_name");
    expect(view).toMatch(/fh\.giver_id = r\.responder_id AND fh\.positive AND fh\.public_ok/);
    expect(view).toMatch(/fo\.giver_id = m\.user_id AND fo\.positive AND fo\.public_ok/);
  });

  it("le mot demande l'accord et la modération « ok »", () => {
    expect(view).toContain("f2.positive AND f2.public_ok");
    expect(view).toContain("f2.comment_moderation = 'ok'");
  });

  it("garde les coordonnées arrondies à 2 décimales et les mêmes colonnes", () => {
    expect(view).toContain("round(m.latitude::numeric, 2)::double precision AS latitude_approx");
    expect(view).toContain("round(m.longitude::numeric, 2)::double precision AS longitude_approx");
    const cols = ["mission_id", "helper_first_name", "owner_first_name", "city", "latitude_approx", "longitude_approx", "word", "happened_at"];
    let last = -1;
    for (const c of cols) {
      const at = view.indexOf(c === "city" ? "m.city," : `AS ${c}`);
      expect(at, c).toBeGreaterThan(last);
      last = at;
    }
  });

  it("profil public et accueil suivent la même règle", () => {
    expect(sql).toContain("CASE WHEN comment_moderation = 'ok' THEN comment END AS comment");
    const home = between("CREATE OR REPLACE FUNCTION public.home_social_proof()", "$function$;");
    expect(home).toContain("AND f.comment_moderation = 'ok'");
    expect(home).toMatch(/f_other\.giver_id = f\.receiver_id\s+AND f_other\.positive IS TRUE AND f_other\.public_ok IS TRUE/);
  });
});

describe("migration 0100 : issue « annulé »", () => {
  const fn = between("CREATE OR REPLACE FUNCTION public.confirm_mission_meetup(", "$function$;");
  const cancelled = fn.slice(fn.indexOf("IF v_cancelled THEN"), fn.indexOf("v_word := NULLIF"));

  it("clôt le besoin sans rencontre, sans avis, sans écusson", () => {
    expect(cancelled).toContain("SET status = 'cancelled'");
    expect(cancelled).toContain("close_reason = 'meetup_cancelled'");
    expect(cancelled).toContain("'cancelled', true");
    expect(cancelled).not.toContain("mission_feedbacks");
    expect(cancelled).not.toContain("badge_attributions");
    expect(cancelled).not.toContain("meetup_confirmed");
  });

  it("consomme d'abord les jetons de la personne", () => {
    expect(fn.indexOf("UPDATE public.mission_action_tokens SET used_at = now()")).toBeLessThan(fn.indexOf("IF v_cancelled THEN"));
  });

  it("refuse une issue inconnue et garde l'écusson du lot X3b", () => {
    expect(fn).toContain("IF v_outcome NOT IN ('happened', 'not_happened', 'cancelled') THEN");
    expect(fn).toContain("IF v_helper_id IS NOT NULL AND r.helper_id = m.user_id THEN");
  });

  it("un mot sans verdict reste privé (« unchecked »)", () => {
    expect(fn).toContain("WHEN p_word_moderation IN ('ok', 'warning') THEN p_word_moderation");
    expect(fn).toContain("ELSE 'unchecked'");
  });
});

describe("journal et recette", () => {
  it("0100 est inscrite au journal", () => {
    const journal = JSON.parse(read("drizzle/migrations/meta/_journal.json"));
    expect(journal.entries.some((e: { tag: string; idx: number }) => e.tag === "0100_e19_confiance_parole_publique" && e.idx === 100)).toBe(true);
  });

  it("la recette SQL couvre les critères du lot", () => {
    const recette = read("src/__tests__/e19/recette-e19.sql");
    for (const label of [
      "invariant : aucun prénom public sans double accord",
      "invariant : aucun mot public sans accord ni modération",
      "mission_feedbacks.public_ok vaut false par défaut",
      "M3 : aucun avis enregistré, ni positif ni négatif",
      "insert direct : public_ok et modération remis à zéro",
    ]) expect(recette).toContain(label);
  });
});

describe("câblage serveur", () => {
  const quick = read("supabase/functions/mission-quick-action/index.ts");
  const moderate = read("supabase/functions/moderate-content/index.ts");

  it("mission-quick-action modère le mot avant confirm_mission_meetup", () => {
    expect(quick.indexOf("moderateMeetupWord(word")).toBeGreaterThan(0);
    expect(quick.indexOf("moderateMeetupWord(word")).toBeLessThan(quick.indexOf('service.rpc("confirm_mission_meetup"'));
    expect(quick).toContain("p_word_moderation: wordModeration");
    expect(quick).toContain("p_outcome: outcome");
    expect(quick).toContain('const publicOk = body?.public_ok === true && outcome !== "cancelled";');
    expect(quick).not.toContain("body?.public_ok === false ? false : true");
  });

  it("confirm_mission_meetup n'est appelée que par mission-quick-action", () => {
    expect(quick.match(/rpc\("confirm_mission_meetup"/g)?.length).toBe(1);
  });

  it("moderate-content retient l'adresse postale sur demande explicite d'un appel interne seulement", () => {
    expect(moderate).toContain("const h = heuristics(text, ct, { checkPostalAddress: isInternalCall && check_postal_address === true });");
    expect(moderate).toContain("const isInternalCall = authHeader === `Bearer ${SERVICE_KEY}`;");
    expect(moderate).not.toContain("detectPostalAddress");
    // Verrous des lots J2c et ERR1 inchangés.
    expect(moderate).toContain('const rule = status === "block"');
    expect(moderate).toMatch(/signal: AbortSignal\.timeout\(MODERATION_AI_TIMEOUT_MS\)/);
  });

  it("la page de l'email envoie l'issue choisie", () => {
    const page = read("src/pages/MissionQuickCanHelp.tsx");
    expect(page).toContain('onCancelled={() => void confirmMeetup("cancelled", "", false)}');
    expect(page).toContain("outcome, word: happened ? word : \"\"");
  });
});
