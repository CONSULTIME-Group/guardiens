// Garde-fou : aucune fonction du schéma public ne contient de DELETE ou
// d'UPDATE sans clause WHERE. pg_safeupdate refuse ces instructions quand
// l'appel passe par l'API (incident notify-mission-wave, 22/09/2026).
//
// Source : la base réelle (psql, variables PG*). Sans accès base, repli sur la
// dernière définition de chaque fonction dans les migrations du dépôt.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

/** Retire commentaires et littéraux chaîne (le SQL dynamique n'est pas analysé). */
export function stripSql(src) {
  return src
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\$([A-Za-z_]*)\$[\s\S]*?\$\1\$/g, "''")
    .replace(/'(?:[^']|'')*'/g, "''");
}

/** Renvoie les instructions DELETE/UPDATE sans WHERE d'un corps de fonction. */
export function findUnboundedDml(body) {
  const out = [];
  for (const raw of stripSql(body).split(';')) {
    const stmt = raw.replace(/\s+/g, ' ').trim();
    // Début d'instruction DELETE, éventuellement après WITH ... ou un mot clé de bloc.
    const del = /(?:^|\b(?:BEGIN|THEN|ELSE|LOOP|\)))\s*DELETE\s+FROM\b(.*)$/i.exec(stmt);
    const upd = /(?:^|\b(?:BEGIN|THEN|ELSE|LOOP|\)))\s*UPDATE\s+(?!.*\bDO\s+UPDATE\b)[\w."]+(?:\s+(?:AS\s+)?\w+)?\s+SET\b(.*)$/i.exec(stmt);
    for (const m of [del, upd]) {
      if (!m) continue;
      if (/\bDO\s+UPDATE\b/i.test(stmt) && m === upd) continue;
      if (!/\bWHERE\b/i.test(m[1]) && !/\bWHERE\s+CURRENT\s+OF\b/i.test(m[1])) out.push(stmt.slice(0, 160));
    }
  }
  return out;
}

// Auto-tests du détecteur.
assert.deepEqual(findUnboundedDml('BEGIN DELETE FROM _wave_pick WHERE true; END'), []);
assert.equal(findUnboundedDml('BEGIN DELETE FROM _wave_pick; END').length, 1);
assert.equal(findUnboundedDml('BEGIN UPDATE public.t SET a = 1; END').length, 1);
assert.deepEqual(findUnboundedDml("BEGIN UPDATE t SET a = 1 WHERE id = x; END"), []);
assert.deepEqual(findUnboundedDml('INSERT INTO t VALUES (1) ON CONFLICT (id) DO UPDATE SET a = 1'), []);
assert.deepEqual(findUnboundedDml("PERFORM 1; -- DELETE FROM x;\n EXECUTE 'DELETE FROM y'"), []);
assert.deepEqual(findUnboundedDml('SELECT * FROM t FOR UPDATE'), []);

function fromDatabase() {
  const sql = `select n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' as name, p.prosrc
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    join pg_language l on l.oid=p.prolang
    where n.nspname='public' and l.lanname in ('plpgsql','sql')
      and not exists (select 1 from pg_depend d where d.objid=p.oid and d.deptype='e')`;
  const raw = execFileSync('psql', ['-X', '-At', '-F', '\u001f', '-R', '\u001e', '-c', sql], { encoding: 'utf8', maxBuffer: 64 << 20 });
  return raw.split('\u001e').filter(Boolean).map((r) => { const [name, body] = r.split('\u001f'); return { name, body }; });
}

function fromRepo() {
  const files = [];
  for (const dir of ['supabase/migrations', 'drizzle/migrations']) {
    try { for (const f of readdirSync(dir).sort()) if (f.endsWith('.sql')) files.push(`${dir}/${f}`); } catch {}
  }
  const last = new Map();
  const rx = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?"?(\w+)"?\s*\([\s\S]*?\bAS\s+(\$\w*\$)([\s\S]*?)\2/gi;
  for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(rx)) last.set(m[1], { name: `public.${m[1]}`, body: m[3] });
  return [...last.values()];
}

let fns; let source = 'base';
if (process.env.PGHOST || process.env.DATABASE_URL) {
  try { fns = fromDatabase(); } catch { fns = null; }
}
if (!fns) { fns = fromRepo(); source = 'dépôt'; }

const offenders = [];
for (const f of fns) for (const s of findUnboundedDml(f.body ?? '')) offenders.push(`${f.name}: ${s}`);
if (offenders.length) {
  console.error(`DML sans WHERE (${source}, ${fns.length} fonctions) :\n` + offenders.join('\n'));
  process.exit(1);
}
console.log(`no-unbounded-dml OK (${source}, ${fns.length} fonctions)`);
