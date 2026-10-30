import {build} from 'esbuild';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {apiFixture} from './helpers/api-fixture.mjs';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5298';
const out=process.env.LORE_TEST_OUTPUT||'.cache/hand-condition-contour';
await fs.mkdir(out,{recursive:true});
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'lore-hand-contour-'));
await build({stdin:{contents:"export {createGame} from './client/src/shared/engine';export {DB,STARTERS} from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',outfile:temp+'/fixture.mjs'});
const {createGame,DB,STARTERS}=await import(temp+'/fixture.mjs');
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:out+'/video',size:{width:1280,height:900}}});
const page=await context.newPage();page.setDefaultTimeout(60000);
const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
let socket;
const state=createGame({mode:'online',seed:71,starting:0,p0:{id:'hand-fixture',name:'YOU'},p1:{id:'opp',name:'OPP'}}).state;
state.turn=3;state.phase='main';state.cur=0;state.pending=null;
for(const p of state.players){p.openingDrawReady=false;p.field=[];p.traps=[];p.enchants=[];p.quests=[];p.maxMana=10;p.mana=10;p.hp=32;}
const ids=['TDE1','TDE2','BUYOUT'];
const cards=ids.map(id=>({...DB[id],uid:'contour-'+id}));
const ordinary=Array.from({length:6},(_,i)=>({...STARTERS.STARTER_CHEST,uid:'ordinary-'+i}));
state.players[0].hand=[cards[0],...ordinary.slice(0,3),cards[1],...ordinary.slice(3),cards[2]];
state.players[0].buysTurn={ELF:2};
const fixtureHand=state.players[0].hand;
await apiFixture(page,req=>new URL(req.url).pathname==='/api/auth/me'?{user:{id:'hand-fixture',display:'シーカー',avatar:'SEEKER_BLUE',credits:0,unlocks:[],deckPresets:null}}:{ok:true,keys:[],friends:[],incoming:[],outgoing:[]});
await page.routeWebSocket('**/ws/room/**',ws=>{socket=ws;ws.onMessage(raw=>{const msg=JSON.parse(String(raw));if(msg.type==='ready')ws.send(JSON.stringify({type:'init',you:0,state,events:[]}));if(msg.type==='ping')ws.send(JSON.stringify({type:'pong'}));});});
await page.addInitScript(()=>{localStorage.setItem('lore_lang','ja');localStorage.setItem('lore_game',JSON.stringify({roomId:'hand-contour-fixture',you:0,ts:Date.now(),ranked:false}));localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));});
async function update(){socket.send(JSON.stringify({type:'update',state,events:[]}));await page.waitForTimeout(300);}
async function contours(label){
 await page.waitForFunction(()=>document.querySelectorAll('#hand .hand-condition-effect[data-outline="ready"]').length===3);
 const values=await page.locator('#hand .has-play-condition').evaluateAll(nodes=>nodes.map(card=>{
  const svg=card.querySelector('.hand-condition-effect svg'),b=svg.querySelector('.hcond-core').getBBox(),vb=svg.viewBox.baseVal;
  const frame=card.querySelector('.card-frame'),s=getComputedStyle(frame),c=getComputedStyle(card);
  return{id:card.dataset.cardId,layers:card.querySelector('.hand-condition-effect').dataset.layers,bounds:{x:b.x,y:b.y,right:b.x+b.width,bottom:b.y+b.height},width:vb.width,height:vb.height,frameWidth:parseFloat(s.width),cardWidth:parseFloat(c.width),scale:s.scale,svgWidth:svg.getBoundingClientRect().width,cardScreenWidth:card.getBoundingClientRect().width};
 }));
 await page.screenshot({path:out+'/'+label+'.png'});
 for(const v of values){
  assert(Math.abs(v.frameWidth*.5-v.cardWidth)<.1,'product still uses supersampled frame');
  // Monster stat seals intentionally protrude 4% right and 2% below the card.
  assert(v.bounds.right<=v.width*1.04+1,`${label}: contour extends beyond the actual right edge: ${JSON.stringify(v)}`);
  assert(v.bounds.bottom<=v.height*1.02+1,`${label}: contour extends below the actual bottom edge: ${JSON.stringify(v)}`);
  assert(v.bounds.right>v.width*.9&&v.bounds.bottom>v.height*.9,'contour still encloses the full card');
  assert(Math.abs(v.svgWidth-v.cardScreenWidth)<1,'overlay shares the fan transform');
  assert.equal(v.layers,v.id==='BUYOUT'?'2':'4');
 }
 checks.push({label,values});
}
try{
 await page.goto(origin,{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForSelector('#hand .card');await page.locator('.duel-loader').waitFor({state:'hidden',timeout:120000});
 await page.waitForTimeout(600);
 await contours('desktop-compact');
 await page.locator('#hand .card').last().dispatchEvent('pointerdown',{button:0,pointerId:1,pointerType:'mouse'});
 await page.locator('#hand .card').last().dispatchEvent('pointerup',{button:0,pointerId:1,pointerType:'mouse'});
 await page.waitForTimeout(500);await contours('desktop-open');
 await page.locator('#hand .card').last().hover({force:true});await page.waitForTimeout(250);await contours('desktop-hover');
 const before=await page.locator('.hcond-stream').first().evaluate(e=>getComputedStyle(e).strokeDashoffset);
 await page.waitForTimeout(400);assert.notEqual(await page.locator('.hcond-stream').first().evaluate(e=>getComputedStyle(e).strokeDashoffset),before);
 // Every highlighted family takes the exposed rightmost position in turn.
 for(const card of cards){state.players[0].hand=[...fixtureHand.filter(c=>c.uid!==card.uid),card];await update();await contours('rightmost-'+card.id);}
 for(const [width,height] of [[390,844],[844,390]]){await page.setViewportSize({width,height});await page.mouse.move(0,0);await page.waitForTimeout(600);await contours('viewport-'+width);}
 state.players[0].mana=0;await update();assert.equal(await page.locator('#hand .is-playable').count(),0);await contours('mana-empty');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>getComputedStyle(document.querySelector('.hcond-stream')).visibility==='hidden');
 state.players[0].maxMana=4;state.players[0].buysTurn={};await update();assert.equal(await page.locator('#hand .hand-condition-effect').count(),0);
 state.players[0].maxMana=10;state.players[0].buysTurn={ELF:2};await update();await contours('restored');
 state.players[0].hand=ordinary;await update();assert.equal(await page.locator('.hand-condition-effect').count(),0);
 assert.equal(await page.locator('#oppHand .hand-condition-effect').count(),0);assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/report.json',JSON.stringify({origin,checks,errors,boundary:'Product router, controller, CSS and artwork; fixture authentication and WebSocket state. No authenticated PvP or physical device test.'},null,2));
 console.log('PASS hand condition contours',checks.length,'states: monster/spell, all fan positions, resize, hover, mana, reduced motion, cleanup');
}finally{await context.close();await browser.close();await fs.rm(temp,{recursive:true,force:true});}
