import {cardEl} from '../../ui/cardView';
import {captureCardSurface} from '../../ui/cardSurface';
import {DB,FRAME_BACK} from '../../shared/cards';
export async function surface(id:string){
 const el=cardEl({...DB[id],uid:'taunt-surface',...(id==='ELF'?{passive:['taunt']}: {})},{field:true});
 el.style.cssText='position:fixed;left:-4000px;top:0;width:180px;height:270px;--cw:180px;--ch:270px;transform:none';document.body.append(el);
 try{await document.fonts.ready;await Promise.all(Array.from(el.querySelectorAll('img')).map(i=>i.decode()));const result=await captureCardSurface(el,FRAME_BACK,true,false);if(!result.face)throw Error('Card surface unavailable');const out=document.createElement('canvas');out.width=670;out.height=Math.round(670*result.face.height/result.face.width);out.getContext('2d')!.drawImage(result.face,0,0,out.width,out.height);return out;}finally{el.remove();}
}
