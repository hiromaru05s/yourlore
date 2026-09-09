import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5182';
const out=process.env.LORE_TEST_OUTPUT||'docs/ui-rework/2026-09-10-impact';await fs.mkdir(out,{recursive:true});
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
 const c=new Controller(document.getElementById('app'),0,{});const bootBackground=getComputedStyle(document.querySelector('.game')).backgroundImage;const stop=(await import('/src/ui/layout.ts')).startBoardLayout();c.reset();window.qa={c,stop,E,C,A,bootBackground};
});
await page.waitForSelector('.supply-model-ready');await page.waitForTimeout(700);
assert.equal(await page.evaluate(()=>qa.bootBackground),'none');
// Supply must be empty from the first lift; no front-layer DOM duplicate.
await page.evaluate(()=>{qa.c.state.players[0].supply=[{...qa.C.DB.ELF,uid:'supply-buy'},null,null,null];qa.c.view.render(qa.c.state);});
await page.waitForTimeout(100);const supply=page.locator('#supplyMarket .card').first();
await supply.click();await page.locator('.buy-confirm').click();
await page.waitForFunction(()=>document.querySelector('#supplyMarket [data-purchase-source]'));
assert.equal(await supply.evaluate(e=>getComputedStyle(e).visibility),'hidden');
assert.equal(await page.locator('.fx-card-flight').count(),0);
await page.waitForFunction(()=>document.querySelector('#pile-myDisc')?.dataset.motion==='arrival');
await page.waitForTimeout(210);await page.screenshot({path:out+'/supply-lift-empty.png'});
assert.equal(await page.locator('#supplyMarket .card').evaluateAll(es=>es.filter(e=>getComputedStyle(e).visibility==='visible').length),0);
await page.evaluate(()=>qa.c.queue);assert.equal(await page.locator('#supplyMarket .card').count(),0);
assert.equal(await page.locator('#pile-myDisc').getAttribute('data-count'),'2');
// Multiple-stock fixed market stays at its normal depth, with decremented badge.
await page.locator('#fixedMarket .card').first().click();await page.locator('.buy-confirm').click();
await page.waitForFunction(()=>document.querySelector('#pile-myDisc')?.dataset.motion==='arrival');
assert.equal(await page.locator('.fx-card-flight').count(),0);
assert.equal(await page.locator('#fixedMarket .card').first().evaluate(e=>getComputedStyle(e).visibility),'visible');
await page.screenshot({path:out+'/fixed-purchase-layer.png'});await page.evaluate(()=>qa.c.queue);
// A second real purchase interrupts the first flight and leaves the final
// server-shaped snapshot visible, with both acquired cards in the shelf.
await page.locator('#fixedMarket .card').first().click();await page.locator('.buy-confirm').click();
await page.waitForFunction(()=>document.querySelector('#pile-myDisc')?.dataset.motion==='arrival');
await page.evaluate(()=>qa.c.onBuyMarket(0));await page.evaluate(()=>qa.c.queue);
assert.equal(await page.locator('#pile-myDisc').getAttribute('data-count'),'5');
assert.equal(await page.locator('[data-purchase-source],[data-motion],.fx-card-flight').count(),0);
// Already-skipped purchases must not schedule a new flight.
const skipDuration=await page.evaluate(async()=>{qa.A.setFxSkip(true);const start=performance.now(),source=document.querySelector('#fixedMarket .card');await qa.A.buyReveal({...qa.C.DB.ELF,uid:'skip'},'me',source.getBoundingClientRect(),source,1);qa.A.setFxSkip(false);return performance.now()-start;});assert(skipDuration<100);
// Eight complete alternating packet cycles, captured at render cadence.
const rounds=await page.evaluate(async()=>{const seen=new Set();let done=false;const sample=()=>{const r=document.querySelector('[data-shuffle-round]')?.dataset.shuffleRound;if(r)seen.add(Number(r));if(!done)requestAnimationFrame(sample);};sample();await qa.A.animateReshuffle('me',18);done=true;return [...seen].sort((a,b)=>a-b);});
assert.deepEqual(rounds,[1,2,3,4,5,6,7,8]);assert.equal(await page.locator('.is-shuffling').count(),0);
// Heavy summon: slow departure, accelerated arrival, and one bounded impact.
await page.evaluate(()=>{qa.impacts=0;window.addEventListener('lore:summon-impact',()=>qa.impacts++);qa.summon=qa.A.ghostSummon({...qa.C.DB.ELF,uid:'heavy'},'me',0);});
await page.waitForSelector('.fx-field-ghost');
const easing=await page.locator('.fx-field-ghost').evaluate(e=>e.getAnimations()[0].effect.getTiming().easing);
assert.match(easing,/0.72/);
await page.waitForFunction(()=>qa.impacts===1);assert(await page.locator('.stage').evaluate(e=>e.getAnimations().length>0));
await page.waitForTimeout(120);await page.screenshot({path:out+'/summon-impact.png'});await page.evaluate(async()=>{const face=await qa.summon;face?.remove();});
assert.equal(await page.locator('.stage').evaluate(e=>e.getAnimations().length),0);
// Awaiting furniture never leaks labels. Landed market cards stay in WebGL
// until both streams finish, so stationary DOM cannot occlude the falling ones.
await page.evaluate(()=>{qa.A.setFxSkip(false);qa.c.introShown=false;qa.c.applyResult(qa.E.createGame({mode:'bot',seed:71,starting:1,p0:{id:'a',name:'YOU'},p1:{id:'b',name:'OPP'}}),false);});
await page.waitForSelector('.awaiting-board');
assert(await page.locator('.pile-tag,.pile-count').evaluateAll(es=>es.every(e=>getComputedStyle(e).visibility==='hidden')));
await page.waitForSelector('[data-opening-phase="market-cards"]');
await page.waitForFunction(()=>document.querySelectorAll('#fixedMarket [data-intro-landed]').length>=2);
assert.equal(await page.locator('#fixedMarket .card').evaluateAll(cs=>cs.filter(c=>getComputedStyle(c).visibility==='visible').length),0);
await page.screenshot({path:out+'/opening-shared-depth.png'});
await page.waitForSelector('[data-opening-phase="furniture"]');
assert.equal(await page.locator('#fixedMarket .card').evaluateAll(cs=>cs.filter(c=>getComputedStyle(c).visibility==='visible').length),8);
await page.waitForFunction(()=>!document.querySelector('.opening-hands'));
await page.waitForTimeout(1000);
assert.deepEqual(errors,[]);
await fs.writeFile(out+'/impact-browser.json',JSON.stringify({rounds,easing,errors,checks:['neutral loading surface without raster flash','supply empty before lift','purchase shared WebGL depth without DOM overlay','fixed market stock retained','consecutive purchase cancellation commits both cards','eight shuffle cycles','accelerating heavy summon and bounded shake','startup labels hidden','opening flights keep shared depth until simultaneous handoff']},null,2));
await page.evaluate(()=>{qa.c.destroy();qa.stop();});console.log('PASS: impact browser');
}finally{await browser.close();}
