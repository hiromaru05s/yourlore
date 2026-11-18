import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const out=process.env.LORE_TEST_OUT||'/tmp/lore-duel-four-visual';await fs.mkdir(out,{recursive:true});
const fixture=`
import * as T from 'three';window.THREE=T;
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

const server=await createServer({root:'client',cacheDir:'.cache/rift-bloom-browser',configFile:false,define:{__LORE_STARTUP_ASSETS__:'[]',__LORE_DUEL_PRELOAD__:'""',__LORE_FURNITURE_REVISION__:'"duel-four-qa"',__LORE_MENU_MANIFEST__:'""'},logLevel:'error',plugins:[{name:'feedback-fixture',enforce:'pre',transform(code,id){if(id.endsWith('/ui/manaFormation.ts'))return code.replace('bloom.render(renderer,bloomSource!,bloomSource!,0,false);', 'const px=new Uint16Array(bloomSource!.width*bloomSource!.height*4);renderer.readRenderTargetPixels(bloomSource!,0,0,bloomSource!.width,bloomSource!.height,px);window.bloomMax=px.reduce((v,x,i)=>i%4===3?v:Math.max(v,T.DataUtils.fromHalfFloat(x)),0);bloom.render(renderer,bloomSource!,bloomSource!,0,false);const bt=bloom.renderTargetsHorizontal[0],bp=new Uint16Array(bt.width*bt.height*4);renderer.readRenderTargetPixels(bt,0,0,bt.width,bt.height,bp);window.bloomOutput=bp.reduce((v,x)=>Math.max(v,T.DataUtils.fromHalfFloat(x)),0);');if(id.endsWith('/ui/duelScene.ts'))return code.replace('let dead=false,dirty=true', 'window.__riftDebug={renderer,camera,scene,cachedBoard,widgets};let dead=false,dirty=true');},resolveId(id){if(id==='/@feedback-fixture.js')return '\0feedback-fixture'},load(id){if(id==='\0feedback-fixture')return fixture},configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url==='/feedback-qa'){res.setHeader('Content-Type','text/html');res.end('<html><body><div id="app"></div><script type="module" src="/@feedback-fixture.js"></script></body></html>')}else next()})}}],server:{host:'127.0.0.1',port:5440,strictPort:true,hmr:false}});await server.listen();
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal']});const context=await browser.newContext({viewport:{width:1280,height:900}});const page=await context.newPage();page.setDefaultTimeout(180000);const errors=[],checks=[];page.on('console',e=>{if(e.type()==='error')console.log('browser',e.text());});page.on('pageerror',e=>errors.push(e.message));


try {
 await page.goto('http://127.0.0.1:5440/feedback-qa',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.elementQA&&window.__riftDebug&&document.querySelector('[data-scene-ready=true]'));
 console.log('board ready');const checks=await page.evaluate(async()=>{
  const T=window.THREE,{renderer,scene,camera,cachedBoard:target,widgets}=window.__riftDebug;
  const {applyFormationBloom}=await import('/src/ui/manaFormation.ts');const result=[];
  for(const side of ['Me','Opp'])for(const probe of [false,true]){
   const el=document.querySelector('#portrait'+side+' .pt-mana');el.dataset.maximum='21';el.dataset.mana='21';el.dataset.gainStart=String(performance.now());el.dataset.gainFromMax='20';el.dataset.gainFromMana='20';widgets.tick(performance.now()+350);let lamp;if(probe){let group;scene.traverse(o=>{if(o.name.startsWith('Mana formation '))group=o;});lamp=new T.Mesh(new T.SphereGeometry(.008,12,12),new T.MeshBasicMaterial({color:new T.Color(40,40,40),toneMapped:false}));lamp.position.y=.0106;group.add(lamp);}
   camera.layers.set(0);renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);renderer.setRenderTarget(null);
   const read=()=>{renderer.setRenderTarget(null);const a=new Uint16Array(target.width*target.height*4);renderer.readRenderTargetPixels(target,0,0,target.width,target.height,a);return a;};const a=read();applyFormationBloom(renderer,target,scene,camera);const b=read();
   const r=document.querySelector('#rift-'+(side==='Me'?'opp':'me')).getBoundingClientRect(),sx=target.width/innerWidth,sy=target.height/innerHeight;let maxRift=0,energy=0;
   for(let y=0;y<target.height;y++)for(let x=0;x<target.width;x++)for(let c=0;c<3;c++){
    const i=(y*target.width+x)*4+c,d=T.DataUtils.fromHalfFloat(b[i])-T.DataUtils.fromHalfFloat(a[i]);energy+=Math.max(0,d);
    if(x>=r.left*sx&&x<r.right*sx&&y>=(innerHeight-r.bottom)*sy&&y<(innerHeight-r.top)*sy)maxRift=Math.max(maxRift,Math.abs(d));
   }
   if(lamp){lamp.removeFromParent();lamp.geometry.dispose();lamp.material.dispose();}result.push({side,probe,maxRift,energy,bloomMax:window.bloomMax,bloomOutput:window.bloomOutput,cameraMask:camera.layers.mask});delete el.dataset.gainStart;widgets.tick(performance.now()+5000);
  }return result;
 });
 console.log(checks);checks.forEach(c=>{assert(c.maxRift<=(c.probe?1e-6:0),'unrelated rift pixels must not bloom');assert(c.bloomMax>0,'authored formation remains visible');if(c.probe)assert(c.energy>0,'HDR formation light must bloom');assert.equal(c.cameraMask,1);});assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/rift-bloom.json',JSON.stringify({checks,errors},null,2));console.log('PASS isolated mana bloom',checks);
} finally {await context.close();await browser.close();await server.close();}
