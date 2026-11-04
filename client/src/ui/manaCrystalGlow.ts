import * as T from 'three';

/** Approved 03「深青の光芯」, revision 2 (2026-11-04).
 * Keep the sapphire hull and its existing refracted rays; illuminate their interior.
 * Trays follow the rendered ready instances, including their formation/landing timing.
 */
export function createManaCrystalGlow(){
 const breath={value:1};
 const geometry=new T.PlaneGeometry(.062,.068).rotateX(-Math.PI/2);
 const material=new T.ShaderMaterial({
  transparent:true,depthWrite:false,blending:T.AdditiveBlending,
  uniforms:{strength:{value:1.05},tint:{value:new T.Color(0x177af9)}},
  vertexShader:`varying vec2 uvGlow;void main(){
   uvGlow=uv;vec4 p=vec4(position,1.);
   #ifdef USE_INSTANCING
    p=instanceMatrix*p;
   #endif
   gl_Position=projectionMatrix*modelViewMatrix*p;
  }`,
  fragmentShader:`varying vec2 uvGlow;uniform float strength;uniform vec3 tint;
   void main(){vec2 p=(uvGlow-.5)*2.;float d=abs(p.x)*1.25+abs(p.y);
    float a=exp(-d*d*5.)*(1.-smoothstep(.7,1.,length(p)));
    gl_FragColor=vec4(tint*1.8,a*strength);
   }`,
 });
 const trays:Array<{halo:T.InstancedMesh;lamp:T.PointLight;count:number}>=[];
 const matrix=new T.Matrix4(),position=new T.Vector3(),rotation=new T.Quaternion(),size=new T.Vector3();
 let lastPaint=-Infinity,worldScale=1,dead=false;
 function applyMaterial(m:T.MeshPhysicalMaterial){
  const original=m.onBeforeCompile.bind(m),key=m.customProgramCacheKey.bind(m);
  m.onBeforeCompile=(shader,renderer)=>{
   original(shader,renderer);
   shader.uniforms.manaGlowBreath=breath;
   shader.fragmentShader=shader.fragmentShader.replace('uniform vec4 crystalPlanes','uniform float manaGlowBreath;\nuniform vec4 crystalPlanes');
   shader.fragmentShader=shader.fragmentShader.replace('pos+=ray*distance;',`
    vec3 mid=pos+ray*distance*.5;
    vec3 corePoint=mid*vec3(2.6,1.55,2.6);
    float core=exp(-dot(corePoint,corePoint)*2.4);
    vec3 source=vec3(.002,.035,.42)*.18+vec3(.004,.55,2.4)*pow(core,5.4)*6.0;
    radiance+=throughput*source*min(distance,1.5)*manaGlowBreath;
    pos+=ray*distance;`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
    float glowFacing=abs(dot(normalize(vCrystalNormal),normalize(vCrystalEye-vCrystalLocal)));
    float glowEdge=pow(1.0-glowFacing,3.0);
    float glowTop=pow(max(0.0,vCrystalNormal.y),5.0);
    totalEmissiveRadiance+=vec3(.002,.02,.15)+vec3(.003,.12,.55)*glowEdge*.65+vec3(.003,.055,.30)*glowTop*.2;
   `);
  };
  m.customProgramCacheKey=()=>key()+'-mana-sapphire-core-v1';
  m.needsUpdate=true;
 }
 function addTray(parent:T.Group){
  const halo=new T.InstancedMesh(geometry,material,30);
  halo.name='available-mana-glow';halo.count=0;halo.visible=false;
  halo.instanceMatrix.setUsage(T.DynamicDrawUsage);
  const lamp=new T.PointLight(0x247bff,0,0,2);lamp.name='available-mana-reflection';
  parent.add(halo,lamp);
  const tray={halo,lamp,count:0};trays.push(tray);
  return {
   /** Called after the ready instance matrices change, never from future DOM totals. */
   sync(ready:T.InstancedMesh){
    if(dead)return;
    tray.count=Math.min(30,ready.count);halo.count=tray.count;halo.visible=tray.count>0;
    lamp.position.set(0,0,0);
    for(let i=0;i<tray.count;i++){
     ready.getMatrixAt(i,matrix);matrix.decompose(position,rotation,size);
     position.add(ready.position);lamp.position.add(position);
     position.y+=.004;size.multiplyScalar(1.18);
     matrix.compose(position,rotation,size);halo.setMatrixAt(i,matrix);
    }
    if(tray.count){lamp.position.divideScalar(tray.count);lamp.position.y+=.035;}
    lamp.intensity=worldScale**2*.0054*Math.min(1,tray.count/2);
    halo.instanceMatrix.needsUpdate=true;
    if(tray.count){halo.computeBoundingBox();halo.computeBoundingSphere();}
   },
  };
 }
 function tick(now:number,scale:number,reduced:boolean){
  if(dead)return false;
  let changed=scale!==worldScale;worldScale=scale;
  for(const t of trays){t.lamp.distance=.085*scale;t.lamp.intensity=scale**2*.0054*Math.min(1,t.count/2);}
  // The approved slow 4.5% variation does not need a full HDR board pass at 60 Hz.
  // Bound refreshes to 8 Hz and ignore sub-perceptual intensity changes. Zero mana sleeps.
  if(trays.some(t=>t.count>0)&&(reduced||now-lastPaint>=125)){
   const next=reduced?1:1+.045*Math.sin(now*.0009);
   if(Math.abs(next-breath.value)>.002||(reduced&&breath.value!==1)){
    breath.value=next;lastPaint=now;changed=true;
   }
  }
  return changed;
 }
 return {applyMaterial,addTray,tick,dispose(){
  if(dead)return;dead=true;
  for(const {halo,lamp}of trays){halo.removeFromParent();halo.dispose();lamp.removeFromParent();lamp.dispose();}
  trays.length=0;geometry.dispose();material.dispose();
 }};
}
