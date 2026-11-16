import type {ClickStyle} from '../ui/clickBurst';
import './clickBurstPicker.css';

const choices: ReadonlyArray<readonly [ClickStyle, string]> = [
  ['flare','① 星閃'], ['ink','② 蒼墨'], ['glass','③ 硝子花'],
];

export function mountClickPicker(signal: AbortSignal, select: (value: ClickStyle) => void, fire: (x:number,y:number) => void) {
  const group = document.createElement('div');
  group.dataset.clickFxPicker = '';
  group.setAttribute('role','group');
  group.setAttribute('aria-label','クリック演出を選んで試す');
  const url = new URL(location.href);
  const initial = choices.find(([key]) => key === url.searchParams.get('clickFx'))?.[0] ?? 'flare';
  select(initial);
  for (const [key,label] of choices) {
    const button = document.createElement('button');
    button.type='button';button.textContent=label;button.setAttribute('aria-pressed',String(key===initial));
    button.addEventListener('click', () => {
      select(key);url.searchParams.set('clickFx',key);history.replaceState(history.state,'',url);
      for (const child of group.children) child.setAttribute('aria-pressed',String(child===button));
      const rect = group.getBoundingClientRect();
      fire(rect.left + rect.width / 2, rect.top - 53);
    }, {signal});
    group.append(button);
  }
  document.body.append(group);
  signal.addEventListener('abort',()=>group.remove(),{once:true});
}
