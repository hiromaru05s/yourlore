import '../../styles/tokens.css';import '../../styles/base.css';import '../../styles/card.css';import '../../styles/passives.css';import '../../styles/game-overlays.css';import '../../styles/game.css';import '../../styles/screens.css';import '../../styles/reading-board.css';import '../../styles/presentation.css';
import {BaseController} from '../../game/controller';
import {createGame} from '../../shared/engine';
import {DB,STARTERS} from '../../shared/cards';
import {startBoardLayout} from '../../ui/layout';
import {setLang} from '../../i18n';
import {setMyAvatar,setOppAvatar} from '../../ui/boardView';
import {registerCosmeticPreview} from '../../ui/cosmeticPreviewBridge';
import type {CosmeticPreviewAdapter} from '../../ui/cosmeticPreviewBridge';
import type {CardInst,FieldMon,GameState} from '../../shared/types';
import type {SetIndex} from './catalog';
import {createEquippedCosmetics} from '../../ui/cosmetics/runtime';
import {quietLuxuryId} from '../../shared/quietLuxuryCosmetics';
import {animateDraw,setFxSkip} from '../../ui/anim';
import {captureHandLayout} from '../../ui/handGeometry';
import {clearMonsterStates} from '../../ui/monster/runtime';
import {previewPixelRatio} from './resolution';

export function mountBoard(){
 document.body.innerHTML='<div id="app"></div>';const root=document.getElementById('app')!;
 const style=document.createElement('style');style.textContent='html,body{margin:0;background:#f2f0e9} .help-callout,.battle-tools,.game-help-callout,.btn-surrender{display:none!important}';document.head.append(style);
 setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
 const opponentMode=new URLSearchParams(location.search).has('opponent');
 let selected:SetIndex=Math.max(0,Math.min(2,Number(new URLSearchParams(location.search).get('set'))||0)) as SetIndex,side=opponentMode?'opponent':'self',playing=true,rate=1,stock=true,last=0;
 let counts={deck:9,grave:3,hand:4},busy=false,focus='all',displayZoom=1,action:AbortController|undefined,actionId=0;
 const clock={value:0},runtime=createEquippedCosmetics(root);
 const adapter:CosmeticPreviewAdapter={
  get revision(){return runtime.revision;},
  get pixelRatio(){return previewPixelRatio(innerWidth,innerHeight,displayZoom,devicePixelRatio);},
  get antialiasSamples(){return 4;},
  applyFurniture:runtime.applyFurniture,decoratePile:runtime.decoratePile,
  tick(now){const dt=last?Math.min(now-last,50):0;last=now;if(playing)clock.value+=dt;return runtime.tick(clock.value);},
  render:runtime.render,dispose:runtime.dispose
 };
 const unregister=registerCosmeticPreview(root,adapter);
 class Preview extends BaseController{submit(){}show(g:GameState){this.state=g;this.view.render(g);}}
 const ctl=new Preview(root,0,{onHome(){},onRematch(){}}),stop=startBoardLayout();
 const g=createGame({mode:'bot',seed:41,starting:0,p0:{id:'gacha-atelier-self',name:'自分'},p1:{id:'gacha-atelier-opp',name:'相手'}}).state;g.turn=5;g.pending=null;let uid=0;
 const card=(id:string):CardInst=>({...DB[id]??STARTERS[id],uid:'atelier-preview-'+uid++});
 const monsters=['ELF','CASTLE'].filter(id=>DB[id]?.t==='mon');
 for(const [i,p]of g.players.entries()){p.openingDrawReady=false;p.hp=i?38:40;p.maxMana=5;p.mana=4;p.enchants=[];p.quests=[];p.traps=[];p.removed=[];p.hand=['ELF','CASTLE','HALF_ELF','ND2'].map(card);p.field=monsters.map(id=>({...card(id),atk:DB[id].atk!,def:DB[id].def!,dmg:0,exhausted:true,tempAtk:0,atkMod:0,defMod:0,summonedTurn:0}) as FieldMon);}
 function notify(){parent.postMessage({type:'gacha-opponent-status',busy,deck:g.players[1].deck.length,grave:g.players[1].discard.length,hand:g.players[1].hand.length},location.origin);}
 function focusRect(){const node=focus==='deck'?root.querySelector('#pile-oppDeck'):focus==='grave'?root.querySelector('#pile-oppDisc'):focus==='hand'?root.querySelector('#oppHand'):null;const r=node?.getBoundingClientRect();parent.postMessage({type:'gacha-opponent-focus-rect',focus,rect:r?{x:r.x,y:r.y,w:r.width,h:r.height}:null},location.origin);}
 function render(){ctl.show(g);window.dispatchEvent(new Event('lore:layout'));notify();}
 function show(){const id=quietLuxuryId(selected,'sleeve');g.sleeves=[side==='self'||side==='both'?id:'default',side==='opponent'||side==='both'?id:'default'];g.furnitures=([0,1] as const).map(i=>side==='both'||side===(i?'opponent':'self')?quietLuxuryId(selected,'furniture'):'default') as [string,string];for(const [i,p]of g.players.entries()){p.deck=Array.from({length:opponentMode&&i?counts.deck:stock?9:0},()=>card('ELF'));p.discard=Array.from({length:opponentMode&&i?counts.grave:stock?3:0},()=>card('HALF_ELF'));if(opponentMode&&i)p.hand=Array.from({length:counts.hand},()=>card('ELF'));}render();requestAnimationFrame(()=>requestAnimationFrame(focusRect));}
 function cancel(){actionId++;root.querySelector('#pile-oppDeck')?.removeAttribute('data-opening-count');action?.abort();action=undefined;busy=false;}
 async function draw(count:number){
  if(busy||!g.players[1].deck.length)return;const token=++actionId,abort=new AbortController();action=abort;busy=true;notify();setFxSkip(false);
  try{for(let i=0;i<count&&g.players[1].deck.length;i++){
   if(abort.signal.aborted||token!==actionId)break;
   const p=g.players[1],previousHand=captureHandLayout(document.getElementById('oppHand')),next=p.deck[p.deck.length-1];p.hand.push(next);render();
   const deck=root.querySelector<HTMLElement>('#pile-oppDeck')!;deck.dataset.openingCount=String(p.deck.length-1);
   await animateDraw(document.getElementById('oppHand'),1,'opp',{uids:[next.uid],previousHand,durationScale:1/rate,signal:abort.signal});
   if(token!==actionId)break;p.deck.pop();render();if(abort.signal.aborted)break;
  }}finally{if(token===actionId){busy=false;action=undefined;notify();requestAnimationFrame(focusRect);}}
 }
 function message(e:MessageEvent){if(e.origin!==location.origin||e.source!==parent)return;const data=e.data;
  if(opponentMode&&data?.type==='gacha-opponent-density'){
   if(typeof data.zoom!=='number'||!Number.isFinite(data.zoom)||data.zoom<.25||data.zoom>3)return;
   if(Math.abs(displayZoom-data.zoom)>.001){
    displayZoom=data.zoom;window.dispatchEvent(new Event('lore:render-density'));
   }return;
  }
  if(opponentMode&&data?.type==='gacha-opponent-config'){if(![data.deck,data.grave,data.hand].every(n=>Number.isInteger(n)&&n>=0&&n<=40))return;cancel();if([0,1,2].includes(data.set))selected=data.set;counts={deck:data.deck,grave:data.grave,hand:data.hand};playing=!!data.playing;rate=[.25,.5,1].includes(data.speed)?data.speed:1;focus=data.focus;show();return;}
  if(opponentMode&&data?.type==='gacha-opponent-motion'){playing=!!data.playing;rate=[.25,.5,1].includes(data.speed)?data.speed:1;return;}
  if(opponentMode&&data?.type==='gacha-opponent-draw'&&[1,3].includes(data.count)){void draw(data.count);return;}
  if(opponentMode&&data?.type==='gacha-opponent-focus'&&['all','deck','grave','hand'].includes(data.focus)){focus=data.focus;window.dispatchEvent(new Event('lore:render-density'));requestAnimationFrame(focusRect);return;}
  if(data?.type==='gacha-atelier-reset'){cancel();clock.value=0;window.dispatchEvent(new Event('lore:layout'));return;}if(data?.type!=='gacha-atelier-state'||![0,1,2].includes(data.set)||!['self','opponent','both'].includes(data.side))return;const rebuild=selected!==data.set||side!==data.side||stock!==!!data.stock;selected=data.set;side=data.side;playing=!!data.playing;rate=[.25,.5,1].includes(data.speed)?data.speed:1;stock=!!data.stock;if(rebuild){cancel();clock.value=0;show();}}
 window.addEventListener('message',message);show();parent.postMessage({type:'gacha-atelier-ready'},location.origin);
 let cleaned=false;
 function dispose(){if(cleaned)return;cleaned=true;cancel();window.removeEventListener('message',message);clearMonsterStates(root);stop();ctl.destroy();unregister();adapter.dispose();}
 Object.assign(window,{gachaBoard:{info:()=>({selected,side,playing,stock,time:clock.value,revision:runtime.revision,displayZoom,pixelRatio:adapter.pixelRatio,antialiasSamples:adapter.antialiasSamples,busy,deck:g.players[1].deck.length,grave:g.players[1].discard.length,hand:g.players[1].hand.length}),controller:ctl,dispose}});
 window.addEventListener('pagehide',dispose,{once:true});
}
