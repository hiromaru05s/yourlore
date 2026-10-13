import '../../styles/tokens.css';import '../../styles/base.css';import '../../styles/card.css';
import {cardEl} from '../../ui/cardView';import {captureCardSurface,CARD_PADDING} from '../../ui/cardSurface';import {DB,FRAME_BACK} from '../../shared/cards';import {setLang} from '../../i18n';
setLang('ja');
export async function surface(id='ELF'){
 const el=cardEl({...DB[id],uid:'summon-study'},{field:true});el.style.cssText='position:fixed;left:-4000px;top:0;width:180px;height:270px;--cw:180px;--ch:270px;transform:none';document.body.append(el);
 try{await document.fonts.ready;await Promise.all(Array.from(el.querySelectorAll('img')).map(i=>i.decode()));await Promise.all(['cost','attack','health','field-mon'].map(key=>new Promise<void>(resolve=>{const img=new Image();img.onload=()=>resolve();img.onerror=()=>resolve();img.src='/art/biblion/modular/'+key+'-ui.webp';})));const s=await captureCardSurface(el,FRAME_BACK,true,false);if(!s.face)throw Error('Card capture failed');const out=document.createElement('canvas');out.width=540;out.height=810;const pad=s.face.width*CARD_PADDING/(1+2*CARD_PADDING);out.getContext('2d')!.drawImage(s.face,pad,pad,s.face.width-2*pad,s.face.height-2*pad,0,0,540,810);return out;}finally{el.remove();}
}
