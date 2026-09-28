// Lot A1 : les six fonctions déclenchées depuis l'admin refusent tout appelant
// qui n'est ni la clé service ni un admin, avant toute lecture ou requête.
import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

const FNS = [
  "send-onboarding-j1",
  "send-sitter-daily-digest",
  "send-mission-daily-digest",
  "prerender-recache-pending",
  "send-founder-reminder-30",
  "send-founder-reminder-7",
];

for (const fn of FNS) {
  Deno.test(`${fn} : requireCronCaller avant req.json et createClient`, async () => {
    const src = await Deno.readTextFile(new URL(`../${fn}/index.ts`, import.meta.url));
    assertStringIncludes(src, "import { requireCronCaller } from");
    const call = src.search(new RegExp(`requireCronCaller\\(req, corsHeaders, ['"]${fn}['"]\\)`));
    assert(call > 0, "appel absent ou mauvais nom");
    const json = src.indexOf("req.json()");
    const client = src.indexOf("createClient(");
    assert(json === -1 || call < json, "appel après req.json()");
    assert(client === -1 || call < client, "appel après createClient");
  });
}
