import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const temp=await mkdtemp(tmpdir()+'/lore-logout-');
const dom=new JSDOM('<body><div id="app"></div></body>',{url:'https://test.yourlore.xyz/'});
for(const key of ['window','document','location','localStorage'])globalThis[key]=dom.window[key];
let requests=0,resolveLogout,rejectLogout,reset=0,cleared=0,stopped=0;
let prepared=0,savedRooms=0;
globalThis.__saveRoom=()=>savedRooms++;
globalThis.__prepare=()=>{prepared++;return {};};
globalThis.__logout={api:{logout:()=>{requests++;return new Promise((resolve,reject)=>{resolveLogout=resolve;rejectLogout=reject;});}},reset:()=>reset++,clear:()=>cleared++,stop:()=>stopped++};
const stubs={
 './screens/tutorialSurface':'export const mountTutorialHomePart=()=>({});export const mountTutorialDeckPart=()=>({});export const mountTutorialCardsPart=()=>({});',
 './i18n':'export const getLang=()=>"ja";',
 './ui/loungeText':'export const loungeText=x=>x;',
 './ui/assetReadiness':'export const coverScreen=()=>({cancel(){},ready:async()=>true});export const isMenuReady=()=>true;export const imageUrls=()=>[];export const hasUnloadedAssets=()=>false;',
 './ui/graphicsNotice':'export const showGraphicsNotice=()=>()=>{};',
 './ui/lounge':'export const mountLounge=()=>()=>{};',
 './ui/homeMusic':'export const startHomeMusic=()=>()=>{};',
 './net/api':'export const api=globalThis.__logout.api;',
 './net/analytics':'export const aIdentify=()=>{};export const aCapture=()=>{};export const aReset=()=>globalThis.__logout.reset();',
 './net/presence':'export const setPresence=()=>{};export const stopPresence=()=>globalThis.__logout.stop();',
 './net/resume':'export const saveActiveGame=()=>globalThis.__saveRoom();export const loadActiveGame=()=>null;export const clearActiveGame=()=>globalThis.__logout.clear();',
 './dev/localAccount':'export const LOCAL_GUEST_KEY="guest";export const canUseLocalGuest=()=>false;export const loadLocalDevDecks=()=>({});export const loadLocalGuestProfile=()=>({});',
 './screens/lazyGame':'export const mountGame=()=>({});export const mountGamePreparation=(app,start,dispose)=>globalThis.__prepare(app,start,dispose);',
};
for(const name of ['Login','Home','Lobby','Tutorial','Cards','Leaderboard','Admin','Profile','Friends','Shop','Deck','TutorialWelcome'])stubs['./screens/'+name[0].toLowerCase()+name.slice(1)]=`export const mount${name}=app=>{app.root.textContent='${name}';return {};};`;
try{
 await build({entryPoints:['client/src/router.ts'],bundle:true,platform:'node',format:'esm',outfile:temp+'/router.mjs',plugins:[{name:'router-boundaries',setup(b){b.onResolve({filter:/.*/},a=>a.path in stubs?{path:a.path,namespace:'stub'}:undefined);b.onLoad({filter:/.*/,namespace:'stub'},a=>({contents:stubs[a.path]}));}}]});
 const {App}=await import(temp+'/router.mjs');
 const app=new App(document.querySelector('#app'));const user={id:'qa-account'};app.user=user;app.profile();
 // Cancelled navigation must not reserve a BOT start or another room.
 app.current={beforeLeave:async()=>false};app.botGame('easy');await new Promise(r=>setTimeout(r,0));
 app.current={};app.botGame('easy');assert.equal(prepared,1,'cancelling unsaved changes must allow a later BOT start');
 app.startingBot=false;app.current={beforeLeave:async()=>false};app.storyGame(0);await new Promise(r=>setTimeout(r,0));
 app.current={};app.storyGame(0);assert.equal(prepared,2,'cancelled story navigation must allow retry');
 app.startingBot=undefined;app.current={beforeLeave:async()=>false};
 app.onlineGame('cancelled-room',0,'Opponent');await new Promise(r=>setTimeout(r,0));assert.equal(savedRooms,0,'cancelled navigation cannot replace the resumable room');
 const previousRequests=requests;await app.logout();assert.equal(requests,previousRequests,'declining unsaved changes must not invalidate the session');assert.equal(app.user,user);
 let releaseOld,releaseNew,finishOld;
 globalThis.__prepare=(_app,start,dispose)=>{prepared++;if(!releaseOld){releaseOld=dispose;finishOld=start;}else releaseNew=dispose;return {destroy:dispose};};
 let finishRequest;globalThis.__logout.api.startBot=()=>new Promise(r=>finishRequest=r);
 app.current={};app.botGame('easy');const oldStart=finishOld();app.home();app.botGame('normal');const token=app.startingBot;
 finishRequest({roomId:'obsolete',you:0});await oldStart;assert.equal(app.startingBot,token,'obsolete BOT response must not unlock a newer start');assert.equal(savedRooms,0);
 releaseNew();
 app.startingBot=false;app.current={};app.profile();
 const failed=app.logout();const rejection=assert.rejects(failed,/offline/);rejectLogout(Error('offline'));await rejection;
 assert.equal(app.user,user,'failed logout must retain the signed-in state');assert.equal(app.root.textContent,'Profile');assert.equal(cleared,0);assert.equal(reset,0);assert.equal(stopped,0);
 const pending=app.logout();app.deck();assert.equal(app.root.textContent,'Profile','navigation cannot race an in-flight logout');
 await app.logout();assert.equal(requests,2,'double submit must not send a second logout request');
 resolveLogout({ok:true});await pending;assert.equal(app.user,null);assert.equal(app.root.textContent,'Login');assert.equal(cleared,1);assert.equal(reset,1);assert.equal(stopped,1);
 app.user={id:'local-guest-user'};localStorage.setItem('guest','1');await app.logout();assert.equal(localStorage.getItem('guest'),null);assert.equal(requests,2,'local guest exit does not require a network');
 // Verify the actual settings controls surface failure, permit retry, and ignore
 // confirmation responses arriving after the profile has been destroyed.
 let confirm,logoutCalls=0,failLogout=true;
 globalThis.__logout.confirm=()=>new Promise(r=>confirm=r);
 globalThis.__logout.api.profile=async()=>({id:'qa-account',self:true,display:'QA',credits:0,stats_public:true});
 const profileStubs={
  '../ui/appearancePicker':'export const appearanceTitle=()=>"Customize";export const openAppearancePicker=()=>{};',
  '../ui/rankedProfile':'export const renderRankedProfile=()=>{};',
  '../ui/profileMedals':'export const mountProfileMedals=()=>()=>{};',
  '../ui/medal':'export const medalHtml=()=>"";',
  '../shared/progression':'export const seekerLevel=()=>({});',
  '../ui/renderDensity':'export const renderQuality=()=>"balanced";export const setRenderQuality=()=>{};',
  '../ui/homeIcons':'export const homeIcon=()=>"";',
  '../ui/loungeText':'export const loungeText=x=>x;',
  '../ui/modal':'export const confirmDialog=()=>globalThis.__logout.confirm();',
  '../net/api':'export const api=globalThis.__logout.api;',
  '../i18n':'export const t=x=>x;export const getLang=()=>"ja";export const setLang=()=>{};export const onLangChange=()=>()=>{};',
  '../ui/tier':'export const tierChipHtml=()=>"";',
  '../ui/social':'export const avatarHtml=()=>"";',
  '../ui/sound':'export const getSfxVolume=()=>.7;export const setSfxVolume=()=>{};export const sfx=()=>{};',
 };
 await build({entryPoints:['client/src/screens/profile.ts'],bundle:true,platform:'node',format:'esm',outfile:temp+'/profile.mjs',plugins:[{name:'profile-boundaries',setup(b){b.onResolve({filter:/.*/},a=>a.path in profileStubs?{path:a.path,namespace:'stub'}:undefined);b.onLoad({filter:/.*/,namespace:'stub'},a=>({contents:profileStubs[a.path]}));}}]});
 const {mountProfile}=await import(temp+'/profile.mjs');
 const uiApp={root:document.querySelector('#app'),user,home(){},logout:async()=>{logoutCalls++;if(failLogout)throw Error('offline');}};
 const tick=()=>new Promise(r=>setTimeout(r,0));
 uiApp.root.replaceChildren();const screen=mountProfile(uiApp,undefined,'settings');await tick();
 let button=document.querySelector('#logout');button.click();assert(button.disabled);confirm(false);await tick();assert.equal(logoutCalls,0);assert.equal(button.disabled,false);
 button.click();confirm(true);await tick();assert.equal(logoutCalls,1);assert.match(document.querySelector('#logoutMsg').textContent,/もう一度/);assert.equal(button.disabled,false);
 failLogout=false;button.click();confirm(true);await tick();assert.equal(logoutCalls,2);assert.equal(document.querySelector('#logoutMsg').textContent,'');
 button.click();screen.destroy();confirm(true);await tick();assert.equal(logoutCalls,2,'obsolete confirmation must not log out another screen');
 // Coupon responses may arrive after a tab change or an account switch.
 uiApp.root.replaceChildren();const couponScreen=mountProfile(uiApp,undefined,'settings');await tick();
 let couponCalls=0,resolveCoupon;globalThis.__logout.api.redeemCoupon=()=>{couponCalls++;return new Promise(r=>resolveCoupon=r);};
 document.querySelector('#coupon').value='QA';document.querySelector('#couponGo').click();
 document.querySelector('#coupon').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Enter'}));assert.equal(couponCalls,1,'double submit must redeem once');
 document.querySelector('[data-tab="overview"]').click();resolveCoupon({amount:100,credits:123});await tick();
 assert.equal(uiApp.user.credits,123,'leaving Settings must not lose an awarded balance');
 document.querySelector('[data-tab="settings"]').click();document.querySelector('#coupon').value='QA';document.querySelector('#couponGo').click();
 couponScreen.destroy();uiApp.user={id:'another-account',credits:9};resolveCoupon({amount:100,credits:223});await tick();assert.equal(uiApp.user.credits,9,'late coupon response cannot overwrite a different account');
 // HTTP success without an explicit acknowledgement is not a successful logout.
 await build({entryPoints:['client/src/net/api.ts'],bundle:true,platform:'node',format:'esm',outfile:temp+'/api.mjs'});
 const {api}=await import(temp+'/api.mjs');
 globalThis.fetch=async()=>new Response('{}',{status:200});await assert.rejects(api.logout());
 globalThis.fetch=async()=>new Response('not json',{status:200});await assert.rejects(api.logout());
 globalThis.fetch=async()=>new Response('{"error":"unavailable"}',{status:503});await assert.rejects(api.logout());
 globalThis.fetch=async()=>new Response('{"ok":true}',{status:200});assert.deepEqual(await api.logout(),{ok:true});
 console.log('PASS logout failure preserves session UI; retry, duplicate submit, navigation race, successful cleanup, local guest');
}finally{delete globalThis.__logout;dom.window.close();await rm(temp,{recursive:true,force:true});}
