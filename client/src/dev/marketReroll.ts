import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/game-overlays.css';
import '../styles/game.css';
import '../styles/dice.css';
import '../styles/screens.css';
import '../styles/mobile.css';
import '../styles/duel-opening.css';
import '../styles/presentation.css';
import '../styles/reading-board.css';
import {BaseController} from '../game/controller';
import {createGame,reduce} from '../shared/engine';
import {DB,STARTERS} from '../shared/cards';
import type {Action,Side} from '../shared/types';
import {setLang} from '../i18n';
import {startBoardLayout} from '../ui/layout';
import {captureSupplyFaces,playSupplyRefresh} from '../ui/marketRefresh';
import {prepareStateArtwork} from '../ui/stateArtwork';

setLang('ja');
let seed=77;
class Preview extends BaseController {
  protected submit(action:Action){this.applyResult(reduce(this.state,action));}
  reset(side:Side=0){
    this.fastForward();
    const g=createGame({mode:'bot',seed:seed++,starting:side,p0:{id:'a',name:'YOU'},p1:{id:'b',name:'OPPONENT'}}).state;
    g.turn=3;g.pending=null;
    for(const [s,p] of g.players.entries())Object.assign(p,{openingDrawReady:false,mana:20,maxMana:20,hand:[STARTERS.STARTER_CHEST,STARTERS.STARTER_MANA,DB.ELF].map((c,i)=>({...c,uid:`hand-${s}-${i}`})),field:[],discard:[],enchants:[],quests:[],traps:[]});
    this.introShown=true;this.applyResult({state:g,events:[]},false);
  }
  async slow(){
    this.fastForward();
    const next=reduce(this.state,{type:'refresh'}).state;
    await prepareStateArtwork(next,this.you,this.view.root);
    const faces=captureSupplyFaces(this.view.root);this.state=next;this.view.render(next);
    const effect=playSupplyRefresh(this.view.root,faces,.3);await effect.done;
  }
}
const preview=new Preview(document.getElementById('app')!,0,{onHome(){},onRematch(){}});
const stop=startBoardLayout();preview.reset();
const toolbar=document.createElement('aside');
toolbar.innerHTML='<strong>提示マーケット · めくり替え</strong><span>棚の ⟳ ボタンでも再生できます</span><div><button data-action="play">リロール</button><button data-action="slow">スロー</button><button data-action="reset">リセット</button><button data-action="theme">白／暗</button></div>';
toolbar.style.cssText='position:fixed;top:12px;left:12px;max-width:calc(100vw - 24px);padding:12px 16px;background:#121a25e8;color:#eee3ce;border:1px solid #8a754f;border-radius:10px;z-index:600;font:12px/1.7 sans-serif;box-sizing:border-box';
const style=document.createElement('style');style.textContent='aside strong,aside span{display:block}aside span{color:#b6b8bf}aside button{margin:6px 6px 0 0;padding:5px 10px;color:#eee3ce;border:1px solid #8a754f;border-radius:5px;background:#263142;cursor:pointer}body.reroll-white #app .game{background:#f4f1e9!important}';document.head.append(style);document.body.append(toolbar);
toolbar.addEventListener('click',async event=>{
  const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if(button?.dataset.action==='play')preview.onRefresh();
  if(button?.dataset.action==='reset')preview.reset();
  if(button?.dataset.action==='theme')document.body.classList.toggle('reroll-white');
  if(button?.dataset.action==='slow'){toolbar.inert=true;try{await preview.slow();}finally{toolbar.inert=false;}}
});
// A local deterministic fixture also exercises the real controller in browser QA.
Object.assign(window,{marketRerollPreview:preview});
window.addEventListener('pagehide',()=>{preview.destroy();stop();},{once:true});
