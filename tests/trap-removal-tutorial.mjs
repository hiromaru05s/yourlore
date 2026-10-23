// Tutorial regression: real reducer, staging, coach/board and reward-list DOM.
// Only animation playback and the network/account are replaced for determinism.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {tutorialTranscripts} from './fixtures/tutorialCurriculum.mjs';

const dom = new JSDOM('<div id="app"></div>', { url: 'http://localhost', pretendToBeVisual: true });
for (const k of ['window', 'document', 'location', 'HTMLElement', 'HTMLImageElement', 'Element', 'Node', 'localStorage', 'navigator', 'DOMRect', 'CustomEvent', 'Event', 'Image']) {
  Object.defineProperty(globalThis, k, { value: dom.window[k], configurable: true });
}
Object.defineProperty(navigator,'connection',{value:{saveData:true}});
dom.window.HTMLElement.prototype.scrollIntoView=function(){};
dom.window.Range.prototype.getBoundingClientRect = () => new dom.window.DOMRect();
dom.window.Range.prototype.getClientRects = () => [];
globalThis.getComputedStyle = el=>dom.window.getComputedStyle(el);
dom.window.HTMLImageElement.prototype.decode=()=>Promise.resolve();
// JSDOM has no native dialog implementation; browser focus/inert behavior is checked by tutorial-academy-browser.mjs.
dom.window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
dom.window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
// Canvas visuals are covered by the browser renderer suites.
dom.window.HTMLCanvasElement.prototype.getContext=()=>null;
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
      export { mountTutorialWelcome } from './client/src/screens/tutorialWelcome';
      export { mountCards } from './client/src/screens/cards';
      export { DB, STARTERS, DECK_POOL } from './client/src/shared/cards';
      export { buyCost, effAtk } from './client/src/shared/engine';
      export { api } from './client/src/net/api';
      export { setLang, t } from './client/src/i18n';
      export { closeOverlay, showControlsHelp } from './client/src/ui/modal';
      export { REWARDS } from './server/src/rewards';
    ` }, bundle: true, format: 'esm', platform: 'node', loader: {'.css':'empty'}, outfile: path.join(temp, 'tutorial.mjs'),
    plugins:[{name:'dom-only-monster-renderer',setup(b){
      // This suite verifies tutorial rules/rewards/DOM. Canvas parity has real-browser coverage.
      b.onResolve({filter:/monster\/runtime$/},()=>({path:'monster-runtime',namespace:'dom-test'}));
      b.onLoad({filter:/.*/,namespace:'dom-test'},()=>({contents:'export const monsterPresentationNodes=n=>[n],hitMonster=()=>{},monsterHealth=()=>{},combatVisualRect=()=>null,detachMonsterFace=n=>n.cloneNode(true),syncMonsterStates=()=>{},clearMonsterStates=()=>{},setMonsterSkip=()=>{},monsterRect=()=>null,playMonster=async()=>false,playGutsEndurance=async()=>false;',loader:'js'}));
    }}],
  });
  const { TutorialController, TUT_STEPS, mountTutorial, mountCards, DB, STARTERS, DECK_POOL, buyCost, effAtk, api, setLang, t, closeOverlay, showControlsHelp, REWARDS, mountTutorialWelcome } = await import(path.join(temp, 'tutorial.mjs'));
  assert.equal(TUT_STEPS.length,36);
  for (const lang of ['ko','ja','en']) {
    setLang(lang);
    api.tutorialStatus=async()=>({keys:['tutorial:v3:mana','tuto:7'],credits:100,awarded:100,legacyPaid:0,amounts:{},offered:true});
    const screen=mountTutorial({root,user:{id:'qa'},home:noop,botGame:noop,tutorialGame:noop,tutorial:noop});
    await tick();
    assert.equal(root.querySelectorAll('.tut-steps li').length,36);
    assert.equal(root.querySelectorAll('.claimed').length,1);
    assert(root.querySelector('#ruleNotebook'));
    assert(!/モバイル|タップ|長押し|mobile|long.press|\btap\b|모바일|길게|탭하면/i.test(root.textContent));
    // The help must keep mouse instructions even if Steam reports a coarse pointer.
    for (const coarse of [false, true]) {
      globalThis.matchMedia = () => ({ matches: coarse, addEventListener() {}, removeEventListener() {} });
      showControlsHelp();
      const help = document.querySelector('.help-modal');
      assert(help.textContent.includes(t('help.d.zoom')));
      assert(help.textContent.includes(t('help.d.hand')));
      assert(!/モバイル|タップ|長押し|mobile|long.press|\btap\b|모바일|길게|탭하면/i.test(help.textContent));
      closeOverlay();
    }
    globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    assert(root.textContent.includes('5,000'));
    screen.destroy();root.innerHTML='';
    const gallery = mountCards({ root, home: noop, cards: noop });
    await tick();
    const chips = [...root.querySelectorAll('#typeRow .chip')];
    assert.equal(chips.length, 6);
    assert(!chips.some(el => /罠|함정|Trap/.test(el.textContent)));
    const definitions = [...Object.values(DB), ...Object.values(STARTERS)];
    const rendered = () => [...root.querySelectorAll('#grid > .card')];
    const allPages=async()=>{const ids=[];for(let n=0;n<20;n++){await tick();ids.push(...rendered().map(el=>el.dataset.cardId));if(root.querySelector('#nextPage').disabled)break;root.querySelector('#nextPage').click();}return ids.sort();};
    assert.deepEqual(await allPages(),definitions.map(c=>c.id).sort());
    assert(rendered().every(el => el.dataset.cardType !== 'trap'));
    for (const [index, type] of ['all', 'mon', 'spell', 'quick', 'quest', 'starter'].entries()) {
      chips[index].click();
      await tick();
      const expected = definitions.filter(c => type === 'all' || (type === 'quick' ? c.quick : type === 'starter' ? c.id === 'STARTER_MANA' || DECK_POOL.includes(c.id) : c.t === type));
      assert.deepEqual(await allPages(), expected.map(c=>c.id).sort(), `${lang}: ${type} filter retains all paginated cards`);
    }
    gallery.destroy(); root.innerHTML = '';
  }


  setLang('ja');let decisions=[],home=0,opened=0;
  api.tutorialDecision=async d=>{decisions.push(d);return {ok:true};};
  let welcome=mountTutorialWelcome({root,home:()=>home++,tutorial:()=>opened++});
  root.querySelector('[data-no]').click();assert(root.textContent.includes('受け取れません'));assert.equal(decisions.length,0);
  root.querySelector('[data-back]').click();root.querySelector('[data-no]').click();root.querySelector('[data-no]').click();await tick();assert.deepEqual(decisions,['skip']);assert.equal(home,1);welcome.destroy();root.innerHTML='';
  welcome=mountTutorialWelcome({root,home:()=>home++,tutorial:()=>opened++});root.querySelector('[data-yes]').click();await tick();assert.deepEqual(decisions,['skip','start']);assert.equal(opened,1);welcome.destroy();root.innerHTML='';
  class TestTutorial extends TutorialController {
    applyResult(res){this.state=res.state;this.view.render(res.state);}
    act(a){this.submit(a);}
    snapshot(){return this.state;}
  }
  localStorage.setItem('lore:tutorial:pace','full');
  controller=new TestTutorial(root,{onHome:noop,onRematch:noop},'SEEKER',{lesson:0,guest:true});
  assert(document.querySelector('.tutorial-dialog[open]'));
  assert.equal(document.querySelector('.tutorial-basics'),null,'Start on the practice board with one instruction');
  controller.act({type:'play',idx:0});assert.equal(controller.snapshot().players[0].field.length,0,'Instruction popup blocks card play');
  root.querySelector('[data-start]').click();
  assert.equal(document.querySelector('.tutorial-basics'),null);
  controller.onEndTurn();assert.equal(controller.snapshot().cur,0);assert.equal(root.querySelector('#endBtn').textContent.replace(/\s+/g,' '),'END TURN','Rejected pass must not lock the turn button');
  assert(document.querySelector('.tutorial-dialog[open]'),'Wrong action reopens the current instruction');
  root.querySelector('[data-start]').click();controller.act({type:'play',idx:0});assert.equal(controller.snapshot().players[0].field.length,1);
  await tick();assert(root.querySelector('[data-answer]'),'Summoning ends with a comprehension check');
  root.querySelector('[data-notebook]').click();assert(document.querySelector('.rule-notebook[open]'));
  controller.destroy();controller=null;root.innerHTML='';assert.equal(document.querySelector('.rule-notebook'),null,'Destroy removes open notebook');
  localStorage.clear();localStorage.setItem('lore:tutorial:pace','full');
  let attempts=0,credits=0;
  api.completeTutorial=async()=>{attempts++;if(attempts===1)throw Error('offline');return{amount:100,credits:100,granted:true};};
  controller=new TestTutorial(root,{onHome:noop,onRematch:noop},'SEEKER',{lesson:TUT_STEPS.findIndex(s=>s.id==='summon'),onCredits:n=>credits=n});
  root.querySelector('[data-start]').click();
  controller.act({type:'play',idx:0});await tick();root.querySelector('[data-answer="'+controller.run.scenes[0].question.correct+'"]').click();await tick();assert(root.querySelector('[data-retry]'));assert.equal(credits,0);
  root.querySelector('[data-retry]').click();await tick();assert.equal(credits,100);assert(root.querySelector('[data-next]'));
  controller.act({type:'play',idx:0});await tick();assert.equal(attempts,2,'completed lesson does not pay twice');
  controller.destroy();controller=null;root.innerHTML='';
  localStorage.clear();localStorage.setItem('lore:tutorial:pace','fast');let quickAttempts=0;
  api.completeTutorial=async()=>{if(++quickAttempts===1)throw Error('offline');return{amount:100,credits:100,granted:true};};
  controller=new TestTutorial(root,{onHome:noop,onRematch:noop},'SEEKER',{lesson:1,accountId:'quick-qa'});
  assert.equal(document.querySelector('.tutorial-basics'),null);
  root.querySelector('[data-start]').click();controller.act({type:'attack',uid:controller.state.players[0].field[0].uid});await tick();
  root.querySelector('[data-answer="'+controller.run.scenes[0].question.correct+'"]').click();await tick();
  assert(root.querySelector('[data-retry]'));assert.equal(controller.run.id,'attack','failed payment keeps finished transcript and lesson');
  const same=controller;root.querySelector('[data-retry]').click();await tick();await tick();
  assert.equal(controller,same);assert.equal(controller.run.id,'attack','successful retry retains the clear popup');assert(root.querySelector('.coach-payment').textContent.includes('100'));
  root.querySelector('[data-next]').click();await tick();await tick();assert.equal(controller.run.id,'combat','explicit next hands off in place');assert.equal(controller.run.actions.length,0);
  controller.loadLesson(TUT_STEPS.findIndex(s=>s.id==='defend'));await tick();await tick();
  root.querySelector('.tutorial-tools>summary').click();assert(root.querySelector('.tutorial-tools').open);assert(root.querySelector('.tutorial-tools').textContent.includes('シールドや回復'),'free exercise exposes its actionable hint');
  const evasion=(await tutorialTranscripts()).evasion;localStorage.setItem('lore:tutorial:v3:run:quick-qa:evasion',JSON.stringify(evasion.slice(0,evasion.findIndex(a=>a.type==='continueLesson'))));
  controller.loadLesson(TUT_STEPS.findIndex(s=>s.id==='evasion'));await tick();await tick();
  assert.equal(controller.run.phase,'review');assert(root.querySelector('.coach-dice').textContent.includes('4'),'resumed scene restores the actual roll');
  controller.destroy();controller=null;root.innerHTML='';
  console.log('PASS tutorial DOM: three languages, progress, onboarding confirmation, payment retry, lifecycle and gallery filters');
} finally {
  controller?.destroy();dom.window.close();await rm(temp,{recursive:true,force:true});
}
