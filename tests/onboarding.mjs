import assert from 'node:assert/strict';
import {onboardingFixture} from './fixtures/onboardingEnv.mjs';
const f=await onboardingFixture(),{lib,db,call,actions}=f;
try{
 f.addUser('onboarding');f.addUser('other');
 const read=async(path='/onboarding',who)=>{const r=await call(path,undefined,who);assert.equal(r.status,200);return r.json();};
 const draw=(overrides={},who)=>call('/collection/draw',{requestId:lib.ONBOARDING_DRAW,count:10,tutorial:true,...overrides},who);
 const daily=lib.dailyStarterShop(Date.now());
 const buy=(overrides={},who)=>call('/collection/buy',{requestId:lib.ONBOARDING_BUY,count:1,tutorial:true,id:daily.cards[0],shopDay:daily.day,...overrides},who);
 assert.equal((await call('/onboarding',undefined,'unauthenticated')).status,401);
 assert.equal((await read()).stage,'basics');assert.equal((await draw()).status,409);assert.equal((await buy()).status,409);
 for(const bad of [[],actions.slice(0,-1),[{type:'surrender'}],[{type:'continueLesson'}],null])assert.equal((await call('/onboarding/basics',{actions:bad})).status,400);
 f.fail(sql=>sql.startsWith('UPDATE users SET credits=credits+'));await assert.rejects(call('/onboarding/basics',{actions}),/injected/);f.fail();assert.equal((await read()).stage,'basics');assert.equal((await read()).credits,0);
 const grants=await Promise.all(Array.from({length:4},()=>call('/onboarding/basics',{actions}).then(r=>r.json())));
 assert.equal(grants.filter(r=>r.granted).length,1);assert.equal((await read()).credits,3000);assert.equal((await read()).stage,'gacha');
 assert.equal((await buy()).status,409);assert.equal((await draw({count:1})).status,400);assert.equal((await draw({requestId:crypto.randomUUID()})).status,400);assert.equal((await draw({tutorial:false})).status,400);
 f.fail(sql=>sql.startsWith('INSERT INTO collection_transactions'));await assert.rejects(draw(),/injected/);f.fail();assert.equal((await read()).credits,3000);
 const draws=await Promise.all(Array.from({length:4},()=>draw().then(r=>r.json())));
 assert(draws.every(r=>r.receipt.cost===1000&&r.receipt.rewards.length===10));assert.deepEqual(draws[0].receipt,draws[1].receipt);assert.equal((await read()).credits,2000+draws[0].receipt.refund);assert.equal((await read()).stage,'starter');
 assert.equal((await buy({id:daily.cards[1]})).status,400);assert.equal((await buy({count:2})).status,400);assert.equal((await buy({shopDay:'1999-01-01'})).status,400);
 const before=await read('/collection');const buys=await Promise.all(Array.from({length:4},()=>buy().then(r=>r.json())));
 assert(buys.every(r=>r.receipt.cost===0));assert.equal((await read()).credits,before.credits);assert.equal(buys[0].starterCards[daily.cards[0]],Math.min(8,before.starterCards[daily.cards[0]]+1));assert.equal((await read()).stage,'deck');
 assert.equal((await call('/onboarding/finish',{})).status,409);
 const realNow=Date.now;Date.now=()=>daily.resetsAt+1;
 try{const next=lib.dailyStarterShop(Date.now());const retry=await buy({id:next.cards[0],shopDay:next.day}).then(r=>r.json());assert.deepEqual(retry.receipt,buys[0].receipt);}finally{Date.now=realNow;}
 const store=lib.deckStoreForUser(null),cards=[...lib.onboardingDeck()];cards.splice(cards.indexOf('STARTER_TRASH'),1);cards.push(daily.cards[0]);store.list[0].cards=cards;
 assert.equal((await call('/deck',{decks:store,tutorial:true},'other')).status,400);
 const bad=structuredClone(store);bad.list[0].cards=lib.onboardingDeck();assert.equal((await call('/deck',{decks:bad,tutorial:true})).status,400);
 assert.equal((await call('/deck',{decks:store,tutorial:true})).status,200);assert.equal((await read()).stage,'book');
 assert.deepEqual(db.prepare('SELECT deck FROM users WHERE id=?').get('onboarding').deck.split(','),cards);
 assert.equal((await call('/onboarding/finish',{})).status,200);assert.equal((await read()).stage,'complete');
 const finalBalance=(await read()).credits;await call('/onboarding/basics',{actions});await draw();await buy();assert.equal((await read()).credits,finalBalance);assert.equal((await read()).stage,'complete');
 // The free lesson remains operable with 8 copies and no Shards, without exceeding the cap.
 await call('/onboarding/basics',{actions},'other');await draw({},'other');db.prepare('UPDATE users SET credits=0,starter_cards=? WHERE id=?').run(JSON.stringify({...lib.starterCollection(),[daily.cards[0]]:8}),'other');
 const capped=await buy({},'other').then(r=>r.json());assert.equal(capped.credits,0);assert.equal(capped.starterCards[daily.cards[0]],8);assert.equal(capped.receipt.refund,0);
 // Normal purchases are still paid and are not converted into tutorial transactions.
 const paid=await call('/collection/buy',{id:daily.cards[1],count:1,requestId:crypto.randomUUID(),shopDay:daily.day}).then(r=>r.json());assert.equal(paid.receipt.cost,100);
 console.log('PASS onboarding: real replay, one-shot 3000 reward, atomic rollback/concurrency, paid ten draws, one free leftmost starter, midnight retries, caps, deck ownership/save, account isolation and completion');
}finally{await f.close();}
