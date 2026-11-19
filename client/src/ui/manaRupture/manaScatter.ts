import * as T from 'three';
import {BURST} from './timing';
import {smooth,type FragmentSet} from './bakedFragments';
/** One bounded mesh; every stream stays attached to an actual fracture surface. */
export class ManaScatter {
 readonly mesh:T.Mesh<T.BufferGeometry,T.ShaderMaterial>;
 private pieces:FragmentSet['pieces'];private steps=20;private head=new T.Vector3();private tail=new T.Vector3();private side=new T.Vector3();private eye=new T.Vector3();private delta=new T.Vector3();
 constructor(pieces:FragmentSet['pieces']){
  this.pieces=pieces.filter((p,i)=>i%2===0||!!p.leak).slice(0,24);const count=this.pieces.length,vertices=count*(this.steps+1)*2,g=new T.BufferGeometry(),uv=new Float32Array(vertices*2),seeds=new Float32Array(vertices),indices:number[]=[];
  g.setAttribute('position',new T.BufferAttribute(new Float32Array(vertices*3),3).setUsage(T.DynamicDrawUsage));
  for(let i=0;i<count;i++)for(let j=0;j<=this.steps;j++)for(let k=0;k<2;k++){const v=(i*(this.steps+1)+j)*2+k;uv[v*2]=j/this.steps;uv[v*2+1]=k;seeds[v]=this.pieces[i].seed;if(j<this.steps&&k===0)indices.push(v,v+1,v+2,v+1,v+3,v+2);}
  g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setAttribute('seed',new T.BufferAttribute(seeds,1));g.setIndex(indices);
  const m=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,side:T.DoubleSide,blending:T.AdditiveBlending,uniforms:{clock:{value:0},power:{value:0}},vertexShader:`attribute float seed;varying vec2 vUv;varying float vSeed;void main(){vUv=uv;vSeed=seed;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 vUv;varying float vSeed;uniform float clock;uniform float power;void main(){float cross=abs(vUv.y*2.-1.);float edge=pow(max(0.,1.-cross),1.3);float core=exp(-cross*cross*28.);float flow=.70+.30*sin(vUv.x*29.-clock*.014+vSeed*39.);float tears=smoothstep(.12,.48,sin(vUv.x*43.-clock*.008+vSeed*70.)*.5+.5);float a=edge*power*smoothstep(0.,.12,vUv.x)*(.68+.32*tears);vec3 blue=vec3(.025,.22,1.9)*flow;vec3 cyan=vec3(.20,1.5,2.9)*core;gl_FragColor=vec4(blue+cyan,a);}`});
  this.mesh=new T.Mesh(g,m);this.mesh.frustumCulled=false;this.mesh.renderOrder=2;
 }
 update(t:number,worldRoot:T.Group,camera:T.PerspectiveCamera){
  const power=smooth(BURST+10,BURST+105,t)*(1-smooth(2250,2940,t));this.mesh.visible=power>0;this.mesh.material.uniforms.power.value=power;this.mesh.material.uniforms.clock.value=t;if(!this.mesh.visible)return;
  this.eye.copy(camera.position);worldRoot.worldToLocal(this.eye);const positions=this.mesh.geometry.getAttribute('position') as T.BufferAttribute;
  this.pieces.forEach((p,i)=>{
   this.head.copy(p.leak??this.delta.set(0,0,.015)).applyEuler(p.node.rotation).add(p.node.position);
   this.tail.copy(p.center).lerp(this.head,.28+p.seed*.15+smooth(1960,2880,t)*.45);
   this.delta.copy(this.head).sub(this.tail);this.side.copy(this.eye).sub(this.head).cross(this.delta).normalize();if(this.side.lengthSq()<.01)this.side.set(1,0,0);
   for(let j=0;j<=this.steps;j++){const u=j/this.steps,arc=Math.sin(u*Math.PI),bend=arc*Math.sin(u*4.0+p.seed*17+t*.0014)*(.025+p.seed*.06),width=(.044+p.seed*.052)*Math.sin(u*Math.PI/2)*(.48+.52*arc);
    for(let k=0;k<2;k++){const offset=bend+(k===0?-width:width),v=(i*(this.steps+1)+j)*2+k;positions.setXYZ(v,this.tail.x+this.delta.x*u+this.side.x*offset,this.tail.y+this.delta.y*u+this.side.y*offset,this.tail.z+this.delta.z*u+this.side.z*offset);}}
  });positions.needsUpdate=true;
 }
 dispose(){this.mesh.geometry.dispose();this.mesh.material.dispose();}
}
