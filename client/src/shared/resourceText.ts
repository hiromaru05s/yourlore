/** Display-only compatibility for card snapshots and battle logs saved before the rename. */
export function resourceText(text: string): string {
  return text
    .replace(/最大マナ/g, 'マナ水晶')
    .replace(/최대\s*마나/g, '마나 수정')
    .replace(/마나 수정가/g, '마나 수정이')
    .replace(/마나 수정는/g, '마나 수정은')
    .replace(/마나 수정를/g, '마나 수정을')
    .replace(/마나 수정로/g, '마나 수정으로')
    .replace(/(?:max|maximum)[ -]mana/gi, word => /^[A-Z]/.test(word) ? 'Mana Crystals' : 'mana crystals')
    .replace(/\b(1|one) mana crystals\b/g, '$1 mana crystal')
    .replace(/(mana crystals) is\b/gi, '$1 are');
}
