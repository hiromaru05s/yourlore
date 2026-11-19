import assert from 'node:assert/strict';import {build} from 'esbuild';
const built=await build({stdin:{contents:"export {ManaScatter} from './client/src/ui/manaRupture/manaScatter';export * as T from 'three';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node'});
const {ManaScatter,T}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const pieces=Array.from({length:64},(_,i)=>({seed:i/64,center:new T.Vector3(),leak:new T.Vector3(.01,.02,.015),node:new T.Group()}));
const root=new T.Group(),camera=new T.PerspectiveCamera();camera.position.set(0,0,6);root.position.set(1,2,0);root.scale.setScalar(1.5);root.updateMatrixWorld(true);const scatter=new ManaScatter(pieces);root.add(scatter.mesh);
scatter.update(1080,root,camera);assert.equal(scatter.mesh.visible,false);
for(const t of [1100,1600,2200]){pieces.forEach((p,i)=>{p.node.position.set(i*.02,i*.01,.5);p.node.rotation.set(.2,.4,.1);});scatter.update(t,root,camera);assert(scatter.mesh.visible);assert(scatter.mesh.geometry.attributes.position.array.every(Number.isFinite));}
scatter.update(1600,root,camera);const before=Array.from(scatter.mesh.geometry.attributes.position.array);pieces[0].node.position.x+=1;scatter.update(1600,root,camera);assert.notDeepEqual(Array.from(scatter.mesh.geometry.attributes.position.array),before,'streams follow moving fragments');
assert(scatter.mesh.geometry.index.count<=24*20*6,'bounded single mesh');scatter.update(2940,root,camera);assert.equal(scatter.mesh.visible,false);
let disposed=0;scatter.mesh.geometry.addEventListener('dispose',()=>disposed++);scatter.mesh.material.addEventListener('dispose',()=>disposed++);scatter.dispose();assert.equal(disposed,2);
console.log('PASS bounded fragment-attached mana mesh: finite depth geometry, active window, movement, geometry/material disposal.');
