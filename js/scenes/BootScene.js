import { TextureFactory } from '../systems/TextureFactory.js';
import { ART_MANIFEST } from '../art/ArtManifest.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Os sprites vivem em art/*.svg (editáveis em qualquer editor de SVG);
    // as dimensões de rasterização vêm do manifesto gerado
    for (const [key, size] of Object.entries(ART_MANIFEST)) {
      this.load.svg(key, 'art/' + key + '.svg', { width: size.w, height: size.h });
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

    this.anims.create({
      key: 'bird-flap',
      frames: [
        { key: 'animal-bird', frame: '__BASE' },
        { key: 'animal-bird-flap', frame: '__BASE' },
      ],
      frameRate: 8,
      repeat: -1,
    });
  }
}
