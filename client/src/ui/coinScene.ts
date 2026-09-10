import * as T from 'three';

/** Beveled, reeded metal coin. Diameter 2; physical edge thickness .16. */
export function createCoin(front:T.Texture,back:T.Texture):T.Group {
  const coin=new T.Group();coin.name='biblion-coin';
  const gold=new T.MeshStandardMaterial({color:0xbfa36c,metalness:.65,roughness:.48});
  const profile=[new T.Vector2(0,-.08),new T.Vector2(.92,-.08),new T.Vector2(.98,-.065),new T.Vector2(1,-.035),new T.Vector2(1,.035),new T.Vector2(.98,.065),new T.Vector2(.92,.08),new T.Vector2(0,.08)];
  coin.add(new T.Mesh(new T.LatheGeometry(profile,96),gold));
  for(let i=0;i<72;i++){const a=i*Math.PI*2/72,ridge=new T.Mesh(new T.BoxGeometry(.022,.075,.02),gold);ridge.position.set(Math.sin(a),0,Math.cos(a));ridge.rotation.y=a;coin.add(ridge);}
  for(const [map,side] of [[front,1],[back,-1]] as const){
    const face=new T.Mesh(new T.CircleGeometry(.91,96),new T.MeshBasicMaterial({map,toneMapped:false}));face.rotation.x=-Math.PI/2*side;face.position.y=.081*side;coin.add(face);
    const rim=new T.Mesh(new T.TorusGeometry(.945,.022,8,96),gold);rim.rotation.x=Math.PI/2;rim.position.y=.075*side;coin.add(rim);
  }
  return coin;
}
export function coinPose(t:number,heads:boolean){
  t=T.MathUtils.clamp(t,0,1);const spin=Math.PI*6*(1-t)**2;
  const q=new T.Quaternion().setFromEuler(new T.Euler(spin+(heads?0:Math.PI),.3*(1-t),.4*Math.sin(t*Math.PI*4)*(1-t)));
  const up=new T.Vector3(0,1,0).applyQuaternion(q),support=Math.sqrt(Math.max(0,1-up.y*up.y))+.08*Math.abs(up.y);
  let lift=0;if(t<.42)lift=5.5*(1-(t/.42)**2);else for(const [a,b,h] of [[.42,.71,.75],[.71,.9,.23],[.9,1,.035]])if(t<=b){const u=(t-a)/(b-a);lift=4*h*u*(1-u);break;}
  return {q,y:support+lift,lift};
}
async function faceTexture(face:HTMLElement):Promise<T.Texture>{
  const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d')!;ctx.fillStyle='#17273d';ctx.fillRect(0,0,512,512);
  const load=(url:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=url;});
  const sprite=face.querySelector<HTMLElement>('.seeker-sprite'),img=face.querySelector<HTMLImageElement>('.ct-avatar-mask img');
  const url=sprite?/url\(["']?(.*?)["']?\)/.exec(getComputedStyle(sprite).backgroundImage)?.[1]:img?.src;
  if(url){const art=await load(url);ctx.save();ctx.beginPath();ctx.arc(256,256,211,0,Math.PI*2);ctx.clip();const sw=sprite?art.width/2:art.width;const crop=Math.min(sw,art.height);ctx.drawImage(art,(sw-crop)/2,0,crop,crop,45,45,422,422);ctx.restore();}
  const frame=face.querySelector<HTMLImageElement>('.ct-frame');if(frame)ctx.drawImage(await load(frame.src),0,0,512,512);
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;
}
export async function mountCoinScene(host:HTMLElement,heads:boolean):Promise<(()=>void)|null>{
  if(typeof WebGL2RenderingContext==='undefined')return null;
  let renderer:T.WebGLRenderer;try{renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{return null;}
  let maps:T.Texture[]=[];let timer=0,abandoned=false;
  try{maps=await Promise.race([Promise.all([...host.querySelectorAll<HTMLElement>('.ct-face')].map(async(e)=>{const map=await faceTexture(e);if(abandoned)map.dispose();return map;})),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('coin texture timeout')),1500);})]);}catch{abandoned=true;maps.forEach(m=>m.dispose());renderer.dispose();return null;}finally{clearTimeout(timer);}
  if(!host.isConnected){maps.forEach(m=>m.dispose());renderer.dispose();return null;}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setClearColor(0,0);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;
  host.classList.add('ct-model');const rect=host.getBoundingClientRect();renderer.setSize(rect.width,rect.height,false);renderer.domElement.className='coin-model-canvas';host.append(renderer.domElement);
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,rect.width/rect.height,.1,50);camera.position.set(0,7.2,3.5);camera.lookAt(0,.65,0);
  scene.add(new T.HemisphereLight(0xffffff,0x303447,1.5));const key=new T.DirectionalLight(0xffefcf,2);key.position.set(-4,6,3);scene.add(key);
  const coin=createCoin(maps[0],maps[1]);scene.add(coin);
  const shade=document.createElement('canvas');shade.width=shade.height=64;const ctx=shade.getContext('2d')!,g=ctx.createRadialGradient(32,32,1,32,32,32);g.addColorStop(0,'#0a0b1590');g.addColorStop(1,'#0a0b1500');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
  const shadowMap=new T.CanvasTexture(shade),shadow=new T.Mesh(new T.PlaneGeometry(3,3),new T.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false,toneMapped:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.001;scene.add(shadow);
  const start=performance.now(),reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;let frame=0,dead=false;
  const observer=new MutationObserver(()=>{if(!host.isConnected)dispose();});observer.observe(document.body,{childList:true});
  function dispose(){if(dead)return;dead=true;cancelAnimationFrame(frame);observer.disconnect();const geos=new Set<T.BufferGeometry>(),mats=new Set<T.Material>();scene.traverse(o=>{if(o instanceof T.Mesh){geos.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));}});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());maps.forEach(m=>m.dispose());shadowMap.dispose();renderer.dispose();renderer.domElement.remove();host.classList.remove('ct-model');}
  function tick(now:number){if(dead)return;if(!host.isConnected){dispose();return;}const t=reduced?1:Math.min(1,(now-start)/2200),pose=coinPose(t,heads);coin.quaternion.copy(pose.q);coin.position.y=pose.y;shadow.scale.setScalar(1+pose.lift*.12);shadow.material.opacity=1/(1+pose.lift*.4);renderer.render(scene,camera);if(t<1)frame=requestAnimationFrame(tick);else host.dataset.coinSettled=heads?'heads':'tails';}
  frame=requestAnimationFrame(tick);return dispose;
}
