import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

export const rootDir = process.cwd();
export const cardsSourcePath = path.join(rootDir, "client/src/shared/cards.ts");
const cardsEnglishSourcePath = path.join(rootDir, "client/src/shared/cards.en.ts");
const cacheDir = path.join(rootDir, "art/.cache");
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
  const englishSource = await fs.readFile(cardsEnglishSourcePath, "utf8");
  await fs.mkdir(cacheDir, { recursive: true });

  const englishJs = transpileTs(englishSource);
  const cardsJs = transpileTs(source)
    .replaceAll('from "./cards.en"', 'from "./cards.en.mjs"')
    .replaceAll("from './cards.en'", 'from "./cards.en.mjs"');

  const englishOut = path.join(cacheDir, "cards.en.mjs");
  const cardsOut = path.join(cacheDir, "cards.mjs");
  await fs.writeFile(englishOut, englishJs);
  await fs.writeFile(cardsOut, cardsJs);

  const mod = await import(`${pathToFileURL(cardsOut).href}?t=${Date.now()}`);
  const cards = Object.values(mod.DB);
  return includeStarters ? cards.concat(Object.values(mod.STARTERS)) : cards;
}

function transpileTs(source) {
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: false,
    },
  }).outputText;
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
  if (card.id === "LUCKY_CHEST") return "object-only treasure spell icon, ornate lucky treasure chest overflowing with mana crystals, health gems, cards, and one dark mimic shadow inside, empty stone pedestal, no people";
  if (card.id === "GUILD_CHEST") return "object-only treasure spell icon, assassin guild black treasure chest with daggers, coins, mana crystals, secret contracts, dark guild hall table, no people, no hands";
  if (card.id === "GUILD_EYE") return "object-only enchantment icon, glowing guild eye symbol watching over floating information cards and black network threads, empty spy chamber, no people";
  if (card.id === "CATALYST") return "object-only abstract spell icon, cracked rift catalyst crystal bleeding red sparks while a blue mana core grows beside it, empty ritual circle, no people";
  if (card.id === "WORLD_SEED") return "object-only nature spell icon, glowing world tree seed sprouting tiny roots around a mana crystal, ancient soil altar, no people";
  if (card.id === "HOURGLASS") return "object-only abstract spell icon, golden hourglass filled with blue mana sand and two glowing card shards, empty time chamber, no people";
  if (card.id === "LIFE_CYCLE") return "object-only nature spell icon, circular life cycle ring of leaves, green healing light turning into a small mana crystal, empty sanctuary, no people";
  if (card.id === "LIFE_SANCTUM") return "object-only sanctuary spell icon, life sanctum altar with green-gold healing fountain increasing a heart-shaped crystal, empty temple, no people";
  if (card.id === "WORLD_HEART") return "object-only world tree spell icon, enormous glowing heart-shaped core inside tree roots, green-gold life energy, small dim mana crystals around it, no people";
  if (card.id === "MEDITATE") return "object-only healing spell icon, calm floating lotus crystal in a blue meditation circle, soft healing aura, empty quiet shrine, no people";
  if (card.id === "PRAYER") return "object-only holy spell icon, radiant sanctuary prayer seal with white-gold healing beam and heart crystal, empty chapel, no people, no hands";
  if (card.id === "HERMIT") return "object-only rest spell icon, solitary empty hermit hut lantern beside a healing spring and moonlit stones, no people, no creatures";
  if (card.id === "WORLD_BLESS") return "object-only world tree blessing icon, great tree canopy raining mana crystals on two opposing stone altars, green-gold blessing light, no people";
  if (card.id === "GLASS_BAN") return "object-only decree spell icon, cracked glass weapons sealed behind a glowing prohibition sigil, fragile blade shards suspended, empty hall, no people";
  if (card.id === "SHATTER") return "object-only destruction spell icon, violent tremor cracking armor plates and reducing shield stones to dust, shockwave rings, empty battlefield, no people";
  if (card.id === "SCARECROW") return "object-only summoning spell icon, three straw scarecrow effigies rising from a golden field portal, simple wooden crosses and straw, no humans";
  if (card.id === "LEVY") return "object-only summoning spell icon, three soldier helmets and spears emerging from a military banner portal, formation markers, no people or faces";
  if (card.id === "INQUISITION") return "object-only judgment spell icon, burning tribunal seal scanning clan emblems in deck and graveyard card shards, holy fire, no people";
  if (card.id === "CULL_FLOOD") return "object-only purge spell icon, flood of cursed cull dagger cards washing through a graveyard, chosen cards vanishing into black void, no people";
  if (card.id === "PAIN_HARVEST") return "object-only pain harvest enchantment icon, red damage droplets turning into cursed cull cards above a black sickle altar, no people";
  if (card.id === "CULL_FARM") return "object-only cull farm enchantment icon, rows of black dagger-card sprouts growing from dark soil, eerie moonlight, no people";
  if (card.id === "PURGE_ALL") return "object-only mass purge spell icon, many deck and graveyard card shards sucked into a white void vortex, empty ritual floor, no people";
  if (card.id === "EXILE_NUKE1") return "object-only void artillery spell icon, exiled card shards loading into a dark cannon and firing purple energy, no people";
  if (card.id === "EXILE_NUKE2") return "object-only void cataclysm spell icon, massive black-hole blast powered by many exiled card shards, purple cosmic explosion, no people";
  if (card.id === "FURNACE") return "object-only furnace enchantment icon, magical blast furnace burning the lowest-cost card shard into ash every dawn, molten orange light, no people";
  if (card.id === "PURGE_TOUCH") return "object-only purge touch spell icon, one graveyard card shard cleansed by white-blue flame and replaced by a glowing draw card, no hands, no people";
  if (card.id === "SCRAPPER") return "object-only scrap collection spell icon, two small low-cost card scraps compressed into a blue mana crystal by brass gears, no people";
  if (card.id === "WALLBREAK1") return "object-only wall smash spell icon, one weak enemy stone wall creature silhouette shattered by a heavy hammer symbol, no people";
  if (card.id === "WALLBREAK2") return "object-only siege collapse spell icon, multiple weak stone wall effigies crumbling under a huge shockwave, no people";
  if (card.id === "SNIPE1") return "object-only snipe spell icon, single precise silver arrow piercing a fragile shield sigil, empty target range, no people";
  if (card.id === "SNIPE2") return "object-only close-up volley fire spell icon, many spectral arrows piercing fragile shield sigils on an empty stone target wall, tight composition, no battlefield crowd, no people, no humanoid silhouettes";
  if (card.id === "NT_NULL8") return "object-only close-up trap illustration, a massive circular anti-magic seal device floating directly above a blue spell circle on an empty stone floor, blue glyphs being extinguished, tight crop on the seal, plain dark background, no chamber audience, no statues, no robed figures, no people, no hands, no faces";
  if (card.id === "NT_SEAL3") return "a silent sentinel construct with a sealed stone mask, muted blue anti-magic runes, small warding shield, solemn temple corridor, no visible human skin";
  if (card.id === "NT_SEAL5") return "a colossal silent anti-magic golem with locked rune plates, glowing seal core, towering over a muted arcane hall, no people";
  if (card.id === "WORLD_GUARD") return "a massive world tree guardian made of bark, moss, and gold-green life crystals, standing before ancient roots, protective fantasy titan";
  if (card.id === "GOLIATH_HUNT") return "object-only giant-slaying spell icon, enormous cracked shield with 20-like tally marks pierced by a huge hunter spear, empty arena, no people";
  if (card.id === "DOUBLE_EXEC") return "object-only execution spell icon, two dark monster-shaped stone effigies split by crossed crimson judgment blades, no people";
  if (card.id === "MASSACRE") return "object-only massacre spell icon, empty battlefield of shattered monster masks swept by a red-black destruction wave, life crystal cracking nearby, no people";
  if (card.id === "MIMIC_KING2") return "a single possessed treasure chest mimic heir, rectangular ornate chest only, the open lid itself is the mouth with sharp teeth along the wooden edges, crown bolted onto the lid, tiny clawed feet under the box, no creature behind it, no lizard body, no animal head, no torso, no arms, no hands, no hair, no cloak, no people";
  if (card.id === "ORIGIN_MIMIC") return "a single ancient primordial treasure chest mimic, rectangular old wooden chest only, the open lid itself is a huge fanged mouth with glowing eyes carved on the front panel, rootlike clawed feet under the box, trap runes carved into the chest, no creature behind it, no lizard body, no animal head, no torso, no arms, no hands, no people";
  if (card.id === "GREED_PRICE") return "object-only greed spell icon, cursed treasure chest spawning two tiny mimic chests while three mimic card shards vanish into a black void, no people";
  if (card.id === "MARKET_CRISIS") return "object-only market crisis spell icon, ten glowing market card slots tumbling in a chaotic exchange board, coins crashing like a graph, no people";
  if (card.id === "DRAGON_EGG") return "a large dragon egg on a stone altar, cracked obsidian shell with red blue and black light inside, four durability runes, dramatic hatchery chamber";
  if (card.id === "BEAST_EGG") return "a divine beast egg on a sacred moss altar, pearlescent shell with gold-green celestial cracks, protective life aura, ancient shrine";
  if (card.id === "D_BLACK") return "a colossal black dragon with obsidian scales, purple void breath, shadow wings, enemy armor plates corroding below, legendary fantasy dragon";
  if (card.id === "D_RED") return "a colossal red dragon with blazing scales and molten wings, fire breath exploding forward, aggressive legendary fantasy dragon";
  if (card.id === "D_BLUE") return "a colossal blue dragon with sapphire scales and healing life aura, water and sky light swirling, protective legendary fantasy dragon";
  if (card.id === "DIVINE") return "a divine celestial beast with white-gold fur, antlers, wings, and crystal halo, overwhelming sacred aura, ancient temple sky";
  if (card.id === "EGG_HUNTER") return "an egg hunter construct with a hooked spear and egg-cracking tools, rugged leather armor, focused monster hunter silhouette, fantasy hatchery raid";
  if (card.id === "INCUBATOR") return "object-only advanced incubator spell icon, ornate brass hatchery device accelerating a glowing egg with five clock runes, no people";
  if (card.id === "EGG_MASTER") return "a hatchery master artificer in protective robes with floating egg runes and repair tools, guarded eggs behind, fantasy caretaker portrait";
  if (card.id === "BLOOD_JOY") return "object-only blood magic joy icon, crimson droplets blooming into two bright heart crystals and celebratory gold-red spell ribbons, no people, no hands";
  if (card.id === "BLOOD_ANGER") return "object-only blood magic anger icon, red-black rage sigil empowering many weapon emblems with attack sparks, no people, no hands";
  if (card.id === "BLOOD_SORROW") return "object-only blood magic sorrow icon, dark crimson tear drops falling onto a graveyard card shard being exiled into a void, no people, no hands";
  if (card.id === "BLOOD_PLEASURE") return "object-only blood magic pleasure icon, crimson ritual chalice overflowing into a bright mana crystal, elegant red-gold aura, no people, no hands";
  if (card.id === "VAMP_PACT") return "object-only vampire pact spell icon, black-red contract parchment sealed with blood wax and a small vampire bat sigil rising, no people, no hands";
  if (card.id === "BLOOD_FEST") return "object-only blood festival enchantment icon, red ritual altar with many blood magic card shards orbiting and a mana crystal growing, no people";
  if (card.id === "BLOOD_SHIELD") return "object-only vampiric shield enchantment icon, crimson barrier absorbing blood magic droplets around a heart crystal, no people";
  if (card.id === "VAMP_WARD") return "object-only vampire ward enchantment icon, gothic red-black crest protecting several vampire bat emblems behind an indestructible barrier, no people";
  if (card.id === "VAMP1") return "a young apprentice vampire with small cloak, pale face, red eyes, cautious stance, gothic moonlit corridor, elegant fantasy portrait";
  if (card.id === "VAMP2") return "a novice vampire duelist with sharper fangs, red-black coat, confident pose, moonlit castle balcony, fantasy portrait";
  if (card.id === "VAMP3") return "an intermediate vampire noble with crimson aura, ornate dark armor, long cape, commanding gaze, gothic fantasy portrait";
  if (card.id === "VAMP4") return "a high vampire lord with elegant black-red armor, blood aura, regal cape, draining life light, gothic fantasy portrait";
  if (card.id === "VAMP5") return "a supreme vampire monarch with terrifying crimson wings, black royal armor, blood moon halo, overwhelming gothic fantasy boss portrait";
  if (card.id === "FLAME") return "object-only flame spell icon, small red-orange fire burst striking an enemy life crystal while a tiny ember rebounds, no people";
  if (card.id === "GHOST") return "a translucent blue ghost with hollow eyes and tattered spectral cloak, floating through a dim corridor, eerie fantasy spirit";
  if (card.id === "NEGOTIATE") return "object-only negotiation spell icon, two opposing sealed contracts and mana crystals balanced on scales, trap glyphs locked away, no people, no hands";
  if (card.id === "BLOOD_RITE") return "object-only blood rite enchantment icon, red-black ritual circle converting damage sparks into healing green light, no people, no hands";
  if (card.id === "WEAKEN_ALL") return "object-only weakening ritual icon, grey chains and blue debuff sigils lowering many monster attack emblems, empty arena, no people";
  if (card.id === "GUILD_HALL") return "a dark assassin guild hall building with black banners, hidden dagger crest, glowing counter marks above the doorway, no people in foreground";
  if (card.id === "MIMIC_PARTY") return "trap illustration of three separate small rectangular treasure chests on a dungeon floor, each chest lid is open like a fanged mouth with sharp teeth inside, coins flying, no bodies coming out of the chests, no ears, no animals, no rabbits, no heads, no arms, no hands, no humanoids, no humans";
  if (card.id === "FATE_WHEEL") return "object-only fate wheel enchantment icon, ornate wheel of fortune with dice, probability glyphs, red damage crystal and broken mana gem, no people";
  if (card.id === "COUNTERCALC") return "object-only reverse calculation spell icon, glowing abacus and backwards formula runes shattering a permanent magic seal, no people";
  if (card.id === "AMBUSH") return "object-only ambush spell icon, sudden crimson dagger shadow striking a life crystal from darkness, small recoil spark, no people";
  if (card.id === "TRUMPET") return "object-only support trumpet spell icon, golden war trumpet sending two bright attack-buff waves toward crossed weapon emblems, no people";
  if (card.id === "FORESIGHT") return "object-only foresight enchantment icon, crystal orb showing a future mana surge with nine tiny mana marks, no people, no hands";
  if (card.id === "TRICKROOM") return "object-only trick room spell icon, mirrored chamber where attack sword and defense shield symbols swap places, warped gravity, no people";
  if (card.id === "INCUBATOR_S") return "object-only simple incubator spell icon, small brass hatchery lamp warming a glowing egg with two clock runes, no people";
  if (card.id === "TRIBE_PACT") return "object-only tribe pact enchantment icon, many clan emblems linked by doubled golden chains around a central contract stone, no people";
  if (card.id === "INFKNIGHT") return "an infinite knight in impossible looping silver armor, mirrored helm, glowing infinity symbol on the chest, timeless void battlefield, legendary fantasy warrior";
  if (card.id === "MIMIC2") return "a master mimic treasure chest monster with massive teeth, ornate black-gold chest body, multiple clawed legs, guarding piles of coins, terrifying dungeon ambush";
  if (card.id === "MANA_GIANT") return "a towering mana crystal giant made of translucent blue crystals and stone, glowing mana core in chest, ancient cavern, powerful fantasy monster";
  if (card.id === "MIMIC_LORD") return "a mimic lord treasure chest monster with a crown of gold teeth, many smaller mimic chests around it, dark dungeon throne, terrifying fantasy monster";
  if (card.id === "AWAKENED_MIMIC") return "only a living wooden treasure chest mimic, the chest is the entire body, the open lid is a wide monster mouth, sharp teeth visibly lining the inside edges of the lid and box, glowing eyes on the front panel, small tongue, four short clawed wooden legs attached to the chest corners, blue-gold arcane energy bursting from inside, two tiny treasure chest mimics beside it, no separate monster outside the chest, no animal head, no humanoid torso, no arms, no hands, no hair, no cloak, no humans";
  if (card.id === "MIMIC_KING") return "only a gigantic royal treasure chest mimic, the ornate black-gold chest is the entire body, the open lid is a huge fanged mouth, jeweled crown resting directly on the chest lid, many short clawed wooden legs attached to the chest base, coins and exiled card shards swirling around a dungeon throne, no separate monster outside the chest, no animal head, no humanoid torso, no arms, no hands, no hair, no cloak, no humans";
  if (card.id === "VITAL2") return "a vitality devotee in green-gold robes holding a glowing heart crystal, gentle temple light, fantasy healer acolyte";
  if (card.id === "VITAL3") return "a vitality priest with radiant staff and heart-shaped life aura, sacred garden sanctuary, fantasy healer portrait";
  if (card.id === "VITAL4") return "a full-blooded warrior glowing with vigorous red life energy, strong armor, confident heroic fantasy fighter";
  if (card.id === "CULL_TITAN") return "a colossal avatar of culls made of black dagger cards and void chains, towering over a dark battlefield, terrifying fantasy titan";
  if (card.id === "TOKEN00") return "a simple straw scarecrow token with button eyes and tattered cloth, moonlit field, harmless wooden dummy";
  if (card.id === "SOLDIER2") return "a basic soldier token with plain steel helmet, spear, and round shield, simple disciplined fantasy infantry";
  if (card.id === "HORDE") return "a horde standard-bearer carrying a huge war banner, many blurred soldiers behind, rugged fantasy army leader";
  if (card.id === "ELITE") return "an elite knight-captain in polished armor with blue cape and commanding sword, disciplined fantasy commander";
  if (card.id === "TRAPSMITH") return "a trapsmith engineer with goggles, tools, and small mechanical traps on a workbench, fantasy artificer portrait";
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
