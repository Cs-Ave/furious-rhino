export const Constants = {
  // Fonte única da versão para a telemetria (manter igual ao #game-version
  // do index.html e ao package.json a cada release)
  VERSION: '1.6.0',

  // Game dimensions & scale
  GAME_WIDTH: 1280,
  GAME_HEIGHT: 720,
  PIXELS_PER_METER: 40,
  // Topo do corpo do chão. Era recalculado inline (GAME_HEIGHT - 100) no
  // spawn de espinho/animal, na torre e na cutscene — agora tem um nome só.
  GROUND_TOP: 620,
  // Sprites SVG rasterizados no dobro do viewBox e exibidos a 1/2 escala:
  // nitidez em telas de alta densidade. Hitboxes usam px de textura, então
  // todo setSize/setOffset/setCrop de textura SVG multiplica por este fator.
  ART_RASTER_SCALE: 2,

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
  // Portão da fuga aos 1000m (v1.6): 5 biomas de 200m cabem inteiros no
  // percurso, e a fuga volta a ser conquista rara — com os números da v1.5,
  // 8,6% das corridas chegavam a 800m e 3,5% a 1000m. Decisão deliberada.
  WIN_DISTANCE_PX: 40000,
  // Fim físico do mundo no modo infinito (10.000m; float32 preciso até aqui).
  // Chegar = "LENDA!". Bounds/câmera/chão derivam deste valor.
  WORLD_END_PX: 400000,
  // Fúria cheia aos 900m = 90% do caminho até o portão (era 700/800 = 87,5%).
  // Sem esse ajuste ela saturaria aos 70% e o rino chegaria ao portão com 300m
  // de velocidade máxima — apertando o MIN_SAFE_GAP e esticando o trampolim.
  FURY_FULL_DISTANCE_PX: 36000,
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
  // Narina da arte v1.4 fica em (89,38) do canvas 96x64 -> ancora da fumaca
  SNOUT_OFFSET_Y: -26,

  // All animals rendered at 1.5x (Arcade scales bodies with the sprite,
  // so ANIMAL_SPECS stay in texture pixels)
  ANIMAL_SCALE: 1.5,

  // Per-species animal canvas + physics body (offsets in texture pixels)
  ANIMAL_SPECS: {
    lion:    { w: 70, h: 56, bodyW: 58, bodyH: 44, offX: 6,  offY: 10 },
    zebra:   { w: 76, h: 50, bodyW: 64, bodyH: 38, offX: 6,  offY: 10 },
    monkey:  { w: 48, h: 56, bodyW: 36, bodyH: 46, offX: 6,  offY: 8  },
    giraffe: { w: 60, h: 90, bodyW: 38, bodyH: 82, offX: 11, offY: 6  },
    // Canvas alargado na v1.4 para os bicões (tucano/arara): margens
    // simétricas (offX = (56-36)/2) para o flip não deslocar a hitbox;
    // bicos ficam FORA da colisão, como o chifre do rino
    bird:    { w: 56, h: 32, bodyW: 36, bodyH: 22, offX: 10, offY: 6  },
  },

  // 5 espécies visuais de pássaro (mesma hitbox/behavior de 'bird');
  // Animal.setType sorteia uma a cada spawn
  BIRD_SPECIES: ['macaw', 'owl', 'cockatiel', 'toucan', 'jay'],

  // HUD
  HUD_MARGIN: 20,
  FURY_BAR_WIDTH: 200,
  FURY_BAR_HEIGHT: 12,
  DASH_ICON_SIZE: 60,

  // Object pool sizes (dimensionados para o teto de dificuldade do
  // modo infinito: combos a 50% + torres a 22% da roleta)
  POOL_SIZES: {
    crackedWalls: 8,
    spikes: 8,
    animals: 8,
    towers: 4,
    darts: 16,
    // Janela viva: 200 (reciclagem) + 1280 (tela) + 600 (lookahead) + 540
    // (span máx) ≈ 2620px; com span+gap ≈ 1080 por rampa, 3 bastariam
    ramps: 4,
  },

  // ------------------------------------------------------------------ rampas
  // A rampa é TERRENO, não corpo de colisão: Arcade só tem AABB alinhado aos
  // eixos, e uma escada de corpos estáticos trava o rino na lateral do degrau
  // (a separação zera velocityX e o FurySystem a reescreve todo frame — o
  // resultado é ele tremendo parado, sem morrer e sem avançar). Em vez disso a
  // rampa expõe surfaceY(x) e a cena encaixa o body nela uma vez por frame.
  //
  // asc = rampa de subida, rise = altura ganha, top = platô, desc = descida.
  // desc: 0 = penhasco (trampolim): a crista lança o rino no ar.
  RAMP_VARIANTS: {
    small: { asc: 200, rise: 90,  top: 80,  desc: 140 },
    big:   { asc: 260, rise: 150, top: 100, desc: 180 },
    // launchV: impulso ao deixar a crista. Sem ele o penhasco daria só ~106px
    // de voo (queda de 130px a 2100px/s²) — pouco para se chamar trampolim.
    // -520 dá ~0,83s no ar: ~265m/s de corrida base, bem mais com fúria.
    jump:  { asc: 240, rise: 130, top: 60,  desc: 0, launchV: -520 },
  },

  // Sorteio da variante DENTRO do peso de rampa (os pesos dos tiers não
  // mudam). O trampolim é a variante que mais rende — a sensação de voo é o
  // que o jogo tem de mais divertido — então ele domina: 2/3 no primeiro
  // trecho e 3/5 dali em diante. Antes ele era 1/3 e só entrava no tier 3,
  // o que dava ~4% da roleta: raro demais para ser lembrado.
  // O morro grande (150px de subida) fica fora do primeiro trecho.
  RAMP_POOL: {
    early: ['jump', 'jump', 'small'],                // tier 1
    full: ['jump', 'jump', 'jump', 'small', 'big'],  // tier 2+
  },
  // Saia enterrada no chão: sem ela a base da textura mostra a costura
  RAMP_SKIRT: 24,
  // Tolerância de "grudar" na descida. A 450px/s a queda por frame no desc do
  // morro grande é 6,2px; no dash a 1125px/s, 15,6px — 26 cobre os dois com
  // folga, e o penhasco (desc 0) não gruda em nada.
  RAMP_STICK_PX: 26,
  // Só destrói entrando RASANTE: dash no meio da subida não quebra, só acelera
  RAMP_SMASH_MAX_H: 32,
  // Vão mínimo DEPOIS da rampa, medido da borda direita. O trampolim com
  // impulso fica ~0,83s no ar: 265px correndo, ~375px já com fúria cheia.
  // 900 garante que o pouso nunca cai em cima do próximo obstáculo.
  RAMP_EXIT_GAP: 900,

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
    // anim do pássaro é por espécie (bird-<sp>-flap), resolvida no setType
    bird:    { speed: 180, bobVy: 60 },
  },

  // 6 tiers de dificuldade, um a cada 200m (8000px de mundo). Objetos
  // mutáveis lidos a cada spawn/frame — o TuningPanel liga sliders direto
  // aqui. wallW/spikeW/towerW/rampW: frações da roleta de spawn (sobra =
  // animal). animalLeadPx: animais andam contra o fluxo, o vão antes deles
  // encolhe até o encontro — espaço extra no spawn compensa.
  //
  // v1.6: a parede cedeu peso para a rampa E para a torre. Os dados de 512
  // corridas da v1.5 mostraram parede = 68% de todas as mortes e torre = 1%
  // (ela nem existia no t1, onde acontecem 55% das mortes). A fatia do animal
  // ficou praticamente igual; quem pagou a conta foi a parede.
  // t1 também ficou mais generoso no gap: 43% das corridas morriam antes dos
  // 200m e metade dos estreantes não passava do primeiro obstáculo.
  DIFFICULTY_TIERS: [
    { gapMin: 1000, gapRand: 150, animalSpeedMult: 1.0,  animalLeadPx: 350, wallW: 0.42, spikeW: 0.20, towerW: 0.06, rampW: 0.10, comboChance: 0,    towerIntervalMs: 1200, dartSpeed: 460 },
    { gapMin: 760,  gapRand: 140, animalSpeedMult: 1.15, animalLeadPx: 400, wallW: 0.33, spikeW: 0.15, towerW: 0.12, rampW: 0.10, comboChance: 0.15, towerIntervalMs: 1000, dartSpeed: 460 },
    { gapMin: 640,  gapRand: 120, animalSpeedMult: 1.35, animalLeadPx: 450, wallW: 0.24, spikeW: 0.14, towerW: 0.17, rampW: 0.12, comboChance: 0.25, towerIntervalMs: 800,  dartSpeed: 540 },
    { gapMin: 560,  gapRand: 100, animalSpeedMult: 1.6,  animalLeadPx: 500, wallW: 0.18, spikeW: 0.12, towerW: 0.20, rampW: 0.12, comboChance: 0.35, towerIntervalMs: 650,  dartSpeed: 620 },
    // Modo infinito (pós-portão). t6 é o TETO — justo mas implacável:
    // dardo 700 = fechamento 1150px/s → ~0,73s de reação + telegraph;
    // gapMin 540 = piso do ciclo do dash (1,2s × 450px/s), nunca abaixo.
    { gapMin: 540,  gapRand: 90,  animalSpeedMult: 1.8,  animalLeadPx: 520, wallW: 0.14, spikeW: 0.12, towerW: 0.22, rampW: 0.14, comboChance: 0.42, towerIntervalMs: 580,  dartSpeed: 660 },
    { gapMin: 540,  gapRand: 80,  animalSpeedMult: 2.0,  animalLeadPx: 560, wallW: 0.12, spikeW: 0.12, towerW: 0.24, rampW: 0.14, comboChance: 0.50, towerIntervalMs: 520,  dartSpeed: 700 },
  ],

  // Abertura guiada: os 3 primeiros obstáculos são FIXOS e em ordem de lição.
  // Antes da v1.6 o primeiro obstáculo nascia em x=1480 (34m, 4,3s de corrida)
  // e em 55% dos casos era uma parede — que exige dash E altura certa ao mesmo
  // tempo. 83 das 512 corridas medidas terminaram exatamente em 34m, e a
  // mediana da PRIMEIRA corrida de cada jogador era 34m.
  // A rampa abre a sequência de propósito: é o obstáculo que não mata.
  OPENING_SCRIPT: [
    { x: 3600, kind: 'ramp',  variant: 'small',  hint: 'Suba o morro! 🏔️' },
    { x: 5000, kind: 'spike', variant: 'ground', hint: 'Toque à ESQUERDA para pular ⬅️' },
    { x: 6400, kind: 'wall',  variant: 'ground', hint: 'Toque à DIREITA para investir ➡️' },
  ],
  // A roleta assume a partir daqui (190m) — 1200px depois da parede do script
  OPENING_END_X: 7600,
  // Dicas na tela só nas 3 primeiras corridas da vida do jogador
  OPENING_HINT_MAX_ATTEMPTS: 3,

  // 1º disparo da torre ao entrar em cena: só o tempo do telegraph —
  // "atira imediatamente quando entra na tela"
  TOWER_FIRST_SHOT_MS: 300,

  // Biomas do cenário, um a cada 200m: os 5 primeiros cobrem exatamente o
  // percurso até o portão (1000m) e a CIDADE é o 6º, entrando na fuga.
  // As texturas são `bg-far-<nome>` / `bg-near-<nome>` (TextureFactory).
  BIOMES: ['jaulas', 'aviario', 'savana', 'floresta', 'pantano', 'cidade'],

  // Nome do setor anunciado na travessia do arco (ver switchBiome)
  BIOME_LABELS: {
    jaulas: '🦁 ALA DAS JAULAS',
    aviario: '🦜 VIVEIRO DAS AVES',
    savana: '🦓 SAVANA',
    floresta: '🌴 FLORESTA TROPICAL',
    pantano: '🐊 PÂNTANO',
    cidade: '🌆 A CIDADE',
  },

  // Clampado no último bioma: a cidade começa exatamente no portão (x=40000)
  // e vale para sempre no modo infinito.
  getBiomeIndex(x) {
    return Math.min(this.BIOMES.length - 1, Math.floor(x / 8000));
  },

  // ------------------------------------------------------------ céu e clima
  // Até 1450m o céu segue a curva narrativa: dia pleno, entardecer chegando
  // junto com o portão (a fuga acontece no pôr do sol) e noite no modo
  // infinito. Dali em diante ele CICLA em vez de saturar — na v1.5 a noite
  // fechava e nunca mais mudava, justo onde os melhores jogadores estão.
  SKY_CYCLE_START_PX: 58000, // 1450m
  SKY_CYCLE_PX: 24000,       // um dia inteiro a cada 600m
  // Âncoras da curva narrativa (px): entardecer 800→1000m, noite 1000→1450m
  SKY_DUSK_FROM: 32000,
  SKY_DUSK_TO: 40000,
  SKY_NIGHT_TO: 58000,

  // Clima por faixa de 200m. As 8 primeiras faixas (0–1600m) são
  // ROTEIRIZADAS, não sorteadas — sorteando, a tempestade só cairia por volta
  // dos 2000m, ACIMA do recorde mundial (1654m): ninguém veria o efeito mais
  // caro do jogo. Os 400m iniciais ficam limpos porque é onde 43% das
  // corridas terminam e quem está aprendendo precisa de leitura limpa.
  // v1.6: cada clima casa com o bioma da faixa.
  WEATHER_SCRIPT: [
    'limpo',      //    0–200m  jaulas — aprendizado
    'limpo',      //  200–400m  aviário
    'chuva',      //  400–600m  savana (39% das corridas veem)
    'neblina',    //  600–800m  floresta tropical — a neblina é o tema
    'limpo',      //  800–1000m pântano: reta do portão, leitura limpa
    'tempestade', // 1000–1200m cidade — o show, logo depois da fuga
    'limpo',      // 1200–1400m
    'chuva',      // 1400–1600m
  ],
  // Teto de alpha da neblina: acima disto ela começa a esconder obstáculo
  FOG_MAX_ALPHA: 0.34,

  // Determinístico: mesma corrida → mesmo clima no mesmo trecho, nunca
  // sorteado por frame. Depois do roteiro, 40% limpo / 26% chuva /
  // 20% neblina / 14% tempestade por hash da faixa.
  weatherFor(x) {
    const band = Math.floor(x / 8000);
    if (band < this.WEATHER_SCRIPT.length) return this.WEATHER_SCRIPT[band];
    // Mix inteiro (finalizador estilo murmur): o Knuth puro tem os dígitos
    // baixos mal distribuídos e concentrava tudo em "limpo"
    let h = Math.imul(band + 1, 2654435761);
    h ^= h >>> 15; h = Math.imul(h, 2246822519);
    h ^= h >>> 13; h = Math.imul(h, 3266489917);
    h = (h ^ (h >>> 16)) >>> 0;
    const v = h % 100;
    if (v < 40) return 'limpo';
    if (v < 66) return 'chuva';
    if (v < 86) return 'neblina';
    return 'tempestade';
  },

  // Tier vigente para uma posição x do mundo (0–5; t6 = teto, clampado)
  getTierIndex(x) {
    return Math.min(5, Math.floor(x / 8000));
  },

  getTierFor(x) {
    return this.DIFFICULTY_TIERS[this.getTierIndex(x)];
  },

  // Estado por frame: GameScene.update escreve a partir da posição do rino;
  // Animal.preUpdate lê — animais já em tela aceleram na troca de tier
  TIER_STATE: { animalSpeedMult: 1 },
};
