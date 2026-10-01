// Edge push-self-test : le membre teste son propre appareil.
// Distincte de send-web-push-test (réservée au serveur, inchangée).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import webpush from 'npm:web-push@3.6.7';
import { readVapidConfig } from '../_shared/web-push/config.ts';
import { handleSelfTest } from '../_shared/web-push/self-test-handler.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const url = Deno.env.get('SUPABASE_URL');
  const vapid = readVapidConfig((name) => Deno.env.get(name));
  const admin = url && serviceKey ? createClient(url, serviceKey, { auth: { persistSession: false } }) : null;
  return handleSelfTest(req, {
    headers: corsHeaders,
    configured: Boolean(admin && vapid),
    authenticate: async (token) => {
      if (!admin) return null;
      const { data, error } = await admin.auth.getUser(token);
      return error || !data?.user ? null : data.user.id;
    },
    claim: async (t) => {
      const { data, error } = await admin!.rpc('push_claim_self_test', {
        p_request_id: t.request_id, p_user_id: t.user_id, p_subscription_id: t.subscription_id,
      });
      if (error) throw new Error('claim_failed');
      return data === true;
    },
    subscription: async (t) => {
      const { data, error } = await admin!.from('push_subscriptions').select('endpoint,auth_key,p256dh_key')
        .eq('id', t.subscription_id).eq('user_id', t.user_id).eq('enabled', true).maybeSingle();
      if (error) throw new Error('subscription_unavailable');
      return data;
    },
    send: async (sub, payload) => {
      webpush.setVapidDetails(vapid!.subject, vapid!.publicKey, vapid!.privateKey);
      const r = await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { auth: sub.auth_key, p256dh: sub.p256dh_key } },
        payload, { TTL: 60, timeout: 8000 },
      );
      return r.statusCode;
    },
    finish: async (requestId, outcome, status) => {
      const { data, error } = await admin!.from('push_test_attempts')
        .update({ outcome, provider_status: status, finished_at: new Date().toISOString() })
        .eq('request_id', requestId).eq('outcome', 'attempting').select('request_id');
      return !error && data?.length === 1;
    },
  });
});
