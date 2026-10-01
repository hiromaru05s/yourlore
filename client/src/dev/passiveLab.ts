/** Development-only preview of production card/icon renderers. */
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/game-overlays.css';
import '../styles/presentation.css';
import {DB, STARTERS, PASSIVES, cardPassives} from '../shared/cards';
import {cardEl} from '../ui/cardView';
import {passiveIcon} from '../ui/passiveIcon';
import {zoomCard} from '../ui/anim';
import {setLang} from '../i18n';

if(import.meta.env.DEV){
 setLang('ja');
 const style=document.createElement('style');
 style.textContent=`body{overflow:auto;background:#0c1a26;color:#e6dfca}#app{height:auto;max-width:1200px;margin:auto;padding:36px 24px 70px}h1{font:28px Georgia,serif;margin:0 0 8px}p{color:#a6b7bf;font-size:13px;line-height:1.7}h2{font:17px Georgia,serif;letter-spacing:.08em;margin:32px 0 18px}.specimens{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px}.specimen{padding:18px;background:#122632;border:1px solid #69746d55;border-radius:8px}.comparison{display:flex;align-items:center;gap:16px;margin-bottom:14px}.old{width:36px;height:36px;object-fit:contain;opacity:.75}.new .passive-icon{width:40px;height:40px}.specimen strong{font-size:14px}.specimen small{display:block;color:#a6b7bf;margin-top:6px;font-size:11px}.cards-row{display:flex;gap:20px;flex-wrap:wrap;align-items:end}.sample{display:flex;flex-direction:column;gap:12px;align-items:center}.sample>small{font-size:11px;color:#a6b7bf}.sample .card{--cw:128px;--ch:200px;cursor:pointer}.sample .card--field{--cw:100px;--ch:100px}.sample.tiny .card--field{--cw:68px;--ch:68px}.backdrops{display:flex;gap:16px;flex-wrap:wrap}.backdrops>div{padding:20px;display:flex;gap:8px;border-radius:8px}.light{background:#eee4ca}.dark{background:#04090d}.busy{background:repeating-linear-gradient(30deg,#eae0b0 0 9px,#4e5355 9px 17px,#101a26 17px 23px)}@media(max-width:600px){#app{padding:22px 16px}.specimens{grid-template-columns:repeat(2,minmax(0,1fr))}.specimen{padding:12px}.cards-row{gap:14px}}`;
 document.head.append(style);
 const app=document.getElementById('app')!;
 app.innerHTML='<h1>パッシブの紋章</h1><p>太いシルエット × 濃紺のエナメル × 控えめな金属縁。カードをクリックすると説明を開きます。</p><h2>11種類の図柄 <small>左：従来 / 右：新版</small></h2><section class="specimens"></section><h2>カードアートに重ねた表示</h2><section class="cards-row"></section><h2>小さい盤面カード / 付与・カウンター</h2><section class="cards-row small-row"></section><h2>背景による視認性</h2><section class="backdrops"></section>';
 const motifs:Record<string,string>={counter:'折り返す矢印',dual:'交差する2本の剣',ambush:'プレイヤーへの直接攻撃',aura:'魔法を防ぐ盾',void:'外へ消える矢印',guts:'生命を残す心臓',decay:'腐敗を示す髑髏',majesty:'行動を制する王冠',taunt:'矢を引き受ける盾',evade:'素早くかわす足',relic:'失われない結晶'};
 for(const [k,p] of Object.entries(PASSIVES)){
  const entry=document.createElement('article');entry.className='specimen';
  entry.innerHTML=`<div class="comparison"><img class="old" src="/ui/passives/v1/${k}.webp" alt="従来"><span class="new">${passiveIcon(k)}</span>${passiveIcon(k)}</div><strong>${p.ja.name}</strong><small>${motifs[k]}</small>`;
  app.querySelector('.specimens')!.append(entry);
 }
 const defs=Object.values({...DB,...STARTERS});
 for(const k of ['dual','guts','decay','aura','majesty','relic']){
  const def=defs.find(c=>cardPassives(c).includes(k));if(!def)continue;
  const c={...def,uid:`preview-${k}`};
  const sample=document.createElement('div');sample.className='sample';
  const card=cardEl(c);card.onclick=()=>zoomCard(c);sample.append(card);app.querySelector('.cards-row')!.append(sample);
 }
 for(const k of ['dual','guts','decay','aura','majesty']){
  const def=defs.find(c=>c.t==='mon'&&cardPassives(c).includes(k));if(!def)continue;
  for(const tiny of [false,true]){
   const c={...def,uid:`field-${k}-${tiny}`,guts:k==='guts'?1:0,decayCnt:k==='decay'?2:0,passivesG:k==='dual'?['counter']:[]};
   const sample=document.createElement('div');sample.className=`sample ${tiny?'tiny':''}`;
   const card=cardEl(c,{compactField:true});card.onclick=()=>zoomCard(c);
   const label=document.createElement('small');label.textContent=`${tiny?'68':'100'}px / ${PASSIVES[k].ja.name}`;
   sample.append(card,label);app.querySelector('.small-row')!.append(sample);
  }
 }
 for(const bg of ['light','dark','busy']){
  const row=document.createElement('div');row.className=bg;
  row.innerHTML=['dual','taunt','guts','decay'].map(k=>passiveIcon(k)).join('');app.querySelector('.backdrops')!.append(row);
 }
}
