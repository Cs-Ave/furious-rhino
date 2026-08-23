// GERADOR DE SPRITES — o motor (raster → SVG 96×64 no rig do jogo).
// Extraído dos scripts de art2/skins (validados no Catisquick e no Rino
// Robô, v1.8.0). Funções puras sobre Jimp — quem faz I/O de arquivo são os
// consumidores (server.mjs e os CLIs de art2/skins).
//
// Pipeline: fundo removido por flood-fill das bordas → maior componente
// conexo → âncoras rígidas + escala única (corpo não pulsa) → quantização
// por paleta + filtro de maioria → composição CORPO-MESTRE + pernas por
// frame com costura anatômica (regra da casa: entre frames só os membros
// mudam) → um traço potrace por camada de cor.
import Jimp from 'jimp';
import potrace from 'potrace';

const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
const lumOf = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const satOf = (r, g, b) => Math.max(r, g, b) - Math.min(r, g, b);
// "Cor de papel": fundo branco/creme das folhas (claro e dessaturado)
const isPaperRGB = (r, g, b) => lumOf(r, g, b) > 196 && satOf(r, g, b) < 34;

// ---------------------------------------------------------------- fatiador
// Detecta bandas de tinta por projeção (linhas → colunas) e devolve os
// recortes. Ignora faixas baixas (<60px = texto/legenda).
export async function sliceSheet(img, { ink = 200, minBand = 60, gap = 14, pad = 4 } = {}) {
  const W = img.getWidth();
  const H = img.getHeight();
  const lum = (x, y) => {
    const { r, g, b } = Jimp.intToRGBA(img.getPixelColor(x, y));
    return lumOf(r, g, b);
  };

  const rowInk = new Array(H).fill(0);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x += 2) if (lum(x, y) < ink) rowInk[y]++;
  }
  const rowThresh = W * 0.01;
  const bands = [];
  let start = null;
  for (let y = 0; y < H; y++) {
    const on = rowInk[y] > rowThresh;
    if (on && start === null) start = y;
    if (!on && start !== null) {
      if (y - start > minBand) bands.push([start, y]);
      start = null;
    }
  }
  if (start !== null && H - start > minBand) bands.push([start, H]);

  const frames = [];
  for (const [y0, y1] of bands) {
    const colInk = new Array(W).fill(0);
    for (let x = 0; x < W; x++) {
      for (let y = y0; y < y1; y += 2) if (lum(x, y) < ink) colInk[x]++;
    }
    const colThresh = (y1 - y0) * 0.008;
    let s = null;
    for (let x = 0; x < W; x++) {
      const on = colInk[x] > colThresh;
      if (on && s === null) s = x;
      if (!on && s !== null) {
        // respiro de `gap`px junta partes do mesmo frame (cauda solta etc.)
        const ahead = colInk.slice(x, x + gap).some((v) => v > colThresh);
        if (!ahead) {
          if (x - s > minBand) frames.push(cropOf(img, s, y0, x, y1, pad));
          s = null;
        }
      }
    }
    if (s !== null && W - s > minBand) frames.push(cropOf(img, s, y0, W, y1, pad));
  }
  return frames;
}

// Fallback do fatiador: grade fixa R×C. Para folhas onde o Gemini desenhou
// efeitos ATRAVESSANDO as células (rastros, partículas) — a projeção de
// tinta não acha vales vazios, mas a grade corta no lugar certo e o
// maior-componente de cada célula descarta as sobras do vizinho.
export function sliceGrid(img, rows, cols) {
  const W = img.getWidth();
  const H = img.getHeight();
  const frames = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x0 = Math.round((c * W) / cols);
      const x1 = Math.round(((c + 1) * W) / cols);
      const y0 = Math.round((r * H) / rows);
      const y1 = Math.round(((r + 1) * H) / rows);
      frames.push({ jimp: img.clone().crop(x0, y0, x1 - x0, y1 - y0), x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
    }
  }
  return frames;
}

function cropOf(img, x0, y0, x1, y1, pad) {
  const W = img.getWidth();
  const H = img.getHeight();
  const cx = Math.max(0, x0 - pad);
  const cy = Math.max(0, y0 - pad);
  const cw = Math.min(W, x1 + pad) - cx;
  const ch = Math.min(H, y1 + pad) - cy;
  return { jimp: img.clone().crop(cx, cy, cw, ch), x: cx, y: cy, w: cw, h: ch };
}

// ----------------------------------------------------------- paleta sugerida
// Fidelidade importa: baldes de frequência guardam o CENTROIDE real (a
// versão antiga arredondava para múltiplos de 24 — escurecia e dessaturava
// tudo), as sementes saem gulosas por distância e 3 iterações de k-means
// grudam cada cor na média real dos pixels que ela representa. O contorno
// sugerido é a cor mais escura.
export function samplePalette(img, n = 10) {
  const W = img.getWidth();
  const H = img.getHeight();
  const pts = [];
  const buckets = new Map(); // chave grossa → { n, r, g, b } (centroide)
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      const { r, g, b } = Jimp.intToRGBA(img.getPixelColor(x, y));
      if (isPaperRGB(r, g, b)) continue;
      pts.push([r, g, b]);
      const k = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
      const bk = buckets.get(k) || { n: 0, r: 0, g: 0, b: 0 };
      bk.n++; bk.r += r; bk.g += g; bk.b += b;
      buckets.set(k, bk);
    }
  }
  const sorted = [...buckets.values()].sort((a, b) => b.n - a.n)
    .map((bk) => [bk.r / bk.n, bk.g / bk.n, bk.b / bk.n]);
  let cents = [];
  for (const c of sorted) {
    if (cents.length >= n) break;
    if (cents.every((p) => dist2(p, c) > 46 * 46)) cents.push(c);
  }
  // k-means: 3 iterações bastam para acertar matiz/luminosidade
  for (let it = 0; it < 3; it++) {
    const acc = cents.map(() => ({ n: 0, r: 0, g: 0, b: 0 }));
    for (const p of pts) {
      let bi = 0;
      let bd = Infinity;
      cents.forEach((c, ci) => {
        const d = dist2(p, c);
        if (d < bd) { bd = d; bi = ci; }
      });
      const a = acc[bi];
      a.n++; a.r += p[0]; a.g += p[1]; a.b += p[2];
    }
    cents = cents.map((c, ci) => acc[ci].n
      ? [acc[ci].r / acc[ci].n, acc[ci].g / acc[ci].n, acc[ci].b / acc[ci].n]
      : c);
  }
  const hexes = cents.map((c) => '#' + c.map((v) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''));
  let outline = hexes[0];
  let darkest = Infinity;
  for (const h of hexes) {
    const [r, g, b] = hex2rgb(h);
    const l = lumOf(r, g, b);
    if (l < darkest) { darkest = l; outline = h; }
  }
  return { palette: hexes, outline };
}

// -------------------------------------------------------------- vetorizador
function backgroundMask(img) {
  const W = img.getWidth();
  const H = img.getHeight();
  const isPaper = (x, y) => {
    const { r, g, b } = Jimp.intToRGBA(img.getPixelColor(x, y));
    return isPaperRGB(r, g, b);
  };
  const bg = new Uint8Array(W * H);
  const queue = [];
  for (let x = 0; x < W; x++) queue.push([x, 0], [x, H - 1]);
  for (let y = 0; y < H; y++) queue.push([0, y], [W - 1, y]);
  while (queue.length) {
    const [x, y] = queue.pop();
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const i = y * W + x;
    if (bg[i] || !isPaper(x, y)) continue;
    bg[i] = 1;
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return bg;
}

function largestComponent(content, W, H) {
  const label = new Int32Array(W * H).fill(-1);
  let best = null;
  let id = 0;
  for (let i0 = 0; i0 < W * H; i0++) {
    if (!content[i0] || label[i0] !== -1) continue;
    const stack = [i0];
    label[i0] = id;
    let area = 0;
    while (stack.length) {
      const i = stack.pop();
      area++;
      const x = i % W;
      const y = (i / W) | 0;
      // 8-conexo: diagonais seguram partes ligadas por linhas de 1px
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const ni = ny * W + nx;
        if (content[ni] && label[ni] === -1) {
          label[ni] = id;
          stack.push(ni);
        }
      }
    }
    if (!best || area > best.area) best = { id, area };
    id++;
  }
  const keep = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) if (content[i] && label[i] === best.id) keep[i] = 1;
  return keep;
}

// Filtro de maioria 3×3 sobre a quantização: funde as ilhas de 1-2px que a
// textura pintada gera — derruba o SVG a uma fração do tamanho
function modeFilter(assign, W, H, passes = 2) {
  let cur = assign;
  for (let p = 0; p < passes; p++) {
    const next = new Int32Array(cur);
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        if (cur[i] === -1) continue;
        const votes = new Map();
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const v = cur[i + dy * W + dx];
            if (v !== -1) votes.set(v, (votes.get(v) || 0) + 1);
          }
        }
        let bestV = cur[i];
        let bestN = 0;
        for (const [v, cnt] of votes) if (cnt > bestN) { bestN = cnt; bestV = v; }
        next[i] = bestV;
      }
    }
    cur = next;
  }
  return cur;
}

function tracePath(maskImg, turdSize) {
  return new Promise((resolve, reject) => {
    const t = new potrace.Potrace({
      threshold: 128, turdSize, optTolerance: 0.6, alphaMax: 1.1,
    });
    t.loadImage(maskImg, (err) => {
      if (err) return reject(err);
      const m = t.getSVG().match(/ d="([^"]+)"/);
      resolve(m ? m[1] : null);
    });
  });
}

// 1 casa decimal chega para 96×64 e derruba o arquivo pela metade
const compact = (d) => d.replace(/(\d+\.\d)\d+/g, '$1');

/**
 * Vetoriza 3 frames de corrida no rig do jogo.
 * @param frames   [Jimp, Jimp, Jimp] na ORDEM DO GALOPE: estendido → apoio
 *                 → recolhido (o jogo toca 0-1-2-1)
 * @param palette  [[hex, isOutline], ...] — exatamente 1 cor de contorno
 * @param opts     { upscale=1, masterBody=true, masterIdx=1, comment='',
 *                   autoMasterFallback=false } — com autoMasterFallback, se
 *                   os corpos diferirem demais entre os frames (IoU<0.80) a
 *                   composição corpo-mestre é desligada sozinha (colar o
 *                   corpo de um pose sobre as pernas de outro corta e
 *                   sobrepõe; melhor um corpo que balança um pouco)
 * @returns        { svgs: [svg0, svg1, svg2], diagnostics }
 */
export async function vectorizeFrames(frames, palette, opts = {}) {
  // v1.8.9: o rig virou PARÂMETRO. Defaults = o rig histórico do rino
  // (96×64, encaixe 95×63, piso de pernas 36, janela de cabeça x>80,
  // mestre = frame do meio) — skins continuam byte-compatíveis. Sprites de
  // inimigo passam targetW/targetH livres, masterIdx 0 e frações próprias.
  const {
    upscale = 1, masterBody = true, masterIdx = 1, comment = '',
    autoMasterFallback = false,
    targetW = 96, targetH = 64,
    limbFloorFrac = 36 / 64, headWindowFrac = 80 / 96,
  } = opts;
  const fitW = targetW - 1;
  const fitH = targetH - 1;
  const headWindow = Math.round(targetW * headWindowFrac);
  const outline = (palette.find(([, o]) => o) || palette[0])[0];

  // -------- Passada 1: medir (máscara, bbox, âncoras rígidas). Escala
  // ÚNICA e alinhamento por centroide-do-tronco (x) + topo-da-frente (y):
  // bbox por frame faria o corpo inteiro pulsar com as pernas.
  const measured = [];
  for (const src of frames) {
    let img = src.clone();
    if (upscale > 1) {
      img = img.resize(img.getWidth() * upscale, img.getHeight() * upscale, Jimp.RESIZE_BICUBIC);
    }
    const W = img.getWidth();
    const H = img.getHeight();
    const bg = backgroundMask(img);
    const content = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) content[i] = bg[i] ? 0 : 1;
    const keep = largestComponent(content, W, H);

    let x0 = W; let y0 = H; let x1 = 0; let y1 = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (keep[y * W + x]) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }

    // x = centroide do TRONCO (55% de cima — pernas fora); y = topo da
    // FRENTE (x > centroide: cabeça/orelha; exclui a cauda, que muda)
    const upperY = y0 + (y1 - y0) * 0.55;
    let sumX = 0;
    let n = 0;
    for (let y = y0; y <= upperY; y++) {
      for (let x = x0; x <= x1; x++) {
        if (keep[y * W + x]) { sumX += x; n++; }
      }
    }
    const cx = sumX / n;
    let topY = y1;
    outer: for (let y = y0; y <= y1; y++) {
      for (let x = Math.round(cx); x <= x1; x++) {
        if (keep[y * W + x]) { topY = y; break outer; }
      }
    }
    measured.push({ img, keep, W, H, x0, y0, x1, y1, bw: x1 - x0 + 1, bh: y1 - y0 + 1, cx, topY });
  }

  // Transform por frame: âncora no mesmo ponto; shift global assenta o
  // frame mais fundo em y=64 e garante x<=95.
  // Alvo de encaixe 95×63 = encher o canvas (a arte original ocupa 94×61;
  // o alvo antigo de 94×54 deixava as skins geradas ~20% menores em área —
  // feedback do dono após a "prata"). +40% linear não existe sem cortar o
  // sprite: o rig 96×64 é fixo, então o teto é o próprio canvas.
  const s = Math.min(...measured.map((m) => Math.min(fitW / m.bw, fitH / m.bh)));
  const ref = measured[0];
  const refTx = fitW - ref.bw * s;
  const anchorOutX = refTx + (ref.cx - ref.x0) * s;
  const anchorOutY = (ref.topY - ref.y0) * s;
  const pre = measured.map((m) => ({
    tx: anchorOutX - (m.cx - m.x0) * s,
    ty: anchorOutY - (m.topY - m.y0) * s,
  }));
  const maxBottom = Math.max(...measured.map((m, i) => pre[i].ty + m.bh * s));
  const dy = targetH - maxBottom;
  for (const p of pre) p.ty += dy;
  const maxRight = Math.max(...measured.map((m, i) => pre[i].tx + m.bw * s));
  if (maxRight > fitW) for (const p of pre) p.tx -= maxRight - fitW;

  // acima disso nunca é perna (protege cauda/tronco); 36 no rig 96×64
  const LEG_FLOOR = Math.round(targetH * limbFloorFrac);

  // Diagnóstico: os CORPOS (acima do piso das pernas, já alinhados) são
  // parecidos o bastante para a composição corpo-mestre? IoU por frame.
  const bodyGrid = (f) => {
    const g = new Uint8Array(targetW * targetH);
    const { keep, W, x0, y0, x1, y1 } = measured[f];
    const { tx, ty } = pre[f];
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!keep[y * W + x]) continue;
        const ox = Math.round(tx + (x - x0) * s);
        const oy = Math.round(ty + (y - y0) * s);
        if (ox >= 0 && ox < targetW && oy >= 0 && oy < LEG_FLOOR) g[oy * targetW + ox] = 1;
      }
    }
    return g;
  };
  const gMaster = bodyGrid(masterIdx);
  const bodyIoU = measured.map((_, f) => {
    if (f === masterIdx) return 1;
    const gf = bodyGrid(f);
    let inter = 0;
    let uni = 0;
    for (let i = 0; i < gf.length; i++) {
      if (gMaster[i] && gf[i]) inter++;
      if (gMaster[i] || gf[i]) uni++;
    }
    return uni ? inter / uni : 0;
  });
  const minIoU = Math.min(...bodyIoU);
  let useMaster = masterBody;
  if (useMaster && autoMasterFallback && minIoU < 0.8) useMaster = false;

  // -------- Costura anatômica do corpo-mestre: abertura morfológica
  // HORIZONTAL separa o corpo (largo) das pernas (finas); o perfil de baixo
  // (bellyBot, por coluna do viewBox) corta o mestre e tuca as pernas.
  const mm = measured[masterIdx];
  const bellyBot = new Float64Array(targetW).fill(-1);
  if (useMaster) {
    const half = Math.round(mm.bw * 0.08);
    const bodyOnly = new Uint8Array(mm.W * mm.H);
    const { keep, W, x0, y0, x1, y1 } = mm;
    for (let y = y0; y <= y1; y++) {
      const row = new Int32Array(W + 1);
      for (let x = 0; x < W; x++) row[x + 1] = row[x] + (keep[y * W + x] ? 1 : 0);
      const count = (a, b) => row[Math.min(W, b + 1)] - row[Math.max(0, a)];
      const eroded = new Uint8Array(W);
      for (let x = x0; x <= x1; x++) {
        if (keep[y * W + x] && count(x - half, x + half) === Math.min(W, x + half + 1) - Math.max(0, x - half)) {
          eroded[x] = 1;
        }
      }
      const erow = new Int32Array(W + 1);
      for (let x = 0; x < W; x++) erow[x + 1] = erow[x] + eroded[x];
      const ecount = (a, b) => erow[Math.min(W, b + 1)] - erow[Math.max(0, a)];
      for (let x = x0; x <= x1; x++) {
        if (keep[y * W + x] && ecount(x - half, x + half) > 0) bodyOnly[y * W + x] = 1;
      }
    }
    const { tx, ty } = pre[masterIdx];
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!bodyOnly[y * W + x]) continue;
        const ox = Math.round(tx + (x - x0) * s);
        const oy = ty + (y - y0) * s;
        if (ox >= 0 && ox < targetW && oy > bellyBot[ox]) bellyBot[ox] = oy;
      }
    }
    // A abertura clipa CANTOS CURVOS (peito/queixo/traseira: curvatura menor
    // que o kernel) e o perfil sobe demais ali — o corte comeria lascas do
    // corpo que a camada de pernas nem sempre cobre ("cortes brancos").
    // Dilatação horizontal do perfil: cada coluna herda a profundidade do
    // vizinho mais fundo num raio de 5.
    const dilated = new Float64Array(targetW).fill(-1);
    for (let x = 0; x < targetW; x++) {
      for (let d = -5; d <= 5; d++) {
        const v = bellyBot[Math.max(0, Math.min(targetW - 1, x + d))];
        if (v > dilated[x]) dilated[x] = v;
      }
    }
    bellyBot.set(dilated);
  }

  // Corte do mestre restrito à JANELA DAS PERNAS (x<=80): além dela é
  // focinho/queixo — as pernas nunca alcançam para remendar, então nada de
  // cortar lá. Margens generosas (+1.2 / -4): as curvas do potrace desviam
  // 1-2px do corte reto e uma sobreposição fina deixava frestas na costura.
  const keepBody = (ox, oy) => {
    if (oy < LEG_FLOOR || ox > headWindow) return true;
    const b = bellyBot[Math.max(0, Math.min(targetW - 1, Math.round(ox)))];
    return b === -1 || oy <= b + 1.2;
  };
  const keepLegs = (ox, oy) => {
    if (ox > headWindow) return false; // dali em diante é focinho, nunca perna
    const b = bellyBot[Math.max(0, Math.min(targetW - 1, Math.round(ox)))];
    return oy >= Math.max(LEG_FLOOR, b === -1 ? LEG_FLOOR : b - 4);
  };

  const pal = palette.map(([hex]) => hex2rgb(hex));
  const outlineIdx = palette.findIndex(([, o]) => o);

  const traceLayers = async (f, mode) => {
    const { img, keep, W, x0, y0, x1, y1, bw, bh } = measured[f];
    const { tx, ty } = pre[f];
    const pass = mode === 'full' ? null : (mode === 'body' ? keepBody : keepLegs);

    const assign = new Int32Array(W * measured[f].H).fill(-1);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * W + x;
        if (!keep[i]) continue;
        if (pass && !pass(tx + (x - x0) * s, ty + (y - y0) * s)) continue;
        const { r, g, b } = Jimp.intToRGBA(img.getPixelColor(x, y));
        // Fundo ENCAPSULADO (vão fechado entre pernas tucadas) viraria uma
        // mancha quase-branca — só na camada das pernas; brilhos claros
        // legítimos vivem no corpo
        if (mode === 'legs' && isPaperRGB(r, g, b)) continue;
        let bi = 0;
        let bd = Infinity;
        pal.forEach((p, pi) => {
          const d = dist2([r, g, b], p);
          if (d < bd) { bd = d; bi = pi; }
        });
        assign[i] = bi;
      }
    }
    const smoothed = modeFilter(assign, W, measured[f].H);

    const blank = () => new Jimp(bw, bh, 0xffffffff);
    const put = (m, x, y) => m.setPixelColor(0x000000ff, x - x0, y - y0);
    const silh = blank();
    const perColor = palette.map(() => blank());
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * W + x;
        if (smoothed[i] === -1) continue;
        put(silh, x, y);
        put(perColor[smoothed[i]], x, y);
      }
    }

    const windowed = mode === 'legs';
    const turd = Math.max(windowed ? 12 : 24, Math.round((bw * bh) / (windowed ? 12000 : 4500)));
    const silhPath = await tracePath(silh, turd * 2);
    const colorPaths = [];
    for (let c = 0; c < palette.length; c++) {
      colorPaths.push(await tracePath(perColor[c], turd));
    }

    // Silhueta na cor do contorno por baixo (sela frestas entre camadas),
    // cores no meio, contorno por cima
    const layers = [];
    if (silhPath) layers.push(`<path d="${compact(silhPath)}" fill="${outline}" fill-rule="evenodd"/>`);
    palette.forEach(([hex], c) => {
      if (c === outlineIdx || !colorPaths[c]) return;
      layers.push(`<path d="${compact(colorPaths[c])}" fill="${hex}" fill-rule="evenodd"/>`);
    });
    if (colorPaths[outlineIdx]) {
      layers.push(`<path d="${compact(colorPaths[outlineIdx])}" fill="${outline}" fill-rule="evenodd"/>`);
    }
    return layers;
  };

  const group = (f, layers, indent) => {
    const { tx, ty } = pre[f];
    const body = layers.map((l) => `${indent}  ${l}`).join('\n');
    return `${indent}<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s.toFixed(5)})">\n${body}\n${indent}</g>`;
  };

  const masterFull = await traceLayers(masterIdx, 'full');
  const masterBodyLayers = useMaster ? await traceLayers(masterIdx, 'body') : null;

  const svgs = [];
  for (let f = 0; f < frames.length; f++) {
    const header = comment
      ? (targetW === 96 && targetH === 64
        ? `  <!-- ${comment} — frame ${f}. Rig: pés em y=64, focinho à direita
       (narina ~(89,38)), hitbox 76x54 offset (8,10) inalterada. Corpo
       idêntico nos 3 frames (regra da casa); só as pernas mudam. -->\n`
        : `  <!-- ${comment} — frame ${f}. Alvo ${targetW}x${targetH}, base em
       y=${targetH}, virado para a DIREITA (o jogo espelha com setFlipX).
       Regra da casa: entre frames só a peça móvel muda. -->\n`)
      : '';
    let content;
    if (!useMaster) {
      content = f === masterIdx
        ? group(masterIdx, masterFull, '  ')
        : group(f, await traceLayers(f, 'full'), '  ');
    } else if (f === masterIdx) {
      content = group(masterIdx, masterFull, '  ');
    } else {
      // Pernas do frame por baixo, corpo do mestre (sem as pernas dele)
      // por cima — a barriga do mestre é a costura
      const legLayers = await traceLayers(f, 'legs');
      content = `${group(f, legLayers, '  ')}\n${group(masterIdx, masterBodyLayers, '  ')}`;
    }
    svgs.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${targetW} ${targetH}" width="${targetW}" height="${targetH}">\n${header}${content}\n</svg>\n`);
  }
  return {
    svgs,
    diagnostics: {
      bodyIoU: bodyIoU.map((v) => +v.toFixed(3)),
      masterBodyRequested: masterBody,
      masterBodyUsed: useMaster,
      // bbox de cada frame no canvas de SAÍDA — é daqui que o servidor mede
      // a hitbox sugerida de um inimigo gerado
      bounds: measured.map((m, i) => ({
        x: +pre[i].tx.toFixed(1), y: +pre[i].ty.toFixed(1),
        w: +(m.bw * s).toFixed(1), h: +(m.bh * s).toFixed(1),
      })),
    },
  };
}

// Preview auto-contido (mesmo formato dos aprovados na v1.8.0)
export function buildPreviewHtml(title, cards) {
  const cardHtml = cards.map(({ name, svgs }) => {
    const frames = svgs.map((svg, f) => `<div class="fr fr${f}">${svg}</div>`).join('');
    const stills = svgs.map((svg) => `<div class="still">${svg}</div>`).join('');
    const onion = svgs.map((svg, f) => `<div class="on" style="opacity:${f === 0 ? 0.9 : 0.45}">${svg}</div>`).join('');
    return `<div class="card"><h2>${name}</h2><div class="anim">${frames}</div>` +
      `<div class="row">${stills}</div>` +
      `<h3>Onion-skin (corpo deve ficar nítido; só as pernas fantasmam)</h3>` +
      `<div class="onion">${onion}</div></div>`;
  }).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
body{font-family:system-ui;background:#2a3140;color:#eee;margin:20px}
.card{background:#3a4254;border-radius:12px;padding:16px;margin:14px 0;max-width:760px}
h1{font-size:20px}h2{font-size:16px;margin:0 0 10px}h3{font-size:13px;margin:14px 0 6px;color:#ffd9b0}
.anim,.onion{position:relative;width:288px;height:192px;background:#5a89c0;border-radius:8px;overflow:hidden}
.anim .fr,.onion .on{position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:center}
.anim svg,.onion svg{width:288px;height:192px}
.anim .fr{opacity:0}
@keyframes c0{0%,24.9%{opacity:1}25%,100%{opacity:0}}
@keyframes c1{0%,24.9%{opacity:0}25%,49.9%{opacity:1}50%,74.9%{opacity:0}75%,100%{opacity:1}}
@keyframes c2{0%,49.9%{opacity:0}50%,74.9%{opacity:1}75%,100%{opacity:0}}
.fr0{animation:c0 .34s steps(1) infinite}.fr1{animation:c1 .34s steps(1) infinite}.fr2{animation:c2 .34s steps(1) infinite}
.row{display:flex;gap:8px;margin-top:10px}.still{background:#e8e2d0;border-radius:6px;padding:4px}.still svg{width:144px;height:96px}
</style></head><body><h1>${title}</h1>
<p>Animação no ritmo do jogo (12fps, ciclo 0-1-2-1). Fundos: azul = jogo, claro = contraste.</p>
${cardHtml}</body></html>`;
}
