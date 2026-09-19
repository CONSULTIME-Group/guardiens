// Edge push-subscription : gestion des abonnements push par le membre.
// Actions : config, status, subscribe, preferences, unsubscribe.
// Le proprietaire est derive UNIQUEMENT du JWT verifie. Aucune reponse ni
// aucun journal ne contient d'endpoint, de cle ou d'identifiant de membre.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

import { extractBearer } from '../_shared/web-push/auth.ts';
import { buildConfigResponse } from '../_shared/web-push/config.ts';
import {
  isBodySizeAcceptable,
  isPushAction,
  parsePreferencesInput,
  parseSubscribeInput,
  parseUnsubscribeInput,
  sanitizeForLog,
} from '../_shared/web-push/request.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const raw = await req.text();
  if (!isBodySizeAcceptable(raw)) return json({ error: 'payload_too_large' }, 413);

  let body: unknown;
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const action = (body as Record<string, unknown>)?.action;
  if (!isPushAction(action)) return json({ error: 'invalid_action' }, 400);

  // config est la seule action lisible sans compte : elle ne renvoie que la
  // cle publique, et enabled:false tant que la configuration est incomplete.
  if (action === 'config') {
    return json(buildConfigResponse((name) => Deno.env.get(name)));
  }

  const token = extractBearer(req.headers.get('Authorization'));
  if (!token) return json({ error: 'unauthorized' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) return json({ error: 'server_configuration' }, 500);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) return json({ error: 'unauthorized' }, 401);
  const userId = userData.user.id;

  const memberClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  try {
    if (action === 'status') {
      const { data, error } = await memberClient.rpc('push_my_subscriptions');
      if (error) throw error;
      const rows = (data ?? []) as Array<Record<string, unknown>>;
      return json({
        // Aucun endpoint renvoye, seulement ce qui sert a l'ecran.
        subscriptions: rows.map((r) => ({
          id: r.id,
          opt_in_messages: r.opt_in_messages,
          opt_in_applications: r.opt_in_applications,
          enabled: r.enabled,
        })),
      });
    }

    if (action === 'subscribe') {
      // Le push est refuse tant que la configuration VAPID est incomplete.
      if (!buildConfigResponse((name) => Deno.env.get(name)).enabled) {
        return json({ error: 'push_not_configured' }, 503);
      }

      const parsed = parseSubscribeInput(body);
      if (!parsed.ok) {
        console.warn('push-subscription rejet', sanitizeForLog(parsed.reason));
        return json({ error: parsed.reason }, 400);
      }

      const { data, error } = await admin.rpc('push_upsert_subscription', {
        p_user_id: userId,
        p_endpoint: parsed.value.endpoint,
        p_endpoint_host: parsed.value.endpointHost,
        p_auth_key: parsed.value.auth,
        p_p256dh_key: parsed.value.p256dh,
        p_opt_in_messages: parsed.value.optInMessages,
        p_opt_in_applications: parsed.value.optInApplications,
      });
      if (error) {
        const code = sanitizeForLog(error.message.slice(0, 40));
        console.warn('push-subscription upsert refuse', code);
        const status = error.message.includes('max_active') ? 409 : 400;
        return json({ error: 'subscribe_refused', code }, status);
      }
      return json({ subscription_id: data });
    }

    if (action === 'preferences') {
      const parsed = parsePreferencesInput(body);
      if (!parsed.ok) return json({ error: parsed.reason }, 400);
      const { data, error } = await memberClient.rpc('push_set_my_preferences', {
        p_subscription_id: parsed.value.subscriptionId,
        p_opt_in_messages: parsed.value.optInMessages,
        p_opt_in_applications: parsed.value.optInApplications,
      });
      if (error) throw error;
      return json({ updated: data === true });
    }

    // unsubscribe
    const parsed = parseUnsubscribeInput(body);
    if (!parsed.ok) return json({ error: parsed.reason }, 400);
    const { data, error } = await memberClient.rpc('push_delete_my_subscription', {
      p_subscription_id: parsed.value.subscriptionId,
    });
    if (error) throw error;
    return json({ deleted: data === true });
  } catch (err) {
    console.error('push-subscription erreur', sanitizeForLog(String((err as Error)?.name ?? 'error')));
    return json({ error: 'internal_error' }, 500);
  }
});
