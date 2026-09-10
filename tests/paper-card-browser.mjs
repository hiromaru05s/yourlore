// Run with a local Vite server. Set PLAYWRIGHT_MODULE when the shared QA runtime
// provides Playwright instead of a project-local installation.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin=process.env.LORE_TEST_ORIGIN || 'http://localhost:5173';
const output=process.env.LORE_TEST_OUTPUT || 'docs/ui-rework/2026-09-08-paper-cards';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--disable-features=LocalNetworkAccessChecks']});
const context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1});
const errors=[];
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.route('**/paper-card-fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>'}));
await page.goto(origin+'/paper-card-fixture');
await page.evaluate(async()=>{
  for(const css of ['tokens','base','card','game-overlays','game','dice','screens','mobile'])await import('/src/styles/'+css+'.css');
  const {GameView}=await import('/src/ui/boardView.ts');
  const {createGame}=await import('/src/shared/engine.ts');
  const {DB}=await import('/src/shared/cards.ts');
  const {setLang}=await import('/src/i18n.ts');setLang('ja');
  const g=createGame({mode:'bot',seed:42,starting:0,p0:{id:'a',name:'YOU'},p1:{id:'b',name:'OPP'}}).state;
  g.pending=null;
  const defs=['mon','spell','quest'].map(t=>Object.values(DB).find(c=>c.t===t));
  g.players[0].hand=defs.map((c,i)=>({...c,uid:'paper-'+i}));
  g.players[1].hand=defs.map((c,i)=>({...c,uid:'opponent-private-'+i}));
  const view=new GameView(document.getElementById('app'),0,new Proxy({},{get:()=>()=>{}}));view.render(g);
  const {startBoardLayout}=await import('/src/ui/layout.ts');
  window.qa={view,g,A:await import('/src/ui/anim.ts'),draw:null,stopLayout:startBoardLayout()};
  document.querySelector('.game').classList.add('hand-open');
});
await page.waitForFunction(()=>[...document.querySelectorAll('#hand img')].every(i=>i.complete&&i.naturalWidth));
await page.waitForFunction(()=>!document.querySelector('.duel-preparing'));
await page.waitForTimeout(300);
// The actual current face, including art aperture, cost, stats and Japanese text.
const surface=await page.evaluate(async()=>{
  const {captureCardSurface}=await import('/src/ui/cardSurface.ts');
  const s=await captureCardSurface(document.querySelector('#hand .card'),'/frames/sleeve_default.webp',true);
  return s.face.toDataURL();
});
await fs.writeFile(output+'/card-surface.png',Buffer.from(surface.split(',')[1],'base64'));
const start=async(side='me',count=3)=>{
  await page.evaluate(({side,count})=>{qa.draw=qa.A.animateDraw(document.getElementById(side==='me'?'hand':'oppHand'),count,side);},{side,count});
};
const clean=async()=>{
  await page.evaluate(()=>qa.draw);
  assert.equal(await page.locator('.paper-draw-canvas').count(),0);
  assert.equal(await page.locator('.card[style*="visibility: hidden"],.card--back[style*="visibility: hidden"]').count(),0);
};
await page.screenshot({path:output+'/resting.png'});
await start();await page.waitForSelector('.paper-draw-canvas');
await page.waitForTimeout(180);await page.screenshot({path:output+'/draw-peel.png'});
await page.waitForTimeout(180);await page.screenshot({path:output+'/draw-carry.png'});
await clean();
await page.screenshot({path:output+'/landed.png'});
// A normal browser samples actual frames to detect long stalls in steady playback.
const timing=await page.evaluate(async()=>{
  const times=[];let active=true,last=performance.now();
  const tick=now=>{times.push(now-last);last=now;if(active)requestAnimationFrame(tick);};requestAnimationFrame(tick);
  await qa.A.animateDraw(document.getElementById('hand'),3);active=false;
  return times.slice(3).sort((a,b)=>a-b);
});
// Mid-flight input fast-forward and screen teardown restore every destination.
await start();await page.waitForSelector('.paper-draw-canvas');
await page.evaluate(()=>qa.A.setFxSkip(true));await clean();await page.evaluate(()=>qa.A.setFxSkip(false));
await start();await page.waitForSelector('.paper-draw-canvas');
await page.setViewportSize({width:900,height:700});await clean();
await page.setViewportSize({width:1280,height:800});
// Let the resize event/layout settle before starting a fresh animation; a
// pending resize intentionally cancels in-flight cards in production.
await page.waitForTimeout(250);
// Opponent capture never accesses any front card nodes, even if one were attached.
assert(await page.evaluate(async()=>{
  const {captureCardSurface}=await import('/src/ui/cardSurface.ts');
  const node=document.querySelector('#oppHand .card--back');
  const query=node.querySelector;node.querySelector=()=>{throw new Error('Opponent face queried');};
  try{return (await captureCardSurface(node,'/frames/sleeve_default.webp',false)).face===null;}
  finally{node.querySelector=query;}
}));
await start('opp',2);await page.waitForSelector('.paper-draw-canvas');
await page.screenshot({path:output+'/opponent-back.png'});await clean();
await page.emulateMedia({reducedMotion:'reduce'});await start();await clean();await page.emulateMedia({reducedMotion:'no-preference'});
// Small, closed hand uses the same mesh and hands back to the scaled DOM layout.
await page.setViewportSize({width:390,height:844});
await page.evaluate(()=>document.querySelector('.game').classList.remove('hand-open'));
await page.waitForTimeout(250);
const mobileBounds=await page.evaluate(()=>{const d=document.querySelector('#pile-myDeck .pile-card').getBoundingClientRect(),h=document.querySelector('#hand .card').getBoundingClientRect();return [d,h].every(r=>r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight);});
assert(mobileBounds,'mobile deck and hand must be inside viewport');
await start();await page.waitForSelector('.paper-draw-canvas');
await page.waitForTimeout(220);await page.screenshot({path:output+'/mobile-draw.png'});await clean();
// Loss of the GPU while a card is in flight also releases the hidden DOM.
await start();await page.waitForSelector('.paper-draw-canvas');
await page.evaluate(()=>document.querySelector('.paper-draw-canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());await clean();
// Cancellation during texture loading must resolve immediately, before the image.
let releaseTexture;
const gate=new Promise(resolve=>{releaseTexture=resolve;});
await page.route('**/slow-paper-sleeve.webp',async route=>{await gate;await route.fulfill({contentType:'image/webp',body:await fs.readFile('client/public/frames/sleeve_default.webp')});});
await page.evaluate(()=>{const d=document.getElementById('pile-myDeck');qa.sleeve=d.dataset.sleeve;d.dataset.sleeve='/slow-paper-sleeve.webp';});
await start();await page.waitForTimeout(70);
const cancelStart=Date.now();await page.evaluate(()=>qa.A.setFxSkip(true));await clean();
assert(Date.now()-cancelStart<500);releaseTexture();
await page.evaluate(()=>{document.getElementById('pile-myDeck').dataset.sleeve=qa.sleeve;qa.A.setFxSkip(false);});
// A batch may contain six cards; all destinations return and no context remains.
await page.evaluate(()=>{const h=document.getElementById('hand');for(let i=0;i<3;i++){const c=h.children[i].cloneNode(true);c.dataset.uid='extra-'+i;h.append(c);}});
await start('me',6);await clean();
await start();await page.waitForSelector('.paper-draw-canvas');
await page.evaluate(()=>{qa.view.destroy();document.getElementById('app').innerHTML='';});await clean();
// Exercise the production controller hook: coin toss -> initial draw -> live turn.
await page.setViewportSize({width:1280,height:800});
await page.evaluate(async()=>{
  const {LocalController}=await import('/src/game/controller.ts');
  const saved=Math.random;Math.random=()=>.2;
  try{qa.controller=new LocalController(document.getElementById('app'),{onHome(){},onRematch(){}},'PAPER QA',undefined,'easy');}
  finally{Math.random=saved;}
});
await page.waitForSelector('.paper-draw-canvas',{timeout:12000});
await page.screenshot({path:output+'/controller-opening-draw.png'});
await page.waitForSelector('.paper-draw-canvas',{state:'detached'});
assert.equal(await page.locator('#hand .card[style*="visibility: hidden"]').count(),0);
await page.evaluate(()=>{qa.controller.destroy();qa.stopLayout();});
assert.deepEqual(errors,[]);
const result={checkedAt:new Date().toISOString(),checks:['current face texture','three sequential cards','flat DOM handoff','input cancellation','resize cancellation','opponent face privacy','reduced motion','390px compact hand','six-card batch','view teardown','GPU context loss','cancel during texture load','LocalController opening draw'],frameTiming:{samples:timing.length,medianMs:timing[Math.floor(timing.length*.5)],p95Ms:timing[Math.floor(timing.length*.95)]},errors};
await fs.writeFile(output+'/browser-verification.json',JSON.stringify(result,null,2));
console.log(result);
await browser.close();
