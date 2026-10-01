import {cardEl} from '../../ui/cardView';
import {captureCardSurface} from '../../ui/cardSurface';
import {DB,FRAME_BACK} from '../../shared/cards';
import type {Demon} from './catalog';
// Read only real, public card faces. No alternate card art or copied card rules.
export async function surface(id:Demon,field=false){
 const el=cardEl({...DB[id],uid:'demon-capture'},{size:field?'board':'hand',fullArt:true});
 el.style.cssText='position:fixed;left:-4000px;top:0;width:180px;height:280px;--cw:180px;--ch:280px;transform:none;';document.body.append(el);
 try{await document.fonts.ready;await Promise.all(Array.from(el.querySelectorAll('img')).map(x=>x.decode()));
 const s=await captureCardSurface(el,FRAME_BACK,true,false);if(!s.face)throw new Error('Card face unavailable');
 // Retain the carved frame and seals that extend outside the card's CSS box.
 const out=document.createElement('canvas');out.width=640;out.height=Math.round(640*s.face.height/s.face.width);
 out.getContext('2d')!.drawImage(s.face,0,0,out.width,out.height);return out;
 }finally{el.remove();}
}
