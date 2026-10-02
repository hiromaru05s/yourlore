import {ease} from '../material';
export class ChestLocks {
 private layers:HTMLCanvasElement[]=[];
 draw(time:number,variant:number){
  if(!this.layers.length)for(const id of ['r3-locked-0','r3-locked-1']){const node=document.querySelector<HTMLElement>(`[data-uid="${id}"]`);if(!node)continue;const canvas=Object.assign(document.createElement('canvas'),{width:200,height:300});canvas.className='d3-chest-lock';canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:8;pointer-events:none';node.append(canvas);this.layers.push(canvas);}
  const u=ease(750,1870,time);
  for(const canvas of this.layers){if(!canvas.isConnected){this.dispose();this.draw(time,variant);return;}const c=canvas.getContext('2d')!;c.clearRect(0,0,200,300);if(!u)continue;c.save();c.globalAlpha=Math.min(1,u*3);c.strokeStyle='#57452a';c.fillStyle='#ac8a4b';c.lineWidth=5;
   if(variant===1){for(const sign of [-1,1]){for(let i=0;i<12*u;i++){const t=i/11,x=sign===1?t*200:(1-t)*200,y=80+t*140;c.save();c.translate(x,y);c.rotate(sign*.59);c.beginPath();c.ellipse(0,0,13,6,0,0,Math.PI*2);c.stroke();c.strokeStyle='#d2b573';c.lineWidth=2;c.stroke();c.restore();}}}
   else{for(const sign of [-1,1]){const x=100+sign*(115-75*u);c.save();c.translate(x,150);c.rotate(-sign*(1-u)*.65);c.fillStyle='#9b7a3f';c.fillRect(-12,-57,24,114);c.strokeRect(-12,-57,24,114);for(const y of [-44,44]){c.beginPath();c.arc(0,y,3,0,Math.PI*2);c.fillStyle='#ddc694';c.fill();}c.restore();}c.fillStyle='#94723c';c.fillRect(48,139,104*u,22);c.strokeRect(48,139,104*u,22);}
   const close=ease(1360,2040,time);c.translate(100,151);c.strokeStyle='#ddc791';c.lineWidth=8;c.beginPath();c.arc(0,-18-(1-close)*28,17,Math.PI,0);c.lineTo(17,-1);c.stroke();const g=c.createLinearGradient(-28,-6,28,34);g.addColorStop(0,'#dcc386');g.addColorStop(.45,'#a58343');g.addColorStop(1,'#705331');c.fillStyle=g;c.fillRect(-29,-4,58,45);c.strokeStyle='#4d3c23';c.lineWidth=3;c.strokeRect(-29,-4,58,45);c.fillStyle='#3f301f';c.beginPath();c.arc(0,14,5,0,Math.PI*2);c.fill();c.fillRect(-2,15,4,12);c.restore();
  }
 }
 dispose(){for(const c of this.layers)c.remove();this.layers=[];}
}
