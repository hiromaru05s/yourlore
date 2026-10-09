import {chromium} from '/tmp/lore-buff-browser-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=path.dirname(new URL(import.meta.url).pathname),lock='/tmp/lore-series-vfx-heavy-qa.lock';
await fs.mkdir(lock);await fs.writeFile(path.join(lock,'owner.json'),JSON.stringify({pid:process.pid,task:'shield-brand-twenty'}));
let browser;const report={cases:[],errors:[],resources:[],viewports:[],performance:[]};
const assert=(x,m)=>{if(!x)throw Error(m)};
try{
 browser=await chromium.launch({headless:true,channel:'chrome'});const context=await browser.newContext({viewport:{width:1440,height:1100},deviceScaleFactor:1});const p=await context.newPage();
 p.on('pageerror',e=>report.errors.push(String(e)));p.on('response',r=>{if(r.status()>=400)report.resources.push({status:r.status(),url:r.url()})});
 await p.goto('http://127.0.0.1:5326/shield-brand-twenty.html?paused=1');await p.waitForFunction(()=>window.shieldBrand?.state.boardReady,{timeout:60000});
 const ids=['SF','SA','BF','BA'].flatMap(g=>[1,2,3,4,5].map(i=>g+i));
 for(const id of ids){
  await p.evaluate(id=>window.shieldBrand.select(id),id);const counts=[];for(const progress of [0,.25,.45,.62,.82,1]){await p.evaluate(t=>window.shieldBrand.seek(t),progress);const state=await p.evaluate(()=>window.shieldBrand.state);counts.push(state.count);if(progress===.45||progress===.62)await p.locator('#hero').screenshot({path:path.join(dir,`${id}-${progress}.png`)});}
  const expected=id[0]==='S'?(id[1]==='F'?[0,6]:[8,14]):id[1]==='F'?[0,1]:[2,3];assert(counts[0]===expected[0]&&counts.at(-1)===expected[1],id+' counter semantics');assert(counts.filter((x,i)=>i&&x!==counts[i-1]).length===1,id+' duplicate counter commit');
  report.cases.push({id,counts,result:'pass'});
 }
 for(const width of [320,390,844,1280]){
  await p.setViewportSize({width,height:width<700?844:900});await p.evaluate(()=>window.shieldBrand.configure({board:false}));
  const overflow=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert(overflow.scroll<=width,width+' overflow');
  await p.evaluate(()=>{window.shieldBrand.select('BF4');window.shieldBrand.seek(.5)});await p.screenshot({path:path.join(dir,`page-${width}.png`),fullPage:true});
  for(const side of [0,1])for(const family of ['SF','SA','BF','BA']){await p.evaluate(({side,id})=>{window.shieldBrand.select(id);window.shieldBrand.configure({board:true,side,multi:false});window.shieldBrand.seek(.62)},{side,id:family+'1'});await p.locator('.screen').screenshot({path:path.join(dir,`board-${width}-${side}-${family}.png`)});}
  report.viewports.push({width,overflow:overflow.scroll-width,sides:2,groups:4});
 }
 await p.setViewportSize({width:1280,height:900});
 for(const dark of [false,true])for(const side of [0,1])for(const id of ids){await p.evaluate(({dark,side,id})=>{window.shieldBrand.select(id);window.shieldBrand.configure({dark,side,board:true,multi:true});window.shieldBrand.seek(.52)},{dark,side,id});const state=await p.frames()[1].evaluate(()=>window.shieldBrandBoard.state);assert(state.ready&&state.active,'native state');assert(state.hidden===(id[0]==='S'?2:0),'hidden ownership');}
 await p.evaluate(()=>window.shieldBrand.configure({board:false}));await p.waitForTimeout(80);const suspended=await p.frames()[1].evaluate(()=>window.shieldBrandBoard.state);assert(suspended.hidden===0,'restore native badges on suspend');
 for(const id of ids){await p.evaluate(id=>{window.shieldBrand.select(id);window.shieldBrand.configure({reduced:true,board:false});window.shieldBrand.seek(1)},id);assert((await p.evaluate(()=>window.shieldBrand.state)).count>0,'reduced count');}
 await p.evaluate(()=>{window.shieldBrand.configure({reduced:false,dark:false});window.shieldBrand.select('SF2')});await p.locator('#play').click();await p.waitForTimeout(4200);report.performance.push(await p.evaluate(()=>window.shieldBrand.state));await p.locator('#play').click();
 report.suspended=suspended;report.fallback=await p.evaluate(()=>{const c=document.createElement('canvas');return{webgl:!!c.getContext('webgl')}});assert(report.errors.length===0,'browser errors');assert(report.resources.length===0,'missing resources');report.result='pass';await context.close();
}catch(e){report.result='failed';report.failure=String(e);throw e;}finally{await fs.writeFile(path.join(dir,'report.json'),JSON.stringify(report,null,2));await browser?.close();const owner=JSON.parse(await fs.readFile(path.join(lock,'owner.json'),'utf8'));if(owner.pid===process.pid)await fs.rm(lock,{recursive:true});}
console.log(JSON.stringify({result:report.result,cases:report.cases.length,viewports:report.viewports,errors:report.errors,performance:report.performance}));
