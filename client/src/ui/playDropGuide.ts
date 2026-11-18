import '../styles/playDropGuide.css';

export interface PlayDropState {
  left: number; right: number; top: number; bottom: number;
  x: number; y: number; ghostHeight: number;
  ready: boolean; blocked: boolean; label: string;
  card?: HTMLElement;
}

/** Selected design 03. Receives the exact acceptance decision from the hand gesture. */
export class PlayDropGuide {
  private canvas = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D | null;
  private badge = document.createElement('div');
  private guide = document.createElement('div');
  private raf = 0;
  private deadline = 0;
  private amount = 0;
  private last = 0;
  private lastPaint = 0;
  private active = true;
  private disposed = false;
  private reduced = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  private state: PlayDropState | null = null;
  private anchor = {x:innerWidth/2,y:innerHeight/2};
  private rect = {x:8,y:24,w:innerWidth-16,h:innerHeight-32};

  constructor() {
    this.guide.className = 'play-drop-guide';
    this.guide.setAttribute('role', 'status');
    this.guide.setAttribute('aria-live', 'polite');
    this.canvas.className = 'play-ready-light';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.badge.className = 'play-ready-badge';
    this.badge.setAttribute('aria-hidden', 'true');
    // Keep the existing CSS guide as an explicit no-Canvas fallback.
    try { this.ctx = this.canvas.getContext('2d'); } catch { this.ctx = null; }
    document.body.append(this.guide);
    if (this.ctx) {
      this.guide.classList.add('play-drop-guide--light');
      document.body.append(this.canvas, this.badge);
    }
  }

  update(state: PlayDropState): void {
    if (this.disposed || !this.active) return;
    this.state = state;
    const {left,right,top,bottom,ready,blocked,label} = state;
    this.rect = {x:left,y:top,w:right-left,h:bottom-top};
    Object.assign(this.guide.style, {left:`${left}px`,top:`${top}px`,width:`${right-left}px`,height:`${bottom-top}px`});
    this.guide.classList.toggle('is-ready', ready);
    this.guide.classList.toggle('is-blocked', blocked);
    if (this.guide.textContent !== label) this.guide.textContent = label;
    if (!this.ctx) return;
    const text = (blocked ? '×  ' : ready ? '✓  ' : '↑  ') + label;
    if (this.badge.textContent !== text) this.badge.textContent = text;
    this.badge.dataset.state = blocked ? 'blocked' : ready ? 'ready' : 'lift';
    this.positionBadge();
    this.wake();
  }

  private positionBadge(): void {
    if (!this.state) return;
    const {card,x,y,ghostHeight} = this.state;
    const r=card?.isConnected?card.getBoundingClientRect():null;
    // The physical card can lag, tilt, resize and return independently of the pointer.
    this.anchor={x:r?r.left+r.width*.5:x,y:r?r.top+r.height*.58:y};
    const top=r?r.bottom+14:y+ghostHeight*.42+14;
    const halfWidth=this.badge.offsetWidth/2+12;
    this.badge.style.left=`${Math.max(halfWidth,Math.min(innerWidth-halfWidth,this.anchor.x))}px`;
    this.badge.style.top=`${Math.max(12,Math.min(innerHeight-this.badge.offsetHeight-16,top))}px`;
  }

  /** Release contracts the bevel; cancellation/navigation disposes immediately. */
  finish(): void {
    if (this.disposed) return;
    if (this.ctx) this.positionBadge();
    this.active = false;
    this.guide.remove();
    if (!this.ctx || this.reduced?.matches || !this.amount) { this.destroy(); return; }
    this.wake();
    this.deadline = window.setTimeout(() => this.destroy(), 800);
  }

  private wake(): void {
    if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame(this.draw); }
  }

  private draw = (now: number): void => {
    this.raf = 0;
    if (this.disposed || !this.ctx || !this.state) return;
    // Cap decorative canvas paints at 30fps; hand movement keeps its native rate.
    if (now-this.lastPaint < 30 && !this.reduced?.matches) { this.raf=requestAnimationFrame(this.draw); return; }
    this.lastPaint = now;
    const dt=Math.min(100,now-this.last);this.last=now;
    const target=this.active?1:0;
    this.amount=this.reduced?.matches?target:this.amount+(target-this.amount)*(1-Math.exp(-dt/(this.active?75:100)));
    if (this.amount < .004 && !this.active) { this.destroy(); return; }
    if (this.active) this.positionBadge();
    this.badge.style.opacity=String(this.amount);
    this.badge.style.transform=`translate(-50%, ${6*(1-this.amount)}px)`;
    const dpr=Math.min(devicePixelRatio||1,2),w=innerWidth,h=innerHeight;
    if(this.canvas.width!==Math.round(w*dpr)||this.canvas.height!==Math.round(h*dpr)){this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);}
    const c=this.ctx;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
    const blue=this.state.blocked?'191,128,111':this.state.ready?'111,196,250':'137,162,185';
    const silver=this.state.blocked?'239,192,174':this.state.ready?'218,242,255':'173,193,206';
    const pulse=this.reduced?.matches?1:.94+Math.sin(now/690)*.06;
    c.globalAlpha=this.amount*(this.state.ready?1:.62);
    const {x,y,w:rw,h:rh}=this.rect,cut=Math.min(27,rw*.055),inset=(1-this.amount)*9;
    const path=(d=0)=>{const a=x+d+inset,b=y+d+inset,ww=rw-2*d-2*inset,hh=rh-2*d-2*inset,k=Math.max(8,cut-d*.3);c.beginPath();c.moveTo(a+k,b);c.lineTo(a+ww-k,b);c.lineTo(a+ww,b+k);c.lineTo(a+ww,b+hh-k);c.lineTo(a+ww-k,b+hh);c.lineTo(a+k,b+hh);c.lineTo(a,b+hh-k);c.lineTo(a,b+k);c.closePath();};
    const stroke=(color:string,width:number)=>{c.strokeStyle=color;c.lineWidth=width;c.stroke();};

    // The luminous bevel stays at the acceptance boundary, opening toward the card.
    path();stroke('rgba(5,25,47,.7)',3);
    c.save();path();c.clip();
    const depth=32;
    for(const [ax,ay,bx,by,fx,fy,fw,fh] of [[x,y,x,y+depth,x,y,rw,depth],[x,y+rh,x,y+rh-depth,x,y+rh-depth,rw,depth],[x,y,x+depth,y,x,y,depth,rh],[x+rw,y,x+rw-depth,y,x+rw-depth,y,depth,rh]]){
      const bevel=c.createLinearGradient(ax,ay,bx,by);bevel.addColorStop(0,`rgba(${blue},.28)`);bevel.addColorStop(.12,`rgba(${blue},.18)`);bevel.addColorStop(.42,`rgba(${blue},.045)`);bevel.addColorStop(1,`rgba(${blue},0)`);c.fillStyle=bevel;c.fillRect(fx,fy,fw,fh);
    }
    c.restore();
    for(let i=28;i>=2;i-=2){path(i*.28);stroke(`rgba(${blue},${.015*(1-i/32)*pulse})`,i);}
    path();stroke(`rgba(${silver},.5)`,1);
    const px=Math.max(x+cut,Math.min(x+rw-cut,this.anchor.x)),py=Math.max(y+cut,Math.min(y+rh-cut,this.anchor.y));
    for(const [vertical,edge,distance] of [[true,x,Math.abs(this.anchor.x-x)],[true,x+rw,Math.abs(this.anchor.x-x-rw)],[false,y,Math.abs(this.anchor.y-y)],[false,y+rh,Math.abs(this.anchor.y-y-rh)]] as [boolean,number,number][]){
      const strength=.25+.65*Math.exp(-distance/(vertical?rw:rh)*2.2);
      const cx=vertical?edge:px,cy=vertical?py:edge;
      c.save();path();c.clip();const glow=c.createRadialGradient(cx,cy,0,cx,cy,170);glow.addColorStop(0,`rgba(${blue},${.42*strength})`);glow.addColorStop(.23,`rgba(${blue},${.12*strength})`);glow.addColorStop(1,`rgba(${blue},0)`);c.fillStyle=glow;c.fillRect(cx-170,cy-170,340,340);c.restore();
      c.save();path();const light=c.createRadialGradient(cx,cy,0,cx,cy,165);light.addColorStop(0,`rgba(${silver},${strength})`);light.addColorStop(1,`rgba(${blue},0)`);c.strokeStyle=light;c.lineWidth=2.4;c.stroke();c.restore();
    }
    if (!this.reduced?.matches) this.raf=requestAnimationFrame(this.draw);
  };

  destroy(): void {
    if (this.disposed) return;
    this.disposed=true;
    cancelAnimationFrame(this.raf);
    clearTimeout(this.deadline);
    this.guide.remove();this.badge.remove();this.canvas.remove();
    this.canvas.width=this.canvas.height=0;
    this.state=null;
  }
}
