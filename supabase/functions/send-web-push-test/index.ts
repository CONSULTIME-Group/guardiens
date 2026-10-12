import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import { readVapidConfig } from '../_shared/web-push/config.ts';
import { handlePushTest } from '../_shared/web-push/test-handler.ts';
import { sendWithPushEvents } from '../_shared/web-push/send-events.ts';

Deno.serve(async req => {
  const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const url=Deno.env.get('SUPABASE_URL');
  const vapid=readVapidConfig(name=>Deno.env.get(name));
  // Client creation does not make a request. Authorization is checked first by the handler.
  const admin=url && serviceKey ? createClient(url,serviceKey,{auth:{persistSession:false}}) : null;
  return handlePushTest(req,{
    serviceKey,configured:Boolean(admin && vapid),
    claim: async target => {
      const {data,error}=await admin!.rpc('push_claim_test',{
        p_request_id:target.request_id,p_user_id:target.user_id,p_subscription_id:target.subscription_id,
      });
      if (error) throw new Error('claim_failed');
      return data===true;
    },
    subscription: async target => {
      const {data,error}=await admin!.from('push_subscriptions').select('endpoint,auth_key,p256dh_key')
        .eq('id',target.subscription_id).eq('user_id',target.user_id).eq('enabled',true).eq('opt_in_messages',true).maybeSingle();
      if (error) throw new Error('subscription_unavailable');
      return data;
    },
    send: async (sub,payload,target) => {
      webpush.setVapidDetails(vapid!.subject,vapid!.publicKey,vapid!.privateKey);
      // Lot M1 : trace, last_success_at sur succes, desactivation sur 404 ou 410.
      return sendWithPushEvents(admin!,{
        channel:'server_test',subscriptionId:target.subscription_id,endpoint:sub.endpoint,userId:target.user_id,
        jobId:target.request_id,eventKind:'test',
      },async () => (await webpush.sendNotification({endpoint:sub.endpoint,keys:{auth:sub.auth_key,p256dh:sub.p256dh_key}},payload,{TTL:60,timeout:8000})).statusCode,
      {manageSubscription:true});
    },
    finish: async (requestId,outcome,status) => {
      const {data,error}=await admin!.from('push_test_attempts')
        .update({outcome,provider_status:status,finished_at:new Date().toISOString()})
        .eq('request_id',requestId).eq('outcome','attempting').select('request_id');
      return !error && data?.length===1;
    },
  });
});
