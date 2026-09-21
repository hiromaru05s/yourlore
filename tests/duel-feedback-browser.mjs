import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const out=process.env.LORE_TEST_OUTPUT||'docs/ui-rework/2026-09-21-duel-polish';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:900}});
const errors=[],report={checks:[],views:[],errors};page.on('pageerror',e=>errors.push(e.message));
try{
 await page.route('**/fill-fixture',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>'}));
 await page.goto((process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5213')+'/fill-fixture');
 await page.evaluate(async()=>{
  for(const css of ['tokens','base','card','game-overlays','game','dice','screens','mobile','reading-board'])await import('/src/styles/'+css+'.css');
  const E=await import('/src/shared/engine.ts'),C=await import('/src/shared/cards.ts'),V=await import('/src/ui/boardView.ts');
  (await import('/src/i18n.ts')).setLang('ja');V.setMyAvatar('SEEKER_BLUE');V.setOppAvatar('SEEKER_RED');
  localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));
  const {BaseController}=await import('/src/game/controller.ts');
  class Controller extends BaseController { submit(a){this.applyResult(E.reduce(this.state,a));} }
  const c=new Controller(document.getElementById('app'),0,{});c.introShown=true;
  const card=(id,uid)=>({...C.DB[id],uid});
  const g=E.createGame({mode:'bot',seed:77,starting:0,p0:{id:'a',name:'YOU'},p1:{id:'b',name:'BOT · GAMBLER'}}).state;g.turn=3;g.pending=null;
  for(const [s,p] of g.players.entries())Object.assign(p,{openingDrawReady:false,field:[],hand:[C.STARTERS.STARTER_TRASH,C.DB.GUNNER,C.STARTERS.STARTER_MANA].map((c,i)=>({...c,uid:`hand-${s}-${i}`})),discard:[],mana:4,maxMana:4});
  c.state=g;c.view.render(g);
  const stop=(await import('/src/ui/layout.ts')).startBoardLayout();
  window.qa={c,stop,E,C,card,P:await import('/src/ui/boardProjection.ts'),L:await import('/src/ui/readingBoardLayout.ts'),dense(){for(const [s,p]of g.players.entries()){p.field=['INFKNIGHT','GUNNER','MERC_MASTER','MIMIC','FIRE_MASTER','CAVALRY','MIMIC2'].map((id,i)=>({...card(id,`mon-${s}-${i}`),exhausted:false,tempAtk:0,atkMod:0,defMod:0,dmg:0,summonedTurn:0}));p.enchants=Array.from({length:14},(_,i)=>({card:card('GROWTH',`ench-${s}-${i}`),turns:99}));}c.view.render(g);}};
 });
 await page.waitForFunction(()=>document.getElementById('app').dataset.sceneReady==='true',{timeout:120000});

 const stable=await page.evaluate(async()=>{
  qa.c.state.cur=1;qa.c.view.render(qa.c.state);
  const card=document.querySelector('#hand .card');const scales=[];
  for(let i=0;i<12;i++){
   qa.c.state.players[1].mana=i;qa.c.view.render(qa.c.state);
   await new Promise(requestAnimationFrame);const el=document.querySelector('#hand .card'),m=new DOMMatrix(getComputedStyle(el).transform);
   scales.push({same:el===card,scale:Math.hypot(m.a,m.b)});
  }
  return scales;
 });assert(stable.every(x=>x.same&&Math.abs(x.scale-.42)<.001),JSON.stringify(stable));
 report.checks.push('Opponent snapshots retain the compact hand nodes and .42 scale on every sampled frame');
 console.log('hand stable');
 const rifts=await page.evaluate(()=>['me','opp'].map(side=>{
  const el=document.getElementById('rift-'+side),r=qa.P.layoutRect(el),matrix=new DOMMatrix(getComputedStyle(el).transform),center=matrix.transformPoint(new DOMPoint(r.width/2,r.height/2)),m=qa.L.RIFT_MOUNT,s=qa.L.readingScale();
  const p=qa.P.boardPoint(innerWidth/2+m.x*s,innerHeight/2+(side==='me'?1:-1)*m.z*s,m.height*s);
  return {side,delta:Math.hypot(r.x+center.x/center.w-p.x,r.y+center.y/center.w-p.y)};
 }));assert(rifts.every(x=>x.delta<2.5),JSON.stringify(rifts));report.rifts=rifts;
 report.checks.push('Both Rift hit targets and effect destinations align with the model mount projection');
 await page.evaluate(()=>{qa.c.state.turn=40;qa.c.state.cur=0;qa.c.state.players[0].hand=qa.c.state.players[0].hand.slice(0,1);qa.c.view.render(qa.c.state);qa.c.view.setHandOpen(true);});
 const hoverCard=page.locator('#hand .card').first();await hoverCard.hover();await page.waitForTimeout(250);
 const zoom=await hoverCard.evaluate(e=>{const m=new DOMMatrix(getComputedStyle(e).transform);return Math.hypot(m.a,m.b);});assert(Math.abs(zoom-.66)<.001);report.checks.push('Expanded-hand hover enlarges the selected card from .58 to .66');
 await page.screenshot({path:out+'/hand-hover.png'});
 await page.evaluate(()=>{qa.c.view.setHandOpen(false);qa.c.state.players[0].hand=[];qa.c.view.render(qa.c.state);qa.c.turnStartedWall=0;const submit=qa.c.submit.bind(qa.c);qa.c.submit=a=>{if(a.type==='endTurn')setTimeout(()=>submit(a),1450);else submit(a);};});
 await page.locator('#endBtn').click();
 const colors=await page.evaluate(async()=>{const colors=[],start=performance.now();while(performance.now()-start<2100){await new Promise(requestAnimationFrame);colors.push(document.getElementById('endBtn').dataset.turnColor);}return colors;});
 assert(colors.every(c=>c==='red'),JSON.stringify(colors));await page.evaluate(()=>qa.c.queue);
 report.checks.push('END TURN stays red across a 1450ms simulated response delay and the actual end-turn playback');console.log('turn stable');
 await page.evaluate(()=>{const g=qa.c.state;g.turn=50;g.cur=0;g.pending=null;g.players[0].deck=[];g.players[0].discard=Array.from({length:12},(_,i)=>({...qa.C.DB.FIRE_BALL,uid:'shuffle-'+i}));qa.c.view.render(g);});await page.waitForTimeout(400);
 await page.evaluate(async()=>{const move=(await import('/src/ui/boardMotion.ts')).moveOnBoard;qa.shuffle=move({kind:'shuffle',source:document.getElementById('pile-myDisc'),target:document.getElementById('pile-myDeck'),count:12,signal:new AbortController().signal});});
 await page.waitForFunction(()=>document.getElementById('app').dataset.shufflePhase==='全体発光');await page.waitForTimeout(120);await page.screenshot({path:out+'/shuffle-whole-stack-glow.png'});
 await page.evaluate(()=>qa.shuffle);await page.screenshot({path:out+'/shuffle-reformed.png'});
 assert.equal(await page.locator('#pile-myDeck').getAttribute('data-count'),'12');assert.equal(await page.locator('#pile-myDisc').getAttribute('data-count'),'0');assert.equal(await page.locator('.is-shuffling').count(),0);
 report.checks.push('Shelf glow / disappearance / deck reformation completes with exact counts and no leftover stack');console.log('shuffle complete');
 await page.evaluate(async()=>{qa.observedDice='';const observer=new MutationObserver(()=>{const values=document.querySelector('.d3-row')?.dataset.settled;if(values)qa.observedDice=values;});observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['data-settled']});qa.dice=(await import('/src/ui/dice.ts')).diceRollAnim([2,5,3],{mine:false,source:{player:1,id:'STARTER_CHEST'},viewer:0}).finally(()=>observer.disconnect());});
 await page.waitForSelector('.d3-gpu');await page.screenshot({path:out+'/dice-entry.png'});await page.evaluate(()=>qa.dice);assert.equal(await page.evaluate(()=>qa.observedDice),'2,5,3');
 assert.equal(await page.locator('.d3-overlay').count(),0);report.checks.push('Three physical dice enter through the clipped boundary, settle on authoritative 2/5/3 and clean up');console.log('dice complete');
 for(const won of [true,false]){
  await page.evaluate(async won=>{qa.outcome=(await import('/src/ui/anim.ts')).deathShatter(won?'opp':'me',won,'ファイアーボール');},won);
  await page.waitForSelector('.duel-outcome');await page.waitForTimeout(640);await page.screenshot({path:out+'/'+(won?'victory':'defeat')+'-animation.png'});await page.evaluate(()=>qa.outcome);
  await page.evaluate(async won=>{(await import('/src/ui/modal.ts')).winModal(won,'TURN 12 · BIBLION',()=>{},()=>{},()=>{});},won);await page.waitForTimeout(350);await page.screenshot({path:out+'/'+(won?'victory':'defeat')+'-result.png'});assert.equal(await page.locator('.outcome-result button').count(),3);assert.equal(await page.locator('.outcome-result .dialog-clock').count(),0);
  await page.evaluate(async()=>{(await import('/src/ui/modal.ts')).closeOverlay();});
 }
 report.checks.push('Victory and defeat cinematics lead to themed result panels with Home / Review / Again actions');
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(async()=>{await (await import('/src/ui/anim.ts')).deathShatter('me',false,null);});assert.equal(await page.locator('.duel-outcome').count(),0);
 await page.setViewportSize({width:390,height:844});await page.evaluate(async()=>{(await import('/src/ui/modal.ts')).winModal(false,'TURN 12',()=>{},()=>{},()=>{});});await page.waitForTimeout(250);await page.screenshot({path:out+'/mobile-result.png'});
 assert(await page.locator('.outcome-result button').last().isVisible());await page.evaluate(async()=>{(await import('/src/ui/modal.ts')).closeOverlay();qa.c.destroy();qa.stop();});
 assert.equal(await page.locator('.duel-objects-3d,.rift-aperture-layer,.duel-outcome,.d3-canvas').count(),0);
 report.checks.push('Reduced motion, mobile result layout and renderer cleanup');
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log('PASS',JSON.stringify(report));
}catch(e){await page.screenshot({path:out+'/failure.png'}).catch(()=>{});throw e;}finally{await browser.close();}
