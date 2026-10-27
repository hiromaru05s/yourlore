import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {mkdtemp,rm} from 'node:fs/promises';
const temp=await mkdtemp('/tmp/lore-username-ui-');
const dom=new JSDOM('<body><main id="app"></main></body>',{url:'https://yourlore.xyz/'});
for(const k of ['window','document','location','localStorage','Event'])globalThis[k]=dom.window[k];
let calls=0,resolveSave,rejectSave,tutorialCalls=0,active=null,offered=true,homeMounts=0,graphics=0;
const covers=[];const tick=()=>new Promise(r=>setTimeout(r,0));
const api={updateMe:()=>{calls++;return new Promise((resolve,reject)=>{resolveSave=resolve;rejectSave=reject;});},tutorialStatus:async()=>{tutorialCalls++;return {offered};},logout:async()=>({ok:true})};
globalThis.__names={api,active:()=>active,home:()=>homeMounts++,graphics:()=>graphics++,cover:()=>{let resolve;const promise=new Promise(r=>resolve=r);const cover={cancel:()=>resolve(false),ready:()=>promise,finish:()=>resolve(true)};covers.push(cover);return cover;}};
const stubs={
 './screens/tutorialSurface':'export const mountTutorialHomePart=()=>({});export const mountTutorialDeckPart=()=>({});export const mountTutorialCardsPart=()=>({});',
 './i18n':'export const getLang=()=>"ja";',
 '../i18n':'export const getLang=()=>"ja";export const onLangChange=()=>()=>{};',
 './ui/homeSpirit':'export const releaseHomeSpirit=()=>{};',
 './ui/assetReadiness':'export const coverScreen=globalThis.__names.cover;export const isMenuReady=()=>true;export const imageUrls=()=>[];export const hasUnloadedAssets=()=>false;',
 './ui/graphicsNotice':'export const showGraphicsNotice=()=>{globalThis.__names.graphics();return()=>{};};',
 './ui/lounge':'export const mountLounge=()=>()=>{};',
 './ui/homeMusic':'export const startHomeMusic=()=>()=>{};',
 './net/api':'export const api=globalThis.__names.api;',
 '../net/api':'export const api=globalThis.__names.api;',
 './net/analytics':'export const aIdentify=()=>{};export const aCapture=()=>{};export const aReset=()=>{};',
 './net/presence':'export const setPresence=()=>{};export const stopPresence=()=>{};',
 './net/resume':'export const saveActiveGame=()=>{};export const loadActiveGame=()=>globalThis.__names.active();export const clearActiveGame=()=>{};',
 './dev/localAccount':'export const LOCAL_GUEST_KEY="guest";export const canUseLocalGuest=()=>false;export const loadLocalDevDecks=()=>({});export const loadLocalGuestProfile=()=>({});',
 './screens/lazyGame':'export const mountGame=app=>{app.root.textContent="Game";return {};};export const mountGamePreparation=()=>({});',
};
for(const k of ['./ui/loungeText','../ui/loungeText','./loungeText'])stubs[k]='export const loungeText=x=>x;';
for(const name of ['Login','Home','Lobby','Tutorial','Cards','Leaderboard','Admin','Profile','Friends','Shop','Deck','TutorialWelcome'])stubs['./screens/'+name[0].toLowerCase()+name.slice(1)]=`export const mount${name}=app=>{app.root.textContent='${name}';return {};};`;
stubs['./screens/home']='export const mountHome=app=>{globalThis.__names.home();app.root.textContent="Home";return {};};';
try {
 await build({entryPoints:['client/src/router.ts'],bundle:true,platform:'node',format:'esm',outfile:temp+'/router.mjs',plugins:[{name:'boundaries',setup(b){b.onResolve({filter:/.*/},a=>a.path in stubs?{path:a.path,namespace:'stub'}:undefined);b.onLoad({filter:/.*/,namespace:'stub'},a=>({contents:stubs[a.path]}));}}]});
 const {App}=await import(temp+'/router.mjs');const app=new App(document.querySelector('#app'));
 app.user={id:'qa',display:'Private Real Name',email:'real.person@example.invalid',needsUsername:true};
 active={roomId:'old',you:0};app.afterLogin();
 assert.equal(app.root.textContent,'Home');assert.equal(homeMounts,1);
 assert(!document.querySelector('.username-form'),'dialog waits for completed HOME entrance');
 app.profile();assert.equal(app.root.textContent,'Home');assert.equal(homeMounts,1);
 assert.equal(graphics,0);assert.equal(tutorialCalls,0);
 covers.at(-1).finish();await tick();
 assert.equal(app.root.textContent,'Home');assert(document.querySelector('.overlay > .modal.username-dialog'));
 assert.equal(app.root.inert,true,'HOME cannot be operated behind mandatory setup');
 assert(document.querySelector('.username-form'));assert(!app.root.textContent.includes('Private Real Name'));assert(!app.root.textContent.includes('real.person'));assert.equal(tutorialCalls,0);
 app.profile();assert(document.querySelector('.username-form'),'navigation cannot skip naming');
 const input=document.querySelector('input'),form=document.querySelector('form'),button=form.querySelector('button');assert.equal(input.value,'');assert(button.disabled);assert.equal(input.autocomplete,'off');
 const enter=value=>{input.value=value;input.dispatchEvent(new Event('input'));};const submit=()=>form.dispatchEvent(new Event('submit',{cancelable:true}));
 enter('person@example.invalid');assert(button.disabled);enter('MoonSeeker');assert(!button.disabled);submit();submit();assert.equal(calls,1);assert(button.disabled);assert(input.disabled);
 rejectSave(Error('offline'));await tick();assert.equal(app.user.needsUsername,true);assert.equal(form.querySelector('[role=alert]').textContent,'offline');assert(!button.disabled);assert.equal(input.value,'MoonSeeker');
 submit();resolveSave({ok:true,display:'MoonSeeker',needsUsername:false});await tick();assert.equal(app.user.display,'MoonSeeker');assert.equal(app.user.needsUsername,false);assert.equal(app.root.textContent,'Game','resume only after name saved');assert(!document.querySelector('.username-setup'));assert.equal(app.root.inert,false);
 active=null;app.afterLogin();await tick();assert.equal(app.root.textContent,'Home');assert.equal(tutorialCalls,1);
 await app.logout();
 app.user={id:'pending',needsUsername:true};app.afterLogin();
 assert(document.querySelector('.username-setup'),'returning HOME does not replay entrance');
 const mountsBeforeSave=homeMounts;
 const savedInput=document.querySelector('input');savedInput.value='HomeSeeker';savedInput.dispatchEvent(new Event('input'));document.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true}));
 resolveSave({ok:true,display:'HomeSeeker',needsUsername:false});await tick();
 assert.equal(homeMounts,mountsBeforeSave,'saving keeps the same HOME');assert.equal(app.root.textContent,'Home');assert(!document.querySelector('.username-setup'));
 await app.logout();app.user={id:'pending-again',needsUsername:true};app.afterLogin();const currentForm=document.querySelector('form'),currentInput=currentForm.querySelector('input');currentInput.value='AnotherName';currentInput.dispatchEvent(new Event('input'));currentForm.dispatchEvent(new Event('submit',{cancelable:true}));
 await app.logout();resolveSave({ok:true,display:'AnotherName',needsUsername:false});await tick();assert.equal(app.user,null);assert.equal(app.root.textContent,'Login','late save must not resurrect a signed-out account');
 const fresh=new App(app.root);fresh.user={id:'first-time',needsUsername:true};offered=false;fresh.afterLogin();
 const pendingEntrance=covers.at(-1);assert(!document.querySelector('.username-setup'));
 await fresh.logout();pendingEntrance.finish();await tick();assert(!document.querySelector('.username-setup'),'cancelled entrance never opens stale dialog');
 const first=new App(app.root);first.user={id:'new',needsUsername:true};first.afterLogin();covers.at(-1).finish();await tick();
 const firstInput=document.querySelector('input');firstInput.value='FirstSeeker';firstInput.dispatchEvent(new Event('input'));document.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true}));
 resolveSave({ok:true,display:'FirstSeeker',needsUsername:false});await tick();assert.equal(first.root.textContent,'TutorialWelcome');assert(!document.querySelector('.username-setup'));
 console.log('PASS HOME entrance before modal, inert background, deferred tutorial/reconnect, no HOME remount, navigation gate, blank private input, save retry, duplicate prevention and logout races');
}finally {dom.window.close();delete globalThis.__names;await rm(temp,{recursive:true,force:true});}
