import {t,getLang} from '../i18n';
/** Native book/seal illustration shared by the cinematic and its result panel. */
export function outcomeCrest(won:boolean|null):string {
 return `<svg class="outcome-crest" viewBox="0 0 320 240" fill="none" aria-hidden="true">
 <g class="outcome-orbit" stroke="currentColor"><circle cx="160" cy="116" r="94" opacity=".2"/><circle cx="160" cy="116" r="83" stroke-dasharray="2 13" opacity=".65"/><path d="M160 12v15m0 178v15M56 116H41m238 0h-15M85 41l10 10m130 130 10 10M85 191l10-10M225 51l10-10"/><path d="m160 4 5 12-5 12-5-12Zm0 198 5 12-5 12-5-12Z" fill="currentColor"/></g>
 <g class="outcome-pages" stroke="currentColor" stroke-linejoin="round">
 <path d="M160 163c-25-25-51-30-94-28l11-73c34-3 62 6 83 29 21-23 49-32 83-29l11 73c-43-2-69 3-94 28Z" fill="var(--outcome-ink)" stroke-width="2"/>
 <path d="M160 163V91M73 143c41-3 61 5 87 29 26-24 46-32 87-29M88 78c27 1 46 9 58 21m-60-7c25 1 46 10 60 23m-62-8c28 2 47 10 62 23m-64-8c28 2 47 10 64 23m86-67c-27 1-46 9-58 21m60-7c-25 1-46 10-60 23m62-8c-28 2-47 10-62 23m64-8c-28 2-47 10-64 23" opacity=".58"/>
 <path class="outcome-shard" d="m160 39 10 18-10 20-10-20Z" fill="currentColor" stroke-width="1"/>
 ${won===false?'<path d="m168 45-13 21 14 18-19 28 18 18-14 30" stroke="var(--outcome-ink)" stroke-width="5"/>':''}
 </g></svg>`;
}
export function mountDuelOutcome(loser:HTMLElement|null,won:boolean,cause:string|null){
 const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
 const host=document.createElement('div');host.className='duel-outcome '+(won?'is-victory':'is-defeat');host.setAttribute('role','status');host.setAttribute('aria-live','polite');
 const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');host.append(canvas);
 const copy=document.createElement('div');copy.className='outcome-copy';
 const eyebrow=document.createElement('div');eyebrow.className='outcome-eyebrow';eyebrow.textContent='BIBLION · '+(won?'RECORD ASCENDANT':'RECORD SEALED');
 const crest=document.createElement('div');crest.innerHTML=outcomeCrest(won);
 const title=document.createElement('h1');title.textContent=t(won?'modal.win':'modal.lose');
 const subtitle=document.createElement('p');subtitle.className='outcome-subtitle';
 subtitle.textContent=getLang()==='ja'?(won?'その一頁が、新たな歴史になる。':'書を閉じて、次の物語へ。'):getLang()==='ko'?(won?'새로운 역사의 한 페이지.':'책을 덮고, 다음 이야기로.'):(won?'A new page in the archive.':'Close this chapter. Begin another.');
 copy.append(eyebrow,crest,title,subtitle);if(cause){const c=document.createElement('p');c.className='outcome-cause';c.textContent=cause;copy.append(c);}host.append(copy);document.body.append(host);
 const w=innerWidth,h=innerHeight,dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=w*dpr;canvas.height=h*dpr;
 const ctx=canvas.getContext('2d');ctx?.scale(dpr,dpr);
 const r=loser?.getBoundingClientRect(),source={x:r?r.left+r.width/2:w/2,y:r?r.top+r.height/2:h*.25};
 const motion=loser&&!reduced?loser.animate([{filter:'brightness(1)',opacity:1},{filter:'brightness(2.4)',opacity:.85,offset:.15},{filter:'brightness(.5)',opacity:.25,offset:.55},{filter:'brightness(.65)',opacity:.55}],{duration:1000,fill:'forwards'}):null;
 let frame=0,dead=false;const start=performance.now();
 const draw=(now:number)=>{
  if(dead||!host.isConnected)return;
  const age=Math.min(1,(now-start)/1450);if(ctx){ctx.clearRect(0,0,w,h);
   const cx=w/2,cy=h*.41,light=won?'181,221,245':'133,145,208';
   const pulse=Math.sin(Math.PI*Math.min(1,age/.75));
   const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.min(w,h)*.55);glow.addColorStop(0,`rgba(${light},${.18*pulse})`);glow.addColorStop(1,`rgba(${light},0)`);ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
   if(!reduced)for(let i=0;i<64;i++){
    const delay=(i%11)*.011,p=Math.max(0,Math.min(1,(age-delay)/.75)),angle=i*2.39996;
    const destination={x:cx+Math.cos(angle)*(90+i%7*23),y:cy+Math.sin(angle)*(50+i%9*17)};
    const ease=1-(1-p)**3,x=source.x+(destination.x-source.x)*ease,y=source.y+(destination.y-source.y)*ease-Math.sin(Math.PI*p)*(40+i%5*12)+(won?-1:1)*p*p*35;
    ctx.save();ctx.translate(x,y);ctx.rotate(angle+p*(won?1:-1));ctx.globalAlpha=Math.sin(Math.PI*p)*.75;ctx.fillStyle=i%4===0?(won?'#ffe8a5':'#c1b7e6'):'#e2f5ff';
    ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=7;const sz=2+i%4;ctx.beginPath();ctx.moveTo(0,-sz*2);ctx.lineTo(sz,0);ctx.lineTo(0,sz*2);ctx.lineTo(-sz,0);ctx.fill();ctx.restore();
   }
  }
  if(age<1&&!reduced&&!document.hidden)frame=requestAnimationFrame(draw);
 };
 frame=requestAnimationFrame(draw);
 return ()=>{if(dead)return;dead=true;cancelAnimationFrame(frame);motion?.cancel();host.remove();};
}
