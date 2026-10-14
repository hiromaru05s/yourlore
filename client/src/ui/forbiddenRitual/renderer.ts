import * as T from 'three';
import {Skin} from './skin';
import {sigilTexture,sigilMaterial,lightSkin} from './sigil';
import {DURATION,progress as p,smooth as s,lerp as l,type Frame,type Rect} from './model';
const PI=Math.PI,TAU=PI*2;
type XY={x:number;y:number;w:number;h:number};
export function createRenderer(faces:HTMLCanvasElement[]){
 const renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 const scene=new T.Scene(),camera=new T.OrthographicCamera(-5,5,3.2,-3.2,.1,60);
 const maps=faces.map(f=>{const t=new T.CanvasTexture(f);t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);return t;});
 scene.add(new T.AmbientLight(0xbeb7c4,.65));
 const key=new T.DirectionalLight(0xffc6b6,2.3);key.position.set(-3,-4,8);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:.1,far:28});key.shadow.normalBias=.015;key.shadow.bias=-.00025;scene.add(key);
 const rim=new T.DirectionalLight(0xff6b80,1.2);rim.position.set(3,4,3);scene.add(rim);
 const shadowMat=new T.ShadowMaterial({opacity:.25});
 const floor=new T.Mesh<T.PlaneGeometry,T.Material>(new T.PlaneGeometry(50,50),shadowMat);floor.receiveShadow=true;floor.position.z=-.015;scene.add(floor);
 const pulse=new T.PointLight(0xff1830,0,7,2);scene.add(pulse);
 const plane=new T.PlaneGeometry(1,1);
 const shadowMaterial=()=>new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{opacity:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform float opacity;void main(){vec2 q=abs(vUv-.5)-vec2(.3,.32);float d=length(max(q,0.))+min(max(q.x,q.y),0.)-.015;gl_FragColor=vec4(.018,.003,.009,exp(-max(d,0.)*23.)*opacity);}',toneMapped:false});
 const card=(map:T.Texture)=>{const material=lightSkin(map),mesh=new T.Mesh(plane,material.mat);mesh.frustumCulled=false;return {mesh,...material};};
 const atlas=sigilTexture();
 const rig=(()=>{
  const root=new T.Group();scene.add(root);
  const source=card(maps[0]);root.add(source.mesh);
  const targets=maps.slice(1).map(map=>{const c=card(map);root.add(c.mesh);return c;});
  const shadows=Array.from({length:faces.length-1},()=>{const mat=shadowMaterial(),mesh=new T.Mesh(plane,mat);root.add(mesh);return {mat,mesh};});
  const seals=Array.from({length:3},()=>{
   const group=new T.Group(),core=sigilMaterial(atlas),halo=sigilMaterial(atlas,true);
   const mesh=new T.Mesh(plane,core.mat),glow=new T.Mesh(plane,halo.mat);glow.position.z=.003;group.add(mesh,glow);root.add(group);return {group,core,halo};
  });
  const silkMat=new T.MeshPhysicalMaterial({color:0x400612,emissive:0x61051b,emissiveIntensity:.28,roughness:.3,metalness:.22,clearcoat:.7,clearcoatRoughness:.24,side:T.DoubleSide,transparent:true});
  const bands=Array.from({length:3},()=>{const skin=new Skin(silkMat,2,48,.012);root.add(skin.mesh);return skin;});
  // Broad radial falloff grounds the light on the table; it is never a screen-wide bloom.
  const spillMat=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{opacity:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform float opacity;void main(){float r=length((vUv-.5)*2.);float a=pow(max(0.,1.-r),3.)*opacity;gl_FragColor=vec4(.85,.006,.035,a);}',toneMapped:false});
  const spill=new T.Mesh(plane,spillMat);root.add(spill);
  return {root,source,targets,shadows,seals,bands,silkMat,spill,spillMat};
 })();
 function setCard(c:ReturnType<typeof card>,r:XY,z:number,energy:number,opacity:number,t:number){
  c.mesh.visible=opacity>.001;c.mesh.position.set(r.x,r.y,z);c.mesh.scale.set(r.w*1.6/1.03,r.h*2.24/1.43,1);c.mesh.rotation.set(0,0,0);
  c.uniforms.energy.value=energy;c.uniforms.opacity.value=opacity;c.uniforms.time.value=t;
 }
 function animate(o:Frame,source:XY,targets:XY[]){
  const t=o.time/1000,unit=source.w/1.55,sign=o.side?-1:1;
  const charge=s(p(t,.15,1.03)),open=s(p(t,.85,2.2)),close=s(p(t,4.6,5.75)),alive=1-close,depart=s(p(t,2.55,4.55));
  const cx=source.x,cy=source.y+sign*.68*unit*s(p(t,.4,1.6)),cz=.12*unit;
  const radius=2.05*unit;
  const breathing=1+Math.sin(t*3.2)*.012*open;
  setCard(rig.source,{...source,x:cx,y:cy,w:source.w*(1-depart*.08),h:source.h*(1-depart*.08)},(.1+charge*.24)*unit,charge,1-s(p(t,2.65,3.7)),t);
  rig.spill.position.set(cx,cy,.005);rig.spill.scale.setScalar(radius*3.1);rig.spillMat.uniforms.opacity.value=charge*alive*.6;
  pulse.position.set(cx,cy,.75*unit);pulse.distance=radius*3;pulse.intensity=charge*alive*unit*unit*2.2;
  rig.seals.forEach((seal,i)=>{
   const x=cx,y=cy,z=cz+i*.017*unit+i*.57*unit*open,rz=(i%2?-1:1)*t*(.13+i*.025),r=radius*[1,.8,.61][i],alpha=alive,trace=p(t,.85+i*.27,2.15+i*.27);
   seal.group.visible=alpha>.001&&trace>0;seal.group.position.set(x,y,z);seal.group.rotation.set(0,0,rz);seal.group.scale.set(r*2.2*breathing*(.68+.32*open)*(1-close*.15),r*2.2*breathing*(.68+.32*open)*(1-close*.15),1);
   for(const material of [seal.core,seal.halo]){material.uniforms.open.value=trace;material.uniforms.opacity.value=alpha;material.uniforms.time.value=t;}
  });
  rig.silkMat.opacity=charge*alive;rig.silkMat.emissiveIntensity=.2+open*.3;
  rig.bands.forEach((band,i)=>{
   band.mesh.visible=t>.18&&t<5.75;const n=rig.bands.length,angle=i/n*TAU-PI/2;
   band.update((u,v)=>{
    const growth=s(p(t,.5,2.0)),width=.19*unit*Math.sin(PI*v)**.45*(.2+.8*growth)*alive;
    const a=angle+v*TAU*1.1+t*.18,rad=radius*(.85-.39*v)*growth;
    const x=Math.cos(a)*rad,y=Math.sin(a)*rad,z=(.14+v*1.2)*unit*growth,twist=v*PI*1.4;
    const normal=angle+PI/2,offset=(u-.5)*width;
    return [cx+x+Math.cos(normal)*offset*Math.cos(twist),cy+y+Math.sin(normal)*offset*Math.cos(twist),cz+z+offset*Math.sin(twist)];
   },.011*unit*alive);
  });
  rig.targets.forEach((card,i)=>{
   const target=targets[i];if(!target){card.mesh.visible=false;return;}
   const birth=s(p(t,2.5+i*.13,3.05+i*.13)),travel=s(p(t,3.10+i*.13,4.95+i*.13));
   const level=i%3,a=(i-(targets.length-1)/2)*.7+PI/2,orbit=(1-travel)*.75;
   const bx=cx+Math.cos(a+orbit)*radius*(.55-level*.13),by=cy+Math.sin(a+orbit)*radius*(.55-level*.13),bz=(.25+level*.57)*unit;
   const size=l(.3,1,birth),z=l(bz,.07*unit,travel)+Math.sin(PI*travel)*unit*.6;
   setCard(card,{x:l(bx,target.x,travel),y:l(by,target.y,travel),w:target.w*size,h:target.h*size},z,1-s(p(t,3.45+i*.13,4.65+i*.13)),birth,t);
   card.mesh.rotation.z=(i-(targets.length-1)/2)*.2*Math.sin(PI*travel);
   card.mesh.rotation.x=.23*(1-travel)*birth;
   const shadow=rig.shadows[i];shadow.mesh.visible=birth>0;shadow.mesh.position.set(card.mesh.position.x+.03*unit,card.mesh.position.y+.025*unit,.01);shadow.mesh.scale.set(target.w*(1.12+z*.18),target.h*(1.09+z*.18),1);shadow.mat.uniforms.opacity.value=birth*(.15+.22*travel);
  });
  if(t>=DURATION/1000){rig.root.visible=false;floor.visible=false;}else floor.visible=true;
 }
 let dead=false;
 const output=renderer.domElement;output.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
 function draw(o:Frame){
  if(dead)return;const {width:w,height:h}=o,dpr=Math.min(devicePixelRatio||1,1.5);
  const pw=Math.max(1,Math.round(w*dpr)),ph=Math.max(1,Math.round(h*dpr));if(output.width!==pw||output.height!==ph)renderer.setSize(pw,ph,false);
  camera.left=-w/200;camera.right=w/200;camera.top=h/200;camera.bottom=-h/200;camera.position.set(0,0,20);camera.up.set(0,1,0);camera.lookAt(0,0,0);camera.updateProjectionMatrix();
  const convert=(r:Rect)=>({x:(r.x-w/2)/100,y:(h/2-r.y)/100,w:r.w/100,h:r.h/100});
  rig.root.visible=true;animate(o,convert(o.source),o.targets.map(convert));renderer.setClearColor(0,0);renderer.render(scene,camera);
 }
 function dispose(){if(dead)return;dead=true;const gs=new Set<T.BufferGeometry>(),ms=new Set<T.Material>();scene.traverse(o=>{if(o instanceof T.Mesh){gs.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>ms.add(m));}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());shadowMat.dispose();key.shadow.dispose();maps.forEach(t=>t.dispose());atlas.dispose();renderer.dispose();renderer.forceContextLoss();output.remove();}
 return {draw,dispose,canvas:output,get info(){return renderer.info;}};
}
