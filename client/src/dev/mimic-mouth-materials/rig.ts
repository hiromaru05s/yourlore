import {MimicRig as ApprovedRig,pose,ease} from '../mimic-four/rig';
export {DURATION,ease} from '../mimic-four/rig';
export const patterns=[
 {name:'原画の牙',description:'不揃いな象牙色の牙。元絵に近い赤褐色の舌と控えめな濡れ艶。'},
 {name:'厚い骨牙',description:'厚い根元と湾曲した牙。骨の細かな筋、深い溝のある肉厚の舌。'},
 {name:'湿った口',description:'滑らかな牙と細かな湿り気。舌の粒状感と柔らかい反射を強調。'},
 {name:'噛み合う獣牙',description:'左右の長い牙と短い歯が噛み合う。厚い赤錆色の舌。'},
];
type Rect=[number,number,number,number];
const atlas:{file:string;upper:Rect;lower:Rect;tongue:Rect}[]=[
 {file:'01-reference-ivory',upper:[59,107,1136,230],lower:[53,449,1146,205],tongue:[397,701,466,513]},
 {file:'02-ridged-bone',upper:[65,90,1125,262],lower:[49,453,1157,194],tongue:[404,718,451,498]},
 {file:'03-moist-flesh',upper:[70,87,1118,240],lower:[65,420,1124,196],tongue:[430,661,395,532]},
 {file:'04-predator-fangs',upper:[50,84,1152,265],lower:[74,415,1104,230],tongue:[417,671,421,527]},
];
const images=atlas.map(a=>{const image=new Image();image.src=`/art/vfx/mimic-mouth-r2/${a.file}.png`;return image;});
const loaded=Promise.all(images.map(i=>i.decode()));
export class MimicRig extends ApprovedRig{
 private surface:HTMLCanvasElement;
 constructor(card:HTMLElement){super(card);this.surface=this.node.querySelector('canvas')!;}
 override async ready(){await Promise.all([super.ready(),loaded]);}
 override draw(time:number,material:number,reduced=false){
  // Every transform is the approved third motion, including jaw tilt and timing.
  super.draw(time,3,reduced);this.node.dataset.material=String(material);
  if(material===0){return;}
  this.paintMouth(time,material,reduced);
 }
 private paintMouth(time:number,material:number,reduced:boolean){
  const p=pose(time,3,reduced),c=this.surface.getContext('2d')!,a=atlas[material-1],image=images[material-1];
  c.setTransform(2,0,0,2,60,120);c.clearRect(-30,-60,240,400);if(p.gap<.05||!image.complete)return;
  const edge=(x:number,upper:boolean)=>{const angle=(upper?p.topAngle:p.bottomAngle)*Math.PI/180;return{x:90+(x-90)*Math.cos(angle),y:140+(upper?-p.gap*p.upper:p.gap*(1-p.upper))+(x-90)*Math.sin(angle)};};
  const tl=edge(3,true),tr=edge(177,true),bl=edge(3,false),br=edge(177,false),mid=(tl.y+tr.y+bl.y+br.y)/4;
  // Same cavity silhouette, palate and palette as the approved third candidate.
  c.save();c.beginPath();c.moveTo(tl.x,tl.y);c.lineTo(tr.x,tr.y);c.bezierCurveTo(170,mid-5,170,mid+7,br.x,br.y);c.lineTo(bl.x,bl.y);c.bezierCurveTo(9,mid+7,9,mid-5,tl.x,tl.y);c.closePath();
  const cavity=c.createRadialGradient(91,mid-6,5,90,mid,104);cavity.addColorStop(0,'#080507');cavity.addColorStop(.47,'#190b10');cavity.addColorStop(.77,'#472021');cavity.addColorStop(1,'#886142');c.fillStyle=cavity;c.fill();c.clip();c.globalAlpha=p.open;
  for(let i=0;i<4;i++){c.strokeStyle=`rgba(126,67,59,${.3-i*.045})`;c.lineWidth=2.8-i*.4;c.beginPath();c.ellipse(90,mid+11,46-i*8,Math.max(3,p.gap*.25-i*3),0,Math.PI,Math.PI*2);c.stroke();}
  const tongueWidth=37,tongueTop=mid+p.gap*.035-Math.sin(ease(1060,1500,time)*Math.PI)*p.roar*4;
  const tongueBottom=br.y+12,tongueHeight=Math.max(1,tongueBottom-tongueTop);
  c.save();c.translate(90,tongueBottom);c.scale(1,-1);c.drawImage(image,...a.tongue,-tongueWidth,0,tongueWidth*2,tongueHeight);c.restore();
  // Each gum-and-fang strip is rigidly attached to its original jaw seam.
  for(const upper of [true,false]){
   const rect=upper?a.upper:a.lower,angle=(upper?p.topAngle:p.bottomAngle)*Math.PI/180;
   const naturalHeight=180*rect[3]/rect[2];
   c.save();c.translate(90,140+(upper?-p.gap*p.upper:p.gap*(1-p.upper)));c.rotate(angle);
   c.drawImage(image,...rect,-90,upper?-7:-naturalHeight+7,180,naturalHeight);
   c.restore();
   const left=edge(0,upper),right=edge(180,upper);c.beginPath();c.moveTo(left.x,left.y);c.lineTo(right.x,right.y);c.strokeStyle='#382718';c.lineWidth=3;c.stroke();c.strokeStyle='#ccac70';c.lineWidth=.8;c.stroke();
   for(const x of [7,173]){const q=edge(x,upper);c.fillStyle='#e4c38e';c.fillRect(q.x-1,q.y-1,2,2);}
  }
  c.restore();
 }
}
