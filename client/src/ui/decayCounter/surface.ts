import {captureCardSurface,CARD_PADDING} from '../cardSurface';
import {TILE_W,TILE_H} from './material';
const faces=new Map<string,HTMLCanvasElement>();
/** The approved study's native frame/art capture; live labels remain above the material. */
export async function decayFace(card:HTMLElement,signal:AbortSignal):Promise<HTMLCanvasElement>{
 const style=getComputedStyle(card),width=card.offsetWidth||parseFloat(style.width)||156;
 const ratio=(card.offsetHeight||parseFloat(style.height)||width/.64)/width;
 const art=card.querySelector<HTMLImageElement>('.card-art img'),frame=card.querySelector('.card-frame');
 const key=[art?.currentSrc||art?.src,frame?getComputedStyle(frame).backgroundImage:'',card.classList.contains('card--field'),ratio.toFixed(3)].join('|');
 const cached=faces.get(key);if(cached)return cached;
 if(signal.aborted)throw new Error('Cancelled card capture');
 const host=document.createElement('div');host.className='game decay-counter-capture';host.style.cssText='position:fixed;left:-8000px;top:0;width:200px;pointer-events:none;visibility:hidden';
 const copy=card.cloneNode(true) as HTMLElement;copy.removeAttribute('id');copy.classList.remove('study-card');copy.style.cssText=`position:relative;transform:none;width:200px!important;height:${200*ratio}px!important;--cw:200px;--ch:${200*ratio}px;visibility:hidden`;
 copy.querySelectorAll('canvas,.card-name,.card-status,.card-cost,.ad-atk,.ad-def,.badge').forEach(el=>el.remove());
 host.append(copy);document.body.append(host);
 const remove=()=>host.remove();signal.addEventListener('abort',remove,{once:true});
 try{
  const capture=await captureCardSurface(copy,'',true,false);if(signal.aborted||!capture.face)throw new Error('Native face unavailable');
  const source=capture.face,w=source.width/(1+2*CARD_PADDING),pad=w*CARD_PADDING;
  const face=document.createElement('canvas');face.width=TILE_W;face.height=TILE_H;
  face.getContext('2d')!.drawImage(source,pad,pad,w,source.height-pad*2,0,0,TILE_W,TILE_H);
  faces.set(key,face);if(faces.size>12)faces.delete(faces.keys().next().value!);return face;
 }finally{remove();signal.removeEventListener('abort',remove);}
}
