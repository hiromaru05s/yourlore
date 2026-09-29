import {loungeText} from './loungeText';
import {loadingRitual} from './loadingSigil';
import '../styles/loadingScreen.css';

/** Progress represents completed preparation work, never a timer pretending to load. */
export function loadingScreen(className:string, label:string) {
  const element=document.createElement('div');element.className=className+' game-loading';
  element.setAttribute('role','status');element.setAttribute('aria-live','polite');
  element.innerHTML=`<img class="loading-logo" src="/art/brand/lore-logo-transparent.webp" alt="LORE"><span class="loading-title"></span>${loadingRitual()}<div class="loading-progress"><progress max="100" value="0"></progress><b>0%</b></div><small class="loading-phase"></small>`;
  element.querySelector('.loading-title')!.textContent=label;
  const bar=element.querySelector('progress')!,number=element.querySelector('b')!,phase=element.querySelector('.loading-phase')!;
  bar.setAttribute('aria-label',loungeText('読み込みの進捗','Loading progress','로딩 진행률'));
  let value=0;
  const update=(next:number,detail:string)=>{
    value=Math.max(value,Math.min(100,Math.floor(next)));
    bar.value=value;number.textContent=`${value}%`;phase.textContent=detail;
    element.style.setProperty('--load-progress',String(value/100));
  };
  update(0,loungeText('準備を始めています','Getting ready','준비 중'));
  return {element,update};
}
