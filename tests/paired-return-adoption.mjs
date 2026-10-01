import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out='docs/ui-rework/2026-09-29-paired-return-adoption';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(90000);
const errors=[],checks=[],runs=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errors.push(m.text());});
async function prepare(side,count){
 await page.evaluate(async({side,count})=>{const api=window.loreShelfPreview;await api.side(side);await api.count(count);await api.sample('portal-echo',0);await api.cancel();delete document.querySelector('#app').dataset.shelfReturnVariant;},{side,count});
}
async function run(side,count){
 await prepare(side,count);
 const result=await page.evaluate(async({side,count})=>{
  const root=document.querySelector('#app'),prefix=side==='me'?'pile-my':'pile-opp';
  const {previewClock}=await import('/src/dev/shelfReturnEffects.ts');previewClock.paused=true;previewClock.time=100000;
  const seen=new Set();const watch=new MutationObserver(()=>{if(root.dataset.connectedStudyActive)seen.add(root.dataset.connectedStudyActive)});watch.observe(root,{attributes:true});
  const {animateReshuffle}=await import('/src/ui/anim.ts');const start=performance.now();await animateReshuffle(side,count);watch.disconnect();
  return {seen:[...seen],ms:performance.now()-start,variant:root.dataset.shelfReturnVariant??null,t:Number(root.dataset.shelfReturnTime),source:document.getElementById(prefix+'Disc').dataset.count,target:document.getElementById(prefix+'Deck').dataset.count,active:document.querySelectorAll('.is-shuffling').length};
 },{side,count});
 assert.deepEqual(result.seen,['portal-echo']);assert.equal(result.variant,null);assert.equal(result.t,1);assert.equal(result.source,'0');assert.equal(result.target,String(count));assert.equal(result.active,0);runs.push({side,count,...result});console.log('PASS production',side,count);
}
try{
 await page.goto('http://127.0.0.1:5208/shelf-return-lab.html?portal=1');await page.waitForFunction(()=>window.loreShelfPreview?.ready);
 for(const [side,count]of [['me',14],['opp',14],['me',1],['me',40]])await run(side,count);
 checks.push('real animateReshuffle path selects portal-echo without a preview override; independent of paused preview clock; both sides and 1/14/40 cards');
 // Shared material rendering: deterministic frames use the same implementation and approved config.
 await prepare('me',14);
 for(const [name,t]of [['vanish',.27],['gap',.42],['arrival',.68]]){await page.evaluate(ms=>loreShelfPreview.sample('portal-echo',ms),2060*t);await page.waitForTimeout(100);await page.screenshot({path:`${out}/${name}.png`});await page.evaluate(()=>loreShelfPreview.cancel());}
 const dark=await page.addStyleTag({content:'.board-flight-canvas{background:#111423}'});await page.evaluate(()=>loreShelfPreview.sample('portal-echo',1400));await page.screenshot({path:out+'/dark.png'});await page.evaluate(()=>loreShelfPreview.cancel());await dark.evaluate(e=>e.remove());
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);await run('me',14);await run('opp',14);
 await page.evaluate(()=>loreShelfPreview.sample('portal-echo',1400));await page.screenshot({path:out+'/opponent-mobile.png'});await page.evaluate(()=>loreShelfPreview.cancel());
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);checks.push('390px mobile: both sides completed; light/dark shared-renderer captures');
 await page.setViewportSize({width:1280,height:900});await page.waitForTimeout(150);await prepare('me',14);
 for(const action of ['cancel','resize']){
  const r=await page.evaluate(async action=>{
   const root=document.querySelector('#app');delete root.dataset.shelfReturnVariant;
   const observer=new MutationObserver(()=>{if(root.dataset.connectedStudyActive){observer.disconnect();if(action==='cancel')void loreShelfPreview.cancel();else dispatchEvent(new Event('resize'));}});observer.observe(root,{attributes:true});
   await loreShelfPreview.play('original');observer.disconnect();return {count:document.querySelector('#pile-myDisc').dataset.count,active:document.querySelectorAll('.is-shuffling').length};
  },action);assert.equal(r.count,'14');assert.equal(r.active,0);
 }
 checks.push('abort and resize restore source pile and clear active classes');
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>loreShelfPreview.play('original'));assert.equal(await page.locator('#pile-myDeck').getAttribute('data-count'),'14');assert.equal(await page.locator('.is-shuffling').count(),0);checks.push('reduced-motion renderer completes stationary handoff');
 await page.emulateMedia({reducedMotion:'no-preference'});
 // Scene lifetime teardown and independent simultaneous renderers without relying on controller serialization.
 const life=await page.evaluate(async()=>{
  const T=await import('/node_modules/.vite/deps/three.js');
  const {installSceneMotion}=await import('/src/ui/sceneMotion.ts');const {moveOnBoard}=await import('/src/ui/boardMotion.ts');const {playMaterialReturn}=await import('/src/ui/shelfReturn.ts');
  const make=()=>{const root=document.createElement('div');root.innerHTML='<div id="shelf-test-source" data-count="14" data-sleeve="borrowed"><b class="pile-count">14</b></div><div id="shelf-test-target" data-count="0" data-sleeve="borrowed"><b class="pile-count">0</b></div>';document.body.append(root);return {root,source:root.children[0],target:root.children[1],scene:new T.Scene()}};
  const one=make(),tex=new T.Texture();let textureDisposed=false;tex.addEventListener('dispose',()=>textureDisposed=true);
  const installed=installSceneMotion(one.root,one.scene,new Map([[one.source.id,{pile:{}}],[one.target.id,{pile:{}}]]),()=>tex,()=>{});
  const observer=new MutationObserver(()=>{if(one.root.dataset.connectedStudyActive){observer.disconnect();installed.dispose()}});observer.observe(one.root,{attributes:true});
  const disposedResult=await moveOnBoard({kind:'shuffle',source:one.source,target:one.target,count:14,signal:new AbortController().signal});observer.disconnect();
  const a=make(),b=make(),abort=new AbortController();const args=(x,signal)=>({...x,count:14,unit:80,cx:0,cy:0,texture:()=>tex,signal,warm:async()=>{},refresh:()=>{}});
  const first=playMaterialReturn(args(a,abort.signal)),second=playMaterialReturn(args(b,new AbortController().signal));abort.abort();const concurrent=await Promise.all([first,second]);
  const result={disposedResult,concurrent,remaining:[one.scene.children.length,a.scene.children.length,b.scene.children.length],source:one.source.dataset.count,secondTarget:b.target.dataset.count,textureDisposed};[one,a,b].forEach(x=>x.root.remove());tex.dispose();return result;
 });assert.equal(life.disposedResult,false);assert.deepEqual(life.concurrent,[false,true]);assert.deepEqual(life.remaining,[0,0,0]);assert.equal(life.source,'14');assert.equal(life.secondTarget,'14');assert.equal(life.textureDisposed,false);checks.push('scene disposal and concurrent independent clocks release all scene meshes; shared sleeve texture is retained');
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/browser-report.json',JSON.stringify({checks,runs,life,errors},null,2));console.log('PASS',checks);
}finally{await browser.close();}
