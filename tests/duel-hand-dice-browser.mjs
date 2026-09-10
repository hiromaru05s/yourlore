import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5182';
const out=process.env.LORE_TEST_OUTPUT||'docs/ui-rework/2026-09-10-hand-dice';await fs.mkdir(out,{recursive:true});
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
assert.equal(await page.locator('.duel-loader img').getAttribute('src'),'/art/brand/lore-logo-transparent.png');assert.equal(await page.locator('.duel-load-track').count(),1);
await page.screenshot({path:out+'/preparation-cover.png'});releaseModels();
await page.waitForSelector('.supply-model-ready');await page.waitForSelector('.duel-table-ready');await page.waitForTimeout(700);
await page.waitForFunction(()=>!document.querySelector('.duel-preparing'));
assert.equal(await page.locator('.game').evaluate(e=>getComputedStyle(e).visibility),'visible');
assert.equal(await page.locator('#app').getAttribute('data-scene-ready'),'true');
assert(Number(await page.locator('#app').getAttribute('data-preloaded-images'))>20);

const layouts=[];
for(const [width,height] of [[1280,720],[1920,1080],[1814,1274],[390,844]]){
 await page.setViewportSize({width,height});await page.evaluate(()=>{qa.c.reset();qa.c.state.players[0].maxMana=6;qa.c.state.players[0].mana=4;qa.c.state.players[1].maxMana=6;qa.c.state.players[1].mana=6;qa.c.view.render(qa.c.state);});await page.waitForTimeout(500);
 await page.screenshot({path:out+`/layout-${width}.png`});
 const m=await page.evaluate(()=>{const r=s=>document.querySelector(s).getBoundingClientRect().toJSON();return {me:r('#portraitMe .pt-ring'),opp:r('#portraitOpp .pt-ring'),head:r('#portraitOpp .avatar'),field:r('#meRow'),market:r('#market'),end:r('#endBtn'),mana:r('#portraitMe .pt-mana'),hand:r('#hand'),name:r('#portraitMe .pt-name'),oppHand:r('#oppHand')};});
 assert(Math.abs(m.me.width-m.opp.width)<1);assert(m.opp.top<0);assert(m.me.bottom>height);assert(m.head.top>=0);assert(m.end.right<width);assert(m.hand.bottom<=height+1);assert(m.name.bottom<=height,JSON.stringify({width,height,name:m.name}));assert(m.oppHand.top>=0);layouts.push({width,height,...m});
}
await page.setViewportSize({width:1280,height:720});await page.evaluate(()=>{qa.c.reset();qa.c.view.setHandOpen(true);});await page.mouse.move(4,200);await page.waitForTimeout(300);
const order=await page.locator('#hand .card').evaluateAll(cards=>cards.map(c=>Number(getComputedStyle(c).zIndex)));assert(order.every((n,i)=>!i||n<order[i-1]));await page.screenshot({path:out+'/hand-left-front.png'});
// A single public face on a two-card shelf, with no phantom card backs.
await page.evaluate(()=>{qa.c.state.players[0].discard=[0,1].map(i=>({...qa.C.DB.GOLEM1,uid:'golem-'+i}));qa.c.view.render(qa.c.state);});await page.waitForTimeout(250);assert.equal(await page.locator('#pile-myDisc .pile-print .card').count(),1);await page.locator('#pile-myDisc').screenshot({path:out+'/shelf-golem.png'});
// Real purchase selection uses the alpha contour of the frame and seals.
await page.locator('#fixedMarket .card').first().click();await page.waitForSelector('.card.is-armed');await page.waitForTimeout(250);
const outline=await page.locator('.card.is-armed').evaluate(e=>({outline:getComputedStyle(e).outlineWidth,shadow:getComputedStyle(e).boxShadow,frame:getComputedStyle(e.querySelector('.card-frame')).filter}));assert.equal(outline.outline,'0px');assert.equal(outline.shadow,'none');assert.match(outline.frame,/drop-shadow/);await page.screenshot({path:out+'/purchase-contour.png'});await page.locator('#market').click({position:{x:2,y:2},force:true});
// The incoming rightmost card passes behind two existing native faces. Their
// pixels and screen geometry stay unchanged; abort restores all three cards.
await page.evaluate(()=>{qa.nativeNow=performance.now.bind(performance);qa.nativeRaf=requestAnimationFrame.bind(window);qa.clock=qa.drawStart=qa.nativeNow();performance.now=()=>qa.clock;window.requestAnimationFrame=cb=>qa.nativeRaf(()=>cb(qa.clock));qa.draw=qa.A.animateDraw(document.getElementById('hand'),1,'me');});await page.waitForSelector('.paper-draw-canvas');await page.waitForSelector('.draw-grip');
assert.equal(await page.locator('.draw-grip').count(),2);
const grips=await page.locator('.draw-grip').evaluateAll(nodes=>nodes.map(e=>({x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y,w:e.getBoundingClientRect().width,z:Number(getComputedStyle(e).zIndex)})));assert(grips[0].z>grips[1].z);
const originals=await page.locator('#hand .card').evaluateAll(nodes=>nodes.slice(0,2).map(e=>({x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y,w:e.getBoundingClientRect().width})));for(let i=0;i<2;i++)for(const key of ['x','y','w'])assert(Math.abs(grips[i][key]-originals[i][key])<1);
await page.evaluate(()=>{qa.clock=qa.drawStart+690;});await page.waitForTimeout(80);await page.screenshot({path:out+'/draw-under-hand.png'});
await page.evaluate(async()=>{qa.A.setFxSkip(true);await qa.draw;performance.now=qa.nativeNow;window.requestAnimationFrame=qa.nativeRaf;qa.A.setFxSkip(false);});assert.equal(await page.locator('.draw-grip,.paper-draw-canvas').count(),0);assert(await page.locator('#hand .card').evaluateAll(nodes=>nodes.every(n=>getComputedStyle(n).visibility==='visible')));
// Real dice panel, including source-owner versus roller-owner distinction.
await page.evaluate(async()=>{qa.dice=await import('/src/ui/dice.ts');});
for(const [name,source,roller,values] of [['own',{id:'STARTER_CHEST',player:0},0,[6]],['opponent',{id:'ND2',player:1},1,[3,5]],['opponent-roll-own-card',{id:'ND3',player:0},1,[2]],['status',{status:'brand',player:1},1,[2,6]]]){
 await page.evaluate(({source,roller,values})=>{qa.roll=qa.dice.diceRollAnim(values,{mine:roller===0,source,viewer:0});},{source,roller,values});await page.waitForSelector('.d3-overlay');
 assert.equal(await page.locator('.d3-owner').innerText(),source.player===0?'あなたの効果':'相手の効果');if(source.id)assert.equal(await page.locator('.d3-source').getAttribute('data-card-id'),source.id);
 await page.screenshot({path:out+'/dice-'+name+'.png'});await page.keyboard.press('Escape');await page.evaluate(()=>qa.roll);assert.equal(await page.locator('.d3-overlay').count(),0);
}
await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{qa.roll=qa.dice.diceRollAnim([4,5],{mine:true,source:{id:'ND2',player:0},viewer:0});});await page.waitForSelector('.d3-overlay');await page.screenshot({path:out+'/dice-mobile.png'});assert(await page.locator('.d3-source').evaluate(e=>e.getBoundingClientRect().left>=0));await page.keyboard.press('Escape');await page.evaluate(()=>qa.roll);
await fs.writeFile(out+'/browser.json',JSON.stringify({layouts,order,outline,grips,errors},null,2));assert.deepEqual(errors,[]);
console.log('PASS: logo readiness cover, cropped frame layout, visible heads, left-front hand, authoritative dice source, both owners, status, mobile and interruption');
}finally{await browser.close();}
