import { describe,it,expect,vi } from 'vitest';
import {handlePushTest,type TestDependencies} from '../../supabase/functions/_shared/web-push/test-handler';
const target={request_id:'11111111-1111-4111-8111-111111111111',user_id:'22222222-2222-4222-8222-222222222222',subscription_id:'33333333-3333-4333-8333-333333333333'};
const key=(bytes:number[])=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const sub={endpoint:'https://fcm.googleapis.com/fcm/send/fixture',auth_key:key(Array(16).fill(1)),p256dh_key:key([4,...Array(64).fill(1)])};
const setup=()=>({serviceKey:'fixture-service',configured:true as boolean,claim:vi.fn().mockResolvedValue(true),subscription:vi.fn().mockResolvedValue(sub),send:vi.fn().mockResolvedValue(201),finish:vi.fn().mockResolvedValue(true)} satisfies TestDependencies);
const req=(body:unknown=target,token='fixture-service')=>new Request('https://example.test',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:JSON.stringify(body)});
describe('Operator-only targeted push test',()=>{
  it.each(['','member-token','anonymous-token'])('rejects unprivileged caller %s before all data access',async token=>{
    const d=setup();expect((await handlePushTest(req(target,token),d)).status).toBe(401);expect(d.claim).not.toHaveBeenCalled();expect(d.send).not.toHaveBeenCalled();
  });
  it('rejects arbitrary recipient endpoints or message content',async()=>{
    const d=setup();expect((await handlePushTest(req({...target,endpoint:'https://evil.test'}),d)).status).toBe(400);expect(d.claim).not.toHaveBeenCalled();
  });
  it('does not claim if configuration is missing',async()=>{const d=setup();d.configured=false;expect((await handlePushTest(req(),d)).status).toBe(503);expect(d.claim).not.toHaveBeenCalled();});
  it('sends once after a durable claim and a fresh owner/opt-in lookup',async()=>{
    const d=setup();const r=await handlePushTest(req(),d);const body=await r.json();
    expect(body).toEqual({ok:true,sent_attempts:1,accepted:true,uncertain:false,provider_status:201,outcome:'accepted',persisted:true});
    expect(d.claim).toHaveBeenCalledWith(target);expect(d.subscription).toHaveBeenCalledWith(target);expect(d.send).toHaveBeenCalledOnce();
    expect(d.claim.mock.invocationCallOrder[0]).toBeLessThan(d.subscription.mock.invocationCallOrder[0]);
    expect(d.subscription.mock.invocationCallOrder[0]).toBeLessThan(d.send.mock.invocationCallOrder[0]);
    expect(JSON.parse(d.send.mock.calls[0][1])).toEqual({title:'Guardiens',body:'Vous avez un nouveau message.',url:'/messages',tag:`guardiens-message-${target.request_id}`});
    expect(JSON.stringify(body)).not.toContain(target.user_id);expect(JSON.stringify(body)).not.toContain(sub.endpoint);
  });
  it('never sends when a replay or cooldown claim is refused',async()=>{const d=setup();d.claim.mockResolvedValue(false);expect((await handlePushTest(req(),d)).status).toBe(409);expect(d.subscription).not.toHaveBeenCalled();expect(d.send).not.toHaveBeenCalled();});
  it.each([null,{...sub,endpoint:'https://evil.test'},{...sub,auth_key:'bad'}])('does not send revoked or malformed subscription',async value=>{
    const d=setup();d.subscription.mockResolvedValue(value);const body=await (await handlePushTest(req(),d)).json();expect(body.sent_attempts).toBe(0);expect(body.outcome).toBe('skipped');expect(d.send).not.toHaveBeenCalled();
  });
  it.each([410,429,500])('records explicit provider rejection %s without retry',async code=>{const d=setup();d.send.mockRejectedValue({statusCode:code,body:'sensitive-provider-response'});const text=await (await handlePushTest(req(),d)).text();expect(JSON.parse(text).provider_status).toBe(code);expect(JSON.parse(text).accepted).toBe(false);expect(text).not.toContain('sensitive');expect(d.send).toHaveBeenCalledOnce();});
  it('records unknown network outcome without retry',async()=>{const d=setup();d.send.mockRejectedValue(new Error(sub.endpoint));const body=await (await handlePushTest(req(),d)).json();expect(body.uncertain).toBe(true);expect(body.accepted).toBe(false);expect(d.send).toHaveBeenCalledOnce();});
  it('reports persistence failure without sending again',async()=>{const d=setup();d.finish.mockRejectedValue(new Error());const r=await handlePushTest(req(),d);expect(r.status).toBe(500);expect((await r.json()).accepted).toBe(true);expect(d.send).toHaveBeenCalledOnce();});
});
