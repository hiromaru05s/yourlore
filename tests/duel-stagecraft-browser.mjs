import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5182';
const out=process.env.LORE_TEST_OUTPUT||'docs/ui-rework/2026-09-10-stagecraft';await fs.mkdir(out,{recursive:true});
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
await page.waitForSelector('.supply-model-ready');await page.waitForTimeout(800);
const atlas=await page.evaluate(async()=>{
 const img=new Image();img.src='/art/biblion/release/rift-purple07-idle16.png';await img.decode();const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const p=ctx.getImageData(0,0,img.width,img.height).data;let clear=0,opaque=0;for(let i=3;i<p.length;i+=4){if(p[i]===0)clear++;if(p[i]===255)opaque++;}return {width:img.width,height:img.height,clear,opaque};
});assert(atlas.clear>atlas.width*atlas.height*.65);assert(atlas.opaque>0);
const rift=page.locator('.rift-button').first();await rift.hover();assert.equal(await rift.locator('.rift-sprite').evaluate(e=>getComputedStyle(e,'::after').animationPlayState),'paused');await page.mouse.move(10,160);

const checkLayout=async()=>page.evaluate(()=>{
 const rect=s=>document.querySelector(s).getBoundingClientRect().toJSON();
 return {self:rect('#portraitMe .avatar'),opp:rect('#portraitOpp .avatar'),meFrame:rect('#portraitMe .pt-ring'),oppFrame:rect('#portraitOpp .pt-ring'),hand:rect('#hand .card'),oppHand:rect('#oppHand .card--back'),market:rect('#market'),end:rect('#endBtn'),tile:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--card-w'))};
});
const layouts=[];
for(const [width,height] of [[1280,720],[1920,1080],[1814,1274],[390,844]]){
 await page.setViewportSize({width,height});await page.evaluate(()=>qa.c.reset());await page.waitForTimeout(400);const m=await checkLayout();layouts.push({width,height,...m});await page.screenshot({path:out+`/layout-${width}.png`});
 assert(Math.abs(m.meFrame.width-m.oppFrame.width)<1);assert(m.opp.y>=0);assert(m.oppHand.y<8);assert(m.end.right<=width-4);assert(m.end.left>=0);assert(Math.abs(m.hand.width-m.oppHand.width)<1);await page.screenshot({path:out+`/layout-${width}.png`});
}
await page.setViewportSize({width:1280,height:720});await page.evaluate(()=>{qa.c.reset();qa.c.state.players[0].mana=0;qa.c.view.render(qa.c.state);});await page.waitForTimeout(300);
await page.locator('#fixedMarket .card').first().hover();await page.waitForSelector('.card-block-tip');assert.match(await page.locator('.card-block-tip').innerText(),/マナ/);
assert.match(await page.locator('#fixedMarket .card').first().evaluate(e=>getComputedStyle(e).cursor),/blocked.svg/);
assert.match(await page.locator('#hand .card').first().evaluate(e=>getComputedStyle(e).filter),/grayscale\(1\)/);await page.screenshot({path:out+'/mana-blocked.png'});
// Spell conditions are reflected before a failed play attempt.
await page.evaluate(()=>{qa.c.reset();const p=qa.c.state.players[0];p.hand=[{...qa.C.DB.BEGINNER_MIND,uid:'condition'}, {...qa.C.DB.ELF,uid:'other'}];qa.c.view.render(qa.c.state);});
assert(await page.locator('#hand .card').first().getAttribute('data-block-reason'));
// A spell can be dragged into the outer board margin, away from monster slots.
await page.evaluate(()=>qa.c.reset());const hand=page.locator('#hand .card').nth(2),r=await hand.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(50,300,{steps:16});assert(await page.locator('.play-drop-guide.is-ready').count());await page.mouse.up();await page.evaluate(()=>qa.c.queue);
await page.screenshot({path:out+'/wide-spell-drop.png'});
// Empty plinth first, then opposite diagonal card streams, fixed right-to-left.
await page.evaluate(()=>{qa.A.setFxSkip(false);qa.c.introShown=false;qa.c.applyResult(qa.E.createGame({mode:'bot',seed:71,starting:1,p0:{id:'a',name:'YOU'},p1:{id:'b',name:'OPP'}}),false);});
await page.waitForSelector('[data-opening-phase="market"]');await page.waitForTimeout(150);
assert.equal(await page.locator('#fixedMarket .card').evaluateAll(cs=>cs.filter(c=>getComputedStyle(c).visibility==='visible').length),0);await page.screenshot({path:out+'/empty-market-fall.png'});
await page.waitForSelector('[data-opening-phase="market-cards"]');await page.waitForTimeout(480);await page.screenshot({path:out+'/market-card-streams.png'});
await page.waitForFunction(()=>document.querySelectorAll('#fixedMarket [data-intro-landed]').length>=2);
const landed=await page.locator('#fixedMarket .card').evaluateAll(cs=>cs.map(c=>c.dataset.introLanded==='true'));assert(landed.at(-1));assert(!landed[0]);
await page.waitForSelector('[data-opening-phase="furniture"]');await page.waitForTimeout(200);await page.screenshot({path:out+'/furniture-from-above.png'});
await page.waitForSelector('[data-opening-phase="decks"]');await page.waitForTimeout(700);await page.screenshot({path:out+'/deck-streams.png'});
await page.waitForSelector('.ct-model');await page.waitForTimeout(850);await page.screenshot({path:out+'/coin-bounce.png'});await page.waitForSelector('[data-coin-settled="tails"]');await page.screenshot({path:out+'/coin-rest.png'});
assert.equal(await page.locator('.coin-model-canvas').count(),1);
await page.waitForFunction(()=>document.querySelectorAll('.paper-draw-canvas').length===2);await page.waitForFunction(()=>!document.querySelector('.paper-draw-canvas'));
assert.equal(await page.locator('#hand .card').count(),3);assert.equal(await page.locator('.coin-model-canvas').count(),0);
assert.deepEqual(errors,[]);await fs.writeFile(out+'/stagecraft-browser.json',JSON.stringify({layouts,atlas,errors,checks:['shared avatar frames and compact hand size','top hand anchoring','mana tooltip and cursor','condition grey-out','wide spell drop','empty market first','right-to-left fixed stream','3D coin tails and cleanup','simultaneous opening hands']},null,2));
await page.evaluate(()=>{qa.c.destroy();qa.stop();});console.log('PASS: stagecraft browser');
}finally{await browser.close();}
