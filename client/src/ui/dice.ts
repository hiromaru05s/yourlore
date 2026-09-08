/** Engine-driven archive dice. The generated enamel is decorative; pips and
 * landing faces are exact geometry. A readable CSS die is the GPU fallback. */
import { t, getLang } from '../i18n';
import { sfx } from './sound';
import type { DiceScene } from './diceScene';
export interface DiceOpts { need?:number; success?:boolean; mine:boolean; casino?:boolean; }
const active=new Set<AbortController>();
export function cancelDiceAnimations():void {for(const abort of active)abort.abort();}
const PIPS:Record<number,number[]>={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
/** Play a real roll, then reveal the authoritative total/verdict. */
export async function diceRollAnim(rolls:number[],opts:DiceOpts):Promise<void>{
  if(!rolls.length||rolls.some(n=>!Number.isInteger(n)||n<1||n>6))return;
  const abort=new AbortController();active.add(abort);
  const skipped=new Promise<void>(r=>abort.signal.addEventListener('abort',()=>r(),{once:true}));
  const ov=document.createElement('div');ov.className='d3-overlay'+(opts.mine?'':' opp')+(opts.casino?' casino':'');
  ov.setAttribute('role','dialog');ov.setAttribute('aria-label',opts.mine?'Dice':t('fx.opp')+' · Dice');
  ov.tabIndex=0;ov.onclick=()=>abort.abort();ov.onkeydown=e=>{if(e.key==='Escape'||e.key==='Enter'||e.key===' '){e.preventDefault();abort.abort();}};
  const tray=document.createElement('div');tray.className='d3-tray';
  const heading=document.createElement('div');heading.className='d3-who';heading.textContent=opts.casino?'CASINO':opts.mine?'LORE':t('fx.opp');tray.append(heading);
  const row=document.createElement('div');row.className='d3-row';tray.append(row);
  for(const value of rolls){const face=document.createElement('div');face.className='d3-fallback';face.setAttribute('aria-label',String(value));
    for(const cell of PIPS[value]){const pip=document.createElement('i');pip.className='d3-pip';pip.style.gridArea=`${Math.ceil(cell/3)} / ${((cell-1)%3)+1}`;face.append(pip);}row.append(face);
  }
  const cap=document.createElement('div');cap.className='d3-cap';cap.setAttribute('aria-live','polite');cap.textContent=opts.need==null?'':`${opts.need}+`;tray.append(cap);ov.append(tray);document.body.append(ov);
  let scene:DiceScene|null=null,timer:ReturnType<typeof setTimeout>|undefined;
  const pause=(ms:number)=>Promise.race([new Promise<void>(r=>{timer=setTimeout(r,ms);}),skipped]).finally(()=>clearTimeout(timer));
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape'||e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();abort.abort();}};
  document.addEventListener('keydown',key,true);
  const hidden=()=>{if(document.hidden)abort.abort();};document.addEventListener('visibilitychange',hidden);
  try{
    sfx('play');
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
      row.classList.add('is-loading');
      scene=await Promise.race([import('./diceScene').then(({mountDiceScene})=>mountDiceScene(row,rolls,!!opts.casino,abort.signal)).catch(()=>null),skipped.then(()=>null)]);
      row.classList.remove('is-loading');
      if(scene)await Promise.race([scene.finished,skipped]);
      else if(!abort.signal.aborted)await pause(350);
    }
    if(abort.signal.aborted)return;
    sfx('pop');
    const sum=rolls.reduce((a,b)=>a+b,0),lang=getLang();
    cap.textContent=rolls.length>1?`${rolls.join(' + ')} = ${sum}`:String(sum);
    if(opts.need!=null){
      const ok=!!opts.success;ov.classList.add(ok?'win':'fail');
      const verdict=document.createElement('span');verdict.className='d3-verdict';verdict.textContent=`${opts.need}+ · `+(ok?(lang==='ja'?'成功':lang==='en'?'Success':'성공'):(lang==='ja'?'失敗':lang==='en'?'Fail':'실패'));cap.append(verdict);if(ok)sfx('mana');
    }
    await pause(820);if(!abort.signal.aborted){ov.classList.add('out');await pause(180);}
  }finally{abort.abort();active.delete(abort);scene?.dispose();clearTimeout(timer);document.removeEventListener('visibilitychange',hidden);document.removeEventListener('keydown',key,true);ov.remove();}
}
