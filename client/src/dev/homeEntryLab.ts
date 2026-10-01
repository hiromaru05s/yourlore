import './homeEntryLab.css';
const studies = [
 ['ビブリオンの扉','刻印が点灯し、重い扉が開く。奥にあるホームへ。','重厚 / 王道'],
 ['開かれる魔導書','装丁の縁が光り、見開きがほどけてホームになる。','物語 / 立体'],
 ['銀紋の現像','銀の線が画面を走り、紺の膜が輪郭から溶ける。','魔力 / 有機的'],
 ['カードの招待','ローディングのカードを引き継ぎ、扇状に展開。','TCG / 軽快'],
 ['ビブリオンへ','枠を抜け、館内へ進む。視線がホームへ着地する。','没入 / シネマ'],
 ['光による起動','光が背景、紋章、メニューへ順に届き、操作可能に。','端正 / 日常向け'],
];
if(new URLSearchParams(location.search).has('scene')) {
 void import('./homeEntryScene');
} else {
 document.body.className='entry-lab';
 document.body.innerHTML=`<header class="lab-head"><div><span class="eyebrow">LORE / MOTION STUDIES — 06</span><h1>ビブリオンへ、ようこそ。</h1><p>ローディングの先に、ゲームへ入る一瞬を。</p></div><span class="lab-stamp">HOME ENTRANCE<br>2026.09.29 · LOCAL PREVIEW</span></header>
 <main class="lab-main"><nav class="study-list" aria-label="演出パターン">${studies.map((s,i)=>`<button data-study="${i}" aria-pressed="${i===0}"><span class="study-number">0${i+1}</span><span><b>${s[0]}</b><small>${s[2]}</small></span><span class="study-arrow">↗</span></button>`).join('')}</nav><section class="view-area"><div class="view-top"><span id="caption"></span><div><button id="compare">6案を並べる</button><button id="mobile">スマホ</button><button id="full">全画面</button></div></div><div id="stages"></div><div class="transport"><button id="replay" class="primary">↻ 再生</button><button id="pause">一時停止</button><input id="seek" type="range" min="0" max="4400" value="0" step="1" aria-label="再生位置"><output id="clock">0.00 / 4.40</output><select id="speed" aria-label="再生速度"><option value="1">1×</option><option value="0.5">0.5×</option><option value="0.25">0.25×</option></select><label><input id="loop" type="checkbox" checked> ループ</label><button id="skip">ホームへ</button></div><p id="description"></p><p class="lab-note">実際のローディングとホームの描画を使用。比較用の固定プロフィール・無音。6案とも同じ4.4秒の時間軸。採用前のプレビュー。</p></section></main>`;
 const $=<T extends HTMLElement>(s:string)=>document.querySelector<T>(s)!;
 let selected=0,grid=false,mobile=false,time=0,playing=true,previous=performance.now(),ready=false;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 if(reduced.matches){time=4400;playing=false;}
 const frames:HTMLIFrameElement[]=[];
 function send(){for(const f of frames.filter(f=>!f.parentElement!.hidden)) f.contentWindow?.postMessage({kind:'lore-entry-time',time:Math.min(time,4400),reduced:reduced.matches},location.origin);$('#seek').setAttribute('aria-valuetext',`${(Math.min(time,4400)/1000).toFixed(2)}秒`);$<HTMLInputElement>('#seek').value=String(Math.min(time,4400));$('#clock').textContent=`${(Math.min(time,4400)/1000).toFixed(2)} / 4.40`;$('#pause').textContent=playing?'一時停止':'再開';}
 function fit(){for(const f of frames){const host=f.parentElement!;const w=mobile?390:1280,h=mobile?740:720;f.style.width=w+'px';f.style.height=h+'px';f.style.transform=`scale(${host.clientWidth/w})`;host.style.height=host.clientWidth*h/w+'px';}}
 function show(){for(let i=0;i<6;i++){frames[i].parentElement!.hidden=!grid&&i!==selected;}$('#stages').className=(grid?'grid ':'')+(mobile?'phone':'');$('#caption').textContent=grid?'SIX ENTRANCES / 同期比較':`0${selected+1} — ${studies[selected][0]}`;$('#description').textContent=studies[selected][1];document.querySelectorAll<HTMLButtonElement>('[data-study]').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===selected)));$('#compare').textContent=grid?'1案を大きく':'6案を並べる';$('#mobile').textContent=mobile?'PC':'スマホ';requestAnimationFrame(fit);}
 for(let i=0;i<6;i++){const host=document.createElement('div');host.className='scene-host';host.innerHTML=`<iframe title="${i+1} ${studies[i][0]}" src="/home-entry-lab.html?scene=${i}"></iframe><span class="frame-label">0${i+1} ${studies[i][0]}</span>`;$('#stages').append(host);frames.push(host.querySelector('iframe')!);}
 show();new ResizeObserver(fit).observe($('#stages'));
 document.querySelectorAll<HTMLButtonElement>('[data-study]').forEach((b,i)=>b.onclick=()=>{selected=i;grid=false;time=0;playing=true;show();send();});
 $('#compare').onclick=()=>{grid=!grid;show();};$('#mobile').onclick=()=>{mobile=!mobile;show();};$('#full').onclick=()=>{if(document.fullscreenElement)void document.exitFullscreen();else void $('#stages').requestFullscreen();};
 $('#replay').onclick=()=>{time=0;playing=true;send();};$('#pause').onclick=()=>{playing=!playing;};$('#skip').onclick=()=>{time=4400;playing=false;send();};$<HTMLInputElement>('#seek').oninput=()=>{time=+$<HTMLInputElement>('#seek').value;playing=false;send();};
 const loaded=new Set<Window>();window.addEventListener('message',e=>{if(e.origin!==location.origin||!frames.some(f=>f.contentWindow===e.source))return;if(e.data.kind==='lore-entry-ready'){loaded.add(e.source as Window);ready=loaded.size===6;send();if(ready)document.body.dataset.ready='true';}});
 reduced.addEventListener('change',()=>{playing=false;time=4400;send();});
 let raf=0;function tick(now:number){if(ready&&playing&&!document.hidden){time+=Math.min(now-previous,80)*+$<HTMLSelectElement>('#speed').value;if(time>5000){if($<HTMLInputElement>('#loop').checked)time=0;else{time=4400;playing=false;}}send();}previous=now;raf=requestAnimationFrame(tick);}raf=requestAnimationFrame(tick);window.addEventListener('pagehide',()=>cancelAnimationFrame(raf));
}
