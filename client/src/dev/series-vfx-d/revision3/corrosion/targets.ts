import {paint,ready,SIZE} from '../../revision2/material';
import type {Fixture} from '../fixture';
export {ready as corrosionReady};
export class CorrosionTargets {
 private targets=new Map<string,{canvas:HTMLCanvasElement;from:number;to:number;grant:boolean}>();
 constructor(f:Fixture){
  for(const [s,before]of f.before.players.entries())for(const m of before.field){const after=f.after.players[s].field.find(x=>x.uid===m.uid),destroyed=f.events.some(e=>e.type==='destroy'&&e.uid===m.uid);const from=m.decayCnt||0,to=after?.decayCnt??(destroyed&&f.events.some(e=>e.type==='damage'&&e.srcJa==='腐敗')?3:from);const grant=!!after?.passivesG?.includes('decay')&&!m.passivesG?.includes('decay')&&!m.passive?.includes('decay');if(to<=from&&!grant)continue;const canvas=Object.assign(document.createElement('canvas'),{width:SIZE,height:SIZE});canvas.className='d3-corrosion-target';canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3';this.targets.set(m.uid,{canvas,from,to,grant});}
 }
 draw(time:number,variant:number,find:(uid:string)=>HTMLElement|null){for(const [uid,t]of this.targets){const art=find(uid)?.querySelector('.card-art');if(art&&t.canvas.parentElement!==art)art.append(t.canvas);const progress=Math.max(0,Math.min(1,(time-1200)/1250)),stage=t.from+(t.to-t.from)*progress;const materialTime=t.grant?850+progress*620:stage<=1?850+stage*680:stage<=2?2450+(stage-1)*850:4150+(stage-2)*510;paint(t.canvas,variant,materialTime);if(t.grant){t.canvas.style.opacity=String(time<1000?0:(time<2200?.62:.3));t.canvas.style.transform='translate(15%,22%) scale(.42)';}else t.canvas.style.opacity=time<1200?'0':'1';}}
 dispose(){for(const t of this.targets.values())t.canvas.remove();this.targets.clear();}
}
