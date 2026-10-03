// Test SQL inerte : PostgreSQL en mémoire (PGlite), aucune base réelle touchée.
// Usage : bun supabase/prepared-migrations/acquire_proximity_send_claim.sqltest.ts
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const db = new PGlite();
const one = async (sql: string) => {
  const r = await db.query<Record<string, unknown>>(sql);
  return r.rows[0] ? String(Object.values(r.rows[0])[0]) : "";
};
let failed = 0;
const eq = (got: string, want: string, label: string) => {
  if (got === want) console.log(`ok  ${label}`);
  else { failed++; console.log(`ÉCHEC ${label} (obtenu '${got}', attendu '${want}')`); }
};

// Socle copié de la production (table + finish global, inchangés).
await db.exec(`
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;
CREATE TABLE public.member_email_send_claims (
  claim_key text PRIMARY KEY, owner_token uuid NOT NULL, state text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE FUNCTION public.finish_member_email_send_claim(p_claim_key text, p_owner_token uuid, p_outcome text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
BEGIN
  IF p_outcome IS NULL OR p_outcome NOT IN ('sent','retryable','uncertain') THEN
    RAISE EXCEPTION 'invalid send outcome' USING ERRCODE = '22023'; END IF;
  UPDATE public.member_email_send_claims SET state = p_outcome, updated_at = now()
    WHERE claim_key = p_claim_key AND owner_token = p_owner_token AND state = 'sending';
  RETURN FOUND;
END $$;`);
await db.exec(readFileSync(new URL("./20261003110000_acquire_proximity_send_claim.sql", import.meta.url), "utf8"));

const K = "a".repeat(64), K2 = "b".repeat(64);
const T1 = "11111111-1111-1111-1111-111111111111", T2 = "22222222-2222-2222-2222-222222222222";
const acq = (k: string, t: string) => one(`select public.acquire_proximity_send_claim('${k}','${t}')`);
const fin = (k: string, t: string, o: string) => one(`select public.finish_member_email_send_claim('${k}','${t}','${o}')`);
const age = (k: string, i: string) => db.exec(`update member_email_send_claims set updated_at = now() - interval '${i}' where claim_key='${k}'`);
const owner = (k: string) => one(`select owner_token from member_email_send_claims where claim_key='${k}'`);

eq(await acq(K, T1), "acquired", "clé neuve acquise");
eq(await acq(K, T2), "busy", "deuxième acquisition concurrente refusée");
await age(K, "16 minutes");
eq(await acq(K, T2), "busy", "sending vieux de 16 min : jamais repris");
await age(K, "30 days");
eq(await acq(K, T2), "busy", "sending vieux de 30 jours : jamais repris");
eq(await owner(K), T1, "propriétaire d'origine conservé");
eq(await fin(K, T2, "sent"), "false", "un autre jeton ne peut pas finaliser");
eq(await fin(K, T1, "uncertain"), "true", "le propriétaire finalise en uncertain");
await age(K, "7 hours");
eq(await acq(K, T2), "uncertain", "uncertain vieux de 7 h : jamais repris");
eq(await owner(K), T1, "propriétaire toujours inchangé");

await acq(K2, T1); await fin(K2, T1, "retryable");
eq(await acq(K2, T2), "acquired", "retryable explicite : réacquis");
eq(await owner(K2), T2, "nouveau propriétaire après retryable");
await fin(K2, T2, "sent"); await age(K2, "1 year");
eq(await acq(K2, T1), "sent", "sent : jamais réacquis");

let rejected = false;
try { await acq("pas-hex", T1); } catch { rejected = true; }
eq(String(rejected), "true", "clé invalide refusée");

const sig = "public.acquire_proximity_send_claim(text,uuid)";
eq(await one(`select has_function_privilege('anon','${sig}','EXECUTE')`), "false", "anon sans droit");
eq(await one(`select has_function_privilege('authenticated','${sig}','EXECUTE')`), "false", "authenticated sans droit");
eq(await one(`select has_function_privilege('service_role','${sig}','EXECUTE')`), "true", "service_role peut exécuter");
eq(await one(`select count(*) from information_schema.routine_privileges where routine_name='acquire_proximity_send_claim' and grantee='PUBLIC'`), "0", "aucun droit PUBLIC");
eq(await one(`select prosecdef::text || ' ' || array_to_string(proconfig, ',') from pg_proc where proname='acquire_proximity_send_claim'`),
  "true search_path=public, pg_temp", "SECURITY DEFINER et search_path fixé");

console.log(failed ? `${failed} ÉCHEC(S)` : "TOUS LES TESTS SQL PASSENT");
process.exit(failed ? 1 : 0);
