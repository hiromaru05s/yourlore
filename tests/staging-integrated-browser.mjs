/** Verify deployed bytes and browser startup; BOT login/API are explicit fixtures. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin='https://test.yourlore.xyz',out=process.env.LORE_TEST_OUTPUT||'docs/releases/2026-09-27-integrated';
const hash=b=>createHash('sha256').update(b).digest('hex');
const paths=['/index.html','/art/lounge/stage-v1/stage.png','/art/lounge/stage-v1/sigil.png'];
for(const dir of ['art/seekers/v2','ui/passives/v1'])for(const f of await fs.readdir('client/dist/'+dir))paths.push('/'+dir+'/'+f);
paths.push('/art/lounge/stage-v1/stage.webp','/art/lounge/v1/library.webp');
for(const f of await fs.readdir('client/dist/assets'))if(/\.(js|css)$/.test(f))paths.push('/assets/'+f);
for(const name of ['log','sound','help','surrender'])paths.push('/ui/duel-controls/v1/'+name+'.png');
for(const dir of ['sfx/lore-v2','sfx/opening-v1'])for(const f of await fs.readdir('client/dist/'+dir))if(f.endsWith('.mp3'))paths.push('/'+dir+'/'+f);
const assets=[];
for(let i=0;i<paths.length;i+=8)assets.push(...await Promise.all(paths.slice(i,i+8).map(async path=>{const r=await fetch(origin+path);assert.equal(r.status,200,path);const remote=Buffer.from(await r.arrayBuffer()),local=await fs.readFile('client/dist'+path);assert.equal(hash(remote),hash(local),path);return {path,bytes:local.length,sha256:hash(local)};})));
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],failed=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(origin)&&r.status()>=500)failed.push({url:r.url(),status:r.status()});});
try{
 await page.goto(origin);await page.waitForSelector('.lounge-login');await page.screenshot({path:out+'/staging-login.png'});
 const user={id:'qa-fixture-only',email:'qa@example.test',display:'シーカー',avatar:'SEEKER_BLUE',wins:0,losses:0,credits:0,sleeve:'default'};
 await page.route('**/api/**',r=>{const path=new URL(r.request().url()).pathname;const data=path==='/api/auth/me'?{user}:path==='/api/geo'?{country:'JP'}:path==='/api/rank/me'?{rating:{season:'2026-09',mmr:1000,tier:'bronze',wins:0,losses:0}}:path==='/api/social/friends'?{friends:[],incoming:[],outgoing:[],challenges:[]}:{ok:true};return r.fulfill({contentType:'application/json',body:JSON.stringify(data)});});
 await page.reload();await page.waitForSelector('#bot');await page.locator('#bot').click();await page.locator('[data-diff="easy"]').click();
 await page.waitForSelector('.duel-opening-v1',{timeout:20000});
 assert.equal(await page.locator('.game').evaluate(e=>e.inert),true);
 await page.screenshot({path:out+'/staging-opening.png'});
 await page.waitForFunction(()=>!document.querySelector('.duel-opening'),null,{timeout:20000});
 assert.equal(await page.locator('.game').evaluate(e=>e.inert),false);
 assert(await page.locator('#hand .card').count()>=3);assert.equal(await page.locator('.native-draw-layer').count(),0);
 assert.equal(await page.locator('.seeker-motion').count(),2);for(const c of await page.locator('.seeker-motion').all())assert.equal(await c.getAttribute('data-action'),'idle');
 await page.screenshot({path:out+'/staging-bot.png'});
 for(const id of ['logTab','muteBtn','helpBtn','giveupBtn']){assert.equal(await page.locator('#'+id+' img').evaluate(e=>e.complete&&e.naturalWidth===256),true);assert.equal(await page.locator('#'+id).evaluate(e=>getComputedStyle(e).backgroundImage),'none');}
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 const report={origin,assets,anonymousLiveLogin:true,deployedBotOpening:true,botAuthApiFixture:true,authenticatedOnlineMatch:false,errors,failed};
 await fs.writeFile(out+'/staging-verification.json',JSON.stringify(report,null,2)+'\n');console.log('PASS:',assets.length,'deployed asset hashes, live anonymous login, built BOT opening and input restoration (fixture login/API)');
}finally{await browser.close();}
