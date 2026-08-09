import { Constants } from '../utils/Constants.js';

export class Rhino {
  constructor(scene, x, y) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, y, 'rhino-run-0').setOrigin(0.5, 1);
    // Textura rasterizada a 2x, exibida a 1/2 (nitidez); Arcade escala o body
    // junto, então os setSize/setOffset abaixo (em px de textura) multiplicam
    // pelo mesmo fator e o tamanho em mundo fica idêntico ao de sempre
    const S = Constants.ART_RASTER_SCALE;
    this.sprite.setScale(1 / S);
    // World bounds only check the ceiling (configured in GameScene) so the
    // infinite jump can't fly the rhino out of the scene
    this.sprite.body.setCollideWorldBounds(true);
    // Trim horn tip (front) and tail (back) out of the hitbox; body bottom
    // stays flush with the sprite bottom (10 + 54 = 64) so feet touch ground
    this.sprite.body.setSize(76 * S, 54 * S);
    this.sprite.body.setOffset(8 * S, 10 * S);
    this.sprite.body.setVelocityX(Constants.RUN_SPEED);
    this.sprite.play('rhino-run');

    this.jumpCount = 0;
    this.isChargingJump = false;
    this.jumpHoldStart = 0;

    this.dashState = 'idle'; // idle | active | cooldown
    this.dashTimer = 0;
    this.cooldownTimer = 0;
    this.wasAirborneDash = false;
    this.dashRefunded = false; // torre derrubada nesta investida: sem cooldown
    // Quique do portão-fortaleza (v1.7): janela em que o FurySystem NÃO
    // reescreve velocityX. Contador por delta (não timestamp): congela junto
    // com a cena numa pausa e retoma exato.
    this.knockbackMsLeft = 0;
  }

  update(time, delta) {
    if (this.knockbackMsLeft > 0) this.knockbackMsLeft -= delta;

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
        // Torre derrubada nesta investida: sem cooldown (ver resetDash)
        this.dashState = this.dashRefunded ? 'idle' : 'cooldown';
        this.dashRefunded = false;
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

  // Recompensa por derrubar uma torre: a investida volta na hora. A colisão
  // acontece com o dash AINDA ATIVO, então não dá para pular para 'idle' aqui
  // — isso deixaria a gravidade desligada e a velocidade travada em 750. Em
  // vez disso marca o estorno, e o fim natural do dash pula o cooldown.
  resetDash() {
    if (this.dashState === 'active') this.dashRefunded = true;
    else { this.dashState = 'idle'; this.cooldownTimer = 0; }
  }

  // Quique do portão blindado (v1.7): arremessa o rino para trás e abre a
  // janela em que o FurySystem não reescreve velocityX — a reescrita por
  // frame é a causa documentada do soft-lock das rampas (ver Constants.js).
  // O stun É o knockback: o cooldown restante termina junto com a janela do
  // quique, então quando o controle volta a investida volta JUNTO. Com o
  // cooldown cheio (1s) o ciclo do quique (~1,3s) deixava uma janela de
  // milissegundos colada no portão — impossível de acertar no toque.
  beginKnockback(vx, vy, ms) {
    this.knockbackMsLeft = ms;
    if (this.dashState === 'active' && this.wasAirborneDash) {
      // Cancela o dash aéreo com segurança: religa a gravidade, senão o
      // rino sai do quique flutuando (mesma armadilha do resetDash)
      this.sprite.body.setAllowGravity(true);
    }
    this.wasAirborneDash = false;
    this.dashRefunded = false;
    this.dashState = 'cooldown';
    this.cooldownTimer = Math.max(0, Constants.DASH_COOLDOWN_MS - ms);
    this.sprite.body.setVelocity(vx, vy);
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
