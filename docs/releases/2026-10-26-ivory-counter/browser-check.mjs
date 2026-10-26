import {chromium} from '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const out=new URL('./qa/',import.meta.url).pathname;await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],checks=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/counter-live-qa',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="ja"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>'}));
 await page.goto('http://127.0.0.1:5610/counter-live-qa');
 await page.evaluate(async()=>{
  await Promise.all(['tokens','base','card','game-overlays','game','screens','reading-board','presentation'].map(name=>import('/src/styles/'+name+'.css?import')));
  const {GameView,setMyAvatar,setOppAvatar}=await import('/src/ui/boardView.ts'),{createGame,reduce}=await import('/src/shared/engine.ts'),{DB,STARTERS}=await import('/src/shared/cards.ts'),{setLang}=await import('/src/i18n.ts'),{startBoardLayout}=await import('/src/ui/layout.ts'),{waitForDuel}=await import('/src/ui/duelReadiness.ts');
  setLang('ja');setMyAvatar(null);setOppAvatar(null);const root=document.getElementById('app'),noop=()=>{};
  document.body.style.cssText='margin:0;overflow:hidden;background:#f2eee8';
  const view=new GameView(root,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
  let g=createGame({mode:'online',seed:71,starting:0,p0:{id:'local-qa',name:'YOU'},p1:{id:'local-qa-opp',name:'OPPONENT'}}).state;g.turn=3;g.phase='main';g.pending=null;
  const mon=(id,uid,extra={})=>({...DB[id],uid,exhausted:false,summonedTurn:0,dmg:0,tempAtk:0,atkMod:0,defMod:0,...extra});
  for(const [side,p]of g.players.entries()){
   p.openingDrawReady=false;p.mana=12;p.maxMana=12;p.hp=30;p.quests=[];p.traps=[];
   p.field=[mon('GOLEM1',`golem-${side}`,{guts:3}),mon('M4',`decay-${side}`,{decayCnt:2}),mon('DRAGON_EGG',`dragon-${side}`,{hatch:5,dur:4}),mon('BEAST_EGG',`beast-${side}`,{hatch:6,dur:3}),mon('CASTLE',`castle-${side}`,{gcount:3})];
   p.enchants=[{card:{...DB.GUILD_CO,uid:`guild-${side}`},turns:99,cnt:12}];
   p.hand=['STARTER_CHEST','STARTER_TRASH','STARTER_MANA','EXPANSION'].map((id,i)=>({...DB[id]||STARTERS[id],uid:`hand-${side}-${i}`}));
  }
  await view.render(g);const stop=startBoardLayout();await waitForDuel(root);
  window.counterLiveQA={view,get state(){return g;},async act(a){const r=reduce(g,a);g=r.state;await view.render(g);return r.events;},async patch(fn){fn(g);await view.render(g);},async gutsCombat(){g.pending=null;g.cur=1;g.players[0].field=[mon('GOLEM1','survivor',{guts:3})];g.players[1].field=[mon('M4','striker',{atk:99})];await view.render(g);let r=reduce(g,{type:'attack',uid:'striker'});g=r.state;if(g.pending){r=reduce(g,{type:'pick',uid:'survivor'});g=r.state;}await view.render(g);return r.events;},dispose(){stop();view.destroy();}};
 });
 await page.waitForTimeout(150);assert.equal(await page.locator('.zone-mon .card-counter').count(),10);assert.equal(await page.locator('.zone-mon .ad-def--durability').count(),4);assert.equal(await page.locator('.zone-st .card-counter').count(),2);assert.equal(await page.locator('.zone-mon .ec-h,.zone-mon .ec-d,.buff-counter').count(),0);
 const ratios=await page.locator('.zone-mon .card-counter[data-counter-index="0"]').evaluateAll(nodes=>nodes.map(n=>{const c=n.closest('.card');return n.getBoundingClientRect().width/Math.max(...[...c.querySelectorAll('.card-cost,.ad-atk,.ad-def')].map(s=>s.getBoundingClientRect().width));}));assert(ratios.every(r=>r>1.2));
 await page.screenshot({path:out+'board-desktop.png'});checks.push('actual GameView, both sides, all field/spell counters, black durability, size ratios');
 await page.evaluate(()=>counterLiveQA.patch(g=>{g.players[0].enchants[0].cnt=16;}));
 const guild=page.locator('[data-uid="guild-0"] .card-counter');assert.equal(await guild.getAttribute('data-counter-value'),'16');await page.waitForTimeout(600);assert.equal(await guild.getAttribute('data-counter-position'),'16');
 await page.screenshot({path:out+'permanent-counters.png'});
 await page.evaluate(()=>counterLiveQA.patch(g=>{delete g.players[0].enchants[0].cnt;}));await page.waitForTimeout(600);assert.equal(await guild.getAttribute('data-counter-position'),'0');checks.push('permanent Guild +4 uses same slot animation and remains visible at zero');
 await page.evaluate(()=>counterLiveQA.act({type:'play',idx:3}));
 assert.equal(await page.evaluate(()=>counterLiveQA.state.players[0].field.find(m=>m.id==='CASTLE').gcount),8);
 const castle=page.locator('[data-uid="castle-0"] .card-counter');assert.equal(await castle.getAttribute('data-counter-value'),'8');await page.waitForTimeout(150);await page.screenshot({path:out+'castle-gain-moving.png'});await page.waitForTimeout(450);assert.equal(await castle.getAttribute('data-counter-position'),'8');
 await page.evaluate(()=>counterLiveQA.act({type:'endTurn'}));assert.equal(await page.evaluate(()=>counterLiveQA.state.players[0].field.find(m=>m.id==='DRAGON_EGG').hatch),4);await page.waitForTimeout(600);assert.equal(await page.locator('[data-uid="dragon-0"] [data-counter-kind="hatch"]').getAttribute('data-counter-position'),'4');checks.push('real shared-engine Expansion +5 and turn-start hatch decrement');
 await page.evaluate(()=>counterLiveQA.gutsCombat());assert.equal(await page.evaluate(()=>counterLiveQA.state.players[0].field[0].guts),2);await page.waitForTimeout(600);assert.equal(await page.locator('[data-uid="survivor"] [data-counter-kind="guts"]').getAttribute('data-counter-position'),'2');checks.push('actual lethal combat consumes one Guts and animates down');
 await page.evaluate(()=>counterLiveQA.patch(g=>{g.players[0].field[0].decayCnt=1;}));await page.waitForTimeout(600);assert.equal(await page.locator('[data-uid="survivor"] .card-counter').count(),2);await page.screenshot({path:out+'guts-and-decay.png'});
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(80);await page.screenshot({path:out+'board-landscape.png'});await page.setViewportSize({width:390,height:844});await page.waitForTimeout(80);await page.screenshot({path:out+'board-mobile.png'});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>counterLiveQA.patch(g=>{g.players[0].field[0].guts=6;}));assert.equal(await page.locator('[data-uid="survivor"] [data-counter-kind="guts"]').getAttribute('data-counter-position'),'6');
 await page.evaluate(()=>counterLiveQA.dispose());checks.push('coexisting Guts/Decay, landscape/portrait, reduced-motion direct update, teardown');assert.deepEqual(errors,[]);
 await fs.writeFile(out+'browser.json',JSON.stringify({checks,ratios,errors,limits:'Real component and shared-engine local checks, without network authentication.'},null,2));console.log('PASS',checks);
}finally{await browser.close();}
