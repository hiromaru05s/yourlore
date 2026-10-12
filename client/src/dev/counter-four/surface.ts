import '../../styles/tokens.css';
import '../../styles/base.css';
import '../../styles/card.css';
import {cardEl} from '../../ui/cardView';
import {captureCardSurface,CARD_PADDING} from '../../ui/cardSurface';
import {DB,FRAME_BACK} from '../../shared/cards';
import {setLang} from '../../i18n';
setLang('ja');
const cache=new Map<string,Promise<HTMLCanvasElement>>();
export function surface(id:string){
 let pending=cache.get(id);if(pending)return pending;
 pending=(async()=>{const el=cardEl({...DB[id],uid:'counter-study'},{field:true});el.style.cssText='position:fixed;left:-4000px;top:0;width:180px;height:281.25px;--cw:180px;--ch:281.25px;transform:none';document.body.append(el);
 try{await document.fonts.ready;await Promise.all([...el.querySelectorAll('img')].map(i=>i.decode()));const s=await captureCardSurface(el,FRAME_BACK,true,false);if(!s.face)throw Error('Card capture failed');
 // crop capture padding exactly: the material and frame endpoints share card coordinates.
 const src=s.face,w=src.width/(1+CARD_PADDING*2),pad=w*CARD_PADDING,h=src.height-pad*2;
 const out=document.createElement('canvas');out.width=540;out.height=844;const oc=out.getContext('2d')!;oc.drawImage(src,pad,pad,w,h,0,0,540,844);
 // Existing capture does not include the passive SVG images; retain those public badges too.
 const bounds=el.getBoundingClientRect();for(const icon of el.querySelectorAll<HTMLImageElement>('.card-status .passive-icon img')){const r=icon.getBoundingClientRect();oc.drawImage(icon,(r.left-bounds.left)/bounds.width*540,(r.top-bounds.top)/bounds.height*844,r.width/bounds.width*540,r.height/bounds.height*844);}
 return out;
 }finally{el.remove();}})();cache.set(id,pending);void pending.catch(()=>cache.delete(id));return pending;
}
