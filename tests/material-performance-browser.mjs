import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const baseline=process.env.LORE_PERF_BASELINE||'8b58cffe',out=process.env.LORE_TEST_OUTPUT||'docs/performance/2026-10-05';
await fs.mkdir(out,{recursive:true});
const prefix='/@original/';
const server=await createServer({root:'client',configFile:'client/vite.config.ts',logLevel:'error',plugins:[{name:'original-materials',enforce:'pre',resolveId(id){if(id.startsWith(prefix))return id;},load(id){if(!id.startsWith(prefix))return;const file=id.slice(prefix.length);return execFileSync('git',['show',baseline+':client/src/'+file],{encoding:'utf8'}).replace(/(from\s*|import\s*)['"](\.[^'"]+)['"]/g,(_,head,relative)=>{let target=path.posix.join(path.posix.dirname(file),relative);if(!path.posix.extname(target))target+='.ts';return `${head}'${prefix}${target}'`;});},configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url==='/material-fixture'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><body></body></html>');}else next();});}}],server:{host:'127.0.0.1',port:5399,strictPort:true,hmr:false}});
await server.listen();const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();page.setDefaultTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning'||m.type()==='error')console.log(m.text())});
 await page.goto('http://127.0.0.1:5399/material-fixture');
 console.log('material fixture ready');
 const result=await page.evaluate(async()=>{
  const [{DustMaterial:OldDust},{DustMaterial:NewDust},{RiftInkMaterial:OldRift},{RiftInkMaterial:NewRift}]=await Promise.all([import('/@original/ui/summon/material.ts'),import('/src/ui/summon/material.ts'),import('/@original/ui/riftInkMaterial.ts'),import('/src/ui/riftInkMaterial.ts')]);
  const face=document.createElement('canvas');face.width=192;face.height=288;const f=face.getContext('2d');f.fillStyle='#d9b065';f.beginPath();f.roundRect(8,8,176,272,20);f.fill();for(let i=0;i<16;i++){f.fillStyle=`hsl(${i*19} 55% 55%)`;f.fillRect(24+i*9,40+i*8,8,120);}f.clearRect(80,80,15,24);
  let background='#f5f3ee';const read=canvas=>{const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.fillStyle=background;ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(canvas,0,0);return ctx.getImageData(0,0,c.width,c.height).data;};
  const compare=(a,b)=>{let changed=0,max=0,sum=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);if(d)changed++;sum+=d;max=Math.max(max,d);}return {changed,max,mean:sum/a.length};};
  const cases=[],timings=[];
  for(const kind of ['dust','rift']){
   const pair=kind==='dust'?[new OldDust(),new NewDust()]:[new OldRift(),new NewRift()];
   try{
    for(background of ['#f5f3ee','#14101c']){
    if(kind==='dust')for(const size of [256,450,680])for(const variant of [0,1,2,3,4,5])for(const age of [0,.02,.08,.3,.7,1.2,1.65,1.8]){
     const pixels=pair.map(m=>read(m.draw(variant,age,false,size)));cases.push({kind,background,size,variant,age,...compare(...pixels)});
    }
    else for(const size of [224,480,768])for(const aspect of [1.5,1.42])for(const ms of [0,580,790,950,1110,1260,1450,1660,1860,1940,1990,2040]){
     const pixels=pair.map(m=>read(m.draw(face,ms,aspect,size)));cases.push({kind,background,size,aspect,ms,...compare(...pixels)});
    }
    }
    // Finish the GPU queue per batch. This measures completed rendering, not just submission.
    const gls=pair.map(m=>m.canvas.getContext('webgl'));
    const draw=(m,i)=>kind==='dust'?m.draw(2,.02+i*.024,false,450):m.draw(face,100+i*28,1.5,640);
    pair.forEach((m,j)=>{for(let i=0;i<60;i++)draw(m,i);gls[j].readPixels(0,0,1,1,gls[j].RGBA,gls[j].UNSIGNED_BYTE,new Uint8Array(4));});
    for(let round=0;round<8;round++)for(const index of round%2?[1,0]:[0,1]){const start=performance.now();for(let i=0;i<60;i++){draw(pair[index],i);gls[index].readPixels(0,0,1,1,gls[index].RGBA,gls[index].UNSIGNED_BYTE,new Uint8Array(4));}gls[index].readPixels(0,0,1,1,gls[index].RGBA,gls[index].UNSIGNED_BYTE,new Uint8Array(4));if(gls[index].isContextLost()||gls[index].getError())throw Error('GPU measurement invalid');timings.push({kind,round,version:index?'after':'before',frames:60,ms:performance.now()-start});await new Promise(r=>setTimeout(r,20));}
   }finally{pair.forEach(m=>m.dispose());}
  }
  return {cases,timings};
 });
 const resources=await page.evaluate(async()=>{
  const {Renderer}=await import('/src/ui/summon/renderer.ts');const {acquireDustMaterial}=await import('/src/ui/summon/material.ts');
  const {Renderer:Original}=await import('/@original/ui/summon/renderer.ts');
  const face=document.createElement('canvas');face.width=120;face.height=180;const fc=face.getContext('2d');fc.fillStyle='#bc9866';fc.fillRect(0,0,120,180);fc.fillStyle='#345f56';fc.fillRect(12,24,96,130);
  const get=HTMLCanvasElement.prototype.getContext,contexts=new Set();HTMLCanvasElement.prototype.getContext=function(kind,...args){const result=get.call(this,kind,...args);if(kind==='webgl'&&result)contexts.add(result);return result;};
  const timeout=window.setTimeout.bind(window);let release;
  window.setTimeout=(fn,ms,...args)=>{if(ms===30000){release=fn;return 0;}return timeout(fn,ms,...args);};
  const a=new Renderer(),b=new Renderer(),allocated=contexts.size,gl=[...contexts][0];HTMLCanvasElement.prototype.getContext=get;
  const old=new Original(),canvas=[0,1].map(()=>{const c=document.createElement('canvas');c.width=600;c.height=500;return c;});const cs=canvas.map(c=>c.getContext('2d',{willReadFrequently:true}));const cases=[];
  try{
   for(const variant of [0,1,2,3,4,5,6,7])for(const ms of [0,790,1050,1500]){
    cs.forEach(c=>{c.fillStyle='#f5f3ee';c.fillRect(0,0,600,500);});old.draw(cs[0],face,variant,ms,300,260,110);b.draw(cs[1],face,variant,ms,300,260,110);const pixels=cs.map(c=>c.getImageData(0,0,600,500).data);let max=0,changed=0;for(let i=0;i<pixels[0].length;i++){const d=Math.abs(pixels[0][i]-pixels[1][i]);max=Math.max(max,d);if(d)changed++;}cases.push({variant,ms,max,changed});
   }
   a.dispose();const aliveWithUser=!gl.isContextLost();b.draw(cs[1],face,2,1000,300,260,110);b.dispose();b.dispose();const idleAlive=!gl.isContextLost();release();const released=gl.isContextLost();const lost=acquireDustMaterial();lost.material.canvas.getContext('webgl').getExtension('WEBGL_lose_context').loseContext();const replacement=acquireDustMaterial();const recovered=!replacement.material.isContextLost()&&replacement.material!==lost.material;lost.release();replacement.release();release();return {allocated,aliveWithUser,idleAlive,released,recovered,cases};
  }finally{a.dispose();b.dispose();old.dispose();window.setTimeout=timeout;}
 });
 await fs.writeFile(out+'/summon-resources.json',JSON.stringify(resources,null,2));
 assert.equal(resources.allocated,1);assert(resources.aliveWithUser&&resources.idleAlive&&resources.released&&resources.recovered);assert(resources.cases.every(c=>c.max<=1&&c.changed<=8));
 const maskResult=await page.evaluate(async()=>{
  const [{makeFrameMask:before},{makeFrameMask:after}]=await Promise.all([import('/@original/ui/spellFrame/mask.ts'),import('/src/ui/spellFrame/mask.ts')]);
  const card=document.createElement('div');card.style.cssText='position:absolute;left:100px;top:30px;width:180px;height:270px';card.innerHTML='<div class="card-frame" style="background-image:url(/art/biblion/modular/base-spell-ui.webp)"></div><div class="card-cost" style="position:absolute;left:4px;top:5px;width:30px;height:30px"></div>';document.body.append(card);
  const checks=[],timings=[],images=[];const timeout=window.setTimeout.bind(window);let expire;window.setTimeout=(fn,ms,...args)=>{if(ms===30000){expire=fn;return 0;}return timeout(fn,ms,...args);};
  const pixels=texture=>texture.image.getContext('2d').getImageData(0,0,768,1200).data;
  for(const transform of ['none','rotate(3deg)','scale(.7)','rotate(180deg)','none']){
   card.style.transform=transform;const a=await before(card),b=await after(card),aa=pixels(a),bb=pixels(b);let changed=0;for(let i=0;i<aa.length;i++)if(aa[i]!==bb[i])changed++;checks.push({transform,changed});images.push(b.image);a.dispose();b.dispose();
  }
  for(let round=0;round<8;round++)for(const version of round%2?['after','before']:['before','after']){const start=performance.now(),texture=await (version==='after'?after:before)(card);timings.push({round,version,ms:performance.now()-start});texture.dispose();}
  const first=await after(card),second=await after(card);const sharedSurface=first.image===second.image,independentTextures=first!==second;first.dispose();second.dispose();
  // Stencil changes produce a fresh surface rather than borrowing stale pixels.
  card.querySelector('.card-cost').style.width='40px';const altered=await after(card);const invalidated=altered.image!==images[0];altered.dispose();for(let i=0;i<5;i++){card.querySelector('.card-cost').style.width=(41+i)+'px';(await after(card)).dispose();}card.querySelector('.card-cost').style.width='30px';const evicted=await after(card),bounded=evicted.image!==images[0];expire();const fresh=await after(card),expired=fresh.image!==evicted.image;evicted.dispose();fresh.dispose();expire();window.setTimeout=timeout;card.remove();
  return {checks,timings,sharedSurface,independentTextures,invalidated,bounded,expired};
 });
 await fs.writeFile(out+'/spell-mask.json',JSON.stringify(maskResult,null,2));
 assert(maskResult.checks.every(c=>c.changed===0));assert(maskResult.sharedSurface&&maskResult.independentTextures&&maskResult.invalidated&&maskResult.bounded&&maskResult.expired);
 for(const version of ['before','after']){const a=maskResult.timings.filter(x=>x.version===version).map(x=>x.ms).sort((a,b)=>a-b);console.log('mask',version,(a[3]+a[4])/2);}
 await fs.writeFile(out+'/materials.json',JSON.stringify({baseline,...result,errors},null,2));
 const diff=result.cases.filter(x=>x.changed);console.log('pixel cases',result.cases.length,'changed cases',diff.length,'max',Math.max(...result.cases.map(x=>x.max)),'mean',Math.max(...result.cases.map(x=>x.mean)));
 for(const kind of ['dust','rift']){const median=version=>{const a=result.timings.filter(x=>x.kind===kind&&x.version===version).map(x=>x.ms).sort((a,b)=>a-b);return(a[3]+a[4])/2;};console.log(kind,{before:median('before'),after:median('after')});}
 assert.equal(errors.length,0);assert(result.cases.every(c=>c.max<=1&&c.changed<=8),'only floating point boundary rounding is permitted');
}finally{await browser.close();await server.close();}
