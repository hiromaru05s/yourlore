import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5188',out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-duel-oct08';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:2,recordVideo:{dir:out,size:{width:1280,height:900}}});page.setDefaultTimeout(90000);const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.route('**/bugfix-fixture',r=>r.fulfill({contentType:'text/html',body:'<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>'}));
 let release;const hold=new Promise(r=>release=r);await page.route('**/art/biblion/modular/base-quest.png',async r=>{await hold;await r.continue();});
 await page.goto(origin+'/bugfix-fixture');
 await page.evaluate(async()=>{
  for(const css of ['reading-board','tokens','base','card','game-overlays','game','dice','screens','mobile','duel-opening','lounge','loungeGame','loungeStage','presentation','deckWorkspace','cardsWorkspace','menuApproved','menuWorkspace'])await import('/src/styles/'+css+'.css');
  const E=await import('/src/shared/engine.ts'),C=await import('/src/shared/cards.ts'),A=await import('/src/ui/anim.ts'),V=await import('/src/ui/boardView.ts');(await import('/src/i18n.ts')).setLang('ja');
  V.setMyAvatar('SEEKER_BLUE');V.setOppAvatar('SEEKER_RED');localStorage.removeItem('lore_help_callout_seen');
  const {BaseController}=await import('/src/game/controller.ts');let seq=0;const mon=(id='M11')=>({...structuredClone(C.DB[id]),uid:'reg-'+(++seq),atk:4,def:7,exhausted:false,dmg:0,tempAtk:0,atkMod:0,defMod:0,summonedTurn:0});
  class Controller extends BaseController{submit(a){this.applyResult(E.reduce(this.state,a));} reset(){const g=E.createGame({mode:'bot',seed:77,starting:0,p0:{id:'a',name:'YOU'},p1:{id:'b',name:'OPP'}}).state;g.turn=3;g.pending=null;for(const p of g.players)Object.assign(p,{openingDrawReady:false,field:[mon()],hand:[],mana:30,maxMana:30});g.players[1].field[0].exhausted=true;this.state=g;this.introShown=true;this.view.render(g);} feed(r){this.applyResult(r,true);return this.queue;}}
  const c=new Controller(document.getElementById('app'),0,{});const stop=(await import('/src/ui/layout.ts')).startBoardLayout();c.reset();window.qa={c,E,C,A,mon,stop};
 });
 await page.waitForTimeout(1200);assert.equal(await page.locator('#app').getAttribute('aria-busy'),'true');assert.equal(await page.locator('.game').evaluate(n=>getComputedStyle(n).visibility),'hidden');release();
 await page.waitForFunction(()=>!document.querySelector('.duel-preparing'));assert.equal(await page.locator('.help-callout').count(),0);
 const assets=await page.evaluate(async()=>{const {duelCardAssets}=await import('/src/ui/duelReadiness.ts');const {hasUnloadedAssets}=await import('/src/ui/assetReadiness.ts');return{count:duelCardAssets.length,unloaded:hasUnloadedAssets(duelCardAssets)};});assert.equal(assets.unloaded,false);checks.push({assets});
 await page.waitForTimeout(400);
 assert.equal(await page.locator('#oppRow .zone-mon .card').getAttribute('data-monster-blocked'),null);assert.equal(await page.locator('#oppRow .zone-mon .is-exhausted').count(),0);
 await page.screenshot({path:out+'/ready-1280.png'});
 const raster=await page.locator('.duet-card[data-monster-kind=ready]').evaluate(n=>({width:n.offsetWidth,bounds:n.getBoundingClientRect().width,img:n.querySelector('img').naturalWidth,text:n.querySelector('.seal-value')?.textContent}));assert(raster.width>raster.bounds*1.8,JSON.stringify(raster));assert(raster.img>=384);checks.push({raster});
 await page.evaluate(()=>{qa.c.onAttack(qa.c.state.players[0].field[0].uid);return qa.c.queue;});assert.equal(await page.locator('#targetHint').isVisible(),false);assert.equal(await page.locator('#endBtn').isEnabled(),true);await page.waitForTimeout(550);await page.click('#endBtn');await page.evaluate(()=>qa.c.queue);assert.equal(await page.evaluate(()=>qa.c.state.cur),1);checks.push('attack selection permits end turn');
 await page.evaluate(()=>{qa.c.reset();qa.c.state.players[0].field[0].exhausted=true;qa.c.view.render(qa.c.state);});await page.waitForTimeout(150);await page.screenshot({path:out+'/blocked-1280.png'});
 for(const width of [1280,390])for(const side of [0,1]){
  await page.setViewportSize({width,height:width===390?844:900});await page.evaluate(side=>{qa.c.reset();qa.c.state.cur=1-side;qa.c.state.players[side].field[0].exhausted=true;qa.c.state.players[side].field[0].aura='trapDiscount';qa.c.view.render(qa.c.state);},side);await page.waitForTimeout(350);
  await page.evaluate(side=>{const next=structuredClone(qa.c.state),m=qa.mon('MIMIC');next.players[side].field.push(m);qa.newUid=m.uid;qa.playing=qa.c.feed({state:next,events:[{type:'summon',player:side,uid:m.uid,id:'MIMIC'}]});},side);
  await page.waitForFunction(()=>document.querySelector('.slot[data-reserved-uid]'));
  await page.waitForTimeout(450);
  const gap=await page.evaluate(side=>{const zone=document.querySelector(side===0?'#meRow .zone-mon':'#oppRow .zone-mon'),source=zone.querySelector('.card'),slot=zone.querySelector('[data-reserved-uid]'),actor=[...document.querySelectorAll('[data-layer-policy=field] .duet-card')].find(n=>n.dataset.cardId===source.dataset.cardId&&Math.abs(n.getBoundingClientRect().y-source.getBoundingClientRect().y)<15);return{source:source.getBoundingClientRect().toJSON(),slot:slot.getBoundingClientRect().toJSON(),actor:actor?.getBoundingClientRect().toJSON(),actors:[...document.querySelectorAll('.duet-card')].map(n=>({id:n.dataset.cardId,kind:n.dataset.monsterKind,rect:n.getBoundingClientRect().toJSON()}))};},side);
  assert(gap.source.right<gap.slot.left,JSON.stringify(gap));assert(gap.actor,JSON.stringify(gap));assert(Math.abs(gap.actor.x-gap.source.x)<1,JSON.stringify(gap));
  await page.screenshot({path:out+`/summon-${width}-${side}.png`});await page.evaluate(()=>qa.playing);await page.waitForTimeout(330);
  const after=await page.evaluate(side=>[...document.querySelectorAll((side===0?'#meRow':'#oppRow')+' .zone-mon>.card')].map(n=>({id:n.dataset.cardId,x:n.getBoundingClientRect().x,right:n.getBoundingClientRect().right})),side);await page.screenshot({path:out+`/landed-${width}-${side}.png`});assert.equal(after.length,2);assert(after[0].right<after[1].x);checks.push({width,side,gap,after});
 }
 await page.evaluate(()=>{qa.c.reset();qa.c.timerLeft=26;qa.c.tickTimer();qa.c.timerLeft=6;qa.c.tickTimer();});assert.equal(await page.locator('.turn-toast').count(),0);
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/browser.json',JSON.stringify({checks,errors,boundary:'Local production controller and renderer on fixture game states; no authenticated online match.'},null,2));console.log('PASS browser:',checks.length,'checks',out);
}catch(e){await page.screenshot({path:out+'/failure.png'});console.log({errors});throw e;}finally{await page.close();await browser.close();}
