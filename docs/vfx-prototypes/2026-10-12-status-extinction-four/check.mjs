import {chromium} from '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=new URL('./qa/',import.meta.url).pathname;await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
const errors=[],checks=[],frames=[],performanceSamples=[];
const page=await browser.newPage({viewport:{width:1440,height:1060},deviceScaleFactor:1});
page.on('pageerror',e=>errors.push(String(e)));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
const check=(name,value)=>{assert.ok(value,name);checks.push(name);};

try{
 await page.goto('http://127.0.0.1:5527/status-extinction-four.html',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.extinctionQA?.state.ready,null,{timeout:90000});
 for(const family of ['shield','dew','brand']){
  for(const time of [0,200,420,650,850,1250]){
   await page.evaluate(o=>window.extinctionQA.set(o),{family,time,mode:'compare'});
   const pixels=await page.locator('#compare canvas').evaluateAll(cs=>cs.map(c=>{const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<data.length;i+=4)if(data[i]>2)n++;return n;}));
   check(`${family} ${time} finite alpha`,pixels.every(n=>Number.isFinite(n)));
   if(time===0)check(`${family} all sources visible`,pixels.every(n=>n>100));if(time===1250)check(`${family} all endpoints clear`,pixels.every(n=>n===0));
   frames.push({family,time,pixels});
   if(!process.env.LORE_QA_FAST&&[0,420,650,850].includes(time))await page.locator('#compare').screenshot({path:`${out}${family}-${time}.png`});
  }
 }
 await page.evaluate(()=>window.extinctionQA.set({family:'shield',time:420}));await page.screenshot({path:out+'overview.png'});
 await page.evaluate(()=>window.extinctionQA.set({family:'brand',time:620,dark:true}));await page.screenshot({path:out+'dark.png'});
 await page.evaluate(()=>window.extinctionQA.set({dark:false,reduced:true,time:180}));check('reduced motion clears at 160 ms',await page.locator('#compare canvas').evaluateAll(cs=>cs.every(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=3;i<d.length;i+=4)if(d[i])return false;return true;})));
 await page.evaluate(()=>window.extinctionQA.set({reduced:false,mode:'board',time:0}));
 await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow?.extinctionBoard?.state.ready,null,{timeout:90000});
 const board=page.frames().find(f=>f.url().includes('status-extinction-board.html'));
 const stable=await board.locator('#hp-me,#hp-opp,.zone-mon').allTextContents();
 for(const family of ['shield','dew','brand'])for(let selected=0;selected<4;selected++)for(const side of [0,1]){
  await page.evaluate(o=>window.extinctionQA.set(o),{family,selected,side,time:420,multi:false});
  await board.waitForFunction(()=>window.extinctionBoard.state.time===420);
  const s=await board.evaluate(()=>window.extinctionBoard.state);check(`${family}${selected+1} side${side} anchored`,s.hidden===1&&s.rects.every(r=>r.width>0&&r.height>0&&Number.isFinite(r.x)&&Number.isFinite(r.y)));
  if(selected===0&&side===0)await page.locator('iframe').screenshot({path:`${out}board-${family}.png`});
  await page.evaluate(()=>window.extinctionQA.set({time:1500}));await board.waitForFunction(()=>window.extinctionBoard.state.time===1500);check(`${family}${selected+1} side${side} cleared`,await board.locator('.extinction-overlay').evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return !d.some((v,i)=>i%4===3&&v>0);}));
 }
 check('HP and card content untouched',JSON.stringify(await board.locator('#hp-me,#hp-opp,.zone-mon').allTextContents())===JSON.stringify(stable));
 await page.evaluate(()=>window.extinctionQA.set({time:480,multi:true}));await board.waitForFunction(()=>window.extinctionBoard.state.multi);check('six simultaneous badges',await board.evaluate(()=>window.extinctionBoard.state.hidden===6));await page.locator('iframe').screenshot({path:out+'board-six.png'});
 await page.locator('#decrement').click();check('decrement has no effect',await board.evaluate(()=>window.extinctionBoard.state.after===5&&window.extinctionBoard.state.hidden===0));check('decrement updates all six labels',await board.locator('.pt-resources b').allTextContents().then(x=>x.every(s=>s==='5')));
 const gates=await board.evaluate(()=>[window.extinctionBoard.event(8,5),window.extinctionBoard.event(0,0),window.extinctionBoard.event(0,8),window.extinctionBoard.event(8,0),window.extinctionBoard.event(0,0)]);check('only positive to zero edge fires',JSON.stringify(gates)==='[false,false,false,true,false]');
 await page.locator('#restore').click();check('restore recovers six native badges',await board.evaluate(()=>window.extinctionBoard.state.hidden===0));
 await page.evaluate(()=>window.extinctionQA.set({time:440}));await page.evaluate(()=>window.extinctionQA.stop());check('cancel restores native badges',await board.evaluate(()=>window.extinctionBoard.state.hidden===0));
 await page.evaluate(()=>window.extinctionQA.set({time:390}));await page.setViewportSize({width:844,height:760});check('resize reanchors finite positions',await board.evaluate(()=>window.extinctionBoard.state.rects.every(r=>Number.isFinite(r.x)&&r.width>0)));
 await page.evaluate(()=>window.extinctionQA.set({mode:'compare',multi:false,time:450}));await page.waitForFunction(()=>document.querySelector('iframe').src==='about:blank');check('leaving board releases iframe renderer',true);
 for(const width of [320,390,844]){
  await page.setViewportSize({width,height:844});await page.evaluate(()=>window.extinctionQA.set({family:'dew',time:420}));check(`no horizontal overflow at ${width}`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`${out}mobile-${width}.png`,fullPage:true});
 }
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.extinctionQA.set({mode:'board',multi:true,time:450}));await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow?.extinctionBoard?.state.ready,null,{timeout:90000});const mobile=page.frames().find(f=>f.url().includes('status-extinction-board.html'));check('mobile all six badges',await mobile.evaluate(()=>window.extinctionBoard.state.hidden===6));await page.locator('iframe').screenshot({path:out+'board-mobile.png'});
 await page.evaluate(()=>window.extinctionQA.set({mode:'compare',time:0}));await page.setViewportSize({width:1440,height:1060});
 // Real animation clock, not a seek-only capture: three families played twice at 1x.
 const context=page.context();await context.tracing.start({screenshots:true,snapshots:false});
 for(const family of ['shield','dew','brand']){
  await page.evaluate(f=>{window.extinctionQA.set({family:f,mode:'compare',time:0});window.extinctionQA.play();},family);
  await page.waitForTimeout(4400);const info=await page.evaluate(()=>window.extinctionQA.state);performanceSamples.push({family,drawMs:info.drawMs});
 }
 await context.tracing.stop({path:out+'continuous-playback.zip'});
 await page.evaluate(()=>window.extinctionQA.stop());
 const before=await page.evaluate(()=>window.extinctionQA.state.renderer);for(let i=0;i<40;i++)await page.evaluate(i=>window.extinctionQA.set({family:['shield','dew','brand'][i%3],time:200+i*13}),i);const after=await page.evaluate(()=>window.extinctionQA.state.renderer);check('40 repeat cycles stable GPU resources',before.geometries===after.geometries&&before.textures===after.textures);
 await page.evaluate(()=>window.extinctionQA.dispose());check('dispose releases GPU resources',await page.evaluate(()=>window.extinctionQA.state.renderer.disposed&&window.extinctionQA.state.renderer.rigs===0));
 check('no browser errors',errors.length===0);
 await writeFile(out+'report.json',JSON.stringify({status:'passed',checks,frames,errors,performanceSamples},null,2));console.log(`PASS ${checks.length} checks; ${frames.length} sampled comparison frames; 24 board cases`);
}catch(error){await writeFile(out+'failure.json',JSON.stringify({error:String(error),checks,frames,errors,performanceSamples},null,2));throw error;}finally{await browser.close();}
