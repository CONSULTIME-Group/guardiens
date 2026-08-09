// Shared helper: restrict a scheduled (cron-only) edge function to the
// service role or an admin user. Returns null when the caller is allowed,
// otherwise the Response to return immediately.
//
// pg_cron calls these functions with the service_role key stored in vault
// (secret 'supabase_service_role_key'), so the service-role bypass keeps the
// scheduler working unchanged. Any other caller (anonymous, or a simple
// signed-in member) is rejected.
//
// Tout rejet est journalise dans public.cron_run_log avec le statut 'failed',
// pour qu'un 401 ne puisse plus passer inapercu pendant des mois.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { logCronRejection } from './cron-run-log.ts'

export async function requireCronCaller(
  req: Request,
  corsHeaders: Record<string, string>,
  edgeName?: string,
): Promise<Response | null> {
  const deny = async (status: number, error: string, reason: string) => {
    if (edgeName) {
      try {
        await logCronRejection(edgeName, `auth refusee, ${reason} (HTTP ${status})`)
      } catch { /* la journalisation ne doit jamais masquer le rejet */ }
    }
    return new Response(JSON.stringify({ error }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return deny(401, 'Unauthorized', 'en-tete Authorization absent ou mal forme')
  }

  const token = authHeader.slice(7).trim()
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (token && token === serviceKey) return null

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  if (!supabaseUrl || !serviceKey) {
    return deny(500, 'Server configuration error', 'configuration serveur incomplete')
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) {
    return deny(401, 'Unauthorized', 'token non reconnu')
  }

  const { data: isAdmin } = await admin.rpc('has_role', {
    _user_id: data.user.id,
    _role: 'admin',
  })
  if (isAdmin !== true) {
    return deny(403, 'Forbidden: scheduler or admin only', 'compte non administrateur')
  }

  return null
}
