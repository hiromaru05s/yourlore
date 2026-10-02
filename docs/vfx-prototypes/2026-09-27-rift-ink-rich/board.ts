import '../../../client/src/styles/tokens.css';
import '../../../client/src/styles/base.css';
import '../../../client/src/styles/card.css';
import '../../../client/src/styles/game-overlays.css';
import '../../../client/src/styles/game.css';
import '../../../client/src/styles/screens.css';
import '../../../client/src/styles/reading-board.css';
import '../../../client/src/styles/presentation.css';
import {GameView,setMyAvatar,setOppAvatar} from '../../../client/src/ui/boardView';
import {createGame} from '../../../client/src/shared/engine';
import {DB,STARTERS,FRAME_BACK} from '../../../client/src/shared/cards';
import {startBoardLayout} from '../../../client/src/ui/layout';
import {captureCardSurface} from '../../../client/src/ui/cardSurface';
import {cardEl} from '../../../client/src/ui/cardView';
import {setLang} from '../../../client/src/i18n';
import {RIFT_MOUNT,readingScale} from '../../../client/src/ui/readingBoardLayout';
import {boardPoint} from '../../../client/src/ui/boardProjection';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
const g=createGame({mode:'bot',seed:71,starting:0,p0:{id:'preview-me',name:'YOU'},p1:{id:'preview-opp',name:'OPPONENT'}}).state;
g.turn=3;g.pending=null;
for(const [side,p] of g.players.entries()){
 p.openingDrawReady=false;p.mana=8;p.maxMana=12;p.hp=32;p.enchants=[];p.quests=[];p.hand=[];
 p.discard=[{...DB.ELF,uid:`discard-${side}`}];
 p.field=['M4','ELF','GM6_0'].map((id,i)=>({...DB[id],uid:`rift-${side}-${i}`,exhausted:false,summonedTurn:0,tempAtk:0,atkMod:0,defMod:0,dmg:0}));
 p.hand=[STARTERS.STARTER_CHEST,STARTERS.STARTER_MANA,DB.ND2].map((c,i)=>({...c,uid:`hand-${side}-${i}`}));
}
const noop=()=>{};
const view=new GameView(document.querySelector('#app')!,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
view.render(g);document.querySelector('.help-callout')?.remove();view.setHandOpen(false);const stop=startBoardLayout();
const card=cardEl({...DB.ELF,uid:'rift-texture'});card.style.cssText='position:fixed;left:-3000px;top:0;width:160px;height:240px;--cw:160px;--ch:240px;transform:none;pointer-events:none';document.body.append(card);
const ready=(async()=>{await document.fonts.ready;await Promise.all(Array.from(card.querySelectorAll('img')).map(i=>i.decode().catch(()=>{})));const s=await captureCardSurface(card,FRAME_BACK,true);card.remove();const src=s.face||s.back;const face=document.createElement('canvas');face.width=512;face.height=768;face.getContext('2d')!.drawImage(src,0,0,512,768);return face;})();
function nodes(side:'me'|'opp'){return document.querySelector<HTMLElement>(`.card[data-uid="rift-${side==='me'?0:1}-1"]`)!;}
function restore(){for(const side of ['me','opp'] as const)nodes(side).style.visibility='';}
(window as any).riftBoard={ready,sample(side:'me'|'opp'){const n=nodes(side),r=n.getBoundingClientRect();const s=readingScale(),sink=boardPoint(innerWidth/2+RIFT_MOUNT.x*s,innerHeight/2+(side==='me'?1:-1)*RIFT_MOUNT.z*s,RIFT_MOUNT.height*s);return {source:{x:r.left+r.width/2,y:r.top+r.height/2},sink,width:r.width*1.12,heightRatio:r.height/r.width};},hide(side:'me'|'opp'){restore();nodes(side).style.visibility='hidden';},restore};
window.addEventListener('pagehide',()=>{restore();stop();view.destroy();},{once:true});
