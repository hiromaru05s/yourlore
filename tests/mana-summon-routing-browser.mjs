import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out='docs/ui-rework/2026-11-19-mana-summon-release/qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1100,height:680}}),checks=[],errors=[];
page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{
 localStorage.setItem('lore_sfx','.7');window.soundStarts=[];
 const start=AudioBufferSourceNode.prototype.start;
 AudioBufferSourceNode.prototype.start=function(...a){soundStarts.push({state:this.context.state,rate:this.playbackRate.value,transfer:Number(document.querySelector('.mana-frame-transfer')?.dataset.time),contact:Number(document.querySelector('.slate-summon')?.dataset.time)});return start.apply(this,a);};
});
try{
 await page.goto('http://127.0.0.1:5300/mana-summon.html');await page.waitForFunction(()=>window.currentVfx?.info().ready);await page.mouse.click(6,6);
 await page.evaluate(async()=>{const {warmTransferSounds}=await import('/src/ui/summon/manaTransferSound.ts');await warmTransferSounds();});
 const ids=['M4','CASTLE','POISON_MASTER','RUST_SLUG','RUST_SHROOM','GOLEM1','GOLEM2','GOLEM3','M10','NGA3','NWL3','MANA_GIANT'];
 for(const [index,id] of ids.entries())for(const path of ['hand','generated']){
  const side=path==='hand'?index%2:1-index%2,width=index%2?390:1100;await page.setViewportSize({width,height:680});await page.waitForTimeout(80);
  await page.evaluate(({id,side,path})=>{
   window.soundStarts=[];window.routeContact=null;window.routePrint=null;window.routeCenter=null;
   const observer=new MutationObserver(()=>{
    const flight=document.querySelector('[data-borrowed-card-print="true"]');
    if(flight&&!routePrint)window.routePrint=[...flight.children];
    if(flight&&!routeCenter&&document.querySelector('.mana-frame-transfer'))window.routeCenter=flight.getBoundingClientRect().toJSON();
    const native=document.querySelector('.slate-summon'),ground=document.querySelector('.mana-ground-cracks'),light=document.querySelector('.mana-landing-light');
    if(ground&&native&&light){window.routeContact={native:Number(native.dataset.time),crack:Number(ground.dataset.contactMs),light:Number(light.dataset.contactMs),mana:light.dataset.manaRemaining};observer.disconnect();}
   });observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-contact-ms']});
   void currentVfx.run({kind:'summon',id,side,path});
  },{id,side,path});
  await page.waitForSelector('.mana-frame-transfer');
  await page.waitForFunction(()=>Number(document.querySelector('.mana-frame-transfer')?.dataset.time)>=100);
  const center=await page.evaluate(()=>routeCenter);assert(Math.abs(center.x+center.width/2-width/2)<1,JSON.stringify({id,path,side,width,center}));assert(Math.abs(center.y+center.height/2-340)<1,JSON.stringify({id,path,side,width,center}));
  assert.equal(await page.locator('.castle-summon,.poison-summon,.golem-summon').count(),0);
  await page.waitForFunction(()=>!!window.routeContact);await page.waitForFunction(()=>!currentVfx.info().playing);
  const result=await page.evaluate(({side})=>{const face=document.querySelector(`.zone-mon .card[data-uid="field-${side}-0"]`);return{contact:routeContact,printRetained:routePrint.every(n=>n.parentElement===face),opacity:face.style.opacity,clip:face.style.clipPath,card:face.dataset.cardId,text:face.textContent,audio:soundStarts,remaining:document.querySelectorAll('.mana-frame-transfer,.mana-landing-light,.mana-ground-cracks,[data-borrowed-card-print="true"],.slate-summon').length};},{side});
  assert.equal(result.card,id);assert(result.printRetained);assert.equal(result.remaining,0);assert.equal(result.opacity,'');assert.equal(result.clip,'');assert.equal(result.contact.mana,'0');assert.equal(result.contact.native,result.contact.crack);assert.equal(result.contact.native,result.contact.light);
  assert.equal(result.audio.length,5,JSON.stringify({id,path,audio:result.audio}));assert(result.audio.every(s=>s.state==='running'));assert.equal(result.audio[3].contact,result.audio[4].contact);
  if(id==='CASTLE')assert(result.text.includes('3'),'Castle keeps its count');
  checks.push({id,path,side,width,...result,text:undefined});
  if(path==='generated'&&['CASTLE','RUST_SLUG','GOLEM3'].includes(id))await page.screenshot({path:`${out}/${id}-settled.png`});
 }
 // A retained special summon must not receive the ordinary mana layer.
 await page.evaluate(()=>{void currentVfx.run({kind:'summon',id:'MIMIC',side:0,path:'generated'});});
 let seen=false;while(await page.evaluate(()=>currentVfx.info().playing)){seen||=await page.locator('.mana-frame-transfer,.mana-landing-light').count()>0;await page.waitForTimeout(40);}assert.equal(seen,false);
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/routing-report.json',JSON.stringify({checks,preservedSpecial:'MIMIC',errors,scope:'Real GameView, production hand/generated public entry points without presentation injection; no authenticated PvP'},null,2));console.log(`PASS ${checks.length} production summon routes, both sides, desktop/mobile, original print, contact sync, five sounds, cleanup, retained Mimic`);
}finally{await browser.close();}
