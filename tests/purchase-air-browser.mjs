import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5343',out=process.env.LORE_TEST_OUT||'docs/releases/2026-10-07-purchase-air/qa';
await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),p=await browser.newPage({viewport:{width:1280,height:900}}),errors=[],checks=[];
p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(90000);
try{
 await p.route('**/purchase-fixture.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><div id="app"></div>'}));
 await p.goto(origin+'/purchase-fixture.html');
 const pixels=await p.evaluate(async()=>{
  window.payment=await import('/src/ui/manaPurchase.ts');if(!await payment.prepareManaPurchase())throw Error('Atlas failed');
  const canvas=document.createElement('canvas');canvas.width=800;canvas.height=600;document.body.append(canvas);const c=canvas.getContext('2d',{willReadFrequently:true}),from={left:80,top:490,width:180,height:40},to={left:460,top:80,width:120,height:180};
  const frames=[];for(const t of [0,.15,.3,.45,.6,.76,.90,.94]){c.clearRect(0,0,800,600);payment.drawManaPurchase(c,from,to,t);const a=c.getImageData(0,0,800,600).data;let occupied=0;for(let i=3;i<a.length;i+=4)if(a[i]>10)occupied++;frames.push({t,occupied});}canvas.remove();return frames;
 });assert(pixels.find(f=>f.t===.45).occupied>400);assert.equal(pixels.at(-1).occupied,0);checks.push('real atlas and wake draw pixels; clear at completion');
 await p.evaluate(async()=>{
  for(const file of ['tokens','base','card','game-overlays','game','screens','duel-opening','presentation','reading-board'])await import(`/src/styles/${file}.css`);
  const {BaseController}=await import('/src/game/controller.ts'),{createGame}=await import('/src/shared/engine.ts'),{DB}=await import('/src/shared/cards.ts');
  class Harness extends BaseController{submit(){}maybeBot(){}}
  const c=new Harness(document.querySelector('#app'),0,{onHome(){},onRematch(){}}),g=createGame({mode:'bot',seed:31,starting:0,p0:{id:'qa',name:'A'},p1:{id:'bot',name:'B'}}).state;
  const mon=(uid)=>({...DB.ELF,uid,tempAtk:0,atkMod:0,defMod:0,dmg:0,exhausted:false,summonedTurn:0});
  g.turn=3;g.phase='main';g.cur=0;g.pending=null;g.players.forEach((s,i)=>{s.openingDrawReady=false;s.mana=9;s.maxMana=12;s.field=[mon('field-'+i)];s.hand=[];});g.market[0]={...DB.ELF,uid:'purchase-fixture'};
  c.introShown=true;c.applyResult({state:g,events:[]},false);window.controller=c;window.DB=DB;window.A=await import('/src/ui/anim.ts');window.F=await import('/src/ui/biblionFx.ts');window.stopLayout=(await import('/src/ui/layout.ts')).startBoardLayout();
 });
 await p.waitForFunction(()=>document.querySelector('#app')?.dataset.sceneReady==='true');await p.waitForSelector('.duel-loader',{state:'detached'});
 await p.evaluate(()=>payment.prepareManaPurchase());
 // Exercise the actual buyReveal payment and card movement, not the preview renderer.
 for(const [width,height] of [[1280,900],[390,844]]){
  await p.setViewportSize({width,height});await p.waitForTimeout(120);
  for(const side of ['me','opp']){
   await p.evaluate(side=>{A.setFxSkip(false);const el=document.querySelector('.card[data-uid="purchase-fixture"]');window.buyDone=false;window.buyStart=performance.now();window.buyPromise=A.buyReveal({...DB.ELF,uid:'runtime-buy'},side,el.getBoundingClientRect(),el,0,4).then(()=>{window.buyElapsed=performance.now()-buyStart;window.buyDone=true;});},side);
   await p.waitForTimeout(400);assert.equal(await p.locator('.biblion-fx--front').getAttribute('data-effects'),'purchase');await p.screenshot({path:`${out}/runtime-${width}-${side}-flight.png`});
   await p.waitForFunction(()=>window.buyDone);assert((await p.evaluate(()=>buyElapsed))>=900);assert.equal(await p.locator('.biblion-fx--front').getAttribute('data-effects'),'');
   await p.evaluate(()=>{const el=document.querySelector('.card[data-uid="purchase-fixture"]');el.style.visibility='';el.style.pointerEvents='';el.removeAttribute('aria-hidden');});checks.push(`paid buyReveal: ${width}px ${side}`);
  }
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 await p.setViewportSize({width:1280,height:900});
 const behavior=await p.evaluate(async()=>{
  const card={...DB.ELF,uid:'runtime-free'},el=document.querySelector('.card[data-uid="purchase-fixture"]'),rect=el.getBoundingClientRect();
  const start=performance.now();const skip=A.buyReveal(card,'me',rect,undefined,0,4);setTimeout(()=>A.setFxSkip(true),120);await skip;const skippedMs=performance.now()-start;A.setFxSkip(false);
  const free=A.buyReveal(card,'me',rect,undefined,0,0);await new Promise(r=>setTimeout(r,100));const freePayment=!!document.querySelector('.biblion-fx--front[data-effects*="purchase"]');A.setFxSkip(true);await free;A.setFxSkip(false);
  const quick=Object.values(DB).find(c=>c.quick),q=await A.buyReveal({...quick,uid:'quick-buy'},'me',rect,undefined,0,2);const quickHeld=!!q&&q.dataset.quickPhase==='resolving';A.setFxSkip(true);if(q)await A.finishQuickSpell(q,'me');A.setFxSkip(false);
  return {skippedMs,freePayment,quickHeld,quickRemoved:!q?.isConnected};
 });assert(behavior.skippedMs<500);assert.equal(behavior.freePayment,false);assert(behavior.quickHeld&&behavior.quickRemoved);checks.push('fast-forward interrupts payment; free bypasses payment; quick retains reveal then resolves');
 await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>{const r=document.querySelector('.card[data-uid="purchase-fixture"]').getBoundingClientRect();F.playBiblionFx('purchase',r,r);});assert.equal(await p.locator('.biblion-fx--front').getAttribute('data-effects'),'');checks.push('reduced motion suppresses flight');
 await p.evaluate(()=>{controller.destroy();stopLayout();});assert.equal(await p.locator('.biblion-fx').count(),0);
 const reopened=await p.evaluate(async()=>{const ok=await payment.prepareManaPurchase();payment.disposeManaPurchase();return ok;});assert(reopened);checks.push('board teardown releases VFX; assets can reopen');
 const failurePage=await browser.newPage();await failurePage.route('**/purchase-fixture.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><div></div>'}));await failurePage.route('**/vfx/purchase-air/crystal-72.png',r=>r.abort());await failurePage.goto(origin+'/purchase-fixture.html');
 const failure=await failurePage.evaluate(async()=>{const m=await import('/src/ui/manaPurchase.ts');return m.prepareManaPurchase();});assert.equal(failure,false);const cancelled=await failurePage.evaluate(async()=>{const m=await import('/src/ui/manaPurchase.ts');const pending=m.prepareManaPurchase();m.disposeManaPurchase();return pending;});assert.equal(cancelled,false);await failurePage.close();checks.push('asset failure and pending-load disposal settle without throwing or deadlocking');
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/browser.json',JSON.stringify({passed:true,checks,pixels,behavior,errors,fixture:'actual BaseController + buyReveal, local engine fixture; no authenticated online match'},null,2));console.log('PASS',checks.length,'browser checks');
}finally{await browser.close();}
