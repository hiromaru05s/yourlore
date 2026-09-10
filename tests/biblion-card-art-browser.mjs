import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5182',out=process.env.LORE_ART_QA_OUT||'docs/card-art-releases/2026-09-10-biblion';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/art-fixture',r=>r.fulfill({contentType:'text/html',body:'<html><body><div id="app"></div></body></html>'}));await page.goto(origin+'/art-fixture');
 const result=await page.evaluate(async()=>{
  for(const css of ['tokens','base','card','game-overlays','game','dice','screens','mobile'])await import('/src/styles/'+css+'.css');
  (await import('/src/i18n.ts')).setLang('ja');
  const C=await import('/src/shared/cards.ts'),V=await import('/src/ui/cardView.ts'),cards=[...Object.values(C.STARTERS),...Object.values(C.DB)];window.artQA={C,V,cards};
  const results=[];
  for(const card of cards){const urls=[V.artUrl.xs(card.id),V.artUrl.sm(card.id),V.artUrl.full(card.id)],sizes=[];
   for(const url of urls){const img=new Image();img.src=url;await img.decode();sizes.push([img.naturalWidth,img.naturalHeight]);}
   results.push({id:card.id,urls,sizes});
  }
  return results;
 });
 assert.equal(result.length,296);assert.equal(new Set(result.map(r=>r.id)).size,296);
 for(const r of result){for(let i=0;i<3;i++){assert(r.urls[i].includes(`/${r.id}.webp?v=20260910-theme-identity-v3`));assert.equal(r.sizes[i][0],[192,384,832][i]);}}
 const sampleIds=process.env.LORE_ART_QA_IDS?.split(',');
 await page.evaluate((sampleIds)=>{
  document.body.style.background='#273248';const root=document.getElementById('app');root.style.cssText='height:auto;display:grid;grid-template-columns:repeat(8,170px);gap:32px 24px;padding:35px;justify-content:center';
  const ids=sampleIds||['STARTER_TRASH','STARTER_CHEST','STARTER_MANA','M1','M2','M4','MIMIC','ELF','Q_RIFT','Q_BRAND','Q_WINTER','Q_MANA','QUICK_MIMIC','QUICK_ATTUNE','QUICK_GRIMOIRE','QUICK_ASSAULT','M10','CASTLE','RIFT','ACID_RAIN','GHOST','FLAME','NHEAL','S12'];
  for(const id of ids){const c=artQA.cards.find(c=>c.id===id);if(!c)throw Error(id);const wrapper=document.createElement('div'),el=artQA.V.cardEl({...c,uid:id},{size:'hand',fullArt:true});el.style.cssText='--cw:170px;--ch:265.625px;width:170px;height:265.625px';wrapper.append(el);const label=document.createElement('div');label.textContent=id;label.style.cssText='color:white;text-align:center;font:11px monospace;margin-top:12px';wrapper.append(label);root.append(wrapper);}
 },sampleIds);
 await page.waitForTimeout(700);await page.screenshot({path:out+'/framed-samples.png',fullPage:true});
 const actual=await page.locator('.card-art img').evaluateAll(imgs=>imgs.map(img=>({src:img.currentSrc,loaded:img.complete&&img.naturalWidth>0,opacity:getComputedStyle(img).opacity})));assert(actual.every(a=>a.loaded&&a.opacity==='1'));assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/browser-art-check.json',JSON.stringify({count:result.length,results:result,actual,errors},null,2));console.log('PASS: all 296 card identities, all 888 art URLs decoded, dedicated quest/quick art, 24 framed samples');
}finally{await browser.close();}
