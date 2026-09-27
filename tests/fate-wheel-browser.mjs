import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '/tmp/lore-opening-tools/node_modules/playwright/index.mjs';
const origin=process.env.LORE_TEST_ORIGIN||'http://localhost:5216',out=process.env.LORE_TEST_OUTPUT||'docs/fixes/2026-09-27-fate-wheel/checks';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:900}});page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.route('**/fate-fixture.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head></head><body><div id="app"></div></body></html>'}));await page.goto(origin+'/fate-fixture.html');
 await page.evaluate(async()=>{
  for(const f of ['tokens','base','card','game-overlays','game','screens','duel-opening','presentation','reading-board'])await import(`/src/styles/${f}.css`);
  const {BaseController}=await import('/src/game/controller.ts');const {createGame,reduce}=await import('/src/shared/engine.ts');const {DB,STARTERS}=await import('/src/shared/cards.ts');const {setLang}=await import('/src/i18n.ts');const {startBoardLayout}=await import('/src/ui/layout.ts');setLang('ja');
  class Harness extends BaseController{submit(a){const r=reduce(this.state,a);window.lastEvents=r.events;this.applyResult(r,false);}maybeBot(){}}
  const c=new Harness(document.querySelector('#app'),0,{onHome(){},onRematch(){}});const g=createGame({mode:'online',seed:41,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=3;g.phase='main';g.pending=null;
  for(const p of g.players)Object.assign(p,{hp:200,mana:30,maxMana:30,hand:[],deck:[],discard:[],field:[],traps:[],enchants:[],quests:[]});
  g.players[0].enchants=[{card:{...DB.FATE_WHEEL,uid:'wheel'},turns:99,bornTurn:1}];g.players[0].hand=Array.from({length:3},(_,i)=>({...STARTERS.STARTER_CHEST,uid:'chest-'+i}));c.introShown=true;c.applyResult({state:g,events:[]},false);window.qa=c;window.stopLayout=startBoardLayout();
 });
 await page.waitForSelector('#hand .card');await page.evaluate(()=>window.qa.queue);await page.waitForSelector('.fx-turnbanner',{state:'detached'});
 await page.evaluate(()=>window.qa.onPlay(window.qa.state.players[0].hand[0].uid));await page.getByRole('button',{name:'結果を維持',exact:true}).waitFor();await page.screenshot({animations:'disabled',path:out+'/chest-offer.png'});const before=await page.evaluate(()=>JSON.stringify(window.qa.state.players));
 await page.getByRole('button',{name:'結果を維持',exact:true}).click();await page.waitForFunction(()=>!window.qa.state.pending);assert.equal(await page.evaluate(()=>JSON.stringify(window.qa.state.players)),before);assert.equal(await page.evaluate(()=>window.qa.state._wheelSnap),null);
 await page.evaluate(()=>window.qa.queue);await page.evaluate(()=>window.qa.onPlay(window.qa.state.players[0].hand[0].uid));await page.getByRole('button',{name:'振り直す',exact:true}).waitFor();await page.getByRole('button',{name:'振り直す',exact:true}).click();await page.waitForFunction(()=>window.qa.state.players[0].wheelUsed);await page.evaluate(()=>window.qa.queue);assert.equal(await page.locator('.modal').count(),0);assert.equal(await page.evaluate(()=>window.qa.state.players[0].hand.length),1);assert.equal(await page.evaluate(()=>window.lastEvents.filter(e=>e.type==='dice').length),1);
 await page.evaluate(()=>window.qa.onPlay(window.qa.state.players[0].hand[0].uid));await page.evaluate(()=>window.qa.queue);assert.equal(await page.locator('.modal').count(),0);assert.equal(await page.evaluate(()=>window.qa.state.pending),null);await page.screenshot({animations:'disabled',path:out+'/rerolled-board.png'});
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/browser-report.json',JSON.stringify({origin,checks:['actual controller chest play opens Fate Wheel dialog','keep closes and preserves resolved result without duplicate reward','reroll replays dice once, consumes one card and closes dialog','subsequent same-turn chest has no second reroll'],errors},null,2)+'\n');console.log('PASS actual controller + Fate Wheel dialog keep/reroll/once-per-turn');await page.evaluate(()=>{window.qa.destroy();window.stopLayout();});
}catch(e){await page.screenshot({animations:'disabled',path:out+'/failure.png'});throw e;}finally{await browser.close();}
