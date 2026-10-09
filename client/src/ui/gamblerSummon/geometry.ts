import * as T from 'three';
import {clamp} from './catalog';
export type Region={a0:number;a1:number;r0:number;r1:number;index:number};
export type Form={morph:number;volume:number;spin:number;activity:number;time:number;style:number;legend:boolean};
const TAU=Math.PI*2;
function cardRadius(a:number){const x=Math.abs(Math.cos(a)),y=Math.abs(Math.sin(a))/1.5;return Math.pow(Math.pow(x,18)+Math.pow(y,18),-1/18)}
function roundedProfile(r:number){return .055*Math.exp(-Math.pow((r-.92)/.025,2))+.042*Math.exp(-Math.pow((r-.84)/.016,2))+.045*Math.exp(-Math.pow((r-.39)/.024,2))+.12*Math.exp(-Math.pow(r/.15,4))}
export class SolidRegion {
 geometry:T.BufferGeometry;mesh:T.Mesh;coords:Array<[number,number,number,number]>=[];region:Region;angular:number;radial:number;
 constructor(region:Region,front:T.Material,body:T.Material,back:T.Material){
  this.region=region;this.angular=Math.max(12,Math.ceil((region.a1-region.a0)/TAU*144));this.radial=Math.max(7,Math.ceil((region.r1-region.r0)*26));
  const A=this.angular,R=this.radial,N=(A+1)*(R+1),indices:number[]=[],uv:number[]=[],wuv:number[]=[];
  for(let layer=0;layer<2;layer++)for(let j=0;j<=R;j++)for(let i=0;i<=A;i++){
   const a=region.a0+(region.a1-region.a0)*i/A,r=region.r0+(region.r1-region.r0)*j/R;
   this.coords.push([a,r,layer,j/R]);const radius=cardRadius(a);uv.push(layer===0?(Math.cos(a)*radius*r+1)/2:.5+Math.cos(a)*r*.5,layer===0?(Math.sin(a)*radius*r+1.5)/3:.5+Math.sin(a)*r*.5);wuv.push(.5+Math.cos(a)*r*.5,.5+Math.sin(a)*r*.5);
  }
  const top:number[]=[];for(let j=0;j<R;j++)for(let i=0;i<A;i++){const a=j*(A+1)+i,b=a+1,d=a+A+1,e=d+1;top.push(a,d,b,b,d,e)}
  indices.push(...top);const frontCount=indices.length;
  for(let i=0;i<top.length;i+=3)indices.push(top[i]+N,top[i+2]+N,top[i+1]+N);
  const edges:number[][]=[];for(let i=0;i<A;i++){if(region.r0>0)edges.push([i,i+1]);edges.push([R*(A+1)+i+1,R*(A+1)+i])}if(region.a1-region.a0<TAU-.0001)for(let j=0;j<R;j++){edges.push([(j+1)*(A+1),j*(A+1)]);edges.push([j*(A+1)+A,(j+1)*(A+1)+A])}
  for(const [a,b]of edges)indices.push(a,b,a+N,b,b+N,a+N);
  this.geometry=new T.BufferGeometry();this.geometry.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(this.coords.length*3),3));this.geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));this.geometry.setAttribute('wheelUv',new T.Float32BufferAttribute(wuv,2));this.geometry.setIndex(indices);this.geometry.addGroup(0,frontCount,0);this.geometry.addGroup(frontCount,frontCount,2);this.geometry.addGroup(frontCount*2,indices.length-frontCount*2,1);
  this.mesh=new T.Mesh(this.geometry,[front,body,back]);this.mesh.castShadow=true;this.mesh.receiveShadow=true;this.mesh.frustumCulled=false;
 }
 update(f:Form){
  const {morph:m,volume:v,activity:e,style:s,time:t}=f,reg=this.region;
  const positions=this.geometry.attributes.position as T.BufferAttribute;
  const thickness=.014+v*([.24,.28,.29,.22,.38][s])*(f.legend?1.14:1);
  for(let i=0;i<this.coords.length;i++){
   const [a,r,layer,q]=this.coords[i];const radius=cardRadius(a);
   let angle=a,rr=r,extraZ=0;
   if(s===1){angle+=Math.sin(reg.index*.48+t*3)*.028*e;rr+=.017*e*Math.sin(q*Math.PI);extraZ=.042*e*Math.sin(reg.index/12*TAU+t*3);}
   if(s===2){rr+=Math.sin(a*5-t*9+r*5)*.04*e*(.3+r);angle+=Math.sin(r*5-t*5)*.11*e;extraZ=Math.sin(r*10-a*3-t*11)*.065*e*Math.sin(Math.PI*r);}
   if(s===4){angle+=r*r*Math.sin(t*Math.PI)*.10*e;}
   const outer=(radius*(1-m)+1.33*m)*rr;
   const boundary=Math.min(q,1-q),bevel=(1-Math.min(1,boundary/.10))*.025*v;
   const profile=roundedProfile(r)*v;
   const z=layer===0?thickness*.50+profile-bevel+extraZ:-thickness*.50+bevel+extraZ*.2;
   positions.setXYZ(i,Math.cos(angle)*outer,Math.sin(angle)*outer,z);
  }
  positions.needsUpdate=true;this.geometry.computeVertexNormals();
  if(reg.a1-reg.a0>TAU-.0001){const normals=this.geometry.attributes.normal as T.BufferAttribute;const A=this.angular,R=this.radial,N=(A+1)*(R+1);for(let layer=0;layer<2;layer++)for(let j=0;j<=R;j++){const i=layer*N+j*(A+1),k=i+A;const vec=new T.Vector3(normals.getX(i)+normals.getX(k),normals.getY(i)+normals.getY(k),normals.getZ(i)+normals.getZ(k)).normalize();normals.setXYZ(i,vec.x,vec.y,vec.z);normals.setXYZ(k,vec.x,vec.y,vec.z);}normals.needsUpdate=true;}
  this.mesh.rotation.set(0,0,0);this.mesh.position.set(0,0,0);
  if(s===3){this.mesh.rotation.z=f.spin*(reg.index===1?-1:reg.index===2?2:1);this.mesh.position.z=[.11,.015,-.05][reg.index]*v;}
  else this.mesh.rotation.z=f.spin;
  if(s===1)this.mesh.position.z+=Math.sin(reg.index/12*TAU+t*4)*.018*e;
 }
 dispose(){this.geometry.dispose()}
}
export function regions(style:number):Region[]{
 if(style===1)return Array.from({length:12},(_,index)=>({a0:index/12*TAU,a1:(index+1)/12*TAU,r0:0,r1:1,index}));
 if(style===3)return [[0,.36],[.36,.78],[.78,1]].map(([r0,r1],index)=>({a0:0,a1:TAU,r0,r1,index}));
 return [{a0:0,a1:TAU,r0:0,r1:1,index:0}];
}
export function motion(style:number,t:number,reduced:boolean){
 if(reduced)return {morph:0,volume:0,spin:0,activity:0,time:1,style,legend:false};
 const timings=[[.10,.38,.66,.94],[.08,.42,.62,.95],[.05,.43,.61,.96],[.13,.35,.69,.95],[.08,.34,.72,.97]][style];
 const s=(x:number)=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10)};const ramp=(a:number,b:number)=>s((t-a)/(b-a));
 const morph=ramp(timings[0],timings[1])*(1-ramp(timings[2],timings[3]));
 const activity=Math.sin(Math.PI*clamp((t-.04)/.91));
 const full=Math.PI*2;
 const spin=full*ramp(style===0?.34:.28,[.67,.73,.68,.70,.72][style]);
 return {morph,volume:ramp(.035,.27)*(1-ramp(.77,.99)),spin,activity:activity*morph,time:t,style,legend:false};
}
