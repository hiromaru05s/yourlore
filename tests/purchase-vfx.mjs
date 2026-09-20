import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const dir=await mkdtemp(tmpdir()+'/lore-payment-');
try{
 await build({stdin:{contents:"export * from './client/src/ui/manaPurchase';export * from './client/src/ui/biblionFx';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/fx.mjs'});
 const {drawManaPurchase,manaPaymentPoint,MANA_PURCHASE_DURATION,playBiblionFx,clearBiblionFx}=await import(dir+'/fx.mjs');
 const contexts=[],canvases=[],raf=new Map();let nextId=0,draws=0;
 const context=()=>new Proxy({globalCompositeOperation:'source-over',cuts:0},{get:(o,k)=>k in o?o[k]:(...args)=>{for(const a of args)if(typeof a==='number')assert(Number.isFinite(a));draws++;if(k==='fill'&&o.globalCompositeOperation==='destination-out')o.cuts++;},set:(o,k,v)=>{if(k==='globalAlpha')assert(v>=0&&v<=1);o[k]=v;return true;}});
 for(const from of [{left:230,top:760,width:85,height:20},{left:240,top:80,width:60,height:20}])for(const to of [{left:70,top:360,width:30,height:45},{left:900,top:320,width:90,height:140}]){
  assert.deepEqual(manaPaymentPoint(from,to,0),{x:from.left+from.width/2,y:from.top+from.height/2});
  const end=manaPaymentPoint(from,to,1);assert(Math.abs(end.x-to.left-to.width*.25)<1e-6);assert(Math.abs(end.y-to.top-to.height*.2)<1e-6);
  const c=context();for(let t=-.1;t<MANA_PURCHASE_DURATION+.1;t+=.02)drawManaPurchase(c,from,to,t);
  const before=draws;drawManaPurchase(c,from,to,MANA_PURCHASE_DURATION);assert.equal(draws,before,'payment must fully disappear');
 }
 class Matrix{translate(){return this;}scale(){return this;}transformPoint(p){return {...p,w:1};}}
 Object.assign(globalThis,{DOMMatrix:Matrix,DOMPoint:class{constructor(x,y){this.x=x;this.y=y;}},Element:class{},innerWidth:390,innerHeight:844,devicePixelRatio:3,matchMedia:()=>({matches:false}),getComputedStyle:()=>({visibility:'visible'}),requestAnimationFrame:f=>{const id=++nextId;raf.set(id,f);return id;},cancelAnimationFrame:id=>raf.delete(id)});
 const boardCard={offsetWidth:40,offsetHeight:60,closest:()=>null,getBoundingClientRect:()=>({left:0,top:0,width:40,height:60})};
 globalThis.document={hidden:false,querySelectorAll:()=>[boardCard],addEventListener(){},removeEventListener(){},body:{append(c){canvases.push(c);}},createElement(){const ctx=context();contexts.push(ctx);return {width:0,height:0,style:{},dataset:{},hidden:false,getContext:()=>ctx,setAttribute(){},remove(){this.removed=true;}};}};
 const r={left:80,top:300,width:45,height:65};
 playBiblionFx('summon-charge',r);playBiblionFx('summon-impact',r);playBiblionFx('purchase',r,{...r,top:100});
 assert.equal(canvases.length,2,'at most one shared canvas per depth layer');
 const rear=canvases.find(c=>c.dataset.layer==='rear'),front=canvases.find(c=>c.dataset.layer==='front');
 assert.match(rear.style.cssText,/z-index:124/);assert.match(front.style.cssText,/z-index:1700/);
 const tick=[...raf.values()][0];raf.clear();tick(performance.now()+200);
 assert.match(rear.dataset.effects,/summon-impact/);assert.equal(front.dataset.effects,'purchase');
 assert(rear.getContext().cuts>0,'board cards must occlude the remaining ground effect');
 assert.equal(rear.width,780,'DPR capped at two');
 for(let i=0;i<40;i++)playBiblionFx('purchase',r,r);
 const next=[...raf.values()][0];raf.clear();next(performance.now()+210);assert.equal(canvases.reduce((n,c)=>n+(c.dataset.effects?c.dataset.effects.split(' ').length:0),0),24);
 clearBiblionFx();assert(canvases.every(c=>c.hidden&&!c.dataset.effects));assert.equal(raf.size,0);
 clearBiblionFx(true);assert(canvases.every(c=>c.removed));
 console.log('PASS: mana travel endpoints and finite geometry, rear summon masking, two bounded layers, DPR cap, cancellation and disposal');
}finally{await rm(dir,{recursive:true,force:true});}
