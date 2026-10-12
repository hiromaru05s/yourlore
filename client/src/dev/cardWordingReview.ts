import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/passives.css';
import '../styles/game-overlays.css';
import '../styles/mobile.css';
import '../styles/game.css';
import '../styles/presentation.css';
import '../styles/lounge.css';
import '../styles/loungeStage.css';
import { DB, STARTERS } from '../shared/cards';
import { cardName, setLang, type Lang } from '../i18n';
import { cardRulesEl } from '../ui/cardView';
import { zoomCard } from '../ui/anim';
import { mountCards } from '../screens/cards';
import type { App } from '../router';

const cards = [...Object.values(DB), ...Object.values(STARTERS)].map(c => ({...c, uid: `review-${c.id}`}));
const main = document.querySelector<HTMLElement>('#review')!;
main.innerHTML = `<h1>カード効果表記レビュー</h1><p>全${cards.length}枚 · 日本語 / 한국어 / English</p><nav><label>言語 <select id="language"><option value="ja">日本語</option><option value="ko">한국어</option><option value="en">English</option></select></label><label>カード <select id="card"></select></label><label>状態 <select id="state"><option value="catalog">カタログ</option><option value="live">盤面・付与と腐敗あり</option></select></label><label>表示面 <select id="surface"><option value="board">対戦</option><option value="menu">カード一覧</option></select></label><label>文字拡大 <select id="textSize"><option value="1">100%</option><option value="2">200%</option></select></label><label><input type="checkbox" id="textSpacing">行間・字間拡大</label><button id="catalog">実際のカード一覧</button><button id="open">実際の詳細画面を開く</button></nav><h2 id="name"></h2><section class="zoom-details" id="rules"></section>`;
const style = document.createElement('style');
style.textContent = `body{overflow:auto;background:#101824;color:#eee8dc}#review{max-width:1000px;padding:24px;margin:auto}#review h1{font-size:24px}#review nav{display:flex;flex-wrap:wrap;gap:12px}#review label{display:flex;align-items:center;gap:8px;max-width:100%}#review select,#review button{padding:10px;max-width:100%;font:inherit;background:#24344a;color:#f1eadb;border:1px solid #80735b}#card{min-width:0;width:min(480px,65vw)}#rules{height:auto;overflow:visible;margin-top:20px;padding:24px}#rules .card-rules{font-size:18px}@media(max-width:600px){#review{padding:14px}#rules{padding:16px}#rules .card-rules{font-size:16px}nav{display:grid}#card{width:calc(100vw - 120px)}}`;
document.head.append(style);
const language = document.querySelector<HTMLSelectElement>('#language')!;
const select = document.querySelector<HTMLSelectElement>('#card')!;
function show(): void {
  const c = cards.find(c => c.id === select.value) ?? cards[0];
  document.querySelector('#name')!.textContent = `${c.id} — ${cardName(c)}`;
  document.querySelector('#rules')!.replaceChildren(cardRulesEl({ ...c, uid: `review-${c.id}` }));
}
function localize(): void {
  const selected = select.value || new URLSearchParams(location.search).get('card') || 'WORLD_TREE';
  setLang(language.value as Lang);
  select.replaceChildren(...cards.map(c => { const option = document.createElement('option'); option.value=c.id; option.textContent=`${c.id} — ${cardName(c)}`; return option; }));
  select.value=selected;
  show();
}
language.onchange=localize; select.onchange=show;
document.querySelector<HTMLButtonElement>('#open')!.onclick=()=>{const c=cards.find(c=>c.id===select.value)!;const live=document.querySelector<HTMLSelectElement>('#state')!.value==='live';zoomCard({...c,uid:`review-${c.id}`,...(live?{summonedTurn:1,exhausted:false,atkMod:0,defMod:0,tempAtk:3,tempAtkExpiry:[{turn:4,amount:3}],dmg:2,gcount:5,decayCnt:2,guts:0,passivesG:['evade','guts']}: {})},live?{now:Math.max(1,(c.def??4)-2),max:c.def??4}:undefined);};
localize();

document.querySelector<HTMLButtonElement>('#catalog')!.onclick=()=>{main.replaceChildren();mountCards({root:main,home:()=>location.reload(),cards:()=>location.reload()} as unknown as App);};

// User-facing QA controls exercise real inspection CSS without changing game data.
document.querySelector<HTMLSelectElement>('#surface')!.onchange=e=>{
  document.body.classList.toggle('lounge-active',(e.target as HTMLSelectElement).value==='menu');
};
document.querySelector<HTMLSelectElement>('#textSize')!.onchange=e=>{
  document.documentElement.style.fontSize=`${16*Number((e.target as HTMLSelectElement).value)}px`;
};
const spacingStyle=document.createElement('style');
spacingStyle.textContent=`.reading-spacing .zoom-overlay :is(p,span,b,h1,h2,h3,dt,dd,button,summary,.psv-desc,.card-rules,.b,.note,.ztc-head){line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}.reading-spacing .zoom-overlay p{margin-bottom:2em!important}`;
document.head.append(spacingStyle);
document.querySelector<HTMLInputElement>('#textSpacing')!.onchange=e=>{
  document.body.classList.toggle('reading-spacing',(e.target as HTMLInputElement).checked);
};
