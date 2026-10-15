import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
const dir=await fs.mkdtemp('/tmp/lore-starter-test-');
try{
 await build({stdin:{contents:`export {default as worker} from './server/src/index';export * from './client/src/shared/collection';export {deckStoreForUser} from './client/src/shared/cards';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/module.mjs'});
 const {worker,starterCollection,COLLECTIBLE_STARTERS,deckStoreForUser,PLANNED_GACHA_RATES,DUPLICATE_REFUNDS}=await import(dir+'/module.mjs');
 const db=new DatabaseSync(':memory:');db.exec(await fs.readFile('server/schema.sql','utf8'));
 for(const id of ['a','b']){db.prepare('INSERT INTO users(id,email,password,display,created_at,credits) VALUES(?,?,?,?,?,?)').run(id,id+'@test.invalid','fixture',id,Date.now(),10000);db.prepare('INSERT INTO sessions(token,user_id,created_at,expires_at) VALUES(?,?,?,?)').run(id,id,Date.now(),Date.now()+600000);}
 let failLedger=false,queued;
 const exec=(sql,args)=>{if(failLedger&&sql.startsWith('INSERT INTO collection_transactions'))throw Error('injected failure');const q=db.prepare(sql);if(/^\s*SELECT/i.test(sql))return {results:q.all(...args)};return {meta:{changes:Number(q.run(...args).changes)}};};
 const env={APP_ORIGIN:'*',DB:{prepare(sql){let args=[];return {bind(...a){args=a;return this;},first:async()=>exec(sql,args).results?.[0]??null,all:async()=>exec(sql,args),run:async()=>exec(sql,args),execute:()=>exec(sql,args)};},async batch(stmts){db.exec('BEGIN');try{const res=stmts.map(s=>s.execute());db.exec('COMMIT');return res;}catch(e){db.exec('ROLLBACK');throw e;}}},MATCHMAKER:{idFromName:x=>x,get:()=>({fetch:req=>{queued=new URL(req.url);return new Response('queued');}})}};
 const call=(path,body,who='a')=>worker.fetch(new Request('https://test.yourlore.xyz/api'+path,{method:body?'POST':'GET',headers:{Cookie:`lore_session=${who}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env);
 const buy=(id,requestId=crypto.randomUUID(),who='a')=>call('/collection/buy',{id,requestId},who);
 const draw=(count=1,requestId=crypto.randomUUID())=>call('/collection/draw',{count,requestId});
 const state=async()=>await (await call('/collection')).json();
 const fresh=await state();assert.equal(fresh.starterCards.STARTER_TRASH,8);assert.equal(fresh.starterCards.STARTER_MANA,1);assert.equal(fresh.starterCards.STARTER_CHEST,2);assert.equal(Object.values(fresh.starterCards).reduce((a,b)=>a+b,0),11);
 assert(!COLLECTIBLE_STARTERS.includes('STARTER_TRASH'));assert(!COLLECTIBLE_STARTERS.includes('STARTER_MANA'));assert(COLLECTIBLE_STARTERS.includes('STARTER_CHEST'));
 assert.equal(Object.values(PLANNED_GACHA_RATES).reduce((a,b)=>a+b,0),100);assert.deepEqual(DUPLICATE_REFUNDS,{starter:50,cosmetic:100,effect:500});
 const first=COLLECTIBLE_STARTERS.find(x=>x!=='STARTER_CHEST'),key=crypto.randomUUID();
 const responses=await Promise.all([buy(first,key),buy(first,key),buy(first,key)]);assert(responses.every(r=>r.status===200));assert.equal((await state()).credits,9800);assert.equal((await state()).starterCards[first],1);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM collection_transactions').get().n,1);
 const replay=await (await buy(first,key)).json();assert.equal(replay.receipt.requestId,key);assert.equal(replay.credits,9800);assert.equal((await draw(1,key)).status,409);
 for(const id of ['STARTER_TRASH','STARTER_MANA','M1','__proto__'])assert.equal((await buy(id)).status,400);
 const before=await state();failLedger=true;await assert.rejects(buy(first),/injected/);failLedger=false;assert.deepEqual(await state(),before);
 await Promise.all(Array.from({length:6},()=>buy(first)));assert.equal((await state()).starterCards[first],7);
 const last=await Promise.all([buy(first),buy(first)]);assert.deepEqual(last.map(r=>r.status).sort(),[200,400]);assert.equal((await state()).starterCards[first],8);
 assert.equal((await buy(first)).status,400);
 const all=starterCollection(Object.fromEntries(COLLECTIBLE_STARTERS.map(id=>[id,8])));db.prepare('UPDATE users SET starter_cards=?,credits=2000 WHERE id=?').run(JSON.stringify(all),'a');
 const ten=await (await draw(10)).json();assert.equal(ten.receipt.rewards.length,10);assert.equal(ten.receipt.cost,1000);assert.equal(ten.receipt.refund,500);assert.equal(ten.credits,1500);assert(ten.receipt.rewards.every(r=>r.refund===50&&r.owned===8));
 // Force all ten hits onto a card with 7 copies: the first grants #8; nine refund.
 all[first]=7;db.prepare('UPDATE users SET starter_cards=?,credits=2000 WHERE id=?').run(JSON.stringify(all),'a');
 const original=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{a[0]=COLLECTIBLE_STARTERS.indexOf(first);return a;};
 let cap;try{cap=await (await draw(10)).json();}finally{crypto.getRandomValues=original;}
 assert.equal(cap.receipt.refund,450);assert.equal(cap.receipt.rewards[0].refund,0);assert.equal(cap.starterCards[first],8);assert.equal(cap.credits,1450);
 db.prepare("UPDATE users SET credits=99 WHERE id='a'").run();const low=await state();assert.equal((await draw()).status,400);assert.deepEqual(await state(),low);
 for(const count of [0,2,11,-1,'10',1.5])assert.equal((await draw(count)).status,400);
 assert.equal((await call('/collection/buy',{id:first,requestId:'bad'})).status,400);
 assert.equal((await call('/collection',undefined,'none')).status,401);
 // Ownership blocks forged saves; old presets are clamped before queue entry.
 const store=deckStoreForUser();store.list[0].cards[0]=first;
 assert.equal((await call('/deck',{decks:store},'b')).status,400);
 db.prepare('UPDATE users SET decks=? WHERE id=?').run(JSON.stringify(store),'b');
 const user=(await (await call('/auth/me',undefined,'b')).json()).user;assert.equal(user.starterCards[first],0);assert(!user.deck.includes(first));
 await worker.fetch(new Request('https://test.yourlore.xyz/ws/queue?deck='+first,{headers:{Cookie:'lore_session=b'}}),env);assert(!queued.searchParams.get('deck').includes(first));
 await buy(first,crypto.randomUUID(),'b');assert.equal((await call('/deck',{decks:store},'b')).status,200);
 store.list[0].cards[1]=first;assert.equal((await call('/deck',{decks:store},'b')).status,400);
 const hist=await (await call('/collection/history')).json();assert(hist.receipts.some(r=>r.requestId===key));assert(hist.receipts.every(r=>r.rewards.length===1||r.rewards.length===10));
 db.close();console.log('PASS starter collection: defaults, full catalog, atomic purchase, rollback, concurrent/idempotent spend, caps, 10-draw refunds, insufficient funds, validation, ownership, queue, history');
}finally{await fs.rm(dir,{recursive:true,force:true});}
