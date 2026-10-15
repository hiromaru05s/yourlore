import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { apiFixture } from './helpers/api-fixture.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.LORE_TEST_ORIGIN || 'http://127.0.0.1:5558';
const sourceModules = process.env.LORE_TEST_SOURCE_MODULES !== '0';
const out = process.env.LORE_TEST_OUTPUT || '/tmp/lore-home-sound-qa';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce', hasTouch: true });
const errors = [], checks = [];
page.on('pageerror', error => errors.push(error.message));
page.setDefaultTimeout(120000);
await apiFixture(page, request => {
  const path = new URL(request.url).pathname;
  if (path === '/api/auth/me') return { user: { id: 'sound-test', display: 'シーカー', avatar: 'SEEKER_BLUE', wins: 12, losses: 5, credits: 840 } };
  if (path === '/api/geo') return { country: 'JP' };
  if (path === '/api/rank/me') return { rating: { season: '2026-10', mmr: 1144, tier: 'silver', wins: 12, losses: 5, rank: 42, peak_mmr: 1144 } };
  if (path === '/api/social/friends') return { friends: [], incoming: [], outgoing: [], challenges: [] };
  if (path === '/api/rewards/tutorial') return { keys: [], credits: 840, offered: true };
  if (path === '/api/rewards/claimed') return { keys: [], credits: 840 };
  return { ok: true };
});
await page.addInitScript(() => {
  window.qaAudio = [];
  const NativeAudio = window.Audio;
  window.Audio = class extends NativeAudio { constructor(...args) { super(...args); window.qaAudio.push(this); } };
});
const range = page.locator('.home-sound-range');
const mute = page.locator('.home-sound-toggle');
const ready = async () => {
  await range.waitFor();
  await page.locator('.screen-loader').waitFor({ state: 'detached' });
  await page.locator('.home-entrance-stage').waitFor({ state: 'detached' });
};
try {
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await ready();
  for (const [width, height] of [[1280,720],[390,844],[320,568],[844,390]]) {
    await page.setViewportSize({width,height});
    await page.waitForTimeout(250);
    const bounds = await page.evaluate(() => {
      const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x:r.x, y:r.y, right:r.right, bottom:r.bottom, height:r.height }; };
      return { bar:rect('.home-sound'), profile:rect('[data-profile]'), mode:rect('.lounge-mode-tabs'), upper:['.lounge-brand','.lounge-balance','.lounge-menu'].map(rect) };
    });
    assert(bounds.bar.y >= bounds.profile.bottom + 23, 'sound leaves room below profile and its outlined avatar: '+JSON.stringify(bounds));
    assert(bounds.bar.right <= width && bounds.bar.x >= 0);
    for (const upper of bounds.upper) assert(bounds.bar.y >= upper.bottom + 7 || bounds.bar.right <= upper.x || bounds.bar.x >= upper.right, 'sound clears every upper control: '+JSON.stringify(bounds));
    assert(bounds.bar.bottom <= bounds.mode.y || bounds.bar.right <= bounds.mode.x, 'sound must not overlap duel tabs: '+JSON.stringify(bounds));
    for (const selector of ['.home-sound-toggle','.home-sound-range']) {
      assert(await page.locator(selector).evaluate(el => { const r=el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)); }), selector+' receives pointer');
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({path:`${out}/home-${width}.png`});
    checks.push({width,height,bounds});
  }
  await page.setViewportSize({width:1280,height:720});
  const box = await range.boundingBox();
  await page.mouse.move(box.x+box.width*.7,box.y+box.height/2);
  await page.mouse.down();
  await page.mouse.move(box.x+box.width*.35,box.y+box.height/2,{steps:12});
  await page.mouse.up();
  const volume = Number(await range.inputValue());
  assert(volume >= 30 && volume <= 40, `drag volume ${volume}`);
  assert.equal(await page.evaluate(() => Number(localStorage.getItem('lore_sfx'))), volume/100);
  await page.waitForFunction(() => window.qaAudio.some(a => a.src.includes('/music/') && !a.paused));
  assert(await page.evaluate(v => window.qaAudio.some(a => a.src.includes('/music/') && Math.abs(a.volume-.5*(v/100)**2)<.0001), volume));
  await mute.click(); assert.equal(await range.inputValue(),'0');
  assert.equal(await mute.getAttribute('aria-pressed'),'true');
  assert(await page.evaluate(() => window.qaAudio.filter(a=>a.src.includes('/music/')).every(a=>a.paused)));
  await page.reload({waitUntil:'domcontentloaded'}); await ready();
  assert.equal(await range.inputValue(),'0');
  await mute.click(); assert.equal(Number(await range.inputValue()),volume);
  await range.focus(); await page.keyboard.press('ArrowRight');
  assert.equal(Number(await range.inputValue()),volume+1);
  await page.keyboard.press('Home'); assert.equal(await range.inputValue(),'0');
  await mute.click(); assert.equal(Number(await range.inputValue()),volume+1);
  await page.keyboard.press('Tab'); await page.keyboard.press('End'); assert.equal(await range.inputValue(),'100');
  if (sourceModules) {
  await page.evaluate(async () => { const sound=await import('/src/ui/sound.ts'); sound.setSfxVolume(.42); document.dispatchEvent(new Event('lore:user')); });
  assert.equal(await range.inputValue(),'42'); assert.equal(await range.count(),1);
  for (const lang of ['en','ko','ja']) {
    await page.evaluate(async lang => (await import('/src/i18n.ts')).setLang(lang),lang);
    assert.equal(await range.count(),1); assert.equal(await range.inputValue(),'42');
  }
  }
  const rememberedVolume = await range.inputValue();
  await page.locator('[data-nav=tutorial]').click();
  await page.waitForSelector('.lounge-tutorial'); assert.equal(await range.count(),0);
  await page.locator('[data-nav=home]').click(); await ready(); assert.equal(await range.inputValue(),rememberedVolume);
  await page.setViewportSize({width:390,height:844});
  const touchBox = await range.boundingBox();
  const cdp = await page.context().newCDPSession(page);
  const y = touchBox.y + touchBox.height/2;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touchBox.x+touchBox.width*.42,y}]});
  for (let i=0;i<8;i++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touchBox.x+touchBox.width*(.42+i*.05),y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert(Number(await range.inputValue())>70,'touch drag changes volume');
  await cdp.detach();
  await mute.click(); await page.screenshot({path:`${out}/home-muted-390.png`});
  await mute.click();
  await page.setViewportSize({width:1280,height:720});
  await page.waitForTimeout(250);
  await page.locator('.home-sound').screenshot({path:`${out}/sound-detail.png`});
  assert.deepEqual(errors,[]);
  await fs.writeFile(`${out}/checks.json`, JSON.stringify({passed:true,origin,sourceModules,checks,volume,errors,behavior:['mouse and touch drag','BGM actual gain and mute pause','mute and restore after reload','keyboard arrows/Home/End',...(sourceModules?['external volume synchronization','user repaint','three languages']:[]),'navigation/remount']},null,2));
  console.log('PASS home sound: responsive layout, drag, BGM gain, mute/restore, persistence, keyboard, localization, remount');
} catch (error) { await page.screenshot({path:out+'/failure.png'}); console.error(await page.locator('body').innerText(), errors); throw error; } finally { await browser.close(); }
