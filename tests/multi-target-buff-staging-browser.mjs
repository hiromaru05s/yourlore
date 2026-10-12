import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.LORE_TEST_URL||'https://test.yourlore.xyz',out=process.env.LORE_TEST_OUT||'/tmp/lore-multi-target-buff-staging';
await fs.mkdir(out,{recursive:true});
const files=['index.html','cosmetic-studio.html',...(await fs.readdir('client/dist/assets')).filter(f=>/\.(js|css)$/.test(f)).map(f=>'assets/'+f)],hashes=[];
const hash=b=>createHash('sha256').update(b).digest('hex');
for(let i=0;i<files.length;i+=6)await Promise.all(files.slice(i,i+6).map(async file=>{const response=await fetch(origin+'/'+file);assert.equal(response.status,200,file);const sha256=hash(Buffer.from(await response.arrayBuffer()));assert.equal(sha256,hash(await fs.readFile('client/dist/'+file)),file);hashes.push({file,sha256});}));
await fs.writeFile(out+'/asset-parity.json',JSON.stringify({origin,hashes},null,2));
const browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:out+'/video',size:{width:1280,height:900}}});const page=await context.newPage();page.setDefaultTimeout(90000);const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(origin+'/cosmetic-studio.html?board=1&runtime=1&set=default');await page.waitForFunction(()=>window.atelier&&document.querySelector('[data-scene-ready=true]'));
 await page.evaluate(()=>{
  window.buffWatch=async action=>{const frames=[];let running=true;const tick=()=>{const cards=[...document.querySelectorAll('[data-layer-policy=foreground] [data-monster-kind=atk]')];frames.push({count:cards.length,surfaces:cards.filter(n=>{const c=n.querySelector('.stat-surface');return c&&c.width>1&&c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0);}).length});if(running)requestAnimationFrame(tick);};requestAnimationFrame(tick);await action();running=false;return {max:Math.max(...frames.map(f=>f.count)),visible:Math.max(...frames.map(f=>f.surfaces)),remaining:document.querySelectorAll('[data-layer-policy=foreground] [data-monster-kind=atk]').length};};
  window.buffReset=(owner,count)=>{const c=atelier.controller,g=structuredClone(c.state);g.cur=owner;g.pending=null;g.over=false;for(const [side,p] of g.players.entries()){const m=p.field[0];p.field=Array.from({length:count},(_,i)=>({...m,uid:'stage-'+side+'-'+i,atkMod:0,tempAtk:0,defMod:0,aura:undefined}));}c.show(g);};
  window.buffSnapshot=async g=>{const c=atelier.controller;c.applyResult({state:g,events:[]});await c.queue;};
 });
 for(const [width,height] of [[1280,900],[390,844]]){
  await page.setViewportSize({width,height});
  for(const owner of [0,1])for(const count of [3,7]){
   await page.evaluate(({owner,count})=>buffReset(owner,count),{owner,count});
   if(count===3){
    for(let i=0;i<2;i++)await page.evaluate(async({owner,i})=>{const g=structuredClone(atelier.controller.state);g.players[owner].field[i].tempAtk=1;g.pending={kind:'myMon',reason:'buffTurn',hint:'',hintJa:'',allowCancel:true,data:{count:2-i,val:1,excl:g.players[owner].field.slice(0,i+1).map(m=>m.uid)}};await buffSnapshot(g);},{owner,i});
   }
   await page.evaluate(({owner,count})=>{const g=structuredClone(atelier.controller.state);g.pending=null;g.players[owner].field.forEach(m=>m.tempAtk=count===3?1:3);window.playing=buffWatch(()=>buffSnapshot(g));},{owner,count});
   await page.waitForSelector('[data-layer-policy=foreground] [data-monster-kind=atk]');await page.screenshot({path:out+`/buff-${width}-${owner}-${count}.png`});
   const result=await page.evaluate(()=>window.playing);assert.equal(result.max,count);assert.equal(result.visible,count);assert.equal(result.remaining,0);checks.push({width,height,owner,count,...result});
  }
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/browser-report.json',JSON.stringify({origin,checks,errors,boundary:'Unmodified deployed production bundles on the existing runtime cosmetic board; fixture state snapshots exercise BaseController and GameView. Real TRUMPET reducer and rapid input paths are verified locally. No authenticated online match.'},null,2));console.log('PASS',hashes.length,'asset hashes and',checks.length,'deployed multi-target checks');
}finally{await context.close();await page.video().saveAs(out+'/playback.webm');await browser.close();}
