import {disposeQuickSpellFrame} from '../../ui/quickSpellFrame';
import '../../styles/tokens.css';
import '../../styles/card.css';
import '../../styles/passives.css';
import '../../styles/game-overlays.css';
import './style.css';
import {cardEl,cardRulesEl} from '../../ui/cardView';
import {DB} from '../../shared/cards';
import {setLang,cardName} from '../../i18n';
import {zoomCard,closeZoom} from '../../ui/cardInspection';
import {EffectClock,variants,type Variant} from './effect';
setLang('ja');
if(!import.meta.env.DEV)throw Error('Preview is available only on the local development server.');
const clock=new EffectClock();
const boardMode=new URLSearchParams(location.search).has('board');
const make=(id:string)=>({...DB[id],uid:`quick-preview-${id}`});
const requestedCard=new URLSearchParams(location.search).get('card')||'QUICK_ATTUNE';
let selected:Variant=0,cardId=DB[requestedCard]?requestedCard:'QUICK_ATTUNE',boardDispose:(()=>void)|undefined;
const get=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
if(boardMode){
 document.body.classList.add('quick-board');
 void import('./board').then(async m=>{boardDispose=await m.mountBoard();openZoom(selected);});
 const bar=document.createElement('nav');bar.className='quick-board-controls';bar.setAttribute('aria-label','フレーム比較');
 bar.innerHTML=`<a href="/quick-frame-three.html">← 3案比較</a>${variants.map((v,i)=>`<button data-zoom="${i}">${i+1} ${v.name}</button>`).join('')}<button id="reopen">拡大を開き直す</button>`;
 document.body.append(bar);get('reopen').onclick=()=>openZoom(selected);
}else{
 document.body.classList.add('quick-lab');
 get('app').innerHTML=`<main class="q-lab"><header class="q-mast"><a href="/quick-frame-three.html">LORE<span>FRAME STUDIES</span></a><span>QUICK SPELL / 3 MOTION STUDIES</span></header>
 <section class="q-intro"><div><p class="q-eyebrow">購入した、その瞬間に。</p><h1>ひと目で、クイック魔法。</h1></div><p>カードの輪郭に宿る、3つの動き。<br>絵と文字を残したまま、魔法の性質を伝える。</p></section>
 <div class="q-toolbar"><label>カード<select id="card">${['QUICK_ATTUNE','QUICK_POISON','QUICK_MIMIC','QUICK_WORLD','QUICK_ASSAULT','S13'].map(id=>`<option value="${id}">${cardName(make(id))}${DB[id].quick?'':'（通常魔法）'}</option>`).join('')}</select></label><div class="q-playback"><button id="replay">↻ 拡大直後を再生</button><button id="pause" aria-pressed="false">一時停止</button><label>速度<select id="speed"><option value="1">1×</option><option value="0.5">0.5×</option><option value="0.25">0.25×</option></select></label><button id="background">白背景</button><button id="effect" aria-pressed="true">エフェクト ON</button><label class="q-reduced"><input id="reduced" type="checkbox" ${clock.reduced?'checked':''}>動きを抑える</label></div></div>
 <section class="q-comparison">${variants.map((v,i)=>`<article style="--accent:${v.color}"><header class="q-concept"><span>0${i+1}</span><div><small>${v.en}</small><h2>${v.name}</h2></div></header><div class="q-stage" data-stage="${i}"></div><div class="q-description"><p>${v.desc}</p><small>${v.detail}</small></div><div class="q-actions"><button data-zoom="${i}">拡大画面で見る ↗</button><a href="?board=1&variant=${i}">実盤面で見る</a></div></article>`).join('')}</section>
 <section class="q-rules"><span>カード効果</span><div id="rules"></div><p>購入時に発動する魔法。通常魔法に切り替えると、専用エフェクトは付きません。</p></section>
 <footer>比較用プレビュー · 03「瞬風のヴェール」を本番に採用（銘板拡大）</footer></main>`;
 function render(){clock.clear();for(let i=0;i<3;i++){const stage=document.querySelector<HTMLElement>(`[data-stage="${i}"]`)!;const card=cardEl(make(cardId),{fullArt:true});stage.replaceChildren(card);if(DB[cardId].quick)clock.attach(card,i as Variant);}get('rules').replaceChildren(cardRulesEl(make(cardId)));document.querySelectorAll<HTMLAnchorElement>('.q-actions a').forEach((a,i)=>a.href=`?board=1&variant=${i}&card=${encodeURIComponent(cardId)}`);clock.time=0;}
 get<HTMLSelectElement>('card').onchange=()=>{cardId=get<HTMLSelectElement>('card').value;render();};
 get('replay').onclick=()=>{clock.time=0;document.querySelectorAll('.q-stage > .card').forEach(n=>n.animate([{transform:'scale(.92)',opacity:.6},{transform:'scale(1)',opacity:1}],{duration:clock.reduced?0:340,easing:'cubic-bezier(.16,1,.3,1)'}));};
 get('pause').onclick=()=>{clock.playing=!clock.playing;get('pause').textContent=clock.playing?'一時停止':'再生';get('pause').setAttribute('aria-pressed',String(!clock.playing));};
 get<HTMLSelectElement>('speed').onchange=()=>clock.speed=Number(get<HTMLSelectElement>('speed').value);
 get('background').onclick=()=>{const light=document.body.classList.toggle('q-light');get('background').textContent=light?'暗背景':'白背景';};
 get('effect').onclick=()=>{clock.enabled=!clock.enabled;get('effect').textContent=`エフェクト ${clock.enabled?'ON':'OFF'}`;get('effect').setAttribute('aria-pressed',String(clock.enabled));};
 get<HTMLInputElement>('reduced').onchange=()=>clock.reduced=get<HTMLInputElement>('reduced').checked;
 render();
}
function openZoom(v:Variant){
 selected=v;zoomCard(make(cardId));const card=document.querySelector<HTMLElement>('#zoomOverlay .zoom-card-stage > .card');
 if(card&&DB[cardId].quick){disposeQuickSpellFrame(card);clock.attach(card,v);}
 const ov=document.getElementById('zoomOverlay')!;ov.classList.add('quick-inspection');
 const nav=document.createElement('nav');nav.className='q-zoom-switch';nav.setAttribute('aria-label','フレームの候補');
 nav.innerHTML=variants.map((f,i)=>`<button data-zoom="${i}" aria-pressed="${i===v}">${i+1} ${f.name}</button>`).join('');
 nav.onclick=e=>e.stopPropagation();ov.querySelector('.zoom-wrap')!.append(nav);
}
// Detached inspection cards are disposed even when native related-card navigation replaces the dialog.
const observer=new MutationObserver(()=>{for(const f of [...clock.effects])if(!f.node.isConnected){f.dispose();clock.effects.splice(clock.effects.indexOf(f),1);}});
observer.observe(document.body,{childList:true,subtree:true});
document.addEventListener('click',e=>{const target=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-zoom]');if(target)openZoom(Number(target.dataset.zoom) as Variant);});
const initial=Number(new URLSearchParams(location.search).get('variant'));if(boardMode&&initial>=0&&initial<=2)selected=initial as Variant;
function dispose(){observer.disconnect();clock.dispose();closeZoom();boardDispose?.();}
window.addEventListener('pagehide',dispose,{once:true});
Object.assign(window,{quickPreview:{clock,openZoom,dispose,state:()=>({cardId,selected,effects:clock.effects.length})}});
