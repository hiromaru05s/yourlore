import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {rewardTestEnv} from './fixtures/rewardTestEnv.mjs';
const dir=await mkdtemp('/tmp/lore-backend-oct16-');
const checks=[];
const test=async(name,fn)=>{try{await fn();checks.push({name,passed:true});}catch(e){checks.push({name,passed:false,error:e.message.slice(0,500)});}console.log(checks.at(-1));};
const req=(path,body,method='POST')=>new Request('https://test.yourlore.xyz'+path,{method,headers:{'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
try{
 await build({stdin:{contents:`export {default as worker} from './server/src/index'; export {GameRoom} from './server/src/gameRoom'; export {handleAuth} from './server/src/auth'; export {handleGoogleOAuth} from './server/src/oauth';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/test.mjs'});
 const {worker,GameRoom,handleAuth,handleGoogleOAuth}=await import(dir+'/test.mjs');
 await test('unsupported auth methods cannot bypass rate/body guards or mutate sessions',async()=>{
  const env=rewardTestEnv();let limited=0;
  env.AUTH_RATE_LIMITER={limit:async()=>{limited++;return{success:false}}};
  for(const path of ['login','register','reset','forgot','resend-verify','logout']){
   for(const method of ['DELETE','GET','HEAD']){
    const response=await worker.fetch(req('/api/auth/'+path,method==='DELETE'?{email:'absent@example.invalid',password:'password'}:undefined,method),env);
    assert.equal(response.status,405,`${method} ${path}`);assert.equal(response.headers.get('Allow'),'POST');
   }
  }
  assert.equal((await worker.fetch(req('/api/auth/login',{email:'absent@example.invalid',password:'password'}),env)).status,429);
  assert.equal(limited,1);
  assert.equal((await worker.fetch(req('/api/auth/me',undefined,'GET'),env)).status,200);
  assert.equal((await worker.fetch(req('/api/auth/login',undefined,'OPTIONS'),env)).status,200);
 });
 const body={seed:22,players:[{id:'a',name:'A'},{id:'b',name:'B'}]};
 function roomFixture(env=rewardTestEnv()){
  let saved,alarm;
  const state={storage:{get:async()=>structuredClone(saved),put:async(k,v)=>{saved=structuredClone(v)},setAlarm:async at=>{alarm=at}},getWebSockets:()=>[]};
  return {room:new GameRoom(state,env),state,saved:()=>saved,alarm:()=>alarm};
 }
 const setup=f=>f.room.fetch(req('/setup',body));
 await test('failed room initialization remains retryable without publishing partial state',async()=>{
  const env=rewardTestEnv(),prepare=env.DB.prepare;let fail=true;
  env.DB.prepare=(...args)=>{if(fail)throw Error('injected D1 outage');return prepare(...args)};
  const f=roomFixture(env);await assert.rejects(setup(f));
  assert.equal(f.room.room,null);assert.equal(f.saved(),undefined);
  fail=false;assert.equal((await setup(f)).status,200);assert(f.saved().daily.every(Boolean));assert(f.alarm());
 });
 await test('concurrent setup sees retryable busy until durable room is complete',async()=>{
  const env=rewardTestEnv(),prepare=env.DB.prepare;let release,entered;
  const blocked=new Promise(r=>release=r),waiting=new Promise(r=>entered=r);
  env.DB.prepare=(...args)=>{const stmt=prepare(...args);return{...stmt,bind(...values){const bound=stmt.bind(...values);return{...bound,async first(){entered();await blocked;return bound.first()}}}}};
  const f=roomFixture(env),pending=setup(f);await waiting;
  try{assert.equal((await setup(f)).status,503);assert.equal(f.room.room,null);assert.equal(f.saved(),undefined);}finally{release();await pending;}
  assert.equal((await setup(f)).status,409);assert(f.saved().daily.every(Boolean));
 });
 await test('alarm failure cannot persist a room with no cleanup deadline',async()=>{
  const f=roomFixture(),set=f.state.storage.setAlarm;f.state.storage.setAlarm=async()=>{throw Error('injected alarm outage')};
  await assert.rejects(setup(f));assert.equal(f.saved(),undefined);assert.equal(f.room.room,null);
  f.state.storage.setAlarm=set;assert.equal((await setup(f)).status,200);
 });
 await test('Google verification removes unverified password/session but keeps verified credentials',async()=>{
  const env={...rewardTestEnv(),GOOGLE_CLIENT_ID:'fixture',GOOGLE_CLIENT_SECRET:'fixture'};
  const email='pending@example.invalid',password='attacker-selected-password';
  await handleAuth(env,req('/auth/register',{email,password}),'/auth/register');
  const user=await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(email).first();
  await env.DB.prepare('UPDATE users SET verified=0 WHERE id=?').bind(user.id).run();
  const realFetch=globalThis.fetch;
  globalThis.fetch=async()=>Response.json({id_token:'header.'+Buffer.from(JSON.stringify({email,email_verified:true})).toString('base64url')+'.signature'});
  try{
   const callback=()=>handleGoogleOAuth(env,new Request('https://test.yourlore.xyz/api/auth/google/callback?code=fixture&state=fixture',{headers:{cookie:'lore_oauth_state=fixture'}}),'/auth/google/callback');
   assert.equal((await callback()).status,302);
   assert.equal((await handleAuth(env,req('/auth/login',{email,password}),'/auth/login')).status,401);
   assert.equal((await env.DB.prepare('SELECT COUNT(*) n FROM sessions WHERE user_id=?').bind(user.id).first()).n,1);
   await env.DB.prepare("UPDATE users SET password='verified-hash' WHERE id=?").bind(user.id).run();
   assert.equal((await callback()).status,302);
   assert.equal((await env.DB.prepare('SELECT password FROM users WHERE id=?').bind(user.id).first()).password,'verified-hash');
  }finally{globalThis.fetch=realFetch;}
 });
 if(process.env.LORE_BACKEND_AUDIT_OUT)await writeFile(process.env.LORE_BACKEND_AUDIT_OUT,JSON.stringify({checks},null,2));
 assert(checks.every(c=>c.passed),'backend audit regressions');
}finally{await rm(dir,{recursive:true,force:true});}
