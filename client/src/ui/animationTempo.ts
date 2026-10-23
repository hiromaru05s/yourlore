/** Presentation time only. Server deadlines and the player turn clock stay in real time.
 * Keep authored phase/contact/cleanup timestamps together; shorten wall time instead
 * of truncating the tail or scaling a shared duration a second time.
 */
function presentationClock(durationScale: number) {
  return {
    durationScale,
    rate: 1 / durationScale,
    milliseconds: (authored: number) => authored * durationScale,
    now: () => performance.now() / durationScale,
    requestFrame: (callback: FrameRequestCallback) =>
      requestAnimationFrame(now => callback(now / durationScale)),
  };
}
export const STANDARD_FX = presentationClock(0.70);
export const SPECIAL_FX = presentationClock(0.75);
