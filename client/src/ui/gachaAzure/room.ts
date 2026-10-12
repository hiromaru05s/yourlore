import * as T from 'three';
import {physical,grain,glowMap} from './materials';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {stoneFinish,woodFinish,carpetFinish,spineAtlas} from './libraryMaterials';
const v=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);
const random=(n:number)=>Math.abs(Math.sin(n*91.713+3.27)*43758.5453)%1;
export function makeLibrary(scene:T.Scene){
 const root=new T.Group();scene.add(root);const stone=stoneFinish();
 const dark=physical('#142b41',.08,.61);dark.bumpMap=grain();dark.bumpScale=.021;
 const walnut=woodFinish();
 const gilt=physical('#a99b78',.72,.31),bookmat=physical('#ffffff',.02,.73);bookmat.bumpMap=grain();bookmat.bumpScale=.018;
 const floorMat=stoneFinish();floorMat.roughness=.28;floorMat.metalness=.09;floorMat.clearcoat=.32;floorMat.clearcoatRoughness=.22;
 const batches=new Map<T.Material,{matrix:T.Matrix4;color:T.Color}[]>();const obj=new T.Object3D();
 function block(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,col:T.ColorRepresentation='#ffffff',ry=0){obj.position.set(x,y,z);obj.scale.set(w,h,d);obj.rotation.set(0,ry,0);obj.updateMatrix();let batch=batches.get(m);if(!batch){batch=[];batches.set(m,batch)}batch.push({matrix:obj.matrix.clone(),color:new T.Color(col)})}
 function mesh(geo:T.BufferGeometry,mat:T.Material,x=0,y=0,z=0){const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;root.add(m);return m}
 // Broad ivory stonework and real floor planes provide a shared light/occlusion space.
 block(0,-.18,-4,18,.35,39,floorMat);block(0,6,-17,18,12,.4,stone);block(8.8,6,-4,.35,12,39,stone);block(-8.8,6,-4,.35,12,39,stone);
 for(let z=-21;z<15;z+=2.8)for(let x=-8.4;x<9;x+=2.8){block(x,.004,z,2.75,.012,2.75,floorMat,random(x*7+z)>0.5?'#b6beb7':'#d5d0bc');block(x,.013,z,.012,.008,2.76,gilt);block(x,.013,z,2.76,.008,.012,gilt)}
 // Central blue runner is woven and slightly rough, with narrow stitched trim.
 const carpet=carpetFinish();block(0,.025,-3,3.65,.021,30,carpet);for(const x of [-1.71,1.71])block(x,.039,-3,.012,.008,30,gilt);
 // Shelves use instancing for individual spines, recessed boards, shelves and tooling.
 const spines:{matrix:T.Matrix4,tile:number}[]=[];
 let index=0;const palette=['#324653','#52534a','#67443b','#786e58','#263d42','#b2aa91','#433c40'];
 function shelf(cx:number,cz:number,rot:number,w=3.7){const transform=(x:number,z:number)=>[cx+Math.cos(rot)*x+Math.sin(rot)*z,cz-Math.sin(rot)*x+Math.cos(rot)*z];const b=(x:number,y:number,z:number,bw:number,bh:number,bd:number,m:T.Material,c?:T.ColorRepresentation)=>{const q=transform(x,z);block(q[0],y,q[1],bw,bh,bd,m,c,rot)};
  b(0,4.1,-.38,w,8.2,.16,dark);for(const x of [-w/2,w/2]){b(x,4.1,.01,.14,8.4,.9,walnut);b(x,4.1,.48,.02,8.3,.026,gilt)}
  for(let row=0;row<7;row++){const y=.35+row*1.17;const niche=rot===0&&Math.abs(cx)<.01;if(!niche||row<2||row>3){b(0,y,0,w,.10,.95,walnut);b(0,y+.035,.50,w,.027,.028,gilt);}let x=-w/2+.13;while(x<w/2-.17){index++;const bw=.115+random(index)*.13,bh=.70+random(index+300)*.31;const skip=niche&&row>=1&&row<=3;if(!skip){const color=palette[Math.floor(random(index+11)*palette.length)];b(x+bw/2,y+.10+bh/2,.16,bw,bh,.55,bookmat,color);const q=transform(x+bw/2,.445);obj.position.set(q[0],y+.10+bh/2,q[1]);obj.rotation.set(0,rot,0);obj.scale.set(bw*.94,bh*.98,1);obj.updateMatrix();spines.push({matrix:obj.matrix.clone(),tile:index%32});}x+=bw+.035}}
  for(const y of [.20,8.30,8.46,8.61]){b(0,y,.05,w+.28,.075,1.12,stone);b(0,y+.04,.59,w+.24,.016,.026,gilt)}
  for(const x of [-w/2-.035,w/2+.035]){b(x,4.18,.55,.23,8.05,.12,stone);for(const dx of [-.075,.075])b(x+dx,4.18,.62,.012,7.86,.025,gilt)}
  b(0,8.47,.03,w+.17,.20,1.03,walnut);b(0,.1,.05,w+.19,.23,1.05,dark);
 }
 for(const x of [-6.0,-2,2,6.0])shelf(x,-15.9,0,3.55);
 // Hero's starting niche: visible open space with an ivory folio resting on its shelf.
 // The selected folio hovers in a low, purpose-built display beneath Biblion's window.
 block(0,.65,-11.7,3.1,1.3,1.8,stone);block(0,1.38,-11.7,3.4,.16,2.0,gilt);block(0,1.49,-11.7,3.25,.10,1.9,stone);
 for(const x of [-1.4,1.4])block(x,.65,-10.76,.035,1.2,.035,gilt);
 for(const side of [-1,1])for(const z of [-12,-7,-2,3,8])shelf(side*8.15,z,side*-Math.PI/2,3.45);
 // Elegant engaged columns, capitals and arches; their silhouettes occlude deep shelves.
 for(const z of [-13,-6,1,8])for(const x of [-5.7,5.7]){
  mesh(new T.CylinderGeometry(.23,.30,7.8,48),stone,x,4,z);mesh(new T.CylinderGeometry(.29,.30,.18,24),gilt,x,.28,z);mesh(new T.CylinderGeometry(.36,.30,.27,48),stone,x,8.0,z);for(const y of [.38,.49,7.66,7.81])mesh(new T.CylinderGeometry(y<1?.34:.30,y<1?.36:.32,.07,48),stone,x,y,z);block(x,.1,z,.70,.2,.70,stone);block(x,8.22,z,.74,.18,.74,stone);
  for(let a=0;a<10;a++){const angle=a/10*Math.PI*2;mesh(new T.CylinderGeometry(.010,.010,7.6,5),gilt,x+Math.cos(angle)*.226,4,z+Math.sin(angle)*.226)}
 }
 function arch(z:number){const pts:T.Vector3[]=[];for(let i=0;i<=64;i++){const a=Math.PI-i/64*Math.PI;pts.push(v(Math.cos(a)*5.7,8.0+Math.sin(a)*2.9,z))}mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),96,.19,16,false),stone);const inset=pts.map(p=>p.clone().add(v(0,-.11,.015)));mesh(new T.TubeGeometry(new T.CatmullRomCurve3(inset),64,.015,6,false),gilt)}
 for(const z of [-13,-6,1,8])arch(z);
 // Continuous barrel vault closes the architecture above portrait framing.
 const vaultGeo=new T.BufferGeometry(),vaultPos:number[]=[],vaultIndices:number[]=[];
 for(let i=0;i<=48;i++){const a=i/48*Math.PI;for(const z of [-17,16])vaultPos.push(Math.cos(a)*5.72,8.15+Math.sin(a)*2.92,z);if(i<48){const n=i*2;vaultIndices.push(n,n+1,n+2,n+1,n+3,n+2)}}
 vaultGeo.setAttribute('position',new T.Float32BufferAttribute(vaultPos,3));vaultGeo.setIndex(vaultIndices);vaultGeo.computeVertexNormals();const vaultMat=physical('#1b3044',.03,.74);vaultMat.side=T.DoubleSide;mesh(vaultGeo,vaultMat);
 for(const side of [-1,1])block(side*7.2,8.55,-1,3.0,.15,34,stone);
 // Coffered vault ribs and small inset panels give the roof a constructed scale.
 for(let z=-15.3;z<13;z+=2.35){for(let i=1;i<12;i++){const a=i/12*Math.PI;const rib=mesh(new T.BoxGeometry(.045,.055,2.13),gilt,Math.cos(a)*5.69,8.15+Math.sin(a)*2.90,z);rib.rotation.z=a-Math.PI/2;}}
 for(const side of [-1,1])for(let z=-14;z<12;z+=1.55){block(side*6.16,5.54,z,.075,.89,.06,gilt);block(side*6.16,5.53,z,.11,.045,.20,gilt)}
 for(const side of [-1,1]){block(side*6.16,6.01,-1.4,.12,.10,28,walnut);block(side*6.16,5.08,-1.4,.45,.16,28,stone);block(side*6.16,5.18,-1.4,.39,.025,28,gilt)}
 // The display has recessed fluting rather than a single unbroken white cube.
 for(let x=-1.22;x<=1.23;x+=.18){block(x,.67,-10.772,.075,.89,.025,dark);block(x+.045,.67,-10.75,.018,.87,.022,gilt)}
 for(const y of [.13,.25,1.22])block(0,y,-10.74,3.06,.055,.06,stone);
 // Warm lamps balance cool daylight; glass surfaces are deliberately restrained.
 const lampLight=new T.MeshBasicMaterial({color:'#fff0cc',toneMapped:false});const lampGlow=glowMap();
 for(const z of [-12,-5,2,9])for(const x of [-5.7,5.7]){block(x,3.8,z+.26,.32,.025,.55,gilt);mesh(new T.CylinderGeometry(.055,.07,.25,12),gilt,x,3.95,z+.44);mesh(new T.SphereGeometry(.09,20,12),lampLight,x,4.12,z+.44);const localLight=new T.PointLight('#ffcf8a',1.8,3.0,2);localLight.position.set(x,4.18,z+.68);root.add(localLight);const sp=new T.Sprite(new T.SpriteMaterial({map:lampGlow,color:'#ffe7b2',transparent:true,opacity:.45,depthWrite:false,blending:T.AdditiveBlending}));sp.position.set(x,4.12,z+.44);sp.scale.setScalar(.75);root.add(sp)}
 // High side apertures create coherent shafts across the real library volume.
 const shaftMat=new T.MeshBasicMaterial({color:'#fff2ce',transparent:true,opacity:.018,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending});
 for(let i=0;i<4;i++){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([-8,9,-8+i*5,-8,10,-6+i*5,4,.08,-4+i*5,2,.08,-6+i*5],3));g.setIndex([0,1,2,0,2,3]);mesh(g,shaftMat)}
 for(const [mat,items] of batches){const im=new T.InstancedMesh(new RoundedBoxGeometry(1,1,1,2,mat===bookmat?.065:.025),mat,items.length);items.forEach((it,i)=>{im.setMatrixAt(i,it.matrix);im.setColorAt(i,it.color)});im.castShadow=im.receiveShadow=true;root.add(im)}
 const atlas=spineAtlas(),spineMat=physical('#ffffff',.08,.66,atlas);
 spineMat.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 folioTile;');
  shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvMapUv=vec2((uv.x+folioTile.x)/8.,(uv.y+folioTile.y)/4.);');
 };
 spineMat.customProgramCacheKey=()=> 'biblion-spine-atlas';
 const spineGeo=new T.PlaneGeometry(1,1);spineGeo.setAttribute('folioTile',new T.InstancedBufferAttribute(new Float32Array(spines.flatMap(s=>[s.tile%8,3-Math.floor(s.tile/8)])),2));
 const volumes=new T.InstancedMesh(spineGeo,spineMat,spines.length);spines.forEach((s,i)=>volumes.setMatrixAt(i,s.matrix));volumes.receiveShadow=true;root.add(volumes);
 return root;
}
