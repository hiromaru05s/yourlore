const params = new URLSearchParams(location.search);
if (params.has('board')) {
  await import('./board').then(m => m.mountBoard());
} else {
  await import('./style.css');
  await import('./opponent').then(m => m.mountOpponent());
}
export {};
