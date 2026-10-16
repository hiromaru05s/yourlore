import * as T from 'three';
import {SETS,type SetIndex} from './catalog';
export interface Sculpture{group:T.Group;tick:(t:number,activity?:number)=>void;dispose:()=>void;}
export function furniture(index:SetIndex,grave=false):Sculpture{
 const s=SETS[index],group=new T.Group(),clock={value:0};
 const body=new T.MeshPhysicalMaterial({color:s.body,metalness:index===1?.08:.25,roughness:index===1?.3:.2,clearcoat:1,clearcoatRoughness:.12});
 const metal=new T.MeshPhysicalMaterial({color:s.metal,metalness:.78,roughness:.24,clearcoat:.5});
 const dark=new T.MeshStandardMaterial({color:index===1?'#64747b':'#0a1519',roughness:.4,metalness:.35});
 const glass=new T.MeshPhysicalMaterial({color:'#276a58',metalness:.18,roughness:.16,clearcoat:1,iridescence:.1});
 const owned:T.Material[]=[body,metal,dark,glass];
 // Reflections live on manufactured surfaces. No detached particles or rings.
 function animateMaterial(mat:T.MeshStandardMaterial,kind:number){
  mat.onBeforeCompile=shader=>{
   shader.uniforms.luxTime=clock;
   shader.vertexShader='varying vec3 luxPosition;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nluxPosition=position;');
   shader.fragmentShader='uniform float luxTime;varying vec3 luxPosition;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
    float phase=luxTime*6.283185/${[12,16,14][index]}.;
    float q=${index===0?'luxPosition.z*.8+luxPosition.x*.24':index===1?'abs(luxPosition.x)*1.1+luxPosition.z*.4':'luxPosition.x*.75-luxPosition.z*.45'};
    float ribbon=pow(.5+.5*cos(q*6.283185-phase),${kind===1?'22.':'30.'});
    totalEmissiveRadiance+=vec3(${index===1?'.63,.72,.78':index===2?'.26,.62,.46':'.72,.52,.27'})*ribbon*${kind===1?'.32':'.09'};
   `);
  };mat.customProgramCacheKey=()=>`minimal-${index}-${kind}`;
 }
 animateMaterial(body,0);animateMaterial(metal,1);animateMaterial(glass,0);
 const w=grave?1.43:1.27,h=grave?1.99:1.88;
 function outline(width:number,height:number,r:number){const sh=new T.Shape(),x=width/2,z=height/2;
  if(index===2){sh.moveTo(-x+r,-z);sh.lineTo(x-r,-z);sh.lineTo(x,-z+r);sh.lineTo(x,z-r);sh.lineTo(x-r,z);sh.lineTo(-x+r,z);sh.lineTo(-x,z-r);sh.lineTo(-x,-z+r);sh.closePath();}
  else{sh.moveTo(-x+r,-z);sh.lineTo(x-r,-z);sh.quadraticCurveTo(x,-z,x,-z+r);sh.lineTo(x,z-r);sh.quadraticCurveTo(x,z,x-r,z);sh.lineTo(-x+r,z);sh.quadraticCurveTo(-x,z,-x,z-r);sh.lineTo(-x,-z+r);sh.quadraticCurveTo(-x,-z,-x+r,-z);}
  return sh;
 }
 function shape(width:number,height:number,depth:number,y:number,mat:T.Material,r=.08,hole=0){
  const sh=outline(width,height,r);if(hole){const inner=outline(width-hole*2,height-hole*2,Math.max(.02,r-hole));sh.holes.push(new T.Path(inner.getPoints(12).reverse()));}
  const geo=new T.ExtrudeGeometry(sh,{depth,bevelEnabled:true,bevelSize:.006,bevelThickness:.004,bevelSegments:2,curveSegments:10});geo.rotateX(-Math.PI/2);
  const mesh=new T.Mesh(geo,mat);mesh.position.y=y;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
 }
 function box(width:number,height:number,depth:number,x:number,y:number,z:number,mat:T.Material){const mesh=new T.Mesh(new T.BoxGeometry(width,height,depth),mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;}
 const r=index===1?.24:index===2?.16:.065;
 shape(w,h,.028,.012,dark,r);shape(w-.02,h-.02,.017,.041,metal,r);
 shape(w-.07,h-.07,.012,.06,body,r);
 // Usable recessed center stays under the runtime's .08 card contact plane.
 // Edge lips have real depth and remain visible with a fully stocked deck.
 if(index===0){
  shape(w-.015,h-.015,.044,.068,body,.065,.044);
  shape(w-.022,h-.022,.003,.116,metal,.06,.009);
  box(.008,.003,h-.20,-w*.28,.078,0,metal);
  // A single gold keeper on the outer edge ties the sleeve's vertical inlay to furniture.
  box(.045,.009,.24,-w/2+.016,.121,-.22,metal);
 }else if(index===1){
  shape(w+.015,h+.015,.042,.068,body,.24,.063);
  shape(w-.035,h-.035,.003,.114,metal,.22,.011);
  const facet=new T.MeshPhysicalMaterial({color:'#f9f7ee',roughness:.3,metalness:.06,clearcoat:.8});owned.push(facet);
  for(const side of [-1,1]){
   const rail=shape(.07,h-.36,.027,.087,facet,.034);rail.position.x=side*(w/2-.04);
  }
  const mark=box(.105,.004,.105,0,.079,0,metal);mark.rotation.y=Math.PI/4;
 }else{
  shape(w+.01,h+.01,.065,.067,glass,.16,.055);
  shape(w-.015,h-.015,.003,.138,metal,.15,.009);
  for(const end of [-1,1]){
   const cap=shape(w*.57,.095,.028,.123,metal,.025);cap.position.z=end*(h/2-.022);
  }
  shape(.17,.22,.005,.077,metal,.04);shape(.13,.18,.003,.084,glass,.03);
 }
 // Very small maker's mark on an otherwise quiet, empty tray.
 if(index===0){box(.012,.003,.11,.02,.079,0,metal);box(.07,.003,.012,.049,.079,.05,metal);}
 return {group,tick(t){clock.value=t;},dispose(){const geos=new Set<T.BufferGeometry>();group.traverse(o=>{if(o instanceof T.Mesh)geos.add(o.geometry);});geos.forEach(g=>g.dispose());owned.forEach(m=>m.dispose());group.removeFromParent();}};
}
