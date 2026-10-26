import {chromium} from '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const out=new URL('./qa/',import.meta.url).pathname;await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const checks=[],errors=[];
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:out,size:{width:1440,height:1000}}});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5610/quest-play-lab.html');await page.waitForFunction(()=>!!window.questPlay);
 await page.evaluate(async()=>{const {waitForDuel}=await import('/src/ui/duelReadiness.ts');await waitForDuel(document.querySelector('#app'));await document.fonts.ready;});
 for(const side of [0,1])for(const id of ['BREWING','BLOOD_RITE','ANCIENT_CIV','GUILD_CO']){
  await page.evaluate(({side,id})=>questPlay.reset(side,id),{side,id});
  await page.waitForTimeout(150);
  await page.evaluate(()=>{
   window.castFrames=[];window.castBad=[];window.printedBadges=[];
   window.nativeDraw=CanvasRenderingContext2D.prototype.drawImage;
   CanvasRenderingContext2D.prototype.drawImage=function(source,...args){if(source instanceof HTMLImageElement&&source.src.startsWith('data:image/svg+xml')){const xml=decodeURIComponent(source.src.split(',').slice(1).join(','));printedBadges.push({xml,args});}return nativeDraw.call(this,source,...args);};
   const capture=()=>{const tiles=[...document.querySelectorAll('.fx-field-ghost .buff-icon,.zone-st .buff-icon')].filter(n=>n.dataset.cardId);for(const tile of tiles){const item={id:tile.dataset.cardId,time:tile.querySelector('.enchant-time')?.dataset.timeRemaining??null,infinity:!!tile.querySelector('.buff-infinity'),old:!!tile.querySelector('.buff-duration'),counter:tile.querySelector('.card-counter')?.dataset.counterValue??null};castFrames.push(item);if(item.old||(item.id!=='GUILD_CO'&&item.infinity))castBad.push(item);}};
   window.castObserver=new MutationObserver(capture);castObserver.observe(document.body,{subtree:true,childList:true});
   window.castTick=setInterval(capture,8);questPlay.play();
  });
  const row=side?'opp':'me';
  await page.waitForFunction(({row,id})=>!!document.querySelector(`#${row}Row .zone-st [data-card-id="${id}"]`),{row,id},{timeout:30000});
  await page.waitForTimeout(200);
  const result=await page.evaluate(()=>{clearInterval(castTick);castObserver.disconnect();CanvasRenderingContext2D.prototype.drawImage=nativeDraw;return {frames:castFrames,bad:castBad,printed:printedBadges,transient:document.querySelectorAll('.fx-field-ghost,.persistent-flight-canvas,.persistent-flight-trail').length};});
  assert.deepEqual(result.bad,[],id+' transient legacy/infinity flashes');assert(result.frames.length>0);assert.equal(result.transient,0);
  const expected={BREWING:'6',BLOOD_RITE:'10',ANCIENT_CIV:'9',GUILD_CO:null}[id];
  assert(result.frames.every(f=>f.time===expected&&f.infinity===(id==='GUILD_CO')),id+' all observed faces use the right timer');
  if(id!=='GUILD_CO')assert(result.printed.some(p=>p.xml.includes('enchant-time-level')&&p.xml.includes('>'+expected+'</text>')),id+' flight texture includes same circular timer');
  if(id==='BREWING'||id==='GUILD_CO'){assert(result.frames.every(f=>f.counter==='0'));assert(result.printed.some(p=>p.xml.includes('counter-slot-reel')));}
  await page.screenshot({path:out+`${side?'opponent':'self'}-${id}.png`});
  checks.push({side,id,frames:result.frames.length,printedBadges:result.printed.length,remaining:expected,legacyFlashes:0,infinity:id==='GUILD_CO'});
 }
 assert.deepEqual(errors,[]);const video=page.video();await context.close();await video.saveAs(out+'cast-sequence.webm');await fs.unlink(await video.path());
 await fs.writeFile(out+'browser.json',JSON.stringify({checks,errors,scope:'Real reducer -> BaseController -> GameView -> persistent flight rasterizer in a local fixture; continuous MutationObserver plus 8ms sampling. No authenticated online match.'},null,2));console.log('PASS',JSON.stringify(checks));
}finally{await browser.close();}
