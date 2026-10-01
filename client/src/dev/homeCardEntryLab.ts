import './homeEntryLab.css';
import './homeCardEntryLab.css';
const studies = [
 ['銀翼のファン','中央から扇状に広がり、銀の縁を残して上空へ。④を素直に磨いた案。','01 / 王道'],
 ['双翼のオープン','扇の左右が二手に分かれ、中央にホームへの通り道を開く。','02 / 左右へ'],
 ['リレー・ディール','左から一枚ずつ刻印が点灯。連続するリズムでカードを送り出す。','03 / 連鎖'],
 ['シルバー・フリップ','扇状のカードが順番に裏返り、薄い銀の断面を見せながら開く。','04 / 反転'],
 ['弧を描く招待','扇全体が右上へ大きな弧を描き、ホームを下から見せる。','05 / 円弧'],
 ['カードの回廊','左右に並んだカードの間を前進。手前のカードが画面の外へ抜ける。','06 / 奥行き'],
 ['一枚への収束','開いた扇を一枚に重ね、手前へ引き抜く勢いでホームを開く。','07 / 緩急'],
 ['デッキへの帰還','広がったカードがホームのデッキへ収まり、接触の光で終わる。','08 / 着地'],
];
if(new URLSearchParams(location.search).has('scene')) {
 void import('./homeCardEntryScene');
} else {
 document.body.className='entry-lab';
 document.body.innerHTML=`<header class="lab-head"><div><span class="eyebrow">LORE / CARD INVITATION — 08</span><h1>カードから、ホームへ。</h1><p>選んだ④を起点に、8通りの招待。</p></div><span class="lab-stamp">HOME ENTRANCE<br>2026.09.29 · LOCAL PREVIEW</span></header>
 <main class="lab-main"><nav class="study-list" aria-label="演出パターン">${studies.map((s,i)=>`<button data-study="${i}" aria-pressed="${i===0}"><span class="study-number">0${i+1}</span><span><b>${s[0]}</b><small>${s[2]}</small></span><span class="study-arrow">↗</span></button>`).join('')}</nav><section class="view-area"><div class="view-top"><span id="caption"></span><div><button id="compare">8案を並べる</button><button id="baseline">元の④と比較</button><button id="mobile">スマホ</button><button id="full">全画面</button></div></div><div id="stages"></div><div class="transport"><button id="replay" class="primary">↻ 再生</button><button id="pause">一時停止</button><input id="seek" type="range" min="0" max="4400" value="0" step="1" aria-label="再生位置"><output id="clock">0.00 / 4.40</output><select id="speed" aria-label="再生速度"><option value="1">1×</option><option value="0.5">0.5×</option><option value="0.25">0.25×</option></select><label><input id="loop" type="checkbox" checked> ループ</label><button id="skip">ホームへ</button></div><p id="description"></p><p class="lab-note">実際のローディングとホームの描画を使用。比較用の固定プロフィール・無音。8案とも同じ4.4秒の時間軸。採用前のプレビュー。</p></section></main>`;
 const $=<T extends HTMLElement>(s:string)=>document.querySelector<T>(s)!;
 let selected=0,grid=false,baseline=false,mobile=false,time=0,playing=true,previous=performance.now(),ready=false;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 if(reduced.matches){time=4400;playing=false;}
 const frames:HTMLIFrameElement[]=[];
 function send(){for(const f of frames.filter(f=>!f.parentElement!.hidden)) f.contentWindow?.postMessage({kind:'lore-entry-time',time:Math.min(time,4400),reduced:reduced.matches},location.origin);$('#seek').setAttribute('aria-valuetext',`${(Math.min(time,4400)/1000).toFixed(2)}秒`);$<HTMLInputElement>('#seek').value=String(Math.min(time,4400));$('#clock').textContent=`${(Math.min(time,4400)/1000).toFixed(2)} / 4.40`;$('#pause').textContent=playing?'一時停止':'再開';}
 function fit(){for(const f of frames){const host=f.parentElement!;const w=mobile?390:1280,h=mobile?740:720;f.style.width=w+'px';f.style.height=h+'px';f.style.transform=`scale(${host.clientWidth/w})`;host.style.height=host.clientWidth*h/w+'px';}}
 function show(){for(let i=0;i<9;i++){frames[i].parentElement!.hidden=i===8?!baseline:(!grid&&i!==selected);}$('#stages').className=(grid||baseline?'grid ':'')+(mobile?'phone':'');$('#caption').textContent=grid?'EIGHT INVITATIONS / 同期比較':baseline?'選択案 ＋ 元の④ / 同期比較':`0${selected+1} — ${studies[selected][0]}`;$('#description').textContent=studies[selected][1];document.querySelectorAll<HTMLButtonElement>('[data-study]').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===selected)));$('#compare').textContent=grid?'1案を大きく':'8案を並べる';$('#mobile').textContent=mobile?'PC':'スマホ';$('#baseline').textContent=baseline?'比較を閉じる':'元の④と比較';requestAnimationFrame(()=>{fit();send();});}
 for(let i=0;i<9;i++){const host=document.createElement('div');host.className='scene-host';const title=i===8?'REFERENCE — 元の④':`0${i+1} ${studies[i][0]}`;host.innerHTML=`<iframe title="${title}" src="${i===8?'/home-entry-lab.html?scene=3':`/home-card-entry-lab.html?scene=${i}`}"></iframe><span class="frame-label">${title}</span>`;$('#stages').append(host);frames.push(host.querySelector('iframe')!);}

 show();new ResizeObserver(fit).observe($('#stages'));
 document.querySelectorAll<HTMLButtonElement>('[data-study]').forEach((b,i)=>b.onclick=()=>{selected=i;grid=false;time=0;playing=true;show();send();});
 $('#compare').onclick=()=>{grid=!grid;baseline=false;show();};$('#baseline').onclick=()=>{baseline=!baseline;grid=false;show();};$('#mobile').onclick=()=>{mobile=!mobile;show();};$('#full').onclick=()=>{if(document.fullscreenElement)void document.exitFullscreen();else void $('#stages').requestFullscreen().catch(()=>{});};
 $('#replay').onclick=()=>{time=0;playing=true;send();};$('#pause').onclick=()=>{playing=!playing;};$('#skip').onclick=()=>{time=4400;playing=false;send();};$<HTMLInputElement>('#seek').oninput=()=>{time=+$<HTMLInputElement>('#seek').value;playing=false;send();};
 const loaded=new Set<Window>();window.addEventListener('message',e=>{if(e.origin!==location.origin||!frames.some(f=>f.contentWindow===e.source))return;if(e.data.kind==='lore-entry-ready'){loaded.add(e.source as Window);ready=loaded.size===9;send();if(ready)document.body.dataset.ready='true';}});
 reduced.addEventListener('change',()=>{playing=false;time=4400;send();});
 let raf=0,lastPaint=0;function tick(now:number){if(ready&&playing&&!document.hidden){time+=Math.min(now-previous,80)*+$<HTMLSelectElement>('#speed').value;if(time>5000){if($<HTMLInputElement>('#loop').checked)time=0;else{time=4400;playing=false;}}if(now-lastPaint>32){send();lastPaint=now;}}previous=now;raf=requestAnimationFrame(tick);}raf=requestAnimationFrame(tick);window.addEventListener('pagehide',()=>cancelAnimationFrame(raf));
}
