import {PAIRED_RETURN} from '../ui/shelfReturn';
/** The approved silver material, with an omitted middle passage and Biblion-adjacent colors. */
export const PORTAL_STUDIES=[
 {id:'portal-seam',name:'蒼金の瞬綴',en:'AZURE SEAM',ms:2220,color:'#426d91',secondary:'#f3ddb0',mode:0,strips:1,warp:0,description:'浮いたカードが短い蒼金の線へ吸われて消失。少し間を置き、デッキのすぐ左から同じ光が戻る。'},
 {id:'portal-fold',name:'斜光の折返し',en:'GILDED FOLD',ms:2360,color:'#8a744d',secondary:'#fff1d2',mode:0,strips:1,warp:1,description:'斜めの光の縁へ、カードの角から折り込まれる。離れた出口で同じ斜線から面がほどける。'},
 {...PAIRED_RETURN,name:'双光の呼応',en:'PAIRED ECHO',description:'入口の光が閉じると、右の出口が短く呼応。移動の中間を省いた、最も歯切れのよい帰還。'},
 {id:'portal-ivory',name:'白金の収束',en:'IVORY CONVERGENCE',ms:2520,color:'#72838c',secondary:'#fff0ca',mode:0,strips:1,warp:3,description:'白金の紋様を残し、カード面が細い一点へ収束。右の出口から柔らかく開いて積み重なる。'},
 {id:'portal-cadence',name:'金環の連送',en:'GOLDEN CADENCE',ms:2580,color:'#345578',secondary:'#eac78b',mode:0,strips:1,warp:4,description:'束を三つの拍で送り、いったん空白に。デッキの左で金の縁が順に灯り、吸い込まれる。'},
] as const;
export type PortalVariant=typeof PORTAL_STUDIES[number]['id'];
