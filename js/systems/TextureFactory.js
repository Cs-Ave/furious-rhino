import { Constants } from '../utils/Constants.js';

// Architectural / tiling textures drawn with Phaser Graphics and baked via
// generateTexture. Character art comes from SVG (see js/art/SvgSprites.js).
export class TextureFactory {
  static generate(scene) {
    // v1.9.9 (CASO 2): cada gerador anuncia a própria execução no
    // conta-giros — no crash, o slot diz qual estava rodando.
    const passo = (s) => { if (typeof window !== 'undefined' && window.__frPasso) window.__frPasso('texfab:' + s); };
    passo('generateWalls'); this.generateWalls(scene);
    passo('generateSpikes'); this.generateSpikes(scene);
    passo('generateSpikeTower'); this.generateSpikeTower(scene);
    passo('generateGate'); this.generateGate(scene);
    passo('generateGateArmored'); this.generateGateArmored(scene);
    passo('generateBossGates'); this.generateBossGates(scene);
    passo('generateTranqTower'); this.generateTranqTower(scene);
    passo('generateTranqDart'); this.generateTranqDart(scene);
    passo('generateGround'); this.generateGround(scene);
    passo('generateGroundCity'); this.generateGroundCity(scene);
    passo('generateRamps'); this.generateRamps(scene);
    passo('generateSkies'); this.generateSkies(scene);
    passo('generateMountains'); this.generateMountains(scene);
    passo('generateClouds'); this.generateClouds(scene);
    passo('generateBackdrops'); this.generateBackdrops(scene);
    passo('generateCars'); this.generateCars(scene);
    passo('generateForeground'); this.generateForeground(scene);
    passo('generateBiomeArch'); this.generateBiomeArch(scene);
    passo('generatePortals'); this.generatePortals(scene);
    passo('generateHazards'); this.generateHazards(scene);
    passo('generateK9Projectile'); this.generateK9Projectile(scene);
    // v1.8.10 — As Areias do Tempo
    passo('generateGroundDesert'); this.generateGroundDesert(scene);
    passo('generateForegroundDesert'); this.generateForegroundDesert(scene);
    passo('generateMarcoObelisco'); this.generateMarcoObelisco(scene);
    passo('generateArrowProjectile'); this.generateArrowProjectile(scene);
    passo('generateFalcaoProjectile'); this.generateFalcaoProjectile(scene);
    passo('generateTrackFlag'); this.generateTrackFlag(scene);
    passo('generateWeather'); this.generateWeather(scene);
    passo('generateLeaf'); this.generateLeaf(scene);
    passo('generateDebris'); this.generateDebris(scene);
    passo('generateSmoke'); this.generateSmoke(scene);
    passo('generateWindStreak'); this.generateWindStreak(scene);
    passo('generateExplosionFlash'); this.generateExplosionFlash(scene);
    passo('generateConfetti'); this.generateConfetti(scene);
  }

  // ---------------------------------------------------------------- walls

  // Skins da mesma parede: tijolo no zoológico, QUATRO famílias de fachada
  // urbana (v1.8.7 — uma por distrito do Estado de Alerta) e DUAS do deserto
  // (v1.8.10 — ruína de adobe e parede-pirâmide). Canvas, banda da fresta e
  // mecânica são idênticos — muda só o material.
  // 42 chaves: cracked-<altura>[-skin][-broken].
  static generateWalls(scene) {
    const H = Constants.CRACK_HEIGHTS;
    const heights = [[H.GROUND, 'ground'], [H.MID, 'mid'], [H.HIGH, 'high']];

    for (const [pos, name] of heights) {
      for (const skin of ['', '-city', '-suburbio', '-vidro', '-contencao',
        '-ruina', '-piramide']) {
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

  // v1.8.7 — as três famílias de fachada dos distritos, como PALETAS do
  // mesmo pintor (drawFacade paramétrico). Os nomes de campo são PAPÉIS no
  // desenho; `style` liga os floreios próprios de cada família. A banda da
  // fresta continua CLARA sobre corpo escuro em todas (âmbar/claro =
  // passagem, a regra de design das paredes).
  static FACADES = {
    '-suburbio': {
      // Subúrbio sonolento: sobrado de tijolo com toldos de zinco, janelas
      // quase todas APAGADAS (a cidade ainda dorme) e um neon de padaria
      style: 'suburbio',
      body: 0x6e4a3a, slab: 0x8a939f, slabShade: 0x4e3325,
      pillar: 0x543628, pillarLight: 0x8a6a52,
      winOn: 0xffb066, winOff: 0x2e2620, frame: 0x241a12,
      metal: 0x8a939f, metalDark: 0x59616b,
      band: 0xc9a06a, bandLight: 0xe0bd8a, bandLine: 0x3d2b1e,
    },
    '-vidro': {
      // Torre de vidro do Despertar: panos de vidro em dois tons, LED
      // vermelho/ciano e uma faixa de telão "PROCURADO" atravessando o corpo
      style: 'vidro',
      body: 0x55617a, glass: 0x7a8ba8, glassDark: 0x475369,
      slab: 0x8a96ad, slabShade: 0x2b3342,
      pillar: 0x39424f, pillarLight: 0x8a96ad,
      winOn: 0x7a8ba8, winOff: 0x475369, frame: 0x1f2531,
      ledA: 0xff4a5e, ledB: 0x4ad1ff,
      metal: 0x8a939f, metalDark: 0x59616b,
      band: 0x9aa4b5, bandLight: 0xb9c2d1, bandLine: 0x39424f,
    },
    '-contencao': {
      // Bloco de Contenção: concreto de prédio público, tapumes nas janelas
      // e tarja de perigo amarelo/preto — a cidade que te estudou
      style: 'contencao',
      body: 0x59616b, slab: 0x6e7681, slabShade: 0x3d444c,
      pillar: 0x454c55, pillarLight: 0x8a939f,
      winOn: 0xffd24a, winOff: 0x272d34, frame: 0x1f2531,
      hazardA: 0xffd24a, hazardB: 0x1f2531, tapume: 0x8a6a3c, tapumeDark: 0x6b4f2a,
      metal: 0x8a939f, metalDark: 0x3d444c,
      band: 0xb2a98f, bandLight: 0xd0c7ab, bandLine: 0x3a3a32,
    },
    // ------- v1.8.10 "As Areias do Tempo": as duas famílias do deserto ----
    '-ruina': {
      // Ruína de ADOBE engolida pela areia (E1–E3): tijolo cru rebocado,
      // vãos escuros (uma tocha acesa aqui e ali) e madeira de andaime
      // espetada na fachada — a escavação tomou conta
      style: 'ruina',
      body: 0xa8825a, slab: 0xc2a36b, slabShade: 0x6b4f2a,
      pillar: 0x8a6a42, pillarLight: 0xd0b184,
      winOn: 0xffb84a, winOff: 0x3a2a1a, frame: 0x4a3520,
      wood: 0x8a5a33, woodDark: 0x6b4326,
      metal: 0x8a939f, metalDark: 0x59616b,
      band: 0xe0c492, bandLight: 0xf0d9ae, bandLine: 0x6b4f2a,
    },
    '-piramide': {
      // Parede-PIRÂMIDE do Vale/Necrópole: blocos calcários em aparelho de
      // pedra, hieróglifos discretos, ouro e lápis-lazúli nos frisos —
      // monumento, não prédio (sem janelas)
      style: 'piramide',
      body: 0xbe9c66, slab: 0xd4b47e, slabShade: 0x8a6e42,
      pillar: 0x9a7a4e, pillarLight: 0xe4cc9a,
      winOn: 0xffd24a, winOff: 0x4a3a24, frame: 0x5a4426,
      gold: 0xd4af37, lapis: 0x1e4b8f, glyph: 0x7a5f34,
      metal: 0x8a939f, metalDark: 0x59616b,
      band: 0xf0e2c0, bandLight: 0xfaf0d6, bandLine: 0x7a5f34,
    },
  };

  // A paleta de um skin de parede urbano ('-city' usa o dicionário CITY
  // original, pixel-a-pixel intacto — regra da casa para a família clássica)
  static facadePalette(skin) {
    return this.FACADES[skin] || this.CITY;
  }

  // Onde a fachada arrebentou: blocos de material claro expostos, mesma
  // geometria escalonada da banda de tijolos (o jogador já aprendeu que a
  // faixa de material diferente = passagem — só o material muda de família)
  static drawConcreteBand(g, x0, y0, w, h, P = this.CITY) {
    const C = P;
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

  // v1.8.7: paramétrico por paleta — um pintor só gera as quatro famílias de
  // fachada. Sem paleta é a fachada clássica da cidade, byte a byte.
  // TODO fillRect aqui tem largura FIXA positiva (regra do drawBricks: uma
  // largura negativa corrompe o batch WebGL e apaga o resto da textura).
  static drawFacade(g, x0, y0, w, h, inBand, P = this.CITY) {
    if (inBand) { this.drawConcreteBand(g, x0, y0, w, h, P); return; }
    const C = P;
    const style = P.style || 'city';

    const floorH = 60;
    g.fillStyle(C.body, 1);
    g.fillRect(x0, y0, w, h);

    for (let y = Math.floor(y0 / floorH) * floorH; y < y0 + h; y += floorH) {
      const floor = Math.floor(y / floorH);
      // Laje entre andares
      const slabY = Math.max(y, y0);
      const slabH = Math.min(10, y0 + h - slabY);
      if (slabH > 0) {
        g.fillStyle(C.slab, style === 'vidro' ? 0.9 : 1);
        g.fillRect(x0, slabY, w, slabH);
        g.fillStyle(C.slabShade, 0.6);
        g.fillRect(x0, slabY + slabH - 3, w, 3);
      }

      if (style === 'vidro') {
        // Pano de VIDRO inteiro por andar: 4 colunas alternando os dois tons
        // (curtain wall), montante escuro entre elas
        const wy = y + 12;
        if (wy >= y0 && wy + 42 <= y0 + h) {
          for (let i = 0; i < 4; i++) {
            g.fillStyle((i + floor) % 2 ? C.glass : C.glassDark, 1);
            g.fillRect(x0 + 12 + i * 20, wy, 17, 42);
          }
          g.fillStyle(C.frame, 0.7);
          for (let i = 1; i < 4; i++) g.fillRect(x0 + 9 + i * 20, wy, 3, 42);
          // reflexo rasante no topo do pano (retângulo alpha, nunca gradiente)
          g.fillStyle(0xffffff, 0.14);
          g.fillRect(x0 + 12, wy, 76, 5);
        }
        continue;
      }

      if (style === 'piramide') {
        // Aparelho de PEDRA em vez de janelas: juntas verticais alternadas
        // por andar (blocos calcários) + um bloco com hieróglifos por andar
        // ímpar — a leitura de monumento
        const off = (floor % 2) * 25;
        g.fillStyle(C.slabShade, 0.5);
        for (let jx = x0 + 12 + off; jx < x0 + w - 12; jx += 50) {
          const jy = Math.max(y + 12, y0);
          const jh = Math.min(y + 56, y0 + h) - jy;
          if (jh > 0) g.fillRect(jx, jy, 3, jh);
        }
        if (floor % 2 === 1) {
          const gy = y + 18;
          if (gy >= y0 && gy + 34 <= y0 + h) {
            // coluna de glifos: olho, zigue-zague d'água, sol, ankh (barras)
            g.fillStyle(C.glyph, 0.9);
            g.fillEllipse(x0 + 34, gy + 4, 12, 6);           // olho
            g.fillCircle(x0 + 62, gy + 4, 4);                // sol
            for (let i = 0; i < 3; i++) {                    // água
              g.fillRect(x0 + 26 + i * 8, gy + 14, 6, 2);
              g.fillRect(x0 + 30 + i * 8, gy + 17, 6, 2);
            }
            g.fillRect(x0 + 58, gy + 12, 3, 14);             // ankh: haste
            g.fillRect(x0 + 53, gy + 17, 13, 3);             //   travessa
            g.fillCircle(x0 + 59.5, gy + 12, 3.5);           //   alça
            g.fillStyle(C.body, 1);
            g.fillCircle(x0 + 59.5, gy + 12, 1.6);
          }
        }
        continue;
      }

      // Duas janelas RETRATO por andar (mesma geometria da família clássica)
      [16, 62].forEach((dx, i) => {
        const wy = y + 16;
        if (wy < y0 || wy + 32 > y0 + h) return;
        const roll = (floor * 3 + i * 7) % (style === 'suburbio' ? 7 : 5);
        // Subúrbio de madrugada: quase tudo apagado (1 acesa em 7)
        const on = roll < (style === 'suburbio' ? 1 : 2);
        // Contenção: parte das janelas foi TAPADA com tapume de madeira
        if (style === 'contencao' && (floor + i) % 3 === 0) {
          g.fillStyle(C.tapume, 1);
          g.fillRect(x0 + dx, wy, 22, 32);
          g.fillStyle(C.tapumeDark, 1);
          g.fillRect(x0 + dx, wy + 9, 22, 4);
          g.fillRect(x0 + dx, wy + 20, 22, 4);
          g.fillStyle(C.frame, 0.55);
          g.fillRect(x0 + dx, wy, 22, 2);
          return;
        }
        // Ruína de adobe: VÃO-buraco de topo arqueado, sem caixilho — 1 em
        // 5 aceso por tocha lá dentro; nos andares pares, pontas de VIGA de
        // andaime espetadas no reboco (a escavação escorou a ruína)
        if (style === 'ruina') {
          g.fillStyle(on ? C.winOn : C.winOff, 1);
          g.fillRect(x0 + dx, wy + 6, 22, 26);
          g.fillEllipse(x0 + dx + 11, wy + 7, 22, 14);       // arco do vão
          if (on) {                                          // brasa da tocha
            g.fillStyle(0xff7b2a, 0.85);
            g.fillCircle(x0 + dx + 11, wy + 22, 4);
          }
          g.fillStyle(C.slabShade, 0.6);                     // reboco caído
          g.fillTriangle(x0 + dx - 2, wy + 32, x0 + dx + 6, wy + 32, x0 + dx + 2, wy + 26);
          if (floor % 2 === 0) {
            g.fillStyle(C.woodDark, 1);
            g.fillRect(x0 + dx + 26, wy + 2, 7, 6);          // ponta de viga
            g.fillStyle(C.wood, 1);
            g.fillRect(x0 + dx + 26, wy + 2, 7, 2);
          }
          return;
        }
        g.fillStyle(on ? C.winOn : C.winOff, 1);
        g.fillRect(x0 + dx, wy, 22, 32);
        g.fillStyle(C.frame, 0.55);               // caixilho
        g.fillRect(x0 + dx, wy + 15, 22, 3);
        g.fillRect(x0 + dx + 10, wy, 3, 32);
        // Toldo de zinco sobre as janelas do subúrbio (comércio de bairro)
        if (style === 'suburbio' && floor % 2 === 1) {
          g.fillStyle(C.slab, 1);
          g.fillRect(x0 + dx - 3, wy - 7, 28, 5);
          g.fillStyle(C.slabShade, 0.7);
          g.fillRect(x0 + dx - 3, wy - 3, 28, 2);
        }
      });
    }

    // ---- floreios por família, em Y ABSOLUTO do canvas (o chamador pinta
    // corpo inteiro e depois a banda por cima; segmentos do broken passam
    // pelas guardas de dentro-do-trecho) ----
    if (style === 'vidro') {
      // Faixa de TELÃO atravessando o corpo: moldura escura + pixels de
      // noticiário e a silhueta "PROCURADO" do rino em vermelho
      const ty = 138;
      if (ty >= y0 && ty + 46 <= y0 + h) {
        g.fillStyle(C.frame, 1);
        g.fillRect(x0 + 6, ty, 88, 46);
        g.fillStyle(0x101720, 1);
        g.fillRect(x0 + 10, ty + 4, 80, 38);
        g.fillStyle(C.ledA, 0.9);                 // silhueta procurada
        g.fillRect(x0 + 18, ty + 18, 26, 16);
        g.fillTriangle(x0 + 44, ty + 22, x0 + 52, ty + 22, x0 + 44, ty + 30);
        g.fillStyle(C.ledB, 0.9);                 // linhas do noticiário
        g.fillRect(x0 + 56, ty + 10, 28, 4);
        g.fillRect(x0 + 56, ty + 20, 22, 4);
        g.fillRect(x0 + 56, ty + 30, 26, 4);
        g.fillStyle(C.ledA, 1);                   // tarja "AO VIVO"
        g.fillRect(x0 + 12, ty + 6, 18, 6);
      }
    }
    if (style === 'suburbio') {
      // Neon de PADARIA aceso no térreo (a única luz do quarteirão)
      const ny = 636;
      if (ny >= y0 && ny + 22 <= y0 + h) {
        g.fillStyle(0x241a12, 1);
        g.fillRect(x0 + 14, ny, 72, 22);
        g.fillStyle(C.winOn, 1);
        for (let i = 0; i < 5; i++) g.fillRect(x0 + 20 + i * 13, ny + 5, 7, 12);
        g.fillStyle(C.winOn, 0.22);               // halo do neon
        g.fillRect(x0 + 10, ny - 4, 80, 30);
      }
    }
    if (style === 'contencao') {
      // Tarja de perigo amarelo/preto na base (a leitura de barricada)
      const zy = 596;
      if (zy >= y0 && zy + 18 <= y0 + h) {
        g.fillStyle(C.hazardA, 1);
        g.fillRect(x0 + 4, zy, 92, 18);
        g.fillStyle(C.hazardB, 1);
        for (let i = 0; i < 6; i++) {
          const sx = x0 + 6 + i * 15;
          g.fillTriangle(sx, zy + 18, sx + 8, zy + 18, sx + 16, zy);
        }
        g.fillStyle(C.hazardA, 1);                // apara o excedente
        g.fillRect(x0 + 92, zy, 4, 18);
      }
    }
    if (style === 'ruina') {
      // ANDAIME de madeira encostado na base: dois montantes, plataforma e
      // travessa diagonal — o sítio escorou o que a areia não engoliu
      const ay = 540;
      if (ay >= y0 && ay + 80 <= y0 + h) {
        g.fillStyle(C.woodDark, 1);
        g.fillRect(x0 + 12, ay, 6, 80);                      // montantes
        g.fillRect(x0 + 78, ay, 6, 80);
        g.fillStyle(C.wood, 1);
        g.fillRect(x0 + 8, ay + 22, 84, 7);                  // plataforma
        g.fillRect(x0 + 8, ay + 58, 84, 6);
        g.fillStyle(C.woodDark, 0.9);                        // diagonal
        g.fillTriangle(x0 + 18, ay + 64, x0 + 24, ay + 64, x0 + 82, ay + 29);
        g.fillTriangle(x0 + 76, ay + 29, x0 + 82, ay + 29, x0 + 18, ay + 64);
        g.fillStyle(0x9a8a6a, 1);                            // balde no deck
        g.fillRect(x0 + 60, ay + 12, 12, 10);
      }
      // Areia acumulada na base — a duna morde a fachada
      const sy = 690;
      if (sy >= y0 && sy + 30 <= y0 + h) {
        g.fillStyle(0xe0c492, 1);
        g.fillTriangle(x0 - 2, 720, x0 + 54, 720, x0 + 14, sy);
        g.fillTriangle(x0 + 40, 720, x0 + 102, 720, x0 + 78, sy + 10);
      }
    }
    if (style === 'piramide') {
      // FRISO de ouro com incrustação de lápis-lazúli no alto do corpo
      const fy = 116;
      if (fy >= y0 && fy + 16 <= y0 + h) {
        g.fillStyle(C.gold, 1);
        g.fillRect(x0 + 4, fy, 92, 14);
        g.fillStyle(C.lapis, 1);
        for (let i = 0; i < 6; i++) g.fillRect(x0 + 10 + i * 15, fy + 4, 8, 6);
      }
      // Medalhão do OLHO DE HÓRUS no meio do corpo
      const oy = 320;
      if (oy - 18 >= y0 && oy + 22 <= y0 + h) {
        g.fillStyle(C.gold, 1);
        g.fillCircle(x0 + 50, oy, 17);
        g.fillStyle(C.body, 1);
        g.fillCircle(x0 + 50, oy, 13);
        g.fillStyle(C.lapis, 1);
        g.fillEllipse(x0 + 50, oy - 3, 18, 8);               // olho
        g.fillStyle(0xf4efe0, 1);
        g.fillEllipse(x0 + 50, oy - 3, 10, 5);
        g.fillStyle(C.frame, 1);
        g.fillCircle(x0 + 50, oy - 3, 2.4);                  // pupila
        g.fillRect(x0 + 49, oy + 3, 2.4, 8);                 // lágrima
        g.fillRect(x0 + 51, oy + 8, 7, 2.4);                 // espiral
      }
    }

    // Pilares de canto — dão a leitura de "prédio" mesmo em tira de 100px
    g.fillStyle(C.pillar, 1);
    g.fillRect(x0, y0, 9, h);
    g.fillRect(x0 + w - 9, y0, 9, h);
    g.fillStyle(C.pillarLight, 0.6);
    g.fillRect(x0 + 6, y0, 3, h);

    // LEDs de fachada da torre de vidro, POR CIMA dos pilares (é neles que
    // os LEDs vivem; desenhados antes, o pilar os cobriria)
    if (style === 'vidro') {
      for (let ly = 130; ly < 700; ly += 48) {
        if (ly < y0 + 4 || ly + 10 > y0 + h) continue;
        g.fillStyle((ly / 48) % 2 < 1 ? C.ledA : C.ledB, 0.9);
        g.fillRect(x0 + 2, ly, 5, 10);
        g.fillRect(x0 + w - 7, ly, 5, 10);
      }
    }
  }

  // ------------------------------------------------- coroamento do prédio
  // Sem isto a parede da cidade termina CORTADA no topo da tela. A faixa
  // y = 0..100 está livre nas 6 chaves de cidade (a banda mais alta começa em
  // 120; o buraco de high-broken, em 110) e tudo cabe nos 100px de largura —
  // o corpo de física é o canvas inteiro, então alargar mudaria a hitbox.
  //
  // Um coroamento por altura de fresta: como a altura é sorteada a cada
  // spawn, o skyline da cidade nunca se repete. v1.8.7: cada família de
  // fachada tem o seu trio de coroas (skin despacha; '-city' é o clássico).
  // opts.lit: usado pelo letreiro PADARIA do subúrbio, que ACENDE no estado
  // broken (a quebra acorda o quarteirão — barato: só 2 fills mudam).
  static drawCityCrown(g, kind, w, skin = '-city', opts = {}) {
    if (skin === '-suburbio') { this.drawSuburbioCrown(g, kind, w, opts); return; }
    if (skin === '-vidro') { this.drawVidroCrown(g, kind, w); return; }
    if (skin === '-contencao') { this.drawContencaoCrown(g, kind, w); return; }
    if (skin === '-ruina') { this.drawRuinaCrown(g, kind, w); return; }
    if (skin === '-piramide') { this.drawPiramideCrown(g, kind, w); return; }
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

  // Coroas do SUBÚRBIO: caixa-d'água (ground), letreiro PADARIA (mid — acende
  // com opts.lit no broken), antena de TV (high). Faixa y 0..100, x 0..100.
  static drawSuburbioCrown(g, kind, w, opts = {}) {
    const P = this.FACADES['-suburbio'];
    const cx = w / 2;

    if (kind === 'ground') {
      // Caixa-d'água de zinco sobre pernas de madeira
      g.fillStyle(P.pillar, 1);                    // pernas
      g.fillRect(28, 58, 7, 42);
      g.fillRect(65, 58, 7, 42);
      g.fillRect(24, 76, 52, 5);                   // travessa
      g.fillStyle(P.metal, 1);                     // tambor
      g.fillRect(22, 26, 56, 34);
      g.fillStyle(P.metalDark, 1);
      g.fillRect(64, 26, 14, 34);                  // lado em sombra
      g.fillRect(22, 36, 56, 3);                   // cintas
      g.fillRect(22, 50, 56, 3);
      g.fillStyle(P.metalDark, 1);                 // tampa cônica
      g.fillTriangle(18, 26, 82, 26, cx, 8);
      g.fillStyle(P.metal, 1);
      g.fillTriangle(24, 26, 76, 26, cx, 13);
      return;
    }

    if (kind === 'mid') {
      // Letreiro PADARIA: caixa com "letras" em barras de neon; aceso só
      // quando a quebra acorda o quarteirão (opts.lit)
      const on = Boolean(opts.lit);
      g.fillStyle(P.pillar, 1);                    // suportes
      g.fillRect(20, 72, 6, 28);
      g.fillRect(74, 72, 6, 28);
      g.fillStyle(0x241a12, 1);                    // caixa do letreiro
      g.fillRect(8, 40, 84, 34);
      g.fillStyle(P.winOn, on ? 0.28 : 0);         // halo (só aceso)
      if (on) g.fillRect(4, 34, 92, 46);
      g.fillStyle(on ? P.winOn : 0x6b4f3a, 1);     // as 7 barras-letra
      for (let i = 0; i < 7; i++) g.fillRect(14 + i * 11, 47, 6, 20);
      g.fillStyle(on ? 0xffe0b8 : 0x8a6a52, 1);    // croissant da placa
      g.fillCircle(50, 34, 7);
      g.fillStyle(0x241a12, 1);
      g.fillCircle(50, 37, 6);
      return;
    }

    // Antena de TV de telhado: mastro fino com travessas em espinha
    g.fillStyle(P.metalDark, 1);
    g.fillRect(cx - 2, 12, 4, 88);
    g.fillStyle(P.metal, 1);
    [[20, 34], [34, 26], [48, 18]].forEach(([y, half]) => {
      g.fillRect(cx - half, y, half * 2, 3);
      g.fillRect(cx - half, y - 5, 3, 5);          // pontas viradas
      g.fillRect(cx + half - 3, y - 5, 3, 5);
    });
    g.fillStyle(0xff6b5e, 1);                      // luzinha no topo
    g.fillCircle(cx, 10, 3);
  }

  // Coroas da TORRE DE VIDRO: telão (ground), antena dupla (mid),
  // heliponto (high). Faixa y 0..100, x 0..100.
  static drawVidroCrown(g, kind, w) {
    const P = this.FACADES['-vidro'];
    const cx = w / 2;

    if (kind === 'ground') {
      // Telão de topo: moldura + pixels de noticiário e tarja vermelha
      g.fillStyle(P.pillar, 1);
      g.fillRect(30, 76, 8, 24);
      g.fillRect(62, 76, 8, 24);
      g.fillStyle(P.frame, 1);
      g.fillRect(6, 26, 88, 52);
      g.fillStyle(0x101720, 1);
      g.fillRect(10, 30, 80, 44);
      g.fillStyle(P.ledA, 1);                      // tarja superior
      g.fillRect(14, 34, 30, 7);
      g.fillStyle(P.ledB, 0.9);                    // linhas de texto
      g.fillRect(14, 46, 62, 5);
      g.fillRect(14, 56, 48, 5);
      g.fillRect(14, 66, 56, 4);
      g.fillStyle(P.ledA, 0.9);                    // a silhueta procurada
      g.fillRect(60, 32, 22, 11);
      return;
    }

    if (kind === 'mid') {
      // Antena dupla com luzes de obstáculo
      for (const ax of [30, 70]) {
        g.fillStyle(P.metalDark, 1);
        g.fillRect(ax - 2, 18, 4, 82);
        g.fillStyle(P.metal, 1);
        g.fillRect(ax - 8, 44, 16, 4);
        g.fillRect(ax - 6, 70, 12, 4);
        g.fillStyle(P.ledA, 1);
        g.fillCircle(ax, 15, 3.5);
      }
      g.fillStyle(P.metalDark, 1);                 // travessa entre as duas
      g.fillRect(30, 58, 40, 3);
      return;
    }

    // Heliponto: plataforma em balanço com o "H" e luzes de borda
    g.fillStyle(P.pillar, 1);                      // haste de sustentação
    g.fillRect(cx - 5, 58, 10, 42);
    g.fillTriangle(cx - 26, 58, cx + 26, 58, cx, 84);
    g.fillStyle(P.slab, 1);                        // prato
    g.fillEllipse(cx, 52, 92, 26);
    g.fillStyle(0x39424f, 1);
    g.fillEllipse(cx, 50, 84, 21);
    g.fillStyle(0xf4f7fa, 1);                      // o H
    g.fillRect(cx - 14, 40, 5, 20);
    g.fillRect(cx + 9, 40, 5, 20);
    g.fillRect(cx - 10, 48, 20, 5);
    g.fillStyle(P.ledB, 1);                        // luzes de borda
    [[10, 52], [90, 52], [28, 60], [72, 60]].forEach(([x, y]) => g.fillCircle(x, y, 2.5));
    return;
  }

  // Coroas da CONTENÇÃO: holofote aceso (ground), ninho de vigia (mid),
  // mastro de alerta (high). Faixa y 0..100, x 0..100.
  static drawContencaoCrown(g, kind, w) {
    const P = this.FACADES['-contencao'];
    const cx = w / 2;

    if (kind === 'ground') {
      // Holofote ACESO varrendo para a esquerda (de onde o rino vem):
      // feixe = triângulo de alpha baixo, jamais gradiente
      g.fillStyle(P.pillar, 1);                    // tripé
      g.fillRect(cx - 4, 56, 8, 44);
      g.fillTriangle(cx - 22, 100, cx + 22, 100, cx, 66);
      g.fillStyle(P.metalDark, 1);                 // corpo do canhão de luz
      g.fillRect(30, 34, 40, 24);
      g.fillStyle(P.metal, 1);
      g.fillRect(30, 34, 40, 5);
      g.fillStyle(0xfff3c4, 1);                    // lente
      g.fillRect(24, 36, 8, 20);
      g.fillStyle(0xfff3c4, 0.18);                 // o feixe
      g.fillTriangle(26, 38, 26, 54, 0, 0);
      g.fillStyle(0xfff3c4, 0.1);
      g.fillTriangle(26, 36, 26, 56, 0, 22);
      return;
    }

    if (kind === 'mid') {
      // Ninho de vigia: plataforma com sacos de areia e telhadinho
      g.fillStyle(P.pillar, 1);                    // mãos-francesas
      g.fillTriangle(20, 100, 44, 74, 20, 74);
      g.fillTriangle(80, 100, 56, 74, 80, 74);
      g.fillStyle(P.slab, 1);                      // laje do ninho
      g.fillRect(10, 68, 80, 8);
      g.fillStyle(0x8a7a58, 1);                    // sacos de areia
      [[18, 58], [34, 58], [50, 58], [66, 58], [26, 48], [42, 48], [58, 48]]
        .forEach(([x, y]) => g.fillEllipse(x + 6, y + 5, 17, 10));
      g.fillStyle(P.metalDark, 1);                 // postes do telhadinho
      g.fillRect(14, 22, 4, 28);
      g.fillRect(82, 22, 4, 28);
      g.fillStyle(P.hazardB, 1);                   // telhadinho
      g.fillRect(8, 14, 84, 8);
      g.fillStyle(P.hazardA, 1);
      for (let i = 0; i < 6; i++) g.fillRect(12 + i * 14, 14, 7, 8);
      return;
    }

    // Mastro de alerta: sirene dupla + luz vermelha girando (glow estático)
    g.fillStyle(P.metalDark, 1);
    g.fillRect(cx - 3, 18, 6, 82);
    g.fillStyle(P.metal, 1);                       // cornetas
    g.fillTriangle(cx - 4, 40, cx - 4, 54, cx - 26, 47);
    g.fillTriangle(cx + 4, 40, cx + 4, 54, cx + 26, 47);
    g.fillStyle(P.pillar, 1);
    g.fillRect(cx - 7, 44, 14, 7);
    g.fillStyle(0xff4a5e, 0.25);                   // halo da luz de alerta
    g.fillCircle(cx, 14, 11);
    g.fillStyle(0xff4a5e, 1);
    g.fillCircle(cx, 14, 5);
    return;
  }

  // Coroas da RUÍNA (v1.8.10): viga de andaime com balde (ground), roldana
  // de escavação (mid), lona esticada (high). Faixa y 0..100, x 0..100.
  static drawRuinaCrown(g, kind, w) {
    const P = this.FACADES['-ruina'];
    const cx = w / 2;

    if (kind === 'ground') {
      // Viga de andaime em balanço, com corda e balde pendurados
      g.fillStyle(P.woodDark, 1);
      g.fillRect(cx - 4, 46, 8, 54);                 // montante
      g.fillStyle(P.wood, 1);
      g.fillRect(8, 40, 84, 8);                      // a viga
      g.fillStyle(P.woodDark, 0.9);                  // mão-francesa
      g.fillTriangle(cx - 4, 74, cx + 4, 74, 26, 48);
      g.lineStyle(2, 0x4a3520, 1);                   // corda
      g.lineBetween(20, 48, 20, 74);
      g.fillStyle(0x9a8a6a, 1);                      // balde
      g.fillRect(13, 74, 14, 12);
      g.fillStyle(0x7a6a4a, 1);
      g.fillRect(13, 74, 14, 3);
      g.fillStyle(P.slab, 1);                        // topo esboroado
      g.fillTriangle(60, 100, 96, 100, 82, 78);
      return;
    }

    if (kind === 'mid') {
      // Roldana de escavação num tripé de madeira
      g.fillStyle(P.woodDark, 1);
      g.fillTriangle(18, 100, 26, 100, cx - 2, 34);  // pernas
      g.fillTriangle(74, 100, 82, 100, cx + 2, 34);
      g.fillStyle(P.wood, 1);
      g.fillRect(cx - 20, 30, 40, 6);                // travessa
      g.fillStyle(0x8a939f, 1);                      // a roda
      g.fillCircle(cx, 46, 12);
      g.fillStyle(P.body, 1);
      g.fillCircle(cx, 46, 7);
      g.fillStyle(0x59616b, 1);
      g.fillCircle(cx, 46, 2.6);                     // eixo
      g.lineStyle(2, 0x4a3520, 1);                   // corda passando na roda
      g.lineBetween(cx - 12, 46, cx - 12, 84);
      g.lineBetween(cx + 12, 46, cx + 12, 78);
      g.fillStyle(0x9a8a6a, 1);                      // cesto subindo
      g.fillRect(cx + 6, 78, 13, 10);
      return;
    }

    // Lona esticada entre duas estacas (o abrigo de sombra do sítio)
    g.fillStyle(P.woodDark, 1);
    g.fillRect(12, 44, 5, 56);                       // estacas
    g.fillRect(83, 52, 5, 48);
    g.fillStyle(0xd8c9a6, 1);                        // a lona (pano claro)
    g.fillTriangle(8, 46, 92, 54, 88, 74);
    g.fillTriangle(8, 46, 88, 74, 14, 68);
    g.fillStyle(0xb9a884, 0.8);                      // vinco da lona
    g.fillTriangle(8, 46, 50, 60, 14, 68);
    g.lineStyle(2, 0x4a3520, 1);                     // esticadores
    g.lineBetween(10, 47, 4, 60);
    g.lineBetween(90, 55, 96, 68);
  }

  // Coroas da PIRÂMIDE (v1.8.10): olho de Hórus (ground), obelisco pequeno
  // (mid), cartucho real (high). Faixa y 0..100, x 0..100.
  static drawPiramideCrown(g, kind, w) {
    const P = this.FACADES['-piramide'];
    const cx = w / 2;

    if (kind === 'ground') {
      // Olho de Hórus num frontão de pedra
      g.fillStyle(P.pillar, 1);                      // frontão
      g.fillTriangle(6, 100, 94, 100, cx, 40);
      g.fillStyle(P.body, 1);
      g.fillTriangle(16, 100, 84, 100, cx, 52);
      g.fillStyle(P.gold, 1);                        // medalhão
      g.fillCircle(cx, 78, 16);
      g.fillStyle(P.body, 1);
      g.fillCircle(cx, 78, 12);
      g.fillStyle(P.lapis, 1);                       // o olho
      g.fillEllipse(cx, 75, 17, 7);
      g.fillStyle(0xf4efe0, 1);
      g.fillEllipse(cx, 75, 9, 4.5);
      g.fillStyle(P.frame, 1);
      g.fillCircle(cx, 75, 2.2);
      g.fillRect(cx - 1, 80, 2.2, 8);                // lágrima
      g.fillRect(cx + 2, 85, 6, 2.2);                // espiral
      g.fillStyle(P.gold, 1);                        // sol no vértice
      g.fillCircle(cx, 44, 5);
      return;
    }

    if (kind === 'mid') {
      // Obelisco pequeno de topo: fuste afilado + piramidion dourado
      g.fillStyle(P.pillar, 1);                      // base
      g.fillRect(cx - 16, 90, 32, 10);
      g.fillRect(cx - 12, 84, 24, 8);
      g.fillStyle(P.body, 1);                        // fuste
      g.fillTriangle(cx - 10, 84, cx + 10, 84, cx + 5, 22);
      g.fillTriangle(cx - 10, 84, cx + 5, 22, cx - 5, 22);
      g.fillStyle(P.slabShade, 0.5);                 // aresta em sombra
      g.fillTriangle(cx + 4, 84, cx + 10, 84, cx + 5, 24);
      g.fillStyle(P.gold, 1);                        // piramidion
      g.fillTriangle(cx - 6, 24, cx + 6, 24, cx, 8);
      g.fillStyle(P.glyph, 0.9);                     // glifos no fuste
      g.fillCircle(cx, 38, 2.6);
      g.fillRect(cx - 3, 46, 6, 2.2);
      g.fillEllipse(cx, 56, 7, 3.4);
      g.fillRect(cx - 1.2, 64, 2.4, 9);
      return;
    }

    // Cartucho real: anel oval com glifos, deitado sobre a cornija
    g.fillStyle(P.pillar, 1);                        // cornija
    g.fillRect(8, 88, 84, 12);
    g.fillStyle(P.slab, 1);
    g.fillRect(4, 84, 92, 6);
    g.lineStyle(5, P.gold, 1);                       // o anel do cartucho
    g.strokeEllipse(cx, 46, 52, 72);
    g.fillStyle(P.gold, 1);                          // o nó da base
    g.fillRect(cx - 10, 82, 20, 6);
    g.fillStyle(P.body, 1);                          // miolo
    g.fillEllipse(cx, 46, 44, 62);
    g.fillStyle(P.glyph, 0.95);                      // os glifos do nome
    g.fillCircle(cx, 24, 4);                         // sol
    g.fillEllipse(cx, 38, 14, 5);                    // boca
    g.fillRect(cx - 7, 48, 14, 3);                   // céu
    g.fillTriangle(cx - 6, 68, cx + 6, 68, cx, 56);  // duna
    g.fillStyle(P.lapis, 0.9);
    g.fillRect(cx - 8, 72, 16, 3);
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
    // v1.8.7: qualquer skin não-vazio é fachada urbana — muda só a PALETA
    const urban = skin !== '';
    const P = this.facadePalette(skin);
    const paint = urban
      ? (gg, x0, y0, ww, hh, inBand) => this.drawFacade(gg, x0, y0, ww, hh, inBand, P)
      : this.drawBricks.bind(this);

    const bandTop = crackPos * h - Constants.CRACK_BAND_HALF;
    const bandBottom = crackPos * h + Constants.CRACK_BAND_HALF;

    // Cidade: a fachada TERMINA em y=100 e a faixa 0..100 fica transparente
    // só com a torre do coroamento — antes o prédio subia até o topo do
    // canvas e a torre era desenhada por cima, lendo como sobreposição
    const topY = urban ? 100 : 0;
    paint(g, 0, topY, w, h - topY, false);
    paint(g, 0, bandTop, w, bandBottom - bandTop, true);

    // jagged cracks crossing the band (plus short tips past the edges);
    // na cidade a rachadura é escura sobre o material claro da banda
    g.lineStyle(3, urban ? P.bandLine : C.wallCrackLine, 1);
    const cy = crackPos * h;
    g.strokePoints([
      { x: 8, y: cy - 50 }, { x: 30, y: cy - 20 }, { x: 22, y: cy + 5 },
      { x: 48, y: cy + 30 }, { x: 40, y: cy + 55 },
    ], false);
    g.strokePoints([
      { x: 60, y: cy - 55 }, { x: 74, y: cy - 25 }, { x: 66, y: cy },
      { x: 88, y: cy + 25 }, { x: 80, y: cy + 52 },
    ], false);
    g.lineStyle(2, urban ? P.bandLine : C.wallCrackLine, 0.6);
    g.lineBetween(30, bandTop - 14, 24, bandTop + 4);
    g.lineBetween(70, bandBottom - 4, 76, bandBottom + 14);

    // pillar edges (os skins de cidade já têm os seus pilares de concreto)
    if (!urban) {
      g.fillStyle(C.wallMortar, 0.8);
      g.fillRect(0, 0, 3, h);
      g.fillRect(w - 3, 0, 3, h);
    } else {
      // POR ÚLTIMO: desenhado antes, a fachada o cobriria
      this.drawCityCrown(g, crown, w, skin);
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
    const urban = skin !== '';
    const P = this.facadePalette(skin);
    const paint = urban
      ? (gg, x0, y0, ww, hh, inBand) => this.drawFacade(gg, x0, y0, ww, hh, inBand, P)
      : this.drawBricks.bind(this);

    const cy = crackPos * h;
    const holeTop = cy - 70;
    const holeBottom = cy + 70;

    // Cidade: mesmo corte do variant inteiro — topo transparente, só a torre
    const topY = urban ? 100 : 0;
    if (holeTop > topY) paint(g, 0, topY, w, holeTop - topY, false);
    if (holeBottom < h) paint(g, 0, holeBottom, w, h - holeBottom, false);

    // Lascas e entulho na cor do material local: âmbar no zoo, o material
    // claro da banda na cidade (pedido do dono: a trinca combina com o prédio)
    const chunkFill = urban ? P.band : C.wallCrack;
    const chunkLine = urban ? P.bandLine : C.wallCrackLine;

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
    g.fillStyle(urban ? P.slab : C.wallOrangeDark, 1);
    g.fillTriangle(4, holeBottom, 50, holeBottom, 26, holeBottom - 18);
    g.fillTriangle(40, holeBottom, 96, holeBottom, 70, holeBottom - 14);

    if (!urban) {
      g.fillStyle(C.wallMortar, 0.8);
      if (holeTop > 0) g.fillRect(0, 0, 3, holeTop);
      if (holeBottom < h) g.fillRect(0, holeBottom, 3, h - holeBottom);
    } else if (holeTop > 100) {
      // Sem isto a parede perderia a torre no frame da explosão. As três
      // alturas passam (o buraco mais alto começa em y=110); a guarda existe
      // para uma altura de fresta futura não desenhar coroa dentro do buraco.
      // lit: no subúrbio a quebra ACENDE o letreiro da padaria (barato — a
      // coroa é a mesma, só o neon muda de cor)
      this.drawCityCrown(g, crown, w, skin, { lit: true });
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
    this.generateSpikeTowerEgito(scene);
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

  // v1.8.10 — pedestal de ARENITO do deserto (família -egito): mesmo canvas
  // 120x120 e a MESMA fileira de espinhos em (10,0) — a hitbox do Spike não
  // muda. Blocos calcários, friso de glifos e cornija — a armadilha parece
  // ter sido escavada junto com a ruína.
  static generateSpikeTowerEgito(scene) {
    const C = Constants.COLORS;
    const P = this.FACADES['-piramide'];
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    // sapata de pedra meio enterrada na areia
    g.fillStyle(P.pillar, 1);
    g.fillRect(0, 110, 120, 10);
    g.fillStyle(0xe0c492, 1);                 // areia acumulada
    g.fillTriangle(0, 120, 34, 120, 10, 108);
    g.fillTriangle(86, 120, 120, 120, 106, 110);

    // bloco de arenito com juntas de aparelho
    g.fillStyle(P.body, 1);
    g.fillRect(8, 58, 104, 54);
    g.fillStyle(P.slabShade, 0.6);
    for (let y = 58; y <= 112; y += 18) g.fillRect(8, y, 104, 2);
    g.fillRect(44, 58, 2, 54);
    g.fillRect(78, 58, 2, 54);
    g.fillStyle(P.pillar, 1);
    g.fillRect(8, 58, 4, 54);
    g.fillRect(108, 58, 4, 54);

    // friso de glifos no lugar da tarja urbana — o aviso em outra língua
    g.fillStyle(P.gold, 1);
    g.fillRect(12, 74, 96, 16);
    g.fillStyle(P.frame, 0.95);
    g.fillEllipse(26, 82, 12, 6);             // olho
    g.fillCircle(44, 82, 3.6);                // sol
    for (let i = 0; i < 2; i++) {             // água
      g.fillRect(54 + i * 8, 79, 6, 2);
      g.fillRect(58 + i * 8, 83, 6, 2);
    }
    g.fillRect(80, 76, 2.6, 12);              // ankh
    g.fillRect(76, 81, 11, 2.6);
    g.fillStyle(P.lapis, 1);
    g.fillRect(94, 78, 8, 8);

    // tampa/cornija de pedra com beiral (suporte dos espinhos)
    g.fillStyle(C.steelBase, 1);
    g.fillRect(4, 54, 112, 8);

    this.drawSpikeRow(g, 0, 10);

    g.generateTexture('spike-tower-egito', 120, 120);
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
    // O Cerco fica DECLARADO (texturas vivas, wiring desligado — precedente
    // da casa): a ordem de quebra dele é a literal antiga, não BOSS2_LAYERS
    this.generateArmoredSet(scene, 'boss2-gate', ['mid', 'ground', 'high', 'mid'], { palette: 'urban' });
    this.generateArmoredBroken(scene, 'boss2-gate', ['mid', 'ground', 'high', 'mid'], { palette: 'urban' });
    this.generateArmoredSet(scene, 'boss3-gate', ['ground', 'mid', 'high', 'mid', 'ground'], { palette: 'dark' });
    this.generateArmoredBroken(scene, 'boss3-gate', ['ground', 'mid', 'high', 'mid', 'ground'], { palette: 'dark' });
    // v1.8.7 — A MURALHA (boss dos 2000m): viaturas empilhadas + torre de
    // holofote; a ordem de quebra vem de Constants.BOSS2_LAYERS (abre no ALTO
    // — o exame da lição do D3)
    this.generateArmoredSet(scene, 'muralha-gate', Constants.BOSS2_LAYERS, { palette: 'muralha' });
    this.generateArmoredBroken(scene, 'muralha-gate', Constants.BOSS2_LAYERS, { palette: 'muralha' });
    // v1.8.10 — os dois combates do deserto (wiring no GameScene): a
    // BARREIRA DA ESCAVAÇÃO (paleta escavacao: sacos de areia + andaime +
    // rede) e o FARAÓ DE BRONZE (paleta egito: arenito/ouro/lápis-lazúli,
    // 5 camadas — a luta mais longa do jogo; tocha acesa no deck).
    this.generateArmoredSet(scene, 'cerco-gate', Constants.CERCO_LAYERS, { palette: 'escavacao' });
    this.generateArmoredBroken(scene, 'cerco-gate', Constants.CERCO_LAYERS, { palette: 'escavacao' });
    this.generateArmoredSet(scene, 'farao-gate', Constants.FARAO_LAYERS, { palette: 'egito' });
    this.generateArmoredBroken(scene, 'farao-gate', Constants.FARAO_LAYERS, { palette: 'egito' });
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
    if (name === 'muralha') {
      // v1.8.7 — Operação Muralha: pilha de VIATURAS atravessando o viaduto.
      // Azul-viatura no vão, concreto nos pilares, strobe vermelho/ciano.
      // cars: cada camada selada é desenhada como uma viatura da pilha;
      // searchlight: torre de holofote integrada à plataforma do Comandante.
      const car = 0x2e4a6b, carDark = 0x223a55, concrete = 0x59616b;
      return {
        plate: carDark, seam: 0x16283c, truss: car,
        beam: concrete, face: car, frame: 0x16283c,
        lock: 0x1f2531, lockShine: 0x8fb3dc, bolt: 0x8a939f,
        pillar: concrete, pillarEdge: 0x8a939f, rivet: 0xff4a5e,
        deck: 0x8a939f, deckLip: 0x3d444c, rail: 0x1f2531,
        hazardA: 0xffd24a, hazardB: 0x1f2531, hazardPlate: false,
        cars: true, searchlight: true,
      };
    }
    if (name === 'escavacao') {
      // v1.8.10 — Barreira da Escavação (3650m): sacos de areia empilhados
      // entre montantes de andaime, com a REDE do Capturador por cima do
      // vão. sandbags: camada selada vira fileiras de sacos; net: malha de
      // corda sobre a chapa do fundo.
      const wood = 0x8a5a33, woodDark = 0x6b4326, sand = 0xc2a36b;
      return {
        plate: 0x6b532f, seam: 0x4a3a20, truss: wood,
        beam: wood, face: sand, frame: woodDark,
        lock: 0x4a3a20, lockShine: 0xe0c492, bolt: woodDark,
        pillar: wood, pillarEdge: 0xc2a36b, rivet: 0x4a3a20,
        deck: sand, deckLip: woodDark, rail: 0x4a3a20,
        hazardA: 0xe0c492, hazardB: 0x4a3a20, hazardPlate: false,
        sandbags: true, net: true,
      };
    }
    if (name === 'egito') {
      // v1.8.10 — Faraó de Bronze (4700m): muralha de ARENITO com frisos de
      // ouro e lápis-lazúli. glyphs: a camada selada ganha o cartucho e os
      // glifos; torch: tocha ACESA no deck (apagada/tombada no wrecked).
      const stone = 0xd9b98a, stoneDark = 0x9a7a4e, gold = 0xd4af37, lapis = 0x1e4b8f;
      return {
        plate: stoneDark, seam: 0x6b532f, truss: 0xb59a6b,
        beam: 0xb59a6b, face: stone, frame: 0x8a6a42,
        lock: lapis, lockShine: gold, bolt: gold,
        pillar: 0xb59a6b, pillarEdge: 0xe8d3a8, rivet: gold,
        deck: stone, deckLip: 0x8a6a42, rail: 0x6b532f,
        hazardA: gold, hazardB: lapis, hazardPlate: false,
        glyphs: true, torch: true,
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

    if (P.net) {
      // v1.8.10 — a REDE do Capturador cobrindo o vão: malha de corda em
      // losangos, por cima da chapa (só textura — o perigo real são as
      // redes disparadas pelo rifle CERCO_NET)
      g.lineStyle(2, 0xd8c9a6, 0.4);
      for (let ny = 60; ny < 700; ny += 44) {
        g.lineBetween(40, ny, 200, ny - 160);
        g.lineBetween(40, ny - 160, 200, ny);
      }
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
          if (P.cars) {
            // Muralha: cada camada selada É uma viatura da pilha — vidros,
            // rodas espremidas e giroflex vermelho/ciano por cima da placa
            g.fillStyle(0x9ad7ef, 0.85);              // vidros
            for (const wx of [56, 98, 140]) g.fillRect(wx, top + 10, 28, 14);
            g.fillStyle(P.frame, 0.9);                // montantes dos vidros
            for (const wx of [84, 126]) g.fillRect(wx, top + 10, 6, 14);
            g.fillStyle(0x1f2531, 1);                 // rodas na pilha
            g.fillCircle(72, top + h - 12, 10);
            g.fillCircle(168, top + h - 12, 10);
            g.fillStyle(0x59616b, 1);
            g.fillCircle(72, top + h - 12, 4);
            g.fillCircle(168, top + h - 12, 4);
            g.fillStyle(0xff4a5e, 1);                 // giroflex
            g.fillRect(100, top + 2, 16, 6);
            g.fillStyle(0x4ad1ff, 1);
            g.fillRect(118, top + 2, 16, 6);
            g.fillStyle(0xffffff, 0.5);               // brilho do strobe
            g.fillRect(104, top + 2, 4, 6);
            g.fillRect(122, top + 2, 4, 6);
          }
          if (P.sandbags) {
            // Barreira da Escavação: a camada selada É uma pilha de SACOS
            // DE AREIA entre montantes de andaime (fiadas alternadas)
            for (let row = 0; row * 20 + 16 < h; row++) {
              const sy = top + h - 10 - row * 20;
              const off = (row % 2) * 24;
              g.fillStyle(row % 2 ? 0xb8955c : 0xc2a36b, 1);
              for (let sx = 58 + off; sx < 186; sx += 48) {
                g.fillEllipse(sx, sy, 44, 17);
              }
              g.fillStyle(0x8a6a42, 0.5);             // costura dos sacos
              for (let sx = 58 + off; sx < 186; sx += 48) {
                g.fillRect(sx - 14, sy - 1, 28, 2);
              }
            }
            g.fillStyle(0x6b4326, 1);                 // montantes de madeira
            g.fillRect(48, top + 4, 7, h - 8);
            g.fillRect(185, top + 4, 7, h - 8);
          }
          if (P.glyphs) {
            // Faraó: friso de glifos + cartucho no centro da camada selada
            g.fillStyle(0xd4af37, 1);
            g.fillRect(48, top + 6, 144, 8);          // friso de ouro
            g.fillStyle(0x1e4b8f, 1);
            for (let gx2 = 54; gx2 < 186; gx2 += 22) g.fillRect(gx2, top + 8, 10, 4);
            g.lineStyle(4, 0xd4af37, 1);              // cartucho
            g.strokeEllipse(120, top + h / 2 + 4, 56, Math.max(30, h * 0.42));
            g.fillStyle(0x7a5f34, 0.95);              // glifos do nome
            g.fillCircle(120, top + h / 2 - 6, 4);
            g.fillEllipse(120, top + h / 2 + 6, 15, 5);
            g.fillRect(113, top + h / 2 + 14, 14, 3);
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

    if (P.searchlight) {
      // v1.8.7 — torre de HOLOFOTE integrada à plataforma (a Muralha): os
      // feixes do D3 convergem para cá — este é o landmark que eles anunciam.
      // Aceso enquanto o portão está de pé; apagado e torto no wrecked.
      g.fillStyle(P.rail, 1);
      g.fillRect(198, 24, 8, 58);                  // mastro na ponta direita
      g.fillRect(190, 44, 24, 4);                  // travessa de reforço
      g.fillStyle(P.deckLip, 1);
      g.fillRect(188, 20, 32, 8);                  // berço do canhão de luz
      if (opts.wrecked) {
        g.save(); g.translateCanvas(202, 18); g.rotateCanvas(0.5);
        g.fillStyle(0x3d444c, 1);
        g.fillRect(-16, -12, 34, 16);              // canhão tombado, apagado
        g.fillStyle(0x272d34, 1);
        g.fillRect(-20, -10, 6, 12);
        g.restore();
      } else {
        g.fillStyle(0x59616b, 1);
        g.fillRect(186, 4, 34, 18);                // corpo do canhão de luz
        g.fillStyle(0x8a939f, 1);
        g.fillRect(186, 4, 34, 4);
        g.fillStyle(0xfff3c4, 1);
        g.fillRect(180, 6, 8, 14);                 // lente (aponta p/ o rino)
        g.fillStyle(0xfff3c4, 0.16);               // feixe varrendo a arena
        g.fillTriangle(182, 8, 182, 18, 60, 96);
        g.fillStyle(0xfff3c4, 0.09);
        g.fillTriangle(182, 6, 182, 20, 20, 80);
        g.fillStyle(0xff4a5e, 1);                  // luz de obstáculo
        g.fillCircle(203, 2.5, 2.5);
      }
    }

    if (P.torch) {
      // v1.8.10 — TOCHA do Faraó na ponta direita do deck: braseiro de
      // bronze aceso enquanto a muralha está de pé; tombado e apagado no
      // wrecked (a queda da luta lida no primeiro olhar)
      if (opts.wrecked) {
        g.save(); g.translateCanvas(206, 74); g.rotateCanvas(0.6);
        g.fillStyle(0x8a6a42, 1);
        g.fillRect(-3, -34, 6, 34);                // mastro tombado
        g.fillStyle(0x6b532f, 1);
        g.fillEllipse(0, -36, 20, 8);              // braseiro apagado
        g.restore();
      } else {
        g.fillStyle(0x8a6a42, 1);
        g.fillRect(200, 34, 6, 48);                // mastro
        g.fillStyle(0xd4af37, 1);
        g.fillEllipse(203, 32, 22, 9);             // braseiro de bronze
        g.fillStyle(0x8a6a42, 1);
        g.fillEllipse(203, 34, 16, 5);
        g.fillStyle(0xff7b2a, 1);                  // a chama
        g.fillTriangle(194, 30, 212, 30, 203, 4);
        g.fillStyle(0xffd24a, 1);
        g.fillTriangle(198, 30, 208, 30, 203, 12);
        g.fillStyle(0xffd24a, 0.18);               // halo
        g.fillCircle(203, 18, 16);
      }
    }

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
    this.generateTranqTowerEgito(scene);
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

  // v1.8.10 — OBELISCO-guardião do deserto (família -egito): mesmo canvas
  // 84x120 e a MESMA seteira em (36,70) — o disparo sai de this.y + 38
  // (TranqTower.preUpdate), mover a abertura desalinharia o dardo (aqui,
  // a FLECHA: o pool de dardos veste arrow-projectile via skin do spawn).
  // Fuste afilado de arenito, olho de Hórus vigiando no topo, piramidion
  // dourado — a torre parece ter sempre estado ali.
  static generateTranqTowerEgito(scene) {
    const P = this.FACADES['-piramide'];
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const slit = 0x23180c;
    const cx = 42;

    // base de pedra em dois degraus, com areia mordendo
    g.fillStyle(P.pillar, 1);
    g.fillRect(10, 112, 64, 8);
    g.fillRect(16, 104, 52, 10);
    g.fillStyle(0xe0c492, 1);
    g.fillTriangle(4, 120, 26, 120, 12, 108);

    // fuste afilado (duas faces: luz e sombra)
    g.fillStyle(P.body, 1);
    g.fillTriangle(20, 104, 64, 104, 54, 16);
    g.fillTriangle(20, 104, 54, 16, 30, 16);
    g.fillStyle(P.slabShade, 0.55);           // face em sombra
    g.fillTriangle(52, 104, 64, 104, 54, 18);
    // juntas do aparelho
    g.fillStyle(P.slabShade, 0.5);
    for (let y = 28; y < 104; y += 16) {
      const t = (y - 16) / 88;                // afunilamento
      const half = 22 - 10 * (1 - t);
      g.fillRect(cx - half + 4, y, half * 2 - 8, 2);
    }

    // piramidion dourado + olho de Hórus vigiando logo abaixo
    g.fillStyle(P.gold, 1);
    g.fillTriangle(28, 18, 56, 18, cx, 0);
    g.fillStyle(P.gold, 1);                   // moldura do olho
    g.fillEllipse(cx, 32, 26, 15);
    g.fillStyle(P.lapis, 1);
    g.fillEllipse(cx, 32, 21, 10);
    g.fillStyle(0xf4efe0, 1);
    g.fillEllipse(cx, 32, 12, 6);
    g.fillStyle(0x17171b, 1);
    g.fillCircle(cx, 32, 2.8);                // a pupila que te segue
    g.fillRect(cx - 1.2, 39, 2.4, 8);         // lágrima de Hórus
    g.fillRect(cx + 1.5, 44, 7, 2.2);

    // glifos no fuste (entre o olho e a seteira)
    g.fillStyle(P.glyph, 0.9);
    g.fillCircle(cx, 52, 2.6);
    g.fillRect(cx - 4, 58, 8, 2.2);
    g.fillEllipse(cx, 64, 9, 3.6);

    // seteira escura de onde sai a flecha — posição CONTRATUAL (36,70)
    g.fillStyle(slit, 1);
    g.fillRect(36, 70, 10, 32);
    g.fillCircle(41, 70, 5);

    g.generateTexture('tranq-tower-egito', 84, 120);
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

  // v1.8.10 — chão do DESERTO: mesmo canvas 1280x100 (o tileSprite do mundo
  // troca de textura sem recriar nada — regra do ground-city). Areia socada
  // com crosta clara ondulada no topo e pedras/cacos determinísticos.
  static generateGroundDesert(scene) {
    const w = 1280, h = 100;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    g.fillStyle(0xcbab6f, 1);            // areia socada
    g.fillRect(0, 12, w, h - 12);
    g.fillStyle(0xe0c492, 1);            // crosta clara ao sol
    g.fillRect(0, 0, w, 12);
    g.fillStyle(0xb9986a, 1);            // ondulações penduradas na crosta
    for (let x = 0; x < w; x += 32) {
      g.fillTriangle(x, 12, x + 32, 12, x + 16, 20);
    }
    g.fillStyle(0xf0dcae, 0.5);
    g.fillRect(0, 0, w, 3);

    // Pedras, cacos de cerâmica e ossos — determinísticos (LCG)
    let seed = 53;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let i = 0; i < 24; i++) {
      g.fillStyle(i % 2 === 0 ? 0xa8874f : 0x8c6f40, 1);
      g.fillCircle(rnd() * w, 22 + rnd() * 72, 2 + rnd() * 4);
    }
    g.fillStyle(0xb4552f, 0.9);          // cacos de ânfora
    [260, 700, 1080].forEach((x) => g.fillTriangle(x, 60, x + 14, 60, x + 8, 50));
    g.fillStyle(0xe8ddc2, 0.9);          // lascas de osso
    [140, 520, 940, 1220].forEach((x) => g.fillRect(x, 76, 12, 3));
    // marcas de vento em arcos longos
    g.lineStyle(2, 0xb9986a, 0.6);
    for (let x = 0; x < w; x += 160) {
      g.lineBetween(x + 10, 40, x + 90, 44);
      g.lineBetween(x + 60, 66, x + 150, 70);
    }

    g.generateTexture('ground-desert', w, h);
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
      // v1.8.10 — irmãs do deserto (família -egito): duna com capa de pedra
      this.generateRampEgito(scene, `ramp-${name}-egito`, spec);
      this.generateRampEgitoRubble(scene, `ramp-${name}-egito-rubble`, spec);
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

  // v1.8.10 — rampa do DESERTO: duna de areia socada com degraus de pedra
  // calcária assentados na subida (a escavação aproveitou a duna). Mesma
  // técnica de colunas de 2px das irmãs (nada de gradiente, largura sempre
  // positiva) e MESMO canvas por variante.
  static generateRampEgito(scene, key, spec) {
    const P = this.FACADES['-piramide'];
    const w = spec.asc + spec.top + spec.desc;
    const h = spec.rise + Constants.RAMP_SKIRT;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const STEP = 2, CAP = 12;
    let seed = 61;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

    // massa de areia + capa de pedra clara na superfície
    for (let x = 0; x < w; x += STEP) {
      const bw = Math.min(STEP, w - x);
      if (bw <= 0) continue;
      const ty = spec.rise - this.rampRise(spec, x + bw / 2);
      g.fillStyle(0xcbab6f, 1);                 // areia
      g.fillRect(x, ty, bw, h - ty);
      g.fillStyle(0xa88a52, 1);                 // sombra na base
      g.fillRect(x, h - 16, bw, 16);
      g.fillStyle(P.body, 1);                   // capa de pedra
      g.fillRect(x, ty, bw, CAP);
      g.fillStyle(P.slab, 0.7);                 // luz rasante
      g.fillRect(x, ty, bw, 3);
    }

    // juntas dos blocos da capa, acompanhando a inclinação
    g.fillStyle(P.slabShade, 0.8);
    for (let x = 28; x < w - 10; x += 52) {
      const ty = spec.rise - this.rampRise(spec, x);
      g.fillRect(x, ty, 2, CAP);
    }
    // ondulações da areia no corpo da duna
    g.fillStyle(0xb9986a, 0.7);
    for (let i = 0; i < 8; i++) {
      const px = 20 + rnd() * (w - 60);
      const surf = spec.rise - this.rampRise(spec, px);
      const py = surf + CAP + 12 + rnd() * Math.max(4, h - surf - CAP - 34);
      g.fillEllipse(px, py, 26 + rnd() * 22, 4);
    }
    // um glifo esculpido no paramento, aqui e ali
    g.fillStyle(P.glyph, 0.8);
    for (let x = 60; x < w - 40; x += 150) {
      const ty = spec.rise - this.rampRise(spec, x) + CAP + 14;
      if (ty > h - 26) continue;
      g.fillEllipse(x, ty + 4, 12, 5);
      g.fillRect(x - 5, ty + 10, 10, 2);
    }

    // penhasco do trampolim: face de pedra fraturada com estratos
    if (spec.desc <= 0) {
      g.fillStyle(P.pillar, 1);
      g.fillRect(w - 16, 0, 16, h);
      g.fillStyle(P.slabShade, 1);
      for (let y = 18; y < h; y += 18) g.fillRect(w - 16, y, 16, 3);
      g.fillStyle(P.body, 1);                   // mordidas na quina
      for (let y = 8; y < h - 20; y += 26) {
        g.fillTriangle(w - 16, y, w - 16, y + 14, w - 4, y + 7);
      }
      g.fillStyle(P.body, 1);                   // beirada da capa
      g.fillRect(w - 18, 0, 18, CAP);
    }

    g.generateTexture(key, w, h);
    g.destroy();
  }

  // Entulho do deserto: blocos calcários tombados sobre o monte de areia
  static generateRampEgitoRubble(scene, key, spec) {
    const P = this.FACADES['-piramide'];
    const w = spec.asc + spec.top + spec.desc;
    const h = spec.rise + Constants.RAMP_SKIRT;
    const base = spec.rise;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    let seed = 37;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

    g.fillStyle(0xcbab6f, 1);
    g.fillRect(0, base, w, h - base);            // a saia segue enterrada

    // blocos de pedra tombados uns sobre os outros
    for (let x = -8; x < w; x += 30) {
      const bw = Math.min(26 + rnd() * 16, w - x);
      if (bw <= 6) continue;
      const top = base - (8 + rnd() * 24);
      g.fillStyle(rnd() < 0.5 ? P.body : P.pillar, 1);
      g.fillRect(Math.max(0, x), top, bw - Math.max(0, -x), base - top + 6);
      g.fillStyle(P.slab, 0.7);
      g.fillRect(Math.max(0, x), top, bw - Math.max(0, -x), 4);
    }
    // cacos e areia levantada
    for (let i = 0; i < 12; i++) {
      g.fillStyle(i % 2 === 0 ? P.slab : P.slabShade, 1);
      g.fillRect(rnd() * w, base - rnd() * 14, 5 + rnd() * 6, 4 + rnd() * 4);
    }
    g.fillStyle(0xe0c492, 0.85);                 // areia derramada por cima
    for (let x = 10; x < w - 20; x += 60) {
      g.fillTriangle(x, base, x + 34, base, x + 16, base - 10);
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

    // ========== v1.8.7 — Estado de Alerta: um par far/near por distrito =====

    // ---------- props compartilhados dos distritos ----------
    // Lixeira do near da cidade, virada em prop reutilizável
    const trashCan = (g, x, y = 190) => {
      g.fillStyle(0x6b7078, 1);
      g.fillRoundedRect(x, y, 34, 48, 5);
      g.fillRect(x - 4, y - 6, 42, 8);
    };
    // Silhueta FUGINDO (inclinada para a frente — o rush em pânico do D2)
    const runner = (g, x, c, s = 1) => {
      g.fillStyle(c, 0.92);
      g.fillCircle(x + 10 * s, 178, 8 * s);
      g.save();
      g.translateCanvas(x, 186);
      g.rotateCanvas(0.3);
      g.fillRoundedRect(0, 0, 18 * s, 38 * s, 6 * s);
      g.restore();
      g.lineStyle(6 * s, c, 0.92);
      g.lineBetween(x + 2 * s, 222, x - 12 * s, 250);   // perna esticada atrás
      g.lineBetween(x + 8 * s, 222, x + 24 * s, 244);   // perna à frente
      g.lineBetween(x + 6 * s, 196, x + 26 * s, 184);   // braço lançado
    };

    // ============ 1001–1400m: SUBÚRBIO SONOLENTO — a cidade dorme ===========
    makeFar('suburbio', (g) => {
      // Sobrados baixos de telhado de zinco, quase tudo apagado (uma janela
      // acesa é EXCEÇÃO — a régua do distrito é a madrugada)
      [[0, 268, 84, 0], [96, 282, 70, 1], [178, 258, 90, 0], [282, 288, 64, 1],
       [356, 270, 84, 0], [452, 284, 74, 1], [552, 262, 88, 0]]
        .forEach(([x, y, w2, k]) => {
          g.fillStyle(k ? 0x4a3a30 : 0x554238, 1);
          g.fillRect(x, y, w2, 420 - y);
          g.fillStyle(0x77808a, 1);              // telhado de zinco
          g.fillTriangle(x - 6, y, x + w2 + 6, y, x + w2 / 2, y - 24);
          g.fillStyle(0x59616b, 1);              // água em sombra
          g.fillTriangle(x + w2 / 2, y - 24, x + w2 + 6, y, x + w2 / 2 + 10, y);
          for (let wy = y + 12; wy < 400; wy += 26) {
            for (let wx = x + 10; wx + 10 < x + w2 - 6; wx += 22) {
              const on = ((wx * 5 + wy * 11) % 19) < 2;
              g.fillStyle(on ? 0xffb066 : 0x2e2620, on ? 1 : 0.85);
              g.fillRect(wx, wy, 10, 14);
            }
          }
        });
      // Uma padaria ACESA no meio do quarteirão morto (o farol do distrito)
      g.fillStyle(0xffb066, 0.16);
      g.fillRect(180, 330, 86, 60);
      g.fillStyle(0xffb066, 1);
      g.fillRect(190, 338, 66, 12);
      g.fillStyle(0x241a12, 1);
      for (let i = 0; i < 4; i++) g.fillRect(196 + i * 15, 340, 4, 8);
      // Fiação: postes a cada 160px (divide 640 — emenda) + fios com barriga
      g.fillStyle(0x3a332c, 1);
      for (let px = 40; px < 640; px += 160) {
        g.fillRect(px - 3, 186, 6, 150);
        g.fillRect(px - 16, 194, 32, 4);
      }
      g.lineStyle(2, 0x2a251f, 0.9);
      for (let px = -120; px < 640; px += 160) {
        g.lineBetween(px, 198, px + 80, 212);
        g.lineBetween(px + 80, 212, px + 160, 198);
        g.lineBetween(px, 210, px + 80, 222);
        g.lineBetween(px + 80, 222, px + 160, 210);
      }
      g.fillStyle(0x2f3b4d, 1);                  // faixa de asfalto ao fundo
      g.fillRect(0, 404, 640, 16);
    });
    makeNear('suburbio', (g) => {
      sidewalk(g);
      // Banca de jornal FECHADA: porta de enrolar riscada + telhadinho
      const banca = (x) => {
        g.fillStyle(0x4a5058, 1);
        g.fillRect(x, 148, 96, 88);
        g.fillStyle(0x39404a, 1);                // porta de enrolar
        g.fillRect(x + 8, 162, 80, 74);
        g.fillStyle(0x59616b, 0.9);
        for (let yy = 166; yy < 234; yy += 8) g.fillRect(x + 8, yy, 80, 3);
        g.fillStyle(0x8a5a2e, 1);                // telhadinho
        g.fillTriangle(x - 10, 150, x + 106, 150, x + 48, 124);
        g.fillStyle(0xd6453c, 1);                // listras do toldo
        for (let i = 0; i < 4; i++) g.fillRect(x - 6 + i * 27, 144, 14, 8);
        g.fillStyle(0xf3e2b8, 1);
        for (let i = 0; i < 4; i++) g.fillRect(x + 8 + i * 27, 144, 13, 8);
      };
      banca(70);
      banca(420);
      // Orelhão: concha acrílica num poste
      const orelhao = (x) => {
        g.fillStyle(0x8a939f, 1);
        g.fillRect(x + 16, 168, 8, 68);
        g.fillStyle(0x3f7ad6, 1);                // concha
        g.beginPath();
        g.arc(x + 20, 152, 26, Math.PI * 0.9, Math.PI * 2.1);
        g.fillPath();
        g.fillStyle(0x22303e, 1);
        g.beginPath();
        g.arc(x + 20, 154, 18, Math.PI * 0.95, Math.PI * 2.05);
        g.fillPath();
        g.fillStyle(0x1a1d21, 1);                // aparelho
        g.fillRect(x + 14, 150, 12, 18);
      };
      orelhao(250);
      trashCan(g, 330);
      trashCan(g, 372);
      streetLamp(g, 560);
    });

    // ============ 1401–1800m: O DESPERTAR — torres de vidro e telões ========
    makeFar('vidro', (g) => {
      // Skyline mais alto e mais denso que o da cidade genérica
      [[0, 150, 80, 0], [92, 118, 66, 1], [170, 168, 74, 0], [256, 96, 84, 1],
       [352, 140, 70, 0], [434, 110, 78, 1], [524, 158, 52, 0], [576, 132, 64, 1]]
        .forEach(([x, y, w2, k]) =>
          cityBlock(g, x, y, w2, 420 - y, k ? 0x55617a : 0x475369, 0xffd98a));
      crane(g, 200);
      // Telões "PROCURADO" acesos em duas torres (o distrito te viu)
      const telao = (x, y) => {
        g.fillStyle(0x1f2531, 1);
        g.fillRect(x, y, 64, 42);
        g.fillStyle(0x101720, 1);
        g.fillRect(x + 3, y + 3, 58, 36);
        g.fillStyle(0xff4a5e, 0.95);            // a silhueta do rino
        g.fillRect(x + 8, y + 16, 22, 14);
        g.fillTriangle(x + 30, y + 20, x + 37, y + 20, x + 30, y + 27);
        g.fillStyle(0xff4a5e, 1);               // tarja "PROCURADO"
        g.fillRect(x + 8, y + 7, 30, 5);
        g.fillStyle(0x4ad1ff, 0.9);             // legenda
        g.fillRect(x + 40, y + 18, 16, 3);
        g.fillRect(x + 40, y + 25, 13, 3);
        g.fillStyle(0xffffff, 0.08);            // brilho do vidro do telão
        g.fillRect(x + 3, y + 3, 10, 36);
      };
      telao(276, 130);
      telao(450, 180);
      haze(g);
      g.fillStyle(0x2f3b4d, 1);
      g.fillRect(0, 404, 640, 16);
    });
    makeNear('vidro', (g) => {
      sidewalk(g);
      // Fachada contínua de lojas com vitrines acesas (passo 80 divide 640)
      g.fillStyle(0x39424f, 1);
      g.fillRect(0, 100, 640, 136);
      for (let x = 0; x < 640; x += 80) {
        g.fillStyle(0x9ad7ef, 0.45);            // vidro
        g.fillRect(x + 8, 122, 60, 114);
        g.fillStyle(0xffe9a8, 0.3);             // luz acesa lá dentro
        g.fillRect(x + 12, 128, 20, 104);
        g.fillStyle(0x1f2531, 1);               // pilastra
        g.fillRect(x + 72, 116, 8, 120);
        g.fillStyle(0x4ad1ff, 0.9);             // letreiro de LED
        g.fillRect(x + 14, 108, 44, 6);
      }
      // Multidão em silhueta FUGINDO (todos para a direita — para longe
      // do rino, que vem da esquerda)
      runner(g, 120, 0x232c38, 1);
      runner(g, 168, 0x2c2434, 0.9);
      runner(g, 320, 0x1f3038, 1.05);
      runner(g, 372, 0x232c38, 0.85);
      runner(g, 540, 0x2c2434, 1);
      trashCan(g, 470, 196);
    });

    // ============ 1801–2200m: ZONA DE CONTENÇÃO — blecaute e holofotes ======
    makeFar('contencao', (g) => {
      // Skyline APAGADO: blecaute tático, prédios como massas escuras
      [[0, 160, 82, 0], [94, 130, 68, 1], [176, 178, 76, 0], [264, 108, 84, 1],
       [360, 150, 72, 0], [444, 122, 76, 1], [532, 168, 108, 0]]
        .forEach(([x, y, w2, k]) => {
          g.fillStyle(k ? 0x222b38 : 0x1b2330, 1);
          g.fillRect(x, y, w2, 420 - y);
          // pouquíssimas janelas de emergência (vermelho fraco)
          for (let wy = y + 16; wy < 380; wy += 46) {
            for (let wx = x + 10; wx + 8 < x + w2 - 6; wx += 34) {
              if (((wx * 7 + wy * 13) % 23) < 2) {
                g.fillStyle(0xff4a5e, 0.5);
                g.fillRect(wx, wy, 8, 10);
              }
            }
          }
        });
      // FEIXES DE HOLOFOTE varrendo — estáticos, alpha baixo, todos os
      // vértices dentro do tile (emenda limpa); os apexes PENDEM para a
      // direita: convergem para a barricada da Muralha, o landmark à frente
      const beam = (bx, half, tipX, a) => {
        g.fillStyle(0xcfe3ff, a);
        g.fillTriangle(bx - half, 420, bx + half, 420, tipX, -30);
      };
      beam(90, 20, 250, 0.07);
      beam(240, 26, 420, 0.09);
      beam(430, 18, 560, 0.06);
      beam(560, 24, 640, 0.08);
      g.fillStyle(0x232b36, 1);
      g.fillRect(0, 404, 640, 16);
    });
    makeNear('contencao', (g) => {
      sidewalk(g);
      // Barreiras jersey de concreto com tarja de perigo
      const jersey = (x) => {
        g.fillStyle(0x6e7681, 1);
        g.fillPoints([
          { x, y: 236 }, { x: x + 12, y: 192 }, { x: x + 52, y: 192 }, { x: x + 64, y: 236 },
        ], true);
        g.fillStyle(0x59616b, 1);
        g.fillRect(x + 12, 192, 40, 5);
        g.fillStyle(0xffd24a, 1);               // tarja
        g.fillRect(x + 8, 210, 48, 12);
        g.fillStyle(0x1f2531, 1);
        for (let i = 0; i < 3; i++) g.fillTriangle(x + 10 + i * 16, 222, x + 18 + i * 16, 222, x + 26 + i * 16, 210);
      };
      jersey(50);
      jersey(126);
      jersey(430);
      // Cones de trânsito
      const cone = (x) => {
        g.fillStyle(0xf27b3c, 1);
        g.fillTriangle(x, 236, x + 22, 236, x + 11, 200);
        g.fillStyle(0xf6f4ef, 1);
        g.fillRect(x + 4, 220, 14, 6);
        g.fillStyle(0xd8622b, 1);
        g.fillRect(x - 4, 234, 30, 5);
      };
      cone(230);
      cone(290);
      cone(560);
      // Holofote portátil no tripé, aceso para o alto
      g.fillStyle(0x3d444c, 1);
      g.fillRect(342, 176, 6, 60);
      g.fillTriangle(322, 236, 368, 236, 345, 196);
      g.fillStyle(0x59616b, 1);
      g.fillRect(330, 158, 30, 20);
      g.fillStyle(0xfff3c4, 1);
      g.fillRect(334, 152, 22, 8);
      g.fillStyle(0xfff3c4, 0.14);
      g.fillTriangle(334, 152, 356, 152, 384, 0);
      g.fillStyle(0xff4a5e, 0.9);               // strobe na base
      g.fillRect(336, 180, 8, 5);
      g.fillStyle(0x4ad1ff, 0.9);
      g.fillRect(346, 180, 8, 5);
    });

    // ========== v1.8.10 — AS AREIAS DO TEMPO: um par far/near por etapa ====
    // Mesmas regras da casa: emenda ±640 (ou x em 36..604), props que pisam
    // o chão com base em FAR_BASE, zero gradiente (faixas/alpha).

    // ---------- props do deserto ----------
    const SAND = 0xe0c492, SAND_D = 0xcbab6f, SAND_DD = 0xa8874f;
    // Pirâmide ao longe: face iluminada + face em sombra e junta de blocos
    const pyramid = (g, x, s, base = FAR_BASE + 40) => {
      const half = 150 * s, hgt = 190 * s;
      g.fillStyle(0xc9a468, 1);
      g.fillTriangle(x - half, base, x + half, base, x, base - hgt);
      g.fillStyle(0xa8874f, 1);                    // face em sombra
      g.fillTriangle(x + 26 * s, base, x + half, base, x, base - hgt);
      g.fillStyle(0x8c6f40, 0.5);                  // fiadas de blocos
      for (let i = 1; i < 6; i++) {
        const t = i / 6;
        g.fillRect(x - half * (1 - t), base - hgt * t, half * 2 * (1 - t), 2.5);
      }
      g.fillStyle(0xf0dcae, 0.9);                  // piramidion ao sol
      g.fillTriangle(x - 16 * s, base - hgt + 22 * s, x + 16 * s, base - hgt + 22 * s, x, base - hgt);
    };
    // Esfinge em silhueta (olhando para a esquerda, de onde o rino vem)
    const sphinxSil = (g, x, s, base = FAR_BASE) => {
      g.fillStyle(0x9a7a4e, 1);
      g.fillRect(x - 60 * s, base - 34 * s, 120 * s, 34 * s);   // corpo deitado
      g.fillRect(x - 66 * s, base - 20 * s, 22 * s, 20 * s);    // patas à frente
      g.fillRect(x - 56 * s, base - 44 * s, 30 * s, 14 * s);    // peito
      g.fillStyle(0xb59a6b, 1);
      g.fillRect(x - 62 * s, base - 76 * s, 34 * s, 40 * s);    // cabeça + nemes
      g.fillTriangle(x - 70 * s, base - 70 * s, x - 62 * s, base - 76 * s, x - 62 * s, base - 46 * s);
      g.fillTriangle(x - 28 * s, base - 76 * s, x - 20 * s, base - 66 * s, x - 28 * s, base - 46 * s);
      g.fillStyle(0x7a5f34, 1);                    // sombra do rosto
      g.fillRect(x - 58 * s, base - 62 * s, 26 * s, 5 * s);
    };
    // Obelisco distante
    const obeliskFar = (g, x, s, base = FAR_BASE) => {
      g.fillStyle(0xb59a6b, 1);
      g.fillTriangle(x - 9 * s, base, x + 9 * s, base, x + 4 * s, base - 120 * s);
      g.fillTriangle(x - 9 * s, base, x + 4 * s, base - 120 * s, x - 4 * s, base - 120 * s);
      g.fillStyle(0xd4af37, 1);
      g.fillTriangle(x - 5 * s, base - 118 * s, x + 5 * s, base - 118 * s, x, base - 132 * s);
    };
    // Carcaça de carro meio engolida pela areia (a estrada acabou aqui)
    const carCarcass = (g, x, base = FAR_BASE) => {
      g.fillStyle(0x8a5a4a, 1);                    // lataria enferrujada
      g.fillRoundedRect(x, base - 34, 88, 22, 6);
      g.fillRoundedRect(x + 18, base - 48, 46, 18, 6);
      g.fillStyle(0x6b4436, 1);                    // ferrugem funda
      g.fillRect(x + 8, base - 26, 20, 8);
      g.fillCircle(x + 70, base - 40, 5);
      g.fillStyle(0x3a3a40, 0.9);                  // vãos dos vidros
      g.fillRect(x + 24, base - 44, 16, 12);
      g.fillRect(x + 44, base - 44, 14, 12);
      g.fillStyle(SAND, 1);                        // areia engolindo
      g.fillTriangle(x - 14, base, x + 46, base, x + 8, base - 22);
      g.fillTriangle(x + 52, base, x + 100, base, x + 84, base - 16);
    };
    // Andaime de madeira do sítio (2 montantes + plataformas + diagonal)
    const scaffoldFar = (g, x, h2, base = FAR_BASE) => {
      g.fillStyle(0x6b4326, 1);
      g.fillRect(x, base - h2, 7, h2);
      g.fillRect(x + 52, base - h2, 7, h2);
      g.fillStyle(0x8a5a33, 1);
      for (let yy = base - 16; yy > base - h2; yy -= 34) g.fillRect(x - 5, yy, 70, 6);
      g.fillStyle(0x6b4326, 0.9);
      g.fillTriangle(x + 4, base - 4, x + 10, base - 4, x + 58, base - 36);
    };
    // Guindaste de MADEIRA (shaduf de obra): mastro + lança com corda e cesto
    const woodCrane = (g, x, base = FAR_BASE) => {
      g.fillStyle(0x6b4326, 1);
      g.fillRect(x - 5, base - 120, 10, 120);      // mastro
      g.fillStyle(0x8a5a33, 1);
      g.save(); g.translateCanvas(x, base - 112); g.rotateCanvas(-0.22);
      g.fillRect(-16, -6, 120, 8);                 // lança inclinada
      g.restore();
      g.lineStyle(2, 0x4a3520, 1);                 // corda
      g.lineBetween(x + 86, base - 134, x + 86, base - 60);
      g.fillStyle(0x9a8a6a, 1);                    // cesto de pedra
      g.fillRect(x + 78, base - 60, 17, 13);
      g.fillStyle(0x6b4326, 1);                    // contrapeso
      g.fillCircle(x - 24, base - 104, 9);
    };
    const crateStack = (g, x, base = FAR_BASE) => {
      const crate = (cx2, cy, s) => {
        g.fillStyle(0x8a5a33, 1);
        g.fillRect(cx2, cy - 26 * s, 30 * s, 26 * s);
        g.fillStyle(0x6b4326, 1);
        g.fillRect(cx2, cy - 26 * s, 30 * s, 4 * s);
        g.fillRect(cx2, cy - 14 * s, 30 * s, 3 * s);
        g.fillStyle(0xc2a36b, 0.8);
        g.fillRect(cx2 + 3 * s, cy - 23 * s, 4 * s, 20 * s);
      };
      crate(x, base, 1);
      crate(x + 34, base, 1.1);
      crate(x + 14, base - 28, 0.9);
    };
    // Coluna quebrada (fuste canelado + tambor tombado ao lado)
    const brokenColumn = (g, x, h2, base = FAR_BASE) => {
      g.fillStyle(0xb59a6b, 1);
      g.fillRect(x - 12, base - h2, 24, h2);
      g.fillStyle(0x8c6f40, 0.6);                  // caneluras
      for (let cxx = x - 8; cxx <= x + 6; cxx += 7) g.fillRect(cxx, base - h2 + 4, 3, h2 - 4);
      g.fillStyle(0xb59a6b, 1);                    // topo mordido
      g.fillTriangle(x - 12, base - h2, x - 2, base - h2, x - 8, base - h2 - 10);
      g.fillTriangle(x, base - h2, x + 12, base - h2, x + 7, base - h2 - 7);
      g.fillStyle(0x9a7a4e, 1);                    // tambor caído
      g.fillEllipse(x + 26, base - 7, 26, 14);
    };
    // Tocha acesa (a única luz da Necrópole)
    const torchProp = (g, x, base = FAR_BASE, s = 1) => {
      g.fillStyle(0x4a3520, 1);
      g.fillRect(x - 3 * s, base - 64 * s, 6 * s, 64 * s);
      g.fillStyle(0x8a6a42, 1);
      g.fillEllipse(x, base - 64 * s, 16 * s, 6 * s);
      g.fillStyle(0xff7b2a, 1);
      g.fillTriangle(x - 7 * s, base - 66 * s, x + 7 * s, base - 66 * s, x, base - 88 * s);
      g.fillStyle(0xffd24a, 1);
      g.fillTriangle(x - 4 * s, base - 66 * s, x + 4 * s, base - 66 * s, x, base - 78 * s);
      g.fillStyle(0xffd24a, 0.14);                 // halo
      g.fillCircle(x, base - 74 * s, 22 * s);
    };
    // Água do oásis: espelho turquesa com listras horizontais (sem gradiente)
    const oasisWater = (g, top, bottom) => {
      g.fillStyle(0x2e8a80, 1);
      g.fillRect(0, top, 640, bottom - top);
      for (let i = 0; i < 7; i++) {
        g.fillStyle(0x4ecdc4, 0.45 - i * 0.05);
        g.fillRect(0, top + 6 + i * 10, 640, 4);
      }
      g.fillStyle(0xdff6f2, 0.35);                 // brilhos
      [[90, 12], [280, 30], [430, 16], [560, 36]].forEach(([x, dy]) =>
        g.fillEllipse(x, top + dy, 70, 4));
    };
    // Touceira de capim seco (near)
    const dryTuft = (g, bx, base = 260) => {
      for (let i = -4; i <= 4; i++) {
        g.fillStyle(i % 2 === 0 ? 0xb9a244 : 0x8a763a, 1);
        const tall = 26 + ((i * 5) % 11);
        g.fillTriangle(bx - 4, base, bx + 4, base, bx + i * 6, base - tall);
      }
    };

    // ============ 2200–2700m: ESTRADA ENGOLIDA — o asfalto some ============
    makeFar('duna', (g) => {
      hills(g, 0xe8d3a8, SAND_D);                  // dunas ao longe
      // o asfalto da rodovia morrendo sob a areia (faixa que se desfaz)
      g.fillStyle(0x3a4149, 1);
      g.fillRect(0, 404, 640, 16);
      g.fillStyle(SAND, 1);                        // línguas de areia por cima
      [[60, 90], [230, 130], [420, 110], [580, 100]].forEach(([x, w2]) => {
        g.fillTriangle(x - 20, 420, x + w2, 420, x + w2 / 2, 396);
      });
      g.fillStyle(0xe8d98a, 0.8);                  // a faixa tracejada morrendo
      [20, 120, 320, 500].forEach((x) => g.fillRect(x, 410, 34, 4));
      carCarcass(g, 300);
      obeliskFar(g, 110, 0.7);
      // abutres circulando bem alto (cópia ±640 nas bordas)
      const vultures = [[80, 70, 1], [200, 100, 0.8], [420, 60, 1.1], [560, 96, 0.85]];
      vultures.forEach(([x, y, s]) => {
        flyBird(g, x, y, s, 0x3a2f24);
        if (x < 40) flyBird(g, x + 640, y, s, 0x3a2f24);
        if (x > 600) flyBird(g, x - 640, y, s, 0x3a2f24);
      });
      rocks(g, 470, FAR_BASE + 8);
      haze(g);
    });
    makeNear('duna', (g) => {
      g.fillStyle(SAND_D, 1);                      // o mar de areia
      g.fillRect(0, 244, 640, 16);
      g.fillStyle(SAND, 1);                        // cristas de duna
      for (let x = 0; x < 640; x += 128) g.fillEllipse(x + 64, 250, 128, 22);
      // placa de rodovia meio enterrada, torta
      g.save(); g.translateCanvas(150, 216); g.rotateCanvas(-0.16);
      g.fillStyle(0x8a939f, 1); g.fillRect(-4, 0, 8, 34);
      g.fillStyle(0x2c7a39, 1); g.fillRect(-36, -34, 72, 36);
      g.fillStyle(0xf6f4ef, 1); g.fillRect(-26, -24, 40, 6);
      g.fillRect(-26, -12, 30, 6);
      g.restore();
      // costela de asfalto quebrado espiando da areia
      g.fillStyle(0x3a4149, 1);
      g.fillTriangle(360, 250, 430, 250, 400, 232);
      g.fillTriangle(470, 252, 520, 252, 498, 238);
      dryTuft(g, 60);
      dryTuft(g, 300);
      dryTuft(g, 560);
      g.fillStyle(0xf4efe0, 1);                    // ossada ao sol
      g.fillEllipse(250, 252, 30, 6);
      g.fillCircle(268, 250, 5);
    });

    // ============ 2700–3200m: MIRAGEM DO OÁSIS — água traiçoeira ===========
    makeFar('oasis', (g) => {
      hills(g, 0xe8d3a8, SAND_D);
      oasisWater(g, 330, 420);                     // o espelho d'água
      // palmeiras na margem + REFLEXO invertido raso (a miragem)
      palm(g, 120, 0.95);
      palm(g, 480, 0.8);
      palm(g, 300, 0.6);
      g.fillStyle(0x3f8a4e, 0.25);                 // reflexos das copas
      [[120, 0.95], [480, 0.8], [300, 0.6]].forEach(([x, s]) => {
        g.fillEllipse(x, 348 + 10 * s, 90 * s, 16 * s);
      });
      g.fillStyle(0x8a5a2b, 0.3);                  // reflexos dos troncos
      [[120, 0.95], [480, 0.8]].forEach(([x, s]) => g.fillRect(x - 3 * s, 336, 6 * s, 30));
      // garças/flamingos distantes na lâmina d'água
      g.fillStyle(0xe88aa0, 0.9);
      [[210, 352], [235, 358], [420, 350]].forEach(([x, y]) => {
        g.fillEllipse(x, y, 10, 6);
        g.fillRect(x + 3, y - 10, 2, 10);
        g.fillCircle(x + 4, y - 11, 2.5);
      });
      haze(g);
    });
    makeNear('oasis', (g) => {
      g.fillStyle(SAND_D, 1);
      g.fillRect(0, 244, 640, 16);
      g.fillStyle(0x2e8a80, 1);                    // beira d'água chegando perto
      g.fillEllipse(320, 258, 300, 18);
      g.fillStyle(0x4ecdc4, 0.5);
      g.fillEllipse(310, 254, 240, 8);
      // juncos e pedras da margem
      [80, 180, 460, 600].forEach((x, i) => {
        g.lineStyle(3, 0x5c7a3a, 1);
        g.lineBetween(x, 260, x - 4, 208 - (i % 2) * 12);
        g.lineBetween(x + 6, 260, x + 12, 216);
        g.fillStyle(0x6b4a24, 1);
        g.fillRoundedRect(x - 8, 196 - (i % 2) * 12, 9, 24, 4);
      });
      rocks(g, 250, 248);
      dryTuft(g, 540);
      g.fillStyle(0xf6d6e6, 1);                    // flor da margem
      g.fillCircle(400, 240, 5);
      g.fillStyle(0xffe066, 1);
      g.fillCircle(400, 240, 2);
    });

    // ============ 3200–3700m: SÍTIO DA ESCAVAÇÃO — andaimes e poeira ========
    makeFar('escavacao', (g) => {
      hills(g, 0xd8c091, 0xbfa06a);
      // a trincheira da escavação: corte escuro no terreno
      g.fillStyle(0x8c6f40, 1);
      g.fillRect(0, 380, 640, 40);
      g.fillStyle(0x6b532f, 1);
      g.fillRect(0, 388, 640, 32);
      scaffoldFar(g, 80, 130);
      scaffoldFar(g, 470, 100);
      woodCrane(g, 300);
      crateStack(g, 180, FAR_BASE + 6);
      crateStack(g, 540, FAR_BASE + 2);
      // tenda do sítio
      g.fillStyle(0xd8c9a6, 1);
      g.fillTriangle(370, FAR_BASE, 450, FAR_BASE, 410, FAR_BASE - 52);
      g.fillStyle(0xb9a884, 1);
      g.fillTriangle(410, FAR_BASE, 450, FAR_BASE, 410, FAR_BASE - 52);
      // poeira suspensa da obra (faixas claras)
      g.fillStyle(0xe8d3a8, 0.18);
      g.fillRect(0, 300, 640, 26);
      g.fillStyle(0xe8d3a8, 0.12);
      g.fillRect(0, 326, 640, 30);
      haze(g);
    });
    makeNear('escavacao', (g) => {
      g.fillStyle(0xbfa06a, 1);                    // chão revirado do sítio
      g.fillRect(0, 244, 640, 16);
      // corda de isolamento em estacas (passo 128 divide 640 — emenda)
      g.fillStyle(0x6b4326, 1);
      for (let x = 32; x < 640; x += 128) g.fillRect(x, 190, 7, 66);
      g.lineStyle(3, 0xd8c9a6, 1);
      for (let x = -96; x < 640; x += 128) {
        g.lineBetween(x + 36, 198, x + 100, 212);
        g.lineBetween(x + 100, 212, x + 164, 198);
      }
      crateStack(g, 90, 256);
      // pá e picareta fincadas no monte
      g.fillStyle(SAND_DD, 1);
      g.fillTriangle(300, 260, 400, 260, 350, 224);
      g.fillStyle(0x8a5a33, 1);
      g.fillRect(330, 186, 5, 48);                 // cabo da pá
      g.fillStyle(0x8a939f, 1);
      g.fillTriangle(324, 182, 341, 182, 332.5, 196);
      g.fillStyle(0x8a5a33, 1);
      g.fillRect(366, 190, 5, 44);                 // cabo da picareta
      g.fillStyle(0x59616b, 1);
      g.fillEllipse(368, 188, 34, 8);
      // ânfora desenterrada ao lado da trincheira
      g.fillStyle(0xb4552f, 1);
      g.fillEllipse(520, 232, 26, 34);
      g.fillRect(512, 210, 16, 10);
      g.fillStyle(0x8a3f24, 1);
      g.fillEllipse(520, 236, 18, 16);
      dryTuft(g, 600);
    });

    // ============ 3700–4200m: VALE DOS FARAÓS — as pirâmides ===============
    makeFar('vale', (g) => {
      // as PIRÂMIDES dominam o horizonte (a maior no meio, emenda limpa)
      hills(g, 0xe8d3a8, SAND_D);
      pyramid(g, 320, 1.15);
      pyramid(g, 110, 0.72);
      pyramid(g, 540, 0.6);
      sphinxSil(g, 460, 1);
      obeliskFar(g, 216, 0.9);
      obeliskFar(g, 596, 0.7);
      // o sol do deserto pesa: faixa de calor tremido
      g.fillStyle(0xfff3c4, 0.1);
      g.fillRect(0, 250, 640, 22);
      haze(g);
    });
    makeNear('vale', (g) => {
      g.fillStyle(SAND_D, 1);
      g.fillRect(0, 244, 640, 16);
      brokenColumn(g, 90, 90, 258);
      brokenColumn(g, 420, 60, 256);
      // bloco caído com cartucho esculpido
      g.fillStyle(0xb59a6b, 1);
      g.fillRect(220, 210, 84, 46);
      g.fillStyle(0x9a7a4e, 1);
      g.fillRect(220, 210, 84, 6);
      g.lineStyle(3, 0x7a5f34, 1);
      g.strokeEllipse(262, 234, 40, 26);
      g.fillStyle(0x7a5f34, 1);
      g.fillCircle(254, 230, 3);
      g.fillRect(262, 236, 14, 3);
      // cabeça de estátua semienterrada olhando o vale
      g.fillStyle(0xb59a6b, 1);
      g.fillRect(520, 214, 40, 42);
      g.fillTriangle(512, 222, 520, 214, 520, 248);
      g.fillStyle(0x7a5f34, 1);
      g.fillRect(528, 230, 22, 5);                 // a sombra dos olhos
      g.fillStyle(SAND, 1);
      g.fillTriangle(500, 260, 580, 260, 545, 244);
      dryTuft(g, 350);
      dryTuft(g, 620);
    });

    // ============ 4200–4700m: NECRÓPOLE DE AREIA — a escuridão =============
    makeFar('necropole', (g) => {
      // o vale afunda: massas escuras de rocha tumular
      hills(g, 0x8a7350, 0x6b5940);
      g.fillStyle(0x4a3d2c, 1);                    // paredão de tumbas
      g.fillRect(0, 300, 640, 120);
      // portais de tumba escavados (vãos pretos com verga de pedra)
      [[70, 1], [210, 0.8], [360, 1.1], [520, 0.85]].forEach(([x, s]) => {
        g.fillStyle(0x9a7a4e, 1);
        g.fillRect(x - 24 * s, 330, 48 * s, 8);
        g.fillStyle(0x17130c, 1);
        g.fillRect(x - 17 * s, 338, 34 * s, 62 * s);
        g.fillStyle(0x2a2118, 1);
        g.fillRect(x - 17 * s, 338, 6 * s, 62 * s);
      });
      brokenColumn(g, 150, 110, FAR_BASE - 6);
      brokenColumn(g, 450, 84, FAR_BASE - 10);
      torchProp(g, 260, FAR_BASE + 30, 1.1);
      torchProp(g, 580, FAR_BASE + 26, 0.9);
      // a escuridão desce (faixas, nunca gradiente)
      for (let i = 0; i < 10; i++) {
        g.fillStyle(0x14100a, 0.05 + i * 0.028);
        g.fillRect(0, i * 7, 640, 8);
      }
      g.fillStyle(0x14100a, 0.22);
      g.fillRect(0, 70, 640, 40);
    });
    makeNear('necropole', (g) => {
      g.fillStyle(0x8a7350, 1);                    // areia suja de cinza
      g.fillRect(0, 244, 640, 16);
      // sarcófago aberto encostado na parede
      g.save(); g.translateCanvas(120, 250); g.rotateCanvas(-0.08);
      g.fillStyle(0xb59a6b, 1);
      g.fillRoundedRect(-26, -104, 52, 104, 12);
      g.fillStyle(0x7a5f34, 1);
      g.fillRoundedRect(-18, -96, 36, 88, 9);
      g.fillStyle(0x17130c, 1);
      g.fillRoundedRect(-14, -92, 28, 80, 7);
      g.restore();
      // urnas canópicas enfileiradas
      [[300, 1], [336, 0.85], [368, 0.95]].forEach(([x, s]) => {
        g.fillStyle(0x9a7a4e, 1);
        g.fillEllipse(x, 240, 24 * s, 30 * s);
        g.fillStyle(0xb59a6b, 1);
        g.fillCircle(x, 222 - 4 * s, 9 * s);       // tampa-cabeça
      });
      torchProp(g, 240, 258, 1.15);
      torchProp(g, 500, 258, 1.05);
      // ossadas na areia
      g.fillStyle(0xe8ddc2, 1);
      g.fillEllipse(430, 252, 34, 6);
      g.fillCircle(450, 249, 5);
      g.fillRect(555, 244, 26, 4);
      g.fillCircle(556, 246, 4);
      g.fillCircle(581, 246, 4);
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

  // v1.8.10 — primeiro plano do DESERTO: mesma faixa visível (linhas 0..60),
  // arbustos SECOS e pedras no lugar do capim verde. Silhueta escura (a
  // camada leva o tint atmosférico), emenda ±640 nas touceiras de borda.
  static generateForegroundDesert(scene) {
    const w = 640, h = 120, VIS = 60;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const DARK = 0x6b5533, DARKER = 0x4a3a20, STONE = 0x7a6a4a;

    // areia da beirada, da linha 34 para baixo
    g.fillStyle(DARKER, 1);
    g.fillRect(0, 34, w, h - 34);

    let seed = 19;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    g.fillStyle(STONE, 1);
    for (let i = 0; i < 10; i++) {
      g.fillEllipse(rnd() * w, 40 + rnd() * (VIS - 40), 26 + rnd() * 40, 10 + rnd() * 9);
    }

    // Arbustos secos: galhos em leque a partir da linha 36 (cópia ±640)
    const bush = (bx) => {
      for (let i = -4; i <= 4; i++) {
        g.fillStyle(i % 2 === 0 ? DARK : DARKER, 1);
        const tall = 16 + ((i * 9) % 11) + (i === 0 ? 8 : 0);
        // galho torto: duas hastes finas por direção
        g.fillTriangle(bx - 3, 38, bx + 3, 38, bx + i * 6, 38 - tall);
        g.fillTriangle(bx + i * 6 - 2, 38 - tall + 4, bx + i * 6 + 2, 38 - tall + 4,
          bx + i * 6 + i, 38 - tall - 5);
      }
    };
    for (let x = 20; x < w; x += 74) {
      bush(x);
      if (x < 60) bush(x + w);
      if (x > w - 60) bush(x - w);
    }
    g.fillStyle(DARK, 1);
    g.fillRect(0, 34, w, 8);

    g.generateTexture('bg-fg-desert', w, h);
    g.destroy();
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

  // ------------------------------------------------- portais dos distritos
  // v1.8.7: os três marcos físicos do Estado de Alerta — no espírito do
  // biome-arch (um objeto que ATRAVESSA a tela, origin (0.5,1) no chão),
  // mas cada um é ÚNICO: viaduto de concreto, checkpoint de viaturas
  // empilhadas e o pórtico "KM 0" da rodovia. Sem física — só cenário.
  static generatePortals(scene) {
    this.generatePortalViaduto(scene);
    this.generatePortalCheckpoint(scene);
    this.generatePortalRodovia(scene);
  }

  // 1400m — VIADUTO DO CENTRO: dois pilares de concreto + tabuleiro com
  // guarda-corpo e um semáforo pendurado (fechado: a cidade mandou parar).
  static generatePortalViaduto(scene) {
    const w = 420, h = 320;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const conc = 0x6d7683, concDark = 0x5a626d, concLight = 0x8a939f;

    // pilares
    for (const px of [36, w - 96]) {
      g.fillStyle(conc, 1);
      g.fillRect(px, 78, 60, h - 78);
      g.fillStyle(concDark, 1);
      g.fillRect(px + 46, 78, 14, h - 78);          // lado em sombra
      g.fillStyle(concDark, 0.8);                   // juntas de fôrma
      for (let y = 108; y < h; y += 44) g.fillRect(px, y, 60, 3);
      g.fillStyle(concLight, 1);                    // sapata
      g.fillRect(px - 8, h - 14, 76, 14);
    }

    // tabuleiro do viaduto
    g.fillStyle(concDark, 1);
    g.fillRect(0, 54, w, 34);
    g.fillStyle(conc, 1);
    g.fillRect(0, 54, w, 10);
    g.fillStyle(0x2f353c, 1);                       // sombra sob a laje
    g.fillRect(0, 84, w, 6);
    // guarda-corpo
    g.fillStyle(concLight, 1);
    g.fillRect(0, 30, w, 8);
    for (let x = 12; x < w; x += 42) g.fillRect(x, 38, 6, 16);
    // pichação no pilar esquerdo (a cidade de verdade)
    g.fillStyle(0x4ecdc4, 0.85);
    g.fillRect(46, 210, 34, 8);
    g.fillTriangle(46, 204, 46, 226, 38, 215);
    g.fillStyle(0xf25f5c, 0.85);
    g.fillRect(58, 236, 26, 7);

    // SEMÁFORO pendurado no meio do vão, no VERMELHO (fecha na passagem)
    g.fillStyle(0x1f2531, 1);
    g.fillRect(206, 88, 6, 26);                     // haste
    g.fillRect(196, 112, 26, 62);                   // caixa
    g.fillStyle(0x14181d, 1);
    g.fillRect(199, 116, 20, 54);
    g.fillStyle(0xff4a5e, 1);                       // vermelho ACESO
    g.fillCircle(209, 126, 7);
    g.fillStyle(0xff4a5e, 0.25);                    // halo
    g.fillCircle(209, 126, 12);
    g.fillStyle(0x5a4a20, 1);                       // âmbar apagado
    g.fillCircle(209, 143, 7);
    g.fillStyle(0x1f3a28, 1);                       // verde apagado
    g.fillCircle(209, 160, 7);

    g.generateTexture('portal-viaduto', w, h);
    g.destroy();
  }

  // 1800m — CHECKPOINT DA CONTENÇÃO: pilha de 2 viaturas de um lado,
  // bloco de concreto do outro, e o X de holofotes cruzados por cima.
  static generatePortalCheckpoint(scene) {
    const w = 420, h = 300;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const car = 0x2e4a6b, carDark = 0x223a55;

    // X de HOLOFOTES cruzados (alpha baixo — atmosfera, nunca gameplay)
    g.fillStyle(0xcfe3ff, 0.1);
    g.fillTriangle(58, 156, 96, 172, 400, 0);
    g.fillTriangle(340, 150, 372, 168, 20, 0);
    g.fillStyle(0xcfe3ff, 0.07);
    g.fillTriangle(50, 160, 104, 178, 420, 20);
    g.fillTriangle(330, 154, 380, 174, 0, 24);

    // uma VIATURA (desenho local, reusado nas duas da pilha)
    const viatura = (x, y, tilt) => {
      g.save();
      g.translateCanvas(x, y);
      g.rotateCanvas(tilt);
      g.fillStyle(car, 1);
      g.fillRoundedRect(0, 22, 150, 40, 8);         // carroceria
      g.fillRoundedRect(28, 0, 84, 30, 8);          // cabine
      g.fillStyle(0x9ad7ef, 0.9);                   // vidros
      g.fillRect(36, 6, 30, 18);
      g.fillRect(72, 6, 30, 18);
      g.fillStyle(0xf6f4ef, 1);                     // faixa "POLÍCIA"
      g.fillRect(6, 34, 138, 12);
      g.fillStyle(carDark, 1);
      for (let i = 0; i < 5; i++) g.fillRect(14 + i * 27, 37, 16, 6);
      g.fillStyle(0x1f2531, 1);                     // rodas
      g.fillCircle(34, 62, 13);
      g.fillCircle(116, 62, 13);
      g.fillStyle(0x59616b, 1);
      g.fillCircle(34, 62, 5);
      g.fillCircle(116, 62, 5);
      g.fillStyle(0xff4a5e, 1);                     // giroflex
      g.fillRect(56, -8, 16, 9);
      g.fillStyle(0x4ad1ff, 1);
      g.fillRect(74, -8, 16, 9);
      g.restore();
    };
    // pilha: a de baixo firme, a de cima atravessada
    viatura(20, 216, 0);
    viatura(30, 140, -0.08);
    // halo do strobe da viatura de cima
    g.fillStyle(0xff4a5e, 0.18);
    g.fillCircle(92, 128, 22);
    g.fillStyle(0x4ad1ff, 0.18);
    g.fillCircle(116, 126, 22);

    // bloco de concreto + placa PARE do lado direito
    g.fillStyle(0x6e7681, 1);
    g.fillRect(320, 200, 80, 100);
    g.fillStyle(0x59616b, 1);
    g.fillRect(320, 200, 80, 8);
    g.fillRect(386, 200, 14, 100);
    g.fillStyle(0xffd24a, 1);                       // tarja
    g.fillRect(316, 246, 88, 16);
    g.fillStyle(0x1f2531, 1);
    for (let i = 0; i < 5; i++) g.fillTriangle(320 + i * 17, 262, 328 + i * 17, 262, 337 + i * 17, 246);
    g.fillStyle(0x8a939f, 1);                       // poste da placa
    g.fillRect(352, 130, 8, 70);
    g.fillStyle(0xd6453c, 1);                       // octógono PARE
    g.fillPoints([
      { x: 336, y: 102 }, { x: 348, y: 90 }, { x: 364, y: 90 }, { x: 376, y: 102 },
      { x: 376, y: 118 }, { x: 364, y: 130 }, { x: 348, y: 130 }, { x: 336, y: 118 },
    ], true);
    g.fillStyle(0xf6f4ef, 1);                       // "texto" em barra
    g.fillRect(342, 106, 28, 8);

    g.generateTexture('portal-checkpoint', w, h);
    g.destroy();
  }

  // 2200m — PÓRTICO DA RODOVIA "KM 0": gantry de treliça com a placa verde
  // de estrada. É a fronteira conceitual do deserto — a saída triunfal.
  static generatePortalRodovia(scene) {
    const w = 460, h = 320;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const steel = 0x8a939f, steelDark = 0x59616b;

    // postes de treliça
    for (const px of [22, w - 60]) {
      g.fillStyle(steelDark, 1);
      g.fillRect(px, 26, 10, h - 26);
      g.fillRect(px + 28, 26, 10, h - 26);
      g.fillStyle(steel, 0.9);                      // travessas em X
      for (let y = 40; y < h - 24; y += 34) {
        g.fillTriangle(px + 10, y, px + 14, y, px + 28, y + 30);
        g.fillTriangle(px + 24, y, px + 28, y, px + 10, y + 30);
      }
      g.fillStyle(steelDark, 1);                    // sapata
      g.fillRect(px - 8, h - 12, 54, 12);
    }

    // travessa de treliça
    g.fillStyle(steelDark, 1);
    g.fillRect(0, 26, w, 10);
    g.fillRect(0, 62, w, 10);
    g.fillStyle(steel, 0.9);
    for (let x = 8; x < w - 10; x += 30) {
      g.fillTriangle(x, 36, x + 4, 36, x + 26, 62);
      g.fillTriangle(x + 22, 36, x + 26, 36, x, 62);
    }

    // placa verde de rodovia com "KM 0" em barras (sem fonte: geometria)
    g.fillStyle(0xf6f4ef, 1);
    g.fillRect(136, 46, 188, 92);                   // borda branca
    g.fillStyle(0x2c7a39, 1);
    g.fillRect(142, 52, 176, 80);
    g.fillStyle(0xf6f4ef, 1);
    // K
    g.fillRect(160, 68, 10, 48);
    g.fillTriangle(172, 68, 186, 68, 172, 92);
    g.fillTriangle(172, 92, 186, 116, 172, 116);
    // M
    g.fillRect(196, 68, 9, 48);
    g.fillRect(221, 68, 9, 48);
    g.fillTriangle(205, 68, 213, 92, 205, 92);
    g.fillTriangle(221, 68, 213, 92, 221, 92);
    // 0
    g.fillRect(248, 68, 34, 48);
    g.fillStyle(0x2c7a39, 1);
    g.fillRect(258, 78, 14, 28);
    // seta branca apontando adiante (a liberdade fica sempre à direita)
    g.fillStyle(0xf6f4ef, 1);
    g.fillRect(292, 86, 14, 8);
    g.fillTriangle(306, 78, 306, 102, 318, 90);

    g.generateTexture('portal-rodovia', w, h);
    g.destroy();
  }

  // v1.8.10 — OBELISCO de fronteira das etapas do deserto (marco SEM fx nas
  // fronteiras 108000/128000/148000/168000 — os bosses são os marcos das
  // outras). Origin (0.5,1) no chão, como os portais; o label da etapa é um
  // Text por cima (createSectorArches). Fuste com cartucho esculpido e
  // piramidion dourado — o deserto conta as etapas em pedra.
  static generateMarcoObelisco(scene) {
    const w = 160, h = 300;
    const P = this.FACADES['-piramide'];
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const cx = w / 2;

    // base em dois degraus, com areia acumulada
    g.fillStyle(P.pillar, 1);
    g.fillRect(cx - 52, h - 18, 104, 18);
    g.fillRect(cx - 40, h - 34, 80, 18);
    g.fillStyle(P.slab, 1);
    g.fillRect(cx - 52, h - 18, 104, 4);
    g.fillRect(cx - 40, h - 34, 80, 4);
    g.fillStyle(0xe0c492, 1);
    g.fillTriangle(cx - 70, h, cx - 26, h, cx - 52, h - 14);
    g.fillTriangle(cx + 30, h, cx + 74, h, cx + 54, h - 10);

    // fuste afilado: face iluminada + face em sombra
    g.fillStyle(P.body, 1);
    g.fillTriangle(cx - 26, h - 34, cx + 26, h - 34, cx + 12, 34);
    g.fillTriangle(cx - 26, h - 34, cx + 12, 34, cx - 12, 34);
    g.fillStyle(P.slabShade, 0.5);
    g.fillTriangle(cx + 12, h - 34, cx + 26, h - 34, cx + 12, 38);
    // juntas do aparelho
    g.fillStyle(P.slabShade, 0.55);
    for (let y = 60; y < h - 40; y += 34) {
      const t = (y - 34) / (h - 68);
      const half = 12 + 14 * t;
      g.fillRect(cx - half + 3, y, half * 2 - 6, 2.5);
    }

    // piramidion dourado apontando o caminho
    g.fillStyle(P.gold, 1);
    g.fillTriangle(cx - 14, 38, cx + 14, 38, cx, 6);
    g.fillStyle(0xfff3c4, 0.8);
    g.fillTriangle(cx - 7, 38, cx, 38, cx, 14);

    // cartucho esculpido no fuste (o "nome" da etapa em pedra)
    g.lineStyle(4, P.gold, 1);
    g.strokeEllipse(cx, 150, 34, 92);
    g.fillStyle(P.gold, 1);
    g.fillRect(cx - 8, 198, 16, 5);
    g.fillStyle(P.glyph, 0.95);
    g.fillCircle(cx, 118, 4.5);                    // sol
    g.fillEllipse(cx, 140, 16, 6);                 // boca
    g.fillRect(cx - 8, 156, 16, 3);                // céu
    g.fillTriangle(cx - 7, 184, cx + 7, 184, cx, 168); // duna
    g.fillStyle(P.lapis, 0.9);
    g.fillRect(cx - 9, 190, 18, 4);

    // sombra na base (assenta o marco no chão)
    g.fillStyle(0x000000, 0.14);
    g.fillEllipse(cx, h - 4, 120, 10);

    g.generateTexture('marco-obelisco', w, h);
    g.destroy();
  }

  // -------------------------------------------------- hazards dos distritos
  // v1.8.7: as texturas do TimedHazard (a entidade é do BossFight/agente B).
  // Caçamba 100x64 (smashável — par -rubble no MESMO canvas, regra da casa);
  // hidrante 48x220 (coluna d'água só no -on); arco voltaico 220x260 (o arco
  // elétrico só no -on). Origin (0.5,1) no chão — o topo dos canvases altos
  // fica transparente até o pulso acender.
  static generateHazards(scene) {
    this.generateHazardCacamba(scene);
    this.generateHazardHidrante(scene);
    this.generateHazardArco(scene);
    // v1.8.10 — as armadilhas do deserto (kinds do TimedHazard, agente B)
    this.generateHazardMovedica(scene);
    this.generateHazardFlecheira(scene);
    this.generateHazardCaixote(scene);
  }

  static generateHazardCacamba(scene) {
    const w = 100, h = 64;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const body = 0x3f6b4f, bodyDark = 0x2f5039, rust = 0x8a5a2e;

    // entulho espiando por cima da borda
    g.fillStyle(0x6e7681, 1);
    g.fillTriangle(18, 14, 46, 14, 32, 2);
    g.fillTriangle(50, 14, 84, 14, 68, 4);
    g.fillStyle(0x8a6a3c, 1);
    g.fillRect(38, 4, 22, 10);

    // caçamba trapezoidal
    g.fillStyle(body, 1);
    g.fillPoints([
      { x: 4, y: 12 }, { x: 96, y: 12 }, { x: 88, y: 58 }, { x: 12, y: 58 },
    ], true);
    g.fillStyle(bodyDark, 1);
    g.fillRect(4, 12, 92, 7);                       // borda superior
    g.fillPoints([                                   // lado em sombra
      { x: 78, y: 19 }, { x: 96, y: 12 }, { x: 88, y: 58 }, { x: 74, y: 58 },
    ], true);
    // nervuras verticais
    g.fillStyle(bodyDark, 0.8);
    for (const x of [24, 44, 64]) g.fillRect(x, 20, 5, 38);
    // ferrugem e tarja de perigo
    g.fillStyle(rust, 0.8);
    g.fillCircle(18, 50, 5);
    g.fillCircle(70, 24, 4);
    g.fillStyle(0xffd24a, 1);
    g.fillRect(10, 30, 80, 10);
    g.fillStyle(0x1f2531, 1);
    for (let i = 0; i < 5; i++) g.fillTriangle(12 + i * 16, 40, 20 + i * 16, 40, 28 + i * 16, 30);
    g.fillStyle(0xffd24a, 1);
    g.fillRect(86, 30, 4, 10);
    // pés/rodinhas
    g.fillStyle(0x1f2531, 1);
    g.fillRect(14, 58, 14, 6);
    g.fillRect(72, 58, 14, 6);

    g.generateTexture('hazard-cacamba', w, h);
    g.destroy();

    // -rubble: MESMO canvas (origin (0,?) do TimedHazard não pode saltar) —
    // painéis tombados + monte de entulho derramado
    const r = scene.make.graphics({ x: 0, y: 0, add: false });
    r.fillStyle(0x6e7681, 1);
    r.fillTriangle(2, 64, 52, 64, 28, 40);
    r.fillTriangle(44, 64, 98, 64, 72, 44);
    r.fillStyle(0x8a6a3c, 1);
    r.fillTriangle(30, 64, 70, 64, 50, 48);
    r.save(); r.translateCanvas(10, 50); r.rotateCanvas(0.35);
    r.fillStyle(body, 1); r.fillRect(0, 0, 42, 12);
    r.fillStyle(0xffd24a, 1); r.fillRect(4, 3, 34, 5);
    r.restore();
    r.save(); r.translateCanvas(58, 56); r.rotateCanvas(-0.28);
    r.fillStyle(bodyDark, 1); r.fillRect(0, 0, 38, 10);
    r.restore();
    r.fillStyle(rust, 1);
    [[24, 58, 7], [48, 60, 6], [80, 58, 8]].forEach(([x, y, s]) => r.fillRect(x, y, s, s * 0.7));
    r.generateTexture('hazard-cacamba-rubble', w, h);
    r.destroy();
  }

  static generateHazardHidrante(scene) {
    const w = 48, h = 220;
    // OFF: hidrante rompido borbulhando na base (o telegraph é do B — aqui
    // só o respingo constante que diz "isto está vivo")
    const draw = (on) => {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });

      if (on) {
        // coluna d'água até o topo do canvas: núcleo claro + espuma
        g.fillStyle(0x9ad7ef, 0.75);
        g.fillRect(14, 0, 20, 176);
        g.fillStyle(0xdff1fb, 0.95);
        g.fillRect(19, 0, 10, 176);
        g.fillStyle(0xffffff, 0.85);                // gomos de espuma
        for (let y = 8; y < 170; y += 26) {
          g.fillCircle(16, y, 5);
          g.fillCircle(32, y + 13, 5);
        }
        g.fillCircle(24, 4, 10);                     // coroa no topo
        g.fillCircle(12, 10, 6);
        g.fillCircle(36, 10, 6);
      }

      // poça e respingos na base
      g.fillStyle(0x9ad7ef, on ? 0.7 : 0.5);
      g.fillEllipse(24, 216, on ? 46 : 30, 8);
      g.fillStyle(0xdff1fb, 0.9);
      g.fillCircle(10, on ? 196 : 206, on ? 4 : 2.5);
      g.fillCircle(38, on ? 200 : 208, on ? 3.5 : 2);

      // o hidrante: corpo vermelho, tampas amarelas, flange
      g.fillStyle(0xb03a2e, 1);
      g.fillRect(16, 214, 16, 6);                   // flange no chão
      g.fillRoundedRect(14, 178, 20, 38, 6);        // corpo
      g.fillStyle(0xd6453c, 1);
      g.fillRect(16, 182, 6, 30);                   // luz do lado esquerdo
      g.fillStyle(0xffd24a, 1);
      g.fillCircle(24, 176, 9);                     // cúpula (rompida)
      g.fillStyle(0xb03a2e, 1);
      g.fillRect(6, 190, 8, 9);                     // bocais laterais
      g.fillRect(34, 190, 8, 9);
      g.fillStyle(0xffd24a, 1);
      g.fillCircle(9, 194.5, 4);
      g.fillCircle(39, 194.5, 4);
      g.fillStyle(0x8a2a22, 1);                     // parafusos
      g.fillCircle(20, 208, 1.8);
      g.fillCircle(28, 208, 1.8);

      g.generateTexture(on ? 'hazard-hidrante-on' : 'hazard-hidrante', w, h);
      g.destroy();
    };
    draw(false);
    draw(true);
  }

  static generateHazardArco(scene) {
    const w = 220, h = 260;
    // Dois postes de aço com isoladores; o arco elétrico na faixa AÉREA só
    // existe no -on (o chão fica LIVRE — armadilha anti-pulo do D3)
    const draw = (on) => {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      const steel = 0x59616b, steelDark = 0x3d444c;

      for (const px of [40, 180]) {
        g.fillStyle(steelDark, 1);                  // sapata
        g.fillRect(px - 16, 250, 32, 10);
        g.fillStyle(steel, 1);                      // poste
        g.fillRect(px - 5, 40, 10, 210);
        g.fillStyle(steelDark, 1);
        g.fillRect(px + 1, 40, 4, 210);             // lado em sombra
        g.fillStyle(0xffd24a, 1);                   // tarja no poste
        g.fillRect(px - 6, 200, 12, 22);
        g.fillStyle(0x1f2531, 1);
        g.fillRect(px - 6, 207, 12, 4);
        g.fillRect(px - 6, 216, 12, 4);
        // isolador apontando para DENTRO do vão
        const dir = px < w / 2 ? 1 : -1;
        g.fillStyle(steelDark, 1);
        g.fillRect(px + (dir > 0 ? 4 : -18), 44, 14, 8);
        g.fillStyle(0x8a6a3c, 1);                   // cerâmica
        g.fillCircle(px + dir * 20, 48, 6);
        g.fillStyle(0xffd24a, 1);                   // placa de raio
        g.fillRect(px - 8, 120, 16, 18);
        g.fillStyle(0x1f2531, 1);
        g.fillTriangle(px - 2, 123, px + 4, 123, px - 1, 130);
        g.fillTriangle(px + 1, 128, px - 4, 135, px + 3, 135);
      }

      if (on) {
        // O ARCO: zigue-zague grosso de glow + núcleo fino brilhante
        const jag = (yBase, amp, seed) => {
          const pts = [];
          for (let i = 0; i <= 10; i++) {
            const x = 60 + i * 10;
            const dy = (((i * 7 + seed) % 5) - 2) * amp;
            pts.push({ x, y: yBase + dy });
          }
          return pts;
        };
        g.lineStyle(9, 0x4ad1ff, 0.28);
        g.strokePoints(jag(48, 4, 1), false);
        g.lineStyle(4, 0x4ad1ff, 0.8);
        g.strokePoints(jag(48, 4, 3), false);
        g.lineStyle(2, 0xdff6ff, 1);
        g.strokePoints(jag(48, 3, 5), false);
        // faíscas nos isoladores
        g.fillStyle(0xdff6ff, 1);
        g.fillCircle(60, 48, 5);
        g.fillCircle(160, 48, 5);
        g.fillStyle(0x4ad1ff, 0.35);
        g.fillCircle(60, 48, 11);
        g.fillCircle(160, 48, 11);
      } else {
        // desligado: um estalo residual nos isoladores (leitura de perigo)
        g.fillStyle(0x4ad1ff, 0.5);
        g.fillCircle(60, 48, 3);
        g.fillCircle(160, 48, 3);
      }

      g.generateTexture(on ? 'hazard-arco-on' : 'hazard-arco', w, h);
      g.destroy();
    };
    draw(false);
    draw(true);
  }

  // v1.8.10 — AREIA MOVEDIÇA (120x40, rente ao chão): poço de areia
  // ondulada em anéis, com o centro afundando — sempre letal, pulável, nem
  // o dash salva (causa 'fall': a areia ENGOLE). Leitura por CONTRASTE de
  // material: mais escura e lisa que a crosta do ground-desert.
  static generateHazardMovedica(scene) {
    const w = 120, h = 40;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    // o poço: anéis concêntricos afundando para o centro
    g.fillStyle(0x8c6f40, 1);
    g.fillEllipse(60, 24, 118, 30);
    g.fillStyle(0x7a5f34, 1);
    g.fillEllipse(60, 25, 96, 24);
    g.fillStyle(0x6b532f, 1);
    g.fillEllipse(60, 26, 72, 18);
    g.fillStyle(0x5a4426, 1);                     // o olho do sorvedouro
    g.fillEllipse(60, 27, 44, 11);
    // linhas de sucção em espiral (arcos)
    g.lineStyle(2, 0x9a7a4e, 0.8);
    g.beginPath(); g.arc(60, 25, 34, 0.3, Math.PI - 0.4); g.strokePath();
    g.beginPath(); g.arc(60, 24, 46, Math.PI + 0.3, Math.PI * 2 - 0.3); g.strokePath();
    g.lineStyle(2, 0x59431f, 0.9);
    g.beginPath(); g.arc(60, 26, 20, 0.2, Math.PI - 0.2); g.strokePath();
    // bolhas de ar escapando (a única coisa que sobe)
    g.fillStyle(0xc2a36b, 0.9);
    g.fillCircle(48, 22, 2.5);
    g.fillCircle(76, 26, 2);
    g.fillCircle(62, 19, 1.6);
    // borda clara na crista (emenda com a crosta do chão)
    g.lineStyle(2.5, 0xe0c492, 0.9);
    g.strokeEllipse(60, 23, 116, 26);
    // um chifre de gazela espetado — o aviso de quem não pulou
    g.lineStyle(3, 0xe8ddc2, 1);
    g.lineBetween(88, 20, 96, 6);
    g.lineBetween(96, 6, 100, 2);

    g.generateTexture('hazard-movedica', w, h);
    g.destroy();
  }

  // v1.8.10 — FLECHEIRA (200x230, origin 0.5,1 no chão): duas colunas de
  // arenito com RANHURAS na altura do corpo do TimedHazard (mundo y
  // 430..520 = canvas y 40..130). No -on as flechas CRUZAM o vão. O
  // telegraph (tint dourado subindo) é do B — aqui, o glifo aceso no -on.
  static generateHazardFlecheira(scene) {
    const w = 200, h = 230;
    const P = this.FACADES['-piramide'];
    const BAND0 = 40, BAND1 = 130; // a banda letal, em y de canvas
    const draw = (on) => {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });

      for (const [x0, flip] of [[10, 1], [162, -1]]) {
        // sapata + coluna de blocos
        g.fillStyle(P.pillar, 1);
        g.fillRect(x0 - 4, h - 10, 36, 10);
        g.fillStyle(P.body, 1);
        g.fillRect(x0, 16, 28, h - 26);
        g.fillStyle(P.slabShade, 0.55);           // juntas
        for (let y = 34; y < h - 12; y += 26) g.fillRect(x0, y, 28, 2.5);
        g.fillStyle(P.slabShade, 0.5);            // lado em sombra
        g.fillRect(flip > 0 ? x0 + 22 : x0, 16, 6, h - 26);
        // capitel
        g.fillStyle(P.pillar, 1);
        g.fillRect(x0 - 4, 8, 36, 12);
        g.fillStyle(P.gold, 1);
        g.fillRect(x0 - 4, 4, 36, 5);
        // RANHURAS de disparo na banda letal (voltadas para o vão)
        g.fillStyle(0x23180c, 1);
        for (let sy = BAND0 + 6; sy < BAND1; sy += 28) {
          g.fillRect(flip > 0 ? x0 + 16 : x0 + 2, sy, 10, 14);
        }
        // o GLIFO-gatilho (olho): apagado no off, ACESO no on
        g.fillStyle(on ? 0xffd24a : P.glyph, 1);
        g.fillEllipse(x0 + 14, 158, 16, 8);
        g.fillStyle(on ? 0xfff3c4 : P.body, 1);
        g.fillEllipse(x0 + 14, 158, 8, 4);
        g.fillStyle(0x23180c, 1);
        g.fillCircle(x0 + 14, 158, 1.8);
        if (on) {
          g.fillStyle(0xffd24a, 0.2);             // halo do glifo aceso
          g.fillCircle(x0 + 14, 158, 14);
        }
      }

      if (on) {
        // AS FLECHAS cruzando o vão (3 alturas, sentidos alternados) +
        // riscos de velocidade — a banda letal visível de relance
        const arrow = (ax, ay, dir) => {
          g.lineStyle(2, 0xc2a36b, 0.5);          // risco de velocidade
          g.lineBetween(ax - 34 * dir, ay, ax + 18 * dir, ay);
          g.fillStyle(0x8a5a33, 1);               // haste
          g.fillRect(Math.min(ax, ax + 20 * dir), ay - 1.5, 20, 3);
          g.fillStyle(0x8a939f, 1);               // ponta
          g.fillTriangle(ax + 24 * dir, ay, ax + 16 * dir, ay - 4, ax + 16 * dir, ay + 4);
          g.fillStyle(0xd6453c, 1);               // penas
          g.fillTriangle(ax - 2 * dir, ay, ax - 8 * dir, ay - 4, ax - 8 * dir, ay + 4);
        };
        arrow(70, BAND0 + 14, 1);
        arrow(130, BAND0 + 44, -1);
        arrow(84, BAND0 + 74, 1);
        g.fillStyle(0xffd24a, 0.1);               // véu da banda inteira
        g.fillRect(38, BAND0, 124, BAND1 - BAND0);
      }

      g.generateTexture(on ? 'hazard-flecheira-on' : 'hazard-flecheira', w, h);
      g.destroy();
    };
    draw(false);
    draw(true);
  }

  // v1.8.10 — CAIXOTE do sítio (90x70): irmão menor da caçamba — pulável OU
  // destrutível no dash (smashable → par -rubble no MESMO canvas). Madeira
  // de escavação, estêncil de olho e corda de amarração.
  static generateHazardCaixote(scene) {
    const w = 90, h = 70;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const wood = 0x8a5a33, woodDark = 0x6b4326, woodLight = 0xa8794a;

    // palha e um artefato espiando pela tampa entreaberta
    g.fillStyle(0xc9b25e, 1);
    g.fillTriangle(20, 12, 46, 12, 33, 2);
    g.fillTriangle(42, 12, 70, 12, 56, 4);
    g.fillStyle(0xd4af37, 1);                     // ponta de ouro lá dentro
    g.fillCircle(50, 8, 5);

    // o caixote: tábuas horizontais + moldura
    g.fillStyle(wood, 1);
    g.fillRect(4, 12, 82, 52);
    g.fillStyle(woodDark, 0.9);                   // frestas das tábuas
    for (let y = 24; y < 64; y += 13) g.fillRect(4, y, 82, 3);
    g.fillStyle(woodLight, 0.7);                  // luz no topo das tábuas
    for (let y = 14; y < 62; y += 13) g.fillRect(6, y, 78, 3);
    g.fillStyle(woodDark, 1);                     // moldura
    g.fillRect(4, 12, 82, 6);
    g.fillRect(4, 58, 82, 6);
    g.fillRect(4, 12, 7, 52);
    g.fillRect(79, 12, 7, 52);
    // corda de amarração em X
    g.lineStyle(4, 0xc2a36b, 0.9);
    g.lineBetween(11, 16, 79, 60);
    g.lineBetween(11, 60, 79, 16);
    // estêncil do sítio: olho de Hórus pintado
    g.fillStyle(0x1e4b8f, 0.85);
    g.fillEllipse(45, 38, 22, 10);
    g.fillStyle(wood, 1);
    g.fillEllipse(45, 38, 11, 5);
    g.fillStyle(0x1e4b8f, 0.85);
    g.fillCircle(45, 38, 2.6);
    g.fillRect(44, 44, 2.6, 8);
    // pés + areia na base
    g.fillStyle(woodDark, 1);
    g.fillRect(10, 64, 16, 6);
    g.fillRect(64, 64, 16, 6);
    g.fillStyle(0xe0c492, 1);
    g.fillTriangle(0, 70, 22, 70, 8, 62);
    g.fillTriangle(70, 70, 90, 70, 82, 64);

    g.generateTexture('hazard-caixote', w, h);
    g.destroy();

    // -rubble: MESMO canvas — tábuas partidas, palha e o artefato derramado
    const r = scene.make.graphics({ x: 0, y: 0, add: false });
    r.fillStyle(0xc9b25e, 1);                     // palha derramada
    r.fillTriangle(6, 70, 56, 70, 30, 50);
    r.fillTriangle(44, 70, 88, 70, 68, 54);
    r.save(); r.translateCanvas(8, 56); r.rotateCanvas(0.4);
    r.fillStyle(wood, 1); r.fillRect(0, 0, 40, 9);
    r.fillStyle(woodDark, 1); r.fillRect(0, 0, 40, 3);
    r.restore();
    r.save(); r.translateCanvas(52, 62); r.rotateCanvas(-0.3);
    r.fillStyle(woodDark, 1); r.fillRect(0, 0, 34, 8);
    r.restore();
    r.fillStyle(woodLight, 1);
    [[26, 62, 8], [48, 64, 6], [74, 60, 7]].forEach(([x, y, s]) => r.fillRect(x, y, s, s * 0.7));
    r.fillStyle(0xd4af37, 1);                     // o ouro rolou para fora
    r.fillCircle(70, 66, 5);
    r.fillStyle(0xfff3c4, 0.8);
    r.fillCircle(68.5, 64.5, 1.8);
    r.generateTexture('hazard-caixote-rubble', w, h);
    r.destroy();
  }

  // Dardo-cão do rasante da Muralha (rasanteStyle 'k9' do B): um vulto de
  // pastor em disparada, 24x12 — pequeno como o tranq-dart, lido pela
  // SILHUETA + colete vermelho (voa da direita para a esquerda).
  static generateK9Projectile(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x2b2620, 1);
    g.fillEllipse(11, 6, 16, 7);                    // corpo esticado
    g.fillCircle(4, 5, 3.5);                        // cabeça (vai à frente)
    g.fillTriangle(3, 2, 6, 1, 5, 4);               // orelha
    g.fillTriangle(18, 5, 24, 2, 22, 8);            // cauda ao vento
    g.fillStyle(0x2b2620, 1);                       // patas recolhidas
    g.fillRect(7, 9, 3, 3);
    g.fillRect(14, 9, 3, 3);
    g.fillStyle(0xd6453c, 1);                       // colete K9
    g.fillRect(8, 3, 7, 5);
    g.fillStyle(0xffffff, 1);
    g.fillRect(10, 4, 3, 2);                        // "K9" em pixel
    g.fillStyle(0xffe9a8, 1);                       // olho aceso
    g.fillCircle(3.5, 4.5, 1);
    g.generateTexture('k9-projectile', 24, 12);
    g.destroy();
  }

  // v1.8.10 — FLECHA do arqueiro/obelisco (26x6): haste de madeira, ponta
  // de bronze e penas vermelhas — voa para a ESQUERDA como o tranq-dart
  // (mesmo pool de dardos; o TranqDart.deactivate devolve a textura-base).
  static generateArrowProjectile(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xd4af37, 1);                       // ponta de bronze
    g.fillTriangle(0, 3, 7, 0.5, 7, 5.5);
    g.fillStyle(0x8a5a33, 1);                       // haste
    g.fillRect(7, 2, 13, 2);
    g.fillStyle(0xa8794a, 1);
    g.fillRect(7, 2, 13, 1);
    g.fillStyle(0xd6453c, 1);                       // penas
    g.fillTriangle(20, 3, 26, 0, 24, 3);
    g.fillTriangle(20, 3, 26, 6, 24, 3);
    g.lineStyle(1, 0x17171b, 0.8);                  // contorno de leitura
    g.strokeTriangle(0, 3, 7, 0.5, 7, 5.5);
    g.generateTexture('arrow-projectile', 26, 6);
    g.destroy();
  }

  // v1.8.10 — FALCÃO em mergulho (30x14): o projétil do Mergulho de Hórus
  // (rasanteStyle 'falcao' do Faraó). Silhueta de asas fechadas + peito
  // claro e colar dourado — lido de relance como AVE, não como dardo.
  static generateFalcaoProjectile(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x4a3a55, 1);                       // dorso ardósia
    g.fillEllipse(14, 7, 20, 8);
    g.fillCircle(5, 6, 4);                          // cabeça (vai à frente)
    g.fillTriangle(1, 6, 4, 4.5, 4, 7.5);           // bico
    g.fillStyle(0x4a3a55, 1);                       // asas coladas ao corpo
    g.fillTriangle(12, 4, 28, 1, 22, 6);
    g.fillTriangle(14, 10, 30, 12, 24, 8);          // cauda/asa de baixo
    g.fillStyle(0xe8ddc2, 1);                       // peito claro
    g.fillEllipse(12, 9.5, 12, 4);
    g.fillStyle(0xd4af37, 1);                       // colar de Hórus
    g.fillRect(8, 4, 2.5, 6);
    g.fillStyle(0xffd24a, 1);                       // olho solar
    g.fillCircle(5, 5, 1.4);
    g.fillStyle(0x17171b, 1);
    g.fillCircle(5.4, 5, 0.7);
    g.generateTexture('falcao-projectile', 30, 14);
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
