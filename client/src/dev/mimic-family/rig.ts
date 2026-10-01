import {FamilyMatter} from './matter';
import {familyPose,clock} from './motion';
import {ease} from '../mimic-four/rig';
import {currentId,duration} from './catalog';
export {patterns} from './catalog';
import {MimicRig as ApprovedRig} from '../mimic-four/rig';
export {ease} from '../mimic-four/rig';
export const DURATION=duration[currentId];
const cavityImage=new Image();cavityImage.src=currentId==='ORIGIN_MIMIC'?'/art/vfx/mimic-family/amber-throat.png':'/art/vfx/mimic-cavity-r3/02-moist-cheeks.png';
type Rect=[number,number,number,number];
const atlas:{file:string;upper:Rect;lower:Rect;tongue:Rect}[]=[
 {file:'01-reference-ivory',upper:[59,107,1136,230],lower:[53,449,1146,205],tongue:[397,701,466,513]},
 {file:'02-ridged-bone',upper:[65,90,1125,262],lower:[49,453,1157,194],tongue:[404,718,451,498]},
 {file:'03-moist-flesh',upper:[70,87,1118,240],lower:[65,420,1124,196],tongue:[430,661,395,532]},
 {file:'04-predator-fangs',upper:[50,84,1152,265],lower:[74,415,1104,230],tongue:[417,671,421,527]},
];
const images=atlas.map(a=>{const image=new Image();image.src=`/art/vfx/mimic-mouth-r2/${a.file}.png`;return image;});
const amberFangs=new Image();amberFangs.src='/art/vfx/mimic-family/amber-fangs.png';
const loaded=Promise.all([...images,cavityImage,amberFangs].map(i=>i.decode()));
export class MimicRig extends ApprovedRig{
 private surface:HTMLCanvasElement;private tongues:FamilyMatter;private variant=1;private secondLid:HTMLElement|null=null;
 constructor(card:HTMLElement,variant=1){super(card);this.variant=variant;this.tongues=new FamilyMatter(currentId,variant);this.surface=this.node.querySelector('canvas')!;this.surface.parentElement!.append(this.tongues.canvas);if(currentId==='MIMIC_KING2'&&variant===2){this.secondLid=this.surface.parentElement!.children[1].cloneNode(true)as HTMLElement;this.secondLid.style.zIndex='1';this.secondLid.style.clipPath='inset(52px 16px 0px 16px)';this.surface.parentElement!.append(this.secondLid);}}
 override async ready(){await Promise.all([super.ready(),loaded,this.tongues.ready]);}
 override dispose(){this.tongues.dispose();super.dispose();}

 override draw(time:number,_material:number,reduced=false){
  super.draw(clock(time,currentId),3,reduced);this.node.dataset.material='2';
  const p=familyPose(time,currentId,this.variant,reduced),body=this.surface.parentElement!,top=body.children[1]as HTMLElement,bottom=body.children[2]as HTMLElement,shadow=this.node.firstElementChild as HTMLElement;
  this.node.dataset.open=String(p.open);this.node.dataset.card=currentId;
  body.style.transform=`translate(${p.dx}px,${p.dy}px) rotate(${p.tilt}deg) scale(${p.scale},${p.scale*p.squash})`;
  top.style.transform=`translateY(${-p.gap*p.upper}px) rotate(${p.topAngle}deg) scaleY(${1-p.open*.08})`;
  bottom.style.transform=`translateY(${p.gap*(1-p.upper)}px) rotate(${p.bottomAngle}deg) scaleY(${1-p.open*.035})`;
  shadow.style.transform=`scale(${1+p.open*.27},${1-p.open*.28})`;shadow.style.opacity=String(.5+p.open*.22);
  this.paintMouth(time,reduced);this.tongues.draw(clock(time,currentId),p.gap,reduced);
  if(this.secondLid){this.secondLid.style.visibility=p.open>.001?'visible':'hidden';this.secondLid.style.transform=`translateY(${-p.gap*p.upper-16*p.open}px) rotate(${p.topAngle-5*p.open}deg) scaleY(${1-p.open*.12})`;}

 }
 private paintMouth(time:number,reduced:boolean){
  const p=familyPose(time,currentId,this.variant,reduced),c=this.surface.getContext('2d')!,a=currentId==='ORIGIN_MIMIC'?{upper:[40,215,1175,304]as Rect,lower:[37,770,1183,280]as Rect}:atlas[currentId==='MIMIC_LORD'?0:3],image=currentId==='ORIGIN_MIMIC'?amberFangs:images[currentId==='MIMIC_LORD'?0:3];
  c.setTransform(2,0,0,2,60,120);c.clearRect(-30,-60,240,400);if(p.gap<.05||!image.complete)return;
  const edge=(x:number,upper:boolean)=>{const angle=(upper?p.topAngle:p.bottomAngle)*Math.PI/180;return{x:90+(x-90)*Math.cos(angle),y:140+(upper?-p.gap*p.upper:p.gap*(1-p.upper))+(x-90)*Math.sin(angle)};};
  const tl=edge(3,true),tr=edge(177,true),bl=edge(3,false),br=edge(177,false),mid=(tl.y+tr.y+bl.y+br.y)/4;
  // Preserve the approved aperture silhouette; only its interior paint changes.
  c.save();c.beginPath();c.moveTo(tl.x,tl.y);c.lineTo(tr.x,tr.y);c.bezierCurveTo(170,mid-5,170,mid+7,br.x,br.y);c.lineTo(bl.x,bl.y);c.bezierCurveTo(9,mid+7,9,mid-5,tl.x,tl.y);c.closePath();
   // The existing aperture is unchanged. Warp the painted interior with both jaw edges.
   c.clip();
   const texture=cavityImage,strips=90;
   for(let i=0;i<strips;i++){
    const x=i*180/strips,w=180/strips;
    const top=edge(x,true),bottom=edge(x,false),nextTop=edge(x+w,true),nextBottom=edge(x+w,false);
    const upperY=Math.min(top.y,nextTop.y)-2,lowerY=Math.max(bottom.y,nextBottom.y)+2;
    c.drawImage(texture,i*texture.width/strips,0,texture.width/strips,texture.height,x-.3,upperY,w+.6,Math.max(.1,lowerY-upperY));
   }
   if(currentId==='ORIGIN_MIMIC'){
    const t=clock(time,currentId),v=this.variant;
    const awaken=ease(v===3?900:720,v===2?1510:1240,t)*(1-ease(2030,2330,t));
    const pulse=awaken*(.64+.36*Math.sin(t*(v===2?.010:.006))**2);
    // Modulate the painted core and folded walls in-place, within the real jaw aperture.
    c.fillStyle=`rgba(12,3,0,${.42*(1-awaken)})`;c.fillRect(0,0,180,300);
    const light=c.createRadialGradient(90,mid,2,90,mid,75);light.addColorStop(0,`rgba(255,191,64,${pulse*.38})`);light.addColorStop(.35,`rgba(228,111,23,${pulse*.2})`);light.addColorStop(1,'rgba(100,30,0,0)');
    c.globalCompositeOperation='screen';c.fillStyle=light;c.fillRect(0,0,180,300);c.globalCompositeOperation='source-over';
   }
   c.globalAlpha=p.open;
  // Each gum-and-fang strip is rigidly attached to its original jaw seam.
  for(const upper of [true,false]){
   const rect=upper?a.upper:a.lower,angle=(upper?p.topAngle:p.bottomAngle)*Math.PI/180;
   const naturalHeight=180*rect[3]/rect[2]*(currentId==='MIMIC_LORD'?1:1.1);
   c.save();c.translate(90,140+(upper?-p.gap*p.upper:p.gap*(1-p.upper)));c.rotate(angle);
   c.drawImage(image,...rect,-90,upper?-7:-naturalHeight+7,180,naturalHeight);
   c.restore();
   const left=edge(0,upper),right=edge(180,upper);c.beginPath();c.moveTo(left.x,left.y);c.lineTo(right.x,right.y);c.strokeStyle='#382718';c.lineWidth=3;c.stroke();c.strokeStyle='#ccac70';c.lineWidth=.8;c.stroke();
   for(const x of [7,173]){const q=edge(x,upper);c.fillStyle='#e4c38e';c.fillRect(q.x-1,q.y-1,2,2);}
  }
  c.restore();
 }
}
