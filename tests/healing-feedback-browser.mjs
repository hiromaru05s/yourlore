import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5211';
const out=process.env.LORE_TEST_OUT||'/tmp/lore-healing-release';await fs.mkdir(out,{recursive:true});
const temp=await fs.mkdtemp('/tmp/heal-browser-');
await build({stdin:{contents:"export {DB} from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:temp+'/cards.mjs'});
const {DB}=await import(temp+'/cards.mjs');
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:out,size:{width:1280,height:900}}});
const page=await context.newPage(),errors=[],checks=[];
page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(origin+'/cosmetic-studio.html?board=1&runtime=1&set=default&tempo=1');
 await page.waitForFunction(()=>window.combatTempo&&document.querySelector('[data-scene-ready=true]'));
 await page.evaluate(catalog=>{
  document.querySelector('.tempo-controls').style.display='none';
  window.healCase=async(kind,side,amount)=>{
   const c=combatTempo.controller;c.fastForward();await c.queue;
   const g=combatTempo.fixture('counter',side).prev;
   g.mode='online';g.market=[];g.marketStock=[];
   for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],enchants:[],quests:[],traps:[],dew:0,shield:0,brand:0,hp:40});
   const spell=kind==='monster'?'S14':kind==='blood'?'S1':'GRAPE';
   g.players[side].hand=[{...catalog[spell],...(kind==='player'?{val:amount}:{}),uid:'heal-spell'}];
   if(kind==='monster')for(const [s,p] of g.players.entries()){p.field=p.field.slice(0,1);p.field[0].def=30;p.field[0].dmg=s===side?9:10;}
   else for(const p of g.players)p.field=[];
   if(kind==='blood')g.players[side].enchants=[{card:{...catalog.BLOOD_RITE,uid:'heal-rite'},turns:99,bornTurn:0}];
   c.show(g);c.stopTimer();await new Promise(r=>setTimeout(r,350));
   const frames=[];let running=true;
   const tick=()=>{for(const n of document.querySelectorAll('.combat-heal')){const field=n.querySelector('.ch-field'),digit=n.querySelector('.ch-digit'),r=field.getBoundingClientRect(),width=parseFloat(n.style.getPropertyValue('--anchor-w')),cx=parseFloat(n.style.left);frames.push({amount:Number(n.dataset.amount),uid:n.dataset.healUid,text:digit.textContent,cloud: getComputedStyle(field).display,inside:r.left>=cx-width/2-.5&&r.right<=cx+width/2+.5,clip:getComputedStyle(field).clipPath,banks:n.querySelectorAll('.ch-cloud-bank').length,heavy:n.classList.contains('heavy'),fill:getComputedStyle(n.querySelector('.ch-infill')).backgroundImage});}if(running)requestAnimationFrame(tick);};requestAnimationFrame(tick);
   c.submit({type:'play',idx:0});await c.queue;c.stopTimer();await new Promise(r=>setTimeout(r,1700));running=false;
   return{kind,side,amount,frames,hp:c.state.players.map(p=>p.hp),wounds:c.state.players.flatMap(p=>p.field.map(m=>m.dmg)),left:document.querySelectorAll('.combat-heal').length,overflow:document.documentElement.scrollWidth>innerWidth};
  };
 },Object.fromEntries(['S14','GRAPE','S1','BLOOD_RITE'].map(k=>[k,DB[k]])));
 for(const [width,kind,side,amount] of [[1280,'monster',0,0],[1280,'monster',1,0],[1280,'player',0,9],[1280,'player',1,10],[1280,'blood',0,0],[390,'monster',0,0],[390,'player',1,128]]){
  await page.setViewportSize({width,height:width===390?844:900});
  await page.evaluate(args=>{window.healRun=healCase(...args)},[kind,side,amount]);
  await page.waitForSelector('.combat-heal .ch-digit');await page.waitForTimeout(250);await page.screenshot({path:`${out}/${width}-${kind}-${side}-${amount}.png`});
  const r=await page.evaluate(()=>healRun);assert(r.frames.length,'actual controller emits healing');assert(r.frames.every(f=>!f.text.includes('+')&&f.inside&&f.banks===3&&f.heavy===(f.amount>=10)&&f.clip!=='none'));
  if(kind==='monster'){assert(r.frames.some(f=>f.uid&&f.amount===9));assert(r.frames.some(f=>f.uid&&f.amount===10));assert(r.wounds.every(x=>x===0));}
  else if(kind==='player'){assert.equal(r.hp[side],40+amount);assert(r.frames.every(f=>f.amount===amount));}
  else {assert(r.hp[1-side]>40);assert(r.frames.some(f=>f.amount===r.hp[1-side]-40));}
  assert.equal(r.left,0);assert.equal(r.overflow,false);checks.push({...r,frames:undefined,samples:r.frames.length});console.log('PASS',width,kind,side,amount);
 }
 await page.emulateMedia({reducedMotion:'reduce'});const reduced=await page.evaluate(()=>healCase('player',0,10));assert(reduced.frames.length);assert(reduced.frames.every(f=>f.cloud==='none'));assert.equal(reduced.left,0);checks.push({reduced:true});console.log('PASS reduced motion');
 await page.emulateMedia({reducedMotion:'no-preference'});
 for(const action of ['skip','resize','destroy']){
  await page.evaluate(()=>{window.healRun=healCase('player',0,8)});await page.waitForSelector('.combat-heal .ch-digit');
  if(action==='resize'){await page.evaluate(()=>{window.healResizeObserved=false;addEventListener('resize',()=>window.healResizeObserved=true,{once:true});});await page.setViewportSize({width:1100,height:850});await page.waitForFunction(()=>window.healResizeObserved);}else await page.evaluate(action=>action==='skip'?combatTempo.controller.fastForward():combatTempo.controller.destroy(),action);
  assert.equal(await page.locator('.combat-heal').count(),0);await page.evaluate(()=>healRun);checks.push({action,clean:true});console.log('PASS cleanup',action);
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({origin,checks,errors,boundary:'Real reducer/controller fixtures and adopted UI. Browser-generated player amount fixtures exercise 9/10/128. Not authenticated multiplayer.'},null,2));console.log('PASS healing feedback');
}finally{await context.close();await page.video().saveAs(out+'/playback.webm');await browser.close();await fs.rm(temp,{recursive:true,force:true});}
