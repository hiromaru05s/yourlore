import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin=process.env.TITAN_ORIGIN||'http://127.0.0.1:5494',qa=new URL('../docs/vfx-prototypes/2026-10-12-shield-titan/qa/',import.meta.url).pathname;await fs.mkdir(qa,{recursive:true});
const capture=process.env.TITAN_CAPTURE==='1';
const b=await chromium.launch({channel:'chrome',headless:true});const ctx=await b.newContext({viewport:{width:1440,height:1120},deviceScaleFactor:1});const p=await ctx.newPage(),errors=[],failures=[],checks=[];
p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errors.push(m.text());});p.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))failures.push(r.status()+' '+r.url());});
const check=(name,value)=>{assert.ok(value,name);checks.push(name);};
try{
 await p.goto(origin+'/shield-titan-four.html?qa');await p.waitForFunction(()=>window.titanLab?.ready,{timeout:60000});
 for(const t of [0,450,850,1250,1750,2300,3000]){await p.evaluate(t=>window.titanLab.seek(t),t);if(capture)await p.locator('#grid').screenshot({path:qa+`four-${t}.png`});}
 const perf=await p.evaluate(()=>{const samples=[];for(let i=0;i<30;i++){const t=performance.now();window.titanLab.seek(500+i*45);samples.push(performance.now()-t);}return{samples,stats:window.titanLab.state.stats};});
 await p.evaluate(()=>{window.titanLab.seek(0);window.titanLab.play();});await p.waitForTimeout(7300);await p.evaluate(()=>window.titanLab.pause());check('normal playback advances',await p.evaluate(()=>window.titanLab.state.ms>0));
 await p.locator('#speed').selectOption('0.5');await p.evaluate(()=>{window.titanLab.seek(0);window.titanLab.play();});await p.waitForTimeout(6300);await p.evaluate(()=>window.titanLab.pause());
 await p.locator('#theme').click();await p.evaluate(()=>window.titanLab.seek(1050));if(capture)await p.locator('#grid').screenshot({path:qa+'four-dark.png'});await p.locator('#theme').click();
 await p.evaluate(()=>window.titanLab.setMode('board'));const f=await(await p.waitForSelector('iframe')).contentFrame();await f.waitForFunction(()=>window.titanBoard?.state.ready,{timeout:60000});
 for(const side of [0,1])for(const v of [0,1,2,3]){
  await p.evaluate(({side,v})=>{window.titanLab.setSide(side);window.titanLab.setMulti(false);window.titanLab.seek(0,v);},{side,v});await p.waitForTimeout(80);let s=await f.evaluate(()=>window.titanBoard.state);check(`side ${side} variant ${v} owns initial face`,s.fieldHidden===1);
  for(const t of [400,850,1450,2400]){await p.evaluate(t=>window.titanLab.seek(t),t);await p.waitForTimeout(35);s=await f.evaluate(()=>window.titanBoard.state);check(`side ${side} variant ${v} active ${t}`,s.fieldHidden===1);}
  await p.evaluate(()=>window.titanLab.seek(850));if(capture)await p.screenshot({path:qa+`board-${side}-${v}.png`});
  await p.evaluate(()=>window.titanLab.seek(3000));await f.waitForFunction(()=>window.titanBoard.state.ms===3000);s=await f.evaluate(()=>window.titanBoard.state);check(`side ${side} variant ${v} finish restores`,s.hidden===0&&s.height===0);
 }
 for(const side of [0,1]){await p.evaluate(side=>{window.titanLab.setSide(side);window.titanLab.setMulti(true);window.titanLab.seek(900,2);},side);await p.waitForTimeout(100);check(`three simultaneous side ${side}`,(await f.evaluate(()=>window.titanBoard.state)).fieldHidden===3);await p.evaluate(()=>window.titanLab.stop());await p.waitForTimeout(80);check(`cancel restores side ${side}`,(await f.evaluate(()=>window.titanBoard.state)).hidden===0);}
 await p.evaluate(()=>{window.titanLab.setMulti(false);window.titanLab.seek(850,1);window.titanLab.reduce(true);});await p.waitForTimeout(100);check('reduced motion restores card',(await f.evaluate(()=>window.titanBoard.state)).hidden===0);await p.evaluate(()=>window.titanLab.reduce(false));
 await p.setViewportSize({width:390,height:844});await p.waitForTimeout(700);await p.evaluate(()=>{window.titanLab.setSide(0);window.titanLab.seek(850,3);});await p.waitForTimeout(300);if(capture)await p.screenshot({path:qa+'mobile-board.png',timeout:60000});check('mobile viewport has no horizontal overflow',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await p.evaluate(()=>window.titanLab.stop());await p.waitForTimeout(80);check('resize and mobile cancel restore',(await f.evaluate(()=>window.titanBoard.state)).hidden===0);
 await p.evaluate(()=>window.titanLab.setMode('grid'));await p.evaluate(()=>window.titanLab.seek(850));if(capture)await p.screenshot({path:qa+'mobile-grid.png',fullPage:true,timeout:60000});
 await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(150);check('system reduced motion pauses',await p.evaluate(()=>window.titanLab.state.reduced&&!window.titanLab.state.playing));
 await p.emulateMedia({reducedMotion:'no-preference'});await p.setViewportSize({width:1440,height:1120});await p.evaluate(()=>window.titanLab.seek(850));
 const before=await p.evaluate(()=>window.titanLab.state.stats);await p.evaluate(()=>{for(let i=0;i<15;i++){window.titanLab.seek(3000);window.titanLab.seek(600+i*20);}});const after=await p.evaluate(()=>window.titanLab.state.stats);check('replays keep resources bounded',before.geometries===after.geometries&&before.textures===after.textures);
 await p.evaluate(()=>window.titanLab.dispose());check('disposal releases context',await p.evaluate(()=>window.titanLab.state.disposed&&window.titanLab.state.stats.contexts===0));
 check('no browser exceptions or shader errors',errors.length===0);check('no missing application assets',failures.length===0);
 console.log('lifecycle complete');await fs.writeFile(qa+'report.json',JSON.stringify({passed:checks.length,checks,errors,failures,performance:perf,resources:{before,after},scope:'Local comparison and real GameView fixture; not gameplay adoption or online match validation'},null,2));console.log(JSON.stringify({passed:checks.length,errors,failures,perf:perf.samples.reduce((a,b)=>a+b)/perf.samples.length}));
}catch(e){await fs.writeFile(qa+'failure.json',JSON.stringify({error:e.message,checks,errors,failures},null,2));throw e;}finally{await Promise.race([b.close(),new Promise(r=>setTimeout(r,5000))]);}
