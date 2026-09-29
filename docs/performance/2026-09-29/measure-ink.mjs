import {chromium} from '/tmp/lore-opening-tools/node_modules/playwright/index.mjs';import fs from 'node:fs/promises';
const name=process.argv[2]||'before';const b=await chromium.launch({channel:'chrome',headless:true}),p=await b.newPage({viewport:{width:1280,height:720}});p.setDefaultTimeout(90000);
await p.addInitScript(()=>{window.inkCalls=0;const original=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(...args){if(this.canvas.classList.contains('rift-silver-ink-canvas'))window.inkCalls++;return original.apply(this,args)};});
try{await p.goto((process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5279')+'/duel-lab.html');await p.waitForSelector('[data-scene-ready=true]');await p.evaluate(async()=>{window.qa={A:await import('/src/ui/anim.ts'),C:await import('/src/shared/cards.ts')};});
const results=[];
for(const side of ['me','opp']){
await p.evaluate(side=>{qa.clock=performance.now();qa.start=qa.clock;qa.now=performance.now.bind(performance);qa.raf=requestAnimationFrame.bind(window);performance.now=()=>qa.clock;requestAnimationFrame=cb=>qa.raf(()=>cb(qa.clock));qa.source=document.querySelector(side==='me'?'#meRow .zone-mon .card':'#oppRow .zone-mon .card');qa.pending=qa.A.exileCard({...qa.C.DB.ELF,uid:'ink-measure'},side,qa.source);},side);await p.waitForSelector('.rift-silver-ink-canvas');
for(const ms of [800,1500,2160]){await p.evaluate(ms=>{qa.clock=qa.start+ms},ms);await p.waitForTimeout(100);await p.screenshot({path:`docs/performance/2026-09-29/ink-${name}-${side}-${ms}.png`});}
await p.evaluate(()=>qa.clock=qa.start+3000);await p.evaluate(()=>qa.pending);await p.evaluate(()=>{performance.now=qa.now;requestAnimationFrame=qa.raf;qa.source.style.visibility='';});
}
await p.evaluate(()=>window.inkCalls=0);const result=await p.evaluate(async()=>{const frames=[],start=performance.now();let last=start,run=true;const tick=n=>{frames.push(n-last);last=n;if(run)requestAnimationFrame(tick)};requestAnimationFrame(tick);await qa.A.exileGeneratedCards([0,1,2].map(i=>({...qa.C.DB.ELF,uid:'perf-'+i})),'me');run=false;frames.sort((a,b)=>a-b);return {ms:performance.now()-start,frames:frames.length,p95:frames[Math.floor(frames.length*.95)],canvasCopies:window.inkCalls};});await fs.writeFile(`docs/performance/2026-09-29/ink-${name}.json`,JSON.stringify(result,null,2));console.log(result);
}finally{await b.close()}
