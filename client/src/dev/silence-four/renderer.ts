import * as T from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {DURATION,designs,ease,pulse,lift} from './catalog';
type C=CanvasRenderingContext2D;
export type Pass='all'|'ground'|'card';
const vertex=`varying vec2 vUv;varying vec3 vNormal;uniform float bulge;void main(){vUv=uv;vec3 p=position;p.z+=bulge*cos(p.x*1.5707963)*cos(p.y*1.0471976);vNormal=normalize(normalMatrix*vec3(-bulge*sin(p.x*1.5708)*cos(p.y*1.0472),-bulge*cos(p.x*1.5708)*sin(p.y*1.0472),1.));gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
const filmFragment=`varying vec2 vUv;varying vec3 vNormal;uniform float amount;uniform float clock;void main(){vec2 p=vUv-.5;float r=length(p*vec2(1.,1.45));float veins=pow(max(0.,sin(r*110.-clock*2.)),18.);float rim=pow(1.-abs(vNormal.z),2.);float edge=pow(max(abs(p.x),abs(p.y))*2.,18.);float seam=pow(max(0.,cos(atan(p.y,p.x)*8.)),42.)*smoothstep(.12,.45,r);float a=(.12+rim*.42+veins*.05+edge*.38+seam*.20)*amount;gl_FragColor=vec4(mix(vec3(.17,.26,.39),vec3(.78,.88,.96),rim+edge*.5+seam*.3),a);}`;
function texture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d')!;
 c.fillStyle='#c8c2ad';c.fillRect(0,0,512,512);
 let seed=127;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<15000;i++){const a=rand()*.11;c.fillStyle=rand()>.48?`rgba(255,250,224,${a})`:`rgba(49,48,42,${a})`;c.fillRect(rand()*512,rand()*512,1+rand()*3,1+rand()*2);}
 for(let i=0;i<32;i++){let x=rand()*512,y=rand()*512;c.beginPath();c.moveTo(x,y);for(let j=0;j<6;j++){x+=rand()*35-10;y+=rand()*38;c.lineTo(x,y);}c.strokeStyle='rgba(51,52,48,.12)';c.lineWidth=.8+rand();c.stroke();}
 for(let i=0;i<9;i++){c.beginPath();for(let j=0;j<100;j++){const x=j/99*512,y=i*66+Math.sin(j*.075+i)*19+Math.sin(j*.24+i*2)*6;j?c.lineTo(x,y):c.moveTo(x,y);}c.strokeStyle='rgba(46,44,33,.13)';c.lineWidth=.8;c.stroke();}
 c.strokeStyle='rgba(255,248,221,.3)';c.lineWidth=2;c.strokeRect(11,11,490,490);
 const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;return tex;
}
function polygon(points:number[][],depth:number){const s=new T.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.025,bevelThickness:.024,curveSegments:1});}
export class Renderer{
 readonly gpu:T.WebGLRenderer;readonly scene=new T.Scene();readonly root=new T.Group();readonly ground=new T.Group();readonly card=new T.Group();
 readonly camera=new T.OrthographicCamera(-3.2,3.2,3.2,-3.2,.1,40);
 private stoneTexture=texture();private textures=new Map<HTMLCanvasElement,T.CanvasTexture>();
 private stone=new T.MeshStandardMaterial({map:this.stoneTexture,color:0xe3ddc8,roughness:.8,metalness:.12});
 private gold=new T.MeshStandardMaterial({color:0xb7a06b,roughness:.3,metalness:.68});
 private navy=new T.MeshStandardMaterial({color:0x14263c,roughness:.5,metalness:.24});
 private glow=new T.MeshBasicMaterial({color:0xc5ddf2,transparent:true,opacity:0,depthWrite:false});
 private base:T.Mesh;private face:T.Mesh;private faceMat=new T.MeshBasicMaterial({transparent:true,side:T.DoubleSide});
 private seals=new T.Group();private gates:T.Group[]=[];private vault=new T.Group();private film:T.Mesh<T.PlaneGeometry,T.ShaderMaterial>;private ribs:T.Mesh[]=[];
 private strata=new T.Group();private bands:T.Group[]=[];private bandMats:T.MeshBasicMaterial[]=[];
 private star=new T.Group();private petals:T.Group[]=[];private inlay=new T.Group();private shine:T.Mesh[]=[];
 private imprint:T.Group;private contact:T.Mesh;private shadow:T.Mesh;private disposed=false;
 constructor(){
  this.gpu=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});this.gpu.setPixelRatio(1);this.gpu.setClearColor(0,0);this.gpu.outputColorSpace=T.SRGBColorSpace;
  this.gpu.toneMapping=T.ACESFilmicToneMapping;this.gpu.toneMappingExposure=1.22;
  this.scene.add(new T.HemisphereLight(0xd8e7fc,0x4b493a,2.2));const key=new T.DirectionalLight(0xffedcd,3.7);key.position.set(-3,4,7);this.scene.add(key);const rim=new T.DirectionalLight(0x94bce2,2);rim.position.set(3,-2,3);this.scene.add(rim);
  this.scene.add(this.root);this.root.add(this.ground,this.card);this.card.add(this.seals,this.vault,this.strata,this.star,this.inlay);
  const body=new RoundedBoxGeometry(2,3,.065,2,.045);this.base=new T.Mesh(body,this.navy);this.base.position.z=-.035;this.card.add(this.base);
  this.face=new T.Mesh(new T.PlaneGeometry(2,3),this.faceMat);this.face.position.z=.006;this.card.add(this.face);
  // The ornamental channels already lie on the face in frame zero. They gain relief, never teleport in.
  for(let i=0;i<4;i++){const vertical=i<2;const mesh=new T.Mesh(new T.BoxGeometry(vertical?.014:1.84,vertical?2.82:.014,.012),this.glow);mesh.position.set(vertical?(i===0?-.925:.925):0,vertical?0:(i===2?-1.41:1.41),.025);this.inlay.add(mesh);}
  for(let i=0;i<8;i++){const a=i*Math.PI/4;const m=new T.Mesh(polygon([[0,.06],[-.035,.16],[0,.47],[.035,.16]],.006),this.glow);m.rotation.z=a;m.position.z=.027;this.inlay.add(m);}
  // Two authored, toothed stones; gold bevel, dark recessed rail, white stone heart.
  for(let side=0;side<2;side++){
   const g=new T.Group();g.position.x=side?1:-1;
   const shape=[[0,-1.34],[.43,-1.34],[.63,-1.03],[.46,-.63],[.74,-.2],[.63,.1],[.43,.42],[.66,.78],[.4,1.34],[0,1.34]];
   const trim=new T.Mesh(polygon(shape,.10),this.gold);g.add(trim);
   const core=new T.Mesh(polygon(shape.map(([x,y])=>[x*.90,y*.96]),.11),this.stone);core.position.z=.026;g.add(core);
   const line=new T.Mesh(new T.BoxGeometry(.042,2.39,.014),this.navy);line.position.set(.135,0,.157);g.add(line);
   for(let j=0;j<5;j++){const bar=new T.Mesh(new T.BoxGeometry(.20,.018,.018),this.gold);bar.position.set(.29,(j-2)*.44,.163);g.add(bar);}
   const light=new T.Mesh(new T.BoxGeometry(.025,2.25,.009),this.glow);light.position.set(.138,0,.17);g.add(light);
   for(let j=0;j<3;j++){const mark=new T.Mesh(polygon([[0,.08],[.032,0],[0,-.08],[-.032,0]],.004),this.gold);mark.position.set(.32,(j-1)*.86,.174);g.add(mark);}
   this.seals.add(g);this.gates.push(g);
  }
  const filmMat=new T.ShaderMaterial({vertexShader:vertex,fragmentShader:filmFragment,uniforms:{bulge:{value:0},amount:{value:0},clock:{value:0}},transparent:true,side:T.DoubleSide,depthWrite:false});
  this.film=new T.Mesh(new T.PlaneGeometry(2,3,40,48),filmMat);this.film.position.z=.04;this.vault.add(this.film);
  for(let i=0;i<5;i++){const geom=new T.BufferGeometry();geom.setAttribute('position',new T.BufferAttribute(new Float32Array(33*2*3),3));const indices:number[]=[];for(let j=0;j<32;j++)indices.push(j*2,j*2+1,j*2+2,j*2+1,j*2+3,j*2+2);geom.setIndex(indices);const rib=new T.Mesh(geom,i%2?this.gold:this.stone);this.ribs.push(rib);this.vault.add(rib);}
  // Each stratum retains its exact crop of the source face. No whole-card duplicates.
  for(let i=0;i<7;i++){const band=new T.Group(),h=3/7;
   const trim=new T.Mesh(new RoundedBoxGeometry(2,h-.018,.12,2,.022),this.gold);trim.position.z=-.06;band.add(trim);
   const slab=new T.Mesh(new T.BoxGeometry(1.975,h-.03,.09),this.stone);slab.position.z=-.015;band.add(slab);
   const geom=new T.PlaneGeometry(2,h);const uv=geom.getAttribute('uv');for(let n=0;n<uv.count;n++)uv.setY(n,(uv.getY(n)+6-i)/7);
   const mat=new T.MeshBasicMaterial({transparent:true,side:T.DoubleSide});const top=new T.Mesh(geom,mat);top.position.z=.04;band.add(top);this.bandMats.push(mat);
   const seam=new T.Mesh(new T.BoxGeometry(1.91,.012,.008),this.glow);seam.position.set(0,-h*.5+.016,.054);band.add(seam);this.bands.push(band);this.strata.add(band);
  }
  // Eight separate, bevelled star blades. The dark centre stays legible between them.
  for(let i=0;i<8;i++){const g=new T.Group();
   const outline=[[.08,-.02],[.32,-.20],[.91,-.12],[1.11,.04],[.61,.22],[.34,.17]];
   g.add(new T.Mesh(polygon(outline,.065),this.gold));const core=new T.Mesh(polygon(outline.map(([x,y])=>[x*.93,y*.74]),.063),this.stone);core.position.z=.025;g.add(core);
   const cut=new T.Mesh(polygon([[.32,-.035],[.80,0],[.37,.058]],.004),this.navy);cut.position.z=.118;g.add(cut);
   const glint=new T.Mesh(polygon([[.25,-.01],[.82,.0],[.31,.02]],.002),this.glow);glint.position.z=.125;g.add(glint);this.shine.push(glint);
   this.star.add(g);this.petals.push(g);
  }
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=256;const c=shadowCanvas.getContext('2d')!;const grad=c.createRadialGradient(128,128,16,128,128,122);grad.addColorStop(0,'rgba(13,20,29,.48)');grad.addColorStop(.65,'rgba(13,20,29,.20)');grad.addColorStop(1,'rgba(13,20,29,0)');c.fillStyle=grad;c.fillRect(0,0,256,256);
  const shadTex=new T.CanvasTexture(shadowCanvas);this.shadow=new T.Mesh(new T.PlaneGeometry(2.9,3.9),new T.MeshBasicMaterial({map:shadTex,transparent:true,depthWrite:false}));this.shadow.position.z=-.115;this.ground.add(this.shadow);
  this.imprint=new T.Group();this.ground.add(this.imprint);
  for(let i=0;i<4;i++){const v=i<2,m=new T.Mesh(new T.BoxGeometry(v?.014:2.08,v?3.04:.014,.002),new T.MeshBasicMaterial({color:0x937c48,transparent:true,opacity:0,depthWrite:false}));m.position.set(v?(i?1.045:-1.045):0,v?0:(i===2?-1.525:1.525),-.055);this.imprint.add(m);}
  this.contact=new T.Mesh(new T.RingGeometry(.95,1.01,48),new T.MeshBasicMaterial({color:0xd1bc89,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}));this.contact.scale.set(1.1,1.58,1);this.contact.position.z=-.07;this.ground.add(this.contact);
 }
 private prepareFace(face:HTMLCanvasElement){let tex=this.textures.get(face);if(!tex){tex=new T.CanvasTexture(face);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;this.textures.set(face,tex);}this.faceMat.map=tex;this.bandMats.forEach(m=>m.map=tex);}
 draw(c:C,face:HTMLCanvasElement,v:number,ms:number,x:number,y:number,w:number,reduced=false,pass:Pass='all',studio=true,giant=true){
  if(this.disposed)return;this.prepareFace(face);const t=reduced?DURATION:ms;const amp=giant?1:.76,hit=designs[v].hit;
  const alive=t<DURATION&&!reduced,energy=pulse(-100,430,hit-180,hit+300,t);
  this.glow.opacity=energy*.72;this.inlay.visible=alive;this.card.position.z=lift(v,t,reduced)*2;
  this.root.rotation.set(0,0,studio?-.13:0);this.root.scale.set(1,1,1);
  this.base.visible=true;this.face.visible=v!==2||!alive;this.seals.visible=alive&&v===0;this.vault.visible=alive&&v===1;this.strata.visible=alive&&v===2;this.star.visible=alive&&v===3;
  this.faceMat.color.setRGB(1-energy*.1,1-energy*.07,1-energy*.025);
  if(v===0){const grow=ease(0,520,t),lock=ease(860,1150,t),retire=ease(1330,1960,t);for(let i=0;i<2;i++){const s=i===0?1:-1,g=this.gates[i];g.position.set(-s*(.94-.13*lock+.07*retire),0,.024+(grow*(1-lock)*.15)*amp);g.rotation.set(0,-s*grow*(1-lock)*1.09,i?Math.PI:0);g.scale.set((.12+.88*grow)*(1-retire*.99),1,(.25+.75*grow)*(1-retire*.99));}}
  if(v===1){const swell=pulse(0,810,1050,hit,t)*amp;this.film.material.uniforms.bulge.value=swell*1.45;this.film.material.uniforms.amount.value=(.45+.55*ease(0,400,t))*(1-ease(hit,hit+420,t));this.film.material.uniforms.clock.value=t/1000;for(let i=0;i<5;i++){const rib=this.ribs[i];const attr=rib.geometry.getAttribute('position');const xx=(i-2)*.43,thickness=(i===2?.045:.023)*(1-ease(hit,hit+450,t));for(let j=0;j<33;j++){const yy=-1.47+j/32*2.94,z=.035+swell*1.45*Math.cos(xx*Math.PI/2)*Math.cos(yy*Math.PI/3);attr.setXYZ(j*2,xx-thickness,yy,z);attr.setXYZ(j*2+1,xx+thickness,yy,z+.009);}attr.needsUpdate=true;rib.geometry.computeVertexNormals();}}
  if(v===2){this.bands.forEach((b,i)=>{const rise=ease(0,480+i*47,t),settle=ease(1030+i*71,1350+i*78,t),a=rise*(1-settle);b.position.set(Math.sin(i*.85)*a*.20*amp,1.5-(i+.5)*3/7+(3-i)*a*.07,.008+a*(.48+(6-i)*.13)*amp);b.rotation.y=Math.sin(i*1.1)*a*.11;b.scale.z=.35+.65*a;});}
  if(v===3){const grow=ease(0,620,t),close=ease(890,1390,t),retire=ease(1430,2050,t),a=grow*(1-close);this.star.rotation.z=a*.35;this.petals.forEach((p,i)=>{const theta=i*Math.PI/4;p.rotation.set(a*.12,Math.sin(i%2?-.75:.75)*a,theta+a*.57);p.position.set(Math.cos(theta)*a*.11,Math.sin(theta)*a*.11,.023+a*(.46+(i%2)*.1)*amp);p.scale.set((.13+.87*grow)*(1-retire*.998),(.22+.78*grow)*(1-retire*.998),(.2+.8*grow)*(1-retire*.998));});}
  this.shadow.scale.setScalar(1+lift(v,t,reduced)*.17);(this.shadow.material as T.MeshBasicMaterial).opacity=.72+.2*(1-lift(v,t,reduced));
  this.imprint.children.forEach(m=>( (m as T.Mesh).material as T.MeshBasicMaterial).opacity=pulse(hit,hit+55,hit+180,hit+600,t)*.7);
  const age=Math.max(0,t-hit);this.contact.visible=alive&&t>=hit;(this.contact.material as T.MeshBasicMaterial).opacity=pulse(hit,hit+30,hit+70,hit+340,t)*.17;this.contact.scale.set((1.06+ease(0,400,age)*.13),(1.57+ease(0,400,age)*.13),1);
  this.card.visible=pass!=='ground';this.ground.visible=pass!=='card';
  if(studio){this.camera.position.set(0,-7.5,6);this.camera.up.set(0,0,1);this.camera.lookAt(0,0,.3);}else{this.camera.position.set(0,0,10);this.camera.up.set(0,1,0);this.camera.lookAt(0,0,0);}
  this.camera.updateProjectionMatrix();if(!studio){this.camera.projectionMatrix.elements[9]=.325/3.2;this.camera.projectionMatrix.elements[13]=10*.325/3.2;}
  const sz=Math.max(256,Math.min(950,Math.round(w*3.2*Math.min(devicePixelRatio,1.5))));if(this.gpu.domElement.width!==sz)this.gpu.setSize(sz,sz,false);
  this.gpu.render(this.scene,this.camera);c.drawImage(this.gpu.domElement,x-w*1.6,y-w*1.6,w*3.2,w*3.2);
 }
 stats(){return {geometries:this.gpu.info.memory.geometries,textures:this.gpu.info.memory.textures,calls:this.gpu.info.render.calls};}
 dispose(){if(this.disposed)return;this.disposed=true;const gs=new Set<T.BufferGeometry>(),ms=new Set<T.Material>(),ts=new Set<T.Texture>([this.stoneTexture,...this.textures.values()]);this.scene.traverse(o=>{if(o instanceof T.Mesh){gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){ms.add(m);const mapped=m as T.MeshStandardMaterial;if(mapped.map)ts.add(mapped.map);}}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>t.dispose());this.textures.clear();this.gpu.dispose();this.gpu.forceContextLoss();}
}
