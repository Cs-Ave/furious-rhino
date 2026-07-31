export const Constants = {
  // Fonte única da versão para a telemetria (manter igual ao #game-version
  // do index.html e ao package.json a cada release)
  VERSION: '1.3.1',

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
  WIN_DISTANCE_PX: 32000,
  FURY_FULL_DISTANCE_PX: 28000,
  SPAWN_LOOKAHEAD_PX: 600,
  RECYCLE_MARGIN_PX: 200,
  // Piso absoluto de vão = ciclo do dash (1,2s) × velocidade máxima (450 px/s)
  MIN_SAFE_GAP: 540,

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
    towers: 4,
    darts: 12,
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

  // 4 tiers de dificuldade, um a cada 200m (8000px de mundo). Objetos
  // mutáveis lidos a cada spawn/frame — o TuningPanel liga sliders direto
  // aqui. wallW/spikeW/towerW: frações da roleta de spawn (sobra = animal).
  // animalLeadPx: animais andam contra o fluxo, o vão antes deles encolhe
  // até o encontro — espaço extra no spawn compensa.
  DIFFICULTY_TIERS: [
    { gapMin: 900, gapRand: 150, animalSpeedMult: 1.0,  animalLeadPx: 350, wallW: 0.55, spikeW: 0.20, towerW: 0,    comboChance: 0,    towerIntervalMs: 1200, dartSpeed: 460 },
    { gapMin: 760, gapRand: 140, animalSpeedMult: 1.15, animalLeadPx: 400, wallW: 0.45, spikeW: 0.15, towerW: 0.10, comboChance: 0.15, towerIntervalMs: 1000, dartSpeed: 460 },
    { gapMin: 640, gapRand: 120, animalSpeedMult: 1.35, animalLeadPx: 450, wallW: 0.36, spikeW: 0.14, towerW: 0.15, comboChance: 0.25, towerIntervalMs: 800,  dartSpeed: 540 },
    { gapMin: 560, gapRand: 100, animalSpeedMult: 1.6,  animalLeadPx: 500, wallW: 0.30, spikeW: 0.12, towerW: 0.18, comboChance: 0.35, towerIntervalMs: 650,  dartSpeed: 620 },
  ],

  // 1º disparo da torre ao entrar em cena: só o tempo do telegraph —
  // "atira imediatamente quando entra na tela"
  TOWER_FIRST_SHOT_MS: 300,

  // Tier vigente para uma posição x do mundo (0–3)
  getTierIndex(x) {
    return Math.min(3, Math.floor(x / 8000));
  },

  getTierFor(x) {
    return this.DIFFICULTY_TIERS[this.getTierIndex(x)];
  },

  // Estado por frame: GameScene.update escreve a partir da posição do rino;
  // Animal.preUpdate lê — animais já em tela aceleram na troca de tier
  TIER_STATE: { animalSpeedMult: 1 },
};
