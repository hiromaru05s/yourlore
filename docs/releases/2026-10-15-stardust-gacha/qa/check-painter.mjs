import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await browser.newPage();
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lore-stardust-pixel-'));
const out=new URL('./',import.meta.url);
try {
 const source=await fs.readFile(new URL('approved-preview.ts.txt',out),'utf8');
 await build({stdin:{contents:source+`\nexport function reference(ctx,w,h,time,seed,path){draw({ctx,canvas:{width:w,height:h},kind:1,seed,path,visible:true},time)}`,loader:'ts'},bundle:true,format:'iife',globalName:'approved',platform:'browser',outfile:dir+'/reference.mjs'});
 await build({entryPoints:['client/src/ui/cardFinishStardust.ts'],bundle:true,format:'iife',globalName:'runtime',platform:'browser',outfile:dir+'/runtime.mjs'});
 await page.addScriptTag({path:dir+'/reference.mjs'});await page.addScriptTag({path:dir+'/runtime.mjs'});
 const report=await page.evaluate(()=>{
 const {reference}=approved,{drawStardustFinish,STARDUST_FINISH_EDGE}=runtime;
 const createCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
 const assert=(v,msg)=>{if(!v)throw Error(msg)};assert.equal=(a,b,msg)=>assert(a===b,msg);assert.deepEqual=(a,b,msg)=>assert(JSON.stringify(a)===JSON.stringify(b),msg);
 let material;
 const base='M .082 .221 Q .082 .177 .134 .202 L .486 .202 L .5 .214 L .514 .202 L .868 .202 Q .925 .177 .922 .221 L .922 .89 Q .928 .932 .878 .94 Q .58 .966 .50 .934 Q .445 .965 .13 .94 Q .077 .933 .082 .887 Z';
 const field='M .09 .158 Q .085 .088 .47 .054 L .50 .075 L .53 .054 Q .916 .088 .91 .158 L .91 .88 Q .916 .935 .87 .941 Q .59 .968 .50 .941 Q .42 .967 .13 .941 Q .087 .935 .09 .88 Z';
 const checks=[];
 for(const h of [400,256])for(const time of [0,1.2,2.3,6,10])for(const seed of [0,3]){
  const w=256,p=new Path2D(h===400?base:field),a=createCanvas(w,h),b=createCanvas(w,h),ac=a.getContext('2d'),bc=b.getContext('2d');
  reference(ac,w,h,time,seed,p);
  bc.save();bc.scale(w,h);bc.clip(p);bc.scale(1/w,1/h);
  drawStardustFinish(bc,w,h,time,seed);
  bc.save();bc.scale(w,h);bc.globalAlpha=.58;bc.strokeStyle=STARDUST_FINISH_EDGE;bc.lineWidth=1.6/w;bc.stroke(p);bc.restore();bc.restore();
  const aa=ac.getImageData(0,0,w,h).data,bb=bc.getImageData(0,0,w,h).data;
  let different=0;for(let i=0;i<aa.length;i++)if(aa[i]!==bb[i])different++;
  assert.equal(different,0,`approved visual changed: h=${h} t=${time} seed=${seed}`);
  assert.equal(bb[3],0,'outside card mask must stay transparent');
  checks.push({height:h,time,seed,differentChannels:different});
  if(h===400&&time===1.2&&seed===0)material=b.toDataURL();
 }
 const c=createCanvas(256,400).getContext('2d');c.globalAlpha=.37;c.globalCompositeOperation='multiply';c.translate(7,9);c.fillStyle='#123456';c.shadowBlur=8;
 const before=[c.globalAlpha,c.globalCompositeOperation,c.getTransform().toString(),c.fillStyle,c.shadowBlur];drawStardustFinish(c,256,400,2);assert.deepEqual([c.globalAlpha,c.globalCompositeOperation,c.getTransform().toString(),c.fillStyle,c.shadowBlur],before,'painter must restore host context');
 const empty=createCanvas(10,10).getContext('2d');drawStardustFinish(empty,0,10,2);drawStardustFinish(empty,10,10,NaN);assert(empty.getImageData(0,0,10,10).data.every(x=>x===0));
 return {checks,contextRestored:true,invalidInputsNoOp:true,material};
 });
 await fs.writeFile(new URL('material.png',out),Buffer.from(report.material.split(',')[1],'base64'));delete report.material;
 await fs.writeFile(new URL('report.json',out),JSON.stringify(report,null,2));console.log('PASS Chromium: 20 exact pixel comparisons against selected revision including outline, portrait/field clipping, canvas state restoration, invalid inputs');
} finally {await browser.close();await fs.rm(dir,{recursive:true,force:true});}
