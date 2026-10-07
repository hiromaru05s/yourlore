import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.LORE_TEST_URL || 'http://127.0.0.1:5187';
const out = 'docs/characters/2026-10-07-bot-npcs/checks';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(60000);
await page.addInitScript(() => {
  const draw = CanvasRenderingContext2D.prototype.drawImage;
  window.drawnNpcPortraits = [];
  CanvasRenderingContext2D.prototype.drawImage = function(image, ...args) {
    if (image instanceof HTMLImageElement && image.src.includes('/art/npcs/')) window.drawnNpcPortraits.push(image.src);
    return draw.call(this, image, ...args);
  };
});
const errors = [], checks = [];
page.on('pageerror', error => errors.push(error.message));
await page.route('**/api/**', route => route.fulfill({ status: route.request().url().includes('/geo') ? 200 : 401, contentType: 'application/json', body: route.request().url().includes('/geo') ? '{"country":"JP"}' : '{}' }));
const openPicker = async () => {
  await page.goto(base + '/?devLogin=1');
  await page.locator('#bot').click();
  await page.locator('#ranked').click();
  await page.waitForFunction(() => [...document.querySelectorAll('.bot-npcs .challenge-art img')].length === 4 && [...document.querySelectorAll('.bot-npcs .challenge-art img')].every(img => img.complete && img.naturalWidth > 0));
};
try {
  await openPicker();
  for (const [width, height] of [[1280,900], [390,844], [320,568], [844,390]]) {
    await page.setViewportSize({ width, height });
    await page.locator('[data-diff=hard]').click();
    const sizes = await page.evaluate(() => {
      const modal = document.querySelector('.bot-npcs');
      return { pageOverflow: document.documentElement.scrollWidth > innerWidth, modalOverflow: modal.scrollWidth > modal.clientWidth + 1, names: [...modal.querySelectorAll('.diff-name')].map(n => n.textContent), selected: modal.querySelector('[aria-pressed=true] .diff-name').textContent };
    });
    assert.equal(sizes.pageOverflow, false);
    assert.equal(sizes.modalOverflow, false);
    assert.deepEqual(sizes.names, ['ルミ','ノエル','ヴェラ','シオン']);
    assert.equal(sizes.selected, 'ヴェラ');
    await page.screenshot({ path: out + '/picker-' + width + '.png' });
    await page.locator('#diffStart').scrollIntoViewIfNeeded();
    assert(await page.locator('#diffStart').isVisible());
    checks.push({ width, height, ...sizes });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.bot-npcs').count(), 0);
  assert.equal(await page.locator('#ranked').evaluate(n => n === document.activeElement), true);
  for (const [difficulty, id, name] of [['easy','lumi','ルミ'], ['normal','noel','ノエル'], ['hard','vera','ヴェラ'], ['hell','sion','シオン']]) {
    await openPicker();
    await page.locator('[data-diff=' + difficulty + ']').click();
    assert((await page.locator('#diffStart').textContent()).includes(name));
    await page.locator('#diffStart').click();
    await page.waitForFunction(id => {
      const img = document.querySelector('#portraitOpp .avatar img');
      return img?.src.endsWith('/' + id + '.webp') && img.complete && img.naturalWidth > 0;
    }, id);
    assert.equal(await page.locator('#portraitOpp .pt-name').textContent(), name);
    assert.equal(await page.locator('#portraitOpp .seeker-motion').count(), 0);
    await page.waitForFunction(id => window.drawnNpcPortraits.some(src => src.endsWith('/' + id + '.webp')), id);
    await page.waitForTimeout(450);
    await page.screenshot({ path: out + '/opening-' + id + '.png' });
    await page.waitForSelector('.duel-opening', { state: 'detached' });
    await page.waitForFunction(() => !document.querySelector('.game')?.inert);
    await page.screenshot({ path: out + '/board-' + id + '.png' });
    await page.waitForTimeout(600);
    assert.equal(await page.locator('#portraitOpp .pt-name').textContent(), name);
    assert((await page.locator('#portraitOpp .avatar img').getAttribute('src')).includes(id));
    if (difficulty === 'easy') {
      await page.locator('#giveupBtn').click();
      await page.locator('.modal .btn-danger').click();
      await page.locator('.outcome-result .btn-gold').click();
      await page.waitForFunction(() => document.querySelector('#portraitOpp .pt-name')?.textContent === 'ルミ');
      await page.waitForFunction(() => !document.querySelector('.game')?.inert);
      assert((await page.locator('#portraitOpp .avatar img').getAttribute('src')).includes(id));
      checks.push({ rematch: 'lumi', identityPreserved: true });
    }
    checks.push({ difficulty, id, name, opening: true, board: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: out + '/board-mobile.png' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  await fs.writeFile(out + '/report.json', JSON.stringify({ checks, errors, boundary: 'Local guest UI and real local game; APIs stubbed unauthenticated. No staging deployment.' }, null, 2));
  console.log('PASS: 4 responsive picker sizes, keyboard close/focus, all 4 NPC opening and board avatars');
} catch (error) {
  await page.screenshot({ path: out + '/failure.png' });
  await fs.writeFile(out + '/failure.json', JSON.stringify({ error: error.stack, errors, checks }, null, 2));
  throw error;
} finally { await browser.close(); }
