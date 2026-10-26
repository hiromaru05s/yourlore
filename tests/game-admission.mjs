import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dom=new JSDOM('<body><div id="app"></div></body>',{url:'https://lore.test',pretendToBeVisual:true});
for(const k of ['window','document','HTMLElement','Event'])globalThis[k]=dom.window[k];
globalThis.matchMedia=()=>({matches:false});
const dir=await mkdtemp(path.join(tmpdir(),'lore-admission-'));
let resolveCache,rejectCache,cacheCalls=0,modelCalls=0,starts=0,images=0;
const cache=()=>{cacheCalls++;return new Promise((resolve,reject)=>{resolveCache=resolve;rejectCache=reject;});};
globalThis.__admission={cache,warm:async()=>{modelCalls++;},images:async()=>{images++;},modules:()=>{throw Error('Optional VFX archive must not gate admission');}};
const stubs={
 '../ui/menuCache':`export const prepareMenuCache=(progress,signal,scope)=>{if(scope!=='duel')throw Error('wrong scope');progress(0,10);return globalThis.__admission.cache();};`,
 '../ui/duelModulePreload':'export const prepareDuelModules=()=>globalThis.__admission.modules();',
 '../ui/duelFonts':'export const prepareDuelFonts=async()=>{};',
 '../ui/duelReadiness':'export const warmDuel=()=>globalThis.__admission.warm();',
 '../ui/imageAssets':'export const warmImages=()=>globalThis.__admission.images();',
 '../ui/cardArt':`export const artUrl={sm:id=>id,xs:id=>id,full:id=>id};`,
 '../ui/loungeText':'export const loungeText=x=>x;',
 '../ui/loadingScreen':`export function loadingScreen(){const element=document.createElement('div');element.className='duel-loader';return {element,update(){}};}`,
 './game':'export const mountGame=()=>({destroy(){}});',
};
const tick=()=>new Promise(r=>setTimeout(r,0));
try{
 await build({entryPoints:['client/src/screens/lazyGame.ts'],bundle:true,platform:'node',format:'esm',outfile:dir+'/module.mjs',plugins:[{name:'admission-fixtures',setup(b){b.onResolve({filter:/.*/},args=>args.path in stubs?{path:args.path,namespace:'fixture'}:undefined);b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:stubs[args.path]}));}}]});
 const m=await import(dir+'/module.mjs'),app={root:document.querySelector('#app'),user:{deck:[]},home(){}};
 const home=m.scheduleGameWarmup(app.root,[]);await new Promise(r=>setTimeout(r,1050));assert.equal(cacheCalls,0,'HOME must not start the full archive');assert.equal(modelCalls,0,'HOME must not prepare duel models');assert(images>0);home();
 const speculative=m.warmGame();const gate=m.mountGamePreparation(app,async()=>{starts++;});await tick();assert.equal(cacheCalls,1,'Immediate Start joins pending speculative preparation');assert.equal(starts,0);assert.equal(modelCalls,0,'Decoders must not race cache pack transfers');resolveCache();await speculative;await tick();assert.equal(modelCalls,0,'Optional model archive must not gate admission');assert.equal(starts,1);gate.destroy();
 // New viewport requires its model variant; cancelled preparation must never create a room.
 globalThis.matchMedia=()=>({matches:true});const cancel=m.mountGamePreparation(app,async()=>{starts++;});await tick();assert.equal(cacheCalls,2);cancel.destroy();resolveCache();await tick();await tick();assert.equal(starts,1);assert.equal(app.root.querySelector('.duel-loader'),null);
 // Failed cold preparation stays on cover and can retry without stale success.
 const fresh=await import(dir+'/module.mjs?retry');const failed=fresh.mountGamePreparation(app,async()=>{starts++;});await tick();rejectCache(Error('offline'));await tick();await tick();assert.equal(starts,1);const retry=[...app.root.querySelectorAll('button')].find(b=>b.textContent==='準備を再試行');assert(retry);retry.click();await tick();resolveCache();await tick();await tick();assert.equal(starts,2);failed.destroy();
 // Real lobby route: matchmaking sockets must not exist until admission succeeds.
 const lobbyStubs={
  '../ui/homeIcons':'export const homeIcon=()=>"";',
  '../ui/loungeText':'export const loungeText=x=>x;',
  '../net/socket':'export class Sock {constructor(){globalThis.__admission.sockets++;}send(){}close(){}}',
  '../i18n':'export const t=x=>x;export const onLangChange=()=>()=>{};',
  '../ui/sound':'export const sfx=()=>{};',
  './lazyGame':'export const warmGame=()=>globalThis.__admission.cache();',
 };
 await build({entryPoints:['client/src/screens/lobby.ts'],bundle:true,platform:'node',format:'esm',outfile:dir+'/lobby.mjs',plugins:[{name:'lobby-fixtures',setup(b){b.onResolve({filter:/.*/},args=>args.path in lobbyStubs?{path:args.path,namespace:'fixture'}:undefined);b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:lobbyStubs[args.path]}));}}]});
 globalThis.__admission.sockets=0;const {mountLobby}=await import(dir+'/lobby.mjs');
 const lobby=mountLobby(app);assert.equal(globalThis.__admission.sockets,0);resolveCache();await tick();assert.equal(globalThis.__admission.sockets,1);lobby.destroy();app.root.replaceChildren();
 const cancelledLobby=mountLobby(app);cancelledLobby.destroy();resolveCache();await tick();assert.equal(globalThis.__admission.sockets,1,'Cancelling preparation must not enqueue a player');app.root.replaceChildren();
 console.log('PASS HOME bounded speculation, shared admission, deferred decoding/room creation, responsive assets, matchmaking gate, cancellation and retry');
}finally{delete globalThis.__admission;dom.window.close();await rm(dir,{recursive:true,force:true});}
