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
import {mountFixture} from './fixture';
import {DB,FRAME_BACK} from '../../shared/cards';
import {waitForDuel} from '../../ui/duelReadiness';
import {captureNativePrint} from '../../ui/cardPrintCapture';
import {projectedPlacement} from '../../ui/boardProjection';
import {exposure,haze,contactDust,planeShadow} from './realistic';
import {clearMonsterStates} from '../../ui/monster/runtime';
import {SpellPresentation} from './spell';
import {SV,summonHero,summonOrb,orbWake,reboundAngle,summonPhase,impactShake,cardScatter,groundCracks} from './shadowverse';
import {MaterialStage,type Pose} from './material';
import {DURATIONS,clamp,ease,out,lerp,point,rnd,phase,type Kind,type Rect} from './direction';
import {glow,shadow,ribbon,splinters} from './paint';
const {root,view,g,stopLayout}=mountFixture();
const spellPrint=new SpellPresentation();
const material=new MaterialStage(document.getElementById('material')!);
const rear=document.getElementById('rear') as HTMLCanvasElement,front=document.getElementById('front') as HTMLCanvasElement;
const rc=rear.getContext('2d')!,fc=front.getContext('2d')!;
let summonVersion:'hearthstone'|'shadowverse'='shadowverse';
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
 rects.discard=box(document.getElementById(opponent?'pile-oppDisc':'pile-myDisc')!);
 rects.mana=box(document.querySelector<HTMLElement>(opponent?'#portraitOpp .pt-mana':'#portraitMe .pt-mana')!);
 rects.portrait=box(document.querySelector<HTMLElement>(opponent?'#portraitMe .pt-ring':'#portraitOpp .pt-ring')!);
 if(opponent){const hand=box(document.getElementById('oppHand')!);rects.hand={...hand,x:hand.x-12,w:rects.source.w*.65,h:rects.source.w*.95};rects.draw={...rects.hand,x:hand.x+20};rects.spell={...rects.hand,x:hand.x+30};}
 if(focused()){
 const w=innerWidth,h=innerHeight,u=Math.min(w*(w<700?.27:.19),h*.34,190),sign=opponent?-1:1;
 const ratio=rects.source.h/rects.source.w,targetRatio=rects.target.h/rects.target.w;
 rects.source={x:w*.40,y:h*.61,w:u*.86,h:u*.86*ratio};rects.target={x:w*.67,y:h*.38,w:u*.80,h:u*.80*targetRatio};
 rects.hand={x:w*.28,y:h*.76,w:u*.60,h:u*.88};rects.draw={x:w*.38,y:h*.72,w:u*.7,h:u*1.02};
 rects.discard={x:w*.77,y:h*.72,w:u*.7,h:u};rects.mana={x:w*.20,y:h*.72,w:u*.55,h:u*.3};
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
 await spellPrint.prepare(nodes.spell);if(id!==prepareId||disposed)return;configure();ready=true;time=0;playedCues.clear();playing=!new URLSearchParams(location.search).has('controlled')&&!matchMedia('(prefers-reduced-motion:reduce)').matches;last=performance.now();render();post({ready:true,kind});
}
function configure(){restore();material.clearActors();layout();
 const face=kind==='draw'?(side?surfaces.back:surfaces.draw):kind==='summon'?surfaces.hand:kind==='attack'?surfaces.source:surfaces.spell;
 sourceActor=material.add(kind==='draw'?surfaces.back:face,kind==='draw'?face:kind==='summon'?surfaces.source:face);
 targetActor=material.add(kind==='summon'?surfaces.hand:surfaces.target);if(kind==='summon'){material.layer(sourceActor,2);material.layer(targetActor,1);}
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
function render(){if(!ready)return;document.body.style.translate='';spellPrint.hide();material.hideArrival();layout();rc.clearRect(0,0,innerWidth,innerHeight);fc.clearRect(0,0,innerWidth,innerHeight);material.pose(sourceActor,{x:0,y:0,w:1,h:1,alpha:0});material.pose(targetActor,{x:0,y:0,w:1,h:1,alpha:0});
 if(focused()){
  const ground={x:innerWidth/2,y:innerHeight*.76};shadow(rc,ground,innerWidth*.38,innerHeight*.07,.26);
  if(kind==='draw'){const r=rects.deck;for(let i=5;i>=0;i--){rc.save();rc.translate(r.x+i*.8,r.y+i*1.5);rc.rotate(.10);rc.drawImage(image,-r.w/2,-r.h/2,r.w,r.h);rc.restore();}}
  if(kind==='attack'){material.pose(targetActor,pose(rects.target));}

 }
 if(!focused()){if(kind==='draw'&&!side)hide(nodes.draw);if(kind==='summon'){hide(nodes.source);if(!side)hide(nodes.hand);}if(kind==='attack'){hide(nodes.source);hide(nodes.target);}}
 if(kind==='draw')draw();if(kind==='summon')summon();if(kind==='attack')attack();if(kind==='spell')spell();
 if(!focused()){const complete=time>({draw:2.08,summon:3.05,attack:1.62,spell:99}[kind]);if(complete){material.pose(sourceActor,{x:0,y:0,w:1,h:1,alpha:0});if(kind==='draw'&&!side)show(nodes.draw);if(kind==='summon'||kind==='attack')show(nodes.source);if(kind==='attack'){show(nodes.target);material.pose(targetActor,{x:0,y:0,w:1,h:1,alpha:0});}}}
 material.render();if(kind==='summon'&&summonVersion==='shadowverse'){const shake=impactShake(time);document.body.style.translate=`${shake.x}px ${shake.y}px`;}post({time,duration:DURATIONS[kind],phase:kind==='summon'?(summonVersion==='hearthstone'?['移動','青い発光','実体化・接地','定着'][[.20,1.06,2.60].filter(t=>time>=t).length]:summonPhase(time)):phase(kind,time),playing,kind});
}
function draw(){
 const deck=rects.deck,hand=rects.draw,u=focused()?Math.min(innerWidth*(innerWidth<700?.25:.19),innerHeight*.30,170):Math.max(rects.source.w*1.2,95);
 const hero:Rect={x:lerp(deck.x,hand.x,.53),y:Math.min(deck.y,hand.y)-u*.95,w:u*1.18,h:u*1.18*1.45};
 const lift=ease(.10,.42,time),reveal=ease(.42,.8,time),fly=ease(1.10,1.77,time);
 let p:Rect;if(time<.42)p=mixRect({...deck,w:deck.w*.72,h:deck.h*.86},{...hero,x:deck.x-u*.18,y:deck.y-u*.64},lift);else if(time<1.10)p=mixRect({...hero,x:deck.x-u*.18,y:deck.y-u*.64},hero,out((time-.42)/.38));else{p=mixRect(hero,hand,fly);p.y-=Math.sin(fly*Math.PI)*u*.22;}
 const charge=Math.sin(clamp((time-.13)/1.65)*Math.PI);
 shadow(rc,{x:p.x,y:p.y+p.h*.54+12},p.w*.55,p.h*.09,.33);
 const trajectory=(t:number):Rect=>{const l=ease(.10,.42,t),r=out((t-.42)/.38),f=ease(1.10,1.77,t);let z:Rect;if(t<.42)z=mixRect({...deck,w:deck.w*.72,h:deck.h*.86},{...hero,x:deck.x-u*.18,y:deck.y-u*.64},l);else if(t<1.10)z=mixRect({...hero,x:deck.x-u*.18,y:deck.y-u*.64},hero,r);else{z=mixRect(hero,hand,f);z.y-=Math.sin(f*Math.PI)*u*.22;}return z;};
 if(time>.20&&time<1.88){const fade=1-ease(1.70,1.90,time),path=(q:number)=>{const z=trajectory(Math.max(.10,time-(1-q)*.24));return{x:z.x+z.w*.38,y:z.y+z.h*.34};};ribbon(rc,path,u*.040,'#639ab4',.72*fade);for(let i=0;i<2;i++)ribbon(rc,q=>{const r=path(q);return{x:r.x+(i-.5)*u*.06,y:r.y+Math.sin(q*7+i)*u*.025};},u*.005,'#ccecff',.55*fade);}
 glow(rc,p,p.w*1.25,'#89cfff',charge*.36);material.pose(sourceActor,pose(p,{ry:time<.8?Math.sin(reveal*Math.PI)*1.35:0,rz:lerp(.12,-.06,lift)*(1-fly),mix:reveal,glow:charge*1.8,rx:Math.sin(fly*Math.PI)*.2}));
 splinters(fc,{x:deck.x,y:deck.y-deck.h*.25},(time-.25)/.70,u*.8,'#97bed4',21,15);
 if(time>1.74){glow(rc,hand,u*.7,'#addcf7',(1-ease(1.76,2.12,time))*.25,.28);splinters(fc,hand,(time-1.74)/.45,u*.43,'#bdd6df',30,9,true);}
 if(time>.15&&time<1.9){const strength=Math.sin(clamp((time-.15)/1.75)*Math.PI);glow(rc,deck,deck.w*.92,'#80c8f6',strength*.34,.65);for(let j=0;j<22;j++){const age=(time-.15-j*.024)/.82;if(age<0||age>1)continue;const z=trajectory(Math.max(.10,time-age*.22)),a=j*2.399,r=u*(.15+age*.48);glow(fc,{x:z.x+Math.cos(a)*r,y:z.y+Math.sin(a)*r*.7},u*(.009+(j%3)*.004),'#d4f0ff',(1-age)*strength*.9);}}
 cue('draw-lift',.12,.28,760,.10);cue('draw-open',.55,.5,1280,.08);cue('draw-arrive',1.75,.18,400,.08);
}
function summon(){
 const dest=rects.source,hand=rects.hand,u=dest.w;
 if(summonVersion==='hearthstone'){
  const move=ease(.0,.20,time),convert=ease(1.06,1.19,time),drop=ease(1.17,1.38,time);
  const ground=mixRect(hand,{...dest,w:u*1.55,h:u*1.55*hand.h/hand.w},move);
  ground.w=lerp(ground.w,dest.w,convert);ground.h=lerp(ground.h,dest.h,convert);
  const height=u*(.64+convert*.95)*move*(1-drop);
  const p=flatCard(nodes.source,ground,height),base=flatCard(nodes.source,ground);
  if(time>1.06&&time<1.38){const memory=flatCard(nodes.source,{...dest,w:u*1.55,h:u*1.55*hand.h/hand.w},u*.64);material.pose(targetActor,{...memory,flash:.94,color:'#dce5ff',alpha:(1-ease(1.10,1.38,time))*.48});}
  planeShadow(rc,footprint(base),height,u);
  const blue=ease(.10,.24,time)*(1-ease(1.10,1.24,time));
  material.pose(sourceActor,{...p,mix:convert,edgeLight:blue*.80,flash:Math.sin(clamp((time-1.05)/.18)*Math.PI)*.76,color:'#258aff'});
  const corners=footprint(p),xs=corners.map(v=>v.x),ys=corners.map(v=>v.y);const held={x:(Math.max(...xs)+Math.min(...xs))/2,y:(Math.max(...ys)+Math.min(...ys))/2,w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};
  material.arrival(dest,time,'hearthstone',dest,held);contactDust(rc,dest,(time-1.38)/.92);
  cue('hs-card',.12,.16,500,.07);cue('hs-materialize',1.10,.23,850,.09);cue('hs-contact',1.38,.22,110,.15);
 }else{
  const hero=summonHero(innerWidth,innerHeight,nodes.hand.offsetWidth,nodes.hand.offsetHeight);
  const lift=out((time-.02)/.36);
  const veil=ease(.02,.25,time)*(1-ease(.94,1.30,time));
  if(veil>0){rc.save();rc.fillStyle=`rgba(5,13,26,${veil*.23})`;rc.fillRect(0,0,innerWidth,innerHeight);rc.restore();}
  if(time<SV.vanish){const p=mixRect(hand,hero,lift);material.pose(sourceActor,pose(p,{ry:-.20*(1-lift),rx:.12*(1-lift)}));}
  // Preserve a real empty beat between the revealed print and its luminous residue.
  if(time>=SV.light&&time<1.16){material.pose(sourceActor,pose(hero,{flash:.84,edgeLight:.55,alpha:(1-ease(1.09,1.16,time))*.48,color:'#ffffc9'}));}
  cardScatter(fc,hero,u,time);
  const orb=summonOrb(hero,dest,time);
  orbWake(rc,hero,dest,time);
  material.shadowverse(dest,time,hero,orb);
  const base=flatCard(nodes.source,dest);
  const project=(x:number,y:number)=>{if(base.matrix){const point=base.matrix.transformPoint(new DOMPoint(base.w*(.5+x),base.h*.5+base.w*y));return{x:point.x/point.w,y:point.y/point.w};}return{x:dest.x+x*u,y:dest.y+y*u*.82};};
  groundCracks(rc,project,u,time);
  if(time>=SV.impact+.035){
   const land=1-ease(SV.impact+.035,SV.contact,time),angle=reboundAngle(time);
   let p=flatCard(nodes.source,dest,u*.12*land);
   if(p.matrix)p.matrix=p.matrix.rotateAxisAngle(1,-1,0,angle);
   else p={...p,rx:(p.rx??0)+angle*Math.PI/180,ry:-angle*Math.PI/180,y:p.y-angle*.25};
   planeShadow(rc,footprint(base),u*(land*.12+angle/60),u);
   material.pose(sourceActor,{...p,mix:1,alpha:ease(SV.impact+.035,SV.impact+.060,time)});
  }
  cue('sv-reveal',.14,.16,650,.06);cue('sv-fracture',SV.scatter,.18,1150,.08);cue('sv-orb',1.30,.30,850,.08);cue('sv-impact',SV.impact,.24,100,.19);cue('sv-settle',SV.settled,.10,170,.045);

 }
}
function attack(){
 const a=rects.source,b=rects.target,u=a.w,dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,n={x:dx/len,y:dy/len},contact={x:b.x-n.x*b.w*.12,y:b.y-n.y*b.h*.16};
 const wind=ease(.05,.43,time),dash=clamp((time-.43)/.24),back=ease(.81,1.37,time);let p:Rect={...a,x:a.x-n.x*u*.20*wind,y:a.y-n.y*u*.20*wind,w:a.w*(1+.04*wind),h:a.h*(1+.04*wind)};
 const start={...p};if(time>=.43){p=mixRect(start,{...a,x:contact.x-n.x*u*.55,y:contact.y-n.y*u*.55},dash*dash*dash);if(time>=.74)p=mixRect(p,a,back);}
 const impact=(time-.67)/.75,hitstop=time>=.67&&time<.74;
 const recoil=impact>=0?Math.sin(clamp(impact/.45)*Math.PI)*Math.exp(-impact*1.5):0;
 material.pose(targetActor,{...flatCard(nodes.target,{...b,x:b.x+n.x*u*.13*recoil,y:b.y+n.y*u*.13*recoil},0,recoil*4),glow:hitstop?.28:0,color:'#ffe5b6'});
 planeShadow(rc,footprint(flatCard(nodes.source,p)),u*.16,u);
 material.pose(sourceActor,{...flatCard(nodes.source,p,u*.16*(1-back),Math.sin(dash*Math.PI)*3),glow:wind*(1-ease(.67,.95,time))*.22,color:'#c9d9e3'});
 if(time>=.44&&time<1.02){const q=clamp((time-.44)/.24),tail=ease(.69,1.02,time);const path=(t:number)=>({x:lerp(a.x,contact.x,t),y:lerp(a.y,contact.y,t)});exposure(rc,path,u*.19,'#b9d1e2',.65*(1-tail),Math.max(0,q-.72+tail*.72),q);}
 if(impact>=0&&impact<1){
  glow(fc,contact,u*(.12+.16*out(impact/.14)),'#f0f5f7',.60*(1-ease(.01,.22,impact)),.78);
  for(let i=0;i<6;i++){const spread=out(impact)*u*.65;haze(rc,{x:contact.x+Math.cos(i*1.7)*spread,y:contact.y+Math.sin(i*1.7)*spread*.55},u*(.32+impact*.52),u*(.28+impact*.34),.32*(1-ease(.1,1,impact)),i+impact*.3);}
 }
 cue('attack-wind',.16,.3,410,.10);cue('attack-hit',.67,.34,115,.36);
}
function spell(){
 const hand=rects.spell,discard=rects.discard,u=focused()?Math.min(innerWidth*.28,innerHeight*.34,200):Math.max(rects.source.w*1.72,106);
 const hero:Rect={x:side?innerWidth*.60:innerWidth*.40,y:innerHeight*.47,w:u,h:u*hand.h/hand.w};
 const lift=ease(.04,.36,time),fly=ease(1.53,2.13,time);let p=mixRect(hand,hero,lift);
 if(time>=1.53){p=mixRect(hero,{...discard,w:discard.w*.56,h:discard.h*.64},fly);p.y-=Math.sin(fly*Math.PI)*u*.20;}
 const charge=ease(.45,.83,time)*(1-ease(1.25,1.53,time));
 shadow(rc,{x:p.x,y:p.y+p.h*.52},p.w*.51,p.h*.09,.24);
 glow(rc,p,p.w*.82,'#69adf4',charge*.14,.95);
 spellPrint.pose(p,time,1-ease(2.08,2.20,time),Math.sin(fly*Math.PI)*.42,fly*.36);
 cue('spell-present',.12,.22,580,.06);cue('spell-frame',.70,.40,880,.08);cue('spell-release',1.48,.30,1040,.07);cue('spell-file',2.14,.16,320,.05);
}
function tick(now:number){if(disposed)return;const dt=Math.max(0,(now-last)/1000);last=now;if(playing&&ready&&!document.hidden){if(time>=DURATIONS[kind]){cycleGap+=dt;if(loop&&cycleGap>.8){post({cycle:true});time=0;cycleGap=0;playedCues.clear();}else if(!loop)playing=false;}else time=Math.min(DURATIONS[kind],time+dt*speed);render();}raf=requestAnimationFrame(tick);}
const api={async set(options:{kind?:Kind;mode?:string;side?:number;loop?:boolean;speed?:number;sound?:boolean;spell?:string;summonVersion?:'hearthstone'|'shadowverse'}){if(options.loop!==undefined)loop=options.loop;if(options.speed)speed=options.speed;if(options.sound!==undefined){soundOn=options.sound;if(soundOn){audio??=new AudioContext();await audio.resume();}}
 let recapture=false,reconfigure=false;if(options.summonVersion&&options.summonVersion!==summonVersion){summonVersion=options.summonVersion;reconfigure=true;}if(options.spell&&g.players[0].hand[1].id!==options.spell&&['S3','S4','S8'].includes(options.spell)){restore();for(let i=0;i<2;i++)g.players[i].hand[1]={...DB[options.spell],uid:`hand-${i}-1`};view.render(g);view.setHandOpen(true);recapture=true;}if(options.kind&&options.kind!==kind){kind=options.kind;reconfigure=true;}if(options.mode&&options.mode!==mode){mode=options.mode;reconfigure=true;}if(options.side!==undefined&&options.side!==side){side=options.side;recapture=true;}
 if(recapture){await prepare();return;}if(reconfigure&&ready){configure();time=0;cycleGap=0;playedCues.clear();playing=true;render();}
 },play(){if(!ready)return;if(time>=DURATIONS[kind])time=0;playing=true;last=performance.now();},replay(){if(!ready)return;time=0;cycleGap=0;playedCues.clear();playing=true;last=performance.now();render();},pause(){playing=false;render();},seek(t:number){playing=false;time=Math.max(0,Math.min(DURATIONS[kind],t));render();},info:()=>({ready,kind,mode,side,time,playing,hidden:hidden.size,surfaces:Object.keys(surfaces),width:innerWidth,height:innerHeight,source:'a67ceafdf',revision:7,summonVersion,summonContact:summonVersion==='hearthstone'?1.38:SV.impact,hero:ready&&kind==='summon'&&summonVersion==='shadowverse'?summonHero(innerWidth,innerHeight,nodes.hand.offsetWidth,nodes.hand.offsetHeight):null,orb:ready&&kind==='summon'&&summonVersion==='shadowverse'?summonOrb(summonHero(innerWidth,innerHeight,nodes.hand.offsetWidth,nodes.hand.offsetHeight),rects.source,time):null}),dispose(){document.body.style.translate='';disposed=true;++prepareId;cancelAnimationFrame(raf);restore();spellPrint.dispose();material.dispose();stopLayout();view.destroy();void audio?.close();}};
Object.assign(window,{vfx:api});
let resizeTimer=0;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=window.setTimeout(()=>{resize();if(ready){configure();render();}},150);});
window.addEventListener('pagehide',()=>api.dispose(),{once:true});document.addEventListener('visibilitychange',()=>{last=performance.now();});
void waitForDuel(root).then(()=>prepare()).then(()=>{last=performance.now();raf=requestAnimationFrame(tick);}).catch(error=>{console.error(error);post({error:String(error)});});
