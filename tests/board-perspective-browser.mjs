import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5173';
const output=process.env.LORE_TEST_OUTPUT||'docs/ui-rework/2026-09-09-release';await fs.mkdir(output,{recursive:true});
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
    p.quests=Object.values(DB).filter(c=>c.t==='quest').slice(0,7).map((c,j)=>({card:{...c,uid:`quest-${i}-${j}`},progress:Math.min(j,c.quest.target-1)}));
    p.enchants=Object.values(DB).filter(c=>c.ench).slice(0,7).map((c,j)=>({card:{...c,uid:`ench-${i}-${j}`},turns:c.val||1}));
   }
   g.players[0].hand=[{...mons[0],uid:'summon-test'},{...DB.NHEAL,uid:'permanent-test'}];
   this.state=g;this.introShown=true;this.view.render(g);this.view.setHandOpen(kind!=='dense');
  }
 }
 const c=new Controller(document.getElementById('app'),0,{});const stop=(await import('/src/ui/layout.ts')).startBoardLayout();c.reset();window.qa={c,stop,A};
});
await page.waitForSelector('.market-model-ready');await page.waitForFunction(()=>[...document.querySelectorAll('.pile')].every(e=>e.dataset.furniture==='blender'));
await page.evaluate(async()=>{(await import('/src/ui/duelClock.ts')).paintDuelClock(document.getElementById('clock-me'),75,90,true);});await page.waitForSelector('.mp-clock.show .tc-dial');await page.waitForTimeout(200);
await page.screenshot({path:output+'/desktop-1280.png'});
const dimensions=await page.evaluate(()=>({portrait:document.querySelector('#portraitMe').getBoundingClientRect().width,ratio:(()=>{const e=document.querySelector('#meRow .zone-mon .card'),w=e.offsetWidth,h=e.offsetHeight,m=qa.A.fieldPlacement(e,w,h);const p=(x,y)=>{const q=m.transformPoint(new DOMPoint(x,y));return {x:q.x/q.w,y:q.y/q.w};};const a=p(0,h/2),b=p(w,h/2),c=p(w/2,0),d=p(w/2,h);return Math.hypot(a.x-b.x,a.y-b.y)/Math.hypot(c.x-d.x,c.y-d.y);})(),canvas:document.querySelectorAll('canvas').length}));
console.log('dimensions',JSON.stringify(dimensions));assert(dimensions.portrait>=165);const units=await page.evaluate(()=>{const m=document.querySelector('#meRow .zone-mon .card'),k=document.querySelector('#market .card'),d=document.querySelector('#pile-myDeck'),s=document.querySelector('#pile-myDisc');return {monster:[m.offsetWidth,m.offsetHeight],market:[k.offsetWidth,k.offsetHeight],deck:d.offsetWidth,shelf:s.offsetWidth};});assert.deepEqual(units.monster,units.market,'market and monsters share the physical card footprint');assert(Math.abs(units.deck/units.monster[0]-1.3)<.025);assert(Math.abs(units.shelf/units.monster[0]-1.52)<.025);assert.equal(await page.locator('.hourglass-anchor').count(),0);console.log('physical units',JSON.stringify(units));assert.equal(dimensions.canvas,2);
// Independent WebGL projection versus actual browser DOM bounds across the board.
const projection=await page.evaluate(async()=>{
 const T=await import('/node_modules/.vite/deps/three.js');
 const {layoutRect}=await import('/src/ui/boardProjection.ts');
 const w=innerWidth,h=innerHeight,F=h*2.2,a=32*Math.PI/180;
 const camera=new T.PerspectiveCamera(2*Math.atan(h/(2*F))*180/Math.PI,w/h,F*.25,F*3);
 camera.position.set(0,F*Math.cos(a),F*Math.sin(a));camera.lookAt(0,0,0);camera.updateMatrixWorld();
 return ['#meRow .zone-mon','#oppRow .zone-mon','.market-counter','.market-sub--supply','#pile-myDeck','#pile-oppDeck','.mid-aside'].map(selector=>{
  const e=document.querySelector(selector),r=layoutRect(e),plane=e.closest('[data-board-plane]'),y=Number(plane.dataset.boardPlane),actual=e.getBoundingClientRect();
  const points=[[0,0],[r.width,0],[r.width,r.height],[0,r.height]].map(([x,z])=>{const p=new T.Vector3(r.left+x-w/2,y,r.top+z-h/2).project(camera);return [(p.x+1)*w/2,(1-p.y)*h/2];});
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);const expected={x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};
  return {selector,expected,actual:actual.toJSON(),error:Math.max(...['x','y','width','height'].map(k=>Math.abs(expected[k]-actual[k])))};
 });
});
for(const p of projection)assert(p.error<2,p.selector+' WebGL / DOM alignment: '+p.error);
const nearDeck=projection.find(p=>p.selector==='#pile-myDeck'),farDeck=projection.find(p=>p.selector==='#pile-oppDeck');assert(nearDeck.actual.width>farDeck.actual.width,'near deck is larger in perspective');
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
 await reset('play');await page.evaluate(id=>{qa.landingRect=null;const contact=e=>{qa.landingRect=e.detail.toJSON();for(const name of ['lore:summon-dust','lore:summon-impact'])window.removeEventListener(name,contact);};for(const name of ['lore:summon-dust','lore:summon-impact'])window.addEventListener(name,contact);void qa.c.onPlay(id);},uid);
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
// Integration boundary: quests keep the same public face throughout landing;
// enchantments insert before existing quests, while new quests append after them.
for(const kind of ['quest','spell']){
 await reset('play');
 await page.evaluate(async kind=>{
  const {DB}=await import('/src/shared/cards.ts');const p=qa.c.state.players[0];
  p.quests=[{card:{...DB.Q_RIFT,uid:'prior-quest'},progress:2,startedTurn:1}];
  p.enchants=[{card:{...DB.E1,uid:'prior-enchant'},turns:2}];
  p.hand=[{...DB[kind==='quest'?'Q_BRAND':'NHEAL'],uid:'integrated-'+kind}];
  qa.c.view.render(qa.c.state);qa.landingRect=null;
  const contact=e=>{qa.landingRect=e.detail.toJSON();for(const name of ['lore:summon-dust','lore:summon-impact'])window.removeEventListener(name,contact);};for(const name of ['lore:summon-dust','lore:summon-impact'])window.addEventListener(name,contact);
 },kind);
 await page.waitForTimeout(180);await page.evaluate(kind=>{void qa.c.onPlay('integrated-'+kind);},kind);
 await page.waitForSelector('.fx-field-ghost');await page.evaluate(()=>qa.c.queue);await page.evaluate(()=>new Promise(requestAnimationFrame));
 const ghost=await page.evaluate(()=>qa.landingRect),landed=await page.locator(`#meRow .buff-icon[data-uid="integrated-${kind}"]`).boundingBox();
 assert(ghost&&landed,'merged '+kind+' has uninterrupted landing');
 for(const key of ['x','y','width','height'])assert(Math.abs(ghost[key]-landed[key])<3,'merged '+kind+' landing '+key+' '+JSON.stringify({ghost,landed}));
 assert.equal(await page.locator('#meRow .buff-icon--quest .buff-art').count(),kind==='quest'?2:1);
 await page.locator('#meRow .buff-icon--quest').first().focus();await page.keyboard.press('Enter');await page.waitForSelector('.zoom-overlay');
 await page.evaluate(()=>qa.A.closeZoom());
}
// Reward notices never capture focus, cover hit targets, or evict a required choice.
await page.evaluate(async()=>{
 const M=await import('/src/ui/modal.ts');qa.modal=M;
 qa.confirm=M.confirmDialog({title:'Meaningful choice',body:'Keep this choice',confirm:'Continue',cancel:'Cancel'});
 M.treasureModal('mimic','ミミックが現れた');
});
assert.equal(await page.locator('#overlayRoot .modal h2').textContent(),'Meaningful choice');
assert.equal(await page.locator('.treasure-notice button').count(),0);
assert.equal(await page.locator('.treasure-notice').evaluate(e=>getComputedStyle(e).pointerEvents),'none');
await page.waitForTimeout(300);await page.screenshot({path:output+'/nonblocking-notice.png'});
await page.waitForTimeout(2250);assert.equal(await page.locator('.treasure-notice').count(),0);
await page.getByRole('button',{name:'Continue',exact:true}).click();assert.equal(await page.evaluate(()=>qa.confirm),true);
await reset('dense');
const rift=page.locator('#rift-me');
assert.equal(await rift.locator('.rift-sprite').evaluate(e=>getComputedStyle(e,'::after').animationDuration),'32s');
await rift.hover();await page.waitForTimeout(250);assert.equal(await rift.locator('.rift-sprite').evaluate(e=>getComputedStyle(e,'::after').animationPlayState),'paused');const idle=await rift.locator('.rift-sprite').evaluate(e=>({animation:getComputedStyle(e).animationName,position:getComputedStyle(e).backgroundPosition,transform:getComputedStyle(e).transform}));
await page.waitForTimeout(650);assert.deepEqual(await rift.locator('.rift-sprite').evaluate(e=>({animation:getComputedStyle(e).animationName,position:getComputedStyle(e).backgroundPosition,transform:getComputedStyle(e).transform})),idle);assert.equal(idle.animation,'none');
await page.mouse.move(5,5);
const frames=await page.locator('.portrait .pt-ring').evaluateAll(es=>es.map(e=>{const s=getComputedStyle(e,'::after');return {width:parseFloat(s.width),height:parseFloat(s.height),size:s.backgroundSize};}));
for(const f of frames){assert(Math.abs(f.width-f.height)<1);assert.equal(f.size,'contain');}
assert.equal(await page.locator('.market-sub--supply').getAttribute('data-furniture'),'blender');
assert.equal(await page.locator('.market-sub--supply').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');

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
await page.evaluate(async()=>{qa.c.destroy();qa.stop();await qa.c.queue;});assert.equal(await page.locator('.duel-objects-3d,.board-flight-canvas,.fx-card-flight,.attack-aim,.cast-veil').count(),0);
assert.deepEqual(errors,[]);await fs.writeFile(output+'/browser-checks.json',JSON.stringify({dimensions,units,projection,landings,errors,checks:['damage stacking','aspect','larger portraits','all three Blender furniture models','attack arrow stays anchored','summon exact handoff','enchantment exact handoff','PC and phone','grounded dice','cleanup']},null,2));
console.log('PASS: shared-perspective browser integration');
} finally {await browser.close();}
