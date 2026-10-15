import * as T from 'three';
import {ease,mix} from './catalog';import {wing,mesh,plate,tube,dragonHead,lance,breastplate,bronze,gold,iron,enamel,bone,ember} from './geometry';
export type Origins={dragon:T.Vector3;mate:T.Vector3;target:T.Vector3};
export interface Rig{root:T.Group;update(t:number,o:Origins,knight:boolean):void;}
const at=(g:T.Object3D,a:T.Vector3,b:T.Vector3,u:number)=>g.position.copy(a).lerp(b,u);
export class Wings implements Rig{
 root=new T.Group(); wings=[wing(-1),wing(1)];armor=breastplate();spear=lance();
 constructor(){this.wings.forEach(w=>this.root.add(w));this.root.add(this.armor,this.spear);}
 update(t:number,o:Origins,knight:boolean){const grow=ease(200,860,t),travel=ease(600,1250,t),hug=ease(1170,1590,t),open=ease(1690,2000,t),sink=ease(2130,2670,t),s=1-sink;
 this.root.visible=t>200&&t<2670;
 this.wings.forEach((w,i)=>{const dir=i?1:-1;at(w,o.dragon,o.target,travel);w.position.x+=dir*13*travel;w.position.z+=5+35*grow+28*Math.sin(travel*Math.PI)-35*sink;w.scale.set(dir*grow*s,grow*s,Math.max(.025,grow*s));w.rotation.y=dir*(-.12-1.35*hug+1.6*open);w.rotation.z=dir*(.28*(1-travel)-.1*open);});
 at(this.armor,o.mate,o.target,ease(700,1500,t));this.armor.position.z+=12+40*grow-49*sink;this.armor.scale.setScalar(grow*s*(knight?1.12:.9));this.armor.rotation.z=.2*(1-travel);
 this.spear.position.copy(this.armor.position);this.spear.position.x+=43*travel;this.spear.position.z+=3;this.spear.scale.setScalar(grow*s*.65);this.spear.rotation.z=-.2;
 }
}
export class Forge implements Rig{
 root=new T.Group();tiles:T.Group[]=[];heat:T.Mesh[]=[];
 constructor(){for(let i=0;i<30;i++){const g=new T.Group(),dragon=i%2===0;const outline=dragon?[[-22,17],[0,25],[22,17],[19,-6],[0,-25],[-19,-6]]:[[-22,23],[18,23],[23,13],[20,-22],[-19,-22],[-23,-10]];plate(outline,4,dragon?enamel:iron,g);const inner=plate(outline.map(([x,y])=>[x*.8,y*.8]),1.2,dragon?bronze:bone,g);inner.position.z=5;tube([[-15,13,7],[0,18,8],[15,13,7]],.8,gold,g);const seam=mesh(new T.BoxGeometry(27,1.5,1),ember,g,0,-12,7);this.heat.push(seam);this.root.add(g);this.tiles.push(g);}}
 update(t:number,o:Origins,knight:boolean){this.root.visible=t>150&&t<2670;for(let i=0;i<30;i++){const g=this.tiles[i],row=Math.floor(i/5),col=i%5,lag=(5-row)*31+(col%2)*24;const grow=ease(170+lag,580+lag,t),peel=ease(430+lag,900+lag,t),lock=ease(1050+lag,1650+lag,t),sink=ease(2150+lag*.35,2610+lag*.2,t);const src=i%2===0?o.dragon:o.mate;g.position.copy(src);g.position.x+=(col-2)*24;g.position.y+=(row-2.5)*26;
 const end=o.target.clone().add(new T.Vector3((col-2)*28,(row-2.5)*34,5));g.position.lerp(end,lock);g.position.z+=Math.sin(peel*Math.PI*.6)*58*(1-lock)+Math.sin(lock*Math.PI)*24+6*(1-sink);g.rotation.set((1-lock)*peel*(row%2?-.65:.45),(1-lock)*peel*(col-2)*.26,Math.sin(peel*Math.PI)*(1-lock)*.2*(i%2?1:-1));g.scale.set(.67*grow*(1-sink),.8*grow*(1-sink),Math.max(.001,grow*(1-sink)));g.visible=sink<1;this.heat[i].scale.x=(1-ease(1910+lag,2340+lag,t))*(knight?1:.75);}}
}
export class Spiral implements Rig{
 root=new T.Group();vertebrae:T.Group[]=[];head=dragonHead();spear=lance();
 constructor(){for(let i=0;i<38;i++){const g=new T.Group();const r=9*(1-i/46);const body=mesh(new T.SphereGeometry(r,8,6),enamel,g);body.scale.set(1,1.18,.78);for(const side of [-1,0,1]){const p=plate([[-r*.6,2],[0,r],[r*.6,2],[0,-r]],1.3,side===0?bronze:iron,g);p.position.set(side*r*.6,0,r*.62);p.rotation.y=side*.65;}const fin=plate([[-2,0],[0,11],[3,0]],1,bone,g);fin.rotation.x=Math.PI/2;fin.position.z=r*.8;this.vertebrae.push(g);this.root.add(g);}this.root.add(this.head,this.spear);}
 update(t:number,o:Origins,knight:boolean){this.root.visible=t>170&&t<2990;const rise=ease(170,700,t),coil=ease(620,1650,t),strike=ease(2110,2510,t),absorb=ease(2510,2970,t),travel=ease(380,1240,t);
 const center=o.dragon.clone().lerp(o.target,travel);center.z+=55*rise;
 for(let i=0;i<38;i++){const u=i/37,tail=ease(190+i*9,650+i*9,t),ang=-Math.PI*.3-u*Math.PI*(.35+coil*1.3)+coil*Math.PI*1.6;const rad=(75-24*u)*(1-absorb);const p=new T.Vector3(Math.cos(ang)*rad,Math.sin(ang)*rad*1.25,Math.sin(u*Math.PI)*35+14);p.multiplyScalar(rise);const g=this.vertebrae[i];g.position.copy(center).add(p);g.position.lerp(o.target,absorb);g.rotation.z=ang+Math.PI/2;g.scale.setScalar(tail*(1-absorb)*(1-.3*u));}
 const head=this.vertebrae[0];this.head.position.copy(head.position);this.head.rotation.z=head.rotation.z;this.head.scale.setScalar(rise*(1-absorb)*1.1);
 at(this.spear,o.mate,o.target,ease(470,1350,t));this.spear.position.z+=mix(20,125,rise)-120*strike;this.spear.rotation.x=-.5*rise*(1-strike);this.spear.rotation.z=.8*(1-coil);this.spear.scale.setScalar(rise*(1-absorb)*(knight?1.15:1));
 }
}
export class Impression implements Rig{
 root=new T.Group();lower=new T.Group();upper=new T.Group();emboss:T.Object3D[]=[];
 constructor(){for(const [idx,g]of [this.lower,this.upper].entries()){plate([[-77,-112],[-77,112],[-65,122],[65,122],[77,112],[77,-112],[65,-122],[-65,-122]],6,idx?bronze:iron,g);plate([[-69,-113],[-69,113],[69,113],[69,-113]],1,idx?iron:enamel,g).position.z=7;
 for(const side of [-1,1]){tube([[side*62,-107,9],[side*62,107,9]],1.4,gold,g);for(let j=0;j<8;j++)plate([[0,0],[3,4],[0,8],[-3,4]],1,gold,g).position.set(side*70,-99+j*28,9);}
 this.root.add(g);}
 const head=dragonHead();head.position.set(0,49,16);head.scale.setScalar(1.7);this.lower.add(head);this.emboss.push(head);
 for(const s of [-1,1]){const w=wing(s);w.scale.multiplyScalar(.39);w.position.set(s*6,-30,12);this.lower.add(w);this.emboss.push(w);}
 const armor=breastplate();armor.position.set(0,15,13);armor.scale.setScalar(1.4);this.upper.add(armor);this.emboss.push(armor);
 for(const s of [-1,1]){const l=lance();l.scale.setScalar(.72);l.position.set(s*19,0,11);l.rotation.z=s*.26;this.upper.add(l);this.emboss.push(l);}
 }
 update(t:number,o:Origins,knight:boolean){this.root.visible=t>220&&t<2460;const grow=ease(220,650,t),slide=ease(670,1300,t),compress=ease(1690,1980,t),sink=ease(2040,2440,t);at(this.lower,o.dragon,o.target,slide);at(this.upper,o.mate,o.target,slide);
 this.lower.position.z+=3+12*grow*(1-compress);this.upper.position.z+=3+grow*(knight?115:100)*(1-compress);this.lower.rotation.z=-.055*Math.sin(slide*Math.PI);this.upper.rotation.z=.08*Math.sin(slide*Math.PI);
 for(const g of [this.lower,this.upper]){g.scale.set(grow,grow*(1-sink),Math.max(.001,grow*(1-sink)));g.position.y+=122*sink;}
 // The pressure plate compresses into the face, never tips the card on its edge.
 this.emboss.forEach(e=>e.scale.z=Math.max(.02,1-compress*.95));
 }
}
