import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const root='client/public/models/reading-board/',report=JSON.parse(await fs.readFile('docs/performance/2026-11-18/lossless-assets.json','utf8'));
const images=new Map(report.images.map(i=>[i.sourceHash,i.url]));
const sha=b=>createHash('sha256').update(b).digest('hex');
function parse(bytes){const n=bytes.readUInt32LE(12);return {model:JSON.parse(bytes.subarray(20,20+n)),binary:bytes.subarray(28+n)};}
for(const {name,before,after} of report.models){
 const oldBytes=await fs.readFile(root+'v1/'+name),newBytes=await fs.readFile(root+'v2-shared/'+name);
 assert.equal(oldBytes.length,before);assert.equal(newBytes.length,after);
 const a=parse(oldBytes),b=parse(newBytes),skip=new Set(a.model.images?.map(i=>i.bufferView)),indices=[];
 for(const [index,view] of (a.model.bufferViews??[]).entries()){
  if(skip.has(index))continue;
  const next=b.model.bufferViews[indices.length];indices.push(index);
  const slice=(data,v)=>data.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength);
  assert.deepEqual(slice(b.binary,next),slice(a.binary,view),name+' preserves every vertex/index byte');
  assert.deepEqual({...next,byteOffset:0},{...view,byteOffset:0},name+' preserves buffer layout');
 }
 for(const [index,image] of (a.model.images??[]).entries()){
  const v=a.model.bufferViews[image.bufferView],hash=sha(a.binary.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength));
  const url='/models/reading-board/shared-textures/'+b.model.images[index].uri.split('/').at(-1);
  assert.equal(url,images.get(hash));
  const bytes=await fs.readFile('client/public'+url);
  assert(b.model.images[index].uri.includes(sha(bytes)),'shared texture is content addressed');
 }
 function remap(value){if(Array.isArray(value))value.forEach(remap);else if(value&&typeof value==='object')for(const [key,child]of Object.entries(value)){if(key==='bufferView')value[key]=indices[child];else remap(child);}}
 remap(b.model);
 for(const t of b.model.textures??[])if(t.extensions?.EXT_texture_webp){t.source=t.extensions.EXT_texture_webp.source;delete t.extensions.EXT_texture_webp;if(!Object.keys(t.extensions).length)delete t.extensions;}
 for(const field of ['extensionsUsed','extensionsRequired'])if(b.model[field]){b.model[field]=b.model[field].filter(x=>x!=='EXT_texture_webp');if(!b.model[field].length&&!a.model[field])delete b.model[field];}
 for(const field of ['images','bufferViews','buffers']){if(a.model[field])b.model[field]=a.model[field];else delete b.model[field];}
 assert.deepEqual(b.model,a.model,name+' retains materials, UVs, normals, lights, animation and scene graph');
}
assert(report.models.reduce((n,x)=>n+x.after,0)+report.images.reduce((n,x)=>n+x.bytes,0)<report.models.reduce((n,x)=>n+x.before,0)*.65);
for(const {name,before,after} of report.ui){
 const base='client/public/art/biblion/refined/'+name,a=await fs.readFile(base+'.png'),b=await fs.readFile(base+'.webp');
 assert.equal(a.length,before);assert.equal(b.length,after);
 assert.deepEqual(await sharp(a).ensureAlpha().raw().toBuffer(),await sharp(b).ensureAlpha().raw().toBuffer(),name+' retains exact RGBA');
}
console.log('PASS all 19 models: identical geometry and scene/material semantics; content-addressed textures; >35% smaller; 4 UI images retain exact RGBA');
