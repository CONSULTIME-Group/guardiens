import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupPushOnLogout, decodePublicKey, disablePush, enablePush, getPushConfig, getPushState, PUSH_ID_KEY, PUSH_OWNER_KEY, pushSupport, testPushOnDevice, updatePushPreferences } from '@/lib/web-push';
// Worker factice : répond à la demande de version comme public/push-sw.js.
function fakeWorker(version: string | null, state = 'activated') {
  const listeners = new Set<() => void>();
  const w: any = { scriptURL: 'https://guardiens.fr/push-sw.js', state, posted: [] as string[],
    addEventListener: (_: string, f: () => void) => listeners.add(f), removeEventListener: (_: string, f: () => void) => listeners.delete(f),
    setState: (next: string) => { w.state = next; listeners.forEach((f) => f()); },
    postMessage: (msg: any, ports?: MessagePort[]) => { w.posted.push(msg.type); if (msg.type === 'GUARDIENS_PUSH_SW_VERSION' && version && ports?.[0]) ports[0].postMessage({ version }); } };
  return w;
}
const mocks=vi.hoisted(()=>({session:vi.fn(),invoke:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getSession:mocks.session},functions:{invoke:mocks.invoke}}}));
const publicKey=btoa(String.fromCharCode(4,...Array(64).fill(1))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
let sub:any,reg:any,permission:any,register:any;
beforeEach(()=>{
  vi.clearAllMocks();localStorage.clear();
  mocks.session.mockResolvedValue({data:{session:{user:{id:'owner'},access_token:'fixture-token'}}});
  mocks.invoke.mockResolvedValue({data:{subscription_id:'device-id',updated:true,deleted:true},error:null});
  sub={endpoint:'https://fcm.googleapis.com/fcm/send/fixture',unsubscribe:vi.fn().mockResolvedValue(true),toJSON:()=>({endpoint:'https://fcm.googleapis.com/fcm/send/fixture',keys:{p256dh:publicKey,auth:'fixture'}})};
  reg={active:fakeWorker('push-2'),update:vi.fn().mockResolvedValue(undefined),pushManager:{getSubscription:vi.fn().mockResolvedValue(null),subscribe:vi.fn().mockResolvedValue(sub)},getNotifications:vi.fn().mockResolvedValue([])};
  register=vi.fn().mockResolvedValue(reg);permission=vi.fn().mockResolvedValue('granted');
  vi.stubGlobal('Notification',{permission:'default',requestPermission:permission});vi.stubGlobal('PushManager',function(){});
  Object.defineProperty(window,'isSecureContext',{configurable:true,value:true});
  Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:{register,ready:Promise.resolve(reg),getRegistration:vi.fn().mockResolvedValue(reg)}});
});
afterEach(() => vi.useRealTimers());
describe('Push browser lifecycle',()=>{
  it.each([1, 2])('bounds session read %s during configuration', async (call) => {
    vi.useFakeTimers();
    if (call === 2) mocks.session.mockResolvedValueOnce({data:{session:{user:{id:'owner'},access_token:'fixture-token'}}});
    mocks.session.mockImplementationOnce(() => new Promise(() => {}));
    mocks.invoke.mockResolvedValue({data:{enabled:true,publicKey},error:null});
    const result = getPushConfig('owner').catch(error => error.message);
    await vi.advanceTimersByTimeAsync(10000);
    expect(await Promise.race([result, Promise.resolve('still_pending')])).toBe('push_timeout');
    expect(permission).not.toHaveBeenCalled();
    if (call === 1) expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it('bounds a browser subscription lookup that never settles', async () => {
    vi.useFakeTimers();
    reg.pushManager.getSubscription.mockImplementationOnce(() => new Promise(() => {}));
    const result = getPushState('owner').catch(error => error.message);
    await vi.advanceTimersByTimeAsync(10000);
    expect(await Promise.race([result, Promise.resolve('still_pending')])).toBe('push_timeout');
    expect(permission).not.toHaveBeenCalled();
  });
  it('decodes valid public key and rejects malformed key',()=>{expect(decodePublicKey(publicKey).length).toBe(65);expect(()=>decodePublicKey('bad')).toThrow();});
  it('does not prompt when service is disabled',async()=>{await expect(enablePush('owner',{enabled:false},{messages:true,applications:true})).rejects.toThrow();expect(permission).not.toHaveBeenCalled();});
  it('requests permission before registering worker and submits the exact API shape',async()=>{
    const pending=enablePush('owner',{enabled:true,publicKey},{messages:true,applications:false});
    expect(permission).toHaveBeenCalledOnce();expect(register).not.toHaveBeenCalled();await pending;
    expect(mocks.invoke).toHaveBeenCalledWith('push-subscription',expect.objectContaining({body:expect.objectContaining({action:'subscribe',endpoint:sub.endpoint,opt_in_messages:true,opt_in_applications:false})}));
    expect(localStorage.getItem(PUSH_ID_KEY)).toBe('device-id');
  });
  it('denial does not register or save subscription',async()=>{permission.mockResolvedValue('denied');await expect(enablePush('owner',{enabled:true,publicKey},{messages:true,applications:true})).rejects.toThrow('push_permission_denied');expect(register).not.toHaveBeenCalled();expect(mocks.invoke).not.toHaveBeenCalled();});
  it('failed server registration cancels browser subscription',async()=>{mocks.invoke.mockResolvedValue({error:new Error()});await expect(enablePush('owner',{enabled:true,publicKey},{messages:true,applications:true})).rejects.toThrow();expect(sub.unsubscribe).toHaveBeenCalledOnce();expect(localStorage.getItem(PUSH_OWNER_KEY)).toBeNull();});
  it('session switch cannot register for the new account',async()=>{mocks.session.mockResolvedValue({data:{session:{user:{id:'other'},access_token:'fixture'}}});await expect(enablePush('owner',{enabled:true,publicKey},{messages:true,applications:true})).rejects.toThrow('push_session_changed');expect(mocks.invoke).not.toHaveBeenCalled();expect(sub.unsubscribe).toHaveBeenCalled();});
  it('account change unsubscribes previous browser endpoint',async()=>{localStorage.setItem(PUSH_OWNER_KEY,'previous');reg.pushManager.getSubscription.mockResolvedValue(sub);expect((await getPushState('owner')).subscribed).toBe(false);expect(sub.unsubscribe).toHaveBeenCalledOnce();});
  it('logout unsubscribes browser even if backend is unavailable',async()=>{localStorage.setItem(PUSH_OWNER_KEY,'owner');localStorage.setItem(PUSH_ID_KEY,'device-id');reg.pushManager.getSubscription.mockResolvedValue(sub);mocks.invoke.mockRejectedValue(new Error());await cleanupPushOnLogout('owner');expect(sub.unsubscribe).toHaveBeenCalledOnce();expect(localStorage.getItem(PUSH_OWNER_KEY)).toBeNull();});
  it('does not report successful disable if both paths fail',async()=>{localStorage.setItem(PUSH_OWNER_KEY,'owner');reg.pushManager.getSubscription.mockResolvedValue(sub);sub.unsubscribe.mockResolvedValue(false);mocks.invoke.mockRejectedValue(new Error());await expect(disablePush('owner')).rejects.toThrow('push_disable_failed');});
  it('does not accept a preferences update rejected by ownership check',async()=>{localStorage.setItem(PUSH_OWNER_KEY,'owner');reg.pushManager.getSubscription.mockResolvedValue(sub);mocks.invoke.mockResolvedValue({data:{updated:false},error:null});await expect(updatePushPreferences('owner',{messages:false,applications:false})).rejects.toThrow();});
  it('returns unsupported without secure context',()=>{Object.defineProperty(window,'isSecureContext',{value:false});expect(pushSupport()).toBe('unsupported');});

  it('worker already current: no update before subscribing',async()=>{
    await enablePush('owner',{enabled:true,publicKey},{messages:true,applications:true});
    expect(reg.update).not.toHaveBeenCalled();expect(reg.pushManager.subscribe).toHaveBeenCalledOnce();
  });
  it('old active worker: update, controlled activation of the waiting worker, then subscribe',async()=>{
    const old=fakeWorker('push-1');const next=fakeWorker('push-2','installed');reg.active=old;
    reg.update.mockImplementation(async()=>{reg.waiting=next;});
    next.postMessage=((orig:any)=>(msg:any,ports?:any)=>{orig(msg,ports);if(msg.type==='GUARDIENS_SKIP_WAITING'){reg.waiting=null;reg.active=next;next.setState('activated');}})(next.postMessage);
    await enablePush('owner',{enabled:true,publicKey},{messages:true,applications:true});
    expect(next.posted).toContain('GUARDIENS_SKIP_WAITING');
    expect(reg.update.mock.invocationCallOrder[0]).toBeLessThan(reg.pushManager.subscribe.mock.invocationCallOrder[0]);
  });
  it('update finds nothing newer: refuses, nothing subscribed or registered server side',async()=>{
    reg.active=fakeWorker('push-1');
    await expect(enablePush('owner',{enabled:true,publicKey},{messages:true,applications:true})).rejects.toThrow('push_worker_outdated');
    expect(reg.pushManager.subscribe).not.toHaveBeenCalled();expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it('update error: refuses without subscribing',async()=>{
    reg.active=fakeWorker('push-1');reg.update.mockRejectedValue(new Error('offline'));
    await expect(enablePush('owner',{enabled:true,publicKey},{messages:true,applications:true})).rejects.toThrow('offline');
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it('waiting worker that never activates: bounded timeout, nothing sent',async()=>{
    reg.active=fakeWorker('push-1');const next=fakeWorker('push-2','installed');reg.update.mockImplementation(async()=>{reg.waiting=next;});
    localStorage.setItem(PUSH_OWNER_KEY,'owner');localStorage.setItem(PUSH_ID_KEY,'device-id');
    vi.useFakeTimers({toFake:['setTimeout','clearTimeout']});
    const result=testPushOnDevice('owner');
    for(let i=0;i<30;i++){await new Promise((r)=>setImmediate(r));await vi.advanceTimersByTimeAsync(500);}
    expect(await result).toBe('worker_outdated');expect(mocks.invoke).not.toHaveBeenCalled();
  });
  const device=()=>{localStorage.setItem(PUSH_OWNER_KEY,'owner');localStorage.setItem(PUSH_ID_KEY,'device-id');};
  it('test with outdated worker: not sent',async()=>{device();reg.active=fakeWorker('push-1');expect(await testPushOnDevice('owner')).toBe('worker_outdated');expect(mocks.invoke).not.toHaveBeenCalled();});
  it('test: client timeout or network failure after sending is uncertain, never retried',async()=>{
    device();mocks.invoke.mockRejectedValue(new Error('push_timeout'));
    expect(await testPushOnDevice('owner')).toBe('uncertain');expect(mocks.invoke).toHaveBeenCalledOnce();
    mocks.invoke.mockReset();mocks.invoke.mockResolvedValue({data:null,error:{name:'FunctionsFetchError'}});
    expect(await testPushOnDevice('owner')).toBe('uncertain');expect(mocks.invoke).toHaveBeenCalledOnce();
  });
  it('test: account changed during the wait, result ignored',async()=>{
    device();mocks.invoke.mockImplementation(async()=>{mocks.session.mockResolvedValue({data:{session:{user:{id:'other'},access_token:'x'}}});return {data:{accepted:true},error:null};});
    expect(await testPushOnDevice('owner')).toBe('stale');
  });
  it('test: rate limit and unavailable device are distinguished',async()=>{
    device();
    mocks.invoke.mockResolvedValue({data:null,error:{context:new Response(JSON.stringify({error:'rate_limited'}),{status:429})}});
    expect(await testPushOnDevice('owner')).toBe('rate_limited');
    mocks.invoke.mockResolvedValue({data:null,error:{context:new Response(JSON.stringify({error:'subscription_unavailable'}),{status:409})}});
    expect(await testPushOnDevice('owner')).toBe('unavailable');
    mocks.invoke.mockResolvedValue({data:null,error:{context:new Response(JSON.stringify({error:'claim_failed'}),{status:500})}});
    expect(await testPushOnDevice('owner')).toBe('error');
    mocks.invoke.mockResolvedValue({data:{ok:true,accepted:true,sent_attempts:1},error:null});
    expect(await testPushOnDevice('owner')).toBe('accepted');
  });
  it('enable reports a nearby opt-in the server did not save',async()=>{
    mocks.invoke.mockResolvedValue({data:{subscription_id:'device-id',nearby_requested:true,nearby_saved:false},error:null});
    expect(await enablePush('owner',{enabled:true,publicKey},{messages:true,applications:true,nearbySits:true})).toEqual({nearbyRequested:true,nearbySaved:false});
    mocks.invoke.mockResolvedValue({data:{subscription_id:'device-id',nearby_requested:true,nearby_saved:true},error:null});
    expect(await enablePush('owner',{enabled:true,publicKey},{messages:true,applications:true,nearbySits:true})).toEqual({nearbyRequested:true,nearbySaved:true});
  });
  it('turning nearby on requires a current worker, nothing written otherwise',async()=>{
    localStorage.setItem(PUSH_OWNER_KEY,'owner');reg.pushManager.getSubscription.mockResolvedValue(sub);reg.active=fakeWorker('push-1');
    await expect(updatePushPreferences('owner',{messages:true,applications:true,nearbySits:true})).rejects.toThrow('push_worker_outdated');
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
});
