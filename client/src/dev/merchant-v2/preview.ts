import { surface } from './surface';
import { Renderer, loadAssets } from './renderer';
import { CoinSound } from './sound';
import { ids, names, normalDesigns, darkDesigns, duration, count } from './catalog';
import type { Merchant } from './catalog';
import './style.css';
const root = document.getElementById('app')!;
const faces = new Map<Merchant, HTMLCanvasElement>();
let card: Merchant = 'MERCH1', mode = 'grid', v = 0, ms = 0, speed = 1, playing = false, loop = false, ready = false, dark = false, reduced = matchMedia('(prefers-reduced-motion:reduce)').matches, side = 0, multi = false, raf = 0, last = 0;
let renderer: Renderer;
const sound = new CoinSound();
let boardReady = false, playRequest = 0;
root.innerHTML = `<main><header><div><span class="eyebrow">LORE / MERCHANT — REBUILT</span><h1>金貨の響き、闇市の気配。</h1><p>通常召喚＋実体のあるコイン。闇商人は拡大プレイ中の特別演出。</p></div><span class="badge">新稿 · 各4案</span></header><nav class="cards" aria-label="対象カード">${ids.map((id, i) => `<button data-card="${id}" class="${i === 0 ? 'active' : ''}">${names[i]} <small>${i === 0 ? '2 COINS' : i === 1 ? '6 COINS' : 'SPECIAL SPELL'}</small></button>`).join('')}</nav><nav class="toolbar"><button data-mode="grid" class="active">4案を比較</button><button data-mode="detail">1案を拡大</button><button data-mode="board">実盤面・手札から</button><button id="theme">白い背景</button><label><input id="reduced" type="checkbox">動きを低減</label></nav><p id="status" role="status">専用素材とカードを読み込み中…</p><section id="grid" class="grid">${normalDesigns.map((d, i) => `<article><div class="label"><span>0${i + 1}</span><strong data-name="${i}">${d.name}</strong></div><canvas data-v="${i}" aria-label="案${i + 1}"></canvas><div class="foot"><p data-note="${i}">${d.note}</p><button data-zoom="${i}">拡大</button><button data-replay="${i}">この案を再生 ♪</button></div></article>`).join('')}</section><section id="detail" class="detail" hidden><canvas id="large" aria-label="拡大プレビュー"></canvas><aside id="variants"></aside></section><section id="board" hidden><div class="board-options"><div id="board-variants"></div><button id="side">自分側</button><button id="multi">1枚</button></div><iframe src="about:blank" title="実盤面プレビュー"></iframe><p>手札のカードを押しても再生できます。比較用の盤面です。</p></section><div class="timeline"><button id="play" disabled>音付き再生</button><button id="reset">停止・戻す</button><select id="speed" aria-label="速度"><option value="1">1×</option><option value="0.5">0.5×</option><option value="0.25">0.25×</option></select><input id="seek" type="range" aria-label="時刻" min="0" max="3100" value="0"><output id="time">0.00 / 3.10</output><label><input type="checkbox" id="loop">反復</label><label><input type="checkbox" id="audio" checked>コイン音</label></div><footer><p id="meaning">見習い商人：通常の召喚に2枚の金貨。音は選択中の1案のみ再生します。</p><p>旧6案は撤回。今回は通常商人4案／闇商人4案の比較用プレビューです。</p></footer></main>`;
const $ = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector<T>(s)!;
const iframe = $<HTMLIFrameElement>('iframe');
function send(suspend = false) { iframe.contentWindow?.postMessage(suspend ? { kind: 'merchant-suspend' } : { kind: 'merchant-control', variant: v, ms, side, multi, reduced, dark, card }, location.origin); }
function canvasDraw(canvas: HTMLCanvasElement, variant: number) { const r = canvas.getBoundingClientRect(); if (!r.width)
    return; const dpr = Math.min(devicePixelRatio, 1.5), w = Math.round(r.width * dpr), h = Math.round(r.height * dpr); if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
} const c = canvas.getContext('2d')!; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, r.width, r.height); if (card === 'DARK_MERCHANT')
    renderer.dark(c, faces.get(card)!, variant, ms, r.width, r.height, reduced);
else
    renderer.normal(c, faces.get(card)!, variant, ms, r.width * .5, r.height * .55, Math.min(r.width * .32, r.height * .45), card, reduced); }
function draw() { if (!ready)
    return; if (mode === 'grid')
    root.querySelectorAll<HTMLCanvasElement>('[data-v]').forEach(c => canvasDraw(c, Number(c.dataset.v)));
else if (mode === 'detail')
    canvasDraw($<HTMLCanvasElement>('#large'), v);
else if (boardReady)
    send(); $<HTMLInputElement>('#seek').value = String(ms); $('#time').textContent = `${(ms / 1000).toFixed(2)} / ${(duration(card) / 1000).toFixed(2)}`; }
function pause() { playRequest++; playing = false; cancelAnimationFrame(raf); raf = 0; sound.stop(); $('#play').textContent = '音付き再生'; }
function tick(now: number) { if (!playing)
    return; const prev = ms; ms += (now - last) * speed; last = now; if (ms > duration(card) + 350) {
    if (loop) {
        ms = 0;
        sound.stop();
    }
    else {
        ms = duration(card);
        pause();
    }
} if (playing && !reduced)
    sound.advance(prev, ms, card, v); draw(); if (playing)
    raf = requestAnimationFrame(tick); }
async function play() { if (!ready || reduced || (mode === 'board' && !boardReady))
    return; pause(); const request = playRequest; await sound.unlock(); if (request !== playRequest || document.hidden || reduced)
    return; if (ms >= duration(card))
    ms = 0; playing = true; last = performance.now(); $('#play').textContent = '一時停止'; raf = requestAnimationFrame(tick); }
function select(variant: number) { v = variant; root.querySelectorAll<HTMLElement>('[data-select],[data-replay]').forEach(b => b.classList.toggle('active', Number(b.dataset.select ?? b.dataset.replay) === v)); draw(); }
function setCard(id: Merchant) { pause(); card = id; ms = 0; const ds = id === 'DARK_MERCHANT' ? darkDesigns : normalDesigns; root.classList.toggle('special', id === 'DARK_MERCHANT'); if (id === 'DARK_MERCHANT')
    dark = true; root.classList.toggle('dark', dark); $('#theme').textContent = dark ? '暗い背景' : '白い背景'; root.querySelectorAll<HTMLElement>('[data-card]').forEach(b => b.classList.toggle('active', b.dataset.card === id)); for (let i = 0; i < 4; i++) {
    $(`[data-name="${i}"]`).textContent = ds[i].name;
    $(`[data-note="${i}"]`).textContent = ds[i].note;
} for (const key of ['variants', 'board-variants']) {
    $('#' + key).innerHTML = ds.map((d, i) => `<button data-select="${i}">0${i + 1} ${d.name}</button>`).join('');
    $('#' + key).querySelectorAll<HTMLElement>('[data-select]').forEach(b => b.onclick = () => { select(Number(b.dataset.select)); ms = 0; void play(); });
} $<HTMLInputElement>('#seek').max = String(duration(id)); $('#meaning').textContent = id === 'DARK_MERCHANT' ? '闇商人：特別な魔法カード。手札から拡大し、カードを読ませたまま闇市場が形成されます。' : `${names[ids.indexOf(id)]}：通常の召喚に${count(id)}枚の金貨。音は選択中の1案のみ再生します。`; select(v); draw(); }
function setMode(next: string) { pause(); mode = next; for (const k of ['grid', 'detail', 'board'])
    $('#' + k).hidden = k !== mode; root.querySelectorAll<HTMLElement>('[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === next)); if (next === 'board') {
    boardReady = false;
    iframe.src = '/merchant-six.html?board';
    $('#status').textContent = '実盤面を準備中…';
}
else {
    send(true);
    iframe.src = 'about:blank';
    boardReady = false;
    $('#status').textContent = '再生でコイン音も確認できます。';
} draw(); }
function reduce(value: boolean) { reduced = value; $<HTMLInputElement>('#reduced').checked = value; pause(); ms = value ? duration(card) : 0; draw(); }
root.querySelectorAll<HTMLElement>('[data-card]').forEach(b => b.onclick = () => setCard(b.dataset.card as Merchant));
root.querySelectorAll<HTMLElement>('[data-mode]').forEach(b => b.onclick = () => setMode(b.dataset.mode!));
root.querySelectorAll<HTMLElement>('[data-zoom]').forEach(b => b.onclick = () => { select(Number(b.dataset.zoom)); setMode('detail'); });
root.querySelectorAll<HTMLElement>('[data-replay]').forEach(b => b.onclick = () => { select(Number(b.dataset.replay)); ms = 0; void play(); });
$('#play').onclick = () => playing ? pause() : void play();
$('#reset').onclick = () => { pause(); ms = 0; draw(); if (mode === 'board') send(true); };
$<HTMLInputElement>('#seek').oninput = () => { pause(); ms = Number($<HTMLInputElement>('#seek').value); draw(); };
$<HTMLSelectElement>('#speed').onchange = () => { speed = Number($<HTMLSelectElement>('#speed').value); };
$<HTMLInputElement>('#loop').onchange = () => loop = $<HTMLInputElement>('#loop').checked;
$<HTMLInputElement>('#audio').onchange = () => { sound.enabled = $<HTMLInputElement>('#audio').checked; if (!sound.enabled)
    sound.stop(); };
$('#theme').onclick = () => { dark = !dark; root.classList.toggle('dark', dark); $('#theme').textContent = dark ? '暗い背景' : '白い背景'; draw(); };
$('#side').onclick = () => { side = 1 - side; $('#side').textContent = side ? '相手側' : '自分側'; draw(); };
$('#multi').onclick = () => { multi = !multi; $('#multi').textContent = multi ? '3枚同時' : '1枚'; draw(); };
$<HTMLInputElement>('#reduced').onchange = () => reduce($<HTMLInputElement>('#reduced').checked);
matchMedia('(prefers-reduced-motion:reduce)').addEventListener('change', e => reduce(e.matches));
window.addEventListener('resize', draw);
window.addEventListener('message', e => { if (e.origin !== location.origin || e.source !== iframe.contentWindow)
    return; if (e.data?.kind === 'merchant-ready') {
    boardReady = true;
    $('#status').textContent = '実盤面の準備完了。手札を押すか、音付き再生を押してください。';
    send();
} if (e.data?.kind === 'merchant-hand-play') {
    ms = 0;
    void play();
} if (e.data?.kind === 'merchant-error')
    $('#status').textContent = e.data.error; });
document.addEventListener('visibilitychange', () => { if (document.hidden) {
    pause();
    send(true);
} });
window.addEventListener('pagehide', () => { pause(); renderer?.dispose(); sound.dispose(); send(true); }, { once: true });
(window as any).merchantLab = { get ready() { return ready; }, get state() { return { card, v, mode, ms, playing, reduced, side, multi, boardReady, coinCount: card === 'DARK_MERCHANT' ? 0 : count(card), audio: sound.state, resources: renderer?.coins.resources }; }, setCard, setMode, seek(t: number, variant = v) { pause(); ms = t; select(variant); draw(); }, play, pause, reduce, setSide(s: number) { side = s; draw(); }, setMulti(m: boolean) { multi = m; draw(); } };
void (async () => { const images = await loadAssets(); for (const id of ids)
    faces.set(id, await surface(id)); renderer = new Renderer(images); ready = true; setCard('MERCH1'); $<HTMLButtonElement>('#play').disabled = false; $('#status').textContent = '準備完了。各カードに4案、コイン音付きで比較できます。'; if (reduced)
    reduce(true); })().catch(e => $('#status').textContent = '読み込み失敗: ' + e.message);
