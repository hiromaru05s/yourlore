import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || '/tmp/lore-merchant-tools/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN || 'http://127.0.0.1:5196';
const out='docs/previews/2026-11-04-dark-merchant';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
page.setDefaultTimeout(60000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const visible=()=>page.locator('.picker-grid > .card:not([hidden])');
try {
  await page.goto(origin+'/dark-merchant-preview.html');
  await page.locator('.picker-search').waitFor();
  await page.waitForSelector('.duel-loader',{state:'detached'});
  const total=await visible().count();assert(total>200);
  await page.locator('.picker-search').fill('エルフ');
  assert(await visible().count()>1);
  assert((await visible().allTextContents()).every(text=>text.includes('エルフ')));
  await page.locator('.picker-cost').selectOption('4');
  await page.locator('[data-type=mon]').click();
  assert(await visible().count()>0);
  assert((await visible().evaluateAll(nodes=>nodes.map(n=>n.dataset.cardType))).every(t=>t==='mon'));
  assert(await page.locator('.picker-grid [data-card-id=ELF]').isVisible());
  await page.locator('.picker-grid [data-card-id=ELF]').click();
  assert(await page.locator('.picker-modal .btn-gold').isEnabled());
  await page.locator('[data-type=spell]').click();
  assert(await page.locator('.picker-modal .btn-gold').isDisabled());
  assert.equal(await page.locator('.picker-grid .is-picked').count(),0);
  await page.locator('.picker-search').fill('該当なしのカード名XYZ');
  assert.equal(await visible().count(),0);assert(await page.locator('.picker-empty').isVisible());
  await page.locator('.picker-filter-reset').click();assert.equal(await visible().count(),total);
  await page.locator('[data-type=spell]').click();
  assert(await visible().count()>0);
  assert((await visible().evaluateAll(nodes=>nodes.map(n=>n.dataset.cardType))).every(t=>t==='spell'));
  await page.locator('.picker-filter-reset').click();
  await page.locator('.picker-search').fill('ｴﾙﾌ');
  assert(await page.locator('.picker-grid [data-card-id=ELF]').isVisible());
  await page.locator('.picker-filter-reset').click();
  await page.screenshot({path:out+'/desktop.png'});
  await page.locator('.picker-search').fill('エルフ');
  await page.locator('.picker-cost').selectOption('4');await page.locator('[data-type=mon]').click();
  await page.screenshot({path:out+'/filtered.png'});
  await page.locator('.picker-grid [data-card-id=ELF]').click();
  await page.locator('.picker-modal .btn-gold').click();
  await page.waitForFunction(()=>window.merchantPreview.snapshot.pending===null);
  assert.equal(await page.evaluate(()=>window.merchantPreview.snapshot.players[0].mana),6);
  assert(await page.evaluate(()=>window.merchantPreview.snapshot.players[0].discard.some(c=>c.id==='ELF')));
  assert.deepEqual(await page.evaluate(()=>window.merchantPreview.actions),[{type:'pick',uid:'ELF'}]);
  await page.evaluate(()=>window.merchantPreview.open(3));await page.locator('.picker-search').waitFor();
  assert.equal(await page.locator('.picker-grid [data-card-id=ELF]').count(),0);
  assert.deepEqual(await page.locator('.picker-cost option').evaluateAll(nodes=>nodes.map(n=>n.value)),['','1','2','3']);
  await page.locator('.modal-row .btn-ghost').click();await page.waitForFunction(()=>window.merchantPreview.snapshot.pending===null);
  assert.equal(await page.evaluate(()=>window.merchantPreview.snapshot.players[0].mana),3);
  const layouts=[];
  for(const viewport of [{width:1280,height:720},{width:390,height:844},{width:320,height:640},{width:844,height:390}]){
    await page.setViewportSize(viewport);await page.evaluate(()=>window.merchantPreview.open());await page.locator('.picker-search').waitFor();
    // Wait for the existing modal entry animation before measuring it.
    await page.waitForTimeout(300);
    const dimensions=await page.evaluate(()=>{
      const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,height:r.height};};
      return {modal:rect('.picker-modal'),grid:rect('.picker-grid'),confirm:rect('.modal-row .btn-gold'),search:rect('.picker-search'),width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth};
    });
    assert(!dimensions.overflow,JSON.stringify(dimensions));
    for(const name of ['modal','confirm','search']){const r=dimensions[name];assert(r.left>=0&&r.right<=viewport.width+1&&r.top>=0&&r.bottom<=viewport.height+1,JSON.stringify(dimensions));}
    assert(dimensions.grid.height>60,JSON.stringify(dimensions));
    await page.screenshot({path:out+`/window-${viewport.width}x${viewport.height}.png`});layouts.push(dimensions);
  }
  await page.setViewportSize({width:1440,height:1000});
  for(const [lang,query] of [['en','ELF'],['ko','엘프']]){
    await page.goto(origin+`/dark-merchant-preview.html?lang=${lang}`);await page.locator('.picker-search').fill(query);
    assert(await page.locator('.picker-grid [data-card-id=ELF]').isVisible());
    assert(!(await page.locator('.picker-filters').innerText()).includes('picker.'));
  }
  assert.deepEqual(errors,[]);
  await fs.writeFile(out+'/checks.json',JSON.stringify({origin,total,layouts,checks:['name, cost and type combined','NFKC and case-insensitive names','hidden selection cleared','empty result and reset','real reducer purchase deducts 4 mana and adds ELF to graveyard','3-mana eligible pool excludes ELF','cancel keeps mana','4 window sizes','Japanese, English and Korean'],errors},null,2));
  console.log('PASS dark merchant filters: purchase, cancel, combined filtering, 4 layouts, 3 languages');
}finally{await browser.close();}
