#!/usr/bin/env node
/**
 * Vérifie que l'index.html servi en prod contient bien les nouvelles
 * balises title / og / twitter (pas les anciennes versions cachées).
 *
 * Usage:
 *   node scripts/verify-prod-index.mjs
 *   node scripts/verify-prod-index.mjs --url https://guardiens.fr/
 *   node scripts/verify-prod-index.mjs --recache   (déclenche aussi prerender-recache)
 *
 * Exit code 0 si tout est OK, 1 sinon.
 */

const TARGETS = [
  "https://guardiens.lovable.app/",
  "https://guardiens.fr/",
];

// Marqueurs attendus (présence obligatoire)
const REQUIRED_SNIPPETS = [
  "Home sitting", // title + og:title + twitter:title
  "petites missions d'entraide", // description
  "gens du coin", // og:description / twitter:description
];

// Marqueurs interdits (anciennes versions, doivent être absents)
const FORBIDDEN_SNIPPETS = [
  "Partez l'esprit tranquille",
  "Un gardien près de chez vous s'occupe de votre maison",
];

const PRERENDER_RECACHE_URL =
  "https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/prerender-recache";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaGNjeXFldmR5ZXZweWN0c2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMzMzQsImV4cCI6MjA4OTk5OTMzNH0.ltBQtcouoqd5tuv_wQXb92x5Q5YYa9mkEQvZUx0wLTY";

const args = process.argv.slice(2);
const customUrl = args.find((a) => a.startsWith("--url="))?.slice(6);
const shouldRecache = args.includes("--recache");
const urls = customUrl ? [customUrl] : TARGETS;

async function fetchHtml(url) {
  const res = await fetch(`${url}${url.includes("?") ? "&" : "?"}_v=${Date.now()}`, {
    headers: {
      // UA bot pour récupérer la version pré-rendue côté guardiens.fr
      "User-Agent": "facebookexternalhit/1.1",
      "Cache-Control": "no-cache",
    },
  });
  return { status: res.status, html: await res.text() };
}

async function checkUrl(url) {
  console.log(`\n→ ${url}`);
  const { status, html } = await fetchHtml(url);
  // Scan complet du document : Prerender.io peut injecter les balises OG/Twitter
  // après les 8000 premiers caractères (scripts inline volumineux, CSS critique…).
  // On cible uniquement le <head> pour éviter les faux positifs sur le <body>
  // (ex. mention "gens du coin" dans le contenu de la home).
  const headEnd = html.search(/<\/head>/i);
  const head = headEnd > 0 ? html.slice(0, headEnd) : html;

  const missing = REQUIRED_SNIPPETS.filter((s) => !head.includes(s));
  const forbidden = FORBIDDEN_SNIPPETS.filter((s) => head.includes(s));

  const titleMatch = head.match(/<title>([^<]+)<\/title>/i);
  console.log(`  status   : ${status}`);
  console.log(`  <title>  : ${titleMatch ? titleMatch[1] : "(non trouvé)"}`);

  if (missing.length === 0 && forbidden.length === 0) {
    console.log("  ✅ OK — nouvelles balises servies");
    return true;
  }
  if (missing.length) console.log(`  ❌ manquant   : ${missing.join(" | ")}`);
  if (forbidden.length) console.log(`  ❌ ancien détecté : ${forbidden.join(" | ")}`);
  return false;
}

async function recache() {
  console.log("\n⟳ Recache Prerender.io…");
  const res = await fetch(PRERENDER_RECACHE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      urls: ["https://guardiens.fr/", "https://guardiens.fr"],
    }),
  });
  console.log(`  recache status: ${res.status}`);
  console.log(`  ${(await res.text()).slice(0, 200)}`);
}

(async () => {
  if (shouldRecache) await recache();

  const results = await Promise.all(urls.map(checkUrl));
  const allOk = results.every(Boolean);

  console.log(
    `\n${allOk ? "✅ TOUT EST OK" : "🔴 ÉCHEC"} — ${results.filter(Boolean).length}/${results.length} URLs valides`,
  );
  if (!allOk) {
    console.log("\nSi guardiens.lovable.app KO  → recliquer Publier → Update");
    console.log("Si guardiens.fr KO seul       → relancer avec --recache");
  }
  process.exit(allOk ? 0 : 1);
})();
