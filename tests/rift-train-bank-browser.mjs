import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {chromium} from '/tmp/lore-starter-tools/node_modules/playwright/index.mjs';
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5307';
const out='docs/releases/2026-10-26-rift-train-bank/qa';await fs.mkdir(out,{recursive:true});
const css=[...(await fs.readFile('client/src/main.ts','utf8')).matchAll(/import ["']\.\/([^"']+\.css)["']/g)].map(m=>'/src/'+m[1]);
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-quic']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(90000);const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.route('**/rift-train-bank-fixture.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head></head><body><div id="app"></div></body></html>'}));await page.goto(origin+'/rift-train-bank-fixture.html');
 await page.evaluate(async css=>{
  for(const file of css)await import(file);
  const {cardEl,cardRulesEl}=await import('/src/ui/cardView.ts');const {DB}=await import('/src/shared/cards.ts');const {setLang}=await import('/src/i18n.ts');setLang('ja');
  window.catalog={cardEl,cardRulesEl,DB,setLang,ids:['MAGIC_TRAIN','MAGIC_BANK','VOID_APOSTLE','GM6_8','GM6_1','SORTER','QUICK_SORT']};
  window.renderCatalog=lang=>{setLang(lang);const app=document.querySelector('#app');app.replaceChildren();app.style.cssText='padding:24px;display:grid;grid-template-columns:repeat(3,1fr);gap:24px;grid-auto-rows:max-content;align-items:start;background:#1b2023;min-height:100vh';for(const id of catalog.ids){const c={...DB[id],uid:id};const box=document.createElement('section');box.dataset.card=id;box.style.cssText='min-width:0;padding:12px;background:#233035;border:1px solid #647575';const face=cardEl(c,{fullArt:true});face.style.setProperty('--cw','220px');face.style.width='220px';face.style.height='334px';box.append(face,cardRulesEl(c));app.append(box);}};
  renderCatalog('ja');await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));
 },css);
 await page.screenshot({path:out+'/cards-ja.png',fullPage:true});
 const assets=await page.evaluate(async()=>Promise.all(catalog.ids.map(async id=>{const img=new Image();img.src=`/art/cards/${id}.webp`;await img.decode();return {id,width:img.naturalWidth,height:img.naturalHeight,src:img.src};})));assert(assets.filter(x=>x.id.startsWith('MAGIC_')).every(x=>x.width===1472&&x.height===1344));
 for(const lang of ['ko','en']){await page.evaluate(lang=>renderCatalog(lang),lang);await page.screenshot({path:out+`/rules-${lang}.png`,fullPage:true});}
 checks.push('Seven updated cards: actual production card/rules renderer, all three languages, new artwork decoded at 1472x1344');
 await page.reload();
 await page.evaluate(async css=>{
  for(const file of css)await import(file);
  const {BaseController}=await import('/src/game/controller.ts');const E=await import('/src/shared/engine.ts');const {DB}=await import('/src/shared/cards.ts');const {startBoardLayout}=await import('/src/ui/layout.ts');const {setLang}=await import('/src/i18n.ts');setLang('ja');
  class Harness extends BaseController {submit(a){this.applyResult(E.reduce(this.state,a),true);}maybeBot(){}}
  let seq=0;const card=id=>({...DB[id],uid:'qa-'+(++seq)});const mon=id=>({...card(id),dmg:0,exhausted:false,atkMod:0,defMod:0,tempAtk:0,summonedTurn:0});
  const fresh=()=>{const g=E.createGame({mode:'online',seed:31,starting:0,p0:{id:'qa',name:'Seeker A'},p1:{id:'other',name:'Seeker B'}}).state;g.turn=3;g.pending=null;for(const p of g.players)Object.assign(p,{hp:100,dew:0,shield:0,hand:[],deck:[],discard:[],removed:[],field:[],mana:10,maxMana:10,enchants:[],traps:[],quests:[]});return g;};
  const c=new Harness(document.querySelector('#app'),1,{onHome(){},onRematch(){}});c.introShown=true;
  const g=fresh();g.players[0].removed=[card('M1'),card('M2')];g.players[1].hand=[card('GM6_1')];g.pending={kind:'cardChoice',owner:0,reason:'HIGH_ELF_HAND',hint:'',hintJa:'',allowCancel:false,data:{left:1}};
  window.qa={c,E,DB,card,mon,fresh,Harness};c.applyResult({state:E.reduce(g,{type:'pick',uid:g.players[1].hand[0].uid}).state,events:[]},false);qa.stop=startBoardLayout();
 },css);
 await page.waitForSelector('.duel-loader',{state:'detached'});await page.evaluate(()=>qa.c.queue);
 await page.waitForSelector('.picker-modal .card');await page.waitForTimeout(2500);await page.screenshot({path:out+'/jailer-offturn-choice.png'});
 assert.equal(await page.locator('.picker-modal .card').count(),2);
 await page.locator('.picker-modal .card').first().click();await page.locator('.picker-modal .btn-gold').click();await page.evaluate(()=>qa.c.queue);
 assert.equal(await page.evaluate(()=>qa.c.state.pending.data.left),7);
 await page.locator('.picker-modal .card').first().click();await page.locator('.picker-modal .btn-gold').click();await page.evaluate(()=>qa.c.queue);
 assert.equal(await page.evaluate(()=>qa.c.state.pending),null);assert.equal(await page.evaluate(()=>qa.c.state.players[1].discard.find(c=>c.id==='GM6_1')?.id),'GM6_1');
 checks.push('Inactive player resolves Jailer via actual picker clicks; both targets transfer and Jailer returns to graveyard');
 await page.evaluate(()=>{qa.c.destroy();qa.stop();const g=qa.fresh();g.players[0].hand=[qa.card('MAGIC_BANK'),qa.card('MAGIC_TRAIN')];g.players[0].deck=Array.from({length:10},()=>qa.card('M1'));qa.c=new qa.Harness(document.querySelector('#app'),0,{onHome(){},onRematch(){}});qa.c.introShown=true;qa.c.applyResult({state:g,events:[]},false);qa.stop=undefined;});
 await page.waitForSelector('.duel-loader',{state:'detached'});await page.evaluate(()=>qa.c.queue);
 await page.evaluate(()=>qa.c.submit({type:'play',idx:0}));await page.evaluate(()=>qa.c.queue);
 await page.screenshot({path:out+'/bank-active.png'});
 assert.equal(await page.evaluate(()=>qa.c.state.players[0].enchants[0].turns),2);
 assert((await page.locator('.enchant-time').first().getAttribute('aria-label')).includes('自分のターン終了'));
 await page.evaluate(()=>qa.c.submit({type:'play',idx:0}));await page.evaluate(()=>qa.c.queue);
 await page.evaluate(()=>qa.c.submit({type:'endTurn'}));await page.evaluate(()=>qa.c.queue);
 await page.evaluate(()=>qa.c.submit({type:'endTurn'}));await page.evaluate(()=>qa.c.queue);
 assert.equal(await page.evaluate(()=>qa.c.state.turn),11);assert.equal(await page.evaluate(()=>qa.c.state.players[0].hand.length),3);assert.equal(await page.evaluate(()=>qa.c.state.players[0].enchants.length),0);
 await page.waitForTimeout(2500);await page.screenshot({path:out+'/train-turn11.png'});checks.push('Production controller plays Bank/Train; end timing label correct, six quiet turns expire Bank and draw only once');
 await page.setViewportSize({width:1024,height:768});await page.waitForTimeout(400);await page.screenshot({path:out+'/board-1024.png'});
 assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/browser-report.json',JSON.stringify({origin,sourceRoot:process.cwd(),baseCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sources:['client/src/main.ts','client/src/ui/cardView.ts','client/src/game/controller.ts','client/src/ui/boardView.ts','client/public/art/cards'],css,evidence:'local fixture using current production renderer/controller; no authenticated live PvP match',checks,assets,errors},null,2)+'\n');console.log('PASS',checks);
}catch(error){await page.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{});console.error(errors);throw error;}finally{await page.evaluate(()=>{window.qa?.c.destroy();window.qa?.stop?.();}).catch(()=>{});await browser.close();}
