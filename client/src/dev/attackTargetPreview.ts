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
panel.innerHTML='<strong>攻撃対象のハイライト · 2案</strong><p>手前のモンスターから相手へドラッグして確認できます。</p><div class="attack-preview-looks"><button class="btn" id="preview-silver" aria-pressed="true">① 銀白</button><button class="btn" id="preview-gold" aria-pressed="false">② シャンパン</button></div><output role="status"></output><div><button class="btn" id="preview-demo" aria-pressed="true">選択表示</button><button class="btn" id="preview-reset">盤面を戻す</button></div>';
document.body.append(panel);
let demo:ReturnType<typeof createAttackAim>|null=null,locked:HTMLElement|null=null;
const status=panel.querySelector('output')!;
function stopDemo(){
  demo?.remove();demo=null;locked?.classList.remove('is-atk-target');locked=null;
  document.querySelector('#meRow .is-aiming')?.classList.remove('is-aiming');
  document.getElementById('preview-demo')!.setAttribute('aria-pressed','false');
}
function startDemo(){
  stopDemo();
  locked=document.querySelector<HTMLElement>('#oppRow [data-uid="target-center"]');
  locked?.classList.add('is-atk-target');
  document.querySelector('#meRow [data-uid="attacker"]')?.classList.add('is-aiming');
  demo=createAttackAim(()=>{
    const a=document.querySelector('#meRow [data-uid="attacker"]')?.getBoundingClientRect(),b=locked?.getBoundingClientRect();
    return a&&b?{x:a.left+a.width/2,y:a.top+a.height*.4,tx:b.left+b.width/2,ty:b.top+b.height/2,valid:true,blocked:false}:null;
  });
  document.getElementById('preview-demo')!.setAttribute('aria-pressed','true');
}
function selectLook(look:'silver'|'gold'){
  document.body.dataset.attackLook=look;
  for(const name of ['silver','gold'])document.getElementById('preview-'+name)!.setAttribute('aria-pressed',String(name===look));
  status.textContent=look==='silver'?'銀白のフレームを、一筋の澄んだ光が流れる。':'淡い金のフレームに、上下から柔らかな光が満ちる。';
  const url=new URL(location.href);url.searchParams.set('look',look);history.replaceState(null,'',url);
}
for(const look of ['silver','gold'] as const)document.getElementById('preview-'+look)!.onclick=()=>selectLook(look);
selectLook(new URLSearchParams(location.search).get('look')==='gold'?'gold':'silver');
document.getElementById('preview-demo')!.onclick=()=>demo?stopDemo():startDemo();
document.getElementById('preview-reset')!.onclick=()=>{if(document.querySelector('.fx-playing'))return;stopDemo();controller.reset();startDemo();};
document.getElementById('app')!.addEventListener('pointerdown',stopDemo,true);
controller.reset();startDemo();
Object.assign(window,{attackTargetPreview:{controller,startDemo,stopDemo,selectLook}});
window.addEventListener('pagehide',()=>{stopDemo();stopLayout();controller.destroy();},{once:true});
