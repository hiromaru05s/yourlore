/** Small decoded atlases, one scheduler for both portraits. No game-clock waits. */
export type SeekerAction='idle'|'hurt'|'attack'|'mana'|'heal';
type Color='red'|'blue';
const actions:SeekerAction[]=['idle','hurt','attack','mana','heal'];
export const seekerAssets=['red','blue'].flatMap(c=>actions.map(a=>`/art/seekers/v2/${c}-${a}.webp`));
const atlases=new Map<string,HTMLImageElement>();
const duration:Record<SeekerAction,number>={idle:4200,hurt:1000,attack:1400,mana:1500,heal:1800};
const smooth=(v:number)=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
function atlas(color:Color,action:SeekerAction){const key=`${color}-${action}`;let image=atlases.get(key);if(!image){image=new Image();image.src=`/art/seekers/v2/${key}.webp`;atlases.set(key,image);}return image;}
interface Actor {canvas:HTMLCanvasElement;color:Color;action:SeekerAction;start:number;previous:HTMLCanvasElement;blendStart:number;}
const actors=new Set<Actor>();let raf=0,last=0;
const reducedQuery=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion:reduce)'):null;
const reduced=()=>reducedQuery?.matches??true;
function paintFrame(ctx:CanvasRenderingContext2D,img:HTMLImageElement,frame:number,alpha=1){
 if(!img.complete||!img.naturalWidth)return false;
 const cw=img.naturalWidth/4,ch=img.naturalHeight/4,f=Math.max(0,Math.min(15,frame));
 const first=Math.floor(f),next=Math.min(15,first+1),mix=f-first;
 ctx.globalAlpha=alpha;ctx.drawImage(img,(first%4)*cw,Math.floor(first/4)*ch,cw,ch,0,0,256,256);
 if(mix>0){ctx.globalAlpha=alpha*mix;ctx.drawImage(img,(next%4)*cw,Math.floor(next/4)*ch,cw,ch,0,0,256,256);}ctx.globalAlpha=1;return true;
}
function draw(actor:Actor,now:number){
 if(reduced()&&actor.action==='idle'&&actor.canvas.dataset.frame==='0.00')return;
 const ctx=actor.canvas.getContext('2d',{alpha:false});if(!ctx)return;
 if(actor.action!=='idle'&&now-actor.start>=duration[actor.action])change(actor,'idle',now);
 const age=now-actor.start;
 // Ping-pong the idle sequence: a continuous hair cycle without a 15→0 jump.
 const phase=(age%duration.idle)/duration.idle;
 const frame=reduced()?0:actor.action==='idle'?(phase<.5?phase*30:(1-phase)*30):smooth(age/duration[actor.action])*15;
 if(!paintFrame(ctx,atlas(actor.color,actor.action),frame))return;
 const blend=reduced()?1:smooth((now-actor.blendStart)/220);
 if(blend<1){ctx.globalAlpha=1-blend;ctx.drawImage(actor.previous,0,0);ctx.globalAlpha=1;}
 actor.canvas.dataset.action=actor.action;actor.canvas.dataset.frame=frame.toFixed(2);
}
function change(actor:Actor,action:SeekerAction,now:number){
 actor.previous.getContext('2d')?.drawImage(actor.canvas,0,0);actor.action=action;actor.start=now;actor.blendStart=now;
}
function tick(now:number){
 raf=0;if(now-last>=32&&!document.hidden){last=now;for(const actor of actors){if(!actor.canvas.isConnected){actors.delete(actor);continue;}draw(actor,now);}}
 if(actors.size)raf=requestAnimationFrame(tick);
}
export function seekerPortrait(color:Color):HTMLCanvasElement{
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;canvas.className='seeker-motion';canvas.setAttribute('role','img');canvas.setAttribute('aria-label',color==='red'?'Red Seeker':'Blue Seeker');
 const previous=document.createElement('canvas');previous.width=previous.height=256;
 const actor:Actor={canvas,color,action:'idle',start:performance.now(),blendStart:-1000,previous};
 actions.forEach(a=>atlas(color,a));actors.add(actor);if(!raf)raf=requestAnimationFrame(tick);return canvas;
}
export function animateSeeker(side:'me'|'opp',action:SeekerAction):void{
 if(reduced()||document.hidden)return;
 const canvas=document.querySelector<HTMLCanvasElement>(`${side==='me'?'#portraitMe':'#portraitOpp'} .seeker-motion`);
 const actor=[...actors].find(a=>a.canvas===canvas);if(!actor)return;
 const now=performance.now();if(actor.action===action&&now-actor.start<200)return;
 // Damage may interrupt, other events blend from the current displayed frame.
 change(actor,action,now);
}
