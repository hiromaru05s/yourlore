import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.LORE_TEST_OUT||'/tmp/lore-feedback-visual';await fs.mkdir(out,{recursive:true});
const fixture=`
import '/src/styles/tokens.css';import '/src/styles/base.css';import '/src/styles/card.css';import '/src/styles/passives.css';import '/src/styles/game-overlays.css';import '/src/styles/game.css';import '/src/styles/screens.css';import '/src/styles/reading-board.css';import '/src/styles/presentation.css';
import '/src/styles/fonts.css';import '/src/styles/mobile.css';import '/src/styles/defaultUI.css';import '/src/styles/defaultButtons.css';import {closeOverlay} from '/src/ui/modal.ts';
import {BaseController} from '/src/game/controller.ts';import {createGame,reduce} from '/src/shared/engine.ts';import {DB,STARTERS} from '/src/shared/cards.ts';import {startBoardLayout} from '/src/ui/layout.ts';import {setLang} from '/src/i18n.ts';import * as A from '/src/ui/anim.ts';
setLang('ja');class Fixture extends BaseController {submit(a){this.applyResult(reduce(this.state,a));}};
const ctl=new Fixture(document.querySelector('#app'),0,{onHome(){},onRematch(){}});startBoardLayout();
const card=(id,uid)=>({...DB[id]??STARTERS[id],uid});const mon=(id,uid,hp=40)=>({...card(id,uid),def:hp,dmg:0,exhausted:false,tempAtk:0,atkMod:0,defMod:0,summonedTurn:0});
function reset(id,owner=0,lethal=false){A.setFxSkip(true);const g=createGame({mode:'online',seed:17,starting:owner,p0:{id:'me',name:'YOU'},p1:{id:'opp',name:'OPPONENT'}}).state;g.cur=owner;g.turn=3;g.phase='main';g.pending=null;for(const [s,p] of g.players.entries())Object.assign(p,{hand:[],deck:[],discard:[],removed:[],enchants:[],quests:[],traps:[],hp:80,maxHp:80,mana:20,maxMana:20,openingDrawReady:false,field:[mon('ELF','target-'+s+'-0',lethal?1:40),mon('INFKNIGHT','target-'+s+'-1')]});
if(id==='FIRE_ARROW')g.players[1-owner].field=[];
if(['GUNNER','HEAVY_GUNNER','NGA4'].includes(id))g.players[owner].field[0]=mon(id,'source');else g.players[owner].hand=[card(id,'source'),card('STARTER_TRASH','cost')];g.players[1-owner].brand=1;ctl.state=g;ctl.view.render(g);ctl.view.setHandOpen(false);A.setFxSkip(false);return g;}
async function run(id,owner=0,lethal=false){reset(id,owner,lethal);await new Promise(r=>setTimeout(r,300));const frames=[];let watching=true;const sample=()=>{const c=document.querySelector('canvas[data-elemental]');if(c)frames.push({at:performance.now(),kind:c.dataset.elemental,duration:+c.dataset.duration,impact:+(c.dataset.impact??-1),hits:+c.dataset.hits,pixels:c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0),surfaces:document.querySelectorAll('.element-surface').length});if(watching)requestAnimationFrame(sample)};requestAnimationFrame(sample);
const action=id==='NGA4'?{type:'attack',uid:'source'}:id.endsWith('GUNNER')?{type:'endTurn'}:{type:'play',idx:0};ctl.submit(action);await ctl.queue;
if(ctl.state.pending){const uid=id==='FIRE_ZONE'?'cost':'player-'+(1-owner),choice=document.querySelector('#overlayRoot .card[data-uid="'+uid+'"]');closeOverlay();ctl.submit({type:'pick',uid});await ctl.queue;}
watching=false;return {frames,state:ctl.state,remaining:document.querySelectorAll('.element-overlay,.element-surface').length};}
reset('NGA4');window.elementQA={ctl,reset,run,A,DB,reduce,mon};`;

const server=await createServer({root:'client',configFile:'client/vite.config.ts',logLevel:'error',plugins:[{name:'feedback-fixture',resolveId(id){if(id==='/@feedback-fixture.js')return '\0feedback-fixture'},load(id){if(id==='\0feedback-fixture')return fixture},configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url==='/feedback-qa'){res.setHeader('Content-Type','text/html');res.end('<html><body><div id="app"></div><script type="module" src="/@feedback-fixture.js"></script></body></html>')}else next()})}}],server:{host:'127.0.0.1',port:5438,strictPort:true,hmr:false}});await server.listen();
const browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:out+'/video',size:{width:1280,height:900}}});const page=await context.newPage();page.setDefaultTimeout(45000);const errors=[],checks=[];page.on('console',e=>{if(e.type()==='error')console.log('browser',e.text());});page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5438/feedback-qa');await page.waitForFunction(()=>window.elementQA&&document.querySelector('[data-scene-ready=true]'));
 for(const owner of [0,1]){
  if(owner)await page.setViewportSize({width:390,height:844});
  await page.evaluate(owner=>{
   window.damageTimes=[];window.overlap=0;window.canvases=[];
   window.monitor=new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes){if(n.matches?.('.combat-damage') && n.textContent!=='2'){damageTimes.push({at:performance.now(),amount:n.textContent});overlap=Math.max(overlap,document.querySelectorAll('.combat-damage').length);}if(n.matches?.('canvas[data-elemental]'))canvases.push(performance.now());}});
   monitor.observe(document.body,{childList:true,subtree:true});window.done=false;window.playing=elementQA.run('FIRE_BALL',owner).then(r=>{window.done=true;return r;});
  },owner);
  await page.waitForFunction(()=>window.damageTimes.length===1);await page.screenshot({path:out+'/first-'+owner+'.png'});
  await page.waitForFunction(()=>window.damageTimes.length===2);await page.screenshot({path:out+'/second-'+owner+'.png'});
  await page.waitForFunction(()=>window.done,{},{timeout:45000}).catch(async e=>{console.log(await page.evaluate(()=>({pending:elementQA.ctl.state.pending,times:damageTimes,canvases,overlap,nodes:[...document.querySelectorAll('.element-overlay')].map(n=>n.outerHTML)})));throw e;});
  await page.evaluate(()=>playing);
  const report=await page.evaluate(()=>{monitor.disconnect();return {times:damageTimes,overlap,canvases};});
  assert.equal(report.times.length,2);assert.equal(report.overlap,1);assert.equal(report.canvases.length,2);assert(report.times[1].at-report.times[0].at>=2400);checks.push({owner,...report});
 }
 await page.setViewportSize({width:1280,height:900});
 for(const reduced of [false,true]){
  await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
  const report=await page.evaluate(async reduced=>{
   let overlap=0,hits=0;const watch=new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.matches?.('.combat-damage')&&document.querySelector('.element-overlay')){hits++;overlap=Math.max(overlap,document.querySelectorAll('.combat-damage').length);}});watch.observe(document.body,{childList:true,subtree:true});
   const result=await elementQA.run(reduced?'FIRE_BALL':'FIRE_ARROW',0);watch.disconnect();return {overlap,hits,remaining:result.remaining};
  },reduced);
  assert.equal(report.overlap,1);assert.equal(report.hits,reduced?2:3);assert.equal(report.remaining,0);checks.push({reduced,...report});
 }
 await page.emulateMedia({reducedMotion:'no-preference'});
 for(const interrupt of ['skip','resize']){
  await page.evaluate(()=>{window.done=false;window.playing=elementQA.run('FIRE_BALL',0).then(r=>{window.done=true;return r;});});
  await page.locator('canvas[data-elemental]').waitFor();
  if(interrupt==='skip')await page.evaluate(()=>elementQA.A.setFxSkip(true));else await page.setViewportSize({width:1279,height:900});
  await page.waitForFunction(()=>window.done);assert.equal((await page.evaluate(()=>playing)).remaining,0);checks.push({interrupt,cleanup:true});
 }
 const spirits=await page.evaluate(async()=>{
  const {ctl,reset,mon,A,reduce}=elementQA;const g=reset('FIRE_BALL');g.cur=1;g.players[0].field=[mon('MINI_SPIRIT','mini-a',3),mon('MINI_SPIRIT','mini-b',3)];g.players[0].dew=3;g.players[0].brand=0;g.players[1].brand=0;g.players[1].field=[];g.players.forEach(p=>{p.hand=[];p.deck=[];p.discard=[];});ctl.state=g;await ctl.view.render(g,new Set(),false);
  window.statUids=[];const watch=new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.matches?.('[data-material-effect="stats"],.card-material-amount'))statUids.push(n.closest('.card')?.dataset.uid);});watch.observe(document.body,{childList:true,subtree:true});
  ctl.submit({type:'endTurn'});await ctl.queue;watch.disconnect();return {values:ctl.state.players[0].field.map(m=>({uid:m.uid,atk:m.atkMod})),uids:statUids};
 });
 assert(spirits.values.every(m=>m.atk===1));assert(spirits.uids.includes('mini-a'));assert(spirits.uids.includes('mini-b'));checks.push({spirits});await page.screenshot({path:out+'/spirits.png'});
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({checks,errors},null,2));console.log('PASS sequential Fireball on both sides/mobile and both Mini Spirit stat animations',checks);
}finally{await context.close();await page.video().saveAs(out+'/playback.webm');await browser.close();await server.close();}
