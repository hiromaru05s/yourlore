import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5194';
const out='docs/characters/2026-10-12-hooded/qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],requests=[],checks=[];
const context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:out+'/recordings',size:{width:1280,height:900}}});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
const sample=async(ms)=>page.evaluate(async ms=>{
 const seen={blue:[],red:[]};const start=performance.now();
 await new Promise(resolve=>{function tick(){document.querySelectorAll('.seeker-motion').forEach(c=>{const key=c.dataset.action+':'+c.dataset.frame;const list=seen[c.dataset.seeker];if(list&&list.at(-1)!==key)list.push(key);});if(performance.now()-start<ms)requestAnimationFrame(tick);else resolve();}tick();});return seen;
},ms);
try{
 await page.goto(origin+'/hooded-seekers.html');await page.waitForFunction(()=>document.querySelectorAll('[data-ready=true]').length===2);
 await page.locator('button[data-action=idle]').click();const idle=await sample(3200);for(const color of ['blue','red'])assert(idle[color].length>=8);
 await page.locator('button[data-action=mana]').click();const mana=await sample(1900);for(const color of ['blue','red']){assert(mana[color].includes('mana:4'));assert(mana[color].some(x=>x.startsWith('idle:')));}
 checks.push('continuous idle -> mana -> idle for both avatars');
 await page.screenshot({path:out+'/studio-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/studio-mobile.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks.push('390px studio has no horizontal overflow');
 await page.setViewportSize({width:1280,height:900});
 await page.goto(origin+'/hooded-board.html');await page.waitForFunction(()=>window.hoodedBoard?.ready,null,{timeout:120000});await page.waitForFunction(()=>document.querySelectorAll('.seeker-motion[data-ready=true]').length===2);
 const bounds=await page.evaluate(async()=>{
  const reports=[];const load=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src;});
  for(const side of ['Me','Opp']){
   const avatar=document.querySelector('#portrait'+side+' .avatar'),sprite=avatar.querySelector('canvas');
   const rect=avatar.getBoundingClientRect(),sr=sprite.getBoundingClientRect(),w=Math.round(rect.width),h=Math.round(rect.height),fit=Math.min(sr.width,sr.height),ox=sr.left-rect.left+(sr.width-fit)/2,oy=sr.top-rect.top+(sr.height-fit)/2;
   const url=getComputedStyle(avatar).maskImage.match(/url\(["']?(.*?)["']?\)/)[1];
   const mask=await load(url),atlas=await load('/art/seekers/hooded-v1/'+sprite.dataset.seeker+'.webp');
   const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.drawImage(mask,0,0,w,h);const m=g.getImageData(0,0,w,h).data;
   const a=document.createElement('canvas');a.width=1024;a.height=896;const ag=a.getContext('2d');ag.drawImage(atlas,0,0);let clipped=0,total=0;
   for(let row=0;row<7;row++)for(let frame=0;frame<8;frame++){
    const pixels=ag.getImageData(frame*128,row*128,128,128).data;
    for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4;if(Math.min(pixels[i],pixels[i+1],pixels[i+2])>=195)continue;total++;const mx=Math.min(w-1,Math.floor(ox+(x+.5)*fit/128)),my=Math.min(h-1,Math.floor(oy+(y+.5)*fit/128));if(m[(my*w+mx)*4+3]<220)clipped++;}
   }
   reports.push({side,w,h,clipped,total});
  }return reports;
 });
 assert(bounds.every(b=>b.clipped===0),'All 112 frames inside actual portrait masks: '+JSON.stringify(bounds));checks.push('all 112 frames contained within both actual frame masks');
 const histories={};
 for(const [action,expected,side] of [['mana','mana',0],['heal','heal',1],['hurt','hurt',0],['heavy','heavy',1],['brand','hurt',0]]){
  await page.evaluate(({action,side})=>{
    window.actionTrace={blue:[],red:[]};
    const record=()=>document.querySelectorAll('.seeker-motion').forEach(c=>{const list=actionTrace[c.dataset.seeker],key=c.dataset.action+':'+c.dataset.frame;if(list&&list.at(-1)!==key)list.push(key);});
    const observer=new MutationObserver(record);observer.observe(document.querySelector('#app'),{subtree:true,attributes:true,attributeFilter:['data-action','data-frame']});
    window.actionDone=hoodedBoard.trigger(action,side).then(()=>new Promise(r=>setTimeout(r,1500))).then(()=>{record();observer.disconnect();return actionTrace;});
  },{action,side});
  const history=await page.evaluate(()=>window.actionDone);histories[action]=history;
  assert(history[side?'red':'blue'].some(x=>x.startsWith(expected+':')),action+': '+JSON.stringify(history));checks.push('controller '+action+' / side '+side);
 }
 // Rendering a new state reuses the same live canvas and clock.
 const continuity=await page.evaluate(()=>{const c=document.querySelector('#portraitMe canvas');hoodedBoard.play('me','mana');const before=c.dataset.action;hoodedBoard.rerender();return {same:c===document.querySelector('#portraitMe canvas'),before,after:c.dataset.action};});assert(continuity.same);assert.equal(continuity.before,continuity.after);checks.push('board rerender preserves portrait and action');
 await page.waitForTimeout(1600);await page.screenshot({path:out+'/board-desktop.png'});
 await page.evaluate(()=>{window.actionDone=hoodedBoard.trigger('victory',0);});await page.waitForFunction(()=>document.querySelector('#portraitOpp canvas')?.dataset.action==='defeat');
 await page.waitForTimeout(900);await page.screenshot({path:out+'/board-outcome.png'});await page.evaluate(()=>window.actionDone);assert.equal(await page.locator('#portraitOpp canvas').getAttribute('data-frame'),'7');checks.push('winner victory and loser defeat before result dialog');
 await page.evaluate(()=>hoodedBoard.reset());
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{hoodedBoard.play('me','heavy');hoodedBoard.play('opp','defeat');});
 assert.equal(await page.locator('#portraitMe canvas').getAttribute('data-action'),'idle');assert.equal(await page.locator('#portraitOpp canvas').getAttribute('data-frame'),'7');checks.push('reduced motion keeps neutral or terminal pose');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>hoodedBoard.reset());
 await page.evaluate(()=>{hoodedBoard.play('me','heavy');hoodedBoard.skip(true);});assert.equal(await page.locator('#portraitMe canvas').getAttribute('data-action'),'idle');await page.evaluate(()=>hoodedBoard.skip(false));checks.push('fast forward clears pending actions');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);await page.screenshot({path:out+'/board-mobile.png'});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.evaluate(()=>hoodedBoard.destroy());assert.equal(await page.evaluate(()=>hoodedBoard.count()),0);checks.push('destroy releases all portrait players');
 // Use the real profile component and API path through a local fixture, including a failed save.
 await page.setViewportSize({width:1280,height:900});await page.goto(origin+'/profile-lab.html');await page.waitForSelector('#avaBtn');
 await page.locator('#avaBtn').click();await page.waitForSelector('.hooded-picker');await page.locator('[data-seeker-id=SEEKER_RED]').click();
 await page.locator('button[data-action=mana]').click();await page.waitForFunction(()=>document.querySelector('.hooded-live canvas')?.dataset.action==='mana');await page.screenshot({path:out+'/profile-picker.png'});
 await page.locator('[data-save]').click();await page.waitForSelector('.hooded-picker',{state:'detached'});await page.reload();await page.waitForSelector('#avaBtn');assert.match(await page.locator('#avaBtn .hooded-seeker').getAttribute('src'),/red-portrait/);checks.push('profile selects, previews, saves and reloads female');
 await page.locator('#avaBtn').click();await page.locator('[data-seeker-id=SEEKER_BLUE]').click();await page.locator('[data-close]').click();assert.match(await page.locator('#avaBtn .hooded-seeker').getAttribute('src'),/red-portrait/);checks.push('cancel does not change saved avatar');
 await page.locator('[data-tab=settings]').click();await page.locator('[data-character-settings]').click();await page.locator('[data-seeker-id=SEEKER_BLUE]').click();
 await page.evaluate(async()=>{const {api}=await import('/src/net/api.ts');window.realUpdate=api.updateMe;api.updateMe=async()=>{throw new Error('保存テスト: 接続を確認してください');};});await page.locator('[data-save]').click();await page.waitForFunction(()=>document.querySelector('.hooded-save-status')?.textContent.includes('保存テスト'));assert.equal(await page.locator('[data-save]').isEnabled(),true);checks.push('save failure stays open and can retry');
 await page.evaluate(async()=>{const {api}=await import('/src/net/api.ts');api.updateMe=window.realUpdate;});await page.locator('[data-save]').click();await page.waitForSelector('.hooded-picker',{state:'detached'});checks.push('profile settings saves male after retry');
 await page.setViewportSize({width:320,height:740});await page.locator('[data-character-settings]').click();await page.waitForSelector('.hooded-live canvas[data-ready=true]');await page.waitForTimeout(250);await page.screenshot({path:out+'/profile-mobile.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.keyboard.press('Escape');await page.waitForSelector('.hooded-picker',{state:'detached'});checks.push('320px picker and Escape cleanup');
 const retired=requests.filter(r=>/seekers\/(menu-v1|v2)\/.+\.webp|biblion\/seeker-(blue|red)\.png|stage-v1\/stage\./.test(r));assert.deepEqual(retired,[]);assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/browser-tests.json',JSON.stringify({checks,bounds,idle,mana,histories,continuity,errors,retiredAssetRequests:retired},null,2)+'\n');console.log('PASS hooded-seekers browser: '+checks.length+' checks');
}finally{await context.close();await browser.close();}
