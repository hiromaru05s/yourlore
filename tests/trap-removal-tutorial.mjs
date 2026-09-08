// Tutorial regression: real reducer, staging, coach/board and reward-list DOM.
// Only animation playback and the network/account are replaced for determinism.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dom = new JSDOM('<div id="app"></div>', { url: 'http://localhost', pretendToBeVisual: true });
for (const k of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'localStorage', 'navigator', 'DOMRect', 'CustomEvent', 'Event', 'Image']) {
  Object.defineProperty(globalThis, k, { value: dom.window[k], configurable: true });
}
dom.window.Range.prototype.getBoundingClientRect = () => new dom.window.DOMRect();
dom.window.Range.prototype.getClientRects = () => [];
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 0);
globalThis.cancelAnimationFrame = clearTimeout;
globalThis.innerWidth = 1280; globalThis.innerHeight = 720;
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
const temp = await mkdtemp(path.join(tmpdir(), 'lore-trap-tutorial-'));
const root = document.getElementById('app');
const noop = () => {};
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
let controller;
try {
  await build({
    stdin: { resolveDir: process.cwd(), contents: `
      export { TutorialController, TUT_STEPS } from './client/src/game/tutorial';
      export { mountTutorial } from './client/src/screens/tutorial';
      export { mountCards } from './client/src/screens/cards';
      export { DB, STARTERS } from './client/src/shared/cards';
      export { buyCost, effAtk } from './client/src/shared/engine';
      export { api } from './client/src/net/api';
      export { setLang, t } from './client/src/i18n';
      export { closeOverlay } from './client/src/ui/modal';
      export { REWARDS } from './server/src/rewards';
    ` }, bundle: true, format: 'esm', platform: 'node', outfile: path.join(temp, 'tutorial.mjs'),
  });
  const { TutorialController, TUT_STEPS, mountTutorial, mountCards, DB, STARTERS, buyCost, effAtk, api, setLang, t, closeOverlay, REWARDS } = await import(path.join(temp, 'tutorial.mjs'));
  const activeKeys = ['tuto:1', 'tuto:2', 'tuto:3', 'tuto:4', 'tuto:5', 'tuto:6', 'tuto:8', 'tuto:9', 'tuto:10'];
  assert.deepEqual(TUT_STEPS.map(s => s.key), activeKeys);
  assert.equal(TUT_STEPS.reduce((sum, s) => sum + s.reward, 0), 890);
  for (const s of TUT_STEPS) assert.equal(s.reward, REWARDS[s.key]);
  assert.equal(REWARDS['tuto:7'], 110, 'historical reward identity/amount stays valid');
  assert(!DB.T6, 'run against the v43 retired card database');

  class TestTutorial extends TutorialController {
    events = [];
    applyResult(res) {
      // Exercise the real GameView and TutorialController; bypass cinematic timing only.
      this.state = res.state;
      this.view.render(res.state);
      this.events?.push(...res.events);
    }
    act(action) { this.submit(action); }
    snapshot() { return this.state; }
    passBot() { this.botStep(); }
    finishModal() { this.showWin(); }
  }

  // Stored claims are keyed identities, not step numbers; a retired claim has no row.
  for (const lang of ['ko', 'ja', 'en']) {
    setLang(lang);
    api.claimedRewards = async () => ({ keys: ['tuto:7', 'tuto:8', 'tuto:10'], credits: 440 });
    const screen = mountTutorial({ root, home: noop, botGame: noop, tutorialGame: noop, tutorial: noop });
    await tick();
    assert.equal(root.querySelectorAll('.tut-steps li').length, 9);
    assert(!root.querySelector('[data-key="tuto:7"]'));
    assert.deepEqual([...root.querySelectorAll('.tut-steps .claimed')].map(el => el.dataset.key), ['tuto:8', 'tuto:10']);
    assert.deepEqual([...root.querySelectorAll('.tut-step-n')].map(el => el.textContent), ['1','2','3','4','5','6','7','8','9']);
    // The final section is generated from unchanged nontrap passive definitions.
    const lessonText = [...root.querySelectorAll('.tut-sec')].slice(0, -1).map(el => el.textContent).join(' ');
    assert(!/罠|함정|\btraps?\b/i.test(lessonText));
    assert(t('tutorial.inter.desc').includes('890'));
    for (const s of TUT_STEPS) {
      assert.notEqual(t(s.titleKey), s.titleKey);
      assert.notEqual(t(s.titleKey.replace('.title', '.body')), s.titleKey.replace('.title', '.body'));
    }
    screen.destroy(); root.innerHTML = '';
    const gallery = mountCards({ root, home: noop, cards: noop });
    const chips = [...root.querySelectorAll('#typeRow .chip')];
    assert.equal(chips.length, 6);
    assert(!chips.some(el => /罠|함정|Trap/.test(el.textContent)));
    const definitions = [...Object.values(DB), ...Object.values(STARTERS)];
    const rendered = () => [...root.querySelectorAll('#grid > .card')];
    assert.equal(rendered().length, definitions.length);
    assert(rendered().every(el => el.dataset.cardType !== 'trap'));
    for (const [index, type] of ['all', 'mon', 'spell', 'quick', 'quest', 'starter'].entries()) {
      chips[index].click();
      const expected = definitions.filter(c => type === 'all' || (type === 'quick' ? c.quick : type === 'starter' ? c.t === 'starter' || c.noShop : c.t === type));
      assert.equal(rendered().length, expected.length, `${lang}: ${type} filter retains its cards`);
    }
    gallery.destroy(); root.innerHTML = '';
  }

  const scenarios = [
    { name: 'new player', claimed: [], expected: 890 },
    { name: 'completed legacy tutorial', claimed: [...activeKeys, 'tuto:7'], expected: 0 },
    { name: 'partial legacy progress', claimed: ['tuto:1', 'tuto:7', 'tuto:8'], expected: 710 },
    { name: 'offline guest', claimed: [], offline: true, expected: 0 },
    { name: 'delayed victory reward', claimed: [], lateFinal: true, expected: 890 },
  ];
  for (const scenario of scenarios) {
    setLang('en');
    const claimed = new Set(scenario.claimed);
    const requests = [], balances = [];
    let paid = 0;
    let releaseFinal;
    const finalResponse = new Promise(resolve => { releaseFinal = resolve; });
    api.claimReward = async key => {
      requests.push(key);
      if (scenario.offline) throw new Error('offline');
      if (scenario.lateFinal && key === 'tuto:10') await finalResponse;
      const amount = claimed.has(key) ? 0 : REWARDS[key];
      claimed.add(key); paid += amount;
      return { granted: amount > 0, amount, credits: paid };
    };
    controller = new TestTutorial(root, { onHome: noop, onRematch: noop }, 'LEARNER', { onCredits: n => balances.push(n) });
    const state = () => controller.snapshot();
    const me = () => state().players[0];
    const checkCoach = step => {
      assert.equal(root.querySelector('.tut-coach-step').textContent, `${step}/9`);
      assert.equal(root.querySelector('.tut-coach-head b').textContent, t(TUT_STEPS[step - 1].titleKey));
      assert(!/\btrap\b|tut\.s\d/.test(root.querySelector('.tut-coach').textContent));
      assert(state().players.every(p => p.traps.length === 0));
      for (const p of state().players) {
        assert([...p.hand, ...p.deck, ...p.discard, ...p.field, ...p.supply.filter(Boolean)].every(c => c.t !== 'trap'));
      }
      assert(state().market.every(c => c.t !== 'trap'));
    };
    const play = id => {
      const idx = me().hand.findIndex(c => c.id === id);
      assert(idx >= 0, `${id} is staged in hand`);
      controller.act({ type: 'play', idx });
      assert(!me().hand.some(c => c.id === id), `${id} is playable with actual definitions`);
      assert.equal(state().pending, null, `${id} does not require an extra target choice`);
    };
    checkCoach(1);
    root.querySelector('.tut-coach-btn').click();
    checkCoach(2);
    controller.act({ type: 'buyMarket', i: -1 });
    checkCoach(2); // rejected actions cannot complete the buy lesson
    const affordable = state().market.findIndex(c => buyCost(me(), c) <= me().mana);
    assert(affordable >= 0);
    controller.act({ type: 'buyMarket', i: affordable });
    checkCoach(3);
    controller.act({ type: 'refresh' });
    checkCoach(4);
    play('M4');
    checkCoach(5);
    play('S13');
    checkCoach(6);
    controller.act({ type: 'attack', uid: me().field.find(m => !m.exhausted).uid });
    checkCoach(7); // proceeds straight to synergy, no trap/end-turn demo
    play('TSO2');
    checkCoach(7);
    play('TSO3');
    checkCoach(8);
    const maxMana = me().maxMana;
    play('STARTER_MANA');
    assert.equal(me().maxMana, maxMana + 1);
    checkCoach(9);
    const attacker = me().field.filter(m => !m.exhausted).sort((a, b) => effAtk(me(), b) - effAtk(me(), a))[0];
    assert(attacker);
    controller.act({ type: 'attack', uid: attacker.uid });
    assert(state().over); assert.equal(state().winner, 0);
    assert.equal(root.querySelector('.tut-coach').style.display, 'none');
    controller.finishModal();
    await tick();
    assert.deepEqual(requests, activeKeys, `${scenario.name}: exactly the surviving claims`);
    if (scenario.lateFinal) {
      await new Promise(resolve => setTimeout(resolve, 620));
      assert.equal(document.getElementById('winDetail').textContent, t('tut.complete.detail').replace('{n}', '690'));
      releaseFinal();
      await tick();
    }
    assert.equal(paid, scenario.expected);
    assert.equal(controller.earned, scenario.expected);
    assert.equal(balances.length, scenario.offline ? 0 : 9);
    assert(!controller.events.some(e => ['trapSet', 'trapReveal'].includes(e.type)));
    await new Promise(resolve => setTimeout(resolve, 620));
    assert.equal(document.getElementById('winDetail').textContent, t('tut.complete.detail').replace('{n}', String(scenario.expected)));
    controller.act({ type: 'attack', uid: attacker.uid });
    assert.deepEqual(requests, activeKeys, 'post-completion input cannot claim again');
    controller.destroy(); controller = null; closeOverlay(); root.innerHTML = '';
    console.log(`PASS tutorial: ${scenario.name}`);
  }

  // The opponent still returns the turn when the player passes during any lesson.
  api.claimReward = async () => ({ amount: 0, credits: 0, granted: false });
  controller = new TestTutorial(root, { onHome: noop, onRematch: noop });
  root.querySelector('.tut-coach-btn').click();
  controller.act({ type: 'endTurn' });
  if (controller.snapshot().pending?.reason === 'handCap') controller.act({ type: 'endTurn' });
  assert.equal(controller.snapshot().cur, 1);
  const before = controller.snapshot().players[0].mana;
  controller.act({ type: 'refresh' });
  assert.equal(controller.snapshot().players[0].mana, before, 'out-of-turn input is ignored');
  controller.passBot();
  if (controller.snapshot().pending?.reason === 'handCap') controller.passBot();
  assert.equal(controller.snapshot().cur, 0);
  assert.equal(controller.snapshot().players[1].field.length, 0, 'no scripted trap-demo attacker');
  assert.equal(root.querySelector('.tut-coach-step').textContent, '2/9');
  controller.destroy(); controller = null;
  console.log('PASS tutorial: localized steps, legacy claims, docile bot, gallery filters');
} finally {
  controller?.destroy();
  dom.window.close();
  await rm(temp, { recursive: true, force: true });
}
