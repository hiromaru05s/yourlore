import { esc, getLang } from '../i18n';
import { SINGLE_SCENES, STORY_NAMES, SINGLE_CHAPTERS, type StoryActor } from '../shared/singleStoryText';
import type { StoryScene } from '../shared/singleStory';
import { loungeText as L } from './loungeText';
import { mountManaSpirit } from './manaSpirit';
export const storyCursorKey=(account:string,scene:StoryScene)=>`lore:single:cursor:v1:${encodeURIComponent(account)}:${scene}`;
/** Pause preserves the current line. SKIP completes only this conversation. */
export function openStoryScene(scene:StoryScene,account:string,onComplete:()=>Promise<void>,onClose:()=>void):()=>void {
 const dialog=document.createElement('dialog');dialog.className='single-vn';
 const lines=SINGLE_SCENES[scene],lang=getLang();let index=0,busy=false,closed=false,actor:StoryActor|undefined;
 let spirit:ReturnType<typeof mountManaSpirit>|undefined;
 try{const saved=Number(localStorage.getItem(storyCursorKey(account,scene)));if(Number.isInteger(saved)&&saved>=0&&saved<lines.length)index=saved;}catch{}
 const chapter=SINGLE_CHAPTERS.find(c=>c.id===Number(scene.split(':')[0]));
 dialog.setAttribute('aria-label',chapter?.title[lang]??STORY_NAMES.aries[lang]);
 dialog.innerHTML=`<div class="svn-background"></div><div class="svn-shade"></div><div class="svn-portrait" aria-hidden="true"></div>
 <header class="svn-top"><button data-pause aria-label="${L('中断して章一覧へ','Pause and return to chapters','중단하고 장 목록으로')}">‹ ${L('章一覧','Chapters','장 목록')}</button><span>${esc(chapter?.place[lang]??L('アリエスの書斎','Aries’s study','아리에스의 서재'))}</span><button data-skip>SKIP ››</button></header>
 <section class="svn-dialogue"><div class="svn-name"></div><p class="svn-text" aria-live="polite"></p><footer><span class="svn-count"></span><span class="svn-error" role="alert"></span><button data-prev aria-label="${L('前の台詞','Previous line','이전 대사')}">‹</button><button data-next></button></footer></section>`;
 document.body.append(dialog);dialog.showModal();
 const portrait=dialog.querySelector<HTMLElement>('.svn-portrait')!;
 const next=dialog.querySelector<HTMLButtonElement>('[data-next]')!,prev=dialog.querySelector<HTMLButtonElement>('[data-prev]')!,skip=dialog.querySelector<HTMLButtonElement>('[data-skip]')!;
 const error=dialog.querySelector<HTMLElement>('.svn-error')!;
 const close=()=>{if(closed)return;closed=true;spirit?.destroy();dialog.close();dialog.remove();onClose();};
 function render(){
  const current=lines[index];
  try{localStorage.setItem(storyCursorKey(account,scene),String(index));}catch{}
  dialog.querySelector('.svn-name')!.textContent=STORY_NAMES[current.actor][lang];
  dialog.querySelector('.svn-text')!.textContent=current.text[lang];
  dialog.querySelector('.svn-count')!.textContent=`${index+1} / ${lines.length}`;
  prev.disabled=busy||index===0;next.disabled=busy;skip.disabled=busy;
  next.textContent=busy?L('保存中…','Saving…','저장 중…'):index===lines.length-1?L('会話を終える →','Finish conversation →','대화 마치기 →'):L('次へ →','Next →','다음 →');
  // Keep the conversational partner visible while the player answers.
  const visible=current.actor==='you'||current.actor==='narrator'?(actor??lines.find(line=>line.actor!=='you'&&line.actor!=='narrator')?.actor):current.actor;
  if(visible!==actor){
   spirit?.destroy();spirit=undefined;portrait.replaceChildren();actor=visible;
   portrait.dataset.actor=actor??'';
   if(actor==='zeno')spirit=mountManaSpirit(portrait,{still:true});
   else if(actor&&['lumi','noel','vera','aries'].includes(actor)){
    const img=document.createElement('img');img.alt='';img.src=actor==='aries'?'/art/single-story/aries-cutout-v1.webp':`/art/single-standing/refined-v2/${actor}.webp`;portrait.append(img);
   }
  }
 }
 async function finish(){
  if(busy||closed)return;busy=true;error.textContent='';render();
  try{await onComplete();if(closed)return;try{localStorage.removeItem(storyCursorKey(account,scene));}catch{}close();}
  catch{if(!closed){busy=false;error.textContent=L('保存できませんでした。もう一度お試しください。','Could not save. Please try again.','저장하지 못했어요. 다시 시도해 주세요.');render();}}
 }
 const advance=()=>{if(busy)return;if(index===lines.length-1)void finish();else{index++;error.textContent='';render();}};
 next.onclick=advance;skip.onclick=()=>void finish();prev.onclick=()=>{if(index&&!busy){index--;render();}};
 dialog.querySelector<HTMLButtonElement>('[data-pause]')!.onclick=close;
 dialog.querySelector<HTMLElement>('.svn-text')!.onclick=advance;
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 dialog.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();advance();}else if(e.key==='ArrowLeft'){e.preventDefault();prev.click();}else if((e.key===' '||e.key==='Enter')&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();advance();}});
 render();next.focus();return close;
}
