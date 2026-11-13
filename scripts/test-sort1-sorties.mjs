// Test SQL du lot SORT1 (12/11/2026) : sorties à places comptées.
//
// Base éphémère (PGlite), migration appliquée deux fois (rejouable), puis :
// publication, adresse lisible, date passée refusée, garde d'enfants refusée,
// « Je viens » sous plafond de places, place libérée, retrait par l'organisateur,
// annulation qui prévient les inscrits, champs réservés, lecture ouverte sans
// position, masquage après deux signalements de membres différents.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const root = new URL('../', import.meta.url);
const migration = readFileSync(new URL('drizzle/migrations/0145_sort1_sorties.sql', root), 'utf8');
const passed = [];

await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('fixture.uid', true), '')::uuid
  $$;
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
  CREATE TABLE public.profiles(id uuid PRIMARY KEY, first_name text, postal_code text, latitude numeric, longitude numeric,
    identity_verified boolean, created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.user_roles(user_id uuid, role public.app_role);
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE AS $$
    SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
  $$;
  CREATE TABLE public.notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, type text NOT NULL DEFAULT 'info',
    title text NOT NULL DEFAULT '', body text NOT NULL DEFAULT '', link text, actor_name text, created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.reports(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reporter_id uuid NOT NULL, target_type text NOT NULL DEFAULT 'profile',
    target_id uuid NOT NULL, status text NOT NULL DEFAULT 'new');
  CREATE TABLE public.feature_flags(key text PRIMARY KEY, enabled boolean NOT NULL DEFAULT false, description text);
`);

await db.exec(migration);
await db.exec(migration);
passed.push('migration rejouable');

const one = async (sql, params = []) => (await db.query(sql, params)).rows[0];
const as = (uid) => db.exec(`SELECT set_config('fixture.uid', '${uid ?? ''}', false)`);
const U = (n) => `00000000-0000-0000-0000-00000000000${n}`;
const [MARTINE, KARIM, LEA, PAUL, NOE, ADMIN] = [1, 2, 3, 4, 5, 6].map(U);
for (const [id, name] of [[MARTINE, 'Martine'], [KARIM, 'Karim'], [LEA, 'Léa'], [PAUL, 'Paul'], [NOE, 'Noé'], [ADMIN, 'Admin']]) {
  await db.query(`INSERT INTO public.profiles(id, first_name, postal_code, latitude, longitude) VALUES ($1, $2, '69005', 45.76, 4.82)`, [id, name]);
}
await db.query(`INSERT INTO public.user_roles VALUES ($1, 'admin')`, [ADMIN]);

assert.equal((await one(`SELECT enabled FROM public.feature_flags WHERE key = 'sorties'`)).enabled, false);
passed.push('drapeau créé éteint');

// 1. Publication : belote à quatre, trois déjà là, une place à prendre.
await as(MARTINE);
const outing = await one(`
  INSERT INTO public.outings(organizer_id, title, category, starts_at, place_kind, place_label, city, postal_code, capacity, reserved, status, hidden_at)
  VALUES ($1, 'Belote à quatre', 'jeux', now() + interval '5 days', 'home', 'Lyon 5e', 'Lyon', '69005', 4, 2, 'cancelled', now())
  RETURNING *`, [MARTINE]);
assert.match(outing.slug, /^belote-a-quatre-[0-9a-f]{8}$/);
assert.equal(outing.status, 'open');
assert.equal(outing.hidden_at, null);
assert.equal(Number(outing.latitude), 45.76);
passed.push('publication : adresse lisible, état ouvert imposé, position de la commune');

await assert.rejects(db.query(`INSERT INTO public.outings(organizer_id, title, starts_at, capacity) VALUES ($1, 'Sortie passée', now() - interval '1 hour', 4)`, [MARTINE]), /OUTING_DATE_PAST/);
await assert.rejects(db.query(`INSERT INTO public.outings(organizer_id, title, starts_at, capacity) VALUES ($1, 'Garde d''enfants mercredi', now() + interval '2 days', 4)`, [MARTINE]), /garde d'enfants/);
await assert.rejects(db.query(`INSERT INTO public.outings(organizer_id, title, starts_at, capacity) VALUES ($1, 'Grande tablée', now() + interval '2 days', 21)`, [MARTINE]), /outings_capacity/);
await assert.rejects(db.query(`INSERT INTO public.outings(organizer_id, title, starts_at, capacity, reserved) VALUES ($1, 'Déjà complet', now() + interval '2 days', 4, 4)`, [MARTINE]), /outings_reserved/);
passed.push('refus : date passée, garde d\'enfants, plus de 20 places, aucune place à prendre');

// 2. « Je viens » sous plafond.
await as(MARTINE);
assert.equal((await one(`SELECT public.outing_join($1) AS r`, [outing.id])).r.reason, 'organizer');
await as(null);
assert.equal((await one(`SELECT public.outing_join($1) AS r`, [outing.id])).r.reason, 'auth');
await as(KARIM);
let r = (await one(`SELECT public.outing_join($1, 'lien') AS r`, [outing.id])).r;
assert.deepEqual(r, { ok: true, left: 1 });
r = (await one(`SELECT public.outing_join($1) AS r`, [outing.id])).r;
assert.equal(r.already, true);
await as(LEA);
assert.equal((await one(`SELECT public.outing_join($1) AS r`, [outing.id])).r.left, 0);
await as(PAUL);
assert.equal((await one(`SELECT public.outing_join($1) AS r`, [outing.id])).r.reason, 'full');
assert.equal((await one(`SELECT taken FROM public.public_outings WHERE id = $1`, [outing.id])).taken, 4);
assert.equal((await one(`SELECT source FROM public.outing_attendees WHERE user_id = $1`, [KARIM])).source, 'lien');
assert.equal((await one(`SELECT count(*)::int AS n FROM public.notifications WHERE user_id = $1 AND type = 'outing_joined'`, [MARTINE])).n, 2);
passed.push('« Je viens » : place prise une fois, complet refusé, organisateur prévenu, origine gardée');

// 3. Place libérée, puis reprise par un autre.
await as(LEA);
assert.equal((await one(`SELECT public.outing_leave($1) AS r`, [outing.id])).r.ok, true);
await as(PAUL);
assert.equal((await one(`SELECT public.outing_join($1) AS r`, [outing.id])).r.ok, true);
assert.equal((await one(`SELECT count(*)::int AS n FROM public.notifications WHERE user_id = $1 AND type = 'outing_left'`, [MARTINE])).n, 1);
passed.push('place libérée : la sortie rouvre seule');

// 4. Retrait par l'organisateur : mot neutre, retour fermé.
await as(KARIM);
assert.equal((await one(`SELECT public.outing_remove_attendee($1, $2) AS r`, [outing.id, PAUL])).r.reason, 'forbidden');
await as(MARTINE);
assert.equal((await one(`SELECT public.outing_remove_attendee($1, $2) AS r`, [outing.id, PAUL])).r.ok, true);
await as(PAUL);
assert.equal((await one(`SELECT public.outing_join($1) AS r`, [outing.id])).r.reason, 'removed');
assert.equal((await one(`SELECT count(*)::int AS n FROM public.notifications WHERE user_id = $1 AND type = 'outing_removed'`, [PAUL])).n, 1);
passed.push('retrait par l\'organisateur seul, inscrit prévenu');

// 5. Inscrits lisibles par l'organisateur et les inscrits, par personne d'autre.
await as(MARTINE);
assert.equal((await db.query(`SELECT * FROM public.outing_attendee_list($1)`, [outing.id])).rows.length, 1);
await as(KARIM);
assert.equal((await db.query(`SELECT first_name FROM public.outing_attendee_list($1)`, [outing.id])).rows[0].first_name, 'Karim');
assert.equal((await one(`SELECT public.outing_my_status($1) AS s`, [outing.id])).s, 'going');
await as(NOE);
assert.equal((await db.query(`SELECT * FROM public.outing_attendee_list($1)`, [outing.id])).rows.length, 0);
passed.push('liste des inscrits réservée à l\'organisateur et aux inscrits');

// 6. Champs réservés : ni état, ni masquage, ni places sous le nombre d'inscrits.
await as(MARTINE);
await assert.rejects(db.query(`UPDATE public.outings SET hidden_at = now() WHERE id = $1`, [outing.id]), /OUTING_FIELD_LOCKED/);
await assert.rejects(db.query(`UPDATE public.outings SET status = 'cancelled' WHERE id = $1`, [outing.id]), /OUTING_FIELD_LOCKED/);
await assert.rejects(db.query(`UPDATE public.outings SET slug = 'autre' WHERE id = $1`, [outing.id]), /OUTING_FIELD_LOCKED/);
await assert.rejects(db.query(`UPDATE public.outings SET reserved = 3, capacity = 3 WHERE id = $1`, [outing.id]), /outings_reserved|OUTING_CAPACITY_BELOW_ATTENDEES/);
await db.query(`UPDATE public.outings SET title = 'Belote du samedi', capacity = 5 WHERE id = $1`, [outing.id]);
assert.equal((await one(`SELECT slug FROM public.outings WHERE id = $1`, [outing.id])).slug, outing.slug);
passed.push('modification : titre et places oui, état, masquage et adresse non');

// 7. Lecture ouverte : aucune position, aucun identifiant d'inscrit.
const cols = (await db.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'public_outings'`)).rows.map((x) => x.column_name);
for (const forbidden of ['latitude', 'longitude', 'hidden_at', 'agenda_consent']) assert.equal(cols.includes(forbidden), false, forbidden);
const grants = (await db.query(`SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name = 'public_outings' AND grantee IN ('anon', 'authenticated')`)).rows;
assert.deepEqual([...new Set(grants.map((g) => g.privilege_type))], ['SELECT']);
passed.push('vue publique en lecture seule, sans position');

// 8. Deux signalements de membres différents masquent la sortie.
await as(NOE);
await db.query(`INSERT INTO public.reports(reporter_id, target_type, target_id) VALUES ($1, 'outing', $2)`, [NOE, outing.id]);
await db.query(`INSERT INTO public.reports(reporter_id, target_type, target_id) VALUES ($1, 'outing', $2)`, [NOE, outing.id]);
assert.equal((await one(`SELECT count(*)::int AS n FROM public.public_outings WHERE id = $1`, [outing.id])).n, 1);
await as(LEA);
await db.query(`INSERT INTO public.reports(reporter_id, target_type, target_id) VALUES ($1, 'outing', $2)`, [LEA, outing.id]);
assert.equal((await one(`SELECT count(*)::int AS n FROM public.public_outings WHERE id = $1`, [outing.id])).n, 0);
await as(PAUL);
assert.equal((await one(`SELECT public.outing_join($1) AS r`, [outing.id])).r.reason, 'not_found');
await as(ADMIN);
await db.query(`UPDATE public.outings SET hidden_at = NULL WHERE id = $1`, [outing.id]);
assert.equal((await one(`SELECT count(*)::int AS n FROM public.public_outings WHERE id = $1`, [outing.id])).n, 1);
passed.push('masquage à deux signalements distincts, rétabli par un admin');

// 9. Annulation : inscrits prévenus, plus d'inscription.
await as(KARIM);
assert.equal((await one(`SELECT public.outing_cancel($1, 'non') AS r`, [outing.id])).r.reason, 'forbidden');
await as(MARTINE);
assert.equal((await one(`SELECT public.outing_cancel($1, 'Un imprévu samedi.') AS r`, [outing.id])).r.ok, true);
const cancelled = await one(`SELECT status, cancel_note FROM public.public_outings WHERE id = $1`, [outing.id]);
assert.deepEqual(cancelled, { status: 'cancelled', cancel_note: 'Un imprévu samedi.' });
assert.equal((await one(`SELECT count(*)::int AS n FROM public.notifications WHERE user_id = $1 AND type = 'outing_cancelled'`, [KARIM])).n, 1);
await as(NOE);
assert.equal((await one(`SELECT public.outing_join($1) AS r`, [outing.id])).r.reason, 'cancelled');
passed.push('annulation par l\'organisateur seul, inscrits prévenus');

for (const p of passed) console.log(`ok  ${p}`);
console.log(`\n${passed.length} contrôles verts (SORT1)`);
