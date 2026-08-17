#!/usr/bin/env node
/**
 * Translates src/i18n/locales/fr/common.json into en via Lovable AI.
 * Preserves keys and ICU placeholders ({{var}}). Uses formal "you" (vouvoiement).
 * (it/de/es retirés du produit le 17/08/2026.)
 */
import fs from "node:fs";
import path from "node:path";

const API_KEY = process.env.LOVABLE_API_KEY;
if (!API_KEY) { console.error("LOVABLE_API_KEY missing"); process.exit(1); }

const SRC = "src/i18n/locales/fr/common.json";
const TARGETS = [
  { code: "en", name: "English" },
];

const fr = JSON.parse(fs.readFileSync(SRC, "utf8"));

const GLOSSARY = `
Glossary (keep these mappings):
- "Guardiens" → keep as brand name, never translate
- "House-sitting" → keep "house-sitting" (do not translate, recognized worldwide)
- "Gardien / gardienne" → caretaker / pet & home sitter (EN)
- "Coup de main / petites missions" → small favours (EN)
- "Propriétaire" → owner (EN)
- "Bêta" → Beta (everywhere)
- City and department names (Lyon, Rhône, Haute-Savoie...) → keep verbatim
- Use formal address (vouvoiement)
- Keep ICU placeholders like {{lang}} intact
- Preserve JSON structure exactly (same keys, same nesting)
`;

async function translate(lang) {
  const prompt = `Translate the following JSON values from French to ${lang.name}.
Return ONLY a valid JSON object with the EXACT same keys and nesting. Translate only the string VALUES.

${GLOSSARY}

Source JSON:
${JSON.stringify(fr, null, 2)}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": API_KEY,
      "X-Lovable-AIG-SDK": "raw",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "You are a professional translator for a SaaS product. Output strictly valid JSON, no markdown, no commentary." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${lang.code} ${res.status}: ${txt}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${lang.code}: empty response`);
  const parsed = JSON.parse(content);
  return parsed;
}

for (const lang of TARGETS) {
  console.log(`-> ${lang.code}…`);
  try {
    const json = await translate(lang);
    const outPath = path.join("src/i18n/locales", lang.code, "common.json");
    fs.writeFileSync(outPath, JSON.stringify(json, null, 2) + "\n");
    console.log(`   wrote ${outPath}`);
  } catch (e) {
    console.error(`   FAIL ${lang.code}:`, e.message);
    process.exit(2);
  }
}
console.log("Done.");
