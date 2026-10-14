import { buildDewFront } from '../../ui/manaSpiritFront';
import * as T from 'three';
export const designs = [
  {id:'dew',name:'雫の灯',tag:'一体感 / ガラス',copy:'白い体に、透明な雫をひとつ。金属の台座をなくし、淡い青が内側から透ける静かなデザイン。'},
  {id:'moon',name:'三日月のゆりかご',tag:'軽やか / 銀',copy:'細い銀の三日月で、小さな光球を受け止める。左右に抜けを作り、柔らかい曲線でまとめたデザイン。'},
  {id:'book',name:'小さな魔導書',tag:'ビブリオン / 革と紙',copy:'赤い小さな本を胸元に。紙の重なり、留め具、青い栞を持つ、図書館の案内役らしいデザイン。'},
  {id:'leaves',name:'双葉のしるし',tag:'やさしさ / 翡翠',copy:'重なる二枚の葉と、小さな乳白色の実。葉脈と反りを持つ形で、穏やかな生き物らしさを加える。'},
  {id:'compass',name:'蒼銀のコンパス',tag:'探索 / 金属細工',copy:'薄い青い文字盤に、銀の方位針。小さな目盛りと段差を持つ、シーカーを案内する道具のデザイン。'},
] as const;
export type DesignId = typeof designs[number]['id'];

/** All five roots attach at the same chest location and follow the unchanged body. */
export function buildFront(id:DesignId, body:T.Group) {
  const root=new T.Group();root.position.set(0,-.34,.46);root.name='front-'+id;body.add(root);
  const add=(g:T.BufferGeometry,m:T.Material,x=0,y=0,z=0,parent:T.Object3D=root)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);parent.add(o);return o;};
  const mat=(color:number,metalness=0,roughness=.3)=>new T.MeshStandardMaterial({color,metalness,roughness});
  const silver=()=>mat(0xbccfd6,.88,.24), brass=()=>mat(0xb39a69,.8,.3);
  const shape=(s:T.Shape,depth=.025)=>new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:4,curveSegments:32,steps:1});
  const line=(pts:number[][],radius:number,material:T.Material,parent:T.Object3D=root)=>add(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p as [number,number,number]))),40,radius,8,false),material,0,0,0,parent);
  const sphere=(r:number,material:T.Material,x:number,y:number,z:number)=>add(new T.SphereGeometry(r,48,32),material,x,y,z);
  if(id==='dew'){body.remove(root);return buildDewFront(body);}
  if(id==='moon'){
    const crescent=new T.Shape();crescent.moveTo(.085,.2);crescent.bezierCurveTo(-.23,.24,-.31,-.13,-.055,-.211);crescent.bezierCurveTo(.077,-.25,.19,-.14,.195,-.035);crescent.bezierCurveTo(.094,-.153,-.035,-.123,-.085,-.032);crescent.bezierCurveTo(-.142,.07,-.05,.18,.085,.2);
    add(shape(crescent,.035),silver(),0,0,.025);
    const orb=sphere(.098,new T.MeshPhysicalMaterial({color:0xb9e8f5,roughness:.09,metalness:.04,transmission:.46,thickness:.18,ior:1.42,clearcoat:1,emissive:0x245979,emissiveIntensity:.08}),.045,.008,.092);
    orb.scale.z=.85;
    line([[-.08,-.16,.078],[-.14,-.07,.078],[-.145,.025,.078]],.007,mat(0x598394,.45,.28));
    sphere(.017,brass(),-.113,-.108,.09);
  }
  if(id==='book'){
    root.rotation.z=-.13;
    const rounded=(w:number,h:number,r:number)=>{const s=new T.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);return s;};
    const leather=new T.MeshPhysicalMaterial({color:0x6c2632,roughness:.56,clearcoat:.08});
    add(shape(rounded(.32,.385,.022),.012),leather,0,0,-.006);
    add(shape(rounded(.277,.34,.012),.064),mat(0xe9dec3,0,.72),.009,0,.005);
    add(shape(rounded(.32,.385,.022),.013),leather,0,0,.073);
    const spine=add(new T.CapsuleGeometry(.021,.31,8,16),mat(0x391c29,0,.52),-.151,0,.047);spine.scale.z=2.1;
    const gold=brass();
    line([[-.117,-.145,.098],[-.117,.144,.098],[.11,.144,.098],[.11,-.145,.098],[-.117,-.145,.098]],.0045,gold);
    for(const y of [-.11,.11])add(new T.BoxGeometry(.039,.012,.068),gold,-.141,y,.054);
    const clasp=add(shape(rounded(.07,.057,.01),.012),gold,.133,-.005,.098);clasp.rotation.y=-.16;
    const rune=new T.Shape();rune.moveTo(0,.067);rune.lineTo(.04,0);rune.lineTo(0,-.067);rune.lineTo(-.04,0);rune.closePath();add(shape(rune,.003),gold,0,.005,.098);
    for(const z of [.025,.042,.059])line([[.143,-.15,z],[.143,.15,z]],.0022,mat(0x9c8c72,0,.85));
    const ribbon=new T.Shape();ribbon.moveTo(-.027,0);ribbon.lineTo(.027,0);ribbon.lineTo(.023,-.10);ribbon.lineTo(0,-.077);ribbon.lineTo(-.024,-.10);ribbon.closePath();add(shape(ribbon,.004),mat(0x437c97,0,.6),.03,-.153,.047);
  }
  if(id==='leaves'){
    const leaf=(side:number,scale:number,angle:number)=>{
      const group=new T.Group();group.position.set(side*.055,-.09,.038);group.rotation.z=angle;group.scale.setScalar(scale);root.add(group);
      const positions:number[]=[],indices:number[]=[],rows=24,cols=12;
      for(let j=0;j<=rows;j++){const t=j/rows,w=Math.pow(Math.sin(Math.PI*t),.85)*.091;for(let i=0;i<=cols;i++){const u=i/cols*2-1;positions.push(u*w,t*.3,.055*Math.sin(t*Math.PI)+.027*(1-u*u)*Math.sin(t*Math.PI));}}
      for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i;indices.push(a,a+1,a+cols+2,a,a+cols+2,a+cols+1);}
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
      add(g,new T.MeshPhysicalMaterial({color:side<0?0x397f7c:0x69a79a,side:T.DoubleSide,roughness:.28,metalness:.12,clearcoat:.6}),0,0,0,group);
      const vein=mat(0xb4d5b3,.22,.38);line([[0,0,.004],[0,.10,.075],[0,.21,.068],[0,.295,.009]],.004,vein,group);
      for(const t of [.3,.5,.68])for(const s of [-1,1])line([[0,t*.3,.083],[s*.042,(t+.09)*.3,.065],[s*.065,(t+.14)*.3,.04]],.0018,vein,group);
    };
    leaf(-1,1.1,.64);leaf(1,1,-.5);
    line([[0,-.19,.075],[0,-.095,.087],[-.018,-.005,.08]],.009,mat(0x588878,.28,.4));
    const pearl=sphere(.063,new T.MeshPhysicalMaterial({color:0xeff3d9,roughness:.24,metalness:.04,clearcoat:.7}),0,-.15,.098);pearl.scale.z=.75;
  }
  if(id==='compass'){
    const steel=silver(),bronze=brass();
    const back=add(new T.CylinderGeometry(.208,.195,.043,64),steel,0,0,.027);back.rotation.x=Math.PI/2;
    const dial=add(new T.CircleGeometry(.185,64),mat(0x193c56,.3,.43),0,0,.052);
    dial.rotation.z=.08;
    add(new T.TorusGeometry(.188,.009,10,64),bronze,0,0,.057);
    for(let i=0;i<16;i++){
      const a=i*Math.PI/8,major=i%4===0,l=major?.031:.016;
      const tick=add(new T.BoxGeometry(major?.008:.004,l,.006),mat(0xb6cccb,.45,.4),Math.sin(a)*(.17-l/2),Math.cos(a)*(.17-l/2),.06);tick.rotation.z=-a;
    }
    for(let i=0;i<4;i++){
      const n=new T.Shape();n.moveTo(0,0);n.lineTo(-.035,.039);n.lineTo(0,i===0?.144:.105);n.lineTo(.035,.039);n.closePath();
      const needle=add(shape(n,.008),i%2===0?steel:mat(0x4b8c9e,.62,.22),0,0,.069);needle.rotation.z=i*Math.PI/2+.24;
    }
    sphere(.023,bronze,0,0,.096);
  }
  return root;
}
