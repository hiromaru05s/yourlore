import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5268';
const out=process.env.LORE_TEST_OUT||'/tmp/lore-v58-browser';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});page.setDefaultTimeout(60000);
const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
try {
  await page.route('**/v58-fixture.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head></head><body><div id="app"></div></body></html>'}));await page.goto(origin+'/v58-fixture.html');
  await page.evaluate(async()=>{
    for(const f of ['tokens','base','card','game-overlays','game','screens','duel-opening','presentation','reading-board'])await import(`/src/styles/${f}.css`);
    const {BaseController}=await import('/src/game/controller.ts'),E=await import('/src/shared/engine.ts'),{DB,DECK_POOL}=await import('/src/shared/cards.ts'),{startBoardLayout}=await import('/src/ui/layout.ts'),{setLang}=await import('/src/i18n.ts'),{zoomCard,closeZoom}=await import('/src/ui/anim.ts');setLang('ja');
    class Harness extends BaseController{submit(a){this.applyResult(E.reduce(this.state,a),false);}maybeBot(){}}
    const c=new Harness(document.querySelector('#app'),0,{onHome(){},onRematch(){}});c.introShown=true;
    let seq=0;const card=id=>({...DB[id],uid:'qa-'+(++seq)});
    const fresh=()=>{const g=E.createGame({mode:'online',seed:31,starting:0,p0:{id:'qa',name:'Seeker A'},p1:{id:'other',name:'Seeker B'}}).state;g.turn=5;g.pending=null;for(const p of g.players)Object.assign(p,{hp:100,dew:0,shield:0,hand:[],deck:[],discard:[],field:[],mana:30,maxMana:30,enchants:[],traps:[],quests:[]});return g;};
    window.qa={c,E,DB,DECK_POOL,card,fresh,setLang,zoomCard,closeZoom};let g=fresh();g.players[0].enchants=[{card:card('NIGHT_CASTLE_GIFT'),turns:4,bornTurn:3}];c.applyResult({state:g,events:[]},false);qa.stop=startBoardLayout();
  });
  await page.waitForSelector('.duel-loader',{state:'detached'});await page.evaluate(()=>qa.c.queue);
  const dimensions=await page.evaluate(async()=>{const out=[];for(const dir of ['cards','cards-sm','cards-xs']){const img=new Image();img.src=`/art/${dir}/NIGHT_CASTLE_GIFT.webp`;await img.decode();out.push([dir,img.naturalWidth,img.naturalHeight]);}return out;});assert.equal(dimensions[0][1],1472);assert.equal(dimensions[0][2],1344);assert.equal(dimensions[1][1],384);assert.equal(dimensions[2][1],192);checks.push('master and both thumbnails decode');
  for(const lang of ['ja','ko','en'])for(const width of [1280,390]){
    await page.setViewportSize({width,height:width===390?844:900});await page.evaluate(lang=>{qa.setLang(lang);qa.zoomCard(qa.card('NIGHT_CASTLE_GIFT'));},lang);
    await page.waitForSelector('#zoomOverlay');assert.equal(await page.locator('.zoom-related [data-card-id="VAMP_PACT"]').count(),1);assert.equal(await page.locator('.zoom-related [data-card-id="VAMP_WARD"]').count(),1);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`${out}/gift-${lang}-${width}.png`});await page.evaluate(()=>qa.closeZoom());checks.push(`complete Gift card inspection ${lang} ${width}`);
  }
  await page.setViewportSize({width:1280,height:900});await page.evaluate(()=>qa.setLang('ja'));
  for(const reward of ['VAMP_PACT','VAMP_WARD']){
    await page.evaluate(()=>{let g=qa.fresh();g.cur=1;g.turn=12;g.players[0].enchants=[{card:qa.card('NIGHT_CASTLE_GIFT'),turns:1,bornTurn:5}];qa.c.applyResult({state:g,events:[]},false);});await page.evaluate(()=>qa.c.queue);
    await page.evaluate(()=>qa.c.submit({type:'endTurn'}));await page.waitForSelector('.picker-modal');await page.evaluate(()=>qa.c.queue);
    assert.equal(await page.locator('.picker-grid [data-uid="VAMP_PACT"]').count(),1);assert.equal(await page.locator('.picker-grid [data-uid="VAMP_WARD"]').count(),1);await page.waitForSelector('.fx-turn-sigil',{state:'detached'});await page.screenshot({path:`${out}/gift-choice-${reward}.png`});
    await page.locator(`.picker-grid [data-uid="${reward}"]`).click();await page.locator('.picker-modal .btn-gold').click();await page.waitForFunction(id=>qa.c.state.players[0].hand.some(c=>c.id===id),reward);await page.evaluate(()=>qa.c.queue);assert.equal(await page.evaluate(()=>qa.c.state.players[0].enchants.length),0);checks.push(`real controller picker confirms ${reward}`);
  }
  assert.deepEqual(errors,[]);await fs.writeFile(out+'/report.json',JSON.stringify({origin,checks,dimensions,errors},null,2));console.log('PASS',checks);
} catch(e){await page.screenshot({path:out+'/failure.png'}).catch(()=>{});throw e;}finally{await page.evaluate(()=>{qa.c.destroy();qa.stop();}).catch(()=>{});await browser.close();}
