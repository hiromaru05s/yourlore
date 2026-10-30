import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5589',out=process.env.LORE_TEST_OUT||'/tmp/lore-ambush-rift';
await fs.mkdir(out,{recursive:true});
const temp=await fs.mkdtemp('/tmp/lore-ambush-fixture-');
await build({stdin:{contents:"export {createGame,reduce} from './client/src/shared/engine';export {DB} from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:temp+'/fixture.mjs'});
const {createGame,reduce,DB}=await import(temp+'/fixture.mjs');
const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
try{for(const width of [1280,390]){
 const context=await browser.newContext({viewport:{width,height:width<500?844:900},recordVideo:{dir:out+'/video',size:{width,height:width<500?844:900}}});
 const page=await context.newPage(),errors=[];page.setDefaultTimeout(120000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/Native capture fallback|\[playback\]|Shader Error|GL_INVALID/.test(m.text()))errors.push(m.text());});
 await page.goto(origin+'/cosmetic-studio.html?board=1&runtime=1&set=default&tempo=1');
 await page.waitForFunction(()=>window.combatTempo&&document.querySelector('[data-scene-ready=true]')&&!document.querySelector('.screen-loader'));
 await page.evaluate(()=>document.querySelector('.tempo-controls').style.display='none');
 for(const owner of [0,1]){
  const g=createGame({mode:'bot',seed:71,starting:owner,p0:{id:'qa-me',name:'YOU'},p1:{id:'qa-opp',name:'BOT'}}).state;
  Object.assign(g,{cur:owner,turn:5,phase:'main',pending:null,opening:undefined});
  for(const p of g.players)Object.assign(p,{hand:[],deck:[],field:[],enchants:[],quests:[],traps:[],removed:[],discard:[],exile:[],openingDrawReady:false,hp:60,maxHp:60,mana:20,maxMana:20,shield:0,dew:0,brand:0});
  g.players[1-owner].maxMana=4;
  g.players[owner].hand=[{...DB.AMBUSH,uid:'ambush-source'}];
  g.players[owner].discard=[{...DB.ELF,uid:'old-grave'}];
  const res=reduce(g,{type:'play',idx:0});assert.equal(res.events.find(e=>e.type==='playSpell').dest,'vanish');
  await page.evaluate(async({g,res})=>{
   const c=combatTempo.controller;await c.queue;c.show(g);await new Promise(r=>setTimeout(r,250));
   const result={graveSeen:false,phases:[],riftPhases:[],riftSessions:0,sameFace:true,sourceUid:null,done:false};window.ambushQA=result;
   let face=null,rift=null;const phases=new Set(),riftPhases=new Set();
   const sample=()=>{
    result.graveSeen||=!!document.querySelector('.pile-print [data-card-id="AMBUSH"]');
    const node=document.querySelector('[data-quick-phase]');
    if(node){face??=node;result.sameFace&&=face===node;result.sourceUid=node.dataset.uid;phases.add(node.dataset.quickPhase);}
    const canvas=document.querySelector('.rift-silver-ink-canvas');
    if(canvas){if(canvas!==rift){rift=canvas;result.riftSessions++;}riftPhases.add(canvas.dataset.phase);}
    result.phases=[...phases];result.riftPhases=[...riftPhases];
    if(!result.done)requestAnimationFrame(sample);
   };sample();
   c.applyResult(res);window.ambushRun=c.queue.then(()=>{result.done=true;result.left=document.querySelectorAll('[data-quick-phase],.rift-silver-ink-canvas,.rift-silver-source').length;result.removed=c.state.players[g.cur].removed.map(c=>c.uid);});
  },{g,res});
  await page.waitForFunction(()=>ambushQA.phases.includes('resolving'));
  await page.screenshot({path:`${out}/${width}-${owner}-effects.png`});
  await page.waitForFunction(()=>ambushQA.riftSessions>0);
  await page.screenshot({path:`${out}/${width}-${owner}-rift.png`});
  await page.evaluate(()=>ambushRun);
  const result=await page.evaluate(()=>ambushQA);
  assert.equal(result.graveSeen,false);assert.equal(result.riftSessions,1);assert(result.sameFace);assert.equal(result.sourceUid,'ambush-source');assert(result.phases.includes('exile'));assert(result.riftPhases.includes('リフトへの軌跡'));assert.equal(result.left,0);assert.deepEqual(result.removed,['ambush-source']);
  results.push({width,owner,...result});console.log('PASS Ambush direct Rift',width,owner);
  await page.screenshot({path:`${out}/${width}-${owner}-final.png`});
 }
 assert.deepEqual(errors,[]);await context.close();
 await fs.writeFile(out+'/report.json',JSON.stringify({origin,results,errors,boundary:'Actual adopted board/controller/animations with reducer-produced fixtures; no authenticated PvP or physical device test.'},null,2));
}}finally{await browser.close();await fs.rm(temp,{recursive:true,force:true});}
