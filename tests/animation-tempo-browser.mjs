import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-market-preview-tools/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5587',out=process.env.LORE_TEST_OUT||'/tmp/lore-animation-tempo';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:out+'/video',size:{width:1280,height:900}}});
const page=await context.newPage();page.setDefaultTimeout(120000);const errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(/\[.*\].*fallback|Shader Error|GL_INVALID/.test(m.text()))errors.push(m.text());});
try{
 await page.goto(origin+'/cosmetic-studio.html?board=1&runtime=1&set=default&tempo=1');
 await page.waitForFunction(()=>window.combatTempo&&document.querySelector('[data-scene-ready=true]'));
 await page.evaluate(async()=>{
  document.querySelector('.tempo-controls').style.display='none';
  const {DB}=await import('/src/shared/cards.ts'),{reduce}=await import('/src/shared/engine.ts'),{redactFor}=await import('/src/shared/protocol.ts');
  window.playTempo=async(id,owner=0,interrupt='')=>{
   const c=combatTempo.controller;await c.queue;const g=combatTempo.fixture('summon',owner).prev;g.opening=undefined;g.cur=owner;g.pending=null;
   for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],field:[],removed:[],enchants:[],quests:[],traps:[],mana:99,maxMana:99});
   g.players[owner].hand=[{...DB[id],uid:'tempo-'+id}];
   for(const [i,p] of g.players.entries())p.discard=[{...DB.M1,uid:'grave-'+i}];
   const res=reduce(g,{type:'play',idx:0});if(!res.events.length)throw Error('No events for '+id);
   c.show(redactFor(g,0));(await import('/src/ui/turnBanner.ts')).cancelTurnBanner();await new Promise(r=>setTimeout(r,300));
   const stages={},selector='.slate-summon,.castle-summon,.mage-summon,.quest-fold-canvas,.persistent-flight-canvas,.curse-fx,.void-shot-fx,.mimic-summon-rig';let active=true,frames=0;
   const sample=(now=performance.now())=>{frames++;for(const n of document.querySelectorAll(selector)){const key=n.className,st=stages[key]??={first:now,samples:[]};st.last=now;if(n.dataset.time)st.samples.push({wall:now,authored:Number(n.dataset.time)});}if(active)requestAnimationFrame(sample);};sample();
   const start=performance.now();c.applyResult({state:redactFor(res.state,0),events:res.events});
   if(interrupt)setTimeout(()=>{if(interrupt==='skip')c.fastForward();else if(interrupt==='resize')window.dispatchEvent(new Event('resize'));else if(interrupt==='hidden'){Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));}},700);
   await Promise.race([c.queue,new Promise((_,reject)=>setTimeout(()=>reject(Error('Playback timeout '+id)),30000))]);active=false;
   if(interrupt==='hidden'){delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));}
   await new Promise(r=>setTimeout(r,80));
   return {id,owner,interrupt,ms:performance.now()-start,frames,stages,events:res.events.map(e=>e.type),remaining:document.querySelectorAll(selector+',.quest-fold-host,.fx-field-ghost').length,field:c.state.players[owner].field.map(x=>x.id),enchants:c.state.players[owner].enchants.length,quests:c.state.players[owner].quests.length};
  };
 });
 const cases=[['M1',0],['M1',1],['S1',0],['Q_RIFT',0],['Q_RIFT',1],['NHEAL',0],['CASTLE',0],['FIRE_MASTER',1],['BLACK_CURSE',0]];
 for(const [id,owner]of cases){
  console.log('PLAY',id,owner);const pending=page.evaluate(({id,owner})=>playTempo(id,owner),{id,owner});
  await page.waitForTimeout(id==='Q_RIFT'?1500:800);await page.screenshot({path:out+`/${id}-${owner}.png`});
  const r=await pending;assert.equal(r.remaining,0,JSON.stringify(r));
  const required={M1:'slate-summon',Q_RIFT:'quest-fold-canvas',NHEAL:'persistent-flight-canvas',CASTLE:'castle-summon',FIRE_MASTER:'mage-summon',BLACK_CURSE:'curse-fx'}[id];if(required)assert(r.stages[required],id+' did not render '+required);
  for(const [key,stage]of Object.entries(r.stages)){if(stage.samples.length>5){const samples=stage.samples.filter(s=>s.authored>100);if(samples.length<3)continue;const a=samples[0],b=samples.at(-1),rate=(b.authored-a.authored)/(b.wall-a.wall);const expected=/slate|quest|persistent/.test(key)?1/.7:1/.75;assert(Math.abs(rate-expected)<.25,`${key} rate ${rate} expected ${expected}`);stage.rate=rate;}}
  checks.push(r);console.log('PASS',id,Math.round(r.ms),Object.keys(r.stages));
 }
 await page.setViewportSize({width:390,height:844});
 for(const [id,owner,interrupt]of [['Q_RIFT',1,''],['NHEAL',1,''],['CASTLE',1,'skip'],['M1',0,'resize'],['Q_RIFT',0,'hidden']]){const r=await page.evaluate(a=>playTempo(...a),[id,owner,interrupt]);assert.equal(r.remaining,0);checks.push(r);console.log('PASS mobile',id,interrupt);}
 await page.emulateMedia({reducedMotion:'reduce'});const reduced=await page.evaluate(()=>playTempo('Q_RIFT',0));assert.equal(reduced.remaining,0);checks.push(reduced);
 assert.deepEqual(errors,[]);
 await page.screenshot({path:out+'/mobile-rest.png'});
 console.log('PASS',checks.length,'actual reducer/controller board playbacks');
}finally{await fs.writeFile(out+'/report.json',JSON.stringify({checks,errors},null,2));await context.close();await browser.close();}
