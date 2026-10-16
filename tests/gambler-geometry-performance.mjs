import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const dir=await mkdtemp(tmpdir()+'/lore-gambler-geometry-');
try{
 await build({entryPoints:['client/src/ui/gamblerSummon/geometry.ts'],bundle:true,platform:'node',format:'esm',outfile:dir+'/geometry.mjs',plugins:[{name:'pure-card-padding',setup(b){b.onResolve({filter:/cardSurface$/},()=>({path:'padding',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const CARD_PADDING=.12;'}));}}]});
 const {SolidRegion,regions,motion}=await import(dir+'/geometry.mjs');let checks=0;
 for(let style=0;style<5;style++)for(const region of regions(style)){
  const solid=new SolidRegion(region,undefined,undefined,undefined);
  for(const reduced of [false,true])for(const time of [0,.08,.2,.35,.5,.6,.8,1]){
   const f={...motion(style,time,reduced),legend:time>.5};solid.update(f);
   const expected=new Float32Array(solid.coords.length*3),W=1.24,H=1.74;
   solid.coords.forEach(([a,r,layer,q],i)=>{
    const radius=Math.pow(Math.pow(Math.abs(Math.cos(a))/W,18)+Math.pow(Math.abs(Math.sin(a))/H,18),-1/18);
    let angle=a,rr=r,extra=0;
    if(style===1){angle+=Math.sin(region.index*.48+time*3)*.028*f.activity;rr+=.017*f.activity*Math.sin(q*Math.PI);extra=.042*f.activity*Math.sin(region.index/12*Math.PI*2+time*3);}
    if(style===2){rr+=Math.sin(a*5-f.time*9+r*5)*.04*f.activity*(.3+r);angle+=Math.sin(r*5-f.time*5)*.11*f.activity;extra=Math.sin(r*10-a*3-f.time*11)*.065*f.activity*Math.sin(Math.PI*r);}
    if(style===4)angle+=r*r*Math.sin(f.time*Math.PI)*.10*f.activity;
    const thickness=.014+f.volume*[.24,.28,.29,.22,.38][style]*(f.legend?1.14:1);
    const profile=(.055*Math.exp(-Math.pow((r-.92)/.025,2))+.042*Math.exp(-Math.pow((r-.84)/.016,2))+.045*Math.exp(-Math.pow((r-.39)/.024,2))+.12*Math.exp(-Math.pow(r/.15,4)))*f.volume;
    const bevel=(1-Math.min(1,Math.min(q,1-q)/.10))*.025*f.volume,outer=(radius*(1-f.morph)+1.33*f.morph)*rr;
    expected.set([Math.cos(angle)*outer,Math.sin(angle)*outer,layer===0?thickness*.5+profile-bevel+extra:-thickness*.5+bevel+extra*.2],i*3);
   });
   assert.deepEqual(solid.geometry.attributes.position.array,expected,'Authored vertex positions must be bit-identical');
   assert([...solid.geometry.attributes.normal.array].every(Number.isFinite));checks++;
   const version=solid.geometry.attributes.position.version;
   solid.update({...f,spin:f.spin+1});
   if(style===0||style===3)assert.equal(solid.geometry.attributes.position.version,version,'Rigid spin does not rebuild geometry');
   assert.equal(solid.mesh.rotation.z,(f.spin+1)*(style===3?(region.index===1?-1:region.index===2?2:1):1));
  }
  solid.dispose();
 }
 console.log('PASS',checks,'bit-identical geometry frames, normals, spin, reduced motion and disposal');
}finally{await rm(dir,{recursive:true,force:true});}
