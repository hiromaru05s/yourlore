/** Bake a flat vector print into the existing GLBs. Geometry stays byte-identical.
 * Source is pinned so repeated builds do not accumulate UVs or stale textures.
 * Run: node scripts/build-board-pattern.mjs
 */
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const base='client/public/models/reading-board/v1/';
const sourceRef='d2ff0fee320c13e7d74e4eb2e4b101b37b59819b';
const svg=await fs.readFile(base+'biblion-surface-v2.svg');
const report=[];
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const low of [false,true]){
 const name=low?'board-low.glb':'board.glb';
 const source=execFileSync('git',['show',sourceRef+':'+base+name],{maxBuffer:16*1024*1024});
 const jsonBytes=source.readUInt32LE(12),g=JSON.parse(source.subarray(20,20+jsonBytes).toString());
 const binStart=28+jsonBytes,bin=source.subarray(binStart,binStart+source.readUInt32LE(20+jsonBytes));
 const chunks=g.bufferViews.map(v=>Buffer.from(bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength)));
 const material=g.materials.find(m=>m.name==='02_IvoryWeave');
 const tex=g.textures[material.pbrMetallicRoughness.baseColorTexture.index],image=g.images[tex.source];
 const png=await sharp(svg).resize(low?1024:2048,low?630:1260).png({compressionLevel:9,palette:true,colours:32}).toBuffer();
 chunks[image.bufferView]=png;image.mimeType='image/png';image.name='Biblion flowing flat border';
 delete material.normalTexture;delete material.occlusionTexture;
 delete material.pbrMetallicRoughness.metallicRoughnessTexture;
 material.pbrMetallicRoughness.roughnessFactor=.88;material.pbrMetallicRoughness.metallicFactor=0;
 material.name='02_IvoryWeave'; // Stable authored material identity, now with a flat print.
 const matIndex=g.materials.indexOf(material);let vertices=0;
 for(const mesh of g.meshes)for(const p of mesh.primitives)if(p.material===matIndex){
  const pos=g.accessors[p.attributes.POSITION],view=g.bufferViews[pos.bufferView],data=chunks[pos.bufferView];
  const uv=Buffer.alloc(pos.count*8);vertices+=pos.count;
  for(let i=0;i<pos.count;i++){
   const at=(pos.byteOffset||0)+i*(view.byteStride||12),x=data.readFloatLE(at),z=data.readFloatLE(at+8);
   uv.writeFloatLE((x+.756)/1.404,i*8);uv.writeFloatLE((z+.432)/.864,i*8+4);
  }
  const viewIndex=g.bufferViews.length;g.bufferViews.push({buffer:0,byteLength:uv.length,target:34962});chunks.push(uv);
  const accIndex=g.accessors.length;g.accessors.push({bufferView:viewIndex,componentType:5126,count:pos.count,type:'VEC2'});p.attributes.TEXCOORD_0=accIndex;
 }
 // Remove the now-unused weave normal/roughness images instead of shipping them.
 const usedTextures=new Set();const visit=(v,fn)=>{if(v&&typeof v==='object')for(const [k,x]of Object.entries(v)){if(k.endsWith('Texture')&&x&&typeof x==='object'&&'index'in x)fn(x);else visit(x,fn);}};
 visit(g.materials,x=>usedTextures.add(x.index));
 const textureIds=[...usedTextures].sort((a,b)=>a-b),textureMap=new Map(textureIds.map((n,i)=>[n,i]));
 visit(g.materials,x=>{x.index=textureMap.get(x.index);});g.textures=textureIds.map(i=>g.textures[i]);
 const usedImages=[...new Set(g.textures.map(t=>t.source))].sort((a,b)=>a-b),imageMap=new Map(usedImages.map((n,i)=>[n,i]));
 const removedViews=new Set(g.images.filter((_,i)=>!imageMap.has(i)).map(im=>im.bufferView));
 g.images=usedImages.map(i=>g.images[i]);for(const t of g.textures)t.source=imageMap.get(t.source);
 const viewIds=g.bufferViews.map((_,i)=>i).filter(i=>!removedViews.has(i)),viewMap=new Map(viewIds.map((n,i)=>[n,i]));
 for(const a of g.accessors)if(a.bufferView!=null)a.bufferView=viewMap.get(a.bufferView);
 for(const im of g.images)im.bufferView=viewMap.get(im.bufferView);
 let size=0;const output=[];g.bufferViews=viewIds.map(i=>{const bytes=chunks[i],pad=(4-bytes.length%4)%4;const v={...g.bufferViews[i],byteOffset:size,byteLength:bytes.length};output.push(bytes,Buffer.alloc(pad));size+=bytes.length+pad;return v;});
 g.buffers=[{byteLength:size}];g.asset.extras={...g.asset.extras,loreSurface:'biblion-flat-binding-v2',sourceRef};
 let json=Buffer.from(JSON.stringify(g));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
 const header=Buffer.alloc(20),binaryHeader=Buffer.alloc(8);header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+size,8);header.writeUInt32LE(json.length,12);header.write('JSON',16);binaryHeader.writeUInt32LE(size);binaryHeader.writeUInt32LE(0x004e4942,4);
 const glb=Buffer.concat([header,json,binaryHeader,...output]);await fs.writeFile(base+name,glb);
 // Existing POSITION/NORMAL/index buffers are retained verbatim in the repack.
 for(const mesh of g.meshes)for(const p of mesh.primitives)for(const key of ['POSITION','NORMAL','indices']){
  const id=key==='indices'?p.indices:p.attributes[key];if(id==null)continue;const a=g.accessors[id],v=g.bufferViews[a.bufferView],oldView=viewIds[a.bufferView];
  if(!Buffer.concat(output).subarray(v.byteOffset,v.byteOffset+v.byteLength).equals(chunks[oldView]))throw Error('Geometry changed');
 }
 report.push({file:name,sourceRef,sourceSha256:hash(source),sha256:hash(glb),beforeBytes:source.length,afterBytes:glb.length,textureSize:low?[1024,630]:[2048,1260],surfaceVertices:vertices,geometryUnchanged:true,normalTexture:false,roughness:.88});
}
await fs.writeFile('docs/ui-rework/2026-09-29-board-border/assets.json',JSON.stringify({sourceSvgSha256:hash(svg),assets:report},null,2)+'\n');
console.log(report);
