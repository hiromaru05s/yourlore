import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import path from 'node:path';
import {tmpdir} from 'node:os';
const temp=await fs.mkdtemp(path.join(tmpdir(),'lore-pile-'));
const out=process.env.LORE_TEST_OUTPUT;if(out)await fs.mkdir(out,{recursive:true});
const before=process.env.LORE_BASELINE_PILE?await fs.readFile(process.env.LORE_BASELINE_PILE,'utf8'):await fs.readFile(new URL('../docs/performance/2026-10-14-loading/baseline-pileModels.ts',import.meta.url),'utf8');
try {
 await build({stdin:{contents:`export {makePile as before} from 'before-pile';export {makePile as after} from './client/src/ui/pileModels';export {Texture} from 'three';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(temp,'pile.mjs'),loader:{'.css':'empty'},plugins:[{name:'baseline',setup(b){b.onResolve({filter:/^before-pile$/},()=>({path:'before-pile',namespace:'baseline'}));b.onLoad({filter:/.*/,namespace:'baseline'},()=>({contents:before,resolveDir:path.resolve('client/src/ui'),loader:'ts'}));}}]});
 const {before:old,after:current,Texture}=await import(path.join(temp,'pile.mjs')),texture=new Texture(),face=new Texture();
 function dispose(root){root.traverse(o=>{o.geometry?.dispose();for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])m.dispose();});}
 function snapshot(root){const nodes=[];root.traverse(o=>{nodes.push({name:o.name,position:o.position.toArray(),rotation:o.rotation.toArray(),scale:o.scale.toArray(),cast:o.castShadow,receive:o.receiveShadow,attributes:o.geometry?Object.fromEntries(Object.entries(o.geometry.attributes).map(([k,v])=>[k,Array.from(v.array)])):null,index:o.geometry?.index?Array.from(o.geometry.index.array):null,groups:o.geometry?.groups,materials:(o.material?(Array.isArray(o.material)?o.material:[o.material]):[]).map(m=>({type:m.type,color:m.color?.toArray(),roughness:m.roughness,visible:m.visible,map:m.map===texture?'sleeve':m.map===face?'face':null,transparent:m.transparent,alphaTest:m.alphaTest,toneMapped:m.toneMapped}))});});return nodes;}
 let cases=0;for(const shelf of [false,true])for(const count of [0,1,2,8,12,20,40,60])for(const printed of [false,true]){
  const a=old(count,shelf,texture,printed?face:undefined),b=current(count,shelf,texture,printed?face:undefined);assert.deepEqual(snapshot(b.group),snapshot(a.group));dispose(a.group);dispose(b.group);cases++;
 }
 // Mutating/disposing one instance cannot corrupt subsequent clones.
 const a=current(20,false,texture),b=current(20,false,texture),mesh=a.cards.children[0].children[0];mesh.geometry.attributes.position.array[0]=999;dispose(a.group);const c=current(20,false,texture);assert.deepEqual(snapshot(b.group),snapshot(c.group));dispose(b.group);dispose(c.group);
 const run=fn=>{const start=performance.now();for(let i=0;i<150;i++){const p=fn(20,i%2===0,texture,face);dispose(p.group);}return performance.now()-start;};
 run(old);run(current);const samples=[];for(let i=0;i<5;i++)samples.push(i%2?{afterMs:run(current),beforeMs:run(old)}:{beforeMs:run(old),afterMs:run(current)});
 const median=key=>samples.map(s=>s[key]).sort((a,b)=>a-b)[2];const beforeMs=median('beforeMs'),afterMs=median('afterMs');
 const result={cases,instancesPerSample:150,beforeMs,afterMs,reductionPercent:100*(1-afterMs/beforeMs),samples,checks:['identical vertices, normals, UVs, indices, transforms and material properties','independent geometry ownership after mutation/disposal']};if(out)await fs.writeFile(out+'/pile-geometry.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await fs.rm(temp,{recursive:true,force:true});}
