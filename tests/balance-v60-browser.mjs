import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5279';
const out='docs/card-rework/2026-10-21-balance-v60/qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-quic']});
const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});page.setDefaultTimeout(60000);const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.route('**/balance-fixture.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head></head><body><div id="app"></div></body></html>'}));await page.goto(origin+'/balance-fixture.html');
 await page.evaluate(async()=>{
  for(const file of ['fonts','tokens','base','card','game-overlays','game','dice','screens','mobile','duel-opening','lounge','loungeGame','loungeStage','presentation','reading-board','popupSilver'])await import(`/src/styles/${file}.css`);
  const {BaseController}=await import('/src/game/controller.ts'),E=await import('/src/shared/engine.ts'),{DB}=await import('/src/shared/cards.ts'),{startBoardLayout}=await import('/src/ui/layout.ts'),{setLang}=await import('/src/i18n.ts');setLang('ja');
  class Harness extends BaseController{submit(a){this.applyResult(E.reduce(this.state,a),false);}maybeBot(){}}
  const c=new Harness(document.querySelector('#app'),0,{onHome(){},onRematch(){}});c.introShown=true;
  let seq=0;const card=id=>({...DB[id],uid:'qa-'+ ++seq}),mon=id=>({...card(id),dmg:0,exhausted:false,atkMod:0,defMod:0,tempAtk:0,summonedTurn:0});
  const g=E.createGame({mode:'online',seed:31,starting:0,p0:{id:'qa',name:'Seeker A'},p1:{id:'other',name:'Seeker B'}}).state;g.turn=5;g.pending=null;
  for(const p of g.players)Object.assign(p,{hp:100,dew:0,shield:0,hand:[],deck:[],discard:[],removed:[],field:[],mana:30,maxMana:30,enchants:[],traps:[],quests:[],uses:{},usesTurn:{}});
  g.players[0].field=[mon('FARMER'),mon('FARM_KEEPER')];g.players[0].enchants=['FARM','HARVEST','FARMER_PRAYER'].map(id=>({card:card(id),turns:id==='FARM'?4:99,bornTurn:1}));
  g.players[0].hand=['FLAME','APPLE','GOLDEN_APPLE'].map(card);g.players[0].uses.FLAME=9;
  window.qa={c,E,DB,card,mon,setLang};c.applyResult({state:g,events:[]},false);window.qa.stop=startBoardLayout();
 });
 await page.waitForSelector('.duel-loader',{state:'detached'});await page.waitForSelector('[data-card-state-text]');
 await page.evaluate(()=>qa.c.view.setHandOpen(true));
 await page.waitForSelector('.fx-turn-sigil',{state:'detached'});
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));});
 const hp=await page.locator('.zone-mon [data-card-id="FARMER"] .ad-def').first().textContent();assert.equal(hp.trim(),'6');
 await page.waitForTimeout(1000);
 for(const lang of ['ja','ko','en']){
  await page.evaluate(lang=>{qa.setLang(lang);qa.c.applyResult({state:qa.c.state,events:[]},false);},lang);
  const flame=page.locator('[data-card-state-text]').first();await flame.focus();await page.waitForSelector('.card-block-tip');assert.match(await page.locator('.card-block-tip').textContent(),/9/);
 }
 checks.push('Hand hover/focus popup reports lifetime same-name usage in all three languages');
 await page.evaluate(()=>{qa.setLang('ja');qa.c.applyResult({state:qa.c.state,events:[]},false);});
 const flame=page.locator('[data-card-state-text]').first();await flame.hover();assert.match(await page.locator('.card-block-tip').textContent(),/9回/);
 await page.screenshot({path:out+'/board-hover.png'});
 await page.evaluate(()=>{const g=structuredClone(qa.c.state);g.players[0].uses.FLAME=10;qa.c.applyResult({state:g,events:[]},false);});
 await page.waitForFunction(()=>document.querySelector('.card-block-tip')?.textContent.includes('10回'));
 checks.push('Popup updates to 10 while the surviving hand card stays hovered');
 const assets=await page.evaluate(async()=>Promise.all(['FARM','FARMER','HARVEST','APPLE','GOLDEN_APPLE','FARMER_PRAYER'].map(async id=>{const image=new Image();image.src=`/art/cards/${id}.webp`;await image.decode();return {id,width:image.naturalWidth,height:image.naturalHeight};})));
 assert(assets.every(x=>x.width>=1024&&x.height>=1024));checks.push('All six final illustrations decode from the game asset paths');
 await page.evaluate(async()=>{const {zoomCard}=await import('/src/ui/anim.ts');zoomCard(qa.card('FARMER_PRAYER'));});await page.waitForSelector('.inspect-type');
 assert.match(await page.locator('.zoom-details').textContent(),/「黄金のりんご」になる/);await page.screenshot({path:out+'/prayer-detail.png'});
 await page.evaluate(async()=>{const {closeZoom}=await import('/src/ui/anim.ts');closeZoom();});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);await page.screenshot({path:out+'/board-mobile.png'});
 checks.push('Real board and prayer detail rendered; desktop and mobile screenshots captured');
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/browser-report.json',JSON.stringify({origin,fixture:true,checks,assets,errors},null,2));console.log('PASS',checks);
}catch(e){await page.screenshot({path:out+'/browser-failure.png'}).catch(()=>{});console.error(errors);throw e;}finally{await page.evaluate(()=>{qa.c.destroy();qa.stop();}).catch(()=>{});await browser.close();}
