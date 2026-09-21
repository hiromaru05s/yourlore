import * as T from 'three';
/** A simultaneous blue-white bloom across the entire stack, including its halo.
 * Additive light preserves the card's printed face; there is no travelling wipe. */
export function reformVeil(unit:number){
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,blending:T.AdditiveBlending,toneMapped:false,
 uniforms:{charge:{value:0},opacity:{value:0},time:{value:0}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`
 precision highp float;varying vec2 vUv;uniform float charge,opacity,time;
 void main(){
  vec2 p=(vUv-.5)*vec2(1.6,2.3),q=abs(p)-vec2(.48,.755);
  float d=length(max(q,0.))+min(max(q.x,q.y),0.)-.025;
  float inside=1.-smoothstep(-.01,.008,d);
  float rim=exp(-abs(d)*105.);
  float halo=exp(-max(d,0.)*16.)*(1.-inside);
  float pulse=charge*(.92+.08*sin(time*10.));
  vec3 ice=mix(vec3(.20,.56,.95),vec3(.83,.96,1.),charge);
  float glow=inside*(.16+.32*charge)+rim*.95+halo*.38;
  gl_FragColor=vec4(ice,glow*pulse*opacity);
 }`});
 const mesh=new T.Mesh(new T.PlaneGeometry(unit*1.6,unit*2.3),material);mesh.rotation.x=-Math.PI/2;mesh.renderOrder=20;
 return {mesh,update(charge:number,opacity:number,time:number){material.uniforms.charge.value=charge;material.uniforms.opacity.value=opacity;material.uniforms.time.value=time;},dispose(){mesh.removeFromParent();mesh.geometry.dispose();material.dispose();}};
}
