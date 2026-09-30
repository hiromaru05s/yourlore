import {DUEL_OPENING_MS,OPENING_DOCK_MS,OPENING_TOSS_MS,OPENING_REVEAL_MS,OPENING_DEAL_MS,openingPhase} from '../shared/opening';
import {getLang,t} from '../i18n';
import {avatarHtml} from './social';
import {prepareOpeningCoin,type OpeningCoin} from './openingScene';
import {openingAudio,warmOpeningSound} from './openingSound';
export interface OpeningProfile {name:string;avatar:string|null;}
export interface OpeningOptions {
  root:HTMLElement;me:OpeningProfile;opp:OpeningProfile;firstIsMe:boolean;signal:AbortSignal;
  /** Already adjusted to the authoritative server clock; negative during lead-in. */
  elapsed?:()=>number;
  onDeal:(signal:AbortSignal)=>Promise<void>;
  onStart?:(elapsedMs:number)=>void;
  /** Developer preview only: a fixed sample does not advance or unlock a game. */
  sampleMs?:number;
}
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(n:number)=>{n=clamp(n);return n*n*(3-2*n);};
const mix=(a:number,b:number,p:number)=>a+(b-a)*p;
const label=(ja:string,en:string,ko:string)=>getLang()==='ja'?ja:getLang()==='en'?en:ko;

export async function warmOpening():Promise<void>{
  void warmOpeningSound();
  if(typeof Image==='undefined'||typeof HTMLImageElement==='undefined'||!HTMLImageElement.prototype.decode)return;
  await Promise.all(['blue','red'].map(async color=>{const i=new Image();i.src=`/art/biblion/seeker-${color}.png`;await i.decode().catch(()=>{});}));
}

/** One timeline drives portraits, coin, audio and deal. Abort always restores the board. */
export async function playDuelOpening(o:OpeningOptions):Promise<void>{
  if(o.signal.aborted)return;
  const game=o.root.querySelector<HTMLElement>('.game');
  const host=document.createElement('div');host.className='duel-opening duel-opening-v1 cointoss-ov';
  // Override legacy .cointoss-ov layout/backdrop; the veil is sampled by our clock.
  host.style.cssText='display:block;background:none;backdrop-filter:none;animation:none';
  host.setAttribute('role','region');host.setAttribute('aria-label',label('デュエル開幕','Duel opening','듀얼 시작'));
  const veil=document.createElement('div');veil.className='duel-opening-veil';
  const lines=document.createElement('div');lines.className='duel-opening-lines';
  const center=document.createElement('div');center.className='opening-center';center.innerHTML='<img src="/art/brand/lore-logo-transparent.webp" alt="LORE"><span>DUEL</span>';
  host.append(veil,lines,center);
  const players=[o.me,o.opp].map((p,i)=>{
    const holder=document.createElement('div');holder.className=`opening-player ${i?'is-opp':'is-me'}`;
    const art=document.createElement('div');art.className='opening-art';
    const color=p.avatar==='SEEKER_RED'?'red':p.avatar==='SEEKER_BLUE'?'blue':i?'red':'blue';
    art.style.backgroundImage=`url('/art/biblion/seeker-${color}.png')`;holder.append(art);
    const name=document.createElement('div');name.className='opening-name';
    const side=document.createElement('small');side.textContent=i?'OPPONENT':'YOU';name.append(side,document.createTextNode(p.name));
    host.append(holder,name);return {holder,name,art};
  });
  const result=document.createElement('div');result.className='opening-result';result.setAttribute('role','status');
  const title=document.createElement('strong');title.textContent=o.firstIsMe?t('coin.youFirst'):label('相手が先攻','Opponent goes first','상대 선공');
  const subtitle=document.createElement('span');subtitle.textContent=o.firstIsMe?o.me.name:o.opp.name;result.append(title,subtitle);host.append(result);
  const faces=document.createElement('div');faces.className='opening-faces';faces.setAttribute('aria-hidden','true');
  for(const [p,i] of [[o.firstIsMe?o.me:o.opp,0],[o.firstIsMe?o.opp:o.me,1]] as const){
    const face=document.createElement('div');face.className='ct-face';face.innerHTML=`<span class="ct-avatar-mask">${avatarHtml(p.avatar||(p===o.me?'SEEKER_BLUE':'SEEKER_RED'),p.name,96)}</span><img class="ct-frame" src="/ui/coin-toss/coin-option-1-${i?'back':'front'}.png" alt="">`;faces.append(face);
  }
  host.append(faces);
  const fallback=document.createElement('div');fallback.className='opening-fallback-coin';fallback.innerHTML=avatarHtml((o.firstIsMe?o.me:o.opp).avatar||(o.firstIsMe?'SEEKER_BLUE':'SEEKER_RED'),'');host.append(fallback);
  game?.classList.add('duel-intro-active');document.body.append(host);
  const life=new AbortController();const props:{coin:OpeningCoin|null}={coin:null};let frame=0,dead=false,skipped=false,dealt=false,deal:Promise<void>=Promise.resolve();
  const audio=openingAudio();let last=-1,started=false;
  const stopAudio=()=>audio.stop();
  const skipIntro=()=>{skipped=true;stopAudio();life.abort();if(o.sampleMs!=null)release();};
  const onResize=()=>{if(o.sampleMs==null)skipIntro();};
  const onHidden=()=>{if(document.hidden&&o.sampleMs==null)skipIntro();};
  window.addEventListener('resize',onResize);document.addEventListener('visibilitychange',onHidden);
  let release=()=>{};
  const aborted=new Promise<void>(resolve=>{release=resolve;});
  const cancel=()=>{life.abort();stopAudio();release();};
  o.signal.addEventListener('abort',cancel,{once:true});
  try{
    let timeout:ReturnType<typeof setTimeout>|undefined;let acceptingCoin=true;
    await Promise.race([prepareOpeningCoin(o.root,[...faces.children] as HTMLElement[],life.signal).then(c=>{if(!acceptingCoin||dead||life.signal.aborted)c?.dispose();else props.coin=c;}),new Promise<void>(r=>{timeout=setTimeout(r,1200);}),aborted]);
    acceptingCoin=false;
    clearTimeout(timeout);
    if(o.signal.aborted)return;
    const start=performance.now();
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const elapsed=o.elapsed??(()=>performance.now()-start);
    const end=reduced&&!o.elapsed?1000:DUEL_OPENING_MS;
    const paint=(ms:number)=>{
      if(!started&&ms>=0&&o.sampleMs==null){started=true;o.onStart?.(ms);}
      const fast=skipped||reduced;
      const visual=fast?Math.max(OPENING_REVEAL_MS,ms):ms;
      host.dataset.openingPhase=openingPhase(ms);host.dataset.openingMs=String(Math.round(ms));
      const dock=fast?1:smooth((visual-OPENING_DOCK_MS)/700), entrance=smooth((visual-120)/500);
      veil.style.opacity=String(fast?.12:mix(.96,0,smooth((visual-OPENING_DOCK_MS)/900)));
      lines.style.opacity=String((1-dock)*entrance*.8);center.style.opacity=String((1-dock)*entrance);
      const mobile=innerWidth<600;
      players.forEach(({holder,name,art},i)=>{
        const target=game?.querySelector<HTMLElement>(i?'#portraitOpp .pt-ring':'#portraitMe .pt-ring')?.getBoundingClientRect();
        const pw=mobile?Math.min(innerWidth*.58,innerHeight*.29):Math.min(410,innerHeight*.58,innerWidth*.32),ph=pw*(mobile?1:1.06);
        const x=mobile?innerWidth*(i?.62:.38):innerWidth*(i?.73:.27),y=mobile?innerHeight*(i?.27:.70):innerHeight*.47;
        const drift=(1-entrance)*(i?75:-75);
        const width=mix(pw,target?.width||90,dock),height=mix(ph,target?.height||90,dock);
        const cx=mix(x+drift,target?target.left+target.width/2:innerWidth/2,dock),cy=mix(y,target?target.top+target.height/2:innerHeight*(i?.12:.88),dock);
        holder.style.width=`${width}px`;holder.style.height=`${height}px`;holder.style.transform=`translate(${cx-width/2}px,${cy-height/2}px)`;
        holder.style.borderRadius=`${mix(3,50,dock)}%`;holder.style.opacity=String(fast||dock===1?0:entrance);
        art.style.transform=`scale(${1+(1-dock)*(.025+.025*(1-entrance))})`;
        const nameY=mobile&&i?y-ph/2-57:y+ph/2+(mobile?16:24);
        name.style.width=`${pw+40}px`;name.style.transform=`translate(${x-pw/2-20}px,${nameY}px)`;name.style.opacity=String((1-dock)*entrance);
      });
      game?.classList.toggle('intro-docked',dock===1);
      const reveal=visual>=OPENING_REVEAL_MS&&visual<OPENING_DEAL_MS||fast;
      result.setAttribute('aria-hidden',String(!reveal));
      result.style.opacity=String(reveal?fast?1:Math.sin(Math.PI*clamp((visual-OPENING_REVEAL_MS)/700)):0);
      result.style.transform=`translate(-50%,-50%) scale(${mix(.94,1,smooth((visual-OPENING_REVEAL_MS)/220))})`;
      game?.classList.toggle(o.firstIsMe?'intro-first-me':'intro-first-opp',reveal);
      const lane=game?.querySelector<HTMLElement>('#meRow .zone-mon')?.getBoundingClientRect();
      const x=lane&&lane.width>100?lane.left+lane.width*.5:innerWidth*.5,y=lane&&lane.height>35?lane.top+lane.height*.52:innerHeight*.68;
      const radius=Math.min(58,Math.max(28,innerWidth*.036));
      props.coin?.paint(fast?-1:visual-OPENING_TOSS_MS,x,y,radius);
      fallback.style.display=!props.coin&&!fast&&visual>=OPENING_TOSS_MS&&visual<(OPENING_REVEAL_MS+450)?'block':'none';
      fallback.style.left=`${x-43}px`;fallback.style.top=`${y-43-Math.sin(Math.PI*clamp((visual-OPENING_TOSS_MS)/1500))*65}px`;
      fallback.style.transform=`rotateY(${(1-clamp((visual-OPENING_TOSS_MS)/1500))*1080}deg)`;
      if(!fast&&o.sampleMs==null){
        for(const [at,key] of [[180,'rise'],[OPENING_TOSS_MS,'toss'],[(OPENING_TOSS_MS+630),'land'],[OPENING_REVEAL_MS,'reveal']] as const)
          if(!(key==='rise'&&o.onStart)&&last<at&&ms>=at&&ms-at<150)audio.play(key);
      }
      last=ms;
      if(o.sampleMs!=null&&ms>=OPENING_DEAL_MS)game?.classList.add('intro-dealing');
      if(o.sampleMs==null&&!dealt&&(ms>=OPENING_DEAL_MS||fast)){
        dealt=true;game?.classList.add('intro-dealing');
        if(!fast)deal=o.onDeal(life.signal).catch(()=>{});
      }
      if(skipped&&o.elapsed)subtitle.textContent=label('まもなく開始','Starting shortly','곧 시작합니다');
    };
    if(o.sampleMs!=null){paint(o.sampleMs);await aborted;}
    else await Promise.race([aborted,new Promise<void>(resolve=>{
      const tick=()=>{
        if(o.signal.aborted||!host.isConnected){resolve();return;}
        const ms=elapsed();paint(ms);
        if(ms>=end||skipped&&!o.elapsed){resolve();return;}
        frame=requestAnimationFrame(tick);
      };tick();
    })]);
    life.abort();await deal;
  }finally{
    dead=true;life.abort();cancelAnimationFrame(frame);stopAudio();props.coin?.dispose();
    o.signal.removeEventListener('abort',cancel);window.removeEventListener('resize',onResize);document.removeEventListener('visibilitychange',onHidden);
    host.remove();game?.classList.remove('duel-intro-active','intro-docked','intro-dealing','intro-first-me','intro-first-opp');
  }
}
