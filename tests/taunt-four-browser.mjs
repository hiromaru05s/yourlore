import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5471';
const out='docs/vfx-prototypes/2026-10-12-taunt-four/qa/shield-four';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.goto(origin+'/taunt-four-qa.html',{waitUntil:'domcontentloaded'});
 await page.locator('#run').click({timeout:120000});
 await page.waitForFunction(()=>/^(PASS|FAIL)/.test(document.querySelector('#status').textContent),{},{timeout:120000});
 assert.match(await page.locator('#status').textContent(),/^PASS/);
 const checks=JSON.parse(await page.locator('#report').textContent());assert.equal(checks.length,20);assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/browser-report.json',JSON.stringify(checks,null,2));
 for(let i=0;i<4;i++){const src=await page.locator('#shots img').nth(i).getAttribute('src');await fs.writeFile(out+`/variant-${i+1}.png`,Buffer.from(src.split(',')[1],'base64'));}
 console.log('PASS',checks.length,'checks');
}finally{await browser.close();}
