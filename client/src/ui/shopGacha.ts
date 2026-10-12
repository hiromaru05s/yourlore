import { loungeText as l } from './loungeText';
import '../styles/shopGacha.css';

export type GachaVariant = 1 | 2 | 3;
type Edition = 'astral' | 'ivory' | 'crimson';
const editions: Edition[] = ['astral', 'ivory', 'crimson'];
const sleeve = (key: string) => `/cosmetics/v2/sleeve-${key}.webp`;
const shard = '<img class="gacha-shard" src="/art/lounge/icons/shard-simple-v1.png" alt="">';
const title = (key: Edition) => key === 'astral' ? l('星詠みの契り', 'A Pact of Stars', '별을 읽는 서약') : key === 'ivory' ? l('白銀の余韻', 'Echoes in Ivory', '백은의 여운') : l('緋色の誓約', 'The Crimson Oath', '진홍의 맹세');
const itemName = (key: string) => ({astral:l('星図','Star Atlas','성도'),ivory:l('白銀','Ivory Moon','백은'),crimson:l('緋印','Crimson Seal','홍인'),verdant:l('翠葉','Verdant','녹엽'),compass:l('コンパス','Compass','나침반'),prism:l('プリズム','Prism','프리즘')}[key] ?? key) + l('のスリーブ', ' Sleeve', ' 슬리브');
const pool = (key: Edition) => [
  {key, rarity:'SSR', rate:1.5},
  {key:key === 'astral' ? 'ivory' : 'astral', rarity:'SSR', rate:1.5},
  {key:'crimson', rarity:'SR', rate:8.5}, {key:'verdant', rarity:'SR', rate:8.5},
  {key:'compass', rarity:'R', rate:40}, {key:'prism', rarity:'R', rate:40},
].map((item, i) => ({...item, name:itemName(item.key) + (i === 0 ? l('・特装',' · Special',' · 특별판') : i === 1 ? l('・箔押し',' · Foil',' · 포일') : ''),url:i < 4 ? sleeve(item.key) : `/frames/sleeve_${item.key}.webp`}));

/** Presentation only: no RNG, purchase API, inventory or balance mutation. */
export function mountShopGacha(host: HTMLElement, options: { variant?: GachaVariant; credits: number }): () => void {
  const variant = options.variant ?? 2;
  let edition: Edition = editions[variant - 1];
  let dialog: HTMLDialogElement | undefined;
  let restoreFocus: HTMLElement | null = null;
  const close = () => { dialog?.close(); dialog?.remove(); dialog = undefined; if (restoreFocus?.isConnected) restoreFocus.focus(); };
  function show(kind: 'rates' | 'items' | 'history' | 'rules' | 'pull', count = 1) {
    close(); restoreFocus = document.activeElement as HTMLElement;
    const rows = pool(edition);
    const titles = {rates:l('提供割合','Drop rates','제공 확률'),items:l('ラインナップ','Lineup','라인업'),history:l('ガチャ履歴','Draw history','뽑기 기록'),rules:l('ガチャについて','About this gacha','뽑기 안내'),pull:l('ガチャのプレビュー','Gacha preview','뽑기 미리보기')};
    const body = kind === 'rates' ? `<p>${l('通常枠の提供割合（仮）。全6種、合計100%。','Draft base rates. Six items, 100% total.','일반 슬롯의 임시 확률. 총 6종, 합계 100%.')}</p><div class="gacha-rate-summary"><span>SSR <b>3%</b></span><span>SR <b>17%</b></span><span>R <b>80%</b></span></div><table><thead><tr><th>${l('アイテム','Item','아이템')}</th><th>${l('レアリティ','Rarity','등급')}</th><th>${l('確率','Rate','확률')}</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.name}</td><td>${r.rarity}</td><td>${r.rate.toFixed(1)}%</td></tr>`).join('')}</tbody></table><p>${l('10回の最初の9枠でSR以上が出なかった場合、最後の1枠はSSR 15%・SR 85%（各等級内は均等）とする仮仕様です。上記は保証を含まない通常確率です。','Draft guarantee: if the first nine draws contain no SR or SSR, the final slot is 15% SSR / 85% SR, split equally within each tier. Base rates above exclude this guarantee.','임시 보장: 첫 9회에 SR 이상이 없으면 마지막 슬롯은 SSR 15% / SR 85%, 등급 내 균등 확률입니다. 위 수치는 보장 제외 기본 확률입니다.')}</p>`
      : kind === 'items' ? `<div class="gacha-lineup">${rows.map(r=>`<article><img src="${r.url}" alt="${r.name}"><small>${r.rarity} · ${r.rate.toFixed(1)}%</small><strong>${r.name}</strong></article>`).join('')}</div><p>${l('特装・箔押しの画像は既存スリーブを使った仮見本です。','Special and foil editions use existing sleeve art as placeholders.','특별판과 포일 이미지는 기존 슬리브를 사용한 임시 견본입니다.')}</p>`
      : kind === 'history' ? `<div class="gacha-empty"><span>◇</span><h3>${l('まだ、記録はありません','Your story starts here','아직 기록이 없습니다')}</h3><p>${l('ガチャをプレイすると、獲得したアイテムがここに並びます。','Your acquired items will appear here after a draw.','뽑기로 획득한 아이템이 여기에 표시됩니다.')}</p></div>`
      : kind === 'pull' ? `<div class="gacha-pull-summary">${shard}<strong>${(count * 100).toLocaleString()}</strong><span>${l('シャード','Shards','샤드')} · ${count}${l('回',' draws','회')}</span></div><p>${l('ここまでが今回の画面プレビューです。抽選は実行されず、シャードも消費されません。','This is the end of the UI preview. No draw is performed and no Shards are spent.','화면 미리보기는 여기까지입니다. 추첨은 실행되지 않으며 샤드는 소모되지 않습니다.')}</p>${options.credits < count * 100 ? `<p class="gacha-insufficient">${l('所持シャードが不足しています。','Insufficient Shards.','보유 샤드가 부족합니다.')}</p>` : ''}`
      : `<p>${l('1回100シャード、10回1,000シャード。スリーブなど、デッキの外観を彩るアイテムが対象です。','100 Shards for one draw; 1,000 for ten. Items customize your deck’s appearance.','1회 100샤드, 10회 1,000샤드. 덱 외관을 꾸미는 아이템이 대상입니다.')}</p><ul><li>${l('10回でSR以上を1点保証（仮）。詳細は提供割合をご確認ください。','One SR or higher guaranteed in ten draws (draft). See Drop rates.','10회에서 SR 이상 1개 보장(임시). 제공 확률을 확인하세요.')}</li><li>${l('重複時はシャードに変換する想定です。変換量は未定です。','Duplicates are intended to convert to Shards; amounts are undecided.','중복 아이템은 샤드로 변환할 예정이며 수량은 미정입니다.')}</li><li>${l('対戦用カードの能力や、利用できるカードプールには影響しません。','Items do not change card abilities or your playable card pool.','카드 능력과 사용 가능한 카드 풀에는 영향을 주지 않습니다.')}</li><li>${l('期間・提供内容・レアリティ・保証はすべて仮設定です。','Availability, items, rarities and guarantees are provisional.','기간·구성·등급·보장 모두 임시 설정입니다.')}</li></ul>`;
    dialog = document.createElement('dialog'); dialog.className = 'gacha-dialog'; dialog.setAttribute('aria-labelledby','gacha-dialog-title');
    dialog.innerHTML = `<header><small>BIBLION / GACHA</small><button data-close aria-label="${l('閉じる','Close','닫기')}">×</button><h2 id="gacha-dialog-title">${titles[kind]}</h2></header><div class="gacha-dialog-body">${body}</div><footer><small>${l('プレビュー用の仮設定','Provisional preview','미리보기용 임시 설정')}</small><button data-close>${l('閉じる','Close','닫기')}</button></footer>`;
    document.body.append(dialog);
    dialog.querySelectorAll<HTMLButtonElement>('[data-close]').forEach(b=>b.onclick=close);
    dialog.addEventListener('cancel',e=>{e.preventDefault();close()});
    dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close()}});
    dialog.showModal();
  }
  function render() {
    const main = pool(edition)[0];
    host.innerHTML = `<section class="gacha-page gacha-v${variant}" data-edition="${edition}" aria-label="${l('ガチャ','Gacha','뽑기')}">
      <div class="gacha-editions" role="group" aria-label="${l('ガチャの種類','Gacha edition','뽑기 종류')}">${editions.map((key,i)=>`<button data-edition="${key}" aria-pressed="${edition===key}"><img src="${sleeve(key)}" alt=""><span><small>${i===1?'STANDARD':'FEATURED'}</small><b>${title(key)}</b></span><i>0${i+1}</i></button>`).join('')}</div>
      <div class="gacha-stage">
        <div class="gacha-stage-art" aria-hidden="true"></div>
        <div class="gacha-copy"><div class="gacha-kicker"><span>${edition==='ivory'?l('常設ガチャ','STANDARD GACHA','상시 뽑기'):l('ピックアップガチャ','FEATURED GACHA','픽업 뽑기')}</span><small>VOL. 0${editions.indexOf(edition)+1}</small></div><p class="gacha-english">${edition==='astral'?'A PACT OF STARS':edition==='ivory'?'ECHOES IN IVORY':'THE CRIMSON OATH'}</p><h2>${title(edition)}</h2><p class="gacha-poem">${edition==='astral'?l('星を辿り、まだ見ぬ記録へ。','Follow the stars into an unwritten record.','별을 따라, 아직 만나지 못한 기록으로.'):edition==='ivory'?l('静けさを纏う、ひとつのしるし。','A quiet signature, made your own.','고요함을 두른, 하나의 표식.'):l('その一枚に、消えない誓いを。','An enduring oath upon your cards.','그 한 장에, 지워지지 않는 맹세를.')}</p><p class="gacha-period">${edition==='ivory'?l('いつでもプレイできるガチャ','Always available','상시 이용 가능'):l('開催期間：未定','Schedule: to be announced','개최 기간: 미정')} <span>${l('仮設定','DRAFT','임시')}</span></p><div class="gacha-feature"><span>SSR</span><strong>${main.name}</strong><small>${l('注目アイテム','FEATURED ITEM','주목 아이템')}</small></div></div>
        <button class="gacha-artwork" data-info="items" aria-label="${l('注目スリーブとラインナップを見る','View featured sleeve and lineup','주목 슬리브 및 라인업 보기')}"><span class="gacha-halo"></span><img class="gacha-card gacha-card-left" src="${sleeve('verdant')}" alt=""><img class="gacha-card gacha-card-right" src="${sleeve(edition==='ivory'?'astral':'ivory')}" alt=""><img class="gacha-card gacha-card-main" src="${main.url}" alt="${main.name}"><span class="gacha-art-caption">${l('スリーブコレクション','SLEEVE COLLECTION','슬리브 컬렉션')}<i>↗</i></span></button>
        <div class="gacha-guarantee"><span>✦</span><b>${l('10回でSR以上1点確定','One SR or higher in ten draws','10회에서 SR 이상 1개 확정')}</b><small>${l('仮仕様','DRAFT','임시')}</small></div>
      </div>
      <footer class="gacha-footer"><div class="gacha-meta"><div class="gacha-links">${(['rates','items','history','rules'] as const).map((key,i)=>`<button data-info="${key}">${[l('提供割合','Drop rates','제공 확률'),l('一覧','Lineup','목록'),l('履歴','History','기록'),l('詳細','Details','상세')][i]}</button>`).join('')}</div><small>${l('外観アイテムのみ · 内容と確率は仮設定','Cosmetics only · Provisional items and rates','외관 아이템 전용 · 구성 및 확률은 임시')}</small></div><div class="gacha-actions">${[1,10].map(n=>`<button data-pull="${n}" class="gacha-draw ${n===10?'gacha-draw-ten':''}"><span>${n}${l('回プレイ',' draw'+(n===1?'':'s'),'회 뽑기')}</span><b>${shard}${(n*100).toLocaleString()} <small>${l('シャード','Shards','샤드')}</small></b></button>`).join('')}</div></footer>
      <p class="gacha-preview-note">${l('画面プレビュー：プレイボタンを押しても抽選・消費は行われません。','UI preview: draw buttons do not perform draws or spend Shards.','화면 미리보기: 버튼을 눌러도 추첨·소모는 발생하지 않습니다.')}</p>
    </section>`;
    host.querySelectorAll<HTMLButtonElement>('.gacha-editions button').forEach(b=>b.onclick=()=>{edition=b.dataset.edition as Edition;render();host.querySelector<HTMLButtonElement>(`.gacha-editions [data-edition="${edition}"]`)?.focus({preventScroll:true})});
    host.querySelectorAll<HTMLButtonElement>('[data-info]').forEach(b=>b.onclick=()=>show(b.dataset.info as 'rates'));
    host.querySelectorAll<HTMLButtonElement>('[data-pull]').forEach(b=>b.onclick=()=>show('pull',Number(b.dataset.pull)));
  }
  render();
  return () => { close(); host.replaceChildren(); };
}
