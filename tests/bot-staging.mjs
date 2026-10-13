/** Public staging worker execution, not authenticated menu/match QA. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const {chromium}=await import(process.env.LORE_PLAYWRIGHT_MODULE||'playwright');
const origin='https://test.yourlore.xyz',out=process.env.BOT_QA_OUT,dist=process.env.BOT_DIST||'client/dist';
assert(out,'Set BOT_QA_OUT');await fs.mkdir(out,{recursive:true});
const dir=await fs.mkdtemp('/tmp/lore-bot-staging-');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-quic','--disable-http2']});
try{
 await build({stdin:{contents:`export * from './client/src/shared/engine';export * from './client/src/shared/cards';export * from './client/src/shared/bot';export * from './client/src/shared/botNpcs';export * from './client/src/shared/botActions';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/core.mjs'});
 const C=await import(dir+'/core.mjs');
 const assets=(await fs.readdir(path.join(dist,'assets'))).filter(n=>/\.(js|css)$/.test(n));
 const digest=b=>createHash('sha256').update(b).digest('hex'),parity=[];
 for(const file of assets){const response=await fetch(origin+'/assets/'+file);assert(response.ok,file+' '+response.status);const remote=Buffer.from(await response.arrayBuffer()),local=await fs.readFile(path.join(dist,'assets',file));assert.equal(digest(remote),digest(local),file);parity.push({file,sha256:digest(remote)});}
 const worker=assets.find(n=>/^bot\.worker-.*\.js$/.test(n));assert(worker,'Deployed dedicated thinker worker');
 const cases=[];
 for(const tier of ['hard','hell'])for(const [index,deck] of C.botNpc(tier).decks.entries()){
  let g=C.createGame({mode:'bot',seed:131000+index,starting:1,p0:{id:'qa-human',name:'QA'},p1:{id:'qa-bot',name:'QA BOT',isBot:true,deck:deck.cards}}).state;g.players[1].botTune=deck.tune;
  for(let step=0;step<2;step++){const action=C.botDecide(g,tier);cases.push({tier,deck:deck.name,state:g,expected:action});g=C.reduce(g,action).state;}
 }
 let serial=0;const card=id=>({...C.DB[id],uid:'staging-market-'+serial++});
 for(const tier of ['hard','hell'])for(const scenario of ['recovery-market','remove-dew']){
  const g=C.createGame({mode:'bot',seed:97,starting:0,p0:{id:'qa-bot',name:'QA BOT'},p1:{id:'qa-human',name:'QA'}}).state;
  g.turn=7;g.pending=null;g.market=['PRIEST','S15'].map(card);g.marketStock=[3,3];
  for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],field:[],traps:[],enchants:[],quests:[],supply:[],hp:40,mana:4,maxMana:6});
  g.players[0].deck=C.BOT_HELL_DECKS[0].cards.map(card);
  if(scenario==='remove-dew'){g.market=[];g.players[1].dew=8;g.players[0].hand=[card('FLAME'),card('DESERTIFICATION')];}
  const action=C.botDecide(g,tier);
  if(scenario==='remove-dew'){assert.equal(action.type,'play');assert.equal(g.players[0].hand[action.idx].id,'DESERTIFICATION');}
  else assert.equal(action.type,'buyMarket');
  cases.push({tier,deck:scenario,state:g,expected:action});
 }
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin,{waitUntil:'domcontentloaded'});
 const results=await page.evaluate(async({cases,worker})=>{
  const w=new Worker('/assets/'+worker,{type:'module'}),rows=[];let ticks=0;const timer=setInterval(()=>ticks++,10);
  try{for(let id=0;id<cases.length;id++){const t=performance.now();const reply=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('worker timeout')),15000);w.onmessage=({data})=>{if(data.id===id&&!data.progress){clearTimeout(timeout);resolve(data);}};w.onerror=e=>{clearTimeout(timeout);reject(Error(e.message));};w.postMessage({id,state:cases[id].state,difficulty:cases[id].tier});});rows.push({tier:cases[id].tier,deck:cases[id].deck,ms:performance.now()-t,reply});}return {rows,ticks};}finally{clearInterval(timer);w.terminate();}
 },{cases,worker});
 for(let i=0;i<cases.length;i++){const r=results.rows[i];assert(!r.reply.error);assert.deepEqual(r.reply.action,cases[i].expected);assert(C.actionChangesState(cases[i].state,C.reduce(cases[i].state,r.reply.action).state));}
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'staging-worker.json'),JSON.stringify({origin,scope:'public deployed worker; no authenticated match',worker,parity,...results,errors},null,2));console.log(JSON.stringify({assets:parity.length,cases:cases.length,ticks:results.ticks,errors}));
}finally{await browser.close();await fs.rm(dir,{recursive:true,force:true});}
