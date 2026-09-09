import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5182';
const out=process.env.LORE_TEST_OUTPUT||'docs/ui-rework/2026-09-10-continuity';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
await page.route('**/continuity-fixture',r=>r.fulfill({contentType:'text/html',body:'<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>'}));
await page.goto(origin+'/continuity-fixture');
await page.evaluate(async()=>{
 for(const css of ['tokens','base','card','game-overlays','game','dice','screens','mobile'])await import('/src/styles/'+css+'.css');
 const E=await import('/src/shared/engine.ts'),C=await import('/src/shared/cards.ts'),A=await import('/src/ui/anim.ts'),V=await import('/src/ui/boardView.ts');
 (await import('/src/i18n.ts')).setLang('ja');V.setMyAvatar('SEEKER_BLUE');V.setOppAvatar('SEEKER_RED');
 localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));
 const {BaseController}=await import('/src/game/controller.ts');
 class Controller extends BaseController{submit(a){this.applyResult(E.reduce(this.state,a));} feed(r){this.applyResult(r,true);return this.queue;} reset(){const g=E.createGame({mode:'bot',seed:77,starting:0,p0:{id:'a',name:'YOU'},p1:{id:'b',name:'OPP'}}).state;g.turn=3;g.pending=null;g.market[0]={...C.DB.ELF,uid:'market-buy'};
 for(const [s,p] of g.players.entries()){p.openingDrawReady=false;p.field=[];p.hand=[C.STARTERS.STARTER_CHEST,C.STARTERS.STARTER_MANA,C.DB.ND2].map((c,i)=>({...c,uid:`hand-${s}-${i}`}));p.discard=[{...C.DB.ELF,uid:`disc-${s}`}];p.mana=30;p.maxMana=30;}
 this.state=g;this.introShown=true;this.view.render(g);}
 }
 const c=new Controller(document.getElementById('app'),0,{});const stop=(await import('/src/ui/layout.ts')).startBoardLayout();c.reset();window.qa={c,stop,E,C,A};
});
await page.waitForSelector('.supply-model-ready');await page.waitForTimeout(700);
const proportions=await page.evaluate(()=>{const rect=s=>document.querySelector(s).getBoundingClientRect();return {self:rect('#portraitMe .avatar').toJSON(),opp:rect('#portraitOpp .avatar').toJSON(),hand:rect('#hand .card').toJSON(),opponentHand:rect('#oppHand .card--back').toJSON(),manaFont:getComputedStyle(document.querySelector('#portraitMe .mana-readout b')).fontSize};});
assert(Math.abs(proportions.self.width/proportions.self.height-1)<.02);assert(Math.abs(proportions.opp.width/proportions.opp.height-1)<.02);
assert(Math.abs(proportions.opponentHand.width-proportions.hand.width)<1);assert(proportions.opp.y>=0);assert(parseFloat(proportions.manaFont)>=30);
await page.screenshot({path:out+'/continuity-desktop.png'});
// One click is immediate selection, second confirmation submits exactly one buy.
const market=page.locator('#fixedMarket .card').first();await market.click();assert(await market.evaluate(e=>e.classList.contains('is-armed')));assert.equal(await page.locator('.buy-confirm').count(),1);
await page.locator('.buy-confirm').click();await page.waitForFunction(()=>document.querySelector('#pile-myDisc')?.dataset.motion==='arrival');
await page.screenshot({path:out+'/purchase-flight.png'});await page.evaluate(()=>qa.c.queue);await page.waitForTimeout(100);
assert.equal(await page.locator('#pile-myDisc').getAttribute('data-count'),'2');assert.equal(await page.locator('#pile-myDisc').getAttribute('data-surface-ready'),'true');assert.equal(await page.locator('#pile-myDisc').getAttribute('data-surface-card'),'ELF');assert.equal(await page.locator('.fx-card-flight').count(),0);
// A discard spell stays in the shelf during the remaining event sequence.
await page.evaluate(()=>{qa.flight=qa.A.revealSpell({...qa.C.DB.ND2,uid:'spell-flight'},'me','discard');});
await page.waitForFunction(()=>document.querySelector('#pile-myDisc')?.dataset.motion==='arrival');await page.waitForTimeout(300);
await page.screenshot({path:out+'/spell-flight.png'});await page.evaluate(()=>qa.flight);await page.waitForTimeout(150);
assert.equal(await page.locator('#pile-myDisc').getAttribute('data-count'),'3');await page.screenshot({path:out+'/shelf-settled.png'});
// Two packets visibly separate, interleave and square; same canvas at all phases.
await page.evaluate(()=>{qa.shuffle=qa.A.animateReshuffle('me',12);});await page.waitForFunction(()=>document.querySelector('[data-shuffle-phase="split"]'));
assert.equal(await page.locator('.duel-objects-3d,.board-flight-canvas').count(),2);await page.screenshot({path:out+'/shared-shuffle-split.png'});
await page.waitForFunction(()=>document.querySelector('[data-shuffle-phase="square"]'));await page.screenshot({path:out+'/shared-shuffle-square.png'});await page.evaluate(()=>qa.shuffle);
assert.equal(await page.locator('#pile-myDisc .pile-print').count(),0);assert.equal(await page.locator('.is-shuffling,[data-shuffle-phase]').count(),0);assert.equal(await page.locator('#pile-myDeck').getAttribute('data-count'),'12');await page.screenshot({path:out+'/shared-shuffle-rest.png'});
// Picker padding contains the raised card including its protruding cost seal.
await page.evaluate(async()=>{const {cardPickerMulti}=await import('/src/ui/modal.ts');cardPickerMulti('捨てるカードを3枚選択',Array.from({length:8},(_,i)=>({...qa.C.STARTERS.STARTER_CHEST,uid:'pick-'+i})),3,()=>{});});

await page.locator('.picker-grid .card').nth(2).click();await page.waitForTimeout(150);
const crop=await page.evaluate(()=>{const grid=document.querySelector('.picker-grid').getBoundingClientRect(),card=document.querySelector('.is-picked'),seal=card.querySelector('.card-cost').getBoundingClientRect();return {grid:grid.toJSON(),seal:seal.toJSON()};});assert(crop.seal.y>=crop.grid.y+1);await page.screenshot({path:out+'/discard-selection.png'});
await page.evaluate(async()=>{(await import('/src/ui/modal.ts')).closeOverlay();qa.exile=qa.A.exileCard({...qa.C.STARTERS.STARTER_TRASH,uid:'exile'},'me',document.querySelector('#hand .card'));});await page.waitForTimeout(370);await page.screenshot({path:out+'/rift-absorption.png'});await page.evaluate(()=>qa.exile);
// Opening is coordinated in both sides' actual 3D scene, with simultaneous hands.
await page.evaluate(()=>{qa.c.introShown=false;qa.c.applyResult(qa.E.createGame({mode:'bot',seed:71,starting:1,p0:{id:'a',name:'YOU'},p1:{id:'b',name:'OPP'}}),false);});
await page.waitForFunction(()=>document.querySelector('[data-opening-phase="market"]'));await page.screenshot({path:out+'/opening-market.png'});
await page.waitForFunction(()=>document.querySelector('[data-opening-phase="furniture"]'));await page.screenshot({path:out+'/opening-furniture.png'});
await page.waitForFunction(()=>document.querySelector('[data-opening-phase="decks"]'));await page.waitForTimeout(440);await page.screenshot({path:out+'/opening-decks.png'});await page.waitForSelector('.cointoss-ov');await page.waitForTimeout(1900);await page.screenshot({path:out+'/coin-grounded.png'});assert.equal(await page.locator('.ct-coin.to-tails').count(),1);

await page.waitForFunction(()=>document.querySelectorAll('.paper-draw-canvas').length===2);await page.screenshot({path:out+'/simultaneous-opening-draw.png'});await page.waitForFunction(()=>!document.querySelector('.paper-draw-canvas'));assert.equal(await page.locator('#hand .card').count(),3);assert.equal(await page.locator('#oppHand .card--back').count(),3);
assert.equal(await page.locator('.paper-draw-canvas').count(),0);
// Cancellation / resize / reduced motion leave no invisible stocks or cards.
await page.evaluate(()=>{qa.cancel=qa.A.animateReshuffle('opp',8);});await page.waitForSelector('[data-shuffle-phase]');await page.evaluate(()=>qa.A.setFxSkip(true));await page.evaluate(()=>qa.cancel);await page.evaluate(()=>qa.A.setFxSkip(false));
assert.equal(await page.locator('.is-shuffling,[data-shuffle-phase]').count(),0);
await page.setViewportSize({width:390,height:844});await page.evaluate(()=>qa.c.reset());await page.waitForTimeout(300);await page.screenshot({path:out+'/continuity-mobile.png'});
const head=await page.locator('#portraitOpp .avatar').boundingBox();assert(head.y>=0);const horizontal=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);assert(horizontal);
await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>qa.A.animateReshuffle('opp',5));assert.equal(await page.locator('.is-shuffling').count(),0);
assert.deepEqual(errors,[]);await fs.writeFile(out+'/continuity-browser.json',JSON.stringify({proportions,crop,errors,checks:['instant market select and explicit confirm','purchase and spell shelf handoff','shared-camera split/interleave/square/land','picker seal within scrollport','rift absorption','opening market/furniture/decks','simultaneous opening draws','fast-forward cancellation','mobile head clearance','reduced motion']},null,2));
await page.evaluate(()=>{qa.c.destroy();qa.stop();});console.log('PASS: continuity browser scenarios');
}finally{await browser.close();}
