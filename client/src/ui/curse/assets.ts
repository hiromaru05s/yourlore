import {cardEl} from '../cardView';
import {captureCardSurface,CARD_PADDING} from '../cardSurface';
import {DB,FRAME_BACK} from '../../shared/cards';
import {getLang} from '../../i18n';
let cached:{lang:string;promise:Promise<{faces:HTMLCanvasElement[];skull:HTMLImageElement}>}|undefined;
export function loadCurseAssets(){
 const lang=getLang();if(cached?.lang===lang)return cached.promise;
 const promise=(async()=>{
  const skull=new Image();skull.src=new URL('./assets/skull-apparition.png',import.meta.url).href;
  const skullReady=skull.decode();const faces:HTMLCanvasElement[]=[];
  for(const id of ['BLACK_CURSE','CURSE','S1']){
   const el=cardEl({...DB[id],uid:`curse-texture-${id}`},{size:'hand',fullArt:true});
   el.style.cssText='position:fixed;left:-4000px;top:0;width:180px;height:270px;--cw:180px;--ch:270px;transform:none';document.body.append(el);
   try{await document.fonts.ready;const surface=await captureCardSurface(el,FRAME_BACK,true,false);if(!surface.face)throw Error('Missing curse face');
    const c=document.createElement('canvas'),p=surface.face.width*CARD_PADDING/(1+2*CARD_PADDING);c.width=1024;c.height=1536;
    c.getContext('2d')!.drawImage(surface.face,p,p,surface.face.width-2*p,surface.face.height-2*p,0,0,c.width,c.height);faces.push(c);
   }finally{el.remove();}
  }
  await skullReady;return{faces,skull};
 })();cached={lang,promise};void promise.catch(()=>{if(cached?.promise===promise)cached=undefined;});return promise;
}
