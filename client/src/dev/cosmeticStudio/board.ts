import {cosmetic} from '../../shared/cosmetics';
import {setPreviewCardThickness,CARD_THICKNESS_SCALE,STOCK_THICKNESS,DRAW_THICKNESS_RATIO} from '../../ui/cardThickness';
import {ACTIONS,replayAction,type StudioAction} from './actions';
import '../../styles/tokens.css';import '../../styles/base.css';import '../../styles/card.css';import '../../styles/passives.css';import '../../styles/game-overlays.css';import '../../styles/game.css';import '../../styles/screens.css';import '../../styles/reading-board.css';import '../../styles/presentation.css';
import {BaseController} from '../../game/controller';import {createGame} from '../../shared/engine';import {DB,SLEEVES,STARTERS} from '../../shared/cards';import {startBoardLayout} from '../../ui/layout';import {setLang} from '../../i18n';import {setMyAvatar,setOppAvatar} from '../../ui/boardView';import {registerCosmeticPreview} from '../../ui/cosmeticPreviewBridge';import {createAtelierMaterials,type Wearer} from './materials';import {THEMES,asset} from './themes';import type {CardInst,FieldMon,GameState} from '../../shared/types';
export interface StudioState {set:string;side:Wearer;motion:boolean;count:number;dense:boolean;time?:number;}
export async function mountBoard(){
 const params=new URLSearchParams(location.search);setPreviewCardThickness(params.get('thickness')==='3'?3:1);
 document.body.innerHTML='<div id="app"></div>';const root=document.getElementById('app')!;
 const style=document.createElement('style');style.textContent='.help-callout,.battle-tools,.game-help-callout,.btn-surrender{display:none!important}';document.head.append(style);
 for(const t of THEMES)SLEEVES[t.id]={id:t.id,url:asset(t,'back.webp'),ja:t.name,en:t.en,ko:t.name,price:0};
 const lang=params.get('lang');setLang(lang==='en'||lang==='ko'?lang:'ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
 const materials=createAtelierMaterials();let focusZoom=1;
 Object.defineProperty(materials,'pixelRatio',{configurable:true,get:()=>focusZoom>1?Math.min((devicePixelRatio||1)*focusZoom,Math.sqrt(12000000/(innerWidth*innerHeight))):undefined});
 if(params.get('auditQuality')==='current')Object.defineProperty(materials,'pixelRatio',{configurable:true,get:()=>Math.min(devicePixelRatio||1,1.5,Math.sqrt(2600000/(innerWidth*innerHeight)))});
 if(params.get('auditQuality')==='native')Object.defineProperty(materials,'pixelRatio',{value:Math.min(devicePixelRatio||1,2)});
 const shopItem=cosmetic(params.get('shopItem')??'');
 const runtime=params.get('runtime')==='1';const unregister=runtime?()=>materials.dispose():registerCosmeticPreview(root,materials);
 class PreviewController extends BaseController{submit(){/* Sample match is read-only. */} show(g:GameState){this.state=g;this.view.render(g);}}
 const ctl=new PreviewController(root,0,{onHome(){},onRematch(){}}),stop=startBoardLayout();
 const g=createGame({mode:'bot',seed:41,starting:0,p0:{id:'atelier-self',name:'自分'},p1:{id:'atelier-opponent',name:'相手'}}).state;
 g.turn=5;g.pending=null;g.market[0]={...DB.ELF,uid:'atelier-market-elf'};let uid=0;const card=(id:string):CardInst=>({...DB[id]??STARTERS[id],uid:'atelier-'+(++uid)});
 const monsters=Object.values(DB).filter(c=>c.t==='mon'&&c.atk&&c.def).slice(0,8);
 const hands=['ELF','CASTLE','HALF_ELF','ND2'];
 for(const [i,p]of g.players.entries()){p.openingDrawReady=false;p.hp=i?38:40;p.maxMana=5;p.mana=i?2:4;p.enchants=[];p.quests=[];p.traps=[];p.removed=[];p.hand=hands.map(card);p.field=[];}
 let busy=false;let state:StudioState={set:'nocturne',side:'self',motion:true,count:8,dense:false},serial=0;
 async function apply(next:StudioState){
  const theme=THEMES.find(t=>t.id===next.set)??null,version=++serial;await materials.select(theme,next.side);if(version!==serial)return;
  state={...next,time:undefined};materials.setMotion(next.motion);if(next.time!==undefined)materials.seek(next.time);
  g.sleeves=[theme&&(next.side==='self'||next.side==='both')?theme.id:'default',theme&&(next.side==='opponent'||next.side==='both')?theme.id:'default'];
  g.furnitures=g.sleeves?.map(id=>id==='default'?'default':'furniture:'+id) as [string,string];
  if(shopItem){
   g.sleeves=[shopItem.kind==='sleeve'?shopItem.id:'default','default'];
   g.furnitures=[shopItem.kind==='furniture'?shopItem.id:'default','default'];
  }
  for(const [i,p]of g.players.entries()){
   p.hand=hands.map(card);p.deck=Array.from({length:next.count},()=>card('ELF'));p.discard=Array.from({length:next.count?Math.min(next.count,12):0},()=>card('HALF_ELF'));
   p.field=monsters.slice(i?1:0,(i?1:0)+(next.dense?7:2)).map(c=>({...card(c.id),atk:c.atk!,def:c.def!,dmg:0,exhausted:true,tempAtk:0,atkMod:0,defMod:0,summonedTurn:0}) as FieldMon);
  }
  ctl.show(g);root.dataset.atelierSet=next.set;root.dataset.atelierSide=next.side;
  parent.postMessage({type:'atelier-applied',state},location.origin);
 }
 state.set=shopItem?'default':params.get('set')??state.set;const side=params.get('side');if(side==='self'||side==='opponent'||side==='both')state.side=side;
 await apply(state);
 async function replay(kind:StudioAction){
  if(busy)return;busy=true;root.dataset.replay=kind;parent.postMessage({type:'atelier-replay',busy:true,kind},location.origin);
  try{await apply({...state,count:state.count||1,dense:false});await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));await replayAction(kind,state.side==='opponent'?'opponent':'self',g,()=>ctl.show(g));}
  finally{busy=false;delete root.dataset.replay;parent.postMessage({type:'atelier-replay',busy:false,kind},location.origin);}
 }
 root.dataset.thickness=String(CARD_THICKNESS_SCALE);
 const message=(e:MessageEvent)=>{if(e.origin!==location.origin||e.source!==parent||!['atelier-state','atelier-action','atelier-focus'].includes(e.data?.type))return;if(e.data.type==='atelier-focus'){focusZoom=e.data.zoom===2.6?2.6:1;window.dispatchEvent(new Event('lore:render-density'));return;}if(e.data.type==='atelier-action'){if(ACTIONS.includes(e.data.action))void replay(e.data.action);return;}if(busy)return;const n=e.data.state;if(!n||!['default',...THEMES.map(t=>t.id)].includes(n.set)||!['self','opponent','both'].includes(n.side)||![0,1,8,12,40].includes(n.count))return;void apply({set:n.set,side:n.side,motion:!!n.motion,count:n.count,dense:!!n.dense,time:typeof n.time==='number'?n.time:undefined});};
 window.addEventListener('message',message);
 Object.assign(window,{atelier:{apply,info:()=>materials.info(),state:()=>state,controller:ctl,replay,dimensions:()=>({scale:CARD_THICKNESS_SCALE,stock:STOCK_THICKNESS,draw:DRAW_THICKNESS_RATIO})}});
 parent.postMessage({type:'atelier-ready'},location.origin);
 window.addEventListener('pagehide',()=>{serial++;window.removeEventListener('message',message);unregister();stop();ctl.destroy();},{once:true});
}
