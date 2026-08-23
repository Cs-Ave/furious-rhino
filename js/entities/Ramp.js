import { Constants } from '../utils/Constants.js';

// Morro / trampolim: a primeira coisa do jogo em que o rino FICA EM PÉ.
//
// Ao contrário de todas as outras entidades, a rampa NÃO tem corpo de física —
// nem desabilitado. Arcade só conhece AABB alinhado ao eixo, e uma escada de
// corpos estáticos trava o rino na lateral do degrau: a separação zera o
// velocityX, o FurySystem o reescreve no frame seguinte, e ele fica tremendo
// parado sem morrer e sem avançar (soft-lock, pior que morte).
//
// Em vez disso ela é TERRENO: expõe surfaceY(x) e a GameScene encaixa o
// body do rino (e dos animais) nessa superfície uma vez por frame. Sem corpo
// nenhum, ninguém consegue plugar um overlap nela por engano.
export class Ramp extends Phaser.GameObjects.Image {
  constructor(scene, x, y) {
    super(scene, x, y, 'ramp-small');
    this.setOrigin(0, 1); // x é a borda ESQUERDA, y é a base (linha do chão)
    // Atrás do rino: os pools nascem depois dele e todos ficam em depth 0, ou
    // seja, os obstáculos desenham POR CIMA. Numa rampa em que ele fica em pé
    // isso apareceria na hora.
    this.setDepth(-0.5);

    this.variant = 'small';
    this.spec = Constants.RAMP_VARIANTS.small;
    this.destroyed = false;
    // '' = terra e grama do zoo, '-city' = concreto, asfalto e pichação.
    // Definir ANTES do reset (mesmo contrato do CrackedWall.setSkin).
    this.skin = '';

    scene.add.existing(this);
  }

  setSkin(skin) {
    this.skin = ['-city', '-egito'].includes(skin) ? skin : '';
  }

  // Roda em TODO reset: o sprite reciclado carrega a variante — e a textura
  // de entulho — da corrida anterior.
  setVariant(name) {
    this.variant = name;
    this.spec = Constants.RAMP_VARIANTS[name];
    this.setTexture(`ramp-${name}${this.skin}`);
  }

  get spanW() {
    return this.spec.asc + this.spec.top + this.spec.desc;
  }

  // Borda direita no mundo: é por ela que o SpawnManager recicla (com origin
  // à esquerda, testar `x` faria a rampa sumir com o rino ainda em cima dela)
  get exitX() {
    return this.x + this.spanW;
  }

  // Topo do terreno no mundo, ou null quando x está fora do vão / a rampa foi
  // destruída (aí o chão plano volta a valer). Função pura.
  surfaceY(worldX) {
    if (this.destroyed) return null;
    const t = worldX - this.x;
    if (t < 0 || t > this.spanW) return null;
    const { asc, rise, top, desc } = this.spec;
    if (t < asc) return Constants.GROUND_TOP - rise * (t / asc);
    if (t < asc + top || desc <= 0) return Constants.GROUND_TOP - rise;
    return Constants.GROUND_TOP - rise * (1 - (t - asc - top) / desc);
  }

  smash() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.setTexture(`ramp-${this.variant}${this.skin}-rubble`);
  }

  reset(x, variant = 'small') {
    this.destroyed = false;
    this.setVariant(variant);
    // A base fica RAMP_SKIRT abaixo da linha do chão: a saia enterrada esconde
    // a costura entre a rampa e o tile do chão.
    this.setPosition(x, Constants.GROUND_TOP + Constants.RAMP_SKIRT);
    this.setActive(true).setVisible(true);
    return this.spanW;
  }

  deactivate() {
    this.destroyed = false;
    this.setActive(false).setVisible(false);
  }
}
