// Public deterministic fixture of the production Shield Titan summon routes.
import '../styles/tokens.css';import '../styles/base.css';import '../styles/card.css';import '../styles/game-overlays.css';import '../styles/game.css';import '../styles/screens.css';import '../styles/reading-board.css';import '../styles/presentation.css';
import {GameView,setMyAvatar,setOppAvatar} from '../ui/boardView';
import {startBoardLayout} from '../ui/layout';import {waitForDuel} from '../ui/duelReadiness';
import {playMonster,clearMonsterStates} from '../ui/monster/runtime';
import {summonFromHand,ghostSummon,setFxSkip} from '../ui/anim';
import {createGame} from '../shared/engine';import {DB} from '../shared/cards';import {setLang} from '../i18n';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
document.body.style.cssText='margin:0;overflow:hidden;background:#f2eee8';
const root=document.getElementById('app')!,noop=()=>{};
const view=new GameView(root,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
const mon=(id:string,uid:string)=>({...DB[id],uid,exhausted:false,summonedTurn:0,dmg:0,tempAtk:0,atkMod:0,defMod:0});
let ready=false,impacts=0;
function setup(id='SHIELD_TITAN',side=0,multi=false){
 clearMonsterStates(root);
 const g=createGame({mode:'bot',seed:71,starting:0,p0:{id:'qa-self',name:'YOU'},p1:{id:'qa-opp',name:'OPPONENT'}}).state;
 g.turn=3;g.pending=null;g.phase='main';
 for(const [i,p] of g.players.entries()){p.openingDrawReady=false;p.mana=12;p.maxMana=12;p.hp=30;p.dew=12;p.enchants=[];p.quests=[];p.traps=[];p.field=[mon(multi&&i===side?id:'M4',`left-${i}`),mon(i===side?id:'ELF',`target-${i}`),mon(multi&&i===side?id:'GM6_0',`right-${i}`)];p.hand=[{...DB.M4,uid:`hand-${i}`}];}
 view.render(g);view.setHandOpen(false);clearMonsterStates(root);
 return root.querySelector<HTMLElement>(`.card[data-uid="target-${side}"]`)!;
}
const qa={get ready(){return ready},get impacts(){return impacts},setup,skip:setFxSkip,
 async run(id='SHIELD_TITAN',side=0,path='direct'){
  const n=setup(id,side);await new Promise(requestAnimationFrame);const card={...DB[id],uid:n.dataset.uid!};
  if(path==='hand')return summonFromHand(card,card.uid,side?'opp':'me');
  if(path==='generated')return ghostSummon({...card,uid:'generated'},side?'opp':'me',3);
  return playMonster(n,'summon',{onImpact:()=>impacts++});
 },async multi(side=0){setup('SHIELD_TITAN',side,true);const nodes=[...root.querySelectorAll<HTMLElement>((side?'#oppRow':'#meRow')+' .card[data-uid]')];return Promise.all(nodes.map(n=>{n.dataset.cardId='SHIELD_TITAN';return playMonster(n,'summon',{onImpact:()=>impacts++});}));},cancel:()=>clearMonsterStates(root)};
(window as unknown as {shieldTitanQA:typeof qa}).shieldTitanQA=qa;
setup();startBoardLayout();void waitForDuel(root).then(()=>{ready=true;});

const controls=document.createElement('div');controls.style.cssText='position:fixed;top:12px;left:12px;z-index:250;display:flex;flex-wrap:wrap;gap:8px;padding:10px;background:#172b32e8;color:#fff;border-radius:8px;max-width:calc(100% - 24px)';controls.innerHTML='<strong>盾の巨神 ⑤ 均衡の水晶</strong><button data-side>自分側</button><button data-path="hand">手札から召喚</button><button data-path="generated">効果で召喚</button><button data-path="direct">盤面で再生</button><button data-stop>中断</button>';document.body.append(controls);let side=0,busy=false;controls.querySelector<HTMLButtonElement>('[data-side]')!.onclick=e=>{side=1-side;(e.target as HTMLElement).textContent=side?'相手側':'自分側';};controls.querySelectorAll<HTMLButtonElement>('[data-path]').forEach(b=>b.onclick=()=>{if(!ready||busy)return;busy=true;void qa.run('SHIELD_TITAN',side,b.dataset.path).finally(()=>busy=false);});controls.querySelector<HTMLButtonElement>('[data-stop]')!.onclick=qa.cancel;
