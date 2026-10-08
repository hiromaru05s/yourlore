import {Weapon,loadWeapons} from './weapon';
import * as T from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {clamp,phase,DURATION,designs,lift} from './catalog';
type Piece={mesh:T.Mesh;home:T.Vector3;rot:T.Euler;index:number};
type Rig={group:T.Group;pieces:Piece[];cloth:T.Mesh[];shells:T.Mesh[];echo:T.Group;mat:T.MeshStandardMaterial;trim:T.MeshStandardMaterial;uniforms:{uTime:{value:number};uReveal:{value:number};uGone:{value:number}}};
function shape(points:number[][],depth=.035){const s=new T.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.014,bevelThickness:.013,curveSegments:16});}
function ribbonGeometry(){const g=new T.PlaneGeometry(1,1,72,6);g.userData.original=new Float32Array(g.attributes.position.array);return g;}
export class Renderer{
 weapons:Weapon[]=[];ready:Promise<void>;gl:T.WebGLRenderer;scene=new T.Scene();camera=new T.OrthographicCamera(-2.6,2.6,2.25,-2.25,.01,40);root=new T.Group();card:T.Mesh;trace:T.Mesh;ground:T.Mesh;rigs:Rig[]=[];textures=new Map<HTMLCanvasElement,T.CanvasTexture>();env:T.WebGLRenderTarget;disposed=false;
 constructor(){
 this.gl=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});this.gl.setPixelRatio(1);this.gl.setSize(700,600);this.gl.outputColorSpace=T.SRGBColorSpace;this.gl.toneMapping=T.ACESFilmicToneMapping;this.gl.toneMappingExposure=1.15;this.gl.setClearColor(0,0);
 const pm=new T.PMREMGenerator(this.gl),room=new RoomEnvironment();this.env=pm.fromScene(room,.03);this.scene.environment=this.env.texture;room.dispose();pm.dispose();
 this.camera.position.set(0,0,12);this.scene.add(this.root,new T.HemisphereLight(0xece8ff,0x282131,2));const key=new T.DirectionalLight(0xffe6bf,4);key.position.set(-3,6,7);this.scene.add(key);const rim=new T.DirectionalLight(0xbcb2ff,3);rim.position.set(4,0,3);this.scene.add(rim);
 this.card=new T.Mesh(new T.PlaneGeometry(1.55,2.325),new T.MeshBasicMaterial({transparent:true,side:T.DoubleSide}));this.root.add(this.card);
 const trc=document.createElement('canvas');trc.width=512;trc.height=768;const c=trc.getContext('2d')!;c.strokeStyle='#b1a3d9';c.lineWidth=1.4;for(let inset=20;inset<=42;inset+=11){c.strokeRect(inset,inset,512-inset*2,768-inset*2);}for(let i=0;i<16;i++){const y=65+i*42;c.beginPath();c.moveTo(28,y);c.lineTo(48,y+8);c.lineTo(35,y+20);c.stroke();c.beginPath();c.moveTo(484,y);c.lineTo(464,y+8);c.lineTo(477,y+20);c.stroke();}const tex=new T.CanvasTexture(trc);tex.colorSpace=T.SRGBColorSpace;
 this.trace=new T.Mesh(new T.PlaneGeometry(1.55,2.325),new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,color:0xded5ff}));this.trace.position.z=.016;this.root.add(this.trace);
 const sc=document.createElement('canvas');sc.width=sc.height=256;const s=sc.getContext('2d')!,g=s.createRadialGradient(128,128,10,128,128,126);g.addColorStop(0,'rgba(17,10,34,.45)');g.addColorStop(.65,'rgba(22,14,34,.15)');g.addColorStop(1,'rgba(17,10,34,0)');s.fillStyle=g;s.fillRect(0,0,256,256);this.ground=new T.Mesh(new T.PlaneGeometry(2.8,3.1),new T.MeshBasicMaterial({map:new T.CanvasTexture(sc),transparent:true,depthWrite:false}));this.ground.position.z=-.08;this.root.add(this.ground);
 for(let h=0;h<4;h++)this.rigs.push(this.makeRig(h));this.ready=loadWeapons().then(ws=>{this.weapons=ws;for(let i=0;i<4;i++)this.rigs[i].group.add(ws[i].mesh,ws[i].echo,ws[i].stamp);});
 }
 makeRig(hero:number):Rig{
 const group=new T.Group(),pieces:Piece[]=[],cloth:T.Mesh[]=[],shells:T.Mesh[]=[];this.root.add(group);
 const uniforms={uTime:{value:0},uReveal:{value:0},uGone:{value:0}};
 const mat=new T.MeshStandardMaterial({color:0x272733,metalness:.84,roughness:.25,side:T.DoubleSide});const trim=new T.MeshStandardMaterial({color:0xcaa766,metalness:.86,roughness:.26,side:T.DoubleSide});
 for(const m of [mat,trim]){m.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms);shader.vertexShader='varying vec3 vLocal;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvLocal=position;');shader.fragmentShader='varying vec3 vLocal; uniform float uTime; uniform float uReveal; uniform float uGone;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 float n=sin(vLocal.x*71.+sin(vLocal.y*67.))*sin(vLocal.y*131.+vLocal.x*17.);
 float boundary=vLocal.y*.34+.5+n*.034;
 if(boundary>uReveal || boundary<uGone) discard;
 float edge=1.-smoothstep(.0,.027,abs(boundary-uReveal));
 float etch=pow(abs(sin(vLocal.y*62.+sin(vLocal.x*43.)*.2)),48.);
 diffuseColor.rgb*=.89+.09*n+.05*etch;
 diffuseColor.rgb+=vec3(.76,.62,1.)*edge*1.8;
 float scan=exp(-pow((vLocal.y-(uTime*1.4-2.2))*10.,2.));
 diffuseColor.rgb+=vec3(.3,.23,.16)*scan;
 `);};m.customProgramCacheKey=()=> 'chosen-heroes-surface-v1';}
 const add=(geo:T.BufferGeometry,x=0,y=0,z=.06,m:T.Material=mat,angle=0)=>{const mesh=new T.Mesh(geo,m);mesh.position.set(x,y,z);mesh.rotation.z=angle;group.add(mesh);pieces.push({mesh,home:mesh.position.clone(),rot:mesh.rotation.clone(),index:pieces.length});return mesh;};
 const poly=(pts:number[][],x=0,y=0,z=.06,m:T.Material=mat,a=0,d=.035)=>add(shape(pts,d),x,y,z,m,a);
 const strip=(x1:number,y1:number,x2:number,y2:number,w:number,z=.13,m:T.Material=trim)=>{const l=Math.hypot(x2-x1,y2-y1);return add(new T.BoxGeometry(w,l,.018),(x1+x2)/2,(y1+y2)/2,z,m,-Math.atan2(x2-x1,y2-y1));};
 const jewel=(x:number,y:number,r=.08)=>add(new T.OctahedronGeometry(r),x,y,.16,new T.MeshStandardMaterial({color:0x6c548d,metalness:.45,roughness:.18}));
 const blade=(x:number,y:number,scale=1,angle=0)=>{
 // Separate bevels, dark fuller, spine and forged shoulders make the silhouette readable without bloom.
 const b=poly([[-.09,-.40],[-.16,-.1],[-.12,.7],[0,1.08],[.12,.7],[.16,-.1],[.09,-.4]],x,y,.09,mat,angle);b.scale.setScalar(scale);
 const spine=poly([[-.017,-.38],[-.036,.65],[0,1.05],[.036,.65],[.017,-.38]],x,y,.15,trim,angle,.015);spine.scale.setScalar(scale);
 const guard=poly([[-.39,-.35],[-.34,-.22],[-.15,-.27],[0,-.21],[.15,-.27],[.34,-.22],[.39,-.35],[.19,-.4],[0,-.34],[-.19,-.4]],x,y,.17,trim,angle);guard.scale.setScalar(scale);
 const handle=poly([[-.05,-.85],[-.07,-.39],[.07,-.39],[.05,-.85]],x,y,.1,mat,angle);handle.scale.setScalar(scale);
 for(let k=0;k<6;k++){const yy=-.44-k*.06;const xx=x-Math.sin(angle)*yy*scale,cy=y+Math.cos(angle)*yy*scale;const p=add(new T.BoxGeometry(.115*scale,.012,.018),xx,cy,.16,trim,angle);p.userData.fine=true;}
 const jy=-.87*scale;jewel(x-Math.sin(angle)*jy,y+Math.cos(angle)*jy,.068*scale);
 };
 if(hero===0){blade(0,.03,1,-.23);for(const side of [-1,1]){poly([[0,0],[side*.27,.12],[side*.22,-.03],[side*.08,-.15]],side*.14,-.28,.19,trim);}}
 if(hero===1){strip(0,-1.0,0,.45,.065,.08,mat);strip(-.011,-.96,-.011,.4,.009,.15);const ring=new T.TorusGeometry(.35,.023,7,64);add(ring,0,.61,.13,trim);const ring2=new T.TorusGeometry(.26,.014,7,64);const r=add(ring2,0,.61,.17,trim);r.rotation.y=.7;r.rotation.x=.35;for(let i=0;i<6;i++){const a=i*Math.PI/3;poly([[0,.11],[-.048,0],[0,-.11],[.048,0]],Math.cos(a)*.37,.61+Math.sin(a)*.37,.15,trim,-a);}jewel(0,.61,.12);for(let k=0;k<5;k++)poly([[-.06,0],[0,.1],[.06,0],[0,-.1]],0,-.8+k*.19,.14,trim);}
 if(hero===2){const pts:number[][]=[];for(let i=0;i<=28;i++){const a=-1.25+i/28*2.5;pts.push([-.2+Math.cos(a)*.58,Math.sin(a)*1.12]);}for(let i=28;i>=0;i--){const a=-1.25+i/28*2.5;pts.push([-.2+Math.cos(a)*.48,Math.sin(a)*1.08]);}poly(pts,0,0,.1,mat);for(let k=0;k<9;k++){const a=-1.15+k*.2875;poly([[0,.12],[-.046,0],[0,-.07],[.046,0]],-.2+Math.cos(a)*.55,Math.sin(a)*1.10,.17,trim,-a);}strip(-.04,-1.045,-.35,0,.012,.12);strip(-.35,0,-.04,1.045,.012,.12);strip(-.63,0,.77,0,.022,.23);poly([[0,0],[-.21,.075],[-.14,0],[-.21,-.075]],.88,0,.21,trim);poly([[0,0],[-.22,.10],[-.18,0],[-.22,-.10]],-.5,0,.19,mat);}
 if(hero===3){blade(-.30,.06,.73,-.66);blade(.30,.06,.73,.66);for(const side of [-1,1])poly([[0,0],[side*.27,.16],[side*.12,-.11],[0,-.19]],side*.18,-.37,.2,mat);}
 // Silk has actual folded topology. The same connected strips become the liquid silver membranes in variant 5.
 for(let j=0;j<4;j++){const rm=new T.MeshStandardMaterial({color:j%2?0x282740:0x34354d,metalness:.3,roughness:.44,side:T.DoubleSide,transparent:true});rm.onBeforeCompile=sh=>{sh.vertexShader='varying vec2 silkUV;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nsilkUV=uv;');sh.fragmentShader='varying vec2 silkUV;\n'+sh.fragmentShader;sh.fragmentShader=sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 float weave=sin(silkUV.x*800.)*sin(silkUV.y*100.);diffuseColor.rgb*=.90+weave*.10;
 float seam=smoothstep(.44,.46,abs(silkUV.y-.5));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.52,.38,.18),seam);
 `);};const mesh=new T.Mesh(ribbonGeometry(),rm);mesh.renderOrder=2;group.add(mesh);cloth.push(mesh);}
 for(let j=0;j<20;j++){const a=j*Math.PI*2/12,mesh=new T.Mesh(j<12?shape([[0,-.27],[-.10,0],[-.025,.50],[.045,.65],[.13,.02]],.025):shape([[-.14,-.18],[-.14,.18],[.09,.23],[.15,.07],[.15,-.17]],.055),new T.MeshStandardMaterial({color:j%3?0x675578:0x9581a8,metalness:.48,roughness:.16,transparent:true,opacity:.76}));mesh.position.set(Math.cos(a)*.7,Math.sin(a)*.96,.1);mesh.rotation.z=a-Math.PI/2;mesh.userData.home=mesh.position.clone();group.add(mesh);shells.push(mesh);}
 const echo=new T.Group();for(const p of pieces){if(p.mesh.userData.fine)continue;const e=new T.Mesh(p.mesh.geometry,new T.MeshStandardMaterial({color:0x2b243b,metalness:.75,roughness:.21,transparent:true,opacity:.42}));e.position.copy(p.home);e.rotation.copy(p.rot);e.scale.copy(p.mesh.scale);echo.add(e);}group.add(echo);return{group,pieces,cloth,shells,echo,mat,trim,uniforms};
 }
 draw(c:CanvasRenderingContext2D,face:HTMLCanvasElement,hero:number,v:number,ms:number,cx:number,cy:number,cw:number,reduced=false,pass:'all'|'ground'|'card'='all',tilt=true){
 if(this.disposed)return;ms=clamp(ms/DURATION)*DURATION;let tx=this.textures.get(face);if(!tx){tx=new T.CanvasTexture(face);tx.colorSpace=T.SRGBColorSpace;tx.anisotropy=4;this.textures.set(face,tx);}const cm=this.card.material as T.MeshBasicMaterial;cm.map=tx;cm.needsUpdate=!cm.userData.mapped;cm.userData.mapped=true;
 const t=reduced?DURATION:ms,settle=phase(t,designs[v].hit-250,designs[v].hit+150),birth=phase(t,180,1050),end=phase(t,2200,3050),activity=Math.sin(clamp((t-100)/2800)*Math.PI);this.rigs.forEach((r,i)=>r.group.visible=i===hero&&t>80&&t<3100&&!reduced);const r=this.rigs[hero];
 cm.color.setScalar(1-.26*phase(t,250,850)*(1-phase(t,2050,2800)));this.root.rotation.set(tilt?-.38:0,tilt?.09:0,0);this.root.position.set(0,-.03,0);this.card.position.z=tilt?lift(t,v):0;this.trace.position.z=this.card.position.z+.016;this.trace.visible=t>90&&t<3050&&!reduced;(this.trace.material as T.MeshBasicMaterial).opacity=Math.max(0,activity)*.7;this.ground.visible=pass!=='card';this.card.visible=pass!=='ground';this.trace.visible&&=pass!=='ground';r.group.visible&&=pass!=='ground';
 r.uniforms.uTime.value=t/1000;r.uniforms.uReveal.value=t<1700?phase(t,160,1250)*1.65:1.65;r.uniforms.uGone.value=phase(t,2300,3150)*1.6-.2;
 r.mat.color.setHex([0x30303a,0x494052,0x343445,0xc1b9a8,0x828492,0x292333][v]);r.mat.roughness=[.26,.17,.30,.48,.13,.27][v];r.mat.metalness=[.92,.55,.78,.25,.96,.79][v];r.trim.color.setHex(v===4?0xd3cbdc:v===5?0xaca0c2:0xc3a16c);
 r.group.position.z=this.card.position.z+.07+birth*(1-end)*.24;r.group.scale.setScalar(1-.15*end);r.group.rotation.set(.13*birth*(1-end),.14*Math.sin(t/650)*(1-end),0);
 for(const p of r.pieces){p.mesh.position.copy(p.home);p.mesh.rotation.copy(p.rot);const delay=(p.index%8)*35,form=phase(t,180+delay,1000+delay);p.mesh.visible=this.weapons.length===0&&t<3100;
 if(v===0){p.mesh.position.y+=(1-form)*.45;p.mesh.position.z+=(1-form)*.17;p.mesh.rotation.y+=(1-form)*.35;}
 if(v===1){p.mesh.position.z+=Math.sin(birth*Math.PI)*.16;p.mesh.rotation.y+=Math.sin(t/1400)*.12;}
 if(v===2){p.mesh.position.z+=.10*Math.sin(birth*Math.PI);p.mesh.rotation.z+=(1-form)*.15;}
 if(v===3){p.mesh.rotation.x+=(1-form)*1.35;p.mesh.position.x+=Math.sign(p.home.x||.1)*(1-form)*.2;}
 if(v===4){p.mesh.position.x+=Math.sin(p.index*.8+t*.003)*(1-form)*.12;p.mesh.position.z+=.05*Math.sin(p.home.y*7+t*.006)*activity;}
 if(v===5){p.mesh.position.x+=(p.index%2?1:-1)*.4*(1-form);p.mesh.position.y+=(p.index%2?1:-1)*.22*(1-form);}
 const recoil=Math.sin(phase(t,designs[v].hit-100,designs[v].hit+180)*Math.PI);p.mesh.position.z+=recoil*.06;
 // Role-specific movement survives across all six material families.
 if(hero===0)p.mesh.rotation.z-=.16*phase(t,1300,1700)*(1-phase(t,1850,2300));
 if(hero===1)p.mesh.rotation.y+=.32*Math.sin(phase(t,1000,2100)*Math.PI);
 if(hero===2)p.mesh.position.x-=.13*Math.sin(phase(t,1050,1800)*Math.PI)*(p.home.x<0?1:0);
 if(hero===3)p.mesh.position.x+=Math.sign(p.home.x)*.14*Math.sin(phase(t,1000,1750)*Math.PI);
 }
 r.echo.visible=this.weapons.length===0&&v===5&&t>350&&t<2400;r.echo.position.set(.35*Math.sin(birth*Math.PI)*(1-settle),-.2*(1-settle),-.07);r.echo.rotation.z=-.28*(1-settle);r.echo.scale.setScalar(1-.1*end);
 for(let j=0;j<r.shells.length;j++){const mesh=r.shells[j];mesh.visible=((v===1&&j<12)||(v===3&&j>=12))&&t>180&&t<2700;const f=phase(t,250+j*24,1150+j*14),open=phase(t,1450+j*10,2200);mesh.position.set((j%2?1:-1)*(.33+.24*f+.23*open),-.92+Math.floor(j/2)*.34,.06+.3*f*(1-open));mesh.rotation.z=(j%2?1:-1)*(.16+.46*open); mesh.scale.set(.6+.4*f,Math.max(.001,f*(1-phase(t,2200+j*15,2750))),1);mesh.rotation.x=.25+.65*open;mesh.rotation.y=(j%2?1:-1)*.35;(mesh.material as T.MeshStandardMaterial).color.setHex(v===3?0xc7bca6:j%2?0x675776:0x514063);if(v===3){mesh.position.x=(j%2?1:-1)*(.38+.2*f);mesh.position.y=-.70+Math.floor((j-12)/2)*.46;mesh.rotation.z=(j%2?1:-1)*.04;mesh.rotation.y=(j%2?1:-1)*(1-f)*1.2;mesh.scale.x=.9;mesh.scale.y=f*(1-phase(t,2200+(j-12)*35,2820));(mesh.material as T.MeshStandardMaterial).opacity=1;}}
 for(let j=0;j<4;j++){const mesh=r.cloth[j];mesh.visible=(v===2||v===4)&&t>100&&t<3000;const a=mesh.geometry.attributes.position,orig=mesh.geometry.userData.original as Float32Array;const side=j%2?1:-1,wide=v===4?.10:.30,unfurl=phase(t,150+j*65,1150+j*60),pull=phase(t,1550+j*40,2900);for(let i=0;i<a.count;i++){const u=orig[i*3]+.5,w=orig[i*3+1];const spread=Math.sin(u*Math.PI);const x=v===4?side*(.16+spread*.14)+Math.sin(u*7+t*.0015)*.21+w*wide*(1-pull):side*(.3+spread*(.42+pull*.24))+w*wide*(1-pull);const y=(u-.5)*2.55*(.2+.8*unfurl);const z=.15+Math.sin(u*Math.PI*2+t*.0017+j)*.13+Math.sin(w*14+u*8)*.035; a.setXYZ(i,x+Math.sin(u*7+t*.001)*.045,y,z);}a.needsUpdate=true;mesh.geometry.computeVertexNormals();const m=mesh.material as T.MeshStandardMaterial;m.color.setHex(v===4?0xa6a0b3:j%2?0x191c30:0x32314b);m.metalness=v===4?.94:.38;m.roughness=v===4?.14:.43;m.opacity=unfurl*(1-pull);}
 this.weapons[hero]?.set(t/1000,v,hero,phase(t,[180,220,200,250,150,100][v],[1080,1420,1250,1380,1180,1050][v]),phase(t,designs[v].hit+150,3050));this.gl.render(this.scene,this.camera);const scale=cw/1.55;const w=5.2*scale,h=4.5*scale;c.drawImage(this.gl.domElement,cx-w/2,cy-h/2,w,h);
 }
 dispose(){if(this.disposed)return;this.disposed=true;const gs=new Set<T.BufferGeometry>(),ms=new Set<T.Material>();this.scene.traverse(o=>{if(o instanceof T.Mesh){gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])ms.add(m);}});gs.forEach(g=>g.dispose());ms.forEach(m=>{const tx=(m as T.MeshBasicMaterial).map;if(tx)tx.dispose();m.dispose();});this.textures.forEach(t=>t.dispose());this.env.dispose();this.gl.dispose();this.gl.forceContextLoss();}
}
