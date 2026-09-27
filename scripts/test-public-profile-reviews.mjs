// Migration 0028 : avis publics lisibles en rôle anon, rôle calculé côté serveur (PGlite).
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const root = new URL('../', import.meta.url);
const f = readdirSync(new URL('drizzle/migrations/', root)).find((x) => x.startsWith('0028_'));
const migration = readFileSync(new URL(`drizzle/migrations/${f}`, root), 'utf8');
const K = '5cebd098-3f25-48fe-9c60-af6083883f98', O = '11111111-0000-4000-8000-000000000001';
await db.exec(`
CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE TABLE sits(id uuid PRIMARY KEY,user_id uuid);
CREATE TABLE reviews(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),sit_id uuid,reviewer_id uuid,reviewee_id uuid,overall_rating integer,comment text,
 published boolean,created_at timestamptz DEFAULT now(),animal_care_rating integer,communication_rating integer,housing_respect_rating integer,
 reliability_rating integer,listing_accuracy_rating integer,welcome_rating integer,instructions_clarity_rating integer,housing_condition_rating integer,
 would_recommend boolean,review_type text,cancelled_by_role text,cancellation_reason text,cancellation_response text,response_status text,
 response_submitted_at timestamptz,moderation_status text,mission_id uuid,moderation_hidden_by uuid,moderation_hidden_at timestamptz,selected_badges text[]);
ALTER TABLE sits ENABLE ROW LEVEL SECURITY;
INSERT INTO sits VALUES('22222222-0000-4000-8000-000000000001','${O}');
INSERT INTO reviews(sit_id,reviewer_id,reviewee_id,overall_rating,published,moderation_status,review_type)
 VALUES('22222222-0000-4000-8000-000000000001','${O}','${K}',5,true,'valide','garde'),
       ('22222222-0000-4000-8000-000000000001','${O}','${K}',1,true,'valide','annulation'),
       ('22222222-0000-4000-8000-000000000001','${O}','${K}',2,false,'valide','garde');
`);
await db.exec(migration);
await db.exec('SET ROLE anon');
const { rows } = await db.query(`SELECT review_role, overall_rating FROM public_profile_reviews('${K}')`);
assert.deepEqual(rows, [{ review_role: 'garde', overall_rating: 5 }]);
await assert.rejects(db.query('SELECT * FROM sits'));
console.log('public_profile_reviews : 1 ligne garde en rôle anon, sits reste illisible');
