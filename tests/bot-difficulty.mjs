import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-difficulty-');
try {
 await build({stdin:{contents:`export * from './client/src/shared/engine';export * from './client/src/shared/cards';export * from './client/src/shared/bot';export * from './client/src/shared/botNpcs';export * from './client/src/shared/botRotation';export * from './client/src/shared/botMarket';export * from './client/src/shared/botEconomy';export * from './server/src/botRotation';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/core.mjs'});
 const C=await import(dir+'/core.mjs');
 const rng=seed=>()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
 const opts={mode:'bot',seed:991,p0:{id:'a',name:'a'},p1:{id:'b',name:'b',isBot:true,deck:C.BOT_HELL_DECKS[0].cards}};
 for(const tier of ['easy','normal']){const plain=C.createGame(opts).state,challenge=C.createGame({...opts,challenge:{difficulty:tier,side:1}}).state;delete challenge.botDifficulty;assert.deepEqual(challenge,plain,'unbiased tiers preserve every random result');}
 for(const npc of C.BOT_NPCS){let rotation,previous;const random=rng(81);for(let cycle=0;cycle<4;cycle++){const indices=[];for(let i=0;i<npc.decks.length;i++){const next=C.nextNpcDeck(npc,rotation,random);if(npc.decks.length>1)assert.notEqual(next.index,previous);rotation=JSON.parse(JSON.stringify(next.rotation));previous=next.index;indices.push(next.index);}assert.equal(new Set(indices).size,npc.decks.length);}}
 for(const tier of ['hard','hell']){
  const rows=new Set(),cards=new Set();
  for(let seed=0;seed<180;seed++){
   let g=C.createGame({...opts,seed,challenge:{difficulty:tier,side:1}}).state;
   assert.deepEqual(g,C.createGame({...opts,seed,challenge:{difficulty:tier,side:1}}).state,'seed reproducibility');
   assert.equal(new Set(g.market.map(c=>c.id)).size,7);assert(g.market.every(c=>c.cost>=1&&c.cost<=6&&C.BUYABLE_POOL.includes(c.id)));
   assert.deepEqual(g.players[0].supply,g.players[1].supply);assert(g.players[0].supply.filter(Boolean).every(c=>!g.market.some(m=>m.id===c.id)));
   rows.add(g.market.map(c=>c.id).sort().join(','));g.market.forEach(c=>cards.add(c.id));
   const before=JSON.stringify(g);const next=C.reduce(g,{type:'endTurn'}).state;assert.equal(JSON.stringify(g),before,'market history cannot mutate reducer input');assert(next.botMarket.recent.length<=36);
  }
  assert(rows.size>170);assert(cards.size>80,'wide card diversity');
  console.log(tier,'distinct rows',rows.size,'cards',cards.size);
 }
 const base=C.createGame({...opts,challenge:{difficulty:'hell',side:1}}).state;
 const ids=C.BUYABLE_POOL.filter(id=>C.DB[id].cost<=6);
 // Stratified draws measure the configured bias branch itself, independently
 // of whether a random branch happens to choose a strong card too.
 for(const [tier,expected] of [['hard',50],['hell',90]]){
  let biased=0;
  for(let i=0;i<100;i++){
   const g=structuredClone(base);g.botDifficulty=tier;let calls=0;
   C.botMarketIndex(g,ids,()=>++calls===1?(i+.5)/100:.375);
   if(calls>2)biased++;
  }
  assert.equal(biased,expected);
 }
 let favored=0,uniform=0;
 for(let seed=1;seed<=300;seed++){
  const g=structuredClone(base),twin=structuredClone(base);
  twin.players[0].hand=[{...C.DB.PRIEST,uid:'secret'}];twin.players[0].deck=[{...C.DB.WORLD_TREE,uid:'secret-deck'}];twin.rng=987;
  const i=C.botMarketIndex(g,ids,rng(seed));assert.equal(i,C.botMarketIndex(twin,ids,rng(seed)),'private enemy cards and live RNG do not affect market scores');
  const evaluate=C.purchaseEvaluator(base,base.players[1]);favored+=evaluate({...C.DB[ids[i]],uid:'sample'}).value;
  uniform+=evaluate({...C.DB[ids[Math.floor(rng(seed+90000)()*ids.length)]],uid:'sample'}).value;
 }
 assert(favored>uniform+300,'biased sampler improves NPC-specific offer quality');
 console.log('mean market value',{favored:favored/300,uniform:uniform/300});
 // The real reservation handler: persistence, idempotence, separate roster size.
 let data;const storage={transaction:async fn=>fn({get:async()=>structuredClone(data),put:async(_,v)=>{data=structuredClone(v);}})};
 for(let cycle=0;cycle<2;cycle++){const seen=new Set();for(let i=0;i<7;i++){const req=()=>new Request('https://internal/npc-deck',{method:'POST',body:JSON.stringify({difficulty:'hell',requestId:`test-${cycle}-${i}`})});const first=await (await C.reserveNpcDeck(storage,req())).json();const repeat=await (await C.reserveNpcDeck(storage,req())).json();assert.deepEqual(first,repeat);seen.add(first.index);}assert.equal(seen.size,7);}
 assert.equal((await C.reserveNpcDeck(storage,new Request('https://internal/npc-deck',{method:'POST',body:'{"difficulty":"bad","requestId":"x"}'}))).status,400);
 console.log('PASS difficulty market scope, deterministic RNG, broad diversity, hidden information, immutable transitions, shuffled rotation, idempotent persisted reservation');
}finally{await rm(dir,{recursive:true,force:true});}
