import type { App, Screen } from '../router';
import { api } from '../net/api';
import { loungeText as text } from '../ui/loungeText';
import { mountManaSpirit } from '../ui/manaSpirit';
import { onLangChange } from '../i18n';
import '../styles/tutorialAcademy.css';
export function mountTutorialWelcome(app:App):Screen {
  const root=document.createElement('section');root.className='screen academy-welcome';
  root.innerHTML='<div class="welcome-sheet"><div class="welcome-spirit"></div><div class="welcome-copy"></div></div>';app.root.append(root);
  const spirit=mountManaSpirit(root.querySelector('.welcome-spirit')!);const copy=root.querySelector<HTMLElement>('.welcome-copy')!;
  let confirmSkip=false,busy=false,failed=false,disposed=false;
  const render=()=>{copy.innerHTML=`<span class="menu-eyebrow">WELCOME TO BIBLION</span><h1>${confirmSkip?text('実習をせずに進みますか？','Continue without the lessons?','실습 없이 진행할까요?'):text('ビブリオンへようこそ、シーカー。','Welcome to Biblion, Seeker.','비블리온에 오신 것을 환영해요, 시커.')}</h1>
    <p>${confirmSkip?text('ホームへ進みますか？チュートリアルはあとからいつでも開けます。','Continue to Home? You can open the tutorial at any time later.','홈으로 이동할까요? 튜토리얼은 나중에 언제든 다시 열 수 있어요.'):text('私はゼノ。まずは「どうしたら勝てるか」から説明するよ。そのあと、カードを1枚ずつ使ってみよう。','I’m Zeno. First, I’ll explain how to win. Then we’ll try playing cards, one at a time.','저는 제노예요. 먼저 이기는 방법을 알려 줄게요. 그다음 카드를 한 장씩 써 봐요.')}</p>
    <div class="welcome-reward">${text('全13パート · 報酬なし · いつでも復習可能','13 parts · No rewards · Replay any time','13개 파트 · 보상 없음 · 언제든 복습 가능')}</div><p class="welcome-note">${text('短い案内を読んで、自分で操作し、結果を確認します。途中でやめてもチュートリアルページから続けられます。','Read a short guide, perform the action yourself, and check the result. You can resume from the tutorial page at any time.','짧은 안내를 읽고 직접 조작한 뒤 결과를 확인해요. 중간에 나가도 튜토리얼 페이지에서 이어서 할 수 있어요.')}</p>
    ${failed?`<p role="alert">${text('選択を保存できませんでした。もう一度お試しください。','Could not save your choice. Please try again.','선택을 저장하지 못했어요. 다시 시도하세요.')}</p>`:''}
    <div class="welcome-actions"><button class="btn btn-primary" data-yes ${busy?'disabled':''}>${confirmSkip?text('チュートリアルを始める','Start tutorial','튜토리얼 시작'):text('はい、始める','Yes, start','네, 시작할게요')}</button><button class="btn btn-ghost" data-no ${busy?'disabled':''}>${confirmSkip?text('ホームへ進む','Continue to Home','홈으로 이동'):text('あとで','Later','나중에')}</button>${confirmSkip?`<button class="btn btn-ghost" data-back ${busy?'disabled':''}>${text('戻る','Back','뒤로')}</button>`:''}</div>`;
    copy.querySelector('[data-yes]')!.addEventListener('click',()=>void save('start'));
    copy.querySelector('[data-no]')!.addEventListener('click',()=>{if(confirmSkip)void save('skip');else{confirmSkip=true;render();copy.querySelector<HTMLElement>('h1')?.setAttribute('tabindex','-1');copy.querySelector<HTMLElement>('h1')?.focus();}});
    copy.querySelector('[data-back]')?.addEventListener('click',()=>{confirmSkip=false;render();});
  };
  const save=async(decision:'start'|'skip')=>{if(busy)return;busy=true;failed=false;render();try{await api.tutorialDecision(decision);if(disposed)return;decision==='start'?app.tutorial():app.home();}catch{failed=true;}finally{busy=false;if(!disposed)render();}};
  render();const unsub=onLangChange(render);return{destroy(){disposed=true;unsub();spirit.destroy();}};
}
