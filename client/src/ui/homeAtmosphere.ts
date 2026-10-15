import {homeIsCovered} from './screenCovered';
import {createWebGLRenderer} from './webglRenderer';
import {homeDaylight,announceHomeDaylightReady} from './homeDaylight';
import * as THREE from 'three';

/** Approved 2026-10-15 cloud / aperture / sunlight study, mounted only on HOME.
 * v2: approved wide architecture, independently moving ivy and shared mascot lighting.
 * The CSS plate remains underneath until the first complete rendered frame.
 * All motion shares one clock; no menu re-render owns a second renderer. */
export function mountHomeAtmosphere(host:HTMLElement):()=>void {
 const BASE='/art/lounge/atmosphere-v2/';
 const W=1672,H=941;
 host.dataset.atmosphere='loading';
 if(typeof WebGL2RenderingContext==='undefined'){host.dataset.atmosphere='fallback';return()=>{};}
 let renderer:THREE.WebGLRenderer;
 try{renderer=createWebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});}
 catch{host.dataset.atmosphere='fallback';return()=>{};}
 renderer.domElement.className='home-atmosphere-canvas';
 renderer.domElement.style.opacity='0';
 renderer.domElement.setAttribute('aria-hidden','true');
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
host.prepend(renderer.domElement);
const scene=new THREE.Scene();
scene.background=new THREE.Color('#8ab8e1');
const camera=new THREE.OrthographicCamera(0,W,H,0,.1,100);
camera.position.z=20;
const loader=new THREE.TextureLoader();
const owned:THREE.Texture[]=[];
async function texture(name:string){const t=await loader.loadAsync(name==='clouds.png'?'/art/lounge/atmosphere-v1/clouds.png':BASE+name);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();if(disposed)t.dispose();else owned.push(t);return t;}
function plane(width:number,height:number,x:number,y:number,z:number,material:THREE.Material){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);mesh.position.set(x,H-y,z);scene.add(mesh);return mesh;}
const skyMat=new THREE.ShaderMaterial({vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 vUv;void main(){vec3 low=vec3(.76,.85,.91);vec3 high=vec3(.27,.52,.76);vec3 c=mix(low,high,smoothstep(0.,1.,vUv.y));float sun=exp(-length((vUv-vec2(.12,.84))*vec2(1.,.8))*4.);gl_FragColor=vec4(c+vec3(.14,.12,.07)*sun,1.);#include <colorspace_fragment>\n}`.replace(';#include',';\n#include')});
plane(W,H,W/2,H/2,-5,skyMat);
let disposed=false,ready=false,raf=0,last=0,elapsed=0,cloudTime=0;
const speed=1,strength=1,comparison=false,showLayers=false;
let paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const clouds: {mesh:THREE.Mesh,start:number,rate:number,width:number,height:number,y:number,opacity:number}[]=[];
let cloudAlpha:Uint8ClampedArray|undefined;
const alphaW=256,alphaH=128;
function sampleAlpha(u:number,v:number){
 if(!cloudAlpha||u<0||u>1||v<0||v>1)return 0;
 const x=u*(alphaW-1),y=v*(alphaH-1),ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
 const read=(a:number,b:number)=>cloudAlpha![(Math.min(b,alphaH-1)*alphaW+Math.min(a,alphaW-1))*4+3]/255;
 return THREE.MathUtils.lerp(THREE.MathUtils.lerp(read(ix,iy),read(ix+1,iy),fx),THREE.MathUtils.lerp(read(ix,iy+1),read(ix+1,iy+1),fx),fy);
}
function transmission(x:number,y:number){
 let light=1;
 for(const c of clouds){let density=0;for(const dx of [-24,0,24])for(const dy of [-12,0,12])density+=sampleAlpha((x+dx-c.mesh.position.x)/c.width+.5,(y+dy-c.y)/c.height+.5)/9;
 light*=1-density*c.opacity*.8;}
 return light;
}
const lightUniforms={time:{value:0},amount:{value:1}};
type Shaft={mesh:THREE.Mesh; a:number;b:number;c:number;d:number;topWidth:number;bottomWidth:number;uniforms:{time:{value:number};amount:{value:number};phase:{value:number}};pool?:THREE.Mesh;center:number;width:number};
const shafts:Shaft[]=[];
const vertex=`varying vec2 vUv;varying vec2 vWorld;void main(){vUv=uv;vWorld=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragment=`uniform float time;uniform float amount;uniform float phase;varying vec2 vUv;varying vec2 vWorld;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
void main(){float x=vUv.x,y=vUv.y;float edge=pow(max(0.,sin(x*3.14159)),1.5);float lengthFade=smoothstep(0.,.09,y)*(1.-smoothstep(.68,1.,y));float veil=noise(vec2(x*4.-time*.07+phase,y*.45+phase));float striation=.62+.38*noise(vec2(x*22.-time*.055+phase,y*1.6-time*.025));float cloudGap=smoothstep(.18,.72,veil);float a=edge*lengthFade*striation*(.38+.62*cloudGap)*amount*.25;gl_FragColor=vec4(1.,.86,.62,a);}`;
function beam(a:number,b:number,c:number,d:number,topWidth:number,bottomWidth:number){
 const pos=new Float32Array([a-topWidth/2,H-b,2,a+topWidth/2,H-b,2,c-bottomWidth/2,H-d,2,c+bottomWidth/2,H-d,2]);
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.BufferAttribute(new Float32Array([0,0,1,0,0,1,1,1]),2));geo.setIndex([0,2,1,1,2,3]);
 const uniforms={time:lightUniforms.time,amount:{value:1},phase:{value:shafts.length*2.71}};
 const mesh=new THREE.Mesh(geo,new THREE.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,depthTest:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));mesh.renderOrder=4;scene.add(mesh);shafts.push({mesh,a,b,c,d,topWidth,bottomWidth,uniforms,center:c,width:bottomWidth});
}
// Apertures fixed in the artwork coordinate system; floor endpoints stop before the desk.
beam(308,112,630,860,64,205);beam(470,300,770,886,35,120);beam(644,150,968,885,55,170);beam(1030,90,1210,689,72,142);
for(const shaft of shafts){
 if(shaft.d<760)continue;
 const mat=new THREE.ShaderMaterial({uniforms:shaft.uniforms,vertexShader:vertex,fragmentShader:`uniform float amount;uniform float time;uniform float phase;varying vec2 vUv;void main(){vec2 p=vUv-.5;float feather=exp(-dot(p*vec2(2.6,3.5),p*vec2(2.6,3.5))*3.);float broken=.78+.22*sin(vUv.x*12.+time*.09+phase);gl_FragColor=vec4(1.,.85,.58,feather*broken*.3*amount);}`,transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending});
 shaft.pool=plane(shaft.bottomWidth*1.5,80,shaft.c,shaft.d-10,3,mat);shaft.pool.renderOrder=5;
}
// Dust is visible only inside the shafts, with depth-dependent size and motion.
const count=72,positions=new Float32Array(count*3),seed=Array.from({length:count},(_,i)=>({u:((i*73+19)%101)/101,v:((i*43+11)%103)/103,d:((i*37+5)%97)/97}));
const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));
const dustMat=new THREE.ShaderMaterial({uniforms:{amount:lightUniforms.amount,pixelRatio:{value:renderer.getPixelRatio()}},vertexShader:`uniform float pixelRatio;attribute float scale;varying float fade;void main(){fade=scale;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=(1.+scale*1.8)*pixelRatio;}`,fragmentShader:`uniform float amount;varying float fade;void main(){float d=length(gl_PointCoord-.5);float a=(1.-smoothstep(.08,.5,d))*.34*amount*fade;gl_FragColor=vec4(1.,.9,.7,a);}`,transparent:true,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending});
dustGeo.setAttribute('scale',new THREE.BufferAttribute(new Float32Array(seed.map(s=>.2+s.d*.8)),1));
const dust=new THREE.Points(dustGeo,dustMat);dust.renderOrder=6;scene.add(dust);
function resize(){const r=host.getBoundingClientRect();if(disposed||!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);const aspect=r.width/r.height;const worldAspect=W/H;if(aspect>worldAspect){const height=W/aspect;camera.left=0;camera.right=W;camera.top=H-(H-height)/2;camera.bottom=(H-height)/2;}else{const width=H*aspect;camera.left=(W-width)/2;camera.right=(W+width)/2;camera.top=H;camera.bottom=0;}camera.updateProjectionMatrix();render();}
const observer=new ResizeObserver(resize);observer.observe(host);
function render(){if(!disposed)renderer.render(scene,camera);}
const leafUniforms={time:{value:0},sun:{value:.75},wind:{value:1}};
const vines:THREE.Mesh[]=[];
function addVine(map:THREE.Texture,x:number,y:number,w:number,h:number,phase:number,flip=1){
 const material=new THREE.ShaderMaterial({uniforms:{...leafUniforms,map:{value:map},phase:{value:phase},flip:{value:flip}},transparent:true,depthWrite:false,side:THREE.DoubleSide,
 vertexShader:`uniform float time,wind,phase;varying vec2 vUv;void main(){vUv=uv;vec3 p=position;float loose=pow(1.-uv.y,1.6);float twig=sin(uv.y*28.+time*1.2+phase)*sin(uv.x*12.+phase);p.x+=wind*(sin(time*.42+phase+(1.-uv.y)*2.)*4.8*loose+twig*1.1*(.2+loose));p.y+=wind*sin(time*.67+phase+uv.y*15.)*.55*loose;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
 fragmentShader:`uniform sampler2D map;uniform float sun,flip;varying vec2 vUv;void main(){vec2 uv=vec2(flip<0.?1.-vUv.x:vUv.x,vUv.y);vec4 c=texture2D(map,uv);if(c.a<.01)discard;vec3 warm=mix(vec3(.83,.91,1.),vec3(1.07,1.03,.92),sun);gl_FragColor=vec4(c.rgb*warm,c.a);#include <colorspace_fragment>\n}`.replace(';#include',';\n#include')});
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h,12,64),material);mesh.position.set(x,H-y,1);mesh.renderOrder=3.5;scene.add(mesh);vines.push(mesh);
}
function update(){
 for(const c of clouds){let x=((c.start+cloudTime*c.rate+c.width/2)%(W+c.width)+W+c.width)%(W+c.width)-c.width/2;c.mesh.position.x=x;}
 // Visible cloud coverage determines each aperture's transmission independently.
 // Keep the aperture anchored: only the illuminated part of its footprint drifts.
 lightUniforms.time.value=cloudTime;
 let totalLight=0;
 for(const [i,s] of shafts.entries()){
  const cover=transmission(s.a,s.b),phase=i*1.87;
  const breath=.82+.12*Math.sin(cloudTime*.17+phase)+.06*Math.sin(cloudTime*.071+phase*2.3);
  s.uniforms.amount.value=comparison?0:strength*(.16+.96*cover)*breath;
  const drift=12*Math.sin(cloudTime*.085)+6*Math.sin(cloudTime*.139+phase);
  const spread=.78+.23*cover+.09*Math.sin(cloudTime*.117+phase);
  s.center=s.c+drift;s.width=s.bottomWidth*spread;
  const p=s.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
  p.setX(2,s.center-s.width/2);p.setX(3,s.center+s.width/2);p.needsUpdate=true;
  if(s.pool){s.pool.position.x=s.center;s.pool.scale.x=spread;s.pool.scale.y=.85+.15*cover;}
  totalLight+=s.uniforms.amount.value;
 }
 lightUniforms.amount.value=totalLight/shafts.length;
 const targetSun=Math.min(1,Math.max(.2,(shafts[0].uniforms.amount.value*.55+shafts[2].uniforms.amount.value*.45)));
 homeDaylight.sun=targetSun;homeDaylight.time=cloudTime;
 leafUniforms.time.value=cloudTime;leafUniforms.sun.value=targetSun;leafUniforms.wind.value=1;

 for(let i=0;i<count;i++){const s=seed[i],v=(s.v+elapsed*(.004+s.d*.002))%1;const y=150+v*720;const first=shafts[0],f=(y-first.b)/(first.d-first.b);const center=THREE.MathUtils.lerp(first.a,first.center,f);positions[i*3]=center+(s.u-.5)*(55+v*125)+Math.sin(elapsed*.16+i)*6;positions[i*3+1]=H-y;positions[i*3+2]=4+s.d;}
 dustGeo.attributes.position.needsUpdate=true;render();
}
function tick(now:number){raf=0;if(disposed||document.hidden)return;if(homeIsCovered()){last=now;raf=requestAnimationFrame(tick);return;}const dt=last?Math.min((now-last)/1000,.05):0;last=now;if(!paused&&!comparison&&!showLayers){elapsed+=dt;cloudTime+=dt*speed;update();}if(!paused&&!comparison&&!showLayers)raf=requestAnimationFrame(tick);}
function resume(){last=0;if(ready&&!raf&&!disposed&&!document.hidden&&!paused&&!comparison&&!showLayers)raf=requestAnimationFrame(tick);}

function visibility(){if(document.hidden){cancelAnimationFrame(raf);raf=0;last=0;}else resume();}
function reduced(e:MediaQueryListEvent){paused=e.matches;if(paused){cancelAnimationFrame(raf);raf=0;}else resume();}
function contextLost(e:Event){e.preventDefault();host.dataset.atmosphere='fallback';destroy();}
document.addEventListener('visibilitychange',visibility);
reduce.addEventListener('change',reduced);
renderer.domElement.addEventListener('webglcontextlost',contextLost);
async function init(){try{
 const [fg,cloud,ivy]=await Promise.all([texture('library-wide.png'),texture('clouds.png'),texture('ivy.png')]);if(disposed)return;
 // Sample alpha once. No canvas readback or texture allocation in the animation loop.
 const sampler=document.createElement('canvas');sampler.width=alphaW;sampler.height=alphaH;
 const ctx=sampler.getContext('2d',{willReadFrequently:true});
 if(ctx){ctx.drawImage(cloud.image,0,0,alphaW,alphaH);cloudAlpha=ctx.getImageData(0,0,alphaW,alphaH).data;}
 for(const layer of [{y:170,w:1290,h:645,rate:3.8,opacity:.74,start:50},{y:350,w:1490,h:745,rate:7.8,opacity:.95,start:760}]){
  // Two copies share a period wider than the visible frame, so loops never pop.
  const span=W+layer.w;
  for(let i=0;i<2;i++){const mesh=plane(layer.w,layer.h,0,layer.y,-3+(layer.rate>4?1:0),new THREE.MeshBasicMaterial({map:cloud,transparent:true,opacity:layer.opacity,depthWrite:false}));mesh.renderOrder=layer.rate>4?2:1;clouds.push({mesh,start:layer.start+i*span/2,rate:layer.rate,width:layer.w,height:layer.h,y:layer.y,opacity:layer.opacity});}
 }
 // Mild, alpha-aware reconstruction keeps stone edges crisp on dense displays.
 // This improves sampling; it does not claim new source-image detail.
 const plate=new THREE.MeshBasicMaterial({map:fg,transparent:true,depthWrite:false});
 plate.onBeforeCompile=shader=>{
  shader.uniforms.plateTexel={value:new THREE.Vector2(1/fg.image.width,1/fg.image.height)};
  shader.fragmentShader='uniform vec2 plateTexel;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
  #ifdef USE_MAP
   vec4 c=texture2D(map,vMapUv),l=texture2D(map,vMapUv-vec2(plateTexel.x,0.)),r=texture2D(map,vMapUv+vec2(plateTexel.x,0.)),u=texture2D(map,vMapUv+vec2(0.,plateTexel.y)),d=texture2D(map,vMapUv-vec2(0.,plateTexel.y));
   float solid=step(.99,min(c.a,min(min(l.a,r.a),min(u.a,d.a))));
   vec3 detail=c.rgb-(l.rgb+r.rgb+u.rgb+d.rgb)*.25;
   diffuseColor*=vec4(clamp(c.rgb+detail*.24*solid,0.,1.),c.a);
  #endif
  `);
 };
 const front=plane(W,H,W/2,H/2,0,plate);front.renderOrder=3;
 // Independent foliage plates retain the marble under them; no ghost copies.
 addVine(ivy,752,424,164,646,.4);
 addVine(ivy,1378,437,106,510,2.4,-1);
 addVine(ivy,212,459,106,557,4.2,-1);
 ready=true;resize();update();renderer.domElement.style.opacity='1';host.dataset.atmosphere='ready';announceHomeDaylightReady();resume();
}catch(err){if(!disposed){host.dataset.atmosphere='fallback';destroy();}}}

function destroy(){
 if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer.disconnect();
 document.removeEventListener('visibilitychange',visibility);reduce.removeEventListener('change',reduced);
 renderer.domElement.removeEventListener('webglcontextlost',contextLost);
 scene.traverse(obj=>{if(obj instanceof THREE.Mesh||obj instanceof THREE.Points){obj.geometry.dispose();const mats=Array.isArray(obj.material)?obj.material:[obj.material];mats.forEach(m=>m.dispose());}});
 owned.forEach(t=>t.dispose());cloudAlpha=undefined;renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
}
void init();
return destroy;
}
