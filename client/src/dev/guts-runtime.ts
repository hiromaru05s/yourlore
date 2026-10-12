// Development-only: actual reducer -> BaseController -> attack contact -> selected renderer.
import '../styles/tokens.css';import '../styles/base.css';import '../styles/card.css';import '../styles/game-overlays.css';import '../styles/game.css';import '../styles/screens.css';import '../styles/reading-board.css';import '../styles/presentation.css';
import {BaseController} from '../game/controller';import {setMyAvatar,setOppAvatar} from '../ui/boardView';
import {startBoardLayout} from '../ui/layout';import {waitForDuel} from '../ui/duelReadiness';import {setFxSkip,gutsSurvive} from '../ui/anim';
import {createGame,reduce} from '../shared/engine';import {DB} from '../shared/cards';import {setLang} from '../i18n';import type {Action,Side,FieldMon,GameEvent} from '../shared/types';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');document.body.style.cssText='margin:0;overflow:hidden;background:#f2eee8';
const root=document.getElementById('app')!;
const mon=(id:string,uid:string,mods:Partial<FieldMon>={}):FieldMon=>({...DB[id],uid,exhausted:false,summonedTurn:0,dmg:0,tempAtk:0,atkMod:0,defMod:0,...mods});
class QAController extends BaseController {
 events:GameEvent[]=[];side:Side=0;mode='normal';
 protected submit(action:Action){this.applyResult(reduce(this.state,action));}
 setup(side:Side=0,mode='normal',count=2){
  this.side=side;this.mode=mode;this.introShown=true;setFxSkip(false);
  const g=createGame({mode:'online',seed:71,starting:0,p0:{id:'qa-self',name:'YOU'},p1:{id:'qa-opp',name:'OPPONENT'}}).state;
  g.turn=4;g.cur=(1-side) as Side;g.pending=null;g.phase='main';g.opening=undefined;
  for(const [i,p] of g.players.entries()){p.openingDrawReady=false;p.mana=12;p.maxMana=12;p.hp=50;p.dew=0;p.enchants=[];p.quests=[];p.traps=[];p.hand=[];
   p.field=[mon('ELF',`left-${i}`),mon(i===side?'NWL3':'MANA_GIANT',`target-${i}`,i===side?{def:9,guts:count,aura:undefined}:{atk:20,def:30}),mon('SOLDIER2',`right-${i}`)];}
  if(mode==='counter'){Object.assign(g.players[side].field[1],{passive:['counter'],atk:40,def:40,guts:0});Object.assign(g.players[1-side].field[1],{def:9,guts:count,passivesG:['guts'],atk:1});}
  if(mode==='immune')g.players[side].field[1].immuneDamageTurn=g.turn;
  this.state=g;this.view.render(g);this.view.setHandOpen(false);return g;
 }
 run(){const g=this.state,a=g.players[g.cur].field[1],target=g.players[this.side].field[1];let r=reduce(g,{type:'attack',uid:a.uid});if(r.state.pending?.reason==='attack')r=reduce(r.state,{type:'chooseTarget',uid:target.uid});this.events=r.events;this.applyResult(r);return (this as unknown as {queue:Promise<void>}).queue;}
 get snapshot(){return this.state;}
}
let controller=new QAController(root,0,{onHome(){},onRematch(){}}),ready=false;
const qa={get ready(){return ready},get events(){return controller.events},get state(){return controller.snapshot},setup:(side:Side=0,mode='normal',count=2)=>controller.setup(side,mode,count),run:()=>controller.run(),skip:()=>setFxSkip(true),dispose:()=>controller.destroy(),
 async concurrent(){const g=controller.snapshot;await Promise.all(g.players[0].field.map(m=>gutsSurvive({player:0,uid:m.uid,before:2,after:1})));}};
(window as unknown as {gutsQA:typeof qa}).gutsQA=qa;
controller.setup();startBoardLayout();void waitForDuel(root).then(()=>{ready=true;});
