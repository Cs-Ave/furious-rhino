import { Constants } from '../utils/Constants.js';
import { SkinSystem } from '../systems/SkinSystem.js';

export class Rhino {
  constructor(scene, x, y, skin = null) {
    this.scene = scene;
    // v1.8: a skin só troca textura/anim — hitbox, física e âncora da
    // fumaça (narina) são invariantes do rig de 96×64
    this.skin = skin || SkinSystem.get('default');
    this.runAnim = SkinSystem.runAnimKey(this.skin);
    this.fireAnim = SkinSystem.fireAnimKey(this.skin);
    this.sprite = scene.physics.add.sprite(x, y, SkinSystem.textureKey(this.skin, 0))
      .setOrigin(0.5, 1);
    // World bounds only check the ceiling (configured in GameScene) so the
    // infinite jump can't fly the rhino out of the scene
    this.sprite.body.setCollideWorldBounds(true);
    this.applyVisualScale(Constants.RHINO_VISUAL_SCALE);
    this.sprite.body.setVelocityX(Constants.RUN_SPEED);
    this.sprite.play(this.runAnim);

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

  // Escala VISUAL do rino (v1.8.1: +15% porque as skins vetorizadas são mais
  // magras e o leão de 1.5x passava o protagonista). A hitbox NÃO acompanha:
  // o Arcade multiplica tamanho E offset do body pela escala do sprite, então
  // os valores em px de textura são divididos por k para o body continuar
  // 76×54 px de MUNDO — todo o tuning de campo (rampas, boss, dardos) segue
  // valendo. Fundo do body colado nos pés e centro-x 2px à esquerda do centro
  // do sprite, como sempre (k=1 reproduz os 8/10 históricos). Chamado no boot
  // e pelo slider do TuningPanel (calibração ao vivo).
  applyVisualScale(k) {
    const S = Constants.ART_RASTER_SCALE; // textura 2x, exibida a k/2 (nitidez)
    this.sprite.setScale(k / S);
    this.sprite.body.setSize(76 * S / k, 54 * S / k);
    this.sprite.body.setOffset((48 * k - 40) * S / k, (64 * k - 54) * S / k);
  }

  // v1.8: troca de skin com o jogo carregado (hub na tela inicial e o
  // refresh de rank do boot). Nunca toca em setSize/setOffset.
  setSkin(skin) {
    this.skin = skin;
    this.runAnim = SkinSystem.runAnimKey(skin);
    this.fireAnim = SkinSystem.fireAnimKey(skin);
    this.sprite.setTexture(SkinSystem.textureKey(skin, 0));
    this.sprite.play(this.runAnim, true);
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
