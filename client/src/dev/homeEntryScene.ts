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

const variant=Math.max(0,Math.min(5,Number(new URLSearchParams(location.search).get('scene'))||0));
document.body.className='entry-scene';document.documentElement.lang='ja';initLang('ja');
const root=document.querySelector<HTMLElement>('#app')!;
// Fixture is scoped to this independent preview entry, never imported by main.ts.
api.rankMe=async()=>null;
const noop=()=>{};
const app={root,user:{id:'local-guest-user',display:'SEEKER',credits:1200,wins:0,losses:0,decks:null},home:noop,rankedLobby:noop,onlineLobby:noop,deck:noop,cards:noop,leaderboard:noop,friends:noop,shop:noop,tutorial:noop,settings:noop,profile:noop} as unknown as App;
const home=mountHome(app);const lounge=mountLounge(app,'home');home.destroy?.();root.inert=true;
root.querySelector('#myTier')!.textContent='シーカー · ホーム';
const loader=loadingScreen('screen-loader entry-loader','書庫を開いています');document.body.append(loader.element);
const layer=document.createElement('div');layer.className=`entry-layer variant-${variant}`;layer.setAttribute('aria-hidden','true');document.body.append(layer);
const ornament=`<svg viewBox="0 0 400 600" preserveAspectRatio="none"><g fill="none" stroke="currentColor"><path stroke-width="2" d="M30 90L90 30H310L370 90V510L310 570H90L30 510Z M42 97L97 42H303L358 97V503L303 558H97L42 503Z"/><path opacity=".6" d="M60 150V95L105 60H295L340 95V150M60 450V505L105 540H295L340 505V450M80 110L120 70M320 110L280 70M80 490L120 530M320 490L280 530 M200 50V190M200 410V550"/><path d="M200 180L290 300L200 420L110 300Z M200 210L264 300L200 390L136 300Z M110 300H60M290 300H340"/><ellipse cx="200" cy="300" rx="51" ry="24"/><circle cx="200" cy="300" r="18"/><path d="M200 255V275M200 325V345M148 300H166M234 300H252"/><g opacity=".55">${Array.from({length:12},(_,i)=>`<path d="M${95+i*19} 100v${8+i%3*5} M${95+i*19} 492v${8+i%3*5}"/>`).join('')}</g></g></svg>`;
layer.innerHTML=`<div class="entry-wash"></div><div class="entry-doors"><div class="entry-door left">${ornament}<div class="door-inset"></div></div><div class="entry-door right">${ornament}<div class="door-inset"></div></div></div><div class="entry-book"><div class="book-page left">${ornament}<div class="page-lines"></div></div><div class="book-page right">${ornament}<div class="page-lines"></div></div><div class="book-spine"></div></div><div class="entry-cards">${Array.from({length:7},(_,i)=>`<div class="entry-card" data-card="${i}">${loadingSigil()}</div>`).join('')}</div><div class="entry-arches">${Array.from({length:3},(_,i)=>`<div class="entry-arch arch-${i}"><div class="arch-engraving">${ornament}</div></div>`).join('')}</div><canvas class="entry-canvas"></canvas><div class="entry-beam"></div>`;
const el=(s:string)=>layer.querySelector<HTMLElement>(s)!;
const canvas=layer.querySelector('canvas')!,ctx=canvas.getContext('2d')!;
const atmosphere=root.querySelector<HTMLElement>('.lounge-atmosphere')!;
const chrome=[root.querySelector<HTMLElement>('.lounge-topbar')!,root.querySelector<HTMLElement>('.lounge-play')!,root.querySelector<HTMLElement>('.lounge-active-deck')!,root.querySelector<HTMLElement>('.lounge-rail')!];
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const smooth=(a:number,b:number,t:number)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x);};
const out=(a:number,b:number,t:number)=>1-Math.pow(1-clamp((t-a)/(b-a)),3);
let last=0,reduced=false;
const anims:Animation[]=[];
function freeze(){for(const a of document.getAnimations()){a.pause();if(a.effect instanceof KeyframeEffect && a.effect.target && loader.element.contains(a.effect.target))anims.push(a);}}
function paint(ms:number,reduce=false){
 last=ms;reduced=reduce;const t=ms/1000;const w=innerWidth,h=innerHeight;
 if(canvas.width!==Math.round(w)||canvas.height!==Math.round(h)){canvas.width=Math.round(w);canvas.height=Math.round(h);}ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);
 for(const a of anims){try{a.currentTime=ms;}catch{}}
 if(reduce){root.style.opacity=String(smooth(.5,.85,t));root.style.transform='none';root.style.filter='none';root.style.clipPath='none';layer.style.display='none';loader.element.style.opacity=String(1-smooth(.5,.85,t));loader.element.style.transform='none';for(const c of chrome){c.style.opacity='1';c.style.transform='none';}return;}
 layer.style.display=t>=4.15?'none':'block';
 const leave=smooth(.55,1.04,t);loader.element.style.opacity=String(1-leave);loader.element.style.transform=`translateY(${-leave*16}px) scale(${1+leave*.06})`;loader.element.style.pointerEvents='none';
 root.style.opacity='1';root.style.clipPath='none';root.style.transform='none';root.style.filter='none';atmosphere.style.transform='none';
 el('.entry-wash').style.opacity=String(1-smooth(.85,1.7,t));
 el('.entry-doors').style.display=variant===0?'block':'none';el('.entry-book').style.display=variant===1?'block':'none';el('.entry-cards').style.display=variant===3?'block':'none';el('.entry-arches').style.display=variant===4?'block':'none';
 const start=[1.8,1.75,1.6,2.0,2.1,1.5][variant];
 chrome.forEach((c,i)=>{const p=out(start+i*.12,start+.85+i*.12,t);c.style.opacity=String(p);c.style.transform=`translateY(${(1-p)*(i===0?-18:24)}px)`;});
 el('.entry-beam').style.opacity='0';
 if(variant===0){
  const p=smooth(.92,2.9,t);root.style.transform=`scale(${1.075-.075*out(1.0,3.2,t)})`;
  for(const side of ['left','right']){const d=el('.entry-door.'+side);const s=side==='left'?-1:1;d.style.transform=`perspective(${w*1.4}px) translateX(${s*p*108}%) rotateY(${-s*p*38}deg)`;d.style.filter=`brightness(${1+Math.sin(p*Math.PI)*.6})`;}
  glow(w/2,h*.5,1-smooth(1.15,2.5,t),Math.max(2,p*w*.06),h*.46);
 }else if(variant===1){
  const p=smooth(.85,2.55,t);const book=el('.entry-book');book.style.transform=`translate(-50%,-50%) scale(${.58+.65*out(.68,1.65,t)})`;
  book.style.opacity=String(1-smooth(2.5,3,t));
  for(const side of ['left','right']){const s=side==='left'?-1:1;el('.book-page.'+side).style.transform=`perspective(${w}px) translateX(${s*p*45}%) rotateY(${-s*p*89.5}deg)`;}
  el('.book-spine').style.opacity=String(1-p);root.style.transform=`scale(${1.1-.1*out(1.25,3.25,t)})`;glow(w/2,h/2,Math.sin(p*Math.PI)*.65,8,h*.4);
 }else if(variant===2){
  ink(t,w,h);
 }else if(variant===3){
  const spread=out(.73,1.65,t),fly=smooth(1.55,3.15,t);
  el('.entry-cards').style.opacity=String(1-smooth(2.88,3.25,t));
  layer.querySelectorAll<HTMLElement>('.entry-card').forEach((c,i)=>{const n=i-3,delay=Math.abs(n)*.035;const f=smooth(1.5+delay,3+delay,t);c.style.transform=`translate(-50%,-50%) translate(${n*w*.13*spread+n*w*.22*f}px,${Math.abs(n)*h*.027*spread-h*.92*f}px) rotate(${n*10*spread+n*22*f}deg) rotateY(${f*72}deg) scale(${.7+.2*spread-.3*f})`;c.style.filter=`brightness(${1+.7*Math.sin(f*Math.PI)})`;c.style.zIndex=String(10-Math.abs(n));});
  root.style.transform=`scale(${1.04-.04*fly})`;root.style.opacity=String(smooth(1.2,2.15,t));
 }else if(variant===4){
  const p=out(.85,3.5,t);root.style.transform=`scale(${.85+.15*p})`;root.style.filter=`brightness(${.35+.65*p})`;
  layer.querySelectorAll<HTMLElement>('.entry-arch').forEach((a,i)=>{const q=out(.75+i*.2,3.2+i*.15,t);a.style.transform=`translate(-50%,-50%) scale(${(.62+i*.24)*(1+q*4.5)})`;a.style.opacity=String(1-smooth(2.0+i*.18,2.85+i*.18,t));});
 }else{
  const p=out(.85,2.8,t);root.style.filter=`brightness(${.1+.9*p})`;root.style.clipPath=`inset(0 ${(1-p)*100}% 0 0)`;
  const beam=el('.entry-beam');beam.style.left=`${p*100}%`;beam.style.opacity=String(Math.sin(clamp((t-.85)/2)*Math.PI)*.65);
  // Traces follow the actual UI perimeter, then recede into the final controls.
  for(let i=0;i<chrome.length;i++){const q=smooth(1.3+i*.18,2+i*.18,t),fade=1-smooth(2.2+i*.2,2.65+i*.2,t),r=chrome[i].getBoundingClientRect();ctx.strokeStyle=`rgba(183,229,250,${fade*.75})`;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(r.x,r.y+r.height);ctx.lineTo(r.x,r.y+r.height*(1-q));if(q>.5){ctx.lineTo(r.x+(q-.5)*2*r.width,r.y);}ctx.stroke();}
 }
}
function glow(x:number,y:number,a:number,rx:number,ry:number){if(a<=0)return;ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);const g=ctx.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,`rgba(223,247,255,${a*.8})`);g.addColorStop(.15,`rgba(119,191,231,${a*.3})`);g.addColorStop(1,'rgba(100,180,230,0)');ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore();}
function ink(t:number,w:number,h:number){
 const p=smooth(.9,3.15,t);if(p>=1)return;
 const cx=w*.48,cy=h*.48,max=Math.hypot(w,h)*.72,r=max*p;
 ctx.fillStyle='#071322';ctx.fillRect(0,0,w,h);
 // Surface engraving stays attached to the dissolving membrane.
 ctx.strokeStyle=`rgba(158,201,225,${.12+.34*Math.sin(p*Math.PI)})`;ctx.lineWidth=.7;
 for(let i=-8;i<15;i++){ctx.beginPath();ctx.moveTo(i*100,0);ctx.bezierCurveTo(i*100+100,h*.3,i*100-120,h*.7,i*100+80,h);ctx.stroke();}
 function boundary(rad:number){ctx.beginPath();for(let i=0;i<=180;i++){const a=i/180*Math.PI*2,rr=Math.max(0,rad+(Math.sin(a*7+t*2)*14+Math.sin(a*13-t*3)*6)*Math.sin(p*Math.PI));const x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr*.8;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();}
 ctx.save();ctx.globalCompositeOperation='destination-out';boundary(r);ctx.fill();ctx.restore();
 boundary(r+2);ctx.strokeStyle=`rgba(185,224,245,${Math.sin(p*Math.PI)*.9})`;ctx.lineWidth=1.8;ctx.stroke();boundary(r+9);ctx.strokeStyle=`rgba(87,152,191,${Math.sin(p*Math.PI)*.4})`;ctx.lineWidth=6;ctx.stroke();
 for(let i=0;i<24;i++){const a=i*2.399,rr=r+20+Math.sin(i*5)*10,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr*.8;ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle=`rgba(169,216,242,${Math.sin(p*Math.PI)*.45})`;ctx.fillRect(0,0,2+5*(1-p),1);ctx.restore();}
}
window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===parent&&e.data.kind==='lore-entry-time')paint(Math.max(0,Math.min(4400,e.data.time)),!!e.data.reduced);});
window.addEventListener('resize',()=>paint(last,reduced));
async function ready(){await Promise.all(imageUrls(document.body).filter(url=>!url.startsWith('data:')).map(async url=>{try{await decodeAsset(url);}catch{throw new Error(`Image decode failed: ${url}`);}}));await document.fonts.ready;loader.update(100,'準備完了');freeze();paint(0);document.body.dataset.ready='true';parent.postMessage({kind:'lore-entry-ready'},location.origin);}
void ready().catch(e=>{document.body.dataset.error=String(e);loader.element.querySelector('.loading-phase')!.textContent='画像を準備できませんでした。ページを再読み込みしてください。';});
window.addEventListener('pagehide',()=>{lounge();home.destroy?.();for(const a of anims)a.cancel();});
