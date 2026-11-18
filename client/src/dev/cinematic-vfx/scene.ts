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
import {clearMonsterStates} from '../../ui/monster/runtime';
import {MaterialStage,type Pose} from './material';
import {DURATIONS,clamp,ease,out,lerp,point,bezier,rnd,phase,type Kind,type Rect} from './direction';
import {glow,shadow,ribbon,burst,splinters,shock,sigil} from './paint';
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
let kind:Kind='draw',mode='focus',side=0,time=0,playing=false,loop=true,speed=1,ready=false,disposed=false,last=0,raf=0,cycleGap=0,soundOn=false,playedCues=new Set<string>();
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
function focused(){return mode!=='board';}
function layout(){
 const opponent=side===1;
 for(const key of Object.keys(nodes))rects[key]=box(nodes[key]);
 rects.deck=box(document.getElementById(opponent?'pile-oppDeck':'pile-myDeck')!);
 rects.portrait=box(document.getElementById(opponent?'portraitMe':'portraitOpp')!);
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
 const hero:Rect={x:dest.x,y:Math.max(innerHeight*.39,dest.y-u*.42),w:u*1.34,h:dest.h*1.28};
 const lift=ease(.06,.64,time),drop=clamp((time-1.20)/.27);let p=mixRect(hand,hero,lift);
 if(time>=1.20){p=mixRect(hero,dest,drop*drop*drop);if(time>1.47){const settle=Math.exp(-(time-1.47)*16)*Math.sin((time-1.47)*35);p={...dest,y:dest.y-settle*u*.07,h:dest.h*(1-settle*.06)};}}
 const charge=ease(.25,.95,time)*(1-ease(1.38,1.72,time));
 const foot={x:dest.x,y:dest.y+dest.h*.40};shadow(rc,{x:p.x,y:foot.y},u*.68,u*.13,.32);
 sigil(rc,foot,u*(.42+.44*ease(.3,1.1,time)),time,charge*.8);glow(rc,p,u*1.1,'#55aabf',charge*.27);
 // Ribbons are rooted to the moving card edges, growing from its physical surface.
 for(let j=0;j<6;j++){const sign=j%2?-1:1,z=Math.floor(j/2),reach=charge*(1-ease(1.32,1.60,time));const path=(q:number)=>({x:p.x+sign*(p.w*.44+Math.sin(q*Math.PI)*u*(.18+z*.08)*reach)+Math.sin(q*9+time*6+j)*u*.025*reach,y:p.y+p.h*.42-q*(p.h*(.70+z*.09)+u*.12*reach)});ribbon(j%3?fc:rc,path,u*(.038+z*.008)*reach,j%2?'#263e5b':'#467e96',reach*.8,0,1,j);}
 for(let j=0;j<2;j++)material.energy.paint(j,p.x+(j?1:-1)*p.w*.48,p.y-p.h*.08,u*.52,p.h*1.28,time,.3,charge*.9,1);
 material.pose(sourceActor,pose(p,{mix:ease(.73,1.45,time),ry:Math.sin(lift*Math.PI)*-.4,rx:Math.sin(lift*Math.PI)*.23,rz:-.10*(1-lift),glow:charge*1.3,color:'#a3e7f1'}));
 const impact=(time-1.47)/.66;
 shock(rc,foot,impact,u*1.35,'#6593a3',.35);splinters(fc,foot,impact,u*1.8,'#a5bbc2',33,34,true);
 if(impact>=0&&impact<1){glow(rc,foot,u*1.6,'#bde3e1',(1-out(impact))*.55,.25);for(let j=0;j<7;j++){const a=j/7*6.28;const dust={x:foot.x+Math.cos(a)*u*(.4+out(impact)*.8),y:foot.y+Math.sin(a)*u*.26};glow(rc,dust,u*.28*(1+impact),'#8caaa8',(1-ease(.25,1,impact))*.28,.33);}}
 cue('summon-rise',.1,.7,360,.12);cue('summon-charge',.65,.65,580,.08);cue('summon-impact',1.47,.62,135,.32);
}
function attack(){
 const a=rects.source,b=rects.target,u=a.w,dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,n={x:dx/len,y:dy/len},contact={x:b.x-n.x*b.w*.12,y:b.y-n.y*b.h*.16};
 const wind=ease(.05,.43,time),dash=clamp((time-.43)/.24),back=ease(.81,1.37,time);let p:Rect={...a,x:a.x-n.x*u*.20*wind,y:a.y-n.y*u*.20*wind,w:a.w*(1+.08*wind),h:a.h*(1+.08*wind)};
 const start={...p};if(time>=.43){p=mixRect(start,{...a,x:contact.x-n.x*u*.55,y:contact.y-n.y*u*.55},dash*dash*dash);if(time>=.74)p=mixRect(p,a,back);}
 const impact=(time-.67)/.64;const hitstop=time>=.67&&time<.74;
 const recoil=impact>=0?Math.sin(clamp(impact/.45)*Math.PI)*Math.exp(-impact*1.5):0;
 material.pose(targetActor,pose({...b,x:b.x+n.x*u*.13*recoil,y:b.y+n.y*u*.13*recoil},{rx:recoil*.23,rz:recoil*.04,glow:(hitstop?.8:.35*(1-ease(.75,.95,time)))*Number(time>=.67),color:'#ffb984'}));
 shadow(rc,{x:p.x,y:p.y+p.h*.49+7},u*.6,u*.13,.32);material.pose(sourceActor,pose(p,{ry:Math.sin(dash*Math.PI)*.12,rz:Math.sin(wind*Math.PI)*-.07,glow:wind*(1-ease(.67,.95,time))*.8,color:'#e6cca2'}));
 if(time>.12&&time<.67){const q=ease(.12,.43,time)*(1-ease(.48,.67,time));for(const s of[-1,1])ribbon(fc,t=>({x:p.x-n.x*u*.5+n.y*s*u*(.45-t*.1),y:p.y-n.y*u*.5-n.x*s*u*(.45-t*.1)+u*t*.8}),u*.026*q,'#d9b989',q*.7);}
 if(time>=.44&&time<1.05){const q=clamp((time-.44)/.24),tail=ease(.71,1.05,time);const path=(t:number)=>({x:lerp(a.x,contact.x,t)+Math.sin(t*Math.PI)*n.y*u*.15,y:lerp(a.y,contact.y,t)-Math.sin(t*Math.PI)*n.x*u*.15});ribbon(rc,path,u*.12*(1-tail),'#477c9d',.85,Math.max(0,q-.8+tail*.8),q);}
 if(impact>=0&&impact<1){burst(fc,contact,impact/.65,u*.75,'#e5bd78',22);splinters(fc,contact,impact,u*1.6,'#d2a477',45,35);shock(rc,contact,impact,u*.9,'#d7b782',.65);
 const slashAge=clamp(impact*2);ribbon(fc,q=>({x:contact.x+(q-.5)*u*1.7,y:contact.y+(q-.5)*u*1.25-Math.sin(q*Math.PI)*u*.17}),u*.065*(1-slashAge),'#84bfdb',1-slashAge,slashAge*.6,1);glow(rc,contact,u*.95,'#f0c684',.4*(1-ease(.1,.6,impact)));}
 cue('attack-wind',.16,.3,410,.10);cue('attack-hit',.67,.34,115,.36);
}
function spell(){
 const hand=rects.spell,target=rects.portrait,u=focused()?Math.min(innerWidth*(innerWidth<700?.24:.18),innerHeight*.29,180):Math.max(rects.source.w*1.25,90);
 const hero:Rect={x:side?innerWidth*.60:innerWidth*.40,y:innerHeight*.50,w:u,h:u*1.42};const lift=ease(.05,.60,time),p=mixRect(hand,hero,lift),burn=ease(.97,1.51,time);const charge=ease(.30,.96,time)*(1-burn);
 shadow(rc,{x:p.x,y:p.y+p.h*.6+5},u*.6,u*.13,.25);glow(rc,p,u*1.1,'#ef863b',charge*.36);
 material.pose(sourceActor,pose(p,{rz:.08*Math.sin(lift*Math.PI),ry:.2*Math.sin(lift*Math.PI),glow:charge*1.5,burn,color:'#ffb45f',alpha:1-ease(1.48,1.56,time)}));
 if(time>.55&&time<1.52){for(let i=0;i<8;i++){const q=(i+.5)/8,x=p.x+(q-.5)*p.w*.9,age=clamp((time-.82+i*.025)/.7);if(age<=0)continue;material.energy.paint(i,x,p.y+p.h*.4-burn*p.h,u*.39,u*.63,time,age*.7,Math.min(1,charge+burn),0);}}
 const origin={x:hero.x,y:hero.y+hero.h*.40-burn*hero.h};const path=(q:number)=>bezier(origin,{x:origin.x+(target.x-origin.x)*.25,y:origin.y-u*.80},{x:target.x+(side?u*.2:-u*.2),y:target.y+u*.6},target,q);
 const head=clamp((time-1.13)/.57),tail=ease(1.55,1.94,time);if(time>1.05&&time<1.96){const end=path(head);ribbon(rc,path,u*.27*(1-tail),'#e26c25',.95,Math.max(0,head-.66+tail*.66),head);
 for(let i=0;i<4;i++){const strand=(q:number)=>{const v=path(q);return{x:v.x+Math.sin(q*19+time*13+i)*u*.085,y:v.y+Math.cos(q*17+time*10+i)*u*.065};};ribbon(fc,strand,u*(.03-i*.004)*(1-tail),i%2?'#ffbc45':'#bd431f',.8,Math.max(0,head-.50+tail*.5),head,i);}
 material.energy.paint(6,end.x,end.y,u*.94,u*.94,time,.20+head*.35,1-tail);glow(rc,end,u*.6,'#f79031',.4*(1-tail));if(time>1.38)for(let j=0;j<5;j++){const q=head-j*.07;if(q<=0)continue;const z=path(q);material.energy.paint(j,z.x,z.y,u*(.65-j*.06),u*(.65-j*.06),time+j*.08,.25+j*.08,(1-tail)*.8);}}
 const impact=(time-1.70)/.95;if(impact>=0&&impact<1){material.energy.paint(0,target.x,target.y,u*(1.20+out(impact)*1.4),u*(1.20+out(impact)*1.4),time,impact,1);material.energy.paint(1,target.x-u*.26,target.y+u*.17,u*1.8,u*1.6,time,clamp(impact-.06),.65);burst(fc,target,impact/.43,u*.8,'#f9a23d',74);splinters(fc,target,impact,u*1.7,'#ffb250',55,42);shock(rc,target,impact,u*1.25,'#da9f69',.7);glow(rc,target,u*1.5,'#fb9548',.35*(1-ease(.12,.8,impact)));}
 if(focused()&&impact>=0){const r=rects.target;material.pose(targetActor,pose({...r,y:r.y-u*.08*Math.sin(clamp(impact/.3)*Math.PI)},{glow:Math.max(0,1-impact*4),color:'#ffb077'}));}
 cue('spell-charge',.25,.85,520,.12);cue('spell-fire',1.12,.55,250,.18);cue('spell-impact',1.70,.7,95,.30);
}
function tick(now:number){if(disposed)return;const dt=Math.min((now-last)/1000,.05);last=now;if(playing&&ready&&!document.hidden){if(time>=DURATIONS[kind]){cycleGap+=dt;if(loop&&cycleGap>.8){post({cycle:true});time=0;cycleGap=0;playedCues.clear();}else if(!loop)playing=false;}else time=Math.min(DURATIONS[kind],time+dt*speed);render();}raf=requestAnimationFrame(tick);}
const api={async set(options:{kind?:Kind;mode?:string;side?:number;loop?:boolean;speed?:number;sound?:boolean}){if(options.loop!==undefined)loop=options.loop;if(options.speed)speed=options.speed;if(options.sound!==undefined){soundOn=options.sound;if(soundOn){audio??=new AudioContext();await audio.resume();}}
 let recapture=false,reconfigure=false;if(options.kind&&options.kind!==kind){kind=options.kind;reconfigure=true;}if(options.mode&&options.mode!==mode){mode=options.mode;reconfigure=true;}if(options.side!==undefined&&options.side!==side){side=options.side;recapture=true;}
 if(recapture){await prepare();return;}if(reconfigure&&ready){configure();time=0;cycleGap=0;playedCues.clear();playing=true;render();}
 },play(){if(!ready)return;if(time>=DURATIONS[kind])time=0;playing=true;last=performance.now();},replay(){if(!ready)return;time=0;cycleGap=0;playedCues.clear();playing=true;last=performance.now();render();},pause(){playing=false;render();},seek(t:number){playing=false;time=Math.max(0,Math.min(DURATIONS[kind],t));render();},info:()=>({ready,kind,mode,side,time,playing,hidden:hidden.size,surfaces:Object.keys(surfaces),width:innerWidth,height:innerHeight,source:'914dc9bab'}),dispose(){disposed=true;++prepareId;cancelAnimationFrame(raf);restore();material.dispose();stopLayout();view.destroy();void audio?.close();}};
Object.assign(window,{vfx:api});
let resizeTimer=0;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=window.setTimeout(()=>{resize();if(ready){configure();render();}},150);});
window.addEventListener('pagehide',()=>api.dispose(),{once:true});document.addEventListener('visibilitychange',()=>{last=performance.now();});
void waitForDuel(root).then(()=>prepare()).then(()=>{last=performance.now();raf=requestAnimationFrame(tick);}).catch(error=>{console.error(error);post({error:String(error)});});
