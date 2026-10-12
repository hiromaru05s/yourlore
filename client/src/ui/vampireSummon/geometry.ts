import * as T from 'three';
import {ease,DENTAL_ROOT_EDGE,type Pose} from './catalog';
export function enamel(color=0xbc1630,roughness=.28){return new T.MeshPhysicalMaterial({color,roughness,metalness:.06,clearcoat:.24,clearcoatRoughness:.23,envMapIntensity:.34,specularColor:0xffabb4,specularIntensity:.48,vertexColors:true,emissive:0x300007,emissiveIntensity:.12});}
export function solid(g:T.BufferGeometry,m:T.Material){const o=new T.Mesh(g,m);o.castShadow=true;o.receiveShadow=true;return o;}
function geometry(p:number[],idx:number[],color:number[]){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('color',new T.Float32BufferAttribute(color,3));g.setIndex(idx);g.computeVertexNormals();return g;}
// Anatomical construction shared as a modelling primitive, not a six-preset rig:
// rounded cervical shoulder, oval volume, a concave inner edge and convex outer edge.
// The tip follows a curved centreline; neither its silhouette nor its section is a triangle.
export function fang(length:number,radius:number,bend:number,depth=.86){
 const p:number[]=[],idx:number[]=[],colors:number[]=[],N=56,S=28;
 for(let i=0;i<=N;i++){
  const u=i/N,cx=bend*u*u*u,cy=-length*u,dx=3*bend*u*u,inv=1/Math.hypot(length,dx),nx=length*inv,ny=dx*inv;
  const shoulder=.78+.28*Math.sin(Math.PI*Math.min(1,u*2.4));
  const r=radius*shoulder*Math.pow(1-u,.70);
  for(let j=0;j<=S;j++){
   const a=j/S*Math.PI*2,flute=1+.035*Math.cos(a*3)*Math.sin(Math.PI*u),rr=r*Math.cos(a);
   p.push(cx+nx*rr,cy+ny*rr,Math.sin(Math.PI*u)*3+r*depth*Math.sin(a)*flute);
   const cervical=.35+.65*ease(0,.38,u),ridge=.88+.12*Math.sin(a),striations=1-.018*Math.cos(a*19+u*6);
   colors.push(cervical*ridge*striations,cervical*.90*ridge,cervical*.92*ridge);
   if(i<N&&j<S){const k=i*(S+1)+j;idx.push(k,k+1,k+S+1,k+1,k+S+2,k+S+1);}
  }
 }
 const cap=p.length/3;p.push(0,0,0);colors.push(.25,.20,.22);for(let j=0;j<S;j++)idx.push(cap,j+1,j);
 return geometry(p,idx,colors);
}
export function incisor(length:number,width:number){
 const p:number[]=[],idx:number[]=[],colors:number[]=[],N=24,S=28;
 // A rounded rectangular crown with a thin, broad cutting edge. It has no
 // pinched waist and cannot be mistaken for a miniature canine or a bead.
 for(let i=0;i<=N;i++){const u=i/N,w=width*(.72+.28*Math.sin(Math.PI*u*.82)),d=width*(.52-.37*ease(.5,1,u));
  for(let j=0;j<=S;j++){const a=j/S*Math.PI*2,c=Math.cos(a),s=Math.sin(a);p.push(Math.sign(c)*Math.pow(Math.abs(c),.65)*w,-length*u,Math.sign(s)*Math.pow(Math.abs(s),.7)*d);const shade=.45+.55*ease(0,.38,u);colors.push(shade,shade*.9,shade*.92);if(i<N&&j<S){const k=i*(S+1)+j;idx.push(k,k+1,k+S+1,k+1,k+S+2,k+S+1);}}
 }
 for(const end of [0,N]){const cap=p.length/3;p.push(0,-length*end/N,0);colors.push(.7,.63,.65);for(let j=0;j<S;j++){const a=end*(S+1)+j;idx.push(cap,end===0?a+1:a,end===0?a:a+1);}}
 return geometry(p,idx,colors);
}
export function bloodRoot(points:T.Vector3[],radius=3){const m=new T.MeshPhysicalMaterial({color:0x510010,roughness:.42,clearcoat:.15,envMapIntensity:.1});return solid(new T.TubeGeometry(new T.CatmullRomCurve3(points),40,radius,10),m);}
export function rootSpot(x:number,y:number,sx:number,sy:number){const o=solid(new T.SphereGeometry(1,32,16),new T.MeshStandardMaterial({color:0x610014,roughness:.65,envMapIntensity:0}));o.position.set(x,y,2);o.scale.set(sx,sy,2);return o;}
type Contact={mesh:T.Object3D;tip:T.Vector3};
export abstract class Study{readonly group=new T.Group();readonly contacts:Contact[]=[];abstract update(p:Pose,t:number):void;
 protected tooth(parent:T.Group,length:number,width:number,bend:number,material:T.Material,x:number,y:number,z=16,rotation=0,contact=true){const mesh=solid(fang(length,width,bend),material);mesh.position.set(x,y,z);mesh.rotation.z=rotation;parent.add(mesh);if(contact)this.contacts.push({mesh,tip:new T.Vector3(bend,-length,0)});return mesh;}
}
// 01: an exposed curved dental arch. Small incisors make the two long upper
// canines unmistakable; the lower arch provides the opposing bite.
export class DentalArch extends Study{
 private upper=new T.Group();private lower=new T.Group();
 constructor(){super();const m=enamel();this.group.add(this.upper,this.lower);
  for(const s of [-1,1]){this.tooth(this.upper,83,15,-s*15,m,s*43,3,17);this.tooth(this.lower,55,12,s*8,m,s*33,-4,13,Math.PI);}
  for(const row of [this.upper,this.lower]){const sign=row===this.upper?1:-1;
   for(const x of [-69,-12,12,69]){const small=solid(incisor(Math.abs(x)>60?25:29,Math.abs(x)>60?8:9),m);small.position.set(x,-Math.pow(x/70,2)*10*sign,13);small.rotation.z=sign===1?0:Math.PI;row.add(small);}
   row.add(bloodRoot([new T.Vector3(-76,-14*sign,6),new T.Vector3(-42,4*sign,6),new T.Vector3(0,8*sign,6),new T.Vector3(42,4*sign,6),new T.Vector3(76,-14*sign,6)],3.5));
  }
 }
 update(p:Pose){const g=.025+.975*p.grow;this.upper.rotation.x=-.10*(1-p.close);this.lower.rotation.x=.34*(1-p.close)*p.grow;
  for(const row of [this.upper,this.lower]){const sign=row===this.upper?1:-1;row.scale.set(g,1-p.retract*.23,g*(1-p.retract));
   // Anchor the centre of the curved root to the actual frame, accounting for
   // the hinge rotation. The one inward bite retains its existing end pose.
   const openY=sign*DENTAL_ROOT_EDGE-sign*8*Math.cos(row.rotation.x)+6*g*Math.sin(row.rotation.x);
   row.position.y=T.MathUtils.lerp(openY,sign===1?83:-48,p.close);
  }}
}
