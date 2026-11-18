import '../../styles/tokens.css';import '../../styles/base.css';import '../../styles/card.css';import '../../styles/game-overlays.css';import '../../styles/game.css';import '../../styles/screens.css';import '../../styles/reading-board.css';import '../../styles/presentation.css';
import {BaseController} from '../../game/controller';
import {createGame,reduce} from '../../shared/engine';
import {DB,STARTERS} from '../../shared/cards';
import type {Action,Side} from '../../shared/types';
import {setMyAvatar,setOppAvatar} from '../../ui/boardView';
import {startBoardLayout} from '../../ui/layout';
import {waitForDuel} from '../../ui/duelReadiness';
import {setLang} from '../../i18n';


setLang('ja');setMyAvatar('SEEKER_HOODED');setOppAvatar('SEEKER_HOODED');
const root=document.querySelector<HTMLElement>('#app')!;
let plays=0,side:Side=0;
class Preview extends BaseController{
  constructor(){super(root,side,{onHome(){},onRematch(){}});this.introShown=true;this.reset();}
  protected submit(a:Action){if(a.type==='play')plays++;this.applyResult(reduce(this.state,a));}
  protected get useTurnClock(){return false;}
  reset(){
    const g=createGame({mode:'bot',seed:71,starting:side,p0:{id:'preview-self',name:'シーカー'},p1:{id:'preview-opp',name:'シーカー'}}).state;
    g.turn=5;g.cur=side;g.phase='main';g.pending=null;g.opening=undefined;
    for(const [i,p] of g.players.entries()){
      p.openingDrawReady=false;p.mana=12;p.maxMana=12;p.hp=i===side?30:26;p.enchants=[];p.quests=[];p.traps=[];
      p.field=['ELF','GM6_0'].map((id,j)=>({...DB[id],uid:`field-${i}-${j}`,exhausted:false,summonedTurn:0,tempAtk:0,atkMod:0,defMod:0,dmg:0}));
      p.hand=[DB.M4,DB.ND2,STARTERS.STARTER_MANA,DB.ELF].map((c,j)=>({...c,uid:`hand-${i}-${j}`}));
      p.discard=[{...DB.ELF,uid:`discard-${i}`}];p.removed=[];
    }
    this.state=g;root.classList.remove('opening-pending');this.view.render(g);this.view.setHandOpen(true);
  }
  blocked(value:boolean){this.state.players[side].mana=value?0:12;this.view.render(this.state);this.view.setHandOpen(true);}
  getState(){return this.state;}
}
const controller=new Preview(),stopLayout=startBoardLayout();
await waitForDuel(root);
(window as any).playReadyQA={ready:true,get plays(){return plays;},reset:()=>controller.reset(),blocked:(value:boolean)=>controller.blocked(value),state:()=>controller.getState(),destroy:()=>controller.destroy()};
window.addEventListener('pagehide',()=>{stopLayout();controller.destroy();},{once:true});
