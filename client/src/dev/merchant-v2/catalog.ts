export const ids = ['MERCH1', 'MERCH2', 'DARK_MERCHANT'] as const;
export type Merchant = typeof ids[number];
export const names = ['見習い商人', '王都の商売人', '闇商人'];
export const normalDesigns = [
    { name: '両脇の釣銭', note: '着地で左右へ弾ける。縁で一度跳ね、倒れ込んで細かく消える。' },
    { name: '扇の払い出し', note: '奥から手前へ扇状に払い出す。高低をずらし、連続した金属音を残す。' },
    { name: '片跳ねの勘定', note: '左右から低く飛び出し、盤面を二度刻む。跳ねるたび回転が落ち着く。' },
    { name: '縁回りの余韻', note: '斜めに弾け、側面で短く転がる。最後の首振りが止まる前に縁から消える。' },
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
};
/** Z is height normal to the tabletop; each authored path has an explicit impact time. */
export function coinPose(v: number, i: number, n: number, ms: number): Pose {
    const s = i % 2 ? 1 : -1, layer = Math.floor(i / 2), start = hit + (v === 1 ? i * 42 : v === 2 ? layer * 30 : 0), t = (ms - start) / 1000, r = .102;
    const flight = v === 1 ? .70 + layer * .075 : v === 2 ? .34 + layer * .035 : .53 + layer * .04;
    const phase = clamp(t / flight), g = 7.8, vz = g * flight / 2;
    let x = s * (.27 + layer * .08), y = .20 + layer * .09, z = .04 + Math.max(0, vz * t - .5 * g * t * t), rx = t * 12 + s, ry = t * (v === 1 ? 9 : 5) + layer, rz = s * t * 5;
    if (v === 0) {
        x += s * .35 * phase;
        y += (layer - 1) * .11 * phase;
    }
    if (v === 1) {
        const angle = -.95 + i / (n - 1) * 1.9;
        x = Math.sin(angle) * (.22 + .48 * phase);
        y = -.25 + phase * .95;
    }
    if (v === 2) {
        x = s * (.24 + .38 * phase);
        y = .32 + layer * .08 + phase * .18;
    }
    if (v === 3) {
        x = s * (.32 + .33 * phase);
        y = -.32 + layer * .23 + phase * .68;
    }
    if (t > flight) {
        const b = t - flight, second = v === 2 ? .40 : .28;
        z = .024 + Math.max(0, 6 * second * b - .5 * 12 * b * b);
        if (v === 2 && b > second) {
            const bb = b - second;
            z = .018 + Math.max(0, .8 * bb - .5 * 15 * bb * bb);
        }
        if (v === 3) {
            x += s * .17 * (1 - Math.exp(-b * 4));
            y += .12 * (1 - Math.exp(-b * 4));
            rx = Math.PI / 2 - .20 * (1 - Math.exp(-b * 3));
            ry = Math.sin(b * 23) * .24 * Math.exp(-b * 2);
            rz = t * 11;
        }
        else {
            rx = rx * (1 - ease(0, .46, b));
            ry = ry * (1 - ease(0, .46, b));
        }
    }
    return { x, y, z, rx, ry, rz, visible: t >= 0 && t < 1.85, dissolve: ease(1.15, 1.8, t), r, impact: start + flight * 1000 };
}
