import '../../styles/tokens.css';import '../../styles/base.css';import '../../styles/card.css';import '../../styles/game-overlays.css';import '../../styles/game.css';import '../../styles/screens.css';import '../../styles/reading-board.css';import '../../styles/presentation.css';
import {BaseController} from '../../game/controller';
import {createGame,reduce} from '../../shared/engine';import {DB} from '../../shared/cards';
import type {Action,Side,GameState,ReduceResult} from '../../shared/types';
import {setLang} from '../../i18n';import {startBoardLayout} from '../../ui/layout';import {waitForDuel} from '../../ui/duelReadiness';import {setFxSkip} from '../../ui/anim';
setLang('ja');
const root=document.getElementById('app')!;
class Fixture extends BaseController{
 protected submit(_action:Action){}
 protected get useTurnClock(){return false;}
 load(state:GameState){this.state=state;this.view.render(state);}
 async play(res:ReduceResult){const prev=this.state;this.state=res.state;setFxSkip(false);await (this as unknown as {playEvents(prev:GameState,res:ReduceResult,discards:Set<string>):Promise<void>}).playEvents(prev,res,new Set());}
}
let controller=new Fixture(root,0,{onHome(){},onRematch(){}});const stop=startBoardLayout();let ready=false,result!:ReduceResult,events:unknown[]=[];
const mon=(id:string,uid:string)=>({...structuredClone(DB[id]),uid,exhausted:false,summonedTurn:0,tempAtk:0,atkMod:0,defMod:0,dmg:0});
async function setup(id='DRAGON_RIDER',side:Side=0,auto=false){
 const state=createGame({mode:'online',seed:71,starting:0,p0:{id:'self',name:'YOU'},p1:{id:'opp',name:'OPP'}}).state;state.turn=3;state.phase='main';state.pending=null;state.cur=side;
 for(const p of state.players)Object.assign(p,{openingDrawReady:false,mana:30,maxMana:30,hp:100,deck:[],hand:[],discard:[],removed:[],field:[],traps:[],enchants:[],quests:[]});
 const p=state.players[side];p.field=[mon('M4','neighbor-left'),mon('GM6_0','dragon'),mon(id==='ANTIQUE_DK'?'INFKNIGHT':'SOLDIER2','mate'),mon('TDE2','neighbor-right')];
 if(auto){p.field.splice(1,1);p.hand=[{...DB.GM6_0,uid:'dragon'}];result=reduce(state,{type:'play',idx:0});}
 else{state.pending={kind:'giantShop',reason:'dragonFuse',allowCancel:false,hint:'Fusion',hintJa:'融合',data:{ids:['DRAGON_RIDER','ANTIQUE_DK'],free:true,dragonUid:'dragon',soldierUid:'mate',knightUid:'mate'}};result=reduce(state,{type:'pick',uid:id});}
 controller.load(state);events=result.events;await waitForDuel(root);ready=true;
}
(window as any).fusionRuntime={setup,play:()=>controller.play(result),skip:()=>setFxSkip(true),destroy:()=>controller.destroy(),get state(){return{ready,events,expected:result.state.players.map(p=>p.field.map(m=>m.id)),canvases:document.querySelectorAll('.dragon-fusion-summon').length};}};
window.addEventListener('pagehide',()=>{controller.destroy();stop();},{once:true});void setup();
