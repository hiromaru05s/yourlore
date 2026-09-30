import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {build} from 'esbuild';import {DatabaseSync} from 'node:sqlite';
const dir=await fs.mkdtemp('/tmp/lore-bc-test-');const checks=[];
await build({stdin:{contents:`export {guardRequest} from './server/src/requestGuard';export {corsHeaders,getUser} from './server/src/auth';export {handleSocial} from './server/src/social';export {Matchmaker} from './server/src/matchmaker';export {GameRoom} from './server/src/gameRoom';`,resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',outfile:dir+'/test.mjs'});
const {guardRequest,corsHeaders,getUser,handleSocial,Matchmaker,GameRoom}=await import(dir+'/test.mjs');
const post=(path,body)=>new Request('https://test.yourlore.xyz'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
async function test(name,fn){await fn();checks.push(name);console.log('PASS',name);}
try{
await test('bounded typed API input and regional rate limit',async()=>{
 for(const body of [null,[],{email:3},{password:[]},{accept:'yes'},{q:'x'.repeat(255)}])assert.equal((await guardRequest(post('/api/auth/login',body),{})).status,400);
 assert.equal((await guardRequest(post('/api/auth/login',{x:'x'.repeat(33000)}),{})).status,413);
 const normal=await guardRequest(post('/api/auth/login',{email:'a@example.test',password:'long-enough'}),{});assert(normal instanceof Request);assert.equal((await normal.json()).email,'a@example.test');
 assert.equal((await guardRequest(post('/api/auth/login',{}),{AUTH_RATE_LIMITER:{limit:async()=>({success:false})}})).status,429);
 assert.equal((await guardRequest(post('/api/inquiry',{}),{INQUIRY_RATE_LIMITER:{limit:async()=>({success:false})}})).headers.get('retry-after'),'60');
});
await test('same-origin CORS omits wildcard credentials',async()=>{assert.deepEqual(corsHeaders({APP_ORIGIN:'*'}),{});assert.equal(corsHeaders({APP_ORIGIN:'https://yourlore.xyz'})['Access-Control-Allow-Origin'],'https://yourlore.xyz');});
const db=new DatabaseSync(':memory:');db.exec(await fs.readFile('server/schema.sql','utf8'));
class Stmt{constructor(q,args=[]){this.q=q;this.args=args;}bind(...args){return new Stmt(this.q,args)}async first(){return db.prepare(this.q).get(...this.args)??null}async all(){return{results:db.prepare(this.q).all(...this.args)}}async run(){const r=db.prepare(this.q).run(...this.args);return{meta:{changes:Number(r.changes)}}}}
const env={DB:{prepare:q=>new Stmt(q)},APP_ORIGIN:'*'};
for(const id of ['a','b']){db.prepare('INSERT INTO users(id,email,password,display,created_at,verified) VALUES(?,?,?,?,?,1)').run(id,id+'@example.test','fixture',id,Date.now());db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(id,id,Date.now(),Date.now()+60000);}
await test('fresh schema supports authenticated furniture projection',async()=>{const user=await getUser(env,new Request('https://test',{headers:{cookie:'lore_session=a'}}));assert.equal(user.id,'a');});
let fail=false;const roomIds=new Set();let setups=0;
env.GAME_ROOM={idFromName:id=>id,get:id=>({fetch:async()=>{await new Promise(r=>setTimeout(r,5));if(fail)return new Response('fail',{status:503});if(roomIds.has(id))return new Response('exists',{status:409});roomIds.add(id);setups++;return new Response('ok')}})};
const user={id:'b',display:'B',deck:[]};
const challenge=id=>db.prepare("INSERT INTO challenges(id,challenger,target,status,created_at) VALUES(?,'a','b','pending',?)").run(id,Date.now());
const accept=id=>handleSocial(env,post('/api/social/challenge/respond',{id,accept:true}),'/social/challenge/respond',user);
await test('concurrent challenge acceptance creates one recoverable room',async()=>{challenge('one');const replies=await Promise.all([accept('one'),accept('one')]);assert(replies.every(r=>r.status===200));const bodies=await Promise.all(replies.map(r=>r.json()));assert.equal(bodies[0].roomId,bodies[1].roomId);assert.equal(setups,1);assert.equal((await (await accept('one')).json()).roomId,bodies[0].roomId);});
await test('failed challenge setup can retry same identity',async()=>{challenge('two');fail=true;assert.equal((await accept('two')).status,503);fail=false;assert.equal((await accept('two')).status,200);assert.equal(setups,2);});
db.close();
globalThis.WebSocket={OPEN:1};const socket=()=>({readyState:1,messages:[],send(m){this.messages.push(JSON.parse(m))},close(){this.readyState=3}});
await test('queue account reservation, repeated messages and setup failure',async()=>{
 let release,calls=0;const mm=new Matchmaker({}, {GAME_ROOM:{idFromName:x=>x,get:()=>({fetch:()=>{calls++;return new Promise(r=>release=r)}})}});
 const a={ws:socket(),id:'a',ranked:false},b={ws:socket(),id:'b',ranked:false};mm.connections.set('a',a);mm.connections.set('b',b);
 assert.equal((await mm.fetch(new Request('https://do?uid=a',{headers:{Upgrade:'websocket'}}))).status,409);
 mm.onMsg(a,{data:'{"type":"queue"}'});mm.onMsg(b,{data:'{"type":"queue"}'});mm.onMsg(a,{data:'{"type":"queue"}'});mm.onMsg(b,{data:'{"type":"queue"}'});assert.equal(calls,1);assert.equal(mm.casual,null);
 release(new Response('failure',{status:503}));await new Promise(r=>setTimeout(r,0));assert(!a.ws.messages.some(m=>m.type==='matched'));assert(a.ws.messages.some(m=>m.type==='error'));
 mm.onMsg(a,{data:'{"type":"queue"}'});mm.onMsg(b,{data:'{"type":"queue"}'});release(new Response('ok'));await new Promise(r=>setTimeout(r,0));assert.equal(a.ws.messages.filter(m=>m.type==='matched').length,1);
 mm.onMsg(a,{data:'{"type":"queue"}'});assert.equal(calls,2);
 for(let i=0;i<65;i++)mm.onMsg(a,{data:'{"type":"ping"}'});assert.equal(a.ws.readyState,3);
});
await test('failed persistence/alarm never broadcasts uncommitted turn',async()=>{
 let saved,failWrite=false,failAlarm=false;const sockets=[0,1].map(side=>({...socket(),deserializeAttachment:()=>({side,gen:0})}));const state={id:{toString:()=> 'fixture'},getWebSockets:tag=>sockets.filter((_,i)=>String(i)===tag),storage:{get:async()=>structuredClone(saved),put:async(k,v)=>{if(failWrite)throw Error('injected');saved=structuredClone(v)},setAlarm:async()=>{if(failAlarm)throw Error('injected')},deleteAlarm:async()=>{}}};const room=new GameRoom(state,{});
 await room.fetch(post('/setup',{seed:77,players:[{id:'a',name:'A'},{id:'b',name:'B'}]}));room.room.previewDone=true;room.room.readied=[true,true];room.room.opening=undefined;await room.persist();const turn=saved.game.turn;
 for(const failure of ['write','alarm']){await room.restore();failWrite=failure==='write';failAlarm=failure==='alarm';await assert.rejects(room.handleAction(room.room.game.cur,{type:'endTurn'}));assert.equal(saved.game.turn,turn);assert.equal(sockets.flatMap(s=>s.messages).length,0);assert.equal(room.room,null);failWrite=failAlarm=false;}
});
if(process.env.LORE_BC_REPORT)await fs.writeFile(process.env.LORE_BC_REPORT,JSON.stringify({checks},null,2));
}finally{await fs.rm(dir,{recursive:true,force:true});}
