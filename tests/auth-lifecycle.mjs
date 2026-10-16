import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {rewardTestEnv} from './fixtures/rewardTestEnv.mjs';
const dir=await mkdtemp('/tmp/lore-auth-lifecycle-');
const nativeFetch=globalThis.fetch;
try{
 await build({stdin:{contents:"export {default as worker} from './server/src/index'; export {handleGoogleOAuth} from './server/src/oauth';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/auth.mjs'});
 const {worker,handleGoogleOAuth}=await import(dir+'/auth.mjs');
 const env={...rewardTestEnv(),APP_ORIGIN:'*',RESEND_API_KEY:'test-only',GOOGLE_CLIENT_ID:'test-only',GOOGLE_CLIENT_SECRET:'test-only'};
 const messages=[];let googleEmail='oauth-new@example.invalid',googleVerified=true;
 globalThis.fetch=async(url,init)=>{
  if(String(url)==='https://api.resend.com/emails'){messages.push(JSON.parse(init.body));return Response.json({id:'test'});}
  if(String(url)==='https://oauth2.googleapis.com/token')return Response.json({id_token:'header.'+Buffer.from(JSON.stringify({email:googleEmail,email_verified:googleVerified,name:'QA Google'})).toString('base64url')+'.signature'});
  throw Error('Unexpected external request');
 };
 const call=(path,body,cookie,method=body===undefined?'GET':'POST')=>worker.fetch(new Request('https://yourlore.xyz/api'+path,{method,headers:{'content-type':'application/json',...(cookie?{cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})}),env);
 const email='auth-lifecycle@example.invalid',password='first-password-2026';
 let r=await call('/auth/register',{email,password});assert.equal(r.status,200);assert.equal((await r.json()).needVerify,true);assert.equal(messages.length,1);assert.equal(r.headers.get('set-cookie'),null);
 const pending=await env.DB.prepare('SELECT * FROM users WHERE email=?').bind(email).first();assert.equal(pending.verified,0);assert.notEqual(pending.password,password);
 assert.equal((await call('/auth/login',{email,password})).status,403);
 assert.equal((await call('/auth/register',{email,password})).status,409);
 assert.equal((await call('/auth/resend-verify',{email})).status,200);assert.equal(messages.length,1,'resend rate limit');
 const verify=await env.DB.prepare("SELECT token FROM email_tokens WHERE user_id=? AND kind='verify'").bind(pending.id).first();
 assert(messages[0].html.includes('/api/auth/verify?token='+verify.token));
 assert.equal((await call('/auth/verify?token='+verify.token)).status,302);
 assert.equal((await call('/auth/verify?token='+verify.token)).status,400);
 assert.equal((await call('/auth/login',{email,password:'wrong-password'})).status,401);
 r=await call('/auth/login',{email,password});assert.equal(r.status,200);
 const cookie=r.headers.get('set-cookie').split(';')[0];assert(r.headers.get('set-cookie').includes('HttpOnly'));assert(r.headers.get('set-cookie').includes('Secure'));
 const u=(await (await call('/auth/me',undefined,cookie)).json()).user;
 assert.equal(u.exp,0);assert.equal(u.credits,0);assert.deepEqual(Object.fromEntries(Object.entries(u.starterCards).filter(([,n])=>n>0)),{STARTER_TRASH:8,STARTER_MANA:1,STARTER_CHEST:2});
 assert.equal((await call('/auth/forgot',{email})).status,200);assert.equal(messages.length,2);
 const reset=await env.DB.prepare("SELECT token FROM email_tokens WHERE user_id=? AND kind='reset'").bind(pending.id).first();
 const next='second-password-2026';assert.equal((await call('/auth/reset',{token:reset.token,password:next})).status,200);
 assert.equal((await call('/auth/me',undefined,cookie)).status,200);assert.equal((await (await call('/auth/me',undefined,cookie)).json()).user,null);
 assert.equal((await call('/auth/reset',{token:reset.token,password:next})).status,400);
 assert.equal((await call('/auth/login',{email,password})).status,401);
 r=await call('/auth/login',{email,password:next});assert.equal(r.status,200);const fresh=r.headers.get('set-cookie').split(';')[0];
 assert.equal((await call('/auth/logout',{},fresh)).status,200);assert.equal((await (await call('/auth/me',undefined,fresh)).json()).user,null);
 const callback=(state='test')=>handleGoogleOAuth(env,new Request('https://yourlore.xyz/api/auth/google/callback?code=test&state='+state,{headers:{cookie:'lore_oauth_state=test'}}),'/auth/google/callback');
 assert.equal((await callback('wrong')).status,400);
 r=await callback();assert.equal(r.status,302);const oauthCookie=r.headers.get('set-cookie').split(';')[0];
 assert.equal((await (await call('/auth/me',undefined,oauthCookie)).json()).user.email,googleEmail);
 assert.equal((await callback()).status,302);assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM users WHERE email=?').bind(googleEmail).first()).n,1);
 googleVerified=false;googleEmail='unverified@example.invalid';assert.equal((await callback()).status,400);
 assert.equal(await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(googleEmail).first(),null);
 console.log('PASS email registration/verification/login/reset/logout, fresh defaults, Google signup/relogin and invalid state/email rejection (providers mocked)');
}finally{globalThis.fetch=nativeFetch;await rm(dir,{recursive:true,force:true});}
