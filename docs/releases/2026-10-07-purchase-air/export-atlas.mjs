import {chromium} from '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{const p=await browser.newPage();await p.goto('http://127.0.0.1:5342/purchase-six.html');await p.waitForFunction(()=>window.purchaseLab?.state.ready,null,{timeout:90000});
const data=await p.evaluate(async()=>{purchaseLab.pause();const {PhysicalMana}=await import('/src/dev/purchase-six/physical.ts');const source=new PhysicalMana();await source.load();const image=source.atlas.toDataURL('image/png').split(',')[1];source.dispose();return image;});
await fs.writeFile('client/public/vfx/purchase-air/crystal-72.png',Buffer.from(data,'base64'));console.log('Exported lossless 72-frame production crystal atlas');}finally{await browser.close();}
