import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({stdin:{contents:`export * as T from 'three';export {applyZenoToonSurface} from './client/src/ui/zenoToonSurface';export {buildMoonRabbit} from './client/src/ui/zenoRig';export {buildDewFront} from './client/src/ui/manaSpiritFront';export {createSpiritMotion} from './client/src/ui/manaSpiritMotion';`,resolveDir:process.cwd()},bundle:true,format:'esm',write:false,platform:'node'});
const {T,applyZenoToonSurface,buildMoonRabbit,buildDewFront,createSpiritMotion}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const body=new T.Group(),pearl=new T.MeshPhysicalMaterial(),face=new T.Mesh(new T.SphereGeometry(.47),new T.MeshPhysicalMaterial());body.add(face);
const smile=new T.MeshStandardMaterial({emissive:0xffffff,emissiveIntensity:.2,transparent:true,opacity:0,depthWrite:false});
const expression=new T.Mesh(new T.TorusGeometry(),smile);body.add(expression);
buildDewFront(body);const rig=buildMoonRabbit(body,pearl),old=new Map();body.traverse(o=>{if(o.isMesh)old.set(o,o.material);});
const disposed=new Map();for(const m of new Set(old.values()))m.addEventListener('dispose',()=>disposed.set(m,(disposed.get(m)||0)+1));
applyZenoToonSurface(body,pearl,face);
assert.equal(expression.material,smile,'Expression opacity must animate the original material');smile.opacity=.8;assert.equal(expression.material.opacity,.8);
assert.equal(face.material.isShaderMaterial,true);
for(const [mesh,material] of old){if(mesh.material!==material&&material!==pearl)assert.equal(disposed.get(material),1,'Replaced shared material disposed once');}
assert.equal(disposed.has(pearl),false,'Renderer retains ownership of pearl');assert.equal(disposed.has(smile),false);
const contours=[];body.traverse(o=>{if(o.name==='toon-colored-contour')contours.push(o);});assert.equal(contours.length,8);
for(const o of contours){assert.equal(o.geometry,o.parent.geometry);assert.equal(o.castShadow,false);assert.equal(o.material.side,T.BackSide);}
const ear=body.getObjectByName('rabbit-ear-left').children[0],outline=ear.children[0];
const initial=Array.from(ear.geometry.attributes.position.array),pose=createSpiritMotion(false).tick(0);
for(let frame=0;frame<180;frame++)rig.update({...pose,mood:'sleepy',elapsed:frame/60},1/60,frame/60);
assert.notDeepEqual(Array.from(ear.geometry.attributes.position.array),initial,'Sleep deforms the ear');
assert.equal(outline.geometry.attributes.position,ear.geometry.attributes.position,'Outline follows every ear update without a stale copy');
const renderer={getSize(v){return v.set(400,300);}},camera=new T.PerspectiveCamera();camera.updateMatrixWorld();
outline.material.onBeforeRender(renderer,null,camera);assert.deepEqual(outline.material.uniforms.pixelSize.value.toArray(),[2/400,2/300]);
renderer.getSize=v=>v.set(200,150);outline.material.onBeforeRender(renderer,null,camera);assert.deepEqual(outline.material.uniforms.pixelSize.value.toArray(),[2/200,2/150]);
face.material.onBeforeRender(renderer,null,camera);assert.equal(face.material.uniformsNeedUpdate,true);
console.log('PASS toon expression identity, shared material disposal, deforming contours and resize uniforms');
