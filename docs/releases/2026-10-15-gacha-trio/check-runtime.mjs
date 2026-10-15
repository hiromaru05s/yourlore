import {chromium} from '/tmp/lore-collapse-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=new URL('./qa/',import.meta.url).pathname;await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const errors=[],failed=[],checks=[];
try{
 const context=await browser.newContext({viewport:{width:1280,height:950},recordVideo:{dir:out+'video',size:{width:1280,height:950}}});
 const page=await context.newPage();page.setDefaultTimeout(30000);
 page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.log('CONSOLE ERROR',m.text());}});page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
 await page.goto('http://127.0.0.1:5612/');await page.waitForFunction(()=>window.opponentReview?.ready,null,{timeout:120000});const f=page.frames()[1];
 const preset=async(id,c)=>{await page.evaluate(id=>opponentReview.setCase(id),id);await f.waitForFunction(c=>JSON.stringify(trioBoard.counts)===JSON.stringify(c),c);};
 const clean=async()=>{assert.equal(await f.locator('.native-draw-layer').count(),0);assert.equal(await f.locator('#oppHand .card--back').evaluateAll(ns=>ns.filter(n=>n.style.visibility==='hidden').length),0);};
 const painted=async n=>f.waitForFunction(n=>document.querySelectorAll('#oppHand .gacha-trio-surface').length===n,n);
 console.log('runtime ready');
 for(let v=0;v<3;v++){
  await page.evaluate(v=>opponentReview.setVariant(v),v);await preset('normal',{deck:8,grave:4,hand:5});await painted(5);
  assert.deepEqual((await f.evaluate(()=>trioBoard.cosmetics().piles)).sort(),['pile-oppDeck','pile-oppDisc']);
  assert.equal(await f.locator('#oppHand .card--back').first().evaluate(n=>getComputedStyle(n).clipPath),'none');
  await page.screenshot({path:out+`set-${v+1}.png`,fullPage:true});
  for(const [id,c]of [['grave-empty',{deck:8,grave:0,hand:5}],['deck-empty',{deck:0,grave:4,hand:5}],['both-empty',{deck:0,grave:0,hand:5}],['hand-one',{deck:8,grave:4,hand:1}],['hand-ten',{deck:8,grave:4,hand:10}]]){
   await preset(id,c);await painted(c.hand);assert.equal(await f.locator('#pile-oppDeck').getAttribute('data-count'),String(c.deck));assert.equal(await f.locator('#pile-oppDisc').getAttribute('data-count'),String(c.grave));
  }
  await page.evaluate(()=>opponentReview.setFocus('hand'));await page.locator('.board-wrap').screenshot({path:out+`hand-ten-${v+1}.png`});
  await preset('last',{deck:1,grave:4,hand:5});await page.evaluate(()=>opponentReview.draw(1));await f.waitForFunction(()=>!trioBoard.busy&&trioBoard.counts.deck===0&&trioBoard.counts.hand===6);await clean();
  await preset('normal',{deck:8,grave:4,hand:5});await page.evaluate(()=>opponentReview.draw(3));await f.waitForFunction(()=>!trioBoard.busy&&trioBoard.counts.deck===5&&trioBoard.counts.hand===8);await clean();
  console.log('set',v+1,'states and native draws PASS');
 }
 checks.push('three ordinary equipped sets / empty zones / one and ten hand cards / final-card and three-card native draws');
 await preset('normal',{deck:8,grave:4,hand:5});await page.selectOption('#speed','0.25');await page.click('#draw-one');await f.waitForFunction(()=>{const n=document.querySelector('.native-draw-card');return n&&Number(n.dataset.progress)>.2&&Number(n.dataset.progress)<.8;});
 assert.equal(await f.locator('.draw-stock-back .gacha-trio-surface').count(),1);await page.locator('.board-wrap').screenshot({path:out+'draw-mid.png'});await f.waitForFunction(()=>!trioBoard.busy);await clean();
 await page.click('#draw-one');await f.waitForSelector('.native-draw-card');await preset('both-empty',{deck:0,grave:0,hand:5});await clean();checks.push('animated native draw back / cancellation without hidden cards or residue');
 await preset('normal',{deck:8,grave:4,hand:5});await painted(5);
 const sample=()=>f.locator('#oppHand canvas').first().evaluate(c=>{const x=c.getContext('2d');return {rim:Array.from(x.getImageData(7,280,3,40).data),inside:Array.from(x.getImageData(80,140,180,280).data)};});
 const a=await sample();await page.waitForTimeout(600);const b=await sample();assert.deepEqual(a.rim,b.rim);assert(a.inside.some((x,i)=>Math.abs(x-b.inside[i])>8));
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(150);const c=await sample();await page.waitForTimeout(200);assert.deepEqual(c,await sample());checks.push('fixed frame pixels / animated illustration / reduced-motion still');
 await page.evaluate(()=>opponentReview.draw(1));await f.waitForFunction(()=>!trioBoard.busy&&trioBoard.counts.hand===6);await clean();
 await page.emulateMedia({reducedMotion:'no-preference'});
 await f.evaluate(()=>trioBoard.equip(['sleeve:gacha-rose','sleeve:gacha-ivory'],['furniture:gacha-tidal','furniture:gacha-rose']));
 await f.waitForFunction(()=>document.querySelector('#pile-myDeck').dataset.gachaFurniture==='tidal'&&document.querySelector('#pile-oppDeck').dataset.gachaFurniture==='rose');
 assert((await f.locator('#pile-myDeck').getAttribute('data-sleeve')).includes('rose.webp'));assert((await f.locator('#pile-oppDeck').getAttribute('data-sleeve')).includes('ivory.webp'));
 await page.evaluate(()=>opponentReview.setFocus('all'));await page.locator('.board-wrap').screenshot({path:out+'mixed-both-sides.png'});checks.push('different sleeve and furniture for both players');
 for(const width of [844,390,320]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:out+`mobile-${width}.png`,fullPage:true});}
 checks.push('responsive controls at 844 / 390 / 320');
 await f.evaluate(()=>trioBoard.equip(['default','default'],['default','default']));await f.waitForFunction(()=>document.querySelectorAll('.gacha-trio-surface').length===0);await f.evaluate(()=>trioBoard.dispose());assert.equal(await f.locator('.gacha-trio-surface').count(),0);checks.push('default restore and disposal remove dynamic surfaces');
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 await fs.writeFile(out+'report.json',JSON.stringify({checks,errors,failed,boundary:'ordinary equipped GameView fixture; not authenticated multiplayer or staging'},null,2));
 const video=page.video();await context.close();await video.saveAs(out+'continuous.webm');console.log('PASS',checks);
}finally{await browser.close();}
