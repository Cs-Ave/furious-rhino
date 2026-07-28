import { Constants } from '../utils/Constants.js';

export class Rhino {
  constructor(scene, x, y) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, y, 'rhino-run-0').setOrigin(0.5, 1);
    // World bounds only check the ceiling (configured in GameScene) so the
    // infinite jump can't fly the rhino out of the scene
    this.sprite.body.setCollideWorldBounds(true);
    // Trim horn tip (front) and tail (back) out of the hitbox; body bottom
    // stays flush with the sprite bottom (10 + 54 = 64) so feet touch ground
    this.sprite.body.setSize(76, 54);
    this.sprite.body.setOffset(8, 10);
    this.sprite.body.setVelocityX(Constants.RUN_SPEED);
    this.sprite.play('rhino-run');

    this.jumpCount = 0;
    this.isChargingJump = false;
    this.jumpHoldStart = 0;

    this.dashState = 'idle'; // idle | active | cooldown
    this.dashTimer = 0;
    this.cooldownTimer = 0;
    this.wasAirborneDash = false;
  }

  update(time, delta) {
    // Reset jump count on landing
    if (this.sprite.body.blocked.down && this.jumpCount > 0) {
      this.jumpCount = 0;
      this.isChargingJump = false;
    }

    // Run cycle: freeze mid-air, resume on ground, double-time while dashing
    if (this.sprite.body.blocked.down) {
      if (this.sprite.anims.isPaused) this.sprite.anims.resume();
    } else if (!this.sprite.anims.isPaused) {
      this.sprite.anims.pause();
    }
    this.sprite.anims.timeScale = this.dashState === 'active' ? 2 : 1;

    // Faster fall: extra gravity only while descending (dash disables
    // allowGravity entirely, so airborne dashes are unaffected)
    this.sprite.body.setGravityY(
      this.sprite.body.velocity.y > 0 ? Constants.FALL_EXTRA_GRAVITY : 0
    );

    // Update jump charge
    if (this.isChargingJump) {
      const elapsed = time - this.jumpHoldStart;
      const t = Math.min(elapsed / Constants.JUMP_CHARGE_MS, 1);
      const targetV = Phaser.Math.Linear(Constants.JUMP_MIN_V, Constants.JUMP_MAX_V, t);
      if (this.sprite.body.velocity.y < 0 && this.sprite.body.velocity.y > targetV) {
        this.sprite.body.setVelocityY(targetV);
      }
    }

    // Update dash state
    if (this.dashState === 'active') {
      this.dashTimer += delta;
      if (this.dashTimer >= Constants.DASH_ACTIVE_MS) {
        if (this.wasAirborneDash) {
          this.sprite.body.setAllowGravity(true);
        }
        this.sprite.body.setVelocityX(Constants.RUN_SPEED);
        this.dashState = 'cooldown';
        this.cooldownTimer = 0;
      }
    } else if (this.dashState === 'cooldown') {
      this.cooldownTimer += delta;
      if (this.cooldownTimer >= Constants.DASH_COOLDOWN_MS) {
        this.dashState = 'idle';
      }
    }
  }

  onLeftPress() {
    // Infinite jumps: every tap launches (flappy-style chaining)
    this.jumpCount++;
    this.isChargingJump = true;
    this.jumpHoldStart = this.scene.time.now;
    this.sprite.body.setVelocityY(Constants.JUMP_MIN_V);
  }

  onLeftRelease() {
    this.isChargingJump = false;
  }

  // Returns true only when the dash actually activates (lets the caller
  // play the whoosh SFX without sounding on cooldown spam)
  onRightPress() {
    if (this.dashState !== 'idle') return false;
    this.dashState = 'active';
    this.dashTimer = 0;
    this.wasAirborneDash = !this.sprite.body.blocked.down;
    if (this.wasAirborneDash) {
      this.sprite.body.setAllowGravity(false);
      this.sprite.body.setVelocityY(0);
    }
    this.sprite.body.setVelocityX(Constants.DASH_SPEED);
    return true;
  }

  kill() {
    this.sprite.anims.stop();
    this.sprite.setActive(false).setVisible(false);
    this.sprite.body.stop();
  }

  getDashCooldownRatio() {
    if (this.dashState === 'cooldown') {
      return this.cooldownTimer / Constants.DASH_COOLDOWN_MS;
    }
    return this.dashState === 'idle' ? 1 : 0;
  }

  getDistance() {
    return Math.floor(this.sprite.x / Constants.PIXELS_PER_METER);
  }

  getFuryRatio() {
    return Math.min(this.sprite.x / Constants.FURY_FULL_DISTANCE_PX, 1);
  }

  getSprite() {
    return this.sprite;
  }
}
