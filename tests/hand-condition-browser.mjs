import {build} from 'esbuild';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import {chromium} from '/tmp/lore-opening-tools/node_modules/playwright/index.mjs';
import {apiFixture} from './helpers/api-fixture.mjs';
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5294',out=process.env.LORE_TEST_OUTPUT||'docs/ui-rework/2026-09-29-hand-condition-golden/local';await fs.mkdir(out,{recursive:true});
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'lore-hand-browser-'));
await build({stdin:{contents:"export {createGame} from './client/src/shared/engine';export {DB,STARTERS} from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',outfile:temp+'/fixture.mjs'});
const {createGame,DB,STARTERS}=await import(temp+'/fixture.mjs');
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1280,height:900},recordVideo:{dir:out+'/video',size:{width:1280,height:900}}});page.setDefaultTimeout(60000);
const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));let socket,state;
const card=(id)=>({...DB[id],uid:'test-'+id});
await apiFixture(page,req=>new URL(req.url).pathname==='/api/auth/me'?{user:{id:'hand-fixture',display:'シーカー',avatar:'SEEKER_BLUE',credits:0,unlocks:[],deckPresets:null}}:{ok:true,keys:[],friends:[],incoming:[],outgoing:[]});
await page.routeWebSocket('**/ws/room/**',ws=>{socket=ws;ws.onMessage(raw=>{const msg=JSON.parse(String(raw));if(msg.type==='ready')ws.send(JSON.stringify({type:'init',you:0,state,events:[]}));if(msg.type==='ping')ws.send(JSON.stringify({type:'pong'}));});});
const count=()=>page.locator('#hand .hand-condition-effect').count();
async function update(fn){fn(state);socket.send(JSON.stringify({type:'update',state,events:[]}));await page.waitForTimeout(250);}
async function expectCount(n){await page.waitForFunction(n=>document.querySelectorAll('#hand .hand-condition-effect').length===n,n);}
try{
 state=createGame({mode:'online',seed:71,starting:0,p0:{id:'hand-fixture',name:'YOU'},p1:{id:'opp',name:'OPP'}}).state;state.turn=3;state.phase='main';state.cur=0;state.pending=null;
 for(const p of state.players){p.openingDrawReady=false;p.field=[];p.traps=[];p.enchants=[];p.quests=[];p.maxMana=4;p.mana=4;p.hp=32;}
 state.players[0].hand=[{...STARTERS.STARTER_CHEST,uid:'chest'},card('TDE1'),card('TDE2'),card('BUYOUT')];
 await page.addInitScript(()=>{localStorage.setItem('lore_game',JSON.stringify({roomId:'hand-condition-fixture',you:0,ts:Date.now(),ranked:false}));localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));});
 await page.goto(origin,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForSelector('#hand .card');await page.locator('.duel-loader').waitFor({state:'hidden',timeout:120000});
 assert.equal(await count(),0);checks.push('unmet requirements and ordinary starter have no cue');
 await update(g=>g.players[0].maxMana=5);await expectCount(2);await page.waitForFunction(()=>[...document.querySelectorAll('#hand .hand-condition-effect')].every(e=>e.dataset.outline==='ready'));
 assert.deepEqual(await page.locator('#hand .hand-condition-effect').evaluateAll(es=>es.map(e=>e.dataset.layers)),['4','4']);
 assert.equal(await page.locator('#oppHand .hand-condition-effect').count(),0);
 await page.locator('#hand').hover();await page.waitForTimeout(500);await page.screenshot({path:out+'/ready-desktop.png'});checks.push('authoritative update enables golden twin on two monsters, all four contour layers, own hand only');
 const a=await page.locator('.hcond-stream').first().evaluate(e=>getComputedStyle(e).strokeDashoffset);await page.waitForTimeout(350);const b=await page.locator('.hcond-stream').first().evaluate(e=>getComputedStyle(e).strokeDashoffset);assert.notEqual(a,b);checks.push('approved 2300 ms twin orbit moves continuously');
 await update(g=>g.players[0].mana=0);await expectCount(2);assert.equal(await page.locator('#hand .card.is-playable').count(),0);assert.equal(await page.locator('#hand .has-play-condition').first().evaluate(e=>getComputedStyle(e).filter),'none');checks.push('mana shortage blocks play while condition cue remains colored');
 await update(g=>g.players[0].buysTurn={ELF:2});await expectCount(3);await page.waitForFunction(()=>document.querySelector('#hand [data-uid="test-BUYOUT"] .hand-condition-effect')?.dataset.outline==='ready');await page.screenshot({path:out+'/spell-and-mana.png'});checks.push('spell-specific activation condition also highlights frame and cost');
 await update(g=>g.players[0].maxMana=4);await expectCount(1);checks.push('falling below summon threshold removes monster cue');
 await update(g=>{g.players[0].hand=g.players[0].hand.filter(c=>c.id!=='BUYOUT');});await expectCount(0);checks.push('removed hand card releases effect');
 await update(g=>{g.players[0].maxMana=5;g.players[0].mana=4;});await expectCount(2);
 for(let n=0;n<8;n++)await update(g=>g.players[0].hp++);await expectCount(2);checks.push('repeated state updates do not duplicate overlays');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);await page.screenshot({path:out+'/ready-mobile.png'});assert.equal(await count(),2);checks.push('390 px viewport retains both indicators');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>getComputedStyle(document.querySelector('.hcond-stream')).visibility==='hidden');assert.equal(await page.locator('.hcond-stream').first().evaluate(e=>getComputedStyle(e).visibility),'hidden');assert.equal(await page.locator('.hcond-base').first().evaluate(e=>getComputedStyle(e).stroke),'rgb(255, 189, 32)');checks.push('reduced motion retains golden rim without orbit');
 await update(g=>{g.over=true;g.phase='over';g.winner=0;});await expectCount(0);checks.push('game over for side zero clears hand cues');
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/browser-report.json',JSON.stringify({origin,status:'passed',checks,errors,boundary:'Built application, production router/OnlineController/GameView; authentication and WebSocket state are fixtures, not a real authenticated online match.'},null,2));console.log('PASS',checks.length,'production browser checks');
}finally{await browser.close();await fs.rm(temp,{recursive:true,force:true});}
