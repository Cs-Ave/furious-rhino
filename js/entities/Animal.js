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
    this.nextJumpAt = 0;
    this.bobPhase = 0;
    this.setType(type);

    this.scene.add.existing(this);
  }

  // Applies texture, per-species hitbox and animation.
  // Must run on every (re)spawn: pooled sprites carry the previous species.
  setType(type) {
    this.animalType = type;
    this.anims.stop();
    this.setTexture(`animal-${type}`);
    this.setScale(Constants.ANIMAL_SCALE);
    // A arte olha para a direita, mas eles avançam contra o rino. As margens
    // laterais dos ANIMAL_SPECS são simétricas, então o flip não desloca a hitbox.
    this.setFlipX(true);

    // Arcade scales the body with the sprite, so specs stay in texture pixels
    const spec = Constants.ANIMAL_SPECS[type];
    this.body.setSize(spec.bodyW, spec.bodyH);
    this.body.setOffset(spec.offX, spec.offY);

    const behavior = Constants.ANIMAL_BEHAVIOR[type];
    if (behavior.anim) this.play(behavior.anim);
  }

  reset(x, y) {
    this.setPosition(x, y);
    this.knockedOut = false;
    this.body.enable = true;
    // Terrestres pisam no chão de verdade (collider no GameScene) para os
    // pulos do macaco/zebra terem arco físico; o pássaro voa sem gravidade
    this.body.setAllowGravity(this.animalType !== 'bird');
    this.body.setImmovable(false);
    this.body.setVelocity(-Constants.ANIMAL_BEHAVIOR[this.animalType].speed, 0);
    this.body.setAngularVelocity(0);
    this.setRotation(0);
    this.setAlpha(1);
    this.nextJumpAt = 0;
    this.bobPhase = Math.random() * Math.PI * 2;
    this.setActive(true).setVisible(true);
  }

  // Chamado pelo UpdateList do Phaser todo frame em que o sprite está ativo
  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.knockedOut || !this.body.enable) return;

    const behavior = Constants.ANIMAL_BEHAVIOR[this.animalType];
    // Reaplicada por frame (mesmo padrão do FurySystem com o rino): os
    // sliders do TuningPanel valem na hora para animais já em tela
    this.body.setVelocityX(-behavior.speed);

    if (behavior.jumpV) {
      // Saltadores: no chão, agenda e dispara o próximo pulo; no ar fica
      // congelado na pose esticada até pousar de novo
      if (this.body.blocked.down) {
        if (this.texture.key !== `animal-${this.animalType}`) {
          this.setTexture(`animal-${this.animalType}`);
        }
        if (!this.nextJumpAt) {
          this.nextJumpAt = time + behavior.jumpIntervalMs;
        } else if (time >= this.nextJumpAt) {
          this.body.setVelocityY(behavior.jumpV);
          this.setTexture(behavior.airTexture);
          this.nextJumpAt = 0;
        }
      }
    } else if (behavior.bobVy) {
      // Pássaro: ondulação vertical suave (~±15px) durante o voo
      this.body.setVelocityY(Math.sin(time * 0.004 + this.bobPhase) * behavior.bobVy);
    }
  }

  deactivate() {
    this.anims.stop();
    this.body.enable = false;
    this.body.setAllowGravity(false);
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
