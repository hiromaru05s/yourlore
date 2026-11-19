import "../styles/fonts.css";
import "../styles/reading-board.css";
import "../styles/tokens.css";
import "../styles/base.css";
import "../styles/card.css";
import "../styles/game-overlays.css";
import "../styles/game.css";
import "../styles/dice.css";
import "../styles/screens.css";
import "../styles/mobile.css";
import "../styles/duel-opening.css";
import "../styles/lounge.css";
import "../styles/loungeGame.css";
import "../styles/loungeStage.css";
import "../styles/presentation.css";
import "../styles/deckWorkspace.css";
import "../styles/cardsWorkspace.css";
import "../styles/menuApproved.css";
import "../styles/menuWorkspace.css";
import "../styles/popupSilver.css";
import "../styles/defaultUI.css";
import "../styles/defaultButtons.css";
import "../styles/deckLayout.css";
import "../styles/deckActions.css";
import "../styles/deckLibrary.css";
import {BaseController} from '../game/controller';
import {createGame} from '../shared/engine';
import {DB} from '../shared/cards';
import type {Action, FieldMon} from '../shared/types';
import {setLang} from '../i18n';
import {startBoardLayout} from '../ui/layout';
import {setMyAvatar,setOppAvatar} from '../ui/boardView';
setLang('ja'); setMyAvatar('SEEKER_RED');setOppAvatar('SEEKER_BLUE');
const params=new URLSearchParams(location.search);
let count=Math.min(7,Math.max(1,Number(params.get('count')||7)));
class PreviewController extends BaseController {
 protected get useTurnClock(){return false;}
 submit(_action:Action){}
 reset(){
  const g=createGame({mode:'bot',seed:71,starting:0,p0:{id:'preview-self',name:'自分のネームタグ'},p1:{id:'preview-opponent',name:'相手のネームタグ'}}).state;
  g.pending=null;g.turn=6;g.phase='main';g.duelProfiles=[{level:27},{level:48}];
  const mon=(id:string,uid:string):FieldMon=>({...DB[id],uid,atk:DB[id].atk!,def:DB[id].def!,exhausted:true,summonedTurn:0,dmg:0,tempAtk:0,atkMod:0,defMod:0}) as FieldMon;
  const enchants=Object.values(DB).filter(c=>c.ench);
  g.players.forEach((p,i)=>Object.assign(p,{openingDrawReady:false,field:['M1','M2','ELF'].map((id,j)=>mon(id,`mon-${i}-${j}`)),hand:['ELF','ND2','M4','NHEAL'].map((id,j)=>({...DB[id],uid:`hand-${i}-${j}`})),enchants:Array.from({length:Math.max(0,count-2)},(_,j)=>({card:{...enchants[j%enchants.length],uid:`enchant-${i}-${j}`},turns:enchants[j%enchants.length].val ?? 99,bornTurn:2})),traps:[],quests:['Q_RIFT','Q_WINTER'].slice(0,Math.min(count,2)).map((id,j)=>({card:{...DB[id],uid:`quest-${i}-${j}`},progress:2,startedTurn:1})),hp:40,maxHp:40,mana:5,maxMana:8}));
  this.state=g;this.introShown=true;this.view.render(g);
  document.getElementById('app')!.classList.remove('opening-pending');
 }
}
const controller=new PreviewController(document.getElementById('app')!,0,{onHome(){},onRematch(){}});
const stop=startBoardLayout();controller.reset();
const style=document.createElement('style');style.textContent='body.hide-names .pt-name{visibility:hidden!important}';document.head.append(style);
window.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='n')document.body.classList.toggle('hide-names');if(e.key==='7'||e.key==='4'){count=e.key==='7'?7:4;controller.reset();}});
Object.assign(window,{nameplateBoard:{controller,setCount(n:number){count=Math.min(7,Math.max(1,n));controller.reset();}}});
window.addEventListener('pagehide',()=>{stop();controller.destroy();},{once:true});
