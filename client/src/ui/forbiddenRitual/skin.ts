import * as T from 'three';
/** Closed, deformable sheet: face, physical back, and cut edges share vertices. */
export class Skin {
 readonly mesh:T.Mesh;readonly geo=new T.BufferGeometry();readonly coords:[number,number,number][]=[];
 constructor(material:T.Material,nx=18,ny=26,readonly thickness=.025){
  const uv:number[]=[],indices:number[]=[];
  for(let side=0;side<2;side++)for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){this.coords.push([i/nx,j/ny,side]);uv.push(i/nx,j/ny);}
  const count=(nx+1)*(ny+1);
  for(let s=0;s<2;s++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=s*count+j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;if(!s)indices.push(a,b,d,a,d,c);else indices.push(a,d,b,a,c,d);}
  const edge=(a:number,b:number)=>{const at=this.coords.length;for(const j of [a,a+count,b+count,b]){this.coords.push([...this.coords[j]]);uv.push(uv[j*2],uv[j*2+1]);}indices.push(at,at+1,at+2,at,at+2,at+3);};
  for(let i=0;i<nx;i++){edge(i+1,i);edge(ny*(nx+1)+i,ny*(nx+1)+i+1);}
  for(let j=0;j<ny;j++){edge(j*(nx+1),(j+1)*(nx+1));edge((j+1)*(nx+1)+nx,j*(nx+1)+nx);}
  this.geo.setAttribute('position',new T.BufferAttribute(new Float32Array(this.coords.length*3),3));this.geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));this.geo.setIndex(indices);
  this.mesh=new T.Mesh(this.geo,material);this.mesh.castShadow=true;this.mesh.receiveShadow=true;this.mesh.frustumCulled=false;
 }
 update(fn:(u:number,v:number)=>[number,number,number],thickness=this.thickness){
  const a=this.geo.attributes.position as T.BufferAttribute;
  this.coords.forEach(([u,v,side],i)=>{const p=fn(u,v);a.setXYZ(i,p[0],p[1],p[2]-side*thickness);});a.needsUpdate=true;this.geo.computeVertexNormals();
 }
}
