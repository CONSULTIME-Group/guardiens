import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  // Get all welcome emails that went to DLQ and were never successfully sent
  const { data: failedWelcomes, error } = await supabase
    .from('email_send_log')
    .select('recipient_email')
    .eq('template_name', 'welcome')
    .eq('status', 'dlq')

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Deduplicate
  const dlqEmails = [...new Set(failedWelcomes.map(r => r.recipient_email))]

  // Exclude already sent and test emails
  const { data: sentWelcomes } = await supabase
    .from('email_send_log')
    .select('recipient_email')
    .eq('template_name', 'welcome')
    .eq('status', 'sent')

  const sentSet = new Set((sentWelcomes || []).map(r => r.recipient_email))

  // Exclude suppressed
  const { data: suppressed } = await supabase
    .from('suppressed_emails')
    .select('email')

  const suppressedSet = new Set((suppressed || []).map(r => r.email))

  // Filter out test emails
  const testPatterns = ['yopmail.com', 'test@guardiens.fr']
  const toSend = dlqEmails.filter(email => 
    !sentSet.has(email) &&
    !suppressedSet.has(email.toLowerCase()) &&
    !testPatterns.some(p => email.includes(p))
  )

  // Get profile info for each
  const results: Array<{ email: string; status: string; error?: string }> = []

  for (const email of toSend) {
    try {
      // Get user profile
      const { data: userData } = await supabase
        .from('profiles')
        .select('first_name, role')
        .eq('id', (
          await supabase.rpc('get_user_id_by_email', { p_email: email })
        ).data)
        .maybeSingle()

      // Call send-transactional-email directly
      const { data, error: invokeError } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'welcome',
          recipientEmail: email,
          idempotencyKey: `welcome-batch-resend-${email}`,
          templateData: {
            firstName: userData?.first_name || undefined,
            role: userData?.role || 'sitter',
          },
        },
      })

      if (invokeError) {
        results.push({ email, status: 'error', error: invokeError.message })
      } else {
        results.push({ email, status: 'sent' })
      }

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 300))
    } catch (e) {
      results.push({ email, status: 'error', error: e.message })
    }
  }

  const sent = results.filter(r => r.status === 'sent').length
  const errors = results.filter(r => r.status === 'error').length

  return new Response(JSON.stringify({
    total: toSend.length,
    sent,
    errors,
    results,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
