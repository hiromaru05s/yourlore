import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-opening-tools/node_modules/playwright/index.mjs');
const origin=process.env.LORE_RELEASE_ORIGIN||'https://test.yourlore.xyz';
const out=process.env.LORE_RELEASE_OUTPUT||'docs/releases/2026-09-29-orchestrated/staging';
await fs.mkdir(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const files=['art/biblion/modular/health.png','art/biblion/modular/shield.png','art/biblion/modular/dew.png','index.html','models/reading-board/v1/board.glb','models/reading-board/v1/board-low.glb'];
for(const dir of ['assets','ui/passives/v2'])for(const f of await fs.readdir('client/dist/'+dir))if(/\.(js|css|svg)$/.test(f))files.push(dir+'/'+f);
const hashes=[];
for(const file of files){
 const response=await fetch(origin+'/'+file);assert.equal(response.status,200,file);
 const remote=Buffer.from(await response.arrayBuffer()),local=await fs.readFile('client/dist/'+file);
 assert.equal(hash(remote),hash(local),file);hashes.push({file,sha256:hash(local)});
}
await fs.writeFile(out+'/hashes.json',JSON.stringify({origin,checkedAt:new Date().toISOString(),hashes},null,2)+'\n');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-quic']});
const page=await browser.newPage({viewport:{width:1280,height:720}});page.setDefaultTimeout(240000);
const errors=[],serverErrors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.url().startsWith(origin)&&r.status()>=500)serverErrors.push({url:r.url(),status:r.status()});});
const local=new URL(origin).hostname==='127.0.0.1';let authenticated=false;
const respond=request=>{
  const path=new URL(request.url).pathname;
  if(path==='/api/auth/me')return {user:authenticated?{id:'release-fixture',display:'シーカー',avatar:'SEEKER_BLUE',wins:0,losses:0,credits:0,sleeve:'default',furniture:'default'}:null};
  if(path==='/api/geo')return {country:'JP'};
  if(path==='/api/rank/me')return {rating:{season:'2026-09',mmr:1000,tier:'bronze',wins:0,losses:0}};
  if(path==='/api/social/friends')return {friends:[],incoming:[],outgoing:[],challenges:[]};
  return {ok:true};
 };
try{
 if(local)await apiFixture(page,respond);
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.waitForSelector('.lounge-login');await page.waitForSelector('.screen-loader',{state:'detached'});
 await page.screenshot({path:out+'/login.png'});
 authenticated=true;if(!local)await apiFixture(page,respond);
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('.screen-loader',{state:'detached'});
 await page.locator('#bot').click();await page.locator('[data-diff=easy]').click();
 await page.waitForSelector('.duel-table-ready',{state:'attached'});
 await page.waitForSelector('.duel-loader',{state:'detached'});
 await page.waitForSelector('.duel-opening',{state:'detached'});
 await page.waitForSelector('#hand .card');
 await page.waitForFunction(()=>document.querySelector('[data-turnlight=porcelain]'));
 assert.equal(await page.locator('.game').evaluate(e=>e.inert),false);
 const viewports=[];
 for(const [width,height] of [[1280,720],[1920,1080],[390,844],[844,390]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(500);
  assert(await page.locator('#hp-me').count());
  assert.equal(await page.locator('#hpbar-me').count(),0);
  const end=await page.locator('#endBtn').boundingBox();assert(end&&end.width>=44&&end.height>=44);
  const resources=await page.locator('.portrait').evaluateAll(es=>es.map(e=>{
   const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,cx:r.x+r.width/2,cy:r.y+r.height/2};};
   return {id:e.id,hp:rect(e.querySelector('.pt-hp')),shield:rect(e.querySelector('.pt-shield')),dew:rect(e.querySelector('.pt-dew')),portrait:rect(e.querySelector('.pt-ring')),labels:[...e.querySelectorAll('.pt-resources>span')].map(n=>({aria:n.getAttribute('aria-label'),title:n.title,image:getComputedStyle(n).backgroundImage,value:n.querySelector('b').textContent}))};
  }));
  assert.equal(resources.length,2);
  for(const r of resources){
   assert(r.hp.cx<r.shield.cx&&r.shield.cx<r.dew.cx,'health / shield / Dew order');
   assert(Math.abs(r.shield.cx-r.portrait.cx)<2,'shield centered on portrait');
   assert(Math.max(r.hp.cy,r.shield.cy,r.dew.cy)-Math.min(r.hp.cy,r.shield.cy,r.dew.cy)<2,'counter row aligned');
   assert(r.hp.x+r.hp.width<=r.shield.x+1&&r.shield.x+r.shield.width<=r.dew.x+1,'counter boxes do not overlap');
   for(const icon of [r.hp,r.shield,r.dew])assert(icon.x>=-1&&icon.y>=-1&&icon.x+icon.width<=width+1&&icon.y+icon.height<=height+1,'counter inside viewport');
   for(const label of r.labels)assert(label.aria&&label.title&&/\d/.test(label.value)&&/\/(shield|dew)\.png/.test(label.image),'counter value, image and accessible name');
  }
  await page.screenshot({path:out+`/bot-${width}.png`});viewports.push({width,height,endButton:end,resources});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(serverErrors,[]);
 await fs.rm(out+'/failure.json',{force:true});await fs.writeFile(out+'/browser.json',JSON.stringify({origin,checkedAt:new Date().toISOString(),hashes:hashes.length,viewports,errors,serverErrors,porcelainTurnLight:true,anonymousLiveLogin:!local,botAuthApiFixture:true,authenticatedOnlineMatch:false},null,2)+'\n');
 console.log('PASS',hashes.length,'asset hashes; production startup, adopted turn light and resource icons at four viewport sizes');
}catch(error){await page.screenshot({path:out+'/failure.png'}).catch(()=>{});await fs.writeFile(out+'/failure.json',JSON.stringify({message:String(error),errors,serverErrors},null,2)+'\n');throw error;}
finally{await browser.close();}
