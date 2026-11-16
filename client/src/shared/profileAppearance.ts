/** The original white portrait is the fallback for older accounts and rooms. */
export const starterBackgrounds = ['plain', 'slate', 'navy', 'sky', 'sage', 'sand', 'rose', 'violet'] as const;
export type ProfileBackground = typeof starterBackgrounds[number];
export function isProfileBackground(value: unknown): value is ProfileBackground {
  return starterBackgrounds.some(id => id === value);
}
export function profileBackground(value: unknown): ProfileBackground {
  return isProfileBackground(value) ? value : 'plain';
}
