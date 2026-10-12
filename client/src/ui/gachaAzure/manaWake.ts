import * as T from 'three';
import {flightPoint,flightRotation} from './kinematics';
import {wakeSample} from './wakeMotion';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const STEPS=160;
/** A camera-facing swept ribbon, with width perpendicular to its actual trajectory. */
export class ManaWake{
 strips:T.Mesh<T.BufferGeometry,T.ShaderMaterial>[]=[];
 constructor(scene:T.Scene){
  for(let k=0;k<6;k++){
   const geometry=new T.BufferGeometry(),indices:number[]=[];
   for(let j=0;j<STEPS;j++)indices.push(j*2,j*2+1,j*2+2,j*2+1,j*2+3,j*2+2);
   geometry.setAttribute('position',new T.BufferAttribute(new Float32Array((STEPS+1)*6),3));
   geometry.setAttribute('uv',new T.BufferAttribute(new Float32Array((STEPS+1)*4),2));
   geometry.setAttribute('emission',new T.BufferAttribute(new Float32Array((STEPS+1)*2),1));geometry.setIndex(indices);
   const material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,uniforms:{alpha:{value:0}},vertexShader:'attribute float emission;varying float vEmission;varying vec2 vUv;void main(){vEmission=emission;vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`
    varying vec2 vUv;varying float vEmission;uniform float alpha;
    void main(){
     float y=abs(vUv.y-.5)*2.;
     float core=exp(-y*y*48.);
     float halo=exp(-y*y*4.5)*pow(max(0.,1.-y*y),2.);
     float tail=pow(max(0.,1.-vUv.x),.85);
     vec3 color=mix(vec3(.12,.53,1.)*2.2,vec3(.72,.92,1.)*4.1,core);
     gl_FragColor=vec4(color,(core*.65+halo*.28)*tail*alpha*vEmission);
    }`});
   const mesh=new T.Mesh(geometry,material);mesh.frustumCulled=false;scene.add(mesh);this.strips.push(mesh);
  }
 }
 update(t:number,_seconds:number,variant:number,reduced:boolean,camera:T.Camera){
  const samples=Array.from({length:STEPS+1},(_,j)=>wakeSample(t,j/STEPS,variant));
  const strength=Math.max(...samples.map(s=>s.emission));
  this.strips.forEach((m,k)=>{
   m.visible=(variant===0?k<2:variant===1?k<4:true)&&!reduced&&strength>.001;if(!m.visible)return;
   m.material.uniforms.alpha.value=variant===2?.74:.91;
   const side=k%2?1:-1,rank=Math.floor(k/2);
   const centers=samples.map(({history,emission},j)=>{
    const p=flightPoint(history,variant),r=flightRotation(history,variant),q=new T.Quaternion().setFromEuler(new T.Euler(r.x,r.y,r.z));
    // The source is on the front gilded edge, not hidden inside the back cover.
    const anchor=V(side*1.09,variant===2?-.92+rank*.76:variant===1?-.60+rank*1.15:side*.72,.395).applyQuaternion(q);
    const center=V(p.x,p.y,p.z).add(anchor),age=j/STEPS;
    // Very small inertial spread; the recorded path supplies the main curvature.
    center.y+=Math.sin(history*17+rank)*age*age*.07*emission;
    if(variant===2)center.y+=(rank-1)*age*age*.12*emission;
    return center;
   });
   const distances=[0];for(let j=1;j<=STEPS;j++)distances[j]=distances[j-1]+centers[j].distanceTo(centers[j-1]);
   const length=Math.max(.0001,distances[STEPS]);
   const pos=m.geometry.attributes.position as T.BufferAttribute,uv=m.geometry.attributes.uv as T.BufferAttribute,emit=m.geometry.attributes.emission as T.BufferAttribute;
   let lastCross=new T.Vector3(0,1,0);
   for(let j=0;j<=STEPS;j++){
    const center=centers[j],progress=distances[j]/length,energy=samples[j].emission;
    const tangent=centers[Math.min(STEPS,j+1)].clone().sub(centers[Math.max(0,j-1)]);
    const view=camera.position.clone().sub(center).normalize();
    const cross=new T.Vector3().crossVectors(view,tangent);
    if(cross.lengthSq()<1e-10)cross.copy(lastCross);else cross.normalize();
    // Preserve orientation at projected inflections; no bow-tie quads or disappearing edges.
    if(cross.dot(lastCross)<0)cross.negate();lastCross.copy(cross);
    const taper=Math.pow(Math.max(0,1-progress),1.3);
    const width=(.038+Math.sin(progress*Math.PI)*[.15,.12,.18][variant])*taper*Math.sqrt(energy);
    cross.multiplyScalar(width);
    pos.setXYZ(j*2,center.x-cross.x,center.y-cross.y,center.z-cross.z);pos.setXYZ(j*2+1,center.x+cross.x,center.y+cross.y,center.z+cross.z);
    uv.setXY(j*2,progress,0);uv.setXY(j*2+1,progress,1);emit.setX(j*2,energy);emit.setX(j*2+1,energy);
   }
   pos.needsUpdate=uv.needsUpdate=emit.needsUpdate=true;
  });
 }
}
