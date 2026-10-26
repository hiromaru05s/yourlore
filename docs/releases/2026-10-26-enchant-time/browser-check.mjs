import {chromium} from '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const out=new URL('./qa/',import.meta.url).pathname;await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],checks=[];let video;
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1,recordVideo:{dir:out+'video',size:{width:1280,height:890}}});video=page.video();page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/enchant-time-live-qa',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="ja"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>'}));
 await page.goto('http://127.0.0.1:5610/enchant-time-live-qa');
 await page.evaluate(async()=>{
  await Promise.all(['tokens','base','card','game-overlays','game','screens','reading-board','presentation'].map(name=>import('/src/styles/'+name+'.css?import')));
  const {GameView,setMyAvatar,setOppAvatar}=await import('/src/ui/boardView.ts'),{createGame,reduce}=await import('/src/shared/engine.ts'),{DB,STARTERS}=await import('/src/shared/cards.ts'),{setLang}=await import('/src/i18n.ts'),{startBoardLayout}=await import('/src/ui/layout.ts'),{waitForDuel}=await import('/src/ui/duelReadiness.ts');
  setLang('ja');setMyAvatar(null);setOppAvatar(null);const root=document.getElementById('app'),noop=()=>{};
  document.body.style.cssText='margin:0;overflow:hidden;background:#f2eee8';
  const view=new GameView(root,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
  let g=createGame({mode:'online',seed:71,starting:0,p0:{id:'local-qa',name:'YOU'},p1:{id:'local-qa-opp',name:'OPPONENT'}}).state;g.turn=10;g.cur=1;g.phase='main';g.pending=null;
  const mon=(id,uid,extra={})=>({...DB[id],uid,exhausted:false,summonedTurn:0,dmg:0,tempAtk:0,atkMod:0,defMod:0,...extra});
  for(const [side,p]of g.players.entries()){
   p.openingDrawReady=false;p.mana=12;p.maxMana=12;p.hp=30;p.quests=[];p.traps=[];
   p.field=[mon('GOLEM1',`golem-${side}`,{guts:3}),mon('M4',`decay-${side}`,{decayCnt:2}),mon('DRAGON_EGG',`dragon-${side}`,{hatch:5,dur:4}),mon('BEAST_EGG',`beast-${side}`,{hatch:6,dur:3}),mon('CASTLE',`castle-${side}`,{gcount:3})];
   p.enchants=[['BLOOD_RITE',99,3],['ANCIENT_CIV',99,4],['BREWING',3,3],['E2',2,3],['FARM',1,3],['MANA_BACKFLOW',3,3],['GUILD_CO',99,3]].map(([id,turns,bornTurn])=>({card:{...DB[id],uid:`${id}-${side}`},turns,bornTurn,...(['BREWING','GUILD_CO'].includes(id)?{cnt:8}:{})}));
   p.hand=['STARTER_CHEST','STARTER_TRASH','STARTER_MANA','EXPANSION'].map((id,i)=>({...DB[id]||STARTERS[id],uid:`hand-${side}-${i}`}));
  }
  await view.render(g);const stop=startBoardLayout();await waitForDuel(root);
  window.counterLiveQA={view,get state(){return g;},async act(a){const r=reduce(g,a);g=r.state;await view.render(g);return r.events;},async patch(fn){fn(g);await view.render(g);},async gutsCombat(){g.pending=null;g.cur=1;g.players[0].field=[mon('GOLEM1','survivor',{guts:3})];g.players[1].field=[mon('M4','striker',{atk:99})];await view.render(g);let r=reduce(g,{type:'attack',uid:'striker'});g=r.state;if(g.pending){r=reduce(g,{type:'pick',uid:'survivor'});g=r.state;}await view.render(g);return r.events;},dispose(){stop();view.destroy();}};
 });
 await page.waitForTimeout(150);
 const time=(id,side=0)=>page.locator(`[data-uid="${id}-${side}"] .enchant-time`);
 const advance=()=>page.evaluate(async()=>{await counterLiveQA.act({type:'endTurn'});if(counterLiveQA.state.pending?.reason==='handCap')await counterLiveQA.act({type:'endTurn'});});
 assert.equal(await page.locator('.zone-st .enchant-time').count(),12);assert.equal(await page.locator('.zone-st .buff-duration').count(),0);assert.equal(await page.locator('.zone-st .buff-infinity').count(),2);assert.equal(await page.locator('.zone-st .card-counter').count(),4);
 assert.equal(await time('BLOOD_RITE').getAttribute('data-time-remaining'),'3');assert.equal(await time('ANCIENT_CIV').getAttribute('data-time-remaining'),'3');assert.equal(await time('BREWING').getAttribute('data-time-fill'),'0.5');
 await page.screenshot({path:out+'board-desktop.png'});checks.push('actual GameView: both sides, selected round fill, shared resource counters and infinity, no legacy text plaque');
 await advance();
 assert.equal(await time('BLOOD_RITE').getAttribute('data-time-remaining'),'2');assert.equal(await time('ANCIENT_CIV').getAttribute('data-time-remaining'),'2');assert.equal(await time('BREWING').getAttribute('data-time-remaining'),'2');assert.equal(await time('MANA_BACKFLOW').getAttribute('data-time-remaining'),'2');assert.equal(await time('MANA_BACKFLOW',1).getAttribute('data-time-remaining'),'3');assert.equal(await time('FARM').count(),0);
 await page.waitForTimeout(150);await page.screenshot({path:out+'time-moving.png'});await page.waitForTimeout(450);assert(Math.abs(Number(await time('BREWING').getAttribute('data-time-position'))-2/3)<1e-8);checks.push('real engine: global clocks advance; owner-start Brewing advances and Farm resolves; Mana uses the actual owner-start clock');
 await advance();assert.equal(await time('BREWING').getAttribute('data-time-remaining'),'2');assert.equal(await time('MANA_BACKFLOW').getAttribute('data-time-remaining'),'2');
 await advance();assert.equal(await time('ANCIENT_CIV').count(),0);assert.equal(await time('BLOOD_RITE').count(),0);checks.push('actual threshold resolves Ancient Civilization and expires Blood Rite without UI icons');
 await page.evaluate(()=>counterLiveQA.patch(g=>{g.players[0].enchants.find(e=>e.card.id==='BREWING').turns=0;}));await page.waitForTimeout(600);assert.equal(await time('BREWING').locator('text').textContent(),'0');assert.equal(await time('BREWING').locator('path').count(),1);assert.equal(await time('BREWING').locator('.enchant-time-level').getAttribute('height'),'46');await page.screenshot({path:out+'full-zero.png'});
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(80);await page.screenshot({path:out+'board-landscape.png'});await page.setViewportSize({width:390,height:844});await page.waitForTimeout(80);await page.screenshot({path:out+'board-mobile.png'});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>counterLiveQA.patch(g=>{g.players[0].enchants.find(e=>e.card.id==='BREWING').turns=3;}));assert.equal(await time('BREWING').getAttribute('data-time-position'),'0.5');
 await page.evaluate(()=>counterLiveQA.dispose());checks.push('zero/full stays numeric with no secondary glyph; desktop/landscape/mobile; reduced motion; teardown');assert.deepEqual(errors,[]);await fs.writeFile(out+'browser.json',JSON.stringify({checks,errors,limits:'Local actual GameView and shared-engine checks; no authenticated online match.'},null,2));console.log('PASS',checks);
}finally{await browser.close();if(video)await fs.rename(await video.path(),out+'board-continuous.webm');}
