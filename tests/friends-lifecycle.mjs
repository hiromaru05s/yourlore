import assert from 'node:assert/strict';import {build} from 'esbuild';import {mkdtemp,rm} from 'node:fs/promises';import {JSDOM} from 'jsdom';
const dir=await mkdtemp('/tmp/lore-friends-lifecycle-'),dom=new JSDOM('<body><main></main></body>');
for(const key of ['window','document'])globalThis[key]=dom.window[key];
window.setTimeout=()=>0;let requests=0,finish,cancellations=0;const errors=[];const capture=e=>errors.push(e);process.on('unhandledRejection',capture);
globalThis.__friendApi={friends:async()=>({incoming:[],outgoing:[],challenges:[],friends:[{id:'b',display:'Friend',online:true}]}),challenge:()=>{requests++;return new Promise(r=>finish=r);},challengeCancel:async()=>{cancellations++;throw Error('offline');}};
const stubs={
 '../net/api':'export const api=globalThis.__friendApi;',
 '../ui/friendBadge':'export const publishFriendNotifications=()=>{};',
 '../ui/homeIcons':"export const homeIcon=()=>'';",
 '../i18n':'export const t=x=>x;export const onLangChange=()=>()=>{};',
 '../ui/langSelect':"export const langSelectEl=()=>document.createElement('select');",
 '../ui/social':"export const avatarHtml=()=>'';",
 './profile':'export const showProfileModal=()=>{};',
 '../ui/modal':'export const confirmDialog=async()=>true;',
 '../ui/sound':'export const sfx=()=>{};',
};
try{
 await build({entryPoints:['client/src/screens/friends.ts'],bundle:true,platform:'node',format:'esm',outfile:dir+'/friends.mjs',plugins:[{name:'boundaries',setup(b){b.onResolve({filter:/.*/},a=>a.path in stubs?{path:a.path,namespace:'stub'}:undefined);b.onLoad({filter:/.*/,namespace:'stub'},a=>({contents:stubs[a.path]}));}}]});
 const {mountFriends}=await import(dir+'/friends.mjs'),tick=()=>new Promise(r=>setTimeout(r,0));
 const app={root:document.querySelector('main'),user:{id:'a'}};const screen=mountFriends(app);await tick();
 const button=document.querySelector('[data-ch]');button.click();button.click();assert.equal(requests,1,'double tap must send only one challenge');
 finish({id:'challenge-one'});await tick();assert.equal(document.querySelectorAll('#chCancel').length,1);
 document.querySelector('#chCancel').click();await tick();assert.equal(cancellations,1);assert.deepEqual(errors,[],'offline cancellation must be handled');assert.match(document.querySelector('#frMsg').textContent,/offline/);
 button.click();finish({id:'challenge-two'});await tick();screen.destroy();await tick();assert.deepEqual(errors,[],'screen cleanup must handle offline cancellation');assert.equal(document.querySelectorAll('#chCancel').length,0);
 console.log('PASS challenge double submit, offline cancel and detached cleanup');
}finally{process.off('unhandledRejection',capture);delete globalThis.__friendApi;dom.window.close();await rm(dir,{recursive:true,force:true});}
