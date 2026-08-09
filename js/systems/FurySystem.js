import { Constants } from '../utils/Constants.js';

// v1.7: a fúria deixou de ser posicional (era Rhino.getFuryRatio = x/36000,
// monotônica) e virou uma CARGA: acumula por distância percorrida — a
// primeira carga reproduz exatamente a curva antiga — e é GASTA no especial
// FÚRIA TOTAL (rino em chamas, invencível, tudo explode, medidor drenando).
// O modo vive AQUI porque este sistema reescreve velocityX e o tint do rino
// todo frame: implementado por fora, seria sobrescrito no frame seguinte.
export class FurySystem {
  constructor(scene) {
    this.scene = scene;
    this.furyRatio = 0;   // = charge; nome mantido (ícone/tint/fumaça leem)
    this.charge = 0;      // 0..1, acumula por dx, drena no rampage
    this.rampage = false; // FÚRIA TOTAL ativa
    this.lastX = null;
    this.pulseTween = null;
    // Callbacks ligados pelo GameScene (toast/sons/flash ficam na cena)
    this.onActivate = null; // toque no ícone (pede ativação; a cena decide)
    this.onFull = null;     // medidor acabou de encher
    this.onEnd = null;      // rampage terminou (drenagem chegou a zero)

    // Fire icon next to the dash cooldown icon, same fill-from-bottom style
    const iconX = Constants.GAME_WIDTH - Constants.HUD_MARGIN - 130;
    const iconY = Constants.HUD_MARGIN + 30;

    // Texturas 2x: exibe a 1/2 (o setCrop do updateFireIcon usa px de textura)
    const iconScale = 1 / Constants.ART_RASTER_SCALE;
    this.fireIconEmpty = scene.add.sprite(iconX, iconY, 'fury-fire-empty')
      .setScrollFactor(0).setDepth(100).setScale(iconScale);
    this.fireIconFull = scene.add.sprite(iconX, iconY, 'fury-fire-full')
      .setScrollFactor(0).setDepth(101).setScale(iconScale);

    // O ícone fica na metade DIREITA da tela — a zona do toque de dash. O
    // stopPropagation cancela o POINTER_DOWN global do setupInput (ordem
    // garantida pelo InputPlugin: GAMEOBJECT_DOWN sai antes), então tocar no
    // medidor NUNCA dispara investida. HitArea ampliada (200px de textura =
    // 100px de tela) porque 60x60 é pequeno para dedo.
    this.fireIconEmpty.setInteractive(
      new Phaser.Geom.Rectangle(-40, -40, 200, 200),
      Phaser.Geom.Rectangle.Contains
    );
    this.fireIconEmpty.on('pointerdown', (pointer, lx, ly, event) => {
      event.stopPropagation();
      if (this.onActivate) this.onActivate();
    });

    // Manual-emission smoke emitter in world space (follows the rhino's snout)
    this.smokeEmitter = scene.add.particles(0, 0, 'smoke-puff', {
      speed: { min: 10, max: 40 },
      angle: { min: 250, max: 290 },
      alpha: { start: 0.6, end: 0 },
      scale: { start: 0.4, end: 1.2 },
      lifespan: 700,
      frequency: -1,
    });
    this.smokeEmitter.setDepth(5);
  }

  update(rhino, delta = 16.7) {
    const sprite = rhino.getSprite();

    // Carga por distância percorrida (dx do frame), nunca por posição
    // absoluta: depois de gastar, cada FURY_FULL_DISTANCE_PX recarrega
    if (this.lastX === null) this.lastX = sprite.x;
    const dx = Math.max(0, sprite.x - this.lastX);
    this.lastX = sprite.x;

    if (this.rampage) {
      this.charge -= delta / Constants.SPECIAL_DURATION_MS;
      if (this.charge <= 0) {
        this.charge = 0;
        this.endRampage(rhino);
      } else {
        this.updateRampageFx(sprite);
      }
    } else {
      const wasFull = this.charge >= 1;
      this.charge = Math.min(1, this.charge + dx / Constants.FURY_FULL_DISTANCE_PX);
      if (!wasFull && this.charge >= 1) this.signalFull();
    }
    this.furyRatio = this.charge;

    this.updateFireIcon();
    this.updateRhinoTint(rhino);
    this.updateSmoke(rhino);

    // Quique do boss (v1.7): enquanto o contador corre, a reescrita por
    // frame NÃO roda — é ela que causaria o soft-lock (o rino tremendo
    // parado contra o portão, como as rampas com corpo). O recuo decai
    // exponencialmente e, quando o contador zera, o bloco normal volta a
    // acelerar o rino para frente sozinho.
    if (rhino.knockbackMsLeft > 0) {
      sprite.body.velocity.x *= Math.pow(0.92, delta / 16.7);
      return;
    }

    // Durante o rampage o fator de fúria fica TRAVADO no máximo (o medidor
    // drenando não pode frear o rino em chamas) e entra o boost do especial
    const furyFactor = this.rampage ? 1.5 : 1 + this.furyRatio * 0.5;
    const specialMult = this.rampage ? Constants.SPECIAL_SPEED_MULT : 1;
    sprite.body.setVelocityX(
      (rhino.dashState === 'active' ? Constants.DASH_SPEED : Constants.RUN_SPEED)
      * furyFactor * specialMult
    );
  }

  // Medidor encheu: pulso no ícone + aviso da cena (toast/som). O pulso fica
  // até o jogador gastar — é a sinalização pedida de "dá para usar AGORA".
  signalFull() {
    if (!this.pulseTween) {
      const base = 1 / Constants.ART_RASTER_SCALE;
      this.pulseTween = this.scene.tweens.add({
        targets: [this.fireIconFull, this.fireIconEmpty],
        scale: { from: base, to: base * 1.22 },
        duration: 380,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    if (this.onFull) this.onFull();
  }

  stopPulse() {
    if (this.pulseTween) {
      this.pulseTween.stop();
      this.pulseTween = null;
      const base = 1 / Constants.ART_RASTER_SCALE;
      this.fireIconFull.setScale(base);
      this.fireIconEmpty.setScale(base);
    }
  }

  // Pedido de ativação (toque no ícone, ↓ ou SHIFT). true = transformou.
  activate(rhino) {
    if (this.rampage || this.charge < 1) return false;
    this.rampage = true;
    this.stopPulse();
    const sprite = rhino.getSprite();
    sprite.clearTint(); // a arte de fogo tem as próprias cores
    sprite.play('rhino-fire-run', true);
    return true;
  }

  endRampage(rhino) {
    this.rampage = false;
    const sprite = rhino.getSprite();
    sprite.setAlpha(1);
    sprite.play('rhino-run', true);
    if (this.onEnd) this.onEnd();
  }

  // Reta final do modo: rino e ícone piscam avisando que o fogo vai apagar
  updateRampageFx(sprite) {
    const leftMs = this.charge * Constants.SPECIAL_DURATION_MS;
    if (leftMs < Constants.SPECIAL_WARN_MS) {
      const blink = 0.65 + 0.35 * Math.sin(this.scene.time.now * 0.03);
      sprite.setAlpha(blink);
      this.fireIconFull.setAlpha(blink);
    } else {
      sprite.setAlpha(1);
      this.fireIconFull.setAlpha(1);
    }
  }

  updateFireIcon() {
    // Bottom-up reveal of the colored flame, same math as the dash icon
    // (setCrop em px de TEXTURA, rasterizada a 2x)
    const size = Constants.DASH_ICON_SIZE * Constants.ART_RASTER_SCALE;
    const h = size * this.furyRatio;
    this.fireIconFull.setCrop(0, size - h, size, h);
  }

  updateRhinoTint(rhino) {
    // Em chamas o sprite já é a arte de fogo: tint algum (seria sobreposto)
    if (this.rampage) return;
    // Tint multiplies the texture: white = no change, so interpolate
    // white -> red for a red flush that never darkens the light-gray art
    const blended = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.IntegerToColor(0xffffff),
      Phaser.Display.Color.IntegerToColor(Constants.COLORS.redFury),
      100,
      Math.floor(this.furyRatio * 60) // subtle: never fully red, always recognizably gray
    );
    const tint = Phaser.Display.Color.GetColor(blended.r, blended.g, blended.b);
    rhino.getSprite().setTint(tint);
  }

  updateSmoke(rhino) {
    const sprite = rhino.getSprite();
    const snoutX = sprite.x + Constants.SNOUT_OFFSET_X;
    const snoutY = sprite.y + Constants.SNOUT_OFFSET_Y;

    // Emission probability per frame scales with fury (none when calm);
    // em chamas, fumaça no talo — o rastro faz parte do espetáculo
    const chance = this.rampage
      ? 0.8
      : Phaser.Math.Linear(0.01, 0.3, this.furyRatio);
    if (Math.random() < chance) {
      this.smokeEmitter.emitParticleAt(snoutX, snoutY);
    }
  }

  // Música: intensidade travada no teto durante o show; senão, segue a carga
  getIntensityRatio() {
    return this.rampage ? 1 : this.charge;
  }
}
