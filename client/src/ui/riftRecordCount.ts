import './riftRecordCount.css';
export const RECORD_VARIANTS = ['original','stepped','glass'] as const;
export type RecordVariant = typeof RECORD_VARIANTS[number];
export function recordVariant(value?: string): RecordVariant {
  return RECORD_VARIANTS.includes(value as RecordVariant) ? value as RecordVariant : 'original';
}
/** Bounded decorative layers; the front number always shows the exact public count.
 * Pure DOM/CSS: no listeners, timers, textures, or animation owners survive a rerender. */
export function createRiftRecordCount(count: number, previous?: number, variant: RecordVariant = 'original'): HTMLSpanElement {
  const n = Number.isFinite(count) ? Math.max(0,Math.trunc(count)) : 0;
  const el = document.createElement('span');
  el.className = 'rift-record-count';
  el.dataset.variant = variant;
  el.dataset.count = String(n);
  el.dataset.empty = String(n === 0);
  el.dataset.change = previous == null || previous === n ? 'none' : n > previous ? 'gain' : 'loss';
  el.setAttribute('aria-hidden','true');
  const layers = Math.min(5,Math.max(1,n));
  el.style.setProperty('--record-layers',String(layers));
  // Append back to front, so each edge naturally occludes the layer behind it.
  for (let depth=layers-1;depth>=0;depth--) {
    const card = document.createElement('span');
    card.className = 'record-card' + (depth === 0 ? ' record-front' : '');
    card.style.setProperty('--record-depth',String(depth));
    card.innerHTML = '<span class="record-surface"></span><span class="record-line"></span><span class="record-reflection"></span>';
    if (depth === 0) {
      const numeral = document.createElement('span');
      numeral.className = 'record-number';
      numeral.textContent = String(n);
      if (String(n).length > 1) numeral.style.fontSize = (String(n).length === 2 ? '36' : String(n).length === 3 ? '30' : '23') + 'cqw';
      card.append(numeral);
      const mark = document.createElement('span');
      mark.className = 'record-star';
      card.append(mark);
    }
    el.append(card);
  }
  return el;
}
