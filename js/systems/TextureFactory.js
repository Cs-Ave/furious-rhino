import { Constants } from '../utils/Constants.js';

// Architectural / tiling textures drawn with Phaser Graphics and baked via
// generateTexture. Character art comes from SVG (see js/art/SvgSprites.js).
export class TextureFactory {
  static generate(scene) {
    this.generateWalls(scene);
    this.generateSpikes(scene);
    this.generateSpikeTower(scene);
    this.generateGate(scene);
    this.generateTranqTower(scene);
    this.generateTranqDart(scene);
    this.generateGround(scene);
    this.generateSkies(scene);
    this.generateMountains(scene);
    this.generateClouds(scene);
    this.generateBackdrops(scene);
    this.generateLeaf(scene);
    this.generateDebris(scene);
    this.generateSmoke(scene);
    this.generateWindStreak(scene);
    this.generateExplosionFlash(scene);
    this.generateConfetti(scene);
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
        // Largura pode sair negativa na última coluna quando x0 > 0 (ex.:
        // pilar direito do portão) — fillRect negativo corrompe o batch
        // WebGL do Graphics e apaga desenhos seguintes da textura
        const bw = Math.min(brickW - 2, x0 + w - Math.max(bx, x0));
        if (bw <= 0) continue;
        g.fillStyle(base, 1);
        g.fillRect(Math.max(bx, x0), y, bw, courseH - 2);
        // luz rasante no topo de cada tijolo (cartoon de 2 tons)
        const hl = inBand ? 0xc07c45 : (base === C.wallOrangeDark ? 0xf59a50 : 0xffb066);
        g.fillStyle(hl, 0.55);
        g.fillRect(Math.max(bx, x0), y, bw, 4);
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

  // Shared drawing for the spike row (60px tall) at a vertical/horizontal offset
  static drawSpikeRow(g, yOff, xOff = 0) {
    const C = Constants.COLORS;

    g.fillStyle(C.steelBase, 1);
    g.fillRect(xOff, yOff + 46, 100, 14);
    g.fillStyle(C.steelLight, 0.9);
    [16, 50, 84].forEach(x => g.fillCircle(xOff + x, yOff + 53, 3));

    for (let i = 0; i < 6; i++) {
      const x = xOff + 10 + i * 16;
      g.fillStyle(C.steelLight, 1);
      g.fillTriangle(x - 7, yOff + 46, x, yOff + 46, x, yOff + 12);
      g.fillStyle(C.steelDark, 1);
      g.fillTriangle(x, yOff + 46, x + 7, yOff + 46, x, yOff + 12);
      g.lineStyle(1.5, 0x33363b, 1);
      g.strokeTriangle(x - 7, yOff + 46, x + 7, yOff + 46, x, yOff + 12);
      // brilho especular no lado claro do aço
      g.lineStyle(1.5, 0xffffff, 0.55);
      g.lineBetween(x - 4, yOff + 40, x - 1.5, yOff + 20);
    }

    g.lineStyle(2, 0x3d4046, 1);
    g.strokePoints([
      { x: xOff, y: yOff + 20 }, { x: xOff + 18, y: yOff + 12 }, { x: xOff + 34, y: yOff + 22 },
      { x: xOff + 50, y: yOff + 12 }, { x: xOff + 66, y: yOff + 22 }, { x: xOff + 82, y: yOff + 12 },
      { x: xOff + 100, y: yOff + 20 },
    ], false);
    [18, 50, 82].forEach(x => {
      g.lineBetween(xOff + x - 4, yOff + 8, xOff + x + 4, yOff + 16);
      g.lineBetween(xOff + x - 4, yOff + 16, xOff + x + 4, yOff + 8);
    });
  }

  static generateSpikes(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    this.drawSpikeRow(g, 0);
    g.generateTexture('spike', 100, 60);
    g.destroy();
  }

  // Espinhos elevados num pedestal de tijolos MAIS LARGO que a fileira
  // (base > espinhos = realista): sapata 120 > tampa 112 > pedestal 104 >
  // espinhos ~94. Canvas 120 de largura; a hitbox em Spike.js compensa
  // com offset +10 para a área letal no MUNDO ficar idêntica à anterior.
  static generateSpikeTower(scene) {
    const C = Constants.COLORS;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    // sapata no chão (a mais larga de todas)
    g.fillStyle(C.wallOrangeDark, 1);
    g.fillRect(0, 110, 120, 10);
    g.fillStyle(C.wallMortar, 0.9);
    g.fillRect(0, 110, 120, 2);

    // pedestal de tijolos, mais largo que a fileira de espinhos
    g.fillStyle(C.wallOrangeDark, 1);
    g.fillRect(8, 58, 104, 54);
    g.lineStyle(2, C.wallMortar, 0.8);
    for (let y = 58; y <= 112; y += 18) g.lineBetween(8, y, 112, y);
    g.lineBetween(44, 58, 44, 112);
    g.lineBetween(78, 58, 78, 112);
    g.fillStyle(C.wallMortar, 0.9);
    g.fillRect(8, 58, 3, 54);
    g.fillRect(109, 58, 3, 54);

    // tampa de aço com beiral sobre o pedestal
    g.fillStyle(C.steelBase, 1);
    g.fillRect(4, 54, 112, 8);

    this.drawSpikeRow(g, 0, 10);

    g.generateTexture('spike-tower', 120, 120);
    g.destroy();
  }

  // Portão da fuga em x = 800m: pilares de tijolo, travessa de madeira,
  // placa de saída e cancela levantada — só cenário, sem física.
  static generateGate(scene) {
    const C = Constants.COLORS;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    // pilares na mesma linguagem de tijolos das paredes
    this.drawBricks(g, 0, 30, 44, 170, false);
    this.drawBricks(g, 196, 30, 44, 170, false);
    g.fillStyle(C.wallMortar, 1);
    g.fillRect(0, 22, 48, 10);
    g.fillRect(192, 22, 48, 10);

    // travessa superior de madeira
    g.fillStyle(C.fenceBrown, 1);
    g.fillRect(24, 6, 192, 18);
    g.lineStyle(2, 0x4a3524, 1);
    g.strokeRect(24, 6, 192, 18);
    g.fillStyle(0x000000, 0.15);
    g.fillRect(24, 24, 192, 6);

    // placa de saída (verde com seta branca apontando para a liberdade)
    g.fillStyle(0x3fa34d, 1);
    g.fillRect(96, 36, 48, 22);
    g.lineStyle(2, 0x2c7a39, 1);
    g.strokeRect(96, 36, 48, 22);
    g.fillStyle(0xffffff, 1);
    g.fillRect(102, 45, 22, 4);
    g.fillTriangle(124, 39, 124, 55, 138, 47);

    // cancela levantada (braço listrado a ~63°, pivô no pilar esquerdo)
    g.save();
    g.translateCanvas(44, 120);
    g.rotateCanvas(-1.1);
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, -6, 110, 12);
    g.fillStyle(0xd6453c, 1);
    for (let x = 10; x < 110; x += 28) g.fillRect(x, -6, 14, 12);
    g.lineStyle(2, 0x8a2a22, 1);
    g.strokeRect(0, -6, 110, 12);
    g.restore();
    g.fillStyle(0x55585e, 1);
    g.fillCircle(44, 120, 7);

    g.generateTexture('zoo-gate', 240, 200);
    g.destroy();
  }

  // ------------------------------------------------------------ tranq tower

  // Torreta medieval de pedra (equipamento do zoo para sedar o fujão):
  // blocos cinza, ameias no topo, seteira escura na altura do peito do rino
  // e bandeirinha verde com cruz veterinária.
  static generateTranqTower(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const stone = 0x8f99a3, stoneDark = 0x747e88, joint = 0x59626b, slit = 0x23272c;

    // corpo de pedra com fiadas de blocos alternadas
    g.fillStyle(stone, 1);
    g.fillRect(6, 14, 72, 106);
    for (let y = 14; y < 120; y += 16) {
      const off = (Math.floor(y / 16) % 2) * 18;
      g.fillStyle(stoneDark, 1);
      for (let x = 6 + off; x < 78; x += 36) {
        g.fillRect(x, y, Math.min(16, 78 - x), 14);
      }
    }
    g.lineStyle(2, joint, 0.7);
    for (let y = 14; y <= 118; y += 16) g.lineBetween(6, y, 78, y);
    g.fillStyle(joint, 0.9);
    g.fillRect(6, 14, 3, 106);
    g.fillRect(75, 14, 3, 106);
    // sombra lateral (volume cilíndrico da torre)
    g.fillStyle(0x000000, 0.12);
    g.fillRect(60, 14, 18, 106);

    // ameias (3 merlões)
    [4, 33, 62].forEach((x) => {
      g.fillStyle(stone, 1);
      g.fillRect(x, 0, 18, 16);
      g.lineStyle(2, joint, 0.8);
      g.strokeRect(x, 0, 18, 16);
    });

    // seteira escura de onde sai o dardo (peito do rino no chão: y≈85 aqui)
    g.fillStyle(slit, 1);
    g.fillRect(36, 70, 10, 32);
    g.fillCircle(41, 70, 5);

    // bandeirinha verde com cruz veterinária branca
    g.lineStyle(3, 0x4a3524, 1);
    g.lineBetween(70, 0, 70, 14);
    g.fillStyle(0x3fa34d, 1);
    g.fillTriangle(69, 0, 69, 11, 50, 5);
    g.fillStyle(0xffffff, 1);
    g.fillRect(58, 4, 7, 2);
    g.fillRect(60.5, 1.5, 2, 7);

    g.generateTexture('tranq-tower', 84, 120);
    g.destroy();
  }

  // Dardo tranquilizante: seringa com líquido verde, agulha na frente
  // (voa para a esquerda) e penacho vermelho na cauda
  static generateTranqDart(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xcfd4da, 1);
    g.fillRect(0, 4, 7, 2);
    g.fillStyle(0xe8f4ec, 1);
    g.fillRect(7, 2, 13, 6);
    g.fillStyle(0x46c46a, 1);
    g.fillRect(9, 3, 9, 4);
    g.fillStyle(0xffffff, 0.55);
    g.fillRect(8, 2.6, 8, 1.2);
    g.lineStyle(1, 0x33363b, 1);
    g.strokeRect(7, 2, 13, 6);
    g.fillStyle(0xd6453c, 1);
    g.fillTriangle(20, 5, 28, 0, 28, 10);
    g.generateTexture('tranq-dart', 28, 10);
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

  // Gradiente vertical em faixas horizontais interpoladas: fillGradientStyle
  // não renderiza no SwiftShader (screenshots headless dos testes) e faixas
  // de 6px são imperceptíveis nos céus de baixo contraste.
  static fillVerticalGradient(g, x, y, w, h, stops) {
    const band = 6;
    const bands = Math.ceil(h / band);
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1 || 1);
      let a = stops[0], b = stops[stops.length - 1];
      for (let s = 0; s < stops.length - 1; s++) {
        if (t >= stops[s].t && t <= stops[s + 1].t) { a = stops[s]; b = stops[s + 1]; break; }
      }
      const lt = Math.round(((t - a.t) / ((b.t - a.t) || 1)) * 100);
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.IntegerToColor(a.color),
        Phaser.Display.Color.IntegerToColor(b.color), 100, lt
      );
      g.fillStyle(Phaser.Display.Color.GetColor(c.r | 0, c.g | 0, c.b | 0), 1);
      g.fillRect(x, y + i * band, w, band + 1);
    }
  }

  // Três céus 1280x720 empilhados pelo GameScene: o alpha do entardecer e
  // da noite acompanha a distância (fuga aos 800m = pôr do sol; o modo
  // infinito corre sob as estrelas)
  static generateSkies(scene) {
    // DIA
    let g = scene.make.graphics({ x: 0, y: 0, add: false });
    this.fillVerticalGradient(g, 0, 0, 1280, 720, [
      { t: 0, color: 0x3f9de4 }, { t: 0.55, color: 0x7ec8f0 }, { t: 1, color: 0xc9ecfb },
    ]);
    g.fillStyle(0xfff3b0, 0.35);
    g.fillCircle(1080, 110, 95);
    g.fillStyle(0xffe66b, 0.6);
    g.fillCircle(1080, 110, 68);
    g.fillStyle(0xffd94a, 1);
    g.fillCircle(1080, 110, 48);
    g.generateTexture('bg-sky-day', 1280, 720);
    g.destroy();

    // ENTARDECER — sol baixo e grande no horizonte
    g = scene.make.graphics({ x: 0, y: 0, add: false });
    this.fillVerticalGradient(g, 0, 0, 1280, 720, [
      { t: 0, color: 0x4a4a8c }, { t: 0.4, color: 0xb85a8c },
      { t: 0.72, color: 0xf08a4c }, { t: 1, color: 0xffc978 },
    ]);
    g.fillStyle(0xffd9a0, 0.35);
    g.fillCircle(980, 520, 120);
    g.fillStyle(0xffb45e, 0.7);
    g.fillCircle(980, 520, 82);
    g.fillStyle(0xff9e3d, 1);
    g.fillCircle(980, 520, 60);
    g.generateTexture('bg-sky-dusk', 1280, 720);
    g.destroy();

    // NOITE — lua, ~46 estrelas determinísticas e nebulosa sutil
    g = scene.make.graphics({ x: 0, y: 0, add: false });
    this.fillVerticalGradient(g, 0, 0, 1280, 720, [
      { t: 0, color: 0x0a0e2a }, { t: 0.6, color: 0x1b2350 }, { t: 1, color: 0x2c3a6e },
    ]);
    g.fillStyle(0x4a5a9e, 0.14);
    g.fillEllipse(760, 260, 900, 180);
    g.fillStyle(0x6a7ac0, 0.1);
    g.fillEllipse(500, 180, 600, 110);
    let seed = 7; // LCG: estrelas sempre nas mesmas posições
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 46; i++) {
      const x = rnd() * 1280, y = rnd() * 460, r = 1 + rnd() * 1.6;
      g.fillStyle(0xffffff, 0.35 + rnd() * 0.55);
      g.fillCircle(x, y, r);
    }
    g.fillStyle(0xfff8e0, 0.25);
    g.fillCircle(1080, 120, 78);
    g.fillStyle(0xf7efd2, 1);
    g.fillCircle(1080, 120, 46);
    g.fillStyle(0xe4dbba, 0.8);
    g.fillCircle(1094, 108, 9);
    g.fillCircle(1066, 132, 6);
    g.generateTexture('bg-sky-night', 1280, 720);
    g.destroy();
  }

  // Cordilheira ao fundo (scroll 0.06, entre nuvens e o bioma distante).
  // Formas que cruzam as bordas são duplicadas ±640 para o tile emendar.
  static generateMountains(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const back = 0x9db4c8, front = 0x8aa0b4, snow = 0xe8eef4;

    g.fillStyle(back, 1);
    g.fillTriangle(-40, 300, 190, 300, 80, 120);
    g.fillTriangle(600, 300, 830, 300, 720, 120);
    g.fillTriangle(120, 300, 400, 300, 260, 90);
    g.fillTriangle(360, 300, 700, 300, 540, 130);
    g.fillTriangle(-280, 300, 60, 300, -100, 130);
    g.fillStyle(snow, 0.9);
    g.fillTriangle(62, 152, 98, 152, 80, 120);
    g.fillTriangle(702, 152, 738, 152, 720, 120);
    g.fillTriangle(240, 126, 280, 126, 260, 90);

    g.fillStyle(front, 1);
    g.fillTriangle(-80, 300, 260, 300, 60, 170);
    g.fillTriangle(560, 300, 900, 300, 700, 170);
    g.fillTriangle(200, 300, 520, 300, 380, 150);
    g.fillTriangle(460, 300, 760, 300, 620, 185);
    g.fillTriangle(-180, 300, 120, 300, -20, 185);

    g.generateTexture('bg-mountains', 640, 300);
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

  // Kit de biomas: um par bg-far-<nome> (640x420, scroll 0.15) e
  // bg-near-<nome> (640x260, scroll 0.4) por trecho de 200m. Formas que
  // cruzariam as bordas ficam em x=36..604 ou ganham cópia ±640 — o tile
  // precisa emendar sem costura.
  static generateBackdrops(scene) {
    const C = Constants.COLORS;

    // ---------- props do bioma distante ----------
    const hills = (g, c1, c2) => {
      g.fillStyle(c1, 1);
      g.fillCircle(0, 470, 175);
      g.fillCircle(320, 485, 215);
      g.fillCircle(640, 470, 175);
      g.fillStyle(c2, 1);
      g.fillCircle(160, 505, 190);
      g.fillCircle(490, 510, 205);
      g.fillCircle(-150, 510, 205);
    };
    const haze = (g) => {
      g.fillStyle(0xffffff, 0.1);
      g.fillRect(0, 262, 640, 26);
      g.fillStyle(0xffffff, 0.07);
      g.fillRect(0, 288, 640, 30);
      g.fillStyle(0xffffff, 0.05);
      g.fillRect(0, 318, 640, 34);
    };
    const tree = (g, x, s) => {
      g.fillStyle(0x8a5a2b, 1);
      g.fillRect(x - 8 * s, 330, 16 * s, 90);
      g.fillStyle(0x4e8c2a, 1);
      g.fillCircle(x, 300, 52 * s);
      g.fillCircle(x - 34 * s, 322, 36 * s);
      g.fillCircle(x + 34 * s, 322, 36 * s);
      g.fillStyle(0x6aae3a, 1);
      g.fillCircle(x - 10 * s, 292, 30 * s);
    };
    const acacia = (g, x, s) => {
      g.fillStyle(0x8a5a2b, 1);
      g.fillRect(x - 4 * s, 300, 8 * s, 120);
      g.lineStyle(5 * s, 0x8a5a2b, 1);
      g.lineBetween(x, 316, x - 26 * s, 292);
      g.lineBetween(x, 316, x + 24 * s, 294);
      g.fillStyle(0x6a9a3a, 1);
      g.fillEllipse(x, 288, 150 * s, 42 * s);
      g.fillStyle(0x7fae48, 1);
      g.fillEllipse(x - 18 * s, 280, 112 * s, 32 * s);
    };
    const cage = (g, x) => {
      g.fillStyle(0x9aa2ac, 1);
      g.fillRect(x, 300, 120, 12);
      for (let i = 0; i < 5; i++) g.fillRect(x + 6 + i * 26, 306, 8, 114);
      g.fillStyle(0xc94f3d, 1);
      g.fillTriangle(x - 10, 300, x + 130, 300, x + 60, 250);
    };
    const dome = (g, x, s) => {
      const r = 92 * s;
      g.lineStyle(5, 0x8a929c, 1);
      g.beginPath();
      g.arc(x, 382, r, Math.PI, 0);
      g.strokePath();
      [-0.66, -0.33, 0, 0.33, 0.66].forEach((f) => {
        const dx = f * r;
        g.lineBetween(x + dx, 382, x + dx, 382 - Math.sqrt(r * r - dx * dx));
      });
      g.fillStyle(0x777d85, 1);
      g.fillRect(x - r - 6, 378, r * 2 + 12, 10);
      g.fillCircle(x, 382 - r - 4, 5 * s);
      // aves lá dentro (pontinhos coloridos)
      [[x - r * 0.4, 348, 0xe85a5a], [x + r * 0.25, 330, 0xffd94a], [x + r * 0.5, 360, 0x4f8fe8]]
        .forEach(([bx, by, c]) => { g.fillStyle(c, 1); g.fillCircle(bx, by, 4.5 * s); });
    };
    const stoneWall = (g, x) => {
      g.fillStyle(0xb8ab98, 1);
      g.fillRect(x, 350, 100, 70);
      g.fillStyle(0x9c8f7c, 1);
      g.fillRect(x - 6, 344, 112, 10);
    };
    const rocks = (g, x, y) => {
      g.fillStyle(0xb0a894, 1);
      g.fillEllipse(x, y, 60, 26);
      g.fillStyle(0x9a9280, 1);
      g.fillEllipse(x + 42, y + 8, 44, 20);
    };
    const shed = (g, x, w) => {
      g.fillStyle(0x9aa2ac, 1);
      g.fillRect(x, 244, w, 46);
      g.fillStyle(0x7c848e, 1);
      g.fillTriangle(x - 10, 244, x + w + 10, 244, x + w / 2, 216);
    };
    const exitSign = (g, x, y, s) => {
      g.fillStyle(0x3fa34d, 1);
      g.fillRect(x, y, 64 * s, 30 * s);
      g.lineStyle(3, 0x2c7a39, 1);
      g.strokeRect(x, y, 64 * s, 30 * s);
      g.fillStyle(0xffffff, 1);
      g.fillRect(x + 8 * s, y + 12 * s, 28 * s, 6 * s);
      g.fillTriangle(x + 36 * s, y + 5 * s, x + 36 * s, y + 25 * s, x + 56 * s, y + 15 * s);
    };
    const visitors = (g, x) => {
      g.fillStyle(0x3a4152, 0.9);
      g.fillCircle(x, 352, 8);
      g.fillRoundedRect(x - 9, 360, 18, 42, 6);
      g.lineStyle(5, 0x3a4152, 0.9);
      g.lineBetween(x + 7, 368, x + 26, 356);
      g.fillCircle(x + 38, 362, 6);
      g.fillRoundedRect(x + 31, 368, 14, 34, 5);
    };
    const skyline = (g) => {
      g.fillStyle(0x9fb4d0, 1);
      [[60, 250, 34, 70], [100, 232, 26, 88], [132, 258, 30, 62],
       [430, 244, 28, 76], [462, 226, 36, 94], [504, 252, 26, 68]]
        .forEach(([x, y, w, h]) => g.fillRect(x, y, w, h));
      g.lineStyle(3, 0x9fb4d0, 1);
      g.lineBetween(480, 226, 480, 204);
    };
    const balloon = (g, x, y) => {
      g.fillStyle(0xe85a5a, 1);
      g.fillEllipse(x - 11, y, 18, 46);
      g.fillEllipse(x + 11, y, 18, 46);
      g.fillStyle(0xffd94a, 1);
      g.fillEllipse(x, y, 18, 52);
      g.lineStyle(2, 0x5e3618, 1);
      g.lineBetween(x - 10, y + 22, x - 7, y + 34);
      g.lineBetween(x + 10, y + 22, x + 7, y + 34);
      g.fillStyle(0x8a5a2b, 1);
      g.fillRect(x - 8, y + 34, 16, 12);
    };

    // ---------- props do bioma próximo ----------
    const hedgeRow = (g, c1, c2) => {
      g.fillStyle(c1, 1);
      for (let x = 0; x < 640; x += 64) g.fillCircle(x + 32, 244, 42);
      g.fillStyle(c2, 1);
      for (let x = 32; x < 672; x += 64) g.fillCircle(x + 16, 252, 34);
      g.fillStyle(c1, 1);
      g.fillRect(0, 246, 640, 14);
    };
    const fence = (g) => {
      g.fillStyle(C.fenceBrown, 1);
      for (let x = 16; x < 640; x += 80) g.fillRect(x, 130, 10, 130);
      g.fillRect(0, 150, 640, 9);
      g.fillRect(0, 195, 640, 9);
    };
    const flowersOn = (g, list) => {
      list.forEach(([x, y, c]) => {
        g.fillStyle(c, 1);
        g.fillCircle(x, y, 5);
        g.fillStyle(0xffe9a8, 1);
        g.fillCircle(x, y, 2);
      });
    };
    const nearCage = (g, x) => {
      g.fillStyle(0x777d85, 1);
      g.fillRect(x, 110, 130, 10);
      g.fillRect(x, 244, 130, 10);
      for (let i = 0; i < 6; i++) g.fillRect(x + 5 + i * 24, 116, 7, 130);
    };
    const crate = (g, x, y) => {
      g.fillStyle(0xb98a4e, 1);
      g.fillRect(x, y, 54, 54);
      g.lineStyle(3, 0x8a5f2e, 1);
      g.strokeRect(x, y, 54, 54);
      g.lineBetween(x, y, x + 54, y + 54);
      g.lineBetween(x + 54, y, x, y + 54);
    };
    const barrel = (g, x, y) => {
      g.fillStyle(0x8a929c, 1);
      g.fillRoundedRect(x, y, 36, 54, 8);
      g.lineStyle(3, 0x6a727c, 1);
      g.lineBetween(x, y + 15, x + 36, y + 15);
      g.lineBetween(x, y + 39, x + 36, y + 39);
    };
    const perch = (g, x) => {
      g.fillStyle(C.fenceBrown, 1);
      g.fillRect(x, 120, 10, 140);
      g.fillRect(x + 110, 120, 10, 140);
      g.fillRect(x - 10, 130, 140, 8);
      const birdie = (bx, c) => {
        g.fillStyle(c, 1);
        g.fillEllipse(bx, 124, 16, 11);
        g.fillCircle(bx + 8, 119, 5);
        g.fillStyle(0xf5a623, 1);
        g.fillTriangle(bx + 12, 117, bx + 12, 121, bx + 17, 119);
      };
      birdie(x + 34, 0xe85a5a);
      birdie(x + 74, 0x4f8fe8);
    };
    const grassTufts = (g, c1, c2) => {
      for (let x = 4; x < 640; x += 32) {
        const h = 34 + ((x * 7) % 26);
        g.fillStyle(x % 64 ? c1 : c2, 1);
        g.fillTriangle(x, 260, x + 7, 260, x + 2, 260 - h);
        g.fillTriangle(x + 8, 260, x + 15, 260, x + 12, 260 - h + 10);
      }
    };
    const bush = (g, x, s) => {
      g.fillStyle(0x4e8c2a, 1);
      g.fillCircle(x, 244, 34 * s);
      g.fillStyle(0x66a83c, 1);
      g.fillCircle(x + 22 * s, 250, 26 * s);
    };

    const makeFar = (name, draw) => {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      draw(g);
      g.generateTexture(`bg-far-${name}`, 640, 420);
      g.destroy();
    };
    const makeNear = (name, draw) => {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      draw(g);
      g.generateTexture(`bg-near-${name}`, 640, 260);
      g.destroy();
    };

    // 0–200m: área dos felinos (o zoo clássico de hoje, com visitantes)
    makeFar('felinos', (g) => {
      hills(g, 0xa8d18a, 0x92c176);
      tree(g, 90, 1);
      tree(g, 460, 0.85);
      cage(g, 200);
      stoneWall(g, 540);
      visitors(g, 350);
      haze(g);
    });
    makeNear('felinos', (g) => {
      hedgeRow(g, 0x4e8c2a, 0x66a83c);
      flowersOn(g, [
        [50, 232, 0xe85a8a], [150, 240, 0xffd94a], [240, 230, 0xffffff],
        [330, 242, 0xe85a8a], [430, 234, 0xffd94a], [540, 238, 0xffffff],
        [600, 230, 0xe85a8a],
      ]);
      fence(g);
      nearCage(g, 300);
    });

    // 200–400m: aviário (cúpulas gigantes, pássaros empoleirados)
    makeFar('aviario', (g) => {
      hills(g, 0x9ccfae, 0x83bd9a);
      dome(g, 150, 1);
      dome(g, 440, 0.75);
      visitors(g, 290);
      haze(g);
    });
    makeNear('aviario', (g) => {
      hedgeRow(g, 0x3f8a6e, 0x58a583);
      flowersOn(g, [
        [80, 236, 0xffffff], [210, 230, 0xe85a8a], [420, 238, 0xffd94a], [560, 232, 0xffffff],
      ]);
      fence(g);
      perch(g, 180);
    });

    // 400–600m: savana (acácias, capim alto, morros secos)
    makeFar('savana', (g) => {
      hills(g, 0xd9c27e, 0xc8ad62);
      acacia(g, 120, 1);
      acacia(g, 500, 0.8);
      rocks(g, 300, 400);
      haze(g);
    });
    makeNear('savana', (g) => {
      g.fillStyle(0xc89a58, 1);
      g.fillRect(0, 246, 640, 14);
      grassTufts(g, 0xbfae5e, 0xa9984e);
      rocks(g, 480, 244);
      fence(g);
    });

    // 600–800m: área de serviço (muro alto, galpões, placas de SAÍDA)
    makeFar('servico', (g) => {
      hills(g, 0xb4c4a8, 0xa2b394);
      shed(g, 70, 150);
      shed(g, 400, 180);
      haze(g);
      g.fillStyle(0xcfc4ae, 1);
      g.fillRect(0, 290, 640, 130);
      g.fillStyle(0xb5aa92, 1);
      g.fillRect(0, 284, 640, 8);
      g.lineStyle(2, 0xb5aa92, 0.8);
      for (let y = 322; y <= 386; y += 32) g.lineBetween(0, y, 640, y);
      for (let x = 0; x <= 640; x += 64) g.lineBetween(x, 290, x, 420);
      exitSign(g, 288, 316, 1.5);
    });
    makeNear('servico', (g) => {
      g.fillStyle(0xb9b2a4, 1);
      g.fillRect(0, 240, 640, 20);
      crate(g, 90, 190);
      crate(g, 146, 190);
      crate(g, 118, 134);
      barrel(g, 420, 188);
      barrel(g, 462, 188);
      exitSign(g, 520, 140, 1);
      g.fillStyle(0x8a929c, 1);
      g.fillRect(548, 170, 8, 90);
    });

    // 800m+: liberdade (campo aberto, cidade no horizonte, ZERO cercas)
    makeFar('liberdade', (g) => {
      skyline(g);
      balloon(g, 240, 150);
      hills(g, 0x9ed17e, 0x8bc16c);
      tree(g, 420, 0.7);
      haze(g);
    });
    makeNear('liberdade', (g) => {
      g.fillStyle(0x66a83c, 1);
      g.fillRect(0, 248, 640, 12);
      bush(g, 70, 1);
      bush(g, 320, 0.8);
      bush(g, 540, 1.05);
      flowersOn(g, [
        [140, 244, 0xe85a8a], [230, 248, 0xffd94a], [410, 246, 0xffffff],
        [480, 242, 0xe85a8a], [610, 248, 0xffd94a],
      ]);
      g.fillStyle(0x9a9280, 1);
      g.fillEllipse(190, 254, 30, 12);
    });
  }

  // Folha para as partículas de vento do cenário
  static generateLeaf(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x7fb648, 1);
    g.fillEllipse(4, 3, 8, 5);
    g.lineStyle(1, 0x557a2c, 1);
    g.lineBetween(1, 3, 7, 3);
    g.generateTexture('leaf', 8, 6);
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

  // Retângulo branco: o emitter da cutscene tinge cada partícula de uma cor
  static generateConfetti(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 8, 5);
    g.generateTexture('confetti', 8, 5);
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
