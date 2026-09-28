import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '/tmp/lore-opening-tools/node_modules/playwright/index.mjs';
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5200';
const out='docs/card-rework/2026-09-29-dew-shield/qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,timeout:180000,args:['--disable-quic']});
const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});page.setDefaultTimeout(120000);const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.route('**/dew-fixture.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head></head><body><div id="app"></div></body></html>'}));await page.goto(origin+'/dew-fixture.html');
 await page.evaluate(async()=>{
  for(const file of ['tokens','base','card','game-overlays','game','screens','duel-opening','presentation','reading-board'])await import(`/src/styles/${file}.css`);
  const {BaseController}=await import('/src/game/controller.ts');const E=await import('/src/shared/engine.ts');const {DB}=await import('/src/shared/cards.ts');const {startBoardLayout}=await import('/src/ui/layout.ts');const {setLang}=await import('/src/i18n.ts');setLang('ja');
  class Harness extends BaseController {submit(a){this.applyResult(E.reduce(this.state,a),false);}maybeBot(){}}
  const c=new Harness(document.querySelector('#app'),0,{onHome(){},onRematch(){}});c.introShown=true;
  let seq=0;const card=id=>({...DB[id],uid:'qa-'+(++seq)});const mon=id=>({...card(id),dmg:0,exhausted:false,atkMod:0,defMod:0,tempAtk:0,summonedTurn:0});
  const g=E.createGame({mode:'online',seed:31,starting:0,p0:{id:'qa',name:'Seeker A'},p1:{id:'other',name:'Seeker B'}}).state;g.turn=3;g.pending=null;for(const p of g.players)Object.assign(p,{hp:100,dew:8,shield:12,hand:[],deck:[],field:[],mana:30,maxMana:30,enchants:[],traps:[],quests:[]});
  g.players[0].field=[mon('WORLD_TREE'),mon('M1')];g.players[1].field=[mon('M2')];g.players[0].hand=[card('APPRENTICE_ARMORER'),card('HIGH_ELF')];
  window.qa={c,E,DB,card,mon};c.applyResult({state:g,events:[]},false);window.qa.stop=startBoardLayout();
 });
 await page.waitForSelector('.duel-loader',{state:'detached'});await page.waitForSelector('.pt-resources');
 for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:844,height:390}]){
  await page.setViewportSize(viewport);await page.waitForTimeout(500);
  const data=await page.locator('.pt-resources').evaluateAll(es=>es.map(e=>({text:e.textContent,rect:(()=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}})()})));
  assert.equal(data.length,2);for(const x of data){assert(x.text.includes('8'));assert(x.text.includes('12'));assert(x.rect.width>0&&x.rect.height>0);assert(x.rect.y>=0&&x.rect.y+x.rect.height<=viewport.height+1);}
  await page.screenshot({path:`${out}/board-${viewport.width}.png`});
 }
 checks.push('Dew and Shield counters visible on both portraits at desktop, portrait and landscape sizes');
 await page.setViewportSize({width:1440,height:900});
 await page.evaluate(()=>qa.c.submit({type:'play',idx:0}));await page.waitForFunction(()=>qa.c.state.pending?.reason==='ARMORER_MODE');await page.evaluate(()=>qa.c.queue);await page.screenshot({path:out+'/armorer-choice.png'});
 // The real controller presents the choices and submits the selected uid.
 const choice=page.locator('[data-uid="shield"]');assert(await choice.count()>0);await choice.first().click();await page.waitForFunction(()=>qa.c.state.players[0].shield===16);checks.push('Armorer choice rendered and clicked through real controller');
 const assets=await page.evaluate(async()=>{const ids=['APPRENTICE_ARMORER','VETERAN_ARMORER','SALLY_WEAPONMASTER','PRIEST','HIGH_PRIEST','BLACKSMITH','SHIELD_TITAN','ARMOR_BREAK','SPEAR_AND_SHIELD','SELECTED_SWORD','SELECTED_SHIELD','WINE_COLLECTOR','DEFENSIVE_STANCE','IRON_WALL','DESERTIFICATION','NOURISHING_RAIN'];return Promise.all(ids.map(async id=>{const img=new Image();img.src=`/art/cards/${id}.webp`;await img.decode();return {id,width:img.naturalWidth,height:img.naturalHeight};}));});assert(assets.every(a=>a.width===1472&&a.height===1344));checks.push('All 16 generated card illustrations decode at full expected resolution');
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/browser-report.json',JSON.stringify({origin,checks,assets,errors},null,2));console.log('PASS',checks);
} catch(e){await page.screenshot({path:out+'/browser-failure.png'}).catch(()=>{});console.error(errors);throw e;}finally{await page.evaluate(()=>{qa.c.destroy();qa.stop();}).catch(()=>{});await browser.close();}
