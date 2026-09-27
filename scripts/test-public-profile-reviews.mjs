// Migrations 0028 et 0029 : avis publics lisibles en rôle anon, rôle calculé côté serveur (PGlite).
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const root = new URL('../', import.meta.url);
const files = readdirSync(new URL('drizzle/migrations/', root)).filter((x) => x.startsWith('0028_') || x.startsWith('0029_')).sort();
const migrations = files.map((f) => readFileSync(new URL(`drizzle/migrations/${f}`, root), 'utf8'));
const K = '5cebd098-3f25-48fe-9c60-af6083883f98', O = '11111111-0000-4000-8000-000000000001';
await db.exec(`
CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE TABLE sits(id uuid PRIMARY KEY,user_id uuid,start_date date,end_date date);
CREATE TABLE profiles(id uuid PRIMARY KEY,profile_completion integer);
CREATE TABLE sitter_profiles(user_id uuid,motivation text,sitter_type text,accompanied_by text,lifestyle text,animal_types text,has_vehicle text,has_license text,geographic_radius text,min_stay_duration text,is_available text,competences text,special_animal_skills text,preferred_frequency text,min_notice text,preferred_environments text,farm_animals_ok text,own_animals text,reply_median_minutes text,travels_with_children text,travels_with_own_animals text,work_during_sit text,availability_during text,experience_years text,languages text,interests text,life_pace text,meeting_preference text);

CREATE TABLE reviews(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),sit_id uuid,reviewer_id uuid,reviewee_id uuid,overall_rating integer,comment text,
 published boolean,created_at timestamptz DEFAULT now(),animal_care_rating integer,communication_rating integer,housing_respect_rating integer,
 reliability_rating integer,listing_accuracy_rating integer,welcome_rating integer,instructions_clarity_rating integer,housing_condition_rating integer,
 would_recommend boolean,review_type text,cancelled_by_role text,cancellation_reason text,cancellation_response text,response_status text,
 response_submitted_at timestamptz,moderation_status text,mission_id uuid,moderation_hidden_by uuid,moderation_hidden_at timestamptz,selected_badges text[]);
ALTER TABLE sits ENABLE ROW LEVEL SECURITY;
INSERT INTO sits VALUES('22222222-0000-4000-8000-000000000001','${O}','2026-08-20','2026-08-31');
INSERT INTO reviews(sit_id,reviewer_id,reviewee_id,overall_rating,published,moderation_status,review_type)
 VALUES('22222222-0000-4000-8000-000000000001','${O}','${K}',5,true,'valide','garde'),
       ('22222222-0000-4000-8000-000000000001','${O}','${K}',1,true,'valide','annulation'),
       ('22222222-0000-4000-8000-000000000001','${O}','${K}',2,false,'valide','garde');
`);
for (const m of migrations) await db.exec(m);
await db.exec('SET ROLE anon');
const { rows } = await db.query(`SELECT review_role, overall_rating, sit_start_date::text AS s, sit_end_date::text AS e FROM public_profile_reviews('${K}')`);
assert.deepEqual(rows, [{ review_role: 'garde', overall_rating: 5, s: '2026-08-20', e: '2026-08-31' }]);
await assert.rejects(db.query('SELECT * FROM sits'));
console.log('public_profile_reviews : 1 ligne garde avec dates de garde en rôle anon, sits reste illisible');
