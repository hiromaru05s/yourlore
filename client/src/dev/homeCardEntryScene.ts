import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/screens.css';
import '../styles/mobile.css';
import '../styles/lounge.css';
import '../styles/loungeGame.css';
import '../styles/loungeStage.css';
import '../styles/presentation.css';
import './homeEntryScene.css';
import {mountHome} from '../screens/home';
import {mountLounge} from '../ui/lounge';
import {loadingSigil} from '../ui/loadingSigil';
import {loadingScreen} from '../ui/loadingScreen';
import {imageUrls,decodeAsset} from '../ui/assetReadiness';
import {api} from '../net/api';
import {initLang} from '../i18n';
import type {App} from '../router';

import './homeCardEntryScene.css';
import {cardPose,ease,out} from './homeCardEntryMotion';
const variant=Math.max(0,Math.min(7,Number(new URLSearchParams(location.search).get('scene'))||0));
document.body.className='entry-scene card-entry-scene';initLang('ja');
const root=document.querySelector<HTMLElement>('#app')!;
api.rankMe=async()=>null;
const noop=()=>{};
const app={root,user:{id:'local-guest-user',display:'SEEKER',credits:1200,wins:0,losses:0,decks:null},home:noop,rankedLobby:noop,onlineLobby:noop,deck:noop,cards:noop,leaderboard:noop,friends:noop,shop:noop,tutorial:noop,settings:noop,profile:noop} as unknown as App;
const home=mountHome(app),lounge=mountLounge(app,'home');home.destroy?.();root.inert=true;root.querySelector('#myTier')!.textContent='シーカー · ホーム';
const loader=loadingScreen('screen-loader entry-loader','書庫を開いています');document.body.append(loader.element);
const veil=document.createElement('div');veil.className='invitation-veil';document.body.append(veil);
const layer=document.createElement('div');layer.className='invitation-stage';layer.setAttribute('aria-hidden','true');
const face=loadingSigil();
layer.innerHTML=Array.from({length:7},(_,i)=>`<div class="invitation-card" data-card="${i}"><div class="invitation-face front">${face}<div class="invitation-etch">${face}</div><div class="invitation-sheen"></div></div><div class="invitation-face back">${face}</div></div>`).join('')+'<div class="invitation-contact"></div>';
document.body.append(layer);
const cards=[...layer.querySelectorAll<HTMLElement>('.invitation-card')];
const chrome=['.lounge-topbar','.lounge-play','.lounge-active-deck','.lounge-rail'].map(s=>root.querySelector<HTMLElement>(s)!);
const ritual=loader.element.querySelector<HTMLElement>('.loading-ritual')!;
const loadingCard=loader.element.querySelector<HTMLElement>('.loading-card--hero')!;
const contact=layer.querySelector<HTMLElement>('.invitation-contact')!;
const animations:Animation[]=[];
let time=0,reduced=false,ready=false;
let source={x:innerWidth/2,y:innerHeight/2,scale:132/180};
let dock={x:innerWidth*.75,y:innerHeight*.82,width:45};
function measure(){
 // Read the original loading card and final deck in their untransformed states.
 const old=loader.element.style.transform;loader.element.style.transform='none';
 const r=loadingCard.getBoundingClientRect();source={x:r.x+r.width/2,y:r.y+r.height/2,scale:r.width/180};loader.element.style.transform=old;
 const deck=chrome[2],previous=deck.style.transform;deck.style.transform='none';const d=deck.querySelector('img')!.getBoundingClientRect();dock={x:d.x+d.width/2,y:d.y+d.height/2,width:d.width};deck.style.transform=previous;
}
function paint(ms:number,reduce=false){
 time=ms;reduced=reduce;const t=ms/1000,w=innerWidth,h=innerHeight;
 const leave=ease(.58,1.0,t);loader.element.style.opacity=String(1-leave);loader.element.style.transform=`translateY(${-leave*12}px)`;
 for(const a of animations){try{a.currentTime=Math.min(ms,550);}catch{}}
 ritual.style.visibility=t>=.57?'hidden':'visible';
 if(reduce){root.style.opacity=String(ease(.55,.85,t));root.style.transform='none';layer.style.display='none';veil.style.opacity='0';ritual.style.visibility='visible';for(const c of chrome){c.style.opacity='1';c.style.transform='none';}return;}
 root.style.opacity='1';root.style.transform='none';layer.style.display=t>=3.8?'none':'block';veil.style.opacity=String(1-ease(.9,1.92,t));
 const start=variant===7?1.55:variant===6?2.35:1.9;
 chrome.forEach((c,i)=>{const p=out(start+i*.105,start+.7+i*.105,t);c.style.opacity=String(p);c.style.transform=`translateY(${(1-p)*(i===0?-14:18)}px)`;});
 for(let i=0;i<cards.length;i++){
  const n=i-3,c=cards[i],p=cardPose(variant,i,t,w,h,dock),blend=p.spread;
  const x=source.x*(1-blend)+w/2*blend+p.x+(Math.abs(n)===1?n*26:0)*(1-blend);
  const y=source.y*(1-blend)+h*.5*blend+p.y;
  const scale=source.scale*(1-blend)+p.scale*blend;
  c.style.left=x+'px';c.style.top=y+'px';
  c.style.transform=`translate(-50%,-50%) rotateZ(${p.rz+(n===0?-4:n*17)*(1-blend)}deg) rotateY(${p.ry}deg) rotateX(${p.rx}deg) scale(${scale})`;
  c.style.opacity=String(p.opacity*ease(.54,.59,t)*(Math.abs(n)>1?ease(.64,.95,t):1));
  c.style.zIndex=String(20-Math.abs(n));
  const charge=ease(.72+i*.045,1.22+i*.045,t),pass=ease(1.3+i*.045,1.97+i*.045,t);
  const etch=c.querySelector<HTMLElement>('.invitation-etch')!;etch.style.clipPath=`inset(${(1-charge)*100}% 0 ${pass*100}% 0)`;etch.style.opacity=String(.9*(1-ease(2,2.6,t)));
  c.querySelector<HTMLElement>('.invitation-sheen')!.style.transform=`translateX(${-130+ease(.7+i*.04,1.7+i*.04,t)*280}%) rotate(-15deg)`;
  c.style.setProperty('--edge',String(.2+.55*Math.sin(charge*Math.PI)));
 }
 const touch=variant===7?ease(2.95,3.08,t)*(1-ease(3.16,3.65,t)):0;
 contact.style.left=dock.x+'px';contact.style.top=(dock.y+dock.width*.7)+'px';contact.style.width=dock.width*2+'px';contact.style.opacity=String(touch);contact.style.transform=`translate(-50%,-50%) scaleX(${.7+.3*ease(2.95,3.65,t)})`;
 document.body.dataset.time=String(ms);
}
window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===parent&&e.data?.kind==='lore-entry-time'&&Number.isFinite(e.data.time)){paint(Math.max(0,Math.min(4400,e.data.time)),!!e.data.reduced);}});
window.addEventListener('resize',()=>{if(ready){measure();paint(time,reduced);}});
async function prepare(){
 await Promise.all(imageUrls(document.body).filter(u=>!u.startsWith('data:')).map(decodeAsset));await document.fonts.ready;
 loader.update(100,'準備完了');for(const a of document.getAnimations()){a.pause();a.currentTime=0;if(a.effect instanceof KeyframeEffect&&a.effect.target&&loader.element.contains(a.effect.target))animations.push(a);}
 measure();ready=true;paint(0);document.body.dataset.ready='true';parent.postMessage({kind:'lore-entry-ready'},location.origin);
}
void prepare().catch(e=>{document.body.dataset.error=String(e);loader.element.querySelector('.loading-phase')!.textContent='画像の準備に失敗しました。ページを再読み込みしてください。';});
window.addEventListener('pagehide',()=>{lounge();home.destroy?.();for(const a of animations)a.cancel();});
