import {chromium} from '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});const cases=[];
try{for(const fallback of [false,true]){const page=await browser.newPage({viewport:{width:1280,height:800},recordVideo:fallback?undefined:{dir:'/tmp/rift-obsidian-video',size:{width:1280,height:800}}});
 if(fallback)await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:original.call(this,type,...args);};});
 await page.goto('http://127.0.0.1:5398/rift-obsidian-adoption.html');await page.waitForFunction(()=>window.obsidianQA?.ready,null,{timeout:120000});
 const result=await page.evaluate(()=>obsidianQA.play(0));assert(result.removed.includes('obsidian-0-1'));
 if(!fallback){await page.evaluate(()=>{window.done=false;obsidianQA.play(1).then(()=>window.done=true);});await page.waitForSelector('.rift-destruction');await page.evaluate(()=>obsidianQA.dispose());await page.waitForFunction(()=>done);}
 assert.equal(await page.locator('.rift-destruction,.rift-destruction-source').count(),0);cases.push({fallback,complete:true,overlays:0});const video=page.video();await page.close();if(video)await video.saveAs('docs/releases/2026-10-07-rift-obsidian/qa/runtime-continuous.webm');
}await fs.writeFile('docs/releases/2026-10-07-rift-obsidian/qa/fallback-disposal.json',JSON.stringify(cases,null,2));console.log('PASS WebGL unavailable and controller disposal during active effect');}finally{await browser.close();}
