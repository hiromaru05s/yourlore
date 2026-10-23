import {SPECIAL_FX} from '../animationTempo';
import type {CardInst,GameState,Side} from '../../shared/types';
import {DB,FRAME_BACK} from '../../shared/cards';
import {cardEl} from '../cardView';
import {captureCardSurface,CARD_PADDING} from '../cardSurface';
import type {Spacetime} from './spacetime';

const modules=()=>Promise.all([import('./spacetime'),import('./snapshot')]);
export function warmTimewarp(){void modules().catch(()=>{});}
type Point={x:number;y:number};
/** One controller owns the complete cast / reservation / consumed-skip lifecycle. */
export class TimewarpPresentation {
  private optics?:Spacetime;
  private operation?:AbortController;
  private state?:GameState;
  private owner:Side=0;
  private dead=false;
  private source:Point={x:0,y:0};
  constructor(private root:HTMLElement,private viewer:Side){
    window.addEventListener('resize',this.refresh);
    document.addEventListener('visibilitychange',this.refresh);
    window.addEventListener('pagehide',this.clear);
  }
  private anchor():Point{
    const mine=this.owner===this.viewer;
    const r=this.root.querySelector(mine?'#endBtn':'#oppHand')?.getBoundingClientRect();
    return mine&&r?{x:Math.min(innerWidth-40,r.x+r.width/2),y:Math.max(65,r.y-70)}:
      {x:innerWidth*.82,y:Math.max(65,Math.min(innerHeight*.24,(r?.bottom??80)+40))};
  }
  private reduced(){return matchMedia('(prefers-reduced-motion:reduce)').matches;}
  private refresh=()=>{this.cancel();this.optics?.dispose();this.optics=undefined;if(this.state&&!document.hidden)this.sync(this.state);};
  private clear=()=>{this.cancel();this.optics?.dispose();this.optics=undefined;};
  /** Fast-forward settles awaited playback, including an in-flight asset capture. */
  cancel(){this.operation?.abort();this.operation=undefined;}
  sync(g:GameState){
    this.state=g;
    if(this.dead)return;
    if(g.over){this.clear();return;}
    if(this.operation)return;
    const next=(1-g.cur) as Side;
    const skipped=[next,g.cur].find(p=>g.players[p].skipTurnSources?.slice(0,g.players[p].skipTurns??0).includes('TIMEWARP'));
    if(skipped===undefined){this.clear();return;}
    this.owner=(1-skipped) as Side;
    if(document.hidden)return;
    if(this.optics)this.optics.draw('hold',0,this.source,this.anchor(),this.reduced());
    else void this.run('hold',this.owner);
  }
  async cast(player:Side,card:CardInst){
    const node=this.root.querySelector<HTMLElement>(`[data-uid="${CSS.escape(card.uid)}"]`);
    const r=node?.getBoundingClientRect();
    this.source=r&&r.width?{x:r.x+r.width/2,y:r.y+r.height/2}:{x:innerWidth*.5,y:innerHeight*(player===this.viewer?.82:.14)};
    await this.run('cast',player,card);
  }
  async release(skipped:Side){await this.run('release',(1-skipped) as Side);}
  private async makeFace(card:CardInst,signal:AbortSignal){
    const node=cardEl(card,{size:'hand',fullArt:true,costOverride:card.play??card.cost});
    node.style.cssText='position:fixed;left:-4000px;top:0;width:180px;height:270px;--cw:180px;--ch:270px;transform:none';document.body.append(node);
    const remove=()=>node.remove();signal.addEventListener('abort',remove,{once:true});
    try{
      await Promise.all([...node.querySelectorAll('img')].map(i=>i.decode().catch(()=>{})));signal.throwIfAborted();
      const surface=await captureCardSurface(node,FRAME_BACK,true,false);
      try{
        signal.throwIfAborted();if(!surface.face)throw Error('Missing timewarp face');
        const face=document.createElement('canvas');face.width=512;face.height=768;
        const pad=surface.face.width*CARD_PADDING/(1+2*CARD_PADDING);
        face.getContext('2d')!.drawImage(surface.face,pad,pad,surface.face.width-pad*2,surface.face.height-pad*2,0,0,512,768);
        return face;
      }finally{surface.back.width=surface.back.height=1;if(surface.face)surface.face.width=surface.face.height=1;}
    }finally{remove();signal.removeEventListener('abort',remove);}
  }
  private async run(phase:'cast'|'hold'|'release',owner:Side,card:CardInst={...DB.TIMEWARP,uid:'timewarp-reserved'}){
    this.cancel();if(this.dead||document.hidden||!this.root.isConnected)return;
    const operation=new AbortController(),signal=operation.signal;this.operation=operation;this.owner=owner;
    const deadline=setTimeout(()=>operation.abort(),12000);
    let frame=0;
    const cancelled=new Promise<void>(resolve=>signal.addEventListener('abort',()=>{cancelAnimationFrame(frame);resolve();},{once:true}));
    const work=async()=>{
      const [{Spacetime,CAST_MS,RELEASE_MS},{snapshotBoard}]=await modules();signal.throwIfAborted();
      let face:HTMLCanvasElement|undefined,board:HTMLCanvasElement|undefined;
      try{
        if(!this.optics)face=await this.makeFace(card,signal);
        signal.throwIfAborted();board=await snapshotBoard(this.root,signal);signal.throwIfAborted();
        if(!this.optics)this.optics=new Spacetime(board,face!);else this.optics.updateBackground(board);
        board=undefined;
      }finally{if(face)face.width=face.height=1;if(board)board.width=board.height=1;}
      if(phase==='hold'){this.optics.draw('hold',0,this.source,this.anchor(),this.reduced());return;}
      const duration=this.reduced()?650:phase==='cast'?CAST_MS:RELEASE_MS;
      await new Promise<void>((resolve,reject)=>{
        const start=SPECIAL_FX.now();let last=-Infinity;
        const tick=(now:number)=>{
          if(signal.aborted||this.dead||!this.root.isConnected||document.hidden){resolve();return;}
          const elapsed=Math.min(duration,now-start);
          if(now-last>=30||elapsed===duration){
            last=now;
            try{this.optics?.draw(phase,elapsed/duration*(phase==='cast'?CAST_MS:RELEASE_MS),this.source,this.anchor(),this.reduced());}catch(e){reject(e);return;}
          }
          if(elapsed===duration){resolve();return;}frame=SPECIAL_FX.requestFrame(tick);
        };frame=SPECIAL_FX.requestFrame(tick);
      });
      signal.throwIfAborted();
      if(phase==='cast'){this.optics?.draw('hold',0,this.source,this.anchor(),this.reduced());}
      else {this.optics?.dispose();this.optics=undefined;}
    };
    try{await Promise.race([work(),cancelled]);}
    catch(e){if(!signal.aborted)console.warn('[timewarp] presentation unavailable',e);this.optics?.dispose();this.optics=undefined;}
    finally{clearTimeout(deadline);cancelAnimationFrame(frame);if(this.operation===operation){this.operation=undefined;if(signal.aborted){this.optics?.dispose();this.optics=undefined;}}}
  }
  destroy(){if(this.dead)return;this.dead=true;this.clear();window.removeEventListener('resize',this.refresh);document.removeEventListener('visibilitychange',this.refresh);window.removeEventListener('pagehide',this.clear);}
}
