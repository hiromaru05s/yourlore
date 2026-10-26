// Standalone visual study. No application imports, account calls, or persisted state.
const descriptions: Record<string, string> = {
  '1': '01 銀縁 — 外枠と同じ面取り。決定は明るい青、通常は深い青。',
  '2': '02 隅のしるし — 輪郭を省き、対角の短い線でボタンを示す。',
  '3': '03 小さな刻印 — YES・主要操作だけに菱形。内側の細線で枠とつなぐ。',
};
const feedback = document.querySelector<HTMLElement>('.feedback')!;
document.querySelectorAll<HTMLButtonElement>('.variants button').forEach(button => {
  button.addEventListener('click', () => {
    const style = button.dataset.style!;
    document.body.dataset.style = style;
    document.querySelectorAll('.variants button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    document.querySelector('#design-note')!.textContent = descriptions[style];
    feedback.textContent = 'ボタンをクリックして試せます';
  });
});
document.querySelectorAll<HTMLButtonElement>('[data-feedback]').forEach(button => {
  button.addEventListener('click', () => { feedback.textContent = button.dataset.feedback!; });
});
document.querySelector<HTMLButtonElement>('[data-toggle]')!.addEventListener('click', event => {
  const button = event.currentTarget as HTMLButtonElement;
  const selected = button.getAttribute('aria-pressed') !== 'true';
  button.setAttribute('aria-pressed', String(selected));
  button.querySelector('span')!.textContent = selected ? '✓　選択中' : '選択する';
  feedback.textContent = selected ? '選択状態にしました' : '選択を解除しました';
});
