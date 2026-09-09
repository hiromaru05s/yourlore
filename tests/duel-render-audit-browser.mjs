import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5182';
const out=process.env.LORE_TEST_OUTPUT||'docs/ui-rework/2026-09-10-render-audit';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
await page.route('**/continuity-fixture',r=>r.fulfill({contentType:'text/html',body:'<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>'}));
let releaseModels;const modelsHeld=new Promise(resolve=>releaseModels=resolve);
await page.route('**/models/lore-table/**',async r=>{await modelsHeld;await r.continue();});
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
assert.equal(await page.locator('.game').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(238, 234, 227)');
await page.screenshot({path:out+'/cold-white-table.png'});releaseModels();
await page.waitForSelector('.supply-model-ready');await page.waitForSelector('.duel-table-ready');await page.waitForTimeout(700);
assert.equal(await page.evaluate(()=>qa.bootBackground),'none');

// Inspect the first synchronous render, before RAF/observers can repair it.
await page.evaluate(()=>{
 qa.commits=[];const render=qa.c.view.render.bind(qa.c.view);
 qa.c.view.render=g=>{render(g);qa.commits.push({
   transform:document.querySelector('.market-counter').style.transform,
   shelfVisible:getComputedStyle(document.querySelector('#pile-myDisc .pile-print')).visibility,
   arts:[...document.querySelectorAll('#fixedMarket .card-art img')].map(img=>({loaded:img.classList.contains('art-loaded'),opacity:getComputedStyle(img).opacity}))
 });};
 qa.freeze=()=>{qa.nativeNow=performance.now.bind(performance);qa.nativeRaf=requestAnimationFrame.bind(window);qa.clock=qa.start=qa.nativeNow();performance.now=()=>qa.clock??qa.nativeNow();window.requestAnimationFrame=cb=>qa.nativeRaf(now=>cb(qa.clock??now));};
 qa.thaw=()=>{performance.now=qa.nativeNow;window.requestAnimationFrame=qa.nativeRaf;qa.clock=null;};
});
await page.setViewportSize({width:1920,height:1080});await page.waitForTimeout(500);
await page.screenshot({path:out+'/native-shelf-1920.png'});
const shelf=await page.locator('#pile-myDisc .pile-print .card').evaluate(e=>({width:e.offsetWidth,artWidth:e.querySelector('img').naturalWidth,opacity:getComputedStyle(e.querySelector('img')).opacity}));
assert(shelf.artWidth>=384);assert.equal(shelf.opacity,'1');
await page.evaluate(()=>{qa.c.state.players[0].mana=5;qa.c.view.render(qa.c.state);qa.freeze();qa.c.onBuyMarket(0);});
await page.waitForSelector('[data-motion="arrival"]');
await page.evaluate(()=>{qa.clock=qa.start+620;});await page.waitForTimeout(80);
const layers=await page.evaluate(()=>({flight:getComputedStyle(document.querySelector('.board-flight-canvas')).zIndex,app:getComputedStyle(document.querySelector('#app')).zIndex}));assert(Number(layers.flight)>Number(layers.app));
await page.screenshot({path:out+'/purchase-over-market.png'});
await page.evaluate(()=>{qa.clock=qa.start+961;});
await page.waitForFunction(()=>document.querySelector('#pile-myDisc').dataset.count==='2');
const touchdown=await page.locator('#pile-myDisc .pile-print .card').boundingBox();
await page.screenshot({path:out+'/purchase-touchdown.png'});
await page.evaluate(()=>{qa.clock=qa.start+1000;});await page.evaluate(()=>qa.c.queue);await page.evaluate(()=>qa.thaw());
const settled=await page.locator('#pile-myDisc .pile-print .card').boundingBox();
for(const k of ['x','y','width','height'])assert(Math.abs(touchdown[k]-settled[k])<1,`${k} changed at commit`);
assert.equal(await page.evaluate(()=>qa.c.state.players[0].mana),1);
assert.match(await page.locator('#fixedMarket .card').first().evaluate(e=>getComputedStyle(e).filter),/grayscale/);
await page.screenshot({path:out+'/purchase-committed.png'});
const purchaseCommit=await page.evaluate(()=>qa.commits.at(-1));assert.match(purchaseCommit.transform,/matrix3d/);assert.equal(purchaseCommit.shelfVisible,'visible');assert(purchaseCommit.arts.every(a=>a.loaded&&a.opacity==='1'));
// The transparent border stays transparent in a texture; no opaque stock caps.
const alpha=await page.evaluate(async()=>{const S=await import('/src/ui/cardSurface.ts'),T=await import('/node_modules/.vite/deps/three.js'),P=await import('/src/ui/pileModels.ts');const face=(await S.capturePileSurface(document.querySelector('#pile-myDisc .pile-print .card'),document.querySelector('#pile-myDisc').dataset.sleeve)).face;
 const ctx=face.getContext('2d');const stock=P.cardStock(new T.Texture(),new T.CanvasTexture(face));return {w:face.width,corner:ctx.getImageData(0,0,1,1).data[3],capVisible:stock.children[0].material[0].visible};});assert(alpha.w>1800);assert.equal(alpha.corner,0);assert.equal(alpha.capVisible,false);
// Repeat real drags from collapsed/expanded hands, away from spell slots.
const drags=[];
for(const mode of ['collapsed-left','expanded-center','expanded-over-hand']){
 await page.evaluate(()=>{qa.c.reset();qa.c.state.players[0].maxMana=5;qa.c.state.players[0].mana=5;qa.c.state.players[0].hand=[{...qa.C.STARTERS.STARTER_MANA,uid:'attune-drag'}];qa.c.view.render(qa.c.state);});
 if(mode!=='collapsed-left')await page.evaluate(()=>qa.c.view.setHandOpen(true));
 await page.waitForTimeout(300);const b=await page.locator('#hand .card').boundingBox();const sx=b.x+b.width/2,sy=b.y+b.height/2;
 const target=mode==='collapsed-left'?{x:40,y:420}:mode==='expanded-center'?{x:960,y:550}:{x:sx,y:sy-45};
 await page.mouse.move(sx,sy);await page.mouse.down();await page.mouse.move(target.x,target.y,{steps:8});assert.equal(await page.locator('.play-drop-guide.is-ready').count(),1,mode);await page.mouse.up();
 await page.waitForSelector('.cast-reveal');
 if(mode==='collapsed-left'){await page.waitForTimeout(460);await page.screenshot({path:out+'/attune-reveal-transparent.png'});}
 await page.evaluate(()=>qa.c.queue);assert.equal(await page.evaluate(()=>qa.c.state.players[0].hand.length),0);assert.equal(await page.evaluate(()=>qa.c.state.players[0].maxMana),6);drags.push(mode);
 const commit=await page.evaluate(()=>qa.commits.at(-1));assert.equal(commit.shelfVisible,'visible');assert(commit.arts.every(a=>a.loaded&&a.opacity==='1'));assert.match(commit.transform,/matrix3d/);
}
// Returning a spell to the same hand position cancels without consuming it.
await page.evaluate(()=>{qa.c.reset();qa.c.view.setHandOpen(true);});await page.waitForTimeout(250);
const b=await page.locator('#hand .card').last().boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(600,500,{steps:6});await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:6});await page.mouse.up();assert.equal(await page.evaluate(()=>qa.c.state.players[0].hand.length),3);
// Real engine end-turn picker, two selected cards, two visible flights to shelf.
await page.evaluate(()=>{qa.c.reset();qa.c.state.players[0].hand=Array.from({length:7},(_,i)=>({...qa.C.STARTERS.STARTER_CHEST,uid:'overflow-'+i}));qa.c.view.render(qa.c.state);qa.discards=[];qa.observer=new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n instanceof HTMLElement&&n.dataset.discardFlight)qa.discards.push(n.dataset.discardFlight);});qa.observer.observe(document.body,{childList:true});qa.c.submit({type:'endTurn'});});
await page.waitForSelector('.picker-grid');await page.locator('.picker-grid .card').nth(0).click();await page.locator('.picker-grid .card').nth(1).click();await page.locator('.picker-modal .btn-gold').click();
await page.waitForSelector('[data-discard-flight]');await page.waitForFunction(()=>document.querySelector('#pile-myDisc')?.dataset.motion==='arrival');await page.screenshot({path:out+'/hand-discard-flight.png'});
await page.waitForFunction(()=>qa.c.state.players[0].hand.length===5);await page.evaluate(()=>qa.c.queue);assert.deepEqual(await page.evaluate(()=>qa.discards),['overflow-0','overflow-1']);assert.equal(await page.locator('#pile-myDisc').getAttribute('data-count'),'3');assert.equal(await page.locator('[data-discard-flight]').count(),0);await page.evaluate(()=>qa.observer.disconnect());
assert.deepEqual(errors,[]);await fs.writeFile(out+'/render-audit-browser.json',JSON.stringify({shelf,layers,touchdown,settled,purchaseCommit,alpha,drags,errors,checks:['cold white board with held model request','native shelf image resolution','front flight canvas','purchase touchdown matches committed native face','synchronous gray-out commit without blank art or unprojected market','transparent capture and cap geometry','three actual spell drag positions including expanded hand overlap','return-to-hand cancellation','actual two-card end-turn discard flights']},null,2));
await page.evaluate(()=>{qa.c.destroy();qa.stop();});console.log('PASS: render audit browser');
}finally{await browser.close();}
