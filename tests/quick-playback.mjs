import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'lore-quick-playback-'));
const trace=[];
let pendingMana=null;
const node=()=>({dataset:{},isConnected:true,remove(){this.isConnected=false;trace.push('remove');},getBoundingClientRect(){return {left:20,top:20,width:60,height:90};},querySelector(){return null;},classList:{add(){},remove(){}}});
globalThis.__fx=(name,...args)=>{
 if(name==='ghostDie'||name==='destroyAnim')trace.push(name+':decay='+String(args[4]));
 if(name==='buyReveal'||name==='revealSpell'){trace.push('reveal:'+args[0].id);return node();}
 if(name==='ghostSummon'){trace.push('summon:'+args[0].id);return node();}
 if(name==='exileGeneratedCards'){if(args[0].length)trace.push('generated:'+args[0].length);return;}
 if(name==='beginElemental'){trace.push('effect:'+args[0].id);return {impact:async i=>{trace.push('impact:'+i)},finished:Promise.resolve(),cancel(){}};}
 if(name==='finishElementalSpell'){trace.push('finish-elemental');args[0].remove();return;}
 if(name==='finishQuickSpell'){trace.push('finish');args[0].remove();return;}
 if(name==='exileCard')trace.push('exile:'+args[0].uid);
 if(name==='manaSurge'||name==='maxHpSurge')trace.push(name);
 if(name==='manaSurge'&&pendingMana)return pendingMana;
 if(name==='fxWait')trace.push('wait:'+args[0]);
};
globalThis.CSS={escape:value=>String(value)}; // DOM double ignores selector contents.
globalThis.document={querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null};
globalThis.requestAnimationFrame=fn=>{fn();return 1;};
const mocks={
 'statusGrantRuntime':'export const playStatusGrant=(...args)=>globalThis.__fx("playStatusGrant",...args);export const warmStatusGrants=()=>{};',
 'anim':"export const beginElemental=(...args)=>globalThis.__fx('beginElemental',...args);export const finishElementalSpell=(...args)=>globalThis.__fx('finishElementalSpell',...args);export const berserkStrike=(...args)=>globalThis.__fx('berserkStrike',...args);export const monsterActivation=(...args)=>globalThis.__fx(\"monsterActivation\",...args);export const isFxSkipped=()=>false;export const animateDraw=(...args)=>globalThis.__fx(\"animateDraw\",...args);\nexport const animateReshuffle=(...args)=>globalThis.__fx(\"animateReshuffle\",...args);\nexport const attackStrike=(...args)=>globalThis.__fx(\"attackStrike\",...args);\nexport const buyReveal=(...args)=>globalThis.__fx(\"buyReveal\",...args);\nexport const closeZoom=(...args)=>globalThis.__fx(\"closeZoom\",...args);\nexport const deathShatter=(...args)=>globalThis.__fx(\"deathShatter\",...args);\nexport const destroyAnim=(...args)=>globalThis.__fx(\"destroyAnim\",...args);\nexport const discardFromHand=(...args)=>globalThis.__fx(\"discardFromHand\",...args);\nexport const enchantActivation=(...args)=>globalThis.__fx(\"enchantActivation\",...args);\nexport const eventBanner=(...args)=>globalThis.__fx(\"eventBanner\",...args);\nexport const exileCard=(...args)=>globalThis.__fx(\"exileCard\",...args);\nexport const exileGeneratedCards=(...args)=>globalThis.__fx(\"exileGeneratedCards\",...args);\nexport const finishQuickSpell=(...args)=>globalThis.__fx(\"finishQuickSpell\",...args);\nexport const flashBadge=(...args)=>globalThis.__fx(\"flashBadge\",...args);\nexport const fxWait=(...args)=>globalThis.__fx(\"fxWait\",...args);\nexport const ghostDie=(...args)=>globalThis.__fx(\"ghostDie\",...args);\nexport const ghostSummon=(...args)=>globalThis.__fx(\"ghostSummon\",...args);\nexport const hpBarSet=(...args)=>globalThis.__fx(\"hpBarSet\",...args);\nexport const hpFeedback=(...args)=>globalThis.__fx(\"hpFeedback\",...args);\nexport const manaDrop=(...args)=>globalThis.__fx(\"manaDrop\",...args);\nexport const manaSurge=(...args)=>globalThis.__fx(\"manaSurge\",...args);\nexport const maxHpSurge=(...args)=>globalThis.__fx(\"maxHpSurge\",...args);\nexport const monHit=(...args)=>globalThis.__fx(\"monHit\",...args);\nexport const openingBoard=(...args)=>globalThis.__fx(\"openingBoard\",...args);\nexport const pileFlash=(...args)=>globalThis.__fx(\"pileFlash\",...args);\nexport const removeReviewFab=(...args)=>globalThis.__fx(\"removeReviewFab\",...args);\nexport const resultPopup=(...args)=>globalThis.__fx(\"resultPopup\",...args);\nexport const revealSpell=(...args)=>globalThis.__fx(\"revealSpell\",...args);\nexport const reviewFab=(...args)=>globalThis.__fx(\"reviewFab\",...args);\nexport const setFxSkip=(...args)=>globalThis.__fx(\"setFxSkip\",...args);\nexport const trapRevealAnim=(...args)=>globalThis.__fx(\"trapRevealAnim\",...args);\nexport const trapSetAnim=(...args)=>globalThis.__fx(\"trapSetAnim\",...args);\nexport const turnBanner=(...args)=>globalThis.__fx(\"turnBanner\",...args);",
 'rankPresentation':'export class RankPresentation {destroy(){} cancel(){} receive(){}}',
 'boardView':'export class GameView{}',
 'log':'export class GameLog{};export const logToText=s=>s;',
 'modal':'export const cardPicker=()=>{},cardPickerMulti=()=>{},confirmDialog=()=>{},treasureModal=()=>{},winModal=()=>{},closeOverlay=()=>{},closeTreasureNotices=()=>{};',
 'sound':'export const sfx=()=>{},stopSounds=()=>{},warmSounds=async()=>{};',
 'dice':'export const diceRollAnim=()=>{},cancelDiceAnimations=()=>{};',
 'duelClock':'export const paintDuelClock=()=>{};',
 'social':'export const avatarHtml=()=>"";',
 'tier':'export const tierOf=()=>0,tierLabel=()=>"";',
 'api':'export const api={};',
 'analytics':'export const aCapture=()=>{};',
 'i18n':'export const t=s=>s,getLang=()=>"ja",cardName=c=>c.id,onLangChange=()=>()=>{};'
};
try{
 await build({stdin:{contents:"export {BaseController} from './client/src/game/controller';export {createGame,reduce} from './client/src/shared/engine';export {DB} from './client/src/shared/cards';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'test.mjs'),plugins:[{name:'ui-double',setup(b){b.onResolve({filter:/.*/},a=>{const key=a.path.endsWith('/statusGrant/runtime')?'statusGrantRuntime':a.path.split('/').pop();return mocks[key]?{path:key,namespace:'mock'}:null;});b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:mocks[a.path],loader:'js'}));}}]});
 const {BaseController,createGame,reduce,DB}=await import(path.join(dir,'test.mjs'));
 const card=(id,uid=id)=>({...DB[id],uid});
 const mon=(id,uid=id)=>({...card(id,uid),tempAtk:0,atkMod:0,defMod:0,dmg:0,exhausted:false,summonedTurn:0});
 const fresh=()=>{const g=createGame({mode:'online',seed:42,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.cur=0;g.pending=null;for(const p of g.players)Object.assign(p,{field:[],enchants:[],quests:[],traps:[],hand:[],deck:[],discard:[],removed:[],exile:[],mana:20,maxMana:20,hp:30,maxHp:40});return g;};
 const controller=()=>Object.assign(Object.create(BaseController.prototype),{you:0,dead:false,quickFaces:[],elementalFaces:[],view:{pushIcon(){},render(){trace.push('render');}}});
 const play=async(c,prev,res)=>{trace.length=0;await c.playEvents(prev,res);return [...trace];};
 for(const owner of [0,1]){
  const g=fresh();g.cur=owner;g.market[0]=card('QUICK_MIMIC');const res=reduce(g,{type:'buyMarket',i:0}),c=controller(),log=await play(c,g,res);
  assert.equal(log.filter(x=>x==='reveal:QUICK_MIMIC').length,1,'purchase/playSpell reveals once');
  assert.equal(log.filter(x=>x==='finish').length,1,'source exits once');
  assert(log.indexOf('summon:MIMIC')<log.indexOf('finish'));
  assert(log.indexOf('generated:2')<log.indexOf('finish'));
  assert(log.indexOf('render')<log.indexOf('finish'));
 }
 {const g=fresh();g.market[0]=card('QUICK_ATTUNE');const log=await play(controller(),g,reduce(g,{type:'buyMarket',i:0}));assert(log.indexOf('render')<log.indexOf('manaSurge'),'crystal state must render before the shared gain clock starts');assert(log.indexOf('manaSurge')<log.indexOf('finish'));assert(log.indexOf('maxHpSurge')<log.indexOf('finish'));}
 {const g=fresh();g.market[0]=card('QUICK_ATTUNE');const c=controller();let release;pendingMana=new Promise(r=>release=r);trace.length=0;
  const playing=c.playEvents(g,reduce(g,{type:'buyMarket',i:0}));for(let i=0;i<30;i++)await Promise.resolve();
  assert(trace.includes('manaSurge'));assert(!trace.includes('finish'),'source must await actual effect completion');release();await playing;pendingMana=null;assert(trace.includes('finish'));
 }
 {const g=fresh();g.players[0].field=[mon('MIMIC','target-a'),mon('MIMIC','target-b')];g.market[0]=card('QUICK_ASSAULT');const c=controller();
  const bought=reduce(g,{type:'buyMarket',i:0});assert(bought.state.pending);let log=await play(c,g,bought);assert(!log.includes('finish'));assert.equal(c.quickFaces.length,1);
  const first=reduce(bought.state,{type:'pick',uid:'target-a'});assert(first.state.pending);log=await play(c,bought.state,first);assert(!log.includes('finish'));assert.equal(c.quickFaces.length,1);
  const second=reduce(first.state,{type:'pick',uid:'target-b'});assert(!second.state.pending);log=await play(c,first.state,second);assert.equal(log.filter(x=>x==='finish').length,1);assert(!log.some(x=>x.startsWith('reveal:')));assert(log.includes('wait:1800'));assert(log.indexOf('wait:1800')<log.indexOf('finish'),'approved monster stat motion finishes before quick spell leaves');assert.equal(c.quickFaces.length,0);
 }
 {const g=fresh();g.players[0].hand=[card('MIMIC','from-hand')];const state=structuredClone(g);state.players[0].hand=[];state.players[0].removed=[...g.players[0].hand,...Array.from({length:3},(_,i)=>card('MIMIC','new-'+i))];const log=await play(controller(),g,{state,events:[]});assert(log.includes('exile:from-hand'));assert(log.includes('generated:3'));}
 for(const id of ['FIRE_BALL','FIRE_ZONE']){
  const g=fresh();g.turn=3;g.players[0].hand=[card(id,'source'),card('MIMIC','cost')];const c=controller(),played=reduce(g,{type:'play',idx:0});assert(played.state.pending);let log=await play(c,g,played);assert.equal(log.filter(x=>x==='reveal:'+id).length,1);assert.equal(c.elementalFaces.length,1);assert(!log.includes('finish-elemental'));
  const picked=reduce(played.state,{type:'pick',uid:id==='FIRE_ZONE'?'cost':'player-1'});log=await play(c,played.state,picked);assert(!log.some(x=>x.startsWith('reveal:')));assert(log.indexOf('effect:'+id)<log.indexOf('finish-elemental'));assert(log.includes('impact:0'));assert.equal(log.filter(x=>x==='finish-elemental').length,1);assert.equal(c.elementalFaces.length,0);
 }
 for(const cause of [undefined,'decay'])for(const exile of [false,true]){
  const g=fresh();g.players[0].field=[mon('M4','dead')];const state=structuredClone(g);state.players[0].field=[];state.players[0][exile?'removed':'discard']=[card('M4','dead')];const log=await play(controller(),g,{state,events:[{type:'destroy',uid:'dead',player:0,id:'M4',...(cause?{cause}:{})}]});assert(log.includes('destroyAnim:decay='+String(cause==='decay')),'route the explicit cause, including exile destinations');
 }
 console.log('PASS: single quick reveal/exit, effects before exit for both players, generated vs hand origins, multi-step choices keep source until resolution');
}finally{await rm(dir,{recursive:true,force:true});delete globalThis.__fx;delete globalThis.document;delete globalThis.requestAnimationFrame;}
