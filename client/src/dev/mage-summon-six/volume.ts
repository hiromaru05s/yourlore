import * as T from 'three';
// Analytic density advection with Beer-Lambert absorption. This is authored volumetric
// fire / smoke, not a fluid solver. The enclosing mesh never contributes a visible face.
const vertex=`varying vec3 local;void main(){local=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragment=`precision highp float;varying vec3 local;uniform sampler2D noiseMap;uniform vec3 ray;uniform float clock,amount,fire,mode;uniform vec3 source;
float ns(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);vec2 uv=i.xy+vec2(37.,17.)*i.z+f.xy;vec2 v=texture2D(noiseMap,(uv+.5)/256.).rg;return mix(v.x,v.y,f.z);}
float fb(vec3 p){return ns(p)*.58+ns(p*2.03+19.)*.28+ns(p*4.1-7.)*.14;}
float density(vec3 p){
 vec3 q=p-source;float height=clamp(q.z/.95,0.,1.);float shape;
 if(mode<.5){vec2 b=abs(q.xy)-vec2(.46,.68);float edge=length(max(b,0.))+min(max(b.x,b.y),0.);float wave=(fb(q*4.-vec3(0.,0.,clock))-.5)*.16*height;shape=exp(-pow(edge+wave,2.)/(.004+.013*height));}
 else if(mode<1.5){vec2 xy=q.xy;float angle=q.z*2.8-clock*.9;xy=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*xy;shape=exp(-pow(length(xy)-(.34-height*.21),2.)/.014);}
 else{float rr=length(q.xy/vec2(.55,.73));shape=exp(-pow(rr-1.,2.)/.08);}
 shape*=smoothstep(-.04,.08,q.z)*(1.-smoothstep(.25+amount*.25,.65+amount*.30,q.z));
 vec3 wind=q*vec3(4.,4.,2.6);wind.z-=clock*(fire>.5?1.9:.72);wind.xy+=vec2(sin(q.z*4.-clock),cos(q.z*3.+clock))*.46;
 float n=fb(wind),curl=fb(wind*2.+vec3(n*1.6));float d=shape*pow(max(0.,(n*.7+curl*.3)-(.31+height*.20)),1.3)*2.;
 return d*amount;
}
void main(){vec3 rd=normalize(ray);vec3 p=local+rd*.008;vec3 col=vec3(0.);float a=0.;float stepSize=.064;float jitter=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);p+=rd*jitter*stepSize;
 for(int i=0;i<48;i++){if(any(greaterThan(abs(p),vec3(.825,1.025,.625))))break;
 float d=density(p)*stepSize*7.;if(d>.0002){float shade=density(p+vec3(-.075,.06,.08));float heat=clamp(d*4.5,0.,1.);
 vec3 smoke=mix(vec3(.026,.021,.035),vec3(.28,.24,.34),clamp(.46+(density(p)-shade)*4.,0.,1.));
 vec3 flame=mix(vec3(.75,.035,.002),vec3(2.4,.35,.012),smoothstep(.02,.24,heat));flame=mix(flame,vec3(3.3,1.4,.19),smoothstep(.23,.65,heat));
 float op=1.-exp(-d*(fire>.5?3.4:4.0));vec3 lit=mix(smoke,flame,fire);col+=(1.-a)*lit*op;a+=(1.-a)*op;}
 if(a>.985)break;p+=rd*stepSize;}
 if(a<.002)discard;gl_FragColor=vec4(col/max(a,.001),a);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
export class Volume {
 readonly mesh:T.Mesh<T.BoxGeometry,T.ShaderMaterial>;private noise:T.DataTexture;
 constructor(){const size=256,data=new Uint8Array(size*size*4);let s=7182;const random=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s>>>24;};const field=new Uint8Array(size*size);for(let i=0;i<field.length;i++)field[i]=random();for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4;data[i]=field[y*size+x];data[i+1]=field[((y+17)%size)*size+(x+37)%size];data[i+2]=0;data[i+3]=255;}this.noise=new T.DataTexture(data,size,size);this.noise.wrapS=this.noise.wrapT=T.RepeatWrapping;this.noise.minFilter=this.noise.magFilter=T.LinearFilter;this.noise.needsUpdate=true;
 const material=new T.ShaderMaterial({uniforms:{noiseMap:{value:this.noise},ray:{value:new T.Vector3(0,.6,-.8)},clock:{value:0},amount:{value:0},fire:{value:1},mode:{value:0},source:{value:new T.Vector3(0,0,-.625)}},vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,side:T.FrontSide});this.mesh=new T.Mesh(new T.BoxGeometry(1.65,2.05,1.25),material);this.mesh.scale.setScalar(180);this.mesh.frustumCulled=false;this.mesh.renderOrder=8;
 }
 update(ms:number,amount:number,fire:boolean,mode:number,height:number,ray:T.Vector3){this.mesh.visible=amount>.003;this.mesh.position.z=height+112.5;const u=this.mesh.material.uniforms;u.clock.value=ms/1000;u.amount.value=amount;u.fire.value=Number(fire);u.mode.value=mode;u.ray.value.copy(ray);}
 dispose(){this.mesh.geometry.dispose();this.mesh.material.dispose();this.noise.dispose();}
}
