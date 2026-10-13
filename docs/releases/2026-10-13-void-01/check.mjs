import {chromium} from '/tmp/lore-aura-qa/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const out=new URL('./qa/',import.meta.url).pathname;
const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({viewport:{width:1360,height:900}});
page.setDefaultTimeout(90000);const errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='warning'&&e.text().includes('void-summon'))console.log(e.text());});
const check=(name,passed,detail)=>{checks.push({name,passed:!!passed,detail});if(!passed)throw Error(name);};
const open=async(p=page)=>{await p.goto('http://127.0.0.1:55217/void-runtime.html',{waitUntil:'domcontentloaded',timeout:120000});await p.waitForFunction(()=>window.voidQA?.ready);};
// Record short-lived overlays in the page rather than polling after a busy-host
// round trip, which can miss the entire 1.72 second animation.
async function run(id,side,path,mode='normal'){
 return page.evaluate(async({id,side,path,mode})=>{
  const q=window.voidQA,report={peak:0,visible:false,duplicate:false,raw:false,completed:undefined,clean:false,impacts:0};
  const before=q.impacts;let acted=false;
  const ac=new AbortController();
  const observer=new MutationObserver(()=>{
   const hosts=[...document.querySelectorAll('.void-summon')];report.peak=Math.max(report.peak,hosts.length);
   if(hosts.length){
    report.duplicate||=!!document.querySelector('.slate-summon,.assassin-summon,.vampire-summon');
    report.raw||=[...document.querySelectorAll('.fx-field-ghost,.fx-card-flight')].some(n=>getComputedStyle(n).visibility!=='hidden'&&n.getBoundingClientRect().left>=0);
    const host=hosts[0];if(!report.visible&&Number(host.dataset.time)>200){const c=host.querySelector('canvas'),pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;report.visible=pixels.some((n,i)=>i%4===3&&n>50);}
    if(!acted&&mode!=='normal'&&mode!=='multi'){
     acted=true;
     if(mode==='skip')q.skip(true);else if(mode==='resize')window.dispatchEvent(new Event('resize'));else if(mode==='detach')document.querySelector('[data-uid="target-0"]').remove();else if(mode==='abort')ac.abort();else if(mode==='replacement'){void q.play(document.querySelector('[data-uid="target-0"]'));q.cancel();}else q.cancel();
    }
   }
  });observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-time']});
  try{
   if(mode==='multi'||mode==='abort'){
    q.setup(id,side,mode==='multi');await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
    const nodes=mode==='multi'?[...document.querySelectorAll('#meRow .zone-mon .card')]:[document.querySelector('[data-uid="target-0"]')];
    report.completed=await Promise.all(nodes.map(n=>q.play(n,ac.signal)));
   }else report.completed=await q.run(id,side,path);
   // HTMLElement return from generated summons is not serializable or needed.
   if(path==='generated')report.completed=true;
   report.impacts=q.impacts-before;
   report.clean=!document.querySelector('.void-summon,[data-void-capture]')&&[...document.querySelectorAll('.zone-mon .card')].every(n=>n.style.visibility!=='hidden');
   return report;
  }finally{observer.disconnect();q.skip(false);}
 },{id,side,path,mode});
}
try{
 await open();
 for(const id of ['VOID_APOSTLE','GM6_1'])for(const side of [0,1])for(const path of ['direct','hand','generated']){
  const r=await run(id,side,path),name=`${id}/${side}/${path}`;
  check(name+' single owner',r.peak===1&&!r.duplicate,r);check(name+' visible face',r.visible);check(name+' no raw ghost',!r.raw);check(name+' cleanup',r.clean);
  if(path==='direct')check(name+' one contact',r.impacts===1&&r.completed===true);
  console.log('Passed',name);
 }
 for(const mode of ['cancel','skip','resize','detach','abort','replacement']){const r=await run('VOID_APOSTLE',0,mode==='skip'?'hand':'direct',mode);check(mode+' cleanup',r.peak===1&&r.clean,r);}
 const multi=await run('VOID_APOSTLE',0,'direct','multi');check('three simultaneous',multi.peak===3,multi);check('concurrency completion',multi.clean&&multi.completed.every(Boolean));
 await page.emulateMedia({reducedMotion:'reduce'});const reduced=await run('GM6_1',0,'direct');check('reduced native card',reduced.peak===0&&reduced.clean&&reduced.impacts===1);await page.emulateMedia({reducedMotion:'no-preference'});
 await page.setViewportSize({width:390,height:844});const mobile=await run('GM6_1',0,'hand');check('mobile summon',mobile.peak===1&&mobile.visible&&mobile.clean,mobile);await page.screenshot({path:out+'mobile-final.png'});
 const fallback=await browser.newPage();await fallback.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){if(kind==='webgl'||kind==='webgl2')return null;return get.call(this,kind,...args);};});await open(fallback);await fallback.evaluate(()=>window.voidQA.run('VOID_APOSTLE'));check('no WebGL native fallback',await fallback.evaluate(()=>!document.querySelector('.void-summon')&&document.querySelector('[data-uid="target-0"]').style.visibility===''));await fallback.close();
 check('no page errors',errors.length===0,errors);
 await fs.writeFile(out+'runtime-report.json',JSON.stringify({checks,errors,authenticatedMatch:false},null,2));console.log('PASS',checks.length);
}catch(error){await fs.writeFile(out+'failure.json',JSON.stringify({error:String(error),checks,errors},null,2));throw error;}finally{await browser.close();}
