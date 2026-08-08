import { Constants } from '../utils/Constants.js';

export class CrackedWall extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, height = 720) {
    super(scene, x, y, 'cracked-ground');
    this.scene.physics.world.enable(this);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.setOrigin(0.5, 0);

    this.wallHeight = height;
    this.broken = false;
    this.crackHeight = 'ground';
    // '' = alvenaria do zoológico, '-city' = fachada de prédio (pós-portão).
    // Só a APARÊNCIA muda: canvas, banda da fresta e colisão são idênticos.
    this.skin = '';

    this.scene.add.existing(this);
    this.scene.physics.add.existing(this);
  }

  // Definir o skin ANTES de setCrackHeight/reset: são eles que aplicam a
  // textura (mesmo padrão do setVariant da rampa)
  setSkin(skin) {
    this.skin = skin === '-city' ? '-city' : '';
  }

  setCrackHeight(height) {
    this.crackHeight = height;
    this.setTexture(`cracked-${height}${this.skin}`);
  }

  getCrackBounds() {
    const pos = Constants.CRACK_HEIGHTS[this.crackHeight.toUpperCase()];
    const center = this.y + pos * this.wallHeight;
    return {
      top: center - Constants.CRACK_BAND_HALF,
      bottom: center + Constants.CRACK_BAND_HALF,
    };
  }

  break() {
    if (this.broken) return;
    this.broken = true;
    this.setTexture(`cracked-${this.crackHeight}${this.skin}-broken`);
    this.body.enable = false;
  }

  reset(x) {
    this.setPosition(x, 0);
    this.broken = false;
    this.setTexture(`cracked-${this.crackHeight}${this.skin}`);
    this.body.enable = true;
    this.setActive(true).setVisible(true);
  }

  deactivate() {
    this.broken = false;
    this.body.enable = false;
    this.setActive(false).setVisible(false);
  }
}
