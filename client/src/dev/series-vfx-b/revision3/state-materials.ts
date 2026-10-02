import {smooth} from './surface';
import type {StateFixture} from './state-fixtures';
export type StateSurface={node:HTMLElement;canvas:HTMLCanvasElement;image:HTMLImageElement;counter:HTMLElement;created:boolean;wrapper?:HTMLElement;previousBackground:string;fixture:StateFixture};
export async function attachState(fixture:StateFixture):Promise<StateSurface>{
 const side=fixture.owner===0?'me':'opp',portrait=document.getElementById(fixture.owner===0?'portraitMe':'portraitOpp')!;
 let node=portrait.querySelector<HTMLElement>(`.pt-${fixture.resource}`),created=false,wrapper:HTMLElement|undefined;
 if(!node){
  let row=portrait.querySelector<HTMLElement>('.pt-resources');if(!row){row=document.createElement('span');row.className='pt-resources';portrait.append(row);wrapper=row;}
  node=document.createElement('span');node.className=`pt-${fixture.resource}`;node.style.setProperty('--resource-number-scale','.14');node.innerHTML=`<b id="${fixture.resource}-${side}">${fixture.before.players[fixture.owner][fixture.resource]}</b>`;row.append(node);created=true;
 }
 const counter=node.querySelector<HTMLElement>('b')!,image=new Image();image.src=`/art/biblion/modular/${fixture.resource}.png`;await image.decode();
 const previousBackground=node.style.backgroundImage;node.style.backgroundImage='none';
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;canvas.className='b-r3-state-material';canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0';counter.style.zIndex='1';node.prepend(canvas);
 return {node,canvas,image,counter,created,wrapper,previousBackground,fixture};
}
function interior(resource:string){
 return new Path2D(resource==='dew'?'M .5 .26 C .42 .4 .22 .48 .22 .65 C .22 .94 .79 .94 .79 .65 C .79 .48 .59 .38 .5 .26 Z':'M .2 .25 Q .5 .25 .8 .25 L .77 .57 Q .74 .69 .5 .83 Q .26 .7 .23 .57 Z');
}
export function drawState(s:StateSurface,variant:number,p:number,reduced=false){
 const c=s.canvas.getContext('2d')!,f=s.fixture,stage=f.stage,resource=f.resource;
 c.setTransform(256,0,0,256,0,0);c.clearRect(0,0,1,1);c.drawImage(s.image,0,0,1,1);
 if(reduced||stage==='hold')return;
 c.save();c.clip(interior(resource));
 const k=smooth(.08,.82,p),strain=Math.sin(k*Math.PI),loss=['absorb','break','expire'].includes(stage);
 if(resource==='dew'){
  if(variant===1){
   // The liquid surface rises inside the original gem; porcelain and gold frame
   // stay pixel-stable. Healing moves the liquid but does not drain its stock.
   const y=stage==='gain'?.86-.6*k:.43+Math.sin(k*Math.PI*2)*.08*(1-k);
   c.fillStyle='#124d49';c.fillRect(0,0,1,1);c.beginPath();c.moveTo(.1,1);c.lineTo(.1,y);c.bezierCurveTo(.32,y-.06*strain,.65,y+.07*strain,.9,y);c.lineTo(.9,1);c.closePath();c.fillStyle='#247d73';c.fill();
   c.strokeStyle='#9ccac0';c.lineWidth=.012;c.beginPath();c.moveTo(.1,y);c.bezierCurveTo(.32,y-.06*strain,.65,y+.07*strain,.9,y);c.stroke();
  }else{
   // Two contiguous liquid lobes join under the gem tip, then relax as one body.
   c.fillStyle='#0e4140';c.fillRect(0,0,1,1);
   for(const side of [-1,1]){c.save();c.translate(.5+side*.14*(1-k),.82);c.scale(.7+.3*k,1-.12*strain);c.translate(-.5,-.82);c.beginPath();c.rect(side<0?0:.5,0,.5,1);c.clip();c.drawImage(s.image,0,0,1,1);c.restore();}
  }
 }else{
  c.fillStyle='#0c2142';c.fillRect(0,0,1,1);
  if(variant===1){
   for(let i=0;i<3;i++){const q=smooth(i*.09,.59+i*.1,p),offset=(1-q)*.16*(i-1)+(loss?strain*.045*(i-1):0);c.save();c.beginPath();c.rect(.15+i*.235+offset,.2,.25,.66);c.clip();c.drawImage(s.image,offset,loss?strain*.025:0,1,1);c.restore();}
  }else{
   for(const side of [-1,1]){c.save();c.translate(.5,.5);c.scale(1-strain*(loss?.2:.12),1);c.translate(-.5,-.5);c.beginPath();c.rect(side<0?0:.5,0,.5,1);c.clip();c.drawImage(s.image,side*(1-k)*.12,0,1,1);c.restore();}
  }
  if(stage==='expire'){c.save();c.globalAlpha=k*.7;c.fillStyle='#1f2932';c.fillRect(0,0,1,1);c.restore();}
 }
 // The last part rejoins the original material inside the registered aperture.
 const settle=smooth(.84,1,p);if(settle){c.globalAlpha=settle;c.drawImage(s.image,0,0,1,1);}c.restore();
}
export function disposeState(s:StateSurface){s.canvas.remove();s.node.style.backgroundImage=s.previousBackground;s.counter.style.zIndex='';if(s.created)s.node.remove();s.wrapper?.remove();}
