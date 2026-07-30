// ============================================================
// LORE — 3D dice roll animation (CSS 3D, no deps).
// Driven by the engine's { type: "dice" } events: dice tumble in,
// bounce, settle on the rolled faces, then flash the verdict
// (need-threshold rolls) or the total (table rolls).
// Click anywhere on the overlay to skip.
// ============================================================
import { t, getLang } from "../i18n";
import { sfx } from "./sound";

export interface DiceOpts {
  need?: number; // min total for success (undefined = outcome-table roll)
  success?: boolean;
  mine: boolean;
}

// cube orientation that brings face N to the front
const FACE_ROT: Record<number, [number, number]> = {
  1: [0, 0],
  2: [-90, 0],
  3: [0, -90],
  4: [0, 90],
  5: [90, 0],
  6: [0, 180],
};

// pip layout per face (3x3 grid cells, 1-indexed)
const PIPS: Record<number, number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

function faceEl(n: number, cls: string): HTMLElement {
  const f = document.createElement("div");
  f.className = `d3-face ${cls}`;
  for (const cell of PIPS[n]) {
    const p = document.createElement("i");
    p.className = "d3-pip";
    p.style.gridArea = `${Math.ceil(cell / 3)} / ${((cell - 1) % 3) + 1}`;
    f.appendChild(p);
  }
  return f;
}

function cubeEl(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "d3-wrap";
  const cube = document.createElement("div");
  cube.className = "d3-cube";
  cube.appendChild(faceEl(1, "front"));
  cube.appendChild(faceEl(6, "back"));
  cube.appendChild(faceEl(3, "right"));
  cube.appendChild(faceEl(4, "left"));
  cube.appendChild(faceEl(2, "top"));
  cube.appendChild(faceEl(5, "bottom"));
  wrap.appendChild(cube);
  return wrap;
}

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Play the dice roll. Resolves when the overlay is gone. */
export async function diceRollAnim(rolls: number[], opts: DiceOpts): Promise<void> {
  if (!rolls.length) return;
  const ov = document.createElement("div");
  ov.className = "d3-overlay" + (opts.mine ? "" : " opp");
  let skipped = false;
  const skip = new Promise<void>((r) => (ov.onclick = () => { skipped = true; r(); }));

  const tray = document.createElement("div");
  tray.className = "d3-tray";
  if (!opts.mine) {
    const who = document.createElement("div");
    who.className = "d3-who";
    who.textContent = t("fx.opp");
    tray.appendChild(who);
  }
  const row = document.createElement("div");
  row.className = "d3-row";
  tray.appendChild(row);

  // need-threshold caption ("7+") shown during the roll — outcome unknown until they settle
  const cap = document.createElement("div");
  cap.className = "d3-cap";
  if (opts.need != null) cap.textContent = `🎲 ${opts.need}+`;
  tray.appendChild(cap);

  const cubes: HTMLElement[] = [];
  for (let i = 0; i < rolls.length; i++) {
    const c = cubeEl();
    cubes.push(c);
    row.appendChild(c);
  }
  ov.appendChild(tray);
  document.body.appendChild(ov);
  sfx("play");

  // tumble each die to its rolled face
  const anims: Animation[] = [];
  cubes.forEach((c, i) => {
    const [fx, fy] = FACE_ROT[rolls[i]];
    const cube = c.firstElementChild as HTMLElement;
    const sx = 540 + Math.floor(((i * 47) % 3)) * 360; // deterministic extra spins per die
    const sy = 720 + Math.floor(((i * 31) % 2)) * 360;
    const endX = fx + sx - (sx % 360) + 0; // land exactly on face rotation after whole turns
    const endY = fy + sy - (sy % 360);
    cube.style.transform = `rotateX(${endX}deg) rotateY(${endY}deg)`;
    anims.push(cube.animate(
      [
        { transform: `translateY(-46vh) rotateX(${endX - sx}deg) rotateY(${endY - sy}deg) rotateZ(${i % 2 ? -200 : 160}deg)` },
        { transform: `translateY(0) rotateX(${endX - 90}deg) rotateY(${endY - 45}deg) rotateZ(0deg)`, offset: 0.62 },
        { transform: `translateY(-9vh) rotateX(${endX - 25}deg) rotateY(${endY - 10}deg)`, offset: 0.8 },
        { transform: `translateY(0) rotateX(${endX}deg) rotateY(${endY}deg)` },
      ],
      { duration: 1150 + i * 120, easing: "cubic-bezier(.24,.7,.3,1)", fill: "forwards" },
    ));
  });

  await Promise.race([Promise.all(anims.map((a) => a.finished.catch(() => undefined))), skip]);
  if (!skipped) sfx("pop");

  // verdict / total
  const lang = getLang();
  if (opts.need != null) {
    const ok = !!opts.success;
    ov.classList.add(ok ? "win" : "fail");
    const sum = rolls.reduce((a, b) => a + b, 0);
    const word = ok ? (lang === "ja" ? "成功!" : lang === "en" ? "Success!" : "성공!") : lang === "ja" ? "失敗…" : lang === "en" ? "Fail…" : "실패…";
    cap.innerHTML = `<b>${rolls.length > 1 ? `${rolls.join("+")}=${sum} ` : ""}</b><span class="d3-verdict">${opts.need}+ ${word}</span>`;
    if (ok) sfx("mana");
  } else if (rolls.length > 1) {
    const sum = rolls.reduce((a, b) => a + b, 0);
    cap.innerHTML = `<b>${rolls.join("+")} = ${sum}</b>`;
  }

  if (!skipped) await Promise.race([wait(820), skip]);
  ov.classList.add("out");
  await wait(240);
  ov.remove();
}
