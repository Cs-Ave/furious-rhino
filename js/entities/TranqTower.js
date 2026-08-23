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
    // '' = torre de pedra do zoo, '-city' = poste de vigilância com caixa
    // d'água. Mesmo canvas e mesma seteira — só grafismo.
    this.skin = '';

    this.scene.add.existing(this);
  }

  setSkin(skin) {
    this.skin = ['-city', '-egito'].includes(skin) ? skin : '';
  }

  // baseY: topo do terreno onde a torre pisa. Sem ele, o chão plano (620) —
  // com ele, o platô de um morro (combo ramp-tower: posto de guarda no alto).
  reset(x, baseY = Constants.GROUND_TOP) {
    this.setTexture(`tranq-tower${this.skin}`);
    this.setPosition(x, baseY - 120);
    this.body.enable = true;
    this.nextShotAt = 0;
    this.shotIndex = 0;
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
      const rhino = this.scene.rhino.getSprite();
      const mx = this.x;
      const my = this.y + 38; // seteira
      this.shotIndex = (this.shotIndex || 0) + 1;

      if (this.shotIndex % 2 === 0) {
        // Morteiro: dardo PARA CIMA em arco (gravidade), caindo no caminho
        // do rino — sobe ~175px e aterrissa ~200px para o lado dele em ~1,1s
        const side = rhino.x >= mx ? 1 : -1;
        this.scene.spawnManager.fireDart(mx, my, side * 180, -700, true, false,
          this.skin === '-egito' ? 'arrow-projectile' : null);
      } else {
        // Tiro reto mirado: frente na aproximação, para cima se ele estiver
        // pulando a torre, nas costas se já passou sem derrubá-la
        const dx = rhino.x - mx;
        const dy = rhino.y - 30 - my; // centro do corpo (origem do rino é o pé)
        const len = Math.hypot(dx, dy) || 1;
        this.scene.spawnManager.fireDart(
          mx, my, (dx / len) * tier.dartSpeed, (dy / len) * tier.dartSpeed,
          false, false, this.skin === '-egito' ? 'arrow-projectile' : null
        );
      }
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
