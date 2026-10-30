import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {journalState} from './fixtures/journalStorage.mjs';
import {rewardTestEnv} from './fixtures/rewardTestEnv.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5537';
const out=process.env.LORE_TEST_OUTPUT||'docs/releases/2026-10-29-turn-timer';await fs.mkdir(out,{recursive:true});
const temp=await fs.mkdtemp('/tmp/lore-turn-browser-');
await build({entryPoints:['server/src/gameRoom.ts'],bundle:true,format:'esm',platform:'node',outfile:temp+'/room.mjs'});
const {GameRoom}=await import(temp+'/room.mjs');
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],messages=[],sockets=[],pages=[],assets=new Set();let saved;
const storage={get:async()=>structuredClone(saved),put:async(k,v)=>{saved=structuredClone(v);},setAlarm:async()=>{},deleteAlarm:async()=>{}};
const state={storage,getWebSockets:tag=>sockets.filter(s=>String(s.side)===tag)};
const room=new GameRoom(journalState(state),rewardTestEnv());
try {
 await room.fetch(new Request('https://local/setup',{method:'POST',body:JSON.stringify({ranked:true,seed:22,players:[{id:'a',name:'A'},{id:'b',name:'B'}]})}));
 Object.assign(room.room,{opening:undefined,previewDone:true,previewUntil:null,initEvents:[]});
 room.room.game.turn=3;room.room.game.cur=1;room.room.game.pending=null;
 for(const p of room.room.game.players){p.hand=[];p.field=[];p.enchants=[];p.openingDrawReady=false;}
 for(const side of [0,1]){
  const page=await browser.newPage({viewport:{width:1440,height:900}});pages.push(page);
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/art/'))assets.add(r.url());});
  await page.route('**/timer-fixture',r=>r.fulfill({contentType:'text/html',body:'<html><div id="app"></div></html>'}));
  await page.routeWebSocket('**/ws/room/**',route=>{
   const socket={side,deserializeAttachment:()=>({side,gen:0}),send:raw=>route.send(raw),close(){}};sockets.push(socket);
   let chain=Promise.resolve();route.onMessage(raw=>{const msg=JSON.parse(String(raw));messages.push({side,msg,at:Date.now()});chain=chain.then(()=>room.webSocketMessage(socket,String(raw)));});
  });
  await page.goto(origin+'/timer-fixture');
  await page.evaluate(async side=>{
   for(const css of ['tokens','base','card','game-overlays','game','dice','screens','mobile','reading-board','duel-opening'])await import('/src/styles/'+css+'.css');
   (await import('/src/i18n.ts')).setLang('ja');
   const V=await import('/src/ui/boardView.ts');V.setMyAvatar('SEEKER_BLUE');V.setOppAvatar('SEEKER_RED');
   const {OnlineController}=await import('/src/game/online.ts');
   const c=new OnlineController(document.getElementById('app'),side,'timer-fixture',{onHome(){},onRematch(){}},true);
   const stop=(await import('/src/ui/layout.ts')).startBoardLayout();
   const original=c.playEvents.bind(c);c.playEvents=async(...args)=>{if(c.hold)await new Promise(r=>c.release=r);await original(...args);c.playbackDoneAt=Date.now();};
   window.qa={c,stop};
  },side);
  await page.waitForFunction(()=>qa.c.state?.turn===3&&document.getElementById('app').dataset.sceneReady==='true',null,{timeout:120000});
  await page.evaluate(()=>qa.c.queue);
 }
 await pages[0].evaluate(()=>qa.c.hold=true);
 await room.handleAction(1,{type:'endTurn'});
 assert.equal(room.room.game.cur,0);assert.equal(room.room.game.turn,4);
 await pages[0].waitForFunction(()=>!!qa.c.release);
 await pages[0].waitForTimeout(2200);
 assert.equal(await pages[0].evaluate(()=>qa.c.timerLeft),65);
 assert.equal(await pages[0].evaluate(()=>qa.c.timerInt),null);
 assert.equal(messages.filter(x=>x.msg.type==='turnReady').length,0);
 assert(room.room.turnReadyBy);
 await pages[0].screenshot({path:out+'/waiting.png'});
 await pages[0].evaluate(()=>{qa.c.hold=false;qa.c.release();});
 await pages[0].waitForFunction(()=>!!qa.c.timerInt&&qa.c.state.turn===4,null,{timeout:60000});
 const playable=await pages[0].evaluate(()=>({done:qa.c.playbackDoneAt,playing:document.querySelector('.game').classList.contains('fx-playing'),draw:document.querySelectorAll('.native-draw-layer').length,hand:document.querySelectorAll('#hand .card').length,left:qa.c.timerLeft}));
 assert.equal(playable.playing,false);assert.equal(playable.draw,0);assert(playable.hand>0);assert(playable.left>=64);
 const ready=messages.find(x=>x.msg.type==='turnReady');assert.equal(ready.side,0);assert(ready.at>=playable.done);assert(room.room.turnStartAt>=playable.done);
 await pages[0].waitForFunction(()=>qa.c.timerLeft<=63);
 assert.equal(await pages[1].evaluate(()=>qa.c.turnTotal),65);
 await pages[0].screenshot({path:out+'/playable.png'});
 // A real first-turn opening also sends readiness only after its native deal and inert release.
 await pages[0].evaluate(async()=>{
  qa.c.destroy();qa.stop();
  const {BaseController}=await import('/src/game/controller.ts'),{createGame}=await import('/src/shared/engine.ts');
  class C extends BaseController {submit(){} turnPlayable(){this.readyAt=Date.now();this.readyInert=document.querySelector('.game').inert;this.readyDraw=document.querySelectorAll('.native-draw-layer').length;}}
  const c=new C(document.getElementById('app'),0,{}),g=createGame({mode:'online',seed:22,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
  const {DUEL_OPENING_MS}=await import('/src/shared/opening.ts');const now=Date.now();Object.assign(g,{turnLeftMs:65000,turnTotalMs:65000,turnClockWaiting:true,opening:{startsAt:now+500,playableAt:now+500+DUEL_OPENING_MS,serverNow:now}});
  qa={c,stop:(await import('/src/ui/layout.ts')).startBoardLayout()};c.applyResult({state:g,events:[]},false);
 });
 await pages[0].waitForSelector('.duel-opening',{timeout:60000});assert.equal(await pages[0].evaluate(()=>qa.c.timerInt),null);
 await pages[0].waitForFunction(()=>!!qa.c.readyAt,null,{timeout:60000});
 const first=await pages[0].evaluate(()=>({inert:qa.c.readyInert,draw:qa.c.readyDraw,left:qa.c.timerLeft,timer:qa.c.timerInt}));
 assert.deepEqual(first,{inert:false,draw:0,left:65,timer:null});
 assert.deepEqual(errors,[]);
 const report={origin,source:process.cwd(),playable,first,ready,assetCount:assets.size,assets:[...assets].slice(0,20),errors,checks:['real server + two online controllers','delayed turn-start playback preserves all 65 seconds','native draw completes before ready acknowledgement','both sides receive authoritative clock','first opening deal/inert release before acknowledgement']};
 await fs.writeFile(out+'/browser-report.json',JSON.stringify(report,null,2));console.log('PASS',JSON.stringify(report));
}finally{for(const page of pages)await page.evaluate(()=>{qa.c.destroy();qa.stop();}).catch(()=>{});await browser.close();await fs.rm(temp,{recursive:true,force:true});}
