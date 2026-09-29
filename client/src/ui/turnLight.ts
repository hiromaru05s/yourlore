import * as T from 'three';
import type {TurnLightHandle,TurnLightState} from './turnLightPreview';
export const TURN_LIGHTS=[
 {id:'porcelain',name:'蒼白の磁器',caption:'白熱する縁から、青白い光が大きく呼吸する。',color:'#7cdfff'},
 {id:'inscription',name:'金紋の点灯',caption:'金の刻印が強く灯り、琥珀の光を周囲へ投げる。',color:'#f5c574'},
 {id:'prism',name:'蒼晶の灯',caption:'青い光が内部をうねり、縁から鮮やかに溢れる。',color:'#80c9ff'},
] as const;
export type TurnLightId=typeof TURN_LIGHTS[number]['id'];
export function isTurnLight(s:unknown):s is TurnLightId{return TURN_LIGHTS.some(v=>v.id===s);}
const declarations=`
varying vec3 vTurnPosition;
uniform float uTime,uActive,uEnemy,uRemaining,uHover,uVariant,uReduced;
const float TURN_PI=3.14159265359;
float line(float d,float w){return 1.-smoothstep(w,w+0.018,abs(d));}
`;
export function createTurnLights(turn:T.Group,segments:T.Mesh[],getVariant:()=>TurnLightId,displayScene?:T.Scene):TurnLightHandle{
 const originals=new Map<T.Mesh,T.Material|T.Material[]>(),owned:T.Material[]=[];
 const u={uTime:{value:0},uActive:{value:1},uEnemy:{value:0},uRemaining:{value:1},uHover:{value:0},uVariant:{value:0},uReduced:{value:0}};
 function shader(material:T.MeshStandardMaterial,kind:'face'|'timer'){
  material.onBeforeCompile=s=>{
   Object.assign(s.uniforms,u);s.vertexShader='varying vec3 vTurnPosition;\n'+s.vertexShader;
   s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvTurnPosition=position;');
   s.fragmentShader=declarations+s.fragmentShader;
   const expression=kind==='face'?`
    vec2 p=vTurnPosition.xz/.0397;float r=length(p),a=atan(p.x,-p.y);
    float breath=.5+.5*sin(uTime*1.7);float edge=line(r-.955,.018);
    float sheen=pow(max(0.,1.-abs(p.x*.65+p.y*.35-sin(uTime*.55)*1.35)*1.4),5.);
    vec3 tint=vec3(.16,.68,1.);vec3 base=vec3(.045,.16,.23);float glow=0.;
    if(uVariant<.5){
      base=mix(vec3(.11,.29,.37),vec3(.52,.78,.81),.35+.45*(1.-r));
      glow=.22+edge*(3.8+2.4*breath)+sheen*.40;
      glow+=line(r-.81,.003)*.65;
    }else if(uVariant<1.5){
      tint=vec3(1.,.62,.19);base=vec3(.095,.062,.025);
      float sweep=pow(.5+.5*cos(a-uTime*.5),8.);
      float ticks=pow(max(0.,cos(a*32.)),24.)*smoothstep(.67,.73,r)*(1.-smoothstep(.83,.87,r));
      float etch=line(r-.85,.006)+line(r-.70,.003)*.5+ticks*.7;
      glow=.035+edge*(2.6+1.6*breath)+etch*(1.0+3.8*sweep);
      base+=vec3(.12,.07,.018)*sheen;
    }else{
      tint=vec3(.13,.62,1.);base=vec3(.012,.072,.17);
      float caustic=pow(.5+.5*sin(p.x*9.+sin(p.y*6.+uTime*.5)*2.+uTime*.7),9.);
      float facet=pow(max(0.,cos(a*6.+r*3.)),16.)*smoothstep(.45,.95,r);
      glow=.07+edge*(3.4+2.1*breath)+caustic*.8*(.25+.75*r)+facet*1.8;
      base+=vec3(.02,.13,.23)*(1.-r);
    }
    float activity=uActive*(1.+.3*uHover);
    vec3 offBase=mix(vec3(.06,.075,.082),vec3(.13,.035,.05),uEnemy);
    diffuseColor.rgb=mix(offBase,base,uActive);
    totalEmissiveRadiance=tint*glow*activity;
   `:`
    vec2 p=vTurnPosition.xz;float r=length(p);
    float angle=mod(atan(p.x,-p.y)+TURN_PI*2.,TURN_PI*2.)/(TURN_PI*2.);
    float amount=1.-smoothstep(uRemaining-.002,uRemaining+.002,angle);
    if(uRemaining<=0.)amount=0.;
    float core=line((r-.05585)/.0041,.17);
    float head=exp(-abs(angle-uRemaining)*145.)*step(.001,uRemaining);
    vec3 tint=uVariant>.5&&uVariant<1.5?vec3(1.,.56,.13):vec3(.12,.64,1.);
    if(uRemaining<=.1667)tint=vec3(1.,.32,.045);
    if(uRemaining<=.0556)tint=vec3(1.,.075,.025);
    tint=mix(tint,vec3(.48,.13,.18),uEnemy);
    float enabled=mix(.24,1.,uActive);
    diffuseColor.rgb=mix(vec3(.013,.021,.025),tint*.22,amount);
    totalEmissiveRadiance=tint*amount*(.8+core*2.8+head*(3.6+.9*sin(uTime*2.)))*enabled;
   `;
   s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n'+expression);
  };material.customProgramCacheKey=()=>`turn-light-${kind}-v2`;
 }
 let face:T.MeshStandardMaterial|undefined;
 const rimMaterials:T.MeshStandardMaterial[]=[];
 turn.traverse(o=>{if(!(o instanceof T.Mesh)||!(o.material instanceof T.MeshStandardMaterial))return;
  if(o.material.name.startsWith('Turn enamel')||o.material.name.includes('silver')){
   originals.set(o,o.material);const m=o.material.clone();owned.push(m);o.material=m;
   if(m.name.startsWith('Turn enamel')){face=m;m.metalness=.16;m.roughness=.25;shader(m,'face');}else rimMaterials.push(m);
  }
 });
 const timerMaterial=new T.MeshStandardMaterial({roughness:.24,metalness:.25});shader(timerMaterial,'timer');owned.push(timerMaterial);
 for(const mesh of segments)originals.set(mesh,mesh.material);
 const spillMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,uniforms:u,
  vertexShader:'varying vec2 vP; void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`precision highp float;varying vec2 vP;uniform float uActive,uEnemy,uRemaining,uVariant,uTime;
   void main(){float r=length(vP);float a=mod(atan(vP.x,vP.y)+6.2831853,6.2831853)/6.2831853;
   float falloff=exp(-pow((r-.0559)/.006,2.));float amount=1.-smoothstep(uRemaining-.003,uRemaining+.003,a);
   if(uRemaining<=0.)amount=0.;vec3 c=uVariant>.5&&uVariant<1.5?vec3(1.,.57,.17):vec3(.18,.7,1.);
   if(uRemaining<=.1667)c=vec3(1.,.27,.04);if(uRemaining<=.0556)c=vec3(1.,.08,.03);
   gl_FragColor=vec4(c,falloff*amount*uActive*(.54+.14*sin(uTime*1.7)));}`});
 const spillGeometry=new T.PlaneGeometry(.15,.15),spill=new T.Mesh(spillGeometry,spillMaterial);
 spill.rotation.x=-Math.PI/2;spill.position.y=.00665;turn.add(spill);owned.push(spillMaterial);
 // Light leaking directly from the moving cap. The dark center stays clear for the label.
 // This is a graded emission field, with no detached geometry or travelling particles.
 const capGlowMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.NormalBlending,toneMapped:false,uniforms:u,
  vertexShader:'varying vec2 vP; void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`precision highp float;varying vec2 vP;uniform float uActive,uVariant,uTime,uHover;
   void main(){
    float r=length(vP),a=atan(vP.y,vP.x),breath=.5+.5*sin(uTime*1.7);
    float width=.0045+breath*.0025;
    vec3 c=vec3(.14,.70,1.);float shape=1.;
    if(uVariant>.5&&uVariant<1.5){c=vec3(1.,.51,.095);shape=.65+.6*pow(.5+.5*cos(a-uTime*.5),5.);}
    if(uVariant>1.5){c=vec3(.08,.46,1.);shape=.7+.45*pow(.5+.5*cos(a*6.+uTime*.6),3.);}
    float edge=exp(-pow((r-.0418)/.0018,2.));
    float near=exp(-pow((r-.044)/width,2.))*smoothstep(.033,.040,r);
    float air=exp(-pow((r-.047)/.024,2.))*smoothstep(.039,.048,r);
    float fade=1.-smoothstep(.078,.095,r);
    float power=(.8+.65*breath)*(1.+.4*uHover);
    vec3 light=(c*(near*1.5+air*.26)*shape+mix(c,vec3(1.),.65)*edge*.75)*power;
    float opacity=clamp(max(light.r,max(light.g,light.b))*.65,0.,.88);
    vec3 radiant=light/max(.0001,max(light.r,max(light.g,light.b)))*1.6;
    gl_FragColor=vec4(radiant,opacity*fade*uActive);
   }`});
 const capGlowGeometry=new T.PlaneGeometry(.2,.2),capGlow=new T.Mesh(capGlowGeometry,capGlowMaterial);
 capGlow.rotation.x=-Math.PI/2;capGlow.position.y=.0125;
 (turn.getObjectByName('PRESS_CAP')??turn).add(capGlow);owned.push(capGlowMaterial);
 // Display-referred light is composited after the cached HDR board is presented.
 // Otherwise the full-screen AgX pass tone-maps the custom glow and its blended
 // backdrop, unlike the approved direct-to-canvas comparison renderer.
 const savedLayers=new Map<T.Object3D,number>();
 const displayLights:T.DirectionalLight[]=[];
 const displayTargets:T.Object3D[]=[];
 const displayLayer=3;
 const depthMaterial=displayScene?new T.MeshBasicMaterial({colorWrite:false}):undefined;
 const depthCamera=new T.Camera(),crop=new T.Matrix4(),savedViewport=new T.Vector4();
 depthCamera.matrixAutoUpdate=false;depthCamera.matrixWorldAutoUpdate=false;
 const displayBounds=new T.Box3(),corner=new T.Vector3(),displaySize=new T.Vector2(),savedScissor=new T.Vector4();
 if(displayScene){
  const isolate=(o:T.Object3D)=>{savedLayers.set(o,o.layers.mask);o.layers.set(displayLayer);};
  turn.traverse(isolate);segments.forEach(isolate);
  for(const [color,intensity,position] of [[0xffeed9,2.3,[-.1,.3,.2]],[0xc4daff,.7,[.2,.2,-.1]]] as const){
   const light=new T.DirectionalLight(color,intensity),target=new T.Object3D();
   light.layers.set(displayLayer);light.position.set(position[0],position[1],position[2]).add(turn.position);target.position.copy(turn.position);
   light.target=target;turn.parent!.add(light,target);displayLights.push(light);displayTargets.push(target);
  }
 }
 let signature='',lastPaint=-Infinity;
 return {update(s:TurnLightState){
  const variant=TURN_LIGHTS.findIndex(v=>v.id===getVariant());
  u.uVariant.value=variant;u.uEnemy.value=Number(s.enemy);u.uRemaining.value=Math.max(0,Math.min(1,s.remaining));u.uReduced.value=Number(s.reduced);
  u.uTime.value=s.reduced?0:s.now/1000;u.uHover.value=Number(s.hover||s.pressed);
  const target=Number(s.active);u.uActive.value=target;
  // The normal widget tick assigns its timer material before this preview hook.
  for(const mesh of segments)mesh.material=timerMaterial;
  if(face){face.color.set(0xffffff);face.emissive.set(0x000000);}
  for(const m of rimMaterials){m.emissive.set(TURN_LIGHTS[variant].color);m.emissiveIntensity=s.active?2.2+(s.hover?.7:0):0;}
  const key=[variant,s.active,s.enemy,s.remaining,s.hover,s.pressed,s.reduced].join(':');const changed=key!==signature;signature=key;
  const paint=changed||(!s.reduced&&s.active&&s.now-lastPaint>=32);if(paint)lastPaint=s.now;return paint;
 },renderDisplay:displayScene?(renderer,camera)=>{
  const mask=camera.layers.mask,override=displayScene.overrideMaterial,scissorTest=renderer.getScissorTest(),shadows=renderer.shadowMap.enabled;
  renderer.getScissor(savedScissor);renderer.getViewport(savedViewport);renderer.getSize(displaySize);displayBounds.setFromObject(turn);
  let left=1,right=-1,bottom=1,top=-1;
  for(const x of [displayBounds.min.x,displayBounds.max.x])for(const y of [displayBounds.min.y,displayBounds.max.y])for(const z of [displayBounds.min.z,displayBounds.max.z]){
   corner.set(x,y,z).project(camera);left=Math.min(left,corner.x);right=Math.max(right,corner.x);bottom=Math.min(bottom,corner.y);top=Math.max(top,corner.y);
  }
  const x=Math.max(0,Math.floor((left+1)*.5*displaySize.x)-2),y=Math.max(0,Math.floor((bottom+1)*.5*displaySize.y)-2);
  const w=Math.min(displaySize.x,Math.ceil((right+1)*.5*displaySize.x)+2)-x,h=Math.min(displaySize.y,Math.ceil((top+1)*.5*displaySize.y)+2)-y;
  try{
   renderer.setScissor(x,y,Math.max(1,w),Math.max(1,h));renderer.setScissorTest(true);renderer.clearDepth();renderer.shadowMap.enabled=false;
   // Rebuild only the local socket's depth, retaining furniture occlusion when
   // the cap presses down. The cached board's color is never drawn again.
   // Scissoring alone still submits every mesh on the board. A matching
   // cropped frustum also culls geometry outside this small socket region.
   const cw=Math.max(1,w),ch=Math.max(1,h);
   crop.set(displaySize.x/cw,0,0,(displaySize.x-2*x-cw)/cw,0,displaySize.y/ch,0,(displaySize.y-2*y-ch)/ch,0,0,1,0,0,0,0,1);
   depthCamera.matrixWorld.copy(camera.matrixWorld);depthCamera.matrixWorldInverse.copy(camera.matrixWorldInverse);
   depthCamera.projectionMatrix.multiplyMatrices(crop,camera.projectionMatrix);depthCamera.projectionMatrixInverse.copy(depthCamera.projectionMatrix).invert();
   depthCamera.layers.set(0);displayScene.overrideMaterial=depthMaterial!;renderer.setViewport(x,y,cw,ch);renderer.render(displayScene,depthCamera);
   renderer.setViewport(savedViewport);displayScene.overrideMaterial=override;camera.layers.set(displayLayer);renderer.render(displayScene,camera);
  }finally{camera.layers.mask=mask;displayScene.overrideMaterial=override;renderer.shadowMap.enabled=shadows;renderer.setViewport(savedViewport);renderer.setScissor(savedScissor);renderer.setScissorTest(scissorTest);}
 }:undefined,dispose(){
  depthMaterial?.dispose();
  for(const [object,mask] of savedLayers)object.layers.mask=mask;
  displayLights.forEach(light=>{light.removeFromParent();light.dispose();});displayTargets.forEach(target=>target.removeFromParent());
  spill.removeFromParent();spillGeometry.dispose();capGlow.removeFromParent();capGlowGeometry.dispose();for(const [mesh,material] of originals)mesh.material=material;owned.forEach(m=>m.dispose());}};
}
