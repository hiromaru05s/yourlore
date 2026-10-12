import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5198';
const out=process.env.LORE_TEST_OUT||'/tmp/lore-attack-origin';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:out+'/video',size:{width:1280,height:900}}});
const page=await context.newPage();page.setDefaultTimeout(90000);const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(origin+'/cosmetic-studio.html?board=1&runtime=1&set=default');
 await page.waitForFunction(()=>window.atelier&&document.querySelector('[data-scene-ready=true]'));
 await page.evaluate(async()=>{
  const A=await import('/src/ui/anim.ts'),{Effects}=await import('/src/ui/elemental/effects.ts'),{Actor}=await import('/src/ui/monster/actor.ts');
  const render=Effects.prototype.render,paint=Actor.prototype.paint;window.samples=[];
  Effects.prototype.render=function(c,e,t,source,targets,...args){samples.push({kind:e.kind,source:{x:source.x,y:source.y},targets:targets.map(p=>p&&({x:p.x,y:p.y}))});return render.call(this,c,e,t,source,targets,...args)};
  Actor.prototype.paint=function(kind,v,t,source,target,...args){if(kind==='attack')samples.push({kind,source:{x:source.x,y:source.y},targets:[{x:target.x,y:target.y}]});return paint.call(this,kind,v,t,source,target,...args)};
  window.qa={A,reset(side,mode){A.setFxSkip(true);A.setFxSkip(false);document.querySelectorAll('[data-stale-anchor]').forEach(n=>n.remove());for(const n of document.querySelectorAll('.zone-mon .card'))n.style.display='';samples.length=0;
   const source=document.querySelector((side?'#oppRow':'#meRow')+' .zone-mon .card'),target=document.querySelector((side?'#meRow':'#oppRow')+' .zone-mon .card');
   if(mode==='duplicate'){const copy=target.cloneNode(true);copy.dataset.staleAnchor='true';copy.style.display='none';document.body.prepend(copy);}
   if(mode==='hidden')target.style.display='none';
   const rect=target.getBoundingClientRect();return {uid:source.dataset.uid,target:target.dataset.uid,expected:{x:rect.x+rect.width/2,y:rect.y+rect.height/2}};
  },async run(kind,side,ids){if(kind==='attack')await A.attackStrike(ids.uid,ids.target,side?'me':'opp',undefined,false);else{const p=await A.beginElemental({type:'elementalStart',group:'origin-test',id:kind,uid:ids.uid,player:side,targets:[{player:1-side,uid:ids.target,amount:1},{player:1-side,uid:null,amount:1},{player:1-side,uid:ids.target,amount:1}]},0);await Promise.all([p.impact(0),p.impact(1),p.impact(2),p.finished]);}return samples;}};
 });
 for(const width of [1280,390]){
  await page.setViewportSize({width,height:width===390?844:900});await page.waitForTimeout(350);
  for(const side of [0,1])for(const kind of ['attack','FIRE_ARROW']){
   const ids=await page.evaluate(side=>qa.reset(side,'duplicate'),side);
   await page.evaluate(({kind,side,ids})=>{window.playing=qa.run(kind,side,ids)},{kind,side,ids});
   await page.waitForFunction(()=>samples.length>0);await page.waitForTimeout(kind==='attack'?180:1200);await page.screenshot({path:`${out}/${kind}-${width}-${side}.png`});
   const samples=await page.evaluate(()=>playing);assert(samples.length>0);const zero=samples.some(s=>s.targets.some(p=>p&&p.x===0&&p.y===0));
   {assert(!zero,'must not aim at origin');assert(samples.every(s=>s.targets.some(p=>p&&Math.hypot(p.x-ids.expected.x,p.y-ids.expected.y)<1)),'must reach real field target');}
   checks.push({width,side,kind,mode:'duplicate',zero,expected:ids.expected,first:samples[0]});
  }
 }
 {
  for(const kind of ['attack','FIRE_ARROW']){const ids=await page.evaluate(()=>qa.reset(0,'hidden'));const samples=await page.evaluate(({kind,ids})=>qa.run(kind,0,ids),{kind,ids});assert(!samples.some(s=>s.targets.some(p=>p&&p.x===0&&p.y===0)));if(kind==='FIRE_ARROW')assert(samples.length>0,'valid player hit must still play when monster anchor is missing');checks.push({kind,mode:'hidden',frames:samples.length});}
  await page.emulateMedia({reducedMotion:'reduce'});const ids=await page.evaluate(()=>qa.reset(1,'duplicate'));await page.evaluate(ids=>qa.run('FIRE_ARROW',1,ids),ids);checks.push({mode:'reduced'});
  const ids2=await page.evaluate(()=>qa.reset(0,'duplicate'));await page.evaluate(ids=>{window.playing=qa.run('FIRE_METEOR',0,ids)},ids2);await page.waitForFunction(()=>samples.length>0);await page.evaluate(()=>qa.A.setFxSkip(true));await page.evaluate(()=>playing);checks.push({mode:'skip'});
 }
 assert.equal(await page.locator('.element-overlay,.element-surface,[data-layer-policy=foreground]').count(),0);assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/report.json',JSON.stringify({checks,errors,boundary:'Controlled hidden duplicate / missing DOM-anchor reproduction using production renderers on the real cosmetic runtime board; not an authenticated match.'},null,2));console.log('PASS',checks.length,'cases',out);
}finally{await context.close();await page.video().saveAs(out+'/playback.webm');await browser.close();}
