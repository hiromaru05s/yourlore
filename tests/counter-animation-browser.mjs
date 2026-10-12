import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {tmpdir} from 'node:os';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5469',out=process.env.LORE_TEST_OUT||'/tmp/lore-counter-runtime';await fs.mkdir(out,{recursive:true});
const tmp=await fs.mkdtemp(tmpdir()+'/lore-counter-browser-');
await build({stdin:{contents:"export * from './client/src/shared/engine';export {DB} from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:tmp+'/engine.mjs'});
const {createGame,reduce,DB}=await import(tmp+'/engine.mjs');
function fixture(side=0,lethal=false){
 const g=createGame({mode:'online',seed:71,starting:side,p0:{id:'counter-self',name:'YOU'},p1:{id:'counter-opp',name:'OPPONENT'}}).state;g.cur=side;g.turn=3;g.phase='main';g.pending=null;
 const mon=(id,uid,props)=>({...DB[id],uid,exhausted:false,tempAtk:0,atkMod:0,defMod:0,dmg:0,guts:0,summonedTurn:0,...props});
 for(const [i,p] of g.players.entries())Object.assign(p,{hand:[],enchants:[],quests:[],traps:[],removed:[],discard:[],field:[],openingDrawReady:false,hp:60,maxHp:60,mana:12,maxMana:12});
 const attacker=mon('M4','counter-attacker',{atk:lethal?25:2,def:30}),defender=mon('INFKNIGHT','counter-defender',{atk:8,def:20,dmg:2,exhausted:true});
 g.players[side].field=[attacker];g.players[1-side].field=[defender];
 const a=reduce(g,{type:'attack',uid:attacker.uid}),res=reduce(a.state,{type:'chooseTarget',uid:defender.uid});assert.equal(res.events.filter(e=>e.type==='counter').length,1);
 return{prev:g,res,side,lethal};
}
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:out+'/video',size:{width:1280,height:900}}});
const page=await context.newPage();page.setDefaultTimeout(90000);const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error'&&e.text().includes('[playback]'))errors.push(e.text());});
try{
 await page.goto(origin+'/cosmetic-studio.html?board=1&runtime=1&set=default');await page.waitForFunction(()=>window.atelier&&document.querySelector('[data-scene-ready=true]'));
 await page.evaluate(()=>{window.watchCounter=async f=>{
  const c=atelier.controller;c.show(f.prev);await new Promise(r=>setTimeout(r,400));
  const old=document.querySelector('.zone-mon [data-uid="counter-defender"]');const before={hp:old.querySelector('.ad-def')?.textContent,atk:old.querySelector('.ad-atk')?.textContent};
  let running=true;const frames=[],started=performance.now();const sample=()=>{
   const rig=document.querySelector('.counter-rig');
   if(rig){const canvas=rig.querySelector('canvas'),source=document.querySelector('.zone-mon [data-uid="counter-defender"]');const pixel=canvas?.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;frames.push({at:performance.now()-started,ms:+rig.dataset.counterMs,variant:rig.dataset.counterVariant,pixels:!!pixel?.some((v,i)=>i%4===3&&v>0),sourceConnected:!!source,visibility:source?.style.visibility,matrix:rig.style.transform});}
   if(running)requestAnimationFrame(sample);
  };requestAnimationFrame(sample);c.applyResult(f.res);await c.queue;running=false;
  const card=document.querySelector('.zone-mon [data-uid="counter-defender"]'),attacker=document.querySelector('.zone-mon [data-uid="counter-attacker"]');
  return{before,frames,remaining:document.querySelectorAll('.counter-rig,.counter-impact,.counter-capture').length,sourceRemaining:!!card,visibility:card?.style.visibility,attackerHp:attacker?.querySelector('.ad-def')?.textContent,overflow:document.documentElement.scrollWidth>innerWidth};
 };});
 for(const [width,side,lethal] of [[1280,0,false],[1280,1,false],[1280,0,true],[390,1,true]]){
  await page.setViewportSize({width,height:width===390?844:900});const f=fixture(side,lethal);console.log('START',width,side,lethal);
  await page.evaluate(f=>{window.playing=watchCounter(f)},f);
  await page.waitForFunction(()=>+document.querySelector('.counter-rig')?.dataset.counterMs>=250);await page.screenshot({path:`${out}/counter-${width}-${side}-${lethal}.png`});
  const r=await page.evaluate(()=>playing);assert(r.frames.length>0);assert(r.frames.every(x=>x.variant==='02'&&x.pixels&&x.sourceConnected&&x.visibility==='hidden'));assert(r.frames.some(x=>x.ms<700));assert(r.frames.some(x=>x.ms>=860));assert.equal(r.remaining,0);assert.equal(r.sourceRemaining,!lethal);if(!lethal)assert.equal(r.visibility,'');assert.equal(r.overflow,false);assert(r.attackerHp.includes('26'));checks.push({width,side,lethal,...r});console.log('PASS',width,side,lethal,r.frames.length);
 }
 console.log('START reduced');await page.setViewportSize({width:1280,height:900});await page.emulateMedia({reducedMotion:'reduce'});const reduced=await page.evaluate(f=>watchCounter(f),fixture(1));assert(reduced.frames.length>0);assert(reduced.frames.at(-1).ms<=320);assert.equal(new Set(reduced.frames.map(f=>f.matrix)).size,1);assert.equal(reduced.remaining,0);checks.push({mode:'reduced',frames:reduced.frames.length});await page.emulateMedia({reducedMotion:'no-preference'});
 for(const mode of ['skip','resize','remove','destroy']){
  console.log('START',mode);
  await page.evaluate(f=>{window.playing=watchCounter(f)},fixture());await page.waitForSelector('.counter-rig',{state:'attached'});
  if(mode==='resize')await page.setViewportSize({width:1100,height:900});
  else await page.evaluate(mode=>{if(mode==='skip')atelier.controller.fastForward();if(mode==='remove')document.querySelector('.zone-mon [data-uid="counter-defender"]').remove();if(mode==='destroy')atelier.controller.destroy();},mode);
  const r=await page.evaluate(()=>playing);assert.equal(r.remaining,0);if(mode!=='destroy')assert.equal(r.visibility,'');checks.push({mode,remaining:r.remaining});console.log('PASS',mode);
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({origin,at:new Date().toISOString(),checks,errors,boundary:'Actual BaseController and production counter renderer on the real GameView board, driven by reducer fixtures. Not an authenticated online match.'},null,2));console.log('PASS counter runtime browser',checks.length,out);
}finally{await context.close();await page.video().saveAs(out+'/playback.webm');await browser.close();await fs.rm(tmp,{recursive:true,force:true});}
