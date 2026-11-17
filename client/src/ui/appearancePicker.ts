import {profileBackground, starterBackgrounds, type ProfileBackground} from '../shared/profileAppearance';
import {loungeText as L} from './loungeText';
import {SEEKER_ID} from './seekerMotion';
import {characterAppearance} from './characterAppearance';
import {avatarHtml, avatarPresets} from './social';
import {t} from '../i18n';
import '../styles/profileAppearance.css';

export const appearanceTitle = () => L('キャラクター・背景', 'Character & background', '캐릭터 · 배경');
export const backgroundNames: Record<ProfileBackground, [string,string,string]> = {
  plain: ['白','White','흰색'],
  slate: ['墨','Slate','먹색'],
  navy: ['紺','Navy','남색'],
  sky: ['空','Sky','하늘색'],
  sage: ['若葉','Sage','연녹색'],
  sand: ['砂','Sand','모래색'],
  rose: ['薄紅','Rose','장미색'],
  violet: ['藤','Wisteria','등나무색'],
};

export function openAppearancePicker(current: string | null, background: string | undefined,
  save: (avatar: string | null, background: ProfileBackground) => Promise<void>) {
  const previous = document.activeElement as HTMLElement | null;
  const dialog = document.createElement('dialog');
  dialog.className = 'appearance-picker modal';
  dialog.setAttribute('aria-labelledby', 'appearance-title');
  const ids = avatarPresets();
  let selected = !current || ['SEEKER_RED','SEEKER_BLUE'].includes(current) ? SEEKER_ID : current;
  if (!ids.includes(selected)) ids.unshift(selected);
  let scene = profileBackground(background);
  let saving = false;
  dialog.innerHTML = `<h2 id="appearance-title">${appearanceTitle()}</h2>
    <div class="appearance-preview" aria-hidden="true"><div class="appearance-aperture"><img alt=""></div></div>
    <fieldset><legend>${L('キャラクター','Character','캐릭터')}</legend><div class="appearance-options">
    ${ids.map((id,i) => `<button type="button" data-character="${i}">${avatarHtml(id,'',34)} ${characterAppearance(id).name()}</button>`).join('')}</div></fieldset>
    <fieldset><legend>${L('対戦アバターの背景','Duel portrait background','대전 아바타 배경')}</legend><div class="appearance-options">
    ${starterBackgrounds.map(id => `<button type="button" data-scene="${id}"><i class="appearance-swatch" data-background="${id}"></i>${L(...backgroundNames[id])}</button>`).join('')}</div></fieldset>
    <p role="status"></p><div class="modal-row"><button class="btn btn-ghost" data-cancel>${t('common.cancel')}</button>
    <button class="btn btn-gold" data-save>${L('保存','Save','저장')}</button></div>`;
  const paint = () => {
    const preview = dialog.querySelector<HTMLElement>('.appearance-preview')!;
    preview.dataset.background = scene;
    preview.querySelector('img')!.src = characterAppearance(selected).portrait;
    dialog.querySelectorAll<HTMLButtonElement>('[data-character]').forEach(b => b.setAttribute('aria-pressed',String(ids[Number(b.dataset.character)]===selected)));
    dialog.querySelectorAll<HTMLButtonElement>('[data-scene]').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.scene===scene)));
  };
  const close = () => { dialog.close(); dialog.remove(); if(previous?.isConnected) previous.focus(); };
  dialog.oncancel = event => { event.preventDefault(); if(!saving) close(); };
  dialog.onclick = async event => {
    const button = (event.target as Element).closest('button');
    if (!button || saving) return;
    if (button.hasAttribute('data-cancel')) { close(); return; }
    if (button.hasAttribute('data-save')) {
      saving = true;
      const buttons = dialog.querySelectorAll('button');
      buttons.forEach(b => b.disabled = true);
      try { await save(selected, scene); close(); }
      catch (err) {
        dialog.querySelector('[role=status]')!.textContent = (err as Error).message;
        buttons.forEach(b => b.disabled = false); saving = false;
      }
      return;
    }
    if (button.dataset.character !== undefined) selected = ids[Number(button.dataset.character)];
    if (button.dataset.scene) scene = profileBackground(button.dataset.scene);
    paint();
  };
  paint(); document.body.append(dialog); dialog.showModal();
  return close;
}
