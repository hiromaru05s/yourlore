import '../../styles/tokens.css';
import '../../styles/base.css';
import '../../styles/card.css';
import {cardEl} from '../../ui/cardView';
import {captureCardSurface} from '../../ui/cardSurface';
import {DB,FRAME_BACK} from '../../shared/cards';
import {setLang} from '../../i18n';
export async function surface(){
 setLang('ja');
 const el=cardEl({...DB.DUNGEON,uid:'dungeon-capture'},{field:true});
 el.style.cssText='position:fixed;left:-4000px;top:0;width:180px;height:270px;--cw:180px;--ch:270px;transform:none';document.body.append(el);
 try{await document.fonts.ready;await Promise.all([...el.querySelectorAll('img')].map(i=>i.decode()));const s=await captureCardSurface(el,FRAME_BACK,true,false);if(!s.face)throw Error('カード面の取得に失敗');const out=document.createElement('canvas');out.width=768;out.height=1152;const pad=s.face.width*.12/1.24;out.getContext('2d')!.drawImage(s.face,pad,pad,s.face.width-pad*2,s.face.height-pad*2,0,0,768,1152);return out;}finally{el.remove();}
}

export async function rockArt(){const im=new Image();im.src="/art/cards/DUNGEON.webp";await im.decode();return im;}
