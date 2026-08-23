import { TextureFactory } from '../systems/TextureFactory.js';
import { ART_MANIFEST } from '../art/ArtManifest.js';
import { Constants } from '../utils/Constants.js';
import { SKINS } from '../systems/SkinSystem.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Os sprites vivem em art/*.svg (editáveis em qualquer editor de SVG);
    // as dimensões de rasterização vêm do manifesto gerado, multiplicadas
    // pelo ART_RASTER_SCALE (supersampling para telas de alta densidade)
    const S = Constants.ART_RASTER_SCALE;
    for (const [key, size] of Object.entries(ART_MANIFEST)) {
      this.load.svg(key, 'art/' + key + '.svg', { width: size.w * S, height: size.h * S });
    }

    // Skins: frames derivados do registry, fora do manifesto — o rig é fixo
    // (96x64, o mesmo do rhino-run), então listar cada frame lá só criava um
    // segundo lugar para a página /?setup editar. `pending` fica de fora: os
    // SVGs ainda não existem.
    for (const skin of SKINS) {
      if (!skin.prefix || skin.pending) continue;
      for (const prefix of [skin.prefix, skin.firePrefix].filter(Boolean)) {
        for (const f of [0, 1, 2]) {
          this.load.svg(`${prefix}-${f}`, `art/${prefix}-${f}.svg`, { width: 96 * S, height: 64 * S });
        }
      }
    }

    // Espécies criadas pela aba 🖼️ Sprites (v1.8.9): frames derivados de
    // SPRITE_NEW (js/art/SpriteParams.js), fora do manifesto — mesmo
    // racional das skins acima: um lugar só de edição.
    for (const n of Constants.SPRITE_NEW) {
      const spec = Constants.ANIMAL_SPECS[n.id];
      const sufs = [''].concat(n.anim ? [`-${n.anim.sufixo}`] : []);
      for (const suf of sufs) {
        this.load.svg(`enemy-${n.id}${suf}`, `art/enemy-${n.id}${suf}.svg`,
          { width: spec.w * S, height: spec.h * S });
      }
    }
  }

  create() {
    TextureFactory.generate(this);
    this.createAnimations();
    this.scene.start('GameScene');
  }

  createAnimations() {
    this.anims.create({
      key: 'rhino-run',
      frames: [
        { key: 'rhino-run-0', frame: '__BASE' },
        { key: 'rhino-run-1', frame: '__BASE' },
        { key: 'rhino-run-2', frame: '__BASE' },
        { key: 'rhino-run-1', frame: '__BASE' },
      ],
      frameRate: 12,
      repeat: -1,
    });

    // Skins (v1.8): mesmo ciclo ping-pong do rhino-run por skin com arte
    // própria; skins com fúria própria (firePrefix) ganham a anim de rampage
    // também. `pending` fica de fora — os SVGs ainda não existem.
    const pingPong = (prefix) => this.anims.create({
      key: prefix,
      frames: [
        { key: `${prefix}-0`, frame: '__BASE' },
        { key: `${prefix}-1`, frame: '__BASE' },
        { key: `${prefix}-2`, frame: '__BASE' },
        { key: `${prefix}-1`, frame: '__BASE' },
      ],
      frameRate: 12,
      repeat: -1,
    });
    for (const skin of SKINS) {
      if (!skin.prefix || skin.pending) continue;
      pingPong(skin.prefix);
      if (skin.firePrefix) pingPong(skin.firePrefix);
    }

    // Uma anim de bater asas por espécie de pássaro (v1.4: 5 espécies)
    for (const sp of Constants.BIRD_SPECIES) {
      this.anims.create({
        key: `bird-${sp}-flap`,
        frames: [
          { key: `animal-bird-${sp}`, frame: '__BASE' },
          { key: `animal-bird-${sp}-flap`, frame: '__BASE' },
        ],
        frameRate: 8,
        repeat: -1,
      });
    }

    // Corrida dos animais terrestres (2 frames: parado/passada).
    // Macaco e zebra não têm anim: trocam de textura por estado (chão/ar).
    this.anims.create({
      key: 'lion-run',
      frames: [
        { key: 'animal-lion', frame: '__BASE' },
        { key: 'animal-lion-run-1', frame: '__BASE' },
      ],
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: 'giraffe-run',
      frames: [
        { key: 'animal-giraffe', frame: '__BASE' },
        { key: 'animal-giraffe-run-1', frame: '__BASE' },
      ],
      frameRate: 8,
      repeat: -1,
    });

    // FÚRIA TOTAL (v1.7): mesmo ciclo ping-pong do rhino-run, arte de fogo
    this.anims.create({
      key: 'rhino-fire-run',
      frames: [
        { key: 'rhino-fire-run-0', frame: '__BASE' },
        { key: 'rhino-fire-run-1', frame: '__BASE' },
        { key: 'rhino-fire-run-2', frame: '__BASE' },
        { key: 'rhino-fire-run-1', frame: '__BASE' },
      ],
      frameRate: 12,
      repeat: -1,
    });

    // Elenco por bioma: pares de 2 frames como o leão/girafa. A tabela subiu
    // para Constants.ENEMY_ANIMS na v1.8.9 (a aba 🖼️ Sprites e o
    // test-sprites a leem sem Phaser); espécies criadas pela aba entram pelo
    // SPRITE_NEW quando têm anim com fps (sufixo air/alt-telegraph fica de
    // fora, como pipa/dronezig).
    const extra = Constants.SPRITE_NEW
      .filter((n) => n.anim && n.anim.fps)
      .map((n) => [n.id, n.anim.sufixo, n.anim.fps]);
    for (const [type, suffix, fps] of [...Constants.ENEMY_ANIMS, ...extra]) {
      this.anims.create({
        key: `${type}-run`,
        frames: [
          { key: `enemy-${type}`, frame: '__BASE' },
          { key: `enemy-${type}-${suffix}`, frame: '__BASE' },
        ],
        frameRate: fps,
        repeat: -1,
      });
    }
  }
}
