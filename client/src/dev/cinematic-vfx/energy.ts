import * as T from 'three';
const vertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragment=`precision highp float;
varying vec2 vUv;uniform float clock;uniform float age;uniform float strength;uniform float seed;uniform float kind;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float n=0.,a=.53;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){n+=noise(p)*a;p=m*p+13.1;a*=.49;}return n;}
void main(){vec2 p=vUv*2.-1.;p.y=-p.y;float tm=clock*1.8+seed;
 if(kind<.5){
  // Advected curl field: a dark red skin, amber mass and small hot tears.
  vec2 flow=vec2(fbm(p*3.+vec2(0.,-tm)),fbm(p*3.+vec2(7.,-tm*.8)))-.5;
  float n=fbm(p*5.+flow*2.4+vec2(seed,-tm));
  float angle=atan(p.y,p.x);float lobes=sin(angle*5.+n*7.+seed)*.05+sin(angle*9.-tm)*.025;
  float radius=.34+.13*sin(age*3.14159)+lobes;
  float d=length(p*vec2(1.,.94))-radius+(n-.5)*.24;
  float body=1.-smoothstep(-.05,.045,d);
  float hollow=smoothstep(.55,1.,age)*(1.-smoothstep(.12,.32,length(p)+(n-.5)*.2));body*=1.-hollow;
  float heat=clamp(.45+n*.8-length(p)*.74,0.,1.);
  vec3 col=mix(vec3(.20,.025,.012),vec3(.88,.18,.018),smoothstep(.12,.48,heat));
  col=mix(col,vec3(1.,.62,.10),smoothstep(.46,.66,heat));col=mix(col,vec3(1.,.94,.66),smoothstep(.69,.86,heat));
  float filament=pow(1.-abs(sin((n+length(p)*.4)*25.-tm*.5)),16.);col+=vec3(.36,.19,.04)*filament*body;
  float halo=exp(-max(d,0.)*18.)*.18*(1.-body);col+=vec3(.4,.12,.02)*halo;
  float a=max(body,halo)*(1.-smoothstep(.72,1.,age))*strength;
  gl_FragColor=vec4(col,a);
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
 }
}`;
export class Energy {
 private mesh:T.Mesh<T.PlaneGeometry,T.ShaderMaterial>[]=[];
 constructor(private scene:T.Scene){for(let i=0;i<8;i++){const m=new T.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{clock:{value:0},age:{value:0},strength:{value:0},seed:{value:i*7.3},kind:{value:0}}});const mesh=new T.Mesh(new T.PlaneGeometry(1,1),m);mesh.visible=false;mesh.position.z=60+i;scene.add(mesh);this.mesh.push(mesh);}}
 clear(){this.mesh.forEach(m=>m.visible=false);}
 paint(i:number,x:number,y:number,w:number,h:number,time:number,age:number,strength=1,kind=0,angle=0){const m=this.mesh[i];if(!m)return;m.visible=strength>.001&&age>=0&&age<1;if(!m.visible)return;m.position.x=x;m.position.y=y;m.scale.set(w,h,1);m.rotation.z=angle;Object.assign(m.material.uniforms.clock,{value:time});m.material.uniforms.age.value=age;m.material.uniforms.strength.value=strength;m.material.uniforms.kind.value=kind;}
 dispose(){for(const m of this.mesh){this.scene.remove(m);m.geometry.dispose();m.material.dispose();}}
}
