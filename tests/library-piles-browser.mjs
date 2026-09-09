// Actual WebGL, pointer input, engine refill event, cancellation and fallback.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5175';
const output=process.env.LORE_TEST_OUTPUT || 'docs/ui-rework/2026-09-08-library-piles';await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--disable-features=LocalNetworkAccessChecks']});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/pile-fixture',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>'}));
await page.goto(origin+'/pile-fixture');
await page.evaluate(async()=>{
  for(const css of ['tokens','base','card','game-overlays','game','dice','screens','mobile'])await import('/src/styles/'+css+'.css');
  const {GameView}=await import('/src/ui/boardView.ts'),E=await import('/src/shared/engine.ts'),{DB}=await import('/src/shared/cards.ts');
  (await import('/src/i18n.ts')).setLang('ja');
  const g=E.createGame({mode:'bot',seed:77,starting:0,p0:{id:'a',name:'YOU'},p1:{id:'b',name:'OPP'}}).state;g.pending=null;
  const defs=Object.values(DB).filter(c=>c.t==='mon');
  g.players.forEach((p,side)=>{p.field=[];p.enchants=[];p.traps=[];p.hand=defs.slice(0,6).map((c,i)=>({...c,uid:`h-${side}-${i}`}));p.discard=defs.slice(6,18).map((c,i)=>({...c,uid:`s-${side}-${i}`}));});
  const view=new GameView(document.getElementById('app'),0,new Proxy({},{get:()=>()=>{}}));view.render(g);
  const stopLayout=(await import('/src/ui/layout.ts')).startBoardLayout();
  window.qa={view,g,E,A:await import('/src/ui/anim.ts'),stopLayout,draw:null};
});
await page.waitForSelector('.pile--3d-ready');await page.waitForTimeout(650);
assert.equal(await page.locator('.pile--3d-ready').count(),4);
assert.equal(await page.locator('.duel-objects-3d').count(),1);
const compactWidth=await page.locator('#hand .card').first().evaluate(c=>c.getBoundingClientRect().width);
await page.evaluate(()=>qa.view.setHandOpen(true));await page.waitForTimeout(250);
const sizes=await page.evaluate(()=>{
  const c=document.querySelector('#hand .card');
  qa.view.setHandOpen(true);
  return {native:c.offsetWidth,open:c.getBoundingClientRect().width};
});
sizes.compact=compactWidth;
assert(Math.abs(sizes.open/sizes.native-.65)<.01,'open hand should be exactly 65%');
await page.waitForTimeout(250);await page.screenshot({path:output+'/hand.png'});
const c=page.locator('#hand .card').last(),r=await c.boundingBox();
await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2-25,r.y-85,{steps:6});
await page.waitForSelector('.drag-ghost--hand');
const drag=await page.evaluate(()=>({width:document.querySelector('.drag-ghost--hand').offsetWidth,field:document.querySelector('#meRow .zone-mon .slot').getBoundingClientRect().width,hand:document.querySelector('#hand .card').getBoundingClientRect().width}));
assert(drag.width<=drag.field+1&&drag.width<=drag.hand*.73);
await page.screenshot({path:output+'/drag.png'});
await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.up();
assert.equal(await page.locator('.drag-ghost').count(),0);
assert(await page.locator('#meRow .zone-mon .slot').first().evaluate(el=>getComputedStyle(el).backgroundColor==='rgba(0, 0, 0, 0)'));
await page.evaluate(()=>qa.view.setHandOpen(false));
await page.screenshot({path:output+'/desktop.png'});
const start=async(side='me',count=12)=>page.evaluate(({side,count})=>{qa.draw=qa.A.animateReshuffle(side,count);},{side,count});
const clean=async()=>{await page.evaluate(()=>qa.draw);assert.equal(await page.locator('.paper-shuffle-canvas,.is-shuffling').count(),0);};
await start();await page.waitForSelector('[data-shuffle-phase]');
await page.waitForTimeout(600);await page.screenshot({path:output+'/shuffle-split.png'});
await page.waitForTimeout(560);await page.screenshot({path:output+'/shuffle-merge.png'});await clean();
assert.equal(await page.locator('#pile-myDeck').getAttribute('data-count'),'12');
assert.equal(await page.locator('#pile-myDisc').getAttribute('data-count'),'0');
// Fast-forward, reduced motion and viewport changes cannot leave invisible piles.
await start('opp');await page.waitForSelector('[data-shuffle-phase]');await page.evaluate(()=>qa.A.setFxSkip(true));await clean();await page.evaluate(()=>qa.A.setFxSkip(false));
await start();await page.waitForSelector('[data-shuffle-phase]');await page.setViewportSize({width:900,height:700});await clean();
await page.emulateMedia({reducedMotion:'reduce'});await start();await clean();await page.emulateMedia({reducedMotion:'no-preference'});
// Engine event is emitted only on refill, before the draw, and carries no identities.
const result=await page.evaluate(()=>{
  const check=(deckCount,shelfCount)=>{
    const g=structuredClone(qa.g);g.pending=null;g.cur=1;g.players.forEach(p=>{p.hand=[];p.field=[];p.enchants=[];p.traps=[];});
    g.players[0].deck=g.players[0].deck.slice(0,deckCount);g.players[0].discard=g.players[0].discard.slice(0,shelfCount);
    return qa.E.reduce(g,{type:'endTurn'});
  };
  const refill=check(0,12),empty=check(0,0),full=check(6,12),partial=check(1,12);
  return {refill:refill.events.filter(e=>e.type==='reshuffle'||e.type==='draw'),empty:empty.events,full:full.events,partial:partial.events,hand:refill.state.players[0].hand.length,shelf:refill.state.players[0].discard.length};
});
assert.equal(result.refill[0].type,'reshuffle');assert.deepEqual(Object.keys(result.refill[0]).sort(),['count','player','type']);
assert.equal(result.refill[0].count,12);assert(result.refill.some(e=>e.type==='draw'));assert(result.hand>0);assert.equal(result.shelf,0);
assert(!result.empty.some(e=>e.type==='reshuffle'));assert(!result.full.some(e=>e.type==='reshuffle'));assert(result.partial.some(e=>e.type==='reshuffle'));
// Mobile rack/deck fit their retained clickable anchors; empty rack persists.
await page.setViewportSize({width:390,height:844});
await page.evaluate(()=>{qa.g.players[0].deck=[];qa.g.players[0].discard=[];qa.view.render(qa.g);});await page.waitForTimeout(300);
await page.screenshot({path:output+'/mobile.png'});
assert.equal(await page.locator('.pile--3d-ready').count(),4);
for(const id of ['pile-myDeck','pile-myDisc','pile-oppDeck','pile-oppDisc']){
  const b=await page.locator('#'+id).boundingBox();assert(b.x>=0&&b.x+b.width<=391,`${id} within mobile viewport`);
}
await start('opp');await page.waitForSelector('[data-shuffle-phase]');await page.waitForTimeout(550);await page.screenshot({path:output+'/mobile-shuffle.png'});await clean();
// Real controller: authoritative refill event -> shuffle -> draw -> usable hand.
await page.setViewportSize({width:1280,height:800});
await page.evaluate(async()=>{
  qa.view.destroy();document.getElementById('app').innerHTML='';
  const {BaseController}=await import('/src/game/controller.ts');
  class Control extends BaseController {submit(){} init(g){this.state=g;this.introShown=true;this.view.render(g);} feed(res){this.applyResult(res,true);return this.queue;}}
  const g=structuredClone(qa.g);g.pending=null;g.cur=1;g.turn=3;
  g.players.forEach(p=>{p.hand=[];p.field=[];p.enchants=[];p.traps=[];});
  g.players[0].deck=[];g.players[0].discard=g.players[1].discard;
  qa.control=new Control(document.getElementById('app'),0,{onHome(){},onRematch(){}});qa.control.init(g);
  qa.refill=qa.E.reduce(g,{type:'endTurn'});
});
await page.waitForSelector('.pile--3d-ready');
await page.evaluate(()=>{qa.playback=qa.control.feed(qa.refill);});
await page.waitForSelector('[data-shuffle-phase]');
await page.screenshot({path:output+'/controller-reshuffle.png'});
await page.waitForSelector('.paper-draw-canvas');
await page.screenshot({path:output+'/controller-refill-draw.png'});
await page.evaluate(()=>qa.playback);
assert.equal(await page.locator('.paper-draw-canvas,.is-shuffling').count(),0);
assert.equal(await page.locator('#hand .card').count(),3);
assert.equal(await page.locator('#pile-myDisc .pile-count').innerText(),'0');
// GPU loss restores raster fallback and removes every 3D readiness marker.
await page.evaluate(()=>document.querySelector('.duel-objects-3d').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());await page.waitForTimeout(150);
assert.equal(await page.locator('.pile--3d-ready,.duel-objects-3d').count(),0);
await page.evaluate(()=>{qa.control.destroy();qa.stopLayout();});
assert.deepEqual(errors,[]);
await fs.writeFile(output+'/browser-checks.json',JSON.stringify({sizes,drag,engine:result.refill,errors,checks:['4 GPU piles / one context','65% hand','field-fit drag','in-air interleave','empty and partial deck events','cancel / resize / reduced motion','mobile bounds','GPU fallback','actual controller refill then draw']},null,2));
await browser.close();console.log('PASS: library piles, hand/drag sizes, shuffle events, privacy, cancellation, mobile and GPU fallback');
