import * as T from 'three';
/** Card-shaped blue refraction skin; the stock remains stationary beneath it. */
export function reformVeil(unit:number){
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,uniforms:{charge:{value:0},opacity:{value:0},time:{value:0}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`
 precision highp float;varying vec2 vUv;uniform float charge,opacity,time;
 void main(){
  vec2 p=vUv-.5,q=abs(p)-vec2(.43,.43);
  float d=length(max(q,0.))+min(max(q.x,q.y),0.)-.045;
  float mask=1.-smoothstep(-.003,.003,d);
  float edge=1.-smoothstep(.006,.035,abs(d));
  float wave=sin(vUv.y*8.+vUv.x*3.-time*6.)*.055;
  float front=charge*1.3-.15;
  float fill=1.-smoothstep(front-.08,front+.08,vUv.y+wave);
  float fold=pow(max(0.,1.-abs(vUv.x-.5-sin(vUv.y*6.+time)*.23)*13.),3.);
  vec3 col=mix(vec3(.025,.16,.42),vec3(.10,.58,.95),vUv.y*.4+fold*.6);
  col+=vec3(.35,.65,.8)*edge*.8;
  col+=vec3(.55,.8,.95)*exp(-abs(vUv.y+wave-front)*70.)*.7;
  gl_FragColor=vec4(col,mask*opacity*fill);
 }`});
 const mesh=new T.Mesh(new T.PlaneGeometry(unit*1.1,unit*1.72),material);mesh.rotation.x=-Math.PI/2;mesh.renderOrder=20;
 return {mesh,update(charge:number,opacity:number,time:number){material.uniforms.charge.value=charge;material.uniforms.opacity.value=opacity;material.uniforms.time.value=time;},dispose(){mesh.removeFromParent();mesh.geometry.dispose();material.dispose();}};
}
