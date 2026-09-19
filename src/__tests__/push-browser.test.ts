import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupPushOnLogout, decodePublicKey, disablePush, enablePush, getPushState, PUSH_ID_KEY, PUSH_OWNER_KEY, pushSupport, updatePushPreferences } from '@/lib/web-push';
const mocks=vi.hoisted(()=>({session:vi.fn(),invoke:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getSession:mocks.session},functions:{invoke:mocks.invoke}}}));
const publicKey=btoa(String.fromCharCode(4,...Array(64).fill(1))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
let sub:any,reg:any,permission:any,register:any;
beforeEach(()=>{
  vi.clearAllMocks();localStorage.clear();
  mocks.session.mockResolvedValue({data:{session:{user:{id:'owner'},access_token:'fixture-token'}}});
  mocks.invoke.mockResolvedValue({data:{subscription_id:'device-id',updated:true,deleted:true},error:null});
  sub={endpoint:'https://fcm.googleapis.com/fcm/send/fixture',unsubscribe:vi.fn().mockResolvedValue(true),toJSON:()=>({endpoint:'https://fcm.googleapis.com/fcm/send/fixture',keys:{p256dh:publicKey,auth:'fixture'}})};
  reg={active:{scriptURL:'https://guardiens.fr/push-sw.js'},pushManager:{getSubscription:vi.fn().mockResolvedValue(null),subscribe:vi.fn().mockResolvedValue(sub)},getNotifications:vi.fn().mockResolvedValue([])};
  register=vi.fn().mockResolvedValue(reg);permission=vi.fn().mockResolvedValue('granted');
  vi.stubGlobal('Notification',{permission:'default',requestPermission:permission});vi.stubGlobal('PushManager',function(){});
  Object.defineProperty(window,'isSecureContext',{configurable:true,value:true});
  Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:{register,ready:Promise.resolve(reg),getRegistration:vi.fn().mockResolvedValue(reg)}});
});
describe('Push browser lifecycle',()=>{
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
});
