import * as T from 'three';
import {createCoin, coinPose, faceTexture} from './coinScene';
import {screenToBoard} from './boardProjection';

export interface OpeningCoin { paint(ms:number, x:number, y:number, radius:number):void; dispose():void; }
type Mount = (maps:T.Texture[])=>OpeningCoin;
const mounts=new WeakMap<HTMLElement,Mount>();

/** Attach to the existing table camera, renderer, environment and shadow receiver. */
export function bindOpeningScene(root:HTMLElement,scene:T.Scene,dirty:()=>void):()=>void {
  const active=new Set<OpeningCoin>();
  const mount:Mount=maps=>{
    const coin=createCoin(maps[0],maps[1]);coin.visible=false;
    coin.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=true;});
    const ring=new T.Mesh(new T.RingGeometry(1,1.055,64,1,0,Math.PI*1.65),new T.MeshBasicMaterial({color:0xe8c481,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false}));
    ring.rotation.x=-Math.PI/2;scene.add(coin,ring);let dead=false;
    const handle:OpeningCoin={
      paint(ms,x,y,radius){
        if(dead)return;
        const wasVisible=coin.visible;coin.visible=ms>=0&&ms<2000;ring.visible=coin.visible;
        if(!coin.visible){if(wasVisible)dirty();return;}
        const p=coinPose(Math.min(1,ms/1500),true),point=screenToBoard(x,y);
        coin.scale.setScalar(radius);coin.position.set(point.x-innerWidth/2,5+p.y*radius,point.y-innerHeight/2);coin.quaternion.copy(p.q);
        const impact=Math.max(0,(ms-630)/400);
        ring.position.set(coin.position.x,5.5,coin.position.z);ring.scale.setScalar(radius*(1.15+impact));ring.rotation.z=impact*.4;
        ring.material.opacity=impact>0&&impact<1?(1-impact)*.7:0;
        // Withdraw along the surface after the winning face has been readable.
        if(ms>1750){const a=(ms-1750)/250;coin.scale.multiplyScalar(1-a);coin.position.y-=a*radius*.08;}
        dirty();
      },
      dispose(){
        if(dead)return;dead=true;scene.remove(coin,ring);
        const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();
        for(const group of [coin,ring])group.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});
        geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());maps.forEach(m=>m.dispose());active.delete(handle);dirty();
      },
    };active.add(handle);return handle;
  };
  mounts.set(root,mount);
  return ()=>{if(mounts.get(root)===mount)mounts.delete(root);[...active].forEach(h=>h.dispose());};
}

export async function prepareOpeningCoin(root:HTMLElement,faces:HTMLElement[],signal:AbortSignal):Promise<OpeningCoin|null>{
  const mount=mounts.get(root);if(!mount)return null;
  const loaded:T.Texture[]=[];let failed=false;
  try{
    const maps=await Promise.all(faces.map(async face=>{const map=await faceTexture(face);if(signal.aborted||failed){map.dispose();throw new Error('cancelled');}loaded.push(map);return map;}));
    if(signal.aborted||mounts.get(root)!==mount){loaded.forEach(m=>m.dispose());return null;}
    return mount(maps);
  }catch{failed=true;loaded.forEach(m=>m.dispose());return null;}
}
