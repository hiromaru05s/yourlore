import '../styles/tokens.css';import '../styles/base.css';import '../styles/card.css';import '../styles/passives.css';import '../styles/game-overlays.css';import '../styles/game.css';import '../styles/screens.css';import '../styles/reading-board.css';import '../styles/presentation.css';
import {GameView,setMyAvatar,setOppAvatar} from '../ui/boardView';import {startBoardLayout} from '../ui/layout';import {waitForDuel} from '../ui/duelReadiness';import {createGame} from '../shared/engine';import {DB,STARTERS} from '../shared/cards';import {setLang} from '../i18n';import {manaSurge} from '../ui/anim';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
document.body.style.cssText='margin:0;overflow:hidden;background:#eeede6';const style=document.createElement('style');style.textContent='.topbar,.help-callout,.help-fab,.mute-fab{display:none!important}';document.head.append(style);
const root=document.querySelector<HTMLElement>('#app')!,noop=()=>{};
const view=new GameView(root,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
const g=createGame({mode:'bot',seed:207,starting:0,p0:{id:'study-self',name:'シーカー'},p1:{id:'study-opp',name:'シーカー'}}).state;
g.turn=6;g.phase='main';g.pending=null;
let uid=0;const inst=(id:string)=>({...DB[id]||STARTERS[id],uid:`glow-${++uid}`});
const mons=Object.values(DB).filter(c=>c.t==='mon'&&c.atk&&c.def);
for(const [side,p]of g.players.entries()){p.openingDrawReady=false;p.mana=2;p.maxMana=6;p.hp=30;p.enchants=[];p.quests=[];p.traps=[];p.field=mons.slice(side*3,side*3+3).map(c=>({...inst(c.id),exhausted:side===1,tempAtk:0,atkMod:0,defMod:0,summonedTurn:0}));p.hand=[inst(mons[0].id),inst(mons[1].id),...Object.keys(STARTERS).slice(0,3).map(inst)];p.discard=mons.slice(0,5).map(c=>inst(c.id));}
function render(){view.render(g);view.setHandOpen(false);}render();const stop=startBoardLayout();
let ready=false;
function setCounts(current:number,maximum:number){for(const p of g.players){p.maxMana=Math.max(0,Math.min(30,maximum));p.mana=Math.max(0,Math.min(p.maxMana,current));}render();}
async function gain(side:0|1){const p=g.players[side],delta=Math.min(2,30-p.maxMana);p.maxMana+=delta;p.mana=Math.min(p.maxMana,p.mana+3);render();await manaSurge(side?'opp':'me',delta);}
(window as any).manaGlowAdoption={setCounts,gain,get state(){return {ready,current:g.players[0].mana,maximum:g.players[0].maxMana};}};
void waitForDuel(root).then(()=>{ready=true;});window.addEventListener('pagehide',()=>{stop();view.destroy();},{once:true});
