import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {apiFixture} from '../../../tests/helpers/api-fixture.mjs';
import {chromium} from '/tmp/lore-opening-tools/node_modules/playwright/index.mjs';
const origin=process.env.LORE_TEST_ORIGIN||'https://test.yourlore.xyz';
const out=process.env.LORE_TEST_OUTPUT||'docs/ui-rework/2026-09-29-resource-layout-adopted/staging';
const dist=process.env.LORE_STAGING_BUILD||'client/dist';
await fs.mkdir(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const files=['index.html',...(await fs.readdir(path.join(dist,'assets'))).filter(f=>/\.(js|css)$/.test(f)).map(f=>'assets/'+f),...['health','shield','dew'].map(n=>`art/biblion/modular/${n}.png`),...['self','opp'].map(n=>`art/biblion/refined/portrait-${n}.png`)];
const assets=[];
for(const file of files){const local=await fs.readFile(path.join(dist,file)),r=await fetch(origin+'/'+file);assert.equal(r.status,200,file);assert.equal(hash(Buffer.from(await r.arrayBuffer())),hash(local),file);assets.push({file,sha256:hash(local)});}
console.log('Asset hashes verified',assets.length);
const approved=JSON.parse(await fs.readFile('docs/ui-rework/2026-09-29-resource-layout-adopted/approved-layout.json','utf8'));
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-quic']});
const page=await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'}),errors=[],layouts=[];page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));
await apiFixture(page,r=>{const p=new URL(r.url).pathname;return p==='/api/auth/me'?{user:{id:'portrait-layout-fixture',display:'シーカー',avatar:'SEEKER_BLUE',wins:0,losses:0,credits:0,sleeve:'default',furniture:'default'}}:p==='/api/geo'?{country:'JP'}:p==='/api/rank/me'?{rating:{season:'2026-09',mmr:1000,tier:'bronze',wins:0,losses:0}}:p==='/api/social/friends'?{friends:[],incoming:[],outgoing:[],challenges:[]}:{ok:true};});
try{
 await page.goto(origin+'/?polish',{waitUntil:'domcontentloaded'});
 await page.waitForSelector('.screen-loader',{state:'detached'});await page.locator('#bot').click();await page.locator('[data-diff=easy]').click();
 await page.waitForSelector('[data-scene-ready=true]');await page.waitForSelector('.duel-loader,.duel-opening',{state:'detached'});await page.waitForSelector('#hand .card');
 for(const [width,height] of [[1920,1080],[390,844],[844,390]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(1000);
  await page.screenshot({path:`${out}/board-${width}.png`});
  for(const side of ['Me','Opp']){
   const actual=await page.locator(`#portrait${side}`).evaluate(el=>{const rect=s=>{const r=el.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};return {ring:rect('.pt-ring'),hp:rect('.pt-hp'),shield:rect('.pt-shield'),dew:rect('.pt-dew')};});
   const expected=approved.find(x=>x.viewport.width===width&&x.side===side);
   for(const key of ['hp','shield','dew'])for(const axis of ['x','y','width','height']){
    const norm=(v)=>axis==='x'?(v[key].x-v.ring.x)/v.ring.width:axis==='y'?(v[key].y-v.ring.y)/v.ring.height:v[key][axis]/v.ring[axis];
    assert(Math.abs(norm(actual)-norm(expected))<.001,`${width} ${side} ${key}.${axis} differs from approved layout`);
   }
   for(const key of ['hp','shield','dew']){const r=actual[key];assert(r.x>=0&&r.y>=0&&r.x+r.width<=width&&r.y+r.height<=height);}
   const r=actual.ring,x=r.x-r.width*.22,y=Math.max(0,r.y-4);
   await page.screenshot({path:`${out}/${side}-${width}.png`,clip:{x,y,width:r.width*1.44,height:Math.min(r.height*1.22+8,height-y)}});
   layouts.push({width,height,side,...actual});
  }
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/verification.json',JSON.stringify({origin,checkedAt:new Date().toISOString(),assets,layouts,errors,boundary:'Deployed build and BOT board, with fixture authentication/API responses. Not an authenticated online match.'},null,2));
 console.log('PASS: deployed asset hashes and selected layout 3 match on both portraits at desktop, portrait and landscape sizes');
}catch(error){await page.screenshot({path:out+'/failure.png'});console.error(errors);throw error;}finally{await browser.close();}
