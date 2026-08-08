import { Constants } from '../utils/Constants.js';
import { CrackedWall } from '../entities/CrackedWall.js';
import { Spike } from '../entities/Spike.js';
import { Animal } from '../entities/Animal.js';
import { TranqTower } from '../entities/TranqTower.js';
import { TranqDart } from '../entities/TranqDart.js';
import { Ramp } from '../entities/Ramp.js';

export class SpawnManager {
  constructor(scene) {
    this.scene = scene;
    // A abertura é roteirizada (Constants.OPENING_SCRIPT): o primeiro
    // obstáculo é uma rampa aos 90m, não uma parede aos 34m. Nos dados da
    // v1.5, 83 de 512 corridas terminaram exatamente em 34m.
    this.openingIndex = 0;
    this.nextSpawnX = Constants.OPENING_SCRIPT.length
      ? Constants.OPENING_SCRIPT[0].x
      : Constants.GAME_WIDTH + 200;
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

      // Zona livre do portão (respiro na chegada da fuga): o corte só
      // vale DENTRO da janela — pós-portão o spawn retoma em WIN+1000 com o
      // tier do modo infinito. (Sem a janela, o corte re-armaria p/ sempre.)
      if (this.nextSpawnX >= Constants.WIN_DISTANCE_PX - 500 &&
          this.nextSpawnX < Constants.WIN_DISTANCE_PX + 1000) {
        this.nextSpawnX = Constants.WIN_DISTANCE_PX + 1000;
        break;
      }
      // Fim do mundo (LENDA): últimos 1500px livres para a chegada
      if (this.nextSpawnX >= Constants.WORLD_END_PX - 1500) break;

      // O obstáculo nasce com a dificuldade do LUGAR onde vai ficar
      const tier = Constants.getTierFor(this.nextSpawnX);

      // Combo: 2 obstáculos em sequência com offsets FIXOS (justiça).
      // Perto do portão não — a zona livre não pode partir um par.
      const nearGate = this.nextSpawnX >= Constants.WIN_DISTANCE_PX - 1500 &&
                       this.nextSpawnX < Constants.WIN_DISTANCE_PX + 1000;
      if (Math.random() < tier.comboChance && !nearGate) {
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
      } else if (roll < tier.wallW + tier.spikeW) {
        this.spawnSpike(this.nextSpawnX);
      } else if (roll < tier.wallW + tier.spikeW + tier.towerW) {
        this.spawnTower(this.nextSpawnX);
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
      }

      this.nextSpawnX += Math.max(
        Constants.MIN_SAFE_GAP,
        tier.gapMin + Math.random() * tier.gapRand
      );
    }
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

  // A rampa cabe aqui? O corredor livre do portão não pode receber uma
  // estrutura de até 540px transbordando por baixo do zoo-gate. Falhando o
  // teste, o peso vai a zero e a fatia é absorvida pelo animal (o catch-all).
  //
  // O teste é uma JANELA, não um teto: a versão anterior (`x + span < WIN-500`)
  // era sempre falsa depois do portão, e o rampW dos tiers 5/6 ia inteiro para
  // o animal — rampas nunca nasciam no modo infinito.
  rampFits(x) {
    return x + this.rampMaxSpan < Constants.WIN_DISTANCE_PX - 500 ||
           x >= Constants.WIN_DISTANCE_PX + 1000;
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

  // typeOverride/yOverride: usados pelos combos para fixar espécie e altura
  spawnAnimal(x, typeOverride = null, yOverride = null) {
    const animal = this.animalsGroup.getFirst(false);
    if (!animal) return;

    const type = typeOverride ||
      Constants.ANIMAL_TYPES[Math.floor(Math.random() * Constants.ANIMAL_TYPES.length)];
    animal.setType(type);

    // Ground species stand on the ground (top at y=620); the bird flies at jump height
    const groundTop = Constants.GROUND_TOP;
    const spec = Constants.ANIMAL_SPECS[type];
    const y = yOverride !== null
      ? yOverride
      : type === 'bird'
        ? Phaser.Math.Between(410, 520)
        : groundTop - (spec.h * Constants.ANIMAL_SCALE) / 2;
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
      const types = ['lion', 'monkey', 'zebra'];
      this.spawnAnimal(x + 280, types[Math.floor(Math.random() * types.length)]);
      return 280;
    }
    if (pattern === 'spike-bird') {
      this.spawnSpike(x, 'ground');
      this.spawnAnimal(x + 220, 'bird', 470);
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
  fireDart(x, y, vx, vy = 0, gravity = false) {
    const dart = this.dartsGroup.getFirst(false);
    if (!dart) return;
    dart.fire(x, y, vx, vy, gravity);
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
