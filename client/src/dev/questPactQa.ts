import {setLang} from '../i18n';
import {setFxSkip} from '../ui/anim';
import type {Side} from '../shared/types';
import {pactTexture} from '../ui/questPact/textures';
type Controller={reset:(side:Side,id:string,n?:number)=>void;play:()=>void};
export async function runQuestPactQa(controller:Controller){
 const status=document.createElement('pre');status.id='quest-pact-qa';status.style.cssText='position:fixed;bottom:0;left:0;z-index:999;background:#21152fe8;color:#eee;font:12px monospace;padding:8px;max-width:100vw;white-space:pre-wrap';document.body.append(status);
 const report:{checks:unknown[];error?:string;status:string}={checks:[],status:'running'};
 const wait=async(test:()=>boolean,ms=15000)=>{const end=performance.now()+ms;while(!test()){if(performance.now()>end)throw Error('QA timeout: '+status.textContent);await new Promise(r=>setTimeout(r,30));}};
 const rect=(n:Element)=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};};
 try{
  await document.fonts.ready;
  const surfaces=[];for(const lang of ['ja','en'] as const){setLang(lang);const t=pactTexture();surfaces.push((t.image as HTMLCanvasElement).toDataURL());t.dispose();}if(surfaces[0]!==surfaces[1])throw Error('Localized contract texture');report.checks.push('Japanese/English contract pixel equality');
  for(const [lang,side,id,n]of [['ja',0,'Q_RIFT',0],['en',1,'Q_WINTER',3],['en',0,'Q_MANA',8],['ja',1,'Q_BRAND',0]] as const){
   status.textContent=`実プレイ検証 ${lang} ${side} ${id}`;setLang(lang);controller.reset(side,id,n);await new Promise(r=>requestAnimationFrame(r));controller.play();
   await wait(()=>!!document.querySelector('.quest-fold-canvas'));
   const c=document.querySelector<HTMLCanvasElement>('.quest-fold-canvas')!,uid=c.dataset.cardUid;let peak=false,landing:ReturnType<typeof rect>|undefined;
   await wait(()=>{const t=Number(c.dataset.time);if(t>1500&&t<3000)peak=true;if(t>4650){const f=document.querySelector('.quest-fold-host .buff-icon');if(f)landing=rect(f);}return!c.isConnected;});
   await wait(()=>!document.querySelector('.quest-fold-host'));
   const tile=document.querySelector(`${side?'#oppRow':'#meRow'} .buff-icon--quest`);if(!tile||tile.getAttribute('data-uid')!==uid||!peak||!landing)throw Error('Missing animation/native tile');const final=rect(tile);for(const k of ['x','y','w','h']as const)if(Math.abs(final[k]-landing[k])>2)throw Error('Landing jump '+k);
   if(document.querySelector('.cast-reveal,.quest-fold-canvas'))throw Error('Animation residue');report.checks.push({lang,side,id,occupied:n,peak,landing,final,uid});
  }
  status.textContent='途中停止検証';controller.reset(0,'Q_RIFT');await new Promise(r=>requestAnimationFrame(r));controller.play();await wait(()=>!!document.querySelector('.quest-fold-canvas'));setFxSkip(true);await wait(()=>!document.querySelector('.quest-fold-host,.quest-fold-canvas'));await wait(()=>!!document.querySelector('#meRow .buff-icon--quest'));report.checks.push('Fast-forward native restoration and cleanup');setFxSkip(false);
  if(document.documentElement.scrollWidth>innerWidth)throw Error('Horizontal overflow');report.checks.push({viewport:[innerWidth,innerHeight],overflow:false});report.status='passed';
 }catch(error){report.status='failed';report.error=String(error);}finally{status.textContent=JSON.stringify(report,null,2);document.body.dataset.qaStatus=report.status;}
}
