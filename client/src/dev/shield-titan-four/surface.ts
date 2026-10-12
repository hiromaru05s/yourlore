import '../../styles/tokens.css';import '../../styles/base.css';import '../../styles/card.css';
import {cardEl} from '../../ui/cardView';import {captureCardSurface,CARD_PADDING} from '../../ui/cardSurface';import {DB,FRAME_BACK} from '../../shared/cards';import {setLang} from '../../i18n';
export async function surface(){
 setLang('ja');const el=cardEl({...DB.SHIELD_TITAN,uid:'titan-capture'},{field:true});
 el.style.cssText='position:fixed;left:-4000px;top:0;width:180px;height:281.25px;--cw:180px;--ch:281.25px;transform:none';document.body.append(el);
 try{await document.fonts.ready;await Promise.all([...el.querySelectorAll('img')].map(i=>i.decode()));const s=await captureCardSurface(el,FRAME_BACK,true,false);if(!s.face)throw Error('盾の巨神の表面を取得できません');const w=s.face.width/(1+2*CARD_PADDING),pad=w*CARD_PADDING,h=s.face.height-2*pad;const out=document.createElement('canvas');out.width=768;out.height=1200;out.getContext('2d')!.drawImage(s.face,pad,pad,w,h,0,0,768,1200);return out;}finally{el.remove();}
}
