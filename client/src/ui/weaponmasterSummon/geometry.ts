import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

function grain(kind:'steel'|'iron'|'leather'){
 const size=256,data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const k=(y*size+x)*4,n=(Math.sin(x*127.1+y*311.7)*43758.5453)%1;const v=kind==='steel'?150+Math.sin(x*3.1)*14+n*5:kind==='iron'?145+n*40:150+Math.sin(x*.47+Math.sin(y*.4))*24+n*20;data[k]=data[k+1]=data[k+2]=v;data[k+3]=255;}const t=new T.DataTexture(data,size,size);t.wrapS=t.wrapT=T.RepeatWrapping;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;
}
export class ForgeMaterials {
 textures=[grain('steel'),grain('iron'),grain('leather')];
 steel=new T.MeshPhysicalMaterial({color:0x969fa7,metalness:.96,roughness:.3,anisotropy:.65,anisotropyRotation:Math.PI/2,bumpMap:this.textures[0],bumpScale:.0012});
 edge=new T.MeshPhysicalMaterial({color:0xd4dce0,metalness:1,roughness:.19,anisotropy:.7,anisotropyRotation:Math.PI/2});
 iron=new T.MeshStandardMaterial({color:0x303844,metalness:.72,roughness:.52,bumpMap:this.textures[1],bumpScale:.005});
 brass=new T.MeshStandardMaterial({color:0xb59a64,metalness:.93,roughness:.31,bumpMap:this.textures[0],bumpScale:.0006});
 leather=new T.MeshStandardMaterial({color:0x392523,roughness:.78,bumpMap:this.textures[2],bumpScale:.003});
 enamel=new T.MeshPhysicalMaterial({color:0x153640,metalness:.4,roughness:.22,clearcoat:.9,clearcoatRoughness:.12});
 ember=new T.MeshStandardMaterial({color:0xd16b24,emissive:0xff5d0b,emissiveIntensity:1.3,metalness:.42,roughness:.4});
 all(){return [this.steel,this.edge,this.iron,this.brass,this.leather,this.enamel,this.ember];}
 dispose(){this.textures.forEach(t=>t.dispose());this.all().forEach(m=>m.dispose());}
}
export function box(w:number,h:number,d:number,m:T.Material){return new T.Mesh(new RoundedBoxGeometry(w,h,d,5,Math.min(w,h,d)*.16),m);}
export function plate(p:number[][],d:number,m:T.Material,bevel=.009){const s=new T.Shape();p.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return extrude(s,d,m,bevel);}
function extrude(s:T.Shape,d:number,m:T.Material,b=.009){return new T.Mesh(new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:b>0,bevelSize:b,bevelThickness:b*.8,bevelSegments:7,steps:1,curveSegments:32}),m);}
function part(g:T.Group,m:T.Object3D,x=0,y=0,z=0){m.position.set(x,y,z);g.add(m);return m;}
function lathe(profile:number[][],m:T.Material,segments=64){return new T.Mesh(new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),segments),m);}
function line(g:T.Group,points:number[][],r:number,m:T.Material,closed=false){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(p[0],p[1],p[2]??0)),closed,'centripetal');const mesh=new T.Mesh(new T.TubeGeometry(curve,Math.max(24,Math.ceil(points.length*(points.length>40?1.5:7))),r,8,closed),m);g.add(mesh);return mesh;}
function stud(g:T.Group,x:number,y:number,z:number,m:T.Material,r=.009){const b=new T.Mesh(new T.SphereGeometry(r,20,12),m);b.scale.z=.48;part(g,b,x,y,z);}
/** Collapse static subassemblies by material; curved detail does not mean hundreds of draws. */
function batch(g:T.Group){g.updateMatrixWorld(true);const inv=g.matrixWorld.clone().invert(),bins=new Map<T.Material,T.BufferGeometry[]>();g.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material)){const geo=o.geometry.clone().applyMatrix4(inv.clone().multiply(o.matrixWorld));const flat=geo.index?geo.toNonIndexed():geo;bins.set(o.material,[...(bins.get(o.material)??[]),flat]);if(flat!==geo)geo.dispose();o.geometry.dispose();}});g.clear();for(const [m,gs]of bins){const geom=mergeGeometries(gs);gs.forEach(x=>x.dispose());if(geom)g.add(new T.Mesh(geom,m));}return g;}
function wrap(g:T.Group,y0:number,y1:number,r:number,turns:number,m:ForgeMaterials){
 const h=y1-y0;part(g,lathe([[0,0],[r*.78,0],[r,.035],[r*.96,h*.45],[r*.83,h-.02],[r*.76,h],[0,h]],m.leather),0,y0,0);
 const pts=Array.from({length:turns*24+1},(_,i)=>{const t=i/(turns*24),a=t*turns*Math.PI*2;return[Math.cos(a)*r*1.015,y0+t*h,Math.sin(a)*r*1.015];});line(g,pts,.004,m.iron);
 for(const y of [y0,y1])part(g,lathe([[r*.7,-.009],[r*1.1,-.009],[r*1.14,0],[r*1.1,.009],[r*.7,.009]],m.brass),0,y,0);
}
function filigree(g:T.Group,cx:number,cy:number,z:number,scale:number,m:T.Material){for(const s of [-1,1]){line(g,[[cx,cy-.10*scale,z],[cx+s*.09*scale,cy-.035*scale,z],[cx+s*.085*scale,cy+.06*scale,z],[cx+s*.025*scale,cy+.08*scale,z],[cx+s*.02*scale,cy+.025*scale,z]],.0023*scale,m);line(g,[[cx+s*.06*scale,cy-.035*scale,z],[cx+s*.12*scale,cy+.045*scale,z],[cx+s*.08*scale,cy+.115*scale,z]],.0018*scale,m);}}
/** Longitudinal, curved forged blade. Its cross section has actual edge bevels and a recessed fuller. */
function bladeSurface(m:ForgeMaterials,spear:boolean){const N=64,xs=[-1,-.91,-.64,-.22,-.12,0,.12,.22,.64,.91,1],p:number[]=[],uv:number[]=[],ix:number[]=[];
 for(let j=0;j<=N;j++){const t=j/N,y=.17+t*(spear?1.23:1.12);const taper=t>.80?Math.pow((1-t)/.2,.72):1-.24*t;const width=(spear?(.018+.11*Math.sin(Math.PI*t)**2):(.068+.009*Math.sin(t*Math.PI*2)))*taper;for(const x of xs){const a=Math.abs(x),ridge=a<.12?.012:a<.23?.024:a<.65?.028:.028*(1-a)/.35;p.push(x*Math.max(.0004,width),y,ridge*Math.sqrt(Math.max(0,1-t))+.01);uv.push((x+1)/2,t);} }
 const K=xs.length;for(let j=0;j<N;j++)for(let i=0;i<K-1;i++){const a=j*K+i;ix.push(a,a+1,a+K,a+1,a+K+1,a+K);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(ix);geo.computeVertexNormals();const mesh=new T.Mesh(geo,m.steel);const g=new T.Group();g.add(mesh);const back=mesh.clone();back.geometry=geo.clone();back.rotation.y=Math.PI;back.position.z=.008;g.add(back);
 for(const s of [-1,1])line(g,Array.from({length:49},(_,j)=>{const t=j/48,ta=t>.8?Math.pow((1-t)/.2,.72):1-.24*t,w=(spear?(.018+.11*Math.sin(Math.PI*t)**2):(.068+.009*Math.sin(t*Math.PI*2)))*ta;return[s*w,.17+t*(spear?1.23:1.12),.011];}),.0018,m.edge);
 filigree(g,0,.30,.039,.43,m.brass);return batch(g);}
export function blade(m:ForgeMaterials,kind='sword'){
 const g=new T.Group(),core=bladeSurface(m,kind==='spear'),fittings=new T.Group();g.add(core,fittings);
 if(kind==='spear'){part(fittings,lathe([[0,-.17],[.025,-.17],[.033,.12],[.05,.17],[.022,.23],[0,.24]],m.iron),0,0,0);for(let i=0;i<4;i++)part(fittings,lathe([[.027,-.003],[.036,0],[.027,.005]],m.brass),0,-.09+i*.065,0);}
 else{
  for(const s of [-1,1]){
   const sh=new T.Shape();sh.moveTo(0,.135);sh.bezierCurveTo(s*.09,.12,s*.16,.10,s*.245,.16);sh.bezierCurveTo(s*.285,.205,s*.30,.225,s*.30,.23);sh.bezierCurveTo(s*.27,.212,s*.19,.17,s*.11,.19);sh.quadraticCurveTo(s*.06,.22,0,.21);sh.closePath();part(fittings,extrude(sh,.05,m.brass,.010),0,0,-.018);
   line(fittings,[[s*.015,.182,.047],[s*.09,.155,.047],[s*.19,.153,.047],[s*.264,.20,.047]],.003,m.edge);
   for(let j=0;j<3;j++)stud(fittings,s*(.10+j*.052),.152+j*.006,.049,m.iron,.006);
  }
  wrap(fittings,-.18,.135,.037,8,m);
  const pommel=lathe([[0,-.29],[.019,-.286],[.048,-.259],[.061,-.228],[.049,-.197],[.025,-.18],[0,-.18]],m.brass);fittings.add(pommel);
  const inset=new T.Mesh(new T.SphereGeometry(.039,32,20),m.enamel);inset.scale.set(.84,1,.28);part(fittings,inset,0,-.231,.049);
  const collar=lathe([[0,.105],[.038,.105],[.052,.13],[.052,.17],[.035,.20],[0,.20]],m.iron);fittings.add(collar);stud(fittings,0,.15,.054,m.brass,.024);filigree(fittings,0,-.231,.062,.20,m.edge);
 }
 batch(fittings);return {g,core,fittings};
}
export function shield(m:ForgeMaterials){const g=new T.Group(),shape=new T.Shape();shape.moveTo(0,.44);shape.bezierCurveTo(-.10,.38,-.23,.37,-.29,.34);shape.bezierCurveTo(-.32,.08,-.25,-.25,0,-.46);shape.bezierCurveTo(.25,-.25,.32,.08,.29,.34);shape.quadraticCurveTo(.10,.37,0,.44);shape.closePath();g.add(extrude(shape,.055,m.brass,.015));const inset=extrude(shape,.047,m.iron,.01);inset.scale.set(.91,.91,1);inset.position.z=.064;g.add(inset);
 const dome=new T.SphereGeometry(.21,48,32);const boss=new T.Mesh(dome,m.steel);boss.scale.set(.84,1.3,.35);part(g,boss,0,.045,.10);
 for(const s of [-1,1]){line(g,[[0,-.38,.115],[s*.17,-.15,.115],[s*.25,.11,.115],[s*.25,.30,.115],[s*.1,.345,.115],[0,.38,.115]],.008,m.edge);for(let i=0;i<7;i++){const t=i/6;stud(g,s*(.23*Math.sin(t*Math.PI*.8)+.01),-.32+t*.62,.116,m.brass,.010);}}
 filigree(g,0,.11,.18,1,m.brass);filigree(g,0,-.19,.128,.63,m.brass);return batch(g);}
export function hammer(m:ForgeMaterials){const g=new T.Group();wrap(g,-.61,.10,.043,10,m);part(g,box(.48,.245,.22,m.iron),0,.24,0);
 for(const s of [-1,1]){const cap=lathe([[0,-.035],[.105,-.035],[.14,-.021],[.147,.009],[.137,.024],[.10,.031],[0,.031]],m.steel);cap.rotation.z=s*Math.PI/2;part(g,cap,s*.26,.24,0);const band=lathe([[.118,-.018],[.13,-.015],[.13,.015],[.118,.018]],m.brass);band.rotation.z=Math.PI/2;part(g,band,s*.19,.24,0);}
 const medallion=lathe([[0,0],[.052,0],[.060,.005],[.060,.014],[.052,.020],[0,.020]],m.brass);medallion.rotation.x=Math.PI/2;part(g,medallion,0,.245,.139);filigree(g,0,.24,.15,.45,m.edge);return batch(g);}
export function axe(m:ForgeMaterials){const g=new T.Group();wrap(g,-.22,.44,.025,11,m);part(g,lathe([[.025,0],[.027,.65],[0,.65]],m.iron),0,.40,0);const s=new T.Shape();s.moveTo(-.035,.72);s.bezierCurveTo(.15,.80,.20,1.00,.39,1.12);s.bezierCurveTo(.43,.84,.35,.56,.26,.50);s.bezierCurveTo(.24,.75,.11,.67,-.035,.66);s.closePath();part(g,extrude(s,.046,m.steel,.008),0,0,-.02);line(g,[[.388,1.10,.034],[.393,.95,.037],[.365,.77,.037],[.32,.60,.034],[.264,.51,.03]],.009,m.edge);filigree(g,.25,.81,.041,.66,m.brass);part(g,lathe([[.027,-.02],[.048,-.01],[.048,.03],[.027,.04]],m.brass),0,.75,0);return batch(g);}
export class Ribbon {
 mesh:T.Mesh;private p:T.BufferAttribute;
 constructor(color:number){const n=72,geo=new T.BufferGeometry(),p=new Float32Array((n+1)*2*3),uv=new Float32Array((n+1)*4),ix=[];for(let i=0;i<=n;i++){uv[i*4]=i/n;uv[i*4+1]=0;uv[i*4+2]=i/n;uv[i*4+3]=1;if(i<n){const k=i*2;ix.push(k,k+1,k+2,k+1,k+3,k+2);}}geo.setAttribute('position',new T.BufferAttribute(p,3));geo.setAttribute('uv',new T.BufferAttribute(uv,2));geo.setIndex(ix);this.p=geo.attributes.position as T.BufferAttribute;this.mesh=new T.Mesh(geo,new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{color:{value:new T.Color(color)},opacity:{value:1}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform vec3 color;uniform float opacity;varying vec2 vUv;void main(){float a=pow(sin(vUv.x*3.14159),.5)*pow(1.-vUv.y,1.5)*opacity;gl_FragColor=vec4(mix(color,vec3(1.),pow(1.-vUv.y,8.)*.6),a);\n#include <colorspace_fragment>\n}'}));this.mesh.frustumCulled=false;}
 arc(cx:number,cy:number,r:number,start:number,end:number,width:number,z:number,opacity=1){this.mesh.visible=opacity>.002&&Math.abs(end-start)>.002;for(let i=0;i<=72;i++){const t=i/72,a=start+(end-start)*t,w=width*Math.sin(Math.PI*t);for(let s=0;s<2;s++){const rr=r-w*s;this.p.setXYZ(i*2+s,cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,z);}}this.p.needsUpdate=true;(this.mesh.material as T.ShaderMaterial).uniforms.opacity.value=opacity;}
}
