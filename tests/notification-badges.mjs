import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import fs from 'node:fs/promises';
const dir=await fs.mkdtemp('/tmp/lore-badges-');
const dom=new JSDOM('<body></body>',{pretendToBeVisual:true});
for(const key of ['window','document','CustomEvent'])globalThis[key]=dom.window[key];
const requests=[];globalThis.__friends=signal=>new Promise((resolve,reject)=>requests.push({signal,resolve,reject}));
const data=(incoming,challenges=0)=>({incoming:Array.from({length:incoming},()=>({})),challenges:Array.from({length:challenges},()=>({})),friends:[],outgoing:[]});
const flush=()=>new Promise(resolve=>setImmediate(resolve));
try{
 await build({entryPoints:['client/src/ui/friendBadge.ts'],bundle:true,platform:'node',format:'esm',outfile:dir+'/module.mjs',loader:{'.css':'empty'},plugins:[{name:'fixtures',setup(b){
  b.onResolve({filter:/\/net\/api$/},()=>({path:'api',namespace:'fixture'}));
  b.onResolve({filter:/\/i18n$/},()=>({path:'i18n',namespace:'fixture'}));
  b.onResolve({filter:/loungeText$/},()=>({path:'text',namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='api'?'export const api={friends:signal=>globalThis.__friends(signal)}':a.path==='i18n'?"export const t=()=> 'フレンド'":"export const loungeText=(ja)=>ja"}));
 }}]});
 const {mountFriendBadge,publishFriendNotifications}=await import(dir+'/module.mjs');
 const shell=document.createElement('div');const nav=()=>{shell.innerHTML='<button data-nav="friends"><span class="horizon-glyph"></span><span>フレンド</span></button>'};nav();document.body.append(shell);
 const app={user:{id:'alice'}},badge=()=>shell.querySelector('.friend-new-count');
 const watcher=mountFriendBadge(app,shell);assert.equal(requests.length,1);requests[0].resolve(data(2,1));await flush();assert.equal(badge().textContent,'3');
 nav();watcher.paint();assert.equal(badge().textContent,'3','retained after header repaint');
 window.dispatchEvent(new window.Event('focus'));const stale=requests.at(-1);window.dispatchEvent(new window.Event('focus'));const fresh=requests.at(-1);assert(stale.signal.aborted);fresh.resolve(data(100,23));await flush();stale.resolve(data(1));await flush();assert.equal(badge().textContent,'99+');assert(shell.querySelector('button').getAttribute('aria-label').includes('123'));
 window.dispatchEvent(new window.Event('focus'));requests.at(-1).reject(Error('offline'));await flush();assert.equal(badge().textContent,'99+','failure preserves last count');
 app.user={id:'bob'};watcher.paint();assert.equal(badge(),null,'account switch hides old count');const before=requests.length;window.dispatchEvent(new window.Event('focus'));assert.equal(requests.length,before);watcher.destroy();
 app.user={id:'alice'};const screen=mountFriendBadge(app,shell,false);assert.equal(requests.length,before,'friends screen reuses its own polling');publishFriendNotifications('bob',data(8));assert.equal(badge(),null);publishFriendNotifications('alice',data(1,1));assert.equal(badge().textContent,'2');publishFriendNotifications('alice',data(0));assert.equal(badge(),null);screen.destroy();
 const guest=mountFriendBadge({user:{id:'local-guest-user'}},shell);assert.equal(requests.length,before);guest.destroy();
 const pending=mountFriendBadge(app,shell);const last=requests.at(-1);pending.destroy();assert(last.signal.aborted);last.resolve(data(9));await flush();assert.equal(badge(),null);const stopped=requests.length;window.dispatchEvent(new window.Event('focus'));assert.equal(requests.length,stopped);
 console.log('PASS notification badges: requests + invites, 0/99+, repaint, offline, stale response, account scope, guest, disposal, shared friends polling');
}finally{dom.window.close();delete globalThis.__friends;await fs.rm(dir,{recursive:true,force:true});}
