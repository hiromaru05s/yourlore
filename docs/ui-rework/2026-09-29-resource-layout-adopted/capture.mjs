import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '/tmp/lore-opening-tools/node_modules/playwright/index.mjs';
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5291';
const out='docs/ui-rework/2026-09-29-resource-layout-adopted';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,timeout:180000,args:['--disable-quic']});
const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});page.setDefaultTimeout(120000);const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.route('**/dew-fixture.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head></head><body><div id="app"></div></body></html>'}));await page.goto(origin+'/dew-fixture.html');
 await page.evaluate(async()=>{
  for(const file of ['tokens','base','card','game-overlays','game','screens','duel-opening','presentation','reading-board'])await import(`/src/styles/${file}.css`);
  const {BaseController}=await import('/src/game/controller.ts');const E=await import('/src/shared/engine.ts');const {DB}=await import('/src/shared/cards.ts');const {startBoardLayout}=await import('/src/ui/layout.ts');const {setLang}=await import('/src/i18n.ts');setLang('ja');
  class Harness extends BaseController {submit(a){this.applyResult(E.reduce(this.state,a),false);}maybeBot(){}}
  const c=new Harness(document.querySelector('#app'),0,{onHome(){},onRematch(){}});c.introShown=true;
  let seq=0;const card=id=>({...DB[id],uid:'qa-'+(++seq)});const mon=id=>({...card(id),dmg:0,exhausted:false,atkMod:0,defMod:0,tempAtk:0,summonedTurn:0});
  const g=E.createGame({mode:'online',seed:31,starting:0,p0:{id:'qa',name:'Seeker A'},p1:{id:'other',name:'Seeker B'}}).state;g.turn=3;g.pending=null;for(const p of g.players)Object.assign(p,{hp:37,dew:0,shield:0,hand:[],deck:[],field:[],mana:30,maxMana:30,enchants:[],traps:[],quests:[]});
  g.players[0].field=[mon('WORLD_TREE'),mon('M1')];g.players[1].field=[mon('M2')];g.players[0].hand=[card('APPRENTICE_ARMORER'),card('HIGH_ELF')];
  window.qa={c,E,DB,card,mon};c.applyResult({state:g,events:[]},false);window.qa.stop=startBoardLayout();
 });
 await page.waitForSelector('.duel-loader',{state:'detached'});await page.waitForSelector('.pt-resources');

 const phase=process.env.CAPTURE_PHASE||'after';
 for(const viewport of [{width:1440,height:900},{width:1920,height:1080},{width:390,height:844},{width:844,height:390}]){
  await page.setViewportSize(viewport);await page.waitForTimeout(1200);
  await page.screenshot({path:`${out}/${phase}-board-${viewport.width}.png`});
  for(const side of ['Me','Opp']){
   const data=await page.locator(`#portrait${side}`).evaluate(el=>{
    const rect=s=>{const r=el.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
    return {ring:rect('.pt-ring'),hp:rect('.pt-hp'),shield:rect('.pt-shield'),dew:rect('.pt-dew')};
   });
   checks.push({viewport,side,...data});
   for(const r of [data.shield,data.dew]){assert(r.x>=0&&r.y>=0&&r.x+r.width<=viewport.width&&r.y+r.height<=viewport.height);}
   const r=data.ring, x=Math.max(0,r.x-r.width*.2), y=Math.max(0,r.y-4);
   await page.screenshot({path:`${out}/${phase}-${side}-${viewport.width}.png`,clip:{x,y,width:Math.min(r.width*1.4,viewport.width-x),height:Math.min(r.height*1.18+8,viewport.height-y)},scale:'css'});
  }
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile(`${out}/${phase}-report.json`,JSON.stringify({origin,checks,errors},null,2));console.log('PASS',phase,checks.length,'portrait layouts');
}finally{await page.evaluate(()=>{qa.c.destroy();qa.stop();}).catch(()=>{});await browser.close();}
