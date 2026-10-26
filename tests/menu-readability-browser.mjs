import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const base=process.env.LORE_TEST_URL||'http://127.0.0.1:5597',out=process.env.LORE_TEST_OUT||'docs/releases/2026-10-15-menu-readability/local';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});page.setDefaultTimeout(90000);
const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
const user={id:'menu-qa',display:'シーカー',email:'qa@invalid.test',avatar:'SEEKER_BLUE',wins:0,losses:0,credits:3000,exp:0};
await apiFixture(page,async r=>{const p=new URL(r.url).pathname;
 if(p==='/api/geo')return{country:'JP'};if(p==='/api/auth/me')return{user};if(p==='/api/rank/me')return{rating:{season:'2026-10',mmr:969,tier:'iron',rank:6,wins:3,losses:2,draws:0}};
 if(p==='/api/rewards/tutorial')return{offered:true,keys:[],credits:user.credits};
 if(p==='/api/rewards/progression')return{daily:{day:'2026-10-15',revision:0,quest:{kind:'damage',target:150,reward:350},progress:0,claimed:false,rerollsLeft:3},online:0,ranked:0,bot:{},credits:user.credits,resetsAt:Date.now()+86400000};
 if(p==='/api/invite/me')return{code:'QAINVITE',limit:3,invites:[{display:'Friend A',status:'pending'},{display:'Friend B',status:'paid'}]};
 if(p==='/api/social/profile')return{profile:{...user,self:true,created_at:Date.now(),sleeves:['default'],furnitures:['default'],byMode:{},recent:[]}};
 if(p==='/api/collection')return{credits:user.credits,starterCards:{STARTER_TRASH:8,STARTER_MANA:1,STARTER_CHEST:2}};
 if(p==='/api/rewards/coupon'){user.credits+=100;return{ok:true,amount:100,credits:user.credits};}
 if(p==='/api/social/friends')return{friends:[],incoming:[],outgoing:[],challenges:[]};
 if(p==='/api/rank/leaderboard')return{season:'2026-10',entries:[]};
 if(p==='/api/gifts')return{items:[],pendingCount:0,pendingAmount:0};
 return{ok:true,keys:[],receipts:[]};
});

await page.addInitScript(()=>localStorage.setItem('lore_lang','ja'));
const requested=[];page.on('request',r=>{if(/\/art\/lounge\/(v1\/library|illustrated-v1\/biblion)/.test(r.url()))requested.push(r.url());});
try {
 await page.goto(base,{waitUntil:'domcontentloaded'});await page.locator('.lounge-home').waitFor();
 await page.locator('.screen-loader').waitFor({state:'detached'});
 for(const route of ['home','deck','cards','leaderboard','friends','shop','tutorial']){
  await page.locator(`[data-nav=${route}]`).click();await page.locator(`.lounge-${route}`).waitFor();
  await page.locator('.screen-loader').waitFor({state:'detached'});
  for(const [width,height] of [[1440,900],[1280,720],[390,844],[320,568],[844,390]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(350);
   const result=await page.evaluate(()=>{
    const shell=document.querySelector('.lounge-shell'),main=document.querySelector('.lounge-content');
    const bg=getComputedStyle(document.querySelector('.living-home')||shell).backgroundImage;
    const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom};};
    const controls=[...document.querySelectorAll('.lounge-topbar button,.lounge-rail nav button')].filter(e=>e.getClientRects().length).map(e=>({text:e.textContent,...rect(e),hit:(()=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===e})()}));
    const fonts=[...document.querySelectorAll('.gift-courier-label small,.mode-reward,.rank-season,.rank-target,.lounge-deck-label small,.lounge-deck-label>span')].map(e=>({text:e.textContent,size:parseFloat(getComputedStyle(e).fontSize)}));
    return{bg,controls,fonts,overflow:document.documentElement.scrollWidth>innerWidth+1,contentOverflow:main.scrollWidth>main.clientWidth+1};
   });
   assert(result.controls.every(r=>r.hit),JSON.stringify({route,width,controls:result.controls}));
   assert(!result.overflow,`${route} ${width}: viewport overflow`);
   assert(result.bg.includes('toon-outline-20261026/library-wide.webp'),`${route}: ${result.bg}`);
   assert(result.fonts.every(f=>f.size>=12),JSON.stringify(result.fonts));
   assert(result.controls.every(r=>r.x>=-1&&r.right<=width+1&&r.y>=-1&&r.bottom<=height+1),JSON.stringify({route,width,result}));
   checks.push({route,width,height,...result});
   await page.screenshot({path:`${out}/${route}-${width}x${height}.png`});
   if(route==='home'){await page.locator('.lounge-active-deck').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/home-details-${width}x${height}.png`});await page.locator('.lounge-content').evaluate(e=>e.scrollTop=0);}
  }
 }
 await page.setViewportSize({width:1440,height:900});await page.locator('[data-nav=home]').click();
 await page.locator('[data-profile]').click();await page.locator('.lounge-profile').waitFor();
 assert((await page.locator('.lounge-shell').evaluate(e=>getComputedStyle(e).backgroundImage)).includes('toon-outline-20261026/library-wide.webp'));
 await page.screenshot({path:`${out}/profile.png`});
 assert.deepEqual(requested,[],'No old library artwork may be fetched');assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/checks.json',JSON.stringify({checks,errors,oldBackgroundRequests:requested,boundary:'Normal App/router with fixture API responses; real artwork and menu components.'},null,2));
 console.log('PASS',checks.length,'route/viewport combinations; shared new background; readable HOME text; no old artwork requests');
}catch(e){await page.screenshot({path:out+'/failure.png'});throw e;}finally{await browser.close();}
