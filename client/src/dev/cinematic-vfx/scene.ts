import '../../styles/fonts.css';
import '../../styles/reading-board.css';
import '../../styles/tokens.css';
import '../../styles/base.css';
import '../../styles/card.css';
import '../../styles/game-overlays.css';
import '../../styles/game.css';
import '../../styles/dice.css';
import '../../styles/screens.css';
import '../../styles/mobile.css';
import '../../styles/duel-opening.css';
import '../../styles/lounge.css';
import '../../styles/loungeGame.css';
import '../../styles/loungeStage.css';
import '../../styles/presentation.css';
import '../../styles/defaultUI.css';
import './scene.css';
import {GameView,setMyAvatar,setOppAvatar} from '../../ui/boardView';
import {createGame} from '../../shared/engine';
import {DB,FRAME_BACK} from '../../shared/cards';
import {setLang} from '../../i18n';
import {startBoardLayout} from '../../ui/layout';
import {waitForDuel} from '../../ui/duelReadiness';
import {captureNativePrint} from '../../ui/cardPrintCapture';
import {projectedPlacement} from '../../ui/boardProjection';
import {exposure,sparks,haze,contactDust,planeShadow} from './realistic';
import {clearMonsterStates} from '../../ui/monster/runtime';
import {MaterialStage,type Pose} from './material';
import {DURATIONS,clamp,ease,out,lerp,point,bezier,rnd,phase,type Kind,type Rect} from './direction';
import {glow,shadow,ribbon,splinters} from './paint';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
const root=document.getElementById('app')!;const noop=()=>{};
const view=new GameView(root,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop});
const stopLayout=startBoardLayout();
const g=createGame({mode:'bot',seed:71,starting:0,p0:{id:'vfx-me',name:'シーカー'},p1:{id:'vfx-opp',name:'シーカー'}}).state;
g.turn=3;g.phase='main';g.pending=null;g.sleeves=['default','default'];g.furnitures=['default','default'];
for(const [i,p] of g.players.entries()){
 Object.assign(p,{openingDrawReady:false,mana:8,maxMana:10,hp:30,maxHp:30,enchants:[],quests:[],traps:[],discard:[],removed:[]});
 p.field=['M4','M2','M5'].map((id,n)=>({...DB[id],uid:`field-${i}-${n}`,exhausted:false,summonedTurn:0,dmg:0,tempAtk:0,atkMod:0,defMod:0}));
 p.hand=['M4','FIRE_BALL','M3'].map((id,n)=>({...DB[id],uid:`hand-${i}-${n}`}));
 p.deck=Array.from({length:12},(_,n)=>({...DB.M3,uid:`deck-${i}-${n}`}));
}
view.render(g);view.setHandOpen(true);
const material=new MaterialStage(document.getElementById('material')!);
const rear=document.getElementById('rear') as HTMLCanvasElement,front=document.getElementById('front') as HTMLCanvasElement;
const rc=rear.getContext('2d')!,fc=front.getContext('2d')!;
let kind:Kind='summon',mode='board',side=0,time=0,playing=false,loop=true,speed=1,ready=false,disposed=false,last=0,raf=0,cycleGap=0,soundOn=false,playedCues=new Set<string>();
let nodes:Record<string,HTMLElement>={},rects:Record<string,Rect>={},surfaces:Record<string,HTMLCanvasElement|HTMLImageElement>={};
let sourceActor=-1,targetActor=-1,hidden=new Map<HTMLElement,string>(),prepareId=0;
const post=(value:object)=>parent.postMessage({type:'cinematic-vfx',...value},location.origin);
const node=(uid:string)=>root.querySelector<HTMLElement>(`.card[data-uid="${uid}"]`)!;
function box(n:HTMLElement):Rect{const r=n.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height};}
function restore(){for(const[n,v]of hidden)n.style.visibility=v;hidden.clear();}
function hide(n?:HTMLElement){if(n&&!hidden.has(n)){hidden.set(n,n.style.visibility);n.style.visibility='hidden';}}
function show(n?:HTMLElement){if(n&&hidden.has(n)){n.style.visibility=hidden.get(n)!;hidden.delete(n);}}
function resize(){material.resize();for(const c of[rear,front]){const ratio=Math.min(devicePixelRatio,2);c.width=Math.round(innerWidth*ratio);c.height=Math.round(innerHeight*ratio);c.style.width=innerWidth+'px';c.style.height=innerHeight+'px';c.getContext('2d')!.setTransform(ratio,0,0,ratio,0,0);}}
resize();
const image=new Image();image.src=FRAME_BACK;
function pose(r:Rect,extra:Partial<Pose>={}):Pose{return{...r,time,...extra};}
function mixRect(a:Rect,b:Rect,q:number):Rect{return{...point(a,b,q),w:lerp(a.w,b.w,q),h:lerp(a.h,b.h,q)};}
function flatCard(n:HTMLElement,p:Rect,height=0,rock=0):Pose {
 if(focused()){const scale=1+height/(innerHeight*2.2);return pose({...p,y:p.y-height*.33,w:p.w*scale,h:p.h*scale},{rx:.42+rock*Math.PI/180});}
 const r=box(n),w=n.offsetWidth,h=n.offsetHeight;
 const m=new DOMMatrix().translate(p.x,p.y).scale(p.w/r.w,p.h/r.h).translate(-r.x,-r.y).multiply(projectedPlacement(n,w,h)).translate(w/2,h/2,height).rotateAxisAngle(1,0,0,rock).translate(-w/2,-h/2);
 return pose({...p,w,h},{matrix:m});
}
function footprint(p:Pose){if(p.matrix)return[[0,0],[p.w,0],[p.w,p.h],[0,p.h]].map(([x,y])=>{const q=p.matrix!.transformPoint(new DOMPoint(x,y));return{x:q.x/q.w,y:q.y/q.w};});return[{x:p.x-p.w/2,y:p.y-p.h*.45},{x:p.x+p.w/2,y:p.y-p.h*.45},{x:p.x+p.w/2,y:p.y+p.h*.45},{x:p.x-p.w/2,y:p.y+p.h*.45}];}
function focused(){return mode!=='board';}
function layout(){
 const opponent=side===1;
 for(const key of Object.keys(nodes))rects[key]=box(nodes[key]);
 rects.deck=box(document.getElementById(opponent?'pile-oppDeck':'pile-myDeck')!);
 rects.portrait=box(document.querySelector<HTMLElement>(opponent?'#portraitMe .pt-ring':'#portraitOpp .pt-ring')!);
 if(opponent){const hand=box(document.getElementById('oppHand')!);rects.hand={...hand,x:hand.x-12,w:rects.source.w*.65,h:rects.source.w*.95};rects.draw={...rects.hand,x:hand.x+20};rects.spell={...rects.hand,x:hand.x+30};}
 if(focused()){
 const w=innerWidth,h=innerHeight,u=Math.min(w*(w<700?.27:.19),h*.34,190),sign=opponent?-1:1;
 const ratio=rects.source.h/rects.source.w,targetRatio=rects.target.h/rects.target.w;
 rects.source={x:w*.40,y:h*.61,w:u*.86,h:u*.86*ratio};rects.target={x:w*.67,y:h*.38,w:u*.80,h:u*.80*targetRatio};
 rects.hand={x:w*.28,y:h*.76,w:u*.60,h:u*.88};rects.draw={x:w*.38,y:h*.72,w:u*.7,h:u*1.02};
 rects.spell={x:w*.32,y:h*.69,w:u*.66,h:u*.96};rects.deck={x:w*.78,y:h*.68,w:u*.7,h:u};rects.portrait={x:w*.69,y:h*.34,w:u,h:u};
 if(sign<0)for(const r of Object.values(rects)){r.x=w-r.x;r.y=h-r.y;}
 }
}
async function prepare(){
 const id=++prepareId;playing=false;ready=false;post({ready:false});restore();
 clearMonsterStates(root);
 nodes={source:node(`field-${side}-0`),target:node(`field-${1-side}-1`),hand:node('hand-0-0'),draw:node('hand-0-2'),spell:node('hand-0-1')};
 await Promise.all([...root.querySelectorAll('img')].map(i=>i.decode().catch(()=>{})));
 // Native snapshots preserve the adopted frame, art, printed text, and numeric seals.
 const results=await Promise.all(Object.entries(nodes).map(async([key,n])=>[key,await captureNativePrint(n,640,0)] as const));
 if(id!==prepareId||disposed)return;surfaces=Object.fromEntries(results);await image.decode();surfaces.back=image;
 configure();ready=true;time=0;playedCues.clear();playing=!matchMedia('(prefers-reduced-motion:reduce)').matches;last=performance.now();render();post({ready:true,kind});
}
function configure(){restore();material.clearActors();layout();
 const face=kind==='draw'?(side?surfaces.back:surfaces.draw):kind==='summon'?surfaces.hand:kind==='attack'?surfaces.source:surfaces.spell;
 sourceActor=material.add(kind==='draw'?surfaces.back:face,kind==='draw'?face:kind==='summon'?surfaces.source:face);
 targetActor=material.add(surfaces.target);
 if(!focused()){
  if(kind==='draw')hide(side?undefined:nodes.draw);
  if(kind==='summon'){hide(nodes.source);if(!side)hide(nodes.hand);}
  if(kind==='attack'){hide(nodes.source);hide(nodes.target);}
  if(kind==='spell'&&!side)hide(nodes.spell);
 }
 document.body.dataset.mode=mode;
}
let audio:AudioContext|undefined;
function cue(key:string,at:number,duration:number,base:number,volume:number){if(!soundOn||!playing||time<at||playedCues.has(key))return;playedCues.add(key);audio??=new AudioContext();void audio.resume();const now=audio.currentTime;
 const gain=audio.createGain();gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(volume,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);gain.connect(audio.destination);
 const osc=audio.createOscillator();osc.type='sine';osc.frequency.setValueAtTime(base,now);osc.frequency.exponentialRampToValueAtTime(Math.max(25,base*.22),now+duration);osc.connect(gain);osc.start(now);osc.stop(now+duration);
 const buffer=audio.createBuffer(1,audio.sampleRate*duration,audio.sampleRate);const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(rnd(i+77)*2-1)*.55;const noise=audio.createBufferSource();noise.buffer=buffer;const filter=audio.createBiquadFilter();filter.type='bandpass';filter.frequency.setValueAtTime(base*5,now);filter.frequency.exponentialRampToValueAtTime(base,now+duration);noise.connect(filter);filter.connect(gain);noise.start(now);noise.stop(now+duration);
}
function render(){if(!ready)return;material.energy.clear();layout();rc.clearRect(0,0,innerWidth,innerHeight);fc.clearRect(0,0,innerWidth,innerHeight);material.pose(sourceActor,{x:0,y:0,w:1,h:1,alpha:0});material.pose(targetActor,{x:0,y:0,w:1,h:1,alpha:0});
 if(focused()){
  const ground={x:innerWidth/2,y:innerHeight*.76};shadow(rc,ground,innerWidth*.38,innerHeight*.07,.26);
  if(kind==='draw'){const r=rects.deck;for(let i=5;i>=0;i--){rc.save();rc.translate(r.x+i*.8,r.y+i*1.5);rc.rotate(.10);rc.drawImage(image,-r.w/2,-r.h/2,r.w,r.h);rc.restore();}}
  if(kind==='summon'||kind==='attack'){material.pose(targetActor,pose(rects.target));}
  if(kind==='spell'){material.pose(targetActor,pose(rects.target));rects.portrait={...rects.target};}
 }
 if(!focused()){if(kind==='draw'&&!side)hide(nodes.draw);if(kind==='summon'){hide(nodes.source);if(!side)hide(nodes.hand);}if(kind==='attack'){hide(nodes.source);hide(nodes.target);}}
 if(kind==='draw')draw();if(kind==='summon')summon();if(kind==='attack')attack();if(kind==='spell')spell();
 if(!focused()){const complete=time>({draw:2.08,summon:2.35,attack:1.62,spell:99}[kind]);if(complete){material.pose(sourceActor,{x:0,y:0,w:1,h:1,alpha:0});if(kind==='draw'&&!side)show(nodes.draw);if(kind==='summon'||kind==='attack')show(nodes.source);if(kind==='attack'){show(nodes.target);material.pose(targetActor,{x:0,y:0,w:1,h:1,alpha:0});}}}
 material.render();post({time,duration:DURATIONS[kind],phase:phase(kind,time),playing,kind});
}
function draw(){
 const deck=rects.deck,hand=rects.draw,u=focused()?Math.min(innerWidth*(innerWidth<700?.25:.19),innerHeight*.30,170):Math.max(rects.source.w*1.2,95);
 const hero:Rect={x:lerp(deck.x,hand.x,.53),y:Math.min(deck.y,hand.y)-u*.95,w:u,h:u*1.45};
 const lift=ease(.10,.42,time),reveal=ease(.42,.8,time),fly=ease(1.10,1.77,time);
 let p:Rect;if(time<.42)p=mixRect({...deck,w:deck.w*.72,h:deck.h*.86},{...hero,x:deck.x-u*.18,y:deck.y-u*.64},lift);else if(time<1.10)p=mixRect({...hero,x:deck.x-u*.18,y:deck.y-u*.64},hero,out((time-.42)/.38));else{p=mixRect(hero,hand,fly);p.y-=Math.sin(fly*Math.PI)*u*.22;}
 const charge=Math.sin(clamp((time-.13)/1.65)*Math.PI);
 shadow(rc,{x:p.x,y:p.y+p.h*.54+12},p.w*.55,p.h*.09,.33);
 const trajectory=(t:number):Rect=>{const l=ease(.10,.42,t),r=out((t-.42)/.38),f=ease(1.10,1.77,t);let z:Rect;if(t<.42)z=mixRect({...deck,w:deck.w*.72,h:deck.h*.86},{...hero,x:deck.x-u*.18,y:deck.y-u*.64},l);else if(t<1.10)z=mixRect({...hero,x:deck.x-u*.18,y:deck.y-u*.64},hero,r);else{z=mixRect(hero,hand,f);z.y-=Math.sin(f*Math.PI)*u*.22;}return z;};
 if(time>.20&&time<1.88){const fade=1-ease(1.70,1.90,time),path=(q:number)=>{const z=trajectory(Math.max(.10,time-(1-q)*.24));return{x:z.x+z.w*.38,y:z.y+z.h*.34};};ribbon(rc,path,u*.040,'#639ab4',.72*fade);for(let i=0;i<2;i++)ribbon(rc,q=>{const r=path(q);return{x:r.x+(i-.5)*u*.06,y:r.y+Math.sin(q*7+i)*u*.025};},u*.005,'#ccecff',.55*fade);}
 glow(rc,p,p.w*.85,'#99d9f6',charge*.22);material.pose(sourceActor,pose(p,{ry:time<.8?Math.sin(reveal*Math.PI)*1.35:0,rz:lerp(.12,-.06,lift)*(1-fly),mix:reveal,glow:charge*.9,rx:Math.sin(fly*Math.PI)*.2}));
 splinters(fc,{x:deck.x,y:deck.y-deck.h*.25},(time-.25)/.70,u*.8,'#97bed4',21,15);
 if(time>1.74){glow(rc,hand,u*.7,'#addcf7',(1-ease(1.76,2.12,time))*.25,.28);splinters(fc,hand,(time-1.74)/.45,u*.43,'#bdd6df',30,9,true);}
 cue('draw-lift',.12,.28,760,.10);cue('draw-open',.55,.5,1280,.08);cue('draw-arrive',1.75,.18,400,.08);
}
function summon(){
 const dest=rects.source,hand=rects.hand,u=dest.w;
 const lift=ease(.06,.66,time),fall=clamp((time-1.20)/.27),landed=time>=1.47;
 const scale=lerp(hand.w/dest.w,1.05,lift)*(1-.05*fall*fall*fall);
 const ground:Rect={...point(hand,dest,lift),w:dest.w*scale,h:dest.h*scale};
 let altitude=u*2.0*lift*(1-fall*fall*fall);
 if(landed){ground.x=dest.x;ground.y=dest.y;ground.w=dest.w;ground.h=dest.h;const a=time-1.47;altitude=u*.08*Math.max(0,Math.sin(a*24))*Math.exp(-a*16);}
 const rock=landed?Math.sin((time-1.47)*35)*Math.exp(-(time-1.47)*18)*1.6:Math.sin(lift*Math.PI)*6;
 const p=flatCard(nodes.source,ground,altitude,rock),base=flatCard(nodes.source,ground);
 // The footprint is the whole back of the card. It tightens before all four edges contact.
 planeShadow(rc,footprint(base),altitude,u);
 const charge=ease(.25,.96,time)*(1-ease(1.30,1.65,time));
 material.pose(sourceActor,{...p,mix:ease(.40,1.12,time),glow:charge*.68,color:'#b0d8e6'});
 const impact=(time-1.47)/.74;
 contactDust(rc,dest,impact);
 if(impact>=0&&impact<1){glow(rc,dest,u*1.15,'#cbd9dc',.18*(1-out(impact)),.74);for(let i=0;i<4;i++){const e=footprint(flatCard(nodes.source,dest))[i];sparks(fc,e,impact,u*.3,4,40+i*9);}}
 cue('summon-rise',.10,.55,310,.09);cue('summon-impact',1.47,.58,95,.30);
}
function attack(){
 const a=rects.source,b=rects.target,u=a.w,dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,n={x:dx/len,y:dy/len},angle=Math.atan2(dy,dx),contact={x:b.x-n.x*b.w*.12,y:b.y-n.y*b.h*.16};
 const wind=ease(.05,.43,time),dash=clamp((time-.43)/.24),back=ease(.81,1.37,time);let p:Rect={...a,x:a.x-n.x*u*.20*wind,y:a.y-n.y*u*.20*wind,w:a.w*(1+.04*wind),h:a.h*(1+.04*wind)};
 const start={...p};if(time>=.43){p=mixRect(start,{...a,x:contact.x-n.x*u*.55,y:contact.y-n.y*u*.55},dash*dash*dash);if(time>=.74)p=mixRect(p,a,back);}
 const impact=(time-.67)/.75,hitstop=time>=.67&&time<.74;
 const recoil=impact>=0?Math.sin(clamp(impact/.45)*Math.PI)*Math.exp(-impact*1.5):0;
 material.pose(targetActor,{...flatCard(nodes.target,{...b,x:b.x+n.x*u*.13*recoil,y:b.y+n.y*u*.13*recoil},0,recoil*4),glow:hitstop?.28:0,color:'#ffe5b6'});
 planeShadow(rc,footprint(flatCard(nodes.source,p)),u*.16,u);
 material.pose(sourceActor,{...flatCard(nodes.source,p,u*.16*(1-back),Math.sin(dash*Math.PI)*3),glow:wind*(1-ease(.67,.95,time))*.22,color:'#c9d9e3'});
 if(time>=.44&&time<1.02){const q=clamp((time-.44)/.24),tail=ease(.69,1.02,time);const path=(t:number)=>({x:lerp(a.x,contact.x,t),y:lerp(a.y,contact.y,t)});exposure(rc,path,u*.19,'#b9d1e2',.65*(1-tail),Math.max(0,q-.72+tail*.72),q);}
 if(impact>=0&&impact<1){
  sparks(fc,contact,impact,u*1.1,38,45,angle);
  const slash=clamp(impact*2.8),line=(q:number)=>({x:contact.x+(q-.5)*u*1.45,y:contact.y+(q-.5)*u*.72-Math.sin(q*Math.PI)*u*.08});
  exposure(fc,line,u*.055,'#e9f6ff',1-slash,slash*.55,1);
  glow(fc,contact,u*(.16+.20*out(impact/.14)),'#fff0cf',.72*(1-ease(.01,.22,impact)),.78);
  for(let i=0;i<6;i++){const spread=out(impact)*u*.65;haze(rc,{x:contact.x+Math.cos(i*1.7)*spread,y:contact.y+Math.sin(i*1.7)*spread*.55},u*(.32+impact*.52),u*(.28+impact*.34),.32*(1-ease(.1,1,impact)),i+impact*.3);}
 }
 cue('attack-wind',.16,.3,410,.10);cue('attack-hit',.67,.34,115,.36);
}
function spell(){
 const hand=rects.spell,target=rects.portrait,u=focused()?Math.min(innerWidth*(innerWidth<700?.24:.18),innerHeight*.29,180):Math.max(rects.source.w*1.25,90);
 const hero:Rect={x:side?innerWidth*.60:innerWidth*.40,y:innerHeight*.50,w:u,h:u*1.42};const lift=ease(.05,.60,time),p=mixRect(hand,hero,lift),burn=ease(.97,1.51,time);const charge=ease(.30,.96,time)*(1-burn);
 shadow(rc,{x:p.x,y:p.y+p.h*.6+5},u*.6,u*.13,.25);glow(rc,p,u*1.1,'#ef863b',charge*.36);
 material.pose(sourceActor,pose(p,{rz:.08*Math.sin(lift*Math.PI),ry:.2*Math.sin(lift*Math.PI),glow:charge*1.5,burn,color:'#ffb45f',alpha:1-ease(1.48,1.56,time)}));
 if(time>.55&&time<1.52){for(let i=0;i<8;i++){const q=(i+.5)/8,x=p.x+(q-.5)*p.w*.9,age=clamp((time-.82+i*.025)/.7);if(age<=0)continue;material.energy.paint(i,x,p.y+p.h*.4-burn*p.h,u*.39,u*.63,time,age*.7,Math.min(1,charge+burn),0);}}
 const origin={x:hero.x,y:hero.y+hero.h*.40-burn*hero.h};const path=(q:number)=>bezier(origin,{x:origin.x+(target.x-origin.x)*.25,y:origin.y-u*.80},{x:target.x+(side?u*.2:-u*.2),y:target.y+u*.6},target,q);
 const head=clamp((time-1.13)/.57),tail=ease(1.65,2.05,time);
 if(time>1.05&&time<2.06){
  const end=path(head);exposure(rc,path,u*.24,'#f99f49',.50*(1-tail),Math.max(0,head-.55+tail*.55),head);
  // Overlapping advected volumes form the body and cool downstream into smoke.
  for(let j=0;j<6;j++){const q=head-j*.055;if(q<0)continue;const z=path(q),r=u*(.90-j*.085);material.energy.paint(j,z.x,z.y,r,r,time-j*.045,.12+j*.095,(1-tail)*(1-j*.09));if(j>2)haze(rc,{x:z.x,y:z.y-u*j*.017},r*.8,r*.65,.22*(1-tail),j*.7);}
  material.energy.paint(6,end.x,end.y,u*.95,u*.95,time,.18,1-tail);glow(rc,end,u*.66,'#fb9a43',.30*(1-tail));
 }
 const impact=(time-1.70)/.95;
 if(impact>=0&&impact<1){
  material.energy.paint(0,target.x,target.y,u*(1.05+out(impact)*1.35),u*(1.05+out(impact)*1.35),time,impact,1);
  material.energy.paint(1,target.x-u*.17,target.y-u*impact*.25,u*1.55,u*1.85,time,clamp(impact-.08),.66);
  sparks(fc,target,impact,u*1.22,46,55);glow(rc,target,u*1.3,'#e98236',.27*(1-ease(.06,.65,impact)));
  for(let i=0;i<5;i++){const r=u*(.45+impact*.68);haze(rc,{x:target.x+Math.cos(i*1.7)*u*impact*.38,y:target.y-u*impact*.45+Math.sin(i)*u*.14},r,r*.85,ease(.08,.32,impact)*(1-ease(.48,1,impact))*.52,i*.6);}
 }
 if(focused()&&impact>=0){const r=rects.target;material.pose(targetActor,pose({...r,y:r.y-u*.08*Math.sin(clamp(impact/.3)*Math.PI)},{glow:Math.max(0,1-impact*4),color:'#ffb077'}));}
 cue('spell-charge',.25,.85,520,.12);cue('spell-fire',1.12,.55,250,.18);cue('spell-impact',1.70,.7,95,.30);
}
function tick(now:number){if(disposed)return;const dt=Math.min((now-last)/1000,.05);last=now;if(playing&&ready&&!document.hidden){if(time>=DURATIONS[kind]){cycleGap+=dt;if(loop&&cycleGap>.8){post({cycle:true});time=0;cycleGap=0;playedCues.clear();}else if(!loop)playing=false;}else time=Math.min(DURATIONS[kind],time+dt*speed);render();}raf=requestAnimationFrame(tick);}
const api={async set(options:{kind?:Kind;mode?:string;side?:number;loop?:boolean;speed?:number;sound?:boolean}){if(options.loop!==undefined)loop=options.loop;if(options.speed)speed=options.speed;if(options.sound!==undefined){soundOn=options.sound;if(soundOn){audio??=new AudioContext();await audio.resume();}}
 let recapture=false,reconfigure=false;if(options.kind&&options.kind!==kind){kind=options.kind;reconfigure=true;}if(options.mode&&options.mode!==mode){mode=options.mode;reconfigure=true;}if(options.side!==undefined&&options.side!==side){side=options.side;recapture=true;}
 if(recapture){await prepare();return;}if(reconfigure&&ready){configure();time=0;cycleGap=0;playedCues.clear();playing=true;render();}
 },play(){if(!ready)return;if(time>=DURATIONS[kind])time=0;playing=true;last=performance.now();},replay(){if(!ready)return;time=0;cycleGap=0;playedCues.clear();playing=true;last=performance.now();render();},pause(){playing=false;render();},seek(t:number){playing=false;time=Math.max(0,Math.min(DURATIONS[kind],t));render();},info:()=>({ready,kind,mode,side,time,playing,hidden:hidden.size,surfaces:Object.keys(surfaces),width:innerWidth,height:innerHeight,source:'914dc9bab',revision:2,summonContact:1.47}),dispose(){disposed=true;++prepareId;cancelAnimationFrame(raf);restore();material.dispose();stopLayout();view.destroy();void audio?.close();}};
Object.assign(window,{vfx:api});
let resizeTimer=0;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=window.setTimeout(()=>{resize();if(ready){configure();render();}},150);});
window.addEventListener('pagehide',()=>api.dispose(),{once:true});document.addEventListener('visibilitychange',()=>{last=performance.now();});
void waitForDuel(root).then(()=>prepare()).then(()=>{last=performance.now();raf=requestAnimationFrame(tick);}).catch(error=>{console.error(error);post({error:String(error)});});
