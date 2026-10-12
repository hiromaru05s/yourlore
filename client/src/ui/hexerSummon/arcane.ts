import * as T from 'three';
import {ease} from './catalog';
const TAU=Math.PI*2;
const noise=(x:number)=>{const n=Math.sin(x*73.163)*41781.173;return n-Math.floor(n);};
export function engraving(){
 const c=document.createElement('canvas');c.width=768;c.height=1152;const x=c.getContext('2d')!;x.scale(768/180,1152/270);x.translate(90,135);x.strokeStyle='#e5c7ee';x.lineCap='round';
 function line(points:number[],w=.45){x.lineWidth=w;x.beginPath();x.moveTo(points[0],points[1]);for(let i=2;i<points.length;i+=2)x.lineTo(points[i],points[i+1]);x.stroke();}
 for(const dx of [78,82]){x.lineWidth=.35;x.strokeRect(-dx,-127,dx*2,254);}
 for(const side of [-1,1])for(let j=0;j<20;j++){const y=-114+j*12;line([side*72,y-4,side*66,y,side*70,y+4]);line([side*68,y-5,side*68,y+5],.3);if(j%3===0)line([side*75,y,side*61,y],.2);}
 for(let r=0;r<3;r++){x.save();x.scale(.77,1);x.lineWidth=r===0?.65:.28;const rr=42+r*5;x.beginPath();x.arc(0,0,rr,0,TAU);x.stroke();x.restore();}
 for(let j=0;j<36;j++){const a=j/36*TAU,x1=Math.cos(a)*40,y1=Math.sin(a)*52;line([x1,y1,x1+Math.cos(a)*4,y1+Math.sin(a)*4],j%3===0?.7:.25);}
 line([0,-75,29,-22,17,32,0,62,-17,32,-29,-22,0,-75],.5);line([-44,0,44,0],.35);line([0,-110,0,105],.3);
 for(const side of [-1,1]){line([side*70,-102,side*49,-78,side*49,-37,side*37,-20]);line([side*69,102,side*49,76,side*49,38,side*37,20]);for(let i=0;i<4;i++){const y=68+i*9;line([side*12,y,side*29,y-3,side*24,y+3],.3);}}
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;return tex;
}
function materialTexture(kind:'stone'|'wax'|'cloth'){
 const c=document.createElement('canvas');c.width=512;c.height=768;const x=c.getContext('2d')!;x.fillStyle=kind==='wax'?'#643245':kind==='cloth'?'#2c1f37':'#302738';x.fillRect(0,0,512,768);
 for(let i=0;i<18000;i++){const a=noise(i+13),b=noise(i+128);x.fillStyle=`rgba(${i%2?'216,181,223':'6,2,12'},${.015+noise(i+2)*.06})`;x.fillRect(a*512,b*768,kind==='cloth'?.6:1.5,kind==='cloth'?30:2);}
 for(let j=0;j<30;j++){x.beginPath();const xx=j*19;x.moveTo(xx,0);for(let y=0;y<=768;y+=8)x.lineTo(xx+Math.sin(y*.018+j)*10+Math.sin(y*.042+j*7)*4,y);x.strokeStyle=kind==='wax'?'#bc6e7933':'#ba9cc322';x.lineWidth=1;x.stroke();}
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;return tex;
}
const glslNoise=`float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}float fb(vec2 p){return n(p)*.56+n(p*2.03)*.28+n(p*4.07)*.11+n(p*8.11)*.05;}`;
function coatMaterial(glyph:T.Texture){return new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{glyph:{value:glyph},time:{value:0},life:{value:0},variant:{value:0},open:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`precision highp float;varying vec2 vUv;uniform sampler2D glyph;uniform float time,life,variant,open;${glslNoise}
void main(){vec2 p=(vUv-.5)*vec2(1.,1.5);float f=fb(p*7.+vec2(time*.16,-time*.12));float vein=abs(sin((f+p.y*.17)*25.));float trim=(1.-smoothstep(.44,.50,abs(p.x)))*(1.-smoothstep(.70,.75,abs(p.y)));float progress=life;
float cover=(1.-smoothstep(.32,.72,f+open*.38))*progress;
if(variant==0.)cover*=smoothstep(.05,.36,length(p)-open*.48);
if(variant==1.)cover*=.4;
if(variant==2.)cover*=.3;
if(variant==3.)cover*=.55;
if(variant==4.)cover*=.5;
if(variant==5.)cover*=.65;
float g=texture2D(glyph,vUv).a;float etch=g*life*(.85+.15*sin(p.y*6.-time*2.));float border=pow(max(0.,1.-vein),19.)*cover;
vec3 dark=mix(vec3(.024,.012,.038),vec3(.145,.065,.18),f);vec3 color=dark+border*vec3(.5,.27,.66)+etch*vec3(.64,.42,.76);float a=clamp(cover*.78+etch*.8,0.,.94)*trim;
gl_FragColor=vec4(color,a);}`});}
type Sheet={mesh:T.Mesh<T.PlaneGeometry,T.MeshPhysicalMaterial>;base:Float32Array};
export class ArcaneStudies{
 readonly group=new T.Group();readonly glyph=engraving();readonly coat=coatMaterial(this.glyph);
 private coatMesh=new T.Mesh(new T.PlaneGeometry(178,268,1,1),this.coat);private sheets:Sheet[]=[];private links:T.InstancedMesh;private linkTransform=new T.Object3D();private plates:T.Mesh[]=[];private horns:Sheet[]=[];
 private wax:T.Mesh;private waxMark:T.Mesh;private usedTextures:T.Texture[]=[];private materials:T.Material[]=[];private crestMat:T.MeshBasicMaterial;
 private film:T.MeshPhysicalMaterial;private stone:T.MeshPhysicalMaterial;private metal:T.MeshPhysicalMaterial;private waxMat:T.MeshPhysicalMaterial;private glyphMat:T.MeshBasicMaterial;
 private face:T.Texture|null=null;private inscription:T.Mesh;private ink:T.MeshPhysicalMaterial;
 constructor(){
 this.coatMesh.renderOrder=2;this.coat.depthTest=false;this.group.add(this.coatMesh);const cloth=materialTexture('cloth'),stone=materialTexture('stone'),wax=materialTexture('wax');this.usedTextures.push(cloth,stone,wax);
 const bump=stone.clone();bump.colorSpace=T.NoColorSpace;bump.needsUpdate=true;this.usedTextures.push(bump);
 this.film=new T.MeshPhysicalMaterial({map:cloth,color:0x766080,roughness:.7,metalness:.02,clearcoat:0,clearcoatRoughness:.45,envMapIntensity:.3,transparent:true,opacity:.83,side:T.DoubleSide,bumpMap:bump,bumpScale:.23});
 this.stone=new T.MeshPhysicalMaterial({map:stone,color:0xc7b4cf,roughness:.28,metalness:.4,clearcoat:0,side:T.DoubleSide,bumpMap:bump,bumpScale:.35});
 this.metal=new T.MeshPhysicalMaterial({color:0x9b899f,roughness:.24,metalness:.65,clearcoat:0});
 this.waxMat=new T.MeshPhysicalMaterial({map:wax,color:0x50132a,roughness:.95,metalness:0,clearcoat:0,clearcoatRoughness:.35,envMapIntensity:.04,bumpMap:bump,bumpScale:.12});
 this.glyphMat=new T.MeshBasicMaterial({map:this.glyph,color:0xe4b8ff,transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false});this.crestMat=this.glyphMat.clone();
 this.ink=new T.MeshPhysicalMaterial({color:0x24112e,roughness:.32,metalness:.2,clearcoat:.25,envMapIntensity:.45,side:T.DoubleSide,transparent:true});this.inscription=new T.Mesh(new T.PlaneGeometry(176,266),this.glyphMat);this.inscription.renderOrder=3;this.group.add(this.inscription);
 this.materials.push(this.ink,this.film,this.stone,this.metal,this.waxMat,this.glyphMat,this.crestMat,this.coat);
 for(let j=0;j<8;j++){const g=new T.PlaneGeometry(1,1,12,36),mesh=new T.Mesh(g,this.film);mesh.frustumCulled=false;mesh.castShadow=true;mesh.receiveShadow=true;this.sheets.push({mesh,base:new Float32Array(g.attributes.position.array)});this.group.add(mesh);}
 const linkGeo=new T.TorusGeometry(5.5,1.1,6,16);this.links=new T.InstancedMesh(linkGeo,this.metal,52);this.links.instanceMatrix.setUsage(T.DynamicDrawUsage);this.links.castShadow=true;this.links.frustumCulled=false;this.group.add(this.links);
 const seeds=Array.from({length:18},(_,j)=>({x:-70+(j%4)*45+(noise(j+4)-.5)*22,y:-111+Math.floor(j/4)*53+(noise(j+44)-.5)*28}));
 for(let j=0;j<seeds.length;j++){
  const seed=seeds[j];let polygon:number[][]=[[-86,-129],[86,-129],[86,129],[-86,129]];
  for(let k=0;k<seeds.length;k++){if(k===j)continue;const q=seeds[k],nx=q.x-seed.x,ny=q.y-seed.y,bound=(q.x*q.x+q.y*q.y-seed.x*seed.x-seed.y*seed.y)/2,next:number[][]=[];for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],da=a[0]*nx+a[1]*ny-bound,db=b[0]*nx+b[1]*ny-bound;if(da<=0)next.push(a);if((da<=0)!==(db<=0)){const t=da/(da-db);next.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}}polygon=next;}
  const verts:number[]=[],uv:number[]=[];for(let i=1;i<polygon.length-1;i++)for(const k of [0,i,i+1]){const p=polygon[k];verts.push(p[0],p[1],0);uv.push((p[0]+111.6)/223.2,(p[1]+156.6)/313.2);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();const mat=new T.MeshBasicMaterial({side:T.DoubleSide,toneMapped:false});this.materials.push(mat);const mesh=new T.Mesh(g,mat);mesh.userData={cx:seed.x,cy:seed.y};mesh.castShadow=true;
  const edges=new T.LineSegments(new T.EdgesGeometry(g),new T.LineBasicMaterial({color:0xcaa0dd,transparent:true,opacity:.65}));edges.position.z=.08;mesh.add(edges);this.materials.push(edges.material);this.plates.push(mesh);this.group.add(mesh);
 }
 for(let j=0;j<12;j++){const g=new T.PlaneGeometry(1,1,8,28),mesh=new T.Mesh(g,this.stone);mesh.frustumCulled=false;mesh.castShadow=true;this.horns.push({mesh,base:new Float32Array(g.attributes.position.array)});this.group.add(mesh);}
 this.wax=new T.Mesh(new T.SphereGeometry(37,40,24),this.waxMat);const waxPos=this.wax.geometry.attributes.position;for(let i=0;i<waxPos.count;i++){const xx=waxPos.getX(i),yy=waxPos.getY(i),a=Math.atan2(yy,xx),r=1+.045*Math.sin(a*11)+.021*Math.sin(a*23);waxPos.setXYZ(i,xx*r,yy*r,waxPos.getZ(i));}this.wax.geometry.computeVertexNormals();this.wax.castShadow=true;this.group.add(this.wax);const sealCanvas=document.createElement('canvas');sealCanvas.width=sealCanvas.height=512;const sx=sealCanvas.getContext('2d')!;sx.translate(256,256);sx.strokeStyle='#f9b9d4';for(const r of [172,184,198]){sx.lineWidth=r===184?3:1;sx.beginPath();sx.arc(0,0,r,0,TAU);sx.stroke();}for(let j=0;j<32;j++){sx.save();sx.rotate(j/32*TAU);sx.lineWidth=1.6;sx.beginPath();sx.moveTo(-5,-176);sx.lineTo(4,-185);sx.lineTo(-3,-193);sx.moveTo(0,-174);sx.lineTo(0,-196);sx.stroke();sx.restore();}sx.lineWidth=2;for(const size of [145,90]){sx.beginPath();for(let j=0;j<=5;j++){const a=j/5*TAU-Math.PI/2;if(j===0)sx.moveTo(Math.cos(a)*size,Math.sin(a)*size);else sx.lineTo(Math.cos(a)*size,Math.sin(a)*size);}sx.stroke();}const sealTex=new T.CanvasTexture(sealCanvas);sealTex.colorSpace=T.SRGBColorSpace;this.usedTextures.push(sealTex);this.crestMat.map=sealTex;this.waxMark=new T.Mesh(new T.PlaneGeometry(67,67),this.crestMat);this.group.add(this.waxMark);
 }
 private deform(item:Sheet,fn:(u:number,t:number)=>[number,number,number]){item.mesh.visible=true;const a=item.mesh.geometry.attributes.position,uv=item.mesh.geometry.attributes.uv;for(let i=0;i<a.count;i++)a.setXYZ(i,...fn(uv.getX(i)*2-1,uv.getY(i)));a.needsUpdate=true;item.mesh.geometry.computeVertexNormals();}
 draw(v:number,t:number,height:number,level:number,face:T.Texture){
 this.sheets.forEach(p=>p.mesh.visible=false);this.links.visible=false;this.plates.forEach(p=>p.visible=false);this.horns.forEach(p=>p.mesh.visible=false);this.wax.visible=this.waxMark.visible=false;
 const grow=ease(.06,.24,t),release=ease(.37,.68,t),vanish=ease(.69,.92,t),life=grow*(1-vanish),base=height+2.3;this.group.visible=(v===3||t>.025)&&t<.96;if(!this.group.visible)return;
 this.coat.uniforms.time.value=t*5;this.coat.uniforms.life.value=life;this.coat.uniforms.open.value=release;this.coat.uniforms.variant.value=v;this.coatMesh.position.z=base;this.inscription.position.z=base+.2;this.ink.opacity=life;for(const sheet of this.sheets)sheet.mesh.material=v===0?this.ink:this.film;
 this.film.opacity=.88*life;this.glyphMat.opacity=life*.65;this.crestMat.opacity=life*.9;
 if(v===0){ // A single liquid skin cleaves into four sculpted curling lobes, retaining the inscribed face.
 for(let j=0;j<4;j++){const side=j%2?1:-1,yy=j<2?-68:64,peel=ease(.32+j*.02,.62+j*.015,t),slip=ease(.61,.9,t);this.deform(this.sheets[j],(u,q)=>{const length=(144-90*slip)*grow;const a=q*(.2+peel*2.6);const profile=Math.pow(Math.sin(Math.PI*q),.65);return[side*(83-Math.sin(a)/(.2+peel*2.6)*length)+side*slip*9,yy+u*67*profile*(1-slip),base+(1-Math.cos(a))/(.2+peel*2.6)*length+Math.sin(q*21+u*4+j)*2*profile+Math.abs(u)*7*profile];});}
 }
 if(v===1){ // Metal links are constrained to two diagonals, with a delayed tension release.
 const pull=ease(.36,.49,t),snap=ease(.49,.68,t),shrink=1-ease(.70,.91,t);for(let j=0;j<52;j++){const row=j<26?0:1,k=j%26,u=k/25,side=row?1:-1,tail=Math.sin(u*Math.PI);const mesh=this.linkTransform;this.links.visible=life>.001;const bend=tail*(14+pull*13)*(1-snap);const part=u<.5?-1:1;mesh.position.set(side*(-72+144*u)+part*side*snap*35*tail,-111+222*u+part*snap*32*tail,base+bend+snap*tail*22);mesh.rotation.set(k%2?1.15:0,side*.12,side*-.58+part*snap*.35);mesh.scale.set(1,1.34,1);mesh.scale.multiplyScalar(grow*shrink);mesh.updateMatrix();this.links.setMatrixAt(j,mesh.matrix);}this.links.instanceMatrix.needsUpdate=true;
 }
 if(v===2){ // Two broad veils hinged to the card's long rails, with narrow torn hems and travelling ripples.
 for(let j=0;j<2;j++){const side=j?1:-1,peel=ease(.32+j*.035,.67,t),slip=ease(.65,.93,t);this.deform(this.sheets[j],(u,q)=>{const across=(u+1)/2,reach=100*grow*(1-slip),theta=peel*(2.3+q*.25);return[side*(85-Math.sin(theta+.02*across)/(theta+.02)*across*reach),-129+q*258,base+(1-Math.cos(theta*across))*reach/(theta+.01)+Math.sin(q*19+across*8-t*7)*4*peel*(1-slip)+Math.pow(across,3)*Math.sin(q*41)*2];});}
 }
 if(v===3){ // The actual face is broken into mapped plates; they return before the native surface handoff.
 if(this.face!==face){this.face=face;for(const p of this.plates){const mat=p.material as T.MeshBasicMaterial;mat.map=face;mat.needsUpdate=true;}}
 const crack=(.22+.78*ease(0,.4,t))*(1-ease(.59,.8,t));for(let j=0;j<this.plates.length;j++){const p=this.plates[j],cx=p.userData.cx,cy=p.userData.cy,delay=noise(j)*.05,burst=ease(.37+delay,.55+delay,t)*(1-ease(.58,.79,t));p.visible=crack>.001;p.position.set(cx*.055*crack,cy*.03*crack,base+crack*3+burst*(13+noise(j+4)*15));p.rotation.set(Math.sin(j)*burst*.055,Math.cos(j)*burst*.07,Math.sin(j*3)*burst*.012);}
 }
 if(v===4){ // A viscous seal condenses out of engraved capillaries and is pressed into the face.
 const seal=ease(.18,.4,t)*(1-ease(.67,.87,t)),press=ease(.43,.51,t);this.wax.visible=this.waxMark.visible=seal>.001;this.wax.position.set(0,-8,base+4);this.wax.scale.set(seal*(.94+press*.08),seal*.94,seal*(.15-.055*press));this.wax.rotation.z=.03*Math.sin(t*18)*seal;this.waxMark.position.set(0,-8,base+37*seal*(.15-.055*press)+4.2);this.waxMark.scale.setScalar(seal*.97);this.crestMat.color.setHex(0xf5b0ca);
 for(let j=0;j<6;j++){const a=j/6*TAU,sh=ease(.57+j*.012,.83,t);this.deform(this.horns[j],(u,q)=>{const rad=(1-q)*(1-sh)*82*grow;const w=(1-q)*1.5*life;return[Math.cos(a)*rad+Math.cos(u*Math.PI)*w,Math.sin(a)*rad*1.4-8,base+2+Math.sin(u*Math.PI)*w+Math.sin(q*Math.PI)*3];});}
 }
 if(v===5){ // Four frame corners grow into a restrained thorn crown; each tine grows from its own carved anchor.
 const n=level<2?4:8;for(let j=0;j<n;j++){const side=j%2?1:-1,row=Math.floor(j/2),yy=-110+row*220/(n/2-1),unfurl=ease(.23+j*.012,.57+j*.008,t),sink=1-ease(.67+j*.006,.9,t);this.deform(this.horns[j],(u,q)=>{const a=u*Math.PI,w=(7+level*.45)*Math.pow(1-q,1.4)*life;const len=(50+level*7+Math.sin(j)*7)*grow*sink;return[side*(78+Math.sin(q*2.6)*20*unfurl)+Math.cos(a)*w,yy+Math.sin(q*2+j)*q*22*unfurl+Math.sin(a)*w,base+q*len+Math.sin(q*3)*8*unfurl];});}
 }
 }
 dispose(){const gs=new Set<T.BufferGeometry>();this.group.traverse(o=>{const mesh=o as T.Mesh;if(mesh.geometry)gs.add(mesh.geometry);});gs.forEach(g=>g.dispose());this.materials.forEach(m=>m.dispose());this.usedTextures.forEach(t=>t.dispose());this.glyph.dispose();}
}
