import {DURATION} from './catalog';
import {RiftInkMaterial} from '../../ui/riftInkMaterial';
import {RiftGPU} from '../../ui/riftDestruction/gpu';
import {Renderer as Decay} from '../../ui/decay/renderer';
import {Renderer as Summon} from '../../ui/summon/renderer';
type C=CanvasRenderingContext2D;
let ink:RiftInkMaterial|undefined,obsidian:RiftGPU|undefined,decay:Decay|undefined,slate:Summon|undefined;
const crops=new Map<HTMLCanvasElement,HTMLCanvasElement>();
export function reference(c:C,face:HTMLCanvasElement,kind:number,ms:number,x:number,y:number,w:number){
 const t=ms/DURATION;
 if(kind===0){ink??=new RiftInkMaterial();const out=ink.draw(face,t*2040,1.5);c.drawImage(out,x-w*1.4,y-w*1.7,w*2.8,w*3.4);}
 else if(kind===1){obsidian??=new RiftGPU();const out=obsidian.draw(face,t*1970,0,1.5,w);c.drawImage(out.canvas,0,0,out.width,out.height,x-w*1.4,y-w*1.7,w*2.8,w*3.4);}
 else if(kind===2){decay??=new Decay();let crop=crops.get(face);if(!crop){crop=document.createElement('canvas');crop.width=540;crop.height=810;const pad=face.width*.12/1.24;crop.getContext('2d')!.drawImage(face,pad,pad,face.width-pad*2,face.height-pad*2,0,0,540,810);crops.set(face,crop);}decay.draw(c,crop,t*2080,x,y,w);}
 else{slate??=new Summon();slate.draw(c,face,2,t*2500,x,y,w,false,'all',true);}
}
export function disposeReferences(){ink?.dispose();obsidian?.dispose();decay?.dispose();slate?.dispose();ink=undefined;obsidian=undefined;decay=undefined;slate=undefined;crops.clear();}
if(import.meta.hot)import.meta.hot.dispose(disposeReferences);
