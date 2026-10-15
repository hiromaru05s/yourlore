import type {GameState} from '../../shared/types';
import {monsterPresentationNodes} from '../monster/runtime';
import {RigidEcho,ease} from './renderer';
import {AnesthesiaState,ANESTHESIA_EXIT_MS} from './state';
type Surface={uid:string;canvas:HTMLCanvasElement;paint:RigidEcho;shake?:Animation};
/** Board-owned lifetime; surface children follow the actual idle/attack actor transforms. */
export class AnesthesiaPresentation {
 private state=new AnesthesiaState();
 private surfaces=new Map<HTMLElement,Surface>();
 private frame=0;private last=-Infinity;private dead=false;
 private motion=matchMedia('(prefers-reduced-motion: reduce)');
 constructor(private root:HTMLElement){
  document.addEventListener('visibilitychange',this.visibility);
  this.motion.addEventListener('change',this.motionChange);
 }
 advanceTurn(turn:number){this.state.advance(turn,performance.now());this.schedule();}
 sync(g:GameState){this.state.sync(g,performance.now());this.last=-Infinity;this.paint(performance.now());this.schedule();}
 private schedule(){if(!this.dead&&!this.frame&&!document.hidden&&this.state.entries.size)this.frame=requestAnimationFrame(this.tick);}
 private tick=(now:number)=>{this.frame=0;if(this.dead||document.hidden)return;if(!this.root.isConnected){this.dispose();return;}if(now-this.last>=32){this.paint(now);this.last=now;}this.schedule();};
 private remove(node:HTMLElement,s:Surface){s.shake?.cancel();s.canvas.remove();this.surfaces.delete(node);}
 private mount(node:HTMLElement,uid:string){
  // Actor.cloneNode copies canvas elements but not their pixels or ownership.
  node.querySelectorAll(':scope > .anesthesia-status').forEach(n=>n.remove());
  const canvas=document.createElement('canvas');canvas.className='anesthesia-status';canvas.dataset.variant='04';canvas.dataset.sourceUid=uid;canvas.setAttribute('aria-hidden','true');
  canvas.width=270;canvas.height=420;canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5';node.append(canvas);
  const surface:Surface={uid,canvas,paint:new RigidEcho(canvas.getContext('2d')!)};this.surfaces.set(node,surface);return surface;
 }
 private paint(now:number){
  this.state.prune(now);const wanted=new Set<HTMLElement>();
  for(const source of this.root.querySelectorAll<HTMLElement>('.zone-mon .card[data-uid]')){
   const uid=source.dataset.uid!,entry=this.state.entries.get(uid);
   if(!entry){delete source.dataset.anesthesiaProtected;continue;}
   source.dataset.anesthesiaProtected=String(entry.end===undefined);
   const age=now-entry.start,exit=entry.end===undefined?0:this.motion.matches?1:ease(0,ANESTHESIA_EXIT_MS,now-entry.end);
   for(const node of monsterPresentationNodes(source)){
    wanted.add(node);const s=this.surfaces.get(node)??this.mount(node,uid);
    s.canvas.dataset.active=String(entry.end===undefined);
    if(this.motion.matches||entry.end!==undefined){s.shake?.cancel();s.shake=undefined;}
    else if(!s.shake){
     // Additive movement preserves combat/drag positioning. Animation state is not cloned.
     s.shake=node.animate([{translate:'0px',offset:0},{translate:'1.6px',offset:.03},{translate:'-1.8px',offset:.065},{translate:'1.2px',offset:.1},{translate:'-.8px',offset:.15},{translate:'0px',offset:.25},{translate:'0px',offset:1}],{duration:1700,iterations:Infinity,composite:'add'});
     s.shake.id='anesthesia-rigid-echo';s.shake.pause();
    }
    if(s.shake)s.shake.currentTime=age;
    s.paint.draw(age,this.motion.matches?1:ease(0,180,age),exit,this.motion.matches);
   }
  }
  for(const [node,s]of this.surfaces)if(!wanted.has(node)||!node.isConnected)this.remove(node,s);
 }
 private visibility=()=>{if(document.hidden){cancelAnimationFrame(this.frame);this.frame=0;for(const [node,s]of this.surfaces)this.remove(node,s);}else{this.last=-Infinity;this.paint(performance.now());this.schedule();}};
 private motionChange=()=>{this.paint(performance.now());this.schedule();};
 dispose(){if(this.dead)return;this.dead=true;cancelAnimationFrame(this.frame);this.frame=0;this.state.clear();for(const [node,s]of this.surfaces)this.remove(node,s);for(const node of this.root.querySelectorAll<HTMLElement>('[data-anesthesia-protected]'))delete node.dataset.anesthesiaProtected;document.removeEventListener('visibilitychange',this.visibility);this.motion.removeEventListener('change',this.motionChange);}
}
