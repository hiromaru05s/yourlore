import {FACET_VARIANTS,isFacetVariant,facetPreview} from './manaFacetVariants';
import {setManaGainPreviewRenderer} from '../ui/manaGain';
import {FORMATIONS,formationPreview,isFormation,disposeFormationBloom} from './manaFormation';
import {setManaFormationPreview} from '../ui/manaFormationPreview';
import {setFxSkip} from '../ui/anim';
import './manaBoardLab.css';

export function mountManaBoardLab(standard:HTMLElement,gain:(side:0|1|'both')=>Promise<void>){
 const panel=document.createElement('section');panel.dataset.manaControls='true';panel.className='mana-lab-controls';panel.setAttribute('aria-label','マナ演出比較');
 panel.innerHTML=`<a href="/mana-lab.html" style="color:#abcbdc;align-self:center;margin-right:6px">← 5案比較</a><select aria-label="マナ演出パターン" style="max-width:100%;flex:1;padding:7px;background:#21384d;color:#e8ecdf;border:1px solid #657682;border-radius:4px">${FACET_VARIANTS.map((v,i)=>`<option value="${v.id}">${i+1}. ${v.name}${v.id==='facet-swift'?'（採用）':''}</option>`).join('')}<optgroup label="比較用・前の5案">${FORMATIONS.map(v=>`<option value="${v.id}">${v.id==='facets'?'基準②：':''}${v.name}</option>`).join('')}</optgroup><option value="original">旧演出（比較用）</option></select><button data-side="0">自分で再生</button><button data-side="1">相手で再生</button><button data-both>同時再生</button><button data-stop>停止</button>`;
 const select=panel.querySelector('select')!;let busy=false;
 const initial=new URLSearchParams(location.search).get('mana');select.value=isFormation(initial)||isFacetVariant(initial)?initial:'facet-swift';
 function apply(){setFxSkip(true);setFxSkip(false);const value=select.value;setManaGainPreviewRenderer();setManaFormationPreview(isFacetVariant(value)?facetPreview(value):isFormation(value)?formationPreview(value):null);const url=new URL(location.href);url.searchParams.set('mana',value);history.replaceState(null,'',url);}
 select.onchange=apply;apply();
 const buttons=[...panel.querySelectorAll('button')];for(const button of buttons)button.style.cssText='padding:7px 10px;background:#243b4b;color:#e6eee9;border:1px solid #688092;border-radius:4px;cursor:pointer';
 const run=async(sides:(0|1)[])=>{if(busy)return;busy=true;buttons.filter(b=>!b.hasAttribute('data-stop')).forEach(b=>b.disabled=true);try{await gain(sides.length===2?'both':sides[0]);}finally{busy=false;buttons.forEach(b=>b.disabled=false);}};
 panel.querySelectorAll<HTMLButtonElement>('[data-side]').forEach(b=>b.onclick=()=>void run([Number(b.dataset.side) as 0|1]));
 panel.querySelector<HTMLButtonElement>('[data-both]')!.onclick=()=>void run([0,1]);
 panel.querySelector<HTMLButtonElement>('[data-stop]')!.onclick=()=>{setFxSkip(true);setFxSkip(false);};
 // Keep the established fixture controls available in the DOM for its regression suite.
 standard.style.display='none';document.body.append(panel);
 window.addEventListener('pagehide',()=>{setManaGainPreviewRenderer();setManaFormationPreview();disposeFormationBloom();panel.remove();},{once:true});
}
