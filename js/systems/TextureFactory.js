import { Constants } from '../utils/Constants.js';

// Architectural / tiling textures drawn with Phaser Graphics and baked via
// generateTexture. Character art comes from SVG (see js/art/SvgSprites.js).
export class TextureFactory {
  static generate(scene) {
    this.generateWalls(scene);
    this.generateSpikes(scene);
    this.generateSpikeTower(scene);
    this.generateGate(scene);
    this.generateGateArmored(scene);
    this.generateBossGates(scene);
    this.generateTranqTower(scene);
    this.generateTranqDart(scene);
    this.generateGround(scene);
    this.generateGroundCity(scene);
    this.generateRamps(scene);
    this.generateSkies(scene);
    this.generateMountains(scene);
    this.generateClouds(scene);
    this.generateBackdrops(scene);
    this.generateCars(scene);
    this.generateForeground(scene);
    this.generateBiomeArch(scene);
    this.generateTrackFlag(scene);
    this.generateWeather(scene);
    this.generateLeaf(scene);
    this.generateDebris(scene);
    this.generateSmoke(scene);
    this.generateWindStreak(scene);
    this.generateExplosionFlash(scene);
    this.generateConfetti(scene);
  }

  // ---------------------------------------------------------------- walls

  // Dois SKINS da mesma parede: tijolo no zoológico e fachada de prédio
  // depois do portão. Canvas, banda da fresta e mecânica são idênticos —
  // muda só o material. 12 chaves: cracked-<altura>[-city][-broken].
  static generateWalls(scene) {
    const H = Constants.CRACK_HEIGHTS;
    const heights = [[H.GROUND, 'ground'], [H.MID, 'mid'], [H.HIGH, 'high']];

    for (const [pos, name] of heights) {
      for (const skin of ['', '-city']) {
        this.generateCrackedWallVariant(scene, `cracked-${name}${skin}`, pos, skin, name);
        this.generateBrokenWallVariant(scene, `cracked-${name}${skin}-broken`, pos, skin, name);
      }
    }
  }

  // Fachada de concreto com janelas acesas. Assinatura idêntica à do
  // drawBricks para ser um drop-in.
  //
  // A BANDA continua sendo tijolo âmbar de propósito: o jogador aprendeu que
  // âmbar = passagem, e o comentário do drawBricks é regra de design ("o
  // visual É a janela de gameplay"). Na cidade ela lê como alvenaria exposta
  // onde a fachada arrebentou.
  // Paleta ÚNICA da cidade: os prédios do fundo (cityBlock) e a parede do
  // primeiro plano têm de parecer o mesmo material. O corpo da fachada é um
  // passo MAIS ESCURO que o skyline (0x54617a/0x475369) — plano de frente
  // escurece, não clareia — e a janela acesa é o mesmo âmbar dos dois lados.
  // De quebra, o concreto escuro faz a banda âmbar da fresta saltar aos olhos.
  static CITY = {
    body: 0x3f4a5e,
    slab: 0x55617a,
    slabShade: 0x2b3342,
    pillar: 0x323c4c,
    pillarLight: 0x5c6980,
    winOn: 0xffd98a,     // idêntico ao lit do cityBlock
    winOff: 0x2b3342,
    frame: 0x1f2531,
    metal: 0x8a939f,
    metalDark: 0x59616b,
    // Fresta da cidade (v1.7.0, pedido do dono): concreto CLARO em vez do
    // tijolo âmbar do zoo — combina com a fachada e continua saltando aos
    // olhos porque o corpo do prédio é um passo bem mais escuro.
    band: 0x9aa4b5,
    bandLight: 0xb9c2d1,  // luz rasante no topo de cada bloco
    bandLine: 0x39424f,   // juntas e rachaduras sobre o concreto claro
  };

  // Onde a fachada arrebentou: blocos de concreto claro expostos, mesma
  // geometria escalonada da banda de tijolos (o jogador já aprendeu que a
  // faixa de material diferente = passagem — só o material muda de cidade)
  static drawConcreteBand(g, x0, y0, w, h) {
    const C = this.CITY;
    const courseH = 24, blockW = 50;
    for (let y = y0; y < y0 + h; y += courseH) {
      const offset = (Math.floor(y / courseH) % 2) * (blockW / 2);
      for (let x = x0 - blockW; x < x0 + w; x += blockW) {
        const bx = x + offset;
        const bw = Math.min(blockW - 2, x0 + w - Math.max(bx, x0));
        if (bw <= 0) continue;
        g.fillStyle(C.band, 1);
        g.fillRect(Math.max(bx, x0), y, bw, courseH - 2);
        g.fillStyle(C.bandLight, 0.55);
        g.fillRect(Math.max(bx, x0), y, bw, 4);
      }
    }
    g.lineStyle(2, C.bandLine, 0.7);
    for (let y = y0; y <= y0 + h; y += courseH) {
      g.lineBetween(x0, y, x0 + w, y);
    }
  }

  static drawFacade(g, x0, y0, w, h, inBand) {
    if (inBand) { this.drawConcreteBand(g, x0, y0, w, h); return; }
    const C = this.CITY;

    const floorH = 60;
    g.fillStyle(C.body, 1);
    g.fillRect(x0, y0, w, h);

    for (let y = Math.floor(y0 / floorH) * floorH; y < y0 + h; y += floorH) {
      // Laje entre andares
      const slabY = Math.max(y, y0);
      const slabH = Math.min(10, y0 + h - slabY);
      if (slabH > 0) {
        g.fillStyle(C.slab, 1);
        g.fillRect(x0, slabY, w, slabH);
        g.fillStyle(C.slabShade, 0.6);
        g.fillRect(x0, slabY + slabH - 3, w, 3);
      }
      // Duas janelas RETRATO por andar (o cityBlock do fundo usa 11x13; a
      // proporção casa, a escala não — este é o primeiro plano)
      [16, 62].forEach((dx, i) => {
        const wy = y + 16;
        if (wy < y0 || wy + 32 > y0 + h) return;
        const on = ((Math.floor(y / floorH) * 3 + i * 7) % 5) < 2;
        g.fillStyle(on ? C.winOn : C.winOff, 1);
        g.fillRect(x0 + dx, wy, 22, 32);
        g.fillStyle(C.frame, 0.55);               // caixilho
        g.fillRect(x0 + dx, wy + 15, 22, 3);
        g.fillRect(x0 + dx + 10, wy, 3, 32);
      });
    }

    // Pilares de canto — dão a leitura de "prédio" mesmo em tira de 100px
    g.fillStyle(C.pillar, 1);
    g.fillRect(x0, y0, 9, h);
    g.fillRect(x0 + w - 9, y0, 9, h);
    g.fillStyle(C.pillarLight, 0.6);
    g.fillRect(x0 + 6, y0, 3, h);
  }

  // ------------------------------------------------- coroamento do prédio
  // Sem isto a parede da cidade termina CORTADA no topo da tela. A faixa
  // y = 0..100 está livre nas 6 chaves de cidade (a banda mais alta começa em
  // 120; o buraco de high-broken, em 110) e tudo cabe nos 100px de largura —
  // o corpo de física é o canvas inteiro, então alargar mudaria a hitbox.
  //
  // Um coroamento por altura de fresta: como a altura é sorteada a cada
  // spawn, o skyline da cidade nunca se repete.
  static drawCityCrown(g, kind, w) {
    const C = this.CITY;
    const cx = w / 2;

    if (kind === 'ground') {
      // Empire State: recuos escalonados + mástro
      const steps = [[6, 74, 88, 26], [16, 52, 68, 24], [28, 32, 44, 22]];
      steps.forEach(([x, y, sw, sh]) => {
        g.fillStyle(C.body, 1);
        g.fillRect(x, y, sw, sh);
        g.fillStyle(C.slab, 1);
        g.fillRect(x - 2, y, sw + 4, 5);
        g.fillStyle(C.winOn, 1);                  // fresta de luz em cada recuo
        for (let i = 0; i < 3; i++) g.fillRect(x + 10 + i * (sw / 3.4), y + 10, 5, 9);
      });
      g.fillStyle(C.metal, 1);                    // mástro
      g.fillRect(cx - 3, 6, 6, 28);
      g.fillStyle(C.metalDark, 1);
      g.fillRect(cx - 8, 28, 16, 6);
      g.fillStyle(0xff6b5e, 1);                   // luz de topo
      g.fillCircle(cx, 5, 4);
      return;
    }

    if (kind === 'mid') {
      // Chrysler: arcos concêntricos + agulha
      g.fillStyle(C.body, 1);
      g.fillRect(10, 76, 80, 24);
      g.fillStyle(C.slab, 1);
      g.fillRect(8, 76, 84, 5);
      [[38, 74], [30, 58], [22, 42]].forEach(([r, y], i) => {
        g.fillStyle(i % 2 ? C.metalDark : C.metal, 1);
        g.beginPath();
        g.arc(cx, y, r, Math.PI, 0);
        g.fillPath();
        g.fillStyle(C.body, 1);                   // vazio entre os arcos
        g.beginPath();
        g.arc(cx, y, r - 7, Math.PI, 0);
        g.fillPath();
        g.fillStyle(C.winOn, 1);                  // triângulos de luz
        g.fillTriangle(cx - r + 9, y, cx - r + 15, y, cx - r + 12, y - 9);
        g.fillTriangle(cx + r - 15, y, cx + r - 9, y, cx + r - 12, y - 9);
      });
      g.fillStyle(C.metal, 1);                    // agulha
      g.fillTriangle(cx - 4, 34, cx + 4, 34, cx, 2);
      return;
    }

    // Torre de relógio: caixa com mostrador e telhado de duas águas
    g.fillStyle(C.body, 1);
    g.fillRect(20, 40, 60, 60);
    g.fillStyle(C.slab, 1);
    g.fillRect(16, 40, 68, 6);
    g.fillRect(14, 96, 72, 5);
    g.fillStyle(C.metalDark, 1);                  // telhado
    g.fillTriangle(12, 40, 88, 40, cx, 6);
    g.fillStyle(C.metal, 1);
    g.fillTriangle(12, 40, 88, 40, cx, 14);
    g.fillStyle(0xf4efe0, 1);                     // mostrador
    g.fillCircle(cx, 68, 20);
    g.fillStyle(C.frame, 1);
    g.fillCircle(cx, 68, 16);
    g.fillStyle(0xf4efe0, 1);
    g.fillRect(cx - 2, 56, 4, 14);                // ponteiros
    g.fillRect(cx, 66, 12, 4);
    g.fillStyle(C.winOn, 1);                      // luzes da base
    g.fillRect(26, 84, 6, 10);
    g.fillRect(68, 84, 6, 10);
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

  static generateCrackedWallVariant(scene, key, crackPos, skin = '', crown = 'ground') {
    const w = 100, h = 720;
    const C = Constants.COLORS;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const paint = skin === '-city' ? this.drawFacade.bind(this) : this.drawBricks.bind(this);

    const bandTop = crackPos * h - Constants.CRACK_BAND_HALF;
    const bandBottom = crackPos * h + Constants.CRACK_BAND_HALF;

    // Cidade: a fachada TERMINA em y=100 e a faixa 0..100 fica transparente
    // só com a torre do coroamento — antes o prédio subia até o topo do
    // canvas e a torre era desenhada por cima, lendo como sobreposição
    const topY = skin === '-city' ? 100 : 0;
    paint(g, 0, topY, w, h - topY, false);
    paint(g, 0, bandTop, w, bandBottom - bandTop, true);

    // jagged cracks crossing the band (plus short tips past the edges);
    // na cidade a rachadura é escura sobre o concreto claro
    g.lineStyle(3, skin === '-city' ? this.CITY.bandLine : C.wallCrackLine, 1);
    const cy = crackPos * h;
    g.strokePoints([
      { x: 8, y: cy - 50 }, { x: 30, y: cy - 20 }, { x: 22, y: cy + 5 },
      { x: 48, y: cy + 30 }, { x: 40, y: cy + 55 },
    ], false);
    g.strokePoints([
      { x: 60, y: cy - 55 }, { x: 74, y: cy - 25 }, { x: 66, y: cy },
      { x: 88, y: cy + 25 }, { x: 80, y: cy + 52 },
    ], false);
    g.lineStyle(2, skin === '-city' ? this.CITY.bandLine : C.wallCrackLine, 0.6);
    g.lineBetween(30, bandTop - 14, 24, bandTop + 4);
    g.lineBetween(70, bandBottom - 4, 76, bandBottom + 14);

    // pillar edges (o skin de cidade já tem os seus pilares de concreto)
    if (skin !== '-city') {
      g.fillStyle(C.wallMortar, 0.8);
      g.fillRect(0, 0, 3, h);
      g.fillRect(w - 3, 0, 3, h);
    } else {
      // POR ÚLTIMO: desenhado antes, a fachada o cobriria
      this.drawCityCrown(g, crown, w);
    }

    g.generateTexture(key, w, h);
    g.destroy();
  }

  // Wall in two segments with jagged bites; transparent hole in the middle
  // plus chunks clinging to the edges and a small pile at the bottom.
  static generateBrokenWallVariant(scene, key, crackPos, skin = '', crown = 'ground') {
    const w = 100, h = 720;
    const C = Constants.COLORS;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const paint = skin === '-city' ? this.drawFacade.bind(this) : this.drawBricks.bind(this);

    const cy = crackPos * h;
    const holeTop = cy - 70;
    const holeBottom = cy + 70;

    // Cidade: mesmo corte do variant inteiro — topo transparente, só a torre
    const topY = skin === '-city' ? 100 : 0;
    if (holeTop > topY) paint(g, 0, topY, w, holeTop - topY, false);
    if (holeBottom < h) paint(g, 0, holeBottom, w, h - holeBottom, false);

    // Lascas e entulho na cor do material local: âmbar no zoo, concreto
    // claro na cidade (pedido do dono: a trinca combina com o prédio)
    const chunkFill = skin === '-city' ? this.CITY.band : C.wallCrack;
    const chunkLine = skin === '-city' ? this.CITY.bandLine : C.wallCrackLine;

    // jagged edges biting into the segments
    g.fillStyle(chunkFill, 1);
    for (let i = 0; i < 5; i++) {
      const x = 10 + i * 20;
      g.fillTriangle(x, holeTop, x + 16, holeTop, x + 8, holeTop + 14 + (i % 2) * 8);
      g.fillTriangle(x, holeBottom, x + 16, holeBottom, x + 8, holeBottom - 14 - (i % 2) * 8);
    }

    // chunks clinging to the edges
    g.fillStyle(chunkFill, 1);
    g.lineStyle(1.5, chunkLine, 1);
    const chunks = [
      [14, holeTop + 20, 12], [70, holeTop + 26, 10], [42, holeTop + 16, 8],
      [22, holeBottom - 26, 11], [60, holeBottom - 20, 13], [86, holeBottom - 30, 8],
    ];
    chunks.forEach(([x, y, s]) => {
      g.fillRect(x, y, s, s * 0.8);
      g.strokeRect(x, y, s, s * 0.8);
    });

    // debris pile at the bottom lip of the hole
    g.fillStyle(skin === '-city' ? this.CITY.slab : C.wallOrangeDark, 1);
    g.fillTriangle(4, holeBottom, 50, holeBottom, 26, holeBottom - 18);
    g.fillTriangle(40, holeBottom, 96, holeBottom, 70, holeBottom - 14);

    if (skin !== '-city') {
      g.fillStyle(C.wallMortar, 0.8);
      if (holeTop > 0) g.fillRect(0, 0, 3, holeTop);
      if (holeBottom < h) g.fillRect(0, holeBottom, 3, h - holeBottom);
    } else if (holeTop > 100) {
      // Sem isto a parede perderia a torre no frame da explosão. As três
      // alturas passam (o buraco mais alto começa em y=110); a guarda existe
      // para uma altura de fresta futura não desenhar coroa dentro do buraco.
      this.drawCityCrown(g, crown, w);
    }

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

    this.generateSpikeTowerCity(scene);
  }

  // Mesmo canvas 120x120 e a MESMA fileira de espinhos (aço já é neutro): só
  // o pedestal troca de material. Alvenaria laranja no meio do asfalto era o
  // que mais destoava no modo infinito.
  static generateSpikeTowerCity(scene) {
    const C = Constants.COLORS;
    const K = this.CITY;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    // sapata de concreto
    g.fillStyle(K.pillar, 1);
    g.fillRect(0, 110, 120, 10);
    g.fillStyle(K.slab, 0.9);
    g.fillRect(0, 110, 120, 2);

    // bloco de concreto com marcas de fôrma
    g.fillStyle(K.body, 1);
    g.fillRect(8, 58, 104, 54);
    g.fillStyle(K.slab, 0.35);
    for (let y = 58; y <= 112; y += 18) g.fillRect(8, y, 104, 2);
    g.fillStyle(K.pillar, 1);
    g.fillRect(8, 58, 4, 54);
    g.fillRect(108, 58, 4, 54);

    // Faixa de perigo amarela/preta — a leitura mais urbana que existe, e de
    // quebra reforça "não encoste aqui"
    g.fillStyle(0xf2c14e, 1);
    g.fillRect(12, 74, 96, 16);
    g.fillStyle(0x23272c, 1);
    for (let i = 0; i < 7; i++) {
      const x = 12 + i * 14;
      g.fillTriangle(x, 90, x + 8, 90, x + 16, 74);
      g.fillTriangle(x + 8, 74, x + 16, 74, x, 90);
    }
    g.fillStyle(0xf2c14e, 1);                 // apara o que passou da faixa
    g.fillRect(104, 74, 4, 16);
    g.fillStyle(K.pillar, 1);
    g.fillRect(8, 58, 4, 54);
    g.fillRect(108, 58, 4, 54);

    // tampa de aço com beiral (igual à do zoo — é o suporte dos espinhos)
    g.fillStyle(C.steelBase, 1);
    g.fillRect(4, 54, 112, 8);

    this.drawSpikeRow(g, 0, 10);

    g.generateTexture('spike-tower-city', 120, 120);
    g.destroy();
  }

  // Portão da fuga (x = WIN_DISTANCE_PX): pilares de tijolo, travessa de madeira,
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

    this.generateGateBroken(scene);
  }

  // O portão DEPOIS da investida: MESMO canvas 240x200 (origin 0.5,1 — um
  // canvas diferente faria os escombros saltarem de posição no frame da
  // explosão). Pilares partidos, travessa quebrada no meio e a cancela no
  // chão. É o marco visual de que a fuga aconteceu de verdade.
  static generateGateBroken(scene) {
    const C = Constants.COLORS;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    // Pilares mais baixos, com o topo mordido
    this.drawBricks(g, 0, 74, 44, 126, false);
    this.drawBricks(g, 196, 58, 44, 142, false);
    g.fillStyle(C.wallCrack, 1);
    for (let i = 0; i < 3; i++) {
      g.fillTriangle(4 + i * 14, 74, 18 + i * 14, 74, 11 + i * 14, 62 + (i % 2) * 8);
      g.fillTriangle(200 + i * 14, 58, 214 + i * 14, 58, 207 + i * 14, 46 + (i % 2) * 8);
    }

    // Travessa arrebentada: dois cotocos pendurados nos pilares
    g.fillStyle(C.fenceBrown, 1);
    g.save(); g.translateCanvas(30, 62); g.rotateCanvas(0.32);
    g.fillRect(0, 0, 62, 16); g.restore();
    g.save(); g.translateCanvas(228, 44); g.rotateCanvas(-2.9);
    g.fillRect(0, 0, 54, 16); g.restore();

    // Placa de saída torta, dependurada por um canto
    g.save(); g.translateCanvas(120, 92); g.rotateCanvas(0.5);
    g.fillStyle(0x3fa34d, 1); g.fillRect(0, 0, 48, 22);
    g.lineStyle(2, 0x2c7a39, 1); g.strokeRect(0, 0, 48, 22);
    g.fillStyle(0xffffff, 1); g.fillRect(6, 9, 22, 4);
    g.fillTriangle(28, 3, 28, 19, 42, 11);
    g.restore();

    // Cancela partida, caída no chão
    g.fillStyle(0xffffff, 1);
    g.fillRect(58, 186, 74, 12);
    g.fillStyle(0xd6453c, 1);
    for (let x = 62; x < 132; x += 28) g.fillRect(x, 186, 14, 12);
    g.lineStyle(2, 0x8a2a22, 1);
    g.strokeRect(58, 186, 74, 12);
    g.save(); g.translateCanvas(140, 192); g.rotateCanvas(-0.35);
    g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 40, 12);
    g.fillStyle(0xd6453c, 1); g.fillRect(6, 0, 14, 12);
    g.restore();

    // Entulho na base
    g.fillStyle(C.wallOrangeDark, 1);
    g.fillTriangle(6, 200, 66, 200, 34, 178);
    g.fillTriangle(170, 200, 236, 200, 204, 182);
    g.fillStyle(C.wallCrack, 1);
    [[80, 194, 9], [150, 196, 7], [112, 197, 6]].forEach(([x, y, s]) =>
      g.fillRect(x, y, s, s));

    g.generateTexture('zoo-gate-broken', 240, 200);
    g.destroy();
  }

  // ------------------------------------------------- portão blindado (boss)

  // v1.7: o portão dos 1000m amanhece BLINDADO — o boss da fuga. Full-height
  // (canvas 240x620, do chão ao teto do mundo: não existe "por cima") com a
  // plataforma do caçador de rifle no topo. Os estados são o número de camadas
  // RESTANTES (zoo-gate-armored-3/2/1); cada quebra abre a banda da camada
  // expondo o tijolo âmbar — a linguagem que o jogador já aprendeu nas
  // paredes: âmbar = passagem. O estado final é o zoo-gate-broken de sempre
  // (o crossGate troca a textura na explosão).
  static generateGateArmored(scene) {
    this.generateArmoredSet(scene, 'zoo-gate-armored', Constants.BOSS_LAYERS);
  }

  // v1.8.5: as barricadas dos bosses 2 e 3. Mesma moldura do portão do zoo
  // (canvas, pilares, bandas, plataforma) com pele e ordem de quebra próprias:
  // o boss 2 pede o MEIO duas vezes (4 camadas), o boss 3 repete meio E chão
  // (5 camadas) — a repetição é o que faz a luta durar mais sem aumentar a
  // altura da cerca. Cada set ganha também o seu estado destruído.
  static generateBossGates(scene) {
    this.generateArmoredSet(scene, 'boss2-gate', ['mid', 'ground', 'high', 'mid'], { palette: 'urban' });
    this.generateArmoredBroken(scene, 'boss2-gate', ['mid', 'ground', 'high', 'mid'], { palette: 'urban' });
    this.generateArmoredSet(scene, 'boss3-gate', ['ground', 'mid', 'high', 'mid', 'ground'], { palette: 'dark' });
    this.generateArmoredBroken(scene, 'boss3-gate', ['ground', 'mid', 'high', 'mid', 'ground'], { palette: 'dark' });
  }

  // v1.8.5: o portão virou PARAMÉTRICO — os bosses seguintes reusam a mesma
  // estrutura (pilares, bandas, plataforma, canvas 240x620) trocando só a
  // pele e a ordem de quebra, então a física de BossFight casa sem gambiarra.
  //
  // Gera `${prefix}-${N}` para N = layers.length .. 1 (N = camadas RESTANTES):
  // com N restantes, as (layers.length - N) PRIMEIRAS da ordem já caíram.
  // `layers` é a ORDEM de quebra e pode REPETIR altura (ex.: ['mid','ground',
  // 'high','mid']) — desenhamos UMA banda por altura única e ela só abre no
  // visual quando TODAS as ocorrências daquela altura já quebraram: é a
  // dupla-blindagem, sem inventar geometria nova.
  //
  // opts.palette: 'steel' (aço azulado do zoo, default e pixel-a-pixel igual
  // ao portão da v1.7) | 'urban' (concreto cinza + faixa de perigo
  // amarelo/preto, a barricada de contenção urbana) | 'dark' (aço quase preto
  // com detalhe vermelho, a última cerca do mundo).
  static generateArmoredSet(scene, prefix, layers, opts = {}) {
    const total = layers.length;
    for (let left = total; left >= 1; left--) {
      this.generateArmoredVariant(scene, `${prefix}-${left}`, layers, total - left, opts);
    }
  }

  // Estado FINAL do portão paramétrico (`${prefix}-broken`): mesmo canvas e
  // mesmos pilares/plataforma, mas com o vão inteiro rasgado — a linguagem do
  // zoo-gate-broken (buraco + entulho + fumaça) aplicada à moldura blindada.
  static generateArmoredBroken(scene, prefix, layers, opts = {}) {
    this.generateArmoredVariant(scene, `${prefix}-broken`, layers, layers.length,
      { ...opts, wrecked: true });
  }

  // Paletas do portão blindado. Os nomes são PAPÉIS no desenho (não cores),
  // então trocar de pele nunca mexe na estrutura. Os valores de 'steel' são
  // exatamente os da v1.7 — o zoo-gate-armored não pode mudar 1 pixel.
  static armoredPalette(name) {
    const C = Constants.COLORS;
    if (name === 'urban') {
      // Barricada de contenção: concreto cru e faixa de perigo amarelo/preto
      const concrete = 0x8f8f88, concreteDark = 0x5f5f5a, concreteLight = 0xb0b0a8;
      return {
        plate: concreteDark, seam: 0x4a4a46, truss: concrete,
        beam: 0x6c6c66, face: concreteLight, frame: concreteDark,
        lock: 0x3b3b3e, lockShine: concreteLight, bolt: 0x6c6c66,
        pillar: concrete, pillarEdge: concreteLight, rivet: concreteDark,
        deck: concreteLight, deckLip: concreteDark, rail: 0x3b3b3e,
        hazardA: 0xf2c033, hazardB: 0x1f1f22, hazardPlate: true,
      };
    }
    if (name === 'dark') {
      // A última cerca do mundo: aço quase preto com solda vermelha
      return {
        plate: 0x24262b, seam: 0x14151a, truss: 0x3c4048,
        beam: 0x2f3238, face: 0x373b43, frame: 0x1a1c21,
        lock: 0x8f2f26, lockShine: 0xe0574a, bolt: 0xb03a2e,
        pillar: 0x2b2e35, pillarEdge: 0x4d525c, rivet: 0xb03a2e,
        deck: 0x3b3f47, deckLip: 0x22242a, rail: 0x14151a,
        hazardA: 0x1c1d21, hazardB: 0xc0392b, hazardPlate: false,
      };
    }
    return {
      plate: C.steelBase, seam: 0x3f4247, truss: C.steelDark,
      beam: C.steelDark, face: C.steelLight, frame: C.steelBase,
      lock: C.steelDark, lockShine: C.steelLight, bolt: C.steelBase,
      pillar: C.steelDark, pillarEdge: C.steelLight, rivet: C.steelBase,
      deck: C.steelLight, deckLip: C.steelBase, rail: C.steelDark,
      hazardA: 0xffffff, hazardB: 0xd6453c, hazardPlate: false,
    };
  }

  static generateArmoredVariant(scene, key, layers, brokenCount, opts = {}) {
    const C = Constants.COLORS;
    const H = Constants.CRACK_HEIGHTS;
    const P = this.armoredPalette(opts.palette);
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    // Uma banda por ALTURA única, na ordem em que a altura aparece na ordem de
    // quebra. As bandas usam as MESMAS frações do CrackedWall sobre 720 — a
    // física (BossFight.layerBounds) e o desenho saem da mesma conta.
    const bandH = Constants.CRACK_BAND_HALF * 2;
    const heights = [];
    for (const name of layers) if (!heights.includes(name)) heights.push(name);
    const bands = heights.map((name) => {
      const hits = layers.filter((l, i) => l === name && i < brokenCount).length;
      return {
        center: H[name.toUpperCase()] * 720,
        // aberta só quando TODA ocorrência dessa altura já caiu...
        open: hits === layers.filter((l) => l === name).length,
        // ...mas uma altura repetida já MEIO quebrada mostra o estrago: sem
        // isso a primeira investida na dupla-blindagem não dá retorno nenhum
        damaged: hits > 0,
      };
    });

    // Fundo do vão: chapa escura com costuras verticais
    g.fillStyle(P.plate, 1);
    g.fillRect(40, 96, 160, 524);
    g.lineStyle(2, P.seam, 0.8);
    for (let x = 80; x < 200; x += 40) g.lineBetween(x, 96, x, 620);

    // Treliça diagonal (textura de estrutura, não gameplay)
    g.lineStyle(2, P.truss, 0.3);
    for (let y = 140; y < 640; y += 90) {
      g.lineBetween(40, y, 200, y - 70);
      g.lineBetween(40, y - 70, 200, y);
    }

    // Vigas horizontais entre as bandas
    g.fillStyle(P.beam, 1);
    for (const y of [268, 476]) g.fillRect(40, y, 160, 12);

    // Faixa de perigo no alto do vão (listra da cancela)
    g.fillStyle(P.hazardA, 1);
    g.fillRect(40, 98, 160, 12);
    g.fillStyle(P.hazardB, 1);
    for (let x = 44; x < 196; x += 28) g.fillRect(x, 98, 14, 12);

    if (opts.wrecked) {
      // Vão inteiro rasgado: buraco escuro do chão ao topo com franja de
      // tijolo âmbar nas bordas (o mesmo "âmbar = passagem" das paredes)
      g.fillStyle(0x2a1c10, 1);
      g.fillRect(44, 112, 152, 504);
      this.drawBricks(g, 44, 112, 24, 504, true);
      this.drawBricks(g, 172, 112, 24, 504, true);
      g.fillStyle(0x1a1109, 1);
      g.fillEllipse(120, 380, 128, 460);
      // Chapas retorcidas penduradas nas bordas do rasgo
      g.fillStyle(P.face, 1);
      g.save(); g.translateCanvas(58, 150); g.rotateCanvas(0.42);
      g.fillRect(0, 0, 54, 18); g.restore();
      g.save(); g.translateCanvas(190, 322); g.rotateCanvas(-2.75);
      g.fillRect(0, 0, 46, 16); g.restore();
      g.fillStyle(P.frame, 1);
      g.save(); g.translateCanvas(70, 486); g.rotateCanvas(0.22);
      g.fillRect(0, 0, 40, 12); g.restore();
      // Rachaduras subindo pelas bordas
      g.lineStyle(3, C.wallCrackLine, 1);
      g.lineBetween(68, 200, 92, 262);
      g.lineBetween(172, 300, 148, 356);
      g.lineBetween(70, 430, 96, 486);
    } else {
      // As bandas nas alturas das frestas
      for (const band of bands) {
        const top = Math.max(112, band.center - bandH / 2);
        const h = Math.min(bandH, 616 - top);
        if (band.open) {
          // Camada quebrada: tijolo âmbar exposto + buraco escuro + rachaduras
          this.drawBricks(g, 44, top, 152, h, true);
          g.fillStyle(0x2a1c10, 1);
          g.fillEllipse(120, top + h / 2, 104, h * 0.62);
          g.lineStyle(3, C.wallCrackLine, 1);
          g.lineBetween(66, top + h / 2, 92, top + 12);
          g.lineBetween(66, top + h / 2, 96, top + h - 10);
          g.lineBetween(174, top + h / 2, 150, top + 10);
          g.lineBetween(174, top + h / 2, 146, top + h - 12);
          // Entulho na borda inferior do buraco
          g.fillStyle(C.wallCrack, 1);
          [[86, top + h - 14, 9], [126, top + h - 10, 7], [156, top + h - 16, 8]]
            .forEach(([x, y, s]) => g.fillRect(x, y, s, s));
        } else {
          // Camada selada: placa aparafusada com travamento em X
          g.fillStyle(P.face, 1);
          g.fillRect(44, top, 152, h);
          g.lineStyle(4, P.frame, 1);
          g.strokeRect(44, top, 152, h);
          if (P.hazardPlate) {
            // Pele urbana: tarja de perigo atravessando a placa
            g.fillStyle(P.hazardA, 1);
            g.fillRect(44, top + h / 2 - 9, 152, 18);
            g.fillStyle(P.hazardB, 1);
            for (let x = 48; x < 192; x += 26) g.fillRect(x, top + h / 2 - 9, 13, 18);
          }
          g.lineStyle(8, P.lock, 1);
          g.lineBetween(48, top + 6, 192, top + h - 6);
          g.lineBetween(48, top + h - 6, 192, top + 6);
          g.lineStyle(2, P.lockShine, 0.7);
          g.lineBetween(48, top + 6, 192, top + h - 6);
          g.fillStyle(P.bolt, 1);
          for (const [bx, by] of [[54, top + 10], [186, top + 10], [54, top + h - 10], [186, top + h - 10], [120, top + 10], [120, top + h - 10]]) {
            g.fillCircle(bx, by, 5);
          }
          if (band.damaged) {
            // Meio quebrada: placa amassada, rachada e com o tijolo espiando
            g.fillStyle(0x000000, 0.22);
            g.fillEllipse(120, top + h / 2, 96, h * 0.46);
            g.lineStyle(3, C.wallCrackLine, 0.9);
            g.lineBetween(60, top + h / 2, 96, top + 14);
            g.lineBetween(96, top + 14, 128, top + h / 2);
            g.lineBetween(128, top + h / 2, 168, top + h - 14);
            g.lineBetween(84, top + h - 12, 112, top + h / 2);
            // furos abertos na chapa: aro de tijolo + miolo escuro
            [[92, top + h / 2 - 8, 13], [136, top + h / 2 + 2, 10]].forEach(([x, y, r]) => {
              g.fillStyle(C.wallCrack, 1); g.fillCircle(x, y, r);
              g.fillStyle(0x2a1c10, 1); g.fillCircle(x, y, r - 4);
            });
          }
        }
      }
    }

    // Pilares por cima das bordas das bandas
    for (const x0 of [0, 200]) {
      g.fillStyle(P.pillar, 1);
      g.fillRect(x0, 56, 40, 564);
      g.fillStyle(P.pillarEdge, 0.5);
      g.fillRect(x0 === 0 ? 0 : 232, 56, 8, 564);
      g.fillStyle(P.rivet, 1);
      for (let y = 84; y < 620; y += 48) g.fillCircle(x0 + 20, y, 4);
    }

    // Plataforma do caçador: laje no topo + guarda-corpo
    g.fillStyle(P.deck, 1);
    g.fillRect(8, 82, 224, 14);
    g.fillStyle(P.deckLip, 1);
    g.fillRect(8, 92, 224, 4);
    g.lineStyle(4, P.rail, 1);
    g.lineBetween(8, 58, 232, 58);
    for (let x = 16; x <= 224; x += 52) g.lineBetween(x, 58, x, 82);

    if (opts.wrecked) {
      // Entulho amontoado na boca do vão + fumaça subindo (marco visual de
      // que o portão CAIU — mesma leitura do zoo-gate-broken)
      g.fillStyle(C.wallOrangeDark, 1);
      g.fillTriangle(40, 616, 108, 616, 74, 566);
      g.fillTriangle(126, 616, 200, 616, 164, 578);
      g.fillStyle(C.wallCrack, 1);
      g.fillTriangle(84, 616, 140, 616, 112, 580);
      [[62, 604, 11], [104, 600, 9], [142, 606, 8], [180, 602, 10]]
        .forEach(([x, y, s]) => g.fillRect(x, y, s, s));
      g.fillStyle(P.frame, 1);
      [[92, 592, 14, 6], [150, 596, 18, 5]].forEach(([x, y, w, h]) => g.fillRect(x, y, w, h));
      g.fillStyle(0xc6cbd2, 0.15);
      [[92, 556, 26], [118, 524, 22], [98, 488, 19], [126, 452, 16], [106, 416, 13]]
        .forEach(([x, y, r]) => g.fillCircle(x, y, r));
      g.fillStyle(0xe8e9ec, 0.11);
      [[104, 544, 17], [110, 500, 14], [116, 462, 11], [112, 424, 9]]
        .forEach(([x, y, r]) => g.fillCircle(x, y, r));
    }

    // Sombra na base (assenta o portão no chão)
    g.fillStyle(0x000000, 0.18);
    g.fillRect(40, 612, 160, 8);

    g.generateTexture(key, 240, 620);
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

    this.generateTranqTowerCity(scene);
  }

  // Versão urbana: poste de vigilância com caixa d'água. Mesmo canvas 84x120 e
  // a MESMA seteira em (36,70) — o disparo sai de `this.y + 38` (TranqTower
  // .preUpdate), então mover a abertura desalinharia o dardo do desenho.
  static generateTranqTowerCity(scene) {
    const K = this.CITY;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const slit = 0x1a1d21;

    // Poste treliçado
    g.fillStyle(K.metalDark, 1);
    g.fillRect(20, 50, 8, 70);
    g.fillRect(56, 50, 8, 70);
    g.fillStyle(K.metal, 0.7);
    for (let y = 54; y < 118; y += 16) {           // travessas em X
      g.fillRect(24, y, 36, 3);
      g.fillTriangle(26, y + 3, 30, y + 3, 58, y + 15);
      g.fillTriangle(54, y + 3, 58, y + 3, 26, y + 15);
    }
    g.fillStyle(K.pillar, 1);                      // sapata
    g.fillRect(12, 112, 60, 8);

    // Caixa d'água cilíndrica no topo
    g.fillStyle(K.metal, 1);
    g.fillRect(14, 16, 56, 34);
    g.fillStyle(K.metalDark, 1);
    g.fillRect(56, 16, 14, 34);                    // lado em sombra
    g.fillEllipse(42, 16, 56, 12);
    g.fillStyle(K.slab, 1);
    g.fillEllipse(42, 14, 48, 9);
    g.fillStyle(K.metalDark, 1);                   // cintas
    g.fillRect(14, 26, 56, 3);
    g.fillRect(14, 40, 56, 3);

    // Módulo de vigilância com a seteira do dardo, na altura de sempre
    g.fillStyle(K.body, 1);
    g.fillRect(26, 56, 32, 46);
    g.fillStyle(K.pillar, 1);
    g.fillRect(26, 56, 32, 5);
    g.fillStyle(slit, 1);
    g.fillRect(36, 70, 10, 32);
    g.fillCircle(41, 70, 5);
    g.fillStyle(K.metal, 0.8);                     // trilho da abertura
    g.fillRect(33, 66, 16, 2);

    // Luz de alerta piscando no topo
    g.fillStyle(K.metalDark, 1);
    g.fillRect(39, 2, 6, 8);
    g.fillStyle(0xff5a4a, 1);
    g.fillCircle(42, 3, 5);
    g.fillStyle(0xffd0c8, 0.8);
    g.fillCircle(41, 2, 2);

    g.generateTexture('tranq-tower-city', 84, 120);
    g.destroy();
  }

  // Dardo tranquilizante: seringa com agulha na frente (voa para a esquerda)
  // e penacho na cauda. v1.8.3 (pedido do dono): 50% MAIOR (42×15 — era
  // 28×10, difícil de ver) e cores chamativas — líquido e penacho VERMELHO
  // VIVO com contorno preto grosso. O corpo segue CLARO de propósito: o
  // rifle do boss pinta o mesmo sprite com tint dourado (multiplicativo), e
  // partir do branco faz o dourado sair exato. A HITBOX não muda (24×8, no
  // TranqDart) — só a imagem cresceu.
  static generateTranqDart(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xcfd4da, 1);
    g.fillRect(0, 6, 11, 3);
    g.fillStyle(0xffffff, 1);
    g.fillRect(11, 3, 19, 9);
    g.fillStyle(0xff2b2b, 1);
    g.fillRect(14, 4.5, 13, 6);
    g.fillStyle(0xffffff, 0.6);
    g.fillRect(12, 4, 12, 2);
    g.lineStyle(2, 0x141518, 1);
    g.strokeRect(11, 3, 19, 9);
    g.fillStyle(0xff2b2b, 1);
    g.fillTriangle(30, 7.5, 42, 0, 42, 15);
    g.lineStyle(2, 0x141518, 1);
    g.strokeTriangle(30, 7.5, 42, 0, 42, 15);
    g.generateTexture('tranq-dart', 42, 15);
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

  // Chão da cidade: mesmo canvas 1280x100 do `ground`, para o tileSprite do
  // mundo inteiro poder trocar de textura sem recriar nada. Sem asfalto aqui,
  // o rino escapa para a cidade e continua correndo sobre grama de zoológico.
  static generateGroundCity(scene) {
    const w = 1280, h = 100;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    g.fillStyle(0x3a4149, 1);            // asfalto
    g.fillRect(0, 12, w, h - 12);
    g.fillStyle(0x9aa0a6, 1);            // meio-fio
    g.fillRect(0, 0, w, 12);
    g.fillStyle(0x7f858b, 1);
    g.fillRect(0, 10, w, 3);

    // Faixa central tracejada (passo 80 divide 1280 — emenda perfeita)
    g.fillStyle(0xe8d98a, 1);
    for (let x = 0; x < w; x += 80) g.fillRect(x + 12, 52, 44, 6);

    // Textura do asfalto: pedrinhas determinísticas, sem Math.random
    let seed = 31;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let i = 0; i < 26; i++) {
      g.fillStyle(i % 2 === 0 ? 0x454d55 : 0x2f353c, 1);
      g.fillCircle(rnd() * w, 20 + rnd() * 76, 2 + rnd() * 3);
    }
    // Bueiros e juntas
    g.fillStyle(0x2b3138, 1);
    [180, 700, 1140].forEach((x) => g.fillEllipse(x, 82, 46, 16));
    g.fillStyle(0x4a525a, 0.7);
    for (let x = 0; x < w; x += 160) g.fillRect(x, 12, 3, h - 12);

    g.generateTexture('ground-city', w, h);
    g.destroy();
  }

  // ----------------------------------------------------------------- ramps

  static generateRamps(scene) {
    for (const [name, spec] of Object.entries(Constants.RAMP_VARIANTS)) {
      this.generateRampVariant(scene, `ramp-${name}`, spec);
      this.generateRampRubble(scene, `ramp-${name}-rubble`, spec);
      // Irmãs de cidade: MESMO canvas por variante (a rampa tem origin (0,1);
      // um canvas diferente faria o entulho saltar de posição no smash)
      this.generateRampCity(scene, `ramp-${name}-city`, spec);
      this.generateRampCityRubble(scene, `ramp-${name}-city-rubble`, spec);
    }
  }

  // Rampa de concreto e asfalto, com pichação — o skin do modo infinito.
  // Terra e grama no meio da cidade era o que mais destoava.
  static generateRampCity(scene, key, spec) {
    const K = this.CITY;
    const w = spec.asc + spec.top + spec.desc;
    const h = spec.rise + Constants.RAMP_SKIRT;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const STEP = 2, ASPHALT = 14;
    let seed = 47;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

    // Massa de concreto em colunas de 2px — mesma técnica da rampa de terra
    // (nada de fillGradientStyle, e largura sempre positiva)
    for (let x = 0; x < w; x += STEP) {
      const bw = Math.min(STEP, w - x);
      if (bw <= 0) continue;
      const ty = spec.rise - this.rampRise(spec, x + bw / 2);
      g.fillStyle(0x6d7683, 1);                 // concreto
      g.fillRect(x, ty, bw, h - ty);
      g.fillStyle(0x5a626d, 1);                 // sombra na base
      g.fillRect(x, h - 16, bw, 16);
      g.fillStyle(0x2f353c, 1);                 // capa de asfalto
      g.fillRect(x, ty, bw, ASPHALT);
      g.fillStyle(0x454d55, 0.6);
      g.fillRect(x, ty, bw, 3);
    }

    // Marcas de fôrma. As juntas horizontais PRECISAM ser recortadas pela
    // silhueta: um fillRect de largura total vazaria para fora da rampa e
    // riscaria o céu.
    g.fillStyle(0x5a626d, 0.8);
    for (let x = 0; x < w; x += STEP) {
      const bw = Math.min(STEP, w - x);
      if (bw <= 0) continue;
      const ty = spec.rise - this.rampRise(spec, x + bw / 2);
      for (let y = ty + ASPHALT + 14; y < h - 16; y += 22) g.fillRect(x, y, bw, 2);
    }
    for (let x = 40; x < w - 14; x += 64) {
      const ty = spec.rise - this.rampRise(spec, x);
      if (ty + ASPHALT < h - 16) g.fillRect(x, ty + ASPHALT, 2, h - 16 - ty - ASPHALT);
    }

    // Faixa amarela tracejada no asfalto, acompanhando a inclinação (o mesmo
    // vocabulário do ground-city)
    g.fillStyle(0xe8d98a, 1);
    for (let x = 10; x < w - 24; x += 46) {
      const ty = spec.rise - this.rampRise(spec, x + 12);
      g.fillRect(x, ty + 6, 26, 3);
    }

    // Pichação: tags angulares no paramento, determinísticas (LCG — os testes
    // comparam screenshots, então nada de Math.random aqui)
    const tags = [0xf25f5c, 0x4ecdc4, 0xffd94a, 0xbb77ff];
    for (let i = 0; i < 5; i++) {
      const tx = 26 + rnd() * (w - 96);
      const ty = spec.rise - this.rampRise(spec, tx) + ASPHALT + 10;
      if (ty > h - 26) continue;
      const tw = 26 + rnd() * 24;
      g.fillStyle(tags[i % tags.length], 0.9);
      g.fillRect(tx + 8, ty + 5, tw - 8, 7);                       // barra
      g.fillTriangle(tx + 8, ty, tx + 8, ty + 17, tx - 4, ty + 9);  // ponta
      g.fillRect(tx + tw * 0.6, ty - 4, 7, 17);                     // haste
      g.fillStyle(0xffffff, 0.3);                                   // brilho
      g.fillRect(tx + 10, ty + 5, tw - 14, 2);
    }

    // Penhasco do trampolim: laje arrebentada com vergalhão à mostra.
    // TUDO dentro do canvas — o que passa de `w` é recortado no
    // generateTexture e some sem aviso.
    if (spec.desc <= 0) {
      g.fillStyle(0x5a626d, 1);                 // face fraturada
      g.fillRect(w - 16, 0, 16, h);
      g.fillStyle(0x454d55, 1);                 // estratos da fratura
      for (let y = 20; y < h; y += 18) g.fillRect(w - 16, y, 16, 3);
      // Mordidas irregulares na quina, para não parecer serrado a laser
      g.fillStyle(0x6d7683, 1);
      for (let y = 8; y < h - 20; y += 26) {
        g.fillTriangle(w - 16, y, w - 16, y + 14, w - 4, y + 7);
      }
      g.fillStyle(0x2f353c, 1);                 // beirada de asfalto no topo
      g.fillRect(w - 18, 0, 18, ASPHALT);
      g.fillStyle(0x8a7f6a, 1);                 // vergalhão exposto e torto
      [[w - 13, 22, 11], [w - 9, 46, 7], [w - 14, 70, 13]].forEach(([bx, by, len]) => {
        if (by + 4 > h) return;
        g.fillRect(bx, by, len, 3);
        g.fillRect(bx + len - 3, by - 7, 3, 8);
      });
    }

    g.generateTexture(key, w, h);
    g.destroy();
  }

  // Entulho urbano: laje partida e vergalhão, no lugar do monte de terra
  static generateRampCityRubble(scene, key, spec) {
    const w = spec.asc + spec.top + spec.desc;
    const h = spec.rise + Constants.RAMP_SKIRT;
    const base = spec.rise;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    let seed = 29;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

    g.fillStyle(0x5a626d, 1);
    g.fillRect(0, base, w, h - base);            // a saia segue enterrada

    // Lajes tombadas, umas sobre as outras, com a capa de asfalto ainda
    // agarrada — é o que faz o monte ler como rua arrebentada e não como pedra
    for (let x = -10; x < w; x += 26) {
      const bw = Math.min(30 + rnd() * 14, w - x);
      if (bw <= 6) continue;
      const top = base - (10 + rnd() * 26);
      g.fillStyle(rnd() < 0.5 ? 0x6d7683 : 0x565e69, 1);
      g.fillRect(Math.max(0, x), top, bw - Math.max(0, -x), base - top + 6);
      g.fillStyle(0x2f353c, 1);
      g.fillRect(Math.max(0, x), top, bw - Math.max(0, -x), 5);
      g.fillStyle(0x454d55, 0.7);                // aresta partida
      g.fillRect(Math.max(0, x), top + 5, 3, base - top);
    }

    // Cacos e vergalhão torto
    for (let i = 0; i < 12; i++) {
      g.fillStyle(i % 2 === 0 ? 0x7f8996 : 0x454d55, 1);
      g.fillRect(rnd() * w, base - rnd() * 16, 5 + rnd() * 7, 4 + rnd() * 4);
    }
    g.fillStyle(0x8a7f6a, 1);
    for (let x = 18; x < w - 20; x += 78) {
      g.fillRect(x, base - 20, 3, 20);
      g.fillRect(x, base - 20, 14, 3);
    }

    g.generateTexture(key, w, h);
    g.destroy();
  }

  // Altura do terreno acima do chão, para t em [0, spanW]. É a MESMA fórmula
  // de Ramp.surfaceY — silhueta desenhada e superfície de colisão saem da
  // mesma conta, senão o visual descola da física na primeira mudança de spec.
  static rampRise(spec, t) {
    const { asc, rise, top, desc } = spec;
    if (t < asc) return rise * (t / asc);
    if (t < asc + top || desc <= 0) return rise; // desc 0 = penhasco
    return rise * (1 - (t - asc - top) / desc);
  }

  static generateRampVariant(scene, key, spec) {
    const C = Constants.COLORS;
    const w = spec.asc + spec.top + spec.desc;
    const h = spec.rise + Constants.RAMP_SKIRT;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const STEP = 2, GRASS = 12;

    // Massa de terra em colunas de 2px em vez de um polígono: preenchimento
    // chapado (nada de fillGradientStyle, que não renderiza no SwiftShader) e
    // largura sempre positiva (o fillRect negativo do drawBricks corrompe o
    // batch WebGL e apaga o resto da textura em silêncio).
    for (let x = 0; x < w; x += STEP) {
      const bw = Math.min(STEP, w - x);
      if (bw <= 0) continue;
      const ty = spec.rise - this.rampRise(spec, x + bw / 2);
      g.fillStyle(C.dirtBrown, 1);
      g.fillRect(x, ty, bw, h - ty);
      g.fillStyle(C.dirtLight, 1);          // terra socada logo sob a grama
      g.fillRect(x, ty + GRASS, bw, 8);
      g.fillStyle(C.dirtDark, 1);           // sombra na base
      g.fillRect(x, h - 18, bw, 18);
      g.fillStyle(C.grassGreen, 1);         // capa de grama na inclinação
      g.fillRect(x, ty, bw, GRASS);
      g.fillStyle(C.grassDark, 0.5);
      g.fillRect(x, ty, bw, 3);
    }

    // Pedrinhas por LCG determinístico (o teste headless compara screenshots)
    let seed = 23;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let i = 0; i < 14; i++) {
      const px = rnd() * w;
      const surf = spec.rise - this.rampRise(spec, px);
      const py = surf + GRASS + 10 + rnd() * Math.max(4, h - surf - GRASS - 16);
      g.fillStyle(i % 2 === 0 ? C.dirtDark : C.dirtLight, 1);
      g.fillCircle(px, py, 2 + rnd() * 3);
    }

    // Penhasco do trampolim: face vertical de terra exposta com estratos
    if (spec.desc <= 0) {
      g.fillStyle(C.dirtDark, 1);
      g.fillRect(w - 12, 0, 12, h);
      g.fillStyle(C.dirtLight, 0.6);
      for (let y = 16; y < h; y += 16) g.fillRect(w - 12, y, 12, 3);
      g.fillStyle(C.grassGreen, 1); // beirada de grama debruçada no vazio
      g.fillRect(w - 14, 0, 14, GRASS);
      g.fillStyle(C.grassDark, 0.5);
      g.fillRect(w - 14, 0, 14, 3);
    }

    // Tufos serrilhados pendurados na linha da grama (mesmo motivo do chão)
    g.fillStyle(C.grassDark, 1);
    for (let x = 0; x < w; x += 16) {
      const t0 = spec.rise - this.rampRise(spec, x);
      const t1 = spec.rise - this.rampRise(spec, Math.min(w, x + 16));
      g.fillTriangle(x, t0 + GRASS, x + 16, t1 + GRASS, x + 8, (t0 + t1) / 2 + GRASS + 6);
    }

    g.generateTexture(key, w, h);
    g.destroy();
  }

  // Entulho: MESMO canvas da íntegra — com origin (0,1) um canvas diferente
  // faria o escombro saltar de posição no frame da explosão.
  static generateRampRubble(scene, key, spec) {
    const C = Constants.COLORS;
    const w = spec.asc + spec.top + spec.desc;
    const h = spec.rise + Constants.RAMP_SKIRT;
    const base = spec.rise; // linha do chão em coordenadas de textura
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    let seed = 11;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

    g.fillStyle(C.dirtBrown, 1);
    g.fillRect(0, base, w, h - base); // a saia continua enterrada no chão

    for (let x = 0; x < w; x += 6) {
      const bw = Math.min(6, w - x);
      if (bw <= 0) continue;
      const top = base - (4 + rnd() * 20);
      g.fillStyle(rnd() < 0.5 ? C.dirtBrown : C.dirtDark, 1);
      g.fillRect(x, top, bw, base - top + 6);
    }
    for (let i = 0; i < 14; i++) {
      g.fillStyle(i % 2 === 0 ? C.dirtLight : C.wallCrackLine, 1);
      g.fillCircle(rnd() * w, base - rnd() * 20, 2 + rnd() * 3);
    }
    g.fillStyle(C.grassDark, 1); // tufos arrancados por cima do monte
    for (let x = 4; x < w - 12; x += 22) {
      g.fillTriangle(x, base - 6, x + 10, base - 6, x + 5, base - 14);
    }

    g.generateTexture(key, w, h);
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
  // da noite acompanha a distância (fuga aos 1000m = pôr do sol; o modo
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
    const rocks = (g, x, y) => {
      g.fillStyle(0xb0a894, 1);
      g.fillEllipse(x, y, 60, 26);
      g.fillStyle(0x9a9280, 1);
      g.fillEllipse(x + 42, y + 8, 44, 20);
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

    // ---------- props temáticos da v1.6 (bioma distante) ----------
    // LINHA DE BASE do bioma distante. A camada da frente (bg-near) é opaca a
    // partir da tela y=560, ou seja, textura far y=360 — tudo que "pisa no
    // chão" no fundo precisa ficar ACIMA disso para não sumir atrás da grama.
    const FAR_BASE = 336;

    // Silhueta de bicho preso, vista de longe atrás das grades
    const caged = (g, x, kind, base) => {
      g.fillStyle(0x4a3f36, 0.85);
      if (kind === 'lion') {
        g.fillEllipse(x, base - 24, 54, 26);       // corpo
        g.fillCircle(x - 26, base - 44, 17);       // juba
        g.fillRect(x - 12, base - 20, 6, 20);
        g.fillRect(x + 14, base - 20, 6, 20);
      } else { // tigre andando de um lado para o outro
        g.fillEllipse(x, base - 22, 50, 20);
        g.fillCircle(x + 26, base - 34, 13);
        g.fillRect(x - 14, base - 18, 5, 18); g.fillRect(x + 10, base - 18, 5, 18);
      }
    };
    const bigCage = (g, x, w, kind, base = FAR_BASE) => {
      const top = base - 128;
      g.fillStyle(0x6b7078, 1);
      g.fillRect(x - 6, top, w + 12, 14);          // travessa
      g.fillRect(x - 6, base - 8, w + 12, 8);      // base
      g.fillStyle(0x2b3138, 0.35);                 // penumbra do fundo da jaula
      g.fillRect(x, top + 8, w, 116);
      caged(g, x + w / 2, kind, base - 8);
      g.fillStyle(0x8a929c, 1);                    // grades POR CIMA do bicho
      for (let i = 0; i * 22 < w; i++) g.fillRect(x + 4 + i * 22, top + 8, 7, 116);
    };
    const keeperHut = (g, x, base = FAR_BASE) => {
      g.fillStyle(0xd8c9a6, 1);
      g.fillRect(x, base - 98, 108, 98);
      g.fillStyle(0xb4552f, 1);                    // telhado
      g.fillTriangle(x - 14, base - 98, x + 122, base - 98, x + 54, base - 146);
      g.fillStyle(0x6a89a8, 1);                    // janela
      g.fillRect(x + 18, base - 76, 30, 26);
      g.fillStyle(0x7a5230, 1);                    // porta
      g.fillRect(x + 66, base - 54, 26, 54);
    };
    const noticeBoard = (g, x, y) => {
      g.fillStyle(0x7a5230, 1);
      g.fillRect(x + 20, y + 34, 8, 46);           // poste
      g.fillStyle(0xf3e2b8, 1);
      g.fillRect(x, y, 48, 36);
      g.lineStyle(3, 0xb4552f, 1);
      g.strokeRect(x, y, 48, 36);
      g.fillStyle(0xb4552f, 1);                    // "texto" em barras
      g.fillRect(x + 7, y + 9, 34, 4);
      g.fillRect(x + 7, y + 17, 26, 4);
      g.fillRect(x + 7, y + 25, 30, 4);
    };
    // Pássaro distante em V. As bordas ganham cópia ±640 no chamador.
    const flyBird = (g, x, y, s, c = 0x3a4152) => {
      g.lineStyle(2.5 * s, c, 0.85);
      g.lineBetween(x - 9 * s, y, x, y - 5 * s);
      g.lineBetween(x, y - 5 * s, x + 9 * s, y);
    };
    const palm = (g, x, s) => {
      g.fillStyle(0x8a5a2b, 1);
      g.fillRect(x - 5 * s, 300, 10 * s, 120);
      g.fillStyle(0x3f8a4e, 1);
      [[-1, -0.35], [-0.7, 0.15], [0, -0.75], [0.7, 0.15], [1, -0.35]].forEach(([dx, dy]) => {
        g.fillTriangle(x, 302, x + 62 * s * dx, 300 + 58 * s * dy, x + 40 * s * dx, 322 + 30 * s * dy);
      });
      g.fillStyle(0xc0762e, 1);                    // cachos de coco
      g.fillCircle(x - 8 * s, 306, 5 * s);
      g.fillCircle(x + 7 * s, 308, 5 * s);
    };
    // Pernas no chão da SAVANA, corpo bem acima da linha da grama da frente
    const giraffeSil = (g, x, s, base = FAR_BASE) => {
      g.fillStyle(0x8d6b3f, 1);
      g.fillRect(x - 22 * s, base - 54, 9 * s, 54 * s);  // pernas
      g.fillRect(x + 13 * s, base - 54, 9 * s, 54 * s);
      g.fillEllipse(x, base - 66, 76 * s, 40 * s);       // corpo
      g.fillRect(x + 18 * s, base - 152, 15 * s, 92 * s); // pescoço
      g.fillEllipse(x + 30 * s, base - 152, 30 * s, 16 * s); // cabeça
      g.lineStyle(3 * s, 0x8d6b3f, 1);                   // ossículos
      g.lineBetween(x + 24 * s, base - 160, x + 22 * s, base - 172);
      g.lineBetween(x + 34 * s, base - 160, x + 36 * s, base - 172);
      g.fillStyle(0x6b4f2c, 1);                          // manchas
      [[-22, -76], [-2, -84], [16, -68], [4, -58], [24, -120]].forEach(([dx, dy]) =>
        g.fillCircle(x + dx * s, base + dy * s, 7 * s));
    };
    const lionSil = (g, x, s, base = FAR_BASE) => {
      g.fillStyle(0xc98b46, 1);
      g.fillRect(x - 22 * s, base - 22, 9 * s, 22 * s);
      g.fillRect(x + 16 * s, base - 22, 9 * s, 22 * s);
      g.fillEllipse(x, base - 34, 76 * s, 32 * s);
      g.fillStyle(0x9c5f2c, 1);
      g.fillCircle(x - 38 * s, base - 48, 23 * s);       // juba
      g.fillStyle(0xd9a45f, 1);
      g.fillCircle(x - 38 * s, base - 48, 14 * s);
      g.lineStyle(4 * s, 0xc98b46, 1);                   // rabo
      g.lineBetween(x + 38 * s, base - 40, x + 58 * s, base - 58);
    };
    const termiteMound = (g, x, s, base = FAR_BASE) => {
      g.fillStyle(0xa8763f, 1);
      g.fillTriangle(x - 28 * s, base, x + 28 * s, base, x, base - 104 * s);
      g.fillStyle(0x8c5f31, 1);
      g.fillTriangle(x + 4 * s, base, x + 28 * s, base, x + 11 * s, base - 76 * s);
    };
    // Floresta: tronco grosso com raízes tabulares
    // Tronco INTEIRO, do dossel ao chão: é ele que amarra a copa à mata e
    // faz a floresta parecer fechada em vez de duas faixas soltas.
    const jungleTree = (g, x, s) => {
      g.fillStyle(0x5c4326, 1);
      g.fillRect(x - 18 * s, 40, 36 * s, 380);
      g.fillTriangle(x - 18 * s, 420, x - 18 * s, 344, x - 56 * s, 420); // raiz esq.
      g.fillTriangle(x + 18 * s, 420, x + 18 * s, 344, x + 56 * s, 420); // raiz dir.
      g.fillStyle(0x74522f, 1);
      g.fillRect(x + 7 * s, 40, 11 * s, 380);      // lado iluminado
      g.fillStyle(0x2f6b34, 1);                    // musgo
      g.fillEllipse(x - 10 * s, 330, 16 * s, 34);
      g.fillEllipse(x - 12 * s, 240, 13 * s, 26);
    };
    const canopy = (g) => {
      g.fillStyle(0x1f5528, 1);
      g.fillRect(0, 0, 640, 46);
      g.fillStyle(0x2c6d33, 1);
      for (let x = -20; x < 660; x += 58) g.fillCircle(x, 48, 42);
      g.fillStyle(0x3a8440, 1);
      for (let x = 10; x < 660; x += 58) g.fillCircle(x, 34, 30);
    };
    const liana = (g, x, len) => {
      g.lineStyle(4, 0x2f6b34, 1);
      g.lineBetween(x, 40, x + 8, 40 + len * 0.5);
      g.lineBetween(x + 8, 40 + len * 0.5, x - 4, 40 + len);
      g.fillStyle(0x3a8440, 1);
      for (let i = 1; i < 4; i++) g.fillEllipse(x + 6 - i * 3, 40 + (len / 4) * i, 16, 8);
    };
    const monkeySil = (g, x, y, s = 1) => {
      g.fillStyle(0x6b4a2c, 1);
      g.fillEllipse(x, y, 26 * s, 32 * s);         // corpo pendurado
      g.fillCircle(x, y - 24 * s, 13 * s);         // cabeça
      g.fillCircle(x - 12 * s, y - 26 * s, 5 * s);
      g.fillCircle(x + 12 * s, y - 26 * s, 5 * s);
      g.lineStyle(4 * s, 0x6b4a2c, 1);
      g.lineBetween(x, y - 30 * s, x - 4 * s, 42); // braço até o galho
      g.lineBetween(x + 10 * s, y + 8 * s, x + 30 * s, y + 26 * s); // rabo
      g.fillStyle(0xc9a06a, 1);
      g.fillCircle(x, y - 22 * s, 7 * s);          // focinho
    };
    const fruitTree = (g, x, s) => {
      g.fillStyle(0x6b4a2c, 1);
      g.fillRect(x - 7 * s, 320, 14 * s, 100);
      g.fillStyle(0x357a3a, 1);
      g.fillCircle(x, 300, 46 * s);
      g.fillCircle(x - 30 * s, 318, 30 * s);
      g.fillCircle(x + 30 * s, 318, 30 * s);
      g.fillStyle(0xf2b134, 1);                    // frutas
      [[-22, 300], [6, 288], [24, 312], [-4, 322]].forEach(([dx, dy]) =>
        g.fillCircle(x + dx * s, dy, 7 * s));
    };
    // Pântano: água com reflexo em listras horizontais (nada de gradiente)
    const swampWater = (g, top) => {
      g.fillStyle(0x3c6b63, 1);
      g.fillRect(0, top, 640, 420 - top);
      for (let i = 0; i < 8; i++) {
        g.fillStyle(0x4f867c, 0.5 - i * 0.05);
        g.fillRect(0, top + 8 + i * 14, 640, 5);
      }
      g.fillStyle(0xbfe3d8, 0.3);                  // brilhos
      [[70, 26], [230, 54], [400, 34], [530, 70]].forEach(([x, dy]) =>
        g.fillEllipse(x, top + dy, 62, 5));
    };
    const mangrove = (g, x, s) => {
      g.fillStyle(0x4a3a26, 1);
      g.fillRect(x - 8 * s, 236, 16 * s, 76);
      g.lineStyle(6 * s, 0x4a3a26, 1);             // raízes-escora
      [-34, -18, 18, 34].forEach((dx) => g.lineBetween(x, 296, x + dx * s, 342));
      g.fillStyle(0x2f6b4a, 1);
      g.fillEllipse(x, 226, 116 * s, 44 * s);
      g.fillStyle(0x3f8a5e, 1);
      g.fillEllipse(x - 22 * s, 216, 78 * s, 32 * s);
    };
    const gatorSil = (g, x, y, s) => {
      g.fillStyle(0x2f5a3a, 1);
      g.fillEllipse(x, y, 150 * s, 20 * s);        // dorso à flor da água
      g.fillTriangle(x + 62 * s, y - 6 * s, x + 108 * s, y + 2 * s, x + 62 * s, y + 8 * s); // focinho
      g.fillStyle(0x24472e, 1);                    // escamas
      for (let i = -3; i <= 3; i++) {
        g.fillTriangle(x + i * 18 * s - 5, y - 8 * s, x + i * 18 * s + 5, y - 8 * s, x + i * 18 * s, y - 18 * s);
      }
      g.fillStyle(0xd7c24a, 1);                    // olho
      g.fillCircle(x + 46 * s, y - 10 * s, 4 * s);
    };
    const glassTank = (g, x, w) => {
      g.fillStyle(0x2b6a8a, 0.85);
      g.fillRect(x, 214, w, 120);
      g.fillStyle(0x9ad7ef, 0.25);                 // reflexo no vidro
      g.fillRect(x + 6, 220, 16, 108);
      g.lineStyle(5, 0x8a929c, 1);
      g.strokeRect(x, 214, w, 120);
      g.fillStyle(0xf2a33c, 1);                    // peixinhos
      [[26, 248], [66, 284], [104, 234]].forEach(([dx, dy]) => {
        g.fillEllipse(x + dx, dy, 20, 11);
        g.fillTriangle(x + dx - 10, dy, x + dx - 18, dy - 6, x + dx - 18, dy + 6);
      });
      g.fillStyle(0x3f8a5e, 1);                    // plantas do fundo
      for (let i = 0; i < 4; i++) g.fillEllipse(x + 16 + i * 30, 324, 10, 26);
    };
    // Cidade: prédio com janelas acesas (padrão determinístico, sem random)
    const cityBlock = (g, x, y, w, h, c, lit) => {
      g.fillStyle(c, 1);
      g.fillRect(x, y, w, h);
      g.fillStyle(0x000000, 0.12);                 // lateral em sombra
      g.fillRect(x + w - 8, y, 8, h);
      for (let wy = y + 12; wy < y + h - 14; wy += 22) {
        for (let wx = x + 8; wx < x + w - 12; wx += 20) {
          const on = ((wx * 7 + wy * 13) % 5) < 2;
          g.fillStyle(on ? lit : 0x2f3b4d, on ? 1 : 0.65);
          g.fillRect(wx, wy, 11, 13);
        }
      }
    };
    const crane = (g, x) => {
      g.lineStyle(5, 0xe0a53c, 1);
      g.lineBetween(x, 420, x, 150);
      g.lineBetween(x - 70, 158, x + 130, 158);
      g.lineBetween(x - 70, 158, x, 130);
      g.lineBetween(x + 130, 158, x, 130);
      g.lineStyle(2, 0x9aa2ac, 1);
      g.lineBetween(x + 96, 158, x + 96, 214);
      g.fillStyle(0xe0a53c, 1);
      g.fillRect(x + 88, 214, 18, 16);
    };
    const billboard = (g, x, y) => {
      g.fillStyle(0x6a727c, 1);
      g.fillRect(x + 22, y + 54, 8, 60);
      g.fillRect(x + 66, y + 54, 8, 60);
      g.fillStyle(0xf25f5c, 1);
      g.fillRect(x, y, 96, 56);
      g.fillStyle(0xffe066, 1);
      g.fillRect(x + 8, y + 10, 52, 8);
      g.fillRect(x + 8, y + 24, 74, 8);
      g.fillRect(x + 8, y + 38, 38, 8);
    };

    // ---------- props temáticos da v1.6 (bioma próximo) ----------
    const trough = (g, x) => {
      g.fillStyle(0x8a5f2e, 1);
      g.fillRect(x, 218, 92, 30);
      g.fillStyle(0x6b4a24, 1);
      g.fillRect(x, 218, 92, 8);
      g.fillStyle(0xb4552f, 1);                    // ração dentro
      g.fillEllipse(x + 46, 226, 70, 10);
    };
    const padlock = (g, x, y, s) => {
      g.lineStyle(6 * s, 0xc9ccd1, 1);
      g.beginPath(); g.arc(x, y, 11 * s, Math.PI, 0); g.strokePath();
      g.fillStyle(0xe0a53c, 1);
      g.fillRoundedRect(x - 15 * s, y, 30 * s, 26 * s, 4 * s);
      g.fillStyle(0x8a6a22, 1);
      g.fillCircle(x, y + 12 * s, 4 * s);
    };
    const nestBox = (g, x, y) => {
      g.fillStyle(0x8a5f2e, 1);
      g.fillRect(x, y, 46, 44);
      g.fillStyle(0x6b4a24, 1);
      g.fillTriangle(x - 6, y, x + 52, y, x + 23, y - 18);
      g.fillStyle(0x2b2118, 1);
      g.fillCircle(x + 23, y + 18, 10);
      g.fillStyle(0x8a5f2e, 1);
      g.fillRect(x + 20, y + 30, 7, 16);           // poleirinho
    };
    const birdBath = (g, x) => {
      g.fillStyle(0xb0a894, 1);
      g.fillRect(x + 18, 208, 14, 48);
      g.fillEllipse(x + 25, 206, 74, 20);
      g.fillStyle(0x6fb7d8, 1);
      g.fillEllipse(x + 25, 204, 58, 12);
    };
    const waterhole = (g, x, w) => {
      g.fillStyle(0x4a7f86, 1);
      g.fillEllipse(x, 250, w, 26);
      g.fillStyle(0x76aeb4, 0.7);
      g.fillEllipse(x - 6, 246, w * 0.6, 12);
      g.fillStyle(0x8a7a58, 1);                    // barro na borda
      g.fillEllipse(x - w * 0.5, 256, 30, 10);
      g.fillEllipse(x + w * 0.48, 256, 26, 9);
    };
    const fern = (g, x, s) => {
      g.fillStyle(0x2f6b34, 1);
      for (let i = -2; i <= 2; i++) {
        g.fillTriangle(x - 4, 260, x + 4, 260, x + i * 26 * s, 260 - (66 - Math.abs(i) * 12) * s);
      }
      g.fillStyle(0x3f8a40, 1);
      for (let i = -1; i <= 1; i++) {
        g.fillTriangle(x - 3, 260, x + 3, 260, x + i * 16 * s, 260 - 76 * s);
      }
    };
    const lilyPad = (g, x, y, s) => {
      g.fillStyle(0x3f8a5e, 1);
      g.fillEllipse(x, y, 44 * s, 16 * s);
      g.fillStyle(0x2f6b4a, 1);
      g.fillTriangle(x, y - 2 * s, x + 20 * s, y + 2 * s, x + 4 * s, y + 7 * s); // fenda
      g.fillStyle(0xf6d6e6, 1);                    // flor
      g.fillCircle(x - 12 * s, y - 5 * s, 6 * s);
      g.fillStyle(0xffe066, 1);
      g.fillCircle(x - 12 * s, y - 5 * s, 2.5 * s);
    };
    const cattail = (g, x, s) => {
      g.lineStyle(3 * s, 0x5c7a3a, 1);
      g.lineBetween(x, 260, x, 260 - 92 * s);
      g.fillStyle(0x6b4a24, 1);
      g.fillRoundedRect(x - 5 * s, 260 - 116 * s, 10 * s, 30 * s, 5 * s);
      g.fillStyle(0x5c7a3a, 1);                    // folhas
      g.fillTriangle(x, 260, x - 4, 260, x - 22 * s, 260 - 70 * s);
      g.fillTriangle(x, 260, x + 4, 260, x + 20 * s, 260 - 62 * s);
    };
    const sidewalk = (g) => {
      g.fillStyle(0x9aa0a6, 1);
      g.fillRect(0, 236, 640, 24);
      g.fillStyle(0x7f858b, 1);
      g.fillRect(0, 236, 640, 5);
      for (let x = 0; x < 640; x += 64) g.fillRect(x, 241, 3, 19); // juntas
      g.fillStyle(0xf2c14e, 1);                    // meio-fio pintado
      g.fillRect(0, 232, 640, 5);
    };
    const streetLamp = (g, x) => {
      g.fillStyle(0x555b62, 1);
      g.fillRect(x, 60, 9, 178);
      g.fillRect(x, 60, 46, 8);
      g.fillStyle(0xffe9a8, 1);
      g.fillEllipse(x + 46, 72, 26, 14);
      g.fillStyle(0xffe9a8, 0.18);                 // halo
      g.fillTriangle(x + 34, 78, x + 58, 78, x + 76, 176);
    };
    const busStop = (g, x) => {
      g.fillStyle(0x4f6a86, 1);
      g.fillRect(x, 128, 128, 8);
      g.fillRect(x + 4, 136, 8, 100);
      g.fillRect(x + 116, 136, 8, 100);
      g.fillStyle(0x9ad7ef, 0.35);
      g.fillRect(x + 12, 140, 104, 92);
      g.fillStyle(0x2f6b8a, 1);
      g.fillRect(x + 20, 190, 88, 14);             // banco
    };
    const pedestrian = (g, x, c) => {
      g.fillStyle(c, 1);
      g.fillCircle(x, 176, 9);
      g.fillRoundedRect(x - 10, 186, 20, 40, 7);
      g.fillRect(x - 8, 226, 7, 26);
      g.fillRect(x + 2, 226, 7, 26);
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

    // ================= 0–200m: JAULAS — é daqui que ele foge =================
    makeFar('jaulas', (g) => {
      hills(g, 0x8fb87a, 0x7ba468);
      keeperHut(g, 458);
      bigCage(g, 54, 150, 'lion');
      bigCage(g, 240, 128, 'tiger');
      noticeBoard(g, 200, 236);
      visitors(g, 396);
      haze(g);
    });
    makeNear('jaulas', (g) => {
      hedgeRow(g, 0x40712a, 0x548f36);
      fence(g);
      nearCage(g, 296);
      padlock(g, 361, 176, 1.2);
      trough(g, 90);
      flowersOn(g, [
        [50, 232, 0xe85a8a], [180, 240, 0xffd94a], [520, 236, 0xffffff], [604, 230, 0xe85a8a],
      ]);
    });

    // ================= 200–400m: AVIÁRIO — o céu é o tema =================
    makeFar('aviario', (g) => {
      hills(g, 0x9ccfae, 0x83bd9a);
      // Bando cruzando o fundo. As bordas ganham cópia ±640 (emenda).
      const flock = [[40, 92, 1], [96, 68, 0.8], [150, 108, 0.9], [206, 76, 0.7],
        [300, 60, 1], [356, 96, 0.85], [420, 70, 0.75], [498, 104, 0.95],
        [560, 74, 0.8], [614, 100, 0.9]];
      flock.forEach(([x, y, s]) => {
        flyBird(g, x, y, s);
        if (x < 40) flyBird(g, x + 640, y, s);
        if (x > 600) flyBird(g, x - 640, y, s);
      });
      // Palmeiras dentro da faixa segura (x 36..604 contando a largura das
      // folhas): nas bordas elas sairiam cortadas na emenda do tile.
      palm(g, 108, 0.9);
      palm(g, 540, 0.8);
      dome(g, 250, 1.25);
      dome(g, 470, 0.9);
      visitors(g, 372);
      haze(g);
    });
    makeNear('aviario', (g) => {
      hedgeRow(g, 0x3f8a6e, 0x58a583);
      fence(g);
      perch(g, 120);
      nestBox(g, 330, 118);
      nestBox(g, 470, 142);
      birdBath(g, 240);
      flowersOn(g, [[80, 236, 0xffffff], [420, 238, 0xffd94a], [600, 232, 0xe85a8a]]);
    });

    // ================= 400–600m: SAVANA — sol baixo e bicho grande ==========
    makeFar('savana', (g) => {
      // Nada de sol aqui: o céu (bg-sky-*) já tem o seu, e um objeto único
      // numa textura de 640px aparece DUAS vezes por tela.
      hills(g, 0xd9c27e, 0xc8ad62);
      acacia(g, 96, 1.05);
      acacia(g, 566, 0.8);
      termiteMound(g, 306, 0.9);
      giraffeSil(g, 196, 1);
      lionSil(g, 408, 0.95);
      rocks(g, 470, 350);
      haze(g);
    });
    makeNear('savana', (g) => {
      g.fillStyle(0xc89a58, 1);
      g.fillRect(0, 246, 640, 14);
      waterhole(g, 430, 190);
      grassTufts(g, 0xbfae5e, 0xa9984e);
      rocks(g, 90, 244);
      fence(g);
    });

    // ================= 600–800m: FLORESTA TROPICAL — mata fechada ===========
    makeFar('floresta', (g) => {
      // Penumbra que ESCURECE por faixas em vez de um corte seco: uma linha
      // horizontal dura no meio da tela lê como parede, não como mata.
      // Faixas de 6px, como no fillVerticalGradient: com faixas grossas o
      // alpha crescente aparece listrado sobre o azul do céu.
      for (let i = 0; i < 14; i++) {
        g.fillStyle(0x1a4a24, 0.05 + i * 0.07);
        g.fillRect(0, 150 + i * 6, 640, 7);
      }
      g.fillStyle(0x14431f, 1);
      g.fillRect(0, 234, 640, 186);
      jungleTree(g, 84, 1);
      jungleTree(g, 322, 0.85);
      jungleTree(g, 556, 1.05);
      fruitTree(g, 206, 0.9);
      fruitTree(g, 440, 0.8);
      canopy(g);
      [46, 158, 258, 384, 490, 596].forEach((x, i) => liana(g, x, 110 + (i % 3) * 46));
      monkeySil(g, 158, 132, 1);
      monkeySil(g, 490, 156, 0.85);
      // Feixes de luz atravessando o dossel — o que dá volume à mata
      g.fillStyle(0xd8f0b0, 0.09);
      [[130, 40], [370, 56], [600, 34]].forEach(([bx, w]) =>
        g.fillTriangle(bx, 44, bx + w, 44, bx + w * 2.4, 420));
    });
    makeNear('floresta', (g) => {
      g.fillStyle(0x1f5528, 1);
      g.fillRect(0, 244, 640, 16);
      hedgeRow(g, 0x24592b, 0x2f6b34);
      [40, 150, 268, 380, 496, 604].forEach((x, i) => fern(g, x, 0.9 + (i % 3) * 0.12));
      g.fillStyle(0xb4552f, 1);          // cogumelos
      [[210, 250], [222, 254], [470, 252]].forEach(([x, y]) => {
        g.fillEllipse(x, y, 20, 11);
        g.fillStyle(0xf3e2b8, 1); g.fillRect(x - 3, y, 6, 10);
        g.fillStyle(0xb4552f, 1);
      });
    });

    // ================= 800–1000m: PÂNTANO / AQUÁRIO — a reta do portão ======
    makeFar('pantano', (g) => {
      g.fillStyle(0x6b7f5c, 1);           // margem distante
      g.fillRect(0, 214, 640, 36);
      swampWater(g, 246);
      mangrove(g, 96, 1);
      mangrove(g, 566, 0.85);
      glassTank(g, 252, 148);
      gatorSil(g, 420, 322, 1);
      g.fillStyle(0xffffff, 0.09);        // bruma sobre a água
      g.fillRect(0, 240, 640, 26);
    });
    makeNear('pantano', (g) => {
      g.fillStyle(0x3c6b63, 1);
      g.fillRect(0, 240, 640, 20);
      lilyPad(g, 120, 250, 1);
      lilyPad(g, 300, 246, 0.85);
      lilyPad(g, 520, 252, 1.1);
      [50, 200, 380, 470, 610].forEach((x, i) => cattail(g, x, 0.9 + (i % 2) * 0.15));
      g.fillStyle(0xbfe3d8, 0.5);         // bolhas subindo
      [[250, 236, 5], [262, 224, 3], [430, 232, 4], [438, 218, 2.5]].forEach(([x, y, r]) =>
        g.fillCircle(x, y, r));
    });

    // ================= 1000m+: A CIDADE — o modo infinito ===================
    makeFar('cidade', (g) => {
      // 3 planos: quanto mais atrás, mais claro e mais dessaturado
      [[0, 208, 74, 212], [88, 186, 58, 234], [160, 220, 66, 200],
       [242, 172, 70, 248], [326, 214, 60, 206], [400, 190, 78, 230],
       [492, 226, 56, 194], [560, 176, 80, 244]].forEach(([x, y, w, h], i) =>
        cityBlock(g, x, y, w, h, i % 2 ? 0x54617a : 0x475369, 0xffd98a));
      crane(g, 300);
      billboard(g, 60, 130);
      g.fillStyle(0x2f3b4d, 1);           // faixa de asfalto ao fundo
      g.fillRect(0, 404, 640, 16);
    });
    makeNear('cidade', (g) => {
      sidewalk(g);
      busStop(g, 60);
      streetLamp(g, 300);
      streetLamp(g, 560);
      pedestrian(g, 232, 0x3a4152);
      pedestrian(g, 254, 0x6a4f7a);
      pedestrian(g, 470, 0x2f5a6a);
      g.fillStyle(0x6b7078, 1);           // lixeira
      g.fillRoundedRect(400, 190, 34, 48, 5);
      g.fillRect(396, 184, 42, 8);
    });
  }

  // Faixa de tráfego da cidade: passa entre o fundo e o plano médio, com
  // scroll próprio (0,55) — é o que dá a sensação de rua movimentada sem
  // animar carro por carro. Fora da cidade a camada fica em alpha 0.
  static generateCars(scene) {
    const w = 640, h = 120;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const body = [0xe4573f, 0x3f7ad6, 0xf2c14e, 0x5aa469, 0xd8d8d8, 0x8a5fc0];

    const car = (x, y, s, c) => {
      g.fillStyle(c, 1);
      g.fillRoundedRect(x, y + 14 * s, 96 * s, 26 * s, 6 * s);   // carroceria
      g.fillRoundedRect(x + 20 * s, y, 52 * s, 20 * s, 6 * s);   // cabine
      g.fillStyle(0x9ad7ef, 0.9);                                 // vidros
      g.fillRect(x + 26 * s, y + 4 * s, 18 * s, 12 * s);
      g.fillRect(x + 48 * s, y + 4 * s, 18 * s, 12 * s);
      g.fillStyle(0xffe9a8, 1);                                   // farol
      g.fillRect(x + 90 * s, y + 20 * s, 6 * s, 6 * s);
      g.fillStyle(0x2b2f36, 1);                                   // rodas
      g.fillCircle(x + 24 * s, y + 40 * s, 9 * s);
      g.fillCircle(x + 74 * s, y + 40 * s, 9 * s);
      g.fillStyle(0x6b7078, 1);
      g.fillCircle(x + 24 * s, y + 40 * s, 4 * s);
      g.fillCircle(x + 74 * s, y + 40 * s, 4 * s);
    };
    const bus = (x, y, s) => {
      g.fillStyle(0xf2a33c, 1);
      g.fillRoundedRect(x, y, 176 * s, 52 * s, 6 * s);
      g.fillStyle(0x9ad7ef, 0.9);
      for (let i = 0; i < 5; i++) g.fillRect(x + 12 * s + i * 32 * s, y + 8 * s, 22 * s, 18 * s);
      g.fillStyle(0x2b2f36, 1);
      g.fillCircle(x + 36 * s, y + 52 * s, 10 * s);
      g.fillCircle(x + 140 * s, y + 52 * s, 10 * s);
    };

    // Posições fixas com passo divisor de 640 na prática: nada cruza a borda
    car(24, 52, 0.9, body[0]);
    car(150, 44, 1.0, body[1]);
    bus(280, 30, 0.85);
    car(456, 50, 0.95, body[3]);
    car(552, 42, 0.8, body[4]);

    g.generateTexture('bg-cars', w, h);
    g.destroy();
  }

  // ------------------------------------------------------ primeiro plano
  // Silhueta que passa NA FRENTE do rino, dando profundidade de verdade.
  // Ocupa só a faixa abaixo da linha do chão (y 660..720 na tela): é o que
  // garante que ela nunca esconda um obstáculo. Emenda em 640px como as
  // demais camadas (formas de borda ganham cópia ±640).
  static generateForeground(scene) {
    // Canvas 640x120, mas o tileSprite fica centrado em y=720 — só as linhas
    // 0..60 aparecem na tela (660..720). TODO o desenho vive nessa faixa; o
    // resto do canvas é a barriga que some fora do viewport.
    const w = 640, h = 120, VIS = 60;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const DARK = 0x2f4a22, DARKER = 0x1c3014, STONE = 0x4a3a28;

    // Terra da beirada, da linha 34 para baixo
    g.fillStyle(DARKER, 1);
    g.fillRect(0, 34, w, h - 34);

    let seed = 5;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    g.fillStyle(STONE, 1);
    for (let i = 0; i < 10; i++) {
      g.fillEllipse(rnd() * w, 40 + rnd() * (VIS - 40), 30 + rnd() * 46, 12 + rnd() * 10);
    }

    // Touceiras de capim alto: lâminas em leque saindo da linha 36 para cima.
    // Formas de borda ganham cópia ±640 (a mesma convenção de emenda das
    // outras camadas de 640px).
    const tuft = (bx) => {
      for (let i = -5; i <= 5; i++) {
        g.fillStyle(i % 2 === 0 ? DARK : DARKER, 1);
        const tall = 22 + ((i * 7) % 13) + (i === 0 ? 10 : 0);
        g.fillTriangle(bx - 5, 38, bx + 5, 38, bx + i * 5, 38 - tall);
      }
    };
    for (let x = 12; x < w; x += 54) {
      tuft(x);
      if (x < 60) tuft(x + w);
      if (x > w - 60) tuft(x - w);
    }
    g.fillStyle(DARK, 1);
    g.fillRect(0, 34, w, 8);

    g.generateTexture('bg-fg', w, h);
    g.destroy();

    // Irmã da cidade: mesma faixa visível (linhas 0..60), asfalto em vez de
    // capim. Sem ela o rino escapa para a cidade com mato na beira da tela.
    const c = scene.make.graphics({ x: 0, y: 0, add: false });
    c.fillStyle(0x21262c, 1);
    c.fillRect(0, 30, w, h - 30);
    c.fillStyle(0x2e353c, 1);
    c.fillRect(0, 30, w, 7);                     // quina do meio-fio
    c.fillStyle(0x3a4149, 1);                    // bueiro e juntas
    for (let x = 0; x < w; x += 128) c.fillRect(x, 37, 4, VIS);
    c.fillEllipse(160, 50, 58, 18);
    c.fillEllipse(470, 52, 50, 16);
    c.fillStyle(0x161a1e, 1);
    for (let i = 0; i < 5; i++) c.fillEllipse(60 + i * 130, 46, 26, 8);
    c.generateTexture('bg-fg-city', w, h);
    c.destroy();
  }

  // ------------------------------------------------------ arco de setor
  // Marco físico da troca de bioma: um objeto que ATRAVESSA a tela, que é o
  // que torna a transição legível (o crossfade sozinho passava despercebido).
  // A placa fica em branco — o nome do setor é um Text por cima, em mundo.
  static generateBiomeArch(scene) {
    const w = 380, h = 300;
    const C = Constants.COLORS;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const POST = 0x6b4a2a, POST_D = 0x4d341c, PLATE = 0xe8c477, PLATE_D = 0xbb964e;

    // Dois pilares até o chão (a base do canvas é a linha do chão)
    [26, w - 54].forEach((px) => {
      g.fillStyle(POST, 1); g.fillRect(px, 40, 28, h - 40);
      g.fillStyle(POST_D, 1); g.fillRect(px + 20, 40, 8, h - 40);
      g.fillStyle(POST_D, 1); g.fillRect(px - 8, h - 24, 44, 24); // pé alargado
    });

    // Travessa superior
    g.fillStyle(POST, 1); g.fillRect(10, 40, w - 20, 26);
    g.fillStyle(POST_D, 1); g.fillRect(10, 60, w - 20, 6);

    // Placa
    g.fillStyle(PLATE_D, 1); g.fillRect(56, 4, w - 112, 44);
    g.fillStyle(PLATE, 1); g.fillRect(60, 8, w - 120, 36);
    g.fillStyle(PLATE_D, 1);
    for (let i = 0; i < 4; i++) g.fillCircle(70 + i * ((w - 140) / 3), 12, 3);

    // Bandeirolas penduradas na travessa
    [0xff6b5e, 0xffd166, 0x6fcf97, 0x6aa9ff].forEach((c, i) => {
      const bx = 70 + i * 66;
      g.fillStyle(c, 1);
      g.fillTriangle(bx, 66, bx + 34, 66, bx + 17, 96);
    });

    g.generateTexture('biome-arch', w, h);
    g.destroy();
  }

  // ------------------------------------------------- estaca de marca
  // Marco de recorde plantado na pista. Desenhada em tons CLAROS de propósito:
  // cada marca recebe um setTint diferente (seu recorde / rival / líder), e o
  // tint multiplica — partir do branco faz a cor sair exata.
  static generateTrackFlag(scene) {
    const w = 96, h = 240, PX = 40; // PX = x do mastro (centro do canvas ~48)
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    g.fillStyle(0x9aa0a6, 1);          // pé cravado no chão
    g.fillRect(PX - 12, h - 12, 32, 12);
    g.fillStyle(0xdfe3e8, 1);          // mastro
    g.fillRect(PX, 8, 8, h - 8);
    g.fillStyle(0xb6bcc4, 1);          // lado de sombra do mastro
    g.fillRect(PX + 6, 8, 2, h - 8);

    // Flâmula de rabo de andorinha, grande o bastante para ler de relance.
    // O recorte em V é montado com dois trapézios — Graphics não apaga o que
    // já desenhou, então não dá para "recortar" um retângulo depois.
    const fx = PX + 8, fw = 46, ft = 12, fb = 66, mid = (ft + fb) / 2, notch = 16;
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(fx, ft, fx + fw, ft, fx + fw - notch, mid);
    g.fillTriangle(fx, ft, fx + fw - notch, mid, fx, mid);
    g.fillStyle(0xe4e8ec, 1);          // metade de baixo, um tom abaixo
    g.fillTriangle(fx, mid, fx + fw - notch, mid, fx + fw, fb);
    g.fillTriangle(fx, mid, fx + fw, fb, fx, fb);

    g.generateTexture('track-flag', w, h);
    g.destroy();
  }

  // ------------------------------------------------------------- clima
  static generateWeather(scene) {
    // Gota: risco fino inclinado
    const d = scene.make.graphics({ x: 0, y: 0, add: false });
    d.fillStyle(0xbcd8f0, 1);
    d.fillTriangle(3, 0, 4, 0, 0, 16);
    d.generateTexture('raindrop', 5, 16);
    d.destroy();

    // Neblina: manchas suaves em faixas (nada de gradiente — SwiftShader)
    const w = 640, h = 320;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    let seed = 91;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const blob = (cx, cy, rx, ry) => {
      // "Desfoque" barato: elipses concêntricas com alpha crescente
      for (let k = 4; k >= 1; k--) {
        g.fillStyle(0xffffff, 0.05 * (5 - k));
        g.fillEllipse(cx, cy, rx * (0.55 + k * 0.15), ry * (0.55 + k * 0.15));
      }
    };
    for (let i = 0; i < 26; i++) {
      const cx = rnd() * w, cy = 40 + rnd() * (h - 80);
      const rx = 120 + rnd() * 220, ry = 40 + rnd() * 70;
      blob(cx, cy, rx, ry);
      if (cx < 200) blob(cx + w, cy, rx, ry);   // emenda em 640px
      if (cx > w - 200) blob(cx - w, cy, rx, ry);
    }
    g.generateTexture('bg-fog', w, h);
    g.destroy();
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
