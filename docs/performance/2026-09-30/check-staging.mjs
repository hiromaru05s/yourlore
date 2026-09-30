import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from '/tmp/lore-opening-tools/node_modules/playwright/index.mjs';
import {apiFixture} from '../../../tests/helpers/api-fixture.mjs';
const origin='https://test.yourlore.xyz',out='docs/performance/2026-09-30/staging';await fs.mkdir(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const files=['index.html',...(await fs.readdir('client/dist/assets')).filter(f=>/\.(js|css)$/.test(f)).map(f=>'assets/'+f),'art/lounge/icons/shard-simple-v1.png',...(await fs.readdir('client/dist/art/biblion/modular')).filter(f=>f.endsWith('-ui.webp')).map(f=>'art/biblion/modular/'+f)];const assets=[];
for(const file of files){const local=await fs.readFile('client/dist/'+file),r=await fetch(origin+'/'+file);assert.equal(r.status,200,file);const remote=Buffer.from(await r.arrayBuffer());assert.equal(hash(remote),hash(local),file);assets.push({file,sha256:hash(local)});}
await fs.writeFile(out+'/assets.json',JSON.stringify(assets,null,2));console.log('PASS',assets.length,'deployed asset hashes');
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.setDefaultTimeout(180000);page.on('pageerror',e=>errors.push(e.message));
await apiFixture(page,r=>{const path=new URL(r.url).pathname;return path==='/api/auth/me'?{user:{id:'ui-staging-fixture',display:'シーカー',avatar:'SEEKER_BLUE',wins:0,losses:0,credits:0,sleeve:'default'}}:path==='/api/geo'?{country:'JP'}:path==='/api/rank/me'?{rating:{season:'2026-09',mmr:1000,tier:'bronze',wins:0,losses:0}}:path==='/api/social/friends'?{friends:[],incoming:[],outgoing:[],challenges:[]}:{ok:true};});
try{
 await page.goto(origin);await page.waitForSelector('.screen-loader',{state:'detached'});await page.locator('#bot').click();await page.locator('#ranked').click();await page.locator('[data-diff=easy]').click();await page.waitForSelector('[data-scene-ready=true]');await page.waitForSelector('.duel-loader,.duel-opening',{state:'detached'});await page.waitForSelector('#hand .card');
 assert.equal(await page.locator('.pt-shield,.pt-dew,.pt-resources').count(),0);assert.equal(await page.locator('.pt-hp').count(),2);
 await page.screenshot({path:out+'/bot-zero-resources.png'});
 await page.locator('#giveupBtn').click();await page.locator('.modal-row .btn-danger').click();await page.waitForSelector('.crown-outcome[data-phase=playing]');await page.waitForSelector('.outcome-result');assert.equal(await page.locator('.crown-outcome').count(),0);assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/browser.json',JSON.stringify({passed:true,origin,assetsChecked:assets.length,errors,checks:['deployed BOT board has no zero Shield/Dew icons on either player','HP remains visible','surrender outcome completes with resource icons absent'],boundary:'Deployed runtime and local BOT engine; account/API responses are fixtures. No live account mutation or authenticated online match.'},null,2));console.log('PASS deployed BOT zero resources and outcome');
}finally{await browser.close();}
