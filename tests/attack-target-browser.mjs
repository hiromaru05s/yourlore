import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5286';
const out=process.env.LORE_TEST_OUTPUT||'.cache/attack-target';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),checks=[],errors=[];
try{
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:960},hasTouch:mobile,isMobile:mobile,...(process.env.LORE_RECORD_VIDEO==='1'&&!mobile?{recordVideo:{dir:out,size:{width:1440,height:960}}}:{})});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/attack-target-preview.html?v=7');await page.waitForSelector('[data-scene-ready=true]');
  await page.evaluate(()=>attackTargetPreview.stopDemo());await page.waitForTimeout(350);
  const node=uid=>page.locator(`.zone-mon [data-uid="${uid}"]`);
  const rect=async uid=>node(uid).boundingBox();
  const middle=r=>({x:r.x+r.width/2,y:r.y+r.height/2});
  const cdp=mobile?await context.newCDPSession(page):null;
  const down=async p=>mobile?cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:1}]}):(await page.mouse.move(p.x,p.y),page.mouse.down());
  const move=async p=>mobile?cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...p,id:1}]}):page.mouse.move(p.x,p.y,{steps:3});
  const cancel=async()=>{if(mobile)await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});else{await page.keyboard.press('Escape');await page.mouse.up();}await page.waitForTimeout(220);};
  const select=async uid=>{await move(middle(await rect(uid)));await page.waitForFunction(uid=>document.querySelector('.is-atk-target')?.getAttribute('data-uid')===uid,uid);await page.waitForSelector('.attack-target-outline svg');await page.waitForTimeout(230);};
  const clean=async()=>{
   assert.equal(await page.locator('.attack-target-outline,.is-atk-target,.attack-aim').count(),0);
   assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>/^attack-(target|source)-/.test(a.id)).length),0);
  };
  const baseline=await rect('target-center'),sourceBaseline=await rect('attacker');
  const print=await node('target-center').evaluate(e=>({art:e.querySelector('.card-art img').currentSrc,frame:e.querySelector('.card-frame').style.backgroundImage,numbers:[...e.querySelectorAll('.seal-value')].map(n=>n.textContent)}));
  await down(middle(await rect('attacker')));await select('target-center');
  const raised=await rect('target-center'),sourceRaised=await rect('attacker');
  assert(sourceRaised.width/sourceBaseline.width>1.025&&sourceRaised.width/sourceBaseline.width<1.07);
  assert(middle(sourceRaised).y<middle(sourceBaseline).y-sourceBaseline.height*.045);
  await page.waitForSelector('[data-uid="attacker"] .attack-source-light svg');
  const sourceLight=await node('attacker').evaluate(e=>{const light=e.querySelector('.attack-source-light');return {rim:getComputedStyle(light.querySelector('.attack-target-rim')).stroke,outline:light.querySelector('.attack-target-rim').getAttribute('d'),mask:light.querySelector('mask path').getAttribute('d'),artTint:getComputedStyle(e.querySelector('.card-art'),'::before').content};});
  assert.equal(sourceLight.rim,'rgb(54, 184, 255)');assert.equal(sourceLight.outline,sourceLight.mask);assert(sourceLight.outline.length>100);assert.equal(sourceLight.artTint,'none');


  assert(raised.width/baseline.width>1.04&&raised.width/baseline.width<1.09);
  assert(middle(raised).y<middle(baseline).y-baseline.height*.025);
  const after=await node('target-center').evaluate(e=>({art:e.querySelector('.card-art img').currentSrc,frame:e.querySelector('.card-frame').style.backgroundImage,numbers:[...e.querySelectorAll('.seal-value')].map(n=>n.textContent)}));assert.deepEqual(after,print);
  assert.equal(await node('target-center').evaluate(e=>getComputedStyle(e.querySelector('.card-art'),'::before').content),'none');
  await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-selected.png`});
  // Hold the pointer at the original bottom edge after the print lifts away.
  const bottom={x:baseline.x+baseline.width/2,y:baseline.y+baseline.height-1};
  for(let i=0;i<3;i++){await move(bottom);await page.waitForTimeout(200);assert.equal(await page.locator('.card.is-atk-target').getAttribute('data-uid'),'target-center');}
  checks.push({mobile,baseline,raised,originalBottomEdgeStable:true,printUnchanged:true,sourceBaseline,sourceRaised,blueSourceContour:true});
  await cancel();await clean();const restored=await rect('target-center');assert(Math.abs(restored.width-baseline.width)<.7);assert(Math.abs(restored.y-baseline.y)<.7);
  // Quick retargeting while both lift and return are still in flight.
  await down(middle(await rect('attacker')));
  for(const uid of ['target-left','target-right','target-left','target-center']){await move(middle(await rect(uid)));await page.waitForTimeout(40);}
  await page.waitForFunction(()=>document.querySelector('.card.is-atk-target')?.getAttribute('data-uid')==='target-center');await page.waitForTimeout(250);
  assert.equal(await page.locator('.attack-target-outline').count(),2);await cancel();await clean();
  checks.push({mobile,rapidRetarget:true,cancelRestoresPose:true});
  // Persistent aura actors own their own transform; selection must compose with it.
  await page.evaluate(()=>{const c=attackTargetPreview.controller;c.state.players[1].field[1]={...c.state.players[1].field[2],uid:'target-center',exhausted:true};c.state.frames=['default','frame:obsidian-ember'];c.view.render(c.state);});await page.waitForTimeout(500);
  await page.waitForSelector('[data-uid="target-center"].field-resting-face');
  const blocked=await rect('target-center');await down(middle(await rect('attacker')));await select('target-center');const blockedRaised=await rect('target-center');
  assert(blockedRaised.width/blocked.width>1.04&&blockedRaised.width/blocked.width<1.09);assert(middle(blockedRaised).y<middle(blocked).y-blocked.height*.025);
  assert.equal(await page.locator('.attack-target-light').evaluate(e=>getComputedStyle(e).filter),'none');
  await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-aura.png`});await cancel();await clean();
  checks.push({mobile,persistentNativePose:true,equippedFrame:true});
  await page.emulateMedia({reducedMotion:'reduce'});
  const reducedSource=await rect('attacker');
  const reducedBase=await rect('target-center');await down(middle(await rect('attacker')));await select('target-center');const reducedRaised=await rect('target-center');
  assert(Math.abs(reducedBase.width-reducedRaised.width)<.7);assert(Math.abs(reducedBase.y-reducedRaised.y)<.7);
  assert(Math.abs((await rect('attacker')).width-reducedSource.width)<.7);
  assert.equal(await page.locator('.attack-target-light .attack-target-travel').evaluate(e=>getComputedStyle(e).display),'none');
  await cancel();await clean();checks.push({mobile,reducedStatic:true});
  await context.close();
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/checks.json',JSON.stringify({checks,errors,source:'fe168a872',origin,boundary:'Local real-board mouse/touch fixtures; no authenticated PvP.'},null,2));console.log('PASS attack target contour, float, original hit area, retargeting, cancellation, persistent actor, materials and reduced motion');
}finally{await browser.close();}
