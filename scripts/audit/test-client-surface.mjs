// Local PostgreSQL (PGlite) verification; never connects to Supabase.
// Usage: GUARDIENS_PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node scripts/audit/test-client-surface.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const modulePath = process.env.GUARDIENS_PGLITE_MODULE;
if (modulePath && !modulePath.startsWith('/')) throw new Error('Provide the absolute local PGlite module path');
const { PGlite } = await import(modulePath ? pathToFileURL(modulePath).href : '@electric-sql/pglite');
const db = new PGlite();
let checks = 0;
const equal = (a, b, label) => { assert.deepEqual(a, b, label); checks++; };

const LOCKED_FUNCTIONS = [
  ['check_content_quality', 'p_seuil_alertes integer DEFAULT NULL, p_forcer_erreur boolean DEFAULT false'],
  ['claim_mission_event', '_event_type text, _mission_id uuid, _target_id uuid'],
  ['detect_low_email_delivery', ''],
  ['detect_stale_digest_queue', ''],
  ['purge_cron_run_details', 'p_batch integer DEFAULT 1000, p_retention interval DEFAULT interval \'30 days\''],
  ['recalc_seo_city_nearby_counts', ''],
  ['recalc_seo_city_page_counts', ''],
  ['recalc_seo_department_page_counts', ''],
  ['reconcile_email_click_events', 'p_message_id uuid'],
  ['refresh_sitter_reply_stats', 'p_user_id uuid'],
  ['retry_missing_geocoding', ''],
  ['increment_cp_relance', 'user_ids uuid[]'],
  ['increment_photo_analysis_quota', '_user_id uuid'],
  ['recalc_completed_sits_count', '_user_id uuid'],
  ['recalculate_cancellations', 'p_user_id uuid, p_role text'],
  ['recalculate_completed_sits', 'p_user_id uuid'],
  ['increment_redirect_hit', 'p_slug_from text'],
  ['increment_redirect_hit', 'p_slug_from text, p_scope text'],
];

try {
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
  // Surface de depart : les droits par defaut heritables qui rendaient les vues
  // modifiables via PostgREST, et les fonctions executables par le navigateur.
  await db.exec(`
    CREATE TABLE public.profiles (id uuid PRIMARY KEY, full_name text);
    CREATE VIEW public.public_profiles AS SELECT id, full_name FROM public.profiles;
    CREATE VIEW public.owner_gallery AS SELECT id FROM public.profiles;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.public_profiles TO anon, authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.owner_gallery TO anon, authenticated;
  `);
  for (const [name, args] of LOCKED_FUNCTIONS) {
    await db.exec(`CREATE FUNCTION public.${name}(${args}) RETURNS void LANGUAGE sql SECURITY DEFINER AS $fn$ SELECT NULL::void $fn$;`);
    await db.exec(`GRANT EXECUTE ON FUNCTION public.${name}(${args.replace(/ DEFAULT [^,]+/g, '')}) TO anon, authenticated;`);
  }
  await db.exec(`
    CREATE FUNCTION public.calculate_profile_completion(p_user_id uuid) RETURNS integer LANGUAGE sql SECURITY DEFINER AS $fn$ SELECT 0 $fn$;
    GRANT EXECUTE ON FUNCTION public.calculate_profile_completion(uuid) TO authenticated;
  `);

  const migration = readFileSync('drizzle/migrations/0008_client_surface_lockdown.sql', 'utf8');
  await db.exec(migration);
  // Idempotence : un second passage ne doit rien casser.
  await db.exec(migration);

  const viewWrites = await db.query(`
    SELECT g.table_name, g.grantee, g.privilege_type
    FROM information_schema.role_table_grants g
    JOIN information_schema.views v ON v.table_schema = g.table_schema AND v.table_name = g.table_name
    WHERE g.table_schema = 'public'
      AND g.grantee IN ('anon', 'authenticated', 'PUBLIC')
      AND g.privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
  `);
  equal(viewWrites.rows, [], 'aucune vue modifiable cote client');

  const stillReadable = await db.query(`
    SELECT count(*)::int AS count
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND table_name = 'public_profiles'
      AND grantee IN ('anon', 'authenticated') AND privilege_type = 'SELECT'
  `);
  equal(stillReadable.rows[0].count, 2, 'lecture des vues preservee');

  for (const [name, args] of LOCKED_FUNCTIONS) {
    const types = args.replace(/ DEFAULT [^,]+/g, '').split(',').map(a => a.trim().split(/\s+/).slice(1).join(' ')).filter(Boolean).join(', ');
    const signature = `public.${name}(${types})`;
    for (const role of ['anon', 'authenticated']) {
      const res = await db.query(`SELECT has_function_privilege($1, $2, 'EXECUTE') AS allowed`, [role, signature]);
      equal(res.rows[0].allowed, false, `${signature} refusee a ${role}`);
    }
    const svc = await db.query(`SELECT has_function_privilege('service_role', $1, 'EXECUTE') AS allowed`, [signature]);
    equal(svc.rows[0].allowed, true, `${signature} accessible au service role`);
  }

  const completion = await db.query(`SELECT has_function_privilege('authenticated', 'public.calculate_profile_completion(uuid)', 'EXECUTE') AS allowed`);
  equal(completion.rows[0].allowed, true, 'calculate_profile_completion reste accessible a authenticated');

  console.log(JSON.stringify({ checks_passed: checks, database: 'local PGlite', provider_calls: 0, production_writes: 0 }));
} finally { await db.close(); }
