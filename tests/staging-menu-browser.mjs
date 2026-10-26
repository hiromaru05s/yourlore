import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-playwright-tool/node_modules/playwright/index.mjs');
const base='https://test.yourlore.xyz';
const {users}=JSON.parse(await fs.readFile(process.env.LORE_BACKEND_AUTH_FILE,'utf8'));
assert(users[0].id.startsWith('qa-backend-'));
const out=process.env.LORE_BACKEND_STAGING_OUT.replace(/\.json$/,'-browser');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const report={base,api:'authenticated staging; no route interception',cases:[]};
try{for(const width of (process.env.LORE_TEST_WIDTHS||'1280,700').split(',').map(Number)){
 const context=await browser.newContext({viewport:{width,height:900}}),p=await context.newPage(),errors=[],http=[];p.setDefaultTimeout(120000);
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)http.push([r.url(),r.status()]);});
 await context.addCookies([{name:'lore_session',value:users[0].token,url:base,httpOnly:true,secure:true,sameSite:'Lax'}]);
 const skip=await context.request.post(base+'/api/rewards/tutorial/decision',{data:{decision:'skip'}});assert.equal(skip.status(),200);
 await p.addInitScript(()=>{performance.setResourceTimingBufferSize(10000);localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));});
 await p.goto(base,{waitUntil:'domcontentloaded'});await p.waitForSelector('.lounge-home-main');await p.waitForSelector('.screen-loader',{state:'detached'});
 const routes=[];
 for(const round of [1,2])for(const key of ['deck','cards','leaderboard','friends','shop','home']){
  const start=Date.now();await p.locator(`[data-nav="${key}"]`).click();await p.waitForSelector(`[data-nav="${key}"][aria-current="page"]`);await p.waitForSelector('.screen-loader,.asset-tray',{state:'detached'});
  await p.waitForFunction(()=>[...document.images].filter(i=>i.getClientRects().length&&getComputedStyle(i).visibility!=='hidden'&&i.loading!=='lazy').every(i=>i.complete&&i.naturalWidth),{},{timeout:20000});const broken=await p.evaluate(()=>[...document.images].filter(i=>i.getClientRects().length&&getComputedStyle(i).visibility!=='hidden'&&i.loading!=='lazy'&&(!i.complete||!i.naturalWidth)).map(i=>i.src));
  routes.push({round,key,ms:Date.now()-start,broken});assert.deepEqual(broken,[]);if(round===1)await p.screenshot({path:`${out}/${key}-${width}.png`});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(http,[]);report.cases.push({width,routes,errors,http});console.log(JSON.stringify({width,routes}));await context.close();
}}finally{await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}
