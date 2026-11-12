import './badge.css';

const clips = {
  grant: {url: new URL('./grant.webp',import.meta.url).href, duration: 1420, contact: .58},
  increase: {url: new URL('./increase.webp',import.meta.url).href, duration: 1130, contact: .51},
  loss: {url: new URL('./loss.webp',import.meta.url).href, duration: 1480, contact: .43},
};
type Motion = keyof typeof clips;
const sheets = new Map<Motion, Promise<HTMLImageElement>>();
function sheet(effect: Motion) {
  let pending = sheets.get(effect);
  if (!pending) {
    const image = new Image();
    image.src = clips[effect].url;
    pending = image.decode().then(() => image).catch(error => {
      sheets.delete(effect);
      throw error;
    });
    sheets.set(effect, pending);
  }
  return pending;
}

function ease(a: number, b: number, t: number) {
  const u = Math.max(0, Math.min(1, (t-a)/(b-a)));
  return u*u*(3-2*u);
}

/** Keeps a portrait's in-flight paint across board rerenders. The latest state wins. */
export class CurseSealBadge {
  private count?: number;
  private badge?: HTMLSpanElement;
  private number?: HTMLElement;
  private revision = 0;
  private frame = 0;

  sync(ring: HTMLElement, count: number, label: string) {
    const before = this.count;
    this.count = count;
    if (!this.badge && count === 0) return;
    if (!this.badge) {
      this.badge = document.createElement('span');
      this.badge.className = 'pt-curse-seals';
      this.badge.setAttribute('role','img');
      this.number = document.createElement('b');
      this.number.setAttribute('aria-hidden','true');
      this.badge.append(this.number);
    }
    if (this.badge.parentNode !== ring) ring.append(this.badge);
    this.badge.setAttribute('aria-label', label+' '+count);
    this.badge.title = label+' '+count+'/20';
    if (before === count) return;
    this.stop();
    if (before === undefined || (count !== 0 && count < before) ||
        document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.settle();
      return;
    }
    const effect = count === 0 ? 'loss' : before === 0 ? 'grant' : 'increase';
    this.badge.hidden = before === 0;
    this.number!.textContent = String(before);
    this.number!.style.removeProperty('opacity');
    this.number!.style.removeProperty('transform');
    const revision = this.revision;
    void sheet(effect).then(image => {
      if (this.revision !== revision) return;
      this.animate(image,effect,before,count);
    }).catch(() => { if (this.revision === revision) this.settle(); });
  }

  private animate(image: HTMLImageElement, effect: Motion, before: number, after: number) {
    const badge = this.badge!, number = this.number!;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 224;
    canvas.setAttribute('aria-hidden','true');
    const ctx = canvas.getContext('2d');
    if (!ctx) { this.settle(); return; }
    badge.prepend(canvas);
    badge.hidden = false;
    badge.dataset.motion = effect;
    const {duration,contact} = clips[effect];
    const start = performance.now();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let previousTile = -1;
    const draw = (now: number) => {
      const t = Math.min(1,(now-start)/duration);
      if (t >= 1 || document.hidden || reduced.matches || !badge.isConnected) { this.settle(); return; }
      const tile = Math.round(t*55);
      if (tile !== previousTile) {
        ctx.clearRect(0,0,224,224);
        ctx.drawImage(image,tile%8*224,Math.floor(tile/8)*224,224,224,0,0,224,224);
        previousTile = tile;
      }
      const n = t < contact ? before : after;
      number.textContent = n ? String(n) : '';
      let opacity = 1, scale = 1;
      if (effect === 'grant') { opacity = ease(contact,.75,t); scale = .72+.28*opacity; }
      if (effect === 'increase') {
        const grip = ease(.29,.50,t)*(1-ease(.52,.76,t));
        scale = 1-.25*grip+.09*ease(.52,.63,t)*(1-ease(.63,.85,t));
      }
      if (effect === 'loss') { opacity = 1-ease(.25,contact,t); scale = .75+.25*opacity; }
      number.style.opacity = String(opacity);
      number.style.transform = 'translate(-50%,-50%) scale('+scale+')';
      this.frame = requestAnimationFrame(draw);
    };
    draw(start);
  }

  private stop() {
    ++this.revision;
    cancelAnimationFrame(this.frame);
    this.badge?.querySelector('canvas')?.remove();
    if (this.badge) delete this.badge.dataset.motion;
  }

  private settle() {
    this.stop();
    if (!this.count) {
      this.badge?.remove();
      this.badge = this.number = undefined;
      return;
    }
    this.badge!.hidden = false;
    this.number!.textContent = String(this.count);
    this.number!.removeAttribute('style');
  }

  dispose() {
    this.stop();
    this.badge?.remove();
    this.badge = this.number = undefined;
    this.count = undefined;
  }
}
