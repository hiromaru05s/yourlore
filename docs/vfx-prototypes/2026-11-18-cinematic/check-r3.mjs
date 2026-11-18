import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import {chromium} from '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=new URL('./qa/r3',import.meta.url).pathname;await fs.mkdir(out,{recursive:true});
const b=await chromium.launch({channel:'chrome',headless:true});const errors=[],checks=[],assets=new Set();
const ctx=await b.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:out+'/video',size:{width:1440,height:1000}}});const p=await ctx.newPage();p.setDefaultTimeout(90000);p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errors.push(m.text());});p.on('response',r=>{if(r.url().includes('/art/')&&r.ok())assets.add(r.url().replace('http://127.0.0.1:5298',''));});
await p.goto('http://127.0.0.1:5298/cinematic-vfx.html');await p.waitForSelector('body[data-ready="true"]');
await p.locator('#loop').uncheck();
const f=p.frames().find(f=>f.url().includes('cinematic-vfx-scene')),n=p.frames().find(f=>f.url().includes('cinematic-vfx-current'));
for(const kind of ['draw','summon','attack','spell']){
 await p.locator(`[data-kind=${kind}]`).click();await p.waitForFunction(()=>window.comparison.info().active==='current');await p.waitForTimeout(600);await p.screenshot({path:`${out}/current-${kind}.png`});
 await p.waitForFunction(()=>window.comparison.info().active==='study');await p.waitForFunction(()=>!window.comparison.info().preparing&&!window.comparison.info().playing);checks.push({comparison:kind,passed:true});
}
await p.locator('#compare').selectOption('study');
async function trial(o){if(o.kind)await p.locator(`[data-kind=${o.kind}]`).click();await p.waitForFunction(()=>!window.comparison.info().preparing);await p.locator('#pause').click().catch(()=>{});await f.evaluate(async o=>{await window.vfx.set({...o,loop:false});window.vfx.pause();},o);await f.waitForFunction(()=>window.vfx.info().ready);}
for(const mode of ['board','focus','white'])for(const kind of ['draw','summon','attack','spell']){
 await trial({mode,kind});const peaks={draw:.73,summon:.72,attack:.72,spell:.72};await f.evaluate(t=>window.vfx.seek(t),peaks[kind]);await p.screenshot({path:`${out}/${mode}-${kind}.png`});const info=await f.evaluate(()=>window.vfx.info());assert.equal(info.kind,kind);assert.equal(info.mode,mode);checks.push({mode,kind,peak:info.time});
}
for(const side of[0,1])for(const spell of['S3','S4','S8']){await trial({mode:'board',kind:'spell',side,spell});await f.evaluate(()=>window.vfx.seek(.72));await p.screenshot({path:`${out}/spell-${side}-${spell}.png`});checks.push({genericSpell:spell,side});}
for(const side of[0,1])for(const kind of['draw','summon','attack','spell']){await n.evaluate(o=>window.currentVfx.run(o),{kind,side,spell:'S4'});await n.evaluate(()=>window.currentVfx.cancel());const visible=await n.evaluate(()=>[...document.querySelectorAll('#hand .card')].every(c=>getComputedStyle(c).visibility==='visible'));assert(visible);checks.push({native:kind,side,reset:true});}
await p.setViewportSize({width:390,height:844});await p.waitForTimeout(500);
for(const kind of['draw','summon','attack','spell']){await trial({mode:'board',kind,side:0,spell:'S4'});await f.evaluate(()=>window.vfx.seek(.72));await p.screenshot({path:`${out}/mobile-${kind}.png`});assert(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth));checks.push({mobile:kind});}
await f.evaluate(()=>window.vfx.replay());await p.waitForTimeout(180);await f.evaluate(()=>window.vfx.pause());const t=await f.evaluate(()=>window.vfx.info().time);await p.waitForTimeout(250);assert.equal(await f.evaluate(()=>window.vfx.info().time),t);checks.push({paused:true});
await p.locator('#compare').selectOption('current');await p.locator('[data-kind=summon]').click();await p.waitForTimeout(250);await p.locator('[data-kind=attack]').click();await p.waitForFunction(()=>!window.comparison.info().playing);checks.push({interrupt:true});
const video=p.video();await ctx.close();await video.saveAs(out+'/continuous.webm');
const reduced=await b.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});await reduced.goto('http://127.0.0.1:5298/cinematic-vfx.html');await reduced.waitForSelector('body[data-ready="true"]');assert(!await reduced.evaluate(()=>window.comparison.info().playing));checks.push({reducedMotion:true});await reduced.close();
await fs.writeFile(out+'/report.json',JSON.stringify({errors,checks,assets:[...assets]},null,2));console.log(JSON.stringify({errors,checks:checks.length,assets:assets.size}));await b.close();assert.equal(errors.length,0);
