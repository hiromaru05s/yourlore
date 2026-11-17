// The animated GIF remains the only visible painting. Each filter takes its
// current pixels as SourceGraphic, so cloth, light and silhouette share its breath.
import fields from './seekerFields.json';

export type Reaction = 'hurt' | 'mana' | 'heal';
const recipes = {
  hurt:{field:fields.hurt, color:'#d35a42', glint:'#ffe0a6', pigment:'.82 .45 .08 0 .12', ms:820},
  mana:{field:fields.mana, color:'#31afff', glint:'#dbfaff', pigment:'2.30 .70 -1.35 0 .34', ms:1480},
  heal:{field:fields.heal, color:'#40cb8a', glint:'#dbffc8', pigment:'.88 .92 .40 0 .16', ms:1780},
};
const kinds = Object.keys(recipes) as Reaction[];
const clip=(n:number)=>Math.min(1,Math.max(0,n));
const smooth=(n:number)=>{n=clip(n);return n*n*(3-2*n);};
const rise=(t:number,a:number,b:number)=>smooth((t-a)/(b-a));
const pulse=(t:number,a:number,b:number,c:number,d:number)=>rise(t,a,b)*(1-rise(t,c,d));
type Pose={bend:number; front:number; width:number; strength:number};
function pose(kind:Reaction,t:number):Pose {
  if(kind==='mana')return {
    // Settle into the clasp; straighten as the bright edge runs up the gold.
    bend:-.025*pulse(t,0,.12,.13,.28)+.17*pulse(t,.10,.42,.48,1),
    front:-.05+1.25*rise(t,.04,.85),width:.17,
    strength:.98*pulse(t,0,.12,.68,1),
  };
  if(kind==='heal')return {
    // A small exhale/bow opens the folds. Lift the hood after the green front.
    bend:.12*pulse(t,0,.25,.29,.61)-.096*pulse(t,.34,.62,.67,1),
    front:-.12+1.49*rise(t,.04,.90),width:.27,
    strength:.87*pulse(t,0,.15,.76,1),
  };
  return {
    // Fast shoulder contact, short hold, cloth overshoot and slower settling.
    bend:.23*pulse(t,0,.13,.18,.62)-.053*pulse(t,.42,.67,.69,.99),
    front:.15+.77*rise(t,0,.42),width:.12,
    strength:.72*pulse(t,0,.07,.16,.48),
  };
}

let serial=0;
export function createSeekerReaction(image:HTMLImageElement, state:HTMLCanvasElement){
  const prefix='seeker-cloth-'+(++serial)+'-';
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('width','0');svg.setAttribute('height','0');svg.style.position='absolute';
  svg.setAttribute('aria-hidden','true');
  svg.innerHTML='<defs>'+kinds.map(k=>{
    const r=recipes[k];
    return `<filter id="${prefix+k}" x="0" y="0" width="1" height="1" primitiveUnits="objectBoundingBox" color-interpolation-filters="sRGB">
      <feImage href="${r.field}" x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="cloth"/>
      <feColorMatrix in="cloth" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 1 0 0"/>
      <feComponentTransfer result="wave"><feFuncA type="table" tableValues="0 0"/></feComponentTransfer>
      <feColorMatrix in="SourceGraphic" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  ${r.pigment}"/>
      <feComposite in2="SourceAlpha" operator="in"/><feComposite in2="wave" operator="in" result="litPigment"/>
      <feFlood flood-color="${r.color}"/><feComposite in2="litPigment" operator="in"/>
      <feComposite in2="SourceGraphic" operator="over" result="tint"/>
      <feComponentTransfer in="litPigment" result="rim"><feFuncA type="gamma" amplitude=".94" exponent="3.2" offset="0"/></feComponentTransfer>
      <feFlood flood-color="${r.glint}"/><feComposite in2="rim" operator="in"/>
      <feComposite in2="tint" operator="over" result="painting"/>
      <feDisplacementMap in="painting" in2="cloth" scale="0" xChannelSelector="R" yChannelSelector="G"/>
    </filter>`;
  }).join('')+'</defs>';
  const owners=kinds.map(k=>svg.querySelector('#'+prefix+k)!);
  const tracks=kinds.map((kind,i)=>({
    kind, time:-1, bend:0, table:new Float32Array(32), carry:undefined as {bend:number; table:Float32Array}|undefined,
    warp:owners[i].querySelector('feDisplacementMap')!,light:owners[i].querySelector('feFuncA')!,
  }));
  let raf=0,previous=0;
  function reset(){
    cancelAnimationFrame(raf);raf=0;previous=0;
    for(const tr of tracks){tr.time=-1;tr.carry=undefined;}
    image.style.removeProperty('filter');state.dataset.action='idle';state.dataset.frame='0';
  }
  function tick(now:number){
    raf=0;
    if(!image.isConnected){reset();return;}
    const step=Math.min(48,Math.max(0,now-previous));previous=now;
    const filters:string[]=[];let action:Reaction|'idle'='idle',frame=0;
    for(const tr of tracks){
      if(tr.time<0)continue;
      tr.time+=step;const t=tr.time/recipes[tr.kind].ms;
      if(t>=1){tr.time=-1;tr.carry=undefined;continue;}
      const p=pose(tr.kind,t),q=tr.carry?smooth(tr.time/115):1;
      tr.bend=(tr.carry?.bend??0)*(1-q)+p.bend*q;
      tr.warp.setAttribute('scale',tr.bend.toFixed(5));
      const table=tr.table;
      for(let i=0;i<table.length;i++){
        const d=(i/(table.length-1)-p.front)/p.width;
        // A narrow leading rim, then a wider, weaker wash in its wake.
        const a=p.strength*(.72*Math.exp(-5*d*d)+.41*Math.exp(-1.9*(d+.68)**2));
        table[i]=(tr.carry?.table[i]??0)*(1-q)+clip(a)*q;
      }
      tr.light.setAttribute('tableValues',Array.from(table,n=>n.toFixed(3)).join(' '));
      if(q===1)tr.carry=undefined;
      filters.push('url(#'+prefix+tr.kind+')');
      if(action==='idle'){action=tr.kind;frame=Math.round(t*(tr.kind==='hurt'?40:56));}
    }
    image.style.filter=filters.join(' ');
    state.dataset.action=action;state.dataset.frame=String(frame);
    if(filters.length)raf=requestAnimationFrame(tick);
  }
  return {svg,reset,play(kind:Reaction){
    const tr=tracks[kinds.indexOf(kind)];
    tr.carry=tr.time<0?undefined:{bend:tr.bend,table:tr.table.slice()};tr.time=0;
    if(!raf){previous=performance.now();tick(previous);}
  }};
}
