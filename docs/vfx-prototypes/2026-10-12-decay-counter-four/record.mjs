// Record the actual comparison UI, with its real native cards, layers and counter DOM.
import {chromium} from '/tmp/lore-decay-counter-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const out=new URL('./qa-v2/',import.meta.url).pathname;
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:out+'video',size:{width:1440,height:1000}}});
const page=await context.newPage();const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
try{
 await page.goto('http://127.0.0.1:55264/decay-counter-four.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.decayCounterLab?.state.ready&&decayCounterLab.state.boardReady,{},{timeout:60000});
 await page.evaluate(()=>decayCounterLab.seek(1100));
 await page.screenshot({path:out+'compare-1100.png'});
 await page.evaluate(()=>decayCounterLab.seek(1800));
 await page.screenshot({path:out+'compare-1800.png'});
 await page.evaluate(()=>decayCounterLab.seek(0));
 await page.screenshot({path:out+'compare-0.png'});
 await page.locator('#loop').check();await page.locator('#speed').selectOption('1');
 const started=Date.now();await page.evaluate(()=>decayCounterLab.play());
 await page.waitForTimeout(10000);const finished=Date.now();
 const state=await page.evaluate(()=>decayCounterLab.state);await page.close();const path=await page.video().path();
 await fs.copyFile(path,out+'continuous-ui.webm');
 await fs.writeFile(out+'playback.json',JSON.stringify({started,finished,state,errors,description:'Actual UI at normal speed, real native card and counter DOM, 10-second continuous playback capture. Trim the last 10 s of recording for the deliverable.'},null,2));
 console.log('Actual UI recording saved',JSON.stringify({duration:finished-started,errors}));
}finally{await context.close();await browser.close();}
