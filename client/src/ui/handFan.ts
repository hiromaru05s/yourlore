/** Bottom-center pivots lie on one circle, rather than rotating a flat row. */
export function handFan(count:number,width:number,maxWidth:number,maxAngle=24){
 const n=Math.max(0,count),span=Math.max(width,Math.min(maxWidth,width+(n-1)*width*.56));
 const sweep=n<=1?0:Math.min(maxAngle,(n-1)*4.5),half=sweep*Math.PI/360;
 const radius=half>0?(span-width)/(2*Math.sin(half)):0;
 const cards=Array.from({length:n},(_,i)=>{const a=n<=1?0:(i/(n-1)-.5)*sweep,rad=a*Math.PI/180;return {x:radius*Math.sin(rad),y:radius*(1-Math.cos(rad)),angle:a};});
 return {width:n?span:0,cards};
}
