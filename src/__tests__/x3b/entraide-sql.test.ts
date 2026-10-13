/**
 * Lot X3b (13/10/2026) : défauts P1 du parcours entraide, assertions
 * statiques sur la migration préparée.
 *
 * C-03 clôture et propositions en attente, C-05 push d'une proposition,
 * C-08 « reste visible » hebdomadaire, C-09 lieu obligatoire, C-10 écusson,
 * C-12 réactivation, C-22 lien d'un projet.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const sql = readFileSync("supabase/prepared-migrations/20261013140100_x3b_entraide.sql", "utf8");
const block = (start: string, end: string) => {
  const from = sql.indexOf(start);
  const to = sql.indexOf(end, from + start.length);
  expect(from, start).toBeGreaterThanOrEqual(0);
  expect(to, end).toBeGreaterThan(from);
  return sql.slice(from, to);
};
/** Lignes actives seulement (hors commentaires SQL). */
const active = (text: string) => text.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");

describe("X3b, C-03 : clôture d'un besoin", () => {
  const fn = block("CREATE OR REPLACE FUNCTION public.close_pending_responses_on_mission_close", "DROP TRIGGER IF EXISTS trg_close_pending_responses_on_mission_close");

  it("le trigger couvre tout passage d'un besoin vivant à clos ou terminé", () => {
    expect(sql).toMatch(/CREATE TRIGGER trg_close_pending_responses_on_mission_close\s+AFTER UPDATE OF status ON public\.small_missions/);
    expect(sql).toMatch(/WHEN \(OLD\.status IN \('open'::small_mission_status, 'in_progress'::small_mission_status\)\s+AND NEW\.status IN \('cancelled'::small_mission_status, 'completed'::small_mission_status\)\)/);
  });

  it("les propositions en attente passent à declined, sous drapeau éteint ensuite", () => {
    const on = fn.indexOf("set_config('guardiens.mission_closure', 'on', true)");
    const upd = fn.indexOf("UPDATE public.small_mission_responses");
    const off = fn.indexOf("set_config('guardiens.mission_closure', 'off', true)");
    expect(on).toBeGreaterThan(0);
    expect(upd).toBeGreaterThan(on);
    expect(off).toBeGreaterThan(upd);
    expect(fn).toContain("SET status = 'declined'::small_mission_response_status");
    expect(fn).toContain("AND status = 'pending'::small_mission_response_status");
  });

  it("une seule notification in-app par personne et par besoin, aucun email", () => {
    expect(fn).toContain("INSERT INTO public.notifications");
    expect(fn).toMatch(/NOT EXISTS \(\s*SELECT 1 FROM public\.notifications n\s+WHERE n\.user_id = r\.responder_id\s+AND n\.link = v_link\s+AND n\.type IN \('mission_cancelled', 'mission_declined'\)/);
    expect(fn).not.toContain("net.http_post");
    expect(fn).not.toContain("send-transactional-email");
  });

  it("une erreur ne bloque jamais la clôture", () => {
    expect(fn).toContain("EXCEPTION WHEN OTHERS THEN");
    expect(fn).toContain("RAISE WARNING 'close_pending_responses_on_mission_close");
  });

  it("R8 : « trouvé son aide » seulement après une rencontre confirmée", () => {
    const found = fn.indexOf("v_head := 'Ce coup de main a trouvé son aide';");
    const cond = fn.lastIndexOf("IF NEW.status = 'completed'::small_mission_status\n     AND NEW.close_reason = 'meetup_confirmed' THEN", found);
    expect(cond).toBeGreaterThan(0);
    expect(found).toBeGreaterThan(cond);
    expect(fn.match(/v_head := 'Ce coup de main a trouvé son aide';/g)?.length).toBe(1);
    expect(fn).toContain("v_head := 'Ce besoin est clos';");
    expect(fn).toContain("v_type := 'mission_declined';");
    expect(fn).toContain("v_type := 'mission_cancelled';");
  });

  it("textes positifs, sans tiret long", () => {
    expect(fn).toContain("Merci pour votre proposition");
    expect(fn).not.toMatch(/[—–]/);
  });

  it("les trois gardes de statut laissent passer la clôture, pending vers declined seulement", () => {
    for (const name of [
      "enforce_mission_response_status_transitions",
      "prevent_mission_response_status_tampering",
      "small_mission_responses_guard_status",
    ]) {
      const guard = block(`CREATE OR REPLACE FUNCTION public.${name}()`, "$function$;");
      expect(guard, name).toContain("current_setting('guardiens.mission_closure', true) = 'on'");
      const allow = guard.slice(guard.indexOf("guardiens.mission_closure"), guard.indexOf("RETURN NEW;", guard.indexOf("guardiens.mission_closure")));
      expect(allow, name).toMatch(/OLD\.status = 'pending'/);
      expect(allow, name).toMatch(/NEW\.status = 'declined'/);
    }
  });

  it("la reprise des 6 propositions existantes (accord du 13/10) passe par le drapeau de clôture", () => {
    const repair = sql.slice(sql.indexOf("-- Reprise de l'existant"), sql.indexOf("-- 2. C-05 ---"));
    expect(active(repair)).toContain("UPDATE public.small_mission_responses r");
    expect(repair.indexOf("PERFORM set_config('guardiens.mission_closure', 'on', true)")).toBeLessThan(repair.indexOf("UPDATE public.small_mission_responses r"));
    expect(repair).toContain("PERFORM set_config('guardiens.mission_closure', 'off', true)");
  });
});

describe("X3b, C-05 : push d'une proposition d'aide", () => {
  it("le type mission_response est admis dans la file", () => {
    expect(sql).toContain("CHECK (event_kind = ANY (ARRAY['message'::text, 'application'::text, 'mission_response'::text]))");
  });

  it("enfilage à l'insertion et à la réactivation, réglage candidatures", () => {
    const fn = block("CREATE OR REPLACE FUNCTION public.push_enqueue_on_mission_response", "DROP TRIGGER IF EXISTS trg_push_enqueue_on_mission_response");
    expect(fn).toContain("'mission_response', NEW.id, NEW.mission_id");
    expect(fn).toContain("s.enabled AND s.opt_in_applications");
    expect(fn).toContain("IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'withdrawn'::small_mission_response_status THEN");
    expect(fn).toContain("WHERE j.status IN ('accepted', 'failed', 'skipped')");
    // R7 : une réactivation relance le push au plus une fois par jour.
    expect(fn).toMatch(/WHERE j\.status IN \('accepted', 'failed', 'skipped'\)\s+AND j\.updated_at < now\(\) - interval '1 day';/);
    expect(fn).toContain("RAISE WARNING 'push_enqueue_on_mission_response error %'");
    expect(sql).toMatch(/CREATE TRIGGER trg_push_enqueue_on_mission_response\s+AFTER INSERT OR UPDATE OF status ON public\.small_mission_responses/);
  });

  it("éligibilité : proposition en attente sur un besoin ouvert de la personne prévenue", () => {
    const fn = block("CREATE OR REPLACE FUNCTION public.push_job_eligible", "$function$;");
    expect(fn).toContain("j.event_kind = 'message' AND s.opt_in_messages");
    expect(fn).toContain("j.event_kind = 'application' AND s.opt_in_applications");
    expect(fn).toContain("j.event_kind = 'mission_response' AND s.opt_in_applications");
    expect(fn).toContain("r.status='pending'::small_mission_response_status");
    expect(fn).toContain("sm.user_id=j.user_id AND r.responder_id<>j.user_id");
    expect(fn).toContain("public.blocked_users");
  });
});

describe("X3b, C-12 et C-22 : notify_new_mission_response", () => {
  const fn = block("CREATE OR REPLACE FUNCTION public.notify_new_mission_response", "DROP TRIGGER IF EXISTS trg_notify_new_mission_response");

  it("réagit à l'insertion et à la réactivation, rien d'autre", () => {
    expect(sql).toMatch(/CREATE TRIGGER trg_notify_new_mission_response\s+AFTER INSERT OR UPDATE OF status ON public\.small_mission_responses/);
    expect(fn).toMatch(/IF TG_OP = 'UPDATE' THEN\s+IF NOT \(OLD\.status = 'withdrawn'::small_mission_response_status\s+AND NEW\.status = 'pending'::small_mission_response_status\) THEN\s+RETURN NEW;/);
  });

  it("une réactivation a sa propre clé d'email, au plus une par jour (R7)", () => {
    expect(fn).toContain("'mission-response-received-' || NEW.id::text");
    expect(fn).toContain("THEN '-r' || to_char(now() AT TIME ZONE 'Europe/Paris', 'YYYYMMDD')");
    expect(fn).not.toContain("extract(epoch FROM");
    expect(fn).toContain("'idempotencyKey', v_idem");
  });

  it("un projet pointe vers /projets/{slug}, un besoin vers /petites-missions/{id}", () => {
    expect(fn).toContain("v_link := public.mission_link_for(NEW.mission_id, v_mission_slug, v_mission_category);");
    expect(fn).not.toContain("'/petites-missions/' || NEW.mission_id");
    const link = block("CREATE OR REPLACE FUNCTION public.mission_link_for", "$function$;");
    expect(link).toContain("WHEN p_category = 'projet' THEN '/projets/' || coalesce(nullif(btrim(p_slug), ''), p_id::text)");
    expect(link).toContain("ELSE '/petites-missions/' || p_id::text");
  });
});

describe("X3b, C-08 : « Votre demande reste visible »", () => {
  it("toute copie de moins de 7 jours est écartée sans erreur", () => {
    const fn = block("CREATE OR REPLACE FUNCTION public.skip_repeated_wave_empty_notification", "DROP TRIGGER IF EXISTS trg_skip_repeated_wave_empty_notification");
    expect(fn).toContain("n.created_at > now() - interval '7 days'");
    expect(fn).toContain("RETURN NULL;");
    expect(sql).toMatch(/CREATE TRIGGER trg_skip_repeated_wave_empty_notification\s+BEFORE INSERT ON public\.notifications\s+FOR EACH ROW WHEN \(NEW\.type = 'mission_wave_empty'\)/);
  });

  it("le nettoyage de l'existant (accord du 13/10) garde la plus ancienne de chaque couple", () => {
    const cleanup = sql.slice(sql.indexOf("-- Nettoyage de l'existant"), sql.indexOf("-- 5. C-09 ---"));
    expect(active(cleanup)).toContain("DELETE FROM public.notifications n");
    expect(cleanup).toContain("WHERE type = 'mission_wave_empty'");
    expect(cleanup).toContain("d.rang > 1");
  });
});

describe("X3b, C-09 : lieu situé obligatoire", () => {
  const fn = block("CREATE OR REPLACE FUNCTION public.enforce_small_mission_place", "DROP TRIGGER IF EXISTS trg_enforce_small_mission_place");
  it("refus avant insertion hors projets, avec l'indice lu par le formulaire", () => {
    expect(sql).toMatch(/CREATE TRIGGER trg_enforce_small_mission_place\s+BEFORE INSERT ON public\.small_missions/);
    expect(fn).toContain("NEW.category::text IS DISTINCT FROM 'projet'");
    expect(fn).toContain("(NEW.latitude IS NULL OR NEW.longitude IS NULL)");
    expect(fn).toContain("HINT = 'mission_place_missing'");
  });
  it("même message que resolveMissionCoords (lot E10)", async () => {
    const { MISSION_PLACE_NOT_FOUND } = await import("@/lib/missionPlace");
    expect(fn).toContain(MISSION_PLACE_NOT_FOUND.replace(/'/g, "''"));
  });
  it("le besoin de Mascouche (accord du 13/10) est clos, une seule ligne visée", () => {
    const mascouche = sql.slice(sql.indexOf("-- Besoin de Mascouche"), sql.indexOf("-- 6. C-10 ---"));
    expect(active(mascouche)).toContain("WHERE id = 'c54f53ff-8683-49be-b8af-b2236cd43908' AND status = 'open'::small_mission_status");
    expect(mascouche).toContain("IF FOUND THEN");
  });
  it("le formulaire renvoie à l'étape du lieu sur ce refus", () => {
    const form = readFileSync("src/pages/CreateSmallMission.tsx", "utf8");
    expect(form).toContain('hint === "mission_place_missing"');
  });
});

describe("X3b, C-10 : écusson « coup de main en or »", () => {
  it("mark_mission_done : attribué quand l'auteur termine", () => {
    const fn = block("CREATE OR REPLACE FUNCTION public.mark_mission_done", "$function$;");
    expect(fn).toContain("IF v_helper_id IS NOT NULL AND v_uid = m.user_id THEN");
    expect(fn).not.toContain("AND v_uid = v_helper_id THEN");
    expect(fn).toContain("VALUES (v_helper_id, 'coup_de_main_or', m.user_id, m.id, false)");
  });
  it("confirm_mission_meetup : attribué sur le « oui » de l'auteur", () => {
    const fn = block("CREATE OR REPLACE FUNCTION public.confirm_mission_meetup", "$function$;");
    expect(fn).toContain("IF v_helper_id IS NOT NULL AND r.helper_id = m.user_id THEN");
    expect(fn).not.toContain("AND r.helper_id = v_helper_id THEN");
    // Lot E10 conservé : un « non » tardif garde une rencontre confirmée.
    expect(fn).toContain("ELSIF m.status = 'cancelled' OR (m.status = 'completed' AND m.close_reason IS NOT DISTINCT FROM 'meetup_confirmed') THEN");
  });
});

describe("X3b, fichier", () => {
  it("aucun tiret long, commentaires en français", () => {
    expect(sql).not.toMatch(/[—–]/);
    expect(sql.startsWith("-- Lot X3b")).toBe(true);
  });
});
