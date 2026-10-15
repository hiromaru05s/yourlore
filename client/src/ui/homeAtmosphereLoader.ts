/** Bound optional background startup without changing the normal rendered scene.
 * The decoded CSS plate remains visible if the module/textures/GPU cannot start. */
export function loadHomeAtmosphere(host: HTMLElement, signal: AbortSignal): void {
  host.dataset.atmosphere = 'loading';
  let stopped = false;
  let dispose: (() => void) | undefined;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearTimeout(timeout);
    observer.disconnect();
    signal.removeEventListener('abort', stop);
    dispose?.();
  };
  const fallback = () => {
    if (stopped) return;
    host.dataset.atmosphere = 'fallback';
    stop();
  };
  const timeout = setTimeout(fallback, 15000);
  const observer = new MutationObserver(() => {
    if (host.dataset.atmosphere === 'ready') { clearTimeout(timeout); observer.disconnect(); }
    else if (host.dataset.atmosphere === 'fallback') fallback();
  });
  observer.observe(host, { attributes: true, attributeFilter: ['data-atmosphere'] });
  signal.addEventListener('abort', stop, { once: true });
  if (signal.aborted) { stop(); return; }
  void import('./homeAtmosphere').then(({ mountHomeAtmosphere }) => {
    if (stopped || !host.isConnected) return;
    dispose = mountHomeAtmosphere(host);
  }).catch(fallback);
}
