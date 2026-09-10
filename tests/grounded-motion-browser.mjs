import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5182';
const out=process.env.LORE_TEST_OUTPUT||'docs/ui-rework/2026-09-10-grounded';await fs.mkdir(out,{recursive:true});
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
 const c=new Controller(document.getElementById('app'),0,{});const bootBackground=getComputedStyle(document.querySelector('.game')).backgroundImage;const stop=(await import('/src/ui/layout.ts')).startBoardLayout();c.reset();window.qa={c,stop,E,C,A,bootBackground};
});
await page.waitForSelector('.supply-model-ready');await page.waitForTimeout(700);


await page.evaluate(()=>{
 qa.handoffs=[];const remove=Element.prototype.removeAttribute,replace=Element.prototype.replaceWith;
 Element.prototype.removeAttribute=function(name){if(name==='style'&&this.classList.contains('fx-field-ghost'))qa.lastLanding=this.getBoundingClientRect().toJSON();return remove.call(this,name);};
 Element.prototype.replaceWith=function(...nodes){const reserved=this.dataset?.reservedUid;const result=replace.apply(this,nodes);if(reserved&&nodes[0] instanceof HTMLElement&&qa.lastLanding)qa.handoffs.push({uid:reserved,before:qa.lastLanding,after:nodes[0].getBoundingClientRect().toJSON()});return result;};
});
// Actual controller event queue: reserve centered space, land natively, then commit.
await page.evaluate(()=>{qa.c.reset();const prev=qa.c.state,next=structuredClone(prev);next.players[0].field=[0,1,2].map(i=>({...qa.C.DB.GOLEM1,uid:'summoned-'+i,damage:0,exhausted:true}));qa.run=qa.c.feed({state:next,events:next.players[0].field.map(c=>({type:'summon',player:0,id:c.id,uid:c.uid}))});});
await page.waitForFunction(()=>document.querySelectorAll('#meRow .zone-mon > .card').length>=1);
const first=await page.locator('#meRow .zone-mon > .card').first().boundingBox();assert(Math.abs(first.x+first.width/2-640)<3);
await page.evaluate(()=>qa.run);await page.waitForTimeout(300);
assert.equal(await page.locator('#meRow .zone-mon > .card').count(),3);assert.equal(await page.locator('.fx-field-ghost,.cast-reveal,.zone-mon [data-reserved-uid]').count(),0);
await page.screenshot({path:out+'/summon-three-native.png'});
const handoffs=await page.evaluate(()=>qa.handoffs);assert.equal(handoffs.length,3);for(const h of handoffs)for(const k of ['x','y','width','height'])assert(Math.abs(h.before[k]-h.after[k])<2,JSON.stringify(h));
// Removing a middle member preserves order while neighbors glide toward center.
await page.evaluate(()=>{const next=structuredClone(qa.c.state);next.players[0].field.splice(1,1);qa.run=qa.c.feed({state:next,events:[{type:'destroy',player:0,uid:'summoned-1',id:'GOLEM1'}]});});await page.evaluate(()=>qa.run);await page.waitForTimeout(320);
const remaining=await page.locator('#meRow .zone-mon > .card').evaluateAll(es=>es.map(e=>({uid:e.dataset.uid,r:e.getBoundingClientRect().toJSON()})));assert.deepEqual(remaining.map(e=>e.uid),['summoned-0','summoned-2']);assert(Math.abs((remaining[0].r.left+remaining[1].r.right)/2-640)<3);
// Freeze the common clock without stopping the render loop; each visual is captured at a known pose.
await page.evaluate(()=>{qa.nativeNow=performance.now.bind(performance);qa.nativeRaf=requestAnimationFrame.bind(window);qa.clock=qa.nativeNow();performance.now=()=>qa.clock;window.requestAnimationFrame=cb=>qa.nativeRaf(()=>cb(qa.clock));});
await page.evaluate(()=>{qa.c.state.players[0].deck=[];qa.c.state.players[0].discard=Array.from({length:14},(_,i)=>({...qa.C.DB.GOLEM1,uid:'shuffle-'+i}));qa.c.view.render(qa.c.state);qa.shuffleStart=qa.clock;qa.shuffle=qa.A.animateReshuffle('me',14);});
await page.waitForFunction(()=>document.querySelector('#app')?.dataset.shufflePhase==='lift');
const samples=[];
for(const [name,t] of [['lift',.15],['pluck',.29],['return',.40],['fast',.61],['square',.76],['land',.94]]){
 await page.evaluate(t=>qa.clock=qa.shuffleStart+2800*t,t);await page.waitForTimeout(100);samples.push(await page.locator('#app').evaluate(e=>({phase:e.dataset.shufflePhase,round:e.dataset.shuffleRound})));await page.screenshot({path:out+'/shuffle-'+name+'.png'});
}
await page.evaluate(()=>qa.clock=qa.shuffleStart+2801);await page.evaluate(()=>qa.shuffle);assert.equal(await page.locator('.is-shuffling').count(),0);assert.equal(await page.locator('#pile-myDeck').getAttribute('data-count'),'14');assert.equal(await page.locator('#pile-myDisc').getAttribute('data-count'),'0');
// Dust must remain detailed and local well beyond the old 1.05 s cutoff.
await page.evaluate(()=>{qa.clock+=2500;qa.dustStart=qa.clock;window.dispatchEvent(new CustomEvent('lore:summon-impact',{detail:document.querySelector('#meRow .card').getBoundingClientRect()}));});
for(const ms of [120,450,1150,1600]){await page.evaluate(ms=>qa.clock=qa.dustStart+ms,ms);await page.waitForTimeout(90);assert(Number(await page.locator('.duel-objects-3d').getAttribute('data-dust-count'))>0);await page.screenshot({path:out+`/dust-${ms}.png`});}
await page.evaluate(()=>qa.clock=qa.dustStart+2001);await page.waitForTimeout(80);assert.equal(await page.locator('.duel-objects-3d').getAttribute('data-dust-count'),'0');
await page.evaluate(()=>{performance.now=qa.nativeNow;window.requestAnimationFrame=qa.nativeRaf;});
// Real dice panel: known outcomes, fixed floor, diminishing contact bounces.
await page.evaluate(async()=>{qa.dice=await import('/src/ui/dice.ts');qa.roll=qa.dice.diceRollAnim([2,6],{mine:true,source:{id:'ND2',player:0},viewer:0});});
await page.waitForSelector('.d3-gpu');await page.waitForTimeout(500);await page.screenshot({path:out+'/dice-bounce.png'});
await page.waitForSelector('[data-settled="2,6"]');await page.screenshot({path:out+'/dice-grounded.png'});await page.keyboard.press('Escape');await page.evaluate(()=>qa.roll);
await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{window.dispatchEvent(new CustomEvent('lore:summon-impact',{detail:document.querySelector('#meRow .card').getBoundingClientRect()}));});await page.waitForTimeout(70);assert.equal(await page.locator('.duel-objects-3d').getAttribute('data-dust-count'),'0');
assert.deepEqual(errors,[]);await fs.writeFile(out+'/motion.json',JSON.stringify({handoffs,remaining,samples,errors,checks:['controller triple summon','centered native handoff','middle death reflow','overhand shuffle final stock','dust at 1600ms and complete disposal','dice actual panel settled authoritative faces','reduced motion']},null,2));
await page.evaluate(()=>{qa.c.destroy();qa.stop();});console.log('PASS: grounded motion and actual event queue');
}finally{await browser.close();}
