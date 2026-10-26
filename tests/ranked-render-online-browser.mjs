import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5631';
const out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-ranked-render-online';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:out,size:{width:1280,height:900}}});
const page=await context.newPage(),errors=[],checks=[];page.setDefaultTimeout(180000);
const cpuThrottle=Number(process.env.LORE_CPU_THROTTLE||1);
if(cpuThrottle>1){const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpuThrottle});}
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/ranked-render-fixture',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>'}));
await page.route('**/api/**',r=>r.fulfill({contentType:'application/json',body:'{"ok":true}'}));
let socket,initial;
await page.routeWebSocket('**/ws/room/**',ws=>{socket=ws;ws.onMessage(raw=>{const msg=JSON.parse(raw);if(msg.type==='ready')ws.send(JSON.stringify(initial));if(msg.type==='ping')ws.send('{"type":"pong"}');});});
try{
 for(const you of [0,1]){
  await page.goto(origin+'/ranked-render-fixture');
  initial=await page.evaluate(async you=>{
   for(const name of ['tokens','base','card','passives','game-overlays','game','screens','reading-board','presentation'])await import('/src/styles/'+name+'.css');
   const E=await import('/src/shared/engine.ts'),C=await import('/src/shared/cards.ts'),P=await import('/src/shared/protocol.ts');
   const g=E.createGame({mode:'online',seed:91,starting:1-you,p0:{id:'qa-a',name:'YOU'},p1:{id:'qa-b',name:'OPP'}}).state;
   g.turn=3;g.cur=1-you;g.ranked=true;g.pending=null;g.phase='main';delete g.opening;
   g.sleeves=['sleeve:gacha-elfweave','sleeve:gacha-elfweave'];g.furnitures=['furniture:gacha-elfweave','furniture:gacha-elfweave'];
   for(const [side,p]of g.players.entries()){
    p.openingDrawReady=false;p.field=[];p.enchants=[];p.quests=[];p.traps=[];p.discard=[];p.mana=20;p.maxMana=20;
    p.hand=['STARTER_MANA','STARTER_TRASH','STARTER_TRASH','STARTER_CHEST'].map((id,i)=>({...C.STARTERS[id],uid:`hand-${side}-${i}`}));
   }
   window.qa={E,C,P,g,you};return {type:'init',state:P.redactFor(g,you),events:[]};
  },you);
  await page.evaluate(async()=>{
   const {OnlineController}=await import('/src/game/online.ts');
   qa.controller=new OnlineController(document.getElementById('app'),qa.you,'render-'+qa.you,{onHome(){},onRematch(){}},true);
   qa.stop=(await import('/src/ui/layout.ts')).startBoardLayout();
  });
  await page.waitForFunction(()=>document.querySelector('#app')?.dataset.sceneReady==='true');
  await page.locator('.game-loading').waitFor({state:'hidden'});await page.evaluate(()=>qa.controller.queue);
  await page.waitForSelector('#oppHand .elfweave-sleeve-light');
  await page.evaluate(()=>{qa.backs=[...document.querySelectorAll('#oppHand .card--back')];qa.surfaces=qa.backs.map(n=>n.querySelector('canvas'));});
  socket.send(JSON.stringify({type:'update',state:initial.state,events:[]}));await page.evaluate(()=>qa.controller.queue);await page.waitForTimeout(200);
  assert(await page.evaluate(()=>qa.backs.every((n,i)=>n===document.querySelectorAll('#oppHand .card--back')[i]&&n.querySelector('canvas')===qa.surfaces[i])));
  checks.push(`viewer ${you}: authoritative no-op update retains backs and surfaces`);
  const play=await page.evaluate(()=>{const res=qa.E.reduce(qa.g,{type:'play',idx:0});qa.g=res.state;return {type:'update',state:qa.P.redactFor(res.state,qa.you),events:res.events};});
  socket.send(JSON.stringify(play));await page.waitForFunction(()=>qa.controller.state.players[1-qa.you].hand.length===3);await page.evaluate(()=>qa.controller.queue);
  assert.equal(await page.locator('#oppHand .card--back').count(),3);
  assert(await page.locator('#oppHand .card--back').evaluateAll(nodes=>nodes.every(n=>getComputedStyle(n).visibility==='visible'&&n.dataset.uid.startsWith('hidden-hand-'))));
  checks.push(`viewer ${you}: opponent play with redacted hand slots`);
  // Use a public draw event and the same opaque snapshots used by the server.
  const draw=await page.evaluate(()=>{const side=1-qa.you,card=qa.g.players[side].deck.pop();qa.g.players[side].hand.push(card);return {type:'update',state:qa.P.redactFor(qa.g,qa.you),events:[{type:'draw',player:side,count:1}]};});
  await page.evaluate(()=>{qa.drawSeen=false;qa.observer=new MutationObserver(()=>{if(document.querySelector('.native-draw-layer'))qa.drawSeen=true;});qa.observer.observe(document.body,{childList:true,subtree:true});});
  socket.send(JSON.stringify(draw));await page.waitForFunction(()=>qa.controller.state.players[1-qa.you].hand.length===4);await page.evaluate(()=>qa.controller.queue);
  assert(await page.evaluate(()=>qa.drawSeen));assert.equal(await page.locator('.native-draw-layer').count(),0);
  assert.equal(await page.locator('#oppHand .elfweave-sleeve-light').count(),4);
  assert(await page.locator('#oppHand .card--back').evaluateAll(nodes=>nodes.every(n=>getComputedStyle(n).visibility==='visible')));
  await page.screenshot({path:`${out}/viewer-${you}.png`});checks.push(`viewer ${you}: animated opponent draw, continuity and cleanup`);
  await page.evaluate(()=>{qa.observer.disconnect();qa.stop();qa.controller.destroy();});
  assert.equal(await page.locator('.elfweave-sleeve-light,.native-draw-layer').count(),0);
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/report.json',JSON.stringify({checks,errors,cpuThrottle,boundary:'Real OnlineController and browser WebSocket with deterministic server fixtures; both viewer sides. CPU throttling does not simulate a Windows GPU. No live account or Windows hardware.'},null,2));console.log('PASS',checks);
}catch(e){await page.screenshot({path:out+'/failure.png'}).catch(()=>{});console.error(errors);throw e;}
finally{await context.close();await browser.close();}
