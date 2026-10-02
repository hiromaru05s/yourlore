import '../../styles/tokens.css';import '../../styles/base.css';import '../../styles/card.css';import '../../styles/game-overlays.css';import '../../styles/game.css';import '../../styles/screens.css';import '../../styles/reading-board.css';import '../../styles/presentation.css';
import {BaseController} from '../../game/controller';
import {createGame,reduce} from '../../shared/engine';
import {DB} from '../../shared/cards';
import type {Action,Side,CardInst,FieldMon} from '../../shared/types';
import {startBoardLayout} from '../../ui/layout';
import {waitForDuel} from '../../ui/duelReadiness';
import {setLang} from '../../i18n';
import {setFxSkip,summonFromHand} from '../../ui/anim';
import {setMyAvatar,setOppAvatar} from '../../ui/boardView';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
const style=document.createElement('style');style.textContent='body{margin:0;overflow:hidden}.topbar,.help-fab,.mute-fab{display:none!important}';document.head.append(style);
const card=(id:string,uid:string):CardInst=>({...DB[id],uid});
const mon=(id:string,uid:string):FieldMon=>({...card(id,uid),dmg:0,exhausted:false,summonedTurn:0,tempAtk:0,atkMod:0,defMod:0}) as FieldMon;
class Harness extends BaseController {
 protected submit(_action:Action){}
 async reset(id:string,side:Side){
  setFxSkip(false);
  const g=createGame({mode:'bot',seed:71,starting:side,p0:{id:'qa-me',name:'YOU'},p1:{id:'qa-opp',name:'OPPONENT'}}).state;
  g.turn=3;g.cur=side;g.pending=null;g.opening=undefined;g.phase='main';
  for(const [i,p]of g.players.entries()){
   p.openingDrawReady=false;p.mana=40;p.maxMana=40;p.field=[mon('ELF',`ally-${i}`)];p.enchants=[];p.quests=[];p.traps=[];p.hand=[card(id,`mimic-${i}`)];p.discard=[];
   p.removed=Array.from({length:16},(_,n)=>card('MIMIC',`removed-${i}-${n}`));
  }
  this.state=g;this.view.render(g);this.view.setHandOpen(false);await waitForDuel(document.querySelector('#app')!);
 }
 async play(id:string,side:Side,route='engine'){
  await this.reset(id,side);
  if(route==='hand'){
   const c=this.state.players[side].hand[0];this.state.players[side].hand=[];this.state.players[side].field.push(mon(id,c.uid));this.view.render(this.state);await waitForDuel(document.querySelector('#app')!);await summonFromHand(c,c.uid,side===0?'me':'opp');return;
  }
  const result=reduce(this.state,{type:'play',idx:0});
  if(!result.events.some(e=>e.type==='summon'))throw new Error('Fixture failed to summon '+id);
  this.applyResult(result);
  await (this as unknown as {queue:Promise<void>}).queue;
  return result.events.filter(e=>e.type==='summon');
 }
}
const controller=new Harness(document.querySelector('#app')!,0,{onHome(){},onRematch(){}});const stop=startBoardLayout();
(window as any).mimicQA={controller,play:(id:string,side:Side,route?:string)=>controller.play(id,side,route),skip:()=>setFxSkip(true),dispose:()=>{controller.destroy();stop();},ready:false};
await controller.reset('MIMIC_KING',0);(window as any).mimicQA.ready=true;
