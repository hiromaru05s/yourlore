/** Exercise the shipped client; API and room messages are isolated local fixtures. */
import {build} from 'esbuild';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-feedback-browser/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'https://yourlore.xyz',out=process.env.LORE_TEST_OUTPUT||'docs/releases/2026-11-19-attack-target/qa';await fs.mkdir(out,{recursive:true});
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'lore-attack-live-'));
await build({stdin:{contents:"export {createGame,reduce} from './client/src/shared/engine';export {DB,STARTERS} from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',outfile:temp+'/fixture.mjs'});
const {createGame,reduce,DB,STARTERS}=await import(temp+'/fixture.mjs');
const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
try{for(const mobile of [false,true]){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:960},hasTouch:mobile,isMobile:mobile}),page=await context.newPage(),errors=[],actions=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
 let state=createGame({mode:'online',seed:71,starting:0,p0:{id:'attack-fixture',name:'YOU'},p1:{id:'opp',name:'OPPONENT'}}).state;state.turn=4;state.phase='main';state.pending=null;delete state.opening;
 const mon=(id,uid)=>({...DB[id],uid,tempAtk:0,atkMod:0,defMod:0,dmg:0,exhausted:false,summonedTurn:0});
 state.players.forEach((p,i)=>Object.assign(p,{openingDrawReady:false,hp:40,maxHp:40,mana:8,maxMana:8,hand:[{...STARTERS.STARTER_CHEST,uid:'chest-'+i}],field:i?[mon('M2','defender')]:[mon('M4','attacker'),mon('ELF','ally')],traps:[],enchants:[],quests:[]}));
 await apiFixture(page,req=>new URL(req.url).pathname==='/api/auth/me'?{user:{id:'attack-fixture',display:'シーカー',avatar:'SEEKER_HOODED',credits:0,unlocks:[],deckPresets:null}}:{ok:true,keys:[],friends:[],incoming:[],outgoing:[]});
 let socket;await page.routeWebSocket('**/ws/room/**',ws=>{socket=ws;ws.onMessage(raw=>{const msg=JSON.parse(String(raw));if(msg.type==='ready')ws.send(JSON.stringify({type:'init',you:0,state,events:[]}));if(msg.type==='ping')ws.send(JSON.stringify({type:'pong'}));if(msg.type==='action'){actions.push(msg.action);const next=reduce(state,msg.action);state=next.state;ws.send(JSON.stringify({type:'update',state,events:next.events}));}});});
 await page.addInitScript(()=>{localStorage.setItem('lore_lang','ja');localStorage.setItem('lore_game',JSON.stringify({roomId:'attack-target-fixture',you:0,ts:Date.now(),ranked:false}));localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));});
 try{
  await page.goto(origin,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForSelector('[data-scene-ready=true]');await page.waitForSelector('.duel-loader',{state:'detached'});await page.waitForSelector('#meRow [data-uid="attacker"]');await page.waitForTimeout(400);
  const source=page.locator('#meRow [data-uid="attacker"]'),target=page.locator('#oppRow [data-uid="defender"]'),portrait=page.locator('#portraitOpp .pt-ring');
  const center=r=>({x:r.x+r.width/2,y:r.y+r.height/2});const cdp=mobile?await context.newCDPSession(page):null;
  const down=async p=>{if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:1}]});else{await page.mouse.move(p.x,p.y);await page.mouse.down();}};
  const move=async p=>{if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...p,id:1}]});else await page.mouse.move(p.x,p.y,{steps:3});};
  const cancel=async()=>{if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});else{await page.keyboard.press('Escape');await page.mouse.up();}await page.waitForTimeout(240);assert.equal(await page.locator('.attack-aim,.attack-target-outline,.is-atk-target,.is-aiming').count(),0);};
  const before=await source.boundingBox(),targetBefore=await target.boundingBox();await down(center(before));await move(center(targetBefore));await page.waitForSelector('.attack-source-light svg');await page.waitForSelector('.attack-target-light svg');await page.waitForFunction(()=>document.querySelector('.attack-aim')?.dataset.targetLock==='active');await page.waitForTimeout(250);
  assert((await source.boundingBox()).width>before.width*1.025);assert((await target.boundingBox()).width>targetBefore.width*1.04);
  assert.equal(await page.locator('.attack-source-light .attack-target-rim').evaluate(e=>getComputedStyle(e).stroke),'rgb(54, 184, 255)');
  assert.equal(await page.locator('.attack-target-light .attack-target-rim').evaluate(e=>getComputedStyle(e).stroke),'rgb(255, 52, 52)');
  await page.screenshot({path:out+`/production-${mobile?'mobile':'desktop'}-card.png`});await cancel();assert.equal(actions.length,0);
  await down(center(await source.boundingBox()));await move(center(await portrait.boundingBox()));await page.waitForFunction(()=>document.querySelector('.attack-aim')?.dataset.targetLock==='blocked');await cancel();assert.equal(actions.length,0);
  state.players[1].field=[];socket.send(JSON.stringify({type:'update',state,events:[]}));await target.waitFor({state:'detached'});await page.waitForTimeout(300);
  await down(center(await source.boundingBox()));await move(center(await portrait.boundingBox()));await page.waitForFunction(()=>document.querySelector('.attack-aim')?.dataset.targetLock==='active');await page.waitForTimeout(250);
  assert.equal(await portrait.evaluate(e=>getComputedStyle(e).outlineStyle),'none');assert((await portrait.evaluate(e=>getComputedStyle(e).filter)).includes('drop-shadow'));
  await page.screenshot({path:out+`/production-${mobile?'mobile':'desktop'}-player.png`});
  if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up();
  await page.waitForFunction(()=>!document.querySelector('.attack-aim,.attack-target-outline'));await page.waitForTimeout(1000);
  assert(actions.some(a=>a.type==='attack'));assert(state.players[0].field[0].exhausted);assert.deepEqual(errors,[]);
  results.push({mobile,sourceLift:true,targetLift:true,blueSource:true,redTarget:true,monsterLock:true,blockedPlayer:true,playerLock:true,cancelClean:true,attackSubmitted:true,errors});console.log('PASS deployed attack target',mobile?'touch':'mouse');
 }catch(e){await page.screenshot({path:out+`/failure-${mobile}.png`}).catch(()=>{});console.error({errors,actions});throw e;}finally{await context.close();}
}
 await fs.writeFile(out+'/production-browser-report.json',JSON.stringify({origin,passed:true,results,boundary:'Production client, CSS and art; local API/WebSocket fixtures. No real accounts or matches modified.'},null,2));
}finally{await browser.close();await fs.rm(temp,{recursive:true,force:true});}
