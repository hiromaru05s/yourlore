import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {apiFixture} from './helpers/api-fixture.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5196';
const out=process.env.LORE_TEST_OUTPUT||'docs/releases/2026-10-13-popup-silver/local';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce'});
page.setDefaultTimeout(90000);
const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
await apiFixture(page,({url})=>new URL(url).pathname==='/api/rank/me'?{rating:null}:{ok:true});
try{
 await page.route('**/popup-silver-fixture',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html lang="ja"><meta name="viewport" content="width=device-width,initial-scale=1"><body><div id="app"></div></body></html>'}));
 await page.goto(origin+'/popup-silver-fixture');
 await page.evaluate(async()=>{
  for(const name of ['reading-board','tokens','base','card','game-overlays','game','dice','screens','mobile','duel-opening','lounge','loungeGame','loungeStage','presentation','deckWorkspace','cardsWorkspace','menuApproved','menuWorkspace'])await import(`/src/styles/${name}.css`);
  const I=await import('/src/i18n.ts');I.setLang('ja');
  const H=await import('/src/screens/home.ts'),L=await import('/src/ui/lounge.ts'),M=await import('/src/ui/modal.ts'),A=await import('/src/ui/anim.ts'),C=await import('/src/shared/cards.ts');
  await import('/src/styles/popupSilver.css');
  const app={root:document.querySelector('#app'),user:{id:'local-guest-user',display:'シーカー',avatar:'SEEKER_BLUE',credits:1200},home(){},deck(){},leaderboard(){},friends(){},cards(){},shop(){},profile(){},tutorial(){},rankedLobby(){},onlineLobby(){},botGame(){}};
  const home=H.mountHome(app),lounge=L.mountLounge(app,'home');
  const pool=['ANTIQUE_DK','WORLD_TREE','CHOSEN_KNIGHT','ELF','M1','SELECTED_SWORD'].map((id,i)=>({...structuredClone(C.DB[id]),uid:'popup-'+i}));
  window.qa={H,M,A,C,app,home,lounge,pool,result:undefined};
 });
 async function inspect(label,shot=false){
  const m=await page.locator('.overlay > .modal').evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,w:innerWidth,h:innerHeight,overflow:el.scrollWidth>el.clientWidth+2,silver:s.getPropertyValue('--popup-silver').trim(),radius:s.borderRadius};});
  assert(m.left>=-1&&m.right<=m.w+1&&m.top>=-1&&m.bottom<=m.h+1,`${label}: viewport ${JSON.stringify(m)}`);
  assert(!m.overflow,`${label}: horizontal overflow`);assert.equal(m.silver,'1',label);assert.equal(m.radius,'0px',label);
  if(shot)await page.screenshot({path:`${out}/${label}.png`,timeout:90000});
  checks.push(label);console.log('PASS',label);
 }
 for(const [width,height] of [[1280,800],[390,844],[320,667]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>qa.H.showInquiryModal());
  await inspect(`home-inquiry-${width}`,width!==320);
  await page.locator('#inqTitle').fill('デッキについて');await page.locator('#inqBody').fill('ポップアップの表示確認');
  await page.locator('#inqCancel').click();
  await page.evaluate(()=>{qa.M.confirmDialog({title:'未保存の変更',body:'変更を破棄して移動しますか？',confirm:'破棄して移動',cancel:'編集を続ける'}).then(v=>qa.result=v);});
  await inspect(`home-confirm-${width}`);await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>qa.result),false);
 }
 // Actual current board renderer behind the dialogs; deterministic local game.
 await page.evaluate(async()=>{
  qa.home.destroy();qa.lounge();qa.app.root.replaceChildren();
  const E=await import('/src/shared/engine.ts'),{BaseController}=await import('/src/game/controller.ts');
  class Harness extends BaseController{submit(){} maybeBot(){}}
  const c=new Harness(qa.app.root,0,{});c.introShown=true;
  const g=E.createGame({mode:'bot',seed:41,starting:0,p0:{id:'a',name:'YOU'},p1:{id:'b',name:'OPP'}}).state;g.turn=3;g.pending=null;
  for(const [side,p]of g.players.entries()){p.openingDrawReady=false;p.hand=qa.pool.slice(0,3).map(x=>({...x,uid:x.uid+'-'+side}));p.mana=9;p.maxMana=9;p.discard=qa.pool.slice(3);}
  c.state=g;c.view.render(g);qa.c=c;
  qa.stop=(await import('/src/ui/layout.ts')).startBoardLayout();
  qa.clock=await import('/src/ui/duelClock.ts');qa.clock.paintDuelClock(document.querySelector('.mp-clock'),28,60,true);
 });
 await page.waitForSelector('.duel-loader',{state:'detached'});
 for(const [width,height]of [[1280,800],[390,844],[320,667],[844,390]]){
  await page.setViewportSize({width,height});
  await page.evaluate(()=>{qa.M.confirmDialog({title:'降参しますか？',body:'このデュエルは敗北として記録されます。',confirm:'降参する',cancel:'対戦を続ける',danger:true}).then(v=>qa.result=v);});
  await inspect(`duel-confirm-${width}`,width===1280||width===390);assert(await page.locator('.duel-overlay').count());assert(await page.locator('.dialog-clock').count());
  await page.evaluate(()=>qa.clock.paintDuelClock(document.querySelector('.mp-clock'),4,60,true));assert(await page.locator('.dialog-clock.warn').count());
  await page.keyboard.press('Escape');
  await page.evaluate(()=>qa.M.cardPickerMulti('手札に残すカードを2枚選んでください',qa.pool,2,v=>qa.result=v,{exact:true}));
  await inspect(`duel-picker-${width}`,width===1280||width===390);
  assert(await page.locator('.modal-row .btn-gold').isDisabled());
  await page.locator('.picker-grid .card').nth(0).click();assert(await page.locator('.modal-row .btn-gold').isDisabled());
  // The upper card inspector, including keyboard focus, remains independent.
  await page.locator('.picker-grid .card').nth(0).click({button:'right'});
  assert(await page.locator('#zoomOverlay').count());assert(await page.locator('#zoomOverlay').evaluate(el=>el.contains(document.activeElement)));
  await page.keyboard.press('Tab');assert(await page.locator('#zoomOverlay').evaluate(el=>el.contains(document.activeElement)));
  await page.keyboard.press('Escape');assert.equal(await page.locator('#zoomOverlay').count(),0);assert.equal(await page.locator('.is-picked').count(),1);
  await page.locator('.picker-grid .card').nth(1).click();assert(!(await page.locator('.modal-row .btn-gold').isDisabled()));
  await page.locator('.modal-row .btn-gold').click();assert.deepEqual(await page.evaluate(()=>qa.result),['popup-0','popup-1']);
  await page.evaluate(()=>qa.M.deckViewer('デッキ',qa.pool,qa.pool.slice(0,2)));
  await inspect(`duel-viewer-${width}`,width===1280);
  await page.locator('[data-v=deck]').click();assert.equal(await page.locator('.picker-grid .card').count(),2);
  await page.locator('.modal-row .btn').click();
 }
 // Three-language long heading and text treatment; no forced dismissal for exact picks.
 for(const lang of ['en','ko']){
  await page.evaluate(async lang=>{(await import('/src/i18n.ts')).setLang(lang);qa.M.cardPickerMulti(lang==='en'?'Choose exactly two cards to carry over to your next turn':'다음 턴으로 가져갈 카드 두 장을 선택하세요',qa.pool,2,v=>qa.result=v,{exact:true});},lang);
  await inspect('duel-exact-'+lang);await page.keyboard.press('Escape');assert(await page.locator('.modal').count());await page.evaluate(()=>qa.M.closeOverlay());
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/report.json',JSON.stringify({origin,checks,errors,fixture:'Actual HOME and board renderer; local game and API fixtures; no authenticated online match.'},null,2));
 console.log(`PASS ${checks.length} popup layouts; input, exact selection, nested zoom focus, clock, deck tabs, Escape and locales.`);
}finally{await page.evaluate(()=>{qa.M.closeOverlay();qa.A.closeZoom();qa.stop?.();qa.c?.destroy();}).catch(()=>{});await browser.close();}
