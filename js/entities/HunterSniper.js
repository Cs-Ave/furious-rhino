import { Constants } from '../utils/Constants.js';

// O caçador de rifle no topo do portão blindado (o chefe da fuga, v1.7).
// Não é pooled nem tem corpo físico: fica fora do alcance do rino por
// POSIÇÃO (nem o rampage o atinge), e o dano dele sai pelos dardos do pool.
// Toda a lógica roda por updateFight(), dirigido pelo BossFight.update — que
// por construção respeita pausa, cutscene e fim de jogo (o GameScene.update
// early-returna nesses estados), então não precisa das guardas isPaused do
// preUpdate da TranqTower.
export class HunterSniper extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'boss-hunter');
    this.setOrigin(0.5, 1);
    // Textura rasterizada a 2x, exibida a 1/2 (padrão de toda arte SVG)
    this.setScale(1 / Constants.ART_RASTER_SCALE);
    // Na frente do portão (-1), atrás do plano de jogo
    this.setDepth(-0.4);
    scene.add.existing(this);

    // Mira laser do telegraph: redesenhada por frame apontando o rino —
    // é o aviso legível em mobile de que o tiro vem
    this.laser = scene.add.graphics().setDepth(5);

    this.engaged = false;
    this.phase = 'cooldown'; // cooldown | telegraph
    this.phaseMs = 0;
    this.shotIndex = 0;
    this.burstLeft = 0;
    this.burstMs = 0;
  }

  // Boca do rifle (apontado para a esquerda, de onde o rino vem)
  muzzle() {
    return { x: this.x - 26, y: this.y - 42 };
  }

  engage() {
    this.engaged = true;
    this.phase = 'cooldown';
    this.phaseMs = 900; // respiro de leitura antes do 1º telegraph
    this.shotIndex = 0;
  }

  // Chamado pelo BossFight todo frame de luta. layersLeft escala o padrão.
  updateFight(time, delta, layersLeft) {
    if (!this.engaged) return;
    const cfg = Constants.BOSS_RIFLE[layersLeft] || Constants.BOSS_RIFLE[1];
    const rhino = this.scene.rhino.getSprite();
    this.phaseMs -= delta;

    if (this.phase === 'cooldown' && this.phaseMs <= 0) {
      this.phase = 'telegraph';
      this.phaseMs = cfg.telegraphMs;
      this.setTexture('boss-hunter-aim');
    }

    if (this.phase === 'telegraph') {
      this.drawLaser(time, rhino);
      if (this.phaseMs <= 0) {
        this.laser.clear();
        this.shotIndex++;
        this.phase = 'cooldown';
        this.phaseMs = cfg.intervalMs;
        if (cfg.mortar && this.shotIndex % 2 === 0) {
          this.fireMortar(rhino);
          this.setTexture('boss-hunter');
        } else {
          // Rajada: o 1º tiro sai já; os demais em cadência de 120ms
          this.burstLeft = cfg.burst;
          this.burstMs = 0;
        }
      }
    }

    if (this.burstLeft > 0) {
      this.burstMs -= delta;
      if (this.burstMs <= 0) {
        this.fireStraight(rhino);
        this.burstLeft--;
        this.burstMs = 120;
        if (!this.burstLeft) this.setTexture('boss-hunter');
      }
    }
  }

  drawLaser(time, rhino) {
    const m = this.muzzle();
    const g = this.laser;
    g.clear();
    // Pisca acelerando perto do disparo (mesma linguagem do telegraph da torre)
    const blink = Math.floor(time / 90) % 2 === 0;
    g.lineStyle(2, 0xff3b30, blink ? 0.75 : 0.35);
    g.lineBetween(m.x, m.y, rhino.x, rhino.y - 30);
    g.fillStyle(0xff3b30, 0.9);
    g.fillCircle(m.x, m.y, 3);
  }

  fireStraight(rhino) {
    const m = this.muzzle();
    const dx = rhino.x - m.x;
    const dy = (rhino.y - 30) - m.y; // centro do corpo (origem do rino é o pé)
    const len = Math.hypot(dx, dy) || 1;
    const v = Constants.BOSS_SHOT_SPEED;
    this.scene.spawnManager.fireDart(m.x, m.y, (dx / len) * v, (dy / len) * v, false, true);
    this.scene.audio.playRifleShot();
  }

  // Morteiro que cai onde o rino ESTÁ — a zona de pouso do quique. Resolve o
  // tempo de queda da altura do rifle até o chão e mira o x com ele.
  fireMortar(rhino) {
    const m = this.muzzle();
    const vy0 = -260;
    const g = Constants.GRAVITY;
    const drop = Constants.GROUND_TOP - m.y;
    const t = (-vy0 + Math.sqrt(vy0 * vy0 + 2 * g * drop)) / g;
    const vx = Phaser.Math.Clamp((rhino.x - m.x) / t, -820, -120);
    this.scene.spawnManager.fireDart(m.x, m.y, vx, vy0, true, true);
    this.scene.audio.playRifleShot();
  }

  // O 3º acerto derruba o caçador do portão: tomba, cai e some (comédia,
  // como o knockback dos animais — ninguém morre neste jogo além do rino)
  defeat() {
    this.engaged = false;
    this.burstLeft = 0;
    this.laser.clear();
    this.scene.audio.playSqueal();
    this.scene.createExplosion(this.x, this.y - 30);
    this.scene.tweens.add({
      targets: this,
      y: Constants.GROUND_TOP + 60,
      angle: 150,
      alpha: 0,
      duration: 900,
      ease: 'Quad.easeIn',
      onComplete: () => this.setVisible(false),
    });
  }

  standDown() {
    this.engaged = false;
    this.burstLeft = 0;
    this.laser.clear();
    this.setTexture('boss-hunter');
  }
}
