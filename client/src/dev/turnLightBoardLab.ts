import {setTurnLightPreview} from '../ui/turnLightPreview';
import {createTurnLights,TURN_LIGHTS,isTurnLight,type TurnLightId} from './turnLightEffects';
import './turnLightBoardLab.css';
const requested=new URLSearchParams(location.search).get('turnlight');
let variant:TurnLightId=isTurnLight(requested)?requested:'porcelain';
if(requested!==null)setTurnLightPreview((turn,segments,scene)=>createTurnLights(turn,segments,()=>variant,scene));
export function mountTurnLightBoardLab(root:HTMLElement,standard:HTMLElement,setSide:(enemy:boolean)=>void,setSeconds:(seconds:number)=>void){
 if(requested===null)return;
 standard.style.display='none';root.dataset.turnlight=variant;
 const panel=document.createElement('section');panel.className='turn-light-controls';panel.setAttribute('aria-label','ターン終了の光 比較');
 panel.innerHTML=`<a href="/turn-light-lab.html" target="_top">3案比較</a><select aria-label="光のパターン">${TURN_LIGHTS.map((v,i)=>`<option value="${v.id}">${i+1}. ${v.name}</option>`).join('')}</select><button data-self>自分のターン</button><button data-enemy>相手のターン</button><button data-block>操作不可</button><button data-90>90秒</button><button data-12>12秒</button><button data-4>4秒</button>`;
 document.body.append(panel);const select=panel.querySelector('select')!;select.value=variant;
 select.onchange=()=>{variant=select.value as TurnLightId;root.dataset.turnlight=variant;const url=new URL(location.href);url.searchParams.set('turnlight',variant);history.replaceState(null,'',url);};
 panel.querySelector<HTMLButtonElement>('[data-self]')!.onclick=()=>{setSide(false);setSeconds(90);};
 panel.querySelector<HTMLButtonElement>('[data-enemy]')!.onclick=()=>{setSide(true);setSeconds(90);};
 panel.querySelector<HTMLButtonElement>('[data-block]')!.onclick=()=>{setSide(false);(root.querySelector('#endBtn') as HTMLButtonElement).disabled=true;};
 for(const n of [90,12,4])panel.querySelector<HTMLButtonElement>(`[data-${n}]`)!.onclick=()=>setSeconds(n);
 window.addEventListener('pagehide',()=>{setTurnLightPreview();panel.remove();},{once:true});
}
