import * as THREE from 'three';
import {DURATION,designs,ease,stateAt,damageOf,type Options,type Point} from './model';
import {frame,bladePoint,cutDirection,EDGE_IN,EDGE_OUT} from './motion';
const PI=Math.PI;
const noise=`float hash(vec3 p){p=fract(p*.3183099+vec3(.17,.37,.63));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){return noise(p)*.57+noise(p*2.07)*.28+noise(p*4.13)*.15;}`;
function glow(c:CanvasRenderingContext2D,p:Point,r:number,a:number,color='132,123,163'){
 if(a<=0||r<=0)return;const g=c.createRadialGradient(p.x,p.y,0,p.x,p.y,r);g.addColorStop(0,`rgba(${color},${a})`);g.addColorStop(.35,`rgba(${color},${a*.56})`);g.addColorStop(1,`rgba(${color},0)`);c.fillStyle=g;c.fillRect(p.x-r,p.y-r,r*2,r*2);
}
function soulMaterial(){return new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{time:{value:0},life:{value:1},erosion:{value:0},variant:{value:0}},vertexShader:`varying vec2 U;void main(){U=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 U;uniform float time,life,erosion,variant;${noise}
float ell(vec3 p,vec3 r){return (length(p/r)-1.)*min(r.x,min(r.y,r.z));}
float sm(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float shape(vec3 p){float head=ell(p-vec3(0,.55,0),vec3(.16,.21,.17));float chest=ell(p-vec3(0,.15,0),vec3(.28,.27,.13));float waist=ell(p-vec3(0,-.12,0),vec3(.16,.28,.1));float d=sm(sm(head,chest,.065),waist,.09);float y=clamp((-p.y-.12)/.86,0.,1.);float curl=sin(y*5.8-time*2.)*.09*y;float tail=length(vec2(p.x-curl,p.z*.8))-(.16*(1.-y));tail=max(tail,max(p.y+.15,-1.-p.y));d=sm(d,tail,.08);float arm=ell(vec3(abs(p.x)-.28,p.y+.02,p.z),vec3(.085,.29,.085));return sm(d,arm,.075);}
void main(){vec2 uv=vec2((U.x-.5)*2.,(.5-U.y)*2.);vec4 acc=vec4(0);for(int i=0;i<26;i++){vec3 p=vec3(uv,.48-float(i)*.0384);p.x+=sin(p.y*7.+time*1.3)*.025*max(0.,.4-p.y);float n=fbm(p*8.+vec3(0,-time*.7,0));float d=shape(p)+(n-.5)*.024;float den=smoothstep(.027,-.028,d);den*=1.-smoothstep(1.-erosion*.95,1.-erosion*.95+.10,noise(p*12.+vec3(0,time*.25,0)));float a=(1.-exp(-den*.23))*life;float edge=pow(clamp(1.-abs(d)*30.,0.,1.),3.);float strand=pow(1.-abs(sin(p.y*6.+p.x*43.+n*4.)),16.);vec3 color=vec3(.40,.58,.59)+vec3(.39,.47,.45)*edge+vec3(.28,.38,.42)*strand;float face=exp(-pow((abs(p.x)-.059)*45.,2.)-pow((p.y-.59)*45.,2.))*smoothstep(.01,.1,p.z);color*=1.-face*.64;acc.rgb+=(1.-acc.a)*a*color;acc.a+=(1.-acc.a)*a;if(acc.a>.94)break;}if(acc.a<.002)discard;gl_FragColor=vec4(acc.rgb/max(acc.a,.001),acc.a);
#include <colorspace_fragment>
}`});}
export function createRenderer(faces:HTMLCanvasElement[]=[]){
 const gl=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});gl.setClearColor(0,0);gl.setPixelRatio(1);gl.outputColorSpace=THREE.SRGBColorSpace;gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.05;
 const scene=new THREE.Scene(),root=new THREE.Group(),rig=new THREE.Group();scene.add(root);root.add(rig);root.scale.y=-1;
 const camera=new THREE.PerspectiveCamera(40,800/460,1,3000);camera.position.set(400,230,900);camera.lookAt(400,230,0);
 const env=document.createElement('canvas');env.width=1024;env.height=512;const ec=env.getContext('2d')!;ec.fillStyle='#171b26';ec.fillRect(0,0,1024,512);
 for(const [x,y,w,h,col] of [[100,60,110,270,'#c6c6d2'],[640,45,55,220,'#eef1e6'],[820,280,170,44,'#868caa']] as [number,number,number,number,string][]){const g=ec.createLinearGradient(x,0,x+w,0);g.addColorStop(0,'#22242e');g.addColorStop(.3,col);g.addColorStop(.7,col);g.addColorStop(1,'#22242e');ec.fillStyle=g;ec.fillRect(x,y,w,h);}
 const envTex=new THREE.CanvasTexture(env);envTex.mapping=THREE.EquirectangularReflectionMapping;envTex.colorSpace=THREE.SRGBColorSpace;const pmrem=new THREE.PMREMGenerator(gl),envRT=pmrem.fromEquirectangular(envTex);scene.environment=envRT.texture;pmrem.dispose();envTex.dispose();
 scene.add(new THREE.HemisphereLight(0xc9d1ee,0x302334,1.3));const key=new THREE.DirectionalLight(0xf1ede1,2.1);key.position.set(-300,450,600);scene.add(key);const rim=new THREE.DirectionalLight(0x927fc4,2);rim.position.set(400,-200,150);scene.add(rim);
 const reveal={value:0},dissolve={value:0},time={value:0},revealMode={value:0};const materials:THREE.Material[]=[],geometries:THREE.BufferGeometry[]=[];
 function metal(color:number,roughness:number,metalness:number){const m=new THREE.MeshStandardMaterial({color,roughness,metalness,envMapIntensity:.85,side:THREE.DoubleSide});
  m.onBeforeCompile=s=>{s.uniforms.reveal=reveal;s.uniforms.dissolve=dissolve;s.uniforms.fxTime=time;s.uniforms.revealMode=revealMode;s.vertexShader='varying vec3 localP;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nlocalP=position;');s.fragmentShader='varying vec3 localP;uniform float reveal,dissolve,fxTime,revealMode;\n'+noise+'\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
float formation=noise(localP*.065)*.30+clamp((localP.y+125.)/260.,0.,1.)*.7;if(revealMode>1.5)formation=1.-formation;else if(revealMode>.5)formation=noise(localP*.045)*.25+clamp((175.-localP.x)/200.,0.,1.)*.75;if(reveal<formation||dissolve>noise(localP*.045+vec3(0,fxTime*.15,0)))discard;`);s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+(noise(localP*vec3(.12,2.,.2))-.5)*.12,.12,1.);');};materials.push(m);return m;}
 const steel=metal(0x727b8c,.32,.93),edge=metal(0xd5dbe0,.16,.96),dark=metal(0x22232c,.46,.68),leather=metal(0x19131c,.85,.05),rivet=metal(0x9b929b,.26,.87);
 function mesh(g:THREE.BufferGeometry,m:THREE.Material,x=0,y=0,z=0){geometries.push(g);const obj=new THREE.Mesh(g,m);obj.position.set(x,y,z);rig.add(obj);return obj;}
 const blade=new THREE.Shape();blade.moveTo(-6,-107);blade.bezierCurveTo(58,-154,168,-143,207,-37);blade.bezierCurveTo(174,-75,100,-107,10,-96);blade.lineTo(-6,-107);
 mesh(new THREE.ExtrudeGeometry(blade,{depth:5.2,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:2.3,bevelThickness:1.1,curveSegments:40}),steel,0,0,-2);
 const bevel=new THREE.Shape();bevel.moveTo(10,-96);bevel.bezierCurveTo(100,-107,174,-75,207,-37);bevel.bezierCurveTo(172,-87,101,-115,8,-103);bevel.closePath();mesh(new THREE.ExtrudeGeometry(bevel,{depth:.7,bevelEnabled:true,bevelSegments:2,bevelSize:.45,bevelThickness:.35,curveSegments:40}),edge,0,0,4.4);
 const ridge=new THREE.CatmullRomCurve3([new THREE.Vector3(0,-95,3),new THREE.Vector3(47,-116,3),new THREE.Vector3(96,-110,3),new THREE.Vector3(135,-81,3)]);mesh(new THREE.TubeGeometry(ridge,40,.7,5,false),dark);
 const shaft=new THREE.CatmullRomCurve3([new THREE.Vector3(-10,162,0),new THREE.Vector3(0,44,0),new THREE.Vector3(-5,-26,0),new THREE.Vector3(0,-105,0)]);mesh(new THREE.TubeGeometry(shaft,40,3.8,14,false),dark);
 for(const y of [-101,-89,18,83,157])mesh(new THREE.CylinderGeometry(5.1,5.1,y<-50?6:3,18),rivet,y===157?-10:0,y,0);
 for(let j=0;j<13;j++){const ring=mesh(new THREE.TorusGeometry(4.1,1.15,5,16),leather,0,28+j*3.9,0);ring.rotation.x=PI/2;ring.rotation.y=.14;}
 const socket=mesh(new THREE.BoxGeometry(14,21,9),dark,0,-100,0);socket.rotation.z=-.2;
 for(const x of [-3,5])mesh(new THREE.SphereGeometry(2.2,12,8),rivet,x,-101+x*.5,6);
 const soulMat=soulMaterial(),soulGeo=new THREE.PlaneGeometry(1,1),soul=new THREE.Mesh(soulGeo,soulMat);root.add(soul);soul.renderOrder=10;

 const trailN=52,trailPositions=new Float32Array(trailN*2*3),trailUV=new Float32Array(trailN*2*2),trailIndices:number[]=[];
 for(let i=0;i<trailN;i++){trailUV.set([i/(trailN-1),0,i/(trailN-1),1],i*4);if(i<trailN-1){const k=i*2;trailIndices.push(k,k+1,k+2,k+1,k+3,k+2);}}
 const trailGeo=new THREE.BufferGeometry();trailGeo.setAttribute('position',new THREE.BufferAttribute(trailPositions,3));trailGeo.setAttribute('uv',new THREE.BufferAttribute(trailUV,2));trailGeo.setIndex(trailIndices);
 const trailMat=new THREE.ShaderMaterial({transparent:true,side:THREE.DoubleSide,depthWrite:false,uniforms:{alpha:{value:1},clock:{value:0}},vertexShader:`varying vec2 U;void main(){U=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 U;uniform float alpha,clock;${noise}
 void main(){float tail=pow(U.x,.7);float across=sin(U.y*3.14159);float rim=pow(U.y,20.);float carve=smoothstep(.0,.15,U.x)*smoothstep(0.,.12,U.y);float n=fbm(vec3(U.x*13.,U.y*4.,clock*.7));float breakup=smoothstep(.16,.5,n+(U.x*.6));float a=(.80*pow(across,.7)+rim*.95)*tail*alpha*carve*breakup;vec3 col=mix(vec3(.16,.08,.24),vec3(.68,.55,.82),pow(U.y,2.));col=mix(col,vec3(.91,.93,1.),rim);gl_FragColor=vec4(col,a);
 #include <colorspace_fragment>
 }`});
 const trail=new THREE.Mesh(trailGeo,trailMat);trail.frustumCulled=false;root.add(trail);
 const maskMat=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:true,side:THREE.DoubleSide}),maskGeo=new THREE.CircleGeometry(1,40),occluder=new THREE.Mesh(maskGeo,maskMat);occluder.renderOrder=-10;root.add(occluder);
 function updateTrail(o:Options,T:Point,u:number){const hit=designs[o.variant].hit,dt=o.ms-hit;trail.visible=!o.reduced&&dt>-220&&dt<600;if(!trail.visible)return;
  const fade=1-ease(310,600,dt),end=Math.min(o.ms,hit+390),start=Math.max(hit-280,end-185);
  for(let i=0;i<trailN;i++){const q=i/(trailN-1),ts=start+(end-start)*q,a=bladePoint(o.variant,ts,T,u,EDGE_IN),b=bladePoint(o.variant,ts,T,u,EDGE_OUT);a.lerp(b,(1-fade)*.8+(1-q)*.18);trailPositions.set([a.x,a.y,a.z+.8,b.x,b.y,b.z+.8],i*6);}
  trailGeo.attributes.position.needsUpdate=true;trailMat.uniforms.alpha.value=ease(-230,-130,dt)*fade;trailMat.uniforms.clock.value=o.ms/1000;
 }
 let disposed=false,lost=false;
 gl.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;});gl.domElement.addEventListener('webglcontextrestored',()=>lost=false);
 function drawBack(c:CanvasRenderingContext2D,o:Options,S:Point,T:Point){const grad=c.createLinearGradient(0,0,800,460);grad.addColorStop(0,o.dark?'#161720':'#eeebe5');grad.addColorStop(1,o.dark?'#0b1017':'#d7dce0');c.fillStyle=grad;c.fillRect(0,0,800,460);c.strokeStyle=o.dark?'#8c839424':'#6c60742a';c.strokeRect(18,18,764,424);c.drawImage(faces[0],S.x-35,S.y-53,70,106);c.textAlign='center';c.font='12px sans-serif';c.fillStyle=o.dark?'#a9a1b4':'#655b70';c.fillText('魂の収穫',S.x,S.y+76);
  c.save();c.translate(T.x,T.y);const hit=designs[o.variant].hit,dt=o.ms-hit,shake=damageOf(o)>0&&dt>0&&!o.reduced?Math.sin(dt*.075)*7*Math.exp(-dt/140):0;c.translate(shake,0);c.fillStyle=o.dark?'#2a2232':'#ded6df';c.strokeStyle='#a39aab';c.lineWidth=3;c.beginPath();c.roundRect(-46,-65,92,130,26);c.fill();c.stroke();const head=c.createRadialGradient(-7,-25,0,0,-20,29);head.addColorStop(0,'#b4a5b7');head.addColorStop(1,'#625a72');c.fillStyle=head;c.beginPath();c.ellipse(0,-24,24,30,0,0,PI*2);c.fill();c.fillStyle='#71687e';c.beginPath();c.ellipse(0,32,34,33,0,PI,0);c.fill();c.restore();c.font='22px Georgia';c.fillStyle=o.dark?'#e7dbe3':'#312437';c.fillText(String(stateAt(o).hp),T.x-51,T.y-58);
 }
 function fog(c:CanvasRenderingContext2D,T:Point,u:number,t:number,a:number,v:number){if(a<=0)return;for(let j=0;j<7;j++){const angle=j*2.4+t*.0003,x=T.x+(Math.cos(angle)*38+(v===0?46:v===1?28:-28))*u,y=T.y+(Math.sin(angle)*27+(v===2?38:-8))*u;glow(c,{x,y},(29+j%3*9)*u,a*.2,'23,19,31');}glow(c,{x:T.x+20*u,y:T.y},88*u,a*.10,'114,108,138');}
 function spirit(o:Options,T:Point,u:number,H:number){const t=o.ms,hit=designs[o.variant].hit,age=t-hit,emerge=ease(30,330,age),travel=ease(60,1200,age),exit=ease(1300,2400,age);let x=0,y=0;
  if(o.variant===0){x=42*travel+Math.sin(travel*PI)*12;y=-94*travel;}
  else if(o.variant===1){x=-91*Math.pow(travel,.75);y=-61*travel-18*Math.sin(travel*PI);}
  else{x=92*Math.sin(travel*PI*.58);y=20*Math.sin(travel*PI)-106*travel;}
  if(o.reduced){x*=.25;y*=.25;}
  const px=T.x+x*u,py=Math.max(44*u,Math.min(H-44*u,T.y+y*u));
  const size=(.48+.52*emerge)*(1-exit*.3),mat=soulMat.uniforms;soul.visible=age>25&&age<2500;soul.position.set(px,py,2);soul.scale.set(148*u*size,210*u*size,1);soul.rotation.z=o.variant===1?-.26*travel:o.variant===2?.25*Math.sin(travel*PI):-.1;mat.time.value=t/1000;mat.life.value=emerge*(1-ease(1850,2500,age))*.97;mat.erosion.value=exit;mat.variant.value=o.variant;
  return {x:px,y:py,age,emerge,travel,exit};
 }
 function impacts(c:CanvasRenderingContext2D,o:Options,T:Point,u:number,H:number){const t=o.ms,hit=designs[o.variant].hit,dt=t-hit;if(dt<0||damageOf(o)===0)return;const spiritState=spirit(o,T,u,H);
  // The tether still begins on the struck portrait while the spirit separates.
  const tether=ease(0,140,dt)*(1-ease(540,1320,dt));if(tether>0){for(let j=0;j<3;j++){c.strokeStyle=`rgba(177,207,208,${tether*(.30-j*.07)})`;c.lineWidth=(3-j*.8)*u;c.beginPath();c.moveTo(T.x+(j-1)*7*u,T.y+13*u);c.bezierCurveTo(T.x+(j-1)*13*u,T.y-17*u,spiritState.x+(j-1)*10*u,spiritState.y+33*u,spiritState.x,spiritState.y+15*u);c.stroke();}}
  const flash=ease(0,24,dt)*(1-ease(55,245,dt));if(!o.reduced&&flash>0){const a=cutDirection(o.variant),r=(72+16*ease(0,160,dt))*u;c.save();c.translate(T.x,T.y);c.rotate(a);c.strokeStyle=`rgba(21,11,30,${flash*.88})`;c.lineWidth=8*u;c.beginPath();c.moveTo(-r,0);c.quadraticCurveTo(0,-10*u,r,0);c.stroke();c.strokeStyle=`rgba(235,237,246,${flash})`;c.lineWidth=2.2*u;c.stroke();c.strokeStyle=`rgba(137,115,170,${flash*.65})`;c.lineWidth=.7*u;c.beginPath();c.moveTo(-r*.8,5*u);c.lineTo(r*.82,3*u);c.stroke();c.restore();}
 }
 function number(c:CanvasRenderingContext2D,o:Options,T:Point,u:number,W:number,H:number){const dt=o.ms-designs[o.variant].hit;if(damageOf(o)===0||dt<0||dt>2050)return;const a=ease(0,65,dt)*(1-ease(1400,2050,dt)),pop=1+.22*Math.sin(ease(0,190,dt)*PI),sign=o.variant===1?1:-1;const x=Math.max(42*u,Math.min(W-42*u,T.x+sign*84*u)),y=Math.max(35*u,Math.min(H-35*u,T.y-7*u-33*u*ease(90,1800,dt)));
  c.save();c.translate(x,y);c.scale(pop,pop);c.globalAlpha=a;c.textAlign='center';c.textBaseline='middle';c.font=`700 ${Math.max(22,52*u)}px Georgia,serif`;c.lineJoin='round';c.strokeStyle='#2b101e';c.lineWidth=Math.max(2,4*u);c.strokeText(`−${damageOf(o)}`,0,0);c.shadowColor='#1a0a18';c.shadowBlur=8*u;c.fillStyle='#f5dde4';c.fillText(`−${damageOf(o)}`,0,0);c.restore();
 }
 function draw(canvas:HTMLCanvasElement,o:Options){const c=canvas.getContext('2d')!,w=canvas.width,h=canvas.height;if(!w||!h||disposed)return;c.clearRect(0,0,w,h);const W=o.board?w:800,H=o.board?h:460;c.save();c.scale(w/W,h/H);
  const L=o.board??{source:{x:115,y:337},target:{x:455,y:175},scale:.86};const S=L.source,T=L.target,u=L.scale,t=o.ms,hit=designs[o.variant].hit,active=t>0&&t<DURATION;
  if(!o.board)drawBack(c,o,S,T);rig.visible=false;soul.visible=false;trail.visible=false;occluder.visible=false;
  if(active){glow(c,S,46*u,ease(0,230,t)*(1-ease(400,850,t))*.20,'155,113,183');if(damageOf(o)>0){
   const born=ease(150,620,t),gone=ease(hit+560,hit+1000,t);fog(c,T,u,t,born*(1-ease(hit-180,hit+200,t)),o.variant);
   if(!lost){const f=frame(o.variant,t,T,u,o.reduced);rig.visible=born>0&&gone<1;rig.position.copy(f.origin);rig.rotation.copy(f.rot);rig.scale.setScalar(f.scale);reveal.value=born*1.04;dissolve.value=gone;time.value=t/1000;revealMode.value=o.variant;updateTrail(o,T,u);}

   if(t>=hit)impacts(c,o,T,u,H);
  }}
  if(gl.domElement.width!==w||gl.domElement.height!==h)gl.setSize(w,h,false);root.position.y=H;camera.aspect=W/H;camera.fov=2*Math.atan(H/1800)*180/PI;camera.position.set(W/2,H/2,900);camera.lookAt(W/2,H/2,0);camera.updateProjectionMatrix();occluder.visible=active&&damageOf(o)>0;occluder.position.set(T.x,T.y,-1);occluder.scale.set(75*u,105*u,1);gl.setViewport(0,0,w,h);gl.setScissorTest(false);if(!lost){gl.render(scene,camera);c.drawImage(gl.domElement,0,0,W,H);}
  if(active&&damageOf(o)>0){const dt=t-hit;
   // A very brief cutting glint sits on top of the physical blade and the portrait.
   if(dt>=0&&dt<165&&!o.reduced)glow(c,T,46*u,ease(0,20,dt)*(1-ease(40,165,dt))*.28,'211,218,224');
   if(dt>=0&&dt<480){const a=cutDirection(o.variant),life=(1-ease(110,480,dt));c.save();c.translate(T.x,T.y);c.rotate(a);c.scale(u,u);c.globalAlpha=life;c.fillStyle='#110b1b';c.beginPath();c.moveTo(-91,0);c.bezierCurveTo(-35,-9,30,-11,98,0);c.bezierCurveTo(27,4,-34,6,-91,0);c.fill();c.strokeStyle='#f0eaff';c.lineWidth=o.reduced?1.5:2.8;c.beginPath();c.moveTo(-84,0);c.quadraticCurveTo(0,-8,94,0);c.stroke();c.restore();}
   if(!o.reduced&&dt>=15&&dt<340){const a=cutDirection(o.variant),out=ease(15,340,dt);c.save();c.translate(T.x,T.y);c.rotate(a);c.scale(u,u);c.globalAlpha=(1-out)*.85;for(let i=0;i<7;i++){const spread=(i-3)*.18,dist=26+out*(67+(i%3)*18);c.save();c.rotate(spread);c.translate(dist,0);c.fillStyle=i%2?'#e5d4ff':'#897aab';c.beginPath();c.moveTo(-12*(1-out),-1.1);c.lineTo(8*(1-out),0);c.lineTo(-8*(1-out),1.1);c.fill();c.restore();}c.restore();}
   number(c,o,T,u,W,H);
  }c.restore();
 }
 return {draw,attachLive(_host:HTMLElement|null){gl.domElement.remove();},drawMany(canvases:HTMLCanvasElement[],options:Options[]){canvases.forEach((c,i)=>draw(c,options[i]));},dispose(){if(disposed)return;disposed=true;gl.domElement.remove();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());soulGeo.dispose();soulMat.dispose();trailGeo.dispose();trailMat.dispose();maskGeo.dispose();maskMat.dispose();envRT.dispose();gl.dispose();gl.forceContextLoss();},get lost(){return lost;},get stats(){return{meshes:rig.children.length+1,geometries:gl.info.memory.geometries,textures:gl.info.memory.textures,calls:gl.info.render.calls};}};
}
