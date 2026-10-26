/** DEV-only preview of the production controller → outcome → rating sequence. */
import '../styles/tokens.css';import '../styles/base.css';import '../styles/card.css';import '../styles/game-overlays.css';import '../styles/game.css';import '../styles/screens.css';import '../styles/reading-board.css';import '../styles/presentation.css';
import {BaseController} from '../game/controller';import {createGame,reduce} from '../shared/engine';import type {Action,Side} from '../shared/types';import type {RankChange} from '../shared/rank';import {DB,STARTERS} from '../shared/cards';import {setMyAvatar,setOppAvatar} from '../ui/boardView';import {startBoardLayout} from '../ui/layout';import {waitForDuel as nativeWaitForDuel} from '../ui/duelReadiness';import {setLang} from '../i18n';import {closeOverlay} from '../ui/modal';import {setFxSkip} from '../ui/anim';import {rankEmblem} from '../ui/rankEmblem';import {TIER_META,tierLabel} from '../ui/tier';import {RankPresentation} from '../ui/rankPresentation';import {initSound} from '../ui/sound';
if(import.meta.env.DEV){
 // This lethal-only fixture needs the displayed board, not unused spell-flight warm pools.
 const waitForDuel=async(root:HTMLElement)=>{await Promise.race([nativeWaitForDuel(root),(async()=>{while(root.isConnected&&(root.dataset.sceneReady!=='true'||root.dataset.widgetsReady!=='true'||root.dataset.boardRendered!=='true'))await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));if(!root.isConnected)return;await Promise.all([...root.querySelectorAll('img')].map(img=>img.decode().catch(()=>{})));await document.fonts.ready;root.querySelector('.duel-loader')?.remove();root.classList.remove('duel-preparing');root.removeAttribute('aria-busy');root.dataset.lethalFixtureReady='true';})()]);};
 const combatParam=new URLSearchParams(location.search).get('combat');
 const combatMode=combatParam==='win'||combatParam==='defeat'?combatParam:null;
 const manaFx=new URLSearchParams(location.search).get('fx')==='mana';
 initSound();
 setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
 class RankLab extends BaseController {
  constructor(you:Side=0,ranked=true){super(document.querySelector('#app')!,you,{onHome:()=>combatMode?location.reload():reset(),onRematch:()=>combatMode?location.reload():reset()});this.introShown=true;this.ranked=ranked;
   const g=createGame({mode:'online',seed:71,starting:0,p0:{id:'me',name:'YOU'},p1:{id:'opp',name:'OPPONENT'}}).state;g.turn=3;g.pending=null;
   for(const [i,p] of g.players.entries()){p.openingDrawReady=false;p.hp=32;p.shield=6;p.dew=4;p.mana=8;p.maxMana=12;p.hand=[STARTERS.STARTER_CHEST,STARTERS.STARTER_MANA,DB.ND2].map((c,j)=>({...c,uid:`hand-${i}-${j}`}));p.field=['M4','ELF','GM6_0'].map((id,j)=>({...DB[id],uid:`field-${i}-${j}`,exhausted:false,summonedTurn:0,tempAtk:0,atkMod:0,defMod:0,dmg:0}));}
   if(combatMode){const attacker:Side=combatMode==='win'?0:1,defender=(1-attacker) as Side;g.cur=attacker;for(const p of g.players){p.shield=0;p.dew=0;p.hp=20;}g.players[defender].hp=3;g.players[defender].field=[];if(manaFx)g.players[defender].dew=4;g.players[attacker].field=g.players[attacker].field.slice(0,1);}
   this.state=g;this.view.render(g);
  }
  protected submit(a:Action){if(combatMode&&this.state.cur!==this.you&&a.type!=='surrender')return;this.perform(a);}
  private perform(a:Action){if(this.state.over)return;const res=reduce(this.state,a);if(combatMode&&res.state.over)this.result({before:1180,after:res.state.winner===this.you?1198:1164,season:'2026-10'});this.applyResult(res);}
  opponentAttack(){if(combatMode!=='defeat'||this.state.cur!==1||this.state.over)return;const attacker=this.state.players[1].field[0];if(attacker)this.perform({type:'attack',uid:attacker.uid});}
  finish(winner:Side|null=1){const g=structuredClone(this.state);if(winner!==null)g.players[1-winner].hp=0;g.over=true;g.phase='over';g.winner=winner;this.applyResult({state:g,events:winner===null?[]:[{type:'win',winner}]});}
  result(c:RankChange){this.receiveRankChange(c);}
  early(){this.showWin();}
  slow(){this.rankResultPending(true);}
  isFinished(){return this.state.over;}
 }
 let controller:RankLab;
 function reset(you:Side=0,ranked=true){controller?.destroy();closeOverlay();setFxSkip(false);controller=new RankLab(you,ranked);}
 reset();const stop=startBoardLayout();await waitForDuel(document.querySelector('#app')!);
 const scenarios:Record<string,{winner:Side|null;change:RankChange}>={
  bronze:{winner:0,change:{before:1020,after:1038,tierBefore:'iron',tierAfter:'bronze'}},
  silver:{winner:0,change:{before:1080,after:1098,tierBefore:'bronze',tierAfter:'silver'}},
  platinum:{winner:0,change:{before:1240,after:1258,tierBefore:'gold',tierAfter:'platinum'}},
  diamond:{winner:0,change:{before:1390,after:1408,tierBefore:'platinum',tierAfter:'diamond'}},
  master:{winner:0,change:{before:1540,after:1558,tierBefore:'diamond',tierAfter:'master'}},
  promotion:{winner:0,change:{before:1144,after:1162,tierBefore:'silver',tierAfter:'gold'}},
  win:{winner:0,change:{before:1180,after:1198}},
  defeat:{winner:1,change:{before:1180,after:1164}},
  demotion:{winner:1,change:{before:1156,after:1140,tierBefore:'gold',tierAfter:'silver'}},
  draw:{winner:null,change:{before:1200,after:1200}},
  gm:{winner:0,change:{before:1595,after:1613,tierBefore:'master',tierAfter:'gm',rankBefore:27,rankAfter:25}},
  gmExit:{winner:1,change:{before:1605,after:1589,tierBefore:'gm',tierAfter:'master',rankBefore:25,rankAfter:26}},
 };
 const panel=document.createElement('div');panel.className='rank-lab-controls';panel.style.cssText='position:fixed;left:10px;top:10px;z-index:99999;padding:12px;background:#08172eee;border:1px solid #89a8c9;color:white;display:flex;gap:8px;flex-wrap:wrap;max-width:calc(100vw - 20px);font:12px sans-serif';
 panel.innerHTML='<span>MMR演出プレビュー</span><select id="scenario"><option value="promotion">ゴールド昇格</option><option value="bronze">ブロンズ昇格</option><option value="silver">シルバー昇格</option><option value="platinum">プラチナ昇格</option><option value="diamond">ダイヤモンド昇格</option><option value="master">マスター昇格</option><option value="win">勝利</option><option value="defeat">敗北</option><option value="demotion">降格</option><option value="draw">引き分け</option><option value="gm">GM昇格</option><option value="gmExit">GM降格</option></select><button id="play">盤面から再生</button><button id="crest">紋章から再生</button><button id="gallery">8ティア一覧</button>';
 document.body.append(panel);
 const initialScenario=new URLSearchParams(location.search).get('scenario')??'win';
 panel.querySelector<HTMLSelectElement>('select')!.value=scenarios[initialScenario]?initialScenario:'win';
 const play=async(key:string)=>{dismiss();if(controller.isFinished()){const url=new URL(location.href);url.searchParams.set('scenario',key);url.searchParams.set('play','1');location.assign(url);return;}const active=controller;await waitForDuel(document.querySelector('#app')!);if(active!==controller)return;const v=scenarios[key];controller.result({...v.change,season:'2026-09'});controller.finish(v.winner);};
 for(const [key,label] of [['win','勝利を再生'],['defeat','敗北を再生']]){const button=document.createElement('button');button.textContent=label;button.onclick=()=>{panel.querySelector<HTMLSelectElement>('select')!.value=key;void play(key);};panel.querySelector('#play')!.before(button);}
 panel.querySelector<HTMLButtonElement>('#play')!.onclick=()=>play(panel.querySelector<HTMLSelectElement>('select')!.value);
 let inspection:HTMLElement|undefined, presentation:RankPresentation|undefined;
 const dismiss=()=>{presentation?.destroy();inspection?.remove();};
 panel.querySelector<HTMLButtonElement>('#crest')!.onclick=()=>{
  dismiss();const v=scenarios[panel.querySelector<HTMLSelectElement>('select')!.value];
  inspection=document.createElement('div');inspection.className='overlay';inspection.style.zIndex='99998';
  inspection.innerHTML='<div class="modal outcome-result has-rank"><div class="win-rank"></div><button class="btn" style="margin-top:12px">閉じる</button></div>';
  document.body.append(inspection);presentation=new RankPresentation();presentation.set({...v.change,season:'2026-09'});presentation.mount(inspection.querySelector('.win-rank')!);
  inspection.querySelector('button')!.onclick=dismiss;
 };
 panel.querySelector<HTMLButtonElement>('#gallery')!.onclick=()=>{dismiss();const gallery=document.createElement('div');gallery.className='overlay';gallery.style.zIndex='100000';gallery.innerHTML=`<div class="modal" style="width:min(850px,94vw)"><h2>LORE · RANK EMBLEMS</h2><div class="rank-tier-guide">${Object.entries(TIER_META).map(([k,m])=>`<div style="--rank-metal:${m.color}">${rankEmblem(k).replace('<svg ','<svg style="width:116px;height:112px;max-width:100%" ')}<b>${tierLabel(k)}</b></div>`).join('')}</div><button class="btn">閉じる</button></div>`;gallery.querySelector('button')!.onclick=()=>gallery.remove();document.body.append(gallery);};
 (window as any).rankLab={ready:true,reset,play,finish:(winner:Side|null)=>controller.finish(winner),result:(c:RankChange)=>controller.result(c),early:()=>controller.early(),slow:()=>controller.slow(),destroy:()=>controller.destroy(),skip:()=>setFxSkip(true)};
 if(combatMode){
  panel.remove();
  const controls=document.createElement('div');controls.className='rank-lab-controls';controls.style.cssText=panel.style.cssText+';max-width:min(250px,calc(50vw - 65px));align-items:center;box-sizing:border-box';
  const switchMode=(mode:'win'|'defeat')=>{const url=new URL(location.href);url.search='';url.searchParams.set('combat',mode);if(manaFx){url.searchParams.set('fx','mana');}location.assign(url);};
  const hint=document.createElement('span');hint.style.cssText='flex-basis:100%;line-height:1.6';hint.textContent=combatMode==='win'?'相手HP 3／攻撃力4。手前の場のブレード・ヘアをクリック、または相手の肖像へドラッグしてトドメ。':'自分HP 3／相手の攻撃力4。「相手の攻撃を開始」でトドメから敗北UIまで再生。';controls.append(hint);
  for(const [label,mode] of [['自分でトドメ','win'],['相手からトドメ','defeat']] as const){const button=document.createElement('button');button.textContent=label;button.onclick=()=>switchMode(mode);controls.append(button);}
  const again=document.createElement('button');again.textContent='同じ盤面を準備';again.onclick=()=>location.reload();controls.append(again);
  if(combatMode==='defeat'){const attack=document.createElement('button');attack.textContent='相手の攻撃を開始';attack.onclick=()=>{attack.disabled=true;controller.opponentAttack();};controls.append(attack);}
  document.body.append(controls);
 }else if(new URLSearchParams(location.search).get('play')==='1')void play(panel.querySelector<HTMLSelectElement>('select')!.value);
 window.addEventListener('pagehide',()=>{dismiss();controller.destroy();stop();},{once:true});
}
