export const studies = [
  {id:0,name:'金継の不屈',en:'GILDED FRACTURE',material:'亀裂 × 溶けた金属',description:'致命傷の亀裂へ、気合の金が走る。砕ける寸前の面を継ぎ、細い金筋をカードへ沈める。',color:'#b88740'},
  {id:1,name:'緋紐の縫命',en:'CRIMSON SUTURE',material:'繊維 × 張力',description:'枠から引き出した緋色の繊維が傷を縫い留める。たるみが一気に張り、ほどけながら枠へ戻る。',color:'#9e3946'},
  {id:2,name:'鋼縁の踏留',en:'TEMPERED FRAME',material:'積層金属 × 噛み合わせ',description:'カード枠の薄い鋼板が連動してせり出す。衝撃方向から順に噛み合い、押し戻されても踏みとどまる。',color:'#537a82'},
  {id:3,name:'琥珀の復圧',en:'AMBER RESILIENCE',material:'粘弾性の薄膜 × 復元',description:'表面の琥珀膜が深くくぼんで力を受け止める。折れた光が面を伝い、薄く伸びてカードへ馴染む。',color:'#b37336'},
] as const;
export type Variant = 0|1|2|3;
export const CONTACT=720, END=2320, DURATION=2800;
export const sat=(x:number)=>Math.max(0,Math.min(1,x));
export const smooth=(a:number,b:number,t:number)=>{const q=sat((t-a)/(b-a));return q*q*(3-2*q)};
export const pulse=(a:number,b:number,c:number,t:number)=>smooth(a,b,t)*(1-smooth(b,c,t));
export function phase(t:number){return t<380?'衝撃前':t<CONTACT?'攻撃の踏み込み':t<CONTACT+95?'命中 · 気合を1消費':t<1180?'体力1で踏みとどまる':t<END?'素材がカード面へ戻る':'生存 · 体力1';}
