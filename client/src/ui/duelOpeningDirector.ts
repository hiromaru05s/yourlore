import {DUEL_OPENING_MS,OPENING_TOSS_MS,OPENING_REVEAL_MS,OPENING_EXIT_MS,OPENING_VISUAL_MS,OPENING_DEAL_MS,openingPhase} from '../shared/opening';
import {getLang} from '../i18n';
import {openingAudio,warmOpeningSound} from './openingSound';
import type {createOpeningRenderer} from './opening/renderer';
export interface OpeningProfile {name:string;avatar:string|null;}
export interface OpeningOptions {
  root:HTMLElement;me:OpeningProfile;opp:OpeningProfile;firstIsMe:boolean;signal:AbortSignal;
  /** Adjusted to the authoritative server clock; negative during lead-in. */
  elapsed?:()=>number;
  /** Preserve an already-started room's deadline across releases. */
  durationMs?:number;
  onDeal:(signal:AbortSignal)=>Promise<void>;
  onStart?:(elapsedMs:number)=>void;
  /** Developer preview only; never advances a game. */
  sampleMs?:number;
}
const label=(ja:string,en:string,ko:string)=>getLang()==='ja'?ja:getLang()==='en'?en:ko;
let modulePromise:Promise<typeof import('./opening/renderer')>|undefined;
const rendererModule=()=>modulePromise??=import('./opening/renderer').catch(error=>{modulePromise=undefined;throw error;});
export async function warmOpening():Promise<void>{
  void warmOpeningSound();
  await Promise.all([rendererModule().catch(()=>{}),...['blue','red'].map(async color=>{
    const image=new Image();image.src=`/art/biblion/seeker-${color}.png`;if(typeof image.decode==='function')await image.decode().catch(()=>{});
  })]);
}

/** Approved Caustic → Declaration. Turn banners remain owned by the controller. */
export async function playDuelOpening(o:OpeningOptions):Promise<void>{
  if(o.signal.aborted)return;
  const game=o.root.querySelector<HTMLElement>('.game');
  const host=document.createElement('div');host.className='duel-opening duel-opening-v1 duel-opening-caustic cointoss-ov';
  host.style.cssText='display:block;background:#07101d;backdrop-filter:none;animation:none';
  host.setAttribute('role','region');host.setAttribute('aria-label',label('デュエル開幕','Duel opening','듀얼 시작'));
  const canvas=document.createElement('canvas');canvas.style.cssText='display:block;width:100%;height:100%';canvas.setAttribute('aria-hidden','true');
  const result=document.createElement('div');result.setAttribute('role','status');result.setAttribute('aria-live','polite');
  result.style.cssText='position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)';
  host.append(canvas,result);document.body.append(host);game?.classList.add('duel-intro-active');
  const life=new AbortController(),audio=openingAudio();
  let closed=false,redraw=()=>{};
  let renderer:ReturnType<typeof createOpeningRenderer>|undefined,frame=0,last=-1,started=false,skipped=false,dealt=false;
  let deal:Promise<void>=Promise.resolve(),release=()=>{},loadTimer:ReturnType<typeof setTimeout>|undefined;
  const aborted=new Promise<void>(resolve=>{release=resolve;});
  const cancel=()=>{life.abort();audio.stop();release();};
  const onHidden=()=>{if(document.hidden&&o.sampleMs==null){skipped=true;canvas.style.visibility='hidden';audio.stop();life.abort();if(!o.elapsed)release();}};
  const resize=()=>{const ratio=Math.min(window.devicePixelRatio||1,1.75,Math.sqrt(2600000/(innerWidth*innerHeight)));canvas.width=Math.round(innerWidth*ratio);canvas.height=Math.round(innerHeight*ratio);redraw();};
  o.signal.addEventListener('abort',cancel,{once:true});document.addEventListener('visibilitychange',onHidden);window.addEventListener('resize',resize);
  try{
    // Asset failure must not bypass the server gate; the visible result can fall back to text.
    const load=async()=>{if(!canvas.getContext('2d'))return;const module=await rendererModule();if(closed||o.signal.aborted)return;renderer=module.createOpeningRenderer();await renderer.loadAssets();if(closed||o.signal.aborted)return;const warm=document.createElement('canvas');warm.width=320;warm.height=180;for(const time of [1.4,3.22])renderer.draw(warm,time,{first:o.firstIsMe,light:false,reduced:false,board:true});};
    await Promise.race([load().catch(()=>{}),aborted,new Promise<void>(resolve=>{loadTimer=setTimeout(resolve,3000);})]);
    clearTimeout(loadTimer);if(o.signal.aborted)return;
    resize();const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start=performance.now(),elapsed=o.elapsed??(()=>performance.now()-start),end=o.durationMs??DUEL_OPENING_MS;
    const paint=(ms:number)=>{
      if(!started&&ms>=0&&o.sampleMs==null){started=true;o.onStart?.(ms);}
      game?.classList.toggle('intro-docked',ms>=OPENING_EXIT_MS);
      host.dataset.openingPhase=openingPhase(ms);host.dataset.openingMs=String(Math.round(ms));
      host.style.background='none';
      const visual=reduced&&ms>=0&&ms<OPENING_REVEAL_MS?4100:ms;
      if(!skipped){
        renderer?.draw(canvas,Math.max(0,visual)/1000,{first:o.firstIsMe,light:false,reduced,board:true,names:[o.me.name,o.opp.name],avatars:[o.me.avatar,o.opp.avatar]});
        if(!renderer){canvas.style.background=ms<OPENING_VISUAL_MS?'#07101d':'transparent';result.style.cssText='position:absolute;inset:40% 0 auto;text-align:center;color:#f1eadc;font:40px Georgia';}
      }
      const showResult=!skipped&&visual>=OPENING_REVEAL_MS&&ms<OPENING_VISUAL_MS;
      result.textContent=showResult?(o.firstIsMe?label('あなたが先攻','You go first','당신이 선공'):label('相手が先攻','Opponent goes first','상대 선공')):'';
      if(!reduced&&!skipped&&o.sampleMs==null){
        for(const [at,key] of [[180,'rise'],[OPENING_TOSS_MS,'toss'],[OPENING_REVEAL_MS,'land']] as const)
          if(!(key==='rise'&&o.onStart)&&last<at&&ms>=at&&ms-at<150)audio.play(key);
      }
      last=ms;
      if(o.sampleMs!=null&&ms>=OPENING_DEAL_MS)game?.classList.add('intro-dealing');
      if(o.sampleMs==null&&!dealt&&ms>=OPENING_DEAL_MS){
        dealt=true;game?.classList.add('intro-dealing');
        if(!reduced&&!skipped)deal=o.onDeal(life.signal).catch(()=>{});
      }
    };
    redraw=()=>paint(o.sampleMs??elapsed());
    if(o.sampleMs!=null){paint(o.sampleMs);await aborted;}
    else await Promise.race([aborted,new Promise<void>((resolve,reject)=>{
      const tick=()=>{
        if(o.signal.aborted||!host.isConnected){resolve();return;}
        try{const ms=elapsed();paint(ms);if(ms>=end){resolve();return;}frame=requestAnimationFrame(tick);}catch(error){reject(error);}
      };tick();
    })]);
    life.abort();await deal;
  }finally{
    closed=true;clearTimeout(loadTimer);life.abort();cancelAnimationFrame(frame);audio.stop();renderer?.dispose();
    o.signal.removeEventListener('abort',cancel);document.removeEventListener('visibilitychange',onHidden);window.removeEventListener('resize',resize);
    host.remove();game?.classList.remove('duel-intro-active','intro-docked','intro-dealing','intro-first-me','intro-first-opp');
  }
}
