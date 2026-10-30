import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {onboardingFixture} from './fixtures/onboardingEnv.mjs';
const dir=await fs.mkdtemp('/tmp/lore-daily-login-');
await build({stdin:{resolveDir:process.cwd(),contents:`export * from './client/src/shared/dailyLoginGift';export {rewardDay} from './client/src/shared/progression';export {ensureDailyLoginGift} from './server/src/dailyLoginGift';export {claimGifts,giftInbox,issueGift} from './server/src/gifts';export {createSession} from './server/src/auth';`},bundle:true,format:'esm',platform:'node',outfile:dir+'/daily.mjs',logLevel:'silent'});
const E=await import(dir+'/daily.mjs'),f=await onboardingFixture(),originalNow=Date.now;
let now=Date.parse('2026-10-30T14:59:59.999Z');Date.now=()=>now;
const balance=id=>f.db.prepare('SELECT credits FROM users WHERE id=?').get(id).credits;
const deliveryCount=id=>f.db.prepare('SELECT COUNT(*) n FROM gift_deliveries WHERE user_id=?').get(id).n;
const call=(p,b,id='alice')=>f.call(p,b,id);const body=async r=>{assert.equal(r.status,200);return r.json();};
let checks=0;async function test(name,fn){await fn();console.log('PASS',name);checks++;}
try {
 f.addUser('alice',50);f.addUser('bob',25);f.addUser('offline',0);
 await test('JST and KST share midnight, independent of the client timezone',async()=>{
  for(const [instant,day]of [['2026-10-30T14:59:59.999Z','2026-10-30'],['2026-10-30T15:00:00.000Z','2026-10-31'],['2026-12-31T15:00:00.000Z','2027-01-01'],['2028-02-28T15:00:00.000Z','2028-02-29']]){const p=E.dailyLoginPeriod(Date.parse(instant));assert.equal(p.day,day);assert.equal(p.day,E.rewardDay(Date.parse(instant)));assert.equal(p.resetsAt-p.startsAt,86400000);}
 });
 await test('authenticated login delivers 10000 to the BOX without immediately crediting it',async()=>{
  const me=await body(await call('/auth/me'));assert.equal(me.user.credits,50);assert.equal(balance('alice'),50);assert.equal(deliveryCount('alice'),1);assert.equal(deliveryCount('offline'),0);
  const inbox=await body(await call('/gifts'));assert.equal(inbox.pendingAmount,10000);assert.equal(inbox.pendingCount,1);assert.equal(inbox.unreadCount,1);assert.equal(inbox.items[0].kind,'daily-login');assert.equal(inbox.items[0].day,'2026-10-30');assert.equal(inbox.resetsAt,Date.parse('2026-10-30T15:00:00Z'));assert.equal(inbox.items[0].expiresAt,E.LOGIN_GIFT_NO_EXPIRY);
 });
 await test('reload, inbox polling, parallel tabs and another session never redeliver',async()=>{
  const session=await E.createSession(f.env,'alice');assert(session);
  await Promise.all(Array.from({length:8},()=>call('/auth/me')));await Promise.all(Array.from({length:8},()=>call('/gifts')));assert.equal(deliveryCount('alice'),1);assert.equal(balance('alice'),50);
 });
 await test('single and bulk claims racing pay once and never another account',async()=>{
  await body(await call('/gifts',undefined,'bob'));assert.equal((await E.claimGifts(f.env,'offline','daily-login-2026-10-30',now)).amount,0);
  const results=await Promise.all([call('/gifts/claim',{id:'daily-login-2026-10-30',amount:999999}),call('/gifts/claim',{all:true})]);const receipts=await Promise.all(results.map(body));assert.equal(receipts.reduce((n,r)=>n+r.amount,0),10000);assert.equal(balance('alice'),10050);assert.equal(balance('bob'),25);
  await body(await call('/auth/me'));assert.equal((await body(await call('/gifts'))).pendingCount,0);assert.equal(deliveryCount('alice'),1);
 });
 await test('exact midnight permits one new gift while previously delivered gifts remain',async()=>{
  now=Date.parse('2026-10-30T15:00:00Z');const inbox=await body(await call('/gifts'));assert.equal(inbox.items.length,2);assert.equal(inbox.pendingAmount,10000);assert.equal(inbox.items[0].day,'2026-10-31');assert.equal(balance('alice'),10050);
  const bob=await body(await call('/gifts',undefined,'bob'));assert.equal(bob.pendingAmount,20000);assert.equal(bob.pendingCount,2);assert.equal((await body(await call('/gifts/claim',{all:true},'bob'))).amount,20000);assert.equal(balance('bob'),20025);
 });
 await test('new accounts get only their login day; missing days never backfill',async()=>{
  f.addUser('newbie',0);assert.equal((await body(await call('/gifts',undefined,'newbie'))).pendingAmount,10000);assert.equal(deliveryCount('newbie'),1);assert.equal(deliveryCount('offline'),0);
  now=Date.parse('2026-11-01T15:00:00Z');f.db.prepare('UPDATE sessions SET expires_at=?').run(now+86400000);await body(await call('/auth/me'));assert.equal(deliveryCount('alice'),3);assert.equal(f.db.prepare("SELECT COUNT(*) n FROM gift_deliveries WHERE user_id='alice' AND gift_id='daily-login-2026-11-01'").get().n,0);
 });
 await test('delivery failure rolls back and a retry recovers without duplicates',async()=>{
  f.fail(sql=>sql.startsWith('INSERT OR IGNORE INTO gift_deliveries'));await assert.rejects(E.ensureDailyLoginGift(f.env,'offline',now+86400000));f.fail();assert.equal(deliveryCount('offline'),0);assert.equal(f.db.prepare("SELECT COUNT(*) n FROM gift_messages WHERE id='daily-login-2026-11-03'").get().n,0);
  await E.ensureDailyLoginGift(f.env,'offline',now+86400000);assert.equal(deliveryCount('offline'),1);assert.equal(balance('offline'),0);
 });
 await test('claim failure rolls back both receipt and credits; retry pays the full amount once',async()=>{
  f.fail(sql=>sql.startsWith('UPDATE users SET credits'));await assert.rejects(E.claimGifts(f.env,'newbie',null,now));f.fail();assert.equal(balance('newbie'),0);assert.equal((await E.giftInbox(f.env,'newbie',now)).pendingAmount,10000);assert.equal((await E.claimGifts(f.env,'newbie',null,now)).amount,10000);assert.equal((await E.claimGifts(f.env,'newbie',null,now)).amount,0);
 });
 await test('guests and forged date/amount inputs cannot issue arbitrary gifts',async()=>{
  assert.equal((await call('/gifts',undefined,'not-a-session')).status,401);const before=deliveryCount('alice');await body(await call('/gifts?day=2040-01-01&amount=999999'));assert.equal(deliveryCount('alice'),before);
  await E.ensureDailyLoginGift(f.env,'missing',now+2*86400000);assert.equal(f.db.prepare("SELECT COUNT(*) n FROM gift_messages WHERE id='daily-login-2026-11-04'").get().n,0);
  const request=new Request('https://local',{method:'POST',body:JSON.stringify({id:'daily-login-2040-01-01',title:'forged',body:'bad',amount:1,expiresAt:now+86400000,userId:'alice'})});assert.equal((await E.issueGift(f.env,request,'admin')).status,400);
 });
 await test('the coupon retirement expires ALL definitions and preserves balances and claim history',async()=>{
  f.db.exec("INSERT INTO coupons(code,amount,repeatable) VALUES('LORE30000',30000,1),('LORE10',10,0),('WELCOME100',100,0),('UNLISTED_CODE',250,1),('ALREADY_EXPIRED',1,0)");f.db.exec("UPDATE coupons SET expires_at=0 WHERE code='ALREADY_EXPIRED'");
  await body(await call('/rewards/coupon',{code:'LORE30000'}));const before=balance('alice'),claims=f.db.prepare('SELECT * FROM coupon_claims').all(),uses=f.db.prepare('SELECT code,amount,uses FROM coupons ORDER BY code').all();
  const sql=await fs.readFile('server/migrations/0030_retire_existing_coupons.sql','utf8');f.db.exec(sql);f.db.exec(sql);
  for(const code of ['LORE30000',' lore30000 ','LORE10','WELCOME100','UNLISTED_CODE','ALREADY_EXPIRED'])assert.equal((await call('/rewards/coupon',{code})).status,410);
  assert.equal(balance('alice'),before);assert.deepEqual(f.db.prepare('SELECT * FROM coupon_claims').all(),claims);assert.deepEqual(f.db.prepare('SELECT code,amount,uses FROM coupons ORDER BY code').all(),uses);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM coupons WHERE expires_at IS NULL OR expires_at>=?').get(now).n,0);
 });
 await test('daily gift title, amount and reset time are complete in all three languages',async()=>{
  for(const lang of ['ja','ko','en']){const c=E.dailyLoginGiftCopy('2026-10-31',10000,lang);assert(c.title.includes('2026-10-31'));assert(c.body.includes('10,000'));assert(c.body.includes('0:00'));assert(c.body.includes('JST'));assert(c.body.includes('KST'));}
 });
 console.log(`PASS ${checks} daily-login gift and coupon retirement scenario groups`);
} finally {Date.now=originalNow;await f.close();await fs.rm(dir,{recursive:true,force:true});}
