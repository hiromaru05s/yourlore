import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const dir=path.dirname(fileURLToPath(import.meta.url));
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(pathToFileURL(path.join(dir,'index.html')).href);
  assert.equal(await page.locator('article').count(),124);
  const images=await page.locator('img').evaluateAll(async imgs=>{
    for(const img of imgs){img.loading='eager';await img.decode();}
    return imgs.map(img=>({src:img.getAttribute('src'),width:img.naturalWidth}));
  });
  assert.equal(images.length,248);
  assert(images.every(img=>img.width>0));
  await page.selectOption('#theme','spirit');
  assert.equal(await page.locator('article:visible').count(),2);
  await page.screenshot({path:path.join(dir,'gallery-desktop.png')});
  await page.selectOption('#theme','');
  await page.fill('#search','q_tori');
  assert.equal(await page.locator('article:visible').count(),1);
  await page.fill('#search','DARK_ELF');
  assert.equal(await page.locator('article:visible').count(),0);
  await page.fill('#search','');
  await page.selectOption('#theme','spirit');
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:path.join(dir,'gallery-mobile.png'),fullPage:true});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);
  const result={cards:124,decodedImages:images.length,spiritFilter:2,caseInsensitiveSearch:true,darkElfExcluded:true,mobileOverflow:false,errors};
  await fs.writeFile(path.join(dir,'gallery-check.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
} finally {await browser.close();}
