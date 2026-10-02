import * as THREE from 'three';
export function createOpeningLight(){
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
 renderer=new THREE.WebGLRenderer({alpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});renderer.setPixelRatio(1);renderer.setSize(960,540);renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
 texture=glyphTexture();scene=new THREE.Scene();camera=new THREE.Camera();
 material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{uTime:{value:0},uHeight:{value:720},uUnit:{value:1},uGlyph:{value:texture}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,fragmentShader:`
 precision highp float;varying vec2 vUv;uniform float uTime,uHeight,uUnit;uniform sampler2D uGlyph;
 float sat(float x){return clamp(x,0.,1.);}float ease(float x){x=sat(x);return 1.-pow(1.-x,3.);}
 mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
 float hash(float x){return fract(sin(x*127.1)*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float n=i.x+i.y*57.;return mix(mix(hash(n),hash(n+1.),f.x),mix(hash(n+57.),hash(n+58.),f.x),f.y);}
 float gauss(float x,float w){return exp(-x*x/max(.0001,w*w));}
 vec3 warm=vec3(1.,.56,.19),ice=vec3(.30,.65,1.);
 // Soft thin center + colored scatter. No polygonal ray edge.
 vec3 streak(vec2 p,float a,float len,float width,vec3 color){p=rot(a)*p;float body=exp(-abs(p.x)/len)*(1.-smoothstep(len*.8,len*2.2,abs(p.x)));return body*(vec3(1.)*gauss(p.y,width)+color*gauss(p.y,width*5.)*.32+color*gauss(p.y,width*17.)*.18+color*gauss(p.y,width*45.)*.07);}
 void main(){
 float t=uTime,dt=max(0.,t-1.355),hit=smoothstep(1.345,1.395,t),life=1.-smoothstep(1.47,2.13,t),charge=smoothstep(1.04,1.35,t);
 float p=sat((t-1.46)/1.76),mobile=step(1000.,uHeight),unit=uUnit;
 vec2 center=vec2(640.,uHeight*mix(.47,.475,mobile));
 vec2 follow=vec2(sin(p*3.141593)*65.,-sin(p*3.141593)*155.)*unit;
 vec2 pixel=vec2(vUv.x*1280.,(1.-vUv.y)*uHeight),q=(pixel-center)/unit;
 vec2 origin=q-follow/unit*smoothstep(1.45,1.65,t);
 float r=length(origin),ang=atan(origin.y,origin.x),burst=hit*life;
 float fold=smoothstep(1.40,1.54,t),swell=(1.+smoothstep(1.35,1.45,t)*.3)*(1.-fold*.84);
 vec2 gp=rot(-.14*(1.-fold))*(pixel-center-follow)/(swell*mix(1.,148./132.,mobile));
 vec4 glyph=texture2D(uGlyph,vec2(gp.x,-gp.y)/512.+.5);
 float glife=(1.-fold)*charge;
 vec3 col=(glyph.r*1.25+glyph.g*.9)*vec3(1.,.87,.60)*glife+glyph.b*warm*glife*1.3+glyph.a*warm*glife*2.2;
 float peak=hit*exp(-max(0.,dt-.055)*9.),after=hit*(1.-smoothstep(.22,.7,dt));
 // White-hot source, warm halation and a dimmer, much wider scattering envelope.
 float coreR=mix(12.,75.,ease(dt/.105))*(1.-smoothstep(.15,.48,dt)*.65);
 col+=vec3(1.,.94,.79)*gauss(r,coreR)*peak*8.;
 col+=warm*gauss(r,coreR*2.6)*peak*1.75+vec3(.62,.72,1.)*gauss(r,290.)*peak*.13;
 float extent=mix(65.,470.,ease(dt/.18));

  // A bowed, refractive wave opens from the letters; torn arcs thin as they travel.
  vec2 w=rot(-.22)*origin;float rr=length(w/vec2(1.3,.66)),aa=atan(w.y/.66,w.x/1.3);
  float front=22.+ease(dt/.48)*330.;float distortion=sin(aa*5.+dt*8.)*9.+sin(aa*11.-dt*7.)*3.;
  float edge=rr-front-distortion;float broken=smoothstep(-.15,.5,sin(aa*3.+dt*6.));float thick=mix(9.,1.,sat(dt/.6));
  col+=(vec3(1.,.92,.68)*gauss(edge,thick)+ice*gauss(edge-6.,thick*2.)*.40+warm*gauss(edge+12.,thick*5.)*.14)*after*broken*2.;
  col+=ice*gauss(edge+22.,35.)*after*.55*(.45+.55*noise(origin*.028+dt));
  col+=warm*gauss(edge+7.+noise(origin*.03)*8.,9.)*after*.4*broken;
  col+=streak(origin,-.22,extent*.75,1.5,warm)*peak*2.;
 // A few finite light filaments emitted from the VS core, with shutter-like tails.
 for(int i=0;i<14;i++){float n=float(i),a=hash(n+38.)*6.283185,vel=180.+hash(n+4.)*410.;float age=dt-hash(n+8.)*.045;float head=22.+max(age,0.)*vel;vec2 s=rot(a)*origin;float fade=hit*(1.-smoothstep(.15,.58,age));float trail=gauss(s.y, .7+hash(n)*.7)*gauss(s.x-head,6.+max(age,0.)*24.);col+=vec3(1.,.83,.48)*trail*fade*.85;}
 // Output on black and screen-composite in linear-looking layers. The core alone saturates.
 col=max(vec3(0.),col);col=1.-exp(-col*1.15);gl_FragColor=vec4(col,1.);
}`});
 mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);scene.add(mesh);
}
function lightImage(time:number,height:number,unit:number){if(!renderer||time<1.03||time>2.15)return null;const h=Math.min(960,Math.round(960*height/1280));if(renderer.domElement.height!==h)renderer.setSize(960,h,false);material.uniforms.uTime.value=time;material.uniforms.uHeight.value=height;material.uniforms.uUnit.value=unit;renderer.render(scene,camera);return renderer.domElement;}
function disposeLight(){if(!renderer)return;texture.dispose();mesh.geometry.dispose();material.dispose();renderer.dispose();renderer.forceContextLoss();renderer=undefined;}
return {initLight,lightImage,disposeLight};
}
