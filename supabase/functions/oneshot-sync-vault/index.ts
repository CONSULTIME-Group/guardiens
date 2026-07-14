// One-shot : synchronise env SUPABASE_SERVICE_ROLE_KEY -> vault
// (`supabase_service_role_key`). À supprimer après appel unique.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

Deno.serve(async () => {
  const url = Deno.env.get('SUPABASE_URL')!
  const svc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(url, svc)
  const { data, error } = await supabase.rpc('admin_upsert_vault_secret', {
    p_name: 'supabase_service_role_key',
    p_value: svc,
  })
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
  return new Response(JSON.stringify({ ok: true, id: data, key_len: svc.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
