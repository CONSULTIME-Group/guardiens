import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Get founders without active subscription
    const { data: founders, error } = await supabase
      .from('profiles')
      .select('id, first_name, email')
      .eq('is_founder', true)

    if (error) throw error

    // Filter those without active/trial subscription
    const toNotify: { first_name: string; email: string }[] = []

    for (const founder of (founders || [])) {
      if (!founder.email) continue
      const { data: sub } = await supabase
        .from('abonnements')
        .select('statut')
        .eq('user_id', founder.id)
        .in('statut', ['trial', 'active'])
        .limit(1)

      if (!sub || sub.length === 0) {
        toNotify.push({ first_name: founder.first_name || '', email: founder.email })
      }
    }

    let sent = 0
    for (const founder of toNotify) {
      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px;">
          <p>Bonjour ${founder.first_name || ''},</p>
          <p>Merci d'avoir rejoint Guardiens dès le début.</p>
          <p>Votre période d'accès fondateur se termine le <strong>13 juin 2026</strong>.</p>
          <p>Après cette date, un abonnement à 6,99€/mois sera nécessaire pour continuer à postuler aux gardes.</p>
          <p>Votre badge Fondateur reste à vie, quelle que soit votre décision.</p>
          <p style="margin: 24px 0;">
            <a href="https://guardiens.fr/mon-abonnement" style="display: inline-block; background-color: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Choisir mon abonnement
            </a>
          </p>
          <p>À très vite,<br/>L'équipe Guardiens</p>
        </div>
      `

      const res = await fetch(`${GATEWAY_URL}/emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'X-Connection-Api-Key': RESEND_API_KEY,
        },
        body: JSON.stringify({
          from: 'Guardiens <noreply@guardiens.fr>',
          to: [founder.email],
          subject: 'Votre accès Fondateur se termine dans 30 jours',
          html,
        }),
      })

      if (res.ok) sent++
      await res.text() // consume body
    }

    return new Response(JSON.stringify({ sent, total: toNotify.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
