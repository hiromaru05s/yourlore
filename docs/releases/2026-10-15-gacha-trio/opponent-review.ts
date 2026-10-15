import './opponent-review.css';
const names=['蒼潮の硝子','象牙の翼綴','黒紅の開花'];
const designs=['デッキ：潮を抱く硝子ケース ／ 墓地：波紋が広がる水鏡の鉢','デッキ：濃色の内張りと翼の書函 ／ 墓地：象牙の羽根を敷いた扇の皿','デッキ：立った蕾とベルベットの箱 ／ 墓地：放射状に開いた花の器'];
const presets=[{id:'normal',label:'通常',counts:[8,4,5]},{id:'grave-empty',label:'墓地が空',counts:[8,0,5]},{id:'deck-empty',label:'デッキが空',counts:[0,4,5]},{id:'both-empty',label:'両方とも空',counts:[0,0,5]},{id:'last',label:'最後の1枚',counts:[1,4,5]},{id:'hand-one',label:'手札1枚',counts:[8,4,1]},{id:'hand-ten',label:'手札10枚',counts:[8,4,10]}];
const query=new URLSearchParams(location.search);let variant=Math.max(0,Math.min(2,Number(query.get('set'))||0)),scenario=presets.find(p=>p.id===query.get('case'))??presets[0];
const media=matchMedia('(prefers-reduced-motion: reduce)');let ready=false,playing=!media.matches,time=0,speed=1,focus='opponent',busy=false,deck=8,hand=5,raf=0,disposed=false;
document.getElementById('app')!.innerHTML=`<main><header><div><span class="brand">LORE</span><span class="eyebrow">COSMETIC STUDY</span><h1>相手の装備を、実盤面で。</h1><p>3セットの置き場とスリーブを、相手側だけに装着して比較。</p></div><span>通常対戦runtime検証</span></header><nav class="sets" aria-label="比較するセット">${names.map((n,i)=>`<button data-set="${i}" aria-pressed="${i===variant}"><span>0${i+1}</span>${n}</button>`).join('')}</nav><p id="design-note" class="hint">${designs[variant]}</p><section class="controls"><div class="control-row"><span class="label">盤面の状態</span><div class="buttons">${presets.map(p=>`<button data-preset="${p.id}" aria-pressed="${p===scenario}">${p.label}</button>`).join('')}<button id="reset">選んだ状態に戻す</button></div></div><div class="control-row"><span class="label">ドロー</span><div class="buttons"><button id="draw-one" class="primary">1枚ドロー</button><button id="draw-three">3枚連続ドロー</button><select id="speed" aria-label="再生速度"><option value="1">1× 通常速度</option><option value="0.25">0.25× スロー</option></select><button id="idle">素材の動きを停止</button><span id="draw-note">山札から相手の手札へ移動します</span></div></div></section><div class="viewbar"><nav aria-label="表示範囲">${[['opponent','相手側全体'],['deck','デッキ置き場'],['grave','墓地'],['hand','相手の手札'],['draw','ドローの経路'],['all','盤面全体']].map(([id,label])=>`<button data-focus="${id}" aria-pressed="${id===focus}">${label}</button>`).join('')}</nav><output id="counts" aria-live="polite">準備中…</output></div><div class="board-wrap"><iframe title="相手だけに装備した実盤面プレビュー" src="?board=1"></iframe><div id="loading">盤面とスリーブを準備しています…</div></div><p class="hint">「最後の1枚」→「1枚ドロー」で、空になるデッキ置き場も確認できます。手札は裏面のみ表示。拡大は表示範囲だけを変えます。</p><footer><span id="status">LIVE</span><span>ローカル比較用 / 通常ゲームへの採用前</span></footer></main>`;
const iframe=document.querySelector('iframe')!,wrap=document.querySelector<HTMLElement>('.board-wrap')!;
function send(data:Record<string,unknown>){if(ready)iframe.contentWindow?.postMessage({kind:'trio-command',...data},location.origin);}
function pressed(selector:string,key:string,value:string){document.querySelectorAll<HTMLElement>(selector).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset[key]===value)));}
function setCase(id:string){scenario=presets.find(p=>p.id===id)??presets[0];pressed('[data-preset]','preset',scenario.id);send({action:'set',variant,counts:scenario.counts});persist();}
function setVariant(v:number){variant=v;document.getElementById('design-note')!.textContent=designs[v];pressed('[data-set]','set',String(v));send({action:'set',variant});persist();}
function persist(){const u=new URL(location.href);u.searchParams.set('set',String(variant));u.searchParams.set('case',scenario.id);history.replaceState(null,'',u);}
function updateControls(){(document.getElementById('draw-one')as HTMLButtonElement).disabled=!ready||busy||deck===0||hand>=10;(document.getElementById('draw-three')as HTMLButtonElement).disabled=!ready||busy||deck===0||hand>=10;document.getElementById('draw-note')!.textContent=busy?'ドロー中…':deck===0?'デッキが空です。状態を切り替えると再生できます。':hand>=10?'手札10枚。別の状態に切り替えるとドローできます。':media.matches?'低減モーション：移動を省略して結果を表示':'山札から相手の手札へ移動します';}
function focusBoard(){
 if(!ready)return;const doc=iframe.contentDocument;if(!doc)return;
 const selectors:Record<string,string[]>= {all:['.game'],opponent:['#portraitOpp','#oppHand','#pile-oppDeck','#pile-oppDisc','#oppRow'],deck:['#pile-oppDeck'],grave:['#pile-oppDisc'],hand:['#oppHand'],draw:['#oppHand','#pile-oppDeck']};
 const rects=selectors[focus].map(s=>doc.querySelector(s)?.getBoundingClientRect()).filter((r):r is DOMRect=>!!r&&r.width>0&&r.height>0);if(!rects.length)return;
 let left=Math.min(...rects.map(r=>r.left)),top=Math.min(...rects.map(r=>r.top)),right=Math.max(...rects.map(r=>r.right)),bottom=Math.max(...rects.map(r=>r.bottom));
 if(focus==='all'){left=0;top=0;right=iframe.clientWidth;bottom=iframe.clientHeight;}
 const pad=focus==='opponent'?40:focus==='draw'?65:focus==='all'?0:28;
 left-=pad;top-=pad;right+=pad;bottom+=pad;
 const scale=Math.min(wrap.clientWidth/(right-left),wrap.clientHeight/(bottom-top),focus==='hand'?4.5:focus==='deck'||focus==='grave'?3.5:2.4);
 const x=(wrap.clientWidth-(right-left)*scale)/2-left*scale,y=(wrap.clientHeight-(bottom-top)*scale)/2-top*scale;
 iframe.style.transform=`translate(${x}px,${y}px) scale(${scale})`;
}
function setFocus(id:string){focus=id;pressed('[data-focus]','focus',id);focusBoard();}
function startDraw(count:number){if(busy||deck===0||hand>=10)return;setFocus('draw');send({action:'draw',count,scale:1/speed});}
function setPlay(on:boolean){playing=on&&!media.matches;document.getElementById('idle')!.textContent=playing?'素材の動きを停止':'素材の動きを再生';document.getElementById('idle')!.setAttribute('aria-pressed',String(!playing));document.getElementById('status')!.textContent=media.matches?'REDUCED MOTION':playing?'LIVE / 素材アニメーション':'PAUSED / 素材を停止';}
document.querySelectorAll<HTMLElement>('[data-set]').forEach(b=>b.onclick=()=>setVariant(Number(b.dataset.set)));
document.querySelectorAll<HTMLElement>('[data-preset]').forEach(b=>b.onclick=()=>setCase(b.dataset.preset!));
document.querySelectorAll<HTMLElement>('[data-focus]').forEach(b=>b.onclick=()=>setFocus(b.dataset.focus!));
document.getElementById('reset')!.onclick=()=>setCase(scenario.id);
document.getElementById('draw-one')!.onclick=()=>startDraw(1);document.getElementById('draw-three')!.onclick=()=>startDraw(3);
document.getElementById('idle')!.onclick=()=>setPlay(!playing);
(document.getElementById('speed')as HTMLSelectElement).onchange=e=>speed=Number((e.target as HTMLSelectElement).value);
const onMessage=(e:MessageEvent)=>{if(e.origin!==location.origin||e.source!==iframe.contentWindow)return;if(e.data?.kind==='trio-ready'){ready=true;document.getElementById('loading')!.hidden=true;send({action:'set',variant,counts:scenario.counts});resize();}if(e.data?.kind==='trio-state'){deck=e.data.deck;hand=e.data.hand;busy=e.data.busy;document.getElementById('counts')!.textContent=`相手：山札 ${deck}枚 · 墓地 ${e.data.grave}枚 · 手札 ${hand}枚`;updateControls();requestAnimationFrame(focusBoard);}};
window.addEventListener('message',onMessage);
function resize(){iframe.style.width=Math.max(1100,wrap.clientWidth)+'px';iframe.style.height='720px';focusBoard();setTimeout(focusBoard,350);}
const observer=new ResizeObserver(resize);observer.observe(wrap);
const onReduced=()=>{setPlay(!media.matches);updateControls();};media.addEventListener('change',onReduced);
let last=0;function tick(now:number){if(disposed)return;raf=requestAnimationFrame(tick);const dt=last?Math.min(.05,(now-last)/1000):0;last=now;if(document.hidden)return;if(playing)time+=dt*speed;send({action:'clock',time});}raf=requestAnimationFrame(tick);setPlay(playing);updateControls();
Object.assign(window,{opponentReview:{get ready(){return ready;},get busy(){return busy;},get time(){return time;},get playing(){return playing;},setCase,setVariant,setFocus,draw:startDraw,pause:()=>setPlay(false),play:()=>setPlay(true)}});
window.addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();window.removeEventListener('message',onMessage);media.removeEventListener('change',onReduced);},{once:true});
