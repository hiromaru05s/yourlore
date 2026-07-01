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
  const composition = card.t === "spell"
    ? "Vertical portrait composition, centered magical object or abstract spell effect only, no living beings, no people, no humanoid silhouettes, no faces, no hands."
    : "Vertical portrait composition, centered readable silhouette, dramatic lighting.";
  return [
    "High-quality fantasy trading card inner artwork only.",
    "No card border, no frame, no UI, no text, no logo, no watermark.",
    composition,
    "Painterly game art with crisp focal subject, rich color contrast, detailed background.",
    `Subject: ${subject}, a ${type}. Cost tier ${card.cost}.${stats}${effect}`,
    "Fit the art inside a small TCG illustration window; avoid tiny unreadable details.",
  ].join(" ");
}

function subjectHint(card) {
  if (card.id === "MIMIC") return "a classic treasure chest mimic monster, open wooden chest with sharp teeth, long tongue, clawed legs, gold coins spilling out, mischievous dungeon ambush";
  if (card.id === "SX2") return "object-only abstract spell icon, one green trap sigil made of stone and chains cracking apart under a precise arcane beam, empty dungeon floor, no creatures";
  if (card.id === "SX4") return "object-only abstract spell icon, two ornate golden padlocks and trap seals breaking open in midair, blue-gold runes and fragments, empty magical chamber";
  if (card.id === "SX6") return "object-only abstract spell icon, many trap glyphs and ward stones collapsing into a bright shockwave, shattered runic tiles, one glowing card-shaped shard rising, empty battlefield";
  if (card.id === "E1") return "object-only abstract spell icon, a glowing royal edict tablet sealing a monster summoning gate, empty stone hall, small claw marks behind a barrier, no figures";
  if (card.id === "E2") return "object-only abstract spell icon, crossed swords dissolving into warm light before a calm protective barrier, treaty seal emblem, empty battlefield, no creatures";
  if (card.id === "E3") return "no human, no character, a luminous fountain of knowledge made of floating books, blue water, and glowing cards rising from ancient stone";
  if (card.id === "ND2") return "object-only abstract spell icon, two glowing rune cards orbiting above an open stone tablet, blue divination light, empty library altar";
  if (card.id === "ND3") return "object-only abstract spell icon, three prophetic cards rising from a crystal orb, starlight runes, empty sage observatory";
  if (card.id === "ND5") return "object-only abstract spell icon, five ancient knowledge cards bursting from a golden archive seal, floating books and runes, empty temple vault";
  if (card.id === "AHEUK") return "object-only abstract spell icon, black attunement ritual, dark mana crystal draining a cracked blue mana core, violet smoke, empty ritual circle";
  if (card.id === "AJIN") return "object-only abstract spell icon, pure attunement crystal splitting into a bright mana sigil and a ghostly graveyard card shard, empty altar";
  if (card.id === "AMA") return "object-only abstract spell icon, small treasure chest dissolving into blue mana particles and one glowing card, empty stone table";
  if (card.id === "NHEAL") return "object-only abstract spell icon, radiant life blessing aura, green-gold healing seal with small sprouting leaves and heartlike light, empty sanctuary";
  if (card.id === "NWIPE") return "object-only abstract spell icon, cleansing explosion of white-gold light destroying trap sigils and spell glyphs, empty battlefield, cracked ground";
  if (card.id === "RUNE1") return "object-only abstract spell icon, beginner rune lesson carved into a stone tablet, small rune blade destroying a giant monster-shaped shadow, empty study chamber, no people";
  if (card.id === "RUNE2") return "object-only abstract spell icon, intermediate rune scholarship, two mana crystals rising from a discarded beginner rune tablet, blue academic glyphs, empty desk, no people";
  if (card.id === "RUNE3") return "object-only abstract spell icon, advanced rune scholarship, three ancient rune tablets merging into a huge mana sigil, cosmic library light, no people";
  if (card.id === "GENESIS_SONG") return "object-only abstract spell icon, primordial song waves summoning a genesis creature silhouette from deck and graveyard card shards, green-gold sound rings, no people";
  if (card.id === "GENESIS_MAGIC") return "object-only abstract spell icon, primordial magic empowering multiple genesis monster sigils with +4/+4-like glowing runes, ancient life circle, no people";
  if (card.id === "KIN_CALL") return "object-only abstract spell icon, tribal call horn and clan emblems glowing above a market pedestal, cost tokens melting down, no people";
  if (card.id === "MULTI_CULTURE") return "object-only abstract spell icon, many clan banners and elemental masks orbiting a mana crystal, diverse culture magic, no people";
  if (card.id === "SLAY_ART") return "object-only abstract spell icon, lethal art sigil, crimson damage sparks multiplying from a cracked target emblem, dark dojo floor, no people";
  if (card.id === "BLOOD1") return "object-only abstract spell icon, blood magic level one, red droplets feeding three glowing card shards, black ritual bowl, no people, no hands";
  if (card.id === "BLOOD2") return "object-only abstract spell icon, stronger blood magic, crimson stream splitting into six glowing card shards, cracked ritual circle, no people, no hands";
  if (card.id === "BLOOD3") return "object-only abstract spell icon, forbidden blood magic explosion, red-black heart sigil striking enemy life crystal and one card shard, no people";
  if (card.id === "DISARM1") return "object-only abstract spell icon, dismantling one permanent magic device, gears and enchantment seal breaking apart, empty workshop, no people";
  if (card.id === "DISARM2") return "object-only abstract spell icon, analyzing and disarming two permanent magic devices, blue inspection lens, broken runic mechanisms, no people";
  if (card.id === "DISARM3") return "object-only abstract spell icon, magical research institute device, one permanent spell relic sealed in a glass archive and erased from reality, no people";
  if (card.id === "FORBIDDEN") return "object-only abstract spell icon, forbidden ritual dice with dark life and mana crystals cracking, clan monster sigils emerging from a red portal, no people, no hands";
  if (card.id === "INFKNIGHT") return "an infinite knight in impossible looping silver armor, mirrored helm, glowing infinity symbol on the chest, timeless void battlefield, legendary fantasy warrior";
  if (card.id === "CREATOR") return "a majestic creator god forming creatures from starlight and card shards, vast cosmic throne, divine fantasy deity";
  if (card.id === "ASSASSIN1") return "a novice assassin in dark hood with small dagger, rooftop shadows, stealthy fantasy rogue portrait";
  if (card.id === "ASSASSIN2") return "an intermediate assassin with twin daggers and smoke cloak, moonlit alley, silent fantasy killer portrait";
  if (card.id === "ASSASSIN3") return "an elite assassin commander in black armor, crimson scarf, hidden blades, ominous night fortress";
  if (card.id === "ASSASSIN4") return "a special night lord assassin, master of shadows with twin spectral blades, royal dark armor, two-strike motion blur";
  if (card.id === "NT_NULL3") return "object-only trap illustration, anti-magic ward absorbing a blue spell bolt, cracked black mirror seal, red recoil sparks, empty dungeon chamber, no people";
  if (card.id === "NT_NULL5") return "object-only trap illustration, ornate magic-sealing lock closing over a glowing spell circle, blue runes being silenced, empty arcane hall, no people";
  if (card.id === "NT_NULL6") return "object-only trap illustration, close-up anti-sorcery crystal barrier orb on an empty stone pedestal, purple lightning reflected into shattered spell glyphs, tight composition, no landscape, no people, no silhouettes, no creatures";
  if (card.id === "HANDRESET") return "object-only abstract spell icon, four glowing card-shaped light shards spiraling through a blue-orange reset portal, empty stone table, no physical hands, no arms, no people, no fingers, no readable playing card suits";
  if (card.id === "TIMEWARP") return "object-only abstract spell icon, warped clock rings and fractured hourglass inside a cosmic portal, stars bending, no people, no creatures";
  if (card.id === "INFERNO") return "object-only abstract spell icon, eternal hellfire sigil burning on cracked black stone, red-orange flames, demonic heat haze, no people, no creatures";
  if (card.id === "GAMBLE") return "object-only abstract spell icon, glowing six-sided die rolling across a magical casino-like rune circle, split red and blue fate lights, no people, no hands";
  if (card.id === "DICE8") return "object-only abstract spell icon, cursed eight-point demon die made of black obsidian, purple flames, chaotic reward and punishment glyphs, no people, no hands";
  if (card.id === "NMD2") return "a small book-seeking spirit made of blue light and parchment, floating beside ancient tomes, curious magical creature";
  if (card.id === "NMD4") return "a mystical record keeper construct with scrolls and ink ribbons, robed archivist spirit, ancient library background";
  if (card.id === "NMD6") return "a grand archsage spirit with floating books and luminous runes, wise powerful fantasy mage portrait";
  if (card.id === "NGA3") return "a fragile glass cannon creature, crystal artillery beast glowing with unstable energy, high attack low defense fantasy monster";
  if (card.id === "NGA4") return "a berserk sword demon with blazing blade, aggressive stance, zero defense glass-cannon fantasy warrior";
  if (card.id === "NWL3") return "a massive rock turtle with mossy stone shell, defensive guardian creature, low attack high defense fantasy art";
  if (card.id === "NWL4") return "an iron wall gatekeeper golem, towering shield body, immovable defensive guardian, fortress background";
  if (card.id === "NHEX") return "a mischievous little shaman casting a hex flame, small mask, bones and purple sparks, dark cute fantasy portrait";
  if (card.id === "NSPR") return "a crystalline spirit floating above a mana pool, translucent blue body, orbiting cards and mana runes, elegant fantasy creature";
  if (card.id === "TSO2") return "a lone silver-gray wolf under moonlight, isolated on a cliff, vigilant fantasy creature portrait";
  if (card.id === "TSO3") return "a solitary hunter with wolf-fur cloak and moonlit bow, alone on a dark ridge, lonely fantasy ranger portrait";
  if (card.id === "TSO5") return "a solitary hooded wanderer with a wolf companion, windswept road, lonely heroic fantasy mood";
  if (card.id === "TSO7") return "a majestic lone warlord with wolf motifs, standing alone on a snowy throne cliff, sovereign and isolated";
  if (card.id === "TNO2") return "a noble young knight in polished armor, bright heraldic light, heroic fantasy portrait";
  if (card.id === "TNO3") return "a noble squire carrying a small heraldic shield and polished training sword, hopeful courtly fantasy portrait";
  if (card.id === "TNO5") return "a noble paladin in radiant armor with a sacred shield, cathedral light, dignified fantasy illustration";
  if (card.id === "TNO7") return "a grand noble duke knight in ornate gold armor, commanding presence, royal fantasy portrait";
  if (card.id === "TPO2") return "a hungry feral beast with glowing eyes and sharp claws, dark forest ambush, predatory fantasy creature";
  if (card.id === "TPO3") return "a hungry predator tracker sprinting through dark grass, lean monster with sharp claws and glowing eyes, fantasy chase scene";
  if (card.id === "TPO5") return "an apex predator beast stalking through mist, muscular silhouette, sharp teeth and claws, fantasy monster art";
  if (card.id === "TPO7") return "a colossal predator lord beast crowned with bone horns, ruling over a dark hunting ground";
  if (card.id === "TAR2") return "a fallen aristocrat in tattered noble clothes, pale haunted face, ruined manor background, dark fantasy portrait";
  if (card.id === "TAR3") return "a fallen knight in tarnished aristocratic armor, cracked noble crest, kneeling in a ruined manor courtyard, dark fantasy portrait";
  if (card.id === "TAR5") return "a powerful aristocratic lord in dark velvet and silver armor, decadent gothic hall, commanding fantasy portrait";
  if (card.id === "TAR7") return "a regal aristocrat king on a shadowed throne, ornate crown, crimson cape, dark noble fantasy illustration";
  if (card.id === "TGE1") return "a primordial egg glowing with ancient green-gold light, tiny cracks, roots and stars around it, fantasy origin relic";
  if (card.id === "TGE2") return "a primordial ember creature, small living flame born from ancient ash, warm orange core, origin fantasy spirit";
  if (card.id === "TGE3") return "a primordial sprout creature breaking through stone, green life energy, ancient runes, origin fantasy plant spirit";
  if (card.id === "TGE4") return "a primordial elemental spirit made of fire, water, earth, and wind swirling together, ancient origin magic";
  if (card.id === "TGE5") return "a primordial guardian with bark, stone, and glowing roots, protective ancient forest sentinel";
  if (card.id === "TGE6") return "a colossal primordial giant of stone and vines, glowing life core, ancient world-shaping fantasy titan";
  if (card.id === "TGE7") return "a primordial lord crowned with branches and stars, ancient sovereign of life and elements, majestic fantasy ruler";
  if (card.id === "STARTER_TRASH") return "a cursed culling dagger cutting through black smoke and broken card fragments";
  if (card.id === "STARTER_CHEST") return "an ornate glowing treasure chest overflowing with gold coins and magical light";
  if (card.id === "STARTER_MANA") return "a floating blue mana crystal altar with circular runes and rising energy";
  return card.name;
}

export async function ensureDirs() {
  await fs.mkdir(path.dirname(promptOutputPath), { recursive: true });
  await fs.mkdir(artDir, { recursive: true });
}
