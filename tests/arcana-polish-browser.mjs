import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5176';
const output='docs/ui-rework/2026-09-08-arcana-polish';await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--disable-features=LocalNetworkAccessChecks']});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/arcana-fixture',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>'}));
await page.goto(origin+'/arcana-fixture');
await page.evaluate(async()=>{
 for(const css of ['tokens','base','card','game-overlays','game','dice','screens','mobile'])await import('/src/styles/'+css+'.css');
 const {GameView}=await import('/src/ui/boardView.ts'),E=await import('/src/shared/engine.ts'),{DB}=await import('/src/shared/cards.ts');
 (await import('/src/i18n.ts')).setLang('ja');
 localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));
 const g=E.createGame({mode:'bot',seed:71,starting:0,p0:{id:'a',name:'YOU'},p1:{id:'b',name:'OPP'}}).state;g.pending=null;
 const defs=['spell','mon','trap','spell'].map(t=>Object.values(DB).find(c=>c.t===t&&!c.ench&&!c.req));
 g.players.forEach((p,side)=>{p.field=[];p.enchants=[];p.traps=[];p.mana=30;p.maxMana=30;p.hand=defs.map((c,i)=>({...c,uid:`hand-${side}-${i}`}));p.discard=Object.values(DB).filter(c=>c.t==='mon').slice(0,9).map((c,i)=>({...c,uid:`shelf-${side}-${i}`}));});
 const calls=[];const view=new GameView(document.getElementById('app'),0,new Proxy({onPlay:uid=>calls.push(uid)},{get:(t,k)=>t[k]||(()=>{})}));view.render(g);
 const stop=(await import('/src/ui/layout.ts')).startBoardLayout();
 const clock=await import('/src/ui/duelClock.ts');clock.paintDuelClock(document.getElementById('clock-me'),38,90,true);
 window.qa={view,g,E,clock,calls,stop,A:await import('/src/ui/anim.ts'),D:await import('/src/ui/dice.ts')};
});
await page.waitForSelector('.pile--3d-ready');await page.waitForTimeout(600);
const baseline=await page.evaluate(()=>({market:document.querySelector('.market-counter').getBoundingClientRect().height,pairs:[...document.querySelectorAll('.portrait')].map(p=>({hp:p.querySelector('.pt-hp').getBoundingClientRect().top,mana:p.querySelector('.mana-readout').getBoundingClientRect().top}))}));
assert(baseline.market<150,`market height ${baseline.market} should be below old ~172px`);
baseline.pairs.forEach(p=>assert(Math.abs(p.hp-p.mana)<1));
await page.screenshot({path:output+'/desktop.png'});
// Spell at index zero: old inline z-index 0 hid this behind the market. Check
// actual hit-testing at the ghost surface, not just that a DOM clone exists.
await page.evaluate(()=>qa.view.setHandOpen(true));await page.waitForTimeout(250);
const first=await page.locator('#hand .card').first().boundingBox();
await page.mouse.move(first.x+first.width/2,first.y+first.height/2);await page.mouse.down();await page.mouse.move(590,390,{steps:10});
await page.waitForSelector('.drag-ghost--hand');
const ghostState=await page.evaluate(()=>{
 const g=document.querySelector('.drag-ghost--hand'),r=g.getBoundingClientRect();g.style.pointerEvents='auto';
 const top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('.drag-ghost--hand')===g;
 g.style.setProperty('z-index','0','important');const oldHidden=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('.drag-ghost--hand')!==g;
 g.style.setProperty('z-index','2000');g.style.pointerEvents='none';
 return {top,oldHidden,z:getComputedStyle(g).zIndex,uid:g.dataset.uid};
});
assert(ghostState.top,'first spell must paint above the board');assert(ghostState.oldHidden,'reproduces old inline stacking regression');assert.equal(ghostState.uid,'hand-0-0');
await page.screenshot({path:output+'/spell-drag-over-market.png'});
await page.mouse.up();assert.deepEqual(await page.evaluate(()=>qa.calls),['hand-0-0']);
assert.equal(await page.locator('.drag-ghost').count(),0);
// The first press on compact hand now continues directly into a drag.
await page.evaluate(()=>{qa.view.setHandOpen(false);qa.calls.length=0;});await page.waitForTimeout(250);
const last=await page.locator('#hand .card').last().boundingBox();
await page.mouse.move(last.x+last.width/2,last.y+last.height/2);await page.mouse.down();await page.mouse.move(630,460,{steps:10});
await page.waitForSelector('.drag-ghost--hand');assert.equal(await page.locator('.drag-ghost--hand').getAttribute('data-uid'),'hand-0-3');
await page.screenshot({path:output+'/compact-direct-drag.png'});await page.mouse.up();assert.deepEqual(await page.evaluate(()=>qa.calls),['hand-0-3']);
// Drop back onto the hand cancels; pointercancel and view teardown clean up.
await page.waitForTimeout(200);const card=await page.locator('#hand .card').first().boundingBox();
await page.mouse.move(card.x+20,card.y+50);await page.mouse.down();await page.mouse.move(530,460,{steps:6});await page.mouse.move(card.x+20,card.y+60,{steps:6});await page.mouse.up();
assert.equal((await page.evaluate(()=>qa.calls)).length,1);
await page.mouse.move(card.x+20,card.y+50);await page.mouse.down();await page.mouse.move(560,450,{steps:6});await page.evaluate(()=>window.dispatchEvent(new PointerEvent('pointercancel')));await page.mouse.up();assert.equal(await page.locator('.drag-ghost').count(),0);
// Exact dice values are preserved in the real model and the screen reader path.
await page.evaluate(()=>{qa.dice=qa.D.diceRollAnim([3,5],{mine:true,need:7,success:true});});
await page.waitForSelector('.d3-row[data-settled="3,5"]');assert.equal(await page.locator('.d3-canvas').count(),1);
assert((await page.locator('.d3-cap').innerText()).includes('3 + 5 = 8'));await page.screenshot({path:output+'/dice-success.png'});await page.evaluate(()=>qa.dice);
assert.equal(await page.locator('.d3-overlay,.d3-canvas').count(),0);
await page.evaluate(()=>{qa.dice=qa.D.diceRollAnim([1],{mine:false,need:4,success:false});});await page.waitForSelector('.d3-row[data-settled="1"]');await page.screenshot({path:output+'/dice-fail.png'});await page.evaluate(()=>qa.dice);
await page.evaluate(()=>{qa.dice=qa.D.diceRollAnim([6,6],{mine:true,casino:true});});await page.waitForSelector('.d3-canvas');await page.evaluate(()=>qa.D.cancelDiceAnimations());await page.evaluate(()=>qa.dice);assert.equal(await page.locator('.d3-overlay').count(),0);
await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{qa.dice=qa.D.diceRollAnim([2,4],{mine:true});});await page.waitForSelector('.d3-overlay');assert.equal(await page.locator('.d3-canvas').count(),0);assert.equal(await page.locator('.d3-fallback .d3-pip').count(),6);await page.evaluate(()=>qa.D.cancelDiceAnimations());await page.evaluate(()=>qa.dice);await page.emulateMedia({reducedMotion:'no-preference'});
// Forced context loss cannot strand the blocking dice overlay.
await page.evaluate(()=>{qa.dice=qa.D.diceRollAnim([4],{mine:true});});await page.waitForSelector('.d3-canvas');await page.evaluate(()=>document.querySelector('.d3-canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());await page.evaluate(()=>qa.dice);assert.equal(await page.locator('.d3-overlay').count(),0);
// Phone and short landscape layouts retain aligned resources and in-bounds piles.
const viewports=[];
for(const viewport of [{width:390,height:844},{width:844,height:390}]){
 await page.setViewportSize(viewport);await page.evaluate(()=>qa.view.setHandOpen(false));await page.waitForTimeout(350);
 const metrics=await page.evaluate(()=>({pairs:[...document.querySelectorAll('.portrait')].map(p=>{const hp=p.querySelector('.pt-hp').getBoundingClientRect(),mp=p.querySelector('.mana-readout').getBoundingClientRect();return {hp:hp.top,mp:mp.top,right:mp.right,left:hp.left};}),piles:[...document.querySelectorAll('.pile,.rift-button')].map(p=>{const r=p.getBoundingClientRect();return {left:r.left,right:r.right};})}));
 assert(await page.locator('.mana-crystal').evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1;})),'all 30 mana crystals remain onscreen');
 metrics.pairs.forEach(p=>{assert(Math.abs(p.hp-p.mp)<1);assert(p.left>=0&&p.right<=viewport.width+1);});metrics.piles.forEach(p=>assert(p.left>=0&&p.right<=viewport.width+1));viewports.push({viewport,metrics});
 await page.screenshot({path:output+`/${viewport.width<700?'mobile':'landscape'}.png`});
}
await page.evaluate(()=>{qa.view.destroy();qa.stop();});assert.deepEqual(errors,[]);
await fs.writeFile(output+'/browser-checks.json',JSON.stringify({baseline,ghostState,viewports,errors,checks:['index zero spell visible above market','old z-index bug reproduced','one-gesture compact drag','cancel/drop-back','HP mana aligned','reduced market','actual beveled dice with authoritative results','dice skip / reduced motion / GPU loss','mobile and landscape bounds']},null,2));
await browser.close();console.log('PASS: visible first-card drag, compact gesture, aligned UI, real dice and responsive bounds');
