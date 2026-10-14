import * as T from 'three';
type Vertex={p:T.Vector3,n:T.Vector3};
/** Cut the actual incoming crystal, preserving its outer normals and sealing each fracture face. */
export function cutCrystal(source:T.BufferGeometry,lo:number,hi:number,loSlope=0,hiSlope=0){
 const pos=source.getAttribute('position'),normal=source.getAttribute('normal'),index=source.getIndex()!,positions:number[]=[],normals:number[]=[];
 const caps:[Vertex[],Vertex[]]=[[],[]];
 const emit=(v:Vertex)=>{positions.push(v.p.x,v.p.y,v.p.z);normals.push(v.n.x,v.n.y,v.n.z);};
 const clip=(poly:Vertex[],bound:number,sign:number,cap:Vertex[],slope:number)=>{const out:Vertex[]=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=a.p.x+a.p.y*slope-bound,db=b.p.x+b.p.y*slope-bound,insideA=da*sign>=-1e-7,insideB=db*sign>=-1e-7;if(insideA)out.push(a);if(insideA!==insideB){const t=-da/(db-da),v={p:a.p.clone().lerp(b.p,t),n:a.n.clone().lerp(b.n,t).normalize()};out.push(v);cap.push(v);}}return out;};
 for(let i=0;i<index.count;i+=3){let poly:Vertex[]=[];for(let j=0;j<3;j++){const k=index.getX(i+j);poly.push({p:new T.Vector3().fromBufferAttribute(pos,k),n:new T.Vector3().fromBufferAttribute(normal,k)});}poly=clip(poly,lo,1,caps[0],loSlope);poly=clip(poly,hi,-1,caps[1],hiSlope);for(let j=1;j<poly.length-1;j++){emit(poly[0]);emit(poly[j]);emit(poly[j+1]);}}
 for(let side=0;side<2;side++){const verts=caps[side].filter((v,i,a)=>a.findIndex(w=>w.p.distanceToSquared(v.p)<1e-12)===i);if(verts.length<3)continue;const center=verts.reduce((p,v)=>p.add(v.p),new T.Vector3()).multiplyScalar(1/verts.length),n=new T.Vector3(side?1:-1,(side?hiSlope:-loSlope),0).normalize();verts.sort((a,b)=>Math.atan2(a.p.z-center.z,a.p.y-center.y)-Math.atan2(b.p.z-center.z,b.p.y-center.y));for(let j=0;j<verts.length;j++){emit({p:center,n});emit({p:verts[side?j:(j+1)%verts.length].p,n});emit({p:verts[side?(j+1)%verts.length:j].p,n});}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.computeBoundingSphere();return g;
}
