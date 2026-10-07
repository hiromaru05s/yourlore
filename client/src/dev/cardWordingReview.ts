import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/passives.css';
import '../styles/game-overlays.css';
import '../styles/mobile.css';
import '../styles/game.css';
import '../styles/presentation.css';
import { DB, STARTERS } from '../shared/cards';
import { cardName, setLang, type Lang } from '../i18n';
import { cardRulesEl } from '../ui/cardView';
import { zoomCard } from '../ui/anim';

const cards = [...Object.values(DB), ...Object.values(STARTERS)].map(c => ({...c, uid: `review-${c.id}`}));
const main = document.querySelector<HTMLElement>('#review')!;
main.innerHTML = `<h1>カード効果表記レビュー</h1><p>全${cards.length}枚 · 日本語 / 한국어 / English</p><nav><label>言語 <select id="language"><option value="ja">日本語</option><option value="ko">한국어</option><option value="en">English</option></select></label><label>カード <select id="card"></select></label><button id="open">実際の詳細画面を開く</button></nav><h2 id="name"></h2><section class="zoom-details" id="rules"></section>`;
const style = document.createElement('style');
style.textContent = `body{overflow:auto;background:#101824;color:#eee8dc}#review{max-width:1000px;padding:24px;margin:auto}h1{font-size:24px}nav{display:flex;flex-wrap:wrap;gap:12px}label{display:flex;align-items:center;gap:8px;max-width:100%}select,button{padding:10px;max-width:100%;font:inherit;background:#24344a;color:#f1eadb;border:1px solid #80735b}#card{min-width:0;width:min(480px,65vw)}#rules{height:auto;overflow:visible;margin-top:20px;padding:24px}#rules .card-rules{font-size:18px}@media(max-width:600px){#review{padding:14px}#rules{padding:16px}#rules .card-rules{font-size:16px}nav{display:grid}#card{width:calc(100vw - 120px)}}`;
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
document.querySelector<HTMLButtonElement>('#open')!.onclick=()=>{const c=cards.find(c=>c.id===select.value)!;zoomCard({...c,uid:`review-${c.id}`});};
localize();
