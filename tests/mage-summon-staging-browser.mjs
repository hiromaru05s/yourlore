/** Execute the deployed playMonster/cardEl exports on a live BOT board.
 * Auth/API and temporary field cards are fixtures; production assets are real. */
import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {parseAst} from 'rollup/parseAst';import {build} from 'esbuild';import {pathToFileURL} from 'node:url';
import {apiFixture} from './helpers/api-fixture.mjs';
import {chromium} from '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const evidence=process.env.MAGE_EVIDENCE||'docs/releases/2026-10-09-mage-summon',manifest=JSON.parse(await fs.readFile(evidence+'/built-assets.json')),origin=process.env.MAGE_ORIGIN||'https://test.yourlore.xyz';let summon,cardEl;
for(const file of manifest.assets.filter(x=>x.file.endsWith('.js'))){
 const code=await fs.readFile(evidence+'/built/'+file.file,'utf8'),ast=parseAst(code);
 for(const node of ast.body.filter(x=>x.type==='FunctionDeclaration')){
  const body=code.slice(node.start,node.end);let kind;
  if(body.includes('"summon"')&&body.includes('.dataset.cardId')&&body.includes('"destroy"')&&body.includes('.signal?.aborted')&&node.params.length===3)kind='summon';
  if(body.includes('.dataset.cardId=')&&body.includes('.dataset.cardType='))kind='card';
  if(!kind)continue;
  for(const e of ast.body.filter(x=>x.type==='ExportNamedDeclaration'))for(const s of e.specifiers)if(s.local.name===node.id.name){const route={file:file.file,name:s.exported.name};if(kind==='summon')summon=route;else cardEl=route;}
 }
}
assert(summon,'existing playMonster export');assert(cardEl,'existing cardEl export');
await build({entryPoints:['client/src/shared/cards.ts'],bundle:true,platform:'node',format:'esm',outfile:evidence+'/cards.mjs'});const {DB}=await import(pathToFileURL(evidence+'/cards.mjs'));
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[],warnings=[],results=[];page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning'||m.type()==='error')warnings.push(m.text());});
try{
 await page.addInitScript(()=>{Math.random=()=>.1;localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));});
 await apiFixture(page,r=>{const p=new URL(r.url).pathname;return p==='/api/auth/me'?{user:{id:'mage-ui-fixture',display:'シーカー',avatar:'SEEKER_BLUE',wins:0,losses:0,credits:0,sleeve:'default'}}:p==='/api/geo'?{country:'JP'}:p==='/api/rank/me'?{rating:{season:'2026-10',mmr:1000,tier:'bronze',wins:0,losses:0}}:p==='/api/social/friends'?{friends:[],incoming:[],outgoing:[],challenges:[]}:{ok:true};});
 await page.goto(origin);await page.waitForSelector('.screen-loader',{state:'detached'});await page.locator('#bot').click();if(await page.locator('#ranked').isVisible())await page.locator('#ranked').click();await page.locator('[data-diff=easy]').click();await page.locator('#diffStart').click();await page.waitForSelector('[data-scene-ready=true]');await page.waitForSelector('.duel-loader,.duel-opening',{state:'detached'});await page.waitForSelector('#hand .card');console.log('Deployed BOT board ready');
 // Finish network decoding before advancing the deterministic clock; otherwise
 // simulated texture timeouts can outrun real staging downloads.
 await page.evaluate(async({cardEl,cards})=>{const render=(await import('/'+cardEl.file))[cardEl.name],host=document.createElement('div');host.className='game';host.style.cssText='position:fixed;left:-4000px;top:0';document.body.append(host);try{for(const card of cards)host.append(render(card,{field:true,fullArt:true}));await Promise.all([...host.querySelectorAll('img')].map(image=>image.decode()));await document.fonts.ready;}finally{host.remove();}},{cardEl,cards:['FIRE_MASTER','BLACK_ELSA','BLACK_ALICE'].map(id=>({...DB[id],uid:'warm-'+id}))});
 const clockStart=Date.now();await page.clock.install({time:new Date(clockStart)});await page.clock.pauseAt(new Date(clockStart+1000));
 for(const [i,id] of ['FIRE_MASTER','BLACK_ELSA','BLACK_ALICE'].entries()){
  const side=i%2?'opp':'me';
  await page.evaluate(async({summon,cardEl,card,side})=>{const render=(await import('/'+cardEl.file))[cardEl.name],play=(await import('/'+summon.file))[summon.name];const node=render(card,{field:true,fullArt:true});document.querySelector(side==='me'?'#meRow .zone-mon':'#oppRow .zone-mon').append(node);window.stageStatus={id:card.id,hidden:document.hidden,connected:node.isConnected};const observer=new MutationObserver(records=>{for(const r of records)for(const el of r.addedNodes)if(el instanceof HTMLCanvasElement&&el.matches('.mage-summon')){window.stageStatus.firstTime=el.dataset.time;window.stageStatus.visualTime=el.dataset.visualTime;observer.disconnect();}});observer.observe(document.body,{childList:true});const result=play(node,'summon');window.stageStatus.hiddenSynchronously=node.style.visibility==='hidden';void result.then(complete=>{window.stageStatus.complete=complete;});},{summon,cardEl,card:{...DB[id],uid:'mage-stage-'+id},side});
  {
   await page.locator('.mage-summon').waitFor({state:'attached',timeout:30000});await page.clock.runFor(16);
   const wrap=await page.locator('.mage-summon').evaluate(n=>({...n.dataset}));assert.ok(Number(wrap.visualTime)>=360);assert.equal(wrap.cardId,id);assert.equal(wrap.variant,'1');assert.equal(await page.locator('.slate-summon').count(),0);await page.screenshot({path:evidence+'/'+id+'-deployed.png'});
   await page.clock.runFor(1750);await page.screenshot({path:evidence+'/'+id+'-landing.png'});await page.clock.runFor(3000);assert.equal(await page.locator('.mage-summon').count(),0);const state=await page.evaluate(()=>window.stageStatus);assert.equal(state.hiddenSynchronously,true);assert.equal(state.firstTime,'0');assert.equal(state.visualTime,'360');assert.equal(state.complete,true);results.push({id,side,wrap,state});
  }
  assert.equal(await page.locator('[data-uid="mage-stage-'+id+'"]').evaluate(n=>n.style.visibility),'');await page.evaluate(id=>document.querySelector('[data-uid="mage-stage-'+id+'"]').remove(),id);console.log('PASS deployed',id);
 }
 assert.deepEqual(errors,[]);await fs.writeFile(evidence+'/staging-browser.json',JSON.stringify({origin,sha:manifest.sha,summon,cardEl,results,errors,boundary:'Deployed production playMonster and cardEl on a real BOT board. Account/API and temporary field cards are fixtures; engine summon conditions are not bypassed in an authenticated match. Normal hand/generated routes were tested locally. No authenticated online match or account mutation.'},null,2));
}catch(error){await page.screenshot({path:evidence+'/staging-failure.png'});await fs.writeFile(evidence+'/staging-failure.json',JSON.stringify({message:error.message,errors,warnings,state:await page.evaluate(()=>window.stageStatus)},null,2));throw error;}finally{await browser.close();}
