import { Constants } from '../utils/Constants.js';

// Torre medieval do zoológico que atira dardos tranquilizantes no fujão.
// Pooled (molde: Spike.js); a cadência e a velocidade do dardo vêm do tier
// da POSIÇÃO da torre. Counterplay: pular o dardo ou derrubar a torre no dash.
export class TranqTower extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'tranq-tower');
    this.scene.physics.world.enable(this);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.setOrigin(0.5, 0);
    this.body.setSize(64, 112);
    this.body.setOffset(10, 8);
    this.nextShotAt = 0;

    this.scene.add.existing(this);
  }

  reset(x) {
    // Ground top is at GAME_HEIGHT - 100 (y=620); a torre pisa no chão
    this.setPosition(x, Constants.GAME_HEIGHT - 100 - 120);
    this.body.enable = true;
    this.nextShotAt = 0;
    this.clearTint();
    this.setActive(true).setVisible(true);
  }

  // Chamado pelo UpdateList do Phaser todo frame em que o sprite está ativo
  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body.enable) return;
    // Física pausada (pré-start, game over, cutscene): torre não atira
    if (this.scene.physics.world.isPaused) return;

    // Engajada enquanto estiver visível: atira na aproximação E pelas
    // costas de quem passa direto sem derrubá-la (até reciclar)
    const cam = this.scene.cameras.main;
    const onScreen = this.x > cam.scrollX - 100 && this.x < cam.scrollX + cam.width + 20;
    if (!onScreen) {
      this.nextShotAt = 0;
      this.clearTint();
      return;
    }

    const tier = Constants.getTierFor(this.x);
    // 1º tiro imediato (só o telegraph); os seguintes na cadência do tier
    if (!this.nextShotAt) this.nextShotAt = time + Constants.TOWER_FIRST_SHOT_MS;

    // Telegraph: a seteira pisca ~280ms antes do disparo
    if (time >= this.nextShotAt - 280) {
      if (Math.floor(time / 70) % 2 === 0) this.setTintFill(0xffee88);
      else this.clearTint();
    }

    if (time >= this.nextShotAt) {
      this.clearTint();
      // Mira no rino onde ele estiver: frente, por cima ou já tendo passado
      const rhino = this.scene.rhino.getSprite();
      const mx = this.x;
      const my = this.y + 38; // seteira
      const dx = rhino.x - mx;
      const dy = rhino.y - 30 - my; // centro do corpo (origem do rino é o pé)
      const len = Math.hypot(dx, dy) || 1;
      this.scene.spawnManager.fireDart(
        mx, my, (dx / len) * tier.dartSpeed, (dy / len) * tier.dartSpeed
      );
      this.scene.audio.playDart();
      this.nextShotAt = time + tier.towerIntervalMs;
    }
  }

  deactivate() {
    this.body.enable = false;
    this.nextShotAt = 0;
    this.clearTint();
    this.setActive(false).setVisible(false);
  }
}
