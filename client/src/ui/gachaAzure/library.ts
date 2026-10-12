import * as T from 'three';
import {makeAttunes} from './attune';
import {makeLibrary} from './room';
import {physical,canvasMap} from './materials';
import {glyph,manuscript,themes} from './script';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
export function arcaneLibrary(scene:T.Scene){
 makeLibrary(scene);const common=new T.Group();scene.add(common);const sets=themes.map(()=>new T.Group());sets.forEach(s=>scene.add(s));
 const brass=physical('#b9ad84',.76,.29),ivory=physical('#d5d7ca',.05,.7),navy=physical('#203953',.1,.58);
 const luminous=new T.MeshBasicMaterial({color:'#8bd5f5',toneMapped:false});
 function mesh(g:T.BufferGeometry,m:T.Material,p:T.Vector3,parent:T.Object3D=common){const o=new T.Mesh(g,m);o.position.copy(p);o.castShadow=o.receiveShadow=true;parent.add(o);return o}
 function line(points:T.Vector3[],mat:T.Material,parent:T.Object3D=common,width=.018){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),48,width,6,false),mat,V(),parent)}
 function eye(parent:T.Group,size:number,material:T.Material){const points=[V(-size,0),V(0,size*.49),V(size,0),V(0,-size*.49),V(-size,0)];line(points,material,parent,.028);mesh(new T.TorusGeometry(size*.24,.025,8,48),material,V(),parent)}
 const windowTex=canvasMap(1024,1024,c=>{
  const g=c.createRadialGradient(512,512,30,512,512,512);g.addColorStop(0,'#b9dce0');g.addColorStop(.28,'#90bcca');g.addColorStop(.72,'#254d70');g.addColorStop(1,'#132b48');c.fillStyle=g;c.fillRect(0,0,1024,1024);
  for(let i=0;i<16;i++){const a=i/16*Math.PI*2;c.beginPath();c.moveTo(512,512);c.arc(512,512,480,a,a+Math.PI/16);c.closePath();c.fillStyle=i%3?'#a2c8d91e':'#b674772a';c.fill();}
  c.strokeStyle='#dbe1cb';c.lineWidth=7;for(const r of [252,358,480]){c.beginPath();c.arc(512,512,r,0,Math.PI*2);c.stroke()}
  for(let i=0;i<16;i++){const a=i/16*Math.PI*2;c.beginPath();c.moveTo(512+Math.cos(a)*253,512+Math.sin(a)*253);c.lineTo(512+Math.cos(a)*480,512+Math.sin(a)*480);c.stroke();c.strokeStyle=c.fillStyle='#e1d7a2';c.save();c.translate(512,512);c.rotate(a);glyph(c,0,-404,42,i);c.restore();}
  c.strokeStyle='#e8e9dc';c.lineWidth=12;c.beginPath();c.moveTo(278,512);c.quadraticCurveTo(512,300,746,512);c.quadraticCurveTo(512,724,278,512);c.stroke();c.beginPath();c.arc(512,512,64,0,Math.PI*2);c.stroke();
 });
 const glass=new T.MeshBasicMaterial({map:windowTex,color:'#b6dbed'});const window=mesh(new T.CircleGeometry(2.6,96),glass,V(0,7.52,-15.65));window.castShadow=false;
 for(const radius of [2.64,2.77])mesh(new T.TorusGeometry(radius,.065,10,96),brass,V(0,7.52,-15.55));
 // The eye/compass is part of the architecture, with real mullions and inset glass.
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const r=2.37;const p=V(Math.cos(a)*r,7.52+Math.sin(a)*r,-15.49);const needle=mesh(new T.ConeGeometry(.07,.42,4),brass,p);needle.rotation.z=a-Math.PI/2;}
 // Mana apparatus: stone cradles, brass pivots and a suspended faceted core.
 const apparatus=makeAttunes(common);
 // Fine lettering on the floor stays attached to the marble inlay.
 const floorTex=canvasMap(1024,1024,c=>{c.clearRect(0,0,1024,1024);c.strokeStyle=c.fillStyle='#b5c7c8';for(let i=0;i<52;i++){c.save();c.translate(512,512);c.rotate(i/52*Math.PI*2);glyph(c,0,-405,31,i+90);c.restore()}c.lineWidth=1.5;for(let r of [376,448]){c.beginPath();c.arc(512,512,r,0,Math.PI*2);c.stroke()}});
 const floor=mesh(new T.PlaneGeometry(7,7),new T.MeshBasicMaterial({map:floorTex,transparent:true,opacity:.32,depthWrite:false}),V(0,.05,-7.0));floor.rotation.x=-Math.PI/2;floor.castShadow=false;
 const moving:T.Object3D[][]=[[],[],[],[]];
 // 01: a suspended mechanical sky atlas.
 const armillary=new T.Group();armillary.position.set(0,7.5,-7.7);sets[0].add(armillary);
 for(let i=0;i<3;i++){const band=mesh(new T.TorusGeometry(1.30+i*.15,.022,8,96),brass,V(),armillary);band.rotation.set(i*.77,.35+i*.54,i*.47);moving[0].push(band)}eye(armillary,.58,luminous);
 for(const side of [-1,1])line([V(side*5.7,8.1,-7.7),V(side*3.6,8.4,-7.7),V(side*1.5,7.6,-7.7)],brass,sets[0],.012);
 // 02: narrow red textiles and sealed, levitating folios.
 const bannerTex=canvasMap(256,1024,c=>{c.fillStyle='#642d3d';c.fillRect(0,0,256,1024);c.strokeStyle=c.fillStyle='#cbbd95';c.lineWidth=2;c.strokeRect(18,12,220,992);for(let y=100;y<1000;y+=88)glyph(c,128,y,46,y);});
 const bannerMat=physical('#ffffff',0,.95,bannerTex);bannerMat.side=T.DoubleSide;bannerMat.sheen=.6;
 for(const z of [-10,-4,3])for(const side of [-1,1]){const b=mesh(new T.PlaneGeometry(.84,3.3,6,24),bannerMat,V(side*4.95,6.0,z),sets[1]);b.rotation.y=side*.25;moving[1].push(b);line([V(side*5.7,8.05,z),V(side*4.55,8.05,z)],brass,sets[1],.035);}
 // 03: slender engraved silver branches grow around the columns, never over the hero.
 const leafMat=physical('#739b9c',.38,.26);leafMat.side=T.DoubleSide;const silver=physical('#a5b8b2',.7,.3);
 for(const z of [-10,-3,4])for(const side of [-1,1]){
  for(let b=0;b<4;b++){const y=2.8+b*1.15;const origin=V(side*5.45,y-.8,z);const tip=V(side*(4.5-b*.14),y+1.45,z-.20);line([origin,V(side*5.08,y+.3,z),tip],silver,sets[2],.025);
   for(let l=0;l<4;l++){const u=l/4;const p=origin.clone().lerp(tip,u+.15);const leaf=mesh(new T.SphereGeometry(.18,12,6),leafMat,p,sets[2]);leaf.scale.set(.45,1.65,.13);leaf.rotation.z=side*(.6+l*.15);moving[2].push(leaf);}
  }
 }
 const crown=new T.Group();crown.position.set(0,7.2,-8.5);sets[2].add(crown);for(const side of [-1,1])line([V(0,-.7),V(side*.4,.5),V(side*1.8,1.3),V(side*3.5,1.1)],silver,crown,.026);eye(crown,.49,brass);
 // 04: offset shelves held by geometric crystal brackets, and transparent inscription panels.
 const pane=physical('#83b3ce',.25,.20);pane.transparent=true;pane.opacity=.24;pane.depthWrite=false;pane.side=T.DoubleSide;
 const lettering=manuscript(3,4).sheet;const slateMat=physical('#d6e3df',.0,.7,lettering);
 for(const side of [-1,1])for(let i=0;i<3;i++){const g=new T.Group();g.position.set(side*(4.1+i*.21),3.6+i*1.02,-8+i*3.7);g.rotation.y=-side*.22;sets[3].add(g);mesh(new T.BoxGeometry(1.55,.065,.78),brass,V(),g);for(let j=0;j<6;j++){const b=mesh(new T.BoxGeometry(.14,.57+j%2*.11,.40),j%2?ivory:navy,V(-.57+j*.20,.32,.04),g);b.rotation.z=.03*(j-2)}const diamond=mesh(new T.OctahedronGeometry(.43),pane,V(0,-.55),g);diamond.scale.y=1.4;moving[3].push(g);}
 for(const side of [-1,1]){const slab=mesh(new T.PlaneGeometry(.9,1.45),slateMat,V(side*2.3,7.0,-7.7),sets[3]);slab.rotation.set(.14,side*.45,side*-.18);moving[3].push(slab);}
 const prism=new T.Group();prism.position.set(0,7.4,-7.8);sets[3].add(prism);for(const size of [1.0,1.3]){const o=mesh(new T.TorusGeometry(size,.018,6,4),brass,V(),prism);o.rotation.z=Math.PI/4}eye(prism,.43,luminous);
 // Floating side folios are physical objects with printed leaves, not sparkles.
 const folioMat=physical('#d9dccb',0,.85,manuscript(0,5).sheet);const floating:T.Group[]=[];
 for(let i=0;i<6;i++){const g=new T.Group();g.position.set((i%2?1:-1)*(3.8+(i%3)*.35),5.5+(i%3)*.6,-9+Math.floor(i/2)*4.5);g.rotation.set(.10,(i%2?1:-1)*.25,(i%2?1:-1)*.1);common.add(g);mesh(new T.BoxGeometry(.60,.84,.065),navy,V(0,0,-.04),g);mesh(new T.PlaneGeometry(.55,.78),folioMat,V(0,0,.001),g);g.userData.y=g.position.y;floating.push(g);}
 moving[3].forEach(o=>o.userData.baseY=o.position.y);
 return {ready:apparatus.ready,set(v:number){sets.forEach((s,i)=>s.visible=i===v)},tick(seconds:number,_v:number,reduced:boolean){for(let i=0;i<floating.length;i++){const f=floating[i];f.position.y=f.userData.y+(reduced?0:Math.sin(seconds*.55+i)*.05)}if(!reduced){moving[0].forEach((o,i)=>o.rotation.y=seconds*.07+i*.54);moving[3].forEach((o,i)=>o.position.y=o.userData.baseY+Math.sin(seconds*.5+i)*.035);}apparatus.tick(seconds,reduced);}};
}
