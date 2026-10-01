import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/game-overlays.css';
import '../styles/presentation.css';
import './passiveHighlightLab.css';
import './passiveHighlightEffects.css';
import {DB,STARTERS,cardPassives} from '../shared/cards';
import {cardEl} from '../ui/cardView';
import {passiveIcon} from '../ui/passiveIcon';
import {zoomCard} from '../ui/anim';
import {setLang} from '../i18n';
import {PASSIVE_HIGHLIGHTS,decoratePassiveHighlights,type PassiveHighlight} from './passiveHighlightEffects';

if(import.meta.env.DEV){
 setLang('ja');
 const app=document.getElementById('app')!;
 app.innerHTML=`<div class="ph-eyebrow">LORE / PASSIVE LIGHT STUDIES</div><header class="ph-heading"><div><h1>パッシブの光、5つの仕上げ。</h1><p>アイコンはそのまま。輪郭・にじみ・反射で、アートとの境界をつくる。<br>各列は同じカード・同じ大きさ。⑤のみ、ゆっくり動きます。</p></div><a href="/passive-lab.html">アイコンの新旧比較へ ↗</a></header>
 <div class="ph-controls"><label>背景 <select id="surface"><option value="normal">青灰</option><option value="light">白い盤面</option><option value="dark">暗い盤面</option></select></label><label>光の強さ <input id="strength" type="range" min="0.4" max="1" value="1" step="0.05"><output id="strengthValue">100%</output></label><button id="baseline" aria-pressed="false">光なしと比較</button><button id="pause" aria-pressed="false">⑤を一時停止</button><label><input id="slow" type="checkbox">⑤を0.5倍速</label></div>
 <section class="ph-grid" aria-label="5種類のハイライト比較"></section><p class="ph-note">上段：2つのパッシブ ／ 中段：明るいカードアート ／ 下段：手札・小型カードと回数表示。<br>光はアイコンの縁に固定。付与の角印と回数の数字は、光より手前に表示します。</p>
 <section><header class="ph-board-head"><h2>実盤面で見比べる</h2><div class="ph-board-choice"></div></header><p class="ph-board-hint">番号を押すと実盤面を読み込みます。上の「光の強さ」「光なし」「一時停止」も反映されます。</p><div class="ph-board-wrap"><iframe title="実盤面でのパッシブハイライト" hidden></iframe></div></section>`;
 const defs=Object.values({...DB,...STARTERS});
 const dual=defs.find(c=>c.t==='mon'&&cardPassives(c).includes('dual'))!;
 const bright=STARTERS.STARTER_MANA??DB.STARTER_MANA??defs.find(c=>cardPassives(c).includes('relic'))!;
 const guts=defs.find(c=>c.t==='mon'&&cardPassives(c).includes('guts'))!;
 const grid=app.querySelector('.ph-grid')!;
 let selected:PassiveHighlight='silver',boardObserver:MutationObserver|undefined;
 const iframe=app.querySelector('iframe')!;
 const documents=()=>[document,iframe.contentDocument].filter((d):d is Document=>!!d);
 const syncBoard=()=>{
  const doc=iframe.contentDocument;if(!doc?.body)return;
  decoratePassiveHighlights(doc,selected);
  doc.documentElement.style.setProperty('--highlight-strength',document.documentElement.style.getPropertyValue('--highlight-strength')||'1');
  for(const cls of ['highlights-off','highlights-paused','highlights-slow'])doc.documentElement.classList.toggle(cls,document.documentElement.classList.contains(cls));
 };
 for(const [index,variant]of PASSIVE_HIGHLIGHTS.entries()){
  const panel=document.createElement('article');panel.className='ph-option';panel.dataset.pattern=variant.id;
  panel.innerHTML=`<header><div class="ph-kind">${variant.kind}</div><h2><span>${index+1<10?'0':''}${index+1}</span>${variant.name}</h2><p>${variant.description}</p></header><div class="ph-icons">${['dual','guts','counter'].map(k=>passiveIcon(k)).join('')}</div>`;
  for(const [i,def]of [dual,bright,guts].entries()){
   const sample=document.createElement('div');sample.className='ph-sample';
   const label=document.createElement('small');label.textContent=['赤・黒のアート','白・青のアート','小さい表示 / 回数・付与'][i];
   const row=document.createElement('div');if(i===2)row.className='ph-mini';
   const card={...def,uid:`highlight-${variant.id}-${i}`,...(i===2?{guts:1,passivesG:['counter']}: {})};
   const face=cardEl(card);face.onclick=()=>{zoomCard(card);decoratePassiveHighlights(document.querySelector('#zoomOverlay')!,variant.id);};row.append(face);
   if(i===2){const field=cardEl(card,{compactField:true});field.onclick=face.onclick;row.append(field);}
   sample.append(row,label);panel.append(sample);
  }
  decoratePassiveHighlights(panel,variant.id);grid.append(panel);
  const button=document.createElement('button');button.textContent=`${index+1}. ${variant.name}`;button.dataset.pattern=variant.id;button.setAttribute('aria-pressed',String(variant.id===selected));
  button.onclick=()=>{selected=variant.id;app.querySelectorAll<HTMLButtonElement>('.ph-board-choice button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pattern===selected)));if(!iframe.hasAttribute('src')){iframe.hidden=false;iframe.src='/duel-lab.html?dense=1&timed=1';}syncBoard();};
  app.querySelector('.ph-board-choice')!.append(button);
 }
 iframe.addEventListener('load',()=>{
  boardObserver?.disconnect();const doc=iframe.contentDocument;if(!doc)return;
  const link=doc.createElement('link');link.rel='stylesheet';link.href='/src/dev/passiveHighlightEffects.css';doc.head.append(link);
  syncBoard();boardObserver=new MutationObserver(syncBoard);boardObserver.observe(doc.body,{childList:true,subtree:true});
 });
 app.querySelector<HTMLSelectElement>('#surface')!.onchange=e=>{document.body.dataset.surface=(e.target as HTMLSelectElement).value;};
 app.querySelector<HTMLInputElement>('#strength')!.oninput=e=>{const value=(e.target as HTMLInputElement).value;documents().forEach(d=>d.documentElement.style.setProperty('--highlight-strength',value));app.querySelector('#strengthValue')!.textContent=`${Math.round(Number(value)*100)}%`;};
 for(const [id,cls]of [['baseline','highlights-off'],['pause','highlights-paused']] as const){
  const button=app.querySelector<HTMLButtonElement>(`#${id}`)!;button.onclick=()=>{const enabled=!document.documentElement.classList.contains(cls);documents().forEach(d=>d.documentElement.classList.toggle(cls,enabled));button.setAttribute('aria-pressed',String(enabled));};
 }
 app.querySelector<HTMLInputElement>('#slow')!.onchange=e=>documents().forEach(d=>d.documentElement.classList.toggle('highlights-slow',(e.target as HTMLInputElement).checked));
 window.addEventListener('pagehide',()=>boardObserver?.disconnect(),{once:true});
}
