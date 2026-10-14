const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'/tmp/lore-collapse-tools/node_modules/playwright/index.mjs');
import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const out=new URL('../docs/releases/2026-10-14-void-crystal',import.meta.url).pathname;
const b=await chromium.launch({channel:'chrome',headless:true});const page=await b.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));const report=[];
try{
 await page.goto((process.env.LORE_QA_ORIGIN??'http://127.0.0.1:55427')+'/void-crystal-runtime-qa.html');await page.waitForFunction(()=>window.qa?.ready,null,{timeout:60000});
 for(const opts of [{side:0,count:8},{side:1,count:8},{side:0,count:8,reverse:true},{side:0,count:8,echo:true},{side:0,count:0},{side:0,count:8,skip:1000},{side:1,count:8,skip:3600},{side:0,count:8,reduced:true},{side:1,count:24,mobile:true}]){
  await page.setViewportSize(opts.mobile?{width:390,height:844}:{width:1440,height:900});await page.emulateMedia({reducedMotion:opts.reduced?'reduce':'no-preference'});
  await page.evaluate(o=>{window.qa.job=window.qa.run(o);},opts);
  if(opts.count){await page.waitForFunction(()=>window.qa.samples?.at(-1)?.t>0,null,{timeout:30000});}
  if(opts.skip){await page.waitForFunction(t=>window.qa.samples.at(-1).t>=t,opts.skip);await page.evaluate(()=>window.qa.skip());}
  else if(opts.count&&!opts.reduced&&!opts.echo){await page.waitForFunction(()=>window.qa.samples.at(-1).t>=3420);await page.screenshot({path:out+`/contact-${opts.side}${opts.mobile?'-mobile':opts.reverse?'-reverse':''}.png`});}
  const result=await page.evaluate(()=>window.qa.job);const state=await page.evaluate(()=>({samples:window.qa.samples,gpu:document.querySelectorAll('.collapse-gpu,.void-crystal-overlay').length,hp:[...document.querySelectorAll('#hp-me,#hp-opp')].map(n=>({transform:n.style.transform,filter:n.style.filter})),overflow:document.documentElement.scrollWidth>innerWidth}));
  assert.deepEqual(result.hp.map(Number),result.expected);assert.equal(state.gpu,0);assert(state.hp.every(h=>!h.transform&&!h.filter));
  if(opts.count&&!opts.skip){const samples=state.samples.filter(s=>s.t>=0);assert(samples.filter(s=>s.t<3180).every(s=>s.hp.every(h=>h==='120')),'HP before contact');const first=samples.find(s=>s.hp.some(h=>h!=='120'));assert(first&&first.t>=3180&&first.t<3450,'contact synchronized');if(!opts.reduced)assert(samples.some(s=>s.gpu===1));}
  report.push({opts,result,clean:true,overflow:state.overflow});console.log('PASS',JSON.stringify(opts));
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/runtime-check.json',JSON.stringify({report,errors},null,2));
}finally{await b.close();}
