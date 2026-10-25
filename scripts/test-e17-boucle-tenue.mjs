// Lot E17 « La boucle tenue » (migration 0099), sur Postgres local (PGlite).
// Les fonctions non modifiées sont reprises de la production (25/10/2026) :
// accept_mission_response, emit_mission_choose_token et le garde-fou
// prevent_mission_response_status_tampering.
// Couvre : email mission-response-received avec un bouton par répondant,
// choix par jeton sans connexion (réponse acceptée, autres écartées, premier
// message, jeton à usage unique), clôture distinguée d'un refus (et reprise de
// l'existant), intention d'inscription écrite sur le profil, retrait de la
// tâche planifiée mission-choose-helper.
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const root = new URL('../', import.meta.url);
const dir = new URL('drizzle/migrations/', root);
const file = (prefix) => new URL(readdirSync(dir).find((f) => f.startsWith(prefix)), dir);
const passed = [];

await db.exec(`
CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth; CREATE SCHEMA extensions; CREATE SCHEMA vault; CREATE SCHEMA net; CREATE SCHEMA cron;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE TABLE vault.decrypted_secrets(name text, decrypted_secret text);
INSERT INTO vault.decrypted_secrets VALUES ('supabase_service_role_key', 'cle');
CREATE TABLE net.calls(id serial PRIMARY KEY, body jsonb);
CREATE FUNCTION net.http_post(url text, headers jsonb, body jsonb) RETURNS bigint LANGUAGE sql AS $$
  INSERT INTO net.calls(body) VALUES (body) RETURNING id::bigint $$;
CREATE TABLE cron.job(jobname text);
INSERT INTO cron.job VALUES ('send-mission-choose-prompt'), ('send_mission_nudges_daily');
CREATE FUNCTION cron.unschedule(p text) RETURNS boolean LANGUAGE sql AS $$ DELETE FROM cron.job WHERE jobname = p RETURNING true $$;

CREATE TYPE user_role AS ENUM('owner','sitter','both');
CREATE TYPE app_role AS ENUM('admin','user');
CREATE TYPE small_mission_status AS ENUM('open','in_progress','completed','cancelled');
CREATE TYPE small_mission_response_status AS ENUM('pending','accepted','declined','withdrawn');
CREATE TYPE small_mission_category AS ENUM('animals','house','garden','skills','transport','other','projet');
CREATE TYPE mission_type_enum AS ENUM('besoin','offre');
CREATE TYPE conversation_context AS ENUM('mission_help','other');

CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb);
CREATE TABLE profiles(id uuid PRIMARY KEY, email text, role user_role, first_name text, avatar_url text, helps_with text,
  identity_verified boolean DEFAULT false, latitude double precision, longitude double precision,
  arrival_intent text CHECK (arrival_intent IS NULL OR arrival_intent IN ('owner','sitter','entraide')));
CREATE TABLE sitter_profiles(user_id uuid PRIMARY KEY);
CREATE TABLE owner_profiles(user_id uuid PRIMARY KEY);
CREATE TABLE small_missions(id uuid PRIMARY KEY, user_id uuid, title text, slug text, category small_mission_category DEFAULT 'animals',
  mission_type mission_type_enum DEFAULT 'besoin', status small_mission_status DEFAULT 'open', close_reason text,
  latitude double precision, longitude double precision, updated_at timestamptz);
CREATE TABLE small_mission_responses(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), mission_id uuid, responder_id uuid, message text,
  status small_mission_response_status DEFAULT 'pending', created_at timestamptz DEFAULT now(), conversation_id uuid,
  exchange_date date, accepted_at timestamptz, choose_prompt_sent_at timestamptz);
CREATE TABLE notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, type text, title text, body text, link text,
  actor_name text, actor_avatar_url text, created_at timestamptz DEFAULT now());
CREATE TABLE admin_signals(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), signal_type text, severity text, entity_type text, entity_id uuid, metadata jsonb);
CREATE TABLE mission_action_tokens(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), mission_id uuid, helper_id uuid, action text, token text,
  used_at timestamptz, expires_at timestamptz DEFAULT now() + interval '14 days', created_at timestamptz DEFAULT now());
CREATE TABLE conversations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid, sitter_id uuid, small_mission_id uuid);
CREATE TABLE messages(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid, sender_id uuid, content text,
  is_system boolean DEFAULT false, created_at timestamptz DEFAULT now());

CREATE FUNCTION gen_random_bytes(n integer) RETURNS bytea LANGUAGE sql VOLATILE
  AS $$ SELECT decode(md5(random()::text||clock_timestamp()::text),'hex') $$;
CREATE FUNCTION has_role(_user_id uuid, _role app_role) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT false $$;
CREATE FUNCTION mission_link_for(p_id uuid, p_slug text, p_category text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN p_category = 'projet' THEN '/projets/' || coalesce(p_slug, p_id::text) ELSE '/petites-missions/' || p_id::text END $$;
CREATE FUNCTION get_or_create_conversation(p_other_user_id uuid, p_context_type conversation_context, p_sit_id uuid, p_small_mission_id uuid)
 RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v uuid;
BEGIN
  SELECT id INTO v FROM conversations WHERE small_mission_id = p_small_mission_id AND sitter_id = p_other_user_id;
  IF v IS NULL THEN
    INSERT INTO conversations(owner_id, sitter_id, small_mission_id) VALUES (auth.uid(), p_other_user_id, p_small_mission_id) RETURNING id INTO v;
  END IF;
  RETURN v;
END $$;

-- Production du 25/10/2026, inchangée par 0099.
CREATE FUNCTION public.emit_mission_choose_token(p_response_id uuid)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  r record;
  v_token text;
BEGIN
  SELECT resp.id, resp.mission_id, resp.responder_id INTO r
    FROM public.small_mission_responses resp WHERE resp.id = p_response_id AND resp.status = 'pending';
  IF r.id IS NULL THEN RETURN NULL; END IF;
  SELECT token INTO v_token FROM public.mission_action_tokens
   WHERE mission_id = r.mission_id AND helper_id = r.responder_id AND action = 'choose'
     AND used_at IS NULL AND expires_at > now()
   LIMIT 1;
  IF v_token IS NULL THEN
    INSERT INTO public.mission_action_tokens (mission_id, helper_id, action, token, expires_at)
    VALUES (r.mission_id, r.responder_id, 'choose', encode(gen_random_bytes(24), 'hex'), now() + interval '14 days')
    RETURNING token INTO v_token;
  END IF;
  RETURN v_token;
END;
$function$;

CREATE FUNCTION public.accept_mission_response(p_response_id uuid, p_decline_others boolean DEFAULT false)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_me uuid := auth.uid();
  v_mission_id uuid; v_owner_id uuid; v_mission_status small_mission_status; v_mission_title text;
  v_responder_id uuid; v_resp_status small_mission_response_status; v_conv_id uuid;
  v_declined_ids uuid[] := ARRAY[]::uuid[]; v_declined_count int := 0;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT r.mission_id, r.responder_id, r.status, m.user_id, m.status, m.title
    INTO v_mission_id, v_responder_id, v_resp_status, v_owner_id, v_mission_status, v_mission_title
  FROM public.small_mission_responses r JOIN public.small_missions m ON m.id = r.mission_id WHERE r.id = p_response_id;
  IF v_mission_id IS NULL THEN RAISE EXCEPTION 'response_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_owner_id <> v_me THEN RAISE EXCEPTION 'not_mission_owner' USING ERRCODE = '42501'; END IF;
  IF v_resp_status <> 'pending' THEN RAISE EXCEPTION 'response_not_pending: %', v_resp_status USING ERRCODE = '22023'; END IF;
  IF v_mission_status NOT IN ('open', 'in_progress') THEN RAISE EXCEPTION 'mission_closed: %', v_mission_status USING ERRCODE = '22023'; END IF;
  UPDATE public.small_mission_responses SET status = 'accepted', accepted_at = now() WHERE id = p_response_id;
  IF v_mission_status = 'open' THEN
    UPDATE public.small_missions SET status = 'in_progress', updated_at = now() WHERE id = v_mission_id;
  END IF;
  IF p_decline_others THEN
    WITH decl AS (
      UPDATE public.small_mission_responses SET status = 'declined'
       WHERE mission_id = v_mission_id AND id <> p_response_id AND status = 'pending'
       RETURNING responder_id
    )
    SELECT array_agg(responder_id), count(*) INTO v_declined_ids, v_declined_count FROM decl;
    v_declined_ids := COALESCE(v_declined_ids, ARRAY[]::uuid[]);
  END IF;
  v_conv_id := public.get_or_create_conversation(p_other_user_id := v_responder_id, p_context_type := 'mission_help'::conversation_context,
    p_sit_id := NULL, p_small_mission_id := v_mission_id);
  IF v_conv_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.messages WHERE conversation_id = v_conv_id AND is_system = true AND content LIKE 'Personne retenue pour%') THEN
      INSERT INTO public.messages (conversation_id, sender_id, content, is_system)
      VALUES (v_conv_id, v_me, 'Personne retenue pour « ' || COALESCE(v_mission_title, 'ce coup de main') || ' ». Vous pouvez maintenant échanger pour organiser l''entraide.', true);
    END IF;
  END IF;
  RETURN jsonb_build_object('success', true, 'response_id', p_response_id, 'mission_id', v_mission_id, 'conversation_id', v_conv_id,
    'declined_count', v_declined_count, 'declined_responder_ids', to_jsonb(v_declined_ids));
END;
$function$;

CREATE FUNCTION public.prevent_mission_response_status_tampering()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_owner uuid;
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN RETURN NEW; END IF;
  IF current_setting('guardiens.mission_closure', true) = 'on'
     AND OLD.status = 'pending'::small_mission_response_status AND NEW.status = 'declined'::small_mission_response_status
     AND NEW.responder_id IS NOT DISTINCT FROM OLD.responder_id AND NEW.mission_id IS NOT DISTINCT FROM OLD.mission_id THEN
    RETURN NEW;
  END IF;
  SELECT m.user_id INTO v_owner FROM public.small_missions m WHERE m.id = NEW.mission_id;
  IF v_owner = auth.uid() THEN RETURN NEW; END IF;
  IF auth.uid() = NEW.responder_id THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT (OLD.status = 'pending'::small_mission_response_status AND NEW.status = 'withdrawn'::small_mission_response_status) THEN
        RAISE EXCEPTION 'Le gardien ne peut que retirer sa réponse en attente';
      END IF;
    END IF;
    IF NEW.responder_id IS DISTINCT FROM OLD.responder_id OR NEW.mission_id IS DISTINCT FROM OLD.mission_id THEN
      RAISE EXCEPTION 'Modification interdite';
    END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Modification interdite';
END;
$function$;
CREATE TRIGGER trg_prevent_mission_response_status_tampering BEFORE UPDATE ON public.small_mission_responses
  FOR EACH ROW EXECUTE FUNCTION prevent_mission_response_status_tampering();
`);

// Données existantes avant 0099 : un besoin annulé avec une réponse passée en declined par l'ancienne clôture.
let n = 0;
const uid = (p) => `${p}-0000-4000-8000-${String(++n).padStart(12, '0')}`;
const owner = uid('11111111');
const helperA = uid('33333333');
const helperB = uid('33333333');
const helperC = uid('33333333');
const km = (d) => 45 + d / 111.195;
await db.query("INSERT INTO profiles(id,email,first_name,latitude,longitude) VALUES($1,'o@t.fr','Laurence',45,4.85)", [owner]);
await db.query("INSERT INTO profiles(id,email,first_name,helps_with,identity_verified,latitude,longitude) VALUES($1,'a@t.fr','camille dupont','Promener les chiens',true,$2,4.85)", [helperA, km(3)]);
await db.query("INSERT INTO profiles(id,email,first_name,latitude,longitude) VALUES($1,'b@t.fr','Karim',$2,4.85)", [helperB, km(12)]);
await db.query("INSERT INTO profiles(id,email,first_name,latitude,longitude) VALUES($1,'c@t.fr','Nadia',$2,4.85)", [helperC, km(20)]);
const legacy = uid('22222222');
await db.query("INSERT INTO small_missions(id,user_id,title,status,latitude,longitude) VALUES($1,$2,'Ancien besoin','cancelled',45,4.85)", [legacy, owner]);
const legacyResp = uid('44444444');
await db.query("INSERT INTO small_mission_responses(id,mission_id,responder_id,message,status) VALUES($1,$2,$3,'Je peux','declined')", [legacyResp, legacy, helperC]);

// Trigger notify_new_mission_response : attaché après 0099 (sa définition y est).
await db.exec(readFileSync(file('0099_'), 'utf8'));
await db.exec(`
CREATE TRIGGER trg_notify_new_mission_response AFTER INSERT OR UPDATE OF status ON public.small_mission_responses
  FOR EACH ROW EXECUTE FUNCTION notify_new_mission_response();
CREATE TRIGGER trg_close_pending_responses_on_mission_close AFTER UPDATE OF status ON public.small_missions
  FOR EACH ROW WHEN (OLD.status IN ('open','in_progress') AND NEW.status IN ('cancelled','completed'))
  EXECUTE FUNCTION close_pending_responses_on_mission_close();
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
`);
passed.push('La migration 0099 s\'applique');

assert.equal((await db.query('SELECT decline_reason FROM small_mission_responses WHERE id=$1', [legacyResp])).rows[0].decline_reason, 'mission_closed');
passed.push('Reprise : une réponse declined sur un besoin clos sans personne retenue devient une clôture');

assert.deepEqual((await db.query('SELECT jobname FROM cron.job ORDER BY 1')).rows.map((r) => r.jobname), ['send_mission_nudges_daily']);
passed.push('Tâche planifiée send-mission-choose-prompt retirée, les autres restent');

// 1. Email mission-response-received : un bouton par répondant en attente.
const m = uid('22222222');
await db.query("INSERT INTO small_missions(id,user_id,title,latitude,longitude) VALUES($1,$2,'Nourrir les poules',45,4.85)", [m, owner]);
const rA = uid('44444444');
const rB = uid('44444444');
await db.query("INSERT INTO small_mission_responses(id,mission_id,responder_id,message,exchange_date) VALUES($1,$2,$3,'Je peux samedi','2026-11-07')", [rA, m, helperA]);
await db.query("INSERT INTO small_mission_responses(id,mission_id,responder_id,message) VALUES($1,$2,$3,'Je peux aussi')", [rB, m, helperB]);
const calls = (await db.query("SELECT body FROM net.calls WHERE body->>'templateName' = 'mission-response-received' ORDER BY id")).rows;
assert.equal(calls.length, 2);
const last = calls[1].body.templateData;
assert.equal(last.responders.length, 2, 'un bouton par répondant en attente');
const [a, b] = last.responders;
assert.equal(a.firstName, 'camille');
assert.equal(a.distanceKm, 3);
assert.equal(a.helpsWith, 'Promener les chiens');
assert.equal(a.verified, true);
assert.equal(a.exchangeDate, '2026-11-07');
assert.equal(b.firstName, 'Karim');
assert.equal(b.distanceKm, 12);
assert.equal(b.helpsWith, null);
assert.equal(b.verified, false);
assert.ok(a.chooseToken && b.chooseToken && a.chooseToken !== b.chooseToken);
assert.equal(calls[0].body.templateData.responders[0].chooseToken, a.chooseToken, 'jeton réutilisé tant qu\'il reste valable');
passed.push('mission-response-received porte chaque répondant (prénom, distance, ligne, écusson, date) et son jeton');

// Un projet garde son propre parcours : aucune liste.
const projet = uid('22222222');
await db.query("INSERT INTO small_missions(id,user_id,title,category) VALUES($1,$2,'Projet','projet')", [projet, owner]);
assert.deepEqual((await db.query('SELECT mission_pending_responders($1) AS r', [projet])).rows[0].r, []);
passed.push('Un projet ne reçoit pas de boutons de choix');

// 2. Choix par jeton, sans connexion.
await db.query("SELECT set_config('request.jwt.claim.sub', '', false)");
const res = (await db.query('SELECT consume_mission_choose_token($1) AS r', [a.chooseToken])).rows[0].r;
assert.equal(res.ok, true, JSON.stringify(res));
assert.equal(res.helper_id, helperA);
assert.deepEqual(res.declined_responder_ids, [helperB]);
const statuses = Object.fromEntries((await db.query('SELECT id, status, decline_reason FROM small_mission_responses WHERE mission_id=$1', [m])).rows.map((r) => [r.id, r]));
assert.equal(statuses[rA].status, 'accepted');
assert.equal(statuses[rB].status, 'declined');
assert.equal(statuses[rB].decline_reason, null, 'une autre personne choisie reste un refus, pas une clôture');
assert.equal((await db.query('SELECT status FROM small_missions WHERE id=$1', [m])).rows[0].status, 'in_progress');
const msgs = (await db.query('SELECT content, is_system, sender_id FROM messages WHERE conversation_id=$1 ORDER BY created_at, is_system DESC', [res.conversation_id])).rows;
assert.ok(msgs.some((x) => x.is_system && x.content.startsWith('Personne retenue pour')));
const first = msgs.find((x) => !x.is_system);
assert.equal(first.sender_id, owner);
assert.equal(first.content, 'Bonjour Camille, merci ! On se cale quand pour « Nourrir les poules » ?');
const again = (await db.query('SELECT consume_mission_choose_token($1) AS r', [a.chooseToken])).rows[0].r;
assert.equal(again.reason, 'already_used');
passed.push('Le jeton accepte la réponse sans connexion, écarte les autres, ouvre la conversation avec un premier message, une seule fois');

// Conversation déjà engagée : le premier message existant est gardé.
const m2 = uid('22222222');
await db.query("INSERT INTO small_missions(id,user_id,title) VALUES($1,$2,'Arroser')", [m2, owner]);
const r2 = uid('44444444');
await db.query("INSERT INTO small_mission_responses(id,mission_id,responder_id,message) VALUES($1,$2,$3,'Je peux')", [r2, m2, helperB]);
const conv2 = uid('55555555');
await db.query('INSERT INTO conversations(id,owner_id,sitter_id,small_mission_id) VALUES($1,$2,$3,$4)', [conv2, owner, helperB, m2]);
await db.query("INSERT INTO messages(conversation_id,sender_id,content) VALUES($1,$2,'Bonjour, je passe quand ?')", [conv2, helperB]);
const t2 = (await db.query('SELECT emit_mission_choose_token($1) AS t', [r2])).rows[0].t;
assert.equal((await db.query('SELECT consume_mission_choose_token($1) AS r', [t2])).rows[0].r.ok, true);
assert.equal((await db.query('SELECT count(*)::int c FROM messages WHERE conversation_id=$1 AND NOT is_system', [conv2])).rows[0].c, 1);
passed.push('Une conversation déjà engagée garde son premier message');

// 3. Clôture distinguée d'un refus.
const m3 = uid('22222222');
await db.query("INSERT INTO small_missions(id,user_id,title) VALUES($1,$2,'Garder Filou')", [m3, owner]);
const r3 = uid('44444444');
await db.query("INSERT INTO small_mission_responses(id,mission_id,responder_id,message) VALUES($1,$2,$3,'Je peux')", [r3, m3, helperC]);
await db.query("UPDATE small_missions SET status='cancelled', close_reason='expired' WHERE id=$1", [m3]);
const closed = (await db.query('SELECT status, decline_reason FROM small_mission_responses WHERE id=$1', [r3])).rows[0];
assert.equal(closed.status, 'declined');
assert.equal(closed.decline_reason, 'mission_closed');
const split = (await db.query(`SELECT count(*) FILTER (WHERE decline_reason = 'mission_closed')::int AS clotures,
  count(*) FILTER (WHERE decline_reason IS NULL)::int AS refus FROM small_mission_responses WHERE status = 'declined'`)).rows[0];
assert.deepEqual(split, { clotures: 2, refus: 1 });
passed.push('Une requête distingue clôture (decline_reason mission_closed) et refus');

// 4. Intention d'inscription écrite sur le profil.
const u1 = uid('66666666');
const u2 = uid('66666666');
const u3 = uid('66666666');
await db.query(`INSERT INTO auth.users VALUES($1,'u1@t.fr','{"role":"both","arrival_intent":"entraide"}')`, [u1]);
await db.query(`INSERT INTO auth.users VALUES($1,'u2@t.fr','{"role":"owner","arrival_intent":"pirate"}')`, [u2]);
await db.query(`INSERT INTO auth.users VALUES($1,'u3@t.fr','{}')`, [u3]);
const intents = Object.fromEntries((await db.query('SELECT id, arrival_intent, role FROM profiles WHERE id = ANY($1)', [[u1, u2, u3]])).rows.map((r) => [r.id, r]));
assert.equal(intents[u1].arrival_intent, 'entraide');
assert.equal(intents[u1].role, 'both');
assert.equal(intents[u2].arrival_intent, null);
assert.equal(intents[u3].arrival_intent, null);
assert.equal((await db.query('SELECT count(*)::int c FROM sitter_profiles WHERE user_id=$1', [u1])).rows[0].c, 1);
passed.push('arrival_intent écrit à l\'inscription, valeur inconnue ignorée');

for (const p of passed) console.log(`ok ${p}`);
console.log(`\n${passed.length} contrôles verts.`);
