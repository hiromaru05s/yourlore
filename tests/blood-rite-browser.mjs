import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5547';
const out=process.env.LORE_TEST_OUT||'/tmp/blood-rite-browser';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:out+'/video',size:{width:1280,height:900}}});
const page=await context.newPage();page.setDefaultTimeout(90000);const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.error('BROWSER',m.text());}});
try{
 await page.goto(origin+'/cosmetic-studio.html?board=1&runtime=1&set=default&tempo=1');
 console.log('board loaded');
 await page.waitForFunction(()=>window.combatTempo&&document.querySelector('[data-scene-ready=true]'));
 console.log('board ready');
 await page.evaluate(async()=>{
  const {createGame,reduce}=await import('/src/shared/engine.ts'),{DB}=await import('/src/shared/cards.ts');window.bloodAnim=await import('/src/ui/anim.ts');
  document.querySelector('.tempo-controls')?.remove();
  window.bloodFixture=async(caster=0,owner=0,full=false)=>{
   const c=window.combatTempo.controller;c.fastForward();await c.queue;c.stopTimer();
   const g=createGame({mode:'bot',seed:42,starting:caster,p0:{id:'self',name:'YOU'},p1:{id:'opponent',name:'OPPONENT'}}).state;g.turn=3;g.cur=caster;g.phase='main';g.pending=null;
   for(const [side,p] of g.players.entries())Object.assign(p,{field:[],enchants:[],traps:[],quests:[],hand:[],deck:[],discard:[],removed:[],hp:28,mana:20,maxMana:20,shield:0,dew:0,brand:0,openingDrawReady:false});
   g.players[owner].enchants=[{card:{...DB.BLOOD_RITE,uid:'blood-source'},turns:99,bornTurn:1}];
   g.players[caster].hand=[{...DB.S1,uid:'blood-spell'}];
   const res=reduce(g,{type:'play',idx:0});if(!res.events.some(e=>e.bloodRiteSources))throw Error('fixture must cause converted damage');if(!full)res.events=res.events.filter(e=>e.type==='heal');
   c.show(g);c.view.setHandOpen(false);await new Promise(r=>setTimeout(r,200));bloodAnim.setFxSkip(false);
   return{c,g,res};
  };
  window.bloodObserve=async(caster,owner,full)=>{
   const {c,res}=await bloodFixture(caster,owner,full);let running=true;const frames=[],start=performance.now();
   const tick=()=>{const el=document.querySelector('.buff-icon[data-uid="blood-source"]'),canvas=document.querySelector('.blood-rite-vein-fx');frames.push({t:performance.now()-start,fx:!!canvas,scale:Number(el?.style.scale||1),lift:el?.style.translate||'',hp:Number(document.querySelector(caster===0?'#hp-opp':'#hp-me')?.textContent),generic:!!document.querySelector('.biblion-fx'),damage:document.querySelectorAll('.combat-damage').length});if(running)requestAnimationFrame(tick);};requestAnimationFrame(tick);c.applyResult(res);await c.queue;c.stopTimer();running=false;
   return{frames,hp:document.querySelector(caster===0?'#hp-opp':'#hp-me')?.textContent,remaining:document.querySelectorAll('.blood-rite-vein-fx').length,source:document.querySelector('.buff-icon[data-uid="blood-source"]')?.style.cssText};
  };
 });
 for(const [width,caster,owner,full] of [[1280,0,0,true],[1280,1,0,false],[1280,0,1,false],[390,1,1,true]]){
  console.log('case',width,caster,owner,full);
  await page.setViewportSize({width,height:width===390?844:900});
  await page.evaluate(args=>{window.bloodPlaying=bloodObserve(...args);},[caster,owner,full]);
  await page.waitForSelector('.blood-rite-vein-fx',{state:'attached',timeout:20000});await page.waitForTimeout(300);
  await page.screenshot({path:`${out}/${width}-${caster}-${owner}.png`});
  const result=await page.evaluate(()=>bloodPlaying);assert.equal(result.hp,'31');assert.equal(result.remaining,0);
  const active=result.frames.filter(f=>f.fx);assert(active.length>10);assert(active.some(f=>f.scale>1.07&&f.lift.includes('-')));assert(active.some(f=>f.hp===28));assert(active.some(f=>f.hp===31));assert(result.frames.every(f=>f.hp>=28&&f.scale<=1.075001&&f.damage===0));
  await fs.writeFile(`${out}/${width}-${caster}-${owner}.json`,JSON.stringify(result,null,2));checks.push({width,caster,owner,full,frames:active.length});
 }
 // Explicit lifecycle: same source under two simultaneous target effects, fast-forward and viewport changes.
 await page.setViewportSize({width:1280,height:900});
 for(const mode of ['complete','skip','resize','hidden','detach','reduced']){
  await page.emulateMedia({reducedMotion:mode==='reduced'?'reduce':'no-preference'});
  const r=await page.evaluate(async mode=>{
   await bloodFixture();let heals=0;const source=document.querySelector('.buff-icon[data-uid="blood-source"]'),before=source.style.cssText;
   const one=bloodAnim.bloodRiteRecovery('me',['blood-source'],()=>heals++),two=bloodAnim.bloodRiteRecovery('opp',['blood-source'],()=>heals++);
   await new Promise(r=>setTimeout(r,300));const during={count:document.querySelectorAll('.blood-rite-vein-fx').length,scale:Number(source.style.scale),lift:source.style.translate};
   if(mode==='skip')bloodAnim.setFxSkip(true);
   if(mode==='resize')window.dispatchEvent(new Event('resize'));
   if(mode==='hidden'){Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));}
   if(mode==='detach'){document.querySelector('#hp-me').closest('.pt-hp').remove();document.querySelector('#hp-opp').closest('.pt-hp').remove();}
   await Promise.all([one,two]);if(mode==='hidden')delete document.hidden;bloodAnim.setFxSkip(false);
   return{during,heals,restored:source.style.cssText===before,count:document.querySelectorAll('.blood-rite-vein-fx').length};
  },mode);
  assert.equal(r.during.count,2);assert(r.during.scale>1&&r.during.scale<=1.075001);assert.equal(r.heals,2);assert(r.restored);assert.equal(r.count,0);if(mode==='reduced')assert(r.during.lift.split(' ').every(value=>parseFloat(value)===0));checks.push({mode,...r});
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/validation.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
}catch(error){await page.screenshot({path:out+'/failure.png'}).catch(()=>{});console.error('STATE',await page.evaluate(()=>({ready:document.querySelector('#app')?.dataset,tempo:!!window.combatTempo,text:document.body.innerText.slice(0,1000)})).catch(()=>null),errors);throw error;}finally{await context.close();await browser.close();}
