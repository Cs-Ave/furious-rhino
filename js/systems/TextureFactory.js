import { Constants } from '../utils/Constants.js';

// Architectural / tiling textures drawn with Phaser Graphics and baked via
// generateTexture. Character art comes from SVG (see js/art/SvgSprites.js).
export class TextureFactory {
  static generate(scene) {
    this.generateWalls(scene);
    this.generateSpikes(scene);
    this.generateSpikeTower(scene);
    this.generateGround(scene);
    this.generateSky(scene);
    this.generateClouds(scene);
    this.generateParallaxFar(scene);
    this.generateParallaxNear(scene);
    this.generateDebris(scene);
    this.generateSmoke(scene);
    this.generateWindStreak(scene);
    this.generateExplosionFlash(scene);
  }

  // ---------------------------------------------------------------- walls

  static generateWalls(scene) {
    const H = Constants.CRACK_HEIGHTS;

    this.generateCrackedWallVariant(scene, 'cracked-ground', H.GROUND);
    this.generateCrackedWallVariant(scene, 'cracked-mid', H.MID);
    this.generateCrackedWallVariant(scene, 'cracked-high', H.HIGH);

    this.generateBrokenWallVariant(scene, 'cracked-ground-broken', H.GROUND);
    this.generateBrokenWallVariant(scene, 'cracked-mid-broken', H.MID);
    this.generateBrokenWallVariant(scene, 'cracked-high-broken', H.HIGH);
  }

  // Staggered brick courses; band recolored amber exactly at
  // crackPos*720 +- CRACK_BAND_HALF so the visual IS the gameplay window.
  static drawBricks(g, x0, y0, w, h, inBand) {
    const C = Constants.COLORS;
    const courseH = 24, brickW = 50;

    for (let y = y0; y < y0 + h; y += courseH) {
      const offset = (Math.floor(y / courseH) % 2) * (brickW / 2);
      for (let x = x0 - brickW; x < x0 + w; x += brickW) {
        const bx = x + offset;
        const base = inBand
          ? C.wallCrack
          : ((Math.floor(bx / brickW) + Math.floor(y / courseH)) % 3 === 0 ? C.wallOrangeDark : C.wallOrange);
        g.fillStyle(base, 1);
        g.fillRect(Math.max(bx, x0), y, Math.min(brickW - 2, x0 + w - Math.max(bx, x0)), courseH - 2);
      }
    }
    // mortar joints
    g.lineStyle(2, inBand ? Constants.COLORS.wallCrackLine : Constants.COLORS.wallMortar, 0.7);
    for (let y = y0; y <= y0 + h; y += courseH) {
      g.lineBetween(x0, y, x0 + w, y);
    }
  }

  static generateCrackedWallVariant(scene, key, crackPos) {
    const w = 100, h = 720;
    const C = Constants.COLORS;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    const bandTop = crackPos * h - Constants.CRACK_BAND_HALF;
    const bandBottom = crackPos * h + Constants.CRACK_BAND_HALF;

    this.drawBricks(g, 0, 0, w, h, false);
    this.drawBricks(g, 0, bandTop, w, bandBottom - bandTop, true);

    // jagged cracks crossing the band (plus short tips past the edges)
    g.lineStyle(3, C.wallCrackLine, 1);
    const cy = crackPos * h;
    g.strokePoints([
      { x: 8, y: cy - 50 }, { x: 30, y: cy - 20 }, { x: 22, y: cy + 5 },
      { x: 48, y: cy + 30 }, { x: 40, y: cy + 55 },
    ], false);
    g.strokePoints([
      { x: 60, y: cy - 55 }, { x: 74, y: cy - 25 }, { x: 66, y: cy },
      { x: 88, y: cy + 25 }, { x: 80, y: cy + 52 },
    ], false);
    g.lineStyle(2, C.wallCrackLine, 0.6);
    g.lineBetween(30, bandTop - 14, 24, bandTop + 4);
    g.lineBetween(70, bandBottom - 4, 76, bandBottom + 14);

    // pillar edges
    g.fillStyle(C.wallMortar, 0.8);
    g.fillRect(0, 0, 3, h);
    g.fillRect(w - 3, 0, 3, h);

    g.generateTexture(key, w, h);
    g.destroy();
  }

  // Wall in two segments with jagged bites; transparent hole in the middle
  // plus chunks clinging to the edges and a small pile at the bottom.
  static generateBrokenWallVariant(scene, key, crackPos) {
    const w = 100, h = 720;
    const C = Constants.COLORS;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    const cy = crackPos * h;
    const holeTop = cy - 70;
    const holeBottom = cy + 70;

    if (holeTop > 0) this.drawBricks(g, 0, 0, w, holeTop, false);
    if (holeBottom < h) this.drawBricks(g, 0, holeBottom, w, h - holeBottom, false);

    // jagged edges biting into the segments
    g.fillStyle(C.wallCrack, 1);
    for (let i = 0; i < 5; i++) {
      const x = 10 + i * 20;
      g.fillTriangle(x, holeTop, x + 16, holeTop, x + 8, holeTop + 14 + (i % 2) * 8);
      g.fillTriangle(x, holeBottom, x + 16, holeBottom, x + 8, holeBottom - 14 - (i % 2) * 8);
    }

    // chunks clinging to the edges
    g.fillStyle(C.wallCrack, 1);
    g.lineStyle(1.5, C.wallCrackLine, 1);
    const chunks = [
      [14, holeTop + 20, 12], [70, holeTop + 26, 10], [42, holeTop + 16, 8],
      [22, holeBottom - 26, 11], [60, holeBottom - 20, 13], [86, holeBottom - 30, 8],
    ];
    chunks.forEach(([x, y, s]) => {
      g.fillRect(x, y, s, s * 0.8);
      g.strokeRect(x, y, s, s * 0.8);
    });

    // debris pile at the bottom lip of the hole
    g.fillStyle(C.wallOrangeDark, 1);
    g.fillTriangle(4, holeBottom, 50, holeBottom, 26, holeBottom - 18);
    g.fillTriangle(40, holeBottom, 96, holeBottom, 70, holeBottom - 14);

    g.fillStyle(C.wallMortar, 0.8);
    if (holeTop > 0) g.fillRect(0, 0, 3, holeTop);
    if (holeBottom < h) g.fillRect(0, holeBottom, 3, h - holeBottom);

    g.generateTexture(key, w, h);
    g.destroy();
  }

  // ---------------------------------------------------------------- spikes

  // Shared drawing for the spike row (60px tall) at a vertical offset
  static drawSpikeRow(g, yOff) {
    const C = Constants.COLORS;

    g.fillStyle(C.steelBase, 1);
    g.fillRect(0, yOff + 46, 100, 14);
    g.fillStyle(C.steelLight, 0.9);
    [16, 50, 84].forEach(x => g.fillCircle(x, yOff + 53, 3));

    for (let i = 0; i < 6; i++) {
      const x = 10 + i * 16;
      g.fillStyle(C.steelLight, 1);
      g.fillTriangle(x - 7, yOff + 46, x, yOff + 46, x, yOff + 12);
      g.fillStyle(C.steelDark, 1);
      g.fillTriangle(x, yOff + 46, x + 7, yOff + 46, x, yOff + 12);
      g.lineStyle(1.5, 0x33363b, 1);
      g.strokeTriangle(x - 7, yOff + 46, x + 7, yOff + 46, x, yOff + 12);
    }

    g.lineStyle(2, 0x3d4046, 1);
    g.strokePoints([
      { x: 0, y: yOff + 20 }, { x: 18, y: yOff + 12 }, { x: 34, y: yOff + 22 },
      { x: 50, y: yOff + 12 }, { x: 66, y: yOff + 22 }, { x: 82, y: yOff + 12 },
      { x: 100, y: yOff + 20 },
    ], false);
    [18, 50, 82].forEach(x => {
      g.lineBetween(x - 4, yOff + 8, x + 4, yOff + 16);
      g.lineBetween(x - 4, yOff + 16, x + 4, yOff + 8);
    });
  }

  static generateSpikes(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    this.drawSpikeRow(g, 0);
    g.generateTexture('spike', 100, 60);
    g.destroy();
  }

  // Elevated spikes on a brick pedestal reaching the ground (no floating)
  static generateSpikeTower(scene) {
    const C = Constants.COLORS;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    // pedestal column (60 wide, centered), same brick language as the walls
    g.fillStyle(C.wallOrangeDark, 1);
    g.fillRect(20, 58, 60, 62);
    g.lineStyle(2, C.wallMortar, 0.8);
    for (let y = 58; y <= 120; y += 20) g.lineBetween(20, y, 80, y);
    g.lineBetween(50, 58, 50, 120);
    g.fillStyle(C.wallMortar, 0.9);
    g.fillRect(20, 58, 3, 62);
    g.fillRect(77, 58, 3, 62);
    // cap under the spike bar
    g.fillStyle(C.steelBase, 1);
    g.fillRect(14, 54, 72, 8);

    this.drawSpikeRow(g, 0);

    g.generateTexture('spike-tower', 100, 120);
    g.destroy();
  }

  // ---------------------------------------------------------------- ground

  static generateGround(scene) {
    const w = 1280, h = 100;
    const C = Constants.COLORS;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    // packed dirt
    g.fillStyle(C.dirtBrown, 1);
    g.fillRect(0, 14, w, h - 14);

    // pebbles / specks
    const pebbles = [
      [40, 40, 5], [130, 68, 4], [220, 30, 6], [310, 80, 3], [400, 50, 5],
      [500, 25, 4], [590, 72, 6], [680, 44, 3], [760, 88, 5], [850, 34, 4],
      [940, 60, 6], [1030, 26, 3], [1110, 78, 5], [1200, 48, 4], [1255, 90, 3],
      [80, 85, 3], [470, 90, 4], [720, 22, 4], [1000, 92, 4], [880, 75, 3],
    ];
    pebbles.forEach(([x, y, r], i) => {
      g.fillStyle(i % 2 === 0 ? C.dirtDark : C.dirtLight, 1);
      g.fillCircle(x, y, r);
    });

    // grass strip with scalloped tuft edge
    g.fillStyle(C.grassGreen, 1);
    g.fillRect(0, 0, w, 12);
    g.fillStyle(C.grassDark, 1);
    for (let x = 0; x < w; x += 16) {
      g.fillTriangle(x, 12, x + 16, 12, x + 8, 18);
    }
    g.fillStyle(C.grassDark, 0.5);
    g.fillRect(0, 0, w, 3);

    g.generateTexture('ground', w, h);
    g.destroy();
  }

  // ------------------------------------------------------------ background

  static generateSky(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    // vivid daytime blue
    g.fillGradientStyle(0x4aa8e8, 0x4aa8e8, 0xbfe6fb, 0xbfe6fb, 1);
    g.fillRect(0, 0, 1280, 720);
    // sun with halo, top-right
    g.fillStyle(0xfff3b0, 0.35);
    g.fillCircle(1080, 110, 95);
    g.fillStyle(0xffe66b, 0.6);
    g.fillCircle(1080, 110, 68);
    g.fillStyle(0xffd94a, 1);
    g.fillCircle(1080, 110, 48);
    g.generateTexture('bg-sky', 1280, 720);
    g.destroy();
  }

  // Slow drifting fluffy clouds (own parallax layer)
  static generateClouds(scene) {
    const w = 640, h = 200;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    const puff = (cx, cy, s) => {
      g.fillCircle(cx, cy, 22 * s);
      g.fillCircle(cx + 26 * s, cy - 8 * s, 27 * s);
      g.fillCircle(cx + 56 * s, cy, 20 * s);
      g.fillRect(cx - 20 * s, cy, 96 * s, 18 * s);
    };
    g.fillStyle(0xffffff, 0.9);
    puff(80, 60, 1);
    g.fillStyle(0xffffff, 0.75);
    puff(360, 120, 0.7);
    g.fillStyle(0xffffff, 0.85);
    puff(520, 40, 0.55);

    g.generateTexture('bg-clouds', w, h);
    g.destroy();
  }

  // Distant layer, now in daytime colors: hills, trees, a colored cage.
  static generateParallaxFar(scene) {
    const w = 640, h = 420;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    // distant light-green hills
    g.fillStyle(0xa8d18a, 1);
    g.fillCircle(120, 460, 180);
    g.fillCircle(400, 480, 220);
    g.fillCircle(620, 460, 170);

    // trees: brown trunk + layered green canopy
    const tree = (x, s) => {
      g.fillStyle(0x8a5a2b, 1);
      g.fillRect(x - 8 * s, 330, 16 * s, 90);
      g.fillStyle(0x4e8c2a, 1);
      g.fillCircle(x, 300, 52 * s);
      g.fillCircle(x - 34 * s, 322, 36 * s);
      g.fillCircle(x + 34 * s, 322, 36 * s);
      g.fillStyle(0x6aae3a, 1);
      g.fillCircle(x - 10 * s, 292, 30 * s);
    };
    tree(80, 1);
    tree(450, 0.85);

    // zoo cage with gray bars and red roof
    g.fillStyle(0x9aa2ac, 1);
    g.fillRect(200, 300, 120, 12);
    for (let i = 0; i < 5; i++) g.fillRect(206 + i * 26, 306, 8, 114);
    g.fillStyle(0xc94f3d, 1);
    g.fillTriangle(190, 300, 330, 300, 260, 250);

    // low stone wall
    g.fillStyle(0xb8ab98, 1);
    g.fillRect(540, 350, 100, 70);
    g.fillStyle(0x9c8f7c, 1);
    g.fillRect(534, 344, 112, 10);

    g.generateTexture('bg-far', w, h);
    g.destroy();
  }

  // Nearer layer: two-tone hedges, flowers, brown fence, gray-bar cage.
  static generateParallaxNear(scene) {
    const w = 640, h = 260;
    const C = Constants.COLORS;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    // hedges in two greens
    g.fillStyle(0x4e8c2a, 1);
    for (let x = 0; x < w; x += 64) g.fillCircle(x + 32, 244, 42);
    g.fillStyle(0x66a83c, 1);
    for (let x = 32; x < w + 32; x += 64) g.fillCircle(x + 16, 252, 34);
    g.fillStyle(0x4e8c2a, 1);
    g.fillRect(0, 246, w, 14);

    // scattered flowers on the hedges
    const flowers = [
      [50, 232, 0xe85a8a], [150, 240, 0xffd94a], [240, 230, 0xffffff],
      [330, 242, 0xe85a8a], [430, 234, 0xffd94a], [540, 238, 0xffffff],
      [600, 230, 0xe85a8a],
    ];
    flowers.forEach(([x, y, c]) => {
      g.fillStyle(c, 1);
      g.fillCircle(x, y, 5);
      g.fillStyle(0xffe9a8, 1);
      g.fillCircle(x, y, 2);
    });

    // brown fence: posts + two rails
    g.fillStyle(C.fenceBrown, 1);
    for (let x = 16; x < w; x += 80) g.fillRect(x, 130, 10, 130);
    g.fillRect(0, 150, w, 9);
    g.fillRect(0, 195, w, 9);

    // one cage with gray bars
    g.fillStyle(0x777d85, 1);
    g.fillRect(300, 110, 130, 10);
    g.fillRect(300, 244, 130, 10);
    for (let i = 0; i < 6; i++) g.fillRect(305 + i * 24, 116, 7, 130);

    g.generateTexture('bg-near', w, h);
    g.destroy();
  }

  // ----------------------------------------------------------- fx textures

  static generateDebris(scene) {
    const C = Constants.COLORS;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(C.wallCrack, 1);
    g.fillPoints([
      { x: 1, y: 4 }, { x: 6, y: 0 }, { x: 11, y: 3 },
      { x: 10, y: 10 }, { x: 3, y: 11 },
    ], true);
    g.lineStyle(1.5, C.wallCrackLine, 1);
    g.strokePoints([
      { x: 1, y: 4 }, { x: 6, y: 0 }, { x: 11, y: 3 },
      { x: 10, y: 10 }, { x: 3, y: 11 },
    ], true);
    g.generateTexture('debris-chunk', 12, 12);
    g.destroy();
  }

  static generateWindStreak(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 0.5);
    g.fillRoundedRect(0, 0, 24, 3, 1.5);
    g.fillStyle(0xffffff, 0.9);
    g.fillRoundedRect(4, 1, 14, 1.5, 0.75);
    g.generateTexture('wind-streak', 24, 3);
    g.destroy();
  }

  static generateExplosionFlash(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xf5851f, 0.4);
    g.fillCircle(32, 32, 32);
    g.fillStyle(0xffb347, 0.7);
    g.fillCircle(32, 32, 22);
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(32, 32, 12);
    g.generateTexture('explosion-flash', 64, 64);
    g.destroy();
  }

  static generateSmoke(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(8, 8, 8);
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(8, 8, 5.5);
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(8, 8, 3);
    g.generateTexture('smoke-puff', 16, 16);
    g.destroy();
  }
}
