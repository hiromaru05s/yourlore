import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-full-audit/browser';await fs.mkdir(out,{recursive:true});
const server=await createServer({root:'client',configFile:'client/vite.config.ts',server:{host:'127.0.0.1',port:5329,strictPort:true},plugins:[{name:'cross-fixture',configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url==='/audit'){res.setHeader('content-type','text/html');res.end('<html><body><div id="app"></div></body></html>')}else next()})}}]});await server.listen();
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5329/audit');
 const result=await page.evaluate(async()=>{
  const {waitAssets,revealCards}=await import('/src/ui/assetReadiness.ts');const {mountFriends}=await import('/src/screens/friends.ts');const {api}=await import('/src/net/api.ts');
  const tick=()=>new Promise(r=>setTimeout(r,60));const native=HTMLImageElement.prototype.decode;HTMLImageElement.prototype.decode=function(){return this.src.includes('bad')?Promise.reject(Error('fixture')):Promise.resolve()};
  const host=document.createElement('div');document.body.append(host);const abort=new AbortController();let settled=false;const waiting=waitAssets(['/bad.png'],host,undefined,abort.signal).then(()=>settled=true);await tick();abort.abort();await tick();const abortRetry={settled,retries:host.querySelectorAll('.asset-retry').length};host.remove();await waiting;
  const grid=document.createElement('div');document.body.append(grid);const bad=new Image();bad.src='/bad2.png';let version=1,oldDone=false;
  const old=revealCards(grid,[bad],()=>version===1).then(()=>oldDone=true);await tick();version=2;const good=document.createElement('span');good.textContent='new page';await revealCards(grid,[good],()=>version===2);await tick();const superseded={oldDone,retries:grid.querySelectorAll('.asset-retry').length,content:grid.textContent};grid.remove();await old;HTMLImageElement.prototype.decode=native;
  let accept,joined=0;api.friends=async()=>({friends:[],incoming:[],outgoing:[],challenges:[{id:'challenge',from:'A',fromId:'a',at:Date.now()}]});api.challengeRespond=()=>new Promise(r=>accept=r);
  const root=document.querySelector('#app');const screen=mountFriends({root,home(){},onlineGame(){joined++}});await tick();document.querySelector('#chYes').click();screen.destroy();root.replaceChildren();accept({roomId:'late-room',you:1,oppName:'A'});await tick();const staleChallenge={joined,overlays:document.querySelectorAll('.overlay').length};document.querySelectorAll('.overlay').forEach(n=>n.remove());
  const {showInviteModal}=await import('/src/screens/home.ts');let inviteReady;api.inviteMe=()=>new Promise(r=>inviteReady=r);const inviteAbort=new AbortController();const invitation=showInviteModal(inviteAbort.signal);inviteAbort.abort();inviteReady({code:'fixture',limit:3,invites:[]});await invitation;const staleInvite={overlays:document.querySelectorAll('.overlay').length};
  api.friends=async()=>({friends:[],incoming:[{id:'cap',display:'At capacity',online:false}],outgoing:[],challenges:[]});api.friendRespond=async()=>{throw Error('Friend limit')};
  const failedScreen=mountFriends({root,home(){}});await tick();root.querySelector('[data-acc]').click();await tick();const friendFailure=root.querySelector('#frMsg').textContent;failedScreen.destroy();root.replaceChildren();
  return{abortRetry,superseded,staleChallenge,staleInvite,friendFailure};
 });
 for(const [name,actual,expected]of [['abort releases retry without removing host',result.abortRetry,{settled:true,retries:0}],['new card filter cancels superseded page',result.superseded,{oldDone:true,retries:0,content:'new page'}],['late challenge acceptance cannot navigate away from new screen',result.staleChallenge,{joined:0,overlays:0}],['late invitation cannot cover the next screen',result.staleInvite,{overlays:0}],['friend action errors are shown without an unhandled rejection',result.friendFailure,'Friend limit']]){try{assert.deepEqual(actual,expected);checks.push({name,passed:true})}catch(e){checks.push({name,passed:false,actual,expected})}}
 await fs.writeFile(out+'/report.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));assert(checks.every(c=>c.passed));assert.deepEqual(errors,[]);
}finally{await browser.close();await server.close()}
