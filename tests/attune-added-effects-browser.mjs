import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const out=process.env.LORE_TEST_OUTPUT||'/tmp/lore-attune-effects-qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try {for(const [width,height] of [[1280,900],[390,844]]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:width===390});const page=await context.newPage();page.setDefaultTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/attune-check',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="app"></div>'}));
 await page.goto((process.env.LORE_TEST_URL||'http://127.0.0.1:5633')+'/attune-check');
 await page.evaluate(async()=>{
  for(const name of ['fonts','reading-board','tokens','base','card','game-overlays','game','dice','screens','mobile','duel-opening','presentation','defaultUI'])await import('/src/styles/'+name+'.css');
  const [{BaseController},{createGame,reduce},{DB,STARTERS},{setLang},{startBoardLayout},{waitForDuel}]=await Promise.all([import('/src/game/controller.ts'),import('/src/shared/engine.ts'),import('/src/shared/cards.ts'),import('/src/i18n.ts'),import('/src/ui/layout.ts'),import('/src/ui/duelReadiness.ts')]);
  setLang('ja');let seq=0;const card=id=>({...DB[id]??STARTERS[id],uid:'attune-browser-'+seq++});
  class Controller extends BaseController {
   constructor(){super(document.querySelector('#app'),0,{onHome(){},onRematch(){}});this.state=createGame({mode:'online',seed:41,starting:0,p0:{id:'me',name:'YOU'},p1:{id:'opp',name:'OPPONENT'}}).state;this.state.pending=null;this.state.opening=undefined;this.state.turn=4;this.state.cur=0;
    for(const [side,p] of this.state.players.entries())Object.assign(p,{openingDrawReady:false,hp:50,mana:24,maxMana:24,quests:[],traps:[],enchants:[],field:[],hand:side?[]:[card('ATTUNE_RESEARCH'),card('STARTER_MANA')],deck:[card('STARTER_MANA')],discard:[card('STARTER_MANA')],removed:[card('STARTER_MANA')],attuneBonuses:side?['selfHex']:[]});
    this.state=reduce(this.state,{type:'play',idx:0}).state;document.querySelector('#app').classList.remove('opening-pending');this.view.render(this.state);this.view.setHandOpen(true);
   }
   submit(){}
  }
  window.attuneController=new Controller();startBoardLayout();await waitForDuel(document.querySelector('#app'));
 });
 await page.waitForSelector('.duel-loader',{state:'detached',timeout:120000});
 assert.equal(await page.locator('#hand .attune-bonus-badge').textContent(),'追加効果 1');
 await page.locator('#hand .card[data-card-id="STARTER_MANA"]').dispatchEvent('contextmenu');
 assert.equal(await page.locator('.attune-added-effects [data-attune-bonus]').count(),1);
 assert.match(await page.locator('.attune-added-effects').innerText(),/自分の体力を[123]回復/);
 if(width===390)await page.locator('.attune-added-effects').evaluate(el=>el.scrollIntoView({block:'center'}));
 await page.screenshot({path:`${out}/${width}-research.png`});
 await page.locator('.inspect-close').click();
 // A new authoritative state updates the retained hand's count and inspector.
 await page.evaluate(()=>{const c=window.attuneController;c.state=structuredClone(c.state);c.state.players[0].attuneBonuses.push('heal2','heal2','shine','selfHex');c.view.render(c.state);});
 assert.equal(await page.locator('#hand .attune-bonus-badge').textContent(),'追加効果 5');
 await page.locator('#hand .card[data-card-id="STARTER_MANA"]').dispatchEvent('contextmenu');
 assert((await page.locator('.attune-added-effects').innerText()).includes('自分の墓地に'));
 if(width===390)await page.locator('.attune-added-effects').evaluate(el=>el.scrollIntoView({block:'center'}));
 await page.screenshot({path:`${out}/${width}-stacked.png`});
 assert(await page.locator('.attune-added-effects').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
 await page.locator('.inspect-close').click();
 for(const [pile,expected] of [['#pile-myDisc','体力'],['#pile-myDeck','体力'],['#pile-oppDisc','自分の墓地']]){
  await page.locator(pile).click();
  await page.locator('.picker-grid .card[data-card-id="STARTER_MANA"]').first().dispatchEvent('contextmenu');
  assert((await page.locator('.attune-added-effects').innerText()).includes(expected));
  if(pile==='#pile-oppDisc')assert(!(await page.locator('.attune-added-effects').innerText()).includes('回復'));
  await page.locator('.inspect-close').click();
  await page.locator('#overlayRoot .modal-row button').last().click();
 }
 assert.deepEqual(errors,[]);console.log('PASS',width,'research result, stacked update, own deck/graveyard, opponent isolation, no overflow');await context.close();
}} finally {await browser.close();}
