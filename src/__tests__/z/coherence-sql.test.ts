/**
 * Lot Z (14/10/2026) : verrou statique de la migration de cohérence
 * (notifications mortes, avis, gardes réalisées, droits). La CI n'a pas
 * accès à la base ; les contrôles en base sont inscrits, commentés, à la fin
 * du fichier SQL.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const FILE = "supabase/prepared-migrations/20261014090000_z_coherence.sql";
const raw = readFileSync(FILE, "utf8");
/** Le SQL exécuté, sans les commentaires de ligne. */
const sql = raw.replace(/--[^\n]*/g, "");

/** Texte exécuté entre deux repères (le second exclu). */
function between(start: string, end: string): string {
  const i = sql.indexOf(start);
  expect(i, `repère absent : ${start}`).toBeGreaterThanOrEqual(0);
  const j = sql.indexOf(end, i + start.length);
  expect(j, `repère de fin absent : ${end}`).toBeGreaterThan(i);
  return sql.slice(i, j);
}

function fnBody(name: string): string {
  return between(`CREATE OR REPLACE FUNCTION public.${name}(`, "$function$;");
}

describe("Z, forme du fichier", () => {
  it("contient les blocs Z1 à Z13", () => {
    for (let k = 1; k <= 13; k++) expect(raw).toContain(`-- Z${k}.`);
  });

  it("aucun accès au coffre de secrets", () => {
    expect(raw.toLowerCase()).not.toContain("vault");
  });

  it("aucun tiret cadratin ni demi-cadratin", () => {
    expect(raw).not.toMatch(new RegExp("[\\u2013\\u2014]"));
  });

  it("rejouable : DROP ... IF EXISTS avant chaque CREATE POLICY ou CREATE TRIGGER", () => {
    const policies = [...sql.matchAll(/CREATE POLICY\s+("[^"]+"|\w+)\s+ON\s+([\w.]+)/g)];
    expect(policies.length).toBe(2);
    for (const [, name, table] of policies) {
      expect(sql).toContain(`DROP POLICY IF EXISTS ${name} ON ${table};`);
    }
    const triggers = [...sql.matchAll(/CREATE TRIGGER\s+(\w+)/g)];
    for (const [, name] of triggers) expect(sql).toMatch(new RegExp(`DROP TRIGGER IF EXISTS ${name} ON`));
    expect(sql).not.toMatch(/CREATE FUNCTION/);
    expect(sql).not.toMatch(/DROP FUNCTION/);
  });

  it("chaque REVOKE nomme PUBLIC, anon et authenticated", () => {
    const revokes = [...sql.matchAll(/REVOKE[^;]+;/g)].map((m) => m[0]);
    expect(revokes.length).toBeGreaterThanOrEqual(10);
    for (const r of revokes) expect(r).toMatch(/FROM PUBLIC, anon, authenticated;$/);
  });

  it("aucun GRANT à anon, authenticated ou PUBLIC", () => {
    const grants = [...sql.matchAll(/GRANT[^;]+;/g)].map((m) => m[0]);
    for (const g of grants) expect(g).toMatch(/TO service_role;$/);
  });

  it("13 contrôles commentés en fin de fichier", () => {
    const tail = raw.slice(raw.indexOf("-- Z13."));
    expect(tail).toContain("doit renvoyer 0 ligne");
    expect(tail.split("\n").every((l) => l.trim() === "" || l.startsWith("--"))).toBe(true);
    expect((tail.match(/-- SELECT /g) ?? []).length).toBeGreaterThanOrEqual(13);
  });
});

describe("Z, décisions inscrites", () => {
  it("AGENTS.md porte les quatre décisions du lot Z avant le bloc Lovable", () => {
    const agents = readFileSync("AGENTS.md", "utf8");
    const lovable = agents.indexOf("<!-- LOVABLE:BEGIN -->");
    for (const head of [
      "Notifications mortes et doublons (lot Z)",
      "Avis (lot Z)",
      "Gardes réalisées (lot Z)",
      "Droits (lot Z)",
    ]) {
      const at = agents.indexOf(head);
      expect(at, head).toBeGreaterThan(-1);
      if (lovable > -1) expect(at).toBeLessThan(lovable);
    }
  });
});

describe("Z1 et Z2, notifications mortes", () => {
  it("trigger de purge des new_sit_nearby quand une annonce quitte l'état publié", () => {
    const fn = fnBody("purge_unread_new_sit_nearby_of_sit");
    expect(fn).toContain("SECURITY DEFINER");
    expect(fn).toContain("SET search_path TO 'public'");
    expect(fn).toContain("n.read_at IS NULL");
    expect(fn).toContain("n.type = 'new_sit_nearby'");
    expect(fn).toContain("n.link = v_base OR n.link LIKE v_base || '?%' OR n.link LIKE v_base || '#%'");
    expect(sql).toMatch(
      /CREATE TRIGGER trg_purge_new_sit_nearby_on_unpublish\s+AFTER UPDATE OF status ON public\.sits\s+FOR EACH ROW\s+WHEN \(OLD\.status = 'published'::sit_status AND NEW\.status <> 'published'::sit_status\)/,
    );
    expect(sql).toContain(
      "REVOKE EXECUTE ON FUNCTION public.purge_unread_new_sit_nearby_of_sit() FROM PUBLIC, anon, authenticated;",
    );
  });

  it("rattrapage des new_sit_nearby non lues vers une annonce non publiée", () => {
    const del = between("DELETE FROM public.notifications n\n WHERE n.type = 'new_sit_nearby'", ");");
    expect(del).toContain("n.read_at IS NULL");
    expect(del).toContain("NOT EXISTS");
    expect(del).toContain("s.status = 'published'::sit_status");
    expect(raw).toContain("4 535");
  });

  it("la purge d'un besoin annulé couvre aussi mission_wave_relaunch, branche DELETE inchangée", () => {
    const fn = fnBody("purge_unread_notifications_of_mission");
    expect(fn).toContain("n.type IN ('mission_help_needed', 'mission_wave_relaunch')");
    expect(fn).toContain("OR (OLD.slug IS NOT NULL AND n.link = '/projets/' || OLD.slug)");
    const del = between(
      "DELETE FROM public.notifications n\n WHERE n.type IN ('mission_help_needed', 'mission_wave_relaunch')",
      ");",
    );
    expect(del).toContain("n.read_at IS NULL");
    expect(del).toContain("m.status IN ('cancelled'::small_mission_status, 'completed'::small_mission_status)");
  });
});

describe("Z3 et Z4, avis", () => {
  it("publish_stale_reviews ne publie que les avis en attente, non masqués, hors annulation", () => {
    const fn = fnBody("publish_stale_reviews");
    expect(fn).toContain("published = false");
    expect(fn).toContain("moderation_status = 'en_attente'");
    expect(fn).toContain("moderation_hidden_at IS NULL");
    expect(fn).toContain("review_type IS DISTINCT FROM 'annulation'");
    expect(fn).toContain("PERFORM set_config('app.review_publisher', 'on', true);");
    expect(fn).toContain("PERFORM set_config('app.review_publisher', 'off', true);");
  });

  it("auto_publish_reviews : réciprocité entre avis de garde de deux auteurs", () => {
    const fn = fnBody("auto_publish_reviews");
    expect(fn).toMatch(/IF v_sit_id IS NULL OR COALESCE\(NEW\.review_type, 'garde'\) <> 'garde' THEN\s+RETURN NEW;/);
    expect(fn).toContain("AND reviewer_id <> NEW.reviewer_id");
    const update = fn.slice(fn.indexOf("UPDATE public.reviews"));
    expect(update).toContain("COALESCE(review_type, 'garde') = 'garde'");
    expect(update).toContain("moderation_status = 'en_attente'");
    expect(update).toContain("moderation_hidden_at IS NULL");
  });

  it("le membre évalué ne lit plus un avis non publié", () => {
    const pol = between('CREATE POLICY "Published reviews are viewable by authenticated users"', ";");
    expect(pol).toContain("TO authenticated");
    expect(pol).toContain("(published = true) OR (auth.uid() = reviewer_id)");
    expect(pol).not.toContain("reviewee_id");
  });

  it("/mes-avis ne lit les avis reçus que publiés", () => {
    const page = readFileSync("src/pages/MesAvis.tsx", "utf8");
    expect(page).toMatch(/\.eq\("reviewee_id", user\.id\)\s*\.eq\("published", true\)/);
  });
});

describe("Z5, gardes réalisées", () => {
  it("une seule formule, celle de sit_is_reviewable", () => {
    const count = fnBody("count_completed_sits");
    expect(count).toContain("a.status = 'accepted'");
    expect(count).toContain("public.sit_is_reviewable(a.sit_id)");
    expect(count).toContain("COUNT(DISTINCT a.sit_id)");
    const recalc = fnBody("recalculate_completed_sits");
    expect(recalc).toContain("public.count_completed_sits(p_user_id)");
    expect(recalc).toContain("set_config('app.allow_internal_profile_update', 'on', true)");
    expect(recalc).toContain("COALESCE(NULLIF(v_prev, ''), 'off')");
    expect(fnBody("recalc_completed_sits_count")).toContain("PERFORM public.recalculate_completed_sits(_user_id);");
    const trg = fnBody("trg_reviews_recalc_completed_sits");
    expect(trg).toContain("public.recalculate_completed_sits(");
    expect(trg).not.toContain("recalc_completed_sits_count");
    expect(sql).not.toMatch(/r\.published = true/);
  });

  it("recalcul de tous les profils, gardé par IS DISTINCT FROM", () => {
    const block = between("DO $$\nBEGIN\n  PERFORM set_config('app.allow_internal_profile_update'", "END $$;");
    expect(block).toContain(
      "WHERE p.completed_sits_count IS DISTINCT FROM public.count_completed_sits(p.id);",
    );
    expect(block).toContain("set_config('app.allow_internal_profile_update', 'off', true)");
  });
});

describe("Z6 à Z9, droits", () => {
  it("award_badge et email_queue_dispatch réservées au service_role", () => {
    expect(sql).toContain(
      "REVOKE EXECUTE ON FUNCTION public.award_badge(text, uuid, uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;",
    );
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.award_badge(text, uuid, uuid, uuid, boolean) TO service_role;");
    expect(sql).toContain("REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.email_queue_dispatch() TO service_role;");
    expect(sql).not.toMatch(/FUNCTION public\.email_queue_dispatch\(\)\s+RETURNS/);
  });

  it("aucun appel à award_badge depuis le site", () => {
    const files = [
      "src/components/gardes/AccordDeGarde.tsx",
      "src/pages/LeaveReview.tsx",
      "src/pages/MesAvis.tsx",
    ];
    for (const f of files) expect(readFileSync(f, "utf8")).not.toContain("award_badge");
  });

  it("garde_accords : plus d'insertion directe, accords effacés à la republication", () => {
    expect(sql).toContain("DROP POLICY IF EXISTS garde_accords_sitter_insert ON public.garde_accords;");
    expect(sql).not.toMatch(/CREATE POLICY garde_accords_sitter_insert/);
    const fn = fnBody("create_avis_annulation");
    const republish = fn.indexOf("status = 'published'");
    const purge = fn.indexOf("DELETE FROM public.garde_accords WHERE garde_id = p_sit_id;");
    const notif = fn.indexOf("'sit_republished'");
    expect(republish).toBeGreaterThan(0);
    expect(purge).toBeGreaterThan(republish);
    expect(notif).toBeGreaterThan(purge);
    expect(fn).toContain("ON CONFLICT (sit_id, reviewer_id) WHERE review_type = 'annulation' DO NOTHING");
    const accord = readFileSync("src/components/gardes/AccordDeGarde.tsx", "utf8");
    expect(accord).not.toMatch(/from\("garde_accords"\)\s*\.(insert|upsert)/);
  });

  it("guide de la maison : le gardien ne lit qu'un guide publié", () => {
    const pol = between("CREATE POLICY sitter_view_house_guide_during_sit ON public.house_guides", ";");
    expect(pol).toContain("house_guides.published = true");
    expect(pol).toContain("(user_id = auth.uid())");
    expect(pol).toContain("has_role(auth.uid(), 'admin'::app_role)");
  });
});

describe("Z11, doublons à l'acceptation", () => {
  it("notify_sit_confirmed n'écrit plus au gardien qui vient de recevoir application_accepted", () => {
    const fn = fnBody("notify_sit_confirmed");
    expect(fn).toContain("n.type = 'application_accepted'");
    expect(fn).toContain("n.created_at >= now() - interval '1 minute'");
    expect(fn).toContain("'sit_confirmed'");
  });

  it("accept_application n'insère plus dans sit_status_history", () => {
    const fn = fnBody("accept_application");
    expect(fn).not.toContain("INSERT INTO sit_status_history");
    expect(fn).toContain("UPDATE applications SET status = 'accepted' WHERE id = p_application_id;");
    expect(fn).toContain("SET status = 'confirmed'");
  });
});

describe("Z12, données", () => {
  it("sitter_profiles manquants des comptes actifs", () => {
    const ins = between("INSERT INTO public.sitter_profiles (user_id)", "ON CONFLICT (user_id) DO NOTHING;");
    expect(ins).toContain("p.role IN ('sitter', 'both')");
    expect(ins).toContain("p.account_status = 'active'");
  });

  it("FAQ : « dashboard » devient « tableau de bord », remplacement gardé", () => {
    const up = between("UPDATE public.faq_entries", ";");
    expect(up).toContain("replace(answer, 'dashboard', 'tableau de bord')");
    expect(up).toContain("id = 'f8571b95-5542-4527-b7bb-fba63fb5bfd6'");
    expect(up).toContain("position('dashboard' IN answer) > 0");
  });
});
