// Shared helper: enforce that the caller is either an admin user or the
// service role. Returns null on success, or a Response to return on failure.
import { createClient } from 'npm:@supabase/supabase-js@2'

export async function requireAdminOrServiceRole(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const token = authHeader.replace('Bearer ', '')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  // Service-role bypass
  if (token === serviceKey) return null

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabase = createClient(supabaseUrl, serviceKey)
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const { data: hasRole } = await supabase.rpc('has_role', {
    _user_id: data.user.id,
    _role: 'admin',
  })
  if (!hasRole) {
    return new Response(JSON.stringify({ error: 'Forbidden: admin only' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  return null
}
