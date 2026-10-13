import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {mesh, plate, tube, horn} from './geometry';
import type {Variant} from './catalog';

/** Shared construction primitives; every study has its own anatomy and weapon profile. */
export function materials(v:Variant) {
  const colors=[0x245c55,0x39424b,0x74382d,0x34445b,0x222c36];
  const skin=new T.MeshStandardMaterial({color:colors[v],metalness:v===1||v===4?.55:.2,roughness:.43});
  const scale=new T.MeshStandardMaterial({color:[0x398c7b,0x71848a,0xa05539,0x61738b,0x34434d][v],metalness:v===1||v===4?.72:.38,roughness:.32});
  const edge=new T.MeshStandardMaterial({color:v===1?0xc6cfcd:v===3?0xa98b58:0xb59354,metalness:.82,roughness:.29});
  const ivory=new T.MeshStandardMaterial({color:v===4?0xd5b776:0xede1c2,metalness:.13,roughness:.44});
  const steel=new T.MeshStandardMaterial({color:0xd2dce0,metalness:.9,roughness:.23});
  const dark=new T.MeshStandardMaterial({color:0x101e22,metalness:.18,roughness:.56});
  const leather=new T.MeshStandardMaterial({color:0x382c28,roughness:.88});
  const eye=new T.MeshStandardMaterial({color:0xf4c16e,emissive:0xe29426,emissiveIntensity:.55,roughness:.2});
  // Fine irregular engraving changes the highlight, rather than covering the model in glow.
  for(const mat of [skin,scale,edge,ivory,steel]) {
    mat.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 sculptPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nsculptPosition=position;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 sculptPosition;').replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      float grain=sin(sculptPosition.y*7.1+sin(sculptPosition.x*4.3))*sin(sculptPosition.z*9.3+sculptPosition.x*3.7);
      roughnessFactor=clamp(roughnessFactor+grain*.055,.12,.95);`);};
    mat.customProgramCacheKey=()=> 'spiral-sculpt-grain-v1';
  }
  return {skin,scale,edge,ivory,steel,dark,leather,eye};
}
export type Palette=ReturnType<typeof materials>;

/** Smooth cross-section loft, used for the brow, cheek mass and tapered jaws. */
function loft(sections:number[][],mat:T.Material,parent:T.Object3D) {
  const points:number[]=[],indices:number[]=[],n=16;
  sections.forEach(([y,w,h,z],i)=>{for(let j=0;j<n;j++){const a=j/n*Math.PI*2;points.push(Math.cos(a)*w,y,z+Math.sin(a)*h);if(i<sections.length-1){const k=i*n+j,k1=i*n+(j+1)%n;indices.push(k,k1,k+n,k1,k1+n,k+n);}}});
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setIndex(indices);g.computeVertexNormals();return mesh(g,mat,parent);
}
function ellipsoid(parent:T.Object3D,mat:T.Material,p:number[],s:number[]){const m=mesh(new T.SphereGeometry(1,20,12),mat,parent,...p as [number,number,number]);m.scale.set(...s as [number,number,number]);return m;}

/** Collapse static assemblies by material. The articulated jaw and wings remain separate. */
export function bake(root:T.Group) {
  root.updateMatrixWorld(true);const batches=new Map<T.Material,T.BufferGeometry[]>();
  root.traverse(o=>{if(!(o instanceof T.Mesh)||Array.isArray(o.material))return;const transformed=o.geometry.clone().applyMatrix4(o.matrixWorld);const g=transformed.index?transformed.toNonIndexed():transformed;if(g!==transformed)transformed.dispose();g.deleteAttribute('uv');g.deleteAttribute('uv1');let list=batches.get(o.material);if(!list)batches.set(o.material,list=[]);list.push(g);});
  const old=new Set<T.BufferGeometry>();root.traverse(o=>{if(o instanceof T.Mesh)old.add(o.geometry);});root.clear();old.forEach(g=>g.dispose());
  for(const [mat,geos]of batches){const g=mergeGeometries(geos);if(g)mesh(g,mat,root);geos.forEach(x=>x.dispose());}
  return root;
}

export function head(v:Variant,m:Palette){
  const root=new T.Group(),skull=new T.Group(),jaw=new T.Group();
  const broad=v===1?1.2:v===3?.8:v===4?1.24:1;
  loft([[20,3,4,0],[12,16*broad,12,1],[1,23*broad,16,2],[-13,21*broad,12,1],[-26,13*broad,8,-1],[-41,11*broad,5,-1],[-47,4,2,-1]],m.skin,skull);
  // Raised cheekbones and swept brow shields make the eye sockets readable in silhouette.
  for(const s of [-1,1]){
    const cheek=plate([[0,12],[11,7],[16,-10],[8,-21],[-3,-12]],3.5,m.scale,skull);cheek.position.set(s*17,-6,7);cheek.scale.x=s;cheek.rotation.y=s*.4;
    const brow=plate([[-8,0],[-3,8],[12,10],[18,3],[9,-4]],3,m.edge,skull);brow.position.set(s*11,-14,11);brow.scale.x=s;
    ellipsoid(skull,m.dark,[s*17,-18,10],[7,5,4]);ellipsoid(skull,m.eye,[s*18,-19,12],[4.4,2.7,2.2]);ellipsoid(skull,m.dark,[s*18,-19.8,13.9],[.75,2.3,.65]);
    ellipsoid(skull,m.dark,[s*7,-38,4],[2.7,4,1.6]);
    tube([[s*11,-33,5],[s*9,-25,7],[s*11,-22,10]],.7,m.edge,skull);
    // Swept horns have taper and asymmetrical curvature instead of conical pegs.
    const hornLength=v===3?70:v===4?55:43;
    horn([[s*16,5,10],[s*26,17,17],[s*32,35,23],[s*24,hornLength,29]],v===4?8:6.5,m.ivory,skull);
    for(let i=0;i<4;i++) {const collar=mesh(new T.TorusGeometry(5.4-i*.65,.65,6,14),m.edge,skull,s*(20+i*2.5),11+i*5,13+i*2);collar.rotation.x=.9;collar.rotation.y=s*.3;}
    horn([[s*19,1,0],[s*34,14,2],[s*38,30,9]],4.8,m.edge,skull);
    if(v===3)for(let i=0;i<2;i++)horn([[s*29,26+i*13,20],[s*(44+i*5),35+i*13,23],[s*(48+i*5),44+i*13,25]],3.2,m.ivory,skull);
    if(v===4){horn([[s*8,10,14],[s*13,30,24],[s*10,51,36]],5,m.edge,skull);horn([[s*23,-2,3],[s*40,1,12],[s*45,16,17]],5,m.ivory,skull);}
    for(let j=0;j<5;j++)horn([[s*(12-j*.7),-16-j*4.8,-4],[s*(11-j*.7),-17-j*4.8,-11+(j%2)]],j===1?2:1.35,m.ivory,skull);
    tube([[s*21,-12,-2],[s*15,-26,-4],[s*11,-41,-3]],.85,m.dark,skull);
  }
  for(let j=0;j<4;j++){const p=plate([[-7,5],[0,10],[7,5],[5,-6],[0,-11],[-5,-6]],1.5,m.scale,skull);p.position.set(0,8-j*9,16-j*1.7);p.scale.setScalar(1-j*.09);tube([[-4,4,3],[0,-5,4],[4,4,3]],.5,m.edge,p);}
  loft([[6,10,2,-6],[-10,14*broad,3,-7],[-28,11*broad,2.5,-8],[-43,8,2,-6],[-46,.5,.5,-5]],m.ivory,jaw);
  loft([[0,8,1,-5],[-15,12,1.4,-4],[-33,8,1,-5],[-43,.5,.5,-5]],m.dark,jaw);
  for(const s of [-1,1])for(let j=0;j<5;j++)horn([[s*(12-j*.8),-13-j*5,-5],[s*(11-j*.8),-15-j*5,0]],1.4,m.ivory,jaw);
  bake(skull);bake(jaw);root.add(skull,jaw);root.scale.setScalar(v===3?.9:1);return {root,jaw};
}

/** Convex overlapping scute with an actual ridge and bevel, shared by instancing. */
export function scuteGeometry(v:Variant=0){
  const p=v===1?[-6,-6,0, 0,-7,1, 6,-6,0, 7,3,0, 0,8,0, -7,3,0, 0,0,4.5]:v===4?[-5,-6,0, 0,-9,1, 5,-6,0, 6,0,0, 0,12,1, -6,0,0, 0,-1,5.2]:[-5,-6,0, 0,-8,1, 5,-6,0, 6,1,0, 0,9,0, -6,1,0, 0,-1,3.2];
  const idx:number[]=[];for(let i=0;i<6;i++)idx.push(i,(i+1)%6,6);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();return g;
}

/** Diamond cross section and separate socket/grip make the blade read as forged metal. */
export function weapon(v:Variant,m:Palette){const g=new T.Group();
  const sections=v===1?[[40,4,3],[55,22,5],[81,17,5],[132,0,0]]:v===2?[[40,4,3],[65,16,4],[101,11,3],[140,0,0]]:v===4?[[42,5,4],[65,23,6],[97,13,5],[145,0,0]]:[[40,4,3],[64,14,5],[115,7,3],[146,0,0]];
  const pos:number[]=[],idx:number[]=[];for(const [i,[y,w,z]]of sections.entries()){pos.push(-w,y,0,0,y,z,w,y,0,0,y,-z);if(i<sections.length-1)for(let j=0;j<4;j++){const a=i*4+j,b=i*4+(j+1)%4;idx.push(a,b,a+4,b,b+4,a+4);}}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();mesh(geo,m.steel,g);
  tube([[0,-122,0],[0,48,0]],3.4,m.leather,g);tube([[0,42,0],[0,62,0]],4.8,m.edge,g);
  tube([[0,62,5.3],[0,96,4],[0,133,1.5]],.65,m.edge,g);
  for(const s of [-1,1]){tube([[s*6,65,4],[s*5,80,4.5],[0,92,5]],.55,m.dark,g);
    horn([[s*3,44,0],[s*16,42,1],[s*28,55,2],[s*29,65,2]],3.1,m.edge,g);
    for(let j=0;j<4;j++){const p=plate([[-2,0],[0,3],[2,0],[0,-3]],.5,m.edge,g);p.position.set(s*5,-3-j*13,2);}
  }
  for(let j=0;j<22;j++){const ring=mesh(new T.TorusGeometry(3.5,.55,6,14),j<9?m.dark:m.edge,g,0,-100+j*5.5,0);ring.rotation.x=Math.PI/2;ring.rotation.z=.18;}
  const pommel=mesh(new T.SphereGeometry(5,12,8),m.edge,g,0,-125,0);pommel.scale.set(.8,1.6,.8);
  if(v===1||v===4)for(const s of [-1,1]){const p=plate([[0,0],[s*10,12],[s*15,4],[s*6,-17]],2,m.edge,g);p.position.set(s*10,46,0);}
  return bake(g);
}

export function membraneWing(m:Palette,side:number){const g=new T.Group();
  const shape=new T.Shape();shape.moveTo(0,0);shape.bezierCurveTo(15,26,30,37,48,29);shape.bezierCurveTo(68,25,98,13,112,-8);shape.quadraticCurveTo(80,3,74,-26);shape.quadraticCurveTo(50,-8,42,-47);shape.quadraticCurveTo(20,-25,3,-43);shape.closePath();
  const membrane=new T.MeshStandardMaterial({color:0x9b593e,roughness:.65,metalness:.08,side:T.DoubleSide});mesh(new T.ShapeGeometry(shape,24),membrane,g);
  const ends=[[112,-8],[74,-26],[42,-47],[3,-43]];
  ends.forEach(([x,y],i)=>{tube([[0,0,1],[29,30,4],[x*.75,y*.6,3],[x,y,0]],i?1.6:3.5,m.ivory,g);});
  for(let i=0;i<8;i++)tube([[29,25,2],[40+i*5,10-i*2,2],[49+i*5,-12-i*.5,1]],.3,m.edge,g);
  bake(g);
  g.traverse(o=>{if(o instanceof T.Mesh){const a=o.geometry.attributes.position as T.BufferAttribute;for(let i=0;i<a.count;i++)a.setZ(i,a.getZ(i)+Math.sin(a.getX(i)/112*Math.PI)*6);a.needsUpdate=true;o.geometry.computeVertexNormals();}});
  g.scale.x=side;return g;
}

export function talon(m:Palette,side:number){const g=new T.Group();horn([[0,0,0],[side*12,-8,5],[side*22,-5,2],[side*26,-14,0]],5,m.skin,g);for(let i=0;i<3;i++)horn([[side*(20+i*3),-9,1],[side*(24+i*3),-18,-1],[side*(22+i*3),-24,1]],1.6,m.ivory,g);return bake(g);}
