import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5488';
const out=process.env.LORE_TEST_OUT||'/tmp/lore-combat-tempo';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900},...(process.env.LORE_RECORD?{recordVideo:{dir:out+'/video',size:{width:1280,height:900}}}:{})});
const page=await context.newPage();page.setDefaultTimeout(60000);const errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error'&&e.text().includes('[playback]'))errors.push(e.text());});
try{
 await page.goto(origin+'/cosmetic-studio.html?board=1&runtime=1&set=default&tempo=1');
 await page.waitForFunction(()=>window.combatTempo&&document.querySelector('[data-scene-ready=true]'));
 await page.evaluate(()=>{window.observeTempo=async(kind,side=0)=>{
  const c=combatTempo.controller;await c.queue;await new Promise(r=>setTimeout(r,1700));
  const f=combatTempo.fixture(kind,side);c.show(f.prev);await new Promise(r=>setTimeout(r,300));
  const start=performance.now(),frames=[];let sampling=true;const tick=()=>{
   const numbers=[...document.querySelectorAll('.combat-damage.in')].filter(n=>Number(getComputedStyle(n).opacity)>0).map(n=>({value:n.textContent,uid:n.dataset.damageUid,width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height,font:parseFloat(getComputedStyle(n).fontSize)}));
   const counter=document.querySelector('.counter-rig'),exit=document.querySelector('.mana-destruction');
   frames.push({t:Math.round(performance.now()-start),numbers,counter:counter?Number(counter.dataset.counterMs):null,exit:exit?.dataset.phase??null,exits:document.querySelectorAll('[data-combat-exit=true]').length,recoil:document.querySelectorAll('[data-hit-reaction=true]').length+[...document.querySelectorAll('.zone-mon .card')].filter(n=>n.getAnimations().some(a=>a.id==='monster-hit')).length,botShake:document.querySelector('#portraitOpp .pt-ring')?.getAnimations().some(a=>a.id==='portrait-impact'),playerShake:document.querySelector('#portraitMe .pt-ring')?.getAnimations().some(a=>a.id==='seeker-impact'),blocked:!!document.querySelector('.zone-mon [data-uid=tempo-attacker][data-monster-blocked]'),hp:document.querySelector('.zone-mon [data-uid=tempo-defender] .ad-def .seal-value')?.textContent,dew:!!document.querySelector('.dew-grant'),shield:!!document.querySelector('.status-grant'),summon:!!document.querySelector('.cast-reveal,.fx-card-flight,.fx-field-ghost'),playing:!!document.querySelector('.fx-playing')});
   if(sampling)requestAnimationFrame(tick);
  };requestAnimationFrame(tick);c.applyResult(f.res);await c.queue;const ready=performance.now()-start;
  const interactive={tail:!!document.querySelector('.mana-destruction,[data-combat-exit=true]'),next:document.querySelector('.zone-mon [data-uid=tempo-next]')?.classList.contains('is-attacker')};
  let followup;
  if(kind==='lethal'&&side===0){c.onAttack('tempo-next');const logical=c.state.players[0].field.find(m=>m.uid==='tempo-next');followup={used:logical.exhausted,tail:!!document.querySelector('.mana-destruction,[data-combat-exit=true]')};await c.queue;}
  await new Promise(resolve=>{const deadline=performance.now()+7000;const check=()=>{if(!document.querySelector('.combat-damage,.counter-rig,[data-combat-exit=true],.mana-destruction')||performance.now()>deadline)resolve();else setTimeout(check,50);};check();});sampling=false;
  return{kind,side,ready,interactive,followup,frames,remaining:document.querySelectorAll('.combat-damage,.counter-rig,[data-combat-exit=true],.mana-destruction').length,overflow:document.documentElement.scrollWidth>innerWidth};
 };});
 for(const [width,kind,side] of [[1280,'counter',0],[1280,'lethal',0],[1280,'face',0],[1280,'face',1],[1280,'mutual',0],[1280,'multi',0],[1280,'summon',0],[390,'counter',1],[390,'lethal',0],[390,'summon',1]]){
  await page.setViewportSize({width,height:width===390?844:900});
  console.log('START',width,kind,side);
  await page.evaluate(([kind,side])=>{window.playing=observeTempo(kind,side)},[kind,side]);
  console.log('TRIGGERED',kind);
  if(process.env.LORE_CAPTURE)await page.waitForSelector(kind==='summon'?'.dew-grant':'.combat-damage',{state:'attached'});
  console.log('VISIBLE',kind);
  if(process.env.LORE_CAPTURE)await page.screenshot({timeout:15000,path:`${out}/${width}-${kind}-${side}.png`});
  const r=await page.evaluate(()=>Promise.race([playing,new Promise((_,reject)=>setTimeout(()=>reject(Error('Playback hung '+JSON.stringify({gen:combatTempo.controller.fxGen,skip:combatTempo.controller.skipGen,pending:combatTempo.controller.state.pending,fx:!!document.querySelector('.fx-playing'),tails:document.querySelectorAll('.mana-destruction').length}))),20000))]));await fs.writeFile(`${out}/case-${width}-${kind}-${side}.json`,JSON.stringify(r));const first=r.frames.find(f=>f.numbers.length);
  if(kind!=='summon'){
   assert(first,'damage displayed');assert(first.blocked||kind==='multi'||kind==='mutual','exhausted at contact');
   const times=r.frames.filter(f=>f.numbers.some(n=>n.uid==='tempo-defender'||kind==='face'));
   assert(times.at(-1).t-times[0].t>=650&&times.at(-1).t-times[0].t<950,'800ms number');
   assert(first.numbers.every(n=>n.font>=n.height*.3),'frame-sized numerals');
  }
  if(kind==='counter'){
   const hit=r.frames.find(f=>f.numbers.some(n=>n.uid==='tempo-defender')),counter=r.frames.find(f=>f.counter!==null),returnHit=r.frames.find(f=>f.numbers.some(n=>n.uid==='tempo-attacker'));
   assert(counter.t-hit.t<400,'counter begins during recovery');assert(returnHit.t-hit.t<750,'return hit does not wait for full attack');assert(r.frames.some(f=>f.recoil>0),'rendered target recoils');assert.equal(hit.hp,'14');
  }
  if(kind==='face')assert(r.frames.some(f=>side===0?f.botShake:f.playerShake),'whole avatar frame shakes');
  if(kind==='lethal'){assert(r.interactive.tail,'graveyard flight survives board render');assert(r.interactive.next,'next attacker ready');assert(r.followup.used&&r.followup.tail,'next action accepted without cutting graveyard flight');}
  if(kind==='summon')assert(r.frames.some(f=>f.dew&&f.shield&&f.summon),'both grants overlap summon');
  if(kind==='multi')assert(first&&!first.blocked,'multi attacker stays ready');
  assert.equal(r.remaining,0);assert.equal(r.overflow,false);checks.push({width,...r});console.log('PASS',width,kind,side,Math.round(r.ready));
 }
 await page.setViewportSize({width:1280,height:900});
 const urgency=await page.evaluate(async()=>{const paint=(s,mine)=>combatTempo.clock(s,mine);const levels=[];for(const seconds of [25,15,5,1]){paint(seconds,true);await new Promise(r=>setTimeout(r,150));levels.push({seconds,owner:document.querySelector('[data-reading-turn]')?.dataset.readingTurn,disabled:document.getElementById('endBtn').disabled,urgency:Number(document.getElementById('endBtn').dataset.urgency),shift:getComputedStyle(document.getElementById('endBtn')).getPropertyValue('--urgency-shift')});}paint(90,false);return{levels,reset:document.getElementById('endBtn').classList.contains('turn-urgent')};});
 assert(urgency.levels.every(x=>x.owner==='player'&&!x.disabled),'warning preview owns the active player button');
 assert(urgency.levels.every((x,i,a)=>!i||x.urgency>a[i-1].urgency));assert.equal(urgency.reset,false);checks.push({urgency});
 await page.emulateMedia({reducedMotion:'reduce'});const reduced=await page.evaluate(()=>observeTempo('counter'));assert(reduced.frames.some(f=>f.numbers.length));assert.equal(reduced.remaining,0);checks.push({mode:'reduced',...reduced});await page.emulateMedia({reducedMotion:'no-preference'});
 for(const mode of ['skip','resize','destroy']){
  await page.evaluate(()=>{window.playing=observeTempo('counter')});await page.waitForSelector('.combat-damage',{state:'attached'});
  if(mode==='resize')await page.setViewportSize({width:1100,height:850});else await page.evaluate(mode=>{if(mode==='skip')combatTempo.controller.fastForward();else combatTempo.controller.destroy()},mode);
  const r=await page.evaluate(()=>Promise.race([playing,new Promise((_,reject)=>setTimeout(()=>reject(Error('Playback hung '+JSON.stringify({gen:combatTempo.controller.fxGen,skip:combatTempo.controller.skipGen,pending:combatTempo.controller.state.pending,fx:!!document.querySelector('.fx-playing'),tails:document.querySelectorAll('.mana-destruction').length}))),20000))]));assert.equal(r.remaining,0);checks.push({mode,remaining:r.remaining});
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/report.json',JSON.stringify({origin,checks,errors,boundary:'Real GameView/BaseController, public reducer fixtures, NPC and seeker portraits; not authenticated multiplayer.'},null,2));console.log('PASS combat tempo browser',checks.length,out);
}catch(error){console.error(error);throw error;}finally{await context.close();if(page.video())await page.video().saveAs(out+'/continuous.webm');await browser.close();}
