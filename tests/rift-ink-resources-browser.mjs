import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-opening-tools/node_modules/playwright/index.mjs');
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage(),origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5279';
try{
 await page.route('**/ink-resource-fixture',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));
 await page.goto(origin+'/ink-resource-fixture');
 const result=await page.evaluate(async()=>{
  const {RiftInkMaterial}=await import('/src/ui/riftInkMaterial.ts');
  const proto=WebGLRenderingContext.prototype,upload=proto.texImage2D,remove=proto.deleteTexture;
  let uploads=0;const deleted=new Set();
  proto.texImage2D=function(...args){uploads++;return upload.apply(this,args);};
  proto.deleteTexture=function(texture){deleted.add(texture);return remove.call(this,texture);};
  const material=new RiftInkMaterial();
  const faces=['#ff0000','#00ff00','#0000ff'].map(color=>{const c=document.createElement('canvas');c.width=32;c.height=48;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,32,48);return c;});
  uploads=0;const colors=[];
  try{
   for(let repeat=0;repeat<8;repeat++)for(const face of faces){const canvas=material.draw(face,0,1.5,224);if(repeat===7){const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;const ctx=c.getContext('2d');ctx.drawImage(canvas,0,0);colors.push([...ctx.getImageData(c.width/2,c.height/2,1,1).data]);}}
   const cachedUploads=uploads;material.forgetFace();const deletedAtRelease=deleted.size;material.draw(faces[0],0,1.5,224);const uploadsAfterReuse=uploads;
   // More than the bounded cache still renders and releases all extra textures.
   for(let i=0;i<12;i++)material.draw(document.createElement('canvas'),0,1.5,224);
   material.forgetFace();return {cachedUploads,deletedAtRelease,uploadsAfterReuse,colors,deletedAfterEviction:deleted.size};
  }finally{material.dispose();proto.texImage2D=upload;proto.deleteTexture=remove;}
 });
 assert.equal(result.cachedUploads,3);assert.equal(result.uploadsAfterReuse,4);assert.equal(result.deletedAtRelease,2);
 for(const [i,color] of result.colors.entries()){assert(color[i]>240);assert(color.filter((_,j)=>j<3&&j!==i).every(v=>v<5));assert.equal(color[3],255);}
 assert.equal(result.deletedAfterEviction,14);console.log('PASS: concurrent immutable faces upload once, retain distinct colors, bounded eviction and release',result);
}finally{await browser.close();}
