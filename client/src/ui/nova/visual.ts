import * as THREE from 'three';
export type Point={x:number;y:number};
export type Scene={source:Point;life:Point;target:Point;scale:number;light?:boolean;reduced?:boolean;labels?:boolean;hp?:number;viewport?:{width:number;height:number};self?:Point;center?:Point};
export const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export const ease=(a:number,b:number,t:number)=>{const q=clamp((t-a)/(b-a));return q*q*(3-2*q)};
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const PI=Math.PI,TAU=PI*2;
const variants=[
 {name:'黒日の巻き取り',en:'CLOCK VORTEX',verb:'文字盤を丸ごと捻り、黒球へ巻き取る',duration:6200,hit:5200},
 {name:'時膜の剥奪',en:'TEMPORAL PEEL',verb:'目盛りの刻まれた影を、大きく剥がして呑む',duration:6200,hit:5300},
 {name:'三針の絞首',en:'THREE HANDS',verb:'時・分・秒の三針を引き抜き、螺旋に絞る',duration:6200,hit:5200},
 {name:'十二刻の破断',en:'CHRONO FRACTURE',verb:'時計を三度の吸圧で割り、十二刻を奪う',duration:6200,hit:5150},
 {name:'逆砂の奔流',en:'REVERSE HOURGLASS',verb:'相手の残り時間を、砂時計ごと逆流させる',duration:6200,hit:5350},
];
export const timing={formed:1250,costStart:1350,costEnd:2450,theftStart:2850,end:6200};
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
// A deterministic noise field is sampled on the GPU instead of recomputing many octaves per pixel.
function noiseTexture(){const cv=document.createElement('canvas');cv.width=cv.height=256;const c=cv.getContext('2d')!,im=c.createImageData(256,256);const hash=(x:number,y:number)=>{const n=Math.sin((x%256)*127.1+(y%256)*311.7)*43758.5453;return n-Math.floor(n)};const noise=(x:number,y:number)=>{const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);return mix(mix(hash(ix,iy),hash(ix+1,iy),sx),mix(hash(ix,iy+1),hash(ix+1,iy+1),sx),sy)};for(let y=0;y<256;y++)for(let x=0;x<256;x++){const n=(noise(x/16,y/16)*.6+noise(x/8,y/8)*.28+noise(x/4,y/4)*.12)*255,i=(y*256+x)*4;im.data[i]=im.data[i+1]=im.data[i+2]=n;im.data[i+3]=255;}c.putImageData(im,0,0);const tx=new THREE.CanvasTexture(cv);tx.wrapS=tx.wrapT=THREE.RepeatWrapping;return tx;}
const fieldTexture=noiseTexture();
const noise=`uniform sampler2D noiseMap;float fbm(vec3 p){vec2 uv=p.xy*.17+vec2(p.z*.053,p.z*.019);return texture2D(noiseMap,uv).r*.72+texture2D(noiseMap,uv*2.07).r*.28;}`;
const vertex=`varying vec2 vUv;varying vec3 vN;varying vec3 vP;void main(){vUv=uv;vP=position;vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
function timeTexture(index:number){
 const cv=document.createElement('canvas');cv.width=1024;cv.height=256;const c=cv.getContext('2d')!;c.strokeStyle='#ddcbdc';c.fillStyle='#e3d7dc';c.lineWidth=2;
 const nums=['XII','XI','X','IX','VIII','VII','VI','V','IV','III','II','I'];
 if(index===0||index===2){for(let j=0;j<4;j++){const x=128+j*256,y=128,r=75;c.beginPath();c.arc(x,y,r,0,TAU);c.stroke();for(let k=0;k<12;k++){const a=k*TAU/12;c.beginPath();c.moveTo(x+Math.sin(a)*r*.79,y+Math.cos(a)*r*.79);c.lineTo(x+Math.sin(a)*r*.94,y+Math.cos(a)*r*.94);c.stroke();}c.font='19px Georgia';c.textAlign='center';c.fillText(index===2?['XII','VI','III','IX'][j]:nums[j*3],x,y-r*.48);c.lineWidth=3;c.beginPath();c.moveTo(x+r*.4,y-r*.1);c.lineTo(x,y);c.lineTo(x+Math.sin(j*1.6)*r*.63,y-Math.cos(j*1.6)*r*.63);c.stroke();c.lineWidth=2;}}
 else if(index===4){for(let j=0;j<6;j++){const x=84+j*170;c.lineWidth=3;c.beginPath();c.moveTo(x-38,64);c.lineTo(x+38,64);c.quadraticCurveTo(x+38,102,x,128);c.quadraticCurveTo(x+38,158,x+38,192);c.lineTo(x-38,192);c.quadraticCurveTo(x-38,158,x,128);c.quadraticCurveTo(x-38,102,x-38,64);c.stroke();c.beginPath();c.moveTo(x-20,176);c.lineTo(x,150);c.lineTo(x+20,176);c.closePath();c.fill();for(let k=0;k<9;k++)c.fillRect(x+Math.sin(k*3.7)*12,90+k*7,2,2);}}
 else{c.beginPath();c.moveTo(0,48);c.lineTo(1024,48);c.moveTo(0,206);c.lineTo(1024,206);c.stroke();for(let k=0;k<48;k++){const x=k/48*1024;c.beginPath();c.moveTo(x,48);c.lineTo(x,k%4?59:76);c.moveTo(x,206);c.lineTo(x,k%4?195:178);c.stroke();}c.font='38px Georgia';c.textAlign='center';for(let j=0;j<12;j++)c.fillText(nums[j],42+j*85.3,142);}
 const tx=new THREE.CanvasTexture(cv);tx.wrapS=THREE.RepeatWrapping;tx.colorSpace=THREE.SRGBColorSpace;tx.anisotropy=4;return tx;
}
function auraMaterial(texture:THREE.Texture,layer=0){return new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{noiseMap:{value:fieldTexture},clock:{value:texture},time:{value:0},opacity:{value:1},layer:{value:layer},red:{value:0},glyph:{value:1},light:{value:0}},vertexShader:vertex,fragmentShader:`
 varying vec2 vUv;varying vec3 vN;varying vec3 vP;uniform sampler2D clock;uniform float time,opacity,layer,red,glyph,light;${noise}
 void main(){float y=vUv.y;float edge=pow(max(0.,sin(y*3.14159)),.45);float n=fbm(vec3(vUv.x*8.-time*.85,y*4.,time*.14+layer*3.));float fine=fbm(vec3(vUv.x*24.-time*2.6,y*14.,layer));float strands=pow(.5+.5*sin(y*23.+n*12.+vUv.x*6.-time),9.);float density=smoothstep(.12,.48,edge+n*.24);float endFade=smoothstep(0.,.055,vUv.x)*(1.-smoothstep(.955,1.,vUv.x));float alpha=density*opacity*endFade*(layer>.5?.25:.93);float nd=abs(normalize(vN).z);float ridge=pow(1.-nd,2.);vec3 col=mix(vec3(.001,.0008,.002),vec3(.035,.023,.05),n*.7+ridge*.5);col+=vec3(.052,.036,.072)*strands*.18;col=mix(col,vec3(.075,.008,.016)+col*.7,red);float mark=texture2D(clock,vec2(vUv.x*1.3-time*.30,y)).a*glyph;col+=vec3(.62,.53,.58)*mark*(.72+.2*n);alpha*=mix(.63,1.,fine);gl_FragColor=vec4(col,alpha);
#include <colorspace_fragment>
}`});}
function dialTexture(){
 const cv=document.createElement('canvas');cv.width=cv.height=512;const c=cv.getContext('2d')!;c.translate(256,256);
 const g=c.createRadialGradient(0,0,110,0,0,242);g.addColorStop(0,'#17131c00');g.addColorStop(.62,'#201a2980');g.addColorStop(.91,'#342b3cdd');g.addColorStop(1,'#15101d00');c.fillStyle=g;c.beginPath();c.arc(0,0,244,0,TAU);c.fill();
 c.strokeStyle='#b8a3b3';c.lineWidth=3;for(const r of [196,230]){c.beginPath();c.arc(0,0,r,0,TAU);c.stroke();}
 for(let i=0;i<60;i++){const a=i*TAU/60;c.strokeStyle=i%5?'#827583':'#d5b9ca';c.lineWidth=i%5?2:5;c.beginPath();c.moveTo(Math.sin(a)*(i%5?218:204),-Math.cos(a)*(i%5?218:204));c.lineTo(Math.sin(a)*228,-Math.cos(a)*228);c.stroke();}
 const nums=['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'];c.font='28px Georgia';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#d8becb';nums.forEach((n,i)=>{const a=i*TAU/12;c.fillText(n,Math.sin(a)*170,-Math.cos(a)*170)});
 for(const [a,l,w]of [[-.4,127,8],[1.25,181,5],[2.8,197,2]]){c.save();c.rotate(a);c.fillStyle='#c5a8ba';c.beginPath();c.moveTo(-w,25);c.lineTo(-w,-l+20);c.lineTo(0,-l);c.lineTo(w,-l+20);c.lineTo(w,25);c.closePath();c.fill();c.restore();}c.beginPath();c.arc(0,0,9,0,TAU);c.fill();
 const tx=new THREE.CanvasTexture(cv);tx.colorSpace=THREE.SRGBColorSpace;return tx;
}
function handTexture(){const cv=document.createElement('canvas');cv.width=128;cv.height=512;const c=cv.getContext('2d')!;const g=c.createLinearGradient(40,0,90,0);g.addColorStop(0,'#423341');g.addColorStop(.5,'#e1c5cf');g.addColorStop(1,'#655261');c.fillStyle=g;c.beginPath();c.moveTo(64,12);c.lineTo(81,85);c.lineTo(70,390);c.lineTo(86,460);c.lineTo(64,497);c.lineTo(42,460);c.lineTo(58,390);c.lineTo(47,85);c.closePath();c.fill();c.strokeStyle='#e1c5cf';c.lineWidth=2;for(let y=110;y<390;y+=25){c.beginPath();c.moveTo(47,y);c.lineTo(81,y);c.stroke();}const tx=new THREE.CanvasTexture(cv);tx.colorSpace=THREE.SRGBColorSpace;return tx;}
function chronosMaterial(texture:THREE.Texture){return new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{map:{value:texture},opacity:{value:1}},vertexShader:vertex,fragmentShader:`varying vec2 vUv;varying vec3 vN;uniform sampler2D map;uniform float opacity;void main(){vec4 c=texture2D(map,vUv);float lit=.6+.4*abs(normalize(vN).z);gl_FragColor=vec4(c.rgb*lit,c.a*opacity);
#include <colorspace_fragment>
}`});}
class Sheet{
 g:THREE.PlaneGeometry;m:THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>;
 constructor(mat:THREE.ShaderMaterial,readonly rows=48,readonly cols=10){this.g=new THREE.PlaneGeometry(1,1,rows,cols);(this.g.attributes.position as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);this.m=new THREE.Mesh(this.g,mat);this.m.frustumCulled=false;}
 update(fn:(s:number,v:number)=>THREE.Vector3){const p=this.g.attributes.position;for(let j=0;j<=this.cols;j++)for(let i=0;i<=this.rows;i++){const v=fn(i/this.rows,j/this.cols*2-1);p.setXYZ(j*(this.rows+1)+i,v.x,v.y,v.z);}p.needsUpdate=true;this.g.computeVertexNormals();}
}
class Renderer{
 renderer:THREE.WebGLRenderer;scene=new THREE.Scene();camera=new THREE.OrthographicCamera(0,800,0,-600,1,2200);root=new THREE.Group();orb:THREE.Mesh<THREE.SphereGeometry,THREE.ShaderMaterial>;shell:THREE.Mesh<THREE.SphereGeometry,THREE.ShaderMaterial>;sheets:Sheet[]=[];payment:Sheet;cloak:Sheet;card:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>;cardTexture:THREE.CanvasTexture;textures=variants.map((_,i)=>timeTexture(i));lost=false;shadow:THREE.Mesh;shard:THREE.InstancedMesh;dummy=new THREE.Object3D();lobes:THREE.Mesh[]=[];birth:Sheet[]=[];chronos:Sheet[]=[];dial=dialTexture();hand=handTexture();
 constructor(art:HTMLImageElement){
  fieldTexture.needsUpdate=true;this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});this.renderer.setClearColor(0,0);this.renderer.setPixelRatio(1);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.camera.position.z=1200;this.scene.add(this.root);
  this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true});this.renderer.domElement.addEventListener('webglcontextrestored',()=>{this.lost=false});
  const sphereMat=new THREE.ShaderMaterial({uniforms:{noiseMap:{value:fieldTexture},time:{value:0},pressure:{value:0},cost:{value:0},variant:{value:0}},vertexShader:vertex,fragmentShader:`varying vec2 vUv;varying vec3 vN,vP;uniform float time,pressure,cost,variant;${noise}
  void main(){vec3 n=normalize(vN);float f=fbm(normalize(vP)*2.5+vec3(0.,time*.12,0.));float marble=sin(f*14.+vUv.y*19.+time*.22);float vein=pow(1.-abs(marble),10.);float fres=pow(1.-abs(n.z),3.);float spec=pow(max(0.,dot(n,normalize(vec3(-.5,.65,.9)))),33.);vec3 col=vec3(.0006,.0005,.001)+vec3(.006,.004,.009)*f;col+=vec3(.16,.10,.22)*fres*.38+vec3(.31,.27,.37)*spec*.23;col+=vec3(.15,.10,.20)*vein*(.10+pressure*.22);col+=vec3(.3,.006,.024)*vein*cost;gl_FragColor=vec4(col,1.);
#include <colorspace_fragment>
}`});
  this.orb=new THREE.Mesh(new THREE.SphereGeometry(1,72,48),sphereMat);this.root.add(this.orb);
  for(let j=0;j<6;j++){const m=new THREE.Mesh(new THREE.SphereGeometry(1,28,20),sphereMat);this.lobes.push(m);this.root.add(m);}
  const shellMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{noiseMap:{value:fieldTexture},time:{value:0},opacity:{value:0}},vertexShader:vertex,fragmentShader:`varying vec2 vUv;varying vec3 vN,vP;uniform float time,opacity;${noise}void main(){float n=fbm(normalize(vP)*5.+vec3(time*.2,0.,-time*.13));float rim=pow(1.-abs(normalize(vN).z),4.);gl_FragColor=vec4(.23,.14,.30,rim*(.2+n*.4)*opacity);
#include <colorspace_fragment>
}`});
  this.shell=new THREE.Mesh(new THREE.SphereGeometry(1,48,32),shellMat);this.root.add(this.shell);
  for(let j=0;j<6;j++){const s=new Sheet(auraMaterial(this.textures[0],j>=3?1:0));s.m.renderOrder=j>=3?1:2;this.sheets.push(s);this.root.add(s.m);}
  for(let j=0;j<5;j++){const sh=new Sheet(auraMaterial(this.textures[0]),36,8);sh.m.material.uniforms.glyph.value=0;this.birth.push(sh);this.root.add(sh.m);}
  for(let j=0;j<12;j++){const sh=new Sheet(chronosMaterial(this.dial),24,8);sh.m.renderOrder=4;this.chronos.push(sh);this.root.add(sh.m);}
  this.payment=new Sheet(auraMaterial(this.textures[0]),48,12);this.payment.m.material.uniforms.glyph.value=0;this.payment.m.material.uniforms.red.value=.48;this.root.add(this.payment.m);
  this.cloak=new Sheet(auraMaterial(this.textures[0]),64,20);this.cloak.m.material.uniforms.glyph.value=0;this.cloak.m.renderOrder=0;this.root.add(this.cloak.m);
  const cv=document.createElement('canvas');cv.width=360;cv.height=500;const c=cv.getContext('2d')!;c.fillStyle='#615363';c.fillRect(0,0,360,500);const cw=art.naturalHeight*350/490;c.drawImage(art,(art.naturalWidth-cw)/2,0,cw,art.naturalHeight,5,5,350,490);this.cardTexture=new THREE.CanvasTexture(cv);this.cardTexture.colorSpace=THREE.SRGBColorSpace;
  this.card=new THREE.Mesh(new THREE.PlaneGeometry(105,146,28,36),new THREE.MeshBasicMaterial({map:this.cardTexture,side:THREE.DoubleSide}));this.root.add(this.card);
  const shc=document.createElement('canvas');shc.width=shc.height=128;const sc=shc.getContext('2d')!,sg=sc.createRadialGradient(64,64,6,64,64,62);sg.addColorStop(0,'#08051188');sg.addColorStop(.6,'#08051144');sg.addColorStop(1,'#08051100');sc.fillStyle=sg;sc.fillRect(0,0,128,128);const shadowTexture=new THREE.CanvasTexture(shc);this.shadow=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false}));this.root.add(this.shadow);
  this.shard=new THREE.InstancedMesh(new THREE.OctahedronGeometry(1,0),new THREE.MeshBasicMaterial({color:0xaa97b5,transparent:true,opacity:.6}),100);this.shard.frustumCulled=false;this.root.add(this.shard);
 }
 draw(index:number,t:number,s:Scene,w:number,h:number,res:number){
  const v=variants[index],u=s.scale,paid=ease(1350,2450,t),born=ease(470,1220,t),close=ease(v.hit+180,6130,t),pull=ease(2850,3320,t),tail=ease(v.hit-240,v.hit+210,t),sec=t*.001;
  this.root.scale.setScalar(u);
  const src=V(s.source.x/u,-s.source.y/u,45),life=V(s.life.x/u,-s.life.y/u,24),enemy=V(s.target.x/u,-s.target.y/u,25);
  const center=s.center??{x:w*.5,y:h*.46},core=V(center.x/u,-center.y/u,72);
  const axis=core.clone().sub(enemy);axis.z=0;axis.normalize();const normal=V(-axis.y,axis.x,0);
  const beat=index===3?Math.pow(Math.max(0,Math.sin((t-2950)*.0088)),12):Math.pow(Math.max(0,Math.sin((t-3000)*.006)),8)*.4;
  const settle=t>1150?Math.sin((t-1150)*.025)*Math.exp(-(t-1150)/170)*.075:0;
  const radius=(53+6*paid+5*pull+beat*5)*(1-close),rx=1+settle+.04*pull*Math.sin(sec*8),ry=1/rx;
  this.orb.position.copy(core);this.orb.scale.set(radius*born*rx,radius*born*ry,radius*born);this.orb.visible=t>0&&t<6200;
  this.orb.material.uniforms.time.value=sec;this.orb.material.uniforms.cost.value=Math.sin(paid*PI)*.55;this.orb.material.uniforms.pressure.value=pull*(1-close);this.orb.rotation.set(.15,sec*.25,index*.24);
  this.shell.position.copy(core);this.shell.scale.copy(this.orb.scale).multiplyScalar(1.04);this.shell.visible=this.orb.visible;this.shell.material.uniforms.time.value=sec;this.shell.material.uniforms.opacity.value=born*(1-close);
  this.shadow.visible=this.orb.visible;this.shadow.position.set(core.x+8,core.y-83,-25);this.shadow.scale.set((105+radius*.9)*born,36*born,1);(this.shadow.material as THREE.MeshBasicMaterial).opacity=1-close;
  // Card face is drawn into the central condensation, then the black folds close over it.
  const cardQ=ease(60,790,t);this.card.visible=t<830;this.card.position.copy(src).lerp(core,cardQ);this.card.scale.set(1-cardQ*.99,1-cardQ*.97,1);this.card.rotation.z=-cardQ*.45;
  for(let j=0;j<6;j++){const m=this.lobes[j],q=ease(160+j*57,1180+j*20,t),a=j*TAU/6+q*(index===2?6:3.3),rr=(1-q)*(78+Math.sin(j*3)*18);m.visible=t>160+j*57&&q<1&&!s.reduced;const start=src.clone().lerp(core,ease(0,.3,q));m.position.copy(start).add(V(Math.cos(a)*rr,Math.sin(a)*rr*(index===1?.55:1),Math.sin(a+1)*rr*.65));const r=(20+14*Math.sin(q*PI))*ease(0,.18,q)*(1-ease(.75,1,q));m.scale.set(r*(1+.35*Math.sin(a)),r*.8,r);m.rotation.set(a,a*.7,a*.3);}

  const pos=this.card.geometry.attributes.position;if(this.card.visible){for(let i=0;i<pos.count;i++){const x=(i%29)/28-.5,y=.5-Math.floor(i/29)/36;pos.setXYZ(i,x*105,y*146,Math.sin(x*PI)*Math.cos(y*PI)*cardQ*64);}pos.needsUpdate=true;}
  // Broad matter folds close at different times. They connect the played card to the growing sphere.
  for(let j=0;j<5;j++){const sh=this.birth[j],q=ease(160+j*48,1280+j*20,t);sh.m.visible=t>140+j*48&&q<1&&!s.reduced;if(!sh.m.visible)continue;sh.m.material.uniforms.time.value=sec+j*.6;sh.m.material.uniforms.opacity.value=ease(140+j*48,330+j*48,t)*(1-ease(.85,1,q));
   const phase=j*TAU/5,spread=(1-q)*105,twist=index===0?2.1:index===1?.7:index===2?3.3:index===3?1.2:1.6;
   sh.update((a,b)=>{const ang=phase+a*twist*PI+q*2.3,r=(32+spread)*Math.sin(a*PI*.8)+7,join=ease(0,.32,a);const p=src.clone().lerp(core,ease(0,.65,q)*.85+.15);p.lerp(core,join);const width=(26+40*Math.sin(a*PI))*(1-q*.7)*Math.sin(a*PI);p.x+=Math.cos(ang)*(r+b*width)*join;p.y+=Math.sin(ang)*(r+b*width)*join*(index===1?.6:1);p.z+=Math.sin(ang+index*.5)*r*.65*join;return p;});
  }
  this.payment.m.visible=t>1280&&t<2680&&!s.reduced&&(s.hp??24)>1;const drainFront=ease(1280,1440,t),drainBack=ease(2450,2680,t),payAxis=core.clone().sub(life).normalize(),payNormal=V(-payAxis.y,payAxis.x,0);
  this.payment.m.material.uniforms.time.value=sec*1.6;this.payment.m.material.uniforms.opacity.value=.66;
  if(this.payment.m.visible)this.payment.update((a,b)=>{const q=mix(drainBack,drainFront,a),p=life.clone().lerp(core,q),bend=Math.sin(q*PI);return p.addScaledVector(payNormal,(-27*bend+(4+5*bend)*b)*(1-drainBack)).add(V(0,0,14*bend+Math.sin(q*24-sec*10)*2*bend));});
  const breath=ease(2510,2810,t)*(1-ease(v.hit-170,v.hit+230,t));this.cloak.m.visible=breath>0&&!s.reduced;this.cloak.m.material.uniforms.time.value=sec;this.cloak.m.material.uniforms.opacity.value=breath*.9;
  if(this.cloak.m.visible)this.cloak.update((a,b)=>{const ang=a*TAU,rr=46+b*15+Math.sin(ang*7-sec*3)*5;const facing=Math.max(0,Math.cos(ang)*axis.x+Math.sin(ang)*axis.y);return enemy.clone().add(V(Math.cos(ang)*rr,Math.sin(ang)*rr,10+b*6)).addScaledVector(axis,facing*facing*(18+beat*14)*pull);});
  const path=(q:number,lane=0)=>{const p=enemy.clone().lerp(core,q),e=Math.sin(q*PI);let offset=0,z=32,half=30;
   if(index===0){offset=Math.sin(q*TAU*1.15-sec*3)*23*e;z+=Math.cos(q*TAU*1.15-sec*3)*27*e;half=61*Math.pow(1-q,.8)+3;}
   else if(index===1){offset=-115*e+18*Math.sin(q*8-sec*2)*e;z+=58*e;half=(57+14*e)*Math.pow(1-q,.55)+3;}
   else if(index===2){const a=q*TAU*1.4-sec*2.6+lane*TAU/3;offset=Math.cos(a)*62*e;z+=Math.sin(a)*42*e;half=13*Math.pow(1-q,.3)+2;}
   else if(index===3){offset=Math.sin(q*12)*22*e;z+=Math.sin(q*16-sec*2)*14*e;half=(38+beat*17)*Math.pow(1-q,.5)+2;}
   else{offset=48*Math.sin(q*TAU)*e;z+=32*e;half=(8+65*Math.pow(Math.cos(q*PI),2))*Math.pow(1-q,.4)+2;}
   p.addScaledVector(normal,offset);p.z=mix(z,core.z,Math.pow(q,2));return{p,half};};
  for(let j=0;j<this.sheets.length;j++){const sh=this.sheets[j],lane=j%3,outer=j>=3,count=index===2?3:1;sh.m.visible=!s.reduced&&pull>0&&tail<1&&(lane<count||outer&&lane<1);if(!sh.m.visible)continue;
   const mat=sh.m.material;mat.uniforms.clock.value=this.textures[index];mat.uniforms.time.value=sec*1.85;mat.uniforms.opacity.value=outer?.34:.94;mat.uniforms.glyph.value=outer?0:.68;
   const rows=Array.from({length:sh.rows+1},(_,r)=>{const q=mix(tail,pull,r/sh.rows),{p,half}=path(q,lane),ang=index===2?q*TAU-sec*2+lane*TAU/3:index===1?Math.sin(q*5-sec)*.45:index===4?q*PI*.4:0;return{q,p,width:half*(1+.08*Math.sin(q*41-sec*14))*(outer?1.17:1),ca:Math.cos(ang),sa:Math.sin(ang)};});const scratch=V();
   sh.update((a,b)=>{const{q,p,width,ca,sa}=rows[Math.round(a*sh.rows)];if(index===0){const ang=b*PI+q*TAU-sec*2;return scratch.set(p.x+normal.x*Math.cos(ang)*width,p.y+normal.y*Math.cos(ang)*width,p.z+Math.sin(ang)*width*.62);}
    return scratch.set(p.x+normal.x*b*width*ca,p.y+normal.y*b*width*ca,p.z+b*width*sa+Math.cos(b*5+q*32-sec*11)*3);});
  }
  // The opponent's time first resists the pull, then accelerates into the same dark stream.
  // Every clock piece is cut from one dial; none flies outwards from the orb.
  const reveal=ease(2500,2820,t),travel=ease(2980,v.hit+80,t);
  for(let j=0;j<12;j++){const sh=this.chronos[j];sh.m.visible=!s.reduced&&reveal>0&&t<v.hit+180&&(index===3||j===0||index===2&&j<3);if(!sh.m.visible)continue;
   sh.m.material.uniforms.opacity.value=reveal*(1-ease(v.hit,v.hit+180,t));
   sh.m.material.uniforms.map.value=index===1?this.textures[1]:index===4?this.textures[4]:index===2?this.hand:this.dial;
   const stagger=index===3?j*.029:index===2?j*.065:0;
   let f=clamp((travel-stagger)/(1-stagger));if(index===3){const start=3030+Math.floor(j/4)*650+(j%4)*38;f=ease(start,start+720,t);}f=f*f;const size=1-Math.pow(f,3),ang=-(t-2500)*.0025;
   const scratch=V();sh.update((a,b)=>{
    if(index===0){const x=(a-.5)*152,y=b*76,dist=Math.hypot(x,y)/108,twist=ang+f*7*(1-dist*.4),cx=x*Math.cos(twist)-y*Math.sin(twist),cy=x*Math.sin(twist)+y*Math.cos(twist),q=clamp(f+(1-dist)*.17*f),at=path(q).p;return scratch.set(at.x+cx*size,at.y+cy*size,at.z+12+dist*22*Math.sin(f*PI));}
    if(index===1){const q=clamp(f+a*.56*ease(2860,3500,t)),at=path(q),stretch=1+Math.sin(f*PI);return scratch.copy(at.p).addScaledVector(normal,b*at.half*.9*size).add(V(0,0,12+Math.sin(a*5-sec*3)*6*stretch));}
    if(index===2){const q=clamp(f+a*.43*ease(2860,3380,t)),at=path(q,j);return scratch.copy(at.p).addScaledVector(normal,b*(10+7*Math.sin(a*PI))*size).add(V(0,0,17));}
    if(index===3){const angle=(j+(b+1)*.49)/12*TAU-PI/2,rad=20+a*63,q=clamp(f+(1-a)*.12*f),at=path(q).p;return scratch.set(at.x+Math.cos(angle)*rad*size,at.y+Math.sin(angle)*rad*size,at.z+17+Math.sin(f*PI)*j*2);}
    const q=clamp(f+a*.63*ease(2850,3500,t)),at=path(q);return scratch.copy(at.p).addScaledVector(normal,b*at.half*.85*size).add(V(0,0,15));
   });
   // Clock-sector UVs preserve the original opponent dial before it breaks.
   const uv=sh.g.attributes.uv;for(let y=0;y<=sh.cols;y++)for(let x=0;x<=sh.rows;x++){const a=x/sh.rows,b=y/sh.cols*2-1;let uu=a,vv=(1-b)/2;
    if(index===3){const angle=(j+(b+1)*.49)/12*TAU-PI/2,rad=(20+a*63)/166;uu=.5+Math.cos(angle)*rad;vv=.5-Math.sin(angle)*rad;}
    if(index===2){uu=(b+1)/2;vv=1-a;}
    if(index===4)uu=.01+a*.15;
    uv.setXY(y*(sh.rows+1)+x,uu,vv);
   }uv.needsUpdate=true;
  }
  this.shard.visible=index===4&&pull>.3&&!s.reduced&&tail<1;
  if(this.shard.visible){for(let i=0;i<100;i++){const q=((i*.618033+Math.max(0,t-2950)*.00045)%1)**1.6,at=path(q);this.dummy.position.copy(at.p).addScaledVector(normal,Math.sin(i*4.6)*at.half*.5);this.dummy.position.z+=19;this.dummy.scale.setScalar((q>tail&&q<pull?1:0)*(1+((i*7)%4)*.3));this.dummy.rotation.set(i,i*3,sec*4);this.dummy.updateMatrix();this.shard.setMatrixAt(i,this.dummy.matrix);}this.shard.instanceMatrix.needsUpdate=true;}
  if(s.reduced){this.card.visible=false;this.orb.scale.setScalar((t>1250?54:0)*(1-close));this.shell.scale.copy(this.orb.scale);}
  this.camera.right=w;this.camera.bottom=-h;this.camera.updateProjectionMatrix();const rw=Math.ceil(w*res),rh=Math.ceil(h*res);if(this.renderer.domElement.width!==rw||this.renderer.domElement.height!==rh)this.renderer.setSize(rw,rh,false);this.renderer.render(this.scene,this.camera);
 }
 dispose(){const geo=new Set<THREE.BufferGeometry>(),mat=new Set<THREE.Material>(),tex=new Set<THREE.Texture>([...this.textures,this.cardTexture,fieldTexture,this.dial,this.hand]);this.scene.traverse(o=>{if(o instanceof THREE.Mesh){geo.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){mat.add(m);if(m.map)tex.add(m.map)}}});geo.forEach(g=>g.dispose());mat.forEach(m=>m.dispose());tex.forEach(t=>t.dispose());this.renderer.dispose();this.renderer.forceContextLoss();}
}
/** Frozen selected study 04. Each playback owns its GPU resources. */
export function createNovaRenderer(art:HTMLImageElement){const instance=new Renderer(art);return{
 canvas:instance.renderer.domElement,
 get lost(){return instance.lost},
 draw(t:number,scene:Scene,w:number,h:number){instance.draw(3,t,scene,w,h,1)},
 dispose(){instance.dispose()}
};}
