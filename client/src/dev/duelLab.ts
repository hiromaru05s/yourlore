import {mountTurnLightBoardLab} from './turnLightBoardLab';
import "../styles/reading-board.css";
/// <reference types="vite/client" />
/** Development-only visual fixture. Not an entry point of the production build. */
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/game-overlays.css';
import '../styles/game.css';
import '../styles/screens.css';
import '../styles/duel-opening.css';
import '../styles/presentation.css';
import {createAttackAim} from '../ui/attackAim';
import {initSound,sfx,SFX_NAMES} from '../ui/sound';
import {playDuelOpening} from '../ui/duelOpening';
import {mountDuelOutcome} from '../ui/duelOutcome';
import { cardPickerMulti } from '../ui/modal';
import { setFxSkip, turnBanner, manaSurge, exileCard, animateDraw, animateReshuffle } from '../ui/anim';
import { captureHandLayout } from '../ui/handGeometry';
import { LocalController } from '../game/controller';
import { paintDuelClock } from '../ui/duelClock';
import { createGame } from '../shared/engine';
import { DB, STARTERS } from '../shared/cards';
import { GameView, setMyAvatar, setOppAvatar } from '../ui/boardView';
import { startBoardLayout } from '../ui/layout';
import { setLang } from '../i18n';
import { hpFeedback, ghostSummon, revealSpell } from '../ui/anim';
import type { CardInst, FieldMon } from '../shared/types';
import {mountManaBoardLab} from './manaBoardLab';

if (import.meta.env.DEV) {
  setLang('ja');initSound();
  localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));
  if (new URLSearchParams(location.search).has('opening')) {
    void import('./openingLab').then(m=>m.mountOpeningLab(document.getElementById('app')!));
  } else if (new URLSearchParams(location.search).has('live')) {
    setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
    const controller=new LocalController(document.getElementById('app')!,{onHome:()=>location.reload(),onRematch:()=>location.reload()},'シーカー',undefined,'easy');
    const stop=startBoardLayout();
    window.addEventListener('pagehide',()=>{stop();controller.destroy();},{once:true});
  } else {
  const polish = new URLSearchParams(location.search).has('polish');
  const dense = new URLSearchParams(location.search).has('dense');
  const g = createGame({mode:'bot',seed:207,starting:0,p0:{id:'fixture-me',name:'シーカー'},p1:{id:'fixture-opp',name:'シーカー'}}).state;
  const mons = Object.values(DB).filter(c=>c.t==='mon' && c.atk && c.def);
  const spells = Object.values(DB).filter(c=>c.ench);
  const traps = Object.values(DB).filter(c=>c.t==='trap');
  let uid=0;
  const inst = (id:string):CardInst => ({...(DB[id] || STARTERS[id]),uid:`fixture-${++uid}`});
  for (const [side,p] of g.players.entries()) {
    p.field = mons.slice(side*3, side*3+(dense?7:3)).map(c=>({...inst(c.id),exhausted:side===1,tempAtk:0,atkMod:0,defMod:0,summonedTurn:0}) as FieldMon);
    p.enchants = [DB.NHEAL,...spells.filter(c=>c.id!=='NHEAL')].slice(0,dense?7:1).map(c=>({card:inst(c.id),turns:c.val||1}));
    p.traps = traps.slice(0,dense?7:1).map(c=>({card:inst(c.id)}));
    p.discard = [...mons.slice(0,5),...spells.slice(0,2)].map(c=>inst(c.id));
    p.removed = [inst(mons[9].id)];
    p.hp = side?28:32; p.maxMana = dense?30:8; p.mana = dense?23:6;
    p.hand = [inst(mons[0].id),inst(mons[1].id),inst(spells[0].id),...Object.keys(STARTERS).slice(0,3).map(inst)];
  }
  if (new URLSearchParams(location.search).has('timed')) {
    g.turn=6;
    const timed=spells.find(c=>c.ench==='ancientCiv')!;
    g.players[0].enchants=[{card:inst(timed.id),turns:99,bornTurn:3},{card:inst(spells[0].id),turns:2}];
    g.players[0].field[0].atk=123;g.players[0].field[0].def=123;
    g.players[0].field[1].guts=2;g.players[0].field[1].decayCnt=1;
  }
  setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');startBoardLayout();
  const handlers = {onPlay:async(uid:string)=>{const card=g.players[0].hand.find(c=>c.uid===uid);if(!card)return;if(card.t==='mon'){const ghost=await ghostSummon(card,'me',Math.min(6,g.players[0].field.length));setTimeout(()=>ghost?.remove(),300);}else { await revealSpell(card,'me',card.ench?'field':'discard'); if(card.ench){g.players[0].enchants.push({card,turns:card.val||1,bornTurn:g.turn});render();} }},onBlockedPlay:()=>{},onAttack:()=>{hpFeedback('opp','dmg',4);},onBlockedAttack:()=>{},onReorder:(a:number,b:number)=>{const f=g.players[0].field;f.splice(b,0,f.splice(a,1)[0]);render();},onChooseTarget:()=>{},onBuyMarket:()=>{},onBuySupply:()=>{},onRefresh:()=>{(g.players[0].removed ??= []).push(inst(mons[10].id));render();hpFeedback('me','dmg',3);},onEndTurn:()=>{if(polish){g.cur=1;render();}else turnBanner(true,++g.turn);},onSurrender:()=>{location.href='/duel-lab.html'+(dense?'':'?dense=1');}};
  const view = new GameView(document.getElementById('app')!,0,handlers);
  function render(){view.render(g);}
  render();
  let remaining=90;
  const tick=()=>paintDuelClock(document.getElementById('clock-me')!, remaining,90,g.cur===0);
  if(polish){
    const panel=document.createElement('div');panel.dataset.polishControls='true';
    panel.style.cssText='position:fixed;top:8px;left:48px;right:90px;z-index:200;display:flex;flex-wrap:wrap;gap:5px;font:12px sans-serif';
    const add=(label:string,action:()=>void|Promise<void>)=>{const button=document.createElement('button');button.textContent=label;button.style.cssText='padding:6px 9px;background:#182837;color:#e4eafa;border:1px solid #627d91;border-radius:4px';button.onclick=async()=>{button.disabled=true;try{await action();}finally{button.disabled=false;}};panel.append(button);};
    const gainMana=async(side:0|1|'both')=>{
      const sides: (0|1)[]=side==='both'?[0,1]:[side];
      if(sides.some(s=>g.players[s].maxMana>=30)){
        for(const s of sides){const p=g.players[s];if(p.maxMana>=30){p.maxMana=8;p.mana=6;}}
        render();await new Promise(r=>setTimeout(r,120));
      }
      const amounts=sides.map(s=>{const p=g.players[s],before=p.maxMana;p.maxMana=Math.min(30,p.maxMana+2);p.mana=Math.min(p.maxMana,p.mana+3);return p.maxMana-before;});
      // Render both changes once, so simultaneous effects keep connected anchors.
      render();await Promise.all(sides.map((s,i)=>manaSurge(s?'opp':'me',amounts[i])));
    };
    add('マナ増加',()=>gainMana(0));add('相手マナ増加',()=>gainMana(1));
    if(new URLSearchParams(location.search).has('mana'))mountManaBoardLab(panel,gainMana);
    add('演出スキップ',()=>{setFxSkip(true);setFxSkip(false);});
    add('場から虚無',async()=>{const p=g.players[0],card=p.field[0];const source=document.querySelector<HTMLElement>('#myField .card')??document.querySelector<HTMLElement>('#meRow .zone-mon .card');if(card&&source){try{await exileCard(card,'me',source);}finally{source.style.visibility='';render();}}});
    add('手札から虚無',async()=>{const card=g.players[0].hand[0],source=document.querySelector<HTMLElement>('#hand .card');if(card&&source){try{await exileCard(card,'me',source);}finally{source.style.visibility='';render();}}});
    add('虚無魔法プレイ',async()=>{await revealSpell(inst('STARTER_TRASH'),'me','vanish');});
    add('手札の開閉',()=>{view.setHandOpen(!document.querySelector('.game')?.classList.contains('hand-open'));});
    add('手札10枚',()=>{g.players[0].hand=mons.slice(0,10).map(c=>inst(c.id));render();});
    let drawing=false;
    const drawPreview=async(count:number,durationScale=1,side:'me'|'opp'='me',existing=3)=>{
      if(drawing)return;drawing=true;
      try{
        const p=g.players[side==='me'?0:1],hand=document.getElementById(side==='me'?'hand':'oppHand');
        p.hand=p.hand.slice(0,existing);render();
        const previousHand=captureHandLayout(hand),incoming=mons.slice(3,3+count).map(c=>inst(c.id));
        p.hand.push(...incoming);render();
        await animateDraw(hand,count,side,{previousHand,uids:side==='me'?incoming.map(c=>c.uid):undefined,durationScale});
      }finally{drawing=false;}
    };
    add('ドロー1枚',()=>drawPreview(1));
    add('ドロー3枚',()=>drawPreview(3));
    add('ドロー6枚',()=>drawPreview(6));
    add('ドロー低速',()=>{void drawPreview(1,4);});
    add('相手ドロー',()=>drawPreview(3,1,'opp'));
    add('拡大手札ドロー',()=>{view.setHandOpen(true);void drawPreview(3,3);});
    add('空手札ドロー',()=>drawPreview(3,1,'me',0));
    add('デッキ再構成',async()=>{await animateReshuffle('me',g.players[0].discard.length);render();});
    add('勝利演出',()=>{const stop=mountDuelOutcome(null,true,null);setTimeout(stop,6500);});
    add('敗北演出',()=>{const stop=mountDuelOutcome(null,false,null);setTimeout(stop,6500);});
    add('デュエル開始',()=>{void playDuelOpening({name:'シーカー',avatar:'SEEKER_BLUE'},{name:'対戦相手',avatar:'SEEKER_RED'},true,4000);});
    add('攻撃矢印',()=>{const start=performance.now(),aim=createAttackAim(()=>{const a=document.querySelector('#meRow .zone-mon .card')?.getBoundingClientRect(),targets=[...document.querySelectorAll('#oppRow .zone-mon .card')],b=targets[Math.floor((performance.now()-start)/1600)%targets.length]?.getBoundingClientRect();return a&&b?{x:a.left+a.width/2,y:a.top+a.height*.4,tx:b.left+b.width/2,ty:b.top+b.height/2,valid:true,blocked:false}:null;});setTimeout(()=>aim.remove(),8000);});
    const sounds=document.createElement('select');sounds.setAttribute('aria-label','効果音');for(const name of SFX_NAMES){const option=document.createElement('option');option.value=name;option.textContent=name;sounds.append(option);}panel.append(sounds);
    add('効果音を試聴',()=>sfx(sounds.value as typeof SFX_NAMES[number]));
    add('自分のターン',()=>{g.cur=0;render();});
    document.body.append(panel);
    mountTurnLightBoardLab(document.getElementById('app')!,panel,enemy=>{g.cur=enemy?1:0;render();tick();},seconds=>{remaining=seconds;tick();});
  }
  tick();
  if(new URLSearchParams(location.search).has('discard')) cardPickerMulti('捨てるカードを3枚選択',g.players[0].hand,3,()=>{},{exact:true});
  setInterval(()=>{remaining=remaining>0?remaining-1:90;tick();},1000);
  }
}
