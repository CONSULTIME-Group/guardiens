import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Only allow POST with dry_run option
  const body = await req.json().catch(() => ({}))
  const dryRun = body.dry_run !== false // default true for safety

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  // Helper: paginated fetch to avoid 1000-row limit
  async function fetchAllEmails(table: string, column: string, filters: Record<string, string>): Promise<string[]> {
    const all: string[] = []
    let from = 0
    const pageSize = 1000
    while (true) {
      let q = supabase.from(table).select(column).range(from, from + pageSize - 1)
      for (const [k, v] of Object.entries(filters)) {
        q = q.eq(k, v)
      }
      const { data } = await q
      if (!data || data.length === 0) break
      all.push(...data.map((r: any) => r[column]))
      if (data.length < pageSize) break
      from += pageSize
    }
    return all
  }

  // 1. Get all DLQ welcome emails
  const dlqEmailsRaw = await fetchAllEmails('email_send_log', 'recipient_email', { template_name: 'welcome', status: 'dlq' })
  const dlqEmails = [...new Set(dlqEmailsRaw)]

  // 2. Exclude already successfully sent (any template_name='welcome' + status='sent')
  const sentEmailsRaw = await fetchAllEmails('email_send_log', 'recipient_email', { template_name: 'welcome', status: 'sent' })
  const sentSet = new Set(sentEmailsRaw)

  // 3. Exclude suppressed
  const suppEmailsRaw = await fetchAllEmails('suppressed_emails', 'email', {})
  const suppSet = new Set(suppEmailsRaw.map(e => e.toLowerCase()))

  // 4. Filter test emails
  const testPatterns = ['yopmail.com', 'test@guardiens.fr']
  const toSend = dlqEmails.filter(email =>
    !sentSet.has(email) &&
    !suppSet.has(email.toLowerCase()) &&
    !testPatterns.some(p => email.includes(p))
  )

  // 5. Get profile data for all users via auth.users listing
  const profileMap = new Map<string, { firstName?: string; role?: string }>()
  
  // Fetch profiles by looking up user IDs from auth
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const emailToId = new Map<string, string>()
  for (const u of (authUsers?.users || [])) {
    if (u.email) emailToId.set(u.email, u.id)
  }

  // Batch fetch profiles
  const userIds = toSend
    .map(email => emailToId.get(email))
    .filter(Boolean) as string[]

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, role')
      .in('id', userIds)

    for (const p of (profiles || [])) {
      const email = [...emailToId.entries()].find(([_, id]) => id === p.id)?.[0]
      if (email) {
        profileMap.set(email, { firstName: p.first_name || undefined, role: p.role || 'sitter' })
      }
    }
  }

  if (dryRun) {
    return new Response(JSON.stringify({
      mode: 'dry_run',
      total: toSend.length,
      recipients: toSend.map(email => ({
        email,
        firstName: profileMap.get(email)?.firstName || null,
        role: profileMap.get(email)?.role || 'sitter',
      })),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 6. Send emails one by one with delay
  const results: Array<{ email: string; status: string; error?: string }> = []

  for (const email of toSend) {
    try {
      const profile = profileMap.get(email)

      const { error: invokeError } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'welcome',
          recipientEmail: email,
          idempotencyKey: `welcome-batch-resend-20260408-${email}`,
          templateData: {
            firstName: profile?.firstName || undefined,
            role: profile?.role || 'sitter',
          },
        },
      })

      if (invokeError) {
        results.push({ email, status: 'error', error: invokeError.message })
      } else {
        results.push({ email, status: 'sent' })
      }

      // 300ms delay between sends
      await new Promise(r => setTimeout(r, 300))
    } catch (e) {
      results.push({ email, status: 'error', error: e.message })
    }
  }

  return new Response(JSON.stringify({
    mode: 'live',
    total: toSend.length,
    sent: results.filter(r => r.status === 'sent').length,
    errors: results.filter(r => r.status === 'error').length,
    results,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
