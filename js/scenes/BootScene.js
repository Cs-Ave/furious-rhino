import { TextureFactory } from '../systems/TextureFactory.js';
import { ART_MANIFEST } from '../art/ArtManifest.js';
import { Constants } from '../utils/Constants.js';

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
