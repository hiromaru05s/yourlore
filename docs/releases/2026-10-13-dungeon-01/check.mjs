import {chromium} from '/tmp/lore-dungeon-qa/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const out=new URL('./qa/',import.meta.url).pathname;
const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await browser.newPage({viewport:{width:1360,height:900}});page.setDefaultTimeout(30000);
const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
const check=(name,ok)=>{checks.push({name,passed:!!ok});if(!ok)throw Error(name);};
const open=async(p=page)=>{await p.goto('http://127.0.0.1:5459/dungeon-runtime.html');await p.waitForFunction(()=>window.dungeonQA?.ready);};
const start=async(side=0,path='direct')=>{await page.evaluate(({side,path})=>{window.finished=false;window.dungeonQA.run('DUNGEON',side,path).then(v=>{window.finished=true;window.result=v;});},{side,path});};
const active=()=>page.waitForSelector('.dungeon-summon');
const clean=()=>page.evaluate(()=>!document.querySelector('.dungeon-summon,[data-dungeon-capture]')&&[...document.querySelectorAll('.zone-mon .card')].every(n=>n.style.visibility!=='hidden'));
try{
 await open();
 for(const side of [0,1])for(const path of ['direct','hand','generated']){
  const before=await page.evaluate(()=>window.dungeonQA.impacts);await start(side,path);await active();
  check(`${side}/${path} dedicated owner`,await page.evaluate(()=>document.querySelectorAll('.dungeon-summon').length===1&&!document.querySelector('.slate-summon,.assassin-summon,.vampire-summon')));
  check(`${side}/${path} no raw ghost`,await page.evaluate(()=>[...document.querySelectorAll('.fx-field-ghost,.fx-card-flight')].filter(n=>getComputedStyle(n).visibility!=='hidden'&&n.getBoundingClientRect().left>=0).length===0));
  await page.waitForFunction(()=>Number(document.querySelector('.dungeon-summon')?.dataset.time)>1000);
  check(`${side}/${path} visible pixels`,await page.evaluate(()=>{const c=document.querySelector('.dungeon-summon'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return d.some((n,i)=>i%4===3&&n>50);}));
  if(path==='direct')await page.screenshot({path:out+`board-${side}.png`});
  await page.waitForFunction(()=>window.finished);check(`${side}/${path} cleanup`,await clean());
  if(path==='direct')check(`${side} one contact`,await page.evaluate(b=>window.dungeonQA.impacts===b+1,before));
  console.log('Passed route',side,path);
 }
 for(const mode of ['cancel','skip','resize','detach','abort','replacement']){
  if(mode==='abort')await page.evaluate(()=>{const q=window.dungeonQA,n=q.setup();window.abort=new AbortController();window.finished=false;q.play(n,window.abort.signal).then(()=>window.finished=true);});
  else await start(0,mode==='skip'?'hand':'direct');
  await active();
  await page.evaluate(mode=>{const q=window.dungeonQA;if(mode==='skip')q.skip(true);else if(mode==='resize')window.dispatchEvent(new Event('resize'));else if(mode==='detach')document.querySelector('[data-uid="target-0"]').remove();else if(mode==='abort')window.abort.abort();else if(mode==='replacement'){const n=document.querySelector('[data-uid="target-0"]');window.replaced=q.play(n);q.cancel();}else q.cancel();},mode);
  await page.waitForFunction(()=>window.finished);check(`${mode} cleanup`,await clean());await page.evaluate(()=>window.dungeonQA.skip(false));
 }
 await page.evaluate(()=>{const q=window.dungeonQA;q.setup();const nodes=[...document.querySelectorAll('#meRow .zone-mon .card')];nodes.forEach(n=>n.dataset.cardId='DUNGEON');window.finished=false;Promise.all(nodes.map(n=>q.play(n))).then(()=>window.finished=true);});
 await page.waitForFunction(()=>document.querySelectorAll('.dungeon-summon').length===3);check('three simultaneous',true);await page.waitForFunction(()=>window.finished);check('concurrency cleanup',await clean());
 await page.emulateMedia({reducedMotion:'reduce'});await start();await page.waitForFunction(()=>window.finished);check('reduced motion restores',await clean());await page.emulateMedia({reducedMotion:'no-preference'});
 await page.setViewportSize({width:390,height:844});await start();await active();await page.waitForFunction(()=>Number(document.querySelector('.dungeon-summon')?.dataset.time)>1000);await page.screenshot({path:out+'mobile.png'});await page.waitForFunction(()=>window.finished);check('mobile cleanup',await clean());
 await page.setViewportSize({width:1360,height:900});
 await page.evaluate(()=>{const q=window.dungeonQA;window.finished=false;q.run('DUNGEON').then(()=>window.finished=true);q.cancel();});await page.waitForFunction(()=>window.finished);check('capture cancellation',await clean());
 const fallback=await browser.newPage();await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){if(kind==='webgl'||kind==='webgl2')return null;return original.call(this,kind,...args);};});await open(fallback);await fallback.evaluate(()=>window.dungeonQA.run('DUNGEON'));check('no WebGL native fallback',await fallback.evaluate(()=>!document.querySelector('.dungeon-summon')&&document.querySelector('[data-uid="target-0"]').style.visibility===''));await fallback.close();
 check('no browser errors',errors.length===0);
 await fs.writeFile(out+'runtime-report.json',JSON.stringify({checks,errors,authenticatedMatch:false},null,2));console.log('PASS',checks.length);
}catch(e){await fs.writeFile(out+'failure.json',JSON.stringify({error:String(e),checks,errors},null,2));throw e;}finally{await browser.close();}
