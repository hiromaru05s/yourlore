import * as T from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {createWebGLRenderer} from './webglRenderer';
import type {Cosmetic} from '../shared/cosmetics';
import {gachaFromUrl} from '../shared/gachaCosmetics';
import {quietLuxuryFromUrl} from '../shared/quietLuxuryCosmetics';

type Sculpture={group:T.Group;tick:(t:number)=>void;dispose:()=>void};
/** The equipped sculptures, with their own materials and movement. No texture-map stand-ins. */
async function pair(item:Cosmetic):Promise<Sculpture[]> {
 const quiet=quietLuxuryFromUrl(item.url,'furniture'),gacha=gachaFromUrl(item.url);
 if(quiet){const {furniture}=await import('./cosmetics/quietLuxury/objects');return [false,true].map(g=>furniture(quiet.variant,g));}
 if(gacha){const {makeFurniture}=await import('./cosmetics/gachaTrio/furniture');return [false,true].map(g=>{const o=makeFurniture(gacha.variant,g);return {group:o.root,tick:o.tick,dispose:o.dispose};});}
 if(item.id==='furniture:gacha-goldfault'){const {goldfaultFurniture}=await import('./cosmetics/goldfault/furniture');return [false,true].map(goldfaultFurniture);}
 if(item.id==='furniture:gacha-amethyst-cleft'){const {amethystFurniture}=await import('./cosmetics/amethyst/furniture');return [false,true].map(amethystFurniture);}
 if(item.id==='furniture:gacha-elfweave'){const {elfweaveFurniture}=await import('./cosmetics/elfweave/furniture');return [false,true].map(elfweaveFurniture);}
 if(item.id==='furniture:gacha-mimic-coffer'){const {cofferFurniture}=await import('./cosmetics/coffer/furniture');return [false,true].map(cofferFurniture);}
 throw Error('No reward sculpture for '+item.id);
}
export async function createRewardFurniture(host:HTMLElement,item:Cosmetic){
 const objects=await pair(item);
 let renderer:T.WebGLRenderer;
 try{renderer=createWebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:true});}catch(e){objects.forEach(o=>o.dispose());throw e;}
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=T.AgXToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 const scene=new T.Scene(),camera=new T.OrthographicCamera(-3,3,2,-2,.01,50),assembly=new T.Group();scene.add(assembly);
 const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),env=pmrem.fromScene(room,.04);room.dispose();pmrem.dispose();scene.environment=env.texture;scene.environmentIntensity=.8;
 const key=new T.DirectionalLight('#ffe6be',3);key.position.set(-3,6,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-4,right:4,top:4,bottom:-4,near:.1,far:15});key.shadow.bias=-.0004;scene.add(key);
 const fill=new T.DirectionalLight('#b7d9f9',1.7);fill.position.set(4,3,-2);scene.add(fill,new T.HemisphereLight('#dce7ec','#293040',1));
 objects.forEach((o,i)=>{o.group.position.x=i?1.04:-1.04;assembly.add(o.group);});
 const floor=new T.Mesh(new T.PlaneGeometry(30,30),new T.ShadowMaterial({opacity:.3}));floor.rotation.x=-Math.PI/2;floor.position.y=-.025;floor.receiveShadow=true;scene.add(floor);
 const canvas=renderer.domElement;canvas.className='reward-furniture-canvas';canvas.setAttribute('aria-hidden','true');host.append(canvas);
 let dead=false;
 function draw(time:number,arrival=1){
  if(dead)return;const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);
  if(canvas.clientWidth!==w||canvas.clientHeight!==h||canvas.width!==Math.floor(w*renderer.getPixelRatio()))renderer.setSize(w,h,false);
  const aspect=w/h,halfH=Math.max(1.22,2.35/aspect);camera.left=-halfH*aspect;camera.right=halfH*aspect;camera.top=halfH;camera.bottom=-halfH;camera.position.set(0,5.25,5.6);camera.lookAt(0,.06,0);camera.updateProjectionMatrix();
  assembly.rotation.y=-.12+(1-arrival)*.23;
  objects.forEach((o,i)=>{const p=Math.min(1,Math.max(0,(arrival-i*.12)/.88)),ease=1-Math.pow(1-p,3);o.group.position.y=(1-ease)*.8;o.group.rotation.y=(i?-.08:.08)*(1-ease);o.tick(time);});
  renderer.render(scene,camera);
 }
 function dispose(){if(dead)return;dead=true;objects.forEach(o=>o.dispose());floor.geometry.dispose();floor.material.dispose();key.shadow.dispose();env.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();}
 return {draw,dispose,canvas};
}
const snapshots=new Map<string,Promise<string>>();
/** Serial, short-lived renders keep ten-draw/history thumbnails within one GPU context. */
let queue=Promise.resolve();
export function rewardFurnitureImage(item:Cosmetic):Promise<string>{
 let pending=snapshots.get(item.id);if(pending)return pending;
 pending=queue.then(async()=>{const host=document.createElement('div');host.style.cssText='position:fixed;left:-2000px;top:0;width:640px;height:400px';document.body.append(host);let view:Awaited<ReturnType<typeof createRewardFurniture>>|undefined;
  try{view=await createRewardFurniture(host,item);view.draw(1.5);return view.canvas.toDataURL('image/webp',.92);}finally{view?.dispose();host.remove();}
 });queue=pending.then(()=>{},()=>{});snapshots.set(item.id,pending);pending.catch(()=>snapshots.delete(item.id));return pending;
}
