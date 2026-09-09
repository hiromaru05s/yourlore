// Contract checks on the actual exported GLBs, not procedural source constants.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const directory='client/public/models/library-furniture/v2';
const results=[];
for(const name of ['shelf','shelf-low','supply','supply-low']){
 const bytes=await fs.readFile(`${directory}/${name}.glb`);assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);
 const jsonLength=bytes.readUInt32LE(12),g=JSON.parse(bytes.toString('utf8',20,20+jsonLength)),bin=bytes.subarray(28+jsonLength);
 const low=name.endsWith('-low'),shelf=name.startsWith('shelf'),bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};let triangles=0,vertices=0,draws=0;
 assert.equal(g.images?.length||0,0);assert.equal(g.cameras?.length||0,0);assert(!g.extensionsUsed?.includes('KHR_lights_punctual'));
 const root=g.nodes.find(n=>n.name===(shelf?'cosmetic_root':'supply_root'));assert(root);assert.deepEqual(root.translation||[0,0,0],[0,0,0]);assert.deepEqual(root.rotation||[0,0,0,1],[0,0,0,1]);assert.deepEqual(root.scale||[1,1,1],[1,1,1]);
 assert(g.nodes.some(n=>n.name===(shelf?'shelf_mount':'supply_mount')));
 for(const n of g.nodes)if(n.mesh!=null){assert(!n.matrix);assert.deepEqual(n.translation||[0,0,0],[0,0,0]);assert.deepEqual(n.rotation||[0,0,0,1],[0,0,0,1]);assert.deepEqual(n.scale||[1,1,1],[1,1,1]);}
 for(const mesh of g.meshes)for(const p of mesh.primitives){
  assert.equal(p.mode??4,4);draws++;triangles+=g.accessors[p.indices].count/3;
  const a=g.accessors[p.attributes.POSITION],v=g.bufferViews[a.bufferView],offset=(v.byteOffset||0)+(a.byteOffset||0);assert.equal(a.componentType,5126);vertices+=a.count;
  for(let i=0;i<a.count;i++){
   const xyz=[0,1,2].map(k=>bin.readFloatLE(offset+i*(v.byteStride||12)+k*4)/.064);
   xyz.forEach((x,k)=>{assert(Number.isFinite(x));bounds.min[k]=Math.min(bounds.min[k],x);bounds.max[k]=Math.max(bounds.max[k],x);});
   const [x,y,z]=xyz;
   if(shelf){assert(Math.abs(x)<=.77001&&y>=-.12001&&y<=.28001&&Math.abs(z)<=1.08001,'shelf external envelope');assert(!(Math.abs(x)<.60&&y>.003&&y<.27&&z>-.83&&z<.83),'protected card cavity');}
  }
 }
 assert(triangles<=(low?3000:12000));assert(draws<=(low?1:3));assert(bytes.length<640*1024);
 if(shelf)assert(Math.abs(bounds.min[1]+.12)<1e-5,'foot rests at the shared mount offset');
 results.push({name,bytes:bytes.length,triangles,vertices,draws,boundsU:bounds});
}
await fs.writeFile('docs/3d-assets/2026-09-09-release-furniture/geometry-checks.json',JSON.stringify(results,null,2));console.log('PASS: GLB geometry, units, mounts, cavity, bounds and draw/triangle budgets',JSON.stringify(results.map(({name,bytes,triangles,draws})=>({name,bytes,triangles,draws}))));
