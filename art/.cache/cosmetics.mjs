const themes = [['astral', '星図', 'Star Atlas', '성도'], ['verdant', '翠葉', 'Verdant', '녹엽'], ['crimson', '緋印', 'Crimson Seal', '홍인'], ['ivory', '白銀', 'Ivory Moon', '백은']];
export const COSMETICS = themes.flatMap(([key, ja, en, ko]) => [
    { id: key, kind: 'sleeve', url: `/cosmetics/v2/sleeve-${key}.webp`, ja: `${ja}のスリーブ`, en: `${en} Sleeve`, ko: `${ko} 슬리브`, price: 0 },
    { id: `furniture:${key}`, kind: 'furniture', url: `/cosmetics/v2/material-${key}.webp`, ja: `${ja}のデッキ置き場＆シェルフ`, en: `${en} Deck Holder & Shelf`, ko: `${ko} 덱 받침 & 선반`, price: 0 }
]);
export const FURNITURE_LIST = COSMETICS.filter(c => c.kind === 'furniture');
export const cosmetic = (id) => COSMETICS.find(c => c.id === id);
export const furnitureUrl = (id) => FURNITURE_LIST.find(c => c.id === id)?.url;
export function ownedCosmetics(raw) { try {
    const ids = JSON.parse(raw || '[]');
    return ['default', ...new Set(Array.isArray(ids) ? ids.filter((id) => typeof id === 'string' && !!cosmetic(id)) : [])];
}
catch {
    return ['default'];
} }
export function equipmentId(value, kind) {
    return typeof value === 'string' && cosmetic(value)?.kind === kind ? value : 'default';
}
