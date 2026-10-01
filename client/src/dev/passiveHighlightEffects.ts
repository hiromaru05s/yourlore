/** Opt-in comparison only. Keeps the approved v2 icon artwork intact. */
export const PASSIVE_HIGHLIGHTS = [
 {id:'silver',name:'銀の輪郭',description:'細い白銀の縁。光を広げず、輪郭をくっきり。',kind:'静止'},
 {id:'gold',name:'金の灯り',description:'下側の金属縁から、暖かい光がわずかににじむ。',kind:'静止'},
 {id:'frost',name:'月白の背面光',description:'暗い接触影と青白い光で、アートから浮き上がる。',kind:'静止'},
 {id:'corners',name:'角の反射',description:'左上と右下だけに光。金属らしい小さな反射。',kind:'静止'},
 {id:'sheen',name:'巡る艶',description:'常時の細い縁に、ゆっくりと斜めの艶が巡る。',kind:'4.8秒ループ'},
] as const;
export type PassiveHighlight = typeof PASSIVE_HIGHLIGHTS[number]['id'];
const rim='M6 1.5h20l4.5 4.5v20l-4.5 4.5H6L1.5 26V6z';
export function decoratePassiveHighlights(root:ParentNode,pattern:PassiveHighlight):void {
 for(const icon of root.querySelectorAll<HTMLElement>('.passive-icon')){
  icon.dataset.highlight=pattern;
  if(icon.querySelector(':scope > .psv-light'))continue;
  const light=icon.ownerDocument.createElement('span');light.className='psv-light';light.setAttribute('aria-hidden','true');
  light.innerHTML=`<svg viewBox="0 0 32 32" focusable="false"><path class="ph-bed" d="${rim}"/><path class="ph-rim" d="${rim}"/><path class="ph-upper" d="M1.5 15V6L6 1.5h12"/><path class="ph-lower" d="M14 30.5h12l4.5-4.5V17"/><path class="ph-corners" d="M1.5 11V6L6 1.5h5M21 30.5h5l4.5-4.5v-5"/></svg><span class="ph-sheen"></span>`;
  icon.append(light);
 }
}
