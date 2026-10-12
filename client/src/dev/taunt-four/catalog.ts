export {DURATION,clamp,ease,pulse,pose} from "../../ui/taunt/timing";
export const designs=[
 {name:'蒼鋼の大盾',en:'AZURE STEEL',material:'蒼鋼 / 銀の稜線 / 金象嵌',description:'元の01を正統に磨いた大盾。厚い鋼の縁と、膨らみを持つ蒼い面。細い金象嵌と鋲で、重さを引き締める。',peak:460,color:'#8eadbd'},
 {name:'銀翼の大盾',en:'ARGENT WING',material:'白銀 / 翼状の浮彫 / 鎚目',description:'銀の翼を盾の面に彫り出す。幅のある立体の稜線と深い溝が、開閉に合わせて異なる光を返す。',peak:460,color:'#a4b6be'},
 {name:'黒金の王盾',en:'GILDED SOVEREIGN',material:'黒鉄 / 月桂の浮彫 / 古金',description:'黒く磨いた鋼に、金属の月桂を打ち出す。金の厚縁と暗い面の対比で、落ち着いた威厳を作る。',peak:460,color:'#b99859'},
 {name:'緋鉄の城盾',en:'CRIMSON BASTION',material:'緋色の七宝 / 積層鋼 / 金鋲',description:'深い緋色の面を、三段の鋼帯で留める。磨かれた角、鋼の段差、金鋲が、堅牢な防具の構造を見せる。',peak:460,color:'#984f58'},
] as const;
export const reference={name:'元の01・双翼の大盾',peak:460};
export const boardDesigns=[...designs,reference];
export const cards=['SHIELD_TITAN','CASTLE','ELF'] as const;
