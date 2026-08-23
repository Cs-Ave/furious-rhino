import { TextureFactory } from '../systems/TextureFactory.js';
import { ART_MANIFEST } from '../art/ArtManifest.js';
import { Constants } from '../utils/Constants.js';
import { SKINS } from '../systems/SkinSystem.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Os sprites vivem em art/*.svg (editáveis em qualquer editor de SVG);
    // as dimensões de rasterização vêm do manifesto gerado, multiplicadas
    // pelo ART_RASTER_SCALE (supersampling para telas de alta densidade)
    const S = Constants.ART_RASTER_SCALE;
    for (const [key, size] of Object.entries(ART_MANIFEST)) {
      this.load.svg(key, 'art/' + key + '.svg', { width: size.w * S, height: size.h * S });
    }

    // Skins: frames derivados do registry, fora do manifesto — o rig é fixo
    // (96x64, o mesmo do rhino-run), então listar cada frame lá só criava um
    // segundo lugar para a página /?setup editar. `pending` fica de fora: os
    // SVGs ainda não existem.
    for (const skin of SKINS) {
      if (!skin.prefix || skin.pending) continue;
      for (const prefix of [skin.prefix, skin.firePrefix].filter(Boolean)) {
        for (const f of [0, 1, 2]) {
          this.load.svg(`${prefix}-${f}`, `art/${prefix}-${f}.svg`, { width: 96 * S, height: 64 * S });
        }
      }
    }
  }

  create() {
    TextureFactory.generate(this);
    this.createAnimations();
    this.scene.start('GameScene');
  }

  createAnimations() {
    this.anims.create({
      key: 'rhino-run',
      frames: [
        { key: 'rhino-run-0', frame: '__BASE' },
        { key: 'rhino-run-1', frame: '__BASE' },
        { key: 'rhino-run-2', frame: '__BASE' },
        { key: 'rhino-run-1', frame: '__BASE' },
      ],
      frameRate: 12,
      repeat: -1,
    });

    // Skins (v1.8): mesmo ciclo ping-pong do rhino-run por skin com arte
    // própria; skins com fúria própria (firePrefix) ganham a anim de rampage
    // também. `pending` fica de fora — os SVGs ainda não existem.
    const pingPong = (prefix) => this.anims.create({
      key: prefix,
      frames: [
        { key: `${prefix}-0`, frame: '__BASE' },
        { key: `${prefix}-1`, frame: '__BASE' },
        { key: `${prefix}-2`, frame: '__BASE' },
        { key: `${prefix}-1`, frame: '__BASE' },
      ],
      frameRate: 12,
      repeat: -1,
    });
    for (const skin of SKINS) {
      if (!skin.prefix || skin.pending) continue;
      pingPong(skin.prefix);
      if (skin.firePrefix) pingPong(skin.firePrefix);
    }

    // Uma anim de bater asas por espécie de pássaro (v1.4: 5 espécies)
    for (const sp of Constants.BIRD_SPECIES) {
      this.anims.create({
        key: `bird-${sp}-flap`,
        frames: [
          { key: `animal-bird-${sp}`, frame: '__BASE' },
          { key: `animal-bird-${sp}-flap`, frame: '__BASE' },
        ],
        frameRate: 8,
        repeat: -1,
      });
    }

    // Corrida dos animais terrestres (2 frames: parado/passada).
    // Macaco e zebra não têm anim: trocam de textura por estado (chão/ar).
    this.anims.create({
      key: 'lion-run',
      frames: [
        { key: 'animal-lion', frame: '__BASE' },
        { key: 'animal-lion-run-1', frame: '__BASE' },
      ],
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: 'giraffe-run',
      frames: [
        { key: 'animal-giraffe', frame: '__BASE' },
        { key: 'animal-giraffe-run-1', frame: '__BASE' },
      ],
      frameRate: 8,
      repeat: -1,
    });

    // FÚRIA TOTAL (v1.7): mesmo ciclo ping-pong do rhino-run, arte de fogo
    this.anims.create({
      key: 'rhino-fire-run',
      frames: [
        { key: 'rhino-fire-run-0', frame: '__BASE' },
        { key: 'rhino-fire-run-1', frame: '__BASE' },
        { key: 'rhino-fire-run-2', frame: '__BASE' },
        { key: 'rhino-fire-run-1', frame: '__BASE' },
      ],
      frameRate: 12,
      repeat: -1,
    });

    // Elenco v1.7 por bioma: pares de 2 frames como o leão/girafa. O sufixo
    // diz o tipo de movimento (run-1 passada, flap asa, alt parte móvel);
    // o lobo-guará fica de fora — troca textura por estado, como a zebra.
    const ENEMY_ANIMS = [
      ['zookeeper', 'run-1', 8], ['peacock', 'run-1', 8], ['ostrich', 'run-1', 10],
      ['hyena', 'run-1', 10], ['buffalo', 'run-1', 8], ['jaguar', 'run-1', 10],
      ['hippo', 'run-1', 8], ['capybara', 'run-1', 8], ['person', 'run-1', 8],
      ['suit', 'run-1', 8],
      ['eagle', 'flap', 8], ['bluebird', 'flap', 8], ['jabiru', 'flap', 8],
      ['snake', 'alt', 4], ['croc', 'alt', 4], ['car', 'alt', 8],
      ['police', 'alt', 4], ['plane', 'alt', 10], ['drone', 'alt', 8],
      ['pickup', 'alt', 6], ['scooter', 'alt', 8],
      // v1.8.7 — o elenco dos distritos (pipa/dronezig ficam fora: o -alt
      // deles é telegraph de zig, não frame de corrida)
      ['viralata', 'run-1', 10], ['pombo', 'flap', 8], ['reporter', 'run-1', 8],
      ['helinews', 'alt', 10], ['tropa', 'run-1', 6], ['dronesent', 'alt', 8],
    ];
    for (const [type, suffix, fps] of ENEMY_ANIMS) {
      this.anims.create({
        key: `${type}-run`,
        frames: [
          { key: `enemy-${type}`, frame: '__BASE' },
          { key: `enemy-${type}-${suffix}`, frame: '__BASE' },
        ],
        frameRate: fps,
        repeat: -1,
      });
    }
  }
}
