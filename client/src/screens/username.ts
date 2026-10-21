import type {App,Screen} from '../router';
import {mountUsernameForm} from '../ui/usernameForm';
import {loungeText as text} from '../ui/loungeText';
import {onLangChange} from '../i18n';

export function mountUsername(app:App):Screen {
  const root=document.createElement('section');root.className='screen username-screen';app.root.append(root);
  let dispose:()=>void=()=>{};
  const render=()=>{
    const draft=root.querySelector<HTMLInputElement>('input')?.value??'';dispose();
    root.innerHTML=`<div class="username-sheet"><span class="menu-eyebrow">YOUR PUBLIC NAME</span><h1>${text('ユーザー名を設定','Choose your username','사용자 이름 설정')}</h1><p>${text('安心して遊べるように、ゲーム内で使う名前を決めましょう。Googleの氏名やメールアドレスは自動で使いません。','Choose a name to use in the game. We never automatically use your Google name or email address.','게임에서 사용할 이름을 정하세요. Google 실명이나 이메일 주소는 자동으로 사용하지 않아요.')}</p><div data-username-form></div><button class="btn btn-ghost" data-logout>${text('ログアウト','Log out','로그아웃')}</button><p data-logout-error role="alert"></p></div>`;
    dispose=mountUsernameForm(root.querySelector('[data-username-form]')!,app,draft,()=>app.afterLogin());
    const logout=root.querySelector<HTMLButtonElement>('[data-logout]')!;
    logout.onclick=async()=>{logout.disabled=true;try{await app.logout();}catch{if(root.isConnected){root.querySelector('[data-logout-error]')!.textContent=text('ログアウトできませんでした。再試行してください。','Could not log out. Please retry.','로그아웃하지 못했어요. 다시 시도하세요.');logout.disabled=false;}}};
  };
  render();const unsub=onLangChange(render);return{destroy(){dispose();unsub();root.remove();}};
}
