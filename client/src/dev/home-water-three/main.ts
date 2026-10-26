import './style.css';
window.addEventListener('error',e=>console.error('water-preview',e.error?.stack??e.message));
const q=new URLSearchParams(location.search);
if(q.has('scene')){
 document.body.className='water-scene background-view';
 void import('../defaultUIFixture').then(()=>{
  document.querySelector('#app')?.setAttribute('inert','');
  parent.postMessage({kind:'water-ready'},location.origin);
 });
 window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent||e.data?.kind!=='water-controls')return;document.body.classList.toggle('background-view',e.data.view!=='home');});
}else{
 const options=[['細かなさざ波','短い波が細かく揺れ、反射がきらめく。'],['風が渡る湖','長めの波筋が斜めに流れ、水面に方向が生まれる。'],['ゆったりしたうねり','大きな波に沿って、映り込んだ色がゆっくり揺れる。']];
 document.body.innerHTML=`<header><span>LORE / WATER STUDIES</span><h1>窓の向こうに、水の動きを。</h1><p>同じ採用背景で、水面だけを3つの動きに。</p></header><nav class="variants">${options.map((o,i)=>`<button data-variant="${i}" aria-pressed="${i===0}"><small>0${i+1}</small><b>${o[0]}</b><span>${o[1]}</span></button>`).join('')}</nav><main><div class="toolbar"><div class="views"><button data-view="wide" aria-pressed="true">背景全景</button><button data-view="close" aria-pressed="false">水面を拡大</button><button data-view="home" aria-pressed="false">HOME表示</button></div><div><button id="pause">一時停止</button><button id="static" aria-pressed="false">水面：動く</button><select id="speed" aria-label="再生速度"><option value="1">標準速度</option><option value="0.5">0.5倍速</option></select></div></div><section id="stage"><iframe title="水面アニメーションのプレビュー" src="/home-water-three.html?scene=1&page=home"></iframe><span class="badge">01 · 細かなさざ波</span></section><footer><span id="caption">${options[0][1]}</span><span>LOCAL PREVIEW · 未採用</span></footer></main>`;
 const frame=document.querySelector('iframe')!;
 let variant=0,view='wide',paused=matchMedia('(prefers-reduced-motion: reduce)').matches,still=false,speed=1;
 function send(){frame.contentWindow?.postMessage({kind:'water-controls',variant,view,paused,static:still,speed},location.origin);document.querySelector('#pause')!.textContent=paused?'再生':'一時停止';}
 document.querySelectorAll<HTMLButtonElement>('[data-variant]').forEach(b=>b.onclick=()=>{variant=Number(b.dataset.variant);document.querySelectorAll('[data-variant]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));document.querySelector('.badge')!.textContent=`0${variant+1} · ${options[variant][0]}`;document.querySelector('#caption')!.textContent=options[variant][1];send();});
 document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view!;document.querySelectorAll('[data-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));send();});
 document.querySelector<HTMLButtonElement>('#pause')!.onclick=()=>{paused=!paused;send();};
 document.querySelector<HTMLButtonElement>('#static')!.onclick=()=>{still=!still;const b=document.querySelector('#static')!;b.textContent=still?'水面：静止':'水面：動く';b.setAttribute('aria-pressed',String(still));send();};
 document.querySelector<HTMLSelectElement>('#speed')!.onchange=e=>{speed=Number((e.target as HTMLSelectElement).value);send();};
 window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===frame.contentWindow&&e.data?.kind==='water-ready'){send();const id=setInterval(send,300);setTimeout(()=>clearInterval(id),5000);}});
}
