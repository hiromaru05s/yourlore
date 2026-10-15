import { TUTORIAL_BASICS } from '../shared/tutorialGuide';
import { getLang, onLangChange } from '../i18n';
import { loungeText as text } from './loungeText';
import { artUrl } from './cardArt';
import '../styles/tutorialLearning.css';
/** A short, paced explanation before any first-lesson card can be played. */
export function openTutorialBasics(onDone:()=>void,onExit:()=>void=()=>{},review=false):()=>void {
 const dialog=document.createElement('dialog');dialog.className='tutorial-basics';dialog.setAttribute('aria-labelledby','basics-title');
 let page=0,closed=false;
 const stop=()=>{if(closed)return;closed=true;unsub();dialog.close();dialog.remove();};
 const finish=()=>{stop();onDone();};
 const exit=()=>{stop();onExit();};
 const render=()=>{
  const step=TUTORIAL_BASICS[page],lang=getLang(),labels=step.labels.map(s=>s[lang]);
  const values=step.kind==='goal'?['40','→','0']:step.kind==='mana'?['4','− 2','= 2']:['01','02','03'];
  dialog.innerHTML=`<header><span>${text('ゼノと覚える、はじめのルール','Learn the basics with Zeno','제노와 배우는 첫 규칙')}</span><button data-exit aria-label="${review?text('閉じる','Close','닫기'):text('一覧へ戻る','Back to lessons','목록으로 돌아가기')}">×</button></header><p class="basics-progress">${page+1} / ${TUTORIAL_BASICS.length}</p><h2 id="basics-title" tabindex="-1">${step.title[lang]}</h2><div class="basics-visual basics-${step.kind}">${labels.map((label,i)=>`<div>${step.kind==='board'&&i===2?`<img src="${artUrl.sm('M4')}" alt="">`:`<strong>${values[i]}</strong>`}<span>${label}</span></div>`).join('')}</div><p class="basics-body">${step.body[lang]}</p><footer><button class="btn btn-ghost" data-prev ${page===0?'disabled':''}>${text('ひとつ戻る','Back','뒤로')}</button><button class="btn btn-primary" data-next>${page===TUTORIAL_BASICS.length-1?(review?text('閉じる','Close','닫기'):text('モンスターで攻撃してみよう','Try playing and attacking','몬스터로 공격해 보기')):text('次へ','Next','다음')}</button></footer>`;
  dialog.querySelector('[data-exit]')!.addEventListener('click',exit);
  dialog.querySelector('[data-prev]')!.addEventListener('click',()=>{page--;render();dialog.querySelector<HTMLElement>('h2')!.focus();});
  dialog.querySelector('[data-next]')!.addEventListener('click',()=>{if(page===TUTORIAL_BASICS.length-1)finish();else{page++;render();dialog.querySelector<HTMLElement>('h2')!.focus();}});
 };
 const unsub=onLangChange(render);render();document.body.append(dialog);dialog.showModal();dialog.querySelector<HTMLElement>('h2')!.focus();
 dialog.addEventListener('cancel',e=>{e.preventDefault();exit();});return stop;
}
