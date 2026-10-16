import * as T from 'three';
import {AMETHYST_PALETTE} from '../../../shared/amethystCosmetics';
export interface Sculpture {group:T.Group;tick:(t:number,activity?:number)=>void;dispose:()=>void;}
export function disposeObject(group:T.Object3D){const gs=new Set<T.BufferGeometry>(),ms=new Set<T.Material>();group.traverse(o=>{if(o instanceof T.Mesh){gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])ms.add(m);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());group.removeFromParent();}
export function amethystFurniture(grave=false):Sculpture{
 const theme=AMETHYST_PALETTE,group=new T.Group(),updates:Array<(t:number,a:number)=>void>=[];
 group.name=theme.id+(grave?'-grave':'-deck');
 const body=new T.MeshPhysicalMaterial({color:theme.body,metalness:.5,roughness:.32,clearcoat:.7});
 const silver=new T.MeshStandardMaterial({color:theme.metal,metalness:.78,roughness:.3});
 const bevel=new T.MeshStandardMaterial({color:'#c9bddb',metalness:.66,roughness:.3});
 const dark=new T.MeshStandardMaterial({color:'#0c0a14',roughness:.48,metalness:.25});
 const light=new T.MeshStandardMaterial({color:'#b99bd8',emissive:'#9061be',emissiveIntensity:.24,roughness:.35,metalness:.45});
 const w=grave?1.43:1.26,h=grave?1.97:1.88;
 function mesh(g:T.BufferGeometry,m:T.Material,parent:T.Object3D=group){const o=new T.Mesh(g,m);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function polygon(points:number[][],depth:number,mat:T.Material,y:number,parent:T.Object3D=group){const s=new T.Shape();points.forEach(([x,z],i)=>i?s.lineTo(x,z):s.moveTo(x,z));s.closePath();const geo=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.008,bevelThickness:.004,bevelSegments:1});geo.rotateX(-Math.PI/2);const o=mesh(geo,mat,parent);o.position.y=y;return o;}
 function plate(x:number,z:number,depth:number,mat:T.Material,y:number,cut=.10,parent:T.Object3D=group){return polygon([[-x/2+cut,-z/2],[x/2-cut,-z/2],[x/2,-z/2+cut],[x/2,z/2-cut],[x/2-cut,z/2],[-x/2+cut,z/2],[-x/2,z/2-cut],[-x/2,-z/2+cut]],depth,mat,y,parent);}
 function rail(points:number[][],r:number,mat:T.Material,parent:T.Object3D=group){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(p[0],p[1],p[2]))),24,r,5,false),mat,parent);}
 plate(w,h,.032,dark,.012);plate(w-.025,h-.025,.018,silver,.045);plate(w-.09,h-.09,.008,body,.067);
 const bed=document.createElement('canvas');bed.width=1024;bed.height=1536;const ctx=bed.getContext('2d')!;ctx.scale(4,4);
 const bedMap=new T.CanvasTexture(bed);bedMap.colorSpace=T.SRGBColorSpace;bedMap.anisotropy=8;let bedTime=-1;
 function paintBed(t:number){if(bedTime>=0&&Math.abs(t-bedTime)<1/12)return;bedTime=t;
  ctx.fillStyle='#171320';ctx.fillRect(0,0,256,384);
  ctx.strokeStyle='#6d5d80';ctx.lineWidth=1;ctx.strokeRect(12,12,232,360);ctx.strokeRect(18,18,220,348);
  for(let j=0;j<9;j++){
   const y=52+j*34;ctx.beginPath();ctx.moveTo(28,y);ctx.bezierCurveTo(90,y+10*Math.sin(t*.4+j),162,y-10,228,y);ctx.strokeStyle='#312140';ctx.lineWidth=2;ctx.stroke();
  }
  ctx.save();ctx.translate(128,192);ctx.strokeStyle='#bba8d5';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-5,-95);ctx.lineTo(10,-50);ctx.lineTo(-9,-12);ctx.lineTo(13,37);ctx.lineTo(-3,96);ctx.strokeStyle='#9873c4';ctx.lineWidth=2.5+Math.sin(t*.6);ctx.stroke();
  ctx.restore();bedMap.needsUpdate=true;
 }
 paintBed(0);
 const floor=mesh(new T.PlaneGeometry(w-.2,h-.2),new T.MeshPhysicalMaterial({map:bedMap,roughness:.43,metalness:.3,clearcoat:.5}));floor.rotation.x=-Math.PI/2;floor.position.y=.080;
 for(const x of [-1,1])for(const z of [-1,1]){const foot=mesh(new T.BoxGeometry(.12,.025,.12),dark);foot.position.set(x*(w/2-.16),.012,z*(h/2-.16));}
  // Unequal prismatic buttresses: broad facets, pointed silhouette, dark joints.
  const colors=['#563c73','#39274e','#76608a','#49335f'];
  for(const side of [-1,1])for(let j=0;j<5;j++){
   const pivot=new T.Group();group.add(pivot);pivot.position.set(side*(w/2-.035),.065,-.72+j*.36);
   const height=.14+(j%3)*.055,crystal=new T.MeshPhysicalMaterial({color:colors[(j+(side>0?1:0))%4],metalness:.35,roughness:.23,clearcoat:1});
   const base=[[-.105,-.15],[.08,-.19],[.15,.02],[.07,.16],[-.10,.13]];
   const geo=new T.BufferGeometry(),vertices:number[]=[];const peak=[side*.065,height,-.015];
   for(let k=0;k<base.length;k++){const a=base[k],b=base[(k+1)%base.length];vertices.push(b[0],0,b[1],a[0],0,a[1],...peak);}
   geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();mesh(geo,crystal,pivot);
   rail([[base[0][0],.004,base[0][1]],peak,[base[2][0],.004,base[2][1]]],.006,bevel,pivot);
   const seam=rail([[-side*.11,.012,-.15],[-side*.09,.035,0],[-side*.10,.012,.13]],.01,light.clone(),pivot);
   updates.push(t=>{const phase=t*Math.PI/5-j*.45;pivot.position.x=side*(w/2-.035+.018*(.5+.5*Math.sin(phase)));pivot.rotation.z=side*.035*Math.sin(phase);(seam.material as T.MeshStandardMaterial).emissiveIntensity=.1+.6*Math.pow(.5+.5*Math.sin(phase),3);});
  }
  for(const end of [-1,1])for(const side of [-1,1]){
   const cap=polygon([[0,-.09],[side*.5,-.13],[side*.61,.02],[side*.19,.08]],.06,body,.09);cap.position.z=end*(h/2-.03);cap.rotation.y=end<0?Math.PI:0;
   rail([[side*.06,.16,end*(h/2-.05)],[side*.27,.16,end*(h/2+.005)],[side*.5,.16,end*(h/2-.06)]],.008,bevel);
  }
 let disposed=false;
 return {group,tick(t,a=0){if(disposed)return;paintBed(t);updates.forEach(f=>f(t,a));},dispose(){if(disposed)return;disposed=true;disposeObject(group);bedMap.dispose();[body,silver,bevel,dark,light].forEach(m=>m.dispose());}};
}
