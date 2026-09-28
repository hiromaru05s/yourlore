import {chromium} from '/tmp/lore-opening-tools/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const out=process.cwd()+'/docs/ui-rework/2026-09-29-hand-discard';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const reports=[];
try {for(const width of [1280,390]){
 const context=await browser.newContext({viewport:{width,height:width===390?844:900},hasTouch:width===390,reducedMotion:width===390?'reduce':'no-preference'});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/duel-lab.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="app"></div>'}));
 await page.goto((process.env.LORE_TEST_URL||'http://127.0.0.1:5283')+'/duel-lab.html');
 await page.evaluate(async()=>{
  await Promise.all(['tokens','base','card','game-overlays','game','screens','duel-opening','presentation','reading-board'].map(n=>import('/src/styles/'+n+'.css')));
  const [{BaseController},{createGame,reduce},{DB},{setLang},{startBoardLayout}]=await Promise.all([import('/src/game/controller.ts'),import('/src/shared/engine.ts'),import('/src/shared/cards.ts'),import('/src/i18n.ts'),import('/src/ui/layout.ts')]);
  setLang('ja');localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));
  class Controller extends BaseController{submit(action){this.applyResult(reduce(this.state,action),false)}feed(result){this.applyResult(result,false)}}
  const c=new Controller(document.getElementById('app'),0,{onHome(){},onRematch(){}});window.checkController=c;
  const g=createGame({mode:'bot',seed:207,starting:0,p0:{id:'me',name:'シーカー'},p1:{id:'opp',name:'シーカー'}}).state;
  g.turn=2;g.pending=null;g.cur=0;g.players[0].mana=0;g.players[0].field=[];g.players[0].discard=[];
  const defs=Object.values(DB).filter(c=>c.t==='mon');g.players[0].hand=Array.from({length:10},(_,i)=>({...defs[i],uid:'discard-test-'+i}));
  c.feed(reduce(g,{type:'endTurn'}));startBoardLayout();
 });
 await page.waitForSelector('.discard-draggable');await page.waitForTimeout(2000);
 const state=await page.evaluate(()=>({cards:[...document.querySelectorAll('#hand .card')].map(c=>({dim:c.classList.contains('is-dim'),filter:getComputedStyle(c).filter,opacity:getComputedStyle(c).opacity,cursor:getComputedStyle(c).cursor,blocked:c.hasAttribute('data-block-reason'),playable:c.classList.contains('is-playable')})),open:document.querySelector('.game').classList.contains('hand-open'),target:getComputedStyle(document.getElementById('pile-myDisc')).outlineWidth}));
 assert.equal(state.cards.length,10);assert(state.cards.every(c=>!c.dim&&!c.blocked&&!c.playable&&c.filter==='none'&&c.opacity==='1'&&c.cursor==='grab'));assert(state.open);assert.equal(state.target,'3px');
 await page.screenshot({path:out+'/'+width+'-ready.png'});
 // Cancel a drag outside the shelf; no card may be submitted or left faded.
 let card=page.locator('#hand .card').first();let r=await card.boundingBox();
 await page.mouse.move(r.x+r.width/2,r.y+r.height*.35);await page.mouse.down();await page.mouse.move(width/2,40,{steps:6});await page.mouse.up();
 assert.equal(await page.locator('#hand .card').count(),10);assert.equal(await page.locator('.discard-flight,.discard-dragging').count(),0);
 // Drop one card, then finish the exact remaining count using the keyboard.
 r=await card.boundingBox();const t=await page.locator('#pile-myDisc').boundingBox();
 if(width===390){
  const cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height*.35}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:t.x+t.width/2,y:t.y+t.height/2}]});
  await page.waitForSelector('.is-drop-over');await page.screenshot({path:out+'/'+width+'-drag.png'});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }else{
  await page.mouse.move(r.x+r.width/2,r.y+r.height*.35);await page.mouse.down();await page.mouse.move(t.x+t.width/2,t.y+t.height/2,{steps:8});
  await page.waitForSelector('.is-drop-over');await page.screenshot({path:out+'/'+width+'-drag.png'});await page.mouse.up();
 }
 await page.waitForFunction(()=>document.querySelectorAll('#hand .card').length===9&&document.querySelector('.hand-discard-hint')?.textContent.includes('あと2枚'));
 assert.equal(await page.locator('#hand .is-dim').count(),0);
 await page.locator('#hand .card').first().focus();await page.keyboard.press('Delete');
 await page.waitForFunction(()=>document.querySelectorAll('#hand .card').length===8&&document.querySelector('.hand-discard-hint')?.textContent.includes('あと1枚'));
 await page.locator('#hand .card').first().focus();await page.keyboard.press('Enter');
 await page.waitForFunction(()=>document.querySelectorAll('#hand .card').length===7&&!document.querySelector('.hand-discard-hint'));
 assert.equal(await page.locator('.discard-drop-target,.discard-drop-label,.discard-draggable,.discard-flight,.choosing-discard').count(),0);
 assert.equal(await page.locator('#hand .is-dim').count(),7);assert.deepEqual(errors,[]);
 reports.push({width,status:'passed',checks:['full color with zero mana','grab cursor without blocked tooltip','expanded hand','shelf highlight','cancel drag','touch drop or mouse drop','remaining count 3 → 2 → 1','keyboard completion','cleanup'],state,errors});
 await context.close();
}await fs.writeFile(out+'/browser-report.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports.map(({width,status})=>({width,status}))));}finally{await browser.close()}
