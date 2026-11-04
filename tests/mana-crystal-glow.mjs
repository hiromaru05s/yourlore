import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
const out=new URL('../.cache/mana-glow-test.mjs',import.meta.url);await fs.mkdir(new URL('.',out),{recursive:true});
await build({entryPoints:['client/src/ui/manaCrystalGlow.ts'],bundle:true,platform:'node',format:'esm',external:['three'],outfile:out.pathname});
const {createManaCrystalGlow}=await import(out.href);const T=await import('three');
const glow=createManaCrystalGlow(),parent=new T.Group(),tray=glow.addTray(parent);
const ready=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial(),30);ready.position.x=.0415;
const matrix=new T.Matrix4(),p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3();
for(let i=0;i<30;i++){matrix.compose(new T.Vector3(i*.023,.003,-.019),q,new T.Vector3().setScalar(.46));ready.setMatrixAt(i,matrix);}
const halo=parent.getObjectByName('available-mana-glow'),lamp=parent.getObjectByName('available-mana-reflection');
ready.count=2;tray.sync(ready);glow.tick(0,800,false);assert.equal(halo.count,2);assert.equal(halo.visible,true);halo.getMatrixAt(1,matrix);matrix.decompose(p,q,s);
assert(Math.abs(p.x-(.023+.0415))<1e-7);assert(Math.abs(p.y-.007)<1e-7);assert(Math.abs(s.x-.46*1.18)<1e-7);assert(lamp.intensity>0);
let paints=0;for(let ms=0;ms<1000;ms+=1000/60)paints+=Number(glow.tick(ms,800,false));assert(paints<=8,`idle HDR refreshes ${paints}`);
assert.equal(glow.tick(1200,800,true),true);assert.equal(glow.tick(1300,800,true),false);
ready.count=30;tray.sync(ready);assert.equal(halo.count,30);assert(parent.children.filter(o=>o instanceof T.PointLight).length===1);
ready.count=0;tray.sync(ready);assert.equal(halo.visible,false);assert.equal(halo.count,0);assert.equal(lamp.intensity,0);assert.equal(glow.tick(3000,800,false),false);
// The glow follows visible instances, never a future gameplay maximum.
ready.count=1;matrix.makeTranslation(.1,.2,.3);ready.setMatrixAt(0,matrix);tray.sync(ready);assert.equal(halo.count,1);halo.getMatrixAt(0,matrix);matrix.decompose(p,q,s);assert(Math.abs(p.y-.204)<1e-6);
const physical=new T.MeshPhysicalMaterial();let called=0;physical.onBeforeCompile=()=>called++;physical.customProgramCacheKey=()=> 'optics';glow.applyMaterial(physical);
const shader={uniforms:{},vertexShader:'',fragmentShader:'uniform vec4 crystalPlanes[1];pos+=ray*distance;\n#include <emissivemap_fragment>'};physical.onBeforeCompile(shader,{});assert.equal(called,1);assert(shader.fragmentShader.includes('pow(core,5.4)*6.0'));assert(shader.uniforms.manaGlowBreath);assert(physical.customProgramCacheKey().startsWith('optics-'));
const disposed=[];halo.geometry.addEventListener('dispose',()=>disposed.push('geometry'));halo.material.addEventListener('dispose',()=>disposed.push('material'));glow.dispose();glow.dispose();assert.equal(parent.children.length,0);assert.deepEqual(disposed,['geometry','material']);assert.equal(glow.tick(4000,800,false),false);ready.geometry.dispose();ready.material.dispose();physical.dispose();
await fs.unlink(out);console.log('PASS: ready-instance anchoring, 0/2/30 mana, bounded idle updates, reduced motion, material composition and disposal');
