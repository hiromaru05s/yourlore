import '../../styles/tokens.css';import '../../styles/base.css';import '../../styles/card.css';import '../../styles/game-overlays.css';import '../../styles/game.css';import '../../styles/screens.css';import '../../styles/reading-board.css';import '../../styles/presentation.css';
import {GameView,setMyAvatar,setOppAvatar} from '../../ui/boardView';
import {startBoardLayout} from '../../ui/layout';
import {waitForDuel} from '../../ui/duelReadiness';
import {projectedPlacement} from '../../ui/boardProjection';
import {clearMonsterStates} from '../../ui/monster/runtime';
import {attackPlan,attackPose,drawAttackVisual} from '../../ui/attackVisual';
import {createGame} from '../../shared/engine';
import {DB,STARTERS} from '../../shared/cards';
import {setLang} from '../../i18n';
import {surface} from './surface';
import {Renderer} from './renderer';
import {cards,DURATION,CYCLE,WIDTH,HEIGHT} from './catalog';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
document.body.style.cssText='margin:0;overflow:hidden;background:#f1ebdf';
const css=document.createElement('style');css.textContent='.topbar,.help-callout,.help-fab,.mute-fab{display:none!important}.evade-overlay{position:fixed;inset:0;pointer-events:none;z-index:185}.evade-outcome{position:fixed;left:50%;top:8px;transform:translateX(-50%);z-index:186;font:11px sans-serif;padding:7px 13px;color:#e8f3e9;background:#17282bd9;border-radius:3px;pointer-events:none;white-space:nowrap}';document.head.append(css);
const root=document.getElementById('app')!,noop=()=>{};
const view=new GameView(root,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
const renderer=new Renderer(),faces=new Map<string,HTMLCanvasElement>();
const canvas=document.createElement('canvas');canvas.className='evade-overlay';document.body.append(canvas);const c=canvas.getContext('2d')!;
const label=document.createElement('div');label.className='evade-outcome';document.body.append(label);
let ready=false,disposed=false,side=0,variant=0,ms=0,reduced=false,multi=false,success=true,dark=false,id:string=cards[0];
let originals:HTMLElement[]=[],actors=0,attackVisible=false,setupId='';
const mon=(key:string,uid:string)=>({...DB[key]??STARTERS[key],uid,exhausted:false,summonedTurn:0,dmg:0,tempAtk:0,atkMod:0,defMod:0});
function restore(){for(const n of originals){n.style.visibility='';n.style.transform='';}c.clearRect(0,0,canvas.width,canvas.height);actors=0;attackVisible=false;}
function setup(){
 restore();const g=createGame({mode:'bot',seed:71,starting:0,p0:{id:'evade-self',name:'シーカー'},p1:{id:'evade-opp',name:'相手'}}).state;g.turn=3;g.phase='main';g.pending=null;
 for(const [i,p]of g.players.entries()){p.openingDrawReady=false;p.mana=12;p.maxMana=12;p.hp=30;p.enchants=[];p.quests=[];p.traps=[];p.field=(i===side?[id,id,id]:['M4','M4','M4']).map((key,j)=>mon(key,`evade-${i}-${j}`));p.hand=[{...STARTERS.STARTER_CHEST,uid:`evade-hand-${i}`}];p.removed=[];}
 // The attacking subject is visually separated by side; all three adjacent targets are public.
 view.render(g);view.setHandOpen(false);clearMonsterStates(root);originals=[...root.querySelectorAll<HTMLElement>('.zone-mon .card')];setupId=id+side;
}
function layer(el:HTMLElement,key:string,v:number,t:number,ok:boolean,small=false){
 const r=el.getBoundingClientRect(),padX=r.width*.85,padY=r.height*.55;
 const left=Math.floor(r.left-padX),top=Math.floor(r.top-padY),width=Math.ceil(r.width+2*padX),height=Math.ceil(r.height+2*padY);
 const matrix=new DOMMatrix().translate(-left,-top).multiply(projectedPlacement(el,WIDTH,HEIGHT));
 c.save();c.translate(left,top);renderer.drawBoard(c,faces.get(key)!,v,t,matrix,width,height,ok,small,side?-1:1);c.restore();el.style.visibility='hidden';actors++;
}
function draw(){
 restore();if(!ready||disposed||document.hidden||innerWidth<1||innerHeight<1)return;
 if(setupId!==id+side)setup();const d=Math.min(devicePixelRatio,1.5),w=Math.round(innerWidth*d),h=Math.round(innerHeight*d);
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;canvas.style.width=`${innerWidth}px`;canvas.style.height=`${innerHeight}px`;}
 c.setTransform(d,0,0,d,0,0);root.style.filter=dark?'brightness(.63)':'';
 const selected=originals.filter(n=>n.dataset.uid?.startsWith(`evade-${side}-`)&&(multi||n.dataset.uid.endsWith('-1')));
 if(ms>0&&ms<DURATION){for(const el of selected)layer(el,id,variant,ms,success,reduced);}
 label.textContent=ms<DURATION?'回避判定 · ダイス '+(success?'5':'2')+' / 700ms':success?'回避成功 · 攻撃無効':ms<1580?'回避失敗 · 通常攻撃':'判定プレビュー終了';
 // Success never produces a contact/attack. On failure use the production attack pose,
 // offset by exactly 700ms. This fixture does not invent a counterattack or alter rules.
 if(!success&&ms>=DURATION&&ms<1580){
  const attacker=originals.find(n=>n.dataset.uid===`evade-${1-side}-1`),target=selected.find(n=>n.dataset.uid?.endsWith('-1'));
  if(attacker&&target){
   attackVisible=true;const a=attacker.getBoundingClientRect(),b=target.getBoundingClientRect(),plan=attackPlan(a,b),age=ms-DURATION;
   const pose=attackPose(plan,age);
   if(!reduced){attacker.style.transform=`translate(${pose.x-plan.origin.x}px,${pose.y-plan.origin.y}px) rotate(${pose.turn}deg) scale(${pose.scale})`;drawAttackVisual(c,a,b,age/1000);}
  }
 }
}
root.addEventListener('click',e=>{const target=(e.target as Element).closest<HTMLElement>('.zone-mon .card');if(!target)return;e.preventDefault();e.stopImmediatePropagation();parent.postMessage({kind:'evade-play'},location.origin);},true);
window.addEventListener('message',e=>{
 if(e.origin!==location.origin||e.source!==parent)return;
 if(e.data?.kind==='evade-suspend'){restore();label.textContent='停止';return;}
 if(e.data?.kind!=='evade-control')return;const a=e.data;
 if(cards.includes(a.id))id=a.id;side=a.side===1?1:0;variant=Math.min(3,Math.max(0,Number(a.variant)||0));ms=Math.min(CYCLE,Math.max(0,Number(a.ms)||0));reduced=!!a.reduced;multi=!!a.multi;success=!!a.success;dark=!!a.dark;draw();
});
window.addEventListener('resize',()=>requestAnimationFrame(draw));document.addEventListener('visibilitychange',()=>{if(document.hidden)restore();});
setup();const stopLayout=startBoardLayout();
(window as any).evadeBoard={get state(){return{ready,ms,variant,id,side,multi,success,reduced,actors,attackVisible,hidden:originals.filter(n=>n.style.visibility==='hidden').length,resources:renderer.resources,targets:originals.filter(n=>n.dataset.uid?.startsWith(`evade-${side}-`)).map(n=>({uid:n.dataset.uid,width:n.getBoundingClientRect().width,visibility:n.style.visibility}))};},restore};
window.addEventListener('pagehide',()=>{disposed=true;restore();renderer.dispose();canvas.remove();label.remove();stopLayout();view.destroy();},{once:true});
void(async()=>{await waitForDuel(root);for(const key of cards)faces.set(key,await surface(key));ready=true;draw();parent.postMessage({kind:'evade-ready'},location.origin);})().catch(e=>{parent.postMessage({kind:'evade-error',error:String(e)},location.origin);console.error(e);});
