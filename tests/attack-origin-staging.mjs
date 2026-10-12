import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {tmpdir} from 'node:os';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'https://test.yourlore.xyz',out=process.env.LORE_TEST_OUT||'/tmp/lore-attack-origin-staging';await fs.mkdir(out,{recursive:true});
const tmp=await fs.mkdtemp(tmpdir()+'/lore-attack-stage-');
await build({stdin:{contents:"export * from './client/src/shared/engine';export {DB} from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:tmp+'/engine.mjs'});
const {createGame,reduce,DB}=await import(tmp+'/engine.mjs');
function fixture(kind,side){for(let seed=1;seed<100;seed++){
 const g=createGame({mode:'online',seed,starting:side,p0:{id:'origin-a',name:'YOU'},p1:{id:'origin-b',name:'OPPONENT'}}).state;g.turn=3;g.cur=side;g.pending=null;
 const mon=(id,uid)=>({...DB[id],uid,atk:3,def:40,dmg:0,exhausted:false,atkMod:0,defMod:0,tempAtk:0,summonedTurn:0});
 for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],removed:[],field:[],enchants:[],traps:[],quests:[],hp:80,maxHp:80,mana:20,maxMana:20,openingDrawReady:false});
 g.players[side].field=[mon('M1','origin-source')];g.players[1-side].field=[mon('M2','origin-target')];
 if(kind==='FIRE_ARROW')g.players[side].hand=[{...DB.FIRE_ARROW,uid:'origin-spell'}];
 let prev=g,res=reduce(g,kind==='attack'?{type:'attack',uid:'origin-source'}:{type:'play',idx:0});
 if(res.state.pending){prev=res.state;res=reduce(prev,{type:'pick',uid:'origin-target'});}
 if(kind==='FIRE_ARROW'){const e=res.events.find(e=>e.type==='elementalStart');if(!e?.targets.some(t=>t.uid===null)||!e.targets.some(t=>t.uid==='origin-target'))continue;}
 assert(res.events.some(e=>e.type===(kind==='attack'?'attack':'elementalStart')));return {prev,res,side,kind};
 }throw Error('No mixed random-hit fixture');}
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(90000);const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error'&&e.text().includes('[playback]'))errors.push(e.text());});
try{
 await page.goto(origin+'/cosmetic-studio.html?board=1&runtime=1&set=default');await page.waitForFunction(()=>window.atelier&&document.querySelector('[data-scene-ready=true]'));
 for(const width of [1280,390])for(const side of [0,1])for(const kind of ['attack','FIRE_ARROW']){
  await page.setViewportSize({width,height:width===390?844:900});
  const result=await page.evaluate(async f=>{
   const c=atelier.controller;c.show(f.prev);await new Promise(r=>setTimeout(r,250));
   const target=document.querySelector('.zone-mon .card[data-uid="origin-target"]'),copy=target.cloneNode(true);copy.style.display='none';document.body.prepend(copy);
   let invalidReads=0,liveReads=0;const original=target.getBoundingClientRect.bind(target);copy.getBoundingClientRect=()=>{invalidReads++;return new DOMRect(0,0,0,0);};target.getBoundingClientRect=()=>{liveReads++;return original();};
   let watching=true,elemental=false,physical=false;const tick=()=>{elemental||=!!document.querySelector('canvas[data-elemental]');physical||=!!document.querySelector('[data-monster-kind=attack]');if(watching)requestAnimationFrame(tick);};requestAnimationFrame(tick);
   try{c.applyResult(f.res);await c.queue;return {invalidReads,liveReads,elemental,physical,hp:c.state.players.map(p=>p.hp),dmg:c.state.players[1-f.side].field[0].dmg,remaining:document.querySelectorAll('.element-overlay,.element-surface,[data-layer-policy=foreground]').length};}finally{watching=false;copy.remove();}
  },fixture(kind,side));
  assert.equal(result.invalidReads,0,'deployed combat must never measure hidden duplicate');assert(result.liveReads>0);assert(kind==='attack'?result.physical:result.elemental);assert.equal(result.remaining,0);assert.equal(result.dmg,fixture(kind,side).res.state.players[1-side].field[0].dmg);checks.push({width,side,kind,...result});await page.screenshot({path:`${out}/${kind}-${width}-${side}.png`});
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({origin,checks,errors,boundary:'Unmodified deployed bundles via the existing runtime studio controller, authoritative reducer fixtures and controlled hidden duplicate UIDs. No authenticated online match.'},null,2));console.log('PASS deployed attack-origin:',checks.length,'cases');
}finally{await browser.close();await fs.rm(tmp,{recursive:true,force:true});}
