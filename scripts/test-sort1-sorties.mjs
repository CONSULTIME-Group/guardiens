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
    identity_verified boolean, created_at timestamptz NOT NULL DEFAULT now(), email text, account_status text DEFAULT 'active',
    last_seen_at timestamptz DEFAULT now());
  CREATE TABLE public.email_unsubscribe_tokens(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), token text UNIQUE, email text UNIQUE);
  CREATE TABLE public.user_roles(user_id uuid, role public.app_role);
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE AS $$
    SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
  $$;
  CREATE TABLE public.notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, type text NOT NULL DEFAULT 'info',
    title text NOT NULL DEFAULT '', body text NOT NULL DEFAULT '', link text, actor_name text, created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.reports(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reporter_id uuid NOT NULL, target_type text NOT NULL DEFAULT 'profile',
    target_id uuid NOT NULL, status text NOT NULL DEFAULT 'new');
  CREATE TABLE public.feature_flags(key text PRIMARY KEY, enabled boolean NOT NULL DEFAULT false, description text);
  CREATE TABLE auth.users(id uuid PRIMARY KEY, email text);
  CREATE TABLE public.email_deferred_queue(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), template_name text NOT NULL, recipient_email text NOT NULL,
    template_data jsonb, idempotency_key text, defer_reason text, scheduled_for timestamptz);
`);

const migration2 = readFileSync(new URL('drizzle/migrations/0146_sort2_modification_sortie.sql', root), 'utf8');
await db.exec(migration);
await db.exec(migration);
await db.exec(migration2);
await db.exec(migration2);
const migration3 = readFileSync(new URL('drizzle/migrations/0147_sort3_emails_sorties.sql', root), 'utf8');
await db.exec(migration3);
await db.exec(migration3);
const migration4 = readFileSync(new URL('drizzle/migrations/0148_sort4_alertes_sorties.sql', root), 'utf8');
await db.exec(migration4);
await db.exec(migration4);
const migration5 = readFileSync(new URL('drizzle/migrations/0149_sort5_admin_sorties.sql', root), 'utf8');
await db.exec(migration5);
await db.exec(migration5);
passed.push('migrations 0145 à 0149 rejouables');

const one = async (sql, params = []) => (await db.query(sql, params)).rows[0];
const as = (uid) => db.exec(`SELECT set_config('fixture.uid', '${uid ?? ''}', false)`);
const U = (n) => `00000000-0000-0000-0000-00000000000${n}`;
const [MARTINE, KARIM, LEA, PAUL, NOE, ADMIN] = [1, 2, 3, 4, 5, 6].map(U);
for (const [id, name] of [[MARTINE, 'Martine'], [KARIM, 'Karim'], [LEA, 'Léa'], [PAUL, 'Paul'], [NOE, 'Noé'], [ADMIN, 'Admin']]) {
  await db.query(`INSERT INTO public.profiles(id, first_name, postal_code, latitude, longitude) VALUES ($1, $2, '69005', 45.76, 4.82)`, [id, name]);
}
await db.query(`INSERT INTO public.user_roles VALUES ($1, 'admin')`, [ADMIN]);
for (const [id, name] of [[MARTINE, 'martine'], [KARIM, 'karim'], [LEA, 'lea'], [PAUL, 'paul'], [NOE, 'noe']]) {
  await db.query(`INSERT INTO auth.users(id, email) VALUES ($1, $2)`, [id, `${name}@fixture.test`]);
}

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

// 6 bis. Lot SORT2 : un changement de jour ou de lieu prévient les inscrits, une date passée est refusée.
await as(MARTINE);
await db.query(`UPDATE public.outings SET description = 'Je fournis les cartes.' WHERE id = $1`, [outing.id]);
assert.equal((await one(`SELECT count(*)::int AS n FROM public.notifications WHERE type = 'outing_changed'`)).n, 0);
await db.query(`UPDATE public.outings SET starts_at = now() + interval '6 days' WHERE id = $1`, [outing.id]);
assert.equal((await one(`SELECT count(*)::int AS n FROM public.notifications WHERE user_id = $1 AND type = 'outing_changed'`, [KARIM])).n, 1);
assert.equal((await one(`SELECT count(*)::int AS n FROM public.notifications WHERE user_id = $1 AND type = 'outing_changed'`, [PAUL])).n, 0);
await db.query(`UPDATE public.outings SET place_label = 'Lyon 5e, Saint-Just' WHERE id = $1`, [outing.id]);
assert.equal((await one(`SELECT count(*)::int AS n FROM public.notifications WHERE user_id = $1 AND type = 'outing_changed'`, [KARIM])).n, 2);
await assert.rejects(db.query(`UPDATE public.outings SET starts_at = now() - interval '1 hour' WHERE id = $1`, [outing.id]), /OUTING_DATE_PAST/);
passed.push('modification : inscrits prévenus d\'un changement de jour ou de lieu, date passée refusée');

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

// 10. Lot SORT2 : une sortie annulée garde son contenu.
await as(MARTINE);
await assert.rejects(db.query(`UPDATE public.outings SET title = 'Autre titre' WHERE id = $1`, [outing.id]), /OUTING_CANCELLED_LOCKED/);
passed.push('sortie annulée : contenu figé');

// 11. Lot SORT3 : emails de service. Drapeau éteint, rien en file malgré tout ce qui précède.
const queued = async (where = 'true', params = []) => (await db.query(`SELECT recipient_email, template_name, defer_reason, idempotency_key, template_data FROM public.email_deferred_queue WHERE ${where} ORDER BY idempotency_key`, params)).rows;
assert.equal((await one(`SELECT enabled FROM public.feature_flags WHERE key = 'sorties_emails'`)).enabled, false);
assert.equal((await queued()).length, 0);
passed.push('emails : drapeau créé éteint, aucune ligne en file');

await db.exec(`UPDATE public.feature_flags SET enabled = true WHERE key = 'sorties_emails'`);
await as(MARTINE);
const velo = await one(`
  INSERT INTO public.outings(organizer_id, title, category, starts_at, place_kind, place_label, city, postal_code, capacity, reserved)
  VALUES ($1, 'Balade à vélo', 'velo', '2026-12-13 09:00:00+00', 'public', 'Berges du Rhône', 'Lyon', '69007', 8, 1) RETURNING *`, [MARTINE]);
assert.equal((await one(`SELECT public.outing_when_label('2026-12-13 09:00:00+00') AS l`)).l, 'Dimanche 13 décembre, 10 h');
assert.equal((await one(`SELECT public.outing_when_label('2026-08-01 16:30:00+00') AS l`)).l, 'Samedi 1er août, 18 h 30');
await as(KARIM);
await db.query(`SELECT public.outing_join($1, 'lien')`, [velo.id]);
await as(LEA);
await db.query(`SELECT public.outing_join($1)`, [velo.id]);
let mails = await queued(`defer_reason = 'outing_joined'`);
assert.equal(mails.length, 2);
assert.equal(mails.every((m) => m.recipient_email === 'martine@fixture.test' && m.template_name === 'outing-update'), true);
assert.equal(mails.some((m) => m.template_data.subject === 'Karim vient à votre sortie'), true);
assert.equal(mails[0].template_data.whenWhere, 'Dimanche 13 décembre, 10 h · Berges du Rhône');
assert.match(mails[0].template_data.link, /^https:\/\/guardiens\.fr\/sorties\/balade-a-velo-[0-9a-f]{8}$/);
// Une place libérée puis reprise par le même membre : un seul email.
await db.query(`SELECT public.outing_leave($1)`, [velo.id]);
await db.query(`SELECT public.outing_join($1)`, [velo.id]);
assert.equal((await queued(`defer_reason = 'outing_joined'`)).length, 2);
passed.push('emails : une inscription prévient l\'organisateur, une fois par inscrit');

await as(MARTINE);
await db.query(`UPDATE public.outings SET description = 'Allure tranquille.' WHERE id = $1`, [velo.id]);
assert.equal((await queued(`defer_reason = 'outing_changed'`)).length, 0);
await db.query(`UPDATE public.outings SET starts_at = '2026-12-13 13:00:00+00' WHERE id = $1`, [velo.id]);
mails = await queued(`defer_reason = 'outing_changed'`);
assert.deepEqual(mails.map((m) => m.recipient_email), ['karim@fixture.test', 'lea@fixture.test'].sort((a, b) => (mails.find((m) => m.recipient_email === a).idempotency_key < mails.find((m) => m.recipient_email === b).idempotency_key ? -1 : 1)));
assert.equal(mails[0].template_data.whenWhere, 'Dimanche 13 décembre, 14 h · Berges du Rhône');
passed.push('emails : un changement de jour prévient chaque inscrit, pas un changement de texte');

// Rappel : la veille, à partir de 18 h à Paris, une seule fois.
assert.equal((await one(`SELECT public.outing_enqueue_reminders('2026-12-12 16:30:00+00') AS n`)).n, 0);
assert.equal((await one(`SELECT public.outing_enqueue_reminders('2026-12-11 18:00:00+00') AS n`)).n, 0);
assert.equal((await one(`SELECT public.outing_enqueue_reminders('2026-12-12 17:05:00+00') AS n`)).n, 3);
assert.equal((await one(`SELECT public.outing_enqueue_reminders('2026-12-12 18:05:00+00') AS n`)).n, 0);
mails = await queued(`defer_reason = 'outing_reminder'`);
assert.equal(mails.length, 3);
assert.equal(mails.every((m) => m.template_data.subject === 'Demain : Balade à vélo'), true);
passed.push('emails : rappel de la veille à partir de 18 h à Paris, une fois, organisateur et inscrits');

await db.query(`SELECT public.outing_cancel($1, 'Pluie annoncée.')`, [velo.id]);
mails = await queued(`defer_reason = 'outing_cancelled'`);
assert.equal(mails.length, 2);
assert.match(mails[0].template_data.body, /Pluie annoncée/);
assert.equal(mails[0].template_data.cta, 'Voir les sorties');
assert.equal((await queued()).every((m) => !/[\u2014\u2013]/.test(JSON.stringify(m.template_data))), true);
assert.equal((await one(`SELECT count(*)::int AS n FROM public.email_deferred_queue`)).n, (await one(`SELECT count(DISTINCT idempotency_key)::int AS n FROM public.email_deferred_queue`)).n);
passed.push('emails : annulation avec le mot de l\'organisateur, une clé par envoi');

// 12. Lot SORT4 : alerte « nouvelle sortie ». Drapeau éteint : rien, malgré les publications précédentes.
assert.equal((await one(`SELECT enabled FROM public.feature_flags WHERE key = 'sorties_alertes'`)).enabled, false);
assert.equal((await queued(`defer_reason = 'outing_alert'`)).length, 0);
await db.exec(`UPDATE public.feature_flags SET enabled = true WHERE key = 'sorties_alertes'`);
// Karim : même code postal. Léa : à 4 km, réglée sur 5 km. Paul : à 12 km, sans réglage (15 km).
// Noé : à 12 km, réglé sur « Mon quartier ». Admin : à 40 km. Un sixième membre proche, absent depuis 45 jours.
const ABSENT = U(7);
await db.query(`INSERT INTO public.profiles(id, first_name, postal_code, latitude, longitude, last_seen_at) VALUES ($1, 'Zoé', '69005', 45.76, 4.82, now() - interval '45 days')`, [ABSENT]);
await db.query(`INSERT INTO auth.users(id, email) VALUES ($1, 'zoe@fixture.test'), ($2, 'admin@fixture.test')`, [ABSENT, ADMIN]);
await db.query(`UPDATE public.profiles SET email = lower(first_name) || '@fixture.test'`);
await db.query(`UPDATE public.profiles SET postal_code = '69160', latitude = 45.76, longitude = 4.769 WHERE id = $1`, [LEA]);
await db.query(`UPDATE public.profiles SET postal_code = '69260', latitude = 45.76, longitude = 4.666 WHERE id = ANY($1)`, [[PAUL, NOE]]);
await db.query(`UPDATE public.profiles SET postal_code = '38200', latitude = 45.52, longitude = 4.87 WHERE id = $1`, [ADMIN]);
await as(LEA);
assert.deepEqual((await one(`SELECT public.my_outing_alert_preference() AS p`)).p, { enabled: true, radius: '15' });
assert.equal((await one(`SELECT public.set_my_outing_alert_preference(true, '5') AS r`)).r.ok, true);
assert.equal((await one(`SELECT public.set_my_outing_alert_preference(true, '30') AS r`)).r.reason, 'radius');
await as(NOE);
await db.query(`SELECT public.set_my_outing_alert_preference(true, 'quartier')`);
await as(MARTINE);
const tarot = await one(`
  INSERT INTO public.outings(organizer_id, title, category, starts_at, place_kind, place_label, city, postal_code, capacity, reserved)
  VALUES ($1, 'Tarot du jeudi', 'jeux', now() + interval '4 days', 'home', 'Lyon 5e', 'Lyon', '69005', 5, 2) RETURNING *`, [MARTINE]);
let alerts = await queued(`defer_reason = 'outing_alert'`);
assert.deepEqual(alerts.map((m) => m.recipient_email).sort(), ['karim@fixture.test', 'lea@fixture.test', 'paul@fixture.test'].sort());
assert.equal(alerts[0].template_name, 'outing-alert');
assert.equal(alerts[0].template_data.placesLeft, 3);
assert.match(alerts[0].template_data.link, /\?via=alerte$/);
passed.push('alerte : même code postal, 5 km et 15 km servis ; « Mon quartier » ailleurs, 40 km, organisateur et membre absent écartés');

// Une alerte par semaine et par membre : une seconde sortie le même jour reste sans envoi.
await db.query(`INSERT INTO public.outings(organizer_id, title, category, starts_at, place_kind, place_label, city, postal_code, capacity, reserved)
  VALUES ($1, 'Échecs au café', 'jeux', now() + interval '6 days', 'public', 'Café de la Place', 'Lyon', '69005', 4, 1)`, [MARTINE]);
assert.equal((await queued(`defer_reason = 'outing_alert'`)).length, 3);
passed.push('alerte : au plus une par semaine et par membre');

// Arrêt en un clic par le jeton de l'email : seules les alertes sorties changent.
await db.query(`INSERT INTO public.email_unsubscribe_tokens(token, email) VALUES ('${'a'.repeat(64)}', 'Karim@fixture.test')`);
await as(null);
assert.equal((await one(`SELECT public.outing_alerts_set_by_token('court', false) AS r`)).r.ok, false);
assert.equal((await one(`SELECT public.outing_alerts_set_by_token($1, false) AS r`, ['b'.repeat(64)])).r.ok, false);
assert.deepEqual((await one(`SELECT public.outing_alerts_set_by_token($1, false) AS r`, ['a'.repeat(64)])).r, { ok: true, enabled: false });
assert.equal((await one(`SELECT enabled FROM public.outing_alert_preferences WHERE user_id = $1`, [KARIM])).enabled, false);
await db.exec(`DELETE FROM public.outing_alert_log`);
await as(MARTINE);
await db.query(`INSERT INTO public.outings(organizer_id, title, category, starts_at, place_kind, place_label, city, postal_code, capacity, reserved)
  VALUES ($1, 'Scrabble du dimanche', 'jeux', now() + interval '8 days', 'home', 'Lyon 5e', 'Lyon', '69005', 4, 1)`, [MARTINE]);
alerts = await queued(`defer_reason = 'outing_alert' AND template_data->>'title' = 'Scrabble du dimanche'`);
assert.deepEqual(alerts.map((m) => m.recipient_email).sort(), ['lea@fixture.test', 'paul@fixture.test'].sort());
await as(null);
assert.equal((await one(`SELECT public.outing_alerts_set_by_token($1, true) AS r`, ['a'.repeat(64)])).r.enabled, true);
passed.push('arrêt par le jeton de l\'email : alertes sorties seules, reprise possible');

// Une sortie en ligne reste sans alerte.
await db.exec(`DELETE FROM public.outing_alert_log`);
await as(MARTINE);
await db.query(`INSERT INTO public.outings(organizer_id, title, category, starts_at, place_kind, capacity, reserved)
  VALUES ($1, 'Échecs en ligne', 'jeux', now() + interval '3 days', 'online', 2, 1)`, [MARTINE]);
assert.equal((await queued(`template_data->>'title' = 'Échecs en ligne'`)).length, 0);
passed.push('alerte : sortie en ligne sans envoi');

// Lot SORT5 : lecture admin et masquage.
await as(MARTINE);
await assert.rejects(() => db.query(`SELECT public.admin_outings_overview()`), /ADMIN_ONLY/);
await assert.rejects(() => db.query(`SELECT public.admin_outing_set_hidden($1, true)`, [outing.id]), /ADMIN_ONLY/);
await as(null);
await assert.rejects(() => db.query(`SELECT public.admin_outings_overview()`), /ADMIN_ONLY/);
passed.push('admin : lecture et masquage fermés aux membres et aux visiteurs');

await as(ADMIN);
const total = Number((await one(`SELECT count(*) AS n FROM public.outings`)).n);
const going = Number((await one(`SELECT count(*) AS n FROM public.outing_attendees WHERE status = 'going'`)).n);
let overview = (await one(`SELECT public.admin_outings_overview() AS r`)).r;
assert.equal(overview.counters.published_total, total);
assert.equal(overview.counters.joins_total, going);
assert.equal(Object.values(overview.counters.joins_by_source).reduce((a, b) => a + b, 0), going);
assert.equal(overview.counters.alerts_sent, Number((await one(`SELECT count(*) AS n FROM public.outing_alert_log`)).n));
assert.equal(overview.counters.alerts_stopped, Number((await one(`SELECT count(*) AS n FROM public.outing_alert_preferences WHERE NOT enabled`)).n));
assert.deepEqual(Object.keys(overview.counters.flags).sort(), ['sorties', 'sorties_alertes', 'sorties_emails']);
assert.equal(overview.outings.length, total);
const first = overview.outings.find((o) => o.id === outing.id);
assert.equal(first.organizer_first_name, 'Martine');
assert.ok(first.organizer_last_seen_at);
assert.equal(typeof first.taken, 'number');
assert.equal((await one(`SELECT public.admin_outings_overview(1) AS r`)).r.outings.length, 1);
passed.push('admin : compteurs et liste rendus en une lecture, bornée');

const target = (await one(`SELECT id FROM public.outings WHERE title = 'Scrabble du dimanche'`)).id;
const hiddenBefore = overview.counters.hidden;
assert.deepEqual((await one(`SELECT public.admin_outing_set_hidden($1, true) AS r`, [target])).r, { ok: true, hidden: true });
assert.equal((await one(`SELECT count(*) AS n FROM public.public_outings WHERE id = $1`, [target])).n, 0);
overview = (await one(`SELECT public.admin_outings_overview() AS r`)).r;
assert.equal(overview.counters.hidden, hiddenBefore + 1);
assert.ok(overview.outings.find((o) => o.id === target).hidden_at);
assert.deepEqual((await one(`SELECT public.admin_outing_set_hidden($1, false) AS r`, [target])).r, { ok: true, hidden: false });
assert.equal((await one(`SELECT count(*) AS n FROM public.public_outings WHERE id = $1`, [target])).n, 1);
assert.equal((await one(`SELECT public.admin_outing_set_hidden($1, true) AS r`, ['00000000-0000-0000-0000-0000000000ff'])).r.reason, 'not_found');
passed.push('admin : masquer retire la sortie de la vue publique, rétablir la rend');

for (const p of passed) console.log(`ok  ${p}`);
console.log(`\n${passed.length} contrôles verts (SORT1 à SORT5)`);
