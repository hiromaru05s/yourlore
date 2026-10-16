import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5637';
const out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-bot-opening-browser';
await fs.mkdir(out,{recursive:true});
const dir=await fs.mkdtemp('/tmp/lore-bot-opening-core-');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-quic']});
const checks=[];
try{
 await build({stdin:{contents:"export {createGame} from './client/src/shared/engine'; export {BOT_NPCS} from './client/src/shared/botNpcs'; export {DUEL_OPENING_MS} from './client/src/shared/opening';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',outfile:dir+'/core.mjs'});
 const {createGame,BOT_NPCS,DUEL_OPENING_MS}=await import(dir+'/core.mjs');
 for(const npc of BOT_NPCS){
  const page=await browser.newPage({viewport:npc.difficulty==='hell'?{width:390,height:844}:{width:1280,height:720}}),errors=[];
  page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));
  const state=createGame({mode:'online',seed:71,starting:0,p0:{id:'opening-qa',name:'QA'},p1:{id:'bot',name:npc.name.ja,isBot:true,deck:npc.decks[0].cards}}).state;
  state.botDifficulty=npc.difficulty;state.turnTotalMs=90000;state.turnLeftMs=90000;
  await apiFixture(page,r=>{
   const p=new URL(r.url).pathname;
   if(p==='/api/auth/me')return {user:{id:'opening-qa',display:'QA',avatar:'SEEKER_BLUE',credits:0}};
   if(p==='/api/geo')return {country:'JP'};
   if(p==='/api/social/friends')return {friends:[],incoming:[],outgoing:[],challenges:[]};
   return {ok:true};
  });
  await page.addInitScript(({state,duration})=>{
   localStorage.setItem('lore_lang','ja');
   localStorage.setItem('lore_game',JSON.stringify({roomId:'opening-qa',you:0,ts:Date.now(),userId:'opening-qa'}));
   const NativeWebSocket=window.WebSocket;
   window.WebSocket=class {
    static OPEN=1;readyState=1;
    constructor(url){if(!url.includes('/ws/room/'))return new NativeWebSocket(url);setTimeout(()=>this.onopen?.(),0);}
    send(raw){const msg=JSON.parse(raw);if(msg.type==='ready'||msg.type==='openingReady'){
     const now=Date.now(),startsAt=msg.type==='openingReady'?now+350:null;
     this.onmessage?.({data:JSON.stringify({type:'init',state:{...state,opening:{startsAt,playableAt:startsAt===null?null:startsAt+duration,serverNow:now}},events:[]})});
    }}
    close(){this.readyState=3;}
   };
   window.openingNpcs=[];
   const draw=CanvasRenderingContext2D.prototype.drawImage;
   CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
    if(this.canvas.closest('.duel-opening')&&image instanceof HTMLImageElement&&image.src.includes('/art/npcs/'))window.openingNpcs.push(image.src);
    return draw.call(this,image,...args);
   };
   const raf=window.requestAnimationFrame;
   window.requestAnimationFrame=cb=>raf(time=>{cb(time);const host=document.querySelector('.duel-opening');const ms=Number(host?.dataset.openingMs);if(!window.openingFrame&&ms>=600&&ms<1300&&window.openingNpcs.length)window.openingFrame=host.querySelector('canvas').toDataURL('image/png');});
  },{state,duration:DUEL_OPENING_MS});
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.openingFrame);
  await fs.writeFile(`${out}/opening-${npc.id}.png`,Buffer.from((await page.evaluate(()=>window.openingFrame)).split(',')[1],'base64'));
  const sources=await page.evaluate(()=>[...new Set(window.openingNpcs)]);
  assert.deepEqual(sources.map(s=>new URL(s).pathname),[npc.portrait]);
  await page.waitForFunction(()=>!document.querySelector('.duel-opening')&&!document.querySelector('.game')?.inert);
  assert.equal(await page.locator('#portraitOpp .pt-name').textContent(),npc.name.ja);
  assert((await page.locator('#portraitOpp .avatar img').getAttribute('src')).endsWith('/'+npc.id+'.webp'));
  assert.deepEqual(errors,[]);
  checks.push({difficulty:npc.difficulty,npc:npc.id,opening:sources,board:true,unlocked:true,errors});
  console.log('PASS',npc.difficulty,npc.id);await page.close();
 }
 await fs.writeFile(out+'/report.json',JSON.stringify({origin,boundary:'Real app startup/resume, OnlineController and opening renderer; account/API/WebSocket responses are fixtures, not authenticated live gameplay.',checks},null,2));
}finally{await browser.close();await fs.rm(dir,{recursive:true,force:true});}
