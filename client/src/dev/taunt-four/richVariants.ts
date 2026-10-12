import * as T from 'three';
import {ease,pulse} from './catalog';
import {LionRelief} from './lionRelief';

const mesh=<G extends T.BufferGeometry>(geometry:G,material:T.Material,parent:T.Object3D)=>{
 const object=new T.Mesh(geometry,material);object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;
};
const prism=(points:number[][],depth:number,bevel=1)=>{
 const shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
 const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:3,steps:1});
 g.computeBoundingBox();const box=g.boundingBox!,size=box.getSize(new T.Vector3()),p=g.attributes.position,uv=g.attributes.uv;
 for(let i=0;i<p.count;i++)uv.setXY(i,(p.getX(i)-box.min.x)/size.x,(p.getY(i)-box.min.y)/size.y);return g;
};
function engraving(base:string,ink:string){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=1024;const c=canvas.getContext('2d')!;
 c.fillStyle=base;c.fillRect(0,0,512,1024);
 // Thin tool marks and two scales of hand-authored engraving belong to the material.
 for(let i=0;i<2400;i++){const x=(i*103.17)%512,y=(i*71.39)%1024;c.fillStyle=i%2?'#ffffff0a':'#0000000b';c.fillRect(x,y,2+i%31,.7);}
 c.strokeStyle=ink;c.lineWidth=1.6;c.globalAlpha=.75;
 for(const side of [-1,1])for(let k=0;k<7;k++){
  const y=72+k*139;c.beginPath();c.moveTo(256,y+105);c.bezierCurveTo(256+side*90,y+20,256+side*201,y+125,256+side*193,y+28);c.bezierCurveTo(256+side*175,y-12,256+side*85,y+15,256+side*150,y+61);c.stroke();
  c.beginPath();c.moveTo(256+side*140,y+70);c.quadraticCurveTo(256+side*87,y+61,256+side*98,y+24);c.quadraticCurveTo(256+side*137,y+20,256+side*140,y+70);c.stroke();
 }
 c.globalAlpha=1;c.lineWidth=2;c.strokeStyle=ink;c.strokeRect(17,15,478,994);c.lineWidth=.7;c.strokeRect(24,22,464,980);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;return texture;
}
function ribbonGeometry(rows=64,cols=8){const g=new T.PlaneGeometry(1,1,cols,rows);return g;}
type Ribbon={mesh:T.Mesh<T.PlaneGeometry>,edge:T.Line,side:number,layer:number};

type Petal={group:T.Group,index:number};

/** Three authored primary forms. All source coordinates remain tied to the card frame. */
export class RichVariants {
 private silver=new T.MeshPhysicalMaterial({color:0xc5d4dd,metalness:.9,roughness:.29,envMapIntensity:1.3,clearcoat:.45,clearcoatRoughness:.2,side:T.DoubleSide});
 private silverDark=new T.MeshStandardMaterial({color:0x283941,metalness:.86,roughness:.35,side:T.DoubleSide});
 private gold=new T.MeshStandardMaterial({color:0xb78d4e,metalness:.87,roughness:.29});
 private paleGold=new T.MeshStandardMaterial({color:0xc8b593,metalness:.82,roughness:.26});

 private obsidian=new T.MeshPhysicalMaterial({color:0x758196,metalness:.58,roughness:.25,clearcoat:1,clearcoatRoughness:.16});
 private garnet=new T.MeshPhysicalMaterial({color:0x5e1527,metalness:.25,roughness:.17,clearcoat:1});
 private ribbonEdges=new T.LineBasicMaterial({color:0xd5dedc});
 private ribbons:Ribbon[]=[];private lion:LionRelief;readonly ready:Promise<void>;private petals:Petal[]=[];private shieldRail:T.Mesh;private veins:T.MeshStandardMaterial;
 constructor(private groups:T.Group[]){
  this.silver.map=engraving('#a4afb3','#434e53');this.obsidian.map=engraving('#515767','#b6a17a');

  this.veins=new T.MeshStandardMaterial({color:0xcfb27d,metalness:.86,roughness:.25,emissive:0x855820,emissiveIntensity:0});
  for(const side of [-1,1])for(let layer=0;layer<3;layer++){
   const g=ribbonGeometry();const m=mesh(g,layer===1?this.silverDark:this.silver,groups[1]);
   const edge=new T.Line(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(new Float32Array(65*3),3)),this.ribbonEdges);groups[1].add(edge);
   this.ribbons.push({mesh:m,edge,side,layer});
  }
  this.lion=new LionRelief(groups[2]);this.ready=this.lion.ready;this.shieldRail=this.makeBulwark();
 }
 private makeBulwark(){
  const group=this.groups[3];
  for(let index=0;index<5;index++){
   const p=new T.Group();group.add(p);this.petals.push({group:p,index});const k=index-2,len=153-Math.abs(k)*20,w=52;
   const points=[[-w*.4,0],[-w*.53,20],[-w*.48,len*.60],[-w*.31,len*.86],[0,len],[w*.31,len*.86],[w*.48,len*.60],[w*.53,20],[w*.4,0]];
   const curve=(g:T.BufferGeometry)=>{const a=g.attributes.position;for(let i=0;i<a.count;i++)a.setZ(i,a.getZ(i)+8*(1-Math.min(1,Math.abs(a.getX(i))/(w*.55))**2));a.needsUpdate=true;g.computeVertexNormals();return g;};
   mesh(curve(prism(points,8,1.1)),this.paleGold,p);
   const inner=points.map(([x,y])=>[x*.8,3+y*.92]);mesh(curve(prism(inner,5,.6)),this.obsidian,p).position.z=8;
   // Ridged central facets catch a narrow highlight while broad faces stay dark.
   mesh(prism([[-1.5,8],[-3,len*.58],[0,len-6],[3,len*.58],[1.5,8]],2,.25),this.veins,p).position.z=24;
   const jewel=mesh(new T.OctahedronGeometry(index===2?6:4),this.garnet,p);jewel.position.set(0,len*.3,28);jewel.scale.set(1,1.7,.65);
   for(const sign of [-1,1]){const line=new T.CatmullRomCurve3([new T.Vector3(sign*w*.28,9,25),new T.Vector3(sign*w*.35,21,25),new T.Vector3(sign*2,len*.57,25)]);mesh(new T.TubeGeometry(line,12,.5,4,false),this.gold,p);}
  }
  const band=mesh(new T.BoxGeometry(163,5,5),this.gold,group);band.rotation.x=.8;return band;
 }
 update(v:number,t:number){
  if(v===1)this.updateMantle(t);
  if(v===2)this.lion.update(t);
  if(v===3)this.updateBulwark(t);
 }
 private updateMantle(t:number){
  for(const r of this.ribbons){
   const {side,layer}=r,delay=layer*27,a=pulse(25+delay,345+delay,635+delay,980,t),sweep=ease(130,560,t),settle=ease(705,975,t);
   const p=r.mesh.geometry.attributes.position,edge=r.edge.geometry.attributes.position;
   for(let row=0;row<=64;row++){
    const q=row/64,tip=Math.pow(Math.sin(Math.PI*q),.68),baseY=-107+layer*35;
    // Each liquid blade peels from a long section of its own frame, rolls outward,
    // then narrows from its tip back into that exact edge. No detached particles.
    const reach=a*(.8+.2*Math.sin(q*Math.PI)),y=baseY+q*(246-layer*25)*(.35+.65*a);
    const curl=Math.sin(q*Math.PI*1.32-sweep*.4)*a;
    const cx=side*(75+(21-layer*5)*curl+(8+layer*4)*Math.sin(q*Math.PI)*a);
    const cz=5+a*(13+layer*8+Math.sin(q*Math.PI)*62)+(1-q)*Math.sin(sweep*3)*a*6;
    const width=(layer===0?69:layer===1?52:41)*tip*reach*(1-.7*settle*q);
    for(let col=0;col<=8;col++){
     const u=col/8-.5,fold=Math.cos(u*Math.PI*2)*width*.23;
     const x=cx+side*u*width,y2=y+u*18*Math.sin(q*Math.PI)*a,z=cz+fold+u*Math.sin(q*5-sweep*3)*width*.45;
     p.setXYZ(row*9+col,x,y2,z);
    }
    edge.setXYZ(row,p.getX(row*9+8),p.getY(row*9+8),p.getZ(row*9+8)+.4);
   }
   p.needsUpdate=true;edge.needsUpdate=true;r.mesh.geometry.computeVertexNormals();r.mesh.visible=r.edge.visible=a>.005;
  }
 }
 private updateBulwark(t:number){
  const unfold=pulse(50,355,640,990,t),nod=pulse(405,490,575,710,t);
  this.petals.forEach(({group,index})=>{
   const k=index-2,a=pulse(45+Math.abs(k)*32,325+Math.abs(k)*32,655+Math.abs(k)*32,965+Math.abs(k)*12,t),angle=k*.12*a;
   group.position.set(k*33,112-Math.abs(k)*9*a,4+unfold*(10+(2-Math.abs(k))*5));
   group.rotation.set(-.15-.28*a+.09*nod,angle*.45,Math.PI-angle*.42);group.scale.set(.7+.3*a,Math.max(.001,a),Math.max(.001,a));
  });
  this.shieldRail.position.set(0,112,8);this.shieldRail.scale.set(1,Math.max(.001,unfold),Math.max(.001,unfold));this.shieldRail.rotation.x=0;
  this.veins.emissiveIntensity=.5*pulse(260,410,550,760,t);
 }
}
