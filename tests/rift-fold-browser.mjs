import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5182';
const out=process.env.LORE_TEST_OUTPUT||'docs/ui-rework/2026-09-10-rift-fold';await fs.mkdir(out,{recursive:true});
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
await page.evaluate(()=>{qa.c.state.players[0].field=[{...qa.C.DB.ELF,uid:'fold-source'}];qa.c.view.render(qa.c.state);});
await page.waitForTimeout(200);
// Freeze rAF time during each screenshot; screenshot encoding must not advance
// the 1.35s effect past the intended sample on slower GPUs.
await page.evaluate(()=>{qa.nativeNow=performance.now.bind(performance);qa.nativeRaf=requestAnimationFrame.bind(window);qa.clock=qa.nativeNow();qa.begun=qa.clock;performance.now=()=>qa.clock??qa.nativeNow();window.requestAnimationFrame=cb=>qa.nativeRaf(now=>cb(qa.clock??now));qa.fold=qa.A.exileCard(qa.c.state.players[0].field[0],'me',document.querySelector('#meRow [data-uid="fold-source"]'));});
await page.waitForSelector('.rift-fold-canvas');
assert.equal(await page.locator('#meRow [data-uid="fold-source"]').evaluate(e=>getComputedStyle(e).visibility),'hidden');
const frames=[];
for(const [name,progress] of [['bend',.23],['ingest',.52],['tail',.84]]){
 await page.evaluate(p=>{qa.clock=qa.begun+1350*p;},progress);
 await page.waitForFunction(p=>Number(document.querySelector('.rift-fold-canvas')?.dataset.progress)>=p-.001,progress);
 frames.push(await page.locator('.rift-fold-canvas').evaluate(e=>({progress:Number(e.dataset.progress),opacity:getComputedStyle(e).opacity})));
 await page.screenshot({path:out+'/rift-'+name+'.png'});
}
await page.evaluate(()=>{qa.clock=qa.begun+1351;});await page.evaluate(()=>qa.fold);await page.evaluate(()=>{qa.clock=null;performance.now=qa.nativeNow;window.requestAnimationFrame=qa.nativeRaf;});assert.equal(await page.locator('.rift-fold-canvas,.is-absorbing').count(),0);
assert.equal(await page.locator('#meRow [data-uid="fold-source"]').evaluate(e=>getComputedStyle(e).visibility),'hidden');
assert(frames.every(f=>f.opacity==='1'));
// Opponent / replay cancellation removes GPU overlays and target effects.
await page.evaluate(()=>{qa.c.reset();qa.fold=qa.A.exileCard({...qa.C.DB.ELF,uid:'cancel'},'opp',document.querySelector('#hand .card'));});
await page.waitForSelector('.rift-fold-canvas');await page.evaluate(()=>qa.A.setFxSkip(true));await page.evaluate(()=>qa.fold);await page.waitForTimeout(80);
assert.equal(await page.locator('.rift-fold-canvas,.is-absorbing').count(),0);await page.evaluate(()=>qa.A.setFxSkip(false));
// Reuse the same PaperCard implementation for draw after the custom warp.
await page.evaluate(()=>{qa.c.reset();qa.draw=qa.A.animateDraw(document.getElementById('hand'),3,'me');});await page.evaluate(()=>qa.draw);assert.equal(await page.locator('.paper-draw-canvas').count(),0);
await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>qa.A.exileCard({...qa.C.DB.ELF,uid:'reduce'},'me',document.querySelector('#hand .card')));assert.equal(await page.locator('.rift-fold-canvas,.is-absorbing').count(),0);
assert.deepEqual(errors,[]);await fs.writeFile(out+'/rift-browser.json',JSON.stringify({frames,errors,checks:['public card deforming mesh','opacity stays one through last tail','source never reappears before state commit','opponent rift and fast-forward cleanup','shared paper draw regression','reduced motion fallback']},null,2));
await page.evaluate(()=>{qa.c.destroy();qa.stop();});console.log('PASS: rift folding browser');
}finally{await browser.close();}
