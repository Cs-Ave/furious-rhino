import { TextureFactory } from '../systems/TextureFactory.js';
import { SVG_TEXTURES } from '../art/SvgSprites.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Phaser decodes data-URIs with atob(), so the payload must be base64
    // (the SVG strings are pure ASCII, safe for btoa)
    for (const [key, def] of Object.entries(SVG_TEXTURES)) {
      this.load.svg(
        key,
        'data:image/svg+xml;base64,' + btoa(def.svg),
        { width: def.w, height: def.h }
      );
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
