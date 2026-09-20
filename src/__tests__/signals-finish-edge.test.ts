import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {describe,it,expect,vi} from 'vitest';
type Row=Record<string,any>;
const serviceKey='fixture-service';
const forged=`eyJhbGciOiJIUzI1NiJ9.${Buffer.from('{"role":"service_role"}').toString('base64url')}.invalid`;
function harness(name:string, options:{admin?:boolean; existing?:Row[]; gaps?:Row[]; tension?:Row[]; insertError?:string; updateError?:boolean; closeDuringUpdate?:boolean; gapError?:boolean; flagError?:boolean}={}) {
 let handler:(req:Request)=>Promise<Response>;
 const rows=structuredClone(options.existing??[]); const writes:Row[]=[]; const finish=vi.fn();const fail=vi.fn();const startCronRun=vi.fn(async()=>({finish,fail}));
 const getUser=vi.fn(async(token:string)=>({data:{user:token==='member'?{id:'fixture-member'}:null},error:token==='member'?null:{message:'invalid'}}));
 const rpc=vi.fn(async(fn:string)=>{
  if(fn==='has_role')return {data:options.admin===true,error:null};
  if(fn==='detect_city_coverage_gaps')return {data:options.gaps??[],error:options.gapError?{message:'fixture gap error'}:null};
  if(fn==='detect_city_seo_tension')return {data:options.tension??[],error:null};
  if(fn==='detect_stale_drafts')return {data:[],error:null};
  throw new Error(fn);
 });
 let raced=false;
 const from=vi.fn((table:string)=>{
  const filters:Array<(r:Row)=>boolean>=[];let update:Row|undefined;const c:Row={};
  c.eq=(k:string,v:any)=>{filters.push(r=>r[k]===v);return c};
  c.is=(k:string,v:any)=>{filters.push(r=>(r[k]??null)===v);return c};
  c.select=()=>{
   if(!update)return c;
   if(options.updateError)return Promise.resolve({data:null,error:{message:'fixture update failure'}});
   if(options.closeDuringUpdate&&!raced){raced=true;rows.forEach(r=>{if(filters.every(f=>f(r)))r.resolved_at='closed-concurrently'});return Promise.resolve({data:[],error:null});}
   const updated=rows.filter(r=>filters.every(f=>f(r)));
   updated.forEach(r=>{Object.assign(r,update);writes.push({...update,op:'update'});});return Promise.resolve({data:updated.map(r=>({id:r.id})),error:null});
  };
  c.update=(v:Row)=>{update=v;return c};
  c.maybeSingle=async()=>({data:{enabled:true},error:options.flagError?{message:'flag unavailable'}:null});
  c.insert=async(v:Row)=>{
   if(options.insertError)return {error:{code:options.insertError,message:'fixture insert failure'}};
   if(rows.some(r=>r.signal_type===v.signal_type&&r.entity_id===v.entity_id&&!r.resolved_at))return {error:{code:'23505'}};
   rows.push({...v,id:`fixture-${rows.length}`,detected_at:'new-date'});writes.push({...v,op:'insert'});return {error:null};
  };return c;
 });
 const createClient=vi.fn((_url:string,_key:string,config?:Row)=>({from,rpc,auth:{getUser:(token?:string)=>getUser(token??config?.global?.headers?.Authorization?.slice(7))}}));
 const fetch=vi.fn(()=>{throw new Error('No network allowed')});
 const env:Row={SUPABASE_URL:'https://fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:serviceKey,SUPABASE_ANON_KEY:'public-key'};
 const Deno={env:{get:(k:string)=>env[k]},serve:(fn:typeof handler)=>{handler=fn}};
 function load(file:string,require:(name:string)=>unknown){const exports:Row={};const {outputText}=ts.transpileModule(readFileSync(resolve(file),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});runInNewContext(outputText,{exports,require,Deno,Request,Response,Date,fetch,console:{error:vi.fn()} });return exports;}
 const auth=load('supabase/functions/_shared/require-admin.ts',()=>({createClient}));
 load(`supabase/functions/${name}/index.ts`,(n)=>n.includes('require-admin')?auth:n.includes('supabase-js')?{createClient}:n.includes('cron-run-log')?{startCronRun}:{});
 return {rows,writes,from,rpc,fetch,finish,fail,startCronRun,invoke:(token?:string,method='POST',body='{}')=>handler(new Request('https://fixture.invalid',{method,headers:token?{authorization:`Bearer ${token}`}:{},...(method==='POST'?{body}:{})}))};
}
describe.each(['nudge-stale-draft','nudge-untapped-cities'])('%s authorization',name=>{
 it.each([undefined,'public-key',forged])('refuses credential %s before work',async token=>{const h=harness(name);expect((await h.invoke(token)).status).toBe(401);expect(h.from).not.toHaveBeenCalled();expect(h.startCronRun).not.toHaveBeenCalled();expect(h.fetch).not.toHaveBeenCalled();});
 it('refuses ordinary members',async()=>{const h=harness(name);expect((await h.invoke('member')).status).toBe(403);expect(h.from).not.toHaveBeenCalled();});
 it.each([serviceKey,'member'])('preserves authorized empty sweep %s',async token=>{const h=harness(name,{admin:true});expect((await h.invoke(token)).status).toBe(200);expect(h.finish).toHaveBeenCalledWith('success',expect.any(Object));expect(h.fetch).not.toHaveBeenCalled();});
 it('preserves public preflight',async()=>{const h=harness(name);expect((await h.invoke(undefined,'OPTIONS')).status).toBe(200);expect(h.from).not.toHaveBeenCalled();});
});
it('stale draft manual admin path remains checked',async()=>{const h=harness('nudge-stale-draft',{admin:true});expect((await h.invoke('member','POST','{"mode":"manual","sit_id":"fixture"}')).status).toBe(404);expect(h.rpc).toHaveBeenCalledWith('detect_stale_drafts');expect(h.startCronRun).not.toHaveBeenCalled();});
const gap={city_page_id:'city-one',city:'Fixture',slug:'fixture',radius_km:30,sitters_count:1,verified_sitters_count:0,active_sits_count:0};
const existing={id:'old-open',signal_type:'city_coverage_gap',entity_id:'city-one',severity:'critical',detected_at:'old-date',metadata:{week:'2026-W01'}};
describe('city signal lifecycle',()=>{
 it('refreshes a previous-week incident instead of violating its unique index',async()=>{const h=harness('nudge-untapped-cities',{existing:[existing],gaps:[gap]});expect((await h.invoke(serviceKey)).status).toBe(200);expect(h.rows).toHaveLength(1);expect(h.rows[0]).toMatchObject({id:'old-open',severity:'warning',detected_at:'old-date',metadata:{sitters_count:1}});expect(h.finish).toHaveBeenCalledWith('success',expect.objectContaining({signals_refreshed:1}));});
 it('one existing incident cannot block a new city',async()=>{const h=harness('nudge-untapped-cities',{existing:[existing],gaps:[gap,{...gap,city_page_id:'city-two',city:'Other',sitters_count:0}]});expect((await h.invoke(serviceKey)).status).toBe(200);expect(h.rows).toHaveLength(2);expect(h.rows[1].severity).toBe('critical');});
 it('same-city rerun is idempotent and preserves the detection date',async()=>{const h=harness('nudge-untapped-cities',{existing:[existing],gaps:[gap]});await h.invoke(serviceKey);await h.invoke(serviceKey);expect(h.rows).toHaveLength(1);expect(h.rows[0].detected_at).toBe('old-date');});
 it('never rewrites a resolved incident',async()=>{const h=harness('nudge-untapped-cities',{existing:[{...existing,resolved_at:'closed'}],gaps:[gap]});await h.invoke(serviceKey);expect(h.rows).toHaveLength(2);expect(h.rows[0].severity).toBe('critical');});
 it('retries once if reconciliation closes the row during refresh',async()=>{const h=harness('nudge-untapped-cities',{existing:[existing],gaps:[gap],closeDuringUpdate:true});expect((await h.invoke(serviceKey)).status).toBe(200);expect(h.rows.filter(r=>!r.resolved_at)).toHaveLength(1);});
 it('keeps coverage and SEO incidents separate',async()=>{const h=harness('nudge-untapped-cities',{existing:[existing],gaps:[gap],tension:[{...gap,tension_ratio:42}]});await h.invoke(serviceKey);expect(h.rows).toHaveLength(2);});
 it.each([{insertError:'42501'},{updateError:true}])('reports persistence errors %j',async options=>{const h=harness('nudge-untapped-cities',{existing:[existing],gaps:[gap],...options});expect((await h.invoke(serviceKey)).status).toBe(500);expect(h.fail).toHaveBeenCalled();expect(h.finish).not.toHaveBeenCalled();});
 it('detector failure causes no writes',async()=>{const h=harness('nudge-untapped-cities',{gapError:true});expect((await h.invoke(serviceKey)).status).toBe(500);expect(h.writes).toEqual([]);expect(h.fail).toHaveBeenCalled();});
 it('flag read failure cannot start work',async()=>{const h=harness('nudge-untapped-cities',{flagError:true});expect((await h.invoke(serviceKey)).status).toBe(500);expect(h.startCronRun).not.toHaveBeenCalled();expect(h.writes).toEqual([]);});
});
