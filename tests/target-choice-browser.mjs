import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.LORE_PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5227';
const out='docs/audits/2026-10-08-target-choice/browser';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.route('**/target-choice-fixture.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body><div id="app"></div></body></html>'}));
 await page.goto(origin+'/target-choice-fixture.html');
 await page.evaluate(async()=>{
  for(const name of ['tokens','base','card','game-overlays','game','screens','duel-opening','presentation','reading-board'])await import(`/src/styles/${name}.css`);
  const {BaseController}=await import('/src/game/controller.ts');const E=await import('/src/shared/engine.ts');const {DB,STARTERS}=await import('/src/shared/cards.ts');const {setLang}=await import('/src/i18n.ts');setLang('ja');
  class Harness extends BaseController {actions=[];submit(a){this.actions.push(a);const r=E.reduce(this.state,a);this.state=r.state;this.view.render(r.state);this.afterApply(r);}maybeBot(){}load(g){this.state=g;this.view.render(g);this.afterApply({state:g,events:[]});}}
  const c=new Harness(document.querySelector('#app'),0,{onHome(){},onRematch(){}});c.introShown=true;
  let seq=0;const card=id=>({...structuredClone(DB[id]??STARTERS[id]),uid:'browser-'+(++seq)});const mon=id=>({...card(id),dmg:0,exhausted:false,tempAtk:0,atkMod:0,defMod:0,summonedTurn:0});
  const fresh=()=>{const g=E.createGame({mode:'online',seed:41,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=3;g.pending=null;for(const p of g.players)Object.assign(p,{hp:100,mana:30,maxMana:30,hand:[],deck:[],discard:[],field:[],enchants:[],traps:[],quests:[],removed:[],dew:0,shield:0});g.players[0].removed=Array.from({length:4},()=>card('STARTER_TRASH'));g.players[1].field=[mon('M1')];g.players[0].hand=[card('SELECTED_SWORD')];return g;};
  window.qa={c,E,DB,card,mon,fresh};c.load(fresh());
 });
 await page.waitForSelector('.duel-loader',{state:'detached'});
 const open=()=>page.evaluate(()=>{qa.c.onPlay(qa.c.state.players[0].hand[0].uid);});
 for(const viewport of [{width:1280,height:800},{width:390,height:844},{width:320,height:640},{width:844,height:390}]){
  await page.setViewportSize(viewport);await open();await page.locator('.cast-review').waitFor();
  assert(await page.locator('.cast-review .btn-gold').isDisabled());
  await page.locator('[data-choice]').click();assert((await page.locator('.cast-review-caution').textContent()).includes('相手のモンスターを強化'));
  const dims=await page.locator('.cast-review').evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:window.innerWidth,height:window.innerHeight,overflow:document.documentElement.scrollWidth>window.innerWidth};});
  assert(dims.left>=-1&&dims.right<=dims.width+1&&!dims.overflow,JSON.stringify(dims));
  await page.screenshot({path:`${out}/sword-${viewport.width}x${viewport.height}.png`});
  await page.locator('.cast-review .btn-ghost').click();assert.equal(await page.evaluate(()=>qa.c.actions.length),0);assert.equal(await page.evaluate(()=>qa.c.state.players[0].mana),30);
 }
 await page.setViewportSize({width:1280,height:800});await open();await page.locator('[data-choice]').click();await page.locator('.cast-review .btn-gold').click();
 await page.waitForFunction(()=>qa.c.state.players[1].field[0].tempAtk===4);assert.equal(await page.evaluate(()=>qa.c.actions.length),1);assert.equal(await page.evaluate(()=>qa.c.state.pending),null);
 await page.evaluate(()=>qa.c.submit({type:'endTurn'}));assert.equal(await page.evaluate(()=>qa.c.state.players[1].field[0].tempAtk),0);
 // An authoritative timeout/update closes an uncommitted dialog; its callback cannot cast.
 await page.evaluate(()=>{qa.c.load(qa.fresh());qa.c.actions=[];});await open();await page.evaluate(()=>{qa.c.load(qa.E.reduce(qa.c.state,{type:'endTurn'}).state);});await page.waitForSelector('.cast-review',{state:'detached'});assert.equal(await page.evaluate(()=>qa.c.actions.length),0);
 // No targets and automatic own destruction are explicit.
 await page.evaluate(()=>{const g=qa.fresh();g.players[1].field=[];qa.c.load(g);});await open();assert(await page.locator('.cast-review .btn-gold').isDisabled());await page.locator('.cast-review .btn-ghost').click();
 await page.evaluate(()=>{const g=qa.fresh();g.players[1].field=[];g.players[0].field=[{...qa.mon('M1'),atk:1}];g.players[0].hand=[qa.card('WALLBREAK1')];qa.c.load(g);});await open();assert((await page.locator('.cast-review').textContent()).includes('自動処理の破壊対象（自分）'));await page.screenshot({path:out+'/automatic-own-destruction.png'});await page.locator('.cast-review .btn-ghost').click();
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({origin,checks:['4 responsive viewports, no horizontal overflow','enemy-only sword selection, explicit warning and cancellation','one atomic committed cast and cross-side expiry','timeout invalidates open pre-cast review','no-target block and automatic own-victim preview'],errors},null,2));console.log('PASS target choice real-controller browser checks');
}finally{await page.evaluate(()=>qa?.c.destroy()).catch(()=>{});await browser.close();}
