import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5631';
const out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-ranked-render-reuse';
const label=process.argv[2]||'after',before=label==='before';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],report={label,boundary:'Local Chromium, deterministic production sleeve modules and real board fixture. No Windows GPU or authenticated server measurement.'};
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/render-reuse-fixture',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body><div id="root"></div><div id="log"></div></body></html>'}));
 await page.goto(origin+'/render-reuse-fixture');
 report.surface=await page.evaluate(async()=>{
  const {sleeveArt}=await import('/src/ui/cosmetics/elfweave/art.ts');
  const {mountDomSleeves}=await import('/src/ui/cosmetics/elfweave/domSleeve.ts');
  const {ELFWEAVE_ART}=await import('/src/shared/elfweaveCosmetics.ts');
  const root=document.getElementById('root'),log=document.getElementById('log');
  const flush=async()=>{await Promise.resolve();await Promise.resolve();};
  const card=()=>{const el=document.createElement('div');el.className='card--back';el.style.backgroundImage=`url(${ELFWEAVE_ART})`;root.append(el);return el;};
  const cards=Array.from({length:7},card),art=sleeveArt();
  let scans=0,copies=0;const query=root.querySelectorAll.bind(root),draw=CanvasRenderingContext2D.prototype.drawImage;
  root.querySelectorAll=function(...args){scans++;return query(...args);};
  CanvasRenderingContext2D.prototype.drawImage=function(...args){if(this.canvas.className==='elfweave-sleeve-light')copies++;return draw.apply(this,args);};
  const backs=mountDomSleeves(art,root);await flush();backs.tick(0);await flush();
  const originals=cards.map(el=>el.querySelector('canvas'));scans=0;copies=0;
  const hashes=[],hash=async canvas=>{const bytes=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');};
  for(let i=1;i<=120;i++){
   // Battle log/clock updates do not change any sleeve target.
   log.textContent=String(i);await flush();backs.tick(i/30);
   if(i%10===0)hashes.push(await hash(originals[0]));
  }
  const steady={scans,copies,retained:cards.every((el,i)=>el.querySelector('canvas')===originals[i]),hashes};
  // Native flight clones include an empty cloned canvas; they must be painted
  // even at the same timestamp as the existing hand.
  const layer=document.createElement('div');layer.className='native-draw-layer';
  const clone=cards[0].cloneNode(true);layer.append(clone);document.body.append(layer);await flush();backs.tick(4);
  const clonePainted=await hash(clone.querySelector('canvas'))===await hash(originals[0]);
  const newcomer=card();await flush();backs.tick(4);
  const newcomerPainted=await hash(newcomer.querySelector('canvas'))===await hash(originals[0]);
  layer.remove();cards[0].remove();await flush();backs.tick(4);
  const removedClean=!cards[0].querySelector('canvas')&&!clone.querySelector('canvas');
  // Reused hand nodes may change equipment without child-list mutations.
  cards[1].style.backgroundImage='none';await flush();backs.tick(4);
  const unequippedClean=!cards[1].querySelector('canvas');
  cards[1].style.backgroundImage=`url(${ELFWEAVE_ART})`;await flush();backs.tick(4);
  const reequippedPainted=!!cards[1].querySelector('canvas')&&await hash(cards[1].querySelector('canvas'))===await hash(originals[2]);
  // Repeated reduced-motion ticks, including unrelated DOM changes, are still.
  backs.tick(0);copies=0;for(let i=0;i<20;i++){log.textContent='still'+i;await flush();backs.tick(0);}const stillCopies=copies;
  backs.dispose();art.dispose();CanvasRenderingContext2D.prototype.drawImage=draw;
  return {steady,clonePainted,newcomerPainted,removedClean,unequippedClean,reequippedPainted,stillCopies,remaining:document.querySelectorAll('.elfweave-sleeve-light').length};
 });
 assert(report.surface.clonePainted&&report.surface.newcomerPainted&&report.surface.removedClean);
 assert.equal(report.surface.remaining,0);
 if(!before){assert.equal(report.surface.steady.scans,0);assert(report.surface.steady.retained);assert(report.surface.unequippedClean&&report.surface.reequippedPainted);assert.equal(report.surface.stillCopies,0);}
 await page.addInitScript(()=>{
  window.sleeveCopies=0;const draw=CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage=function(...args){if(this.canvas.className==='elfweave-sleeve-light')window.sleeveCopies++;return draw.apply(this,args);};
 });
 await page.goto(origin+'/cosmetic-studio.html?board=1&runtime=1&set=elfweave&side=opponent&polish=1');
 await page.waitForFunction(()=>window.atelier&&document.querySelector('#app')?.dataset.sceneReady==='true');
 await page.locator('.game-loading').waitFor({state:'hidden'});
 // Match the reported equipment combination, without claiming it is the
 // historical match's saved equipment or a replay of that match.
 await page.evaluate(()=>{const c=atelier.controller,g=c.state;g.sleeves=['sleeve:gacha-mimic-coffer','sleeve:gacha-elfweave'];g.furnitures=['furniture:gacha-amethyst-cleft','furniture:gacha-elfweave'];c.show(g);});
 await page.waitForTimeout(1500);
 const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
 const first=await cdp.send('Performance.getMetrics');
 report.board=await page.evaluate(async()=>{
  const c=atelier.controller,g=c.state,hand=document.getElementById('oppHand'),nodes=[...hand.querySelectorAll('.card--back')],canvases=nodes.map(n=>n.querySelector('canvas'));
  let added=0,removed=0;const observer=new MutationObserver(records=>{for(const r of records){added+=r.addedNodes.length;removed+=r.removedNodes.length;}});observer.observe(hand,{childList:true,subtree:true});
  window.sleeveCopies=0;const frames=[];let last=performance.now(),running=true;
  const tick=now=>{frames.push(now-last);last=now;if(running)requestAnimationFrame(tick);};requestAnimationFrame(tick);
  for(let i=0;i<60;i++){g.players[0].mana=i%5;c.show(g);await new Promise(r=>setTimeout(r,50));}
  running=false;observer.disconnect();frames.sort((a,b)=>a-b);
  return {updates:60,added,removed,sleeveCopies:window.sleeveCopies,retained:nodes.every((n,i)=>hand.querySelectorAll('.card--back')[i]===n&&n.querySelector('canvas')===canvases[i]),p50:frames[Math.floor(frames.length*.5)],p95:frames[Math.floor(frames.length*.95)],frames:frames.length};
 });
 const second=await cdp.send('Performance.getMetrics');report.board.metrics={};
 for(const key of ['TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration','LayoutCount','RecalcStyleCount'])report.board.metrics[key]=(second.metrics.find(m=>m.name===key)?.value||0)-(first.metrics.find(m=>m.name===key)?.value||0);
 if(!before){assert(report.board.retained);assert.equal(report.board.added,0);assert.equal(report.board.removed,0);}
 await page.screenshot({path:`${out}/${label}-board.png`});
 report.hand=[];
 for(const [width,height]of [[1280,900],[390,844]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(350);
  for(const count of [0,1,7,12,4]){
   report.hand.push(await page.evaluate(({count,width})=>{
    const c=atelier.controller,g=c.state;g.players[1].hand=Array.from({length:count},(_,i)=>({uid:'hidden-hand-'+i,id:'HIDDEN',t:'mon',cost:0,name:'',text:''}));c.show(g);
    const nodes=[...document.querySelectorAll('#oppHand .card--back')];
    return {width,count,uids:nodes.map(n=>n.dataset.uid),badge:document.querySelector('#oppHand .opp-hand-count')?.textContent??null,styles:nodes.map(n=>[n.style.width,n.style.height,n.style.left,n.style.top,n.style.transform,n.style.zIndex])};
   },{count,width}));
  }
 }
 for(const h of report.hand){assert.equal(h.uids.length,h.count);assert.equal(h.badge,h.count?String(h.count):null);}
 // A source hidden during play/removal must be restored on the next snapshot,
 // even when opaque hidden-hand slots are reused for different physical cards.
 await page.evaluate(()=>{document.querySelector('#oppHand .card--back').style.visibility='hidden';atelier.controller.show(atelier.controller.state);});
 assert.equal(await page.locator('#oppHand .card--back').first().evaluate(n=>n.style.visibility),'');
 await page.evaluate(()=>atelier.controller.destroy());
 assert.equal(await page.locator('.elfweave-sleeve-light').count(),0);
 assert.deepEqual(errors,[]);report.errors=errors;
 if(!before){
  assert.equal(report.surface.steady.copies,420);
  const baseline=await fs.readFile(out+'/before.json','utf8').then(JSON.parse).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
  if(baseline){assert.deepEqual(report.surface.steady.hashes,baseline.surface.steady.hashes,'same RGBA at all twelve animation samples');assert.deepEqual(report.hand,baseline.hand,'same hand geometry and hidden UIDs');assert(report.surface.steady.copies<baseline.surface.steady.copies);report.parity={rgbaSamples:12,handLayouts:report.hand.length};}
 }
 await fs.writeFile(`${out}/${label}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
