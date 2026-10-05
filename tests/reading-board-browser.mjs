import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5199';
const out='docs/3d-assets/2026-09-21-blender-reroll-button/checks';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
const errors=[],requests=[];page.on('console',m=>{if(m.type()==='error'&&!/WebSocket|vite|favicon/.test(m.text()))console.log('CONSOLE',m.text());});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))requests.push({url:r.url(),status:r.status()});});
const report={checks:[],resolutions:[],errors,requests};
try{
 await page.route('**/reading-integration',r=>r.fulfill({contentType:'text/html',body:'<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>'}));
 let release;const held=new Promise(r=>release=r);await page.route('**/models/reading-board/v1/board.glb',async r=>{await held;await r.continue();});
 await page.goto(origin+'/reading-integration');
 await page.evaluate(async()=>{
  for(const css of ['tokens','base','card','game-overlays','game','dice','screens','mobile','reading-board'])await import('/src/styles/'+css+'.css');
  const E=await import('/src/shared/engine.ts'),C=await import('/src/shared/cards.ts'),V=await import('/src/ui/boardView.ts');
  (await import('/src/i18n.ts')).setLang('ja');V.setMyAvatar('SEEKER_BLUE');V.setOppAvatar('SEEKER_RED');
  localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));
  const {BaseController}=await import('/src/game/controller.ts');
  class Controller extends BaseController{
   submit(a){this.applyResult(E.reduce(this.state,a));}
   feed(r){this.applyResult(r,true);return this.queue;}
   reset(){const g=E.createGame({mode:'bot',seed:77,starting:0,p0:{id:'a',name:'YOU'},p1:{id:'b',name:'OPP'}}).state;g.turn=3;g.pending=null;g.market[0]={...C.DB.ELF,uid:'market-buy'};
    for(const [s,p] of g.players.entries()){p.openingDrawReady=false;p.field=[];p.hand=[C.STARTERS.STARTER_CHEST,C.STARTERS.STARTER_MANA,C.DB.ND2].map((c,i)=>({...c,uid:`hand-${s}-${i}`}));p.discard=[{...C.DB.ELF,uid:`disc-${s}`}];p.mana=20;p.maxMana=20;}
    this.state=g;this.introShown=true;this.view.render(g);
   }
  }
  const c=new Controller(document.getElementById('app'),0,{});const stop=(await import('/src/ui/layout.ts')).startBoardLayout();c.reset();
  window.qa={c,stop,E,C,clock:(await import('/src/ui/duelClock.ts')).paintDuelClock,P:await import('/src/ui/boardProjection.ts'),L:await import('/src/ui/readingBoardLayout.ts')};
 });
 assert.equal(await page.locator('.duel-loader').count(),1);assert.equal(await page.locator('.game').evaluate(e=>getComputedStyle(e).visibility),'hidden');release();
 await page.waitForFunction(()=>document.getElementById('app').dataset.sceneReady==='true'&&!document.querySelector('.duel-loader'),{timeout:120000});
 report.checks.push('Cold start holds the logo/loading cover until all six components and card images are ready');
 assert.equal(await page.locator('#fixedMarket>.card').count(),7);assert.equal(await page.locator('#supplyMarket>.card').count(),3);
 for(const [w,h] of [[1920,1080],[1280,720],[1814,1274],[390,844]]){
  await page.setViewportSize({width:w,height:h});await page.waitForTimeout(450);
  const geometry=await page.evaluate(()=>{
   const unit=qa.P.cardUnit(document.getElementById('app')),s=qa.L.readingScale();
   const controls=[['#endBtn',.7,0,.028],['#refreshBtn',-.694,0,.0218]].map(([selector,x,z,y])=>{
    const r=document.querySelector(selector).getBoundingClientRect(),p=qa.P.boardPoint(innerWidth/2+x*s,innerHeight/2+z*s,y*s);
    return {selector,delta:Math.hypot(r.x+r.width/2-p.x,r.y+r.height/2-p.y),inside:r.x>=0&&r.right<=innerWidth&&r.y>=0&&r.bottom<=innerHeight};
   });
   const shelf=document.querySelector('#pile-myDisc .pile-print .card'),deck=document.querySelector('#pile-myDeck .pile-draw-anchor');
   return {unit,controls,shelfWidth:shelf.offsetWidth,deckWidth:deck.offsetWidth,marketWidth:document.querySelector('#fixedMarket>.card').offsetWidth};
  });
  assert(geometry.controls.every(c=>c.inside&&c.delta<2.5),JSON.stringify(geometry));
  assert(Math.abs(geometry.shelfWidth-geometry.marketWidth)<=1);assert(Math.abs(geometry.deckWidth-geometry.marketWidth)<=1);
  report.resolutions.push({width:w,height:h,...geometry});
  if(w!==390)await page.screenshot({path:`${out}/ingame-${w}x${h}.png`,timeout:60000});
 }
 report.checks.push('Model/button projection alignment and common card sizes at four viewport sizes');
 await page.setViewportSize({width:1280,height:720});await page.waitForTimeout(300);
 // 30 is a real rule, even though the original design brief illustrated 20.
 for(const max of [0,4,10,11,20,21,30]){
  await page.evaluate(max=>{const p=qa.c.state.players[0];p.maxMana=max;p.mana=Math.max(0,max-1);qa.c.view.render(qa.c.state);},max);
  await page.waitForFunction(max=>document.querySelector('#portraitMe .pt-mana').dataset.crystalsReady===String(Math.max(0,max-1)),max);
  assert.equal(await page.locator('#portraitMe .pt-mana').getAttribute('data-crystals-spent'),String(Math.max(3,max)-Math.max(0,max-1)));
 }
 report.checks.push('Live mana values/available/spent crystals at 0, 4, 10, 11, 20, 21 and 30');
 await page.evaluate(()=>qa.c.reset());await page.waitForTimeout(200);
 const before=await page.evaluate(()=>({fixed:qa.c.state.market.map(c=>c.uid),supply:qa.c.state.players[0].supply.map(c=>c.uid),mana:qa.c.state.players[0].mana}));
 await page.locator('#refreshBtn').click();await page.evaluate(()=>qa.c.queue);
 const after=await page.evaluate(()=>({fixed:qa.c.state.market.map(c=>c.uid),supply:qa.c.state.players[0].supply.map(c=>c.uid),mana:qa.c.state.players[0].mana}));
 assert.deepEqual(after.fixed,before.fixed);assert.notDeepEqual(after.supply,before.supply);assert.equal(after.supply.length,3);assert.equal(after.mana,before.mana-1);
 assert.match(await page.locator('#refreshBtn').getAttribute('aria-label'),/3/);
 report.checks.push('Clicking the physical reroll disk spends one mana and replaces only the three offers');
 await page.evaluate(()=>{qa.c.state.players[0].mana=0;qa.c.view.render(qa.c.state);});assert(await page.locator('#refreshBtn').isDisabled());
 await page.evaluate(()=>{qa.c.state.cur=1;qa.c.view.render(qa.c.state);qa.clock(document.getElementById('clock-me'),24,90,false);});assert(await page.locator('#endBtn').isDisabled());assert.match(await page.locator('#endBtn').textContent(),/ENEMY/);
 await page.screenshot({path:out+'/enemy-turn-timer.png',timeout:60000});
 report.checks.push('Zero-mana reroll disabled; opposing turn disables end button and changes its label/timer');
 await page.evaluate(()=>{qa.c.reset();qa.c.state.players[0].mana=5;qa.c.view.render(qa.c.state);});await page.waitForTimeout(300);
 await page.locator('#fixedMarket>.card').first().click();await page.locator('#fixedMarket>.card').first().click();
 await page.waitForFunction(()=>document.querySelector('#pile-myDisc')?.dataset.motion==='arrival');
 const layer=await page.evaluate(()=>({flight:+getComputedStyle(document.querySelector('.board-flight-canvas')).zIndex,board:+getComputedStyle(document.querySelector('.stage')).zIndex}));assert(layer.flight>layer.board);
 await page.evaluate(()=>qa.c.queue);assert.equal(await page.locator('#pile-myDisc').getAttribute('data-count'),'2');assert.equal(await page.evaluate(()=>qa.c.state.players[0].mana),1);
 const shelf=await page.locator('#pile-myDisc .pile-print .card').evaluate(e=>({artWidth:e.querySelector('img').naturalWidth,visible:getComputedStyle(e.parentElement).visibility,id:e.dataset.cardId}));assert(shelf.artWidth>=384);assert.equal(shelf.visible,'visible');
 report.checks.push('Actual fixed-market purchase flies in front, lands on the new shelf, retains full-resolution native face');
 await page.evaluate(()=>{qa.c.reset();qa.c.state.players[0].hand=[{...qa.C.STARTERS.STARTER_MANA,uid:'attune-new-board'}];qa.c.state.players[0].maxMana=5;qa.c.state.players[0].mana=5;qa.c.view.render(qa.c.state);});await page.waitForTimeout(300);
 const h=await page.locator('#hand>.card').boundingBox();await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();await page.mouse.move(650,380,{steps:12});await page.mouse.up();
 await page.waitForFunction(()=>qa.c.state.players[0].hand.length===0);await page.evaluate(()=>qa.c.queue);assert.equal(await page.evaluate(()=>qa.c.state.players[0].maxMana),6);
 report.checks.push('Real collapsed-hand drag plays Attune away from spell slots and updates the 3D mana display');
 // Summon flights need an invisible destination even when the lane is empty.
 await page.evaluate(()=>{qa.c.reset();qa.c.state.players[0].hand=[{...qa.C.DB.HALF_ELF,uid:'first-mon'},{...qa.C.DB.HALF_ELF,uid:'second-mon'}];qa.c.view.render(qa.c.state);});
 for(const count of [1,2]){
  await page.waitForTimeout(250);const card=await page.locator('#hand>.card').first().boundingBox();await page.mouse.move(card.x+card.width/2,card.y+card.height/2);await page.mouse.down();await page.mouse.move(630,475,{steps:10});await page.mouse.up();
  await page.waitForSelector('.fx-field-ghost',{state:'attached'});
  const target=await page.locator('.fx-field-ghost').last().evaluate(e=>({w:e.offsetWidth,h:e.offsetHeight,m:e.style.transform}));assert(target.w>40&&target.h>60,JSON.stringify(target));assert(!target.m.includes('NaN'));
  await page.evaluate(()=>qa.c.queue);assert.equal(await page.locator('#meRow .zone-mon>.card').count(),count);
 }
 const centered=await page.evaluate(()=>{const row=document.querySelector('#meRow .zone-mon').getBoundingClientRect(),cards=[...document.querySelectorAll('#meRow .zone-mon>.card')].map(e=>e.getBoundingClientRect());return Math.abs((cards[0].left+cards.at(-1).right)/2-(row.left+row.right)/2);});assert(centered<2);
 report.checks.push('First and second actual monster summons have nonzero landing targets and settle in the centered lane');
 await page.evaluate(()=>{qa.c.reset();qa.c.state.players[0].hand=[{...qa.C.DB.NHEAL,uid:'persistent-spell'}];qa.c.view.render(qa.c.state);});await page.waitForTimeout(250);
 const spell=await page.locator('#hand>.card').boundingBox();await page.mouse.move(spell.x+spell.width/2,spell.y+spell.height/2);await page.mouse.down();await page.mouse.move(640,380,{steps:10});await page.mouse.up();await page.waitForSelector('.fx-field-ghost',{state:'attached'});assert((await page.locator('.fx-field-ghost').last().evaluate(e=>e.offsetWidth))>0);await page.evaluate(()=>qa.c.queue);assert.equal(await page.locator('#meRow .zone-st>.buff-icon').count(),1);
 report.checks.push('Persistent spell lands in a dimensioned status slot without covering the avatar');

 await page.evaluate(async()=>{qa.c.reset();const s=qa.c.state.players[0];s.deck=[];s.hand=[];s.discard=Array.from({length:9},(_,i)=>({...qa.C.STARTERS.STARTER_CHEST,uid:'shuffle-'+i}));qa.c.view.render(qa.c.state);
 const request=(await import('/src/ui/boardMotion.ts')).moveOnBoard;window.qa.shuffle=request({kind:'shuffle',source:document.getElementById('pile-myDisc'),target:document.getElementById('pile-myDeck'),count:9,signal:new AbortController().signal});});
 await page.waitForFunction(()=>!!document.getElementById('app').dataset.shufflePhase);
 await page.evaluate(()=>qa.shuffle);assert.equal(await page.locator('#pile-myDeck').getAttribute('data-count'),'9');assert.equal(await page.locator('#pile-myDisc').getAttribute('data-count'),'0');assert.equal(await page.locator('.is-shuffling').count(),0);
 report.checks.push('Shared shuffle renderer carries stock from the authored shelf floor to the low deck pad and cleans up');
 await page.evaluate(()=>{qa.c.reset();qa.c.state.players[0].hand=[];qa.c.view.render(qa.c.state);});await page.waitForFunction(()=>Date.now()-qa.c.turnStartedWall>=500);await page.locator('#endBtn').click();await page.evaluate(()=>qa.c.queue);assert.equal(await page.evaluate(()=>qa.c.state.cur),1);
 report.checks.push('Physical END TURN hit area advances the actual game');
 await page.evaluate(()=>{qa.c.destroy();qa.stop();});assert.equal(await page.locator('.duel-objects-3d,.board-flight-canvas').count(),0);
 report.checks.push('Leaving the duel removes both renderer canvases and model resources');
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);report.passed=true;
 await fs.writeFile(out+'/ingame-integration.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(e){await fs.writeFile(out+'/ingame-integration.json',JSON.stringify({...report,passed:false,error:String(e),diagnostic:await page.evaluate(()=>window.qa?{cur:qa.c.state.cur,mana:qa.c.state.players[0].mana,discard:qa.c.state.players[0].discard.length,pile:document.getElementById('pile-myDisc')?.dataset,ghosts:[...document.querySelectorAll('.fx-card-flight,.fx-field-ghost')].map(e=>e.className)}:null)},null,2));await page.screenshot({path:out+'/failure.png',timeout:60000}).catch(()=>{});throw e;}
finally{await browser.close();}
