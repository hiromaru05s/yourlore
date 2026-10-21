import type {App} from '../router';
import {mountUsernameForm} from './usernameForm';
import {loungeText as text} from './loungeText';
import {onLangChange} from '../i18n';

export function showUsernameSetup(app:App,onSaved:()=>void):()=>void {
  const root=document.createElement('div');root.className='overlay username-setup';document.body.append(root);
  app.root.inert=true;
  let dispose:()=>void=()=>{};
  const render=()=>{
    const draft=root.querySelector<HTMLInputElement>('input')?.value??'';dispose();
    root.innerHTML=`<div class="modal username-dialog" role="dialog" aria-modal="true" aria-labelledby="username-title"><h2 id="username-title">${text('ユーザー名を設定','Choose your username','사용자 이름 설정')}</h2><p>${text('ビブリオンへようこそ。ゲーム内で使う名前を決めましょう。','Welcome to Biblion. Choose a name to use in the game.','비블리온에 오신 것을 환영해요. 게임에서 사용할 이름을 정하세요.')}</p><div data-username-form></div><button class="btn btn-ghost" data-logout>${text('ログアウト','Log out','로그아웃')}</button><p data-logout-error role="alert"></p></div>`;
    dispose=mountUsernameForm(root.querySelector('[data-username-form]')!,app,draft,onSaved);
    const logout=root.querySelector<HTMLButtonElement>('[data-logout]')!;
    logout.onclick=async()=>{logout.disabled=true;try{await app.logout();}catch{if(root.isConnected){root.querySelector('[data-logout-error]')!.textContent=text('ログアウトできませんでした。再試行してください。','Could not log out. Please retry.','로그아웃하지 못했어요. 다시 시도하세요.');logout.disabled=false;}}};
  };
  render();const unsub=onLangChange(render);return()=>{dispose();unsub();root.remove();app.root.inert=false;};
}
