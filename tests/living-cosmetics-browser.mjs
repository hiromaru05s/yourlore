import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5378',out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-living-cosmetics';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:out,size:{width:1280,height:900}}}),page=await context.newPage();
page.setDefaultTimeout(90000);const errors=[],checks=[],motion=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.location().url.endsWith('/favicon.ico'))errors.push(m.location().url+' ' +m.text())});
const ids=['azure-plume','pressed-fern'];
async function clip(selector){const r=await page.locator(selector).boundingBox();return {x:Math.max(0,r.x-12),y:Math.max(0,r.y-14),width:Math.min(innerWidthSafe-r.x+12,r.width+24),height:r.height+24};}const innerWidthSafe=1280;
async function delta(a,b){const [x,y]=await Promise.all([sharp(a).ensureAlpha().raw().toBuffer(),sharp(b).ensureAlpha().raw().toBuffer()]);let n=0;for(let i=0;i<x.length;i+=4)if(Math.max(Math.abs(x[i]-y[i]),Math.abs(x[i+1]-y[i+1]),Math.abs(x[i+2]-y[i+2]))>5)n++;return n;}
try{
 // Real production adapter, no registration of a cosmetic preview adapter.
 for(const id of ids)for(const kind of ['sleeve','furniture']){
  await page.goto(origin+`/cosmetic-studio.html?board=1&runtime=1&shopItem=${kind==='furniture'?'furniture:':''}${id}`);
  await page.locator(`#pile-myDeck[data-living-${kind}="${id}"]`).waitFor();await page.waitForTimeout(800);
  assert.equal(await page.locator('#pile-oppDeck').getAttribute('data-living-'+kind),null);
  assert.equal(await page.locator('#pile-myDeck').getAttribute('data-living-'+(kind==='sleeve'?'furniture':'sleeve')),null);
  const area=await clip('#pile-myDeck'),a=await page.screenshot({clip:area});await page.waitForTimeout(1250);const b=await page.screenshot({clip:area});const changed=await delta(a,b);assert(changed>5,`${id} ${kind} idle did not move (${changed})`);motion.push({id,kind,changed});
  await page.screenshot({path:`${out}/${id}-${kind}.png`});
 }
 checks.push('Both selected sleeves/furniture animate independently; opponent remains unchanged');
 // Mixed sets, empty / full piles and repeated rebuilds use the same authoritative snapshot as a match.
 for(const count of [0,1,8,40,0,8]){
  await page.evaluate(({count})=>{const c=window.atelier.controller,g=c.state;g.sleeves=['azure-plume','pressed-fern'];g.furnitures=['furniture:pressed-fern','furniture:azure-plume'];for(const p of g.players){const sample=p.hand[0];p.deck=Array.from({length:count},(_,i)=>({...sample,uid:'deck-'+i}));p.discard=Array.from({length:count},(_,i)=>({...sample,uid:'grave-'+i}));}c.show(g);}, {count});
  await page.locator('#pile-myDeck[data-living-furniture="pressed-fern"]').waitFor();await page.locator('#pile-oppDisc[data-living-furniture="azure-plume"]').waitFor();
  if(count){await page.locator('#pile-myDeck[data-living-sleeve="azure-plume"]').waitFor();await page.locator('#pile-oppDeck[data-living-sleeve="pressed-fern"]').waitFor();}
 }
 await page.screenshot({path:out+'/mixed-board.png'});checks.push('Independent opposing equipment, deck/grave counts 0/1/8/40 and repeated rebuilds');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(500);const area=await clip('#pile-myDeck');const still=await page.screenshot({clip:area});await page.waitForTimeout(1200);assert.equal(await delta(still,await page.screenshot({clip:area})),0);await page.emulateMedia({reducedMotion:'no-preference'});checks.push('Reduced motion freezes the equipped surfaces and shape');
 for(const width of [390,320]){await page.setViewportSize({width,height:844});await page.waitForTimeout(400);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`${out}/board-${width}.png`});}
 checks.push('320px and 390px board without horizontal overflow');
 // Shop claims persist through reload in API fixture; actual server transaction is covered by health-cosmetics-v53.
 await page.setViewportSize({width:1280,height:900});const owned=new Set(['default']),user={id:'living-qa',display:'シーカー',avatar:'SEEKER_BLUE',credits:23,wins:0,losses:0};
 await apiFixture(page,r=>{const p=new URL(r.url).pathname;if(p==='/api/auth/me')return{user};if(p==='/api/geo')return{country:'JP'};const inventory=()=>({sleeves:[...owned].filter(x=>!x.startsWith('furniture:')),furnitures:[...owned].filter(x=>x==='default'||x.startsWith('furniture:'))});if(p==='/api/social/profile')return{profile:{...user,self:true,...inventory()}};if(p==='/api/social/buy-sleeve'){owned.add(r.body.id);return{ok:true,credits:23,...inventory()};}return{ok:true};});
 await page.goto(origin);await page.locator('.lounge-home').waitFor();await page.locator('.screen-loader').waitFor({state:'detached'});await page.locator('[data-nav=shop]').click();
 for(const kind of ['sleeve','furniture']){await page.locator(`[data-category=${kind}]`).click();for(const id of ids){const item=kind==='furniture'?'furniture:'+id:id;await page.locator(`[data-buy="${item}"]`).click();await page.locator(`[data-buy="${item}"]`).waitFor({state:'detached'});await page.locator(`[data-preview="${item}"]`).click();await page.locator('[data-board-preview]').click();const frame=page.frameLocator('.shop-board-dialog iframe');await frame.locator(`#pile-myDeck[data-living-${kind}="${id}"]`).waitFor();await page.locator('[data-close]').click();}}
 await page.locator('.shop-furniture-preview img').first().waitFor();await page.screenshot({path:out+'/shop.png'});await page.reload();await page.locator('.lounge-home').waitFor();await page.locator('.screen-loader').waitFor({state:'detached'});await page.locator('[data-nav=shop]').click();for(const kind of ['sleeve','furniture']){await page.locator(`[data-category=${kind}]`).click();for(const id of ids)assert.equal(await page.locator(`[data-buy="${kind==='furniture'?'furniture:':''}${id}"]`).count(),0);}
 checks.push('Four shop claims, all four in-shop runtime previews, owned state after reload (API fixture)');
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({origin,checks,motion,errors,boundary:'Production renderer and real assets; fixture account and board state. Not an authenticated two-player match.'},null,2));console.log('PASS',checks,motion);
}catch(e){await page.screenshot({path:out+'/failure.png'}).catch(()=>{});console.error(errors);throw e;}finally{await context.close();await browser.close();}
