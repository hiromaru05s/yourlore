import {assetBatch} from './assetBatch';
import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {addCrystalOptics} from '../readingCrystalOptics';
import {physical,canvasMap} from './materials';
import {glyph} from './script';
import {ease} from './kinematics';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
/** The board's authored sapphire, collet and six-bounce optical cut, in a library instrument. */
export function makeAttunes(parent:T.Group){
 const rigs:T.Group[]=[],lights:T.PointLight[]=[],gems:T.Group[]=[],inlays:T.MeshPhysicalMaterial[]=[];
 const brass=physical('#bca67e',.84,.24),silver=physical('#8aafb9',.88,.20),dark=physical('#142d41',.42,.28);
 const stone=physical('#b7c4c6',.08,.46);
 const engravings=canvasMap(1024,128,c=>{c.fillStyle='#253e51';c.fillRect(0,0,1024,128);c.strokeStyle=c.fillStyle='#b6b89c';for(let n=0;n<24;n++)glyph(c,22+n*43,64,31,n+41);c.fillRect(0,7,1024,2);c.fillRect(0,119,1024,2)});
 const inscription=physical('#d4e1df',.3,.38,engravings);
 function mesh(geo:T.BufferGeometry,mat:T.Material,position:T.Vector3,to:T.Object3D){const m=new T.Mesh(geo,mat);m.position.copy(position);m.castShadow=m.receiveShadow=true;to.add(m);return m;}
 function lathe(profile:number[][],mat:T.Material,g:T.Object3D){return mesh(new T.LatheGeometry(profile.map(p=>new T.Vector2(p[0],p[1])),96),mat,V(),g)}
 for(const side of [-1,1]){
  const root=new T.Group();root.position.set(side*3.25,0,-6.1);parent.add(root);rigs.push(root);
  lathe([[0,0],[.64,0],[.66,.04],[.66,.09],[.61,.14],[.59,.18],[.48,.21],[.47,.27],[.40,.31],[.31,.39],[.27,.52],[.23,1.36],[.27,1.48],[.35,1.54],[.43,1.57],[.44,1.63],[.40,1.68],[0,1.68]],stone,root);
  for(const [r,y] of [[.62,.12],[.46,.28],[.26,.51],[.27,1.47],[.42,1.61]]){const ring=mesh(new T.TorusGeometry(r,.015,10,96),brass,V(0,y),root);ring.rotation.x=Math.PI/2;}
  for(let n=0;n<16;n++){const a=n*Math.PI/8;const strip=mesh(new T.CylinderGeometry(.012,.018,.91,10),brass,V(Math.cos(a)*.26,.98,Math.sin(a)*.26),root);strip.rotation.z=-Math.sin(a)*.026;strip.rotation.x=Math.cos(a)*.026;}
  mesh(new T.CylinderGeometry(.292,.292,.13,96,1,true),inscription,V(0,1.40),root);
  const cradle=new T.Group();cradle.position.set(0,2.15,0);cradle.rotation.y=-side*.17;root.add(cradle);
  const band=mesh(new T.TorusGeometry(.62,.026,16,128),brass,V(),cradle);band.rotation.y=.15;
  const inner=mesh(new T.TorusGeometry(.57,.012,12,128),silver,V(0,0,-.035),cradle);inner.rotation.y=.15;
  for(let n=0;n<48;n++){const a=n*Math.PI/24;const mark=mesh(new T.BoxGeometry(.008,n%4===0?.047:.021,.012),brass,V(Math.sin(a)*.619,Math.cos(a)*.619,.031),cradle);mark.rotation.z=-a;}
  for(const s of [-1,1]){mesh(new T.SphereGeometry(.075,24,16),silver,V(s*.62,0),cradle);const arm=new T.CatmullRomCurve3([V(s*.34,-.51,-.10),V(s*.70,-.34,-.08),V(s*.67,0,0)]);mesh(new T.TubeGeometry(arm,32,.037,12,false),dark,V(),cradle);}
  const gem=new T.Group();gem.position.y=2.15;gem.rotation.set(Math.PI*.38,-side*.15,side*.12);root.add(gem);gems.push(gem);
  const enamel=physical('#467ba3',.22,.25);enamel.emissive.set('#72caff');enamel.emissiveIntensity=.2;inlays.push(enamel);
  const slit=mesh(new T.TorusGeometry(.405,.009,8,96),enamel,V(0,1.68),root);slit.rotation.x=Math.PI/2;
  const light=new T.PointLight('#8aceff',.4,3.2,2);light.position.set(0,2.3,.35);root.add(light);lights.push(light);
 }
 const ready=assetBatch([new GLTFLoader().loadAsync('/models/reading-board/v1/mana-crystal-ready.glb'),fetch('/models/reading-board/v1/crystal-optics.json').then(r=>{if(!r.ok)throw Error('Crystal optical cut failed');return r.json()})]).then(([asset,cut])=>{
  asset.scene.updateMatrixWorld(true);const parts:T.Mesh[]=[];const scale=27;
  asset.scene.traverse(o=>{if(!(o instanceof T.Mesh))return;const geo=o.geometry.clone().applyMatrix4(o.matrixWorld);geo.translate(0,-.0106,0);
   // Bake the authored node placement as the board renderer does. Keep the cut in this same space.
   const material=o.material.clone() as T.MeshPhysicalMaterial;
   if(material.isMeshPhysicalMaterial&&material.transmission>0){material.color.set('#378bea');material.attenuationColor.set('#2373c9');material.attenuationDistance*=scale;material.thickness*=scale;addCrystalOptics(material,{...cut,center:[0,0,0]});material.envMapIntensity=2.3;}
   const part=new T.Mesh(geo,material);part.scale.setScalar(scale);part.castShadow=part.receiveShadow=!(material.transmission>0);parts.push(part);
  });
  for(const g of gems)parts.forEach(p=>g.add(p.clone()));
  asset.scene.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});
 });
 return {ready,tick(seconds:number,reduced:boolean){const charge=ease(1.1,2.7,seconds)*(1-ease(4,7,seconds));gems.forEach((g,i)=>{g.rotation.z=(i?1:-1)*.12+(reduced?0:Math.sin(seconds*.44)*.075);lights[i].intensity=.4+charge*2.3;inlays[i].emissiveIntensity=.2+charge*1.4;});}};
}
