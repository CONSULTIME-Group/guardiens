import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { requireAdminOrServiceRole } from '../_shared/require-admin.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

type ActionItem = {
  title: string;
  why: string;
  priority: 'haute' | 'moyenne' | 'basse';
  link: string;
};

async function collectSignals() {
  const signals: Record<string, unknown> = {};

  const { data: summary, error: sumErr } = await admin.rpc('admin_dashboard_summary');
  if (sumErr) console.error('admin_dashboard_summary error', sumErr);
  signals.dashboard_summary = summary ?? null;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  const [
    profilesTotal,
    profilesNew7d,
    profilesSuspended,
    sitsPublished,
    verificationsPending,
    reportsOpen,
    reviewsPending,
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    admin.from('profiles').select('*', { count: 'exact', head: true }).not('suspended_until', 'is', null).gt('suspended_until', new Date().toISOString()),
    admin.from('sits').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    admin.from('pro_verifications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    admin.from('reviews').select('*', { count: 'exact', head: true }).eq('moderation_status', 'pending'),
  ]);

  signals.counts = {
    profiles_total: profilesTotal.count ?? null,
    profiles_new_7d: profilesNew7d.count ?? null,
    profiles_suspended: profilesSuspended.count ?? null,
    sits_published: sitsPublished.count ?? null,
    verifications_pending: verificationsPending.count ?? null,
    reports_open: reportsOpen.count ?? null,
    reviews_pending_moderation: reviewsPending.count ?? null,
  };

  signals.generated_at = new Date().toISOString();
  return signals;
}

const PROMPT_SYSTEM = `Vous êtes l'analyste opérationnel de l'admin de Guardiens (plateforme de house-sitting).

Contraintes strictes:
- Vouvoiement, français, ton factuel.
- Ne JAMAIS inventer de chiffre : utilisez UNIQUEMENT les signaux fournis.
- Interdiction du tiret cadratin (—). Utilisez virgule, deux-points, parenthèses ou tiret demi-cadratin.
- Réponse en JSON STRICT: { "analysis": string, "actions": [{ "title": string, "why": string, "priority": "haute"|"moyenne"|"basse", "link": string }] }.
- analysis : 3 à 5 phrases synthétiques sur l'état de la plateforme.
- actions : max 6, priorisées, concrètes, chacune avec un lien admin pertinent parmi /admin/verifications, /admin/listings, /admin/reports, /admin/reviews, /admin/users, /admin/emails.`;

async function callAI(signals: unknown): Promise<{ analysis: string; actions: ActionItem[] }> {
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY manquant');

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-pro',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: PROMPT_SYSTEM },
        { role: 'user', content: `Signaux d'activité (JSON) :\n${JSON.stringify(signals)}` },
      ],
    }),
  });

  if (response.status === 402) {
    throw new Error('Crédits IA épuisés (402). Ajoutez des crédits dans les paramètres du workspace.');
  }
  if (response.status === 429) {
    throw new Error('Trop de requêtes IA (429). Réessayez dans quelques instants.');
  }
  if (!response.ok) {
    const t = await response.text().catch(() => '');
    throw new Error(`Passerelle IA: ${response.status} ${t}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content ?? '{}';
  let parsed: { analysis?: string; actions?: ActionItem[] };
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    parsed = match ? JSON.parse(match[0]) : {};
  }

  const analysis = (parsed.analysis ?? '').replace(/—/g, ',');
  const actions = Array.isArray(parsed.actions)
    ? parsed.actions.slice(0, 6).map((a) => ({
        title: String(a?.title ?? '').replace(/—/g, ','),
        why: String(a?.why ?? '').replace(/—/g, ','),
        priority: (['haute', 'moyenne', 'basse'].includes(a?.priority) ? a.priority : 'moyenne') as ActionItem['priority'],
        link: String(a?.link ?? '/admin'),
      }))
    : [];

  return { analysis, actions };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const guard = await requireAdminOrServiceRole(req, corsHeaders);
  if (guard) return guard;

  try {
    let mode: 'latest' | 'refresh' = 'latest';
    try {
      const body = await req.json();
      if (body?.mode === 'refresh') mode = 'refresh';
    } catch { /* no body */ }

    if (mode === 'latest') {
      const { data, error } = await admin
        .from('admin_activity_analysis')
        .select('id, generated_at, summary, actions')
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return new Response(
        JSON.stringify({
          analysis: data ? { analysis: data.summary, actions: data.actions ?? [], generated_at: data.generated_at } : null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Refresh
    let generatedBy: string | null = null;
    const authHeader = req.headers.get('Authorization') ?? '';
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      if (token !== SERVICE_ROLE) {
        const { data } = await admin.auth.getUser(token);
        generatedBy = data?.user?.id ?? null;
      }
    }

    const signals = await collectSignals();
    const { analysis, actions } = await callAI(signals);

    const { data: inserted, error: insErr } = await admin
      .from('admin_activity_analysis')
      .insert({ summary: analysis, actions, snapshot: signals, generated_by: generatedBy })
      .select('generated_at')
      .single();
    if (insErr) throw insErr;

    return new Response(
      JSON.stringify({ analysis: { analysis, actions, generated_at: inserted.generated_at } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('admin-activity-analysis error', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Erreur inconnue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
