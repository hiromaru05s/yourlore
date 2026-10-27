// Original-resolution, pixel-identical lossless masters for the deck editor.
export const deckMasterArt:Record<string,string>={
  "STARTER_MANA": "/art/deck-masters-v1/STARTER_MANA.webp",
  "RUST_SHROOM": "/art/deck-masters-v1/RUST_SHROOM.webp",
  "CASTLE": "/art/deck-masters-v1/CASTLE.webp",
  "GHOST": "/art/deck-masters-v1/GHOST.webp",
  "GUILD_HALL": "/art/deck-masters-v1/GUILD_HALL.webp",
  "STARTER_TRASH": "/art/deck-masters-v1/STARTER_TRASH.webp",
  "STARTER_CHEST": "/art/deck-masters-v1/STARTER_CHEST.webp",
  "FLAME": "/art/deck-masters-v1/FLAME.webp",
  "BLOOD_RITE": "/art/deck-masters-v1/BLOOD_RITE.webp",
  "WEAKEN_ALL": "/art/deck-masters-v1/WEAKEN_ALL.webp",
  "FATE_WHEEL": "/art/deck-masters-v1/FATE_WHEEL.webp",
  "COUNTERCALC": "/art/deck-masters-v1/COUNTERCALC.webp",
  "AMBUSH": "/art/deck-masters-v1/AMBUSH.webp",
  "TRUMPET": "/art/deck-masters-v1/TRUMPET.webp",
  "FORESIGHT": "/art/deck-masters-v1/FORESIGHT.webp",
  "TRICKROOM": "/art/deck-masters-v1/TRICKROOM.webp",
  "INCUBATOR_S": "/art/deck-masters-v1/INCUBATOR_S.webp",
  "TRIBE_PACT": "/art/deck-masters-v1/TRIBE_PACT.webp",
  "CHOSEN_AREA": "/art/deck-masters-v1/CHOSEN_AREA.webp",
  "TRIAL_AREA": "/art/deck-masters-v1/TRIAL_AREA.webp",
  "ANCIENT_CIV": "/art/deck-masters-v1/ANCIENT_CIV.webp",
  "GAMBLER": "/art/deck-masters-v1/GAMBLER.webp",
  "ELF_HAVEN": "/art/deck-masters-v1/ELF_HAVEN.webp",
  "HALF_ELF": "/art/deck-masters-v1/HALF_ELF.webp",
  "GUILD_CO": "/art/deck-masters-v1/GUILD_CO.webp",
  "SLUM": "/art/deck-masters-v1/SLUM.webp",
  "GRAPE": "/art/deck-masters-v1/GRAPE.webp",
  "BREWING": "/art/deck-masters-v1/BREWING.webp",
  "DUNGEON_FLOOR": "/art/deck-masters-v1/DUNGEON_FLOOR.webp",
  "CASINO": "/art/deck-masters-v1/CASINO.webp",
  "REFRESH_HAND": "/art/deck-masters-v1/REFRESH_HAND.webp",
  "FOCUS": "/art/deck-masters-v1/FOCUS.webp",
  "ACID_RAIN": "/art/deck-masters-v1/ACID_RAIN.webp",
  "RIFT": "/art/deck-masters-v1/RIFT.webp"
};

// Deck faces are at most 120 CSS px (plus a small hover lift). 512px retains
// ample density for those faces; inspection continues to use full artwork.
export const deckDisplayArt:Record<string,string>=Object.fromEntries(Object.keys(deckMasterArt).map(id=>[id,`/art/deck-display-v1/${id}.webp`]));
