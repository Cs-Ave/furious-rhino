import { Constants } from '../utils/Constants.js';

export class CrackedWall extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, height = 720) {
    super(scene, x, y, 'cracked-ground');
    this.scene.physics.world.enable(this);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.setOrigin(0.5, 0);

    this.wallHeight = height;
    this.broken = false;
    this.crackHeight = 'ground';

    this.scene.add.existing(this);
    this.scene.physics.add.existing(this);
  }

  setCrackHeight(height) {
    this.crackHeight = height;
    const textureKey = `cracked-${height}`;
    this.setTexture(textureKey);
  }

  getCrackBounds() {
    const pos = Constants.CRACK_HEIGHTS[this.crackHeight.toUpperCase()];
    const center = this.y + pos * this.wallHeight;
    return {
      top: center - Constants.CRACK_BAND_HALF,
      bottom: center + Constants.CRACK_BAND_HALF,
    };
  }

  break() {
    if (this.broken) return;
    this.broken = true;
    this.setTexture(`cracked-${this.crackHeight}-broken`);
    this.body.enable = false;
  }

  reset(x) {
    this.setPosition(x, 0);
    this.broken = false;
    this.setTexture(`cracked-${this.crackHeight}`);
    this.body.enable = true;
    this.setActive(true).setVisible(true);
  }

  deactivate() {
    this.broken = false;
    this.body.enable = false;
    this.setActive(false).setVisible(false);
  }
}
