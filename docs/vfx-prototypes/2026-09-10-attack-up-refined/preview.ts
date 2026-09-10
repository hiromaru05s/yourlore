import '../../../client/src/styles/tokens.css';
import '../../../client/src/styles/base.css';
import '../../../client/src/styles/card.css';
import '../../../client/src/styles/game-overlays.css';
import '../../../client/src/styles/game.css';
import '../../../client/src/styles/dice.css';
import '../../../client/src/styles/screens.css';
import '../../../client/src/styles/mobile.css';
import './preview.css';
import {GameView,setMyAvatar,setOppAvatar} from '../../../client/src/ui/boardView';
import {createGame} from '../../../client/src/shared/engine';
import {DB,STARTERS} from '../../../client/src/shared/cards';
import {startBoardLayout} from '../../../client/src/ui/layout';
import {setLang,cardName} from '../../../client/src/i18n';
import {paintDuelClock} from '../../../client/src/ui/duelClock';
import {mountAttackUp} from './attack-up';
localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
const g=createGame({mode:'bot',seed:71,starting:0,p0:{id:'preview-me',name:'YOU'},p1:{id:'preview-opp',name:'OPPONENT'}}).state;
g.turn=3;g.pending=null;
for(const [side,p] of g.players.entries()){
p.openingDrawReady=false;p.mana=12;p.maxMana=12;p.hp=40;p.maxHp=40;p.field=[];p.enchants=[];p.quests=[];p.hand=[];
p.discard=[DB.ELF,DB.GM6_0,DB.ND2].filter(Boolean).map((c,i)=>({...c,uid:`discard-${side}-${i}`}));
const ids=side?['M3','M4','M5']:['M4','GM6_0','ELF'];
p.field=ids.map((id,i)=>({...DB[id],uid:`field-${side}-${i}`,exhausted:false,summonedTurn:0,tempAtk:0,atkMod:0,defMod:0,dmg:0}));
const ench=Object.values(DB).filter(c=>c.ench).slice(0,3);p.enchants=ench.map((c,i)=>({card:{...c,uid:`ench-${side}-${i}`},turns:c.val||1}));
}
g.players[0].hand=[STARTERS.STARTER_CHEST,STARTERS.STARTER_MANA,DB.ND2].map((c,i)=>({...c,uid:`hand-${i}`}));
let effect:ReturnType<typeof mountAttackUp>;const noop=()=>{};
const view=new GameView(document.querySelector('#app')!,0,{onPlay:noop,onBlockedPlay:noop,onAttack:uid=>choose(uid),onBlockedAttack:noop,onReorder:noop,onChooseTarget:uid=>{if(uid)choose(uid);},onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
view.render(g);view.setHandOpen(false);startBoardLayout();paintDuelClock(document.querySelector('#clock-me')!,75,90,true);
const integration=new URLSearchParams(location.search).get('integration')==='attack';
let selected='field-0-1';
function choose(uid:string){if(!uid.startsWith('field-'))return;selected=uid;document.querySelectorAll('.vfx-target-card').forEach(e=>e.classList.remove('vfx-target-card'));const card=document.querySelector<HTMLElement>(`[data-uid="${uid}"]`);if(!card)return;card.classList.add('vfx-target-card');const mon=g.players.flatMap(p=>p.field).find(m=>m.uid===uid)!;document.querySelector('#vfx-target')!.textContent=cardName(mon)+' · 攻撃強化';effect?.setTarget(card);if(!matchMedia('(prefers-reduced-motion: reduce)').matches)effect?.play();}
document.querySelector('#app')!.addEventListener('click',e=>{const card=(e.target as HTMLElement).closest<HTMLElement>('.zone-mon .card');if(card?.dataset.uid){e.preventDefault();e.stopImmediatePropagation();choose(card.dataset.uid);}},true);
if(integration){
  document.querySelector('#vfx-play')!.textContent='攻撃力上昇';
  document.querySelector('#vfx-play')!.addEventListener('click',()=>{const mon=g.players.flatMap(p=>p.field).find(m=>m.uid===selected);if(mon){mon.atkMod=(mon.atkMod||0)+1;view.render(g);}});
  for(const id of ['vfx-pause','vfx-slow','vfx-loop','vfx-seek','vfx-sound'])(document.getElementById(id) as HTMLInputElement).disabled=true;
  document.querySelector('#vfx-phase')!.textContent='実動作';
  document.querySelector('.vfx-note')!.textContent='場のカードを選び、実際の攻撃力上昇を確認';
}
const start=()=>{const card=document.querySelector<HTMLElement>(`[data-uid="${selected}"]`);if(!card||!document.querySelector('.duel-webgl')){requestAnimationFrame(start);return;}if(!integration)effect=mountAttackUp(card);choose(selected);};start();
