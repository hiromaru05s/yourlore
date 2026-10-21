/** Public names are chosen explicitly, never derived from an identity provider. */
export function parseUsername(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.normalize('NFKC').trim().replace(/ +/g, ' ');
  if (name.length < 2 || name.length > 24) return null;
  return /^[0-9A-Za-z가-힣ㄱ-ㅎぁ-んァ-ヶ一-龯々ー ._-]+$/.test(name) ? name : null;
}
