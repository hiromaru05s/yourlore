import '../../styles/tokens.css';
import '../../styles/base.css';
import '../../styles/card.css';
import '../../styles/game-overlays.css';
import '../../styles/game.css';
import '../../styles/screens.css';
import '../../styles/reading-board.css';
import '../../styles/presentation.css';
import { GameView, setMyAvatar, setOppAvatar } from '../../ui/boardView';
import { startBoardLayout } from '../../ui/layout';
import { waitForDuel } from '../../ui/duelReadiness';
import { projectedPlacement, boardMatrix, layoutRect } from '../../ui/boardProjection';
import { clearMonsterStates } from '../../ui/monster/runtime';
import { createGame } from '../../shared/engine';
import { DB } from '../../shared/cards';
import { setLang } from '../../i18n';
import { surface } from './surface';
import { Renderer, loadAssets } from './renderer';
import { motion } from '../../ui/summon/catalog';
import { duration, ids } from './catalog';
import type { Merchant } from './catalog';
setLang('ja');
setMyAvatar('SEEKER_BLUE');
setOppAvatar('SEEKER_RED');
document.body.style.cssText = 'margin:0;overflow:hidden;background:#f2eee8';
const css = document.createElement('style');
css.textContent = '.topbar,.help-callout,.help-fab,.mute-fab{display:none!important}';
document.head.append(css);
const root = document.getElementById('app')!, noop = () => { };
const view = new GameView(root, 0, { onPlay: noop, onBlockedPlay: noop, onAttack: noop, onBlockedAttack: noop, onReorder: noop, onChooseTarget: noop, onBuyMarket: noop, onBuySupply: noop, onRefresh: noop, onEndTurn: noop, onSurrender: noop });
let renderer: Renderer;
const faces = new Map<string, HTMLCanvasElement>();
let ready = false, disposed = false, side = 0, variant = 0, ms = 0, reduced = false, multi = false, card: Merchant = 'MERCH2', dark = false;
let originals: HTMLElement[] = [];
const rigs: Array<{
    el: HTMLElement;
    canvas: HTMLCanvasElement;
    cardEl: HTMLElement;
    cardCanvas: HTMLCanvasElement;
}> = [];
for (let i = 0; i < 3; i++) {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;left:0;top:0;width:180px;height:270px;transform-origin:0 0;pointer-events:none;z-index:180;visibility:hidden';
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 900;
    canvas.style.cssText = 'position:absolute;left:-252px;top:-207px;width:684px;height:684px';
    el.append(canvas);
    document.body.append(el);
    const cardEl = el.cloneNode(true) as HTMLElement;
    cardEl.style.zIndex = '181';
    document.body.append(cardEl);
    const cardCanvas = cardEl.querySelector('canvas')!;
    rigs.push({ el, canvas, cardEl, cardCanvas });
}
const mon = (id: string, uid: string) => ({ ...DB[id], uid, exhausted: false, summonedTurn: 0, dmg: 0, tempAtk: 0, atkMod: 0, defMod: 0 });
function setup() { restore(); const g = createGame({ mode: 'bot', seed: 71, starting: 0, p0: { id: 'preview-self', name: 'YOU' }, p1: { id: 'preview-opp', name: 'OPPONENT' } }).state; g.turn = 3; g.phase = 'main'; g.pending = null; for (const [i, p] of g.players.entries()) {
    p.openingDrawReady = false;
    p.mana = 12;
    p.maxMana = 12;
    p.hp = 30;
    p.enchants = [];
    p.quests = [];
    p.traps = [];
    p.field = [card === 'DARK_MERCHANT' ? 'M4' : card, card === 'DARK_MERCHANT' ? 'M4' : card, card === 'DARK_MERCHANT' ? 'M4' : card].map((id, j) => mon(id, `merchant-${i}-${j}`));
    p.hand = [{ ...DB[card], uid: `merchant-hand-${i}` }];
} view.render(g); view.setHandOpen(false); clearMonsterStates(root); originals = Array.from(root.querySelectorAll<HTMLElement>('.zone-mon .card')); }
const spell = document.createElement('canvas');
spell.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:190;pointer-events:none;display:none';
document.body.append(spell);
function restore() { root.style.filter = ''; spell.style.display = 'none'; originals.forEach(n => n.style.visibility = ''); rigs.forEach(r => { r.el.style.visibility = 'hidden'; r.cardEl.style.visibility = 'hidden'; }); }
function draw() {
    restore();
    if (!ready || disposed || ms >= duration(card) || document.hidden)
        return;
    root.style.filter = dark ? 'brightness(.7)' : '';
    if (card === 'DARK_MERCHANT') {
        spell.style.display = 'block';
        const dpr = Math.min(devicePixelRatio, 1.5);
        if (spell.width !== Math.round(innerWidth * dpr) || spell.height !== Math.round(innerHeight * dpr)) {
            spell.width = Math.round(innerWidth * dpr);
            spell.height = Math.round(innerHeight * dpr);
        }
        const cc = spell.getContext('2d')!;
        cc.setTransform(dpr, 0, 0, dpr, 0, 0);
        cc.clearRect(0, 0, innerWidth, innerHeight);
        const source = root.querySelector<HTMLElement>(`[data-uid=merchant-hand-${side}]`)?.getBoundingClientRect();
        renderer.dark(cc, faces.get(card)!, variant, ms, innerWidth, innerHeight, reduced, true, source ? { x: source.x + source.width / 2, y: source.y + source.height / 2, w: source.width } : undefined);
        return;
    }
    const chosen = originals.filter(n => n.dataset.uid?.startsWith(`merchant-${side}-`) && (multi || n.dataset.uid.endsWith('-1')));
    for (const [i, n] of chosen.entries()) {
        const id = card, rig = rigs[i];
        const f = faces.get(id);
        if (!f)
            continue;
        n.style.visibility = 'hidden';
        rig.el.style.visibility = 'visible';
        const base = projectedPlacement(n, 180, 270);
        rig.el.style.transform = base.toString();
        const r = layoutRect(n);
        const m = motion(2, Math.min(ms, 2500), reduced), elevation = Number(n.closest<HTMLElement>('[data-board-plane]')?.dataset.boardPlane) || 0;
        // No local X/Y translation: the complete card face descends along the board normal.
        rig.cardEl.style.visibility = 'visible';
        rig.cardEl.style.transform = boardMatrix(r.left, r.top, elevation + m.lift * r.width).scale(r.width / 180, r.height / 270).toString();
        rig.cardEl.dataset.height = String(m.lift * r.width);
        rig.cardEl.dataset.planeX = String(r.left);
        rig.cardEl.dataset.planeY = String(r.top);
        for (const [canvas, pass] of [[rig.canvas, 'ground'], [rig.cardCanvas, 'card']] as const) {
            const c = canvas.getContext('2d')!;
            c.setTransform(900 / 684, 0, 0, 900 / 684, 0, 0);
            c.clearRect(0, 0, 684, 684);
            renderer.normal(c, f, variant, ms, 342, 342, 180, card, reduced, pass, false);
        }
    }
}
window.addEventListener('message', e => { if (e.origin !== location.origin || e.source !== parent)
    return; if (e.data?.kind === 'merchant-suspend') {
    restore();
    return;
} if (e.data?.kind !== 'merchant-control')
    return; const d = e.data; const next = ids.includes(d.card) ? d.card : card; if (next !== card) {
    card = next;
    setup();
} side = d.side === 1 ? 1 : 0; variant = Math.max(0, Math.min(3, Number(d.variant) || 0)); ms = Math.max(0, Math.min(duration(card), Number(d.ms) || 0)); multi = !!d.multi; reduced = !!d.reduced; dark = !!d.dark; draw(); });
window.addEventListener('resize', () => requestAnimationFrame(draw));
document.addEventListener('visibilitychange', () => { if (document.hidden)
    restore(); });
setup();
const stop = startBoardLayout();
window.addEventListener('pagehide', () => { restore(); disposed = true; rigs.forEach(r => { r.el.remove(); r.cardEl.remove(); }); renderer?.dispose(); spell.remove(); stop(); view.destroy(); }, { once: true });
(window as any).merchantBoard = { get state() { return { ready, side, card, variant, ms, multi, spellVisible: spell.style.display !== 'none', coinCount: card === 'MERCH1' ? 2 : card === 'MERCH2' ? 6 : 0, hidden: originals.filter(n => n.style.visibility === 'hidden').length, rigs: rigs.filter(r => r.el.style.visibility === 'visible').length, planes: rigs.filter(r => r.el.style.visibility === 'visible').map(r => ({ height: Number(r.cardEl.dataset.height), x: Number(r.cardEl.dataset.planeX), y: Number(r.cardEl.dataset.planeY), ground: r.el.style.transform, card: r.cardEl.style.transform })) }; }, restore };
void (async () => { await waitForDuel(root); renderer = new Renderer(await loadAssets()); for (const id of ids)
    faces.set(id, await surface(id)); ready = true; parent.postMessage({ kind: 'merchant-ready' }, location.origin); })().catch(e => parent.postMessage({ kind: 'merchant-error', error: String(e) }, location.origin));
root.addEventListener('click', e => { const el = e.target as HTMLElement; if (el.closest('#hand .card'))
    parent.postMessage({ kind: 'merchant-hand-play' }, location.origin); }, true);
