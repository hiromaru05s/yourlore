// DOM regressions for the Biblion redesign; no network or account required.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const dom = new JSDOM('<div id="app"></div>',{url:'http://localhost',pretendToBeVisual:true});
for(const k of ['window','document','HTMLElement','Element','Node','localStorage','navigator','DOMRect','CustomEvent','Event','Image']) Object.defineProperty(globalThis,k,{value:dom.window[k],configurable:true});
dom.window.Range.prototype.getBoundingClientRect=()=>new dom.window.DOMRect();
dom.window.Range.prototype.getClientRects=()=>[];
globalThis.getComputedStyle=dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame=cb=>setTimeout(()=>cb(performance.now()),0);
globalThis.innerWidth=1280;globalThis.innerHeight=720;
globalThis.cancelAnimationFrame=()=>{};
globalThis.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
globalThis.ResizeObserver=class{observe(){} unobserve(){} disconnect(){}};
const temp=await mkdtemp(path.join(tmpdir(),'lore-ui-'));
const entry=`export { BaseController } from './client/src/game/controller'; export { revealSpell, setFxSkip, animateDraw } from './client/src/ui/anim'; export { paintDuelClock } from './client/src/ui/duelClock'; export { GameView, setMyAvatar, setOppAvatar } from './client/src/ui/boardView'; export { cardPickerMulti, closeOverlay } from './client/src/ui/modal'; export { deckBucket } from './client/src/ui/duelMaterials'; export { createGame, reduce, ST_MAX, FIELD_MAX } from './client/src/shared/engine'; export { DB, STARTERS } from './client/src/shared/cards'; export { avatarPresets, avatarHtml } from './client/src/ui/social'; export { solveBoard } from './client/src/ui/layout'; export { setLang } from './client/src/i18n'; export { mountProfile } from './client/src/screens/profile'; export { api } from './client/src/net/api';`;
await build({stdin:{contents:entry,resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',outfile:path.join(temp,'ui.mjs')});
const {BaseController,animateDraw,cardPickerMulti,closeOverlay,deckBucket,reduce,ST_MAX,FIELD_MAX,revealSpell,setFxSkip,paintDuelClock,GameView,createGame,DB,avatarPresets,avatarHtml,solveBoard,setLang,setMyAvatar,setOppAvatar,mountProfile,api}=await import(path.join(temp,'ui.mjs'));
setLang('ja');
// Clock values and accessibility survive the absence of a GPU, reconnect totals and expiry.
const clock=document.createElement('div');clock.setAttribute('aria-hidden','true');
paintDuelClock(clock,38.1,50,true);
assert.equal(clock.querySelector('.tc-num').textContent,'39');
assert.equal(clock.dataset.total,'50');assert.equal(clock.getAttribute('role'),'timer');assert(!clock.hasAttribute('aria-hidden'));
paintDuelClock(clock,-4,90,false);assert.equal(clock.dataset.remaining,'0');assert(clock.classList.contains('warn'));assert(clock.classList.contains('opp'));
paintDuelClock(clock,100,100,true);assert(!clock.classList.contains('warn'));assert.equal(clock.querySelectorAll('.hourglass-anchor').length,1);

// Shared engine capacity applies to both browser and staging worker reducers.
const boundary=createGame({mode:'bot',seed:7,starting:0,p0:{id:'x',name:'X'},p1:{id:'y',name:'Y'}}).state;
const trapDef=Object.values(DB).find(c=>c.t==='trap' && !c.req);
boundary.pending=null;boundary.players[0].mana=30;
boundary.players[0].traps=Array.from({length:13},(_,i)=>({card:{...trapDef,uid:'b-'+i}}));
boundary.players[0].hand=[{...trapDef,uid:'fourteenth'},{...trapDef,uid:'fifteenth'}];
let cap=reduce(boundary,{type:'play',idx:0,player:0}).state;
assert.equal(cap.players[0].traps.length,14);
cap=reduce(cap,{type:'play',idx:0,player:0}).state;
assert.equal(cap.players[0].traps.length,14);assert(cap.players[0].hand.some(c=>c.uid==='fifteenth'));
const g=createGame({mode:'bot',seed:42,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;
const mon=Object.values(DB).find(c=>c.t==='mon');
const trap=Object.values(DB).find(c=>c.t==='trap');
const spell=Object.values(DB).find(c=>c.ench);
for(const [i,p] of g.players.entries()){
 p.maxMana=30;p.mana=23;p.hp=20;
 p.field=Array.from({length:7},(_,n)=>({...mon,uid:`mon-${i}-${n}`,exhausted:false,tempAtk:0,atkMod:0,defMod:0,summonedTurn:0}));
 p.traps=Array.from({length:7},(_,n)=>({card:{...trap,uid:`secret-${i}-${n}`}}));
 p.enchants=Array.from({length:7},(_,n)=>({card:{...spell,uid:`spell-${i}-${n}`},turns:99}));
 p.discard=[{...mon,uid:`discard-${i}`}];
}
const monCap=structuredClone(g);monCap.pending=null;
monCap.players.forEach(p=>{p.traps=[];p.enchants=[];});
monCap.players[0].hand=[{...mon,uid:'eighth-mon'}];monCap.players[0].mana=30;
const rejected=reduce(monCap,{type:'play',idx:0,player:0}).state;
assert.equal(rejected.players[0].field.length,7);assert.equal(rejected.players[0].hand[0].uid,'eighth-mon');
setMyAvatar('SEEKER_RED');setOppAvatar('SEEKER_BLUE');
let boughtFixed=-1,boughtSupply=-1,rerolls=0;
const noop=()=>{};
const v=new GameView(document.getElementById('app'),0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:i=>boughtFixed=i,onBuySupply:i=>boughtSupply=i,onRefresh:()=>rerolls++,onEndTurn:noop,onSurrender:noop});
v.render(g);
for(const id of ['meRow','oppRow']) {
 assert.equal(document.querySelectorAll(`#${id} .zone-mon > .card`).length,7);
 assert.equal(document.querySelectorAll(`#${id} .zone-st > .buff-icon`).length,14);
 assert.equal(document.querySelector(`#${id} .pile-col`).children[0].classList.contains('pile--deck'),true);
 assert.equal(document.querySelector(`#${id} .pile-col`).children[1].classList.contains('pile--shelf'),true);
}
assert.equal(ST_MAX,14); assert.equal(FIELD_MAX,7);
assert.deepEqual([0,1,2,3,4,5,9,10,14,15,30].map(deckBucket),[0,1,1,3,3,5,5,10,10,15,15]);
assert.equal(document.querySelectorAll('#market .card-type').length,12);
assert.equal(document.querySelectorAll('#oppRow .buff-icon--trap').length,7);
assert(!document.querySelector('#rift-me').classList.contains('is-absorbing'));
g.players[0].removed=[{...mon,uid:'removed-new'}];v.render(g);
assert(document.querySelector('#rift-me').classList.contains('is-absorbing'));
const clockMe=document.getElementById('clock-me');paintDuelClock(clockMe,41,90,true);
cardPickerMulti('捨てるカード',g.players[0].hand,2,()=>{},{exact:true});
assert.equal(document.querySelector('.dialog-clock').textContent,'41秒');
paintDuelClock(clockMe,39,90,true);assert.equal(document.querySelector('.dialog-clock').textContent,'39秒');
closeOverlay();assert(!document.querySelector('.dialog-clock'));
assert.equal(document.querySelectorAll('.mana-crystal').length,60);
assert.equal(document.querySelectorAll('#portraitMe .mana-crystal.is-lit').length,23);
assert.equal(document.querySelector('#hpbar-me').getAttribute('aria-valuenow'),'20');
assert.equal(document.querySelector('#hpbar-me i').style.width,'50%');
assert.equal(document.querySelectorAll('#fixedMarket > .card').length,8);
assert.equal(document.querySelectorAll('#supplyMarket > .card').length,4);
assert.deepEqual([...document.querySelectorAll('#supplyMarket .mkt-stock')].map(e=>e.textContent),['×1','×1','×1','×1']);
assert.equal(document.querySelectorAll('.side-rail').length,0);
assert.equal(document.querySelector('#oppRow [data-uid^="secret"]'),null,'hidden trap identity stays private');
const click=el=>el.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true}));
const fixed=document.querySelector('#fixedMarket > .card');click(fixed);click(fixed);click(fixed);assert.equal(boughtFixed,0);
const sup=document.querySelector('#supplyMarket > .card');const original=Number(sup.dataset.supIdx);click(sup);click(sup);click(sup);assert.equal(boughtSupply,original,'sorting keeps original supply index');
click(document.querySelector('#refreshBtn'));assert.equal(rerolls,1);
v.setHandOpen(true);assert(document.querySelector('.game.hand-open'));v.setHandOpen(false);assert(!document.querySelector('.game.hand-open'));
g.cur=1;v.render(g);assert(document.querySelector('#refreshBtn').disabled);assert(document.querySelector('#endBtn').disabled);
g.cur=0;g.players[0].supply[1]=null;v.render(g);assert.equal(document.querySelectorAll('#supplyMarket > *').length,4);assert.equal(document.querySelectorAll('#supplyMarket > .is-bought').length,1);
assert.deepEqual(avatarPresets(),['SEEKER_RED','SEEKER_BLUE']);assert(avatarHtml('SEEKER_RED','A').includes('seeker-red'));
for(const [w,h] of [[1920,1080],[1280,720],[1024,768],[390,844],[320,568],[844,390]]) {const m=solveBoard(w,h);assert(m.tile>=20&&m.mktH>=38);assert.equal(m.underPile,false);}
// Complete type-specific PNG faces and live numeric overlays survive rendering.
for (const card of document.querySelectorAll('.card[data-card-type]')) {
  const compact = card.matches('.card--field,.card--mkt');
  assert(card.querySelector('.card-frame').style.backgroundImage.includes(`${compact?'compact':'frame'}-${card.dataset.cardType}.png`));
  for (const seal of card.querySelectorAll('.card-cost,.ad-atk,.ad-def')) assert(seal.querySelector('.seal-value'));
}
// Flights must travel from the deck, restore cards on cancellation, and never reveal opponent identities.
const originalRect=dom.window.HTMLElement.prototype.getBoundingClientRect;
dom.window.HTMLElement.prototype.getBoundingClientRect=function(){return new DOMRect(this.closest('.pile')?900:750,this.closest('.pile')?400:650,45,70);};
const motions=[];
dom.window.HTMLElement.prototype.animate=function(frames,options){motions.push({frames,options});return {cancel(){}};};
const hand=document.getElementById('hand');
const drawing=animateDraw(hand,2);
await new Promise(r=>setTimeout(r,20));
assert(document.querySelector('.draw-flight .draw-back'));
assert(document.querySelector('.draw-flight .draw-face'));
assert(motions[0].frames.at(-1).transform.includes('translate3d(-150px,250px,0)'));
setFxSkip(true);await drawing;setFxSkip(false);
assert(!document.querySelector('.draw-flight'));
assert([...hand.querySelectorAll('.card')].every(n=>n.style.visibility!== 'hidden'));
const opponentDraw=animateDraw(document.getElementById('oppHand'),2,'opp');
await new Promise(r=>setTimeout(r,20));
assert(!document.querySelector('.draw-flight .draw-face'));
setFxSkip(true);await opponentDraw;setFxSkip(false);
dom.window.HTMLElement.prototype.getBoundingClientRect=originalRect;
// An interrupted reveal must release its overlay, preserve the destination and never trap input.
const reveal=revealSpell({...spell,uid:'fx-cancel'},'me','discard');
await new Promise(r=>setTimeout(r,35));
assert(document.querySelector('.cast-reveal'));assert(document.querySelector('.cast-veil'));
setFxSkip(true);await reveal;setFxSkip(false);
assert(!document.querySelector('.cast-reveal'));assert(!document.querySelector('.cast-veil'));
assert(document.getElementById('pile-myDisc'));
v.destroy();
document.getElementById('app').innerHTML='';
// Regression through the real controller: first banner follows the coin; next turn announces once.
class TestController extends BaseController { submit(){} feed(res,animate=false){this.applyResult(res,animate);} }
const control=new TestController(document.getElementById('app'),0,{onHome:noop,onRematch:noop});
const opening=createGame({mode:'bot',seed:29,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}});
control.feed(opening);
await new Promise(r=>setTimeout(r,20));
assert(document.querySelector('.cointoss-ov'));
assert(!document.querySelector('.fx-turnbanner'),'opening banner must not be obscured by coin');
await new Promise(r=>setTimeout(r,2600));
assert.equal(document.querySelector('.fx-turnbanner span')?.textContent,'あなたのターンです');
const next=structuredClone(opening.state);next.cur=1;next.turn=2;next.pending=null;
control.feed({state:next,events:[]});
await new Promise(r=>setTimeout(r,20));
assert.equal(document.querySelector('.fx-turnbanner span')?.textContent,'相手のターンです');
const banner=document.querySelector('.fx-turnbanner');
control.feed({state:structuredClone(next),events:[]});
await new Promise(r=>setTimeout(r,20));
assert.equal(document.querySelector('.fx-turnbanner'),banner,'same-turn updates do not replay banner');
control.destroy();assert(!document.querySelector('.fx-turnbanner'));
document.getElementById('app').innerHTML='';
let savedAvatar='SEEKER_BLUE';
const profile={self:true,id:'test',display:'Seeker',avatar:savedAvatar,created_at:Date.now(),wins:0,losses:0,recent:[],ranked_wins:0,ranked_losses:0,bot_wins:0,bot_losses:0};
api.profile=async()=>({...profile,avatar:savedAvatar});
api.updateMe=async(patch)=>{savedAvatar=patch.avatar;return {ok:true,display:'Seeker',avatar:savedAvatar,stats_public:true,sleeve:'default'};};
const app={root:document.getElementById('app'),user:{avatar:savedAvatar},home:noop};
const screen=mountProfile(app);
await new Promise(r=>setTimeout(r,10));
click(document.querySelector('#avaBtn'));
assert.equal(document.querySelectorAll('.seeker-picker .ava-opt').length,2);
click(document.querySelector('[data-id="SEEKER_RED"]'));
await new Promise(r=>setTimeout(r,10));
assert.equal(savedAvatar,'SEEKER_RED');assert.equal(app.user.avatar,'SEEKER_RED');
assert(document.querySelector('#avaBtn .seeker-red'),'profile re-renders persisted selection');
screen.destroy?.();
dom.window.close();await rm(temp,{recursive:true,force:true});
console.log('PASS: zones, secret traps, market stock/index/confirmation, turn restrictions, 30 mana, HP, avatars, hand states, viewport sizes');
process.exit(0);
