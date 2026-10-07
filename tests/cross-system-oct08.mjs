import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-cross-system-');
await build({stdin:{contents:`export {GameRoom} from './server/src/gameRoom';export {applyInviteAtSignup} from './server/src/invite';export {ownedBadges,handleSocial} from './server/src/social';export {handleAuth} from './server/src/auth';export {issueToken} from './server/src/email';export {handleGoogleOAuth} from './server/src/oauth';export {handleRank} from './server/src/rank';export {sanitizeDecks} from './client/src/shared/cards';`,resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',outfile:dir+'/test.mjs'});
const {GameRoom,applyInviteAtSignup,ownedBadges,handleSocial,handleAuth,issueToken,handleGoogleOAuth,handleRank,sanitizeDecks}=await import(dir+'/test.mjs');
const checks=[];const test=async(name,fn)=>{try{await fn();checks.push({name,passed:true})}catch(e){checks.push({name,passed:false,error:e.message})}console.log(checks.at(-1))};
const post=(path,body)=>new Request('https://test.yourlore.xyz'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
const db=new DatabaseSync(':memory:');db.exec(await readFile('server/schema.sql','utf8'));
class Stmt{constructor(q,args=[]){this.q=q;this.args=args}bind(...args){return new Stmt(this.q,args)}async first(){return db.prepare(this.q).get(...this.args)??null}async all(){return{results:db.prepare(this.q).all(...this.args)}}execute(){const r=db.prepare(this.q).run(...this.args);return{meta:{changes:Number(r.changes)}}}async run(){return this.execute()}}
const env={DB:{prepare:q=>new Stmt(q),async batch(stmts){db.exec('BEGIN');try{const r=stmts.map(s=>s.execute());db.exec('COMMIT');return r}catch(e){db.exec('ROLLBACK');throw e}}},GAME_ROOM:{idFromName:id=>({toString:()=> 'durable-'+id})}};
const user=id=>{db.prepare('INSERT INTO users(id,email,password,display,created_at,verified) VALUES(?,?,?,?,?,1)').run(id,id+'@example.test','fixture',id,Date.now());return{id,display:id}};
try{
await test('concurrent invite attribution respects three-person cap and ledger ownership',async()=>{
 user('inviter');db.prepare('UPDATE users SET invite_code=? WHERE id=?').run('INVITER','inviter');for(let i=0;i<8;i++)user('invitee'+i);
 await Promise.all(Array.from({length:8},(_,i)=>applyInviteAtSignup(env,'invitee'+i,'INVITER')));
 assert.equal(db.prepare('SELECT COUNT(*) n FROM invite_rewards').get().n,3);
 assert.equal(db.prepare("SELECT COUNT(*) n FROM users WHERE invited_by='inviter'").get().n,3);
});
await test('current and legacy tutorial completion grant badge; incomplete lesson does not',async()=>{
 for(const [id,key,want]of [['current','tuto:10',true],['legacy','tut:6',true],['unfinished','tuto:6',false]]){user(id);db.prepare('INSERT INTO rewards VALUES(?,?,?,?)').run(id,key,0,Date.now());assert.equal((await ownedBadges(env,id)).includes('tutorial'),want,id)}
});
await test('parallel room setup cannot reset an already provisioned game',async()=>{
 let saved;const r=new GameRoom({storage:{get:async()=>saved,put:async(k,v)=>{saved=structuredClone(v)},setAlarm:async()=>{}}},{});
 let release;const body={seed:1,players:[{id:'a',name:'A'},{id:'b',name:'B'}]};
 const slow={url:'https://do/setup',method:'POST',json:()=>new Promise(resolve=>release=resolve)};
 const pending=r.fetch(slow);while(!release)await Promise.resolve();
 assert.equal((await r.fetch(post('/setup',{...body,seed:2}))).status,200);const before=structuredClone(saved);release(body);
 assert.equal((await pending).status,409);assert.deepEqual(saved,before);
});
await test('timeout write failure never sends an uncommitted board',async()=>{
 let saved,fail=false;const sockets=[0,1].map(side=>({messages:[],deserializeAttachment:()=>({side,gen:0}),send(raw){this.messages.push(JSON.parse(raw))}}));
 const r=new GameRoom({id:{toString:()=> 'room'},getWebSockets:tag=>sockets.filter((_,i)=>String(i)===tag),storage:{get:async()=>structuredClone(saved),put:async(k,v)=>{if(fail)throw Error('injected');saved=structuredClone(v)},setAlarm:async()=>{},deleteAlarm:async()=>{}}},{});
 await r.fetch(post('/setup',{seed:77,players:[{id:'a',name:'A'},{id:'b',name:'B'}]}));Object.assign(r.room,{opening:undefined,readied:[true,true],joinBy:null,turnStartAt:Date.now()-200000});await r.persist();fail=true;
 await assert.rejects(r.alarm());assert.equal(sockets.flatMap(s=>s.messages).length,0);assert.equal(r.room,null);
});
await test('login returns equipped deck before home or BOT can start',async()=>{
 const registration=await handleAuth(env,post('/auth/register',{email:'login@example.test',password:'pass1234'}),'/auth/register');const id=(await registration.json()).user.id;
 const decks=sanitizeDecks(null);decks.sel=2;decks.list[2].name='MY SAVED DECK';db.prepare('UPDATE users SET decks=?,avatar=? WHERE id=?').run(JSON.stringify(decks),'SEEKER_RED',id);
 const response=await handleAuth(env,post('/auth/login',{email:'login@example.test',password:'pass1234'}),'/auth/login');const u=(await response.json()).user;
 assert.equal(u.decks?.sel,2);assert.equal(u.decks.list[2].name,'MY SAVED DECK');assert.equal(u.avatar,'SEEKER_RED');assert.deepEqual(u.deck,decks.list[2].cards);
});
await test('concurrent password reset consumes the token once',async()=>{
 user('reset');const token=await issueToken(env,'reset','reset');
 const results=await Promise.all(['first123','second123'].map(password=>handleAuth(env,post('/auth/reset',{token,password}),'/auth/reset')));
 assert.deepEqual(results.map(r=>r.status).sort(),[200,400]);
});
await test('concurrent resend retains the one token actually issued',async()=>{
 user('resend');const results=await Promise.all(Array.from({length:5},()=>issueToken(env,'resend','verify')));
 assert.equal(results.filter(Boolean).length,1);assert.equal(db.prepare("SELECT token FROM email_tokens WHERE user_id='resend'").get().token,results.find(Boolean));
});
await test('OAuth return rejects a backslash external redirect',async()=>{
 const response=await handleGoogleOAuth({GOOGLE_CLIENT_ID:'fixture',GOOGLE_CLIENT_SECRET:'fixture'},new Request('https://test.yourlore.xyz/api/auth/google?'+new URLSearchParams({return:'/\\outside.example/path'})),'/auth/google');
 const cookies=response.headers.get('set-cookie');const ctx=decodeURIComponent(cookies.match(/lore_oauth_ctx=([^;]+)/)[1]);const ret=ctx.split('|')[2];assert(!ret||new URL(ret,'https://test.yourlore.xyz').origin==='https://test.yourlore.xyz');
});
await test('rank recovery resolves public room name to stored durable identity',async()=>{
 user('rank-a');user('rank-b');db.prepare('INSERT INTO ranked_results(match_id,season,a_id,b_id,winner,a_before,b_before,a_after,b_after,applied,created_at) VALUES(?,?,?,?,?,?,?,?,?,1,?)').run('durable-public-room','2026-10','rank-a','rank-b','rank-a',1000,1000,1018,984,Date.now());
 const r=await handleRank(env,new Request('https://test/api/rank/result?matchId=public-room'),'/rank/result',{id:'rank-a'});assert.equal((await r.json()).result?.after,1018);
 const other=await handleRank(env,new Request('https://test/api/rank/result?matchId=public-room'),'/rank/result',{id:'reset'});assert.equal((await other.json()).result,null);
});
await test('opposite simultaneous friend requests produce one relationship',async()=>{
 const a=user('friend-a'),b=user('friend-b');const results=await Promise.all([handleSocial(env,post('/social/friends/request',{q:b.display}),'/social/friends/request',a),handleSocial(env,post('/social/friends/request',{q:a.display}),'/social/friends/request',b)]);
 assert.equal(db.prepare("SELECT COUNT(*) n FROM friends WHERE user_a LIKE 'friend-%'").get().n,1);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
});
await test('simultaneous friend acceptance cannot exceed either account limit',async()=>{
 const target=user('capacity');for(let i=0;i<101;i++){const from=user('capacity-'+i);db.prepare('INSERT INTO friends VALUES(?,?,?,?)').run(from.id,target.id,i<99?'accepted':'pending',Date.now())}
 const results=await Promise.all([99,100].map(i=>handleSocial(env,post('/social/friends/respond',{user_id:'capacity-'+i,accept:true}),'/social/friends/respond',target)));
 assert.deepEqual(results.map(r=>r.status).sort(),[200,400]);assert.equal(db.prepare("SELECT COUNT(*) n FROM friends WHERE user_b='capacity' AND status='accepted'").get().n,100);
});

}finally{db.close();await rm(dir,{recursive:true,force:true})}
if(process.env.LORE_CROSS_REPORT)await writeFile(process.env.LORE_CROSS_REPORT,JSON.stringify({checks},null,2));assert(checks.every(c=>c.passed),`${checks.filter(c=>!c.passed).length} cross-system regressions`);
