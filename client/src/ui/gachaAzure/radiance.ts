import * as T from 'three';
import {DURATION} from './timing';
import {leafPoint,ease} from './kinematics';
import {Rewards,type RewardKind} from './rewards';
export const revelations=[
 {name:'蒼流の航跡',en:'AZURE WAKE',tag:'大きな左右の弧 × 二筋のマナ光尾',duration:DURATION,note:'右へ膨らみ、左へ切り返す大きなS字の飛来。表紙の両縁から二筋の蒼い光が軌跡を残す。中央で開いた秘字は光の波となり、授かった品へ収束する。',beat:'右 → 左 → 中央 ／ 二筋の光尾 → 秘字の光潮 → 顕現。'},
 {name:'星糸の遊泳',en:'SIDEREAL CURRENT',tag:'浮き上がる左右の揺れ × 重なる光糸',duration:DURATION,note:'高く浮き上がって右から左へ揺れ、中央へ降りてくる。装丁から生まれる四筋のマナが本の旋回に遅れて流れ、後方で重なる。頁の文字帯も螺旋として結果を織り上げる。',beat:'右上へ浮上 → 左へ旋回 → 中央 ／ 重なる光糸 → 顕現。'},
 {name:'光翼の帰還',en:'LUMINOUS GLIDE',tag:'低く滑る左右の弧 × 層をなす薄い光翼',duration:DURATION,note:'右から左へ低く滑空し、中央で静かに正面を向く。上下の装丁から延びる薄い光の層が揺れに追従する。見開きの光葉が剥がれ、その重なりから結果が現れる。',beat:'右へ滑空 → 左へ傾く → 中央 ／ 六枚の光翼 → 光葉の転写。'},
] as const;
const vertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const glowFragment=`
 varying vec2 vUv;uniform sampler2D mask;uniform float amount,travel,time,variant;
 void main(){
  float ink=texture2D(mask,vUv).r;
  float soft=0.;
  for(int i=-2;i<=2;i++){for(int j=-2;j<=2;j++){soft+=texture2D(mask,vUv+vec2(float(i)/768.,float(j)/1056.)*(1.+travel*7.)).r/25.;}}
  float edge=pow(max(0.,16.*vUv.x*(1.-vUv.x)*vUv.y*(1.-vUv.y)),.7);
  float threads=pow(.5+.5*sin(vUv.y*180.+sin(vUv.x*12.-time)*3.),12.);
  float field=edge*(.055+travel*.26)*( .65+.35*sin(vUv.x*8.+vUv.y*9.-time*2.));
  float a=amount*(ink*.78+soft*.9+field+threads*edge*travel*.12);
  vec3 color=mix(vec3(.10,.52,1.),vec3(.80,.95,1.),min(1.,ink+soft*.9));
  gl_FragColor=vec4(color*(1.9+ink*2.0),min(.96,a));
 }`;
export class Radiance{
 root=new T.Group();sheets:T.Mesh<T.PlaneGeometry,T.ShaderMaterial>[]=[];rewards:Rewards;kind:RewardKind='sleeve';ready:Promise<void>;count=1;rarity='SSR';
 constructor(scene:T.Scene,public pages:T.Mesh[],loadRewardModels=true){
  scene.add(this.root);
  for(let n=0;n<20;n++){const page=pages[n%2];const mat=new T.ShaderMaterial({vertexShader:vertex,fragmentShader:glowFragment,transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,uniforms:{mask:{value:(page.material as T.Material).userData.glyphMask},amount:{value:0},travel:{value:0},time:{value:0},variant:{value:0}}});const m=new T.Mesh(new T.PlaneGeometry(2.05,2.99,40,26),mat);m.frustumCulled=false;this.sheets.push(m);this.root.add(m);}
  this.rewards=new Rewards(scene,loadRewardModels);this.ready=this.rewards.ready;
 }
 render(seconds:number,variant:number,camera:T.Camera,reduced=false){
  const start=13.25,travel=ease(start,16.5,seconds),charge=ease(12.6,14.25,seconds)*(1-ease(16.8,18.2,seconds));
  const lift=ease(start,13.95,seconds),morph=ease(14.9,16.65,seconds),reveal=reduced?1.1:ease(16.05,17.45,seconds)*1.12;
  const end=camera.position.clone().add(new T.Vector3(0,.07,-4.3).applyQuaternion(camera.quaternion));
  const right=new T.Vector3(1,0,0).applyQuaternion(camera.quaternion),up=new T.Vector3(0,1,0).applyQuaternion(camera.quaternion),front=new T.Vector3(0,0,1).applyQuaternion(camera.quaternion);
  const ratio=(camera as T.PerspectiveCamera).aspect;const frameHeight=2*4.3*Math.tan((camera as T.PerspectiveCamera).fov*Math.PI/360),frameWidth=frameHeight*ratio;
  this.rewards.kind=this.kind;
  for(let n=0;n<this.sheets.length;n++){
   const side=n%2,item=Math.floor(n/2),pose=this.rewards.pose(item,seconds,frameWidth,frameHeight,this.count,reduced),cardW=pose.width,cardH=pose.height,kind=this.rewards.kindAt(item);
   const sheet=this.sheets[n],mat=sheet.material;sheet.visible=item<this.count&&!reduced&&seconds>=12.6&&seconds<18.2;if(!sheet.visible)continue;
   mat.uniforms.amount.value=charge*(.14+lift*.86)*(1-ease(16.7,18.2,seconds))*(this.count===10?(.1+.9*ease(14.75,16.10,seconds)):1);mat.uniforms.travel.value=lift;mat.uniforms.time.value=seconds;mat.uniforms.variant.value=variant;
   const pos=sheet.geometry.attributes.position as T.BufferAttribute,uv=sheet.geometry.attributes.uv;
   this.pages[side].updateWorldMatrix(true,false);
   for(let i=0;i<pos.count;i++){
    const u=uv.getX(i),v=uv.getY(i),q=side===0?leafPoint(1,0,u,v):{x:(u-.5)*2.04,y:(v-.5)*2.99,z:0};
    const from=new T.Vector3(q.x,q.y,q.z).applyMatrix4(this.pages[side].matrixWorld);from.addScaledVector(front,.008);
    const x=side===0?1-u:u;
    let tx=x-.5,ty=v-.5,tz=0;
    if(kind==='avatar'){const a=tx*2,b=ty*2;tx=.486*a*Math.sqrt(1-b*b/2);ty=.486*b*Math.sqrt(1-a*a/2)}
    if(kind==='furniture'){ty*=.86;tz=Math.sin(v*Math.PI)*.12*cardW}
    const target=end.clone().addScaledVector(right,tx*cardW+pose.x).addScaledVector(up,ty*cardH+pose.y).addScaledVector(front,tz);
    const wave=Math.sin(travel*Math.PI),sign=side===0?-1:1;
    const pt=from.lerp(target,travel);
    if(variant===0){
     pt.addScaledVector(right,sign*wave*(.65+.60*Math.sin(v*Math.PI)));
     pt.addScaledVector(up,wave*(.55+Math.sin(u*Math.PI)*.42));
     pt.addScaledVector(front,wave*(.65+.48*Math.sin(v*6.+travel*5.+side)));
    }else if(variant===1){
     const angle=travel*Math.PI*2.15+v*Math.PI*.95+side*Math.PI;
     pt.addScaledVector(right,Math.cos(angle)*wave*(.85+.42*x));
     pt.addScaledVector(up,Math.sin(angle)*wave*(.85+.40*x));
     pt.addScaledVector(front,Math.sin(v*5.-travel*8.+side)*wave*.65);
    }else{
     pt.addScaledVector(right,sign*wave*(1.-x)*.85);
     pt.addScaledVector(up,wave*(v-.5)*.60);
     pt.addScaledVector(front,wave*(.35+Math.sin(x*Math.PI)*.85));
    }
    pos.setXYZ(i,pt.x,pt.y,pt.z);
   }pos.needsUpdate=true;
  }
  this.rewards.render(seconds,variant,camera,end,right,up,front,frameWidth,frameHeight,this.count,this.rarity,reveal,charge,reduced);
  return {reveal,charge,morph};
 }
}
