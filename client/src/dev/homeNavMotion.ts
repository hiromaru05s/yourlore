/** Original monochrome glyphs and selection choreography for the local study only. */
const paths = [
  '<path d="M9 26V13L20 5l11 8v13M15 30V18h10v12M7 31h26"/><path d="m16 10 4-3 4 3"/>',
  '<path d="m9 9 17-3 5 26-17 3z"/><path d="m7 15-3 2 7 19 8-3M19 13l5 6-3 7-5-6z"/>',
  '<path d="M14 7h17v26H14zM9 10H7v23h3M2 14v16"/><path d="m22 12 5 8-5 8-5-8z"/>',
  '<path d="M14 7h12v8c0 7-12 7-12 0zM14 10H8v4q0 6 7 6M26 10h6v4q0 6-7 6M20 21v9M13 33h14M16 29h8"/>',
  '<circle cx="16" cy="13" r="5"/><path d="M6 31v-5c0-8 20-8 20 0v5M26 9c8 0 8 9 1 10M29 23q6 1 6 8"/>',
  '<path d="M8 14h24v19H8zM6 14l4-7h20l4 7M7 18q4 4 8 0 5 4 10 0 4 4 8 0M17 25h7v8"/>',
  '<path d="M20 11Q12 6 5 9v22q8-3 15 1 7-4 15-1V9q-7-3-15 2v21M10 15l5 1M10 21l5 1M25 16l5-1M25 22l5-1"/>'
];
const english=['SANCTUM','DECK','ARCHIVE','RANKING','FRIENDS','SHOP','GUIDE'];
const artwork=['/art/lounge/stage-v1/stage.webp','/art/cards/STARTER_MANA.webp','/art/cards/HIGH_ELF.webp','/art/cards/ELDER_ELF_KING.webp','/art/cards/ELF.webp','/art/cards/GUILD_CHEST.webp','/art/cards/ELF_HAVEN.webp'];
export function createNavStudy(root:HTMLElement, variant:string) {
  const nav=root.querySelector<HTMLElement>('.lounge-rail nav')!;
  const buttons=Array.from(nav.querySelectorAll<HTMLButtonElement>('[data-nav]'));
  buttons.forEach((button,index)=>{
    const label=button.querySelector('span')!.textContent!;
    button.setAttribute('aria-label',label);
    button.innerHTML=`<i class="nav-art" aria-hidden="true" style="background-image:url('${artwork[index]}')"></i><span class="nav-glyph" aria-hidden="true"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square" stroke-linejoin="miter">${paths[index]}</svg></span><span class="nav-copy"><span class="nav-label">${label}</span><small aria-hidden="true">${english[index]}</small></span><i class="nav-number" aria-hidden="true">0${index+1}</i>`;
  });
  const cursor=document.createElement('i');cursor.className='nav-cursor';cursor.ariaHidden='true';nav.prepend(cursor);
  let speed=1,manualReduced=false,timer:number|undefined;
  let cursorAnimation:Animation|undefined;
  let motion:Animation[]=[];
  const reduce=()=>manualReduced||matchMedia('(prefers-reduced-motion: reduce)').matches;
  const place=(animate:boolean)=>{
    const button=buttons.find(b=>b.hasAttribute('aria-current'))!;
    const old=cursor.getBoundingClientRect();
    const parent=nav.getBoundingClientRect();
    const next=button.getBoundingClientRect();
    cursorAnimation?.cancel();
    cursor.style.left=next.left-parent.left+'px';cursor.style.width=next.width+'px';
    if(animate&&!reduce()) cursorAnimation=cursor.animate([
      {transform:`translateX(${old.left-next.left}px) scaleX(${old.width/next.width})`},
      {transform:'translateX(0) scaleX(1)'}
    ],{duration:([0,360,280,220,460,420][Number(variant)]||360)/speed,easing:'cubic-bezier(.18,.8,.2,1)'});
  };
  const select=(key:string,animate=true)=>{
    const button=buttons.find(b=>b.dataset.nav===key);if(!button)return;
    motion.forEach(a=>a.cancel());motion=[];
    buttons.forEach(b=>b.toggleAttribute('aria-current',b===button));button.setAttribute('aria-current','page');
    place(animate);
    if(animate&&!reduce()){
      const copy=button.querySelector('.nav-copy')!;
      const directions:Record<string,Keyframe[]>={
        '1':[{opacity:.4,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],
        '2':[{clipPath:'inset(0 100% 0 0)',transform:'translateX(-14px)'},{clipPath:'inset(0 0 0 0)',transform:'translateX(0)'}],
        '3':[{opacity:.2,transform:'translateX(5px)'},{opacity:1,transform:'translateX(0)'}],
        '4':[{opacity:.3,filter:'blur(3px)',transform:'translateY(4px)'},{opacity:1,filter:'blur(0)',transform:'translateY(0)'}],
        '5':[{opacity:.5,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}]
      };
      motion.push(copy.animate(directions[variant],{duration:(variant==='4'?460:300)/speed,easing:'cubic-bezier(.16,.8,.2,1)'}));
      if(variant==='5')motion.push(button.querySelector('.nav-art')!.animate([{transform:'scale(1.08) translateY(4px)'},{transform:'scale(1) translateY(0)'}],{duration:520/speed,easing:'cubic-bezier(.16,.8,.2,1)'}));
    }
    nav.dataset.selected=key;
  };
  buttons.forEach((button,index)=>{
    button.onclick=()=>{clearTimeout(timer);select(button.dataset.nav!)};
    button.onkeydown=event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();clearTimeout(timer);
      const next=event.key==='Home'?0:event.key==='End'?6:(index+(event.key==='ArrowRight'?1:6))%7;
      buttons[next].focus();select(buttons[next].dataset.nav!);
    };
  });
  const demo=()=>{
    clearTimeout(timer);let index=0;
    const order=[0,1,2,5,4,3,6,0];
    const step=()=>{select(buttons[order[index++]].dataset.nav!);if(index<order.length)timer=window.setTimeout(step,850/speed)};step();
  };
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==parent)return;
    if(event.data?.type==='nav-demo')demo();
    if(event.data?.type==='nav-settings'){
      speed=event.data.speed===.5?.5:1;manualReduced=event.data.reduced===true;
      document.documentElement.classList.toggle('nav-reduced',manualReduced);
      document.documentElement.style.setProperty('--nav-speed',speed===.5?'2':'1');
      if(reduce()){motion.forEach(a=>a.cancel());cursorAnimation?.cancel()}
    }
  });
  new ResizeObserver(()=>place(false)).observe(nav);
  requestAnimationFrame(()=>place(false));
  return {select,demo};
}
