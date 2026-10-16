import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-exp-browser/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5576',out=process.env.LORE_TEST_OUT||'/tmp/lore-summon-feedback';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:2,recordVideo:{dir:out+'/video',size:{width:1280,height:900}}});const page=await context.newPage();page.setDefaultTimeout(120000);const errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.text().includes('fallback')||m.text().includes('[playback]'))errors.push(m.text());});
try{
 await page.goto(origin+'/cosmetic-studio.html?board=1&runtime=1&set=default&tempo=1');await page.waitForFunction(()=>window.combatTempo&&document.querySelector('[data-scene-ready=true]'));
 await page.evaluate(async()=>{
  document.querySelector('.tempo-controls').style.display='none';
  const {DB,STARTERS}=await import('/src/shared/cards.ts'),{reduce}=await import('/src/shared/engine.ts'),{redactFor}=await import('/src/shared/protocol.ts');
  window.summonQA=async(id,owner=0,stale=false,interrupt='')=>{
   const c=combatTempo.controller;await c.queue;const g=combatTempo.fixture('summon',owner).prev;g.opening=undefined;
   for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],field:[],removed:[],enchants:[],quests:[],traps:[]});
   g.players[owner].hand=[{...DB[id],uid:'qa-'+id}];
   if(id==='SHIELD_TITAN')g.players[owner].previousOpponentShieldPeak=20;
   if(id==='SORTER'){g.players[owner].discard=[0,1,2].map(i=>({...STARTERS.STARTER_TRASH,uid:'grave-'+i}));g.players[owner].deck=[0,1,2].map(i=>({...STARTERS.STARTER_TRASH,uid:'deck-'+i}));}
   const res=reduce(g,{type:'play',idx:0});if(!res.events.some(e=>e.type==='summon'))throw Error(id+' fixture did not summon: '+JSON.stringify(res.events));c.show(redactFor(g,0));await new Promise(r=>setTimeout(r,400));
   const activations=new Set(),exits=new Set(),families=new Set(),buffers=[],frames=[];let running=true;
   const sample=()=>{
    document.querySelectorAll('[data-monster-kind=trigger]').forEach(n=>activations.add(n));document.querySelectorAll('[data-cull-exile]').forEach(n=>exits.add(n.dataset.cullExile));
    const nodes=[...document.querySelectorAll('.slate-summon,.chosen-hero-summon,.mage-summon,.hexer-summon,.mercenary-summon,.assassin-summon,.vampire-summon,.void-summon,.silence-summon,.shield-titan-summon')];
    for(const n of nodes){families.add(n.className);if(n.tagName==='CANVAS'&&!buffers.some(b=>b.name===n.className))buffers.push({name:n.className,width:n.width,height:n.height,cssWidth:innerWidth,cssHeight:innerHeight});}
    frames.push({t:performance.now(),layers:nodes.map(n=>({kind:n.className,time:n.dataset.time,opacity:n.style.opacity})),rift:document.querySelectorAll('.rift-fold-canvas').length});
    if(running)requestAnimationFrame(sample);
   };sample();c.applyResult({state:redactFor(res.state,0),events:res.events});
   if(stale)await c.onPlay('qa-'+id); // Same pointer/click after the physical card already left hand.
   if(interrupt==='skip')setTimeout(()=>c.fastForward(),900);
   if(interrupt==='resize')setTimeout(()=>window.dispatchEvent(new Event('resize')),900);
   await Promise.race([c.queue,new Promise((_,reject)=>setTimeout(()=>reject(Error(id+' playback timed out')),30000))]);running=false;await new Promise(r=>setTimeout(r,50));
   return{id,owner,stale,interrupt,activations:activations.size,exits:[...exits],families:[...families],buffers,removed:c.state.players[owner].removed.length,frames,left:document.querySelectorAll('[data-cull-exile],.rift-fold-canvas,.slate-summon,.mage-summon,.hexer-summon,.mercenary-summon,.assassin-summon,.vampire-summon,.void-summon,.silence-summon,.shield-titan-summon').length};
  };
 });
 for(const width of [1280,390]){
  await page.setViewportSize({width,height:width===390?844:900});
  const cards=width===1280?['SORTER','CHOSEN_KNIGHT','FIRE_MASTER','HEXER1','MERCENARY','ASSASSIN1','VAMP1','VOID_APOSTLE','NT_SEAL5','SHIELD_TITAN']:['SORTER','FIRE_MASTER','ASSASSIN1'];
  for(const [index,id]of cards.entries()){
   const owner=width===390?1:index%2;
   await page.evaluate(({id,owner})=>{window.qaRunning=summonQA(id,owner,id==='SORTER'&&owner===0)}, {id,owner});
   if(id==='SORTER'){
    await page.waitForSelector('.slate-summon');await page.waitForTimeout(900);await page.screenshot({path:out+`/sorter-${width}-summon.png`,scale:'css'});

   }
   if(id!=='SORTER'){await page.waitForTimeout(2300);await page.screenshot({path:out+`/${id}-${width}-during.png`,scale:'css'});}
   const r=await page.evaluate(()=>qaRunning);assert(r.families.length,`${id} summon was skipped`);assert.equal(r.left,0,`${id} cleanup`);console.log('result',id,JSON.stringify({activations:r.activations,exits:r.exits,buffers:r.buffers,families:r.families}));
   if(id==='SORTER'){assert.equal(r.activations,2);assert.equal(r.exits.length,6);assert.equal(r.removed,6);assert(r.frames.some(f=>f.rift>1),'Culls share the Rift clock');}
   for(const b of r.buffers)assert(b.width>b.cssWidth&&b.height>b.cssHeight,`${id} Retina buffer`);
   checks.push({...r,width});await fs.writeFile(out+'/progress.json',JSON.stringify(checks,null,2));console.log('PASS',width,id,owner,r.activations,r.exits.length);
  }
 }
 for(const mode of ['skip','resize']){const r=await page.evaluate(mode=>summonQA('SORTER',0,false,mode),mode);assert.equal(r.left,0);checks.push(r);}
 await page.emulateMedia({reducedMotion:'reduce'});const reduced=await page.evaluate(()=>summonQA('SORTER'));assert.equal(reduced.removed,6);assert.equal(reduced.left,0);checks.push({...reduced,reduced:true});await page.emulateMedia({reducedMotion:'no-preference'});
 for(const side of ['me','opp']){
  await page.evaluate(async side=>{const {hpFeedback}=await import('/src/ui/anim.ts');hpFeedback(side,'dmg',12)},side);await page.waitForSelector('.combat-damage.in');await page.waitForTimeout(150);await page.screenshot({path:out+`/damage-${side}.png`,scale:'css'});
  const number=await page.locator('.combat-damage.in').evaluate(n=>({font:getComputedStyle(n).fontFamily,weight:getComputedStyle(n).fontWeight,animation:getComputedStyle(n).animationName,rect:n.getBoundingClientRect().toJSON()}));assert(number.font.includes('Alegreya'));assert.equal(number.weight,'800');checks.push({side,number});await page.waitForSelector('.combat-damage',{state:'detached'});
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({checks,errors,boundary:'Real GameView/BaseController with reducer and redacted snapshots; not authenticated multiplayer.'},null,2));
}finally{await context.close();await browser.close();}
