import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5268';
const out=process.env.LORE_TEST_OUTPUT||'docs/releases/2026-10-08-market-reroll';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();const results=[];
try{
 await page.goto(origin+'/market-reroll.html');await page.waitForFunction(()=>document.querySelector('#app').dataset.sceneReady==='true');await page.evaluate(()=>window.marketRerollPreview.queue);
 for(const [width,height] of [[1280,720],[1920,1080],[390,844]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(250);
  for(const count of [3,4]){
   const result=await page.evaluate(async count=>{
    const c=window.marketRerollPreview;c.reset();await c.queue;
    const root=document.querySelector('#app'),supply=document.querySelector('#supplyMarket');root.querySelector('#market').classList.remove('reroll-focus');
    if(count===4)supply.append(supply.firstElementChild.cloneNode(true));
    const {playSupplyRefresh,captureSupplyFaces}=await import('/src/ui/marketRefresh.ts');
    const rects=selector=>[...document.querySelectorAll(selector)].map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};});
    const before=rects('#supplyMarket>.card');
    const effect=playSupplyRefresh(root,captureSupplyFaces(root),.1);
    const during=rects('#supplyMarket>.card'),faces=rects('.market-refresh-front:first-child>.card');
    const layerMargin=getComputedStyle(document.querySelector('.market-refresh-layer')).marginLeft;
    const gaps=getComputedStyle(supply).gap;
    effect.cancel();const after=rects('#supplyMarket>.card');
    return {count,before,during,faces,after,layerMargin,gaps,overflow:document.documentElement.scrollWidth>innerWidth};
   },count);
   const error=(a,b)=>Math.max(...a.flatMap((r,i)=>Object.keys(r).map(k=>Math.abs(r[k]-b[i][k]))));
   result.targetDrift=error(result.before,result.during);result.faceDrift=error(result.before,result.faces);result.restoredDrift=error(result.before,result.after);
   assert.equal(result.layerMargin,'0px');assert(result.targetDrift<.01,JSON.stringify(result));assert(result.restoredDrift<.01);assert(result.faceDrift<1,JSON.stringify(result));assert.equal(result.overflow,false);
   if(count===4)assert.equal(result.gaps,'0px');else assert.notEqual(result.gaps,'0px');
   results.push({width,height,...result});
  }
 }
 await fs.writeFile(out+'/geometry.json',JSON.stringify({checks:'No layout change or lateral jump when mounting the refresh layer; legacy four-offer packing preserved',results},null,2)+'\n');
 console.log(JSON.stringify(results.map(({width,count,targetDrift,faceDrift,restoredDrift})=>({width,count,targetDrift,faceDrift,restoredDrift})),null,2));
}finally{await browser.close();}
