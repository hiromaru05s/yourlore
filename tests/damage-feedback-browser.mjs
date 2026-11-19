import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5739';
const out=process.env.LORE_TEST_OUT||'/tmp/lore-damage-release';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[],checks=[];
page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(origin+'/cosmetic-studio.html?board=1&runtime=1&set=default&tempo=1');
 await page.waitForFunction(()=>window.combatTempo&&document.querySelector('[data-scene-ready=true]'));
 await page.evaluate(()=>{
  document.querySelector('.tempo-controls').style.display='none';
  window.damageCase=async(kind,side,amount)=>{
   const c=combatTempo.controller;c.fastForward();await c.queue;
   const g=combatTempo.fixture(kind,side).prev;
   g.players[side].field[0].atk=amount;
   if(kind==='counter')g.players[1-side].field[0].def=100;
   c.show(g);await new Promise(r=>setTimeout(r,250));
   const frames=[];let running=true;
   const tick=()=>{for(const n of document.querySelectorAll('.combat-damage')){const digit=n.querySelector('.combat-damage-number');const mark=n.querySelector('.combat-damage-mark');if(digit)frames.push({amount:Number(n.dataset.amount),uid:n.dataset.damageUid,color:getComputedStyle(digit).color,stroke:getComputedStyle(digit).webkitTextStrokeColor,markDisplay:getComputedStyle(mark).display,markOpacity:Number(getComputedStyle(mark).opacity),text:digit.textContent,x:parseFloat(n.style.left),y:parseFloat(n.style.top)});}if(running)requestAnimationFrame(tick);};requestAnimationFrame(tick);
   c.submit({type:'attack',uid:'tempo-attacker'});await c.queue;
   if(kind==='counter'&&c.state.pending){c.submit({type:'chooseTarget',uid:'tempo-defender'});await c.queue;}
   c.stopTimer();await new Promise(r=>setTimeout(r,1400));running=false;
   return{kind,side,amount,frames,hp:c.state.players[1-side].hp,monsterDamage:c.state.players[1-side].field.find(m=>m.uid==='tempo-defender')?.dmg,left:document.querySelectorAll('.combat-damage').length,overflow:document.documentElement.scrollWidth>innerWidth};
  };
 });
 for(const [width,kind,side,amount] of [[1280,'counter',0,9],[1280,'counter',1,10],[1280,'face',0,10],[1280,'face',1,9],[390,'counter',0,10],[390,'face',1,10]]){
  await page.setViewportSize({width,height:width===390?844:900});
  await page.evaluate(args=>{window.runningDamage=damageCase(...args)},[kind,side,amount]);
  await page.waitForSelector('.combat-damage-number');await page.waitForTimeout(160);await page.screenshot({path:`${out}/${width}-${kind}-${side}-${amount}.png`});
  const r=await page.evaluate(()=>runningDamage),matching=r.frames.filter(f=>f.amount===amount);
  assert(matching.length,'damage came from actual combat');
  assert(matching.every(f=>f.color===(amount>=10?'rgb(255, 227, 233)':'rgb(255, 247, 233)')&&f.stroke==='rgb(48, 21, 28)'&&Number.isFinite(f.x)&&Number.isFinite(f.y)));
  assert(matching.some(f=>f.markOpacity>0),'background animates');
  if(kind==='face')assert.equal(r.hp,60-amount);else assert.equal(r.monsterDamage,2+amount);
  assert.equal(r.left,0);assert.equal(r.overflow,false);checks.push({...r,frames:undefined,samples:matching.length});console.log('PASS',width,kind,side,amount);
 }
 await page.emulateMedia({reducedMotion:'reduce'});const reduced=await page.evaluate(()=>damageCase('face',0,10));assert(reduced.frames.length);assert(reduced.frames.every(f=>f.markDisplay==='none'));assert.equal(reduced.left,0);checks.push({reducedMotion:true});
 await page.emulateMedia({reducedMotion:'no-preference'});
 for(const action of ['skip','resize','destroy']){
  await page.evaluate(()=>{window.runningDamage=damageCase('face',0,10)});await page.waitForSelector('.combat-damage-number');
  if(action==='resize')await page.setViewportSize({width:1100,height:850});else await page.evaluate(action=>action==='skip'?combatTempo.controller.fastForward():combatTempo.controller.destroy(),action);
  assert.equal(await page.locator('.combat-damage').count(),0);await page.evaluate(()=>runningDamage);checks.push({action,clean:true});
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({origin,checks,errors,boundary:'Actual reducer/controller fixture with production damage runtime; no authenticated multiplayer match.'},null,2));console.log('PASS damage feedback');
}finally{await browser.close();}
