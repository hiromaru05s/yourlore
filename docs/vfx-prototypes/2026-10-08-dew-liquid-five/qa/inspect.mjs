import {chromium} from '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const dir=new URL('.',import.meta.url).pathname,browser=await chromium.launch({headless:true,channel:'chrome'});const errors=[];
try{const p=await browser.newPage({viewport:{width:1440,height:1100}});p.on('pageerror',e=>errors.push(String(e)));await p.goto('http://127.0.0.1:55170/dew-liquid-five.html?paused=1',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.dewLiquid?.state.frames>0,null,{timeout:60000});
 for(let i=0;i<5;i++){await p.evaluate(i=>{window.dewLiquid.select(i);window.dewLiquid.seek(930)},i);await p.locator('#hero').screenshot({path:dir+`L${i+1}-material.png`});}
 await p.screenshot({path:dir+'page.png',fullPage:true});await p.evaluate(()=>window.dewLiquid.configure({view:'flow'}));await p.locator('#hero').screenshot({path:dir+'flow.png'});console.log(JSON.stringify({errors,state:await p.evaluate(()=>window.dewLiquid.state)}));await fs.writeFile(dir+'inspect.json',JSON.stringify(errors));}finally{await browser.close()}
