import { Resend } from 'npm:resend'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!resendApiKey) {
    return new Response(
      JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let to: string
  try {
    const body = await req.json()
    to = body.to
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON - expected { "to": "email@example.com" }' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!to) {
    return new Response(
      JSON.stringify({ error: '"to" field is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const resend = new Resend(resendApiKey)

  try {
    const { data, error } = await resend.emails.send({
      from: 'Guardiens <noreply@guardiens.fr>',
      to: [to],
      subject: '✅ Test email Guardiens — Resend fonctionne !',
      html: `
        <div style="font-family: 'Outfit', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #3d7a5f; font-family: 'Playfair Display', Georgia, serif;">Guardiens</h1>
          <p style="font-size: 16px; color: #333;">Cet email confirme que l'envoi via <strong>Resend</strong> fonctionne correctement depuis l'application Guardiens.</p>
          <p style="font-size: 14px; color: #666;">Domaine d'envoi : <code>guardiens.fr</code></p>
          <p style="font-size: 14px; color: #666;">Date : ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="font-size: 12px; color: #999;">Ceci est un email de test automatique.</p>
        </div>
      `,
    })

    if (error) {
      console.error('Resend error:', error)
      return new Response(
        JSON.stringify({ error: error.message, details: error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Test email sent successfully:', data)
    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Send failed:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})