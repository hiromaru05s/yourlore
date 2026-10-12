import {FRAME_BACK} from '../../shared/cards';
import {captureCardSurface,CARD_PADDING} from '../cardSurface';
/** Capture current public stats, labels and granted icons at the native layout size. */
export function prepareSurface(source:HTMLElement){
 const width=source.offsetWidth||180,height=source.offsetHeight||281.25;
 const host=document.createElement('div');host.className='game evade-capture';
 host.setAttribute('aria-hidden','true');host.style.cssText='position:fixed;left:-5000px;top:0;pointer-events:none;opacity:0';
 const copy=source.cloneNode(true) as HTMLElement;
 copy.removeAttribute('id');copy.removeAttribute('data-uid');
 copy.classList.remove('fx-field-ghost','is-exhausted','is-picked','is-armed','is-playable','is-dim');
 copy.style.cssText=`position:relative;width:${width}px;height:${height}px;--cw:${width}px;--ch:${height}px;transform:none;visibility:visible;opacity:1`;
 host.append(copy);document.body.append(host);
 const ready=(async()=>{
  await Promise.all([...copy.querySelectorAll('img')].map(img=>img.decode()));
  if(!host.isConnected)throw Error('Evasion capture cancelled');
  const rect=copy.getBoundingClientRect();
  const icons=[...copy.querySelectorAll<HTMLImageElement>('.card-status .passive-icon > img')].map(img=>({img,box:img.getBoundingClientRect()}));
  const result=await captureCardSurface(copy,FRAME_BACK,true,false);
  if(!result.face)throw Error('Evasion public face unavailable');
  const src=result.face,unit=src.width/(1+2*CARD_PADDING),pad=unit*CARD_PADDING,ctx=src.getContext('2d')!;
  for(const {img,box} of icons)ctx.drawImage(img,pad+(box.left-rect.left)/rect.width*unit,pad+(box.top-rect.top)/rect.width*unit,box.width/rect.width*unit,box.height/rect.width*unit);
  const out=document.createElement('canvas');out.width=576;out.height=900;
  out.getContext('2d')!.drawImage(src,pad,pad,unit,src.height-2*pad,0,0,out.width,out.height);
  return out;
 })().finally(()=>host.remove());
 return {ready,cancel:()=>host.remove()};
}
