import * as T from 'three';
const sat=(v:number)=>Math.max(0,Math.min(1,v));
const noise=(n:number)=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
/** Soft, irregular billows: smooth value noise at three scales, premultiplied by a feathered silhouette. */
export function dustTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d')!,pixels=ctx.createImageData(128,128);
 const value=(x:number,y:number,scale:number)=>{x/=scale;y/=scale;const ix=Math.floor(x),iy=Math.floor(y),u=x-ix,v=y-iy,a=u*u*(3-2*u),b=v*v*(3-2*v);return T.MathUtils.lerp(T.MathUtils.lerp(noise(ix+iy*157),noise(ix+1+iy*157),a),T.MathUtils.lerp(noise(ix+(iy+1)*157),noise(ix+1+(iy+1)*157),a),b);};
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  const n=value(x,y,29)*.6+value(x,y,11)*.28+value(x,y,4)*.12;
  const radius=Math.hypot((x-64)/64,(y-64)/64),alpha=sat((1-radius)*2.2)*sat((n-.18)*1.8);
  const i=(x+y*128)*4;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=255;pixels.data[i+3]=Math.round(alpha*210);
 }
 ctx.putImageData(pixels,0,0);return new T.CanvasTexture(canvas);
}
export const dustDuration=(heavy:boolean)=>heavy?1900:1250;
export function dustPose(age:number,index:number,heavy:boolean,width:number){
 const grit=index>=32,seed=noise(index),delay=grit?0:(index%4)*.035;
 const t=sat((age-delay)/(1-delay)),spread=1-(1-t)**3,side=index%2?1:-1;
 const scale=width/90,power=heavy?1:.58;
 const x=side*(width*.35+spread*(28+seed*75)*scale*power);
 const base=Math.sin(index*2.399)*width*.11;
 if(grit){const end=.34+seed*.26,p=sat(age/end),hop=Math.max(0,4*p*(1-p));return {x:side*(width*.35+p*(30+seed*80)*scale*power),y:base+hop*(7+seed*23)*scale,z:0,size:(1+seed*1.3)*scale,opacity:age<end?(1-p)*.72:0,rotation:index+p*8};}
 return {x,y:base+Math.sin(t*Math.PI*.85)*(9+seed*20)*scale*power,z:0,
   size:(18+seed*25+spread*32)*scale*power,opacity:age<delay?0:Math.sin(Math.min(1,t/.08)*Math.PI/2)*(1-t)**1.35*(heavy?.38:.21),rotation:index*.7+t*(seed-.5)*.5};
}
export function createDust(map:T.Texture,heavy:boolean){
 const group=new T.Group();
 for(let i=0;i<(heavy?64:42);i++){
  const grit=i>=32;
  const m=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:grit?null:map,color:grit?0x8c785b:i%3?0xb4a38a:0x8c7c65,transparent:true,opacity:0,depthWrite:false,toneMapped:false}));
  group.add(m);
 }
 return group;
}
