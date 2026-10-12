import {FRAME_BACK} from '../../shared/cards';
import {captureCardSurface} from '../cardSurface';
/** Read the current public face, including granted taunt, without hiding the native card. */
export function prepareSurface(source:HTMLElement){
 const host=document.createElement('div');host.setAttribute('aria-hidden','true');host.className='game taunt-capture';
 host.style.cssText='position:fixed;left:-5000px;top:0;pointer-events:none;opacity:0';
 const copy=source.cloneNode(true) as HTMLElement;copy.removeAttribute('id');copy.removeAttribute('data-uid');
 copy.classList.remove('fx-field-ghost','is-exhausted','is-picked','is-armed','is-playable','is-dim');
 copy.style.cssText='position:relative;width:180px;height:270px;--cw:180px;--ch:270px;transform:none;visibility:visible;opacity:1';
 host.append(copy);document.body.append(host);
 const ready=(async()=>{
  await document.fonts.ready;await Promise.all([...copy.querySelectorAll('img')].map(img=>img.decode()));
  if(!host.isConnected)throw Error('Taunt capture cancelled');
  const result=await captureCardSurface(copy,FRAME_BACK,true,false);if(!result.face)throw Error('Taunt surface unavailable');
  const out=document.createElement('canvas');out.width=670;out.height=Math.round(670*result.face.height/result.face.width);
  out.getContext('2d')!.drawImage(result.face,0,0,out.width,out.height);return out;
 })().finally(()=>host.remove());
 return {ready,cancel:()=>host.remove()};
}
