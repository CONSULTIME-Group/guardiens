import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'

const AUTH_TEMPLATES: Record<string, { component: React.ComponentType<any>, sampleData: object }> = {
  signup: { component: SignupEmail, sampleData: { siteName: 'Guardiens', siteUrl: 'https://guardiens.fr', recipient: 'user@example.com', confirmationUrl: 'https://guardiens.fr' } },
  recovery: { component: RecoveryEmail, sampleData: { siteName: 'Guardiens', confirmationUrl: 'https://guardiens.fr' } },
  'magic-link': { component: MagicLinkEmail, sampleData: { siteName: 'Guardiens', confirmationUrl: 'https://guardiens.fr' } },
  invite: { component: InviteEmail, sampleData: { siteName: 'Guardiens', siteUrl: 'https://guardiens.fr', confirmationUrl: 'https://guardiens.fr' } },
  'email-change': { component: EmailChangeEmail, sampleData: { siteName: 'Guardiens', email: 'ancien@example.com', newEmail: 'nouveau@example.com', confirmationUrl: 'https://guardiens.fr' } },
  reauthentication: { component: ReauthenticationEmail, sampleData: { token: '123456' } },
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Verify JWT and admin role
  const authHeader = req.headers.get('Authorization') || ''
  const supabaseAnon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user } } = await supabaseAnon.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' })
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Parse request
  const { templateName } = await req.json().catch(() => ({ templateName: null }))

  // If no templateName, return the list of all templates with metadata
  if (!templateName) {
    const list = Object.entries(TEMPLATES).map(([name, entry]) => ({
      name,
      displayName: entry.displayName || name,
      subject: typeof entry.subject === 'function' ? entry.subject(entry.previewData || {}) : entry.subject,
      hasPreviewData: !!entry.previewData,
    }))
    return new Response(JSON.stringify({ templates: list }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Render specific template
  const template = TEMPLATES[templateName]
  if (!template) {
    return new Response(JSON.stringify({ error: `Template '${templateName}' not found` }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const previewData = template.previewData || {}
    const html = await renderAsync(React.createElement(template.component, previewData))
    const resolvedSubject = typeof template.subject === 'function'
      ? template.subject(previewData)
      : template.subject

    return new Response(JSON.stringify({
      templateName,
      displayName: template.displayName || templateName,
      subject: resolvedSubject,
      html,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({
      error: 'Render failed',
      message: err instanceof Error ? err.message : String(err),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
