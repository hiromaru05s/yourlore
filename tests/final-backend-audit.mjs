import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {rewardTestEnv} from './fixtures/rewardTestEnv.mjs';
const dir=await mkdtemp('/tmp/lore-final-backend-');
try {
 await build({stdin:{contents:`export {default as worker} from './server/src/index';export {getUser} from './server/src/auth';export {Matchmaker} from './server/src/matchmaker';export {handleSocial} from './server/src/social';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/test.mjs'});
 const {worker,getUser,Matchmaker,handleSocial}=await import(dir+'/test.mjs');
 const env=rewardTestEnv(),run=(sql,...args)=>env.DB.prepare(sql).bind(...args).run();
 await run('INSERT INTO sessions(token,user_id,created_at,expires_at) VALUES (?,?,?,?)','fixture','a',0,Date.now()+60000);
 const request=(path,body,cookie='lore_session=fixture')=>new Request('https://local'+path,{method:body===undefined?'GET':'POST',headers:{cookie,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const user=await getUser(env,request('/api/auth/me'));
 user.decks.list[1].name='Preserve me';user.decks.sel=1;
 assert.equal((await worker.fetch(request('/api/deck',{decks:user.decks}),env)).status,200);
 const before=await env.DB.prepare('SELECT deck,decks,sleeve,furniture FROM users WHERE id=?').bind('a').first();
 for(const body of [{},{deck:null},{deck:[]},{deck:['missing']},{decks:null},{decks:{}},{decks:{sel:0,list:[]}},{decks:{...user.decks,sel:1.5}},{decks:{...user.decks,list:[...user.decks.list.slice(1),{cards:null}]}}]){
  assert.equal((await worker.fetch(request('/api/deck',body),env)).status,400,JSON.stringify(body));
  assert.deepEqual(await env.DB.prepare('SELECT deck,decks,sleeve,furniture FROM users WHERE id=?').bind('a').first(),before);
 }
 assert.equal((await worker.fetch(request('/api/deck',{deck:user.deck}),env)).status,200,'legacy valid single deck remains supported');
 console.log('PASS malformed saves never replace existing decks; valid legacy payload accepted');
 assert.equal(await getUser(env,request('/api/auth/me',undefined,'not_lore_session=fixture')),null);
 assert.equal((await getUser(env,request('/api/auth/me',undefined,'other=1; lore_session=fixture'))).id,'a');
 const queries=[],prepare=env.DB.prepare;env.DB.prepare=(sql)=>{queries.push(sql);return prepare(sql)};
 assert.equal((await worker.fetch(request('/api/presence',{state:'menu'}),env)).status,200);
 assert.equal(queries.length,2);assert(!queries.some(q=>/experience_events|starter_cards|sleeves/.test(q)));
 await run('UPDATE sessions SET expires_at=0 WHERE token=?','fixture');
 assert.equal((await worker.fetch(request('/api/presence',{state:'online'}),env)).status,401);
 assert.equal((await env.DB.prepare('SELECT state FROM presence WHERE user_id=?').bind('a').first()).state,'menu');
 console.log('PASS presence uses identity-only authentication, rejects expired sessions, exact cookie match');
 await run('UPDATE sessions SET expires_at=? WHERE token=?',Date.now()+60000,'fixture');
 for(const body of [null,{}, {difficulty:'invalid'}])assert.equal((await worker.fetch(request('/api/rewards/bot/start',body),env)).status,400);
 for(const mode of ['rotation-throw','rotation-http','rotation-invalid','setup-throw','setup-http','ok']){
  env.GAME_ROOM={idFromName:x=>x,get:()=>({fetch:async req=>{
   if(new URL(req.url).pathname==='/npc-deck'){
    if(mode==='rotation-throw')throw Error('outage');
    return Response.json({index:mode==='rotation-invalid'?99:0},{status:mode==='rotation-http'?503:200});
   }
   if(mode==='setup-throw')throw Error('outage');
   return new Response('setup',{status:mode==='setup-http'?503:200});
  }})};
  assert.equal((await worker.fetch(request('/api/rewards/bot/start',{difficulty:'easy'}),env)).status,mode==='ok'?200:503,mode);
 }
 console.log('PASS NPC start rejects malformed inputs and returns retryable failures for rotation/setup outages');
 const social=(id,path,body)=>handleSocial(env,request('/api'+path,body),path,{...user,id,display:id});
 await run("INSERT INTO friends(user_a,user_b,status,created_at) VALUES ('a','b','accepted',0)");
 let setupResponse=()=>Promise.reject(Error('network outage'));
 env.GAME_ROOM={idFromName:x=>x,get:()=>({fetch:()=>setupResponse()})};
 const create=async()=> (await (await social('a','/social/challenge',{user_id:'b'})).json()).id;
 const challenge=await create();
 assert.equal((await social('b','/social/challenge/respond',{id:challenge,accept:true})).status,503);
 const inbox=await (await social('b','/social/friends')).json();assert(inbox.challenges.some(c=>c.id===challenge),'failed provisioning remains visible for retry');
 setupResponse=async()=>new Response('already initialized',{status:409});
 const recovered=await social('b','/social/challenge/respond',{id:challenge,accept:true});assert.equal(recovered.status,200);
 const poll=async(id)=>handleSocial(env,request('/api/social/challenge/poll?id='+id),'/social/challenge/poll',{...user,id:'a'});
 assert.equal((await (await poll(challenge)).json()).status,'accepted');
 const expiring=await create();await run("UPDATE challenges SET status='provisioning',created_at=? WHERE id=?",Date.now()-100000,expiring);
 assert.equal((await (await poll(expiring)).json()).status,'expired');
 const cancelled=await create();let release,started;
 const entered=new Promise(r=>started=r);setupResponse=()=>{started();return new Promise(r=>release=r)};
 const accepting=social('b','/social/challenge/respond',{id:cancelled,accept:true});await entered;
 await social('a','/social/challenge/cancel',{id:cancelled});release(new Response('created'));
 assert.equal((await accepting).status,409,'cancel during setup cannot return an accepted room');
 assert.equal((await (await poll(cancelled)).json()).status,'cancelled');
 console.log('PASS friendly setup failure remains retryable, lost response recovers, provisioning expires, cancellation wins setup race');
 const oldWebSocket=globalThis.WebSocket;globalThis.WebSocket={OPEN:1};
 try {
  for(const throws of [false,true]){
   const mm=new Matchmaker({}, {GAME_ROOM:{idFromName:x=>x,get:()=>({fetch:async()=>{if(throws)throw Error('outage');return new Response('unavailable',{status:503})}})}});
   const waiter=id=>({id,name:id,ranked:false,ws:{readyState:1,messages:[],send(raw){this.messages.push(JSON.parse(raw))},close(code){this.code=code;this.readyState=3}}});
   const a=waiter('a'),b=waiter('b');mm.connections.set('a',a);mm.connections.set('b',b);
   await mm.pair(a,b);
   for(const w of [a,b]){assert.equal(w.ws.code,1013);assert.equal(w.ws.messages.at(-1).type,'error');assert.equal(w.phase,undefined);}
   assert.equal(mm.connections.size,0);
  }
 } finally {globalThis.WebSocket=oldWebSocket;}
 console.log('PASS HTTP and network room-setup failures close queue sockets for client backoff/reconnect');
} finally {await rm(dir,{recursive:true,force:true})}
