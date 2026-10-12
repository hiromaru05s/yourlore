import './hoodedSeekers.css';
import {seekerPortrait, playSeeker, resetSeeker, disposeSeeker, SEEKER_ACTIONS, seekerDuration, type SeekerAction} from '../ui/seekerAnimation';
import {seekerActionLabel} from '../ui/seekerLabels';
import {setLang} from '../i18n';
if(import.meta.env.DEV){
  setLang('ja');
  const app=document.getElementById('app')!;
  app.innerHTML=`<header class="review-header"><a href="/hooded-seekers.html" class="wordmark">LORE<span>CHARACTER STUDIO</span></a><span class="review-tag">HOODED SEEKERS · 01</span></header>
  <section class="review-intro"><div><p class="eyebrow">THE FACELESS TWO</p><h1>フードのシーカー</h1><p>小さな仕草で、デュエルの一瞬を。</p></div><div class="spec"><b>02<span>キャラクター</span></b><b>07<span>動作</span></b><b>08<span>各フレーム</span></b></div></section>
  <nav class="review-tabs" aria-label="プレビュー"><button data-tab="motion" aria-selected="true">アニメーション</button><button data-tab="board" aria-selected="false">実盤面</button><button data-tab="profile" aria-selected="false">プロフィール設定</button></nav>
  <section id="motionPanel"><div class="duo">${(['blue','red'] as const).map((color,i)=>`<article class="seeker-card ${color}"><div class="card-heading"><span>0${i+1}</span><h2>${i?'フードの女':'フードの男'}</h2><small>${i?'CRIMSON':'MIDNIGHT'}</small></div><div class="sprite-stage" data-color="${color}"></div><div class="state-line"><span class="state-dot"></span><b data-status="${color}">待機</b><span data-counter="${color}">01 / 08</span></div><div class="strip" data-strip="${color}" aria-label="8フレーム一覧"></div></article>`).join('')}</div>
  <div class="playback"><div class="action-controls">${SEEKER_ACTIONS.map(action=>`<button data-action="${action}" aria-pressed="${action==='idle'}">${seekerActionLabel(action)}</button>`).join('')}</div><button id="cycle" aria-pressed="true">■ 連続再生を止める</button></div><p class="review-note">1〜9ダメージ・烙印は通常被弾、10以上は強い被弾。動作後は待機へ戻り、敗北時は膝をついた姿勢を保ちます。</p></section>
  <section id="boardPanel" hidden><div class="embed-intro"><p>実際のゲーム盤面・アバター枠・イベント処理で確認できます。</p><a href="/hooded-board.html" target="_blank">盤面を大きく開く ↗</a></div><iframe title="実盤面プレビュー" data-src="/hooded-board.html"></iframe></section>
  <section id="profilePanel" hidden><div class="embed-intro"><p>プロフィール内の「キャラクター」から男女を選び、動作を確認して保存できます。</p><span>このプレビューの保存先は端末内です。</span></div><iframe title="プロフィール設定プレビュー" data-src="/profile-lab.html"></iframe></section>
  <footer>128 × 128 PX / WHITE BACKGROUND<span>LORE — BIBLION</span></footer>`;
  const canvases=(['blue','red'] as const).map(color=>{const canvas=seekerPortrait(color);app.querySelector(`[data-color="${color}"]`)!.append(canvas);return canvas;});
  let selected:SeekerAction='idle',autoplay=true,timer=0,step=0;
  const sequence:SeekerAction[]=['idle','mana','idle','heal','idle','hurt','idle','heavy','idle','victory','idle','defeat'];
  function strip(action:SeekerAction){
    const row=SEEKER_ACTIONS.indexOf(action);
    app.querySelectorAll<HTMLElement>('[data-strip]').forEach(el=>{el.innerHTML=Array.from({length:8},(_,frame)=>`<figure><div style="background-image:url('/art/seekers/hooded-v1/${el.dataset.strip}.webp');background-position:${frame*100/7}% ${row*100/6}%"></div><figcaption>${String(frame+1).padStart(2,'0')}</figcaption></figure>`).join('');});
  }
  function play(action:SeekerAction){
    for(const canvas of canvases){if(selected==='defeat'||selected==='victory')resetSeeker(canvas);playSeeker(canvas,action);}
    selected=action;strip(action);
    app.querySelectorAll<HTMLElement>('button[data-action]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.action===action)));
  }
  function cycle(){if(!autoplay)return;const action=sequence[step++%sequence.length];play(action);timer=window.setTimeout(cycle,action==='idle'?1600:seekerDuration(action)+600);}
  const cycleButton=app.querySelector<HTMLButtonElement>('#cycle')!;
  function setAuto(value:boolean){autoplay=value;clearTimeout(timer);cycleButton.setAttribute('aria-pressed',String(value));cycleButton.textContent=value?'■ 連続再生を止める':'▶ 連続再生';if(value)cycle();}
  cycleButton.onclick=()=>setAuto(!autoplay);
  app.querySelectorAll<HTMLButtonElement>('button[data-action]').forEach(b=>b.onclick=()=>{setAuto(false);play(b.dataset.action as SeekerAction);});
  app.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(button=>button.onclick=()=>{
    setAuto(false);const tab=button.dataset.tab!;
    app.querySelectorAll<HTMLElement>('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b===button)));
    for(const id of ['motion','board','profile']){const panel=app.querySelector<HTMLElement>(`#${id}Panel`)!;panel.hidden=id!==tab;const iframe=panel.querySelector('iframe');if(id===tab&&iframe&&!iframe.src)iframe.src=iframe.dataset.src!;}
  });
  const status=window.setInterval(()=>{canvases.forEach(canvas=>{const color=canvas.dataset.seeker!;app.querySelector(`[data-status="${color}"]`)!.textContent=seekerActionLabel((canvas.dataset.action??'idle') as SeekerAction);app.querySelector(`[data-counter="${color}"]`)!.textContent=`${String(Number(canvas.dataset.frame??0)+1).padStart(2,'0')} / 08`;});},80);
  cycle();
  window.addEventListener('pagehide',()=>{clearTimeout(timer);clearInterval(status);canvases.forEach(disposeSeeker);},{once:true});
}
