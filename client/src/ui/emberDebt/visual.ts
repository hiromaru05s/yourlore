type C=CanvasRenderingContext2D;
export type Rect={x:number;y:number;w:number;h:number};
const ease=(t:number,a:number,b:number)=>{const u=Math.max(0,Math.min(1,(t-a)/(b-a)));return u*u*(3-2*u);};
// Exact selected revision-3 / 02 draw, with one shared decoded atlas.
export function drawEmber(c:C,sheet:HTMLImageElement,p:Rect,t:number,hit:number,size:number,reduced:boolean){
 const age=t-(hit-300);if(age<=0||age>=1040)return;
 const scale=Math.min(p.w,p.h)*.50*size;
 const a=ease(age,0,210)*(1-ease(age,620,1040));
 const frame=Math.min(48,Math.max(0,Math.round((reduced?300:age)/1040*48)));
 const vertical=Math.min(scale,Math.max(scale*.55,(p.y+scale*.70-5)/2.7));
 const fw=sheet.naturalWidth/7;
 const sx=frame%7*fw,sy=Math.floor(frame/7)*344,w=scale*3.3*1.65,h=vertical*4.5;
 const x=p.x-w*.5+w*((320-fw)/640),y=p.y+scale*.70-h*.76;
 const dw=w*fw/320,dh=h*344/384;
 c.save();
 // Local radiance stays near the character; it never connects to the card.
 const light=c.createRadialGradient(p.x,p.y,scale*.1,p.x,p.y,scale*1.4);
 light.addColorStop(0,`rgba(255,151,38,${a*.25})`);light.addColorStop(.45,`rgba(238,74,9,${a*.11})`);light.addColorStop(1,'rgba(238,74,9,0)');
 c.fillStyle=light;c.fillRect(p.x-scale*1.4,p.y-scale*1.4,scale*2.8,scale*2.8);
 c.globalAlpha=reduced?a:1;
 c.drawImage(sheet,sx,sy,fw,344,x,y,dw,dh);
 // Restrained optical bloom, retaining the transparent folds of the volume.
 c.globalCompositeOperation='screen';c.globalAlpha=(reduced?a:1)*.16;c.filter=`blur(${Math.max(.6,scale*.045)}px)`;
 c.drawImage(sheet,sx,sy,fw,344,x,y,dw,dh);
 c.restore();
}
