import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin = process.env.LORE_TEST_ORIGIN || 'https://test.yourlore.xyz';
const out = process.env.LORE_TEST_OUTPUT || '/tmp/lore-graphics-notice-release';
await fs.mkdir(out, {recursive: true});
const results = [];
for (const mode of ['native', 'unavailable', 'hardware-fixture', 'software-fixture']) {
  const browser = await chromium.launch({channel: 'chrome', headless: true, args: mode === 'unavailable' ? ['--disable-webgl'] : []});
  try {
    const page = await browser.newPage({viewport: {width: 1280, height: 900}, reducedMotion: 'reduce'});
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    page.setDefaultTimeout(60000);
    await page.addInitScript(mode => {
      localStorage.setItem('lore_lang', 'ja');
      if (!mode.endsWith('-fixture')) return;
      const native = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(kind, ...args) {
        if (kind !== 'webgl2' || this.width !== 1 || this.height !== 1) return native.call(this, kind, ...args);
        return {isContextLost: () => false, getParameter: () => mode === 'hardware-fixture' ? 'ANGLE (NVIDIA GeForce GTX 1650)' : 'ANGLE (Google SwiftShader)', getExtension: name => name === 'WEBGL_lose_context' ? {loseContext() {}} : {UNMASKED_RENDERER_WEBGL: 1}};
      };
    }, mode);
    await page.goto(origin, {waitUntil: 'domcontentloaded'});
    await page.locator('#email').waitFor({state: 'attached'});
    await page.waitForFunction(() => !document.querySelector('.screen-loader') && !document.querySelector('#app').inert);
    // Allow the cover's completion microtask to run before checking absence.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => resolve())));
    const shown = await page.locator('.graphics-notice[open]').count();
    if (mode === 'hardware-fixture') assert.equal(shown, 0);
    if (mode === 'software-fixture' || mode === 'unavailable') assert.equal(shown, 1);
    const gpu = await page.evaluate(() => {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2', {failIfMajorPerformanceCaveat: true});
      if (!gl) return {strictWebGL2: false};
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null;
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return {strictWebGL2: true, renderer};
    });
    if (mode === 'native' && gpu.strictWebGL2 && gpu.renderer && !/swiftshader|llvmpipe|softpipe|software rasterizer|microsoft basic render|\bwarp\b/i.test(gpu.renderer)) assert.equal(shown, 0);
    await page.screenshot({path: `${out}/${mode}.png`});
    if (shown) {
      await page.locator('[data-continue]').click();
      assert.equal(await page.locator('.graphics-notice').count(), 0);
    }
    await page.locator('#email').fill('graphics-check@example.invalid');
    assert.deepEqual(errors, []);
    results.push({mode, shown: !!shown, gpu, errors, url: page.url()});
    console.log(JSON.stringify(results.at(-1)));
  } finally { await browser.close(); }
}
await fs.writeFile(`${out}/results.json`, JSON.stringify({origin, passed: true, results}, null, 2));
