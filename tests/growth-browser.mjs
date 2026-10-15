import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5488',out=process.env.LORE_TEST_OUT||'/tmp/growth-browser';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({viewport:{width:1280,height:900}});const page=await context.newPage();page.setDefaultTimeout(90000);const errors=[],checks=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE',e.message)});page.on('console',m=>{if(m.type()==='error')console.error('CONSOLE',m.text())});
try{
 await page.goto(origin+'/cosmetic-studio.html?board=1&runtime=1&set=default&tempo=1');await page.waitForFunction(()=>window.combatTempo&&document.querySelector('[data-scene-ready=true]'));console.log('Ready');
 await page.evaluate(async()=>{
  const {createGame,reduce}=await import('/src/shared/engine.ts'),{DB}=await import('/src/shared/cards.ts');window.growthAnim=await import('/src/ui/anim.ts');document.querySelector('.tempo-controls')?.remove();
  window.growthFixture=async(side=0,count=1,copies=1,erosion=false)=>{
   const c=window.combatTempo.controller;c.fastForward();await c.queue;c.stopTimer();const g=createGame({mode:'bot',seed:42,starting:side,p0:{id:'self',name:'YOU'},p1:{id:'opponent',name:'OPPONENT'}}).state;g.turn=3;g.cur=side;g.phase='main';g.pending=null;
   for(const p of g.players)Object.assign(p,{field:[],enchants:[],traps:[],quests:[],hand:[],deck:[],discard:[],removed:[],hp:28,mana:20,maxMana:20,shield:0,dew:0,brand:0,openingDrawReady:false});
   g.players[side].enchants=Array.from({length:copies},(_,i)=>({card:{...DB.GROWTH,uid:'growth-source-'+i},turns:99,bornTurn:1}));g.players[side].enchants.push({card:{...DB.KIN_CALL,uid:'unrelated-source'},turns:99,bornTurn:1});
   if(erosion)g.players[side].enchants.push({card:{...DB.EROSION,uid:'erosion-source'},turns:99});
   g.players[side].deck=Array.from({length:count},(_,i)=>({...DB.M4,uid:'growth-draw-'+i}));g.players[side].hand=[{...DB[count===1?'M3':'DISCOVERY'],uid:'growth-play'}];const res=reduce(g,{type:'play',idx:0});c.show(g);c.view.setHandOpen(false);await new Promise(r=>setTimeout(r,250));growthAnim.setFxSkip(false);return{c,g,res};
  };
  window.growthObserve=async(side,count,copies,erosion=false)=>{console.log('growth fixture',side,count,copies);
   const {c,res}=await growthFixture(side,count,copies,erosion);let running=true;const frames=[],start=performance.now();
   const tick=()=>{const cv=document.querySelector('.growth-leaf-fx'),hp=Number(document.querySelector(side?'#hp-opp':'#hp-me').textContent),hand=document.querySelector(side?'#oppHand':'#hand');frames.push({t:performance.now()-start,fx:!!cv,hp,drawn:hand.querySelectorAll('[data-uid^="growth-draw-"]').length,generic:!!document.querySelector('.biblion-fx'),handTravel:!!document.querySelector('.native-draw-layer')});if(running)requestAnimationFrame(tick)};requestAnimationFrame(tick);c.applyResult(res);await c.queue;c.stopTimer();running=false;
   return{otherHp:Number(document.querySelector(side?'#hp-me':'#hp-opp').textContent),frames,hp:Number(document.querySelector(side?'#hp-opp':'#hp-me').textContent),remaining:document.querySelectorAll('.growth-leaf-fx').length,faces:document.querySelectorAll('#oppHand .card').length,expected:res.state.players[side].hp};
  };
 });
 for(const [width,side,count,copies,erosion]of [[1280,0,1,1,false],[1280,1,3,2,false],[390,0,3,2,false],[390,1,1,1,false],[1280,0,3,1,true],[390,1,3,1,true]]){
  await page.setViewportSize({width,height:width===390?844:900});await page.evaluate(args=>{window.growthPlaying=growthObserve(...args).catch(e=>{window.growthError=String(e);throw e})},[side,count,copies,erosion]);const r=await page.evaluate(()=>growthPlaying);await fs.writeFile(`${out}/${width}-${side}-${erosion}.json`,JSON.stringify(r,null,2));
  assert.equal(r.otherHp,28-(erosion?count:0));assert.equal(r.hp,r.expected);assert.equal(r.hp,28+count*copies);assert.equal(r.remaining,0);assert.equal(r.faces,0,'opponent faces stay hidden');const active=r.frames.filter(f=>f.fx);assert(active.length>1);const first=r.frames.findIndex(f=>f.fx);assert(r.frames.slice(0,first).some(f=>f.handTravel));assert(!r.frames.slice(first).some(f=>f.handTravel),'no duplicate draw after Growth starts');assert(active.some(f=>f.hp===28));assert(active.some(f=>f.hp>28));assert(active.every(f=>f.drawn===count),'drawn cards present before Growth');assert(!r.frames.some(f=>f.generic),'no generic duplicate');await fs.writeFile(`${out}/${width}-${side}-${erosion}.json`,JSON.stringify(r,null,2));checks.push({width,side,count,copies,erosion,frames:active.length});console.log('PASS',width,side,count,copies);
 }
 await page.setViewportSize({width:1280,height:900});
 for(const mode of ['complete','skip','resize','hidden','detach','reduced']){
  await page.emulateMedia({reducedMotion:mode==='reduced'?'reduce':'no-preference'});
  const r=await page.evaluate(async mode=>{
   await growthFixture();let heals=0;const source=document.querySelector('.buff-icon[data-uid="growth-source-0"]'),before=source.style.cssText,pulse={uid:'growth-source-0',player:0,amount:1,delay:0,healIndex:1};
   const one=growthAnim.growthRecovery('me',[pulse],()=>heals++),two=growthAnim.growthRecovery('opp',[pulse],()=>heals++);await new Promise(r=>setTimeout(r,180));const count=document.querySelectorAll('.growth-leaf-fx').length;
   if(mode==='skip')growthAnim.setFxSkip(true);if(mode==='resize')window.dispatchEvent(new Event('resize'));if(mode==='hidden'){Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))}if(mode==='detach')source.remove();
   await Promise.all([one,two]);if(mode==='hidden')delete document.hidden;growthAnim.setFxSkip(false);return{heals,count,left:document.querySelectorAll('.growth-leaf-fx').length,unchanged:source.style.cssText===before};
  },mode);assert.equal(r.heals,2);assert.equal(r.count,2);assert.equal(r.left,0);assert(r.unchanged);checks.push({mode,...r});console.log('PASS lifecycle',mode);
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/validation.json',JSON.stringify({checks,errors},null,2));
}catch(error){console.error('STATE',await page.evaluate(()=>({html:document.body.innerText.slice(-700),fx:document.querySelectorAll('.growth-leaf-fx').length,errors:window.growthError})).catch(()=>null),errors);throw error;}finally{await context.close();await browser.close()}
