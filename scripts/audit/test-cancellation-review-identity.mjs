// Isolated local PostgreSQL tests: no Supabase connection, email or real account.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const modulePath = process.env.GUARDIENS_PGLITE_MODULE;
if (modulePath && !modulePath.startsWith('/')) throw new Error('Provide the absolute local PGlite module path');
const { PGlite } = await import(modulePath ? pathToFileURL(modulePath).href : '@electric-sql/pglite');
const db = new PGlite();
let checks = 0;
const failures = [];
const check = (label, fn) => { try { fn(); checks++; } catch { failures.push(label); } };
const owner = randomUUID(), sitter = randomUUID(), other = randomUUID(), sit = randomUUID();
const reason = 'Une raison valable pour cette annulation.';
const base = [sit, owner, sitter, 'proprio', reason];
async function reset({ accepted = 1, self = false, appStatus = 'accepted' } = {}) {
  await db.exec('TRUNCATE reviews, applications, sits');
  await db.query("INSERT INTO sits(id,user_id,status) VALUES ($1,$2,'confirmed')", [sit, owner]);
  for (let i = 0; i < accepted; i++) await db.query('INSERT INTO applications(sit_id,sitter_id,status) VALUES ($1,$2,$3)', [sit, self ? owner : i === 0 ? sitter : other, appStatus]);
}
async function call(args = base, actor = owner, role = 'authenticated') {
  await db.exec('BEGIN');
  try {
    await db.exec(`SET LOCAL ROLE ${role}`);
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [actor ?? '']);
    const result = await db.query('SELECT public.create_avis_annulation($1,$2,$3,$4,$5) AS id', args);
    await db.exec('COMMIT');
    return { id: result.rows[0].id };
  } catch (error) {
    await db.exec('ROLLBACK');
    return { error };
  }
}
async function reject(label, args, actor = owner, fixture, role) {
  await reset(fixture);
  const result = await call(args, actor, role);
  check(label + ': rejected', () => assert.ok(result.error));
  const state = (await db.query('SELECT status,cancelled_by,cancelled_at,(SELECT count(*)::int FROM reviews) AS reviews FROM sits')).rows[0];
  check(label + ': no mutation', () => assert.deepEqual(state, { status: 'confirmed', cancelled_by: null, cancelled_at: null, reviews: 0 }));
}
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;
    CREATE TABLE sits(id uuid PRIMARY KEY,user_id uuid,status text,cancelled_by uuid,cancelled_at timestamptz);
    CREATE TABLE applications(id uuid DEFAULT gen_random_uuid(),sit_id uuid,sitter_id uuid,status text);
    CREATE TABLE reviews(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),sit_id uuid,reviewer_id uuid NOT NULL,reviewee_id uuid NOT NULL,review_type text,cancelled_by_role text,cancellation_reason text,moderation_status text,overall_rating integer,created_at timestamptz);
    -- Relevant validation rules from the existing review-field trigger.
    ALTER TABLE reviews ADD CHECK(cancelled_by_role IS NULL OR cancelled_by_role IN ('proprio','gardien','admin'));
    ALTER TABLE reviews ADD CHECK(review_type <> 'annulation' OR (cancellation_reason IS NOT NULL AND length(cancellation_reason) BETWEEN 20 AND 300));
    CREATE UNIQUE INDEX reviews_unique_annulation ON reviews(sit_id,reviewer_id) WHERE review_type='annulation';
    CREATE FUNCTION public.create_avis_annulation(uuid,uuid,uuid,text,text) RETURNS uuid LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$;
    REVOKE ALL ON FUNCTION public.create_avis_annulation(uuid,uuid,uuid,text,text) FROM PUBLIC,anon;
    GRANT EXECUTE ON FUNCTION public.create_avis_annulation(uuid,uuid,uuid,text,text) TO authenticated,service_role;
  `);
  await db.exec(readFileSync(process.env.GUARDIENS_CANCELLATION_SQL ?? 'supabase/migrations/20260920103000_cancellation_review_identity.sql', 'utf8'));
  // Lot 5 : garde "deja annulee" + cible explicite du ON CONFLICT.
  // Le bloc de garde md5 et la creation d'index sont hors perimetre PGlite (index deja pose dans le fixture).
  const unicitySql = readFileSync(process.env.GUARDIENS_CANCELLATION_UNICITY_SQL ?? 'drizzle/migrations/0007_cancellation_review_unicity.sql', 'utf8');
  const unicityStart = unicitySql.indexOf('CREATE OR REPLACE FUNCTION');
  if (unicityStart < 0) throw new Error('Migration 0007 introuvable ou inattendue');
  await db.exec(unicitySql.slice(unicityStart));

  for (const [label, actor, recipient, role] of [['owner',owner,sitter,'proprio'], ['sitter',sitter,owner,'gardien']]) {
    await reset();
    const result = await call([sit,actor,recipient,role,reason], actor);
    check(label + ': valid cancellation', () => assert.ok(result.id && !result.error));
    const row = (await db.query('SELECT reviewer_id,reviewee_id,cancelled_by_role,review_type,moderation_status,cancellation_reason FROM reviews')).rows[0];
    check(label + ': original review contract', () => assert.deepEqual(row, { reviewer_id:actor,reviewee_id:recipient,cancelled_by_role:role,review_type:'annulation',moderation_status:'en_attente',cancellation_reason:reason }));
    const state = (await db.query('SELECT status,cancelled_by,cancelled_at IS NOT NULL AS dated FROM sits')).rows[0];
    check(label + ': cancellation recorded', () => assert.deepEqual(state, { status:'cancelled',cancelled_by:actor,dated:true }));
    const duplicate = await call([sit,actor,recipient,role,reason], actor);
    check(label + ': duplicate rejected', () => assert.ok(duplicate.error));
    check(label + ': duplicate message', () => assert.match(String(duplicate.error?.message ?? duplicate.error), /déjà annulée/));
    const count = (await db.query('SELECT count(*)::int AS n FROM reviews')).rows[0].n;
    check(label + ': one review', () => assert.equal(count,1));
    let directDuplicate = null;
    try {
      await db.query("INSERT INTO reviews(sit_id,reviewer_id,reviewee_id,review_type,cancelled_by_role,cancellation_reason,moderation_status,overall_rating,created_at) VALUES ($1,$2,$3,'annulation',$4,$5,'en_attente',1,now())", [sit,actor,recipient,role,reason]);
    } catch (error) { directDuplicate = error; }
    check(label + ': unique index blocks direct insert', () => assert.ok(directDuplicate));
    const afterDirect = (await db.query('SELECT count(*)::int AS n FROM reviews')).rows[0].n;
    check(label + ': still one review', () => assert.equal(afterDirect,1));

    for (const badRole of [role === 'proprio' ? 'gardien' : 'proprio', 'admin', null, 'invalid']) {
      await reject(label + ' wrong role ' + badRole, [sit,actor,recipient,badRole,reason],actor);
    }
    for (const target of [actor,other,null]) await reject(label + ' wrong target', [sit,actor,target,role,reason],actor);
  }
  await reject('forged reviewer', [sit,sitter,owner,'gardien',reason]);
  await reject('null reviewer', [sit,null,sitter,'proprio',reason]);
  await reject('no authenticated actor',base,null);
  await reject('outsider',[sit,other,owner,'gardien',reason],other);
  await reject('unknown sit',[randomUUID(),owner,sitter,'proprio',reason]);
  await reject('null sit',[null,owner,sitter,'proprio',reason]);
  await reject('no accepted sitter',base,owner,{accepted:0});
  await reject('no self-review fallback',[sit,owner,owner,'proprio',reason],owner,{accepted:0});
  await reject('ambiguous sitter',base,owner,{accepted:2});
  await reject('self accepted',[sit,owner,owner,'proprio',reason],owner,{self:true});
  for (const status of ['pending','declined','cancelled']) await reject('not accepted '+status,base,owner,{appStatus:status});
  for (const invalid of [null,'x'.repeat(19),' '.repeat(25),'x'.repeat(301)]) await reject('invalid reason',[sit,owner,sitter,'proprio',invalid]);
  for (const length of [20,300]) {
    await reset();
    const result = await call([sit,owner,sitter,'proprio','x'.repeat(length)]);
    check('reason accepted '+length, () => assert.ok(result.id));
  }
  await reject('anon privilege',base,owner,undefined,'anon');
  await reject('service without actor',base,null,undefined,'service_role');
  const rights = (await db.query("SELECT prosecdef,proconfig,has_function_privilege('anon',oid,'EXECUTE') AS anon,has_function_privilege('authenticated',oid,'EXECUTE') AS member,has_function_privilege('service_role',oid,'EXECUTE') AS service FROM pg_proc WHERE proname='create_avis_annulation'")).rows[0];
  check('rights/search path', () => assert.deepEqual(rights,{prosecdef:true,proconfig:['search_path=public, pg_temp'],anon:false,member:true,service:true}));
  // Simulate an existing downstream write rejection: the review insert must roll back.
  await reset();
  await db.exec("CREATE FUNCTION reject_sit_update() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture update denied'; END $$; CREATE TRIGGER reject_update BEFORE UPDATE ON sits FOR EACH ROW EXECUTE FUNCTION reject_sit_update();");
  const rollback = await call();
  check('downstream failure', () => assert.ok(rollback.error));
  const rolledBackCount = (await db.query('SELECT count(*)::int AS n FROM reviews')).rows[0].n;
  check('atomic rollback', () => assert.equal(rolledBackCount,0));
  console.log(JSON.stringify({ checks_passed:checks,checks_failed:failures.length,failures,database:'local PGlite',production_calls:0 }));
  if (failures.length) process.exitCode=1;
} finally { await db.close(); }
