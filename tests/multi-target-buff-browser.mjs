import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.LORE_TEST_OUT||'/tmp/lore-multi-target-buff';
await fs.mkdir(out,{recursive:true});
const fixture=`
import '/src/styles/tokens.css';import '/src/styles/base.css';import '/src/styles/card.css';import '/src/styles/passives.css';import '/src/styles/game-overlays.css';import '/src/styles/game.css';import '/src/styles/screens.css';import '/src/styles/reading-board.css';import '/src/styles/presentation.css';
import {BaseController} from '/src/game/controller.ts';import {createGame,reduce} from '/src/shared/engine.ts';import {DB} from '/src/shared/cards.ts';import {startBoardLayout} from '/src/ui/layout.ts';import {setLang} from '/src/i18n.ts';import * as A from '/src/ui/anim.ts';
setLang('ja');
class Fixture extends BaseController {submit(action){this.applyResult(reduce(this.state,action));}}
const ctl=new Fixture(document.querySelector('#app'),0,{onHome(){},onRematch(){}});startBoardLayout();
const mon=(uid)=>({...DB.ELF,uid,atk:5,def:8,dmg:0,exhausted:false,tempAtk:0,atkMod:0,defMod:0,summonedTurn:0});
function reset(owner=0,count=3){A.setFxSkip(true);const g=createGame({mode:'bot',seed:71,starting:owner,p0:{id:'me',name:'YOU'},p1:{id:'opp',name:'OPPONENT'}}).state;g.cur=owner;g.turn=3;g.pending=null;for(const [s,p] of g.players.entries()){p.mana=20;p.maxMana=20;p.enchants=[];p.quests=[];p.traps=[];p.hand=[];p.field=Array.from({length:count},(_,i)=>mon('mon-'+s+'-'+i));}ctl.state=g;ctl.view.render(g);A.setFxSkip(false);return g;}
async function watch(action){const start=performance.now(),frames=[];let watching=true;const sample=()=>{const actors=[...document.querySelectorAll('[data-layer-policy=foreground] [data-monster-kind=atk]')];const surfaces=actors.filter(n=>{const c=n.querySelector('.stat-surface');return c&&c.width>1&&c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0);}).length;frames.push({ms:performance.now()-start,count:actors.length,surfaces});if(watching)requestAnimationFrame(sample);};requestAnimationFrame(sample);await action();watching=false;return {frames,activeAtEnd:document.querySelectorAll('[data-layer-policy=foreground] [data-monster-kind=atk]').length};}
reset();window.buffQA={watch,ctl,reset,DB,reduce,async trumpet(){ctl.submit({type:'play',idx:0});await ctl.queue;},async pick(uid){ctl.onChooseTarget(uid);await ctl.queue;},async all(owner){const prev=ctl.state,res=reduce(prev,{type:'play',idx:0});ctl.applyResult(res);await ctl.queue;},get g(){return ctl.state}};
`;
const server=await createServer({root:'client',configFile:'client/vite.config.ts',logLevel:'error',plugins:[{name:'buff-fixture',resolveId(id){if(id==='/@buff-fixture.js')return '\0buff-fixture'},load(id){if(id==='\0buff-fixture')return fixture},configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url==='/buff-qa'){res.setHeader('Content-Type','text/html');res.end('<html><body><div id="app"></div><script type="module" src="/@buff-fixture.js"></script></body></html>');}else next();});}}],server:{host:'127.0.0.1',port:5429,strictPort:true,hmr:false}});await server.listen();
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:out+'/video',size:{width:1280,height:900}}});
const page=await context.newPage();page.setDefaultTimeout(60000);const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
const active=()=>page.locator('[data-layer-policy=foreground] [data-monster-kind=atk]').count();
async function startTrumpet(owner=0,count=3){await page.evaluate(({owner,count})=>{const q=buffQA,g=q.reset(owner,count);g.players[owner].hand=[{...q.DB.TRUMPET,uid:'trumpet'}];q.ctl.view.render(g);},{owner,count});await page.evaluate(()=>buffQA.trumpet());}
const check=(result,count,label)=>{assert.equal(Math.max(...result.frames.map(f=>f.count)),count,label);assert.equal(Math.max(...result.frames.map(f=>f.surfaces)),count,label+' visible arrows on every target');assert.equal(result.activeAtEnd,0,'controller completes after every stat actor is removed');checks.push({case:label,targets:count,frames:result.frames});};
async function capture(name){await page.waitForSelector('[data-layer-policy=foreground] [data-monster-kind=atk]');await page.screenshot({path:out+'/'+name+'.png'});return await page.evaluate(()=>window.playing);}
try{
 await page.goto('http://127.0.0.1:5429/buff-qa');await page.waitForFunction(()=>window.buffQA&&document.querySelector('[data-scene-ready=true]'));await page.waitForTimeout(500);
 for(const owner of [0,1]){
  await startTrumpet(owner);
  for(let i=0;i<2;i++)await page.evaluate(uid=>buffQA.pick(uid),'mon-'+owner+'-'+i);
  await page.evaluate(owner=>{window.playing=buffQA.watch(()=>buffQA.pick('mon-'+owner+'-2'));},owner);
  check(await capture('trumpet-'+owner),3,'trumpet-three-owner-'+owner);
  assert.deepEqual(await page.evaluate(owner=>buffQA.g.players[owner].field.map(m=>m.tempAtk),owner),[1,1,1]);
 }
 await startTrumpet();await page.evaluate(()=>buffQA.pick('mon-0-0'));check(await page.evaluate(()=>buffQA.watch(()=>buffQA.pick(null))),1,'partial-cancel');
 await startTrumpet(0,2);await page.evaluate(()=>buffQA.pick('mon-0-0'));check(await page.evaluate(()=>buffQA.watch(()=>buffQA.pick('mon-0-1'))),2,'two-card-board');
 for(const owner of [0,1]){
  await page.evaluate(owner=>{const q=buffQA,g=q.reset(owner,7);const def=Object.values(q.DB).find(c=>c.act==='buffAllTurn');g.players[owner].hand=[{...def,uid:'all-buff'}];q.ctl.view.render(g);window.playing=q.watch(()=>q.all(owner));},owner);
  check(await capture('all-seven-'+owner),7,'all-seven-owner-'+owner);
 }
 await startTrumpet();check(await page.evaluate(()=>buffQA.watch(async()=>{const q=buffQA;for(let i=0;i<3;i++)q.ctl.onChooseTarget('mon-0-'+i);await q.ctl.queue;})),3,'rapid-three-picks');
 await page.setViewportSize({width:390,height:844});await startTrumpet();for(let i=0;i<2;i++)await page.evaluate(uid=>buffQA.pick(uid),'mon-0-'+i);await page.evaluate(()=>{window.playing=buffQA.watch(()=>buffQA.pick('mon-0-2'))});check(await capture('mobile'),3,'mobile-three');
 await page.emulateMedia({reducedMotion:'reduce'});await startTrumpet();for(let i=0;i<3;i++)await page.evaluate(uid=>buffQA.pick(uid),'mon-0-'+i);assert.equal(await active(),0);checks.push({case:'reduced-motion-cleanup'});
 await page.evaluate(()=>buffQA.ctl.destroy());assert.equal(await page.locator('.monster-animation-layer').count(),0);assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/report.json',JSON.stringify({checks,errors},null,2));console.log('PASS',checks.map(({frames,...c})=>c));
}catch(error){await fs.writeFile(out+'/failure.json',JSON.stringify({error:String(error),checks,errors},null,2));throw error;}
finally{await context.close();await page.video().saveAs(out+'/playback.webm');await browser.close();await server.close();}
