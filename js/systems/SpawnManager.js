import { Constants } from '../utils/Constants.js';
import { CrackedWall } from '../entities/CrackedWall.js';
import { Spike } from '../entities/Spike.js';
import { Animal } from '../entities/Animal.js';
import { TranqTower } from '../entities/TranqTower.js';
import { TranqDart } from '../entities/TranqDart.js';

export class SpawnManager {
  constructor(scene) {
    this.scene = scene;
    this.nextSpawnX = Constants.GAME_WIDTH + 200;

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

    this.dartsGroup.children.entries.forEach(dart => {
      if (dart.active && dart.x < limit) dart.deactivate();
    });
  }

  spawnObstacles(camera) {
    while (this.nextSpawnX < camera.scrollX + camera.width + Constants.SPAWN_LOOKAHEAD_PX) {
      if (this.nextSpawnX >= Constants.WIN_DISTANCE_PX - 500) {
        this.nextSpawnX = Constants.WIN_DISTANCE_PX + 1000;
        break;
      }

      // O obstáculo nasce com a dificuldade do LUGAR onde vai ficar
      const tier = Constants.getTierFor(this.nextSpawnX);
      const roll = Math.random();
      if (roll < tier.wallW) {
        this.spawnWall(this.nextSpawnX);
      } else if (roll < tier.wallW + tier.spikeW) {
        this.spawnSpike(this.nextSpawnX);
      } else if (roll < tier.wallW + tier.spikeW + tier.towerW) {
        this.spawnTower(this.nextSpawnX);
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

  spawnWall(x) {
    const wall = this.crackedWallsGroup.getFirst(false);
    if (!wall) return;

    const heights = ['ground', 'mid', 'high'];
    const crackHeight = heights[Math.floor(Math.random() * heights.length)];
    wall.setCrackHeight(crackHeight);
    wall.reset(x);
  }

  spawnSpike(x, variantOverride = null) {
    const spike = this.spikesGroup.getFirst(false);
    if (!spike) return;

    // Ground top is at GAME_HEIGHT - 100 (y=620); both variants touch it
    const groundTop = Constants.GAME_HEIGHT - 100;
    const variant = variantOverride || (Math.random() < 0.3 ? 'tower' : 'ground');
    if (variant === 'tower') {
      spike.reset(x, groundTop - 120, 'tower');
    } else {
      spike.reset(x, groundTop - 60, 'ground');
    }
  }

  spawnAnimal(x) {
    const animal = this.animalsGroup.getFirst(false);
    if (!animal) return;

    const type = Constants.ANIMAL_TYPES[Math.floor(Math.random() * Constants.ANIMAL_TYPES.length)];
    animal.setType(type);

    // Ground species stand on the ground (top at y=620); the bird flies at jump height
    const groundTop = Constants.GAME_HEIGHT - 100;
    const spec = Constants.ANIMAL_SPECS[type];
    const y = type === 'bird'
      ? Phaser.Math.Between(410, 520)
      : groundTop - (spec.h * Constants.ANIMAL_SCALE) / 2;
    animal.reset(x, y);
  }

  spawnTower(x) {
    const tower = this.towersGroup.getFirst(false);
    if (!tower) return;
    tower.reset(x);
  }

  // Chamado pela TranqTower no momento do disparo
  fireDart(x, y, vx) {
    const dart = this.dartsGroup.getFirst(false);
    if (!dart) return;
    dart.fire(x, y, vx);
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
}
