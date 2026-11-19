import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out='docs/ui-rework/2026-11-19-mana-summon-release/qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1100,height:680}}),checks=[],errors=[];
page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));

try{
 await page.goto('http://127.0.0.1:5300/mana-summon.html?mana-transfer');await page.waitForFunction(()=>window.currentVfx?.info().ready);
 for(const width of [1100,390])for(const side of [0,1]){
  await page.setViewportSize({width,height:680});await page.waitForTimeout(250);
  await page.evaluate(side=>{currentVfx.reviewTime(140);void currentVfx.run({kind:'summon',side,spell:'S4'});},side);
  await page.waitForSelector('.mana-frame-transfer');
  const reveal=await page.evaluate(()=>{const n=document.querySelector('[data-borrowed-card-print="true"]');window.borrowed={children:[...n.children],images:[...n.querySelectorAll('img')].map(i=>i.currentSrc)};const r=n.getBoundingClientRect();return {opacity:Number(n.style.opacity),x:r.x+r.width/2,y:r.y+r.height/2};});
  assert.equal(reveal.opacity,0);assert(Math.abs(reveal.x-width/2)<1);assert(Math.abs(reveal.y-340)<1);
  const interior=await page.evaluate(()=>{const c=document.querySelector('.mana-frame-transfer'),dpr=c.width/innerWidth,r=document.querySelector('[data-borrowed-card-print="true"]').getBoundingClientRect();return[.35,.5,.65].map(q=>[...c.getContext('2d').getImageData(Math.round((r.x+r.width*q)*dpr),Math.round((r.y+r.height*.5)*dpr),1,1).data]);});
  assert(interior.every(([red,green,blue,a])=>a>110&&a<210&&red>100&&green>170&&blue>red&&green>red),JSON.stringify(interior));
  for(const time of [140,340,470,580,710,810]){
   await page.evaluate(t=>currentVfx.reviewTime(t),time);await page.waitForFunction(t=>Number(document.querySelector('.mana-frame-transfer')?.dataset.time)===t,time);
   assert(await page.evaluate(()=>borrowed.children.every(n=>n.parentElement?.dataset.borrowedCardPrint==='true')));
   if(time===340||time===580){const geometry=await page.locator('.mana-frame-transfer').evaluate((n,time)=>({axis:n.dataset.travelAxis,pose:JSON.parse(n.dataset[time===340?'departureGeometry':'arrivalGeometry'])}),time);assert.equal(geometry.axis,'card-negative-z');assert.deepEqual(geometry.pose.axis,[0,0,-1]);assert(geometry.pose.centerZ<geometry.pose.gateZ&&geometry.pose.edgeZ>geometry.pose.gateZ);if(time===340){assert(Math.abs(geometry.pose.center.x-geometry.pose.reference.x)<.1);assert(Math.abs(geometry.pose.center.y-geometry.pose.reference.y)<.1);assert(Math.hypot(geometry.pose.reference.x-reveal.x,geometry.pose.reference.y-reveal.y)<1);assert(geometry.pose.gateZ<0);}else assert(geometry.pose.gateZ>0);}
   if(time===340)assert.equal(await page.locator('.mana-frame-transfer').evaluate(n=>n.dataset.portalModel),'card-normal-portal');
   if(time===580)assert.equal(await page.locator('[data-borrowed-card-print="true"]').evaluate(n=>Number(n.style.opacity)),0);
   if(time===810)assert.equal(await page.locator('[data-borrowed-card-print="true"]').evaluate(n=>Number(n.style.opacity)),0);
   if(time===140)assert(await page.locator('.mana-frame-transfer').evaluate(n=>Number(n.dataset.outerDustCount)>0&&Number(n.dataset.sparkCount)>0));
   if(time===470)assert(await page.locator('.mana-frame-transfer').evaluate(n=>n.dataset.phase==='hidden-jump'&&n.dataset.sourceVisible==='false'&&n.dataset.destinationVisible==='false'));
   if(time>=340)assert.equal(await page.locator('.mana-frame-transfer').evaluate(n=>Number(n.dataset.outerDustCount)),0);
   if(time===580)assert.equal(await page.locator('.mana-frame-transfer').evaluate(n=>Number(n.dataset.orbCount)),0);
   if(time===710){const trail=await page.locator('.mana-frame-transfer').evaluate(n=>JSON.parse(n.dataset.trailSamples));assert(trail.length>=4);assert(trail.every(s=>s.points.length===8&&s.age>=0&&s.age<190&&s.alpha>0&&s.alpha<=.3));assert(Math.hypot(trail[0].points[0].x-trail.at(-1).points[0].x,trail[0].points[0].y-trail.at(-1).points[0].y)>1);}
   if(time===810)assert(await page.locator('.mana-frame-transfer').evaluate(n=>Number(n.dataset.trailCount)>0));
   if(time===140||time===580||time===710)await page.screenshot({path:`${out}/${width}-${side}-${time}.png`});
  }
  const before=await page.locator('[data-borrowed-card-print="true"]').boundingBox();
  await page.evaluate(()=>currentVfx.reviewTime(820));await page.waitForSelector('.slate-summon');
  const field=page.locator(`.zone-mon .card[data-uid="field-${side}-0"]`),after=await field.boundingBox();
  assert(Math.abs(before.x-after.x)<1.2&&Math.abs(before.y-after.y)<1.2,JSON.stringify({before,after}));
  assert(await field.evaluate(n=>borrowed.children.every(c=>c.parentElement===n)));
  assert.equal(await field.evaluate(n=>Number(n.style.opacity)),1);
  await page.evaluate(()=>{window.contactSample=null;const observer=new MutationObserver(()=>{const light=document.querySelector('.mana-landing-light'),ground=document.querySelector('.mana-ground-cracks'),host=document.querySelector('.slate-summon');if(light?.dataset.contactMs&&ground&&host){window.contactSample={nativeMs:Number(host.dataset.time),lightMs:Number(light.dataset.landingMs),contactMs:Number(light.dataset.contactMs),crackMs:Number(ground.dataset.contactMs),mana:Number(light.dataset.manaRemaining),progress:Number(light.dataset.revealProgress),burst:Number(light.dataset.impactBurstCount),burstLeadMs:Number(light.dataset.burstLeadMs),afterimages:Number(light.dataset.trailCount),clip:document.querySelector('.zone-mon .card[data-uid="field-'+currentVfx.info().side+'-0"]').style.clipPath};observer.disconnect();}});observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-contact-ms']});});
  await page.evaluate(()=>{window.crackSamples=[];window.trailSettled=false;const thresholds=[65,470,800];const tick=()=>{const light=document.querySelector('.mana-landing-light');if(light&&Number(light.dataset.landingMs)>=1060&&Number(light.dataset.trailCount)===0)window.trailSettled=true;const c=document.querySelector('.mana-ground-cracks');if(c&&Number(c.dataset.age)>=thresholds[crackSamples.length]){const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let sum=0;for(let i=3;i<d.length;i+=4)sum+=d[i];crackSamples.push({age:Number(c.dataset.age),sum});}if(crackSamples.length<3)requestAnimationFrame(tick);};requestAnimationFrame(tick);});
  await page.waitForFunction(()=>Number(document.querySelector('.mana-landing-light')?.dataset.landingMs)>=490);
  const duringLanding=await field.evaluate(n=>({opacity:Number(n.style.opacity),maskedFromCenter:n.style.clipPath.startsWith('polygon('),progress:Number(document.querySelector('.mana-landing-light').dataset.revealProgress),sparks:Number(document.querySelector('.mana-landing-light').dataset.sparkCount),afterimages:Number(document.querySelector('.mana-landing-light').dataset.trailCount),time:Number(document.querySelector('.mana-landing-light').dataset.landingMs)}));
  assert(duringLanding.opacity===1&&duringLanding.progress>.2&&duringLanding.progress<.8&&duringLanding.sparks>=20&&duringLanding.maskedFromCenter&&duringLanding.afterimages>=3,JSON.stringify(duringLanding));
  if(width===1100)await page.screenshot({path:`${out}/${width}-${side}-materialize.png`});
  await page.waitForFunction(()=>window.crackSamples.length===3);const samples=await page.evaluate(()=>crackSamples);
  const contact=await page.evaluate(()=>contactSample);assert(contact&&contact.nativeMs===contact.contactMs&&contact.lightMs===contact.contactMs&&contact.crackMs===contact.contactMs&&contact.mana===0&&contact.progress===1&&contact.burst===72&&contact.burstLeadMs===45&&contact.clip==='none'&&contact.afterimages>0,JSON.stringify(contact));
  assert(await page.evaluate(()=>trailSettled));
  assert(samples[0].sum>samples[1].sum&&samples[1].sum>samples[2].sum&&samples[2].sum>0,JSON.stringify({width,side,samples}));
  await page.waitForFunction(()=>!currentVfx.info().playing);
  assert.equal(await page.locator('.mana-frame-transfer,.mana-landing-light,.mana-ground-cracks,[data-borrowed-card-print="true"],.slate-summon').count(),0);
  assert(await field.evaluate(n=>borrowed.children.every(c=>c.parentElement===n)));
  assert.deepEqual(await field.locator('img').evaluateAll(a=>a.map(i=>i.currentSrc)),await page.evaluate(()=>borrowed.images));
  assert.equal(await field.evaluate(n=>n.style.opacity),'');assert.equal(await field.evaluate(n=>n.style.clipPath),'');
  const trace=await page.evaluate(()=>currentVfx.info().trace),impact=trace.find(e=>e.phase==='接地・ヒビがゆっくり消える'),gone=trace.find(e=>e.phase==='ヒビ消失・定着');
  assert(gone.at-impact.at>=980&&gone.at-impact.at<1100);checks.push({width,side,nativePrint:true,localTeleport:true,cardNormalPortal:true,translucentMana:true,earlySparks:true,noOrb:true,contact,duringLanding,filledManaPixels:interior,landingDifference:{x:after.x-before.x,y:after.y-before.y},crackDuration:gone.at-impact.at,samples});
 }
 await page.setViewportSize({width:1100,height:680});await page.waitForTimeout(200);
 await page.evaluate(()=>{currentVfx.reviewTime(340);void currentVfx.run({kind:'summon',side:0,spell:'S4'});});await page.waitForSelector('.mana-frame-transfer');await page.evaluate(()=>currentVfx.cancel());
 assert.equal(await page.locator('.mana-frame-transfer,.mana-landing-light,.mana-ground-cracks,[data-borrowed-card-print="true"]').count(),0);checks.push({cancelDuringTransfer:true});
 await page.evaluate(()=>{currentVfx.reviewTime(340);void currentVfx.run({kind:'summon',side:0,spell:'S4'});});await page.waitForSelector('.mana-frame-transfer');await page.setViewportSize({width:900,height:680});await page.waitForFunction(()=>!currentVfx.info().playing);
 assert.equal(await page.locator('.mana-frame-transfer,.mana-landing-light,.mana-ground-cracks,[data-borrowed-card-print="true"]').count(),0);checks.push({resizeDuringTransfer:true});
 await page.evaluate(()=>{currentVfx.reviewTime(820);void currentVfx.run({kind:'summon',side:0,spell:'S4'});});await page.waitForSelector('.mana-landing-light');await page.evaluate(()=>currentVfx.cancel());
 assert.equal(await page.locator('.mana-frame-transfer,.mana-landing-light,.mana-ground-cracks,[data-borrowed-card-print="true"]').count(),0);assert.equal(await page.locator('.zone-mon .card[data-uid="field-0-0"]').evaluate(n=>n.style.opacity),'');checks.push({cancelDuringLanding:true});
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(async()=>{currentVfx.reviewTime();await currentVfx.run({kind:'summon',side:0,spell:'S4'});});assert.equal(await page.locator('.mana-frame-transfer,.mana-landing-light,.mana-ground-cracks').count(),0);checks.push({reducedMotion:true});
 await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:1100,height:680});await page.waitForTimeout(250);
 await page.evaluate(()=>{window.samples=[];let previous=0;window.collect=true;const sample=t=>{if(previous)samples.push(t-previous);previous=t;if(collect)window.sampleFrame=requestAnimationFrame(sample);};window.sampleFrame=requestAnimationFrame(sample);currentVfx.reviewTime();void currentVfx.run({kind:'summon',side:0,spell:'S4'});});await page.waitForFunction(()=>!currentVfx.info().playing);
 checks.push({livePlayback:await page.evaluate(()=>{collect=false;cancelAnimationFrame(sampleFrame);const a=samples.slice(2).sort((a,b)=>a-b);return{frames:a.length,median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],trace:currentVfx.info().trace};})});
 await page.goto('http://127.0.0.1:5300/mana-summon.html?baseline');await page.waitForFunction(()=>window.currentVfx?.info().ready);await page.evaluate(()=>currentVfx.run({kind:'summon',side:0,spell:'S4'}));assert.equal((await page.evaluate(()=>currentVfx.info())).transferStudy,false);assert.equal(await page.locator('.mana-frame-transfer,.mana-landing-light,.mana-ground-cracks').count(),0);checks.push({originalPreviewUnaffected:true});
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/browser-report.json',JSON.stringify({errors,checks,scope:'Local real-board fixture calling existing ghostSummon/focusCard/slate runtime; no live PvP or deployment'},null,2));console.log(JSON.stringify({errors,checks},null,2));
}finally{await browser.close();}
