import assert from 'node:assert/strict';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.LORE_TEST_ORIGIN || 'http://127.0.0.1:5187';
const browser = await chromium.launch({channel:'chrome',headless:true});
try {
  const page = await browser.newPage({viewport:{width:1120,height:700}});
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(origin+'/cosmetic-studio.html?board=1&runtime=1&set=default&tempo=1');
  await page.waitForFunction(() => window.combatTempo && document.querySelector('[data-scene-ready=true]'));
  const render = (me,opp) => page.evaluate(([me,opp]) => {
    const c = window.combatTempo.controller;
    const g = structuredClone(c.state);
    g.players[0].curseSeals = me;
    g.players[1].curseSeals = opp;
    for (const p of g.players) p.shield=p.dew=p.brand=0;
    c.show(g);
  },[me,opp]);
  const badge = side => page.locator('#portrait'+side+' .pt-curse-seals');
  const settled = async (side,count) => {
    if (!count) return badge(side).waitFor({state:'detached'});
    await page.waitForFunction(([side,count])=>{
      const el = document.querySelector('#portrait'+side+' .pt-curse-seals');
      return el && !el.dataset.motion && !el.hidden && el.textContent===String(count);
    },[side,count]);
  };
  assert.equal(await badge('Me').count(),0);
  await render(1,1);
  for(const side of ['Me','Opp']) await badge(side).locator('canvas').waitFor({state:'visible'});
  await page.evaluate(()=>{window.firstSeal=document.querySelector('#portraitMe .pt-curse-seals canvas');});
  await render(1,1);
  assert(await page.evaluate(()=>window.firstSeal===document.querySelector('#portraitMe .pt-curse-seals canvas')));
  await settled('Me',1);await settled('Opp',1);
  for(const [width,height] of [[1120,700],[390,844],[844,390]]){
    await page.setViewportSize({width,height});
    await page.waitForFunction(([w,h])=>innerWidth===w && innerHeight===h,[width,height]);
    for(const side of ['Me','Opp']){
      const {rect,ring} = await badge(side).evaluate(el=>({rect:el.getBoundingClientRect().toJSON(),ring:el.parentElement.getBoundingClientRect().toJSON()}));
      assert(Math.abs((rect.left+rect.right-ring.left-ring.right)/2)<1);
      assert(Math.abs(side==='Me'?rect.top-ring.top:rect.bottom-ring.bottom)<1);
    }
  }
  await render(6,20);
  await page.locator('#portraitOpp [data-motion="increase"] canvas').waitFor({state:'visible'});
  await settled('Opp',20);await settled('Me',6);
  await render(5,0);
  await settled('Me',5);
  await page.locator('#portraitOpp [data-motion="loss"] canvas').waitFor({state:'visible'});
  await render(0,1);
  await settled('Opp',1);await settled('Me',0);
  await page.emulateMedia({reducedMotion:'reduce'});
  await render(2,0);await settled('Opp',0);await settled('Me',2);
  assert.equal(await page.locator('.pt-curse-seals canvas').count(),0);
  assert.deepEqual(errors,[]);
  console.log('PASS curse seal grant, increase, loss, retained frames, partial spend, interruption, reduced motion, and both portrait anchors at three viewport sizes');
} finally { await browser.close(); }
