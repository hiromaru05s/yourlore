import * as T from 'three';
export type CeremonyKind='opening'|'victory'|'defeat';
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const ease=(v:number)=>1-(1-clamp(v))**3;
/** One short-lived stage; real curved paper, metal fittings and refractive-looking facets. */
export function mountCeremony(host:HTMLElement,kind:CeremonyKind){
 if(typeof WebGL2RenderingContext==='undefined')return ()=>{};
 let renderer:T.WebGLRenderer;try{renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{return ()=>{};}
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setClearColor(0,0);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
 renderer.domElement.className='ceremony-canvas';renderer.domElement.setAttribute('aria-hidden','true');host.prepend(renderer.domElement);host.classList.add('has-ceremony');
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(35,1,.1,40);camera.position.set(0,4.2,7.5);camera.lookAt(0,.1,0);
 scene.add(new T.HemisphereLight(0xc9e9ff,0x16223c,1.35));
 const key=new T.DirectionalLight(0xffedbb,2.4);key.position.set(-3,5,4);scene.add(key);
 const rim=new T.PointLight(kind==='defeat'?0x9478ef:0x388eff,13,12);rim.position.set(1,.8,-2);scene.add(rim);
 const ink=new T.MeshStandardMaterial({color:0x122439,metalness:.38,roughness:.34});
 const gold=new T.MeshStandardMaterial({color:0xd6bd83,metalness:.78,roughness:.24});
 const paper=new T.MeshStandardMaterial({color:0xe3e0cc,roughness:.7,side:T.DoubleSide});
 const maps:T.Texture[]=[];
 function pageMap(side:number){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=768;const c=canvas.getContext('2d')!;c.fillStyle='#e4dec8';c.fillRect(0,0,512,768);
  const shade=c.createLinearGradient(0,0,512,0);shade.addColorStop(0,'#65513338');shade.addColorStop(.12,'#ffffee10');shade.addColorStop(.8,'#f8edd420');shade.addColorStop(1,'#695d4e25');c.fillStyle=shade;c.fillRect(0,0,512,768);
  c.strokeStyle='#9e8856';c.lineWidth=2;c.strokeRect(29,29,454,710);c.lineWidth=1;c.strokeRect(37,37,438,694);
  for(const x of [42,470])for(const y of [42,726]){c.save();c.translate(x,y);c.rotate(Math.PI/4);c.fillStyle='#9c824a';c.fillRect(-5,-5,10,10);c.restore();}
  c.fillStyle='#273b50';c.textAlign='center';c.font='24px Georgia';c.fillText(side<0?'B I B L I O N':'A R C A N A',256,92);c.font='12px Georgia';c.fillText(side<0?'THE MEMORY OF ALL THINGS':'THE LIGHT WITHIN THE ARCHIVE',256,119);
  c.save();c.translate(256,side<0?305:330);c.strokeStyle='#34475a';
  for(let i=0;i<3;i++){c.beginPath();c.arc(0,0,72+i*16,0,Math.PI*2);c.stroke();}
  for(let i=0;i<12;i++){const a=i*Math.PI/6;c.save();c.rotate(a);c.beginPath();c.moveTo(0,-120);c.lineTo(4,-108);c.lineTo(0,-100);c.lineTo(-4,-108);c.closePath();c.stroke();c.restore();}
  c.beginPath();c.moveTo(0,-68);c.lineTo(36,0);c.lineTo(0,68);c.lineTo(-36,0);c.closePath();c.stroke();c.beginPath();c.ellipse(0,0,84,33,0,0,Math.PI*2);c.stroke();c.restore();
  c.fillStyle='#263348';c.textAlign='left';c.font='13px Georgia';const verses=['In the silence of the archive,','a thousand stories wake in light.','Each page remembers its seeker;','each star returns to the night.'];for(let row=0;row<9;row++){c.fillText(verses[row%4],70,side<0?477+row*21:496+row*19);}
  c.font='italic 12px Georgia';c.textAlign='center';c.fillText(side<0?'I · THE SEEKER':'II · THE RECORD',256,702);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;if(side<0){map.wrapS=T.RepeatWrapping;map.repeat.x=-1;map.offset.x=1;}maps.push(map);return map;
 }
 function coverMap(){
  const c=document.createElement('canvas');c.width=512;c.height=768;const g=c.getContext('2d')!;
  const bg=g.createLinearGradient(0,0,512,768);bg.addColorStop(0,'#263b54');bg.addColorStop(.48,'#14243c');bg.addColorStop(1,'#09172b');g.fillStyle=bg;g.fillRect(0,0,512,768);
  g.strokeStyle='#7894b019';g.lineWidth=1;for(let y=0;y<768;y+=6){g.beginPath();g.moveTo(0,y);g.lineTo(512,y+90);g.stroke();}
  g.strokeStyle='#c6ae73';g.lineWidth=3;g.strokeRect(22,22,468,724);g.lineWidth=1;g.strokeRect(34,34,444,700);g.strokeRect(43,43,426,682);
  for(const x of [44,468])for(const y of [44,724]){g.save();g.translate(x,y);g.scale(x<256?1:-1,y<384?1:-1);g.lineWidth=2;g.beginPath();g.moveTo(0,74);g.bezierCurveTo(0,17,17,0,74,0);g.moveTo(6,54);g.bezierCurveTo(6,21,21,6,54,6);g.stroke();g.beginPath();g.moveTo(18,6);g.lineTo(36,36);g.lineTo(6,18);g.closePath();g.stroke();g.restore();}
  g.save();g.translate(256,358);g.lineWidth=2;
  for(const r of [111,119,144]){g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.stroke();}
  for(let i=0;i<32;i++){g.save();g.rotate(i*Math.PI/16);g.fillStyle='#c6ae73';g.fillRect(-1,-140,2,i%4===0?14:5);g.restore();}
  g.beginPath();g.moveTo(-96,0);g.bezierCurveTo(-38,-74,38,-74,96,0);g.bezierCurveTo(38,74,-38,74,-96,0);g.stroke();g.beginPath();g.moveTo(0,-78);g.lineTo(25,0);g.lineTo(0,78);g.lineTo(-25,0);g.closePath();g.stroke();g.restore();
  g.fillStyle='#dbc991';g.textAlign='center';g.font='36px Georgia';g.fillText('L O R E',256,168);g.font='15px Georgia';g.fillText('B I B L I O N',256,604);g.font='11px Georgia';g.fillText('THE ETERNAL ARCHIVE',256,633);
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;maps.push(map);return map;
 }
 const leather=new T.MeshStandardMaterial({map:coverMap(),roughness:.5,metalness:.18});
 const glow=new T.MeshBasicMaterial({color:kind==='defeat'?0x8974d1:0x96e9ff,transparent:true,opacity:.8,depthWrite:false,blending:T.AdditiveBlending});
 const book=new T.Group();scene.add(book);book.rotation.y=-.12;const halves:T.Group[]=[];
 const box=(w:number,h:number,d:number,m:T.Material,x:number,y:number,z:number,parent:T.Object3D)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);parent.add(o);return o;};
 for(const side of [-1,1]){
  const half=new T.Group();book.add(half);halves.push(half);
  const cover=new T.Mesh(new T.BoxGeometry(1.48,.105,2.05),[ink,ink,ink,leather,ink,ink]);cover.position.set(side*.74,-.10,0);half.add(cover);
  // Recessed gold inlay, four brass corners and multiple visible page edges.
  for(const x of [.05,1.43])box(.025,.015,1.99,gold,side*x,-.037,0,half);
  for(const z of [-.98,.98])box(1.43,.015,.025,gold,side*.74,-.037,z,half);
  for(const x of [.1,1.35])for(const z of [-.89,.89]){const m=box(.16,.035,.16,gold,side*x,-.025,z,half);m.rotation.y=Math.PI/4;}
  for(let j=0;j<9;j++)box(1.30,.012,1.84,j%3===0?gold:paper,side*.72,-.03+j*.014,0,half);
  // Curved sheet geometry is shared by each page and its fine printed rules.
  const sheet=new T.PlaneGeometry(1.3,1.83,24,1);sheet.rotateX(-Math.PI/2);const pos=sheet.attributes.position;
  for(let i=0;i<pos.count;i++){const x=pos.getX(i)+.65;pos.setXYZ(i,side*(x+.06),.13+Math.sin(x/1.3*Math.PI)*.095,pos.getZ(i));}sheet.computeVertexNormals();half.add(new T.Mesh(sheet,new T.MeshStandardMaterial({map:pageMap(side),roughness:.78,side:T.DoubleSide})));

 }
 const spine=box(.15,.24,2.06,ink,0,-.045,0,book);for(const z of [-.77,-.4,.4,.77])box(.16,.25,.045,gold,0,-.045,z,spine);
 const emblem=new T.Group();emblem.position.y=1.15;book.add(emblem);
 const crystal=new T.Mesh(new T.LatheGeometry([new T.Vector2(0,-.40),new T.Vector2(.17,-.14),new T.Vector2(.20,.14),new T.Vector2(.14,.25),new T.Vector2(0,.40)],6),new T.MeshStandardMaterial({color:kind==='defeat'?0x5d467f:0x1b78be,metalness:.45,roughness:.12,emissive:kind==='defeat'?0x281344:0x073b7a,emissiveIntensity:1.1,flatShading:true}));crystal.scale.set(.63,1.35,.63);emblem.add(crystal);
 const wire=new T.LineSegments(new T.EdgesGeometry(crystal.geometry),new T.LineBasicMaterial({color:0xbfe7ff,transparent:true,opacity:.65}));wire.scale.copy(crystal.scale);emblem.add(wire);
 for(const a of [-1,1]){const curve=new T.EllipseCurve(0,0,.54,.24,a<0?Math.PI:0,a<0?Math.PI*2:Math.PI,false,0);const pts=curve.getPoints(40).map(p=>new T.Vector3(p.x,p.y,0));emblem.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),40,.017,6,false),gold));}
 const ring=new T.Mesh(new T.TorusGeometry(.74,.012,6,96),gold);ring.rotation.x=.35;emblem.add(ring);
 for(let i=0;i<24;i++){const a=i/24*Math.PI*2;const tick=box(.016,i%3===0?.09:.04,.014,gold,Math.sin(a)*.79,Math.cos(a)*.79,0,emblem);tick.rotation.z=-a;}
 const motes=new T.InstancedMesh(new T.OctahedronGeometry(.018,0),glow,64);scene.add(motes);const dummy=new T.Object3D();
 const ribbons:T.Mesh[]=[];for(let k=0;k<3;k++){const pts=[];for(let j=0;j<=70;j++){const a=j/70*Math.PI*1.7+k*2.094;pts.push(new T.Vector3(Math.cos(a)*(1.5-j*.009),j*.022+.12,Math.sin(a)*.65));}const ribbon=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),70,k===0?.014:.005,4,false),glow);book.add(ribbon);ribbons.push(ribbon);}
 let frame=0,dead=false;const start=performance.now(),reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
 function resize(){const r=renderer.domElement.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/Math.max(r.height,1);camera.position.z=camera.aspect<.8?10:7.5;camera.updateProjectionMatrix();}
 resize();window.addEventListener('resize',resize);
 function dispose(){if(dead)return;dead=true;cancelAnimationFrame(frame);window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',hide);observer.disconnect();const gs=new Set<T.BufferGeometry>(),ms=new Set<T.Material>();scene.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.LineSegments){gs.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>ms.add(m));}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());maps.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();host.classList.remove('has-ceremony');}
 function hide(){if(document.hidden)dispose();}document.addEventListener('visibilitychange',hide);
 const observer=new window.MutationObserver(()=>{if(!host.isConnected)dispose();});observer.observe(document.body,{childList:true,subtree:true});
 function tick(now:number){if(dead)return;if(!host.isConnected){dispose();return;}const t=reduced?2.3:Math.min(3.4,(now-start)/1000),reveal=ease((t-.12)/1.1),seal=ease((t-.7)/1.25);
  const open=kind==='defeat'?1-seal*.94:reveal;
  halves[0].rotation.z=-(1-open)*1.48;halves[1].rotation.z=(1-open)*1.48;
  book.rotation.y=-.13+(1-reveal)*.65+(kind==='defeat'?seal*.65:0);book.rotation.z=kind==='defeat'?-seal*.65:0;book.rotation.x=.12;book.position.y=-.28+(kind==='defeat'?-seal*.18:Math.sin(t*1.4)*.035);book.scale.setScalar(.75+reveal*.25);
  emblem.scale.setScalar(kind==='defeat'?1-seal*.86:ease((t-.35)/.85));emblem.rotation.y=Math.sin(t*.6)*.2;crystal.rotation.y=t*.45;wire.rotation.y=crystal.rotation.y;
  glow.opacity=(kind==='defeat'?(1-seal)*.7:.5*Math.sin(Math.PI*clamp((t-.2)/3.3)));
  ribbons.forEach((r,i)=>{r.rotation.y=t*(.25+i*.07);r.scale.setScalar(.65+reveal*.35);});
  for(let i=0;i<64;i++){const a=i*2.39996+t*.2,p=((t*.3+i/64)%1);dummy.position.set(Math.cos(a)*(.5+p*1.55),(kind==='defeat'?1-p:p)*2-.2,Math.sin(a)*(.5+p));dummy.rotation.set(a,t+i,0);dummy.scale.setScalar(Math.sin(Math.PI*p)*(i%5===0?2:1));dummy.updateMatrix();motes.setMatrixAt(i,dummy.matrix);}motes.instanceMatrix.needsUpdate=true;
  renderer.render(scene,camera);if(t<3.4&&!reduced)frame=requestAnimationFrame(tick);
 }
 frame=requestAnimationFrame(tick);return dispose;
}
