import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5178';
const output='docs/ui-rework/2026-09-08-home-and-drop';await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/drop-fixture',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>'}));
await page.goto(origin+'/drop-fixture');
await page.evaluate(async()=>{
 for(const css of ['tokens','base','card','game-overlays','game','dice','screens','mobile'])await import('/src/styles/'+css+'.css');
 const {BaseController}=await import('/src/game/controller.ts'),E=await import('/src/shared/engine.ts'),{DB}=await import('/src/shared/cards.ts');
 (await import('/src/i18n.ts')).setLang('ja');
 localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));
 class Controller extends BaseController {
  submitted=0;
  submit(action){this.submitted++;this.applyResult(E.reduce(this.state,action));}
  reset(mana=30){
   const g=E.createGame({mode:'bot',seed:71,starting:0,p0:{id:'a',name:'Hiromaru8368'},p1:{id:'b',name:'OPPONENT'}}).state;g.pending=null;
   g.players.forEach(p=>{p.field=[];p.enchants=[];p.traps=[];p.hand=[];p.maxMana=30;p.mana=30;});
   g.players[0].hand=[{...DB.NHEAL,uid:'permanent-test'}];g.players[0].mana=mana;
   this.state=g;this.introShown=true;this.view.render(g);this.view.setHandOpen(true);
  }
 }
 const c=new Controller(document.getElementById('app'),0,{});c.reset();
 const stop=(await import('/src/ui/layout.ts')).startBoardLayout();window.qa={c,stop};
});
await page.waitForTimeout(600);
async function begin(){const r=await page.locator('#hand .card').first().boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();return r;}
async function reset(mana=30){await page.evaluate(async m=>{await qa.c.queue;qa.c.reset(m);},mana);await page.waitForTimeout(300);}
const results=[];
for(const target of ['#meRow .zone-st','#meRow .zone-mon','#market']){
 await reset();await begin();const b=await page.locator(target).boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:12});
 await page.waitForSelector('.play-drop-guide.is-ready');assert.equal(await page.locator('#meRow .zone-st.drop-ready').count(),1);
 if(target.endsWith('zone-st'))await page.screenshot({path:output+'/permanent-drop-guide.png'});
 const before=await page.evaluate(()=>qa.c.submitted);const started=Date.now();await page.mouse.up();
 assert.equal(await page.evaluate(()=>qa.c.submitted),before+1);
 assert(await page.evaluate(()=>qa.c.state.players[0].enchants.some(e=>e.card.uid==='permanent-test')),'enchantment applied by actual reducer');
 assert(!await page.evaluate(()=>qa.c.state.players[0].hand.some(c=>c.uid==='permanent-test')));
 results.push({target,submissionMs:Date.now()-started});await page.evaluate(()=>qa.c.queue);
}
await page.screenshot({path:output+'/permanent-played.png'});
await reset();const card=await begin();await page.mouse.move(550,380,{steps:6});await page.mouse.move(card.x+card.width/2,card.y+card.height/2,{steps:6});assert.equal(await page.locator('.play-drop-guide.is-ready').count(),0);const n=await page.evaluate(()=>qa.c.submitted);await page.mouse.up();assert.equal(await page.evaluate(()=>qa.c.submitted),n);
await begin();await page.mouse.move(3,140,{steps:8});await page.mouse.up();assert.equal(await page.evaluate(()=>qa.c.submitted),n,'outside board does not play');
await reset(0);await begin();await page.mouse.move(550,380,{steps:8});assert.equal(await page.locator('.play-drop-guide.is-blocked').count(),1);await page.mouse.up();assert.equal(await page.evaluate(()=>qa.c.submitted),n);assert(await page.locator('.cant-toast').count()||await page.locator('[role="alert"]').count());
await reset();await begin();await page.mouse.move(550,380,{steps:8});await page.evaluate(()=>window.dispatchEvent(new PointerEvent('pointercancel')));await page.mouse.up();assert.equal(await page.locator('.play-drop-guide,.drag-ghost--hand,.drop-destination').count(),0);
// Native Chrome touch events exercise pointer capture on a phone viewport.
await page.setViewportSize({width:390,height:844});await reset();const r=await page.locator('#hand .card').boundingBox(),to=await page.locator('#meRow .zone-st').boundingBox();
const session=await page.context().newCDPSession(page);const x=r.x+r.width/2,y=r.y+r.height/2,tx=to.x+to.width/2,ty=to.y+to.height/2;
await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
for(let i=1;i<=10;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(tx-x)*i/10,y:y+(ty-y)*i/10}]});
await page.waitForSelector('.play-drop-guide.is-ready');await page.screenshot({path:output+'/permanent-touch.png'});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
assert(await page.evaluate(()=>qa.c.state.players[0].enchants.some(e=>e.card.uid==='permanent-test')));await page.evaluate(()=>qa.c.queue);
await page.evaluate(()=>{qa.c.destroy();qa.stop();});assert.deepEqual(errors,[]);await fs.writeFile(output+'/drop-checks.json',JSON.stringify({results,errors,checks:['real BaseController and reducer','spell lane / monster lane / market','immediate state commit','drop back and outside cancel','mana failure feedback','pointercancel cleanup','native touch permanent spell']},null,2));
await browser.close();console.log('PASS: permanent spell visible drop targets, actual controller state, cancellation, and native touch');
