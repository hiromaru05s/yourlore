import {chromium} from '/tmp/lore-decay-counter-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=new URL('./qa-v2/',import.meta.url).pathname;await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},...(process.env.RECORD?{recordVideo:{dir:out+'video',size:{width:1440,height:1000}}}:{})});
const p=await context.newPage();const errors=[],checks=[];p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
const shot=options=>process.env.NO_SHOTS?Promise.resolve():p.screenshot(options);
const check=(name,condition)=>{assert.ok(condition,name);checks.push(name)};
try{
 await p.goto('http://127.0.0.1:55264/decay-counter-four.html',{waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>window.decayCounterLab?.state.ready,{},{timeout:60000});await p.evaluate(()=>decayCounterLab.seek(0));
 check('native WebGL renderer',!await p.evaluate(()=>decayCounterLab.state.fallback));
 await p.waitForFunction(()=>decayCounterLab.state.boardReady,{},{timeout:60000});
 const f=p.frames().find(x=>x.url().includes('?board'));
 check('board ready without fallback',await f.evaluate(()=>decayCounterBoard.state.ready&&!decayCounterBoard.state.fallback));
 console.log('Preview and native board ready');
 const contacts=[1680,1600,1760,1840];
 for(const [before,amount]of [[0,1],[1,1],[0,2]]){
  await p.evaluate(({before,amount})=>decayCounterLab.configure({before,amount}),{before,amount});
  for(const ms of [0,150,600,1100,1599,1680,1760,1840,2600]){
   await p.evaluate(ms=>decayCounterLab.seek(ms),ms);const s=await p.evaluate(()=>decayCounterLab.state);
   check(`count timing ${before}+${amount} at ${ms}`,s.counts.every((n,i)=>Number(n)===(ms>=contacts[i]?before+amount:before)));
  }
 }
 await p.evaluate(()=>{decayCounterLab.configure({before:0,amount:1});decayCounterLab.seek(1100)});
 await shot({path:out+'compare-1100.png',fullPage:true});
 const signatures=await p.locator('.study canvas').evaluateAll(nodes=>nodes.map(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let total=0,hash=2166136261;for(let i=0;i<d.length;i++){if(i%4===3)total+=d[i];hash=Math.imul(hash^d[i],16777619)}return{total,hash}}));
 check('four non-empty distinct native surface materials',new Set(signatures.map(s=>s.hash)).size===4&&signatures.every(s=>s.total>100000));

 const coverage=await p.evaluate(async()=>{
  const {faceFor}=await import('/src/dev/decay-counter-four/layer.ts');const results=[];
  for(const card of document.querySelectorAll('.study-card')){
   const surface=card.querySelector('canvas'),face=await faceFor(card),a=surface.getContext('2d').getImageData(0,0,surface.width,surface.height).data,b=face.getContext('2d').getImageData(0,0,face.width,face.height).data;
   const zones=[];
   for(let gy=0;gy<3;gy++)for(let gx=0;gx<3;gx++){
    let valid=0,changed=0;
    for(let y=Math.floor((.15+gy*.25)*face.height);y<(.15+(gy+1)*.25)*face.height;y++)for(let x=Math.floor((.12+gx*.255)*face.width);x<(.12+(gx+1)*.255)*face.width;x++){
     const k=(y*face.width+x)*4;if(b[k+3]<220)continue;valid++;
     if(Math.abs(a[k]-b[k])+Math.abs(a[k+1]-b[k+1])+Math.abs(a[k+2]-b[k+2])>35)changed++;
    }
    zones.push(changed/Math.max(1,valid));
   }
   results.push(zones);
  }
  return results;
 });
 for(let i=0;i<coverage.length;i++)check(`full-card change in all nine zones / ${i+1}`,coverage[i].every(r=>r>.65));
 await p.evaluate(()=>decayCounterLab.seek(2600));
 check('all surface pixels cleared',await p.locator('.study canvas').evaluateAll(nodes=>nodes.every(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.every((v,i)=>i%4!==3||v===0))));
 for(let variant=0;variant<4;variant++){
  await p.evaluate(variant=>{decayCounterLab.configure({variant});decayCounterLab.mode('focus');decayCounterLab.seek(1100)},variant);
  await shot({path:out+`focus-${variant+1}.png`,fullPage:true});
 }
 for(const side of [0,1])for(const multi of [false,true])for(let variant=0;variant<4;variant++){
  await p.evaluate(cfg=>{decayCounterLab.configure(cfg);decayCounterLab.mode('board');decayCounterLab.seek(1100)},{side,multi,variant});
  await f.waitForFunction(({side,multi,variant})=>{const s=decayCounterBoard.state;return s.side===side&&s.multi===multi&&s.variant===variant&&s.ms===1100},{side,multi,variant});
  const s=await f.evaluate(()=>decayCounterBoard.state);
  check(`board ${side}/${multi}/${variant}`,s.visible===(multi?3:1)&&s.hiddenCards===0&&s.layers===6);
  if(!multi)await shot({path:out+`board-${side}-${variant+1}.png`,fullPage:true});
 }
 await p.evaluate(()=>{decayCounterLab.configure({side:1,multi:false,variant:1});decayCounterLab.seek(2600)});
 await f.waitForFunction(()=>decayCounterBoard.state.ms===2600);
 check('board cleanup',await f.evaluate(()=>decayCounterBoard.state.visible===0&&decayCounterBoard.state.hiddenCards===0));
 for(const reduced of [true,false]){
  await p.evaluate(reduced=>{decayCounterLab.configure({reduced});decayCounterLab.mode('compare');decayCounterLab.seek(1100)},reduced);
  if(reduced)check('reduced motion has no active surface',await p.evaluate(()=>decayCounterLab.state.active===0&&decayCounterLab.state.counts.every(n=>n==='1')));
 }
 await p.evaluate(()=>{decayCounterLab.seek(440);decayCounterLab.cancel()});check('cancellation settles once',await p.evaluate(()=>decayCounterLab.state.active===0&&decayCounterLab.state.counts.every(n=>n==='1')));
 for(const width of [320,390,844,1440]){
  await p.setViewportSize({width,height:width<500?900:1000});await p.evaluate(()=>{decayCounterLab.mode('compare');decayCounterLab.seek(1100)});
  check(`no horizontal overflow ${width}`,await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(width===390)await shot({path:out+'mobile-compare.png',fullPage:true});
  await p.evaluate(()=>decayCounterLab.mode('board'));await p.waitForTimeout(250);
  check(`board cards visible ${width}`,await f.evaluate(()=>decayCounterBoard.state.hiddenCards===0&&document.querySelectorAll('.zone-mon .card').length===6));
  if(width===390)await shot({path:out+'mobile-board.png',fullPage:true});
 }
 await p.evaluate(()=>{decayCounterLab.mode('compare');decayCounterLab.seek(1100)});await p.locator('#dark').check();await shot({path:out+'compare-dark.png',fullPage:true});await p.locator('#dark').uncheck();
 // Continuous real-clock playback in the screen recording, then a measured repeat.
 await p.locator('#loop').uncheck();await p.locator('#speed').selectOption('1');
 const performance=await p.evaluate(async()=>{decayCounterLab.play();const dt=[];let prev=performance.now();await new Promise(resolve=>{function frame(now){dt.push(now-prev);prev=now;if(decayCounterLab.state.playing)requestAnimationFrame(frame);else resolve()}requestAnimationFrame(frame)});dt.sort((a,b)=>a-b);return{frames:dt.length,p50:dt[Math.floor(dt.length*.5)],p95:dt[Math.floor(dt.length*.95)],max:Math.max(...dt)}});
 check('single play completes and clears',await p.evaluate(()=>!decayCounterLab.state.playing&&decayCounterLab.state.active===0));
 for(let i=0;i<3;i++){await p.evaluate(()=>decayCounterLab.play());await p.waitForFunction(()=>!decayCounterLab.state.playing)}
 check('repeat keeps four layers',await p.locator('.study canvas').count()===4);
 for(const card of ['M4','TDE2','ELF']){
  await p.evaluate(card=>{decayCounterLab.mode('board');decayCounterLab.configure({card});decayCounterLab.seek(1100)},card);
  await p.waitForFunction(()=>decayCounterLab.state.ready);
  await p.evaluate(()=>decayCounterLab.mode('compare'));
  check(`native surface reload while comparison hidden / ${card}`,await p.evaluate(()=>decayCounterLab.state.active===4));
 }
 await p.evaluate(()=>{decayCounterLab.mode('board');decayCounterLab.configure({multi:true,side:1,variant:3});decayCounterLab.play()});await p.waitForFunction(()=>!decayCounterLab.state.playing);
 await p.emulateMedia({reducedMotion:'reduce'});await p.waitForFunction(()=>decayCounterLab.state.reduced);check('OS motion preference handled',await p.evaluate(()=>decayCounterLab.state.reduced));
 await p.emulateMedia({reducedMotion:'no-preference'});
 check('no browser errors',errors.length===0);
 const report={status:'passed',checks:checks.length,details:checks,signatures,coverage,performance,errors,environment:'Local desktop headless Chrome. No physical mobile or authenticated gameplay claim.'};
 await fs.writeFile(out+'verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(e){await fs.writeFile(out+'failure.json',JSON.stringify({error:String(e),checks,errors},null,2));await shot({path:out+'failure.png',fullPage:true});throw e;}finally{await context.close();await browser.close();}
