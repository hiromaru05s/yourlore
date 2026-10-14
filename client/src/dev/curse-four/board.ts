import {placeSource} from '../../ui/curse/nativeCard';
import '../../styles/tokens.css';import '../../styles/base.css';import '../../styles/card.css';import '../../styles/game-overlays.css';import '../../styles/game.css';import '../../styles/screens.css';import '../../styles/reading-board.css';import '../../styles/presentation.css';
import {GameView,setMyAvatar,setOppAvatar} from '../../ui/boardView';
import {createGame,reduce,playCost} from '../../shared/engine';import {DB,STARTERS} from '../../shared/cards';import {startBoardLayout} from '../../ui/layout';import {clearMonsterStates} from '../../ui/monster/runtime';import {setLang} from '../../i18n';import {cardEl} from '../../ui/cardView';import {stateAt,type Options,type Layout,type Rect} from './model';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
const state=createGame({mode:'bot',seed:72,starting:0,p0:{id:'curse-self',name:'YOU'},p1:{id:'curse-opp',name:'OPPONENT'}}).state;state.turn=3;state.pending=null;
for(const [side,p] of state.players.entries()){p.openingDrawReady=false;p.mana=8;p.maxMana=12;p.hp=28;p.enchants=[];p.quests=[];p.field=['VAMP1','M1'].map((id,i)=>({...DB[id],uid:`curse-mon-${side}-${i}`,exhausted:false,summonedTurn:0,tempAtk:0,atkMod:0,defMod:0,dmg:0}));p.hand=[DB.BLACK_CURSE,DB.BLACK_NOVA,STARTERS.STARTER_MANA].map((c,i)=>({...c,uid:`curse-hand-${side}-${i}`}));p.discard=Array.from({length:7},(_,i)=>({...DB.S1,uid:`curse-disc-${side}-${i}`}));}
const original=structuredClone(state),results=[0,1].map(side=>{const s=structuredClone(original);s.cur=side as 0|1;return reduce(s,{type:'play',idx:0});});
for(const [side,r] of results.entries()){if(r.state.players[1-side].discard.filter(c=>c.id==='CURSE').length!==5)throw Error('カースの生成効果を確認できません');}
let currentMs=0,dragOrigin:Rect|undefined,origin:Rect|undefined;
function captureRelease(){const el=document.querySelector('.drag-ghost');dragOrigin=el?rect(el):undefined;}
window.addEventListener('pointerup',captureRelease,true);
const noop=()=>{},play=(uid:string)=>{if(uid!=='curse-hand-0-0'||currentMs>0)return;parent.postMessage({type:'curse-play',origin:dragOrigin},location.origin);dragOrigin=undefined;},root=document.querySelector<HTMLElement>('#app')!;
const view=new GameView(root,0,{onPlay:play,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
view.render(state);clearMonsterStates(root);document.querySelector('.help-callout')?.remove();view.setHandOpen(true);const stop=startBoardLayout();
function rect(el:Element):Rect{const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height};}
const hand=(side:number)=>document.querySelector<HTMLElement>(`${side?"#oppHand":"#hand"} [data-uid="curse-hand-${side}-0"]`);
const ownPile=(side:number)=>document.querySelector<HTMLElement>(side?'#pile-oppDisc':'#pile-myDisc')!;
const prints=[ownPile(0).querySelector('.pile-print')!.innerHTML,ownPile(1).querySelector('.pile-print')!.innerHTML];
const signatures=['',''];
const castFaces=[0,1].map(side=>{const n=cardEl({...DB.BLACK_CURSE,uid:`curse-native-${side}`},{size:'hand',fullArt:true});n.hidden=true;n.dataset.curseSource='true';document.body.append(n);return n;});
function sample(side:number):Layout{
 const el=hand(side);if(!el)throw Error('カースの発動元が見つかりません');
 const source=side===0&&origin?origin:rect(el),target=rect(ownPile(1-side).querySelector('.pile-print')!),ownGrave=rect(ownPile(side).querySelector('.pile-print')!);
 const b=rect(document.querySelector(side?'#oppRow .zone-mon':'#meRow .zone-mon')!);const cw=Math.min(122,Math.max(74,innerWidth*.11));
 return {source,target,ownGrave,played:{x:innerWidth*.52,y:b.y,w:cw,h:cw*1.5}};
}
function sync(o:Options){
 currentMs=o.ms;root.style.filter=o.dark?'brightness(.72)':'';const st=stateAt(o);
 for(const side of [0,1]){
  placeSource(castFaces[side],sample(side),side===o.side||o.concurrent?o.ms:0);
  const casting=side===o.side||o.concurrent,receiving=side!==o.side||o.concurrent,spent=casting&&st.spellDiscarded,n=receiving?st.deposited:0;
  const el=hand(side);if(el){el.style.visibility=casting&&st.played?'hidden':'';el.style.pointerEvents=casting&&st.played?'none':'';}
  const p=state.players[side];p.hand=casting&&st.played?original.players[side].hand.slice(1):original.players[side].hand.slice();p.mana=8-(casting&&o.ms>=650?playCost(original.players[side].hand[0],original.players[side]):0);
  const mana=document.querySelector<HTMLElement>(side?'#portraitOpp .pt-mana':'#portraitMe .pt-mana');if(mana){mana.setAttribute('aria-label',`マナ ${p.mana}/12`);mana.dataset.mana=String(p.mana);const b=mana.querySelector('b');if(b)b.textContent=String(p.mana);mana.querySelectorAll('.mana-crystal').forEach((c,i)=>c.classList.toggle('is-lit',i<p.mana));}
  const sig=`${n}:${spent}`;if(signatures[side]!==sig){
   const curses=results[1-side].state.players[side].discard.filter(c=>c.id==='CURSE').slice(0,n);
   p.discard=[...original.players[side].discard,...(spent?[original.players[side].hand[0]]:[]),...curses];
   const pile=ownPile(side),print=pile.querySelector('.pile-print')!;pile.querySelector('.pile-count')!.textContent=String(p.discard.length);pile.setAttribute('aria-label',`墓地 ${p.discard.length}`);
   if(n||spent)print.replaceChildren(cardEl({...p.discard[p.discard.length-1],uid:`curse-pile-face-${side}`},{size:'hand'}));else print.innerHTML=prints[side];signatures[side]=sig;
  }
 }
 const count=document.querySelector('#oppHand .hand-count');if(count)count.textContent=String(state.players[1].hand.length);
}
function begin(r?:Rect){origin=r;}
function suspend(){} // The paused frame and played hand state remain consistent.
function restore(){origin=undefined;sync({side:0,ms:0,concurrent:false,variant:0,dark:false,reduced:false});}
let disposed=false;function dispose(){if(disposed)return;disposed=true;restore();castFaces.forEach(n=>n.remove());window.removeEventListener('pointerup',captureRelease,true);stop();clearMonsterStates(root);view.destroy();}
Object.assign(window,{curseBoard:{get ready(){return !disposed&&!root.classList.contains('duel-preparing');},sample,sync,begin,restore,suspend,dispose,get state(){return state;},engineEvidence:results.map((r,side)=>({side,mana:r.state.players[side].mana,hand:r.state.players[side].hand.length,ownGrave:r.state.players[side].discard.length,targetGrave:r.state.players[1-side].discard.length}))}});
window.addEventListener('pagehide',dispose,{once:true});
