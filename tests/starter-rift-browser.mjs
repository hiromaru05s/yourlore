import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '/tmp/lore-starter-tools/node_modules/playwright/index.mjs';
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5307';
const out='docs/releases/2026-10-26-starter-rift/qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-quic']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(90000);const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.route('**/starter-rift-fixture.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head></head><body><div id="app"></div></body></html>'}));await page.goto(origin+'/starter-rift-fixture.html');
 await page.evaluate(async()=>{
  for(const file of ['tokens','base','card','game-overlays','game','screens','duel-opening','presentation','reading-board'])await import(`/src/styles/${file}.css`);
  const {cardEl,cardRulesEl}=await import('/src/ui/cardView.ts');const {GOBLIN_CARDS}=await import('/src/shared/goblinCards.ts');const {DB}=await import('/src/shared/cards.ts');const {setLang}=await import('/src/i18n.ts');setLang('ja');
  window.catalog={cardEl,cardRulesEl,DB,setLang,ids:['GOBLIN','GHOST','FLAME','RIFT_MATTER']};
  const app=document.querySelector('#app');app.style.cssText='padding:24px;display:grid;grid-template-columns:repeat(4,1fr);gap:24px;grid-auto-rows:max-content;justify-items:center;background:#1b2023;min-height:100vh';
  for(const id of catalog.ids){const c={...DB[id],uid:id};const box=document.createElement('div');const face=cardEl(c,{fullArt:true});face.style.setProperty("--cw","220px");face.style.width="220px";face.style.height="334px";box.append(face);app.append(box);}
  await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));
 });
 await page.screenshot({path:out+'/cards-ja.png',fullPage:true});
 const assets=await page.evaluate(async()=>Promise.all(catalog.ids.map(async id=>{const img=new Image();img.src=`/art/cards/${id}.webp`;await img.decode();return {id,width:img.naturalWidth,height:img.naturalHeight};})));assert(assets.every(x=>x.width>0&&x.height>0));assert(assets.filter(x=>x.id==='RIFT_MATTER').every(x=>x.width===1472&&x.height===1344));checks.push('Four card images decode');
 await page.evaluate(()=>{const app=document.querySelector('#app');app.replaceChildren();app.style.gridTemplateColumns='repeat(4,1fr)';for(const id of ['GOBLIN','GHOST','FLAME','RIFT_MATTER']){const box=document.createElement('section');box.append(catalog.cardEl({...catalog.DB[id],uid:id}),catalog.cardRulesEl({...catalog.DB[id],uid:id}));app.append(box);}});
 await page.screenshot({path:out+'/rules-ja.png',fullPage:true});checks.push('Full rules rendered through production card renderer');
 await page.reload();
 await page.evaluate(async()=>{
  for(const file of ['tokens','base','card','game-overlays','game','screens','duel-opening','presentation','reading-board'])await import(`/src/styles/${file}.css`);
  const {BaseController}=await import('/src/game/controller.ts');const E=await import('/src/shared/engine.ts');const {DB}=await import('/src/shared/cards.ts');const {startBoardLayout}=await import('/src/ui/layout.ts');const {setLang}=await import('/src/i18n.ts');setLang('ja');
  class Harness extends BaseController {submit(a){this.applyResult(E.reduce(this.state,a),true);}maybeBot(){}}
  const c=new Harness(document.querySelector('#app'),0,{onHome(){},onRematch(){}});c.introShown=true;
  let seq=0;const card=id=>({...DB[id],uid:'qa-'+(++seq)});const mon=id=>({...card(id),dmg:0,exhausted:false,atkMod:0,defMod:0,tempAtk:0,summonedTurn:0});
  const g=E.createGame({mode:'online',seed:31,starting:0,p0:{id:'qa',name:'Seeker A'},p1:{id:'other',name:'Seeker B'}}).state;g.turn=3;g.pending=null;for(const p of g.players)Object.assign(p,{hp:100,dew:0,shield:0,hand:[],deck:[],discard:[],field:[],mana:30,maxMana:30,enchants:[],traps:[],quests:[]});
  g.players[0].field=[mon('GOBLIN'),mon('GHOST')];g.players[1].field=[mon('M1'),mon('M2')];g.players[1].enchants=[{card:card('GOBLIN_SETTLEMENT'),turns:99,bornTurn:0}];g.players[0].discard=[card('RIFT_MATTER')];g.players[0].hand=[card('PURGE_TOUCH'),card('FLAME')];
  window.qa={c,E,DB,card,mon};c.applyResult({state:g,events:[]},false);window.qa.stop=startBoardLayout();
 });
 await page.waitForSelector('.duel-loader',{state:'detached'});await page.waitForSelector('.pt-vitals');await page.evaluate(()=>qa.c.queue);
 await page.screenshot({path:out+'/board-before.png'});
 await page.evaluate(()=>qa.c.submit({type:'play',idx:0}));await page.evaluate(()=>qa.c.queue);
 await page.locator('.picker-modal .card').first().click();
 await page.evaluate(()=>qa.c.queue);await page.waitForFunction(()=>qa.c.state.pending?.reason==='RIFT_MATTER');
 await page.waitForSelector('.picker-modal .card');
 await page.waitForTimeout(400);await page.screenshot({path:out+'/rift-choice.png'});
 assert.equal(await page.locator('.picker-modal .card').count(),3);
 await page.locator('.picker-modal .card').first().click();await page.locator('.picker-modal .btn-gold').click();
 await page.evaluate(()=>qa.c.queue);await page.waitForFunction(()=>qa.c.state.pending?.data?.left===1);
 await page.locator('.picker-modal .card').first().click();await page.locator('.picker-modal .btn-gold').click();
 await page.evaluate(()=>qa.c.queue);await page.waitForFunction(()=>qa.c.state.pending===null);
 assert.equal(await page.evaluate(()=>qa.c.state.players[1].removed.length),2);
 checks.push('Production controller and actual picker clicks resolve Rift Matter twice');
 await page.screenshot({path:out+'/board-after.png'});
 await page.setViewportSize({width:1024,height:768});await page.waitForTimeout(400);await page.screenshot({path:out+'/board-1024.png'});
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/browser-report.json',JSON.stringify({origin,evidence:'local fixture, production renderer/controller, no authenticated online match',checks,assets,errors},null,2));console.log('PASS',checks);
}catch(error){await page.screenshot({path:out+'/failure.png'}).catch(()=>{});console.error(errors);throw error;}finally{await page.evaluate(()=>{window.qa?.c.destroy();window.qa?.stop();}).catch(()=>{});await browser.close();}
