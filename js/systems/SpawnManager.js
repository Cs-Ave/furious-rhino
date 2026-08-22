import { Constants } from '../utils/Constants.js';
import { CrackedWall } from '../entities/CrackedWall.js';
import { Spike } from '../entities/Spike.js';
import { Animal } from '../entities/Animal.js';
import { TranqTower } from '../entities/TranqTower.js';
import { TranqDart } from '../entities/TranqDart.js';
import { Ramp } from '../entities/Ramp.js';

export class SpawnManager {
  constructor(scene, { skipOpening = false } = {}) {
    this.scene = scene;
    // A abertura é roteirizada (Constants.OPENING_SCRIPT): o primeiro
    // obstáculo é uma rampa aos 90m, não uma parede aos 34m. Nos dados da
    // v1.5, 83 de 512 corridas terminaram exatamente em 34m.
    // v1.8.4: isso é uma LIÇÃO, e veterano não precisa de aula. Com
    // skipOpening o roteiro é dado por vencido e a roleta por tier assume já
    // em VETERAN_OPENING_START_X — antes, a abertura eram 190m com três
    // obstáculos fixos, animal nenhum e nada para pontuar.
    this.openingIndex = skipOpening ? Constants.OPENING_SCRIPT.length : 0;
    this.nextSpawnX = skipOpening
      ? Constants.VETERAN_OPENING_START_X
      : (Constants.OPENING_SCRIPT.length
        ? Constants.OPENING_SCRIPT[0].x
        : Constants.GAME_WIDTH + 200);
    this.rampMaxSpan = Math.max(
      ...Object.values(Constants.RAMP_VARIANTS).map((s) => s.asc + s.top + s.desc)
    );

    // Plain groups: entities already own configured physics bodies, and a
    // physics group would re-apply its defaults (gravity on, immovable off)
    this.crackedWallsGroup = scene.add.group();
    this.spikesGroup = scene.add.group();
    this.animalsGroup = scene.add.group();

    for (let i = 0; i < Constants.POOL_SIZES.crackedWalls; i++) {
      const wall = new CrackedWall(scene, -500, 0);
      this.crackedWallsGroup.add(wall);
      wall.deactivate();
    }

    for (let i = 0; i < Constants.POOL_SIZES.spikes; i++) {
      const spike = new Spike(scene, -500, 0);
      this.spikesGroup.add(spike);
      spike.deactivate();
    }

    for (let i = 0; i < Constants.POOL_SIZES.animals; i++) {
      const type = Constants.ANIMAL_TYPES[i % Constants.ANIMAL_TYPES.length];
      const animal = new Animal(scene, -500, 0, type);
      this.animalsGroup.add(animal);
      animal.deactivate();
    }

    this.towersGroup = scene.add.group();
    for (let i = 0; i < Constants.POOL_SIZES.towers; i++) {
      const tower = new TranqTower(scene, -500, 0);
      this.towersGroup.add(tower);
      tower.deactivate();
    }

    this.dartsGroup = scene.add.group();
    for (let i = 0; i < Constants.POOL_SIZES.darts; i++) {
      const dart = new TranqDart(scene, -500, 0);
      this.dartsGroup.add(dart);
      dart.deactivate();
    }

    // Rampas: sem corpo de física (são terreno, ver Ramp.js), mas o pooling
    // por `active` é idêntico ao das demais entidades
    this.rampsGroup = scene.add.group();
    for (let i = 0; i < Constants.POOL_SIZES.ramps; i++) {
      const ramp = new Ramp(scene, -1000, Constants.GROUND_TOP);
      this.rampsGroup.add(ramp);
      ramp.deactivate();
    }
  }

  update(camera) {
    this.recycleOffscreen(camera);
    this.spawnObstacles(camera);
  }

  // Zonas onde NADA nasce, descritas como DADOS. Derivadas de Constants a cada
  // chamada de propósito: o painel de tuning (/?debug=1) mexe em
  // WIN_DISTANCE_PX em tempo de execução e a zona tem de acompanhar.
  //   from/to  — o intervalo proibido [from, to)
  //   resumeX  — para onde o cursor de spawn salta ao cair dentro da zona
  //              (arena de boss: a pós-arena); null = fim de pista, o laço só
  //              para (break puro, sem re-armar o cursor)
  //   anchor   — x do boss dono da arena; alimenta nearBossArena().
  noSpawnZones() {
    const win = Constants.WIN_DISTANCE_PX;
    return [
      // Arena do boss do portão (v1.7): cobre o alcance do quique
      // (BOSS_ARENA_PX + folga), não só o respiro da chegada. Pós-portão o
      // spawn retoma em WIN+1000 com o tier do modo infinito — é a janela que
      // impede o corte de re-armar para sempre.
      {
        from: win - (Constants.BOSS_ARENA_PX + 200),
        to: win + 1000,
        resumeX: win + 1000,
        anchor: win,
      },
      // v1.8.5 — arena do CERCO (2000m): mesma geometria da arena do portão
      {
        from: Constants.BOSS2_ANCHOR_PX - (Constants.BOSS_ARENA_PX + 200),
        to: Constants.BOSS2_ANCHOR_PX + 1000,
        resumeX: Constants.BOSS2_ANCHOR_PX + 1000,
        anchor: Constants.BOSS2_ANCHOR_PX,
      },
      // Fim do mundo (LENDA): últimos 1500px livres para a chegada. v1.8.5:
      // o GUARDIÃO mora nela (âncora 399800) — o anchor faz nearBossArena
      // valer na aproximação, senão o combo poderia partir um par a caminho
      // da última luta.
      {
        from: Constants.WORLD_END_PX - 1500,
        to: Infinity,
        resumeX: null,
        anchor: Constants.BOSS3_ANCHOR_PX,
      },
    ];
  }

  // A zona sem spawn que contém x, ou null. São 3 — varredura linear é mais
  // barata que qualquer índice.
  inNoSpawnZone(x) {
    const zones = this.noSpawnZones();
    for (let i = 0; i < zones.length; i++) {
      if (x >= zones[i].from && x < zones[i].to) return zones[i];
    }
    return null;
  }

  // x está na aproximação de alguma arena de boss? Os 1500px antes da âncora
  // valem como área da luta para o COMBO: um par nascido aqui teria a segunda
  // metade engolida pela zona sem spawn logo à frente.
  nearBossArena(x) {
    const zones = this.noSpawnZones();
    for (let i = 0; i < zones.length; i++) {
      const z = zones[i];
      if (z.anchor !== undefined && x >= z.anchor - 1500 && x < z.to) return true;
    }
    return false;
  }

  recycleOffscreen(camera) {
    const limit = camera.scrollX - Constants.RECYCLE_MARGIN_PX;

    this.crackedWallsGroup.children.entries.forEach(wall => {
      if (wall.active && wall.x < limit) wall.deactivate();
    });

    this.spikesGroup.children.entries.forEach(spike => {
      if (spike.active && spike.x < limit) spike.deactivate();
    });

    this.animalsGroup.children.entries.forEach(animal => {
      if (animal.active && (animal.x < limit || animal.y > Constants.GAME_HEIGHT + 200)) {
        animal.deactivate();
      }
    });

    this.towersGroup.children.entries.forEach(tower => {
      if (tower.active && tower.x < limit) tower.deactivate();
    });

    // Dardos agora voam em qualquer direção — reciclar por qualquer borda,
    // senão os que sobem/vão para trás nunca voltam ao pool
    this.dartsGroup.children.entries.forEach(dart => {
      if (dart.active && (
        dart.x < limit ||
        dart.x > camera.scrollX + camera.width + 200 ||
        dart.y < -60 ||
        dart.y > Constants.GAME_HEIGHT + 60
      )) dart.deactivate();
    });

    // Pela borda DIREITA: com origin à esquerda, uma rampa de 540px cujo x
    // está 200px atrás da câmera ainda ocupa 340px de tela — sumiria com o
    // rino ainda em cima dela
    this.rampsGroup.children.entries.forEach(ramp => {
      if (ramp.active && ramp.exitX < limit) ramp.deactivate();
    });
  }

  spawnObstacles(camera) {
    while (this.nextSpawnX < camera.scrollX + camera.width + Constants.SPAWN_LOOKAHEAD_PX) {
      // Abertura roteirizada: rampa (não mata) → espinho (um pulo) → parede
      // (a investida). Só depois dela a roleta assume.
      if (this.openingIndex < Constants.OPENING_SCRIPT.length) {
        const step = Constants.OPENING_SCRIPT[this.openingIndex++];
        this.spawnScripted(step);
        const next = Constants.OPENING_SCRIPT[this.openingIndex];
        this.nextSpawnX = next ? next.x : Constants.OPENING_END_X;
        continue;
      }

      // Caiu numa zona sem spawn (arena de boss, chegada da LENDA)? Arena
      // re-arma o cursor na pós-arena e para; fim de pista só para.
      const zone = this.inNoSpawnZone(this.nextSpawnX);
      if (zone) {
        if (zone.resumeX !== null) this.nextSpawnX = zone.resumeX;
        break;
      }

      // O obstáculo nasce com a dificuldade do LUGAR onde vai ficar
      const tier = Constants.getTierFor(this.nextSpawnX);

      // Combo: 2 obstáculos em sequência com offsets FIXOS (justiça).
      // Perto de uma arena de boss não — a zona livre não pode partir um par.
      if (Math.random() < tier.comboChance && !this.nearBossArena(this.nextSpawnX)) {
        this.nextSpawnX += this.spawnCombo(Constants.getTierIndex(this.nextSpawnX));
        this.nextSpawnX += Math.max(
          Constants.MIN_SAFE_GAP,
          tier.gapMin + Math.random() * tier.gapRand
        );
        continue;
      }

      const roll = Math.random();
      const rampW = this.rampFits(this.nextSpawnX) ? (tier.rampW || 0) : 0;
      if (roll < tier.wallW) {
        this.spawnWall(this.nextSpawnX);
        this.nextSpawnX += this.maybeEscort(this.nextSpawnX, 'wall', tier);
      } else if (roll < tier.wallW + tier.spikeW) {
        this.spawnSpike(this.nextSpawnX);
        this.nextSpawnX += this.maybeEscort(this.nextSpawnX, 'spike', tier);
      } else if (roll < tier.wallW + tier.spikeW + tier.towerW) {
        this.spawnTower(this.nextSpawnX);
        this.nextSpawnX += this.maybeEscort(this.nextSpawnX, 'tower', tier);
      } else if (roll < tier.wallW + tier.spikeW + tier.towerW + rampW) {
        // A rampa OCUPA largura: soma o próprio comprimento antes do gap (o
        // mesmo padrão do combo), de modo que o vão passa a ser medido da
        // borda DIREITA dela — MIN_SAFE_GAP continua valendo, sem redefinição
        this.nextSpawnX += this.spawnRamp(this.nextSpawnX);
        this.nextSpawnX += Math.max(
          Constants.RAMP_EXIT_GAP,
          tier.gapMin + Math.random() * tier.gapRand
        );
        continue;
      } else {
        // O animal anda contra o rino: o vão antes dele encolhe até o
        // encontro — nasce mais à frente para compensar
        this.nextSpawnX += tier.animalLeadPx;
        this.spawnAnimal(this.nextSpawnX);
        // v1.8: par de animais — um segundo logo à frente, por tier. A guarda
        // repete a do laço porque o offset pode cruzar a fronteira que o
        // primeiro animal respeitou.
        const packX = this.nextSpawnX + Constants.ANIMAL_PACK_OFFSET_PX;
        if (Math.random() < (tier.animalPackChance || 0) && !this.inNoSpawnZone(packX)) {
          this.spawnAnimal(packX);
        }
      }

      this.nextSpawnX += Math.max(
        Constants.MIN_SAFE_GAP,
        tier.gapMin + Math.random() * tier.gapRand
      );
    }
  }

  // v1.8 (3ª rodada de densidade): escolta — um animal nasce JUNTO do
  // obstáculo sorteado, na coreografia dos combos (parede→terrestre a +280,
  // espinho→voador a +220, torre→qualquer a +300), sem substituir nada.
  // Devolve o span ocupado (soma no nextSpawnX, como os combos fazem) para o
  // gap seguinte contar a partir do animal. Guarda idêntica à do par: o
  // acompanhante não pode cair numa zona sem spawn.
  maybeEscort(x, kind, tier) {
    if (Math.random() >= (tier.animalEscortChance || 0)) return 0;
    const offset = kind === 'wall' ? 280 : kind === 'spike' ? 220 : 300;
    const ex = x + offset;
    if (this.inNoSpawnZone(ex)) return 0;
    if (kind === 'spike') {
      this.spawnAnimal(ex, this.pickBiomeAnimal(ex, 'fly'), 470);
    } else {
      this.spawnAnimal(ex, this.pickBiomeAnimal(ex, kind === 'wall' ? 'ground' : 'any'));
    }
    return offset;
  }

  spawnWall(x, heightOverride = null) {
    const wall = this.crackedWallsGroup.getFirst(false);
    if (!wall) return;

    const heights = ['ground', 'mid', 'high'];
    const crackHeight = heightOverride ||
      heights[Math.floor(Math.random() * heights.length)];
    // Depois do portão o rino está na cidade: a parede vira fachada de
    // prédio. Só grafismo — a mecânica da fresta é a mesma.
    wall.setSkin(x >= Constants.WIN_DISTANCE_PX ? '-city' : '');
    wall.setCrackHeight(crackHeight);
    wall.reset(x);
  }

  // A rampa cabe aqui? Ela é a única estrutura que OCUPA largura (até 540px):
  // não basta o x estar fora das zonas, o intervalo [x, x+rampMaxSpan] inteiro
  // não pode INTERSECTAR nenhuma — senão a rampa transborda por baixo do
  // zoo-gate. Falhando o teste, o peso vai a zero e a fatia é absorvida pelo
  // animal (o catch-all).
  //
  // O teste é uma JANELA, não um teto: a versão anterior (`x + span < WIN-500`)
  // era sempre falsa depois do portão, e o rampW dos tiers 5/6 ia inteiro para
  // o animal — rampas nunca nasciam no modo infinito. Com a zona genérica isso
  // se mantém (antes da arena com folga do span, ou depois da retomada) e de
  // quebra a chegada da LENDA passa a ser respeitada: antes uma rampa iniciada
  // pouco antes de WORLD_END-1500 invadia os 1500px livres do final.
  rampFits(x) {
    const zones = this.noSpawnZones();
    for (let i = 0; i < zones.length; i++) {
      const z = zones[i];
      if (x + this.rampMaxSpan >= z.from && x < z.to) return false;
    }
    return true;
  }

  // Devolve o comprimento ocupado (o chamador soma o gap depois), no mesmo
  // contrato do spawnCombo. A variante sai de Constants.RAMP_POOL, onde o
  // trampolim é maioria.
  spawnRamp(x, variantOverride = null) {
    const ramp = this.rampsGroup.getFirst(false);
    if (!ramp) return 0;

    const pool = Constants.getTierIndex(x) >= 1
      ? Constants.RAMP_POOL.full
      : Constants.RAMP_POOL.early;
    const variant = variantOverride || pool[Math.floor(Math.random() * pool.length)];
    // Depois do portão o rino está na cidade: concreto e asfalto no lugar de
    // terra e grama. Só grafismo — a superfície e a destruição são as mesmas.
    ramp.setSkin(x >= Constants.WIN_DISTANCE_PX ? '-city' : '');
    return ramp.reset(x, variant);
  }

  // Abertura roteirizada: cada passo é um tipo fixo, sem sorteio
  spawnScripted(step) {
    if (step.kind === 'ramp') this.spawnRamp(step.x, step.variant);
    else if (step.kind === 'spike') this.spawnSpike(step.x, step.variant);
    else this.spawnWall(step.x, step.variant);
  }

  // Rampa ativa que contém este x do mundo (ou null). O pool tem 4 itens —
  // varredura linear é mais barata que qualquer índice.
  getRampAt(x) {
    const list = this.rampsGroup.children.entries;
    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      if (r.active && !r.destroyed && x >= r.x && x <= r.exitX) return r;
    }
    return null;
  }

  spawnSpike(x, variantOverride = null) {
    const spike = this.spikesGroup.getFirst(false);
    if (!spike) return;

    // Ambas as variantes pisam no topo do chão (y=620)
    const groundTop = Constants.GROUND_TOP;
    const variant = variantOverride || (Math.random() < 0.3 ? 'tower' : 'ground');
    // Pedestal de concreto com faixa de perigo depois do portão
    spike.setSkin(x >= Constants.WIN_DISTANCE_PX ? '-city' : '');
    if (variant === 'tower') {
      spike.reset(x, groundTop - 120, 'tower');
    } else {
      spike.reset(x, groundTop - 60, 'ground');
    }
  }

  // Espécie sorteada do ELENCO DO BIOMA em que o obstáculo vai nascer (v1.7:
  // antes as mesmas 5 espécies apareciam do zoo à cidade). mode:
  //   'any'    — roleta normal (voadores incluídos; spawnAnimal posiciona
  //              cada um na sua faixa de voo)
  //   'ground' — par wall-animal (precisa ser pulável atrás da parede)
  //   'fly'    — par spike-bird; bioma sem voador cai no pássaro genérico —
  //              tucano/arara na floresta é tematicamente honesto
  pickBiomeAnimal(x, mode = 'any') {
    const biome = Constants.BIOMES[Constants.getBiomeIndex(x)];
    const list = Constants.BIOME_ANIMALS[biome] || Constants.ANIMAL_TYPES;
    const isFly = (t) => t === 'bird' || !!Constants.ANIMAL_BEHAVIOR[t].fly;
    let pool = list;
    if (mode === 'fly') pool = list.some(isFly) ? list.filter(isFly) : ['bird'];
    else if (mode === 'ground') {
      pool = list.some((t) => !isFly(t)) ? list.filter((t) => !isFly(t)) : list;
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // typeOverride/yOverride: usados pelos combos para fixar espécie e altura
  spawnAnimal(x, typeOverride = null, yOverride = null) {
    const animal = this.animalsGroup.getFirst(false);
    if (!animal) return;

    const type = typeOverride || this.pickBiomeAnimal(x);
    animal.setType(type);

    // Terrestres pisam no topo do chão (y=620); voadores nascem na faixa de
    // voo da espécie (behavior.fly) — o pássaro mantém a banda histórica
    const groundTop = Constants.GROUND_TOP;
    const spec = Constants.ANIMAL_SPECS[type];
    const fly = Constants.ANIMAL_BEHAVIOR[type].fly ||
      (type === 'bird' ? [410, 520] : null);
    const y = yOverride !== null
      ? yOverride
      : fly
        ? Phaser.Math.Between(fly[0], fly[1])
        : groundTop - (spec.h * (spec.scale || Constants.ANIMAL_SCALE)) / 2;
    animal.reset(x, y);
  }

  // Pares fixos; retorna o comprimento do par (o chamador soma o gap depois).
  // wall-animal: dash quebra a parede, o cooldown força PULAR o animal.
  // spike-bird (tiers 3-4): espinho no chão + pássaro em altura fixa.
  // tower-spike: espinho elevado + espinho no chão — 1 pulo carregado limpa os dois.
  spawnCombo(tierIdx) {
    const patterns = tierIdx >= 2
      ? ['wall-animal', 'spike-bird', 'tower-spike', 'ramp-tower']
      : ['wall-animal', 'tower-spike'];
    let pattern = patterns[Math.floor(Math.random() * patterns.length)];
    const x = this.nextSpawnX;
    if (pattern === 'ramp-tower' && !this.rampFits(x)) pattern = 'wall-animal';

    // Posto de guarda no alto do morro. Três saídas legítimas: destruir a
    // rampa rasante na base (leva a torre junto), subir e derrubar a torre no
    // topo (e ganhar o dash de volta), ou passar por baixo dos dardos.
    if (pattern === 'ramp-tower') {
      const span = this.spawnRamp(x, 'big');
      if (span) {
        const spec = Constants.RAMP_VARIANTS.big;
        this.spawnTower(x + spec.asc + spec.top / 2, Constants.GROUND_TOP - spec.rise);
        return span;
      }
      pattern = 'wall-animal'; // pool esgotado: cai no par de sempre
    }

    if (pattern === 'wall-animal') {
      this.spawnWall(x);
      // Espécie terrestre do bioma local (v1.7): o par continua ensinando
      // "quebre a parede, pule o bicho", só o elenco muda de cenário
      this.spawnAnimal(x + 280, this.pickBiomeAnimal(x + 280, 'ground'));
      return 280;
    }
    if (pattern === 'spike-bird') {
      this.spawnSpike(x, 'ground');
      this.spawnAnimal(x + 220, this.pickBiomeAnimal(x + 220, 'fly'), 470);
      return 220;
    }
    this.spawnSpike(x, 'tower');
    this.spawnSpike(x + 180, 'ground');
    return 180;
  }

  // baseY: topo do terreno onde a torre pisa (o platô de um morro, no combo
  // ramp-tower). Sem ele, o chão plano.
  spawnTower(x, baseY = Constants.GROUND_TOP) {
    const tower = this.towersGroup.getFirst(false);
    if (!tower) return;
    // Torre de pedra medieval no meio do asfalto destoava: na cidade ela vira
    // poste de vigilância com caixa d'água
    tower.setSkin(x >= Constants.WIN_DISTANCE_PX ? '-city' : '');
    tower.reset(x, baseY);
  }

  // Chamado pela TranqTower no momento do disparo (mira em 360° / morteiro)
  // e pelos rifles dos bosses. v1.8.5: `boss` é a CAUSA de morte ('boss' |
  // 'boss2' | 'boss3') ou falsy — vira dart.fromBoss (string) e chega ao
  // onDartHit como está. O legado `true` (chamadas antigas/testes) cai em
  // 'boss'. O tint dourado é o MESMO para os três: "dardo de boss" é uma
  // linguagem visual só.
  fireDart(x, y, vx, vy = 0, gravity = false, boss = false) {
    const dart = this.dartsGroup.getFirst(false);
    if (!dart) return;
    dart.fire(x, y, vx, vy, gravity);
    if (boss) {
      dart.fromBoss = boss === true ? 'boss' : boss;
      dart.setTint(0xffc84a);
    }
  }

  getWallsGroup() {
    return this.crackedWallsGroup;
  }

  getSpikesGroup() {
    return this.spikesGroup;
  }

  getAnimalsGroup() {
    return this.animalsGroup;
  }

  getTowersGroup() {
    return this.towersGroup;
  }

  getDartsGroup() {
    return this.dartsGroup;
  }

  getRampsGroup() {
    return this.rampsGroup;
  }
}
