import type {App,Screen} from '../router';
import {api} from '../net/api';
import type {TutorialAction} from '../shared/tutorialLesson';
import {loungeText as l} from '../ui/loungeText';
import {esc} from '../i18n';
export const basicsPendingKey=(id:string)=>'lore:onboarding:basics-pending:'+id;
/** Reward receipt is persisted before entering the real shop; failed requests are retryable. */
export function mountOnboarding(app:App,actions?:TutorialAction[]):Screen {
 const uid=app.user?.id,wrap=document.createElement('div');wrap.className='screen tut-screen tutorial-parts-screen';app.root.append(wrap);
 let dead=false,busy=false;
 if(uid&&actions)try{localStorage.setItem(basicsPendingKey(uid),JSON.stringify(actions));}catch{}
 const load=async()=>{
  if(busy)return;busy=true;
  wrap.innerHTML=`<main class="tutorial-parts-shell lore-surface"><p role="status">${l('続きの案内を準備しているよ…','Preparing your next steps…','다음 안내를 준비하고 있어…')}</p></main>`;
  try{
   if(!uid||uid==='local-guest-user'){wrap.innerHTML=`<main class="tutorial-parts-shell lore-surface"><p>${l('基本をクリアしたね！ 報酬を受け取り、ガチャとデッキ作りへ進むにはログインしてね。','Basics complete! Sign in to claim your reward and continue to the shop and deck builder.','기본 완료! 보상을 받고 뽑기와 덱 만들기를 계속하려면 로그인해 줘.')}</p><button class="lore-button" data-home>${l('ホームへ','Home','홈으로')}</button></main>`;wrap.querySelector<HTMLButtonElement>('[data-home]')!.onclick=()=>app.home();return;}
   let transcript=actions;
   if(!transcript)try{transcript=JSON.parse(localStorage.getItem(basicsPendingKey(uid))??'null')??undefined;}catch{}
   const status=transcript?await api.completeBasics(transcript):await api.onboarding();
   if(dead||app.user?.id!==uid)return;
   if(transcript)try{localStorage.removeItem(basicsPendingKey(uid));}catch{}
   app.user.credits=status.credits;document.dispatchEvent(new Event('lore:user'));
   if(status.stage==='basics'){app.tutorialPart(0);return;}
   if(status.stage==='gacha'||status.stage==='starter'){app.shop({tutorial:status.stage});return;}
   if(status.stage==='deck'){
    const collection=await api.collection();if(dead||app.user?.id!==uid)return;
    app.user.starterCards=collection.starterCards;app.user.credits=collection.credits;
    app.deck({tutorial:true});return;
   }
   app.tutorial({tab:'book',onboarding:status.stage==='book'});
  }catch(error){if(dead)return;wrap.innerHTML=`<main class="tutorial-parts-shell lore-surface"><p role="alert">${esc((error as Error).message)}</p><button class="lore-button lore-button-primary" data-retry>${l('再試行','Retry','재시도')}</button><button class="lore-button" data-home>${l('あとで続ける','Continue later','나중에 계속')}</button></main>`;wrap.querySelector<HTMLButtonElement>('[data-retry]')!.onclick=()=>void load();wrap.querySelector<HTMLButtonElement>('[data-home]')!.onclick=()=>app.home();}
  finally{busy=false;}
 };
 void load();return{destroy(){dead=true;wrap.remove();}};
}
