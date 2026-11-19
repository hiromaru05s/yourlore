import * as THREE from 'three';
import {OPENING_TOSS_MS,OPENING_REVEAL_MS} from '../../shared/opening';
import {OPENING_REJOIN_SECONDS} from './choreography';

/** Continuous silver-blue contact light: optical filaments and bloom, without combustion. */
export function createSeamLightMaterial(){
 return new THREE.ShaderMaterial({depthTest:false,depthWrite:false,
  uniforms:{uTime:{value:0},uLength:{value:720},uAcross:{value:240}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
  fragmentShader:`
 precision highp float;
 varying vec2 vUv;uniform float uTime,uLength,uAcross;
 float gauss(float d,float w){return exp(-d*d/(w*w));}
 void main(){
  float t=uTime,age=t-${OPENING_TOSS_MS/1000},x=vUv.x*uLength,y=(vUv.y-.5)*uAcross;
  float since=max(0.,age),contact=step(0.,age);
  float distance=abs(x-uLength*.5),localAge=age-distance/2300.;
  float rejoin=t-${OPENING_REJOIN_SECONDS},localRejoin=rejoin-distance/3000.;
  float joinHit=step(0.,localRejoin)*exp(-max(0.,localRejoin)*7.);
  float hit=step(0.,localAge)*exp(-max(0.,localAge)*9.)+joinHit*1.85;
  float flow=.78+.13*sin(x*.019-t*2.4)+.09*sin(x*.041+t*3.1);
  float bend=sin(x*.012-t*1.2)*1.8+sin(x*.037+t*2.3)*.65;
  float d=y-bend;
  float friction=smoothstep(${OPENING_REJOIN_SECONDS},${OPENING_REJOIN_SECONDS+.08},t)*(1.-smoothstep(5.03,5.48,t));
  float landed=max(0.,t-${OPENING_REVEAL_MS/1000});
  float lockHit=step(${OPENING_REVEAL_MS/1000},t)*exp(-landed*8.);
  float pressure=friction*(.72+.28*pow(.5+.5*sin(x*.031-t*19.),2.));
  vec3 silver=vec3(.84,.94,1.),azure=vec3(.16,.48,1.);
  // The bright contact edge stays narrow; nested falloffs give the light depth on both cards.
  vec3 radiance=silver*gauss(d,1.05+hit*4.6)*3.8*flow;
  radiance+=vec3(.46,.74,1.)*gauss(d,4.8+hit*15.)*.96*flow;
  radiance+=azure*gauss(d,15.+hit*38.)*.38*flow;
  radiance+=vec3(.11,.32,.7)*gauss(d,48.+hit*35.)*.16;
  // Long, smoothly moving strands cling to the edge; there are no tongues, smoke or embers.
  for(int i=0;i<4;i++){
   float n=float(i),phase=x*(.009+n*.0014)-t*(1.25+n*.22)+n*2.1;
   float strand=sin(phase)*(5.+n*2.)+sin(phase*.53+n)*2.;
   float brightness=pow(.5+.5*sin(x*.015-t*2.1+n*1.7),3.);
   radiance+=silver*gauss(y-strand,.5+n*.13)*brightness*.23;
  }
  // Collision drives a broad light front out along both edges, then contracts to the accepted baseline.
  float front=since*1850.,travel=distance-front;
  radiance+=silver*gauss(travel,42.+since*35.)*gauss(y,18.+since*24.)*contact*exp(-since*2.8)*5.;
  radiance+=azure*gauss(travel+40.,75.)*gauss(y,55.)*contact*exp(-since*3.8)*1.2;
  float joinFront=max(0.,rejoin)*2300.,joinTravel=distance-joinFront;
  radiance+=silver*gauss(joinTravel,70.)*gauss(y,44.)*step(0.,rejoin)*exp(-max(0.,rejoin)*3.)*7.;
  radiance+=azure*gauss(joinTravel+70.,120.)*gauss(y,76.)*step(0.,rejoin)*exp(-max(0.,rejoin)*3.5)*2.;
  // Sustained mana shear: a hot broken core, dense blue material and travelling pressure folds.
  float serration=sin(x*.071-t*22.)*3.4+sin(x*.123+t*14.)*1.7;
  radiance+=silver*gauss(d-serration,2.7+lockHit*4.)*pressure*5.;
  radiance+=vec3(.06,.38,1.)*gauss(d,24.+lockHit*28.)*pressure*2.2;
  radiance+=vec3(.015,.15,.85)*gauss(d,74.)*pressure*.85;
  for(int k=0;k<3;k++){
   float n=float(k),ridge=sin(x*.018-t*(7.+n)+n*2.1)*(10.+n*7.);
   float broken=pow(.5+.5*sin(x*(.028+n*.007)-t*11.+n),4.);
   radiance+=vec3(.23,.69,1.)*gauss(y-ridge,1.+n*.3)*broken*friction*1.8;
  }
  float waveAge=fract(max(0.,rejoin)*1.7),shearFront=waveAge*115.;
  radiance+=vec3(.08,.42,1.)*gauss(abs(y)-shearFront,3.+waveAge*3.)
   *pressure*pow(1.-waveAge,1.7)*1.15;
  float lockTravel=distance-landed*2500.;
  radiance+=silver*gauss(lockTravel,85.)*gauss(y,42.)*lockHit*9.;
  radiance*=1.-smoothstep(uAcross*.40,uAcross*.49,abs(y));
  gl_FragColor=vec4(1.-exp(-radiance),1.);
 }`
 });
}
