import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5207';
const output=process.env.LORE_TEST_OUTPUT||'/tmp/lore-ingame-card-controls';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
const checks=[],errors=[];
try {
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/controls-fixture',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="app"></div>'}));
 await page.goto(origin+'/controls-fixture');
 await page.evaluate(async()=>{
  for(const css of ['fonts','tokens','base','card','game-overlays','game','dice','screens','mobile','reading-board','duel-opening','presentation','defaultUI','defaultButtons'])await import('/src/styles/'+css+'.css');
  const E=await import('/src/shared/engine.ts'),C=await import('/src/shared/cards.ts'),I=await import('/src/i18n.ts');
  const {BaseController}=await import('/src/game/controller.ts');
  class Controller extends BaseController {
   actions=[];
   submit(a){this.actions.push(a);this.applyResult(E.reduce(this.state,a),false);}
   reset(lang){
    I.setLang(lang);
    const g=E.createGame({mode:'bot',seed:71,starting:0,p0:{id:'a',name:'SELF'},p1:{id:'b',name:'OPPONENT'}}).state;
    g.pending=null;g.turn=4;g.phase='main';g.opening=undefined;
    g.players.forEach((p,i)=>{p.field=[];p.enchants=[];p.traps=[];p.quests=[];p.hand=[];p.mana=30;p.maxMana=30;p.hp=100;p.maxHp=100;p.openingDrawReady=false;p.discard=[{...C.DB.ELF,uid:'grave-'+i}];});
    g.players[0].hand=[{...Object.values(C.DB).find(c=>c.t==='mon'&&!c.summonReq&&!c.onSummon&&!c.passive),uid:'hand-play'}];
    g.players[0].enchants=[{card:{...C.DB.NHEAL,uid:'enchant'},turns:99}];
    const quest=Object.values(C.DB).find(c=>c.quest);if(quest)g.players[0].quests=[{card:{...quest,uid:'quest'},progress:0}];
    this.actions=[];this.state=g;this.introShown=true;this.view.render(g);document.getElementById('app').classList.remove('opening-pending');
   }
  }
  const c=new Controller(document.getElementById('app'),0,{});const stop=(await import('/src/ui/layout.ts')).startBoardLayout();c.reset('ko');window.qa={c,stop};
 });
 await page.waitForFunction(()=>document.getElementById('app').dataset.sceneReady==='true'&&!document.querySelector('.duel-loader'),null,{timeout:120000});
 const noZoom=async()=>assert.equal(await page.locator('#zoomOverlay').count(),0);
 const inspect=async selector=>{await page.locator(selector).click({button:'right'});assert.equal(await page.locator('#zoomOverlay').count(),1);await page.keyboard.press('Escape');await noZoom();};
 for(const lang of ['ko','ja','en']) {
  await page.evaluate(lang=>qa.c.reset(lang),lang);await page.waitForTimeout(900);
  assert.equal(await page.locator('#endBtn').innerText(),'END\nTURN');
  await page.locator('#hand .card').click();await page.waitForTimeout(300);await noZoom();
  await page.locator('#hand .card').click();await noZoom();
  assert.deepEqual(await page.evaluate(()=>qa.c.actions),[]);
  await inspect('#hand .card');
  for(const selector of ['[data-uid="enchant"]','[data-uid="quest"]']) {
   await page.locator(selector).click();await noZoom();await inspect(selector);
  }
  await page.locator('#pile-myDisc').click();
  await page.locator('#overlayRoot .picker-grid .card').click();await noZoom();await inspect('#overlayRoot .picker-grid .card');
  await page.locator('#overlayRoot .modal-row button').click();
  await page.evaluate(()=>{qa.c.state.players[0].mana=0;qa.c.view.render(qa.c.state);});
  for(const selector of ['#fixedMarket .card:first-child','#supplyMarket .card:first-child']) {
   await page.locator(selector).click();await noZoom();await inspect(selector);
  }
  await page.evaluate(()=>{qa.c.state.players[0].mana=30;qa.c.view.render(qa.c.state);qa.c.view.setHandOpen(true);});await page.waitForTimeout(300);
  const r=await page.locator('#hand .card').boundingBox();assert(r);
  const x=r.x+r.width/2,y=r.y+r.height/2;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y-100,{steps:10});
  assert.equal(await page.locator('.drag-ghost').count(),1);
  await page.mouse.move(x,y,{steps:10});await page.mouse.up();await noZoom();
  assert.deepEqual(await page.evaluate(()=>qa.c.actions),[],'returning to hand cancels');
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(640,340,{steps:15});await page.mouse.up();
  await page.waitForFunction(()=>qa.c.state.players[0].field.some(c=>c.uid==='hand-play'),null,{timeout:5000});
  await page.evaluate(()=>qa.c.queue);await noZoom();
  assert.deepEqual((await page.evaluate(()=>qa.c.actions)).map(a=>a.type),['play']);
  checks.push(lang+': END TURN, primary/secondary clicks, cancelled hand drag and successful field play');
  await page.screenshot({path:output+'/'+lang+'.png'});
  await page.evaluate(()=>{qa.c.state.cur=1;qa.c.view.render(qa.c.state);});await page.waitForTimeout(1000);
  assert.equal(await page.locator('#endBtn').innerText(),'ENEMY\nTURN');
  assert.equal(await page.locator('#endBtn').isDisabled(),true);
  await page.screenshot({path:output+'/'+lang+'-enemy.png'});
  checks.push(lang+': physical opponent-turn button stays ENEMY TURN and disabled');
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile(output+'/checks.json',JSON.stringify({origin,checks,errors},null,2));
 console.log('PASS',checks.join('\n'));
 await page.evaluate(()=>{qa.c.destroy();qa.stop();});
} finally {await browser.close();}
