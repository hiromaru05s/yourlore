import '../../styles/tokens.css';import '../../styles/base.css';import '../../styles/card.css';import '../../styles/game-overlays.css';import '../../styles/game.css';import '../../styles/screens.css';import '../../styles/mobile.css';import '../../styles/reading-board.css';import '../../styles/presentation.css';import '../../styles/dice.css';
import {BaseController} from '../../game/controller';
import {createGame,reduce} from '../../shared/engine';
import {DB} from '../../shared/cards';
import type {Action,Side,GameState} from '../../shared/types';
import {setMyAvatar,setOppAvatar} from '../../ui/boardView';
import {startBoardLayout} from '../../ui/layout';
import {waitForDuel} from '../../ui/duelReadiness';
import {clearMonsterStates} from '../../ui/monster/runtime';
import {setLang} from '../../i18n';
if(!import.meta.env.DEV)throw Error('Development fixture only');
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
const root=document.querySelector<HTMLElement>('#app')!;
const query=new URLSearchParams(location.search),side=(Number(query.get('side'))===1?1:0) as Side,roll=Number(query.get('roll')||6),count=Number(query.get('count')||3);
let before:GameState|undefined;
for(let seed=1;seed<100;seed++){
 const g=createGame({mode:'online',seed,starting:0,p0:{id:'a',name:'YOU'},p1:{id:'b',name:'OPPONENT'}}).state;
 g.phase='main';g.turn=3;g.pending=null;g.cur=side;
 for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],removed:[],field:[],enchants:[],traps:[],quests:[],hp:28,maxHp:200,mana:40,maxMana:40,tribesFired:['마족:2','마족:3','마족:4']});
 g.players[side].field=['TDE1','TDE2','TDE3','TDE4'].slice(0,4-count).map((id,i)=>({...structuredClone(DB[id]),uid:`initial-${i}`,exhausted:false,summonedTurn:0,tempAtk:0,atkMod:0,defMod:0,dmg:0}));
 g.players[side].hand=[{...DB.FORBIDDEN,uid:'forbidden-source'}];
 const result=reduce(g,{type:'play',idx:0});if(result.events.some(e=>e.type==='dice'&&e.source.id==='FORBIDDEN'&&e.rolls[0]===roll)){before=g;break;}
}
if(!before)throw Error('Fixture not found');
class RuntimeController extends BaseController{
 protected get useTurnClock(){return false;}
 protected submit(action:Action){this.applyResult(reduce(this.state,action));}
 async init(g:GameState){this.state=g;await this.view.render(g);clearMonsterStates(root);this.view.setHandOpen(true);await waitForDuel(root);}
 async play(){const result=reduce(this.state,{type:'play',idx:0});this.applyResult(result);await (this as unknown as {queue:Promise<void>}).queue;return result;}
 skip(){this.fastForward();}
}
const stopLayout=startBoardLayout(),controller=new RuntimeController(root,0,{onHome(){},onRematch(){}});
await controller.init(before);
const control=document.createElement('button');control.textContent='禁断の術式 03 を再生';control.style.cssText='position:fixed;right:12px;top:8px;z-index:500;padding:8px 16px';document.body.append(control);
let playing=false;const play=async()=>{if(playing)return;playing=true;control.disabled=true;try{return await controller.play();}finally{playing=false;control.disabled=false;}};control.onclick=()=>void play();
Object.assign(window,{forbiddenRuntime:{ready:true,side,roll,count,play,skip:()=>controller.skip(),get playing(){return playing;}}});
window.addEventListener('pagehide',()=>{controller.destroy();stopLayout();},{once:true});
