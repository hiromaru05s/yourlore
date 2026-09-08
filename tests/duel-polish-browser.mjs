import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5173';
const output='docs/ui-rework/2026-09-09-duel-polish';await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
await page.route('**/polish-fixture',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>'}));
await page.goto(origin+'/polish-fixture');
await page.evaluate(async()=>{
 for(const css of ['tokens','base','card','game-overlays','game','dice','screens','mobile'])await import('/src/styles/'+css+'.css');
 const {BaseController}=await import('/src/game/controller.ts'),E=await import('/src/shared/engine.ts'),{DB}=await import('/src/shared/cards.ts'),A=await import('/src/ui/anim.ts');
 (await import('/src/i18n.ts')).setLang('ja');const V=await import('/src/ui/boardView.ts');V.setMyAvatar('SEEKER_BLUE');V.setOppAvatar('SEEKER_RED');
 localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));
 const mons=Object.values(DB).filter(c=>c.t==='mon'&&c.atk&&c.def);
 class Controller extends BaseController {
  submitted=0;
  submit(action){this.submitted++;this.applyResult(E.reduce(this.state,action));}
  reset(kind='dense'){
   const g=E.createGame({mode:'bot',seed:71,starting:0,p0:{id:'a',name:'SELF'},p1:{id:'b',name:'OPPONENT'}}).state;g.pending=null;g.turn=3;
   g.players.forEach((p,i)=>{p.field=[];p.enchants=[];p.traps=[];p.hand=[];p.maxMana=30;p.mana=30;p.hp=40;p.maxHp=40;p.discard=mons.slice(0,8).map((c,j)=>({...c,uid:`disc-${i}-${j}`}));});
   for(const [i,p] of g.players.entries())p.field=mons.slice(0,kind==='dense'?7:kind==='attack'?1:0).map((c,j)=>({...c,uid:i===0?`self-${j}`:`opp-${j}`,exhausted:false,summonedTurn:0,tempAtk:0,atkMod:0,defMod:0}));
   if(kind==='dense')for(const [i,p] of g.players.entries()){
    p.traps=Object.values(DB).filter(c=>c.t==='trap').slice(0,7).map((c,j)=>({card:{...c,uid:`trap-${i}-${j}`}}));
    p.enchants=Object.values(DB).filter(c=>c.ench).slice(0,7).map((c,j)=>({card:{...c,uid:`ench-${i}-${j}`},turns:c.val||1}));
   }
   g.players[0].hand=[{...mons[0],uid:'summon-test'},{...DB.NHEAL,uid:'permanent-test'}];
   this.state=g;this.introShown=true;this.view.render(g);this.view.setHandOpen(kind!=='dense');
  }
 }
 const c=new Controller(document.getElementById('app'),0,{});const stop=(await import('/src/ui/layout.ts')).startBoardLayout();c.reset();window.qa={c,stop,A};
});
await page.waitForSelector('.market-model-ready');await page.waitForFunction(()=>[...document.querySelectorAll('.pile')].every(e=>e.dataset.furniture==='blender'));
await page.screenshot({path:output+'/desktop-1280.png'});
const dimensions=await page.evaluate(()=>({portrait:document.querySelector('#portraitMe').getBoundingClientRect().width,ratio:(()=>{const e=document.querySelector('#meRow .zone-mon .card'),w=e.offsetWidth,h=e.offsetHeight,m=qa.A.fieldPlacement(e,w,h);const p=(x,y)=>{const q=m.transformPoint(new DOMPoint(x,y));return {x:q.x/q.w,y:q.y/q.w};};const a=p(0,h/2),b=p(w,h/2),c=p(w/2,0),d=p(w/2,h);return Math.hypot(a.x-b.x,a.y-b.y)/Math.hypot(c.x-d.x,c.y-d.y);})(),canvas:document.querySelectorAll('canvas').length}));
console.log('dimensions',JSON.stringify(dimensions));assert(dimensions.portrait>=100);assert(Math.abs(dimensions.ratio-.8)<.05,'oblique cards retain their original visual aspect');assert.equal(dimensions.canvas,1);
await page.evaluate(()=>{qa.attack=qa.A.attackStrike('opp-0',null,'me');});await page.waitForSelector('#app.shake-hard');
assert.equal(await page.locator('.game').evaluate(e=>getComputedStyle(e).transform),'none','damage cannot isolate the UI below the table');
await page.screenshot({path:output+'/received-attack.png'});await page.evaluate(()=>qa.attack);
async function reset(kind){await page.evaluate(async k=>{await qa.c.queue;qa.c.reset(k);},kind);await page.waitForTimeout(250);}
await reset('attack');
const src=await page.locator('#meRow .zone-mon .card').first().boundingBox(),dst=await page.locator('#oppRow .zone-mon .card').first().boundingBox();
await page.mouse.move(src.x+src.width/2,src.y+src.height/2);await page.mouse.down();await page.mouse.move(dst.x+dst.width/2,dst.y+dst.height/2,{steps:12});
await page.waitForSelector('.attack-aim[data-valid="true"]');assert.equal(await page.locator('.drag-ghost').count(),0);assert.equal(await page.locator('#meRow .card.is-dragging').count(),0);
const aimed=await page.locator('#meRow .zone-mon .card').first().boundingBox();assert(Math.abs(src.x-aimed.x)<.1&&Math.abs(src.y-aimed.y)<.1,'attacker stays put while aiming');
await page.screenshot({path:output+'/attack-arrow.png'});await page.mouse.up();await page.evaluate(()=>qa.c.queue);assert.equal(await page.locator('.attack-aim').count(),0);
const landings=[];
for(const [uid,selector] of [['summon-test','#meRow .zone-mon .card'],['permanent-test','#meRow .buff-icon--spell']]){
 await reset('play');await page.evaluate(id=>{qa.landingRect=null;window.addEventListener('lore:summon-dust',e=>{qa.landingRect=e.detail.toJSON();},{once:true});void qa.c.onPlay(id);},uid);
 await page.waitForSelector('.fx-field-ghost');await page.waitForTimeout(350);await page.screenshot({path:output+'/'+uid+'-flight.png'});
 await page.evaluate(()=>qa.c.queue);const ghost=await page.evaluate(()=>qa.landingRect);assert(ghost,'landing emits contact feedback');
 const landed=await page.locator(selector).boundingBox();assert(landed,'real destination appears');
 for(const key of ['x','y','width','height'])assert(Math.abs(ghost[key]-landed[key])<3,uid+' exact handoff '+key+' '+ghost[key]+' '+landed[key]);
 landings.push({uid,ghost,landed});await page.screenshot({path:output+'/'+uid+'-landed.png'});
}
// The opponent uses the same uninterrupted reveal-to-field projection.
for(const [type,selector] of [['monster','#oppRow .zone-mon .card'],['spell','#oppRow .buff-icon--spell']]){
 await reset('play');
 await page.evaluate(async type=>{const g=qa.c.state,p=g.players[1],card={...g.players[0].hand[type==='monster'?0:1],uid:'opponent-'+type};qa.opponentCard=card;
  qa.opponentFlight=type==='monster'?qa.A.ghostSummon(card,'opp',0):qa.A.revealSpell(card,'opp','field',0);
 },type);
 await page.waitForSelector('.fx-field-ghost');const ghost=await page.evaluate(async()=>{qa.opponentGhost=await qa.opponentFlight;return qa.opponentGhost.getBoundingClientRect().toJSON();});
 await page.evaluate(type=>{const p=qa.c.state.players[1],c=qa.opponentCard;if(type==='monster')p.field.push({...c,exhausted:true,tempAtk:0,atkMod:0,defMod:0});else p.enchants.push({card:c,turns:c.val||1});qa.c.view.render(qa.c.state);},type);
 const landed=await page.locator(selector).boundingBox();for(const key of ['x','y','width','height'])assert(Math.abs(ghost[key]-landed[key])<3,'opponent '+type+' handoff '+key);
 await page.evaluate(()=>qa.opponentGhost.remove());landings.push({uid:'opponent-'+type,ghost,landed});
}
await reset('dense');await page.setViewportSize({width:1920,height:1080});await page.waitForTimeout(300);await page.screenshot({path:output+'/desktop-1920.png'});
await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);await page.screenshot({path:output+'/phone.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
await page.setViewportSize({width:1280,height:720});
await page.evaluate(async()=>{const D=await import('/src/ui/dice.ts');qa.dice=D.diceRollAnim([2,5],{mine:true});});
await page.waitForSelector('.d3-gpu');await page.waitForTimeout(500);await page.screenshot({path:output+'/dice-bounce.png'});await page.waitForSelector('[data-settled="2,5"]');await page.screenshot({path:output+'/dice-rest.png'});await page.evaluate(()=>qa.dice);
// Escape cancels aiming; leaving mid-flight removes every floating face.
await reset('attack');
const cancelSource=await page.locator('#meRow .zone-mon .card').first().boundingBox();
await page.mouse.move(cancelSource.x+20,cancelSource.y+20);await page.mouse.down();await page.mouse.move(cancelSource.x+20,cancelSource.y-80,{steps:5});await page.waitForSelector('.attack-aim');await page.keyboard.press('Escape');assert.equal(await page.locator('.attack-aim,.is-aiming').count(),0);await page.mouse.up();
await reset('play');await page.evaluate(()=>{void qa.c.onPlay('summon-test');});await page.waitForSelector('.fx-field-ghost');
await page.evaluate(async()=>{qa.c.destroy();qa.stop();await qa.c.queue;});assert.equal(await page.locator('.duel-objects-3d,.fx-card-flight,.attack-aim,.cast-veil').count(),0);
assert.deepEqual(errors,[]);await fs.writeFile(output+'/browser-checks.json',JSON.stringify({dimensions,landings,errors,checks:['damage stacking','aspect','larger portraits','all three Blender furniture models','attack arrow stays anchored','summon exact handoff','enchantment exact handoff','PC and phone','grounded dice','cleanup']},null,2));
console.log('PASS: duel polish browser integration');
} finally {await browser.close();}
