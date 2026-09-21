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
    CREATE TABLE public.profiles (
      id uuid PRIMARY KEY,
      full_name text,
      first_name text,
      avatar_url text,
      city text,
      latitude double precision,
      longitude double precision,
      helps_with text,
      account_status text,
      available_for_help boolean
    );
    CREATE TYPE public.small_mission_status AS ENUM ('open', 'in_progress', 'completed', 'cancelled');
    CREATE TYPE public.mission_type_enum AS ENUM ('besoin', 'offre', 'projet');
    CREATE TABLE public.small_missions (
      id uuid PRIMARY KEY,
      status public.small_mission_status,
      mission_type public.mission_type_enum,
      moderation_hidden_at timestamptz,
      hidden_at timestamptz
    );
    CREATE TABLE public.small_mission_responses (id uuid PRIMARY KEY, mission_id uuid REFERENCES public.small_missions(id));
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
  const helpersMigration = readFileSync('drizzle/migrations/0012_entraide_public_helpers.sql', 'utf8');
  await db.exec(helpersMigration);
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

  const helperColumns = await db.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'public_helpers'
    ORDER BY ordinal_position
  `);
  equal(
    helperColumns.rows.map((row) => row.column_name),
    ['id', 'first_name', 'avatar_url', 'city', 'latitude_approx', 'longitude_approx', 'helps_with'],
    'public_helpers expose uniquement les colonnes autorisees',
  );
  await db.exec(`
    INSERT INTO public.profiles (id, first_name, city, latitude, longitude, helps_with, account_status, available_for_help)
    VALUES ('00000000-0000-0000-0000-000000000001', 'Camille', 'Lyon', 45.764043, 4.835659, 'Arroser les plantes', 'active', true);
    SET ROLE anon;
  `);
  const anonHelpers = await db.query('SELECT first_name, city, helps_with FROM public.public_helpers');
  equal(anonHelpers.rows.length, 1, 'anon lit les membres disponibles');
  await db.exec('RESET ROLE;');
  const helperWrites = await db.query(`
    SELECT privilege_type FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND table_name = 'public_helpers'
      AND grantee IN ('anon', 'authenticated') AND privilege_type <> 'SELECT'
  `);
  equal(helperWrites.rows, [], 'public_helpers reste en lecture seule cote client');

  // Lot 3 : les vues de preuve, prenoms et ville seulement, lecture seule.
  await db.exec(`
    ALTER TABLE public.small_missions ADD COLUMN user_id uuid;
    ALTER TABLE public.small_missions ADD COLUMN city text;
    ALTER TABLE public.small_missions ADD COLUMN latitude double precision;
    ALTER TABLE public.small_missions ADD COLUMN longitude double precision;
    ALTER TABLE public.small_missions ADD COLUMN close_reason text;
    ALTER TABLE public.small_mission_responses ADD COLUMN responder_id uuid;
    ALTER TABLE public.small_mission_responses ADD COLUMN status text;
    CREATE TABLE public.mission_feedbacks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      mission_id uuid,
      giver_id uuid,
      receiver_id uuid,
      positive boolean,
      comment text,
      public_ok boolean DEFAULT true,
      created_at timestamptz DEFAULT now()
    );
  `);
  const lot3 = readFileSync('drizzle/migrations/0013_entraide_meetup_and_proof.sql', 'utf8');
  const proofSql = lot3.slice(lot3.indexOf('CREATE OR REPLACE VIEW public.public_entraide_proofs'));
  await db.exec(proofSql);

  const proofColumns = await db.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'public_entraide_proofs'
    ORDER BY ordinal_position
  `);
  equal(
    proofColumns.rows.map((row) => row.column_name),
    ['mission_id', 'helper_first_name', 'owner_first_name', 'city', 'latitude_approx', 'longitude_approx', 'word', 'happened_at'],
    'public_entraide_proofs expose uniquement prenoms, ville, mot et date',
  );

  const proofWrites = await db.query(`
    SELECT privilege_type FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND table_name IN ('public_entraide_proofs', 'public_help_counts')
      AND grantee IN ('anon', 'authenticated') AND privilege_type <> 'SELECT'
  `);
  equal(proofWrites.rows, [], 'les vues de preuve restent en lecture seule cote client');

  await db.exec(`
    INSERT INTO public.profiles (id, first_name, account_status)
    VALUES ('00000000-0000-0000-0000-000000000002', 'Laurence', 'active');
    INSERT INTO public.small_missions (id, status, mission_type, user_id, city, latitude, longitude, close_reason)
    VALUES ('00000000-0000-0000-0000-0000000000aa', 'completed', 'besoin', '00000000-0000-0000-0000-000000000002', 'Annecy', 45.9, 6.13, 'meetup_confirmed');
    INSERT INTO public.small_mission_responses (id, mission_id, responder_id, status)
    VALUES ('00000000-0000-0000-0000-0000000000bb', '00000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-000000000001', 'accepted');
    INSERT INTO public.mission_feedbacks (mission_id, giver_id, receiver_id, positive, comment, public_ok)
    VALUES ('00000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', true, 'Un vrai plaisir.', true);
    SET ROLE anon;
  `);
  const anonProofs = await db.query('SELECT helper_first_name, owner_first_name, city, word FROM public.public_entraide_proofs');
  equal(anonProofs.rows.length, 1, 'anon lit une rencontre confirmee');
  equal(anonProofs.rows[0].helper_first_name, 'Camille', 'la preuve porte le prenom de la personne qui a aide');
  equal(anonProofs.rows[0].word, 'Un vrai plaisir.', 'le mot autorise est visible');
  const anonCounts = await db.query('SELECT user_id, given_count, received_count FROM public.public_help_counts ORDER BY given_count DESC');
  equal(anonCounts.rows[0].given_count, 1, 'le compteur de coups de main donnes est juste');
  equal(anonCounts.rows[1].received_count, 1, 'le compteur de coups de main recus est juste');
  await db.exec('RESET ROLE;');

  await db.exec('UPDATE public.mission_feedbacks SET public_ok = false;');
  const hiddenWord = await db.query('SELECT word FROM public.public_entraide_proofs');
  equal(hiddenWord.rows[0].word, null, 'un mot non autorise reste hors de la preuve publique');


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
