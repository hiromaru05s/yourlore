import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.LORE_TEST_OUTPUT||'.cache/summon-hand-layer';
await fs.mkdir(out,{recursive:true});
const css=[...(await fs.readFile('client/src/main.ts','utf8')).matchAll(/import "\.\/styles\/(.*?)\.css";/g)].map(m=>m[1]);
const server=await createServer({root:path.resolve('client'),configFile:false,logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false}});
await server.listen();
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:out,size:{width:1280,height:900}}});
const page=await context.newPage(),checks=[],errors=[];
page.setDefaultTimeout(45000);
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='warning'&&/Native card fallback/.test(m.text()))errors.push(m.text());});
try{
 await page.route('**/hand-layer-qa',r=>r.fulfill({contentType:'text/html',body:'<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"><div id="gameScreen"></div></div></body></html>'}));
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/hand-layer-qa`);
 await page.evaluate(async css=>{
  for(const name of css)await import('/src/styles/'+name+'.css');
  const E=await import('/src/shared/engine.ts'),C=await import('/src/shared/cards.ts'),A=await import('/src/ui/anim.ts');
  const {BaseController}=await import('/src/game/controller.ts');
  class Controller extends BaseController{submit(action){qa.actions.push(action);} }
  const ctl=new Controller(document.getElementById('gameScreen'),0,{onHome(){},onRematch(){}});
  (await import('/src/ui/layout.ts')).startBoardLayout();
  (await import('/src/i18n.ts')).setLang('ja');
  const reset=(id='M2',owner=0)=>{
   A.setFxSkip(false);ctl.view.setHandOpen(false);
   const g=E.createGame({mode:'bot',seed:77,starting:owner,p0:{id:'a',name:'YOU'},p1:{id:'b',name:'OPP'}}).state;
   g.turn=3;g.cur=owner;g.pending=null;
   for(const [s,p]of g.players.entries()){
    p.openingDrawReady=false;p.field=[];p.enchants=[];p.quests=[];p.traps=[];p.mana=p.maxMana=30;p.dew=4;
    p.hand=[id,'M2','ND2','M2','ND2'].map((c,i)=>({...C.DB[c],uid:`hand-${s}-${i}`}));
   }
   ctl.state=g;ctl.introShown=true;ctl.view.render(g);document.getElementById('gameScreen').classList.remove('opening-pending');
   return g;
  };
  window.qa={ctl,A,C,E,reset,g:reset(),done:false,actions:[]};
  // Ask the browser for paint order at an actual hand card. Temporarily enable
  // hit testing on a fullscreen effect so pointer-events:none cannot hide it
  // from elementsFromPoint. Restore the original style immediately.
  qa.order=layer=>{
   const hand=document.getElementById('hand'),card=hand.querySelector('.card'),r=card.getBoundingClientRect();
   const old=layer.style.pointerEvents;layer.style.pointerEvents='auto';
   const stack=document.elementsFromPoint(Math.max(1,Math.min(innerWidth-1,r.x+r.width/2)),Math.max(1,Math.min(innerHeight-1,r.y+r.height/2)));
   layer.style.pointerEvents=old;
   return{hand:stack.findIndex(n=>hand.contains(n)),effect:stack.indexOf(layer),app:getComputedStyle(document.getElementById('app')).zIndex,stage:getComputedStyle(document.querySelector('.stage')).zIndex,handZ:getComputedStyle(hand).zIndex};
  };
 },css);
 await page.waitForSelector('[data-scene-ready=true]');
 for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
  await page.setViewportSize(viewport);
  for(const [id,layerName,owner]of [['M2','slate-summon',0],['M2','slate-summon',1],['ELF','verdant-summon',0]]){
   await page.evaluate(({id,owner})=>{
    qa.g=qa.reset(id,owner);qa.ctl.view.setHandOpen(true);
    const prev=structuredClone(qa.g),result=qa.E.reduce(qa.g,{type:'play',idx:0});
    if(!result.events.some(e=>e.type==='summon'))throw Error('Fixture did not summon '+id);
    qa.g=result.state;qa.ctl.state=qa.g;qa.done=false;
    qa.playing=qa.ctl.playEvents(prev,result).then(()=>qa.done=true);
   },{id,owner});
   await page.waitForSelector('.'+layerName);
   await page.waitForFunction(cls=>Number(document.querySelector('.'+cls)?.dataset.time)>=350,layerName);
   const order=await page.evaluate(cls=>qa.order(document.querySelector('.'+cls)),layerName);
   assert(order.hand>=0&&order.effect>order.hand,'Expanded hand must paint above summon: '+JSON.stringify(order));
   assert.equal(order.app,'auto','The outer application must release its stacking context while the hand is open');
   assert.equal(order.stage,'6','Board contents must retain their stacking context above the table');
   assert.equal(await page.locator('.game.hand-open').count(),1);
   await page.evaluate(()=>{qa.ctl.view.setHandOpen(false);qa.ctl.view.setHandOpen(true);});
   const reopened=await page.evaluate(cls=>qa.order(document.querySelector('.'+cls)),layerName);
   assert(reopened.hand>=0&&reopened.effect>reopened.hand,'Reopened hand must stay above active summon');
   await page.screenshot({path:path.join(out,`${viewport.width}-${owner}-${id}-summon.png`)});
   // Opening a modal during the same summon must still cover the hand.
   await page.evaluate(async()=>{
    const {confirmDialog}=await import('/src/ui/modal.ts');
    qa.dialog=confirmDialog({title:'Layer check',body:'Hand stays below dialogs',confirm:'OK',cancel:'Cancel'});
   });
   const modalOrder=await page.evaluate(()=>qa.order(document.querySelector('.overlay')));
   assert(modalOrder.effect>=0&&modalOrder.effect<modalOrder.hand,'Dialog must cover hand: '+JSON.stringify(modalOrder));
   await page.locator('.modal .btn-ghost').click();
   await page.evaluate(()=>Promise.all([qa.dialog,qa.playing]));
   assert.equal(await page.locator('.'+layerName).count(),0);
   assert.equal(await page.locator('#hand').evaluate(n=>getComputedStyle(n).visibility),'visible');
   // Closing and reopening restores compact stacking without losing hand nodes.
   await page.evaluate(()=>qa.ctl.view.setHandOpen(false));
   assert.equal(await page.locator('#app').evaluate(n=>getComputedStyle(n).zIndex),'1');
   assert.equal(await page.locator('#handArea #hand').count(),1);
   await page.evaluate(()=>qa.ctl.view.setHandOpen(true));
   assert.equal(await page.locator('#hand .card').count(),owner===0?4:5);
   checks.push({viewport,id,owner,order,modalOrder,complete:true});
  }
  // Reparenting must preserve pointer capture and the existing drag-to-play
  // handler, including one gesture that expands the compact hand and plays.
  for(const open of [false,true]){
   await page.evaluate(open=>{qa.g=qa.reset();qa.actions=[];qa.ctl.view.setHandOpen(open);},open);
   await page.waitForTimeout(250);
   const card=page.locator('#hand .card').first(),box=await card.boundingBox();
   await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
   await page.mouse.move(viewport.width/2,viewport.height*.55,{steps:12});
   await page.waitForSelector('.drag-ghost--hand');
   const dragZ=await page.locator('.drag-ghost--hand').evaluate(n=>getComputedStyle(n).zIndex);
   assert(Number(dragZ)>145);
   await page.mouse.up();await page.waitForFunction(()=>qa.actions.length>0);
   assert.equal(await page.evaluate(()=>qa.actions[0].type),'play');
   assert.equal(await page.evaluate(()=>qa.actions[0].sourceUid),'hand-0-0');
   assert.equal(await page.locator('.drag-ghost--hand').count(),0);
   checks.push({viewport,dragFromOpen:open,submitted:true});
  }
 }
 // The same stacking contract must hold when WebGL falls back to the flat
 // board: production still mounts that board below the outer #app element.
 await page.setViewportSize({width:1280,height:900});
 const fallback=await page.evaluate(()=>{
  qa.reset();const root=document.getElementById('gameScreen');root.classList.remove('reading-board');
  qa.ctl.view.setHandOpen(true);
  const layer=document.createElement('div');layer.style.cssText='position:fixed;inset:0;z-index:136;pointer-events:none';document.body.append(layer);
  const order=qa.order(layer),hand=document.getElementById('hand').getBoundingClientRect();layer.remove();
  return {order,handInViewport:hand.width>0&&hand.height>0&&hand.left<innerWidth&&hand.right>0&&hand.top<innerHeight&&hand.bottom>0};
 });
 assert(fallback.order.hand>=0&&fallback.order.effect>fallback.order.hand,'Fallback hand must paint above summon: '+JSON.stringify(fallback));
 assert.equal(fallback.order.app,'auto');assert(fallback.handInViewport,'Fallback hand must remain visible');
 await page.evaluate(()=>qa.ctl.view.setHandOpen(false));
 assert.equal(await page.locator('#handArea #hand').count(),1);
 checks.push({fallback});
 assert.deepEqual(errors,[]);
 await page.evaluate(()=>qa.ctl.destroy());
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({checks,errors,source:process.cwd(),url:page.url(),boundary:'Local Chrome with current product styles, controller and engine; no authenticated PvP or physical-device performance claim.'},null,2));
 console.log('PASS expanded hand above ordinary and special summons, both owners, desktop/mobile; dialogs, completion and reopen');
}catch(e){await page.screenshot({path:path.join(out,'failure.png')});throw e;}
finally{await context.close();await fs.rename(await page.video().path(),path.join(out,'continuous.webm'));await browser.close();await server.close();}
