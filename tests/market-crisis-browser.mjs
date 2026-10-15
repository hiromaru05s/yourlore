import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5613',out=process.env.LORE_TEST_OUT||'/tmp/crisis-runtime-qa';await fs.mkdir(out,{recursive:true});
const bundle=await build({stdin:{contents:"export * from './client/src/shared/engine';export {DB} from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {createGame,reduce,DB}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const fixtures={};
for(const side of [0,1]){
 const g=createGame({mode:'bot',seed:719,starting:side,p0:{id:'self',name:'YOU'},p1:{id:'opponent',name:'OPPONENT'}}).state;
 g.turn=3;g.cur=side;g.phase='main';g.pending=null;g.opening=undefined;
 for(const [i,p]of g.players.entries())Object.assign(p,{field:[{...DB.ELF,uid:`elf-${i}`,exhausted:false,summonedTurn:0,dmg:0,tempAtk:0,atkMod:0,defMod:0}],enchants:[],traps:[],quests:[],hand:[],deck:[],discard:[],removed:[],hp:30,mana:20,maxMana:20,shield:0,dew:0,brand:0,openingDrawReady:false});
 g.players[side].hand=[{...DB.MARKET_CRISIS,uid:`crisis-${side}`}];fixtures[side]={g,res:reduce(g,{type:'play',idx:0})};
}
const browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:process.env.LORE_RECORD?{dir:out+'/video',size:{width:1280,height:900}}:undefined});const p=await context.newPage();p.setDefaultTimeout(120000);const errors=[],checks=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto(origin+'/cosmetic-studio.html?board=1&runtime=1&set=default&tempo=1');await p.waitForFunction(()=>window.combatTempo&&document.querySelector('[data-scene-ready=true]'));
 await p.evaluate(fixtures=>{
  document.querySelector('.tempo-controls')?.remove();
  window.crisisRun=async(side,mode)=>{
   const c=combatTempo.controller;c.fastForward();await c.queue;c.stopTimer();c.introShown=true;
   const {g,res}=structuredClone(fixtures[side]);c.timerKey=`${g.turn}:${g.cur}`;c.show(g);c.view.setHandOpen(false);
   await Promise.all([...document.querySelectorAll('#fixedMarket img')].map(img=>img.decode().catch(()=>{})));
   await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   const source=[...document.querySelectorAll('#fixedMarket>.card')].map(n=>({uid:n.dataset.uid,src:n.querySelector('.card-art-img')?.currentSrc,filter:getComputedStyle(n).filter}));
   const frames=[];window.crisisFrames=frames;let running=true,interrupted=false,cycles=0,lastFx=null;
   const observe=()=>{
    const fx=document.querySelector('.crisis-native-break'),cards=[...document.querySelectorAll('#fixedMarket>.card')],pieces=[...document.querySelectorAll('.crisis-fragment')].filter(n=>n.style.display!=='none');
    if(fx&&fx!==lastFx)cycles++;lastFx=fx;
    const age=Number(fx?.dataset.time||0);
    frames.push({fx:!!fx,age,shown:cards.map(n=>n.dataset.uid),hidden:cards.filter(n=>getComputedStyle(n).visibility==='hidden').length,pieces:pieces.length,
     oldFaces:pieces.every(n=>source.some(s=>s.uid===n.dataset.sourceUid&&s.src===n.querySelector('.card-art-img')?.currentSrc&&s.filter===getComputedStyle(n).filter)),
     clipped:pieces.every(n=>getComputedStyle(n).clipPath.startsWith('polygon(')),
     geometry:pieces.every(n=>{const a=n.getBoundingClientRect(),s=cards.find(c=>c.dataset.uid===n.dataset.sourceUid)?.getBoundingClientRect();return s&&a.width<=Math.hypot(s.width,s.height)*1.03&&a.height<=Math.hypot(s.width,s.height)*1.03}),
     generic:document.querySelectorAll('.spell-frame-resonance').length});
    if(fx&&age>300&&!interrupted&&['skip','resize','hidden','destroy'].includes(mode)){interrupted=true;if(mode==='skip')c.fastForward();if(mode==='resize')window.dispatchEvent(new Event('resize'));if(mode==='hidden'){Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))}if(mode==='destroy')c.destroy();}
    if(running)requestAnimationFrame(observe);
   };observe();c.applyResult(res);await c.queue;c.stopTimer();running=false;if(mode==='hidden'){delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))}
   return{frames,cycles,before:g.market.map(c=>c.uid),after:res.state.market.map(c=>c.uid),shown:[...document.querySelectorAll('#fixedMarket>.card')].map(n=>n.dataset.uid),remaining:document.querySelectorAll('.crisis-native-break,.crisis-fragment').length,hidden:[...document.querySelectorAll('#fixedMarket>.card')].filter(n=>getComputedStyle(n).visibility==='hidden'||Number(getComputedStyle(n).opacity)<1).length};
  };
 },fixtures);
 for(const [width,side,mode] of [[1280,0,'normal'],[1280,1,'normal'],[390,0,'normal'],[844,1,'normal'],[1280,0,'reduced'],[1280,0,'skip'],[1280,1,'resize'],[1280,0,'hidden'],[1280,0,'normal'],[1280,0,'destroy']]){
  console.log('case',width,side,mode);await p.setViewportSize({width,height:width===390?844:width===844?390:900});await p.emulateMedia({reducedMotion:mode==='reduced'?'reduce':'no-preference'});
  await p.evaluate(args=>{window.crisisPlaying=crisisRun(...args)},[side,mode]);
  if(mode==='normal'){await p.waitForFunction(()=>Number(document.querySelector('.crisis-native-break')?.dataset.time)>250);await p.screenshot({path:`${out}/${width}-${side}-fracture.png`});}
  const r=await p.evaluate(()=>crisisPlaying);await fs.writeFile(`${out}/${width}-${side}-${mode}.json`,JSON.stringify(r));
  assert.equal(r.remaining,0);assert.equal(r.hidden,0);if(mode!=='destroy')assert.deepEqual(r.shown,r.after);
  assert(r.frames.every(f=>f.generic===0));assert(r.frames.every(f=>f.oldFaces&&f.clipped&&f.geometry));
  const active=r.frames.filter(f=>f.fx);active.forEach(f=>assert.deepEqual(f.shown,r.before));
  if(mode==='normal'){
   assert.equal(r.cycles,1);assert(active.some(f=>f.pieces===112));assert(active.some(f=>f.age>=1080&&f.age<1200&&f.pieces===0&&f.hidden===7),'blank interval before replacement');
   assert(active.filter(f=>f.age>=100).every(f=>f.hidden===7));
   await p.screenshot({path:`${out}/${width}-${side}-after.png`});
  }
  if(mode==='reduced'){assert.equal(r.cycles,0);assert(r.frames.some(f=>f.hidden===7));}
  checks.push({width,side,mode,cycles:r.cycles});
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({passed:true,origin,scope:'Public fixture using real controller and reducer; not authenticated online play',checks,errors},null,2));console.log('PASS',checks.length,'Economic Crisis runtime cases');
}finally{await browser.close()}
