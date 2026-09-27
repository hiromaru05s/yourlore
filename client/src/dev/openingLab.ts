import {DUEL_OPENING_MS} from '../shared/opening';
import {createGame} from '../shared/engine';
import {GameView,setMyAvatar,setOppAvatar} from '../ui/boardView';
import {startBoardLayout} from '../ui/layout';
import {waitForDuel} from '../ui/duelReadiness';
import {playDuelOpening,warmOpening} from '../ui/duelOpeningDirector';
import {animateDraw} from '../ui/anim';
import {initSound} from '../ui/sound';

declare global {interface Window {loreOpeningPreview?:{play:()=>Promise<void>;seek:(ms:number)=>void;cancel:()=>void;first:(me:boolean)=>void};}}
export async function mountOpeningLab(root:HTMLElement):Promise<void>{
  initSound();setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
  const state=createGame({mode:'bot',seed:207,starting:0,p0:{id:'a',name:'シーカー'},p1:{id:'b',name:'シーカー'}}).state;
  const noop=()=>{};
  const view=new GameView(root,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
  view.render(state);const stop=startBoardLayout();
  let active=new AbortController(),running:Promise<void>=Promise.resolve(),first=true,generation=0;
  const panel=document.createElement('div');panel.className='opening-lab-controls';
  panel.style.cssText='position:fixed;z-index:250;top:8px;left:50%;transform:translateX(-50%);display:flex;align-items:center;flex-wrap:wrap;justify-content:center;gap:8px;max-width:calc(100% - 24px);width:max-content;padding:10px 14px;background:#0b1424f2;border:1px solid #bba37666;border-radius:5px;color:#e9ddc7;font:12px system-ui';
  const add=(name:string,fn:()=>void)=>{const b=document.createElement('button');b.textContent=name;b.style.cssText='border:1px solid #cfb57866;color:#f0e5d0;background:#172840;padding:7px 12px;cursor:pointer';b.onclick=fn;panel.append(b);return b;};
  const time=document.createElement('span');time.textContent='0.00 s';time.style.minWidth='50px';
  const scrub=document.createElement('input');scrub.type='range';scrub.min='0';scrub.max=String(DUEL_OPENING_MS);scrub.step='25';scrub.value='0';scrub.setAttribute('aria-label','開幕の再生位置');scrub.style.width='min(180px,40vw)';
  const launch=async(sampleMs?:number)=>{
    const gen=++generation;active.abort();await running;if(gen!==generation)return;
    active=new AbortController();view.render(state);
    running=playDuelOpening({root,me:{name:'シーカー',avatar:'SEEKER_BLUE'},opp:{name:'シーカー',avatar:'SEEKER_RED'},firstIsMe:first,signal:active.signal,sampleMs,
      onDeal:signal=>Promise.all([animateDraw(document.getElementById('hand'),3,'me',{signal}),animateDraw(document.getElementById('oppHand'),3,'opp',{signal})]).then(()=>{})});
    await running;
  };
  add('再生',()=>void launch());add('先攻 / 後攻',()=>{first=!first;void launch();});
  add('BOT対戦',()=>{location.href='/duel-lab.html?live';});panel.append(scrub,time);
  scrub.oninput=()=>{time.textContent=(Number(scrub.value)/1000).toFixed(2)+' s';void launch(Number(scrub.value));};
  document.body.append(panel);
  window.loreOpeningPreview={play:()=>launch(),seek:ms=>{scrub.value=String(ms);time.textContent=(ms/1000).toFixed(2)+' s';void launch(ms);},cancel:()=>active.abort(),first:me=>{first=me;}};
  await Promise.all([waitForDuel(root),warmOpening()]);
  if(new URLSearchParams(location.search).has('autoplay'))void launch();else void launch(1100);
  window.addEventListener('pagehide',()=>{generation++;active.abort();stop();view.destroy();panel.remove();delete window.loreOpeningPreview;},{once:true});
}
