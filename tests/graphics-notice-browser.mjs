import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin = process.env.LORE_TEST_ORIGIN || 'http://127.0.0.1:5367';
const out = process.env.LORE_TEST_OUTPUT || '/tmp/lore-graphics-notice-qa';
await fs.mkdir(out, {recursive: true});
const browser = await chromium.launch({channel: 'chrome', headless: true, args: ['--disable-webgl']});
const checks = [];
try {
  for (const [lang, loggedIn, width, height] of [['ja', false, 1280, 900], ['ko', true, 390, 844], ['en', false, 320, 667]]) {
    const page = await browser.newPage({viewport: {width, height}, reducedMotion: 'reduce'});
    page.setDefaultTimeout(60000);
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await apiFixture(page, r => {
      const path = new URL(r.url).pathname;
      if (path === '/api/auth/me') return {user: loggedIn ? {id: 'graphics-qa', display: 'SEEKER', avatar: 'SEEKER_BLUE', credits: 0, wins: 0, losses: 0} : null};
      if (path === '/api/geo') return {country: 'JP'};
      return {ok: true, friends: [], incoming: [], outgoing: [], challenges: [], keys: [], rows: []};
    });
    await page.addInitScript(lang => localStorage.setItem('lore_lang', lang), lang);
    await page.goto(origin);
    const dialog = page.locator('.graphics-notice[open]');
    await dialog.waitFor();
    assert.equal(await page.locator('.screen-loader').count(), 0, 'notice follows asset loading');
    assert.equal(await page.locator('#app').evaluate(e => e.inert), false);
    assert.equal(await page.evaluate(() => document.createElement('canvas').getContext('webgl2')), null, 'real WebGL disabled');
    assert(await dialog.evaluate(e => e.scrollWidth <= e.clientWidth));
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({path: `${out}/${lang}-${width}-initial.png`});
    // Clipboard refusal keeps a selectable address and useful guidance.
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText: async () => {throw Error('denied');}}}));
    await dialog.locator('[data-copy]').click();
    assert.equal(await dialog.locator('input').evaluate(e => e.selectionEnd - e.selectionStart), 'chrome://settings/system'.length);
    await dialog.locator('[data-recheck]').click();
    assert(await dialog.locator('[role=status]').textContent());
    await page.screenshot({path: `${out}/${lang}-${width}.png`});
    if (loggedIn) {
      await dialog.locator('[data-continue]').click();
      await page.locator('[data-home]').click();
      await page.waitForSelector('.screen-loader', {state: 'detached'});
      assert.equal(await page.locator('.graphics-notice').count(), 0, 'no repeat on HOME revisit');
    } else {
      await page.keyboard.press('Escape');
      await page.waitForSelector('.graphics-notice', {state: 'detached'});
      assert.equal(await page.locator('.graphics-notice').count(), 0);
      await page.locator('#email').fill('player@example.com');
    }
    assert.deepEqual(errors, []);
    checks.push(`${lang}: real disabled WebGL, ${loggedIn ? 'HOME' : 'login'}, ${width}px, copy fallback, recheck, dismissal`);
    await page.close();
  }
  // Browser integration for healthy and software contexts, independent of host GPU.
  for (const renderer of ['ANGLE (NVIDIA GeForce GTX 1650)', 'ANGLE (Google SwiftShader)']) {
    const page = await browser.newPage();
    await page.route('**/graphics-test', r => r.fulfill({contentType: 'text/html', body: '<html><body><button id="before">Before</button></body></html>'}));
    await page.goto(origin + '/graphics-test');
    const result = await page.evaluate(async renderer => {
      const native = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(kind, ...args) {
        if (kind !== 'webgl2') return native.call(this, kind, ...args);
        return {isContextLost: () => false, getParameter: () => window.recovered ? 'ANGLE (NVIDIA)' : renderer, getExtension: name => name === 'WEBGL_lose_context' ? {loseContext() {}} : {UNMASKED_RENDERER_WEBGL: 1}};
      };
      const {showGraphicsNotice} = await import('/src/ui/graphicsNotice.ts');
      document.querySelector('#before').focus();
      window.disposeNotice = showGraphicsNotice();
      return !!document.querySelector('.graphics-notice[open]');
    }, renderer);
    assert.equal(result, renderer.includes('SwiftShader'));
    if (result) {
      await page.evaluate(() => {
        window.recovered = true;
        Object.defineProperty(navigator, 'clipboard', {value: {writeText: async text => {window.copied = text;}}});
      });
      await page.locator('[data-copy]').click();
      assert.equal(await page.evaluate(() => window.copied), 'chrome://settings/system');
      await page.locator('[data-recheck]').click();
      assert.equal(await page.locator('[data-continue]').textContent(), '계속');
      await page.keyboard.press('Tab');
      assert(await page.evaluate(() => document.activeElement.closest('.graphics-notice') !== null), 'keyboard remains in the dialog');
      await page.evaluate(() => {window.disposeNotice(); window.disposeNotice();});
      assert.equal(await page.locator('.graphics-notice').count(), 0);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'before');
    }
    checks.push(`mock renderer: ${renderer}`);
    await page.close();
  }
  await fs.writeFile(`${out}/results.json`, JSON.stringify({passed: true, checks}, null, 2));
  console.log(JSON.stringify({passed: true, checks, out}, null, 2));
} finally { await browser.close(); }
