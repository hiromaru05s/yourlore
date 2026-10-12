import '../styles/seekerPicker.css';
import {avatarHtml, avatarPresets} from './social';
import {seekerPortrait, disposeSeeker, playSeeker, resetSeeker, SEEKER_ACTIONS, type SeekerAction} from './seekerAnimation';
import {seekerColor} from './seekerMotion';
import {seekerName, seekerActionLabel} from './seekerLabels';
import {loungeText} from './loungeText';
import {t} from '../i18n';
/** A reversible preview; the account changes only when Save succeeds. */
export function openSeekerPicker(current: string | null | undefined, save: (id: string) => Promise<void>): () => void {
  const previous = document.activeElement as HTMLElement | null;
  const overlay = document.createElement('div'); overlay.className = 'overlay';
  const ids = avatarPresets(); let selected = current === 'SEEKER_RED' ? current : 'SEEKER_BLUE';
  let closed = false, saving = false, terminalPreview = false;
  overlay.innerHTML = `<div class="modal hooded-picker" role="dialog" aria-modal="true" aria-labelledby="seekerPickerTitle">
    <h2 id="seekerPickerTitle">${loungeText('キャラクター','Character','캐릭터')}</h2>
    <div class="hooded-options">${ids.map(id=>`<button type="button" class="hooded-option" data-seeker-id="${id}" aria-pressed="${id===selected}">${avatarHtml(id,'',88)}<span>${seekerName(id)}</span></button>`).join('')}</div>
    <div class="hooded-live" aria-label="${loungeText('アニメーションプレビュー','Animation preview','애니메이션 미리보기')}"></div>
    <div class="hooded-actions">${SEEKER_ACTIONS.map(action=>`<button type="button" class="btn btn-ghost btn-mini" data-action="${action}">${seekerActionLabel(action)}</button>`).join('')}</div>
    <p class="hooded-save-status" role="status" aria-live="polite"></p>
    <div class="modal-row"><button type="button" class="btn btn-ghost" data-close>${t('common.cancel')}</button><button type="button" class="btn btn-gold" data-save>${loungeText('このキャラクターにする','Use this character','이 캐릭터 사용')}</button></div>
  </div>`;
  let canvas = seekerPortrait(seekerColor(selected));
  overlay.querySelector('.hooded-live')!.append(canvas); document.body.append(overlay);
  const status=overlay.querySelector<HTMLElement>('[role="status"]')!;
  const close=()=>{if(closed)return;closed=true;disposeSeeker(canvas);overlay.remove();document.removeEventListener('keydown',keyboard);if(previous?.isConnected)previous.focus();};
  const keyboard=(e:KeyboardEvent)=>{
    if(!overlay.isConnected){close();return;}
    if(e.key==='Escape'){e.preventDefault();close();}
    if(e.key==='Tab'){
      const buttons=[...overlay.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')],first=buttons[0],last=buttons.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  };
  document.addEventListener('keydown',keyboard);
  overlay.querySelector<HTMLButtonElement>('[data-close]')!.onclick=close;
  overlay.onclick=e=>{if(e.target===overlay)close();};
  overlay.querySelectorAll<HTMLButtonElement>('[data-seeker-id]').forEach(button=>{button.onclick=()=>{
    if(saving)return;selected=button.dataset.seekerId!;
    overlay.querySelectorAll('[data-seeker-id]').forEach(b=>b.setAttribute('aria-pressed',String((b as HTMLElement).dataset.seekerId===selected)));
    disposeSeeker(canvas);canvas=seekerPortrait(seekerColor(selected));overlay.querySelector('.hooded-live')!.replaceChildren(canvas);status.textContent='';terminalPreview=false;
  };});
  overlay.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button=>{button.onclick=()=>{
    const action=button.dataset.action as SeekerAction;
    if(terminalPreview)resetSeeker(canvas);
    playSeeker(canvas,action);terminalPreview=action==='defeat'||action==='victory';
  };});
  overlay.querySelector<HTMLButtonElement>('[data-save]')!.onclick=async()=>{
    if(saving)return;saving=true;const id=selected;
    overlay.querySelectorAll<HTMLButtonElement>('button:not([data-close])').forEach(b=>b.disabled=true);
    status.textContent=loungeText('保存中…','Saving…','저장 중…');
    try{await save(id);close();}catch(error){if(!closed){status.textContent=(error as Error).message;saving=false;overlay.querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.disabled=false);}}
  };
  overlay.querySelector<HTMLButtonElement>(`[data-seeker-id="${selected}"]`)!.focus();
  return close;
}
