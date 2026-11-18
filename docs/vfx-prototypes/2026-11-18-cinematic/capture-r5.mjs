import fs from 'node:fs/promises';
import {chromium} from '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out=new URL('./qa/r5',import.meta.url).pathname;
const b=await chromium.launch({channel:'chrome',headless:true});const p=await b.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const errors=[];p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
try{await p.goto('http://127.0.0.1:5298/cinematic-vfx.html');await p.waitForSelector('body[data-ready=true]',{timeout:90000});await p.locator('#loop').uncheck();await p.locator('#compare').selectOption('study');const f=p.frames().find(f=>f.url().includes('cinematic-vfx-scene'));
for(const variant of ['hearthstone','shadowverse']){await p.locator('#summon-version').selectOption(variant);await p.waitForFunction(()=>!window.comparison.info().preparing);await f.waitForFunction(()=>window.vfx.info().ready);for(const t of(variant==='hearthstone'?[.50,1.10,1.30,1.50,1.80,2.20]:[.65,1.28,1.52,1.90,2.22,2.48,2.72,3.10])){await f.evaluate(t=>window.vfx.seek(t),t);await p.screenshot({path:`${out}/${variant}-${t}.png`});console.log(variant,t);}}
await fs.writeFile(out+'/capture.json',JSON.stringify({errors},null,2));console.log({errors});}finally{await b.close();}
