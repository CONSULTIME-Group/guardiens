// Lot STOP1 : un « stop » en réponse à un message personnel de l'équipe coupe
// les emails produit et accuse réception une seule fois.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.PGLITE_MODULE||'@electric-sql/pglite');
const db=new PGlite();const root=new URL('../',import.meta.url);const passed=[];
const migration=readFileSync(new URL('drizzle/migrations/0180_stop1_stop_activation.sql',root),'utf8');
const ADMIN='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',MEMBER='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',OTHER='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const PERSO='11111111-1111-4111-8111-111111111111',GARDE='22222222-2222-4222-8222-222222222222',MEMBRES='33333333-3333-4333-8333-333333333333',VIDE='44444444-4444-4444-8444-444444444444';
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE TYPE app_role AS ENUM('admin','user');
CREATE TABLE user_roles(user_id uuid,role app_role);
CREATE FUNCTION has_role(_user_id uuid,_role app_role) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id=_user_id AND role=_role)$$;
CREATE TABLE conversations(id uuid PRIMARY KEY,owner_id uuid,sitter_id uuid,sit_id uuid,small_mission_id uuid);
CREATE TABLE messages(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),conversation_id uuid,sender_id uuid,content text DEFAULT '',is_system boolean DEFAULT false,metadata jsonb,created_at timestamptz DEFAULT now());
CREATE TABLE email_preferences(user_id uuid PRIMARY KEY,product_emails boolean NOT NULL DEFAULT true,digest_emails boolean NOT NULL DEFAULT true,alert_emails boolean NOT NULL DEFAULT true,updated_at timestamptz NOT NULL DEFAULT now());
INSERT INTO user_roles VALUES('${ADMIN}','admin');
INSERT INTO conversations VALUES('${PERSO}','${ADMIN}','${MEMBER}',NULL,NULL),('${GARDE}','${ADMIN}','${MEMBER}','${GARDE}',NULL),('${MEMBRES}','${OTHER}','${MEMBER}',NULL,NULL),('${VIDE}','${ADMIN}','${MEMBER}',NULL,NULL);`);
await db.exec(migration);await db.exec(migration);passed.push('Migration rejouable');
const say=(conv,who,text)=>db.query('INSERT INTO messages(conversation_id,sender_id,content) VALUES($1,$2,$3)',[conv,who,text]);
const prefs=async()=>(await db.query('SELECT product_emails,digest_emails,alert_emails FROM email_preferences WHERE user_id=$1',[MEMBER])).rows[0];
const acks=async(conv)=>(await db.query("SELECT content,sender_id,metadata FROM messages WHERE conversation_id=$1 AND is_system AND metadata->>'kind'='activation_stop'",[conv])).rows;
async function scenario(name,fn){await db.exec('BEGIN');try{await fn();passed.push(name);}finally{await db.exec('ROLLBACK');}}

await scenario('« Stop » en réponse à un message de l\'équipe coupe les emails produit et accuse réception',async()=>{
  await say(PERSO,ADMIN,'Bonjour Anne');await say(PERSO,MEMBER,'Stop');
  assert.deepEqual(await prefs(),{product_emails:false,digest_emails:true,alert_emails:true});
  const a=await acks(PERSO);assert.equal(a.length,1);assert.equal(a[0].sender_id,ADMIN);
  assert.equal(a[0].content,"C'est noté. Les relances s'arrêtent, vous avancez à votre rythme.");
  assert.equal(a[0].metadata.member_id,MEMBER);
});
await scenario('Un second « stop » garde un seul accusé de réception',async()=>{
  await say(PERSO,ADMIN,'Bonjour');await say(PERSO,MEMBER,'Stop');await say(PERSO,MEMBER,'Stop');
  assert.equal((await acks(PERSO)).length,1);
});
for(const t of ['STOP.','« stop »',' stop ! '])await scenario(`Variante acceptée : ${t}`,async()=>{
  await say(PERSO,ADMIN,'Bonjour');await say(PERSO,MEMBER,t);assert.equal((await prefs()).product_emails,false);
});
await scenario('Une ligne de préférences existante est mise à jour, les autres familles restent',async()=>{
  await db.query('INSERT INTO email_preferences(user_id,digest_emails) VALUES($1,false)',[MEMBER]);
  await say(PERSO,ADMIN,'Bonjour');await say(PERSO,MEMBER,'stop');
  assert.deepEqual(await prefs(),{product_emails:false,digest_emails:false,alert_emails:true});
});
for(const t of ['Stop merci de votre message, je publie demain','1','Non stop'])await scenario(`Texte hors règle : ${t}`,async()=>{
  await say(PERSO,ADMIN,'Bonjour');await say(PERSO,MEMBER,t);assert.equal(await prefs(),undefined);assert.equal((await acks(PERSO)).length,0);
});
await scenario('Conversation de garde : rien ne change',async()=>{
  await say(GARDE,ADMIN,'Bonjour');await say(GARDE,MEMBER,'Stop');assert.equal(await prefs(),undefined);assert.equal((await acks(GARDE)).length,0);
});
await scenario('Conversation entre deux membres : rien ne change',async()=>{
  await say(MEMBRES,OTHER,'Bonjour');await say(MEMBRES,MEMBER,'Stop');assert.equal(await prefs(),undefined);
});
await scenario('Sans message de l\'équipe avant : rien ne change',async()=>{
  await say(VIDE,MEMBER,'Stop');assert.equal(await prefs(),undefined);
});
await scenario('Un « stop » écrit par l\'équipe : rien ne change',async()=>{
  await say(PERSO,ADMIN,'Bonjour');await say(PERSO,ADMIN,'Stop');
  assert.equal((await db.query('SELECT count(*)::int n FROM email_preferences')).rows[0].n,0);
});
await scenario('Une panne du traitement laisse le message du membre s\'écrire',async()=>{
  await say(PERSO,ADMIN,'Bonjour');await db.exec('ALTER TABLE email_preferences RENAME TO email_preferences_x');
  await say(PERSO,MEMBER,'Stop');
  assert.equal((await db.query("SELECT count(*)::int n FROM messages WHERE content='Stop'")).rows[0].n,1);
});
console.log(passed.map(p=>'ok  '+p).join('\n'));console.log(`${passed.length} scénarios STOP1 verts`);
