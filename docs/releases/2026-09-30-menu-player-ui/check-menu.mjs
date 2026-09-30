import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '/tmp/lore-opening-tools/node_modules/playwright/index.mjs';
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5303';
const out=process.env.LORE_TEST_OUT||'docs/releases/2026-09-30-menu-player-ui/menu';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce'});
const errors=[],checks=[],overflows=[];page.on('pageerror',e=>errors.push(e.message));
const user={id:'qa-support',email:'qa@example.test',display:'シーカー',avatar:'SEEKER_BLUE',wins:24,losses:10,credits:1200,sleeve:'default'};
const rating={season:'2026-09',mmr:1184,tier:'gold',wins:12,losses:5,rank:26,peak_mmr:1210};
const profile={...user,self:true,created_at:Date.UTC(2026,0,1),...rating,stats_public:true,sleeves:['default'],byMode:{ranked:{w:12,l:5},online:{w:8,l:3},bot:{w:4,l:2}},recent:[{mode:'ranked',result:'win',opp:'アストラ',turns:12,at:Date.now()},{mode:'ranked',result:'loss',opp:'ルミナ',turns:18,at:Date.now()}],h2h:[{oppId:'friend-a',oppName:'アストラ',wins:3,losses:2,games:5}]};
let inquiryFail=true,updates=0;
await page.route('**/api/**',async r=>{const path=new URL(r.request().url()).pathname;let data={ok:true,keys:[],friends:[],incoming:[],outgoing:[],challenges:[]};
if(path==='/api/auth/me')data={user};
if(path==='/api/geo')data={country:'JP'};
if(path==='/api/rank/me')data={rating};
if(path==='/api/social/profile')data={profile};
if(path==='/api/social/me'){updates++;Object.assign(profile,r.request().postDataJSON());data={...user,...r.request().postDataJSON(),ok:true};}
if(path==='/api/invite/me')data={code:'LORETEST',limit:3,invites:[{display:'アストラ',status:'pending'},{display:'ルミナ',status:'paid'}]};
if(path==='/api/inquiry'&&inquiryFail){inquiryFail=false;return r.fulfill({status:503,contentType:'application/json',body:'{"error":"test outage"}'});}
return r.fulfill({contentType:'application/json',body:JSON.stringify(data)});
});
async function shot(name){await page.screenshot({path:`${out}/${name}.png`,timeout:90000});checks.push(name);const overflow=await page.evaluate(()=>[...document.querySelectorAll('.lounge-content,.support-dialog')].filter(e=>e.scrollWidth>e.clientWidth+2).map(e=>({class:e.className,scroll:e.scrollWidth,width:e.clientWidth})));if(overflow.length)overflows.push({name,overflow});}
async function utility(name){if(await page.locator('[data-'+name+']').isHidden())await page.locator('.lounge-menu').click();await page.locator('[data-'+name+']').click();}
try{
await page.goto(origin);await page.waitForSelector('.lounge-home');await page.waitForSelector('.screen-loader',{state:'detached',timeout:180000});
for(const [w,h] of [[1280,800],[390,844],[320,568],[844,390]]){
await page.setViewportSize({width:w,height:h});await page.locator('[data-nav=home]').click();await page.waitForSelector('#ranked');await shot('home-'+w);
const centered=await page.locator('#ranked').evaluate(e=>{const r=e.getBoundingClientRect(),t=e.querySelector('strong').getBoundingClientRect();return {x:Math.abs(t.x+t.width/2-r.x-r.width/2),y:Math.abs(t.y+t.height/2-r.y-r.height*.52)}});assert(centered.x<2&&centered.y<2,JSON.stringify(centered));
assert(await page.locator('.lounge-balance img').evaluate(e=>e.complete&&e.naturalWidth>0));
await page.locator('[data-profile]').click();await page.waitForSelector('#avaBtn');await shot('profile-'+w);
await page.locator('[data-tab=settings]').click();await page.waitForSelector('#vol');await shot('settings-'+w);
await page.locator('#vol').fill('35');assert.equal(await page.locator('#volVal').textContent(),'35%');
await page.locator('label[for=pub]').click();await page.waitForFunction(()=>!document.querySelector('#pub').disabled);
await page.locator('[data-nav=tutorial]').click();await page.waitForSelector('.tut-steps');await shot('guide-'+w);
if(!(await page.locator('.guide-index').getAttribute('open')!==null))await page.locator('.guide-index summary').click();await page.locator('.lounge-guide-nav a').last().click();await shot('guide-section-'+w);
await utility('invite');await page.waitForSelector('#invLink');await shot('invite-'+w);assert((await page.locator('#invLink').inputValue()).endsWith('?ref=LORETEST'));await page.keyboard.press('Escape');assert.equal(await page.locator('.invite-box').count(),0);
await utility('inquiry');await page.waitForSelector('#inqTitle');await shot('inquiry-'+w);await page.keyboard.press('Escape');assert.equal(await page.locator('.inquiry-box').count(),0);
}
await page.setViewportSize({width:390,height:844});await utility('inquiry');await page.locator('#inqSend').click();assert(await page.locator('#inqMsg').textContent());await page.locator('#inqTitle').fill('Local fixture QA');await page.locator('#inqBody').fill('This request is intercepted locally.');await page.locator('#inqSend').click();await page.waitForFunction(()=>!document.querySelector('#inqSend').disabled);assert.equal(await page.locator('#inqBody').inputValue(),'This request is intercepted locally.');await shot('inquiry-error');await page.locator('#inqSend').click();await page.waitForSelector('.inq-done');assert(await page.locator('#inqOk').evaluate(e=>e===document.activeElement));await shot('inquiry-success');await page.keyboard.press('Escape');assert.equal(await page.locator('.inquiry-box').count(),0);
await page.locator('[data-profile]').click();await page.waitForSelector('#avaBtn');await page.locator('[data-tab=settings]').click();await page.locator('#langSel').selectOption('en');await page.waitForSelector('#langSel');await page.setViewportSize({width:320,height:568});await shot('settings-320-en');await page.locator('[data-nav=tutorial]').click();await page.waitForSelector('.tut-steps');await shot('guide-320-en');
await page.locator('[data-nav=home]').click();await page.waitForSelector('#ranked');await page.emulateMedia({reducedMotion:'no-preference'});
if(!origin.startsWith('https:')){
await page.evaluate(async()=>{const {coverScreen}=await import('/src/ui/assetReadiness.ts');const root=document.querySelector('#app');const cover=coverScreen(root,true,true);window.menuEntranceSamples=[];window.menuEntranceDone=false;const sample=()=>{const shell=document.querySelector('.horizon-nav'),rail=document.querySelector('.lounge-rail'),shade=getComputedStyle(shell,'::before');window.menuEntranceSamples.push({elapsed:Number(document.querySelector('.home-entrance-stage')?.dataset.elapsed??-1),shade:[shade.position,shade.bottom,shade.height,shade.opacity,shade.transform,shade.backgroundImage],rail:getComputedStyle(rail).transform});if(!window.menuEntranceDone)requestAnimationFrame(sample);};requestAnimationFrame(sample);void cover.ready().then(()=>window.menuEntranceDone=true);});
await page.waitForSelector('.home-entrance-stage',{timeout:90000});assert.equal(await page.locator('.home-entrance-skip').count(),0);await page.keyboard.press('Escape');assert.equal(await page.locator('.home-entrance-stage').count(),1);
await page.waitForFunction(()=>Number(document.querySelector('.home-entrance-stage')?.dataset.elapsed)>=2100);await page.screenshot({path:out+'/entrance-nav-reveal.png'});
await page.waitForFunction(()=>window.menuEntranceDone,{timeout:20000});assert.equal(await page.locator('#app').evaluate(e=>e.inert),false);await shot('entrance-nav-complete');
const samples=await page.evaluate(()=>window.menuEntranceSamples);const moving=samples.filter(s=>s.elapsed>=1900);assert(moving.some(s=>s.rail!=='none'));assert.equal(new Set(moving.map(s=>JSON.stringify(s.shade))).size,1,'shade stays fixed throughout navigation reveal');assert.equal(await page.locator('.lounge-rail').evaluate(e=>getComputedStyle(e,'::before').content),'none');await fs.writeFile(out+'/entrance-shade-samples.json',JSON.stringify(samples,null,2));
}
assert(updates>0);assert.deepEqual(errors,[]);assert.deepEqual(overflows,[]);await fs.writeFile(out+'/report.json',JSON.stringify({origin,checks,errors,overflows,updates,api:'Local intercepted API fixtures; no real message or account writes'},null,2));console.log('PASS',checks.length,'screens and interactions');
} catch(e){await page.screenshot({path:out+'/failure.png'});await fs.writeFile(out+'/failure.json',JSON.stringify({error:String(e),errors,overflows},null,2));throw e;}finally{await browser.close();}
