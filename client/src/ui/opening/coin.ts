import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
export function createOpeningCoin(){

// Approved minted coin; resources belong to this opening playback.
let renderer:T.WebGLRenderer|undefined,scene:T.Scene,camera:T.PerspectiveCamera,model:T.Group;
let environment:T.WebGLRenderTarget;const textures:T.Texture[]=[];
function initCoin(){
 renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
 renderer.setSize(640,640,false);renderer.setPixelRatio(1);renderer.setClearColor(0,0);
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 scene=new T.Scene();camera=new T.PerspectiveCamera(31,1,.1,40);camera.position.z=5.1;
 const pm=new T.PMREMGenerator(renderer),room=new RoomEnvironment();environment=pm.fromScene(room,.05);scene.environment=environment.texture;scene.environmentIntensity=.82;room.dispose();pm.dispose();
 const key=new T.DirectionalLight('#fff0cf',4);key.position.set(-3,5,5);scene.add(key);
 const rim=new T.DirectionalLight('#a7ceff',3);rim.position.set(4,1,-1);scene.add(rim);
 const fill=new T.DirectionalLight('#ce9363',1.4);fill.position.set(-2,-4,3);scene.add(fill);
 model=new T.Group();scene.add(model);
 const metal=new T.MeshStandardMaterial({color:'#c9b789',metalness:.92,roughness:.23});
 const silver=new T.MeshStandardMaterial({color:'#e4dbc3',metalness:.9,roughness:.19});
 const dark=new T.MeshStandardMaterial({color:'#443b29',metalness:.86,roughness:.32});
 const profile=[new T.Vector2(0,-.105),new T.Vector2(.90,-.105),new T.Vector2(.975,-.078),new T.Vector2(1,-.046),new T.Vector2(1,.046),new T.Vector2(.975,.078),new T.Vector2(.90,.105),new T.Vector2(0,.105)];
 const body=new T.Mesh(new T.LatheGeometry(profile,128),metal);body.rotation.x=Math.PI/2;model.add(body);
 const ridges=new T.InstancedMesh(new T.BoxGeometry(.012,.026,.12),silver,112);const dummy=new T.Object3D();
 for(let i=0;i<112;i++){const a=i/112*Math.PI*2;dummy.position.set(Math.cos(a)*.989,Math.sin(a)*.989,0);dummy.rotation.set(0,0,a);dummy.updateMatrix();ridges.setMatrixAt(i,dummy.matrix);}model.add(ridges);
 for(const side of [1,-1]){
  const group=new T.Group();group.rotation.y=side===1?0:Math.PI;model.add(group);
  const enamel=new T.MeshStandardMaterial({color:side===1?'#102331':'#321c28',metalness:.57,roughness:.28});
  const face=new T.Mesh(new T.CircleGeometry(.855,128),enamel);face.position.z=.108;group.add(face);
  for(const [radius,tube,z]of [[.952,.022,.086],[.871,.013,.119],[.716,.006,.114]]){const m=new T.Mesh(new T.TorusGeometry(radius,tube,8,128),radius===.871?dark:silver);m.position.z=z;group.add(m);}
  // Fine minted face texture is lit with the body, never pasted on an unlit sprite.
  const c=document.createElement('canvas');c.width=c.height=1024;const g=c.getContext('2d')!;g.translate(512,512);g.strokeStyle='#e8d4a5';g.fillStyle='#e8d4a5';g.lineWidth=2;
  for(let i=0;i<64;i++){g.save();g.rotate(i*Math.PI/32);g.fillRect(-1,-440,i%4===0?3:1,i%4===0?21:9);g.restore();}
  g.font='25px Georgia';g.textAlign='center';const inscription='B I B L I O N';[...inscription].forEach((ch,i)=>{g.save();const a=(i-(inscription.length-1)/2)*.069;g.rotate(a);g.fillText(ch,0,-385);g.restore();});
  g.font='18px Georgia';g.fillStyle='#b7a376';g.fillText(side===1?'I  ·  S E E K E R':'I I  ·  S E E K E R',0,376);
  for(let i=0;i<8;i++){g.save();g.rotate(i*Math.PI/4);g.beginPath();g.moveTo(0,-310);g.lineTo(10,-280);g.lineTo(0,-260);g.lineTo(-10,-280);g.closePath();g.stroke();g.restore();}
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;textures.push(map);
  const etch=new T.Mesh(new T.PlaneGeometry(1.82,1.82),new T.MeshStandardMaterial({map,transparent:true,metalness:.75,roughness:.28,depthWrite:false}));etch.position.z=.12;group.add(etch);
  const tubePath=(points:T.Vector3[],radius=.012)=>{const m=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),64,radius,7,false),silver);group.add(m);};
  const pts=(a:number[][])=>a.map(([x,y])=>new T.Vector3(x,y,.138));
  tubePath(pts([[-.53,0],[-.28,.22],[0,.28],[.28,.22],[.53,0],[.28,-.22],[0,-.28],[-.28,-.22],[-.53,0]]),.018);
  const pupil=new T.Mesh(new T.TorusGeometry(.19,.014,8,64),silver);pupil.position.z=.147;group.add(pupil);
  const shape=new T.Shape();shape.moveTo(0,.39);shape.lineTo(.065,0);shape.lineTo(0,-.39);shape.lineTo(-.065,0);shape.closePath();
  const iris=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.026,bevelEnabled:true,bevelThickness:.006,bevelSize:.008,bevelSegments:2,steps:1}),metal);iris.position.z=.135;if(side<0)iris.rotation.z=Math.PI/2;group.add(iris);
  const flares=new T.InstancedMesh(new T.BoxGeometry(.021,.07,.025),metal,16);for(let i=0;i<16;i++){const a=i*Math.PI/8;dummy.position.set(Math.sin(a)*.665,Math.cos(a)*.665,.126);dummy.rotation.set(0,0,-a);dummy.updateMatrix();flares.setMatrixAt(i,dummy.matrix);}group.add(flares);
 }
}
function coinImage(rx:number,ry:number,rz:number,first:boolean){
 if(!renderer)return null;
 model.rotation.set(rx,ry+(first?0:Math.PI),rz,'XYZ');renderer.render(scene,camera);return renderer.domElement;
}
function disposeCoin(){if(!renderer)return;const geo=new Set<T.BufferGeometry>(),mat=new Set<T.Material>();scene.traverse(o=>{if(o instanceof T.Mesh){geo.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mat.add(m));}});geo.forEach(g=>g.dispose());mat.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());environment.dispose();renderer.dispose();renderer.forceContextLoss();textures.length=0;renderer=undefined;}
return {initCoin,coinImage,disposeCoin};
}
