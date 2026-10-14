/**
 * Lot Z2 : textes des pages ville (seo_city_pages) laissés hors périmètre par Y3.
 * Le fichier préparé sauvegarde d'abord les lignes visées, puis ne fait que des
 * UPDATE replace() gardés par l'ancienne phrase exacte (rejouables), et les
 * nouvelles phrases suivent la doctrine des textes (AGENTS.md, lot Y3).
 * Lecture statique du SQL, aucune base touchée.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = readFileSync(
  join(__dirname, "..", "..", "..", "supabase/prepared-migrations/20261014100100_z2_pages_ville.sql"),
  "utf8",
);
const code = sql.replace(/^\s*--[^\n]*$/gm, "");
const allStatements = code
  .split(/;\s*\n/)
  .map((s) => s.trim())
  .filter((s) => s.length > 0);
const BACKUP = "public._backup_z2_villes_20261014";
const backupStatements = allStatements.filter((s) => s.includes(BACKUP));
const statements = allStatements.filter((s) => !s.includes(BACKUP));
const COLUMNS = ["content", "intro_text", "excerpt", "meta_description"];

type Update = { column: string; oldText: string; newText: string; guard: string; guardColumn: string };

const UPDATE_RE =
  /^UPDATE public\.seo_city_pages\s+SET (\w+) = replace\((\w+),\s+\$z2\$([\s\S]*?)\$z2\$,\s+\$z2\$([\s\S]*?)\$z2\$\)\s+WHERE position\(\$z2\$([\s\S]*?)\$z2\$ in (\w+)\) > 0$/;

function parseUpdates(): Update[] {
  return statements.map((s) => {
    const m = UPDATE_RE.exec(s);
    expect(m, s.slice(0, 120)).not.toBeNull();
    const [, column, replaced, oldText, newText, guard, guardColumn] = m!;
    expect(replaced).toBe(column);
    return { column, oldText, newText, guard, guardColumn };
  });
}

/** Formes que la doctrine Y3 interdit dans un texte public. */
const FORBIDDEN: Array<[string, RegExp]> = [
  ["sans engagement", /sans engagement/i],
  ["aucun engagement", /aucun engagement|engage à rien/i],
  ["offert", /\boffert/i],
  ["gratuit pour", /gratuite?s? pour/i],
  ["phase ou offre de lancement", /(phase|offre) de lancement/i],
  ["pension", /pension|chenil/i],
  ["pet-sitter", /pet[- ]?sitt/i],
  ["tiret cadratin ou demi-cadratin", /[—–]/],
  ["0 €", /\b0\s?€/],
  ["60 %", /\b60\s?%/],
  ["rencontre obligatoire", /obligation|obligatoire|sans exception|déconseill|indispensable|systématique/i],
  ["rencontre règle ou étape", /règle d'or|règle fondamentale|règle absolue|règle de prudence|L'étape (cruciale|clé|la plus importante)|Rencontrez les gardiens/i],
  ["rencontre appuyée", /vivement|très fortement|fortement recommand|recommandation forte/i],
  ["facturation", /formules?\b|contribution|abonnement|payant|factur/i],
  ["comparaison", /contrairement à d'autres|autres plateformes|groupe de discussion/i],
  ["ponctuation", /,,|, :/],
];

describe("Z2 · SQL des pages ville", () => {
  it("sauvegarde rejouable et fermée, avant tout UPDATE", () => {
    expect(backupStatements.length).toBe(3);
    expect(allStatements.slice(0, 3)).toEqual(backupStatements);
    expect(backupStatements[0]).toMatch(
      /^CREATE TABLE IF NOT EXISTS public\._backup_z2_villes_20261014 AS\s+WITH z2\(fld, old\) AS \(VALUES/,
    );
    expect(backupStatements[0]).toContain("FROM public.seo_city_pages p");
    expect(backupStatements[1]).toBe(`ALTER TABLE ${BACKUP} ENABLE ROW LEVEL SECURITY`);
    expect(backupStatements[2]).toBe(`REVOKE ALL ON ${BACKUP} FROM PUBLIC, anon, authenticated`);
  });

  it("la sauvegarde couvre chaque ancienne phrase de chaque UPDATE", () => {
    const backed = new Set<string>();
    const row = /\('([ciem])', \$z2\$([\s\S]*?)\$z2\$\)/g;
    let m: RegExpExecArray | null;
    while ((m = row.exec(backupStatements[0])) !== null) backed.add(`${m[1]}|${m[2]}`);
    const updates = parseUpdates();
    expect(backed.size).toBe(new Set(updates.map((u) => `${u.column}|${u.oldText}`)).size);
    const code1 = { content: "c", intro_text: "i", excerpt: "e", meta_description: "m" } as const;
    for (const u of updates) {
      expect(backed.has(`${code1[u.column as keyof typeof code1]}|${u.oldText}`), u.oldText).toBe(true);
    }
  });

  it("hors sauvegarde, uniquement des UPDATE de seo_city_pages, chacun gardé par l'ancienne phrase exacte", () => {
    expect(statements.join("\n")).not.toMatch(/\b(DELETE|INSERT|TRUNCATE|DROP|ALTER|CREATE|GRANT)\b/);
    const updates = parseUpdates();
    expect(updates.length).toBeGreaterThan(300);
    for (const u of updates) {
      expect(COLUMNS).toContain(u.column);
      expect(u.guardColumn).toBe(u.column);
      expect(u.guard).toBe(u.oldText);
      expect(u.oldText.trim().length).toBeGreaterThan(10);
      expect(u.newText).not.toBe(u.oldText);
    }
  });

  it("rejouable : aucune nouvelle phrase ne recrée une ancienne phrase du même champ", () => {
    const updates = parseUpdates();
    for (const u of updates) {
      for (const v of updates) {
        if (u.column === v.column && u.newText.length > 0) {
          expect(u.newText.includes(v.oldText), `${u.newText} contient ${v.oldText}`).toBe(false);
        }
      }
    }
    // Une ancienne phrase contenue dans une autre passe après elle.
    updates.forEach((u, i) => {
      updates.forEach((v, j) => {
        if (i !== j && u.column === v.column && v.oldText.includes(u.oldText)) expect(j).toBeLessThan(i);
      });
    });
  });

  it("une phrase retirée l'est entière, espace initial compris", () => {
    const removed = parseUpdates().filter((u) => u.newText === "");
    expect(removed.length).toBe(4);
    for (const u of removed) expect(u.oldText).toMatch(/^ [A-ZÀ-Ý].*\.$/);
  });

  it("les nouvelles phrases suivent la doctrine des textes", () => {
    const texts = parseUpdates().map((u) => u.newText).filter((t) => t.length > 0);
    expect(texts.length).toBeGreaterThan(300);
    for (const t of texts) {
      for (const [label, re] of FORBIDDEN) expect(re.test(t), `${label} : ${t}`).toBe(false);
      // Une gratuité dite sans durée : jamais « aujourd'hui » ni « actuellement » à côté de « gratuit ».
      if (/gratui/i.test(t)) expect(/aujourd'hui|actuellement|pour le moment/i.test(t), t).toBe(false);
    }
  });

  it("la rencontre reste au choix des deux, et la gratuité est dite simplement", () => {
    const texts = parseUpdates().map((u) => u.newText);
    const meeting = texts.filter((t) => /rencontr|entretien/i.test(t));
    expect(meeting.length).toBeGreaterThan(50);
    expect(texts.some((t) => t.includes("Guardiens est gratuit"))).toBe(true);
    expect(texts).toContain("### Étape 2, Échangez avec les gardiens intéressés");
  });
});
