const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const out=process.env.LORE_TEST_OUTPUT||process.cwd()+'/docs/ui-rework/2026-10-05-hand-discard';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const reports=[];
try {for(const [width,motion,echo] of [[1280,'no-preference',false],[390,'no-preference',false],[390,'reduce',false],[1280,'no-preference',true]]){
 const context=await browser.newContext({viewport:{width,height:width===390?844:900},hasTouch:width===390,reducedMotion:motion,recordVideo:{dir:out+'/video',size:{width,height:width===390?844:900}}});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/duel-lab.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="app"></div>'}));
 await page.goto((process.env.LORE_TEST_URL||'http://127.0.0.1:5283')+'/duel-lab.html');
 await page.evaluate(async echo=>{
  await Promise.all(['tokens','base','card','game-overlays','game','screens','duel-opening','presentation','reading-board'].map(n=>import('/src/styles/'+n+'.css')));
  const [{BaseController},{createGame,reduce},{DB},{setLang},{startBoardLayout}]=await Promise.all([import('/src/game/controller.ts'),import('/src/shared/engine.ts'),import('/src/shared/cards.ts'),import('/src/i18n.ts'),import('/src/ui/layout.ts')]);
  setLang('ja');localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));
  class Controller extends BaseController{submit(action){
   window.picks.push(action);const result=reduce(this.state,action);
   window.submissions.push({t:performance.now(),transitions:document.querySelector('#hand').getAnimations({subtree:true}).filter(a=>a instanceof CSSTransition&&a.playState==='running').length});
   if(echo){this.applyResult({state:structuredClone(this.state),events:[]},false);setTimeout(()=>this.applyResult(result,true),80);}else this.applyResult(result,true);
  }feed(result){this.applyResult(result,false)}}
  window.picks=[];window.submissions=[];const c=new Controller(document.getElementById('app'),0,{onHome(){},onRematch(){}});window.checkController=c;
  const g=createGame({mode:'bot',seed:207,starting:0,p0:{id:'me',name:'シーカー'},p1:{id:'opp',name:'シーカー'}}).state;
  g.players.forEach(p=>p.openingDrawReady=false);g.turn=2;g.pending=null;g.cur=0;g.players[0].mana=0;g.players[0].field=[];g.players[0].discard=[];g.players[1].discard.push(...g.players[1].deck);g.players[1].deck=[];
  const defs=Object.values(DB).filter(c=>c.t==='mon');g.players[0].hand=Array.from({length:10},(_,i)=>({...defs[i],uid:'discard-test-'+i}));
  c.feed(reduce(g,{type:'endTurn'}));window.overflow=structuredClone(c.state);startBoardLayout();
 },echo);
 await page.waitForSelector('.discard-draggable');await page.waitForSelector('[data-scene-ready=true]');await page.waitForTimeout(2000);
 const state=await page.evaluate(()=>({cards:[...document.querySelectorAll('#hand .card')].map(c=>({dim:c.classList.contains('is-dim'),filter:getComputedStyle(c).filter,opacity:getComputedStyle(c).opacity,cursor:getComputedStyle(c).cursor,blocked:c.hasAttribute('data-block-reason'),playable:c.classList.contains('is-playable')})),open:document.querySelector('.game').classList.contains('hand-open'),target:getComputedStyle(document.getElementById('pile-myDisc')).outlineWidth}));
 assert.equal(state.cards.length,10);assert(state.cards.every(c=>!c.dim&&!c.blocked&&!c.playable&&c.filter==='none'&&c.opacity==='1'&&c.cursor==='grab'));assert(state.open);assert.equal(state.target,'3px');
 await page.screenshot({path:out+'/'+width+'-ready.png'});
 // Cancel a drag outside the shelf; no card may be submitted or left faded.
 let card=page.locator('#hand .card').first();let r=await card.boundingBox();
 await page.mouse.move(r.x+r.width/2,r.y+r.height*.35);await page.mouse.down();await page.mouse.move(width/2,40,{steps:6});await page.mouse.up();
 assert.equal(await page.locator('#hand .card').count(),10);assert.equal(await page.locator('.discard-flight,.discard-dragging').count(),0);
 // Observe real animation ordering, including the final pick which also draws.
 await page.evaluate(()=>{
  window.timeline=[];window.samples=[];window.discardDuplicates=[];
  const record=(type,uid)=>timeline.push({type,uid,t:performance.now()});
  window.observer=new MutationObserver(ms=>{for(const m of ms){
   for(const n of m.addedNodes)if(n instanceof HTMLElement){
    if(n.classList.contains('discard-flight'))record('flight-start',n.dataset.uid);
    if(n.dataset.discardFlight)discardDuplicates.push(n.dataset.discardFlight);
    if(n.classList.contains('native-draw-layer'))record('draw-start');
   }
   for(const n of m.removedNodes)if(n instanceof HTMLElement&&n.classList.contains('discard-flight'))record('flight-end',n.dataset.uid);
  }});observer.observe(document.body,{childList:true,subtree:true});
  window.shuffleObserver=new MutationObserver(ms=>{for(const m of ms)if(m.target.id==='pile-oppDisc'&&m.target.classList.contains('is-shuffling')!==!!m.oldValue?.includes('is-shuffling'))record(m.target.classList.contains('is-shuffling')?'shuffle-start':'shuffle-end');});shuffleObserver.observe(document.body,{subtree:true,attributes:true,attributeOldValue:true,attributeFilter:['class']});
  window.sampling=true;
  const tick=()=>{const cards=[...document.querySelectorAll('#hand > .card')];samples.push({t:performance.now(),count:cards.length,flight:!!document.querySelector('.discard-flight'),cards:cards.map(c=>{const r=c.getBoundingClientRect();return {uid:c.dataset.uid,x:r.x,y:r.y};})});if(sampling)requestAnimationFrame(tick);};requestAnimationFrame(tick);
 });
 // Drop one card, then finish the exact remaining count using the keyboard.
 r=await card.boundingBox();const t=await page.locator('#pile-myDisc').boundingBox();
 if(width===390){
  const cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height*.35}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:t.x+t.width/2,y:t.y+t.height/2}]});
  await page.waitForSelector('.is-drop-over');await page.screenshot({path:out+'/'+width+'-drag.png'});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }else{
  await page.mouse.move(r.x+r.width/2,r.y+r.height*.35);await page.mouse.down();await page.mouse.move(t.x+t.width/2,t.y+t.height/2,{steps:8});
  await page.waitForSelector('.is-drop-over');await page.screenshot({path:out+'/'+width+'-drag.png'});await page.mouse.up();
 }
 await page.waitForFunction(()=>document.querySelectorAll('#hand .card').length===9&&document.querySelector('.hand-discard-hint')?.textContent.includes('あと2枚'));
 assert.equal(await page.locator('#hand .is-dim').count(),0);
 await page.locator('#hand .card').first().focus();await page.keyboard.press('Delete');
 await page.waitForFunction(()=>document.querySelectorAll('#hand .card').length===8&&document.querySelector('.hand-discard-hint')?.textContent.includes('あと1枚'));
 // The last required card follows the actual drag path as well.
 r=await page.locator('#hand .card').nth(3).boundingBox();
 await page.evaluate(()=>document.addEventListener('pointerdown',e=>{window.liftRect=e.target.closest('.card').getBoundingClientRect().toJSON();},{capture:true,once:true}));
 await page.mouse.move(r.x+r.width/2,r.y+r.height*.35);await page.mouse.down();
 const original=await page.evaluate(()=>liftRect);
 const lifted=await page.locator('.discard-flight').boundingBox();
 for(const k of ['x','y','width','height'])assert(Math.abs(lifted[k]-original[k])<1,'lifting must preserve the rendered card pose');
 await page.mouse.move(t.x+t.width/2,t.y+t.height/2,{steps:6});await page.mouse.up();
 await page.waitForFunction(()=>document.querySelectorAll('#hand .card').length===7&&!document.querySelector('.hand-discard-hint'));
 await page.evaluate(()=>checkController.queue);
 assert.equal(await page.locator('.discard-drop-target,.discard-drop-label,.discard-draggable,.discard-flight,.choosing-discard').count(),0);
 assert.equal(await page.locator('#hand .is-dim').count(),7);assert.deepEqual(errors,[]);
 const timing=await page.evaluate(()=>{sampling=false;observer.disconnect();shuffleObserver.disconnect();return {timeline,samples,duplicates:discardDuplicates,submissions};});
 assert.deepEqual(timing.duplicates,[],'a manually landed discard must never fly a second time');
 const ends=timing.timeline.filter(e=>e.type==='flight-end');assert.equal(ends.length,3);
 const draw=timing.timeline.find(e=>e.type==='draw-start');
 assert(timing.submissions.every(s=>s.transitions===0),'submission must await actual hand alignment completion');
 if(motion!=='reduce'){
  assert(draw,'the real animated controller must draw for the next player');
  const shuffle=timing.timeline.find(e=>e.type==='shuffle-start'),shuffled=timing.timeline.find(e=>e.type==='shuffle-end');
  assert(shuffle&&shuffled,'empty opponent deck must trigger the real shelf-to-deck animation');
  assert(shuffle.t>=ends.at(-1).t,'opponent shuffle must wait for the final shelf flight');
  assert(draw.t>=shuffled.t,'opponent draw must wait for shelf-to-deck completion');
  for(const n of [9,8,7]){
   const during=timing.samples.filter(s=>s.count===n&&s.flight);assert(during.length>=2,'hand gap must close during the flight');
   const first=during[0],later=during.find(s=>s.t-first.t>=80)||during.at(-1);
   assert(later.cards.some(c=>{const old=first.cards.find(o=>o.uid===c.uid);return old&&Math.hypot(c.x-old.x,c.y-old.y)>.1;}),'remaining cards must move before the shelf flight finishes');
  }
 }
 await fs.writeFile(out+'/'+width+'-'+motion+'-'+echo+'-timing.json',JSON.stringify(timing,null,2));
 // A new authoritative snapshot can interrupt a flight (timeout/reconnect).
 await page.evaluate(()=>checkController.feed({state:structuredClone(overflow),events:[]}));
 await page.waitForSelector('.discard-draggable');
 await page.locator('#hand .card').nth(4).focus();await page.keyboard.press('Enter');
 if(motion!=='reduce'){
  assert.equal(await page.locator('#hand .card').count(),9);
  await page.evaluate(()=>checkController.feed({state:structuredClone(overflow),events:[]}));
  await page.evaluate(()=>checkController.queue);await page.waitForTimeout(450);
  assert.equal(await page.locator('#hand .card').count(),10);
  assert.equal(await page.evaluate(()=>picks.length),3,'interrupted flight must not submit a stale pick');
  assert.equal(await page.locator('.discard-flight,.discard-dragging').count(),0);
 }
 await page.waitForTimeout(echo?100:0);await page.evaluate(()=>checkController.queue);
 await page.waitForSelector('.discard-draggable');
 await page.locator('#hand .card').nth(4).focus();await page.keyboard.press('Delete');
 await page.evaluate(()=>checkController.destroy());await page.waitForTimeout(400);
 assert.equal(await page.locator('.discard-flight,.discard-dragging,.hand-discard-hint').count(),0,'teardown must clear every temporary card');
 reports.push({width,motion,echo,timeline:timing.timeline,status:'passed' ,checks:['full color with zero mana','grab cursor without blocked tooltip','expanded hand','shelf highlight','cancel drag','touch drop or mouse drop','remaining count 3 → 2 → 1','keyboard discard','last-card drag before opponent shuffle and draw','actual hand transitions complete before submission','delayed echo with intervening snapshot','immediate concurrent reflow','no duplicate flight','interrupted snapshot restores hand','teardown cleanup'],state,errors});
 await context.close();await page.video().saveAs(out+'/'+width+'-'+motion+'-'+echo+'.webm');
}await fs.writeFile(out+'/browser-report.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports.map(({width,status})=>({width,status}))));}finally{await browser.close()}
