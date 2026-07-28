import { Constants } from '../utils/Constants.js';

export class Animal extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type = 'lion') {
    super(scene, x, y, `animal-${type}`);
    this.scene.physics.world.enable(this);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.setOrigin(0.5, 0.5);

    this.animalType = type;
    this.knockedOut = false;
    this.setType(type);

    this.scene.add.existing(this);
  }

  // Applies texture, per-species hitbox and the bird's flap animation.
  // Must run on every (re)spawn: pooled sprites carry the previous species.
  setType(type) {
    this.animalType = type;
    this.anims.stop();
    this.setTexture(`animal-${type}`);
    this.setScale(Constants.ANIMAL_SCALE);

    // Arcade scales the body with the sprite, so specs stay in texture pixels
    const spec = Constants.ANIMAL_SPECS[type];
    this.body.setSize(spec.bodyW, spec.bodyH);
    this.body.setOffset(spec.offX, spec.offY);

    if (type === 'bird') {
      this.play('bird-flap');
    }
  }

  reset(x, y) {
    this.setPosition(x, y);
    this.knockedOut = false;
    this.body.enable = true;
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.body.setVelocity(0, 0);
    this.body.setAngularVelocity(0);
    this.setRotation(0);
    this.setAlpha(1);
    this.setActive(true).setVisible(true);
  }

  deactivate() {
    this.anims.stop();
    this.body.enable = false;
    this.body.setVelocity(0, 0);
    this.body.setAngularVelocity(0);
    this.setActive(false).setVisible(false);
  }

  knockback() {
    if (this.knockedOut) return;
    this.knockedOut = true;
    this.anims.stop();
    this.body.setAllowGravity(true);
    this.body.setImmovable(false);
    this.body.setVelocity(
      Phaser.Math.Between(-400, -200),
      Phaser.Math.Between(-600, -300)
    );
    this.body.setAngularVelocity(Phaser.Math.Between(-400, 400));
  }
}
