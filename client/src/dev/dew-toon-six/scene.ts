import {accent} from './accent';
import {Glass} from './glass';
import {Renderer as OldRenderer,loadAssets,smooth,clamp} from '../dew-grant-six/renderer';
import {studies} from '../dew-grant-six/catalog';
import {contact,duration} from './catalog';
export {loadAssets};export type View='material'|'flow';
export class LiquidScene{
 glass=new Glass();base:OldRenderer;bg=document.createElement('canvas');disposed=false;
 constructor(assets:Awaited<ReturnType<typeof loadAssets>>){this.base=new OldRenderer(assets);this.base.surface.dispose();this.bg.width=640;this.bg.height=370;}
 draw(canvas:HTMLCanvasElement,index:number,ms:number,view:View,dark=false,old=false,reduced=false,side=0,shape=0){const c=this.bg.getContext('2d')!,t=clamp(ms/duration);c.setTransform(1,0,0,1,0,0);c.textAlign='left';c.textBaseline='alphabetic';c.clearRect(0,0,640,370);
 if(view==='flow'){this.base.draw(this.bg,studies[3],0,dark,side,true);}
 else{const g=c.createLinearGradient(0,0,640,370);g.addColorStop(0,dark?'#18252b':'#f2efdf');g.addColorStop(.5,dark?'#34484d':'#dfdfcf');g.addColorStop(1,dark?'#13282f':'#cbd6cc');c.fillStyle=g;c.fillRect(0,0,640,370);
 c.save();c.translate(320,190);c.rotate(-.12);c.strokeStyle=dark?'#819c9440':'#5f777960';c.lineWidth=1;for(let k=-4;k<5;k++){c.beginPath();c.moveTo(-320,k*35);c.lineTo(320,k*35);c.stroke();}c.fillStyle=dark?'#9ec4b1':'#657c68';c.font='italic 48px Georgia';c.textAlign='center';c.fillText('L O R E',0,12);c.font='12px Georgia';c.fillText('B I B L I O N  /  0 8',0,38);c.restore();
 const sh=c.createRadialGradient(328,310,3,328,310,100);sh.addColorStop(0,dark?'#00000058':'#19443e33');sh.addColorStop(1,'#143c3300');c.save();c.translate(0,187);c.scale(1,.4);c.fillStyle=sh;c.fillRect(200,180,250,250);c.restore();c.fillStyle=dark?'#a4c0b4':'#657a70';c.font='10px system-ui';c.fillText('屈折と反射を拡大比較',23,30);c.fillText('背景の文字・線が、液体の厚みで曲がります',23,345);}
 let x=320,y=174,extent=270,angle=0,phase=Math.min(ms,duration)/duration*Math.PI*2;
 if(view==='flow'){const travel=smooth(.12,.69,t),u=travel;x=148+(485-148)*u;y=184+(116-184)*u-Math.sin(Math.PI*u)*86;extent=(48+Math.sin(Math.PI*u)*18)*smooth(0,.10,t)*(1-smooth(.72,.83,t));phase=ms/720;angle=Math.atan2(-68-Math.cos(Math.PI*u)*Math.PI*86,337);
  if(t<.18&&!reduced){c.save();c.beginPath();c.rect(76,118,100,145);c.clip();c.globalAlpha=Math.sin(Math.PI*clamp(t/.18))*.18;c.fillStyle='#dbf4e5';c.fillRect(76,118,100,145);c.restore();}
  // The badge is a stable destination. Only its existing count changes at contact.
  if(ms>=contact){c.drawImage(this.base.assets.dew,485-66,116-66,132,132);this.base.count(c,studies[3],studies[3].duration,485,116,132);}
 }
 const out=canvas.getContext('2d')!;out.setTransform(canvas.width/640,0,0,canvas.height/370,0,0);out.clearRect(0,0,640,370);out.drawImage(this.bg,0,0);
 if(reduced&&view==='flow')return;
 if(extent<.4)return;
 if(!old)accent(out,index,x,y,extent,phase,false,angle);
 const im=this.glass.draw(this.bg,x,y,extent,shape,reduced?1:phase,dark,view==='material'?(canvas.width>800?600:240):180,old?-1:index);if(im)out.drawImage(im,x-extent/2,y-extent/2,extent,extent);else{out.fillStyle=dark?'#a7cdbd':'#276456';out.font='13px system-ui';out.fillText('WebGLが必要です。比較動画をご覧ください。',150,190);}
 if(!old)accent(out,index,x,y,extent,phase,true,angle);
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.glass.dispose();this.base.dispose();}
}
