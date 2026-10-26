import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {DatabaseSync} from 'node:sqlite';
const tmp=await fs.mkdtemp('/tmp/lore-gifts-');
await build({entryPoints:['server/src/gifts.ts'],bundle:true,platform:'node',format:'esm',outfile:tmp+'/gifts.mjs'});
const {claimGifts,giftInbox,handleGifts,issueGift}=await import(tmp+'/gifts.mjs');
const db=new DatabaseSync(':memory:');db.exec(await fs.readFile('server/schema.sql','utf8'));db.exec('PRAGMA foreign_keys=ON');let fail=false;
class Stmt{constructor(sql,args=[]){this.sql=sql;this.args=args}bind(...args){return new Stmt(this.sql,args)}exec(){if(fail&&this.sql.startsWith('UPDATE users SET credits'))throw Error('injected write failure');const q=db.prepare(this.sql);return /^SELECT/i.test(this.sql)?{results:q.all(...this.args)}:{meta:{changes:Number(q.run(...this.args).changes)},results:[]}}async all(){return this.exec()}async run(){return this.exec()}async first(){return db.prepare(this.sql).get(...this.args)??null}}
const env={DB:{prepare:sql=>new Stmt(sql),batch:async ss=>{db.exec('BEGIN');try{const r=ss.map(s=>s.exec());db.exec('COMMIT');return r}catch(e){db.exec('ROLLBACK');throw e}}}};
const now=Date.now();for(const id of ['alice','bob'])db.prepare('INSERT INTO users(id,email,password,display,created_at,credits) VALUES(?,?,?,?,?,?)').run(id,id+'@example.invalid','disabled',id,now-1000,100);
db.prepare('INSERT INTO sessions(token,user_id,created_at,expires_at) VALUES(?,?,?,?)').run('test-session','alice',now,now+60000);
const balance=id=>db.prepare('SELECT credits FROM users WHERE id=?').get(id).credits;
const msg=(id,extra={})=>({id,title:'Maintenance apology',body:'Thank you for your patience.',amount:500,expiresAt:now+86400000,userId:'alice',...extra});
const req=(body,cookie=false)=>new Request('https://local/api/gifts',{method:'POST',headers:{'content-type':'application/json',...(cookie?{cookie:'lore_session=test-session'}:{})},body:JSON.stringify(body)});
let count=0;const test=async(name,fn)=>{await fn();count++;console.log('PASS',name)};
try{
await test('issuance does not change balances; explicit recipient only',async()=>{assert.equal((await issueGift(env,req(msg('gift-one')),'operator')).status,200);assert.equal(balance('alice'),100);assert.equal((await giftInbox(env,'alice')).pendingCount,1);assert.equal((await giftInbox(env,'bob')).pendingCount,0)});
await test('issuance IDs are immutable and retry is idempotent',async()=>{assert.equal((await (await issueGift(env,req(msg('gift-one')),'operator')).json()).created,false);assert.equal((await issueGift(env,req(msg('gift-one',{amount:999})),'operator')).status,409);assert.equal((await giftInbox(env,'alice')).pendingAmount,500)});
await test('all audience snapshots current accounts and retry excludes later accounts',async()=>{const body=msg('gift-all',{all:true,userId:undefined,amount:300});assert.equal((await issueGift(env,req(body),'operator')).status,200);db.prepare('INSERT INTO users(id,email,password,display,created_at) VALUES(?,?,?,?,?)').run('later','later@example.invalid','disabled','later',Date.now());await issueGift(env,req(body),'operator');assert.equal((await giftInbox(env,'later')).pendingCount,0);assert.equal((await giftInbox(env,'bob')).pendingAmount,300)});
await test('concurrent/repeated claims pay once and never another account',async()=>{assert.equal((await claimGifts(env,'bob','gift-one')).amount,0);const results=await Promise.all([claimGifts(env,'alice','gift-one'),claimGifts(env,'alice','gift-one')]);assert.equal(results.reduce((n,r)=>n+r.amount,0),500);assert.equal(balance('alice'),600);assert.equal(db.prepare("SELECT COUNT(*) AS n FROM rewards WHERE user_id='alice' AND key='gift:gift-one'").get().n,1)});
await test('bulk claim excludes expired items, repeats and another users delivery',async()=>{await issueGift(env,req(msg('expired',{expiresAt:now+1000})),'operator');assert.equal((await claimGifts(env,'alice',null,now+2000)).amount,300);assert.equal(balance('alice'),900);assert.equal((await claimGifts(env,'alice',null,now+2000)).amount,0);assert.equal(balance('bob'),100);const inbox=await giftInbox(env,'alice',now+2000);assert.equal(inbox.pendingCount,0);assert.equal(inbox.items.filter(i=>i.claimedAt).length,2);assert.equal(inbox.items.find(i=>i.id==='expired').claimedAt,null)});
await test('credit failure rolls back claim marker and ledger; retry pays once',async()=>{await issueGift(env,req(msg('rollback',{amount:700})),'operator');fail=true;await assert.rejects(claimGifts(env,'alice','rollback'));fail=false;assert.equal((await giftInbox(env,'alice')).items.find(i=>i.id==='rollback').claimedAt,null);assert.equal(balance('alice'),900);assert.equal((await claimGifts(env,'alice','rollback')).amount,700);assert.equal(balance('alice'),1600)});
await test('HTTP auth, own read state, and forged amounts',async()=>{assert.equal((await handleGifts(env,new Request('https://local/api/gifts'),'/gifts')).status,401);await handleGifts(env,req({id:'gift-all'},true),'/gifts/read');assert(db.prepare("SELECT read_at FROM gift_deliveries WHERE user_id='alice' AND gift_id='gift-all'").get().read_at);assert.equal(db.prepare("SELECT read_at FROM gift_deliveries WHERE user_id='bob' AND gift_id='gift-all'").get().read_at,null);assert.equal((await handleGifts(env,req({id:{},amount:9999999},true),'/gifts/claim')).status,400);const r=await(await handleGifts(env,req({id:'gift-one',amount:9999999},true),'/gifts/claim')).json();assert.equal(r.amount,0);assert.equal(balance('alice'),1600)});
await test('malformed distribution rejected',async()=>{for(const extra of [{amount:-1},{amount:1.5},{amount:100001},{expiresAt:0},{title:''},{userId:'missing'},{all:true,userId:'alice'}])assert((await issueGift(env,req(msg('bad',extra)),'operator')).status>=400)});
await test('gifts survive reload and deletion cascades only their own deliveries',async()=>{assert.equal((await giftInbox(env,'alice',now+2000)).pendingCount,0);db.prepare("DELETE FROM users WHERE id='bob'").run();assert.equal(db.prepare("SELECT COUNT(*) AS n FROM gift_deliveries WHERE user_id='bob'").get().n,0);assert.equal(db.prepare("SELECT COUNT(*) AS n FROM gift_deliveries WHERE user_id='alice'").get().n,4)});
await test('unread count excludes read, claimed and expired gifts and spans the 300-row page',async()=>{
 const insert=db.prepare('INSERT INTO gift_messages(id,title,body,amount,created_at,expires_at,created_by,audience) VALUES(?,?,?,?,?,?,?,?)');
 const deliver=db.prepare('INSERT INTO gift_deliveries(gift_id,user_id) VALUES(?,?)');
 for(let i=0;i<305;i++){const id='unread-'+i;insert.run(id,'Test','Body',1,now,now+86400000,'operator','alice');deliver.run(id,'alice');}
 let inbox=await giftInbox(env,'alice',now+2000);assert.equal(inbox.items.length,300);assert.equal(inbox.unreadCount,305);
 await handleGifts(env,req({id:'unread-0'},true),'/gifts/read');
 inbox=await giftInbox(env,'alice',now+2000);assert.equal(inbox.unreadCount,304);assert.equal(inbox.pendingCount,305);
 await claimGifts(env,'alice','unread-1',now+2000);assert.equal((await giftInbox(env,'alice',now+2000)).unreadCount,303);
});
console.log(`${count} gift inbox scenario groups passed`);
}finally{db.close();await fs.rm(tmp,{recursive:true,force:true})}
