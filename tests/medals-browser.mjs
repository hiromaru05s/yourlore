import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-collapse-tools/node_modules/playwright/index.mjs');
const base=process.env.LORE_TEST_URL||'http://127.0.0.1:5498',out=process.env.LORE_TEST_OUT||'/tmp/lore-medals-browser';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1280,height:800}});page.setDefaultTimeout(120000);const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.route('**/medals-fixture.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>'}));
 await page.goto(base+'/medals-fixture.html');
 await page.evaluate(async()=>{
  for(const name of ['tokens','base','card','game-overlays','game','screens','duel-opening','presentation','reading-board','lounge','loungeSelectedMenu','menuSupport'])await import(`/src/styles/${name}.css`).catch(()=>{});
  const {setLang}=await import('/src/i18n.ts');setLang('ja');
  const {MEDALS}=await import('/src/shared/medals.ts');const {api}=await import('/src/net/api.ts');const {mountProfile}=await import('/src/screens/profile.ts');
  const owned=new Set(['tier:gold','feat:chosen','series:mimic:win:300']);
  const data={equipped:'tier:gold',entries:MEDALS.map(m=>({id:m.id,value:owned.has(m.id)?m.target:Math.min(m.target-1,7),target:m.target,earnedAt:owned.has(m.id)?Date.now():null}))};
  const profile={id:'fixture',self:true,display:'長い名前のシーカーabcdefghijkl',avatar:null,badge:'tier:gold',created_at:Date.now(),medals:data};
  let fail=false;api.profile=async()=>structuredClone(profile);api.updateMe=async patch=>{if(fail){fail=false;throw Error('test');}profile.badge=patch.badge||null;profile.medals.equipped=profile.badge;return{ok:true,...profile};};
  const app={root:document.querySelector('#app'),user:{id:'fixture',display:profile.display,exp:0},home(){}};
  window.qa={data,profile,app,setLang,fail(){fail=true},screen:mountProfile(app,undefined,'owned')};
 });
 await page.locator('[data-equip="feat:chosen"]').click();await page.waitForFunction(()=>document.querySelector('[data-equip="feat:chosen"]')?.getAttribute('aria-pressed')==='true');
 assert.equal(await page.evaluate(()=>qa.app.user.badge),'feat:chosen');checks.push('select owned medal updates account');
 await page.evaluate(()=>qa.fail());await page.locator('[data-equip="tier:gold"]').click();await page.waitForFunction(()=>document.querySelector('.medal-feedback')?.textContent.includes('保存できません'));assert.equal(await page.evaluate(()=>qa.app.user.badge),'feat:chosen');checks.push('failed save retains previous medal');
 for(const [width,height]of [[1280,800],[390,844],[320,568],[844,390]]){
  await page.setViewportSize({width,height});
  for(const tab of ['owned','progress']){
   await page.locator(`[data-tab="${tab}"]`).click();await page.locator('.medal-list').waitFor();
   assert.equal(await page.locator('.medal-entry img,.medal-entry svg,.medal-equipped img,.medal-equipped svg').count(),0);
   const geom=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,rows:[...document.querySelectorAll('.medal-entry')].slice(0,8).map(e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right}})}));
   assert(!geom.overflow&&geom.rows.every(r=>r.left>=-1&&r.right<=width+1),JSON.stringify(geom));
   await page.screenshot({path:`${out}/profile-${tab}-${width}.png`});
  }
  checks.push(`owned/progress geometry ${width}x${height}`);
 }
 await page.locator('[data-medal-filter]').selectOption('mimic');assert(await page.locator('.medal-entry').count()>0);assert((await page.locator('.medal-list').textContent()).includes('ミミック'));await page.locator('.medal-card-list summary').first().click();assert((await page.locator('.medal-card-list[open]').textContent()).includes('ダンジョン'));
 await page.locator('[data-medal-search]').fill('存在しない');assert.equal(await page.locator('.medal-entry').count(),0);checks.push('series filter, eligible cards and empty search');
 await page.locator('[data-tab="owned"]').click();await page.locator('[data-unequip]').click();await page.waitForFunction(()=>document.querySelector('.medal-equipped-name')?.textContent.includes('未設定'));checks.push('unequip');
 await page.evaluate(async()=>{qa.screen.destroy();document.querySelector('#app').replaceChildren();const {BaseController}=await import('/src/game/controller.ts');const {createGame}=await import('/src/shared/engine.ts');class Harness extends BaseController{submit(){}maybeBot(){}load(g){this.state=g;this.view.render(g);}close(){this.destroy();}}const c=new Harness(document.querySelector('#app'),0,{onHome(){},onRematch(){}});c.introShown=true;const g=createGame({mode:'online',seed:41,starting:0,p0:{id:'a',name:'長い名前のシーカーabcdefghijkl'},p1:{id:'b',name:'相手のシーカー'}}).state;g.medals=['series:mimic:win:300','feat:chosen'];g.turn=3;qa.c=c;qa.g=g;c.load(g);});
 await page.locator('.duel-loader').waitFor({state:'detached'});
 for(const [width,height]of [[1280,800],[390,844],[320,568],[844,390]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>qa.c.load(qa.g));await page.waitForTimeout(300);
  assert.equal(await page.locator('.portrait .medal-inscription').count(),2);
  const geom=await page.locator('.portrait .medal-inscription').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect(),n=e.parentElement.querySelector('.pt-player-name').getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,fs:parseFloat(getComputedStyle(e).fontSize),nameFs:parseFloat(getComputedStyle(e.parentElement).fontSize),overlap:r.top<n.bottom-1&&r.bottom>n.top+1}}));
  assert(geom.every(r=>r.left>=0&&r.right<=width+1&&r.top>=0&&r.bottom<=height+1&&r.fs<r.nameFs&&!r.overlap),JSON.stringify({width,height,geom}));
  await page.screenshot({path:`${out}/duel-${width}.png`});checks.push(`two readable medals below names ${width}x${height}`);
 }
 await page.evaluate(async()=>{qa.c.close();document.querySelector('#app').replaceChildren();const {playDuelOpening}=await import('/src/ui/duelOpeningDirector.ts');qa.opening=playDuelOpening;qa.show=async(ms)=>{qa.abort?.abort();await qa.openPromise;qa.abort=new AbortController();qa.openPromise=qa.opening({root:document.querySelector('#app'),me:{name:'長い名前のシーカーabcdefghijkl',avatar:null,medal:'series:mimic:win:300'},opp:{name:'相手のシーカー',avatar:null,medal:'feat:chosen'},firstIsMe:true,signal:qa.abort.signal,onDeal:async()=>{},sampleMs:ms});};});
 for(const [width,height]of [[1280,800],[390,844],[320,568],[844,390]]){
  await page.setViewportSize({width,height});
  for(const ms of [800,4300]){await page.evaluate(ms=>qa.show(ms),ms);await page.waitForFunction(ms=>Number(document.querySelector('.duel-opening')?.dataset.openingMs)===ms,ms);assert((await page.locator('.duel-opening').getAttribute('aria-description')).includes('選ばれし者'));await page.screenshot({path:`${out}/opening-${width}-${ms}.png`});}
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>qa.show(500));await page.waitForFunction(()=>document.querySelector('.duel-opening')?.dataset.openingMs==='500');await page.screenshot({path:out+'/opening-reduced.png'});await page.evaluate(()=>qa.abort.abort());await page.locator('.duel-opening').waitFor({state:'detached'});checks.push('opening: both identities and text plates, 4 sizes, reduced motion and abort cleanup');
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({checks,errors},null,2));console.log('PASS',checks.length,'medal UI groups');
}finally{await browser.close();}
