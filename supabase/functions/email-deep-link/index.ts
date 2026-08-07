/**
 * email-deep-link
 *
 * Consomme un jeton de lien profond depose dans un email declenche par un
 * message ou une candidature, puis ouvre une session normale pour le
 * destinataire et le depose directement dans le fil concerne.
 *
 * Garanties :
 *  - jeton a usage unique, duree de vie 24 heures, lie au destinataire et,
 *    quand elle existe, a la conversation ciblee ;
 *  - aucune regle de securite contournee : la session ouverte est une session
 *    utilisateur standard, la RLS s'applique integralement ;
 *  - aucune action sur GET, l'execution exige un POST explicite depuis la page
 *    de l'application, ce qui protege des prechargements de clients mail ;
 *  - jeton expire ou deja consomme : on renvoie le chemin cible pour une
 *    redirection vers la page de connexion, jamais une erreur brute.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'

const SITE_URL = 'https://guardiens.fr'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const safePath = (p: unknown): string =>
  typeof p === 'string' && p.startsWith('/') && !p.startsWith('//') ? p : '/messages'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ ok: false, reason: 'method_not_allowed' }, 405)

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const service = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const body = await req.json().catch(() => ({}))
    const token = typeof body?.token === 'string' ? body.token.trim() : ''
    if (!token || !/^[a-f0-9]{40,128}$/i.test(token)) {
      return json({ ok: false, reason: 'invalid', next: '/messages' })
    }

    const { data, error } = await service.rpc('consume_email_deep_link', { p_token: token })
    if (error) {
      console.error('[email-deep-link] consume failed', error.message)
      return json({ ok: false, reason: 'error', next: '/messages' })
    }

    const result = (data ?? {}) as Record<string, unknown>
    const next = safePath(result.target_path)

    if (!result.ok) {
      return json({ ok: false, reason: String(result.reason ?? 'invalid'), next })
    }

    const email = String(result.email)
    const { data: linkData, error: linkErr } = await service.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${SITE_URL}${next}` },
    })

    if (linkErr || !linkData?.properties?.action_link) {
      console.error('[email-deep-link] generateLink failed', linkErr?.message)
      return json({ ok: false, reason: 'error', next })
    }

    console.log('[email-deep-link] consumed', {
      template_name: result.template_name ?? null,
      message_id: result.message_id ?? null,
    })

    return json({ ok: true, url: linkData.properties.action_link, next })
  } catch (e) {
    console.error('[email-deep-link] unexpected', e)
    return json({ ok: false, reason: 'error', next: '/messages' }, 200)
  }
})
