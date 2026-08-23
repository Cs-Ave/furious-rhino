import { Constants } from '../utils/Constants.js';

export class Spike extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'spike');
    this.scene.physics.world.enable(this);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.setOrigin(0.5, 0);
    this.skin = '';
    this.setVariant('ground');

    this.scene.add.existing(this);
  }

  // '' = pedestal de alvenaria do zoo, '-city' = bloco de concreto com faixa
  // de perigo. Definir ANTES do reset, que é quem aplica a textura (mesmo
  // contrato do CrackedWall.setSkin).
  setSkin(skin) {
    this.skin = ['-city', '-egito'].includes(skin) ? skin : '';
  }

  // 'ground': spike row sitting on the ground.
  // 'tower': spike row on a brick pedestal down to the ground (nothing floats);
  // the pedestal is lethal too, consistent with walls.
  //
  // O skin só vale para a variante 'tower': a fileira do chão é aço puro
  // (steelBase/steelLight), já neutra em qualquer bioma — uma cópia dela
  // seria textura desperdiçada.
  setVariant(variant) {
    this.variant = variant;
    if (variant === 'tower') {
      this.setTexture(`spike-tower${this.skin || ''}`);
      // Canvas 120 (pedestal mais largo que os espinhos): offset +10
      // mantém a área letal no mundo idêntica à do canvas antigo de 100
      this.body.setSize(72, 116);
      this.body.setOffset(24, 4);
    } else {
      this.setTexture('spike');
      this.body.setSize(92, 42);
      this.body.setOffset(4, 16);
    }
  }

  reset(x, y, variant = 'ground') {
    this.setVariant(variant);
    this.setPosition(x, y);
    this.body.enable = true;
    this.setActive(true).setVisible(true);
  }

  deactivate() {
    this.body.enable = false;
    this.setActive(false).setVisible(false);
  }
}
