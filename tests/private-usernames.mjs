import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {rewardTestEnv} from './fixtures/rewardTestEnv.mjs';
const dir=await mkdtemp('/tmp/lore-private-names-');const nativeFetch=globalThis.fetch;
try {
 await build({stdin:{contents:"export {default as worker} from './server/src/index'; export {handleGoogleOAuth} from './server/src/oauth'; export {GameRoom} from './server/src/gameRoom'; export {createGame} from './client/src/shared/engine'; export {publicNameEvents} from './server/src/publicNames';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/server.mjs'});
 const {worker,handleGoogleOAuth,GameRoom,createGame,publicNameEvents}=await import(dir+'/server.mjs');
 const env={...rewardTestEnv(),APP_ORIGIN:'*',GOOGLE_CLIENT_ID:'fixture',GOOGLE_CLIENT_SECRET:'fixture'};
 const call=(path,body,cookie)=>worker.fetch(new Request('https://yourlore.xyz/api'+path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...(cookie?{cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})}),env);
 const email='private.real.person@example.invalid';
 let res=await call('/auth/register',{email,password:'fixture-password'});assert.equal(res.status,200);
 const cookie=res.headers.get('set-cookie').split(';')[0],user=(await res.json()).user;
 assert.equal(user.needsUsername,true);assert.match(user.display,/^Seeker-[0-9a-f]{12}$/);assert(!user.display.includes('private'));
 assert.equal((await call('/social/me',{display:'Chosen Name'})).status,401);
 for(const display of ['', ' ', 'x', 'x'.repeat(25),email,'<img src=x onerror=alert(1)>','abc\nxyz','abc\u202exyz','😀😀']) {
  assert.equal((await call('/social/me',{display},cookie)).status,400,JSON.stringify(display));
  assert.equal((await (await call('/auth/me',undefined,cookie)).json()).user.needsUsername,true);
 }
 let result=await (await call('/social/me',{display:' 星のシーカー '},cookie)).json();assert.equal(result.display,'星のシーカー');assert.equal(result.needsUsername,false);
 result=await (await call('/auth/login',{email,password:'fixture-password'})).json();assert.equal(result.user.display,'星のシーカー');assert.equal(result.user.needsUsername,false);
 assert.equal((await call('/social/me',{display:'Moon_Reader-2'},cookie)).status,200);
 result=await (await call('/social/profile?id='+user.id,undefined,cookie)).json();assert.equal(result.profile.display,'Moon_Reader-2');assert(!JSON.stringify(result.profile).includes(email));
 // Google-provided names and email are never used; relogin must preserve explicit choice.
 globalThis.fetch=async()=>Response.json({id_token:'a.'+Buffer.from(JSON.stringify({email:'private.google.person@example.invalid',email_verified:true,name:'Private Real Person'})).toString('base64url')+'.z'});
 const oauth=()=>handleGoogleOAuth(env,new Request('https://yourlore.xyz/api/auth/google/callback?code=x&state=fixture',{headers:{cookie:'lore_oauth_state=fixture'}}),'/auth/google/callback');
 res=await oauth();const googleCookie=res.headers.get('set-cookie').split(';')[0];
 const google=(await (await call('/auth/me',undefined,googleCookie)).json()).user;assert.equal(google.needsUsername,true);assert.match(google.display,/^Seeker-[0-9a-f]{12}$/);
 await call('/social/me',{display:'GoogleSeeker'},googleCookie);res=await oauth();
 const again=(await (await call('/auth/me',undefined,res.headers.get('set-cookie').split(';')[0])).json()).user;assert.equal(again.display,'GoogleSeeker');assert.equal(again.needsUsername,false);
 const redirect=await handleGoogleOAuth(env,new Request('https://yourlore.xyz/api/auth/google'),'/auth/google');assert.equal(new URL(redirect.headers.get('location')).searchParams.get('scope'),'openid email');
 // One-time migration protects existing and rolling old-Worker signups and renames.
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE users(id TEXT PRIMARY KEY,display TEXT,source TEXT,password TEXT)');db.exec("INSERT INTO users(id,display) VALUES('old','Private Real Person')");db.exec(await readFile('server/migrations/0025_private_usernames.sql','utf8'));
 assert.match(db.prepare("SELECT display FROM users WHERE id='old'").get().display,/^Seeker-[0-9a-f]{12}$/);
 db.exec('PRAGMA recursive_triggers=ON');db.exec("INSERT INTO users(id,display) VALUES('new','Google Full Name')");
 db.exec("UPDATE users SET display='email.local.part' WHERE id='old'");assert.match(db.prepare("SELECT display FROM users WHERE id='old'").get().display,/^Seeker-[0-9a-f]{12}$/);
 db.exec("UPDATE users SET display='Chosen', username_set=1 WHERE id='old'");assert.equal(db.prepare("SELECT display FROM users WHERE id='old'").get().display,'Chosen');
 const markup=publicNameEvents([{type:'log',html:'<b class="a">Alice and a</b>',htmlJa:'Alice and a'}],new Map([['a','Seeker-a'],['Alice','Seeker-A']]));
 assert.equal(markup[0].html,'<b class="a">Seeker-A and Seeker-a</b>','preserve markup and replace in one pass');
 // Cached pre-fix room identities and journal must be scrubbed before restore.
 const {state:game,events}=createGame({seed:42,p0:{id:user.id,name:'Private Real Person'},p1:{id:google.id,name:'private.google.person'}});
 const values=new Map([['room',{players:[{id:user.id,name:'Private Real Person'},{id:google.id,name:'private.google.person'}],game,initEvents:events,logBatchCount:1}],['battle-log:00000000',[{type:'log',html:'Private Real Person vs private.google.person',htmlJa:'Private Real Person vs private.google.person'}]]]);
 const storage={async get(k){return structuredClone(values.get(k))},async put(k,v){values.set(k,structuredClone(v))},async list(){return new Map([...values].filter(([k])=>k.startsWith('battle-log:')))}};
 const room=new GameRoom({storage},env);await Promise.all([room.restore(),room.restore()]);
 const restored=values.get('room');assert.equal(restored.game.players[0].name,'Moon_Reader-2');assert.equal(restored.game.players[1].name,'GoogleSeeker');assert.equal(restored.publicNamesVersion,1);
 const persisted=JSON.stringify([...values]);assert(!persisted.includes('Private Real Person'));assert(!persisted.includes('private.google.person'));
 console.log('PASS private email/Google signup, explicit naming, invalid-name rejection, relogin/rename, public profile, rolling migration, legacy room/journal privacy');
}finally {globalThis.fetch=nativeFetch;await rm(dir,{recursive:true,force:true});}
