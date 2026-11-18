import '../styles/fonts.css';
import '../styles/reading-board.css';
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/game-overlays.css';
import '../styles/game.css';
import '../styles/dice.css';
import '../styles/screens.css';
import '../styles/mobile.css';
import '../styles/duel-opening.css';
import '../styles/lounge.css';
import '../styles/loungeGame.css';
import '../styles/loungeStage.css';
import '../styles/presentation.css';
import '../styles/deckWorkspace.css';
import '../styles/cardsWorkspace.css';
import '../styles/menuApproved.css';
import '../styles/menuWorkspace.css';
import '../styles/popupSilver.css';
import '../styles/defaultUI.css';
import '../styles/defaultButtons.css';
import '../styles/deckLayout.css';
import '../styles/deckActions.css';
import '../styles/deckLibrary.css';
import './attackTargetPreview.css';
import {BaseController} from '../game/controller';
import {createGame,reduce} from '../shared/engine';
import {DB} from '../shared/cards';
import type {Action,FieldMon} from '../shared/types';
import {setLang} from '../i18n';
import {startBoardLayout} from '../ui/layout';
import {createAttackAim} from '../ui/attackAim';
import {highlightAttackTarget,highlightAttackSource,prepareAttackTarget} from '../ui/attackTarget';

setLang('ja');
class PreviewController extends BaseController {
  protected get useTurnClock(){return false;}
  submit(action:Action){stopDemo();this.applyResult(reduce(this.state,action),false);}
  reset(){
    const g=createGame({mode:'bot',seed:71,starting:0,p0:{id:'preview-self',name:'自分'},p1:{id:'preview-opponent',name:'相手'}}).state;
    g.pending=null;g.turn=4;g.phase='main';
    const mon=(id:string,uid:string):FieldMon=>({...DB[id],uid,atk:DB[id].atk!,def:DB[id].def!,exhausted:false,summonedTurn:0,dmg:0,tempAtk:0,atkMod:0,defMod:0}) as FieldMon;
    g.players.forEach((p,i)=>Object.assign(p,{openingDrawReady:false,field:i?[mon('M1','target-left'),mon('M2','target-center'),mon('ELF','target-right')]:[mon('M4','attacker'),mon('ELF','ally')],hand:[],enchants:[],traps:[],quests:[],hp:40,maxHp:40,mana:8,maxMana:8}));
    this.state=g;this.introShown=true;this.view.render(g);
    document.getElementById('app')!.classList.remove('opening-pending');
  }
}
const controller=new PreviewController(document.getElementById('app')!,0,{onHome(){},onRematch(){}});
const stopLayout=startBoardLayout();
const panel=document.createElement('aside');panel.className='attack-preview-controls lore-surface';
panel.innerHTML='<strong>攻撃ドラッグ · 青い起点と進行方向</strong><p>手前のモンスターから相手へドラッグして確認できます。</p><output role="status">青く光る攻撃元から、矢じりの光が赤い対象へ流れます。</output><div><button class="btn" id="preview-demo" aria-pressed="true">選択表示</button><button class="btn" id="preview-replay">浮上を再生</button><button class="btn" id="preview-reset">盤面を戻す</button></div>';
document.body.append(panel);
let demo:ReturnType<typeof createAttackAim>|null=null,locked:HTMLElement|null=null,releaseDemo:((immediate?:boolean)=>void)|null=null,releaseSource:((immediate?:boolean)=>void)|null=null;
function stopDemo(immediate=true){
  releaseDemo?.(immediate);releaseDemo=null;releaseSource?.(immediate);releaseSource=null;
  demo?.remove();demo=null;locked?.classList.remove('is-atk-target');locked=null;
  document.querySelector('#meRow .is-aiming')?.classList.remove('is-aiming');
  document.getElementById('preview-demo')!.setAttribute('aria-pressed','false');
}
function startDemo(){
  stopDemo();
  locked=document.querySelector<HTMLElement>('#oppRow [data-uid="target-center"]');
  locked?.classList.add('is-atk-target');
  if(locked)releaseDemo=highlightAttackTarget(locked);
  const source=document.querySelector<HTMLElement>('#meRow [data-uid="attacker"]');
  source?.classList.add('is-aiming');if(source)releaseSource=highlightAttackSource(source);
  demo=createAttackAim(()=>{
    const a=document.querySelector('#meRow [data-uid="attacker"]')?.getBoundingClientRect(),b=locked?.getBoundingClientRect();
    return a&&b?{x:a.left+a.width/2,y:a.top+a.height*.045,sourceWidth:a.width,tx:b.left+b.width/2,ty:b.top+b.height/2,valid:true,blocked:false}:null;
  });
  document.getElementById('preview-demo')!.setAttribute('aria-pressed','true');
}
document.getElementById('preview-demo')!.onclick=()=>demo?stopDemo(false):startDemo();
document.getElementById('preview-replay')!.onclick=()=>{stopDemo();requestAnimationFrame(startDemo);};
document.getElementById('preview-reset')!.onclick=()=>{if(document.querySelector('.fx-playing'))return;stopDemo();controller.reset();
for(const card of document.querySelectorAll<HTMLElement>('.zone-mon .card'))void prepareAttackTarget(card);
startDemo();};
document.getElementById('app')!.addEventListener('pointerdown',()=>stopDemo(),true);
controller.reset();
for(const card of document.querySelectorAll<HTMLElement>('.zone-mon .card'))void prepareAttackTarget(card);
startDemo();
Object.assign(window,{attackTargetPreview:{controller,startDemo,stopDemo}});
window.addEventListener('pagehide',()=>{stopDemo();stopLayout();controller.destroy();},{once:true});

const previewUrl=new URL(location.href);previewUrl.searchParams.delete('look');previewUrl.searchParams.set('v','5');history.replaceState(null,'',previewUrl);
