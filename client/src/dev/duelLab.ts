/// <reference types="vite/client" />
/** Development-only visual fixture. Not an entry point of the production build. */
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/game-overlays.css';
import '../styles/game.css';
import '../styles/screens.css';
import { createGame } from '../shared/engine';
import { DB, STARTERS } from '../shared/cards';
import { GameView, setMyAvatar, setOppAvatar } from '../ui/boardView';
import { startBoardLayout } from '../ui/layout';
import { setLang } from '../i18n';
import { hpFeedback, ghostSummon, revealSpell, setFxSkip } from '../ui/anim';
import type { CardInst, FieldMon } from '../shared/types';

if (import.meta.env.DEV) {
  setLang('ja');
  localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));
  const dense = new URLSearchParams(location.search).has('dense');
  const g = createGame({mode:'bot',seed:207,starting:0,p0:{id:'fixture-me',name:'シーカー'},p1:{id:'fixture-opp',name:'シーカー'}}).state;
  const mons = Object.values(DB).filter(c=>c.t==='mon' && c.atk && c.def);
  const spells = Object.values(DB).filter(c=>c.ench);
  const traps = Object.values(DB).filter(c=>c.t==='trap');
  let uid=0;
  const inst = (id:string):CardInst => ({...(DB[id] || STARTERS[id]),uid:`fixture-${++uid}`});
  for (const [side,p] of g.players.entries()) {
    p.field = mons.slice(side*3, side*3+(dense?7:3)).map(c=>({...inst(c.id),exhausted:side===1,tempAtk:0,atkMod:0,defMod:0,summonedTurn:0}) as FieldMon);
    p.enchants = spells.slice(0,dense?4:1).map(c=>({card:inst(c.id),turns:99}));
    p.traps = traps.slice(0,dense?3:1).map(c=>({card:inst(c.id)}));
    p.discard = [...mons.slice(0,5),...spells.slice(0,2)].map(c=>inst(c.id));
    p.removed = [inst(mons[9].id)];
    p.hp = side?28:32; p.maxMana = dense?30:8; p.mana = dense?23:6;
    p.hand = [inst(mons[0].id),inst(mons[1].id),inst(spells[0].id),...Object.keys(STARTERS).slice(0,3).map(inst)];
  }
  setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');startBoardLayout();
  const handlers = {onPlay:async(uid:string)=>{const card=g.players[0].hand.find(c=>c.uid===uid);if(!card)return;if(card.t==='mon'){const ghost=await ghostSummon(card,'me',Math.min(6,g.players[0].field.length));setTimeout(()=>ghost?.remove(),300);}else await revealSpell(card,'me','discard');},onBlockedPlay:()=>{},onAttack:()=>{hpFeedback('opp','dmg',4);},onBlockedAttack:()=>{},onReorder:(a:number,b:number)=>{const f=g.players[0].field;f.splice(b,0,f.splice(a,1)[0]);render();},onChooseTarget:()=>{},onBuyMarket:()=>{},onBuySupply:()=>{},onRefresh:()=>{hpFeedback('me','dmg',3);},onEndTurn:()=>{setFxSkip(true);setTimeout(()=>setFxSkip(false),20);},onSurrender:()=>{location.href='/duel-lab.html'+(dense?'':'?dense=1');}};
  const view = new GameView(document.getElementById('app')!,0,handlers);
  function render(){view.render(g);}
  render();
}
