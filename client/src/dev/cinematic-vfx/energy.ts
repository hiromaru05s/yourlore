import * as T from 'three';
const vertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragment=`precision highp float;
varying vec2 vUv;uniform float clock;uniform float age;uniform float strength;uniform float seed;uniform float kind;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float n=0.,a=.53;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){n+=noise(p)*a;p=m*p+13.1;a*=.49;}return n;}
void main(){vec2 p=vUv*2.-1.;p.y=-p.y;float tm=clock*1.8+seed;
 if(kind<.5){
  // View-aligned volume integration: continuous temperature, self-absorption,
  // turbulent density and a cooling smoke envelope, rather than flat colour bands.
  vec3 sum=vec3(0.);float trans=1.;
  float expansion=.38+.24*sin(age*2.6);
  for(int i=0;i<12;i++){
   float z=-.72+float(i)*.12;
   vec3 v=vec3(p,z);
   vec2 flow=vec2(fbm(p*2.4+vec2(z*2.,-tm)),fbm(p*2.7+vec2(12.+z,-tm*.7)))-.5;
   float n=fbm(p*5.4+flow*1.8+vec2(z*4.+seed,-tm*1.9));
   float radius=length(v*vec3(1.,.95,1.1));
   float envelope=1.-smoothstep(expansion-.20,expansion+.20,radius+(n-.5)*.32);
   float density=envelope*(.22+n*.78)*(1.-smoothstep(.65,1.,age));
   float heat=clamp((1.-radius/(expansion+.15))*.78+n*.58-age*.37,0.,1.);
   vec3 ember=vec3(.20,.025,.008),orange=vec3(1.,.25,.025),hot=vec3(1.,.93,.65);
   vec3 emission=mix(ember,orange,pow(heat,.75));emission=mix(emission,hot,pow(heat,3.6));
   float soot=(1.-heat)*smoothstep(.30,.90,age);
   emission=mix(emission,vec3(.13,.12,.11),soot*.85);
   float absorb=1.-exp(-density*.42);
   sum+=trans*absorb*emission*(1.3+heat*.9);trans*=1.-absorb;
  }
  float aura=exp(-dot(p,p)*9.)*.11*(1.-age);
  vec3 colour=sum/max(.001,1.-trans)+vec3(.24,.065,.008)*aura;
  float alpha=max(1.-trans,aura)*strength;
  gl_FragColor=vec4(colour,alpha);
  #include <colorspace_fragment>
 }else{
  // A thin curtain follows the card silhouette and sheds tapered streaks upward.
  float n=fbm(vec2(p.x*5.,p.y*3.-tm*1.6)+seed);
  float bend=sin(p.y*4.+tm)*.10+sin(p.y*9.-tm*.7)*.04;
  float edge=abs(p.x-bend)-(.17+.16*(1.-p.y)*.5);
  float strands=pow(1.-abs(sin((p.x+n*.19-bend)*48.)),12.);
  float mass=(1.-smoothstep(-.04,.10,edge+(n-.5)*.13))*(1.-smoothstep(.30,.95,p.y+n*.35));
  mass*=smoothstep(-1.,-.65,p.y);
  vec3 col=mix(vec3(.025,.065,.13),vec3(.12,.33,.43),n);
  col+=vec3(.29,.51,.58)*strands*.65;col+=vec3(.44,.62,.65)*exp(-abs(edge)*130.)*.65;
  gl_FragColor=vec4(col,mass*strength);
  #include <colorspace_fragment>
 }
}`;
export class Energy {
 private mesh:T.Mesh<T.PlaneGeometry,T.ShaderMaterial>[]=[];
 constructor(private scene:T.Scene){for(let i=0;i<8;i++){const m=new T.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{clock:{value:0},age:{value:0},strength:{value:0},seed:{value:i*7.3},kind:{value:0}}});const mesh=new T.Mesh(new T.PlaneGeometry(1,1),m);mesh.visible=false;mesh.position.z=60+i;scene.add(mesh);this.mesh.push(mesh);}}
 clear(){this.mesh.forEach(m=>m.visible=false);}
 paint(i:number,x:number,y:number,w:number,h:number,time:number,age:number,strength=1,kind=0,angle=0){const m=this.mesh[i];if(!m)return;m.visible=strength>.001&&age>=0&&age<1;if(!m.visible)return;m.position.x=x;m.position.y=y;m.scale.set(w,h,1);m.rotation.z=angle;Object.assign(m.material.uniforms.clock,{value:time});m.material.uniforms.age.value=age;m.material.uniforms.strength.value=strength;m.material.uniforms.kind.value=kind;}
 dispose(){for(const m of this.mesh){this.scene.remove(m);m.geometry.dispose();m.material.dispose();}}
}
