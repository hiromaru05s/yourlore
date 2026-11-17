// The GIF breathes continuously under the mana illustration and cloth filters.
import {configureGreenLight,greenLightFilter,healingRise} from './seekerArt/heal';
import fields from './seekerFields.json';
import {manaReaction} from './seekerArt/mana';
import {createLayer} from './seekerArt/layer';

export type Reaction = 'hurt' | 'mana' | 'heal';
const recipes = {
  hurt:{field:fields.hurt, color:'#d35a42', glint:'#ffe0a6', pigment:'.82 .45 .08 0 .12', ms:820},
  heal:{field:fields.heal, color:'#40cb8a', glint:'#dbffc8', pigment:'.88 .92 .40 0 .16', ms:1780},
};
const kinds = Object.keys(recipes) as (keyof typeof recipes)[];
const clip=(n:number)=>Math.min(1,Math.max(0,n));
const smooth=(n:number)=>{n=clip(n);return n*n*(3-2*n);};
const rise=(t:number,a:number,b:number)=>smooth((t-a)/(b-a));
const pulse=(t:number,a:number,b:number,c:number,d:number)=>rise(t,a,b)*(1-rise(t,c,d));
type Pose={bend:number; front:number; width:number; strength:number};
function pose(kind:keyof typeof recipes,t:number):Pose {
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
export function createSeekerReaction(image:HTMLImageElement, state:HTMLCanvasElement, useBaseline=false){
  const prefix='seeker-cloth-'+(++serial)+'-';
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('width','0');svg.setAttribute('height','0');svg.style.position='absolute';
  svg.setAttribute('aria-hidden','true');
  svg.innerHTML='<defs>'+kinds.map(k=>{
    if(k==='heal' && !useBaseline)return greenLightFilter(prefix+k);
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
  if(!useBaseline)configureGreenLight(owners[kinds.indexOf('heal')],healingRise,fields.healingRise);
  const tracks=kinds.map((kind,i)=>({
    kind, time:-1, speed:1, bend:0, table:new Float32Array(kind==='heal' && !useBaseline?48:32), carry:undefined as {bend:number; table:Float32Array}|undefined,
    warp:owners[i].querySelector('feDisplacementMap'),light:owners[i].querySelector('feFuncA')!,
  }));
  const ink=createLayer(image);
  let raf=0,previous=0,manaElapsed=-1,repeatMana=false;
  function reset(){
    cancelAnimationFrame(raf);raf=0;previous=0;
    manaElapsed=-1;repeatMana=false;ink.clear();
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
      const rising=tr.kind==='heal' && !useBaseline;
      tr.time+=step*tr.speed;const t=tr.time/(rising?healingRise.duration:recipes[tr.kind].ms);
      if(t>=1){tr.time=-1;tr.carry=undefined;continue;}
      const p=pose(tr.kind,t),q=tr.carry?smooth(tr.time/115):1;
      tr.bend=(tr.carry?.bend??0)*(1-q)+p.bend*q;
      tr.warp?.setAttribute('scale',tr.bend.toFixed(5));
      const table=tr.table;
      for(let i=0;i<table.length;i++){
        const d=(i/(table.length-1)-p.front)/p.width;
        // A narrow leading rim, then a wider, weaker wash in its wake.
        const a=rising?healingRise.exposure(i/(table.length-1),t):p.strength*(.72*Math.exp(-5*d*d)+.41*Math.exp(-1.9*(d+.68)**2));
        table[i]=(tr.carry?.table[i]??0)*(1-q)+clip(a)*q;
      }
      tr.light.setAttribute('tableValues',Array.from(table,n=>n.toFixed(3)).join(' '));
      if(q===1)tr.carry=undefined;
      filters.push('url(#'+prefix+tr.kind+')');
      if(action==='idle'){action=tr.kind;frame=Math.round(t*(tr.kind==='hurt'?40:56));}
    }
    if(manaElapsed>=0){
      manaElapsed+=step;
      if(manaElapsed>=manaReaction.duration){
        manaElapsed=repeatMana?0:-1;
        repeatMana=false;
      }
      if(manaElapsed<0)ink.clear();
      else{
        const t=manaElapsed/manaReaction.duration;
        ink.paint(manaReaction,t);
        if(action==='idle'){action='mana';frame=Math.round(t*56);}
      }
    }
    image.style.filter=filters.join(' ');
    state.dataset.action=action;state.dataset.frame=String(frame);
    if(filters.length || manaElapsed>=0)raf=requestAnimationFrame(tick);
  }
  return {svg,overlay:ink.canvas,reset,play(kind:Reaction,speed=1){
    if(kind==='mana'){
      if(manaElapsed<0)manaElapsed=0;
      else repeatMana=true;
      if(!raf){previous=performance.now();tick(previous);}
      return;
    }
    const tr=tracks[kinds.indexOf(kind)];tr.speed=speed;
    tr.carry=tr.time<0?undefined:{bend:tr.bend,table:tr.table.slice()};tr.time=0;
    if(!raf){previous=performance.now();tick(previous);}
  }};
}
