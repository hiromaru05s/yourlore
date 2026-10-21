import * as T from 'three';

/** HOME's painted limestone / daylight palette. All variation is anchored to
 * the model, so turning and breathing never make a screen-space grain swim. */
export function createHomePearl():T.MeshPhysicalMaterial {
 const material=new T.MeshPhysicalMaterial({color:0xf8f6ee,roughness:.79,metalness:0,clearcoat:.065,clearcoatRoughness:.65,envMapIntensity:.3});
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 vZenoPosition; varying vec3 vZenoWorldNormal;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvZenoPosition=position;');
  shader.vertexShader=shader.vertexShader.replace('#include <defaultnormal_vertex>','#include <defaultnormal_vertex>\nvZenoWorldNormal=inverseTransformDirection(transformedNormal,viewMatrix);');
  shader.fragmentShader=`varying vec3 vZenoPosition; varying vec3 vZenoWorldNormal;
   float zenoHash(vec3 p){p=fract(p*.3183099+vec3(.11,.27,.43));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
   float zenoPaint(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(mix(zenoHash(i),zenoHash(i+vec3(1,0,0)),f.x),mix(zenoHash(i+vec3(0,1,0)),zenoHash(i+vec3(1,1,0)),f.x),f.y),
     mix(mix(zenoHash(i+vec3(0,0,1)),zenoHash(i+vec3(1,0,1)),f.x),mix(zenoHash(i+vec3(0,1,1)),zenoHash(i+vec3(1,1,1)),f.x),f.y),f.z);
   }\n`+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 n=normalize(vZenoWorldNormal);
   float brush=zenoPaint(vZenoPosition*vec3(15.,27.,17.));
   float broad=zenoPaint(vZenoPosition*vec3(3.2,5.1,3.7));
   float lit=smoothstep(-.45,.72,dot(n,normalize(vec3(-.65,.75,.48)))+(broad-.5)*.13);
   // Cool half-tones and warm ivory planes belong to the same sunlit room.
   vec3 pigment=mix(vec3(.72,.82,.94),vec3(1.,.99,.96),lit);
   diffuseColor.rgb*=pigment*(.985+(brush-.5)*.055+(broad-.5)*.07);
  `);
 };
 material.customProgramCacheKey=()=> 'zeno-home-painted-ivory-v1';
 return material;
}

/** Broad arched openings replace the generic studio softboxes. Generated only
 * once per cached HOME renderer; no fetched asset or per-frame texture work. */
export function createHomeReflectionRoom():T.Scene {
 const room=new T.Scene();room.background=new T.Color(0x8398ad);
 const add=(geometry:T.BufferGeometry,color:T.Color|number,x:number,y:number,z:number,ry=0)=>{
  const mesh=new T.Mesh(geometry,new T.MeshBasicMaterial({color,side:T.DoubleSide}));
  mesh.position.set(x,y,z);mesh.rotation.y=ry;room.add(mesh);return mesh;
 };
 const wall=new T.Color(0xd5cbb6),sky=new T.Color(0xc0dcf4).multiplyScalar(2.1);
 add(new T.PlaneGeometry(20,10),wall,0,2,-6);
 const arch=new T.Shape();arch.moveTo(-1,-3);arch.lineTo(1,-3);arch.lineTo(1,1.5);arch.quadraticCurveTo(1,2.7,0,3.1);arch.quadraticCurveTo(-1,2.7,-1,1.5);arch.closePath();
 for(const x of [-4,0,4])add(new T.ShapeGeometry(arch),sky,x,2,-5.9);
 // The left arcade continues beside the viewer: a tall, off-axis reflection
 // gives the dew a window glint without a rectangular studio light on the face.
 add(new T.ShapeGeometry(arch),new T.Color(0xe4eff3).multiplyScalar(3.1),-3.4,2,4.5,Math.PI*.84);
 add(new T.PlaneGeometry(7,8),new T.Color(0xe9d6ad).multiplyScalar(1.5),-5,2,0,Math.PI/2);
 add(new T.PlaneGeometry(9,9),0x34465c,5,2,1,-Math.PI/2);
 const floor=add(new T.PlaneGeometry(20,20),0xb6ad99,0,-4,0);floor.rotation.x=-Math.PI/2;
 return room;
}

export function disposeHomeReflectionRoom(room:T.Scene):void {
 room.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(o.material as T.Material).dispose();}});
}

/** Shared silhouette / expression stays intact; only HOME's surface treatment
 * changes. The jewel keeps its own narrow glint and transparent colored depth. */
export function finishHomeSpirit(body:T.Group):void {
 body.traverse(object=>{
  if(!(object instanceof T.Mesh))return;
  const materials=Array.isArray(object.material)?object.material:[object.material];
  for(const material of materials){
   if(!(material instanceof T.MeshStandardMaterial))continue;
   if(object.name==='zeno-ear-inset'){
    material.color.set(0xc4d0ce);material.roughness=.86;material.envMapIntensity=.16;
    if(material instanceof T.MeshPhysicalMaterial)material.clearcoat=0;
   }
   if(object.name==='zeno-dew-rim'){
    material.color.set(0xd1d9d9);material.roughness=.52;material.metalness=.12;
    if(material instanceof T.MeshPhysicalMaterial)material.clearcoat=.08;
   }
   if(object.name==='zeno-dew-glass'&&material instanceof T.MeshPhysicalMaterial){
    material.color.set(0xb0e8ed);material.roughness=.095;material.clearcoat=.72;material.clearcoatRoughness=.15;
    material.envMapIntensity=2.1;material.attenuationColor.set(0x508da0);material.attenuationDistance=.75;
   }
   if(object.name==='zeno-dew-seed'){
    material.color.set(0xd8eee5);material.emissiveIntensity=.28;material.roughness=.3;
   }
  }
 });
}
