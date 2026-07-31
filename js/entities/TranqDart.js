// Dardo tranquilizante disparado pela TranqTower: reta horizontal na altura
// do peito do rino. Pooled; dash destrói, encostar sem dash = tranquilizado.
export class TranqDart extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'tranq-dart');
    this.scene.physics.world.enable(this);
    this.body.setAllowGravity(false);
    this.body.setSize(24, 8);
    this.body.setOffset(2, 1);

    this.scene.add.existing(this);
  }

  // gravity=true: tiro de morteiro — sobe em arco e cai com a gravidade
  fire(x, y, vx, vy = 0, gravity = false) {
    this.setPosition(x, y);
    this.body.enable = true;
    this.body.setAllowGravity(gravity);
    this.gravityArc = gravity;
    this.body.setVelocity(vx, vy);
    // A textura aponta para a esquerda: rotação 0 = voar em -x
    this.baseRot = Math.atan2(vy, vx) + Math.PI;
    this.setActive(true).setVisible(true);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body.enable) return;
    // Morteiro: o nariz acompanha a curva da trajetória
    if (this.gravityArc) {
      this.baseRot = Math.atan2(this.body.velocity.y, this.body.velocity.x) + Math.PI;
    }
    // Leve oscilação (±4°) em torno do ângulo do voo, para parecer flecha
    this.setRotation(this.baseRot + Math.sin(time * 0.02) * 0.07);
  }

  deactivate() {
    this.body.enable = false;
    this.body.setAllowGravity(false);
    this.gravityArc = false;
    this.body.setVelocity(0, 0);
    this.baseRot = 0;
    this.setRotation(0);
    this.setActive(false).setVisible(false);
  }
}
