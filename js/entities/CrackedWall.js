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
  // textura (mesmo padrão do setVariant da rampa).
  // v1.8.7: a parede é a ÚNICA entidade com família por DISTRITO da cidade
  // (espinho/torre/rampa seguem binárias ''/-city) — a lista fechada aqui é
  // a mesma dos wallSkin de Constants.CITY_DISTRICTS (v1.8.10: + deserto); valor fora dela cai no
  // zoológico, nunca numa textura inexistente.
  static WALL_SKINS = ['-city', '-suburbio', '-vidro', '-contencao', '-ruina', '-piramide'];

  setSkin(skin) {
    this.skin = CrackedWall.WALL_SKINS.includes(skin) ? skin : '';
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
    // v1.8: só o "toco" fica de pé — tudo acima do centro da fresta sai do
    // frame (o GameScene.collapseWallTop anima o pedaço tombando p/ esquerda).
    // Cortar em cy (não no topo do buraco) leva junto a franja superior do
    // rasgo e, na cidade, o coroamento do prédio.
    const cy = Constants.CRACK_HEIGHTS[this.crackHeight.toUpperCase()] * this.wallHeight;
    this.setCrop(0, cy, 100, this.wallHeight - cy);
    this.body.enable = false;
  }

  reset(x) {
    this.setPosition(x, 0);
    this.broken = false;
    this.setTexture(`cracked-${this.crackHeight}${this.skin}`);
    this.clearCollapse();
    this.body.enable = true;
    this.setActive(true).setVisible(true);
  }

  deactivate() {
    this.broken = false;
    this.clearCollapse();
    this.body.enable = false;
    this.setActive(false).setVisible(false);
  }

  // O pool recicla esta parede: sem esta limpeza o crop do toco vazaria para
  // a próxima parede e o pedaço tombando viraria sprite órfão.
  clearCollapse() {
    this.setCrop();
    if (this.topPiece) {
      this.scene.tweens.killTweensOf(this.topPiece);
      this.topPiece.destroy();
      this.topPiece = null;
    }
  }
}
