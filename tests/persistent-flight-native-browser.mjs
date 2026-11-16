import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-continuity-browser/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5577';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const page=await browser.newPage({viewport:{width:960,height:720}});
  await page.goto(origin);
  const results=await page.evaluate(async()=>{
    const {flyPersistentIntoSlot}=await import('/src/ui/persistentFlight.ts');
    async function cast(x){
      const reveal=document.createElement('div'), target=document.createElement('div'), tile=document.createElement('div');
      reveal.style.cssText='position:fixed;left:320px;top:230px;width:160px;height:250px;background:blue;z-index:125';
      target.style.cssText='position:fixed;top:530px;width:32px;height:35px;left:'+x+'px';
      document.body.append(reveal,target);
      const errors=[];
      const run=flyPersistentIntoSlot(reveal,target,tile,new AbortController().signal);
      const sample=()=>{
        const a=reveal.getBoundingClientRect(),b=tile.getBoundingClientRect();
        if(getComputedStyle(reveal).visibility==='hidden')return;
        if(Math.max(+getComputedStyle(reveal).opacity,+getComputedStyle(tile).opacity)<.999)errors.push('transparent gap');
        if(['left','top','width','height'].some(k=>Math.abs(a[k]-b[k])>1))errors.push('separate outlines');
      };
      let pending=true;
      function tick(){if(pending){sample();requestAnimationFrame(tick);}}
      tick();
      const completed=await run;pending=false;
      const landed=tile.getBoundingClientRect().left;
      tile.parentElement.remove();reveal.remove();target.remove();
      return {completed,errors,landed};
    }
    const casts=await Promise.all([cast(220),cast(640)]);
    return {casts,remaining:document.querySelectorAll('.quest-fold-host,.persistent-flight-canvas').length};
  });
  assert.deepEqual(results.casts.map(c=>c.errors),[[],[]]);
  assert(results.casts.every(c=>c.completed));assert.deepEqual(results.casts.map(c=>c.landed),[220,640]);
  assert.equal(results.remaining,0);
  console.log('PASS simultaneous live prints stay opaque, aligned and independently cleaned up');
}finally{await browser.close();}
