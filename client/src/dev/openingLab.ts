import {DUEL_OPENING_MS,MULLIGAN_MS} from '../shared/opening';
import {createGame,reduce} from '../shared/engine';
import {GameView,setMyAvatar,setOppAvatar} from '../ui/boardView';
import {startBoardLayout} from '../ui/layout';
import {waitForDuel} from '../ui/duelReadiness';
import {playDuelOpening,warmOpening} from '../ui/duelOpeningDirector';
import {animateDraw} from '../ui/anim';
import {initSound} from '../ui/sound';
import {marketPreview,openingHandDialog} from '../ui/modal';
import {botNpc} from '../shared/botNpcs';
import '../styles/defaultButtons.css';

declare global {interface Window {loreOpeningPreview?:{play:()=>Promise<void>;seek:(ms:number)=>void;cancel:()=>void;first:(me:boolean)=>void};}}
export async function mountOpeningLab(root:HTMLElement):Promise<void>{
  const npc=botNpc('easy'),me={name:'シーカー',avatar:'SEEKER_BLUE'},opp={name:npc.name.ja,avatar:npc.avatar};
  initSound();setMyAvatar(me.avatar);setOppAvatar(opp.avatar);
  let first=new URLSearchParams(location.search).get('order')!=='second';
  const study=new URLSearchParams(location.search).get('study');
  const previewState=()=>createGame({mode:'bot',mulligan:!!study,seed:207,starting:first?0:1,p0:{id:'a',name:me.name},p1:{id:'b',name:opp.name}}).state;
  const noop=()=>{};
  const view=new GameView(root,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
  view.render(previewState());const stop=startBoardLayout();
  let active=new AbortController(),running:Promise<void>=Promise.resolve(),generation=0;
  const panel=document.createElement('div');panel.className='opening-lab-controls';
  panel.style.cssText='position:fixed;z-index:250;bottom:3px;left:50%;transform:translateX(-50%);display:flex;align-items:center;justify-content:center;gap:6px;max-width:100%;width:max-content;color:#d8e5f1;font:12px system-ui';
  const add=(name:string,fn:()=>void)=>{const b=document.createElement('button');b.className='lore-button lore-button-quiet';b.textContent=name;b.style.cssText='padding:4px 10px;cursor:pointer;font:12px system-ui';b.onclick=fn;panel.append(b);};
  const launch=async(sampleMs?:number)=>{
    const gen=++generation;active.abort();await running;if(gen!==generation)return;
    active=new AbortController();view.render(previewState());
    running=playDuelOpening({root,me,opp,firstIsMe:first,signal:active.signal,sampleMs,
      onDeal:signal=>Promise.all([animateDraw(document.getElementById('hand'),3,'me',{signal}),animateDraw(document.getElementById('oppHand'),3,'opp',{signal})]).then(()=>{})});
    await running;
  };
  if(study){
    let state=previewState(),closeStudy=()=>{},timer=0;
    const reset=()=>{clearTimeout(timer);closeStudy();};
    const hand=()=>{
      const until=Date.now()+MULLIGAN_MS;
      const finish=(uids:string[])=>{
        reset();state=reduce(state,{type:'mulligan',player:0,uids}).state;
        view.render(state);
        closeStudy=openingHandDialog(state,0,()=>{},()=>Math.max(0,(until-Date.now())/1000));
        timer=window.setTimeout(()=>{
          closeStudy();state=reduce(state,{type:'mulligan',player:1,uids:[]}).state;
          view.render(state);panel.hidden=false;
        },1250);
      };
      closeStudy=openingHandDialog(state,0,finish,()=>(until-Date.now())/1000);
      timer=window.setTimeout(()=>finish([]),MULLIGAN_MS);
    };
    const begin=(market:boolean)=>{
      reset();panel.hidden=true;state=previewState();view.render(state);
      if(!market){hand();return;}
      const next=async()=>{reset();await launch();if(root.isConnected&&!active.signal.aborted)hand();};
      const preview=marketPreview(state.market,state.players[state.cur].supply,()=>void next());
      closeStudy=preview.close;preview.setUntil(Date.now()+15000);timer=window.setTimeout(()=>void next(),15000);
    };
    panel.style.display='';panel.style.textAlign='center';
    add('マーケットから再生',()=>begin(true));add('マリガンを試す',()=>begin(false));
    document.body.append(panel);
    await Promise.all([waitForDuel(root),warmOpening()]);begin(study!=='hand');
    window.addEventListener('pagehide',()=>{reset();generation++;active.abort();stop();view.destroy();panel.remove();},{once:true});
    return;
  }
  add('自分が先攻で再生',()=>{first=true;void launch();});
  add('自分が後攻で再生',()=>{first=false;void launch();});
  const tools=document.createElement('details'),summary=document.createElement('summary');
  summary.textContent='操作';summary.style.cursor='pointer';
  const box=document.createElement('div');box.style.cssText='position:absolute;bottom:100%;right:0;display:grid;gap:10px;background:#101d32;padding:12px';
  const scrub=document.createElement('input');scrub.type='range';scrub.min='0';scrub.max=String(DUEL_OPENING_MS);scrub.step='25';scrub.value='1100';
  scrub.setAttribute('aria-label','開幕の再生位置');scrub.oninput=()=>void launch(Number(scrub.value));
  const live=document.createElement('a');live.href='/duel-lab.html?live';live.textContent='BOT対戦';
  box.append(scrub,live);tools.append(summary,box);panel.append(tools);
  document.body.append(panel);
  window.loreOpeningPreview={play:()=>launch(),seek:ms=>{void launch(ms);},cancel:()=>active.abort(),first:meFirst=>{first=meFirst;}};
  await Promise.all([waitForDuel(root),warmOpening()]);
  if(new URLSearchParams(location.search).has('autoplay'))void launch();else void launch(1100);
  window.addEventListener('pagehide',()=>{generation++;active.abort();stop();view.destroy();panel.remove();delete window.loreOpeningPreview;},{once:true});
}
