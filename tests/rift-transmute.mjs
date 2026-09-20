import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const dir=await mkdtemp(tmpdir()+'/lore-rift-transmute-');
try{
 await build({entryPoints:['client/src/ui/riftTransmute.ts'],bundle:true,platform:'node',format:'esm',outfile:dir+'/effect.mjs'});
 const {riftState,riftCardPoint,collapsePoint,riftTrailPosition,drawRiftTransmute,RIFT_DURATION}=await import(dir+'/effect.mjs');
 for(const source of [{x:260,y:500},{x:120,y:280}])for(const sink of [{x:1120,y:520},{x:330,y:225}]){
  assert.deepEqual(riftTrailPosition(source,sink,0),source);
  const arrival=riftTrailPosition(source,sink,1);assert(Math.hypot(arrival.x-sink.x,arrival.y-sink.y)<1e-8);
  for(const width of [32,90,180])for(const offset of [{x:-width/2,y:-width*.8},{x:width/2,y:width*.8},{x:0,y:0}]){
   const p={x:source.x+offset.x,y:source.y+offset.y};let lastDistance=Infinity;
   assert.deepEqual(collapsePoint(p,source,0,width),p);assert.deepEqual(collapsePoint(p,source,1,width),source);
   for(let ms=0;ms<=RIFT_DURATION;ms+=10){const state=riftState(ms),v=collapsePoint(p,source,state.suction,width),distance=Math.hypot(v.x-source.x,v.y-source.y);
    assert(Object.values(v).every(Number.isFinite));assert(distance<=lastDistance+1e-8,'card must converge locally');lastDistance=distance;
    if(state.suction<1)assert.equal(state.travel,0,'trail cannot depart while the card remains');
    if(state.travel>0)assert.equal(state.suction,1);
   }
  }
 }
 assert.equal(riftState(1280).suction,1);assert(riftState(1281).travel>0&&riftState(1281).trail>0,'depart immediately after collapse without an intermediate hold');assert.equal(riftState(1660).travel,1);
 const raised=riftCardPoint({x:200,y:300},{x:200,y:300},90,riftState(400));assert(raised.y<260,'card rises visibly before absorption');assert.equal(riftState(700).shroud,1,'entire face is coated before suction');assert.equal(riftState(700).suction,0);
 for(const ms of [800,950,1100,1280]){const point=riftCardPoint({x:200,y:300},{x:200,y:300},90,riftState(ms));assert(Math.abs(point.x-raised.x)<1e-6&&Math.abs(point.y-raised.y)<1e-6,'vortex center stays at the raised card, never falls toward a second hole');}
 const topCenter={x:320,y:35};const topVortex=riftCardPoint(topCenter,topCenter,45,riftState(1100));assert(topVortex.y>=30,'opponent hand vortex remains below the top edge');
 const end=riftState(RIFT_DURATION);assert.equal(end.trail,0);assert.equal(end.arrival,0);
 let saves=0,commands=0;const ctx=new Proxy({}, {get:(_,k)=>k==='save'?()=>saves++:k==='restore'?()=>saves--:(...args)=>{for(const a of args)if(typeof a==='number')assert(Number.isFinite(a));commands++;},set:(_,k,v)=>{if(k==='globalAlpha')assert(v>=0&&v<=1);return true;}});
 for(const width of [32,90,180])for(let ms=0;ms<=RIFT_DURATION;ms+=10)drawRiftTransmute(ctx,{x:120,y:200},{x:600,y:400},width,ms,q=>assert(q>=0&&q<=1));
 assert.equal(saves,0);assert(commands>1000);
 console.log('PASS: card collapses in place, immediate departure without a crystal hold, exact Rift destination, finite mobile/desktop geometry and clean ending');
}finally{await rm(dir,{recursive:true,force:true});}
