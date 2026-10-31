import {getLang,onLangChange} from '../i18n';
import type {GameEvent} from '../shared/types';
import {DB,STARTERS} from '../shared/cards';
import {cardEl} from './cardView';
import {sfx} from './sound';
import * as A from './anim';
import type {DiceScene} from './diceScene';
import '../styles/fate-wheel.css';
type Roll=Extract<GameEvent,{type:'dice'}>;
export interface WheelDice {ready:Promise<void>; close:()=>void; finish:(roll?:Roll,uid?:string)=>Promise<void>;}
const words=(ja:string,en:string,ko:string)=>getLang()==='ja'?ja:getLang()==='en'?en:ko;
const pips:Record<number,number[]>={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
export function openWheelDice(roll:Roll,mine:boolean,choose:(re:boolean)=>void,instant=false):WheelDice {
  let caption: 'pending'|'reroll'|'confirmed'='pending', settledRoll: Roll=roll;
  const abort=new AbortController(),signal=abort.signal;let scene:DiceScene|null=null,closed=false,finishing=false;
  const ov=document.createElement('div');ov.className='d3-overlay wheel-decision'+(mine?'':' opp source-opp');ov.setAttribute('role','dialog');ov.setAttribute('aria-label',words('運命の輪','Wheel of Fate','운명의 수레바퀴'));
  const src=document.createElement('div');src.className='d3-source';const owner=document.createElement('div');owner.className='d3-owner';owner.textContent=mine?words('あなたの効果','Your effect','자신의 효과'):words('相手の効果','Opponent effect','상대의 효과');src.append(owner);
  const def=roll.source.id&&(DB[roll.source.id]??STARTERS[roll.source.id]);if(def){const card=cardEl({...def,uid:'wheel-dice-source'},{size:'hand',fullArt:true});card.classList.add('d3-source-card');src.append(card);}
  const tray=document.createElement('div');tray.className='d3-tray';const heading=document.createElement('div');heading.className='d3-who';heading.textContent=mine?words('あなたのダイス','Your dice','자신의 주사위'):words('相手のダイス','Opponent dice','상대의 주사위');
  const row=document.createElement('div');row.className='d3-row';const cap=document.createElement('div');cap.className='d3-cap';cap.setAttribute('aria-live','polite');
  const choice=document.createElement('section');choice.className='wheel-choice';choice.hidden=true;
  const question=document.createElement('p');question.textContent=mine?words('この出目で確定しますか？','Keep this roll?','이 결과로 확정할까요?'):words('相手が出目を確認しています','Opponent is choosing','상대가 결과를 확인하고 있습니다');
  const help=document.createElement('small');help.textContent=words('確定するまで効果は発生しません。','The effect waits for confirmation.','확정하기 전에는 효과가 발생하지 않습니다.');choice.append(question,help);
  if(mine){const actions=document.createElement('div');for(const re of [false,true]){const b=document.createElement('button');b.textContent=re?words('振り直す','Reroll','다시 굴리기'):words('この結果を採用','Keep result','결과 유지');b.dataset.wheel=re?'reroll':'keep';if(re)b.className='wheel-primary';b.onclick=()=>{if(finishing||closed)return;actions.querySelectorAll('button').forEach(x=>x.disabled=true);choose(re);};actions.append(b);}choice.append(actions);}
  tray.append(heading,row,cap,choice);ov.append(src,tray);document.body.append(ov);
  const repaintLocale=()=>{
    ov.setAttribute('aria-label',words('運命の輪','Wheel of Fate','운명의 수레바퀴'));
    owner.textContent=mine?words('あなたの効果','Your effect','자신의 효과'):words('相手の効果','Opponent effect','상대의 효과');
    heading.textContent=mine?words('あなたのダイス','Your dice','자신의 주사위'):words('相手のダイス','Opponent dice','상대의 주사위');
    question.textContent=mine?words('この出目で確定しますか？','Keep this roll?','이 결과로 확정할까요?'):words('相手が出目を確認しています','Opponent is choosing','상대가 결과를 확인하고 있습니다');
    help.textContent=words('確定するまで効果は発生しません。','The effect waits for confirmation.','확정하기 전에는 효과가 발생하지 않습니다.');
    choice.querySelectorAll<HTMLButtonElement>('[data-wheel]').forEach(b=>b.textContent=b.dataset.wheel==='reroll'?words('振り直す','Reroll','다시 굴리기'):words('この結果を採用','Keep result','결과 유지'));
    if(def){const face=cardEl({...def,uid:'wheel-dice-source'},{size:'hand',fullArt:true});face.classList.add('d3-source-card');src.querySelector('.d3-source-card')?.replaceWith(face);}
    if(!ov.classList.contains('is-settled'))return;
    cap.textContent=caption==='pending'?roll.rolls.join(' + ')+' · '+words('未確定','Unconfirmed','미확정'):caption==='reroll'?roll.rolls.join(' + ')+' · '+words('取り消し → 振り直し','Cancelled → rerolling','취소 → 다시 굴리기'):(settledRoll!==roll?roll.rolls.join(' + ')+' → ':'')+settledRoll.rolls.join(' + ')+' · '+words('確定','Confirmed','확정');
    if(caption==='confirmed'&&settledRoll.need!=null){const verdict=document.createElement('span');verdict.className='d3-verdict';verdict.textContent=`${settledRoll.need}+ · `+(settledRoll.success?words('成功','Success','성공'):words('失敗','Fail','실패'));cap.append(verdict);}
  };
  const unsubscribe=onLangChange(repaintLocale);
  const fallback=(values:number[])=>{row.querySelectorAll('.d3-fallback').forEach(e=>e.remove());for(const value of values){const f=document.createElement('div');f.className='d3-fallback';f.setAttribute('aria-label',String(value));for(const cell of pips[value]??[]){const pip=document.createElement('i');pip.className='d3-pip';pip.style.gridArea=`${Math.ceil(cell/3)} / ${(cell-1)%3+1}`;f.append(pip);}row.append(f);}};
  fallback(roll.rolls);
  const motion=()=>!matchMedia('(prefers-reduced-motion: reduce)').matches&&!document.hidden;
  const close=()=>{if(closed)return;closed=true;unsubscribe();abort.abort();scene?.dispose();ov.remove();document.removeEventListener('visibilitychange',resize);window.removeEventListener('resize',resize);};
  // Keep the choice through backgrounding/resizes; only the GPU scene is released.
  const resize=()=>{scene?.dispose();scene=null;};document.addEventListener('visibilitychange',resize);window.addEventListener('resize',resize);
  const ready=(async()=>{try{if(!instant&&motion()){row.classList.add('is-loading');const mod=await import('./diceScene');if(signal.aborted)return;scene=await mod.mountDiceScene(row,roll.rolls,roll.variant==='casino',signal);if(scene)await scene.finished;}}catch{scene?.dispose();scene=null;}finally{row.classList.remove('is-loading');if(!closed){ov.classList.add('is-settled');cap.textContent=roll.rolls.join(' + ')+' · '+words('未確定','Unconfirmed','미확정');choice.hidden=false;sfx('diceLand',{signal});}}})();
  const finish=async(next?:Roll,uid?:string)=>{if(finishing||closed)return;finishing=true;await ready;choice.hidden=true;
    try{const {wheelTime,rewindDice}=await import('./fateWheelRewind');if(closed)return;if(next){
      caption='reroll';cap.textContent=roll.rolls.join(' + ')+' · '+words('取り消し → 振り直し','Cancelled → rerolling','취소 → 다시 굴리기');
      const source=uid?document.querySelector<HTMLElement>(`[data-uid="${CSS.escape(uid)}"]`):null;
      if(source&&motion()){A.enchantActivation(uid!);const a=source.getBoundingClientRect(),b=row.getBoundingClientRect(),svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('wheel-thread');svg.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);const x=a.x+a.width/2,y=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y+b.height/2,d=`M ${x} ${y} C ${x+60} ${y-60}, ${tx-110} ${ty+40}, ${tx} ${ty}`;for(const [color,width] of [['#102238','10'],['#d9bc7f','2']]){const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',d);path.setAttribute('stroke',color);path.setAttribute('stroke-width',width);path.setAttribute('pathLength','1');path.setAttribute('stroke-dasharray','1');svg.append(path);}ov.prepend(svg);try{await wheelTime(440,signal,p=>svg.querySelectorAll('path').forEach(path=>path.setAttribute('stroke-dashoffset',String(1-p))));}finally{svg.remove();}}
      if(scene&&motion())await scene.replay(next.rolls,stage=>rewindDice(stage,roll.rolls));fallback(next.rolls);sfx('diceLand',{signal});
    }
    const result=next??roll;caption='confirmed';settledRoll=result;cap.textContent=(next?roll.rolls.join(' + ')+' → ':'')+result.rolls.join(' + ')+' · '+words('確定','Confirmed','확정');
    if(result.need!=null){const verdict=document.createElement('span');verdict.className='d3-verdict';verdict.textContent=`${result.need}+ · `+(result.success?words('成功','Success','성공'):words('失敗','Fail','실패'));cap.append(verdict);}
    await wheelTime(motion()?650:100,signal,()=>{});
    }finally{close();}
  };
  return {ready,close,finish};
}
