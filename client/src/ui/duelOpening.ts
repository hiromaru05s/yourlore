import {mountCeremony} from './ceremonyMount';
import {avatarHtml} from './social';
import {sfx} from './sound';
import {t} from '../i18n';
type Profile={name:string;avatar:string|null};
let activeOpening:(()=>void)|null=null;
/** The authoritative first player is revealed; this sequence never rerolls it. */
export function playDuelOpening(me:Profile,opp:Profile,firstIsMe:boolean,previewHoldMs=0):Promise<void>{
 activeOpening?.();
 const host=document.createElement('div');host.className='cointoss-ov duel-opening';host.setAttribute('role','status');
 const banner=document.createElement('div');banner.className='opening-heading';banner.innerHTML='<span>THE ARCHIVE AWAKENS</span><strong>LORE</strong>';
 const pair=document.createElement('div');pair.className='opening-pair';
 for(const [p,isMe] of [[me,true],[opp,false]] as const){const figure=document.createElement('div');figure.className='ceremony-opening-player '+(isMe?'is-me':'is-opp')+(isMe===firstIsMe?' is-first':'');
  const art=document.createElement('div');art.className='opening-portrait';art.innerHTML=avatarHtml(p.avatar||(isMe?'SEEKER_BLUE':'SEEKER_RED'),p.name,180);
  const frame=document.createElement('img');frame.src=isMe?'/ui/coin-toss/coin-option-1-front.png':'/ui/coin-toss/coin-option-1-back.png';frame.alt='';frame.className='opening-frame';
  const name=document.createElement('strong');name.textContent=p.name;
  figure.append(art,frame,name);pair.append(figure);
 }
 const result=document.createElement('div');result.className='ceremony-opening-result';result.textContent=firstIsMe?t('coin.youFirst'):opp.name+' '+t('coin.oppFirst');
 host.append(banner,pair,result);document.body.append(host);const disposeScene=mountCeremony(host,'opening');sfx('duel-start');
 return new Promise(resolve=>{
  let dead=false;const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const finish=()=>{if(dead)return;dead=true;clearTimeout(fade);clearTimeout(timer);observer.disconnect();document.removeEventListener('visibilitychange',hidden);disposeScene();host.remove();if(activeOpening===finish)activeOpening=null;resolve();};
  activeOpening=finish;
  const hidden=()=>{if(document.hidden)finish();};document.addEventListener('visibilitychange',hidden);
  const observer=new window.MutationObserver(()=>{if(!host.isConnected)finish();});observer.observe(document.body,{childList:true});
  const fade=setTimeout(()=>host.classList.add('out'),reduced?650:2850+previewHoldMs),timer=setTimeout(finish,reduced?800:3200+previewHoldMs);
 });
}
