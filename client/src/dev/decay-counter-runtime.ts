// Development only: real reducer -> controller event playback -> selected runtime.
import '../styles/tokens.css';import '../styles/base.css';import '../styles/card.css';import '../styles/game-overlays.css';import '../styles/game.css';import '../styles/screens.css';import '../styles/reading-board.css';import '../styles/presentation.css';import '../styles/passives.css';
import {BaseController} from '../game/controller';import {setMyAvatar,setOppAvatar} from '../ui/boardView';
import {startBoardLayout} from '../ui/layout';import {waitForDuel} from '../ui/duelReadiness';import {setFxSkip,decayCounterGrant} from '../ui/anim';
import {createGame,reduce} from '../shared/engine';import {DB} from '../shared/cards';import {setLang} from '../i18n';import type {Action,Side,FieldMon,GameEvent} from '../shared/types';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');document.body.style.cssText='margin:0;overflow:hidden;background:#f2eee8';
const root=document.getElementById('app')!;
const mon=(id:string,uid:string,mods:Partial<FieldMon>={}):FieldMon=>({...DB[id],uid,exhausted:false,summonedTurn:0,dmg:0,tempAtk:0,atkMod:0,defMod:0,...mods});
class QAController extends BaseController {
 events:GameEvent[]=[];side:Side=0;
 protected submit(action:Action){this.applyResult(reduce(this.state,action));}
 setup(side:Side=0,before=0,ward=false){
  this.side=side;this.introShown=true;setFxSkip(false);
  const g=createGame({mode:'online',seed:71,starting:0,p0:{id:'qa-self',name:'YOU'},p1:{id:'qa-opp',name:'OPPONENT'}}).state;
  g.turn=4;g.cur=(1-side) as Side;g.pending=null;g.phase='main';g.opening=undefined;
  for(const [i,p] of g.players.entries()){p.openingDrawReady=false;p.mana=12;p.maxMana=12;p.hp=50;p.dew=0;p.enchants=[];p.quests=[];p.traps=[];p.hand=[];
   p.field=[mon('ELF',`left-${i}`),mon(ward&&i===side?'VAMP1':'M4',`target-${i}`,{decayCnt:i===side?before:0}),mon('SOLDIER2',`right-${i}`)];}
  if(ward)g.players[side].enchants=[{card:{...DB.VAMP_WARD,uid:'ward'},turns:99}];
  this.state=g;this.view.render(g);this.view.setHandOpen(false);return g;
 }
 run(){const g=this.state;g.pending={kind:'oppMon',hint:'',hintJa:'',reason:'decayMark',allowCancel:false,data:{val:1}};const r=reduce(g,{type:'pick',uid:`target-${this.side}`});this.events=r.events;this.applyResult(r);return (this as unknown as {queue:Promise<void>}).queue;}
 get snapshot(){return this.state;}
}
const controller=new QAController(root,0,{onHome(){},onRematch(){}});let ready=false;
const qa={get ready(){return ready},get events(){return controller.events},get state(){return controller.snapshot},setup:(side:Side=0,before=0,ward=false)=>controller.setup(side,before,ward),run:()=>controller.run(),skip:()=>setFxSkip(true),dispose:()=>controller.destroy(),
 async concurrent(){await Promise.all(Array.from(root.querySelectorAll<HTMLElement>('#meRow .zone-mon .card')).map(node=>decayCounterGrant(node,0,2)));}};
(window as unknown as {decayCounterQA:typeof qa}).decayCounterQA=qa;
controller.setup();startBoardLayout();void waitForDuel(root).then(()=>{ready=true;});
