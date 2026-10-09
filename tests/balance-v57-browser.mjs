import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {build} from 'esbuild';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5199';
const out=process.env.LORE_TEST_OUT||'/tmp/lore-v57-browser';
await fs.mkdir(out,{recursive:true});
const tmp=await fs.mkdtemp(path.join(tmpdir(),'lore-v57-browser-'));
await build({stdin:{contents:"export * from './client/src/shared/engine'; export * from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:tmp+'/game.mjs'});
const {DB,createGame,reduce}=await import(tmp+'/game.mjs');
function fixture(owner,target){
 for(let seed=1;seed<=100;seed++){
  const g=createGame({mode:'online',seed,starting:owner,p0:{id:'qa-me',name:'YOU'},p1:{id:'qa-opp',name:'OPPONENT'}}).state;
  g.cur=owner;g.turn=3;g.phase='main';g.pending=null;g.rng=seed;
  for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],removed:[],field:[],enchants:[],quests:[],traps:[],hp:80,dew:0,shield:0,mana:20,maxMana:20,openingDrawReady:false});
  g.players[owner].field=[{...structuredClone(DB.NGA4),uid:'fiend',dmg:0,exhausted:false,tempAtk:0,atkMod:0,defMod:0,summonedTurn:0}];
  const res=reduce(g,{type:'attack',uid:'fiend'}),e=res.events.find(e=>e.type==='attack');
  if(e.targetPlayer===target){assert.equal(res.state.players[target].hp,73);return {prev:g,res};}
 }
 throw Error('No fixture');
}
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:out+'/video',size:{width:1280,height:900}}});
const page=await context.newPage();page.setDefaultTimeout(60000);
const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error'&&e.text().includes('[playback]'))errors.push(e.text());});
try{
 await page.goto(origin+'/cosmetic-studio.html?board=1&runtime=1&set=default');
 await page.waitForFunction(()=>window.atelier&&document.querySelector('[data-scene-ready=true]'));
 for(const width of [1280,390]){
  await page.setViewportSize({width,height:width===390?844:900});
  for(const [owner,target] of [[0,0],[1,1],[0,1]]){
   await page.evaluate(async f=>{const c=atelier.controller;c.show(f.prev);await new Promise(r=>setTimeout(r,300));c.applyResult(f.res);window.v57Playback=c.queue;},fixture(owner,target));
   await page.waitForSelector('canvas[data-elemental=berserk]');
   await page.waitForFunction(()=>+document.querySelector('canvas[data-elemental=berserk]')?.dataset.impact>=0);
   await page.screenshot({path:`${out}/fiend-${width}-${owner}-to-${target}.png`});
   await page.evaluate(()=>window.v57Playback);
   assert.equal(await page.locator('.element-overlay,.element-surface').count(),0);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   checks.push({width,owner,target,self:owner===target});
  }
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/browser-report.json',JSON.stringify({origin,checks,errors,boundary:'Real controller and renderers with shared-reducer fixtures; not an authenticated online match.'},null,2));
 console.log('PASS',checks.length,'Berserk player-target runtime cases',out);
}finally{await context.close();await page.video().saveAs(out+'/playback.webm');await browser.close();await fs.rm(tmp,{recursive:true,force:true});}
