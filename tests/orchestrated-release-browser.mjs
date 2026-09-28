import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-opening-tools/node_modules/playwright/index.mjs');
const origin=process.env.LORE_RELEASE_ORIGIN||'https://test.yourlore.xyz';
const out=process.env.LORE_RELEASE_OUTPUT||'docs/releases/2026-09-29-orchestrated/staging';
await fs.mkdir(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const files=['index.html','models/reading-board/v1/board.glb','models/reading-board/v1/board-low.glb'];
for(const dir of ['assets','ui/passives/v2'])for(const f of await fs.readdir('client/dist/'+dir))if(/\.(js|css|svg)$/.test(f))files.push(dir+'/'+f);
const hashes=[];
for(const file of files){
 const response=await fetch(origin+'/'+file);assert.equal(response.status,200,file);
 const remote=Buffer.from(await response.arrayBuffer()),local=await fs.readFile('client/dist/'+file);
 assert.equal(hash(remote),hash(local),file);hashes.push({file,sha256:hash(local)});
}
await fs.writeFile(out+'/hashes.json',JSON.stringify({origin,checkedAt:new Date().toISOString(),hashes},null,2)+'\n');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-quic']});
const page=await browser.newPage({viewport:{width:1280,height:720}});page.setDefaultTimeout(90000);
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
 for(const [width,height] of [[1280,720],[390,844]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(500);
  assert(await page.locator('#hp-me').count());
  assert.equal(await page.locator('#hpbar-me').count(),0);
  const end=await page.locator('#endBtn').boundingBox();assert(end&&end.width>=44&&end.height>=44);
  await page.screenshot({path:out+`/bot-${width}.png`});viewports.push({width,height,endButton:end});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(serverErrors,[]);
 await fs.writeFile(out+'/browser.json',JSON.stringify({origin,checkedAt:new Date().toISOString(),hashes:hashes.length,viewports,errors,serverErrors,porcelainTurnLight:true,anonymousLiveLogin:!local,botAuthApiFixture:true,authenticatedOnlineMatch:false},null,2)+'\n');
 console.log('PASS',hashes.length,'asset hashes; production startup and adopted turn light at desktop/mobile sizes');
}catch(error){await fs.writeFile(out+'/failure.json',JSON.stringify({message:String(error),errors,serverErrors},null,2)+'\n');throw error;}
finally{await browser.close();}
