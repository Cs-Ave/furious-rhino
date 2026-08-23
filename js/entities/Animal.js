import { Constants } from '../utils/Constants.js';

export class Animal extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type = 'lion') {
    // Textura provisória válida (o 'bird' não tem textura própria: são 5
    // espécies animal-bird-<sp>); o setType logo abaixo aplica a definitiva
    super(scene, x, y, 'animal-lion');
    this.scene.physics.world.enable(this);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.setOrigin(0.5, 0.5);

    this.animalType = type;
    this.knockedOut = false;
    this.nextJumpAt = 0;
    this.bobPhase = 0;
    // v1.8.7 — estado dos padrões novos (ideia J): zig-zag e atirador
    this.zigDir = 1;
    this.zigFlashUntil = 0;
    this.nextShotAt = 0;
    this.setType(type);

    this.scene.add.existing(this);
  }

  // Applies texture, per-species hitbox and animation.
  // Must run on every (re)spawn: pooled sprites carry the previous species.
  setType(type) {
    this.animalType = type;
    this.anims.stop();
    const spec = Constants.ANIMAL_SPECS[type];
    if (type === 'bird') {
      // Pássaro tem 5 espécies visuais (mesma hitbox/behavior): sorteia a
      // cada (re)spawn — o pool devolve o mesmo sprite com outra plumagem
      const sp = Phaser.Utils.Array.GetRandom(Constants.BIRD_SPECIES);
      this.baseTex = `animal-bird-${sp}`;
      this.birdAnim = `bird-${sp}-flap`;
    } else {
      // Elenco v1.7 usa o prefixo enemy-* (spec.tex); os 5 originais, animal-*
      this.baseTex = spec.tex || `animal-${type}`;
      this.birdAnim = null;
    }
    this.setTexture(this.baseTex);
    // Texturas 2x exibidas a 1/2: a escala final divide pelo ART_RASTER_SCALE.
    // Veículos/voadores da cidade têm escala própria (spec.scale).
    const S = Constants.ART_RASTER_SCALE;
    this.setScale((spec.scale || Constants.ANIMAL_SCALE) / S);
    // A arte olha para a direita, mas eles avançam contra o rino. As margens
    // laterais dos ANIMAL_SPECS são simétricas, então o flip não desloca a hitbox.
    this.setFlipX(true);

    // Arcade scales the body with the sprite; specs ficam em px lógicos (1x)
    // e viram px de textura multiplicando pelo fator de rasterização
    this.body.setSize(spec.bodyW * S, spec.bodyH * S);
    this.body.setOffset(spec.offX * S, spec.offY * S);

    const behavior = Constants.ANIMAL_BEHAVIOR[type];
    if (this.birdAnim) this.play(this.birdAnim);
    else if (behavior.anim) this.play(behavior.anim);
  }

  reset(x, y) {
    this.setPosition(x, y);
    this.knockedOut = false;
    this.body.enable = true;
    // Terrestres pisam no chão de verdade (collider no GameScene) para os
    // pulos do macaco/zebra terem arco físico; voadores (pássaro, águia,
    // drone, avião...) voam sem gravidade
    this.body.setAllowGravity(!this.isFlyer());
    this.body.setImmovable(false);
    this.body.setVelocity(-Constants.ANIMAL_BEHAVIOR[this.animalType].speed, 0);
    this.body.setAngularVelocity(0);
    this.setRotation(0);
    this.setAlpha(1);
    this.nextJumpAt = 0;
    this.bobPhase = Math.random() * Math.PI * 2;
    // v1.8.7: zig começa numa direção sorteada (variedade sem injustiça — a
    // banda clampa dos dois lados) e o atirador desarmado, sem tint herdado
    this.zigDir = Math.random() < 0.5 ? -1 : 1;
    this.zigFlashUntil = 0;
    this.nextShotAt = 0;
    this.clearTint();
    this.setActive(true).setVisible(true);
  }

  // Chamado pelo UpdateList do Phaser todo frame em que o sprite está ativo
  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.knockedOut || !this.body.enable) return;

    const behavior = Constants.ANIMAL_BEHAVIOR[this.animalType];
    // Reaplicada por frame (mesmo padrão do FurySystem com o rino): sliders
    // do TuningPanel e o multiplicador do tier valem na hora em tela
    this.body.setVelocityX(-behavior.speed * Constants.TIER_STATE.animalSpeedMult);

    if (behavior.jumpV) {
      // Saltadores: no chão, agenda e dispara o próximo pulo; no ar fica
      // congelado na pose esticada até pousar de novo
      if (this.body.blocked.down) {
        if (this.texture.key !== this.baseTex) {
          this.setTexture(this.baseTex);
        }
        if (!this.nextJumpAt) {
          this.nextJumpAt = time + behavior.jumpIntervalMs;
        } else if (time >= this.nextJumpAt) {
          this.body.setVelocityY(behavior.jumpV);
          this.setTexture(behavior.airTexture);
          this.nextJumpAt = 0;
        }
      }
    } else if (behavior.zig) {
      // v1.8.7 — zig-zag (pipa, drone de choque): onda TRIANGULAR, não seno —
      // vy constante com flip quando sai da banda (clamp). No flip, o frame
      // de detalhe pisca (~120ms): rabiola girando / LED — o telegraph
      // diegético do zag.
      const [minY, maxY] = behavior.zig.band;
      if ((this.zigDir < 0 && this.y <= minY) ||
          (this.zigDir > 0 && this.y >= maxY)) {
        this.zigDir = -this.zigDir;
        this.y = Phaser.Math.Clamp(this.y, minY, maxY);
        this.zigFlashUntil = time + 120;
        const alt = `${this.baseTex}-alt`;
        if (this.scene.textures.exists(alt)) this.setTexture(alt);
        else this.setTintFill(0xffffff); // sem frame -alt: flash curto
      }
      if (this.zigFlashUntil && time >= this.zigFlashUntil) {
        this.zigFlashUntil = 0;
        this.clearTint();
        if (this.texture.key !== this.baseTex) this.setTexture(this.baseTex);
      }
      this.body.setVelocityY(this.zigDir * behavior.zig.vy);
    } else if (behavior.bobVy) {
      // Voadores: ondulação vertical suave (~±15px) durante o voo
      this.body.setVelocityY(Math.sin(time * 0.004 + this.bobPhase) * behavior.bobVy);
    }

    // v1.8.7 — atirador (camionete, drone-sentinela): independente do padrão
    // de movimento, reusa fireDart/telegraph/onDartHit que já existem
    if (behavior.shoot) this.updateShoot(time, behavior);
  }

  // Padrão `shoot` (molde da TranqTower): telegraph em setTintFill piscante
  // por telegraphMs e então UM disparo via SpawnManager.fireDart.
  //   aimed  — tiro mirado no corpo do rino; sem ele, reto horizontal e só
  //            quando a distância ao rino cai na janela `range`
  //   cap    — teto de exemplares do MESMO tipo engajados (armados) em tela
  //   intervalMs — cadência contínua; sem ele, re-arma só se as condições
  //            voltarem a valer (na prática, 1 dardo por janela de range)
  updateShoot(time, behavior) {
    if (this.scene.physics.world.isPaused) return;
    const cfg = behavior.shoot;

    // Engajado só em tela (mesma régua da torre) — fora dela, desarma
    const cam = this.scene.cameras.main;
    const onScreen = this.x > cam.scrollX - 100 &&
      this.x < cam.scrollX + cam.width + 20;
    if (!onScreen) {
      if (this.nextShotAt) this.clearTint();
      this.nextShotAt = 0;
      return;
    }

    const rhino = this.scene.rhino.getSprite();

    if (!this.nextShotAt) {
      if (!cfg.aimed) {
        const dist = this.x - rhino.x;
        if (dist < cfg.range[0] || dist > cfg.range[1]) return;
      }
      // Cap: se já existe outro exemplar do MESMO tipo engajado em tela
      // (nextShotAt armado), este não atira — contagem no grupo do pool
      if (cfg.cap) {
        const peers = this.scene.spawnManager.getAnimalsGroup().children.entries;
        let firing = 0;
        for (let i = 0; i < peers.length; i++) {
          const a = peers[i];
          if (a !== this && a.active && !a.knockedOut &&
              a.animalType === this.animalType && a.nextShotAt) firing++;
        }
        if (firing >= cfg.cap) return;
      }
      this.nextShotAt = time + (cfg.intervalMs || cfg.telegraphMs);
      return;
    }

    // Telegraph: pisca nos últimos telegraphMs antes do disparo
    if (time >= this.nextShotAt - cfg.telegraphMs && time < this.nextShotAt) {
      if (Math.floor(time / 70) % 2 === 0) this.setTintFill(0xffee88);
      else this.clearTint();
    }

    if (time >= this.nextShotAt) {
      this.clearTint();
      const dx = rhino.x - this.x;
      const dy = (rhino.y - 30) - this.y; // centro do corpo (origem = pé)
      let vx, vy;
      if (cfg.aimed) {
        const len = Math.hypot(dx, dy) || 1;
        vx = (dx / len) * cfg.dartSpeed;
        vy = (dy / len) * cfg.dartSpeed;
      } else {
        vx = (dx >= 0 ? 1 : -1) * cfg.dartSpeed; // reto, à altura do cano
        vy = 0;
      }
      this.scene.spawnManager.fireDart(this.x, this.y, vx, vy);
      this.scene.audio.playDart();
      this.nextShotAt = cfg.intervalMs ? time + cfg.intervalMs : 0;
    }
  }

  // Pássaro e todo o elenco com behavior.fly OU behavior.zig (a banda do
  // zig-zag é aérea) — o collider do chão e o snap de rampa filtram por aqui
  isFlyer() {
    const behavior = Constants.ANIMAL_BEHAVIOR[this.animalType];
    return this.animalType === 'bird' || !!behavior.fly || !!behavior.zig;
  }

  deactivate() {
    this.anims.stop();
    this.body.enable = false;
    this.body.setAllowGravity(false);
    this.body.setVelocity(0, 0);
    this.body.setAngularVelocity(0);
    // v1.8.7: estado de zig/atirador não pode vazar pelo pool (molde do
    // nextJumpAt) — nem o tint de telegraph/flash
    this.zigFlashUntil = 0;
    this.nextShotAt = 0;
    this.clearTint();
    this.setActive(false).setVisible(false);
  }

  knockback() {
    if (this.knockedOut) return;
    this.knockedOut = true;
    this.anims.stop();
    this.clearTint(); // atirador atropelado no meio do telegraph não tomba amarelo
    this.body.setAllowGravity(true);
    this.body.setImmovable(false);
    // Voa para a diagonal superior DIREITA (v1.8, pedido do dono — era
    // esquerda e mais lento); a rotação continua a mesma
    this.body.setVelocity(
      Phaser.Math.Between(Constants.ANIMAL_KB_VX_MIN, Constants.ANIMAL_KB_VX_MAX),
      Phaser.Math.Between(Constants.ANIMAL_KB_VY_MIN, Constants.ANIMAL_KB_VY_MAX)
    );
    this.body.setAngularVelocity(Phaser.Math.Between(-400, 400));
  }
}
