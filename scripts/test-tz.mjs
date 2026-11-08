// Lot DATE1 : rejoue les verrous de dates sous quatre fuseaux.
// Usage : node scripts/test-tz.mjs [dossiers de tests…]
import { spawnSync } from "node:child_process";
const zones = ["Europe/Paris", "America/Martinique", "Pacific/Tahiti", "Pacific/Noumea"];
const suites = process.argv.slice(2).length ? process.argv.slice(2) : ["src/__tests__/date1", "src/__tests__/pub3", "src/__tests__/perf12"];
let failed = false;
for (const tz of zones) {
  const r = spawnSync("npx", ["vitest", "run", ...suites], { stdio: "inherit", env: { ...process.env, TZ: tz } });
  console.log(`${tz} : ${r.status === 0 ? "vert" : "rouge"}`);
  if (r.status !== 0) failed = true;
}
process.exit(failed ? 1 : 0);
