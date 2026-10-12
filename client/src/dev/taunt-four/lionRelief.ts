import * as T from 'three';
import {ease,pulse} from './catalog';
/** The carving is raised continuously from the two lower frame corners. */
export class LionRelief {
 readonly ready:Promise<void>;
 private geometry=new T.PlaneGeometry(205,220,72,80);
 private mesh:T.Mesh;
 private reveal={value:0};private shine={value:0};
 constructor(parent:T.Group){
  const material=new T.MeshBasicMaterial({transparent:true,alphaTest:.06,side:T.DoubleSide,depthWrite:true,toneMapped:false});
  material.onBeforeCompile=shader=>{
   shader.uniforms.reliefReveal=this.reveal;shader.uniforms.reliefShine=this.shine;
   shader.fragmentShader='uniform float reliefReveal;uniform float reliefShine;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
    float flow=vMapUv.y+.045*sin(vMapUv.x*21.)+.02*sin(vMapUv.y*37.+vMapUv.x*14.);
    float visible=1.-smoothstep(reliefReveal-.025,reliefReveal+.025,flow);
    float front=exp(-abs(flow-reliefReveal)*68.);
    diffuseColor.rgb+=vec3(.28,.18,.07)*front+vec3(.12,.085,.037)*reliefShine*pow(max(0.,sin(vMapUv.y*9.+vMapUv.x*4.)),14.);
    diffuseColor.a*=visible;`);
  };
  this.mesh=new T.Mesh(this.geometry,material);this.mesh.position.z=4;parent.add(this.mesh);
  this.ready=new Promise((resolve,reject)=>{new T.TextureLoader().load('/art/vfx/taunt-four/lion-relief.png',texture=>{texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;material.map=texture;material.needsUpdate=true;resolve();},undefined,reject);});
 }
 update(t:number){
  const rise=pulse(10,335,660,990,t),roar=pulse(265,400,520,720,t),breath=Math.sin(Math.min(1,Math.max(0,(t-350)/200))*Math.PI)*1.8;
  this.reveal.value=1.15*pulse(0,310,730,1000,t)-.06;this.shine.value=pulse(220,385,520,790,t);
  const p=this.geometry.attributes.position;
  for(let row=0;row<=80;row++)for(let col=0;col<=72;col++){
   const u=col/72,q=row/80,x=(u-.5)*205,y=110-q*220;
   const center=Math.max(0,1-(x/105)**2),height=(20+36*center)*Math.sin(q*Math.PI);
   const jaw=ease(.54,.80,q)*(1-ease(.16,.37,Math.abs(u-.5)));
   p.setXYZ(row*73+col,x,y-jaw*12*roar,4+height*rise+jaw*10*roar+breath*center*rise);
  }
  p.needsUpdate=true;this.mesh.visible=rise>.001;
 }
}
