/** Three fluid wells on the face of the affected monster. */
export function gaugeMarkup(id: string): string {
  const wells = [21, 39, 57].map((x, i) => {
    const diamond = `M${x} 6.8l7.2 8.6-7.2 9.4-7.2-9.4Z`;
    const mask = id + '-well-' + i;
    return `<path d="${diamond}" fill="#14231e" stroke="#97a591" stroke-width="1.3"/>
      <clipPath id="${mask}"><path d="${diamond}"/></clipPath>
      <g clip-path="url(#${mask})"><g data-liquid transform="translate(0 19)">
        <path d="M${x-8} 7q4-1.5 8 0t8 0v19h-16Z" fill="#c6dc78"/>
        <path d="M${x} 7v17l-7-9Z" fill="#89a64d"/>
        <path d="m${x} 8 4.7 6" fill="none" stroke="#eff7bc" stroke-width="1.5"/>
      </g></g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 78 31" aria-hidden="true">
    <path d="M2 15 11 3.5h56L76 15 67 27.5H11Z" fill="#25362c" stroke="#17231d" stroke-width="2"/>
    <path d="m5 15 7-9h54l7 9-7 10H12Z" fill="none" stroke="#ad9c73" stroke-width="1.5"/>
    ${wells}</svg>`;
}
export function fillGauge(badge: HTMLElement, position: number) {
  badge.querySelectorAll('[data-liquid]').forEach((liquid, index) => {
    const fraction = Math.max(0, Math.min(1, position - index));
    liquid.setAttribute('transform', `translate(0 ${19 * (1 - fraction)})`);
  });
}
