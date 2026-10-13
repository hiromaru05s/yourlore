import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-poison-browser/node_modules/playwright/index.mjs');
const out=new URL('./qa/',import.meta.url).pathname;
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const p=await browser.newPage({viewport:{width:1280,height:1050}});p.setDefaultTimeout(180000);p.setDefaultNavigationTimeout(180000);
const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('http://127.0.0.1:5467/poison-four.html');await p.waitForFunction(()=>window.poisonPreview&&document.querySelector('.loading').hidden);
await p.selectOption('#mode','compare');await p.uncheck('#light');const result=await p.evaluate(async()=>{
 const {cardHeight,dropHeight}=await import('/src/dev/poison-four/physics.ts');
 const {boardProjection}=await import('/src/dev/poison-four/renderer.ts');
 const {boardMatrix}=await import('/src/ui/boardProjection.ts');
 const trajectory=Array.from({length:65},(_,i)=>({t:i*10,height:cardHeight(i*10)}));
 let maxProjectionError=0;
 // Independently project world vertices with the returned GPU matrix and native DOMMatrix.
 for(const z of [210,610])for(const h of [0,31,62]){
  const matrix=boardMatrix(640,z,0).scale(.7,.7,.7),gpu=boardProjection(matrix,1280,1050).elements;
  for(const [x,y]of [[-72,-112],[72,-112],[72,112],[-72,112]]){
   const world=[x,h,y,1],clip=[0,0,0,0];for(let r=0;r<4;r++)for(let c=0;c<4;c++)clip[r]+=gpu[c*4+r]*world[c];
   const screen=[(clip[0]/clip[3]+1)*640,(1-clip[1]/clip[3])*525];
   const native=matrix.transformPoint(new DOMPoint(x,y,h));maxProjectionError=Math.max(maxProjectionError,Math.hypot(screen[0]-native.x/native.w,screen[1]-native.y/native.w));
  }
 }
 return{trajectory,maxProjectionError,drop:[0,95,190,285,380].map(t=>dropHeight(1240+t,1240,380,32)),settled:[640,1500,2800].map(t=>cardHeight(t))};
});
assert.equal(result.trajectory[0].height,62);assert.equal(result.trajectory.at(-1).height,0);
assert(result.trajectory.every((v,i,a)=>i===0||v.height<=a[i-1].height));assert.deepEqual(result.settled,[0,0,0]);assert.equal(result.drop.at(-1),0);assert(result.drop.every((v,i,a)=>!i||v<a[i-1]));assert(result.maxProjectionError<1e-8);
await p.selectOption('#camera','side');
for(const id of ['POISON_MASTER','RUST_SLUG','RUST_SHROOM']){await p.selectOption('#card',id);for(const t of [350,640,1380,1700,2800]){await p.evaluate(t=>window.poisonPreview.seek(t),t);await p.screenshot({path:out+`${id}-side-${t}.png`,fullPage:true});}}
assert.deepEqual(errors,[]);await fs.writeFile(out+'horizontal-report.json',JSON.stringify({...result,errors,scope:'Analytic trajectory and independent GPU/CSS projection; side-view images require visual review.'},null,2));await browser.close();console.log('Horizontal trajectory and 24 projected corners passed; 15 side-view frames saved.');
