import * as T from 'three';
import {ease,rank,type Id} from './catalog';

// One monotonically closing bite, followed by erosion while CLOSED. Never a second chomp.
export const bites=[
 {hit:1080,hold:1190,release:1470,snap:105},
 {hit:1140,hold:1270,release:1530,snap:125},
 {hit:1100,hold:1220,release:1490,snap:100},
 {hit:1040,hold:1170,release:1410,snap:80},
 {hit:1190,hold:1290,release:1580,snap:135},
 {hit:1240,hold:1400,release:1660,snap:130},
];
export function bitePose(v:number,ms:number){
 const b=bites[v],grow=ease(390,690,ms),u=T.MathUtils.clamp((ms-b.hit+b.snap)/b.snap,0,1),close=u*u*u;
 const retract=ease(b.hold,b.release,ms),pressure=ease(b.hit,b.hit+22,ms)*(1-ease(b.hold+30,b.release,ms));
 return {grow,close,open:0,pressure,wound:ease(b.hit,b.hit+40,ms)*(1-ease(1750,2110,ms)),retract,gap:52*(1-close),yaw:0,slide:0,hit:b.hit};
}
// A swept, pointed, solid blade with a raised ridge. Not a cone or a tooth photograph.
// Root at y=0, tip at y=-length; the centre ridge catches a narrow red-white highlight.
function fang(length:number,width:number,curve:number,faceted=false){
 const p:number[]=[],colors:number[]=[],uv:number[]=[],idx:number[]=[],rings=32,sides=faceted?6:16;
 for(let i=0;i<=rings;i++){
  const u=i/rings,bulge=Math.pow(1-u,.82),cx=curve*u*u;
  for(let j=0;j<=sides;j++){
   const a=j/sides*Math.PI*2,w=Math.cos(a),z=Math.sin(a),r=width*bulge;
   p.push(cx+w*r,-u*length,z*r*.34+Math.sin(u*Math.PI)*3);
   const ridge=Math.pow(Math.max(0,z),10),edge=Math.pow(Math.abs(w),9),tip=ease(.8,1,u);
   colors.push(.54+.36*ridge+.10*tip,.009+.11*ridge+.08*tip,.025+.10*ridge+.07*tip);
   uv.push(j/sides,u);
   if(i<rings&&j<sides){const n=i*(sides+1)+j;idx.push(n,n+1,n+sides+1,n+1,n+sides+2,n+sides+1);}
   // Edge shade is carried by the actual side faces, so it survives light backgrounds.
   colors[colors.length-3]*=1-edge*.32;
  }
 }
 const cap=p.length/3;p.push(0,0,0);colors.push(.2,.001,.007);uv.push(.5,0);
 for(let j=0;j<sides;j++)idx.push(cap,j+1,j);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
const configs=[
 {xs:[-42,42],lengths:[74,74],width:20,curve:19,angle:0,spread:1,depth:14},
 {xs:[-63,-27,27,63],lengths:[49,77,77,49],width:17,curve:8,angle:0,spread:.88,depth:17},
 {xs:[-44,44],lengths:[87,87],width:21,curve:25,angle:-.48,spread:.90,depth:16},
 {xs:[-32,32],lengths:[93,93],width:12,curve:8,angle:.12,spread:.72,depth:12},
 {xs:[-46,46],lengths:[80,80],width:27,curve:29,angle:.06,spread:1.05,depth:20},
 {xs:[-68,-32,32,68],lengths:[51,90,90,51],width:20,curve:17,angle:0,spread:1.08,depth:20},
];
type Tooth={root:T.Group;row:number;x:number;length:number;index:number};
export class BiteRig{
 readonly group=new T.Group();readonly ready=Promise.resolve();readonly points=Array.from({length:4},()=>new T.Vector2());readonly gaps=new T.Vector4();
 pressure=0;wound=0;count=4;lowerClearance=0;focus=0;impact=0;
 private rigs:T.Group[]=[];private teeth:Tooth[][]=[];private bounds=new T.Box3();
 private uniforms={growth:{value:0},erosion:{value:0},flash:{value:0}};
 private red=new T.MeshPhysicalMaterial({color:0xff2443,vertexColors:true,envMapIntensity:.28,roughness:.36,metalness:.18,clearcoat:.42,clearcoatRoughness:.26,emissive:0x970b23,emissiveIntensity:.22});
 private outline=new T.ShaderMaterial({side:T.BackSide,uniforms:this.uniforms,vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position+normal*1.1,1.);}`,fragmentShader:`varying vec2 vUv;uniform float growth,erosion;void main(){float front=vUv.y+.08*sin(vUv.x*18.+vUv.y*14.);if(vUv.y>growth||front<erosion*1.13)discard;gl_FragColor=vec4(.065,.001,.013,1.);}`});
 private depth:T.MeshDepthMaterial;
 constructor(){
  const inject=(shader:{uniforms:any;vertexShader:string;fragmentShader:string})=>{
   Object.assign(shader.uniforms,this.uniforms);
   shader.vertexShader='varying vec2 toothUv;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntoothUv=uv;');
   shader.fragmentShader='varying vec2 toothUv;uniform float growth,erosion,flash;\n'+shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
   float front=toothUv.y+.08*sin(toothUv.x*18.+toothUv.y*14.);if(toothUv.y>growth||front<erosion*1.13)discard;`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(.75,.10,.15)*flash;');
  };
  this.red.onBeforeCompile=inject;this.depth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking});this.depth.onBeforeCompile=inject;
  for(let v=0;v<6;v++){
   const cfg=configs[v],rig=new T.Group(),list:Tooth[]=[];this.group.add(rig);this.rigs.push(rig);
   for(const row of [1,-1])for(let i=0;i<cfg.xs.length;i++){
    const x=cfg.xs[i]+(row<0?9:0),length=cfg.lengths[i]*(row<0?.74:1),geometry=fang(length,cfg.width*(row<0?.78:1),-Math.sign(x)*cfg.curve,v===1||v===5);
    const root=new T.Group(),mesh=new T.Mesh(geometry,this.red),edge=new T.Mesh(geometry,this.outline);mesh.castShadow=true;mesh.customDepthMaterial=this.depth;root.add(mesh,edge);root.userData.base=new Float32Array(geometry.getAttribute('position').array);rig.add(root);list.push({root,row,x,length,index:i});
   }
   this.teeth.push(list);
  }
 }
 draw(id:Id,v:number,ms:number,h:number){
  const p=bitePose(v,ms),b=bites[v],cfg=configs[v],active=ms>390&&ms<b.release;
  this.group.visible=active;this.group.position.set(0,0,h+3);this.pressure=p.pressure;this.wound=p.wound;
  this.focus=ease(370,640,ms)*(1-ease(b.hold+40,b.release+100,ms));
  this.impact=ease(b.hit,b.hit+12,ms)*(1-ease(b.hit+24,b.hit+110,ms));
  this.uniforms.growth.value=p.grow;this.uniforms.erosion.value=p.retract;this.uniforms.flash.value=this.impact*.5;
  const tier=id==='VAMP_BUTLER'?.91:.90+rank(id)*.025;
  this.rigs.forEach((r,i)=>r.visible=i===v);
  const rig=this.rigs[v];rig.scale.setScalar(tier);rig.rotation.z=cfg.angle+(v===2?(1-p.close)*.18:0);
  // A restrained outward anticipation; the final 80–135 ms closes only once.
  const opening=p.gap*cfg.spread*(.72+.28*ease(640,b.hit-b.snap,ms));
  for(const tooth of this.teeth[v]){
   const {root,row,x,length,index}=tooth,upper=row===1;
   const liquid=v===4?(1-p.close)*Math.sin(ms*.012+index)*1.6:0;
   const fold=1-ease(b.hold+90,b.release,ms)*.25;
   root.position.set(x,row*(length*fold+opening-6),(cfg.depth+(1-p.close)*12+liquid)*ease(390,700,ms));
   root.rotation.set(0,0,upper?0:Math.PI);
   if(!upper)root.position.x=-x; // rotation mirrors curvature as well as direction.
   root.scale.set(1,fold,1);
   if(v===4){const geo=(root.children[0] as T.Mesh).geometry as T.BufferGeometry,attr=geo.getAttribute('position') as T.BufferAttribute,base=root.userData.base as Float32Array;
    for(let k=0;k<attr.count;k++){const xx=base[k*3],yy=base[k*3+1],zz=base[k*3+2],wave=Math.sin(yy*.09-ms*.011)*(1-p.close)*.13;attr.setXYZ(k,xx*(1+wave),yy,zz*(1-wave));}attr.needsUpdate=true;geo.computeVertexNormals();}

  }
  // Contact accents lie under the dominant canine tips in the same local frame.
  const a=rig.rotation.z;
  for(let i=0;i<4;i++){const x=(i%2?1:-1)*30*tier,y=(i<2?1:-1)*7;this.points[i].set(x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a));this.gaps.setComponent(i,p.gap);}
  this.lowerClearance=0;if(active){this.group.updateWorldMatrix(true,true);this.bounds.setFromObject(rig);this.lowerClearance=this.bounds.min.z;}
 }
 dispose(){const geometries=new Set<T.BufferGeometry>();this.group.traverse(o=>{if(o instanceof T.Mesh)geometries.add(o.geometry);});geometries.forEach(g=>g.dispose());this.red.dispose();this.outline.dispose();this.depth.dispose();this.group.clear();}
}
