#!/usr/bin/env node
// Contrôles de schéma en lecture seule. Aucun DDL, aucun changement en production.
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const manifest = JSON.parse(readFileSync(resolve(root, "scripts/db/production-contracts.json"), "utf8"));
const names = readdirSync(resolve(root, "drizzle/migrations"))
  .filter((name) => /^\d{4}_.+\.sql$/.test(name));
const tracked = names.filter((name) => Number(name.slice(0, 4)) >= manifest.baselineMigrationNumber);
const registered = new Map();
let failed = false;

for (const contract of manifest.contracts) {
  if (registered.has(contract.migration)) throw new Error("Contrat en double : " + contract.migration);
  registered.set(contract.migration, contract);
  if (!names.includes(contract.migration)) throw new Error("Migration inconnue : " + contract.migration);
  if (!Array.isArray(contract.checks) || !contract.checks.length) throw new Error("Contrôle manquant : " + contract.migration);
  for (const check of contract.checks) {
    // Autorise uniquement des requêtes SELECT explicites ; transaction SQL READ ONLY en plus.
    if (typeof check.name !== "string" || !/^SELECT\s/i.test(check.sql) ||
        /;|\b(INSERT|UPDATE|DELETE|ALTER|CREATE|DROP|TRUNCATE|GRANT|REVOKE|CALL|DO)\b/i.test(check.sql)) {
      throw new Error("Contrôle SQL non autorisé : " + contract.migration + "/" + check.name);
    }
  }
}
const missing = tracked.filter((name) => !registered.has(name));
if (missing.length) {
  console.error("Migrations non couvertes par un contrôle de production : " + missing.join(", "));
  process.exit(1);
}
console.log("Couverture migration OK : " + tracked.length + " fichier(s) contrôlé(s).");

if (process.argv.includes("--local")) process.exit(0);
const url = process.env.GUARDIENS_PROD_DATABASE_URL;
if (!url) {
  console.error("ÉCHEC : secret GUARDIENS_PROD_DATABASE_URL absent. Sonde non exécutée.");
  process.exit(2);
}
// Import dynamique pour éviter la dépendance PostgreSQL pendant les tests de couverture locaux.
const { default: postgres } = await import("postgres");
const db = postgres(url, {
  ssl: "require", max: 1, connect_timeout: 10, idle_timeout: 5,
  prepare: false, application_name: "guardiens-db-drift-guard"
});
try {
  await db.begin("read only", async (tx) => {
    await tx.unsafe("SET LOCAL statement_timeout = '5000ms'");
    for (const contract of manifest.contracts) {
      for (const check of contract.checks) {
        try {
          const rows = await tx.unsafe(check.sql);
          if (rows.length !== 1 || rows[0].ok !== true) {
            failed = true;
            console.error("DRIFT : " + contract.migration + "/" + check.name + " (résultat non conforme)");
          } else {
            console.log("OK : " + contract.migration + "/" + check.name);
          }
        } catch (error) {
          failed = true;
          console.error("DRIFT : " + contract.migration + "/" + check.name + ": " + error.message);
        }
      }
    }
  });
} catch (error) {
  console.error("ÉCHEC de connexion ou de transaction de contrôle : " + error.message);
  process.exitCode = 2;
} finally {
  await db.end({ timeout: 5 });
}
if (failed) process.exitCode = 1;
