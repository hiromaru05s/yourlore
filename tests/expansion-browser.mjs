import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5210';
const output='docs/card-expansion/2026-09-21/browser';await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],report={checks:[],errors};
try{
 const page=await browser.newPage({viewport:{width:1500,height:1000}});page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/expansion-fixture',r=>r.fulfill({contentType:'text/html',body:'<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>'}));
 await page.goto(origin+'/expansion-fixture');
 await page.evaluate(async()=>{
  for(const css of ['tokens','base','card','game-overlays','game','dice','screens','mobile','reading-board'])await import('/src/styles/'+css+'.css');
  const C=await import('/src/shared/cards.ts'),X=await import('/src/shared/expansionCards.ts'),V=await import('/src/ui/cardView.ts'),I=await import('/src/i18n.ts');
  window.qa={C,X,V,I};
 });
 const assets=await page.evaluate(async()=>{
  const out=[];for(const c of qa.X.EXPANSION_CARDS){for(const [kind,width]of [['xs',192],['sm',384],['full',1472]]){const img=new Image();img.src=qa.V.artUrl[kind](c.id);await img.decode();if(img.naturalWidth!==width)throw Error(c.id+' '+kind);out.push(img.src);}}return out;
 });assert.equal(assets.length,144);report.checks.push('48 unique artworks: all 144 full/small/tiny URLs decode at expected widths');
 for(const lang of ['ja','ko','en']){
  await page.evaluate(lang=>{
   qa.I.setLang(lang);const root=document.getElementById('app');root.replaceChildren();root.style.cssText='display:grid;grid-template-columns:repeat(6,180px);gap:24px;padding:24px;justify-content:center;height:auto;background:#263347';
   for(const c of qa.X.EXPANSION_CARDS){const el=qa.V.cardEl({...qa.C.DB[c.id],uid:c.id},{size:'hand',fullArt:true});el.style.cssText='--cw:180px;--ch:281.25px;width:180px;height:281.25px';root.append(el);}
  },lang);
  await page.waitForTimeout(500);
  const status=await page.locator('.card').evaluateAll(els=>els.map(el=>({id:el.dataset.cardId,broken:[...el.querySelectorAll('img')].some(i=>!i.complete||i.naturalWidth===0),braces:el.innerText.includes('【')})));
  assert(status.every(c=>!c.broken&&!c.braces),JSON.stringify(status.filter(c=>c.broken||c.braces)));
  if(lang==='ja')await page.screenshot({path:output+'/all-new-cards-ja.png',fullPage:true});
 }
 report.checks.push('All 48 cards render in Japanese, Korean and English with loaded art and formatted condition tags');
 await page.evaluate(async()=>{
  qa.I.setLang('ja');const root=document.getElementById('app');root.removeAttribute('style');root.replaceChildren();
  const E=await import('/src/shared/engine.ts'),P=await import('/src/shared/protocol.ts'),B=await import('/src/ui/boardView.ts'),{BaseController}=await import('/src/game/controller.ts');
  B.setMyAvatar('SEEKER_BLUE');B.setOppAvatar('SEEKER_RED');
  localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));
  class Controller extends BaseController{submit(a){this.applyResult(E.reduce(this.state,a));}feed(r){this.applyResult(r,true);return this.queue;}}
  const c=new Controller(root,0,{});c.introShown=true;qa.c=c;qa.E=E;qa.P=P;
  qa.card=(id,uid=id)=>({...qa.C.DB[id],uid});qa.mon=(id,uid=id)=>({...qa.card(id,uid),exhausted:false,tempAtk:0,atkMod:0,defMod:0,dmg:0,summonedTurn:0});
  qa.fresh=()=>{const g=E.createGame({mode:'online',seed:77,starting:0,p0:{id:'a',name:'YOU'},p1:{id:'b',name:'OPPONENT'}}).state;for(const p of g.players)Object.assign(p,{field:[],hand:[],deck:[],discard:[],removed:[],enchants:[],traps:[],quests:[],hp:200,maxHp:200,mana:30,maxMana:30,openingDrawReady:false});g.turn=3;g.pending=null;return g;};
  const g=qa.fresh();g.players[0].field=[qa.mon('INFKNIGHT'),qa.mon('GUNNER'),qa.mon('MERC_MASTER')];g.players[1].field=[qa.mon('MIMIC')];g.players[0].hand=['STABLE','FIRE_BALL','Q_TOWN'].map(id=>qa.card(id));c.state=g;c.view.render(g);
  qa.stop=(await import('/src/ui/layout.ts')).startBoardLayout();
 });
 await page.waitForFunction(()=>document.getElementById('app').dataset.sceneReady==='true',{timeout:120000});
 await page.screenshot({path:output+'/new-board-1500.png'});
 await page.evaluate(()=>qa.c.submit({type:'play',idx:0}));
 await page.locator('.picker-modal').waitFor({timeout:30000});assert.equal(await page.locator('.picker-modal button').count(),0);
 await page.locator('.picker-grid .card').first().click();await page.waitForFunction(()=>qa.c.state.players[0].field.some(c=>c.id==='CAVALRY'));await page.evaluate(()=>qa.c.queue);
 report.checks.push('Stable actual UI selection consumes Knight, summons Cavalry; mandatory choice has no misleading Cancel');
 await page.evaluate(()=>qa.c.submit({type:'play',idx:0}));await page.locator('.picker-modal').waitFor({timeout:30000});
 await page.locator('.picker-grid .card').nth(1).click();await page.waitForFunction(()=>qa.c.state.players[1].hp===194);await page.evaluate(()=>qa.c.queue);
 report.checks.push('Fireball UI offers both players and monsters; clicking opponent deals 6 damage');
 await page.evaluate(()=>{const g=qa.fresh();g.cur=1;g.players[0].field=[qa.mon('FIRE_MASTER')];g.players[0].deck=[qa.card('FIRE_ARROW')];g.players[0].discard=[qa.card('FIRE_METEOR')];g.players[1].hand=[qa.card('EARTHQUAKE')];qa.c.state=g;qa.c.view.render(g);qa.c.submit({type:'play',idx:0});});
 for(let n=0;n<2;n++){await page.locator('.picker-modal').waitFor({timeout:30000});await page.locator('.picker-grid .card').first().click();await page.evaluate(()=>qa.c.queue);}
 await page.waitForFunction(()=>qa.c.state.players[0].hand.length===2&&!qa.c.state.pending);
 report.checks.push('Fire Master death opens two consecutive owner choices during opponent turn');
 await page.evaluate(()=>{const g=qa.fresh();g.players[0].quests=[{card:qa.card('Q_CHEAT'),progress:20}];g.players[1].deck=[qa.card('M6'),qa.card('FIRE_MASTER')];qa.c.state=g;qa.c.feed(qa.E.reduce(g,{type:'pick',uid:null}));});
 await page.locator('.picker-modal').waitFor({timeout:30000});assert.equal(await page.locator('.picker-grid .card').count(),2);await page.locator('.picker-grid .card').first().click();await page.evaluate(()=>qa.c.queue);assert.equal(await page.evaluate(()=>qa.c.state.players[1].removed.length),1);
 report.checks.push('Completed Cheating quest presents enemy deck choices and exiles selected card through UI');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(600);await page.screenshot({path:output+'/new-board-mobile.png'});
 assert.deepEqual(errors,[]);await fs.writeFile(output+'/report.json',JSON.stringify(report,null,2));console.log('PASS',JSON.stringify(report));
}finally{await browser.close();}
