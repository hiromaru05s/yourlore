/** Real beveled dice with generated enamel and geometric, authoritative pips. */
import * as T from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
export const DICE_ENAMEL='/art/biblion/arcana/dice-enamel.webp';
export const PIPS:Record<number,number[]>={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
export const FACE_NORMALS:Record<number,T.Vector3>={1:new T.Vector3(0,0,1),6:new T.Vector3(0,0,-1),2:new T.Vector3(0,1,0),5:new T.Vector3(0,-1,0),3:new T.Vector3(1,0,0),4:new T.Vector3(-1,0,0)};
export function landingQuaternion(value:number):T.Quaternion {
  const alignment=new T.Quaternion().setFromUnitVectors(FACE_NORMALS[value],new T.Vector3(0,1,0));
  return new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),-.16).multiply(alignment);
}
/** Analytic bounce arcs + orientation-aware support. Rounded cube never sinks
 * through the ground, even while it tumbles over an edge. */
export function diePose(t:number,value:number,index=0,distance=6.8) {
  t=T.MathUtils.clamp(t,0,1);
  // Travel and rotation share one clock: a die rolls roughly one radius per
  // radian, then loses momentum. Its initial center is outside the camera.
  const direction=index%2?1:-1,remaining=(1-t)**3,x=direction*distance*remaining;
  const end=landingQuaternion(value);
  const roll=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),-x/.56);
  const yaw=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),direction*.28*remaining);
  const quaternion=roll.multiply(yaw).multiply(end);
  let lift=0;
  for(const [a,b,h] of [[0,.3,.16],[.3,.59,.075],[.59,.79,.025],[.79,.92,.006],[.92,1,0]])if(t>=a&&t<=b){const u=(t-a)/(b-a);lift=4*h*u*(1-u);break;}
  const m=new T.Matrix4().makeRotationFromQuaternion(quaternion).elements;
  const support=.405*(Math.abs(m[1])+Math.abs(m[5])+Math.abs(m[9]))+.095;
  return {quaternion,lift,y:support+lift,x};
}
export function createDie(map:T.Texture|null,casino=false):T.Group {
  const die=new T.Group();die.name='archive-die';
  const gold=new T.MeshStandardMaterial({color:casino?0xe0b35c:0xb4a07b,roughness:.32,metalness:.72});
  const enamel=new T.MeshPhysicalMaterial({map,color:map?0xffffff:0x16273f,roughness:.82,metalness:0,clearcoat:.08,clearcoatRoughness:.8});
  const pipMat=new T.MeshStandardMaterial({color:casino?0xffe4a4:0xe8f4ea,roughness:.25,metalness:.25,emissive:casino?0x644117:0x1e596c,emissiveIntensity:.24});
  const core=new T.Mesh(new RoundedBoxGeometry(1,1,1,4,.095),gold);core.castShadow=true;core.receiveShadow=true;die.add(core);
  for(let value=1;value<=6;value++) {
    const face=new T.Group();face.name=`face-${value}`;face.userData.value=value;
    face.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),FACE_NORMALS[value]);face.position.copy(FACE_NORMALS[value]).multiplyScalar(.501);
    const panel=new T.Mesh(new T.PlaneGeometry(.82,.82),enamel);face.add(panel);
    for(const cell of PIPS[value]) {
      const x=((cell-1)%3-1)*.205,y=(1-Math.floor((cell-1)/3))*.205;
      const ring=new T.Mesh(new T.TorusGeometry(.063,.009,6,20),gold);ring.position.set(x,y,.008);face.add(ring);
      const pip=new T.Mesh(new T.SphereGeometry(.052,16,10),pipMat);pip.name='pip';pip.scale.z=.24;pip.position.set(x,y,.01);face.add(pip);
    }
    die.add(face);
  }
  return die;
}
export interface DiceScene { finished:Promise<void>; dispose:()=>void; }
export async function mountDiceScene(host:HTMLElement,rolls:number[],casino:boolean,signal:AbortSignal):Promise<DiceScene|null> {
  if(signal.aborted||typeof WebGL2RenderingContext==='undefined')return null;
  let renderer:T.WebGLRenderer;
  try{renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{return null;}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));renderer.setClearColor(0,0);
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;

  const canvas=renderer.domElement;canvas.className='d3-canvas';canvas.setAttribute('aria-hidden','true');
  let groundMap:T.Texture|null=null;
  let texture:T.Texture|null=null,environment:T.WebGLRenderTarget|null=null,dead=false,frame=0;
  const scene=new T.Scene();let resolveFinished=()=>{};
  const finished=new Promise<void>(r=>{resolveFinished=r;});
  function dispose(){
    if(dead)return;dead=true;cancelAnimationFrame(frame);resolveFinished();signal.removeEventListener('abort',dispose);canvas.removeEventListener('webglcontextlost',lost);
    const geo=new Set<T.BufferGeometry>(),mats=new Set<T.Material>();
    scene.traverse(o=>{if(o instanceof T.DirectionalLight)o.shadow.dispose();if(o instanceof T.Mesh){geo.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));}});
    geo.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());texture?.dispose();groundMap?.dispose();environment?.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();host.classList.remove('d3-gpu');
  }
  const lost=(e:Event)=>{e.preventDefault();dispose();};
  signal.addEventListener('abort',dispose,{once:true});canvas.addEventListener('webglcontextlost',lost);
  let timeout:ReturnType<typeof setTimeout>|undefined;
  try{
    const loaded=new Promise<boolean>(resolve=>{
      texture=new T.TextureLoader().load(DICE_ENAMEL,()=>resolve(true),undefined,()=>resolve(false));
    });
    const ended=finished.then(()=>false);
    const ok=await Promise.race([loaded,ended,new Promise<boolean>(resolve=>{timeout=setTimeout(()=>resolve(false),1800);})]);
    clearTimeout(timeout);if(!ok||dead||signal.aborted){dispose();return null;}
    texture!.colorSpace=T.SRGBColorSpace;texture!.anisotropy=4;
    const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();environment=pmrem.fromScene(room,.05);scene.environment=environment.texture;scene.environmentIntensity=.22;room.dispose();pmrem.dispose();
    scene.add(new T.HemisphereLight(0xffffff,0x40404a,1.1));
    const key=new T.DirectionalLight(0xffffff,.8);key.position.set(-3,7,3);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-7;key.shadow.camera.right=7;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.camera.near=.5;key.shadow.camera.far=20;key.shadow.bias=-.0001;key.shadow.normalBias=.012;scene.add(key);
    const rim=new T.DirectionalLight(0xcbd2df,.2);rim.position.set(4,2,-2);scene.add(rim);
    // A physical matte receiving surface and cast shadows make every contact readable.
    const columns=Math.min(5,rolls.length),rows=Math.ceil(rolls.length/columns);
    const trayWidth=(columns*1.65+1.5)/3.2;
    const rimBase=new T.Mesh(new T.CylinderGeometry(1.6,1.6,.10,96),new T.MeshStandardMaterial({color:0xa18b63,roughness:.68,metalness:.35}));
    rimBase.scale.x=trayWidth;rimBase.scale.z=rows>1?1.35:1;rimBase.position.y=-.06;rimBase.receiveShadow=true;scene.add(rimBase);
    const floor=new T.Mesh(new T.CylinderGeometry(1.56,1.56,.045,96),new T.MeshStandardMaterial({color:0x273a4a,roughness:1,metalness:0}));
    floor.name='dice-ground';floor.scale.x=trayWidth;floor.scale.z=rows>1?1.35:1;floor.position.y=-.0225;floor.receiveShadow=true;scene.add(floor);
    const inlay=new T.Mesh(new T.TorusGeometry(1.47,.006,4,96),new T.MeshBasicMaterial({color:0x827457}));
    inlay.rotation.x=-Math.PI/2;inlay.scale.x=trayWidth;inlay.scale.y=rows>1?1.35:1;inlay.position.y=.001;scene.add(inlay);
    // Soft ground shadows grow and fade with height, tightening at each contact.
    const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;
    const ctx=shadowCanvas.getContext('2d')!,gradient=ctx.createRadialGradient(32,32,4,32,32,32);
    gradient.addColorStop(0,'rgba(10,17,29,.8)');gradient.addColorStop(.4,'rgba(10,17,29,.4)');gradient.addColorStop(1,'rgba(10,17,29,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
    groundMap=new T.CanvasTexture(shadowCanvas);
    const dice=rolls.map(value=>{const die=createDie(texture,casino);scene.add(die);
      const shadow=new T.Mesh(new T.PlaneGeometry(2,2),new T.MeshBasicMaterial({map:groundMap,transparent:true,depthWrite:false,toneMapped:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.001;scene.add(shadow);return {die,value,shadow};});
    host.append(canvas);host.classList.add('d3-gpu');
    const camera=new T.PerspectiveCamera(30,1,.1,50);
    const rect=host.getBoundingClientRect();renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;
    const distance=Math.max(6.8,(columns*1.6+2)/(2*Math.tan(Math.PI/12)*camera.aspect));
    camera.position.set(0,distance*Math.cos(.35),distance*Math.sin(.35));camera.lookAt(0,.35,0);camera.updateProjectionMatrix();
    // Compile/upload before the roll clock starts, so the first visible die
    // still enters from outside even on a cold GPU/material cache.
    await Promise.race([renderer.compileAsync(scene,camera),finished,new Promise<void>(resolve=>{timeout=setTimeout(resolve,800);})]);
    clearTimeout(timeout);if(dead||signal.aborted)return null;
    const warm=new T.WebGLRenderTarget(32,32);renderer.setRenderTarget(warm);
    try{renderer.render(scene,camera);}finally{renderer.setRenderTarget(null);warm.dispose();}
    const start=performance.now(),vw=innerWidth,vh=innerHeight;
    const halfView=distance*Math.tan(Math.PI/12)*camera.aspect;
    const tick=(now:number)=>{
      if(dead)return;
      if(!host.isConnected||document.hidden||innerWidth!==vw||innerHeight!==vh){dispose();return;}
      // Fixed view: floor and dice never orbit away from one another at rest.
      let settled=true;
      dice.forEach(({die,value,shadow},i)=>{
        const t=Math.max(0,Math.min(1,(now-start-i*45)/1080));if(t<1)settled=false;
        const targetX=(i%columns-(columns-1)/2)*1.65,targetZ=(Math.floor(i/columns)-(rows-1)/2)*1.55;
        const pose=diePose(t,value,i,halfView+Math.abs(targetX)+1.6);die.quaternion.copy(pose.quaternion);
        die.position.set(targetX+pose.x,pose.y,targetZ+.20*(1-t)**2*(i%2?1:-1));
        shadow.position.x=die.position.x;shadow.position.z=die.position.z;shadow.scale.setScalar(.64+pose.lift*.6);shadow.material.opacity=.62/(1+pose.lift*2.5);
      });
      try{renderer.render(scene,camera);}catch{dispose();return;}
      if(settled){host.dataset.settled=rolls.join(',');resolveFinished();}else frame=requestAnimationFrame(tick);
    };frame=requestAnimationFrame(tick);
    return {finished,dispose};
  }catch{clearTimeout(timeout);dispose();return null;}
}
