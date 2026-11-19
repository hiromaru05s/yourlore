import {createWebGLRenderer} from '../webglRenderer';
import * as THREE from 'three';
import {createSeamLightMaterial} from './seamLight';
import {OPENING_TOSS_MS,OPENING_REVEAL_MS} from '../../shared/opening';
import {OPENING_REJOIN_SECONDS} from './choreography';
export function createOpeningLight(){
let seamMaterial:THREE.ShaderMaterial|undefined,seamKey='';
let renderer:THREE.WebGLRenderer|undefined,scene:THREE.Scene,camera:THREE.Camera,material:THREE.ShaderMaterial,mesh:THREE.Mesh,texture:THREE.DataTexture;
/** Four blur scales of the actual VS glyphs; the emission starts on the lettering. */
function glyphTexture(){
 const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d',{willReadFrequently:true})!;
 const src=document.createElement('canvas');src.width=src.height=512;const s=src.getContext('2d')!;s.fillStyle='white';s.font='italic 132px Georgia';s.textAlign='center';s.textBaseline='middle';s.fillText('VS',256,256);
 const pixels=new Uint8Array(512*512*4);
 [0,4,15,42].forEach((blur,k)=>{g.clearRect(0,0,512,512);g.filter=blur?`blur(${blur}px)`:'none';g.drawImage(src,0,0);const data=g.getImageData(0,0,512,512).data;for(let i=0;i<512*512;i++)pixels[i*4+k]=data[i*4+3];});
 const tex=new THREE.DataTexture(pixels,512,512);tex.flipY=true;tex.minFilter=tex.magFilter=THREE.LinearFilter;tex.needsUpdate=true;return tex;
}
function initLight(){
 renderer=createWebGLRenderer({alpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});renderer.setPixelRatio(1);renderer.setSize(960,540);renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
 seamMaterial=createSeamLightMaterial();
 texture=glyphTexture();scene=new THREE.Scene();camera=new THREE.Camera();
 material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{uTime:{value:0},uHeight:{value:720},uUnit:{value:1},uGlyph:{value:texture}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,fragmentShader:`
 precision highp float;varying vec2 vUv;uniform float uTime,uHeight,uUnit;uniform sampler2D uGlyph;
 float sat(float x){return clamp(x,0.,1.);}float ease(float x){x=sat(x);return 1.-pow(1.-x,3.);}
 mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
 float hash(float x){return fract(sin(x*127.1)*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float n=i.x+i.y*57.;return mix(mix(hash(n),hash(n+1.),f.x),mix(hash(n+57.),hash(n+58.),f.x),f.y);}
 float gauss(float x,float w){return exp(-x*x/max(.0001,w*w));}
 vec3 scatter=vec3(.43,.72,1.),ice=vec3(.20,.55,1.);
 // Soft thin center + colored scatter. No polygonal ray edge.
 vec3 streak(vec2 p,float a,float len,float width,vec3 color){p=rot(a)*p;float body=exp(-abs(p.x)/len)*(1.-smoothstep(len*.8,len*2.2,abs(p.x)));return body*(vec3(1.)*gauss(p.y,width)+color*gauss(p.y,width*5.)*.32+color*gauss(p.y,width*17.)*.18+color*gauss(p.y,width*45.)*.07);}
 void main(){
 float t=uTime,contact=${OPENING_TOSS_MS/1000},dt=max(0.,t-contact);
 float hit=smoothstep(contact,contact+.025,t),charge=smoothstep(1.04,1.35,t);
 float p=sat((t-1.46)/1.76),mobile=step(1000.,uHeight),unit=uUnit;
 vec2 center=vec2(640.,uHeight*mix(.47,.475,mobile));
 vec2 follow=vec2(sin(p*3.141593)*65.,-sin(p*3.141593)*155.)*unit;
 vec2 pixel=vec2(vUv.x*1280.,(1.-vUv.y)*uHeight),q=(pixel-center)/unit;
 // The main impact remains on the meeting point; only the VS-to-coin fold follows the coin.
 vec2 origin=q;float r=length(origin);
 float contactAngle=mix(atan(uHeight+8.,-125.),-.04655,mobile);
 float fold=smoothstep(1.40,1.54,t),swell=(1.+smoothstep(1.35,1.45,t)*.3)*(1.-fold*.84);
 vec2 gp=rot(-.14*(1.-fold))*(pixel-center-follow)/(swell*mix(1.,148./132.,mobile));
 vec4 glyph=texture2D(uGlyph,vec2(gp.x,-gp.y)/512.+.5);
 float glife=(1.-fold)*charge;
 vec3 col=(glyph.r*1.25+glyph.g*.9)*vec3(1.,.87,.60)*glife+glyph.b*scatter*glife*1.3+glyph.a*scatter*glife*2.2;
 float peak=hit*exp(-max(0.,dt-.045)*11.),after=hit*(1.-smoothstep(.15,.62,dt));
 // White-hot collision core, blue halation, and a wider low-intensity scatter envelope.
 float coreR=mix(12.,104.,ease(dt/.08))*(1.-smoothstep(.11,.40,dt)*.72);
 col+=vec3(.88,.96,1.)*gauss(r,coreR)*peak*11.;
 col+=scatter*gauss(r,coreR*2.4)*peak*1.6+vec3(.62,.72,1.)*gauss(r,330.)*peak*.19;
 float extent=mix(65.,720.,ease(dt/.13));

  // Bowed sheets tear away from the contact seam. They share its orientation and collapse in thickness.
  vec2 w=rot(contactAngle)*origin;float rr=length(w/vec2(1.35,.72)),aa=atan(w.y/.72,w.x/1.35);
  float front=22.+ease(dt/.42)*440.;float distortion=sin(aa*5.+dt*8.)*9.+sin(aa*11.-dt*7.)*3.;
  float edge=rr-front-distortion;float broken=smoothstep(-.15,.5,sin(aa*3.+dt*6.));float thick=mix(9.,1.,sat(dt/.6));
  col+=(vec3(.85,.95,1.)*gauss(edge,thick)+ice*gauss(edge-6.,thick*2.)*.40+scatter*gauss(edge+12.,thick*5.)*.14)*after*broken*2.;
  col+=ice*gauss(edge+22.,35.)*after*.55*(.45+.55*noise(origin*.028+dt));
  col+=scatter*gauss(edge+7.+noise(origin*.03)*8.,9.)*after*.4*broken;
  col+=streak(origin,contactAngle,extent,2.2,scatter)*peak*3.2;
  col+=streak(origin,contactAngle+1.5708,extent*.53,.85,ice)*peak*1.3;
  // A quieter second fold follows the same expanding surface rather than a detached ring.
  float echoAge=max(0.,dt-.105),echoFront=20.+ease(echoAge/.49)*370.;
  float echo=hit*smoothstep(.105,.145,dt)*(1.-smoothstep(.28,.63,dt));
  col+=ice*gauss(rr-echoFront-distortion*.6,2.2)*echo*broken*.8;
 // A second, larger pressure wave is fired only when recoil finishes and the edges rejoin.
 float joinAge=t-${OPENING_REJOIN_SECONDS},j=max(0.,joinAge),joined=smoothstep(0.,.022,joinAge);
 float joinPeak=joined*exp(-max(0.,j-.035)*10.);
 float joinLife=joined*(1.-smoothstep(.20,.64,j));
 float joinRadius=mix(16.,120.,ease(j/.075))*(1.-smoothstep(.10,.40,j)*.7);
 col+=vec3(.88,.96,1.)*gauss(r,joinRadius)*joinPeak*12.;
 col+=ice*gauss(r,joinRadius*2.8)*joinPeak*1.5;
 float joinFront=20.+ease(j/.39)*620.;
 float joinEdge=rr-joinFront-distortion*(.8+j);
 float joinThickness=mix(18.,1.5,sat(j/.48));
 col+=(vec3(.87,.97,1.)*gauss(joinEdge,joinThickness)*3.4+ice*gauss(joinEdge+13.,joinThickness*3.)*1.15)*joinLife*broken;
 col+=scatter*gauss(joinEdge+31.,43.)*joinLife*(.35+.65*noise(origin*.025+j*3.))*.65;
 col+=streak(origin,contactAngle,mix(90.,1000.,ease(j/.13)),3.1,ice)*joinPeak*4.;
 col+=streak(origin,contactAngle+1.5708,mix(80.,700.,ease(j/.15)),1.2,scatter)*joinPeak*1.9;
 // When the toss resolves, the already-grinding seam releases another blue pressure wave.
 float lockAge=t-${OPENING_REVEAL_MS/1000},lockT=max(0.,lockAge);
 float lockStart=smoothstep(0.,.02,lockAge),lockPeak=lockStart*exp(-max(0.,lockT-.035)*13.);
 float lockLife=lockStart*(1.-smoothstep(.13,.54,lockT));
 float lockRadius=mix(18.,110.,ease(lockT/.065));
 col+=vec3(.72,.91,1.)*gauss(r,lockRadius)*lockPeak*10.;
 col+=vec3(.03,.28,1.)*gauss(r,lockRadius*3.3)*lockPeak*2.;
 float lockEdge=rr-(25.+ease(lockT/.38)*670.)-distortion*.8;
 col+=(vec3(.55,.87,1.)*gauss(lockEdge,mix(13.,1.2,sat(lockT/.4)))*3.
      +ice*gauss(lockEdge+18.,25.)*.65)*lockLife*broken;
 col+=streak(origin,contactAngle,800.,2.8,ice)*lockPeak*3.;
 // A few finite light filaments emitted from the VS core, with shutter-like tails.
 for(int i=0;i<14;i++){float n=float(i),a=hash(n+38.)*6.283185,vel=180.+hash(n+4.)*410.;float age=dt-hash(n+8.)*.045;float head=22.+max(age,0.)*vel;vec2 s=rot(a)*origin;float fade=hit*(1.-smoothstep(.15,.58,age));float trail=gauss(s.y, .7+hash(n)*.7)*gauss(s.x-head,6.+max(age,0.)*24.);col+=vec3(.78,.91,1.)*trail*fade*1.15;}
 // Output on black and screen-composite in linear-looking layers. The core alone saturates.
 col=max(vec3(0.),col);col=1.-exp(-col*1.15);gl_FragColor=vec4(col,1.);
}`});
 mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);scene.add(mesh);
}
function lightImage(time:number,height:number,unit:number){if(!renderer||time<1.03||time>3.84||(time>2.40&&time<OPENING_REVEAL_MS/1000))return null;const h=Math.min(960,Math.round(960*height/1280));if(renderer.domElement.width!==960||renderer.domElement.height!==h)renderer.setSize(960,h,false);mesh.material=material;material.uniforms.uTime.value=time;material.uniforms.uHeight.value=height;material.uniforms.uUnit.value=unit;renderer.render(scene,camera);return renderer.domElement;}
function seamImage(time:number,length:number){
 if(!renderer||!seamMaterial)return null;
 const key=`${time}:${length}`;
 if(seamKey===key&&mesh.material===seamMaterial)return renderer.domElement;
 const width=Math.min(1536,Math.max(768,Math.ceil(length))),height=240;
 if(renderer.domElement.width!==width||renderer.domElement.height!==height)renderer.setSize(width,height,false);
 seamMaterial.uniforms.uTime.value=time;seamMaterial.uniforms.uLength.value=length;
 mesh.material=seamMaterial;renderer.render(scene,camera);seamKey=key;return renderer.domElement;
}
function disposeLight(){if(!renderer)return;seamMaterial?.dispose();seamMaterial=undefined;seamKey='';texture.dispose();mesh.geometry.dispose();material.dispose();renderer.dispose();renderer.forceContextLoss();renderer=undefined;}
return {initLight,lightImage,seamImage,disposeLight};
}
