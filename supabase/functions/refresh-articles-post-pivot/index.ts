// Edge function : refresh IA d'un article post-pivot pricing.
// Sécurité : réservée aux admins (ou service role).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { callLovableAI, STYLE_GUARDRAILS } from "../_shared/ai-gateway.ts";
import { requireAdminOrServiceRole } from "../_shared/require-admin.ts";
import { STRATEGIC_PILLARS, PRICING_BASELINE_LONG, PRICING_BASELINE_SHORT } from "./pillars.ts";
import { validateRefreshedContent, FORBIDDEN_PATTERNS } from "./validator.ts";

const GEMINI_MODEL = "google/gemini-2.5-flash";

const SYSTEM_PROMPT = `Vous êtes un rédacteur éditorial de Guardiens.fr, plateforme française de mise en relation entre propriétaires et gardiens vérifiés pour la garde d'animaux à domicile.

Mission : réviser un article publié qui contient des mentions obsolètes de dates de bascule tarifaire ("1er octobre 2026", "30 septembre 2026", "14/07/2026", "14 juillet 2026") et de prix ("6,99 €/mois", "65 €/an", "12 € oneshot", "10 € oneshot", "0 €" en contexte pricing).

Ces mentions doivent être supprimées ou remplacées par ce baseline si le contexte le justifie :

Version longue : "${PRICING_BASELINE_LONG}"
Version courte : "${PRICING_BASELINE_SHORT}"

${STYLE_GUARDRAILS}

Règles éditoriales additionnelles ABSOLUES :
- Vouvoiement partout, jamais de tutoiement.
- Interdits stricts : "voisin", "voisinage", "à vie", "gratuitement", "essai", "période gratuite", "période d'essai", "gratuit jusqu'au", tiret cadratin (—), tiret demi-cadratin (–) en ponctuation de phrase.
- Utiliser virgule, point, deux-points, parenthèses à la place des tirets longs.
- Ton factuel, chaleureux, sans superlatif ("meilleur", "révolutionnaire", "unique", "seul" sont proscrits).
- Le mot "gratuit" est autorisé, "gratuitement" est interdit.
- "0 €" en contexte pricing devient "Gratuit".

Règles STRUCTURELLES :
1. NE PAS modifier les titres H1, H2, H3, H4 sauf s'ils contiennent une date/prix à retirer.
2. NE PAS créer de nouveaux paragraphes ni de nouvelles sections.
3. NE PAS supprimer d'images, de liens internes, de listes.
4. Préserver le storytelling, les anecdotes, les prénoms des membres cités.
5. Préserver les sitter_tips, conseils pratiques, informations non tarifaires.
6. Si un paragraphe entier n'a plus de sens sans la mention obsolète, le remplacer par le baseline court plutôt que de le supprimer.

Format de retour : le contenu Markdown complet du nouvel article, prêt à remplacer directement le champ "content" en base. Aucun commentaire méta, aucun préambule, juste le contenu.`;

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function countRemovedPatterns(before: string, after: string): { removed: string[]; count: number } {
  const removed: string[] = [];
  let count = 0;
  for (const { pattern, label } of FORBIDDEN_PATTERNS) {
    const g = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
    const beforeMatches = before.match(g)?.length ?? 0;
    const afterMatches = after.match(g)?.length ?? 0;
    if (beforeMatches > afterMatches) {
      removed.push(label);
      count += beforeMatches - afterMatches;
    }
  }
  return { removed, count };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authError = await requireAdminOrServiceRole(req, corsHeaders);
  if (authError) return authError;

  try {
    const { article_id, dry_run } = await req.json();
    if (!article_id || typeof article_id !== "string") {
      return new Response(JSON.stringify({ error: "article_id manquant" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Récupération de l'admin caller (pour log)
    let adminId: string | null = null;
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (token && token !== serviceKey) {
      const { data } = await supabase.auth.getUser(token);
      adminId = data?.user?.id ?? null;
    }

    const { data: article, error: fetchErr } = await supabase
      .from("articles")
      .select("id, slug, content, noindex, admin_notes")
      .eq("id", article_id)
      .maybeSingle();

    if (fetchErr || !article) {
      return new Response(JSON.stringify({ error: "article introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notes = (article.admin_notes ?? "").toString();
    if (!/pivot pricing/i.test(notes) || article.noindex !== true) {
      return new Response(JSON.stringify({ error: "not_eligible" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const before = article.content ?? "";
    const beforeHash = await sha256(before);

    // Appel IA
    const aiResult = await callLovableAI({
      model: GEMINI_MODEL,
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Voici le contenu Markdown actuel de l'article "${article.slug}". Réécrivez-le en appliquant les règles.\n\n---DEBUT ARTICLE---\n${before}\n---FIN ARTICLE---`,
        },
      ],
    });

    if (!aiResult.ok) {
      await supabase.from("article_refresh_logs").insert({
        article_id,
        admin_id: adminId,
        dry_run: !!dry_run,
        before_content_hash: beforeHash,
        applied: false,
        gemini_model: GEMINI_MODEL,
        error_message: aiResult.error,
      });
      return new Response(JSON.stringify({ error: aiResult.error, code: aiResult.code }), {
        status: aiResult.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newContent: string = aiResult.data?.choices?.[0]?.message?.content ?? "";
    const inputTokens: number | null = aiResult.data?.usage?.prompt_tokens ?? null;
    const outputTokens: number | null = aiResult.data?.usage?.completion_tokens ?? null;

    if (!newContent || newContent.trim().length < 200) {
      await supabase.from("article_refresh_logs").insert({
        article_id,
        admin_id: adminId,
        dry_run: !!dry_run,
        before_content_hash: beforeHash,
        applied: false,
        gemini_model: GEMINI_MODEL,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        error_message: "Contenu IA vide ou trop court",
      });
      return new Response(JSON.stringify({ error: "Réponse IA vide ou trop courte" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validation
    const validation = validateRefreshedContent(newContent);
    const { removed, count } = countRemovedPatterns(before, newContent);
    const afterHash = await sha256(newContent);
    const isPillar = STRATEGIC_PILLARS.includes(article.slug);

    const diff = {
      before_excerpt: before.slice(0, 200),
      after_excerpt: newContent.slice(0, 200),
      removed_patterns: removed,
      changes_count: count,
    };

    if (!validation.ok) {
      await supabase.from("article_refresh_logs").insert({
        article_id,
        admin_id: adminId,
        dry_run: !!dry_run,
        before_content_hash: beforeHash,
        after_content_hash: afterHash,
        changes_count: count,
        removed_patterns: removed,
        warnings: validation.violations,
        applied: false,
        noindex_after: true,
        gemini_model: GEMINI_MODEL,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        error_message: "Validation post-génération échouée",
      });
      return new Response(
        JSON.stringify({
          article_id,
          slug: article.slug,
          changes_applied: false,
          diff,
          warnings: validation.violations.map((v) => `Pattern proscrit détecté : ${v}`),
          noindex_after: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (dry_run) {
      await supabase.from("article_refresh_logs").insert({
        article_id,
        admin_id: adminId,
        dry_run: true,
        before_content_hash: beforeHash,
        after_content_hash: afterHash,
        changes_count: count,
        removed_patterns: removed,
        warnings: [],
        applied: false,
        noindex_after: article.noindex,
        gemini_model: GEMINI_MODEL,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
      });
      return new Response(
        JSON.stringify({
          article_id,
          slug: article.slug,
          changes_applied: false,
          diff,
          warnings: [],
          noindex_after: article.noindex,
          preview_content: newContent,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Application réelle
    const refreshNote = `[${new Date().toISOString()}] Refresh IA appliqué (${count} corrections)`;
    const newNotes = `${notes}\n${refreshNote}`;
    const newNoindex = isPillar ? true : false;

    const { error: updateErr } = await supabase
      .from("articles")
      .update({
        content: newContent,
        admin_notes: newNotes,
        noindex: newNoindex,
        updated_at: new Date().toISOString(),
      })
      .eq("id", article_id);

    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("article_refresh_logs").insert({
      article_id,
      admin_id: adminId,
      dry_run: false,
      before_content_hash: beforeHash,
      after_content_hash: afterHash,
      changes_count: count,
      removed_patterns: removed,
      warnings: [],
      applied: true,
      noindex_after: newNoindex,
      gemini_model: GEMINI_MODEL,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    });

    const warnings: string[] = [];
    if (isPillar) {
      warnings.push("Pilier stratégique, validation manuelle requise après lecture complète.");
    }

    return new Response(
      JSON.stringify({
        article_id,
        slug: article.slug,
        changes_applied: true,
        diff,
        warnings,
        noindex_after: newNoindex,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("refresh-articles-post-pivot error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
