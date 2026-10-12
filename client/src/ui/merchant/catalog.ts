export const ids = ['MERCH1', 'MERCH2', 'DARK_MERCHANT'] as const;
export type Merchant = typeof ids[number];
export const names = ['見習い商人', '王都の商売人', '闇商人'];
export const normalDesigns = [
    { name: '散らばる釣銭', note: '方向も高さもばらけて弾け、縁で跳ねて不揃いに倒れる。' },
    { name: '扇の払い出し', note: '奥から手前へこぼれる。放出と接地の間隔が一枚ずつずれる。' },
    { name: '片跳ねの勘定', note: '低く跳び、斜めの接触で進路が変わる。跳ねる回数も揃わない。' },
    { name: '縁回りの余韻', note: '縁で転がり、ふらついて倒れる。倒れる向きと余韻も一枚ずつ異なる。' },
];
export const darkDesigns = [
    { name: '黒貨の通行料', note: '黒貨が一枚ずつ落ち、銀の門と重い幕が開く。カードは中央で拡大表示を保つ。' },
    { name: '禁庫の放出', note: '黒い金庫が底から現れ、重い黒貨が前へ溢れる。蓋の内側に狭い銀光が走る。' },
    { name: '影秤の契約', note: '黒貨が左右の秤皿へ落ち、重さで傾く。最後の一枚で釣り合い、契約が結ばれる。' },
    { name: '夜市の開幕', note: '上から落ちる黒貨に合わせ、天幕・灯火・売り台が順に現れる。市場が静かに開く。' },
];
export const duration = (id: Merchant) => id === 'DARK_MERCHANT' ? 6600 : 3100;
export const hit = 790;
export const count = (id: Merchant) => id === 'MERCH1' ? 2 : 6;
export const clamp = (x: number) => Math.max(0, Math.min(1, x));
export const ease = (a: number, b: number, x: number) => { const q = clamp((x - a) / (b - a)); return q * q * (3 - 2 * q); };
export const hash = (x: number) => { const q = Math.sin(x * 127.1 + 311.7) * 43758.5453; return q - Math.floor(q); };
export type Pose = {
    x: number;
    y: number;
    z: number;
    rx: number;
    ry: number;
    rz: number;
    visible: boolean;
    dissolve: number;
    r: number;
    impact: number;
    quaternion?: [number, number, number, number];
};
// Kept as an export for the comparison capture scripts.
export { coinPose } from './physics';
