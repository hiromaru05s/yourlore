import * as T from 'three';
import {homeDaylight} from './homeDaylight';
/** Approved Zeno toon surface: light ramps, colored contour and authored gem glints.
 * No extracted game shaders or textures. Same continuously deforming Zeno rig. */
const SHADOW_SOFTNESS=.045;
const OUTLINE_SCALE=1.15;
const vertexShader=`
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vLocal;
void main(){
 vec4 mv=modelViewMatrix*vec4(position,1.);
 vNormal=normalize(normalMatrix*normal);vView=-mv.xyz;vLocal=position;
 gl_Position=projectionMatrix*mv;
}`;
function cel(lit:number,shadow:number,deep:number,kind:number){
 const m=new T.ShaderMaterial({toneMapped:false,uniforms:{
  litColor:{value:new T.Color(lit)},shadowColor:{value:new T.Color(shadow)},deepColor:{value:new T.Color(deep)},
  lightDirection:{value:new T.Vector3(-.62,.78,.68).normalize()},softness:{value:SHADOW_SOFTNESS},kind:{value:kind},daylight:{value:1},
 },vertexShader,fragmentShader:`
 uniform vec3 litColor,shadowColor,deepColor,lightDirection;
 uniform float softness,kind,daylight;
 varying vec3 vNormal,vView,vLocal;
 void main(){
  vec3 n=normalize(vNormal),v=normalize(vView),l=normalize(lightDirection);
  float ndl=dot(n,l),nv=max(0.,dot(n,v));
  float aa=max(fwidth(ndl)*1.2,.003);
  float edge=max(aa,softness);
  float lightBand=smoothstep(.17-edge,.17+edge,ndl);
  float deepBand=smoothstep(-.50-edge,-.50+edge,ndl);
  vec3 c=mix(deepColor,shadowColor,deepBand);
  c=mix(c,litColor,lightBand);
  // A narrow warm terminator unites the cool shadow and warm illuminated plane.
  if(kind<.5){
   float warm=(1.-smoothstep(.02,.085,abs(ndl-.17)))*(1.-lightBand)*.24;
   c=mix(c,vec3(.69,.56,.64),warm);
   // Gentle local occlusion below the face; painted into the actual torso.
   float faceAO=exp(-pow(vLocal.x/.38,4.)-pow((vLocal.y+.075)/.045,2.))*smoothstep(.24,.40,vLocal.z);
   c=mix(c,shadowColor,faceAO*.34);
  }
  // Selective cool reflected edge, rather than a uniformly glowing perimeter.
  float rim=smoothstep(.70,.86,1.-nv)*(1.-smoothstep(-.18,.35,ndl));
  rim*=smoothstep(-.3,.6,n.x);
  c=mix(c,litColor,rim*.40);
  c*=.97+.03*daylight;
  if(kind>1.5){
   vec3 h=normalize(l+v);
   float spec=smoothstep(.962,.977,dot(n,h));
   float band=smoothstep(.82,.88,1.-nv)*smoothstep(-.45,.35,ndl);
   // The teardrop keeps internal depth and a small coherent luminous core.
   float core=exp(-pow(vLocal.x/.047,2.)-pow((vLocal.y+.08)/.067,2.))*smoothstep(.01,.07,vLocal.z);
   c=mix(c,vec3(.30,.87,.92),core*.73);
   c=mix(c,vec3(.83,1.,.98),max(spec,band*.68));
  }
  gl_FragColor=vec4(c,1.);
  #include <colorspace_fragment>
 }
 `});
 m.onBeforeRender=(_r,_s,camera)=>{
  m.uniformsNeedUpdate=true;
  m.uniforms.softness.value=SHADOW_SOFTNESS;
  m.uniforms.daylight.value=homeDaylight.sun;
  m.uniforms.lightDirection.value.set(-.62+homeDaylight.sweep*.06,.78,.68).normalize().transformDirection(camera.matrixWorldInverse);
 };
 return m;
}
function contour(mesh:T.Mesh,width:number){
 const mat=new T.ShaderMaterial({side:T.BackSide,toneMapped:false,uniforms:{
  pixelSize:{value:new T.Vector2(1,1)},lineWidth:{value:width},
 },vertexShader:`
 uniform vec2 pixelSize;uniform float lineWidth;
 varying float edgeLight;
 void main(){
  vec3 n=normalize(normalMatrix*normal);
  vec4 mv=modelViewMatrix*vec4(position,1.);
  gl_Position=projectionMatrix*mv;
  vec2 direction=normalize(n.xy+vec2(.00001));
  gl_Position.xy+=direction*pixelSize*lineWidth*gl_Position.w;
  gl_Position.z+=.00006*gl_Position.w;
  edgeLight=smoothstep(-.4,.65,dot(n,normalize(vec3(-.6,.8,.6))));
 }`,fragmentShader:`varying float edgeLight;
 void main(){gl_FragColor=vec4(mix(vec3(.065,.085,.14),vec3(.24,.28,.36),edgeLight),1.);
 #include <colorspace_fragment>
 }`});
 const size=new T.Vector2();
 mat.onBeforeRender=renderer=>{mat.uniformsNeedUpdate=true;renderer.getSize(size);mat.uniforms.pixelSize.value.set(2/size.x,2/size.y);mat.uniforms.lineWidth.value=width*OUTLINE_SCALE;};
 const outline=new T.Mesh(mesh.geometry,mat);outline.name='toon-colored-contour';outline.frustumCulled=false;outline.castShadow=false;outline.receiveShadow=false;
 mesh.add(outline);
}
export function applyZenoToonSurface(body:T.Group,pearl:T.Material,face:T.Mesh){
 const meshes:T.Mesh[]=[];body.traverse(o=>{if(o instanceof T.Mesh)meshes.push(o);});
 const skin=cel(0xfff5e7,0xb8bfdf,0x8d9fc6,.5);
 const torso=cel(0xfff5e7,0xb8bfdf,0x8d9fc6,0);
 const inset=cel(0xbacfe7,0x8699c8,0x637aa9,1);
 const mask=cel(0x29374f,0x1e2943,0x172038,1);
 const gem=cel(0x57d3e3,0x2689ad,0x205483,2);
 const frame=cel(0xe6f5f2,0x99bbd1,0x56769d,1);
 const replaced=new Set<T.Material>();
 for(const mesh of meshes){
  const old=mesh.material;
  if(old===pearl){mesh.material=mesh.name==='zeno-shell'?torso:skin;contour(mesh,1);}
  else if(mesh===face){mesh.material=mask;replaced.add(old as T.Material);}
  else if(mesh.name==='zeno-ear-inset'){mesh.material=inset;replaced.add(old as T.Material);}
  else if(mesh.name==='zeno-dew-glass'){mesh.material=gem;replaced.add(old as T.Material);contour(mesh,.7);}
  else if(mesh.name==='zeno-dew-rim'){mesh.material=frame;replaced.add(old as T.Material);}
  else if(old instanceof T.MeshStandardMaterial&&old.emissiveIntensity>0){
   // Keep the expression materials themselves: the shared motion code animates
   // their opacity, so replacing those objects would break the smile and yawn.
   old.color.set(0xb2ebf1);old.emissive.set(0x9ae1eb);old.emissiveIntensity=.7;old.roughness=1;
  }
 }
 replaced.forEach(m=>m.dispose());
}
