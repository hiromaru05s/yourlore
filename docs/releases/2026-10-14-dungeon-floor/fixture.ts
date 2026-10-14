import '../../../client/src/styles/reading-board.css';
import '../../../client/src/styles/tokens.css';import '../../../client/src/styles/base.css';import '../../../client/src/styles/card.css';import '../../../client/src/styles/game-overlays.css';import '../../../client/src/styles/game.css';import '../../../client/src/styles/screens.css';import '../../../client/src/styles/dice.css';import '../../../client/src/styles/mobile.css';import '../../../client/src/styles/duel-opening.css';import '../../../client/src/styles/presentation.css';
import {BaseController} from '../../../client/src/game/controller';
import {createGame,reduce} from '../../../client/src/shared/engine';
import {DB} from '../../../client/src/shared/cards';
import {startBoardLayout} from '../../../client/src/ui/layout';
import {waitForDuel} from '../../../client/src/ui/duelReadiness';
import {setFxSkip} from '../../../client/src/ui/anim';
import {setLang} from '../../../client/src/i18n';
import type {Action,GameState,ReduceResult,Side} from '../../../client/src/shared/types';
import {Stage} from '../../../client/src/ui/dungeonFloor/stage';
let frames:{time:number;side:number|undefined;actors:number;opacity:number;yaw:number;minForward:number}[]=[];
const originalDraw=Stage.prototype.draw;
Stage.prototype.draw=function(state){originalDraw.call(this,state);const info=this.info;frames.push({time:state.time,side:state.side,actors:info.actors,opacity:info.gate.opacity,yaw:info.gate.yaw,minForward:info.minForward});};
setLang('ja');
class Fixture extends BaseController {
 protected submit(_action:Action){}
 protected get useTurnClock(){return false;}
 show(state:GameState){this.state=state;this.view.render(state);this.view.setHandOpen(true);}
 async play(before:GameState,result:ReduceResult){this.state=result.state;await (this as unknown as {playEvents(a:GameState,b:ReduceResult,c:Set<string>):Promise<void>}).playEvents(before,result,new Set());}
}
const app=document.querySelector<HTMLElement>('#app')!,stop=startBoardLayout();
const controller=new Fixture(app,0,{onHome(){},onRematch(){}});
let before:GameState,result:ReduceResult,ready=false,playing=false,done=false;
async function setup(side:Side=0,roll=4,slots=7){
 setFxSkip(true);
 for(let seed=1;seed<300;seed++){
  const g=createGame({mode:'bot',seed,starting:side,p0:{id:'a',name:'YOU'},p1:{id:'b',name:'OPPONENT'}}).state;
  g.opening=undefined;g.turn=5;g.cur=side;g.phase='main';g.pending=null;
  for(const [i,p]of g.players.entries()){p.openingDrawReady=false;p.mana=p.maxMana=10;p.enchants=[];p.quests=[];p.traps=[];p.field=i===side?Array.from({length:7-slots},(_,j)=>({...DB.M4,uid:`old-${j}`,exhausted:false,summonedTurn:0,tempAtk:0,atkMod:0,defMod:0,dmg:0})):[];p.hand=i===side?[{...DB.DUNGEON_FLOOR,uid:'floor-source'}]:[];}
  const r=reduce(g,{type:'play',idx:0}),dice=r.events.find(e=>e.type==='dice');
  if(dice?.type==='dice'&&dice.rolls[0]===roll){before=g;result=r;break;}
 }
 controller.show(before);await waitForDuel(app);setFxSkip(false);ready=true;done=false;frames=[];
}
async function play(){playing=true;done=false;await controller.play(before,result);playing=false;done=true;}
Object.assign(window,{floorRuntimeQA:{setup,play,skip:()=>setFxSkip(true),get state(){return{ready,playing,done,frames,events:result?.events};}}});
window.addEventListener('pagehide',()=>{setFxSkip(true);stop();controller.destroy();});
void setup();
