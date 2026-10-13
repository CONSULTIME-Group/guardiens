/**
 * Lot Y2 : analyse statique des migrations SQL.
 *
 * Repère toute fonction SECURITY DEFINER qui renvoie une colonne email
 * (RETURNS TABLE(... email ...), owner_email, canonical_email, ou une ligne
 * entière de profiles) et vérifie, dans le même fichier :
 *  - un REVOKE explicite visant anon ET authenticated (un REVOKE FROM PUBLIC
 *    seul ne retire rien : Supabase accorde EXECUTE à anon et authenticated
 *    nommément, cause commune des constats P3-01 à P3-05) ;
 *  - si un GRANT rend ensuite l'accès à anon, authenticated ou PUBLIC, un
 *    contrôle d'appelant dans le corps (auth.uid() ou has_role).
 *
 * Module pur (fs et path de Node seulement), sans variable globale Deno.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export const MIGRATION_DIRS = [
  "supabase/migrations",
  "supabase/prepared-migrations",
  "drizzle/migrations",
];

export interface SqlFunctionDef {
  name: string;
  header: string;
  body: string;
  trailer: string;
}

export interface Exposure {
  file: string;
  fn: string;
  reason: "revoke_missing" | "regrant_without_guard";
}

/** Retire les commentaires SQL (ligne et bloc). */
export function stripSqlComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
}

function bareName(raw: string): string {
  const parts = raw.replace(/"/g, "").split(".");
  return parts[parts.length - 1].trim().toLowerCase();
}

/** Découpe les CREATE FUNCTION d'un fichier (corps à dollars ou entre quotes). */
export function parseFunctions(sqlRaw: string): SqlFunctionDef[] {
  const sql = stripSqlComments(sqlRaw);
  const out: SqlFunctionDef[] = [];
  const re = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+((?:"?[\w]+"?\.)?"?[\w]+"?)\s*\(/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql))) {
    const start = m.index;
    const name = bareName(m[1]);
    const rest = sql.slice(start);
    // Début du corps : AS suivi d'un dollar-quote, ou d'une chaîne simple.
    const asDollar = /\bAS\s+(\$[\w]*\$)/i.exec(rest);
    const asQuote = /\bAS\s+'/i.exec(rest);
    let header: string;
    let body: string;
    let afterBody: string;
    if (asDollar && (!asQuote || asDollar.index <= asQuote.index)) {
      const tag = asDollar[1];
      const bodyStart = asDollar.index + asDollar[0].length;
      const bodyEnd = rest.indexOf(tag, bodyStart);
      if (bodyEnd < 0) break;
      header = rest.slice(0, asDollar.index);
      body = rest.slice(bodyStart, bodyEnd);
      afterBody = rest.slice(bodyEnd + tag.length);
    } else if (asQuote) {
      const bodyStart = asQuote.index + asQuote[0].length;
      let i = bodyStart;
      while (i < rest.length) {
        if (rest[i] === "'" && rest[i + 1] === "'") { i += 2; continue; }
        if (rest[i] === "'") break;
        i++;
      }
      header = rest.slice(0, asQuote.index);
      body = rest.slice(bodyStart, i);
      afterBody = rest.slice(i + 1);
    } else {
      const semi = rest.indexOf(";");
      header = semi < 0 ? rest : rest.slice(0, semi);
      body = "";
      afterBody = "";
    }
    const semi = afterBody.indexOf(";");
    const trailer = semi < 0 ? afterBody : afterBody.slice(0, semi);
    out.push({ name, header, body, trailer });
    // Reprise après le corps : un CREATE FUNCTION cité dans un corps
    // (EXECUTE format(...)) n'est pas une définition du fichier.
    re.lastIndex = start + Math.max(header.length + 1, rest.length - afterBody.length);
  }
  return out;
}

export function isSecurityDefiner(f: SqlFunctionDef): boolean {
  return /\bSECURITY\s+DEFINER\b/i.test(f.header + " " + f.trailer);
}

/** La clause RETURNS expose-t-elle une adresse email ? */
export function returnsEmail(f: SqlFunctionDef): boolean {
  const idx = f.header.search(/\bRETURNS\b/i);
  if (idx < 0) return false;
  const returns = f.header.slice(idx);
  if (/\bRETURNS\s+trigger\b/i.test(returns)) return false;
  if (/email/i.test(returns)) return true;
  // Ligne entière de profiles (colonne email comprise).
  return /\bRETURNS\s+(?:SETOF\s+)?(?:"?public"?\.)?"?profiles"?\b/i.test(returns);
}

export function hasCallerGuard(f: SqlFunctionDef): boolean {
  return /auth\.uid\s*\(\s*\)|\bhas_role\s*\(/i.test(f.body);
}

function rolesOf(list: string): Set<string> {
  return new Set(
    list
      .split(",")
      .map((r) => r.replace(/"/g, "").trim().toLowerCase())
      .filter(Boolean),
  );
}

function targetsFunction(targets: string, fn: string): boolean {
  if (/ALL\s+FUNCTIONS\s+IN\s+SCHEMA\s+"?public"?/i.test(targets)) return true;
  return new RegExp(`(?:^|[\\s,."])${fn}"?\\s*\\(`, "i").test(targets);
}

/** Rôles retirés (REVOKE) et rendus (GRANT) pour une fonction du fichier. */
export function privilegeStatements(sqlRaw: string, fn: string): { revoked: Set<string>; granted: Set<string> } {
  const sql = stripSqlComments(sqlRaw);
  const revoked = new Set<string>();
  const granted = new Set<string>();
  const rev = /REVOKE\s+(?:EXECUTE|ALL(?:\s+PRIVILEGES)?)\s+ON\s+((?:ALL\s+)?FUNCTIONS?\s+[\s\S]*?)\s+FROM\s+([^;]+);/gi;
  const gra = /GRANT\s+(?:EXECUTE|ALL(?:\s+PRIVILEGES)?)\s+ON\s+((?:ALL\s+)?FUNCTIONS?\s+[\s\S]*?)\s+TO\s+([^;]+);/gi;
  for (const m of sql.matchAll(rev)) {
    if (targetsFunction(m[1], fn)) rolesOf(m[2]).forEach((r) => revoked.add(r));
  }
  for (const m of sql.matchAll(gra)) {
    if (targetsFunction(m[1], fn)) rolesOf(m[2].replace(/\bWITH\s+GRANT\s+OPTION\b/i, "")).forEach((r) => granted.add(r));
  }
  return { revoked, granted };
}

/** Expositions d'un fichier SQL. */
export function scanSql(file: string, sql: string): Exposure[] {
  const out: Exposure[] = [];
  const seen = new Set<string>();
  for (const f of parseFunctions(sql)) {
    if (!isSecurityDefiner(f) || !returnsEmail(f)) continue;
    if (seen.has(f.name)) continue;
    seen.add(f.name);
    const { revoked, granted } = privilegeStatements(sql, f.name);
    if (!revoked.has("anon") || !revoked.has("authenticated")) {
      out.push({ file, fn: f.name, reason: "revoke_missing" });
      continue;
    }
    const regranted = ["anon", "authenticated", "public"].some((r) => granted.has(r));
    if (regranted && !hasCallerGuard(f)) {
      out.push({ file, fn: f.name, reason: "regrant_without_guard" });
    }
  }
  return out;
}

function* sqlFiles(dir: string): Generator<string> {
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries.sort()) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* sqlFiles(full);
    else if (entry.endsWith(".sql")) yield full;
  }
}

/** Toutes les expositions des dossiers de migrations (chemins relatifs à root). */
export function scanRepository(root: string): Exposure[] {
  const out: Exposure[] = [];
  for (const dir of MIGRATION_DIRS) {
    for (const full of sqlFiles(join(root, dir))) {
      const rel = full.slice(root.length + 1).split("\\").join("/");
      out.push(...scanSql(rel, readFileSync(full, "utf8")));
    }
  }
  return out;
}
