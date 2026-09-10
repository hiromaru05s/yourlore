import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5182';
const out=process.env.LORE_TEST_OUTPUT||'docs/ui-rework/2026-09-10-motion-layout';await fs.mkdir(out,{recursive:true});
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
assert.equal(await page.locator('.game').evaluate(e=>getComputedStyle(e).visibility),'hidden');
await page.screenshot({path:out+'/preparation-cover.png'});releaseModels();
await page.waitForSelector('.supply-model-ready');await page.waitForSelector('.duel-table-ready');await page.waitForTimeout(700);
await page.waitForFunction(()=>!document.querySelector('.duel-preparing'));
assert.equal(await page.locator('.game').evaluate(e=>getComputedStyle(e).visibility),'visible');
assert.equal(await page.locator('#app').getAttribute('data-scene-ready'),'true');
assert(Number(await page.locator('#app').getAttribute('data-preloaded-images'))>20);

const layouts=[];
for(const [width,height] of [[1280,720],[1920,1080],[1814,1274],[390,844]]){
 await page.setViewportSize({width,height});await page.evaluate(async()=>{qa.c.reset();qa.c.state.players[0].maxMana=6;qa.c.state.players[0].mana=6;qa.c.view.render(qa.c.state);(await import('/src/ui/duelClock.ts')).paintDuelClock(document.getElementById('clock-opp'),76,90,false);});await page.waitForTimeout(450);
 const m=await page.evaluate(()=>{const r=s=>document.querySelector(s).getBoundingClientRect().toJSON();const btn=document.getElementById('refreshBtn'),supply=document.getElementById('supplyMarket');return {rerollLocal:{w:btn.offsetWidth,h:btn.offsetHeight,right:btn.parentElement.offsetLeft+btn.offsetLeft+btn.offsetWidth,supply:supply.offsetLeft},me:r('#portraitMe .pt-ring'),opp:r('#portraitOpp .pt-ring'),name:r('#portraitMe .pt-name'),hp:r('#hpbar-me'),reroll:r('#refreshBtn'),supply:r('#supplyMarket'),market:r('#market'),end:r('#endBtn'),gem:r('#portraitMe .mana-crystal'),selfFlip:getComputedStyle(document.querySelector('#portraitMe .pt-ring'),'::after').transform,oppFlip:getComputedStyle(document.querySelector('#portraitOpp .pt-ring'),'::after').transform,timer:getComputedStyle(document.querySelector('#clock-opp .tc-progress')).stroke,field:r('#meRow')};});
 await page.screenshot({path:out+`/layout-${width}.png`});
 assert(Math.abs(m.me.width-m.opp.width)<1);assert.match(m.selfFlip,/-1/);assert.equal(m.oppFlip,'none');assert(m.name.top>=m.hp.bottom,JSON.stringify({width,height,m}));assert(m.rerollLocal.right<=m.rerollLocal.supply+1,JSON.stringify({width,height,m}));assert(Math.abs(m.rerollLocal.w-m.rerollLocal.h)<1);assert(m.end.right<width,JSON.stringify({width,height,m}));assert(Math.abs(m.gem.width-m.gem.height)<1);assert.equal(m.timer,'rgb(236, 172, 160)');
 layouts.push({width,height,...m});
}
await page.setViewportSize({width:1280,height:720});await page.mouse.move(2,200);
// Same physical gesture survives the source DOM being replaced mid-drag.
const drags=[];
for(const kind of ['monster','spell'])for(const mode of ['collapsed-left','expanded-near-hand','rerender','mana-changed']){
 await page.evaluate(({kind,mode})=>{qa.c.reset();const p=qa.c.state.players[0];p.maxHp=80;p.hand=[{...(kind==='monster'?qa.C.DB.ELF:qa.C.STARTERS.STARTER_MANA),uid:'drag-test'}];p.mana=30;p.maxMana=30;qa.c.view.render(qa.c.state);qa.c.view.setHandOpen(mode!=='collapsed-left');},{kind,mode});await page.waitForTimeout(240);
 const b=await page.locator('#hand .card').boundingBox(),sx=b.x+b.width*.5,sy=b.y+b.height*.5;
 const target=mode==='collapsed-left'?{x:32,y:440}:{x:sx,y:sy-44};
 await page.mouse.move(sx,sy);await page.mouse.down();await page.mouse.move(target.x,target.y,{steps:8});
 if(mode==='rerender'||mode==='mana-changed')await page.evaluate(mode=>{if(mode==='mana-changed')qa.c.state.players[0].mana=0;qa.c.view.render(qa.c.state);},mode);
 await page.mouse.move(target.x+1,target.y);await page.mouse.up();
 if(mode==='mana-changed'){assert.equal(await page.evaluate(()=>qa.c.state.players[0].hand.length),1);await page.waitForSelector('.cant-toast');await page.evaluate(()=>document.querySelector('.cant-toast')?.remove());}
 else {await page.waitForSelector('.cast-reveal');if(kind==='monster'&&mode==='rerender'){await page.waitForTimeout(440);await page.screenshot({path:out+'/monster-reveal.png'});}await page.evaluate(()=>qa.c.queue);assert.equal(await page.evaluate(()=>qa.c.state.players[0].hand.length),0);}
 assert.equal(await page.locator('.drag-ghost--hand,.play-drop-guide').count(),0);drags.push({kind,mode});
}
// A deliberate return to the original grip is still cancellation for both types.
for(const kind of ['monster','spell']){
 await page.evaluate(kind=>{qa.c.reset();qa.c.state.players[0].hand=[{...(kind==='monster'?qa.C.DB.ELF:qa.C.STARTERS.STARTER_MANA),uid:'cancel-test'}];qa.c.view.render(qa.c.state);qa.c.view.setHandOpen(true);},kind);await page.waitForTimeout(240);
 const b=await page.locator('#hand .card').boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y-90,{steps:4});await page.mouse.move(x,y,{steps:4});await page.mouse.up();assert.equal(await page.evaluate(()=>qa.c.state.players[0].hand.length),1);
}
await page.evaluate(()=>{qa.c.reset();qa.c.view.setHandOpen(false);qa.A.setFxSkip(false);qa.freeze=()=>{qa.nativeNow=performance.now.bind(performance);qa.nativeRaf=requestAnimationFrame.bind(window);qa.clock=qa.start=Math.max(qa.nativeNow(),qa.lastClock||0);performance.now=()=>qa.clock??qa.nativeNow();window.requestAnimationFrame=cb=>qa.nativeRaf(now=>cb(qa.clock??now));};qa.thaw=()=>{qa.lastClock=qa.clock;performance.now=qa.nativeNow;window.requestAnimationFrame=qa.nativeRaf;qa.clock=null;};});
await page.mouse.move(2,200);await page.waitForTimeout(300);
await page.evaluate(()=>{document.querySelector('.game').classList.add('opening-hands','awaiting-board');qa.freeze();qa.opening=qa.A.openingBoard();});
await page.waitForSelector('.opening-card-flight',{state:'attached'});
const opening=[];
for(const ms of [850,1450,1958,1980,2790]){
 await page.evaluate(ms=>{qa.clock=qa.start+ms;},ms);await page.waitForTimeout(70);
 const snapshot=await page.evaluate(()=>[...document.querySelectorAll('.opening-card-flight')].map(face=>{const source=document.querySelector(`#market .card[data-uid="${CSS.escape(face.dataset.uid)}"]`);return {uid:face.dataset.uid,visible:getComputedStyle(face).visibility,sourceVisible:getComputedStyle(source).visibility,width:face.querySelector('img').naturalWidth,src:face.querySelector('img').currentSrc,sourceSrc:source.querySelector('img').currentSrc,face:face.getBoundingClientRect().toJSON(),source:source.getBoundingClientRect().toJSON(),landed:source.dataset.introLanded==='true'};}));
 assert.equal(snapshot.length,12);assert(snapshot.every(c=>c.width>=384&&c.src===c.sourceSrc));
 if(ms===1450){const landed=snapshot.filter(c=>c.landed);assert(landed.length>=2);for(const c of landed)for(const k of ['x','y','width','height'])assert(Math.abs(c.face[k]-c.source[k])<.8,`native landing ${k}: ${JSON.stringify(c)}`);}
 if(ms===1980)assert(snapshot.every(c=>c.visible==='hidden'&&c.sourceVisible==='visible'));
 opening.push({ms,cards:snapshot});await page.screenshot({path:out+`/opening-${ms}.png`});
}
await page.evaluate(()=>{qa.clock=qa.start+4301;});await page.evaluate(()=>qa.opening);await page.evaluate(()=>{qa.thaw();document.querySelector('.game').classList.remove('opening-hands');});assert.equal(await page.locator('.opening-card-flight').count(),0);
// Inspect the separate shuffle stages and one landing impact.
await page.evaluate(()=>{qa.impacts=0;window.addEventListener('lore:summon-impact',()=>qa.impacts++);qa.freeze();qa.shuffle=import('/src/ui/boardMotion.ts').then(B=>B.moveOnBoard({kind:'shuffle',source:document.getElementById('pile-myDisc'),target:document.getElementById('pile-myDeck'),count:20,signal:new AbortController().signal}));});
await page.waitForSelector('.is-shuffling');const shuffle=[];
for(const [ms,expected] of [[300,'lift'],[1250,null],[2100,'square'],[2450,'land'],[2665,'land']]){
 await page.evaluate(ms=>{qa.clock=qa.start+ms;},ms);await page.waitForTimeout(60);const phase=await page.locator('#app').getAttribute('data-shuffle-phase');if(expected)assert.equal(phase,expected);shuffle.push({ms,phase});await page.screenshot({path:out+`/shuffle-${ms}.png`});
}
assert.equal(await page.evaluate(()=>qa.impacts),1);await page.evaluate(()=>{qa.clock=qa.start+2801;});await page.evaluate(()=>qa.shuffle);await page.evaluate(()=>qa.thaw());assert.equal(await page.locator('.is-shuffling').count(),0);
// GPU-free cancellation uses the same cleanup path and commits no transient cards.
await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(async()=>{const B=await import('/src/ui/boardMotion.ts');await B.moveOnBoard({kind:'opening',signal:new AbortController().signal});});assert.equal(await page.locator('.opening-card-flight').count(),0);
assert.deepEqual(errors,[]);await fs.writeFile(out+'/motion-layout-browser.json',JSON.stringify({layouts,drags,opening,shuffle,errors},null,2));
await page.evaluate(()=>{qa.c.destroy();qa.stop();});console.log('PASS: motion, readiness, native opening, re-render-safe drags, responsive layout');
}finally{await browser.close();}
