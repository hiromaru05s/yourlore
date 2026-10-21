import {parseUsername} from '../shared/username';
import {loungeText as text} from './loungeText';
import {api} from '../net/api';
import type {App} from '../router';
import '../styles/username.css';

/** Shared by onboarding and profile editing; no identity-provider autofill. */
export function mountUsernameForm(host:HTMLElement, app:App, initial:string, onSaved:()=>void):()=>void {
  const account=app.user?.id;
  let dead=false,busy=false;
  const form=document.createElement('form');form.className='username-form';
  form.innerHTML=`<label class="field-label">${text('公開ユーザー名','Public username','공개 사용자 이름')}<input class="input" name="public-username" type="text" maxlength="24" autocomplete="off" autocapitalize="off" spellcheck="false" required aria-describedby="username-help username-error"></label>
    <p id="username-help" class="set-desc">${text('対戦相手・ランキング・フレンドに表示されます。本名やメールアドレスなど、個人情報は使わないでください。','Visible to opponents, rankings, and friends. Do not use your real name, email address, or other personal information.','상대, 랭킹, 친구에게 표시돼요. 실명, 이메일 주소 등 개인정보는 사용하지 마세요.')}</p>
    <p class="set-desc">${text('2〜24文字。文字・数字・スペース・._-が使えます。後からプロフィールで変更できます。','2–24 letters, numbers, spaces, or ._-. You can change it in your profile later.','2~24자의 문자, 숫자, 공백, ._-를 사용할 수 있어요. 나중에 프로필에서 변경할 수 있어요.')}</p>
    <p id="username-error" role="alert"></p><button class="btn btn-gold" type="submit">${initial?text('保存する','Save','저장'):text('保存して進む','Save and continue','저장하고 계속')}</button>`;
  host.append(form);
  const input=form.querySelector('input')!,save=form.querySelector('button')!,error=form.querySelector<HTMLElement>('[role=alert]')!;
  input.value=initial;
  const update=()=>{save.disabled=busy||parseUsername(input.value)===null;};
  input.oninput=()=>{error.textContent='';update();};update();input.focus();
  form.onsubmit=async event=>{
    event.preventDefault();const name=parseUsername(input.value);if(busy||!name)return;
    busy=true;input.disabled=true;update();error.textContent='';
    try {
      const result=await api.updateMe({display:name});
      if(result.ok!==true||result.needsUsername!==false||typeof result.display!=='string')throw Error(text('保存を確認できませんでした。もう一度お試しください。','Could not confirm the save. Please retry.','저장을 확인하지 못했어요. 다시 시도하세요.'));
      if(dead||!app.user||app.user.id!==account)return;
      app.user.display=result.display;app.user.needsUsername=false;
      document.dispatchEvent(new Event('lore:user'));onSaved();
    } catch(e) {if(!dead)error.textContent=(e as Error).message;}
    finally {busy=false;if(!dead){input.disabled=false;update();}}
  };
  return()=>{dead=true;form.remove();};
}
