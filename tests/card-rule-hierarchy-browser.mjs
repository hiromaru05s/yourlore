import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const base=process.env.LORE_TEST_URL||'http://127.0.0.1:5598';
const out=process.env.LORE_TEST_OUT||'/tmp/lore-card-rule-hierarchy';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage();const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto(base+'/card-wording-review.html',{waitUntil:'networkidle'});
 for(const lang of ['ja','ko','en']) {
  await page.selectOption('#language',lang);
  for(const card of ['WORLD_TREE','ASSASSIN4','DRAGON_EGG','CASINO','M3','M1','ASSASSIN1','Q_CASTLE']) {
   await page.selectOption('#card',card);
   for(const [width,height,scale] of [[1280,900,1],[390,844,1],[320,640,1],[844,390,1],[320,640,2]]) {
    await page.setViewportSize({width,height});await page.selectOption('#textSize',String(scale));
    await page.selectOption('#surface',width===844?'board':'menu');
    await page.click('#open');await page.locator('#zoomOverlay').waitFor();
    const layout=await page.locator('#zoomOverlay').evaluate(root=>{
     const details=root.querySelector('.zoom-details');
     const groups=[...root.querySelectorAll('.card-rule-group')].map(g=>({kind:g.dataset.ruleGroup,title:g.querySelector('h2').textContent,timings:[...g.querySelectorAll('h3')].map(h=>h.textContent)}));
     const text=[...root.querySelectorAll('.card-effect-body,.dr-fx')].map(p=>({size:parseFloat(getComputedStyle(p).fontSize),overflow:p.scrollWidth>p.clientWidth+1}));
     return {groups,text,overflow:details.scrollWidth>details.clientWidth+1,allText:details.textContent};
    });
    assert(!layout.overflow,`${lang}/${card}/${width}/${scale}: rules overflow`);
    assert(layout.text.every(t=>!t.overflow&&t.size>=17),`${lang}/${card}: readable full text`);
    assert.equal(layout.groups.filter(g=>g.kind==='effects').length,card==='M1'?0:1,`${card}: one effect parent`);
    if(card==='WORLD_TREE')assert.equal(layout.groups[0].kind,'requirements');
    if(card==='CASINO')assert.equal(await page.locator('#zoomOverlay [data-rule-group=effects] .card-effect-section:has(.card-dice)').count(),1);
    checks.push({lang,card,width,height,scale,...layout});
    if(lang==='ja'&&scale===1&&[1280,390].includes(width)&&['WORLD_TREE','CASINO','ASSASSIN1'].includes(card))await page.screenshot({path:`${out}/${card}-${width}.png`});
    await page.keyboard.press('Escape');await page.locator('#zoomOverlay').waitFor({state:'detached'});
   }
  }
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/browser.json',JSON.stringify({checks,errors},null,2));console.log(`PASS ${checks.length} real inspection layouts: three locales, five viewports/scales, effect hierarchy, full text and dice scope`);
} finally {await browser.close();}
