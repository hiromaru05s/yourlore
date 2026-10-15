import { buildMoonRabbit } from '../spirit-rabbit/rig';
import * as T from 'three';
export const designs=[
 {id:'round',name:'まるい雲',tag:'球体 / 小さなひれ',copy:'頭の尖りをなくし、ふっくら丸い輪郭に。小さなひれと丸い底で、手のひらに収まるような親しみやすさ。'},
 {id:'ears',name:'月うさぎ',tag:'縦長 / 二本の耳',copy:'滑らかな二本の耳が、待機・笑顔・眠気に合わせて動きます。笑うと手をパタパタ、眠ると耳もしょんぼり。'},
 {id:'manta',name:'白いエイ',tag:'横長 / 大きな翼',copy:'低い頭と幅広い翼、下へ伸びる細い尾。大きな曲線で横へ広がり、パタパタ飛ぶ姿が主役になる形。'},
 {id:'bell',name:'白いケープ',tag:'釣鐘 / 波打つ裾',copy:'小さな頭から裾へ広がるケープの形。三つの柔らかな裾と長い袖で、ふわりと漂う案内役の印象に。'},
 {id:'comet',name:'流れる彗星',tag:'非対称 / 長い尾',copy:'横へ流れる頭の先と、反対へ曲がる長い尾。左右非対称のS字で、マナが一続きに流れているような形。'},
] as const;
export type DesignId=typeof designs[number]['id'];

/** Only outer form changes; face, dew and motion are mounted by the shared renderer. */
export function buildForm(id:DesignId,body:T.Group,pearl:T.Material,blue:T.Material){
 if(id==='ears')return buildMoonRabbit(body,pearl);
 const add=(g:T.BufferGeometry,m:T.Material,x=0,y=0,z=0,parent:T.Object3D=body)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);parent.add(o);return o;};
 const revolve=(points:number[][],depth:number,deform?:(x:number,y:number,z:number)=>[number,number,number])=>{
  const profile=new T.SplineCurve(points.map(([x,y])=>new T.Vector2(x,y))).getPoints(100).map(p=>new T.Vector2(Math.max(0,p.x),p.y));
  const g=new T.LatheGeometry(profile,96);const p=g.getAttribute('position');
  for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i)*depth;if(deform)[x,y,z]=deform(x,y,z);p.setXYZ(i,x,y,z);}g.computeVertexNormals();return add(g,pearl);
 };
 const wing=(side:number,kind:string)=>{
  const group=new T.Group();body.add(group);group.position.set(side*(kind==='wide'?.43:kind==='cape'?.4:.48),kind==='cape'?.13:-.03,0);
  const s=new T.Shape();s.moveTo(0,.12);
  if(kind==='wide'){s.bezierCurveTo(side*.32,.18,side*.69,.30,side*.93,.14);s.bezierCurveTo(side*.79,-.02,side*.57,-.45,side*.10,-.38);s.quadraticCurveTo(-side*.02,-.2,0,.12);}
  else if(kind==='cape'){s.bezierCurveTo(side*.2,.07,side*.42,-.38,side*.38,-.69);s.bezierCurveTo(side*.13,-.62,side*.04,-.41,-side*.07,-.23);s.closePath();}
  else if(kind==='stream'){s.bezierCurveTo(side*.2,.2,side*.39,.19,side*.51,.1);s.bezierCurveTo(side*.28,-.03,side*.28,-.27,side*.02,-.3);s.closePath();}
  else{s.bezierCurveTo(side*.28,.17,side*.36,-.06,side*.24,-.21);s.bezierCurveTo(side*.11,-.3,side*.01,-.24,0,-.1);s.closePath();}
  add(new T.ExtrudeGeometry(s,{depth:.085,bevelEnabled:true,bevelSegments:6,bevelSize:.035,bevelThickness:.035,curveSegments:36}),pearl,0,0,0,group);
  if(kind==='wide'){const fold=add(new T.SphereGeometry(1,40,24),blue,side*.32,-.11,-.055,group);fold.scale.set(.27,.15,.025);fold.rotation.z=side*.2;}
  return group;
 };
 let kind='small';
 if(id==='round')revolve([[0,-.70],[.35,-.61],[.60,-.36],[.70,.02],[.64,.36],[.4,.64],[0,.77]],.70);
 if(id==='manta'){
  kind='wide';revolve([[0,-.68],[.21,-.55],[.48,-.32],[.63,.02],[.6,.35],[.37,.55],[0,.64]],.78);
  revolve([[0,-1.01],[.07,-.85],[.14,-.62],[.18,-.42],[0,-.35]],.75);
 }
 if(id==='bell'){
  body.getObjectByName('front-dew')!.position.z=.59;
  kind='cape';revolve([[0,-.77],[.4,-.75],[.64,-.59],[.66,-.45],[.53,-.07],[.50,.30],[.38,.57],[0,.77]],.85,(x,y,z)=>{
   const skirt=Math.max(0,Math.min(1,(-y-.17)/.42));const theta=Math.atan2(z/.85,x);return [x,y+skirt*.095*Math.cos(theta*6),z];
  });
 }
 if(id==='comet'){
  kind='stream';revolve([[0,-1.07],[.085,-.91],[.18,-.65],[.43,-.39],[.57,-.04],[.57,.3],[.37,.58],[.17,.78],[.04,.95],[0,1.01]],.83,(x,y,z)=>[x+(y>.4?Math.pow((y-.4)/.61,2)*.43:y<-.4?-Math.pow((-y-.4)/.67,2)*.31:0),y,z]);
 }
 return {left:wing(-1,kind),right:wing(1,kind)};
}
