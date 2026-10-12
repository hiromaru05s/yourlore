import './hoodedSeekers.css';
import {seekerPortrait, playSeeker, disposeSeeker} from '../ui/seekerAnimation';
import {seekerPoster, SEEKER_ROOT} from '../ui/seekerMotion';
import {setLang} from '../i18n';
if(import.meta.env.DEV){
  setLang('ja');
  const app=document.getElementById('app')!;
  app.innerHTML=`<header class="review-header"><a href="/hooded-seekers.html" class="wordmark">LORE<span>CHARACTER PREVIEW</span></a><span class="review-tag">BIBLION · SEEKER</span></header>
  <section class="review-intro"><div><p class="eyebrow">THE FACELESS SEEKER</p><h1>フードのシーカー</h1><p>顔を隠し、記録と向き合う。</p></div><span class="character-count">01<span>キャラクター</span></span></section>
  <nav class="review-tabs" aria-label="プレビュー"><button data-tab="motion" aria-selected="true">キャラクター</button><button data-tab="board" aria-selected="false">実盤面</button><button data-tab="profile" aria-selected="false">プロフィール設定</button></nav>
  <section id="motionPanel"><div class="portrait-review"><div class="portrait-paper"><div id="portraitStage"></div><div class="state-line"><span class="state-dot"></span><b id="poseStatus">通常</b><span>HOODED SEEKER</span></div></div><div class="portrait-notes"><p class="eyebrow">ONE QUIET PRESENCE</p><h2>フードの奥は、深い影。</h2><p>性別を持たない一人のシーカー。<br>肩から胸上までのシルエットを、<br>輪郭線と柔らかな色面で描きました。</p><div class="pose-pair"><figure><img src="${seekerPoster()}" alt="通常の静止画"><figcaption>通常</figcaption></figure><figure><img src="${SEEKER_ROOT}/hit.webp" alt="被弾の1コマ"><figcaption>被弾の1コマ</figcaption></figure></div><button id="hitPreview">被弾を確認 <span>↗</span></button><p class="review-note">通常時は静止。被弾した瞬間だけ姿勢を変え、元の絵に戻ります。</p></div></div></section>
  <section id="boardPanel" hidden><div class="embed-intro"><p>実際のアバター枠と盤面で、胸上までの構図と被弾を確認できます。</p><a href="/hooded-board.html" target="_blank">盤面を大きく開く ↗</a></div><iframe title="実盤面プレビュー" data-src="/hooded-board.html"></iframe></section>
  <section id="profilePanel" hidden><div class="embed-intro"><p>プロフィールの「キャラクター」から設定できます。現在は1体です。</p><span>このプレビューの保存先は端末内です。</span></div><iframe title="プロフィール設定プレビュー" data-src="/profile-lab.html"></iframe></section>
  <footer>PAINTED PORTRAIT · ONE IMPACT POSE<span>LORE — BIBLION</span></footer>`;
  const canvas=seekerPortrait();app.querySelector('#portraitStage')!.append(canvas);
  const observer=new MutationObserver(()=>{app.querySelector('#poseStatus')!.textContent=canvas.dataset.action==='hurt'?'被弾':'通常';});
  observer.observe(canvas,{attributes:true,attributeFilter:['data-action']});
  app.querySelector<HTMLButtonElement>('#hitPreview')!.onclick=()=>playSeeker(canvas,'hurt');
  app.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(button=>button.onclick=()=>{
    const tab=button.dataset.tab!;playSeeker(canvas,'idle');
    app.querySelectorAll<HTMLElement>('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b===button)));
    for(const id of ['motion','board','profile']){const panel=app.querySelector<HTMLElement>(`#${id}Panel`)!;panel.hidden=id!==tab;const iframe=panel.querySelector('iframe');if(id===tab&&iframe&&!iframe.src)iframe.src=iframe.dataset.src!;}
  });
  window.addEventListener('pagehide',()=>{observer.disconnect();disposeSeeker(canvas);},{once:true});
}
