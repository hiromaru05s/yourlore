import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

export const rootDir = process.cwd();
export const cardsSourcePath = path.join(rootDir, "client/src/shared/cards.ts");
export const promptOutputPath = path.join(rootDir, "art/prompts/card-art-prompts.jsonl");
export const artDir = path.join(rootDir, "client/public/art/cards");

const typeLabels = {
  mon: "monster creature",
  spell: "magic spell phenomenon",
  trap: "trap or defensive relic",
  starter: "starter utility item",
};

export async function loadCards({ includeStarters = false } = {}) {
  const source = await fs.readFile(cardsSourcePath, "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: false,
    },
  }).outputText;
  const dataUrl = `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`;
  const mod = await import(dataUrl);
  const cards = Object.values(mod.DB);
  return includeStarters ? cards.concat(Object.values(mod.STARTERS)) : cards;
}

export function cardArtPath(card) {
  return path.join(artDir, `${card.id}.webp`);
}

export function cardArtPrompt(card) {
  const type = typeLabels[card.t] ?? "fantasy trading card subject";
  const subject = subjectHint(card);
  const stats = card.t === "mon" ? ` Attack ${card.atk}, defense ${card.def}.` : "";
  const effect = card.text && card.text !== "-" && card.text !== "—" ? ` Effect concept: ${card.text}.` : "";
  return [
    "High-quality fantasy trading card inner artwork only.",
    "No card border, no frame, no UI, no text, no logo, no watermark.",
    "Vertical portrait composition, centered readable silhouette, dramatic lighting.",
    "Painterly game art with crisp focal subject, rich color contrast, detailed background.",
    `Subject: ${subject}, a ${type}. Cost tier ${card.cost}.${stats}${effect}`,
    "Fit the art inside a small TCG illustration window; avoid tiny unreadable details.",
  ].join(" ");
}

function subjectHint(card) {
  if (card.id === "STARTER_TRASH") return "a cursed culling dagger cutting through black smoke and broken card fragments";
  if (card.id === "STARTER_CHEST") return "an ornate glowing treasure chest overflowing with gold coins and magical light";
  if (card.id === "STARTER_MANA") return "a floating blue mana crystal altar with circular runes and rising energy";
  return card.name;
}

export async function ensureDirs() {
  await fs.mkdir(path.dirname(promptOutputPath), { recursive: true });
  await fs.mkdir(artDir, { recursive: true });
}
