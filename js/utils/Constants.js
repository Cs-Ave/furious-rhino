export const Constants = {
  // Game dimensions & scale
  GAME_WIDTH: 1280,
  GAME_HEIGHT: 720,
  PIXELS_PER_METER: 40,

  // Rhino physics
  RUN_SPEED: 300,
  JUMP_MIN_V: -540,
  JUMP_MAX_V: -880,
  JUMP_CHARGE_MS: 2000,
  FALL_EXTRA_GRAVITY: 700,
  DASH_SPEED: 750,
  DASH_ACTIVE_MS: 200,
  DASH_COOLDOWN_MS: 1000,

  // Difficulty & distance
  WIN_DISTANCE_PX: 16000,
  FURY_FULL_DISTANCE_PX: 14000,
  SPAWN_LOOKAHEAD_PX: 600,
  RECYCLE_MARGIN_PX: 200,
  MIN_SAFE_GAP: 650,
  INITIAL_GAP: 900,

  // Gravity
  GRAVITY: 1400,

  // Wall crack heights (fraction of wall height, top-down).
  // Ground top sits at y=620; tuned to jump reach:
  // ground = no jump, mid = 1 jump, high = double jump.
  CRACK_HEIGHTS: {
    GROUND: 0.78,
    MID: 0.55,
    HIGH: 0.25
  },
  CRACK_BAND_HALF: 60,

  // Colors
  COLORS: {
    rhinoGray: 0x8b8b8b,
    rhinoGrayDark: 0x505050,
    redFury: 0xff4444,
    wallOrange: 0xff9944,
    wallOrangeDark: 0xe8863a,
    wallMortar: 0xb9682a,
    wallCrack: 0xaa6633,
    wallCrackLine: 0x5e3618,
    steelLight: 0xcfd4da,
    steelDark: 0x8d939c,
    steelBase: 0x55585e,
    skyTop: 0x7ec8f0,
    skyBottom: 0xd6edf9,
    grassGreen: 0x6aae3a,
    grassDark: 0x4e8c2a,
    dirtBrown: 0x9b7043,
    dirtDark: 0x7d5834,
    dirtLight: 0xb08454,
    silhouetteFar: 0x8fb8a8,
    silhouetteNear: 0x5e9857,
    fenceBrown: 0x7a5230,
  },

  // Rhino sprite canvas (art is 96x64; body trimmed via setSize/setOffset)
  RHINO_W: 96,
  RHINO_H: 64,
  SNOUT_OFFSET_X: 42,
  SNOUT_OFFSET_Y: -20,

  // All animals rendered at 1.5x (Arcade scales bodies with the sprite,
  // so ANIMAL_SPECS stay in texture pixels)
  ANIMAL_SCALE: 1.5,

  // Per-species animal canvas + physics body (offsets in texture pixels)
  ANIMAL_SPECS: {
    lion:    { w: 70, h: 56, bodyW: 58, bodyH: 44, offX: 6,  offY: 10 },
    zebra:   { w: 76, h: 50, bodyW: 64, bodyH: 38, offX: 6,  offY: 10 },
    monkey:  { w: 48, h: 56, bodyW: 36, bodyH: 46, offX: 6,  offY: 8  },
    giraffe: { w: 60, h: 90, bodyW: 38, bodyH: 82, offX: 11, offY: 6  },
    bird:    { w: 44, h: 32, bodyW: 32, bodyH: 22, offX: 6,  offY: 6  },
  },

  // HUD
  HUD_MARGIN: 20,
  FURY_BAR_WIDTH: 200,
  FURY_BAR_HEIGHT: 12,
  DASH_ICON_SIZE: 60,

  // Object pool sizes
  POOL_SIZES: {
    crackedWalls: 8,
    spikes: 6,
    animals: 6,
  },

  // Roleta de spawn (frações cumulativas; sobra vira animal)
  SPAWN_WEIGHTS: {
    wall: 0.55,
    spike: 0.15,
    animal: 0.3,
  },

  // Animal types
  ANIMAL_TYPES: ['lion', 'zebra', 'monkey', 'giraffe', 'bird'],

  // Comportamento por espécie: todos avançam contra o rino (velocidade para
  // a esquerda, em px/s). jumpV negativo = impulso do pulo; airTexture = pose
  // congelada no ar. Sub-objetos mutáveis lidos por frame em Animal.preUpdate
  // — o TuningPanel liga sliders direto aqui (efeito ao vivo).
  ANIMAL_BEHAVIOR: {
    lion:    { speed: 160, anim: 'lion-run' },
    giraffe: { speed: 130, anim: 'giraffe-run' },
    monkey:  { speed: 120, jumpV: -380, jumpIntervalMs: 250, airTexture: 'animal-monkey-air' },
    zebra:   { speed: 110, jumpV: -760, jumpIntervalMs: 450, airTexture: 'animal-zebra-air' },
    bird:    { speed: 180, anim: 'bird-flap', bobVy: 60 },
  },

  // Animais andam contra o fluxo: o vão ANTES deles encolhe até o encontro
  // (~gap × vAnimal/(vRino+vAnimal)) — espaço extra no spawn compensa
  ANIMAL_EXTRA_LEAD_PX: 350,
};
