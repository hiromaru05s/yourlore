import type { CardInst } from '../shared/types';
import { cardName, t } from '../i18n';
import '../styles/cardPickerFilters.css';

/** Filter only the caller's eligible pool; never create new purchase candidates. */
export function installCardPickerFilters(
  modal: HTMLElement,
  grid: HTMLElement,
  entries: { card: CardInst; node: HTMLElement }[],
  onChange: (visible: Set<string>) => void,
): void {
  modal.classList.add('picker-filterable');
  const controls = document.createElement('div');
  controls.className = 'picker-filters';
  const searchLabel = document.createElement('label');
  searchLabel.className = 'picker-search-label';
  const search = document.createElement('input');
  search.type = 'search';
  search.className = 'input picker-search';
  search.placeholder = t('picker.searchName');
  search.setAttribute('aria-label', t('picker.searchName'));
  search.autocomplete = 'off';
  searchLabel.append(search);

  const costLabel = document.createElement('label');
  costLabel.className = 'picker-cost-label';
  const costText = document.createElement('span');
  costText.textContent = t('picker.cost');
  const cost = document.createElement('select');
  cost.className = 'picker-cost';
  cost.setAttribute('aria-label', t('picker.cost'));
  cost.add(new Option(t('picker.all'), ''));
  [...new Set(entries.map(({card}) => card.cost))].sort((a,b) => a-b)
    .forEach(value => cost.add(new Option(String(value), String(value))));
  costLabel.append(costText, cost);

  const types = document.createElement('div');
  types.className = 'picker-types';
  types.setAttribute('role', 'group');
  types.setAttribute('aria-label', t('picker.type'));
  let type = '';
  const buttons = ['', 'mon', 'spell'].map(value => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn';
    button.dataset.type = value;
    button.textContent = t(`picker.${value === 'mon' ? 'monster' : value || 'all'}`);
    button.setAttribute('aria-pressed', String(value === type));
    button.onclick = () => { type = value; apply(); };
    types.append(button);
    return button;
  });
  const meta = document.createElement('div');
  meta.className = 'picker-filter-meta';
  const count = document.createElement('span');
  count.setAttribute('role', 'status');
  count.setAttribute('aria-live', 'polite');
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'btn btn-ghost picker-filter-reset';
  reset.textContent = t('picker.resetFilters');
  reset.onclick = () => { search.value = ''; cost.value = ''; type = ''; apply(); search.focus(); };
  meta.append(count, reset);
  controls.append(searchLabel, costLabel, types, meta);
  grid.before(controls);

  const empty = document.createElement('p');
  empty.className = 'picker-empty';
  empty.textContent = t('picker.noResults');
  grid.append(empty);
  const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase().trim();
  const names = entries.map(({card}) => normalize(cardName(card)));
  function apply(): void {
    const query = normalize(search.value);
    const visible = new Set<string>();
    entries.forEach(({card,node}, index) => {
      const matches = (!query || names[index].includes(query))
        && (cost.value === '' || card.cost === Number(cost.value))
        && (!type || card.t === type);
      node.hidden = !matches;
      if (matches) visible.add(card.uid);
    });
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.type === type)));
    count.textContent = t('picker.results').replace('{n}', String(visible.size)).replace('{total}', String(entries.length));
    empty.hidden = visible.size > 0;
    reset.disabled = !search.value && cost.value === '' && !type;
    grid.scrollTop = 0;
    onChange(visible);
  }
  search.addEventListener('input', apply);
  cost.addEventListener('change', apply);
  apply();
}
