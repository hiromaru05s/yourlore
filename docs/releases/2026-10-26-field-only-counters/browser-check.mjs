import {chromium} from '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const out=new URL('./qa/',import.meta.url).pathname;await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],checks=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/field-only-live-qa',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="ja"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>'}));
 await page.goto('http://127.0.0.1:5610/field-only-live-qa');
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
   p.field=[mon('DRAGON_EGG',`dragon-${side}`,{hatch:5,dur:4}),mon('BEAST_EGG',`beast-${side}`,{hatch:6,dur:3})];
   p.supply[0]={...DB.DRAGON_EGG,uid:`supply-dragon-${side}`};p.supply[1]={...DB.BEAST_EGG,uid:`supply-beast-${side}`};
   p.enchants=[{card:{...DB.GUILD_CO,uid:`guild-${side}`},turns:99,cnt:12}];
   p.hand=['DRAGON_EGG','BEAST_EGG','STARTER_MANA','EXPANSION'].map((id,i)=>({...DB[id]||STARTERS[id],uid:`hand-${side}-${i}`}));
  }
  g.market=[DB.DRAGON_EGG,DB.BEAST_EGG,...g.market.slice(2)];
  await view.render(g);const stop=startBoardLayout();await waitForDuel(root);
  window.counterLiveQA={view,get state(){return g;},async act(a){const r=reduce(g,a);g=r.state;await view.render(g);return r.events;},async patch(fn){fn(g);await view.render(g);},async gutsCombat(){g.pending=null;g.cur=1;g.players[0].field=[mon('GOLEM1','survivor',{guts:3})];g.players[1].field=[mon('M4','striker',{atk:99})];await view.render(g);let r=reduce(g,{type:'attack',uid:'striker'});g=r.state;if(g.pending){r=reduce(g,{type:'pick',uid:'survivor'});g=r.state;}await view.render(g);return r.events;},dispose(){stop();view.destroy();}};
 });
 await page.waitForTimeout(150);
 for(const id of ['DRAGON_EGG','BEAST_EGG']){
  for(const zone of ['#fixedMarket','#supplyMarket','#hand']){
   const card=page.locator(`${zone} .card[data-card-id="${id}"]`);assert((await card.count())>0,zone+' contains '+id);assert.equal(await card.locator('.card-counter,.ad-def--durability').count(),0,zone+' has no counter before field entry');
  }
 }
 assert.equal(await page.locator('.zone-mon [data-counter-kind="hatch"]').count(),4);assert.equal(await page.locator('.zone-mon .ad-def--durability').count(),4);assert.equal(await page.locator('[data-uid="dragon-0"] [data-counter-kind="hatch"]').getAttribute('data-counter-value'),'5');assert.equal(await page.locator('[data-uid="beast-0"] .ad-def--durability .seal-value').textContent(),'3');checks.push('Both eggs: fixed market, supply and hand have no counters; both player fields retain live hatch and durability');
 await page.screenshot({path:out+'market-and-field-desktop.png'});
 await page.evaluate(()=>counterLiveQA.patch(g=>{const egg=g.players[0].hand.shift();g.players[0].field.push({...egg,hatch:egg.hatchTurns,dur:egg.hatchDur,dmg:0,exhausted:true,tempAtk:0,atkMod:0,defMod:0});}));assert.equal(await page.locator('.zone-mon [data-counter-kind="hatch"]').count(),5);assert.equal(await page.locator('#fixedMarket .card-counter,#supplyMarket .card-counter,#hand .card-counter').count(),0);checks.push('Same hand egg gains hatch/durability only when rendered in the field');
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(80);await page.screenshot({path:out+'market-and-field-landscape.png'});assert.equal(await page.locator('#fixedMarket .card-counter,#supplyMarket .card-counter,#hand .card-counter').count(),0);
 await page.evaluate(()=>counterLiveQA.dispose());assert.deepEqual(errors,[]);await fs.writeFile(out+'browser.json',JSON.stringify({checks,errors,scope:'Real GameView local snapshot verification. Hand-to-field patch is a fixture transition; no authenticated online match.'},null,2));console.log('PASS',checks);
}finally{await browser.close();}
