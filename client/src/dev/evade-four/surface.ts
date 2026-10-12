import '../../styles/tokens.css';
import '../../styles/base.css';
import '../../styles/card.css';
import {cardEl} from '../../ui/cardView';
import {captureCardSurface,CARD_PADDING} from '../../ui/cardSurface';
import {DB,FRAME_BACK} from '../../shared/cards';
import {setLang} from '../../i18n';
import {WIDTH,HEIGHT} from './catalog';
setLang('ja');
// Capture the public card itself, then remove the renderer's transparent gutter.
// It is the actor, never an illustration repurposed as a decorative VFX sprite.
export async function surface(id:string){
 const el=cardEl({...DB[id],uid:'evade-capture'},{field:true});
 el.style.cssText=`position:fixed;left:-5000px;top:0;width:${WIDTH}px;height:${HEIGHT}px;--cw:${WIDTH}px;--ch:${HEIGHT}px;transform:none`;
 // GameView uses full cards on the board; match presentation.css's final 7% band.
 // `field:true` enables field data, while only `compactField` adds card--field.
 const status=el.querySelector<HTMLElement>('.card-status');
 if(status){status.style.top='auto';status.style.bottom='7%';status.style.gap='3px';}
 document.body.append(el);
 try{
  await document.fonts.ready;await Promise.all([...el.querySelectorAll('img')].map(i=>i.decode()));
  const result=await captureCardSurface(el,FRAME_BACK,true,false);if(!result.face)throw Error('Card capture failed');
  const src=result.face,unit=src.width/(1+2*CARD_PADDING),pad=unit*CARD_PADDING;
  // The shared capture currently paints text badges, but not passive-icon images.
  // Carry the original public ability plates through every deformation as well.
  const rect=el.getBoundingClientRect(),ctx=src.getContext('2d')!;
  for(const img of el.querySelectorAll<HTMLImageElement>('.card-status .passive-icon > img')){
   const box=img.getBoundingClientRect();
   ctx.drawImage(img,pad+(box.left-rect.left)/rect.width*unit,pad+(box.top-rect.top)/rect.width*unit,box.width/rect.width*unit,box.height/rect.width*unit);
  }
  const out=document.createElement('canvas');out.width=576;out.height=900;
  out.getContext('2d')!.drawImage(src,pad,pad,unit,src.height-2*pad,0,0,out.width,out.height);
  return out;
 }finally{el.remove();}
}
