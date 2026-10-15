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
    <p>${confirmSkip?text('チュートリアルをクリアしない場合、クリア報酬の合計3,000シャードは受け取れません。それでもよろしいですか？','Without completing the tutorial, you will not receive its total reward of 3,000 Shards. Continue anyway?','튜토리얼을 완료하지 않으면 완료 보상 합계 3,000샤드를 받을 수 없어요. 그래도 진행할까요?'):text('私はゼノ。まずは「どうしたら勝てるか」から説明するよ。そのあと、カードを1枚ずつ使ってみよう。','I’m Zeno. First, I’ll explain how to win. Then we’ll try playing cards, one at a time.','저는 제노예요. 먼저 이기는 방법을 알려 줄게요. 그다음 카드를 한 장씩 써 봐요.')}</p>
    <div class="welcome-reward">${text('12の実習 × 250シャード = 合計3,000シャード','12 lessons × 250 Shards = 3,000 Shards total','12개 실습 × 250샤드 = 합계 3,000샤드')}</div><p class="welcome-note">${text('途中でやめても、チュートリアルページから続けられます。後から始めた場合も初回クリア報酬を受け取れます。','You can return to the tutorial page any time. Starting later still earns first-clear rewards.','언제든 튜토리얼 페이지에서 이어서 할 수 있어요. 나중에 시작해도 첫 완료 보상을 받을 수 있어요.')}</p>
    ${failed?`<p role="alert">${text('選択を保存できませんでした。もう一度お試しください。','Could not save your choice. Please try again.','선택을 저장하지 못했어요. 다시 시도하세요.')}</p>`:''}
    <div class="welcome-actions"><button class="btn btn-primary" data-yes ${busy?'disabled':''}>${confirmSkip?text('実習を始める','Start the lessons','실습 시작'):text('はい、始める','Yes, start','네, 시작할게요')}</button><button class="btn btn-ghost" data-no ${busy?'disabled':''}>${confirmSkip?text('受け取らずに進む','Continue without rewards','보상 없이 진행'):text('いいえ','No','아니요')}</button>${confirmSkip?`<button class="btn btn-ghost" data-back ${busy?'disabled':''}>${text('戻る','Back','뒤로')}</button>`:''}</div>`;
    copy.querySelector('[data-yes]')!.addEventListener('click',()=>void save('start'));
    copy.querySelector('[data-no]')!.addEventListener('click',()=>{if(confirmSkip)void save('skip');else{confirmSkip=true;render();copy.querySelector<HTMLElement>('h1')?.setAttribute('tabindex','-1');copy.querySelector<HTMLElement>('h1')?.focus();}});
    copy.querySelector('[data-back]')?.addEventListener('click',()=>{confirmSkip=false;render();});
  };
  const save=async(decision:'start'|'skip')=>{if(busy)return;busy=true;failed=false;render();try{await api.tutorialDecision(decision);if(disposed)return;decision==='start'?app.tutorial():app.home();}catch{failed=true;}finally{busy=false;if(!disposed)render();}};
  render();const unsub=onLangChange(render);return{destroy(){disposed=true;unsub();spirit.destroy();}};
}
