// Lot I2 : joue la migration des propositions privées sur un Postgres local
// (PGlite), sans aucune requête de production. Schéma minimal reproduisant
// l'état en base du 11/10/2026 (sit_invitations, politiques, déclencheurs).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const root = new URL('../', import.meta.url);
const migration = readFileSync(
  new URL('supabase/prepared-migrations/20261011150000_sit_private_proposals.sql', root),
  'utf8',
);

const db = new PGlite();

const OWNER = '10000000-0000-4000-8000-000000000001';
const SITTER = '20000000-0000-4000-8000-000000000002';
const SITTER2 = '20000000-0000-4000-8000-000000000003';
const SITTER3 = '20000000-0000-4000-8000-000000000004';
const SITTER4 = '20000000-0000-4000-8000-000000000005';
const OTHER_OWNER = '30000000-0000-4000-8000-000000000006';
const PROP = '40000000-0000-4000-8000-000000000007';
const SIT = '50000000-0000-4000-8000-000000000008';
const SIT_INCOMPLETE = '50000000-0000-4000-8000-000000000009';
const SIT_PUBLISHED = '50000000-0000-4000-8000-00000000000a';

await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  CREATE TYPE sit_status AS ENUM ('draft','published','confirmed','in_progress','completed','cancelled','archived','expired');
  CREATE TYPE user_role AS ENUM ('owner','sitter','both');
  CREATE TYPE application_status AS ENUM ('pending','viewed','discussing','accepted','rejected','cancelled');
  CREATE TYPE pet_species AS ENUM ('dog','cat');
  CREATE TABLE profiles (id uuid PRIMARY KEY, first_name text, avatar_url text,
    identity_verified boolean, city text, role user_role, account_status text DEFAULT 'active');
  CREATE TABLE properties (id uuid PRIMARY KEY, user_id uuid, type text, environment text,
    bedrooms_count integer, description text, photos text[]);
  CREATE TABLE owner_gallery (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid,
    photo_url text, position integer);
  CREATE TABLE pets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), property_id uuid,
    name text, species pet_species);
  CREATE TABLE sits (id uuid PRIMARY KEY, user_id uuid, property_id uuid, title text,
    start_date date, end_date date, flexible_dates boolean, city text,
    specific_expectations text, cover_photo_url text, status sit_status DEFAULT 'draft');
  CREATE TABLE applications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sit_id uuid REFERENCES sits(id), sitter_id uuid, message text,
    status application_status DEFAULT 'pending', created_at timestamptz DEFAULT now(),
    CONSTRAINT applications_sit_sitter_unique UNIQUE (sit_id, sitter_id));
  CREATE TABLE notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid,
    type text, title text, body text, link text, actor_name text, actor_avatar_url text,
    created_at timestamptz DEFAULT now());

  CREATE TABLE sit_invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sit_id uuid NOT NULL REFERENCES sits(id) ON DELETE CASCADE,
    owner_id uuid NOT NULL, sitter_id uuid NOT NULL, message text,
    status text NOT NULL DEFAULT 'sent'
      CONSTRAINT sit_invitations_status_check CHECK (status IN ('sent','viewed','applied','declined')),
    created_at timestamptz NOT NULL DEFAULT now(), viewed_at timestamptz, responded_at timestamptz,
    CONSTRAINT sit_invitations_check CHECK (owner_id <> sitter_id),
    CONSTRAINT sit_invitations_sit_id_sitter_id_key UNIQUE (sit_id, sitter_id));
  ALTER TABLE sit_invitations ENABLE ROW LEVEL SECURITY;

  CREATE FUNCTION check_invitation_quota(_owner_id uuid) RETURNS boolean
  LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  DECLARE v_count int;
  BEGIN
    SELECT COUNT(*) INTO v_count FROM public.sit_invitations
    WHERE owner_id = _owner_id AND created_at > now() - interval '24 hours';
    RETURN v_count < 20;
  END; $$;
  CREATE POLICY "owners insert invitations on own sits" ON sit_invitations FOR INSERT
    WITH CHECK ((owner_id = auth.uid()) AND (EXISTS (SELECT 1 FROM sits s
      WHERE s.id = sit_invitations.sit_id AND s.user_id = auth.uid() AND s.status = 'published'::sit_status))
      AND check_invitation_quota(auth.uid()));
  CREATE POLICY "sitters update their invitations" ON sit_invitations FOR UPDATE
    USING (sitter_id = auth.uid()) WITH CHECK (sitter_id = auth.uid());

  CREATE FUNCTION mark_invitation_applied() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
  BEGIN
    UPDATE public.sit_invitations SET status = 'applied', responded_at = now()
    WHERE sit_id = NEW.sit_id AND sitter_id = NEW.sitter_id AND status IN ('sent','viewed');
    RETURN NEW;
  END; $$;
  CREATE TRIGGER trg_mark_invitation_applied AFTER INSERT ON applications
    FOR EACH ROW EXECUTE FUNCTION mark_invitation_applied();

  CREATE FUNCTION notify_sit_invitation() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (NEW.sitter_id, 'sit_invitation', 'Invitation à candidater', 'ancien corps', '/sits/' || NEW.sit_id);
    RETURN NEW;
  END; $$;
  CREATE TRIGGER trg_notify_sit_invitation AFTER INSERT ON sit_invitations
    FOR EACH ROW EXECUTE FUNCTION notify_sit_invitation();

  INSERT INTO profiles (id, first_name, city, role) VALUES
    ('${OWNER}', 'Camille', 'Tassin-la-Demi-Lune', 'owner'),
    ('${OTHER_OWNER}', 'Autre', 'Lyon', 'owner'),
    ('${SITTER}', 'Hélène', 'Écully', 'sitter'),
    ('${SITTER2}', 'Paul', 'Lyon', 'both'),
    ('${SITTER3}', 'Inès', 'Lyon', 'sitter'),
    ('${SITTER4}', 'Marc', 'Lyon', 'sitter');
  INSERT INTO properties (id, user_id, type, photos) VALUES
    ('${PROP}', '${OWNER}', 'house', ARRAY['https://x.test/chambre.jpg', 'https://x.test/cuisine.jpg']);
  INSERT INTO pets (property_id, name, species) VALUES ('${PROP}', 'Pépin', 'cat');
  INSERT INTO sits (id, user_id, property_id, title, start_date, end_date, city, specific_expectations, cover_photo_url, status) VALUES
    ('${SIT}', '${OWNER}', '${PROP}', 'Noël à Tassin', current_date + 30, current_date + 37, NULL,
     'Deux chats câlins et un potager à arroser tous les deux jours.', 'https://x.test/chambre.jpg', 'draft'),
    ('${SIT_INCOMPLETE}', '${OTHER_OWNER}', NULL, 'Brouillon', NULL, NULL, NULL, 'court', NULL, 'draft'),
    ('${SIT_PUBLISHED}', '${OWNER}', '${PROP}', 'Publiée', current_date + 60, current_date + 65, 'Tassin',
     'Une description suffisamment longue pour être publiée.', NULL, 'published');
`);
await db.exec(`UPDATE profiles SET city = NULL WHERE id = '${OTHER_OWNER}'`);

await db.exec(migration);
// Rejouable : aucune erreur à la seconde application.
await db.exec(migration);

const as = (uid) => db.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [uid ?? '']);
const one = async (sql, params = []) => (await db.query(sql, params)).rows[0];
const rejects = async (sql, params, pattern) => {
  await assert.rejects(db.query(sql, params), (err) => {
    assert.match(String(err.message), pattern);
    return true;
  });
};
const passed = [];
const test = async (name, fn) => { await fn(); passed.push(name); };

await test('bloquants listés pour un brouillon incomplet', async () => {
  await as(OTHER_OWNER);
  const r = await one(`SELECT sit_proposal_blockers($1) AS b`, [SIT_INCOMPLETE]);
  assert.deepEqual(r.b, ['city', 'dates', 'photo', 'description']);
});

await test('bloquants réservés au propriétaire de la garde', async () => {
  await as(SITTER);
  await rejects(`SELECT sit_proposal_blockers($1)`, [SIT_INCOMPLETE], /not_owner/);
});

await test('aucun bloquant pour une garde complète (commune reprise du profil)', async () => {
  await as(OWNER);
  const r = await one(`SELECT sit_proposal_blockers($1) AS b`, [SIT]);
  assert.deepEqual(r.b, []);
});

await test('proposition refusée tant que la garde est incomplète', async () => {
  await as(OTHER_OWNER);
  await rejects(`SELECT create_sit_proposal($1, $2, 'Bonjour')`, [SIT_INCOMPLETE, SITTER],
    /sit_incomplete: city,dates,photo,description/);
});

await test('une garde publiée passe par l invitation existante', async () => {
  await as(OWNER);
  await rejects(`SELECT create_sit_proposal($1, $2, NULL)`, [SIT_PUBLISHED, SITTER], /sit_not_draft/);
});

await test('un propriétaire seul ne reçoit pas de proposition', async () => {
  await as(OWNER);
  await rejects(`SELECT create_sit_proposal($1, $2, NULL)`, [SIT, OTHER_OWNER], /sitter_unavailable/);
  await rejects(`SELECT create_sit_proposal($1, $2, NULL)`, [SIT, OWNER], /sitter_unavailable/);
});

let proposal;
await test('proposition privée créée : 5 jours, commune reprise, notification privée', async () => {
  await as(OWNER);
  proposal = (await one(`SELECT create_sit_proposal($1, $2, '  Bonjour Hélène  ') AS id`, [SIT, SITTER])).id;
  const row = await one(`SELECT kind, status, message, round(extract(epoch FROM expires_at - created_at) / 86400) AS days FROM sit_invitations WHERE id = $1`, [proposal]);
  assert.deepEqual({ ...row, days: Number(row.days) }, { kind: 'private', status: 'sent', message: 'Bonjour Hélène', days: 5 });
  assert.equal((await one(`SELECT city FROM sits WHERE id = $1`, [SIT])).city, 'Tassin-la-Demi-Lune');
  const n = await one(`SELECT title, link, body FROM notifications WHERE user_id = $1 AND type = 'sit_invitation'`, [SITTER]);
  assert.equal(n.title, 'Une garde vous est proposée');
  assert.equal(n.link, `/propositions/${proposal}`);
  assert.match(n.body, /visible que par vous/);
  assert.doesNotMatch(n.body, /[\u2014\u2013]/);
});

await test('une seconde proposition au même gardien est refusée', async () => {
  await as(OWNER);
  await rejects(`SELECT create_sit_proposal($1, $2, NULL)`, [SIT, SITTER], /already_proposed/);
});

await test('au plus 3 propositions ouvertes par garde', async () => {
  await as(OWNER);
  await one(`SELECT create_sit_proposal($1, $2, NULL)`, [SIT, SITTER2]);
  await one(`SELECT create_sit_proposal($1, $2, NULL)`, [SIT, SITTER3]);
  await rejects(`SELECT create_sit_proposal($1, $2, NULL)`, [SIT, SITTER4], /proposal_open_limit/);
});

await test('le client ne crée pas de proposition privée en direct', async () => {
  const p = await one(`SELECT with_check FROM pg_policies WHERE policyname = 'owners insert invitations on own sits'`);
  assert.match(p.with_check, /kind = 'invite'/);
  assert.match(p.with_check, /expires_at IS NULL/);
});

await test('lecture refusée à un tiers, sans révéler l existence', async () => {
  await as(OTHER_OWNER);
  await rejects(`SELECT get_sit_proposal($1)`, [proposal], /proposal_not_found/);
});

await test('lecture par le gardien : marque vue, photos et animaux', async () => {
  await as(SITTER);
  const r = (await one(`SELECT get_sit_proposal($1) AS p`, [proposal])).p;
  assert.equal(r.state, 'open');
  assert.equal(r.viewer, 'sitter');
  assert.equal(r.sit.city, 'Tassin-la-Demi-Lune');
  assert.deepEqual(r.photos, ['https://x.test/chambre.jpg', 'https://x.test/cuisine.jpg']);
  assert.deepEqual(r.pets, [{ name: 'Pépin', species: 'cat' }]);
  assert.equal(r.owner.first_name, 'Camille');
  assert.equal((await one(`SELECT status FROM sit_invitations WHERE id = $1`, [proposal])).status, 'viewed');
});

await test('le gardien ne modifie que le statut de son invitation', async () => {
  await as(SITTER);
  await rejects(`UPDATE sit_invitations SET sit_id = $2 WHERE id = $1`, [proposal, SIT_PUBLISHED], /invitation_immutable/);
  await rejects(`UPDATE sit_invitations SET status = 'closed' WHERE id = $1`, [proposal], /invitation_status_forbidden/);
});

await test('oui du gardien : candidature créée, proposition close', async () => {
  await as(SITTER);
  const r = (await one(`SELECT respond_sit_proposal($1, true, 'Avec plaisir') AS r`, [proposal])).r;
  assert.equal(r.result, 'accepted');
  const app = await one(`SELECT sit_id, sitter_id, message, status FROM applications WHERE id = $1`, [r.application_id]);
  assert.deepEqual(app, { sit_id: SIT, sitter_id: SITTER, message: 'Avec plaisir', status: 'pending' });
  assert.equal((await one(`SELECT status FROM sit_invitations WHERE id = $1`, [proposal])).status, 'applied');
  await rejects(`SELECT respond_sit_proposal($1, true, NULL)`, [proposal], /proposal_closed/);
});

await test('non du gardien : proposition déclinée, propriétaire prévenu', async () => {
  await as(SITTER2);
  const inv = (await one(`SELECT id FROM sit_invitations WHERE sit_id = $1 AND sitter_id = $2`, [SIT, SITTER2])).id;
  const r = (await one(`SELECT respond_sit_proposal($1, false, 'Pas libre à Noël') AS r`, [inv])).r;
  assert.equal(r.result, 'declined');
  const n = await one(`SELECT title, body, link FROM notifications WHERE user_id = $1 AND type = 'sit_proposal_declined'`, [OWNER]);
  assert.equal(n.link, `/sits/${SIT}`);
  assert.match(n.body, /Paul ne pourra pas garder « Noël à Tassin »\. Son mot : « Pas libre à Noël »/);
});

await test('une proposition expirée ne se répond plus', async () => {
  const inv = (await one(`SELECT id FROM sit_invitations WHERE sit_id = $1 AND sitter_id = $2`, [SIT, SITTER3])).id;
  await as('');
  await db.query(`UPDATE sit_invitations SET expires_at = now() - interval '1 minute' WHERE id = $1`, [inv]);
  await as(SITTER3);
  assert.equal((await one(`SELECT get_sit_proposal($1) AS p`, [inv])).p.state, 'expired');
  await rejects(`SELECT respond_sit_proposal($1, true, NULL)`, [inv], /proposal_expired/);
});

await test('garde confirmée : propositions ouvertes closes avec un mot de remerciement', async () => {
  await as(OWNER);
  await db.query(`UPDATE sit_invitations SET expires_at = now() + interval '2 days' WHERE sit_id = $1 AND sitter_id = $2`, [SIT, SITTER3]);
  await db.query(`UPDATE sits SET status = 'confirmed' WHERE id = $1`, [SIT]);
  const inv = await one(`SELECT id, status FROM sit_invitations WHERE sit_id = $1 AND sitter_id = $2`, [SIT, SITTER3]);
  assert.equal(inv.status, 'closed');
  const n = await one(`SELECT body, link FROM notifications WHERE user_id = $1 AND type = 'sit_proposal_closed'`, [SITTER3]);
  assert.equal(n.link, `/propositions/${inv.id}`);
  assert.match(n.body, /Camille a trouvé son gardien pour « Noël à Tassin »\. Merci/);
  assert.equal((await one(`SELECT status FROM sit_invitations WHERE sit_id = $1 AND sitter_id = $2`, [SIT, SITTER])).status, 'applied');
});

await test('limite de 10 propositions par jour et par propriétaire', async () => {
  await as('');
  await db.exec(`
    INSERT INTO sits (id, user_id, property_id, title, start_date, end_date, city, specific_expectations, cover_photo_url, status)
    SELECT ('60000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, '${OWNER}', '${PROP}', 'Garde ' || n,
      current_date + 10, current_date + 12, 'Tassin', 'Une description suffisamment longue pour proposer.', NULL, 'draft'
    FROM generate_series(1, 11) n;`);
  await as(OWNER);
  // 3 propositions déjà créées aujourd'hui sur SIT ; 7 de plus atteignent 10.
  for (let n = 1; n <= 7; n++) {
    await one(`SELECT create_sit_proposal($1, $2, NULL)`, [`60000000-0000-4000-8000-${String(n).padStart(12, '0')}`, SITTER4]);
  }
  await rejects(`SELECT create_sit_proposal($1, $2, NULL)`, ['60000000-0000-4000-8000-000000000008', SITTER4], /proposal_daily_limit/);
});

await test('les invitations publiques gardent leur lien vers l annonce', async () => {
  await as(OWNER);
  await db.query(`INSERT INTO sit_invitations (sit_id, owner_id, sitter_id) VALUES ($1, $2, $3)`, [SIT_PUBLISHED, OWNER, SITTER2]);
  const n = await one(`SELECT title, link FROM notifications WHERE user_id = $1 AND link = $2`, [SITTER2, `/sits/${SIT_PUBLISHED}`]);
  assert.equal(n.title, 'Invitation à candidater');
});

for (const name of passed) console.log(`ok ${name}`);
console.log(`${passed.length} contrôles verts`);
