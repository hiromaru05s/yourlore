import {cardEl} from '../cardView';
import {captureCardSurface,CARD_PADDING} from '../cardSurface';
import {DB,STARTERS,FRAME_BACK} from '../../shared/cards';


export async function loadFaces(signal:AbortSignal){
 const faces=new Map<string,HTMLCanvasElement>();
 for(const id of ['BLACK_INFINITY','STARTER_TRASH']){
 const el=cardEl({...DB[id]??STARTERS[id],uid:'infinity-capture-'+id});el.style.cssText='position:fixed;left:-5000px;top:0;width:180px;height:280px;--cw:180px;--ch:280px;transform:none';document.body.append(el);
 const abort=()=>el.remove();signal.addEventListener('abort',abort,{once:true});
 try{await document.fonts.ready;await Promise.all([...el.querySelectorAll('img')].map(i=>i.decode()));if(signal.aborted)throw new Error('Infinity capture cancelled');const s=await captureCardSurface(el,FRAME_BACK,true,false);if(!s.face)throw Error('カード表面を取得できません: '+id);const c=document.createElement('canvas');c.width=420;c.height=654;const p=s.face.width*CARD_PADDING/(1+2*CARD_PADDING);c.getContext('2d')!.drawImage(s.face,p,p,s.face.width-p*2,s.face.height-p*2,0,0,c.width,c.height);faces.set(id,c);}finally{signal.removeEventListener('abort',abort);el.remove();}
 }return faces;
}
