import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-exp-browser/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5576',out=process.env.LORE_TEST_OUT||'/tmp/lore-card-resolution';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({viewport:{width:Number(process.env.LORE_QA_WIDTH||1280),height:Number(process.env.LORE_QA_HEIGHT||900)},deviceScaleFactor:Number(process.env.LORE_QA_DPR||2),...(process.env.LORE_RECORD_VIDEO?{recordVideo:{dir:out+'/video',size:{width:1280,height:900}}}:{})});const page=await context.newPage();page.setDefaultTimeout(120000);const errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.text().includes('fallback')||m.text().includes('[playback]')||/Shader Error|VALIDATE_STATUS|GL_INVALID/.test(m.text()))errors.push(m.text());});
try{
 console.log('loading fixture');await page.goto(origin+'/cosmetic-studio.html?board=1&runtime=1&set=default&tempo=1');await page.waitForFunction(()=>window.combatTempo&&document.querySelector('[data-scene-ready=true]'));
 console.log('fixture ready');await page.evaluate(async()=>{
  document.querySelector('.tempo-controls').style.display='none';
  const {DB,STARTERS}=await import('/src/shared/cards.ts'),{reduce}=await import('/src/shared/engine.ts'),{redactFor}=await import('/src/shared/protocol.ts');
  window.summonQA=async(id,owner=0,stale=false,interrupt='')=>{
   const c=combatTempo.controller;await c.queue;const g=combatTempo.fixture('summon',owner).prev;g.opening=undefined;
   for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],field:[],removed:[],enchants:[],quests:[],traps:[]});
   g.players[owner].hand=[{...DB[id],uid:'qa-'+id}];
   if(id==='ELF')g.players[owner].dew=4;
   if(id==='SHIELD_TITAN')g.players[owner].previousOpponentShieldPeak=20;
   if(id==='SORTER'){g.players[owner].discard=[0,1,2].map(i=>({...STARTERS.STARTER_TRASH,uid:'grave-'+i}));g.players[owner].deck=[0,1,2].map(i=>({...STARTERS.STARTER_TRASH,uid:'deck-'+i}));}
   const res=reduce(g,{type:'play',idx:0});if(!res.events.some(e=>e.type==='summon'))throw Error(id+' fixture did not summon: '+JSON.stringify(res.events));c.show(redactFor(g,0));await new Promise(r=>setTimeout(r,400));
   const activations=new Set(),exits=new Set(),families=new Set(),buffers=[],frames=[];let running=true;
   const sample=()=>{
    document.querySelectorAll('[data-monster-kind=trigger]').forEach(n=>activations.add(n));document.querySelectorAll('[data-cull-exile]').forEach(n=>exits.add(n.dataset.cullExile));
    const nodes=[...document.querySelectorAll('.slate-summon,.chosen-hero-summon,.mage-summon,.hexer-summon,.mercenary-summon,.assassin-summon,.vampire-summon,.void-summon,.silence-summon,.shield-titan-summon,.poison-summon,.gambler-summon,.weaponmaster-summon,.dungeon-summon,.verdant-summon,.golem-summon,[data-tribe-summon]')];
    for(const n of nodes){families.add(n.className);for(const canvas of n.tagName==='CANVAS'?[n]:n.querySelectorAll('canvas')){if(!buffers.some(b=>b.name===(n.className||n.dataset.tribeSummon))){const cs=getComputedStyle(canvas);buffers.push({name:n.className||n.dataset.tribeSummon,width:canvas.width,height:canvas.height,cssWidth:parseFloat(cs.width),cssHeight:parseFloat(cs.height),dpr:devicePixelRatio});}}}
    frames.push({t:performance.now(),layers:nodes.map(n=>({kind:n.className,time:n.dataset.time,opacity:n.style.opacity})),rift:document.querySelectorAll('.rift-fold-canvas').length});
    if(running)requestAnimationFrame(sample);
   };sample();c.applyResult({state:redactFor(res.state,0),events:res.events});
   if(stale)await c.onPlay('qa-'+id); // Same pointer/click after the physical card already left hand.
   if(interrupt==='skip')setTimeout(()=>c.fastForward(),900);
   if(interrupt==='resize')setTimeout(()=>window.dispatchEvent(new Event('resize')),900);
   await Promise.race([c.queue,new Promise((_,reject)=>setTimeout(()=>reject(Error(id+' playback timed out')),30000))]);running=false;await new Promise(r=>setTimeout(r,50));
   return{id,owner,stale,interrupt,activations:activations.size,exits:[...exits],families:[...families],buffers,removed:c.state.players[owner].removed.length,frames,left:document.querySelectorAll('[data-cull-exile],.rift-fold-canvas,.slate-summon,.mage-summon,.hexer-summon,.mercenary-summon,.assassin-summon,.vampire-summon,.void-summon,.silence-summon,.shield-titan-summon,.poison-summon,.gambler-summon,.weaponmaster-summon,.dungeon-summon,.verdant-summon,.golem-summon,[data-tribe-summon]').length};
  };
 });

 await page.evaluate(async()=>{
  const {DB}=await import('/src/shared/cards.ts'),{redactFor}=await import('/src/shared/protocol.ts');const c=combatTempo.controller,g=combatTempo.fixture('summon',0).prev;g.opening=undefined;g.players[0].hand=[{...DB.RUST_SHROOM,uid:'quality-hand'}];g.market[0]={...DB.RUST_SHROOM,uid:'quality-market'};c.show(redactFor(g,0));window.qualityCard=g.players[0].hand[0];
 });await page.waitForTimeout(700);
 for(const open of [false,true]){
  await page.evaluate(open=>document.querySelector('.game').classList.toggle('hand-open',open),open);await page.waitForTimeout(300);
  const cards=await page.evaluate(()=>[...document.querySelectorAll('#hand .card,.market-cards .card')].map(n=>({src:n.querySelector('.card-art img')?.currentSrc,frame:getComputedStyle(n.querySelector('.card-frame')).backgroundImage,filter:getComputedStyle(n).filter})));
  assert(cards.length>1);for(const card of cards){assert(card.src.includes('/art/cards/'),JSON.stringify(card));assert(card.frame.includes('-lossless.webp'));assert.equal(card.filter,'none');}
  assert.equal(await page.locator('.market-sub--supply').evaluate(n=>getComputedStyle(n).transformStyle),'preserve-3d');
  await page.screenshot({path:out+`/hand-${open?'open':'closed'}.png`});checks.push({open,cards});
 }
 await page.evaluate(async()=>{(await import('/src/ui/cardInspection.ts')).zoomCard(qualityCard)});await page.waitForTimeout(400);assert((await page.locator('.zoom-overlay .card-art img').first().evaluate(n=>n.currentSrc)).includes('/art/cards/'));await page.screenshot({path:out+'/zoom.png'});await page.evaluate(async()=>{(await import('/src/ui/cardInspection.ts')).closeZoom()});
 const surface=await page.evaluate(async()=>{
  const {cardEl}=await import('/src/ui/cardView.ts'),{captureCardSurface}=await import('/src/ui/cardSurface.ts'),{DB,FRAME_BACK}=await import('/src/shared/cards.ts');
  const host=document.createElement('div');host.className='game';host.style.cssText='position:fixed;left:-4000px;top:0';const source=cardEl({...DB.RUST_SHROOM,uid:'capture-regression'});source.style.cssText='width:180px;height:280px;--cw:180px;--ch:280px';host.append(source);document.body.append(host);
  const ink=document.createElement('canvas');ink.className='card-effect-surface';ink.width=64;ink.height=64;ink.style.cssText='position:absolute;inset:0;width:100%;height:100%';const pen=ink.getContext('2d');pen.fillStyle='#ff0000';pen.fillRect(0,0,64,64);source.querySelector('.card-art').append(ink);
  const {cloneCardNode}=await import('/src/ui/cardClone.ts');const copied=cloneCardNode(source);const clonePixel=[...copied.querySelector('canvas').getContext('2d').getImageData(0,0,1,1).data];if(clonePixel[0]!==255||clonePixel[3]!==255)throw Error('Native flying face lost its cosmetic canvas');const copy=source.cloneNode(true);host.append(copy);
  try{const live=(await captureCardSurface(copy,FRAME_BACK,true,false,source)).face,blank=(await captureCardSurface(copy,FRAME_BACK,true,false)).face;
   copy.querySelector('.card-status').remove();const noIcon=(await captureCardSurface(copy,FRAME_BACK,true,false)).face;
   const diff=(a,b)=>{const x=a.getContext('2d').getImageData(0,0,a.width,a.height).data,y=b.getContext('2d').getImageData(0,0,b.width,b.height).data;let changed=0;for(let i=0;i<x.length;i+=4)if(Math.abs(x[i]-y[i])+Math.abs(x[i+1]-y[i+1])+Math.abs(x[i+2]-y[i+2])>30)changed++;return changed;};
   return{finishPixels:diff(live,blank),iconPixels:diff(blank,noIcon),width:live.width};
  }finally{host.remove();}
 });assert(surface.finishPixels>10000,'cloned cosmetic canvas retains its live pixels');assert(surface.iconPixels>1000,'captured decay plate remains visible');checks.push({surface});
 // The animation print must already carry the final rule-derived tone. Exercise
 // every monster definition for both owners, including immediate CSS resolution.
 const appearance=await page.evaluate(async()=>{
  const {DB,FRAME_BACK}=await import('/src/shared/cards.ts'),{summonFaceFactory}=await import('/src/ui/summon/face.ts'),{fieldVisualState}=await import('/src/ui/fieldVisualState.ts');
  const {captureCardSurface}=await import('/src/ui/cardSurface.ts');
  const host=document.createElement('div');host.className='game';host.style.cssText='position:fixed;left:-4000px;top:0';document.body.append(host);
  let checked=0;const tones={};
  try{
   for(const owner of [0,1])for(const def of Object.values(DB).filter(c=>c.t==='mon')){
    const g=combatTempo.fixture('summon',owner).prev;g.cur=owner;g.pending=null;g.over=undefined;
    const mon={...def,uid:'appearance-'+def.id,exhausted:false,summonedTurn:g.turn,tempAtk:0,atkMod:0,defMod:0,dmg:0};g.players[owner].field=[mon];
    const node=summonFaceFactory(g,owner,0)(mon);host.append(node);
    const actual=getComputedStyle(node.querySelector('.card-art')).filter,expected=fieldVisualState(g,g.players[owner],mon).blocked;
    if(actual.includes('grayscale(1)')!==expected)throw Error(def.id+' does not match native blocked tone: '+actual);
    if(getComputedStyle(node).filter!=='none')throw Error(def.id+' filters its entire printed face');
    tones[node.dataset.summonRest]=(tones[node.dataset.summonRest]||0)+1;checked++;node.remove();
   }
   const {cardEl}=await import('/src/ui/cardView.ts'),{prepareSummonAppearance}=await import('/src/ui/summon/appearance.ts');
   const node=cardEl({...DB.RUST_SHROOM,uid:'tone-pixels'},{field:true});node.dataset.summonRest='plain';prepareSummonAppearance(node);node.style.cssText='width:180px;height:280px;--cw:180px;--ch:280px';host.append(node);
   const art=node.querySelector('.card-art img');await art.decode();
   const plain=(await captureCardSurface(node,FRAME_BACK,true,false)).face;
   node.dataset.summonRest='blocked';const blocked=(await captureCardSurface(node,FRAME_BACK,true,false)).face;
   const sample=c=>c.getContext('2d').getImageData(Math.floor(c.width*.4),Math.floor(c.height*.4),120,120).data;
   const a=sample(plain),b=sample(blocked);let grayError=0,expectedError=0,color=0;
   for(let i=0;i<a.length;i+=4){grayError+=Math.max(b[i],b[i+1],b[i+2])-Math.min(b[i],b[i+1],b[i+2]);expectedError+=Math.abs(b[i]-.57*(.2126*a[i]+.7152*a[i+1]+.0722*a[i+2]));color+=Math.max(a[i],a[i+1],a[i+2])-Math.min(a[i],a[i+1],a[i+2]);}
   return{checked,tones,grayError:grayError/(a.length/4),expectedError:expectedError/(a.length/4),color:color/(a.length/4)};
  }finally{host.remove();}
 });
 assert(appearance.checked>100);assert(appearance.tones.blocked>0&&appearance.tones.ready>0&&appearance.tones.plain>0);assert(appearance.color>5);assert(appearance.grayError<1);assert(appearance.expectedError<2,'capture applies blocked tone once, without retaining full-color art or double dimming');checks.push({appearance});console.log('PASS appearance',appearance);
 for(const id of (process.env.LORE_QA_CARDS?.split(',')||['RUST_SHROOM','RUST_SLUG','POISON_MASTER','CHOSEN_KNIGHT','FIRE_MASTER','HEXER1','MERCENARY','ASSASSIN1','VAMP1','VOID_APOSTLE','NT_SEAL5','SHIELD_TITAN','SALLY_WEAPONMASTER','DUNGEON','GAMBLER','GOLEM1','HALF_ELF','ELF','TAR3','SORTER'])){
  const owner=checks.length%2;console.log('start',id,owner);
  await page.evaluate(({id,owner})=>{window.qaRunning=summonQA(id,owner)}, {id,owner});
  const r=await page.evaluate(()=>qaRunning);assert(r.families.length,`${id} summon was skipped`);assert.equal(r.left,0,`${id} cleanup`);
  for(const b of r.buffers)assert(b.width>=Math.floor(b.cssWidth*b.dpr)&&b.height>=Math.floor(b.cssHeight*b.dpr),`${id} native DPR: ${JSON.stringify(b)}`);
  if(id!=='FIRE_MASTER')assert(r.frames.some(f=>f.layers.some(n=>Number(n.opacity)>0&&Number(n.opacity)<1)),`${id} native handoff`);
  checks.push(r);await fs.writeFile(out+'/progress.json',JSON.stringify(checks,null,2));console.log('PASS',id,r.families, r.buffers);
 }
 for(const mode of ['skip','resize']){const r=await page.evaluate(mode=>summonQA('RUST_SHROOM',0,false,mode),mode);assert.equal(r.left,0);checks.push(r);}
 await page.emulateMedia({reducedMotion:'reduce'});const reduced=await page.evaluate(()=>summonQA('RUST_SHROOM'));assert.equal(reduced.left,0);assert.equal(reduced.families.length,0);checks.push({...reduced,reduced:true});
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({checks,errors,boundary:'Real GameView/BaseController with reducer and redacted snapshots; not authenticated multiplayer.'},null,2));
}finally{await context.close();await browser.close();}
