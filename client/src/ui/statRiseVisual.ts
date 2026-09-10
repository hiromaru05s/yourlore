import * as T from 'three';

export const STAT_RISE_DURATION = 1.5;
const vs=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
/** Approved arrow-first attack buff. Local units are the target card's width. */
export function createStatRiseVisual() {
const group=new T.Group(),resources:T.Material[]=[];
const smooth=T.MathUtils.smoothstep;
const phase=(t:number,start:number,duration:number)=>T.MathUtils.clamp((t-start)/duration,0,1);
function shader(fragment:string,uniforms:Record<string,T.IUniform>){const m=new T.ShaderMaterial({vertexShader:vs,fragmentShader:fragment,uniforms,transparent:true,side:T.DoubleSide,depthWrite:false});resources.push(m);return m;}
function mesh(g:T.BufferGeometry,m:T.Material){const o=new T.Mesh(g,m);group.add(o);return o;}
// Only the perimeter lights up; the card face and arrow flight paths stay clear.
const surfaceMaterial=shader(`varying vec2 vUv;uniform float alpha;float box(vec2 p,vec2 b){vec2 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,q.y),0.);}void main(){vec2 p=(vUv-.5)*vec2(1.,1.56);float d=box(p,vec2(.465,.737));float rim=1.-smoothstep(.003,.012,abs(d));gl_FragColor=vec4(.94,.66,.23,rim*alpha);}`,{alpha:{value:0}});
const surface=mesh(new T.PlaneGeometry(1.04,1.625),surfaceMaterial);surface.rotation.x=-Math.PI/2;surface.position.y=.025;
function chevronGeometry(){const s=new T.Shape();s.moveTo(0,.22);s.lineTo(.19,.045);s.lineTo(.14,-.015);s.lineTo(0,.10);s.lineTo(-.14,-.015);s.lineTo(-.19,.045);s.closePath();return new T.ShapeGeometry(s);}
const arrows=Array.from({length:3},()=>{const material=new T.MeshBasicMaterial({color:0xf6b338,transparent:true,side:T.DoubleSide,depthWrite:false,depthTest:false});resources.push(material);const o=mesh(chevronGeometry(),material);o.renderOrder=100;const innerM=new T.MeshBasicMaterial({color:0xfff4b9,transparent:true,side:T.DoubleSide,depthWrite:false,depthTest:false});resources.push(innerM);const core=new T.Mesh(chevronGeometry(),innerM);core.renderOrder=101;core.scale.set(.77,.75,1);core.position.set(0,.025,.002);o.add(core);return{o,material,innerM};});
function shardGeometry(){const s=new T.Shape();s.moveTo(0,.5);s.lineTo(.17,0);s.lineTo(0,-.5);s.lineTo(-.17,0);s.closePath();return new T.ShapeGeometry(s);}
// Six small glints stay at the outer edge, below and outside the rising arrows.
const particles=Array.from({length:6},(_,i)=>{const material=new T.MeshBasicMaterial({color:0xe8bd66,transparent:true,side:T.DoubleSide,depthWrite:false});resources.push(material);const o=mesh(shardGeometry(),material);return{o,material,x:i%2? .49:-.49,z:[-.62,.06,.62][Math.floor(i/2)],delay:(i%3)*.035,size:.025};});

return {group,update(age:number,camera:T.Camera){
const active=smooth(age,0,.16)*(1-smooth(age,.38,1.05));
surfaceMaterial.uniforms.alpha.value=active*.32;
arrows.forEach(({o,material,innerM},i)=>{const p=phase(age,.37+i*.16,.76);o.visible=p>0&&p<1;const side=i===0?-1:i===1?1:0;const ease=1-Math.pow(1-p,2);o.position.set(side*.32,.18+ease*.65,i===2?-.27:.33);o.quaternion.copy(camera.quaternion);o.scale.setScalar(.64+Math.sin(p*Math.PI)*.14);const opacity=smooth(p,0,.12)*(1-smooth(p,.52,1));material.opacity=opacity*.97;innerM.opacity=opacity;});
particles.forEach(({o,material,x,z,delay,size})=>{const p=phase(age,.10+delay,.48);o.visible=p>0&&p<1;o.position.set(x,.025+p*.075,z);o.quaternion.copy(camera.quaternion);o.scale.set(size,size*1.5,size);material.opacity=smooth(p,0,.15)*Math.pow(1-p,1.5)*.38;});
},dispose(){group.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});resources.forEach(m=>m.dispose());group.removeFromParent();}};
}
