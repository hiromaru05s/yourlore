/** Private DOM association for legacy face-down cards; never serialize hidden UIDs. */
const trapUids = new WeakMap<HTMLElement, string>();
export function bindOriginTrap(node: HTMLElement, uid: string): void { trapUids.set(node, uid); }
export function findOriginTrap(uid: string): HTMLElement | null {
 for (const node of document.querySelectorAll<HTMLElement>('.zone-st .buff-icon--trap')) {
  if (trapUids.get(node) === uid) return node;
 }
 return null;
}
