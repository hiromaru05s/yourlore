import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-opening-tools/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5211';
const out=process.env.LORE_TEST_OUTPUT||'docs/ui-rework/2026-09-27-rift-mana-controls';await fs.mkdir(out,{recursive:true});
const b=await chromium.launch({channel:'chrome',headless:true}),page=await b.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const shot=name=>page.screenshot({path:out+'/'+name+'.png',style:'[data-polish-controls]{visibility:hidden!important}'});
try{
 await page.goto(origin+'/duel-lab.html?polish');await page.waitForSelector('[data-scene-ready="true"]');
 await page.waitForFunction(()=>document.querySelector('#portraitMe .pt-mana')?.dataset.crystalsReady==='6');
 const samples=[];
 for(const [button,portrait]of [['マナ増加','Me'],['相手マナ増加','Opp'],['マナ増加','Me']]){
  await page.getByRole('button',{name:button,exact:true}).click();
  const observed=await page.evaluate(async portrait=>{
   const selector='#portrait'+portrait+' .pt-mana',rows=[];const start=performance.now();
   while(performance.now()-start<1600){const el=document.querySelector(selector);rows.push({age:performance.now()-Number(el.dataset.gainStart),phase:el.dataset.gainPhase,readout:Number(el.querySelector('.pt-mana-max').textContent.slice(1)),ready:Number(el.dataset.crystalsReady),spent:Number(el.dataset.crystalsSpent),current:Number(el.querySelector('.mana-readout b').textContent),from:Number(el.dataset.gainFromMax),to:Number(el.dataset.maximum)});await new Promise(r=>requestAnimationFrame(r));}return rows;
  },portrait);
  const gather=observed.filter(x=>x.phase==='gather'&&x.age>80&&x.age<470),bloom=observed.filter(x=>x.phase==='bloom'&&x.age>600&&x.age<1400);
  assert(gather.length>0);assert(bloom.length>0);
  for(const x of gather)assert.equal(x.readout,x.from);for(const x of gather)assert.equal(x.ready+x.spent,x.from);
  for(const x of bloom){assert.equal(x.readout,x.to);assert.equal(x.ready+x.spent,x.to);assert.equal(x.current,x.ready);}
  samples.push({button,portrait,gatherSamples:gather.length,bloomSamples:bloom.length,from:gather[0].from,to:bloom[0].to});
 }
 for(const [width,height] of [[1280,720],[1920,1080],[390,844],[844,390]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(250);
  for(const id of ['logTab','muteBtn','helpBtn','giveupBtn']){
   const button=page.locator('#'+id),rect=await button.boundingBox();assert(rect.x>=0&&rect.y>=0&&rect.x+rect.width<=width+1&&rect.y+rect.height<=height+1,id+' bounds');
   assert(await button.locator('img').evaluate(e=>e.complete&&e.naturalWidth===256));assert(await button.getAttribute('aria-label'));assert.equal(await button.evaluate(e=>getComputedStyle(e).backgroundImage),'none');
  }
  await shot('board-'+width);
 }
 await page.setViewportSize({width:1280,height:720});
 // Preview controls must not intercept the actual utility buttons.
 await page.locator('[data-polish-controls]').evaluate(e=>e.style.display='none');
 await page.locator('#logTab').click();assert.equal(await page.locator('#logTab').getAttribute('aria-expanded'),'true');await page.locator('#logTab').click();
 await page.locator('#muteBtn').click();assert(await page.locator('.vol-pop.open').count());
 await page.locator('.vol-pop input').fill('0');assert(await page.locator('#muteBtn.muted').count());
 await page.locator('.vol-pop input').fill('70');assert.equal(await page.locator('#muteBtn.muted').count(),0);
 await page.locator('#helpBtn').click();assert(await page.locator('.overlay').count()>0);
 await page.keyboard.press('Escape');
 await page.reload();await page.waitForSelector('[data-scene-ready="true"]');
 await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'マナ増加',exact:true}).click();
 assert.equal(await page.locator('[data-gain-phase]').count(),0);await page.emulateMedia({reducedMotion:'no-preference'});
 // Interrupt a resource celebration without leaving a fake count or hidden gems.
 await page.getByRole('button',{name:'マナ増加',exact:true}).click();await page.waitForTimeout(100);
 await page.getByRole('button',{name:'演出スキップ',exact:true}).click();
 assert.equal(await page.locator('.mana-gain-label,[data-gain-phase]').count(),0);
 await page.waitForTimeout(100);
 assert.equal(await page.locator('#portraitMe .pt-mana').evaluate(e=>e.querySelector('.pt-mana-max').textContent),'/' + await page.locator('#portraitMe .pt-mana').getAttribute('data-maximum'));
 assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/browser-report.json',JSON.stringify({origin,samples,viewports:[1280,1920,390,844],errors,checks:['player/opponent gain readouts and physical crystal counts share impact','ten-to-twelve crystal row transition','generated plaques at four sizes','log drawer','volume/mute','controls help','reduced motion','fast-forward restores counters and jewels']},null,2)+'\n');
 console.log('PASS: synchronized gain for both sides/row transition, four responsive sizes, generated controls and reduced motion');
}finally{await b.close();}
