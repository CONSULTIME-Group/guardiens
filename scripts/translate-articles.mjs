#!/usr/bin/env node
/**
 * Batch translate published articles (FR -> EN/ES/IT/DE) via Lovable AI Gateway.
 * Stores results in public.article_translations.
 *
 * Usage:
 *   LOVABLE_API_KEY=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/translate-articles.mjs [--lang en] [--limit 10] [--force]
 *
 * Resumable: skips (article_id, lang) pairs that already exist unless --force.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://erhccyqevdyevpyctsjj.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LOVABLE_KEY = process.env.LOVABLE_API_KEY;
if (!SERVICE_KEY || !LOVABLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY or LOVABLE_API_KEY");
  process.exit(1);
}

const args = process.argv.slice(2);
const getArg = (k, d) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : d;
};
const FORCE = args.includes("--force");
const ONLY_LANG = getArg("--lang", null);
const LIMIT = parseInt(getArg("--limit", "9999"), 10);
const LANGS = ONLY_LANG ? [ONLY_LANG] : ["en", "es", "it", "de"];
const MODEL = getArg("--model", "google/gemini-2.5-flash");

const LANG_NAMES = { en: "English", es: "Spanish (Spain)", it: "Italian", de: "German" };

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function slugify(s) {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

async function translateArticle(article, lang) {
  const sys = `You are a professional translator for a pet-sitting marketplace.
Translate the French JSON payload below into ${LANG_NAMES[lang]}.
Rules:
- Preserve all Markdown formatting (headings, lists, links, images, code blocks) EXACTLY.
- Keep all URLs, slugs, image paths, brand names ("Guardiens"), and proper nouns unchanged.
- Natural, fluent, idiomatic ${LANG_NAMES[lang]} — not literal.
- Use formal "you" (vous in French equivalent: e.g. Sie in DE, usted in ES, lei in IT, you in EN).
- NEVER use the em dash character "—" (U+2014). Replace it with commas, colons, parentheses, periods, or "–" for number ranges.
- NEVER use the word "neighbor/neighbour/neighborhood" or its translations ("vicino", "Nachbar", "vecino"). Use "local", "trusted person", "community member", "guardian" instead.
- Return STRICT JSON only, same keys as input. No commentary, no markdown fences.`;

  const payload = {
    title: article.title,
    excerpt: article.excerpt,
    meta_title: article.meta_title || "",
    meta_description: article.meta_description || "",
    hero_image_alt: article.hero_image_alt || "",
    content: article.content,
  };

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: JSON.stringify(payload) },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`AI gateway ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty AI response");
  // Robust parse: handle stray trailing comma, accidental code fences
  let cleaned = content.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Try to recover by trimming after last closing brace
    const lastBrace = cleaned.lastIndexOf("}");
    if (lastBrace > 0) {
      try { return JSON.parse(cleaned.slice(0, lastBrace + 1)); } catch {}
    }
    throw e;
  }
}

async function main() {
  console.log(`Fetching published articles…`);
  const { data: articles, error } = await supabase
    .from("articles")
    .select("id, slug, title, excerpt, content, meta_title, meta_description, hero_image_alt")
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(LIMIT);
  if (error) throw error;

  // Exclude articles whose slug is the source of a redirect (never displayed)
  const { data: redirectsRows } = await supabase
    .from("redirects")
    .select("slug_from");
  const redirected = new Set((redirectsRows || []).map((r) => r.slug_from));
  const filtered = articles.filter((a) => !redirected.has(a.slug));
  console.log(`${filtered.length} active articles (${articles.length - filtered.length} redirected, skipped), langs: ${LANGS.join(",")}`);

  // Existing pairs
  const { data: existing } = await supabase
    .from("article_translations")
    .select("article_id, lang");
  const have = new Set((existing || []).map((e) => `${e.article_id}:${e.lang}`));

  let done = 0, skipped = 0, failed = 0;
  for (const art of filtered) {
    for (const lang of LANGS) {
      const key = `${art.id}:${lang}`;
      if (!FORCE && have.has(key)) { skipped++; continue; }
      let tr = null, lastErr = null;
      for (let attempt = 0; attempt < 2 && !tr; attempt++) {
        try {
          process.stdout.write(`[${lang}] ${art.slug}${attempt > 0 ? " (retry)" : ""} … `);
          tr = await translateArticle(art, lang);
        } catch (e) {
          lastErr = e;
          process.stdout.write(`FAIL(${e.message.slice(0, 60)}) `);
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
      if (!tr) { failed++; console.log("GIVE UP"); continue; }
      const slug = `${art.slug}-${lang}`;
      const { error: upErr } = await supabase
        .from("article_translations")
        .upsert({
          article_id: art.id, lang, slug,
          title: tr.title || "",
          excerpt: tr.excerpt || "",
          content: tr.content || "",
          meta_title: tr.meta_title || null,
          meta_description: tr.meta_description || null,
          hero_image_alt: tr.hero_image_alt || null,
        }, { onConflict: "article_id,lang" });
      if (upErr) { failed++; console.log(`UPSERT FAIL: ${upErr.message}`); }
      else { done++; console.log("ok"); }
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  console.log(`\nDone: ${done} translated, ${skipped} skipped, ${failed} failed.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
