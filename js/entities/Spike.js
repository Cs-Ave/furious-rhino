import { Constants } from '../utils/Constants.js';

export class Spike extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'spike');
    this.scene.physics.world.enable(this);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.setOrigin(0.5, 0);
    this.setVariant('ground');

    this.scene.add.existing(this);
  }

  // 'ground': spike row sitting on the ground.
  // 'tower': spike row on a brick pedestal down to the ground (nothing floats);
  // the pedestal is lethal too, consistent with walls.
  setVariant(variant) {
    this.variant = variant;
    if (variant === 'tower') {
      this.setTexture('spike-tower');
      this.body.setSize(72, 116);
      this.body.setOffset(14, 4);
    } else {
      this.setTexture('spike');
      this.body.setSize(92, 42);
      this.body.setOffset(4, 16);
    }
  }

  reset(x, y, variant = 'ground') {
    this.setVariant(variant);
    this.setPosition(x, y);
    this.body.enable = true;
    this.setActive(true).setVisible(true);
  }

  deactivate() {
    this.body.enable = false;
    this.setActive(false).setVisible(false);
  }
}
