import * as T from 'three';
// Multi-scale surface relief is painted once, then physically lit as normal/bump detail.
function rng(seed=91){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
export function reliefTexture(mode:'stone'|'vellum'|'metal'){
 const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d')!,r=rng();
 x.fillStyle=mode==='vellum'?'#c3b5a0':mode==='metal'?'#737373':'#515151';x.fillRect(0,0,512,512);
 for(let i=0;i<22000;i++){const a=r(),p=r()*512,q=r()*512;x.fillStyle=`rgba(${a>.5?'237,233,215':'19,16,20'},${.02+r()*.10})`;x.fillRect(p,q,mode==='metal'?1:1+r()*3,mode==='metal'?5+r()*23:1+r()*4);}
 if(mode==='stone'){for(let k=0;k<65;k++){let px=r()*512,py=r()*512;x.beginPath();x.moveTo(px,py);for(let j=0;j<9;j++){px+=r()*22-11;py+=r()*23;x.lineTo(px,py);}x.strokeStyle=k%3?'#1e182b66':'#b0a5b755';x.lineWidth=.4+r()*1.2;x.stroke();}}
 if(mode==='vellum'){x.strokeStyle='#382b36cc';x.lineWidth=2.8;for(let row=0;row<12;row++)for(let col=0;col<5;col++){const px=35+col*94,py=32+row*40;x.beginPath();x.moveTo(px,py);x.lineTo(px+7,py-7);x.lineTo(px+14,py+1);x.moveTo(px+8,py-10);x.lineTo(px+8,py+10);if(r()>.4){x.moveTo(px+21,py-6);x.lineTo(px+29,py-6);x.lineTo(px+25,py+7);}x.stroke();}}
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;return tex;
}
export function shardGeometry(seed:number){
 const r=rng(seed),geo=new T.IcosahedronGeometry(1,2);const p=geo.getAttribute('position');for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),n=1+.08*Math.sin(x*17+y*13+z*9+seed);p.setXYZ(i,x*n,y*n,z*n);}
 geo.computeVertexNormals();const uv=new Float32Array(p.count*2);for(let i=0;i<p.count;i++){uv[i*2]=p.getX(i)*.5+.5;uv[i*2+1]=p.getY(i)*.5+.5;}geo.setAttribute('uv',new T.BufferAttribute(uv,2));void r;return geo;
}
// Bent ribbons have persistent topology, tapered frayed edges and real reverse sides.
export class Ribbon {
 readonly geometry=new T.PlaneGeometry(1,1,12,64);
 readonly mesh:T.Mesh<T.PlaneGeometry,T.MeshPhysicalMaterial>;
 constructor(mat:T.MeshPhysicalMaterial){this.mesh=new T.Mesh(this.geometry,mat);this.mesh.frustumCulled=false;this.mesh.castShadow=this.mesh.receiveShadow=true;}
 update(fn:(u:number,v:number)=>[number,number,number]){const p=this.geometry.getAttribute('position');for(let j=0;j<=64;j++)for(let i=0;i<=12;i++)p.setXYZ(j*13+i,...fn(i/12*2-1,j/64));p.needsUpdate=true;this.geometry.computeVertexNormals();}
 dispose(){this.geometry.dispose();}
}
/** A deterministic fractured mineral field. Albedo, relief and emission share cracks. */
export function mineralTextures(){
 const size=512,r=rng(332),seeds=Array.from({length:37},()=>[r()*size,r()*size]);const maps=[document.createElement('canvas'),document.createElement('canvas')];maps.forEach(c=>c.width=c.height=size);const images=maps.map(c=>c.getContext('2d')!.createImageData(size,size));
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){let first=1e9,second=1e9,index=0;for(let j=0;j<seeds.length;j++){const dx=x-seeds[j][0]+Math.sin(y*.041+x*.019)*3,dy=y-seeds[j][1]+Math.sin(x*.027-y*.035)*4,d=dx*dx+dy*dy;if(d<first){second=first;first=d;index=j;}else if(d<second)second=d;}
 const gap=Math.sqrt(second)-Math.sqrt(first),vein=Math.max(0,1-gap/2.4),grain=(r()-.5)*26,shade=61+19*Math.sin(index*2.71)+grain+6*Math.sin(x*.11+y*.08),i=(y*size+x)*4;
 images[0].data.set([shade+vein*61,shade+vein*55,shade+vein*65,255],i);images[1].data.set([vein*255,vein*210,vein*110,255],i);}
 return maps.map((c,i)=>{c.getContext('2d')!.putImageData(images[i],0,0);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return t;}) as [T.CanvasTexture,T.CanvasTexture];
}
