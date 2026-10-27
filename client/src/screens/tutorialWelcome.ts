import type { App, Screen } from '../router';
import { api } from '../net/api';
import { loungeText as text } from '../ui/loungeText';
import { mountManaSpirit } from '../ui/manaSpirit';
import { onLangChange } from '../i18n';
import '../styles/tutorialAcademy.css';
import '../styles/zenoSpeech.css';
export function mountTutorialWelcome(app:App):Screen {
  const root=document.createElement('section');root.className='screen academy-welcome';
  root.innerHTML='<div class="welcome-conversation"><div class="welcome-spirit"></div><div class="welcome-copy zeno-speech"></div></div>';app.root.append(root);
  const spirit=mountManaSpirit(root.querySelector('.welcome-spirit')!);const copy=root.querySelector<HTMLElement>('.welcome-copy')!;
  let confirmSkip=false,busy=false,failed=false,disposed=false;
  const render=()=>{copy.innerHTML=`<div class="zeno-speech-content"><span class="zeno-speaker">${text('ゼノ','Zeno','제노')}</span><h1>${confirmSkip?text('先にホームへ行く？','Head home first?','홈으로 먼저 갈래?'):text('やあ、よく来たね！','Hey, welcome to Biblion!','어서 와, 시커!')}</h1>
    <p>${confirmSkip?text('わかった！ ぼくの案内はあとからでも大丈夫。気が向いたら、チュートリアルで会おうね。','Sure! We can do this later. Come find me in the tutorial whenever you feel like it.','좋아! 안내는 나중에 봐도 괜찮아. 생각나면 튜토리얼에서 만나자.'):text('ぼくはゼノ！ まずは勝ち方を覚えて、カードを1枚ずつ使ってみよう。ぼくが一緒にいるから、気楽にやってみてね。','I’m Zeno! Let’s learn how to win, then try a few cards together. Take your time—I’m right here.','난 제노야! 먼저 이기는 법을 익히고, 카드를 한 장씩 써 보자. 내가 옆에 있으니까 편하게 해 봐.')}</p>
    <div class="welcome-reward">${text('基本から応用まで · いつでも復習できるよ','From basics to card abilities · Replay any time','기본부터 카드 능력까지 · 언제든 복습 가능')}</div><p class="welcome-note">${text('ぼくと話して、ちょっと試して。その繰り返しで覚えていこう。途中で休んでも、いつでも続きから遊べるよ。','We’ll chat, try a move, and see what happens. Take a break whenever you like; you can always come back.','나랑 얘기하고, 직접 해 보고. 그렇게 하나씩 익히자. 쉬었다 와도 언제든 이어서 할 수 있어.')}</p>
    ${failed?`<p role="alert">${text('あれ、うまく保存できなかったみたい。もう一度試してくれる？','Could not save your choice. Please try again.','어라, 저장이 안 됐네. 한 번 더 해 줄래?')}</p>`:''}
    <div class="welcome-actions"><button class="btn btn-primary" data-yes ${busy?'disabled':''}>${confirmSkip?text('チュートリアルを始める','Start tutorial','튜토리얼 시작'):text('はい、始める','Yes, start','네, 시작할게요')}</button><button class="btn btn-ghost" data-no ${busy?'disabled':''}>${confirmSkip?text('ホームへ進む','Continue to Home','홈으로 이동'):text('あとで','Later','나중에')}</button>${confirmSkip?`<button class="btn btn-ghost" data-back ${busy?'disabled':''}>${text('戻る','Back','뒤로')}</button>`:''}</div></div>`;
    copy.querySelector('[data-yes]')!.addEventListener('click',()=>void save('start'));
    copy.querySelector('[data-no]')!.addEventListener('click',()=>{if(confirmSkip)void save('skip');else{confirmSkip=true;render();copy.querySelector<HTMLElement>('h1')?.setAttribute('tabindex','-1');copy.querySelector<HTMLElement>('h1')?.focus();}});
    copy.querySelector('[data-back]')?.addEventListener('click',()=>{confirmSkip=false;render();});
  };
  const save=async(decision:'start'|'skip')=>{if(busy)return;busy=true;failed=false;render();try{await api.tutorialDecision(decision);if(disposed)return;decision==='start'?app.tutorial():app.home();}catch{failed=true;}finally{busy=false;if(!disposed)render();}};
  render();const unsub=onLangChange(render);return{destroy(){disposed=true;unsub();spirit.destroy();}};
}
