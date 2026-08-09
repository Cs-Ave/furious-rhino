// Gráficos em SVG, à mão (v1.6.1). O projeto é zero-build e zero dependência
// de runtime — Phaser e Firebase vêm de CDN, e nenhuma lib de gráfico entra.
// Estas primitivas cobrem o painel /?stats e o resumo do jogador.
//
// Três regras que valem para tudo aqui:
//  1. Texto de terceiros (cidade, modelo, apelido) SEMPRE via textContent —
//     nunca innerHTML. Vale igual dentro de SVG.
//  2. `viewBox` + width 100%: o SVG se adapta ao container sem media query.
//  3. Tooltip é <title> nativo — sem JS de hover, funciona no toque longo.
//
// Paleta do jogo, a mesma do index.html.
export const PALETTE = {
  ink: '#d7e7f5',
  muted: '#8fa3b5',
  grid: 'rgba(215,231,245,0.14)',
  accent: '#4ecdc4', // turquesa: cor de ação
  gold: '#ffcc00', // recorde/destaque
  orange: '#ff9944',
  red: '#ff6b6b',
  series: ['#4ecdc4', '#ffcc00', '#ff9944', '#ff6b6b', '#9b8cff', '#6fd08c'],
};

const NS = 'http://www.w3.org/2000/svg';

function n(tag, attrs = {}, text = null) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== null && v !== undefined) node.setAttribute(k, String(v));
  }
  if (text !== null) node.textContent = text; // textContent: conteúdo de terceiros
  return node;
}

function svg(w, h, className = 'chart') {
  const s = n('svg', {
    viewBox: `0 0 ${w} ${h}`,
    // `meet` (e NÃO `none`): com `none` o navegador estica o conteúdo para
    // preencher a largura do container e o donut vira uma elipse.
    preserveAspectRatio: 'xMidYMid meet',
    class: className,
    role: 'img',
  });
  s.style.width = '100%';
  s.style.height = 'auto';
  // Teto no tamanho nativo: sem ele um gráfico pequeno esticado numa tela
  // larga fica com texto minúsculo em relação ao desenho
  s.style.maxWidth = `${w}px`;
  return s;
}

function tip(node, text) {
  node.append(n('title', {}, text));
  return node;
}

// Rótulo do eixo Y com no máximo `steps` linhas de grade
function gridY(g, x0, x1, y0, y1, max, steps = 4, fmt = (v) => `${v}`) {
  for (let i = 0; i <= steps; i++) {
    const v = (max / steps) * i;
    const y = y1 - ((y1 - y0) * i) / steps;
    g.append(n('line', { x1: x0, x2: x1, y1: y, y2: y, stroke: PALETTE.grid, 'stroke-width': 1 }));
    g.append(n('text', {
      x: x0 - 6, y: y + 4, 'text-anchor': 'end', fill: PALETTE.muted, 'font-size': 11,
    }, fmt(Math.round(v))));
  }
}

function niceMax(v) {
  if (v <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / mag) * mag;
}

// Rótulos do eixo X sem colisão e sem corte nas bordas. O "sempre desenhar o
// último" ingênuo grudava o último rótulo no penúltimo e ainda o deixava
// metade fora do SVG.
function xLabels(s, labels, xOf, y, bounds, color = PALETTE.muted) {
  const [L, R] = bounds;
  const every = Math.max(1, Math.ceil(labels.length / 9));
  const drawn = [];
  const put = (i) => {
    const x = xOf(i);
    if (drawn.length && x - drawn[drawn.length - 1] < 34) return; // colidiria
    drawn.push(x);
    const near = x - L < 14 ? 'start' : (R - x < 14 ? 'end' : 'middle');
    s.append(n('text', {
      x: Math.min(R, Math.max(L, x)), y,
      'text-anchor': near, fill: color, 'font-size': 11,
    }, labels[i]));
  };
  for (let i = 0; i < labels.length; i += every) put(i);
  if ((labels.length - 1) % every !== 0) put(labels.length - 1);
}

// ---------------------------------------------------------------- combo
// Barras + linha em eixos independentes. É o gráfico de "execuções por dia"
// (barras) contra "jogadores únicos por dia" (linha): as duas grandezas têm
// escalas muito diferentes, e forçá-las num eixo só achataria a linha.
export function comboChart(labels, bars, line, opts = {}) {
  const { barLabel = 'barras', lineLabel = 'linha', height = 240 } = opts;
  const W = 720;
  const H = height;
  const L = 42;
  const R = 34;
  const T = 14;
  const B = 34;
  const s = svg(W, H);

  // Linha vazia = gráfico de barras puro: sem ela não há 2º eixo para desenhar
  const hasLine = Array.isArray(line) && line.length > 0;
  const barMax = niceMax(Math.max(1, ...bars));
  const lineMax = hasLine ? niceMax(Math.max(1, ...line)) : 1;
  gridY(s, L, W - R, T, H - B, barMax, 4);

  const span = W - L - R;
  const plot = H - B - T;
  const step = span / Math.max(1, labels.length);
  const bw = Math.max(2, Math.min(28, step * 0.62));

  bars.forEach((v, i) => {
    const h = (v / barMax) * plot;
    const x = L + step * i + (step - bw) / 2;
    const rect = n('rect', {
      x, y: H - B - h, width: bw, height: Math.max(0, h),
      fill: PALETTE.accent, opacity: 0.75, rx: 2,
    });
    s.append(tip(rect, `${labels[i]}\n${v} ${barLabel}` +
      (hasLine ? `\n${line[i]} ${lineLabel}` : '')));
  });

  // Linha do 2º eixo
  const pts = (hasLine ? line : []).map((v, i) => [
    L + step * i + step / 2,
    H - B - (v / lineMax) * plot,
  ]);
  if (pts.length > 1) {
    s.append(n('polyline', {
      points: pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '),
      fill: 'none', stroke: PALETTE.gold, 'stroke-width': 2.5,
      'stroke-linejoin': 'round', 'stroke-linecap': 'round',
    }));
  }
  pts.forEach(([x, y], i) => {
    s.append(tip(n('circle', { cx: x, cy: y, r: 3.2, fill: PALETTE.gold }),
      `${labels[i]}\n${line[i]} ${lineLabel}`));
  });

  // Eixo Y da direita (escala da linha)
  if (hasLine) {
    for (let i = 0; i <= 4; i++) {
      const y = H - B - (plot * i) / 4;
      s.append(n('text', {
        x: W - R + 6, y: y + 4, fill: PALETTE.gold, 'font-size': 11,
      }, `${Math.round((lineMax / 4) * i)}`));
    }
  }

  xLabels(s, labels, (i) => L + step * i + step / 2, H - B + 16, [L, W - R]);

  const legend = [[PALETTE.accent, barLabel]];
  if (lineLabel) legend.push([PALETTE.gold, lineLabel]);
  return withLegend(s, legend);
}

// --------------------------------------------------------------- histograma
// Distribuição. É o gráfico que revela PICO — um valor único repetido muitas
// vezes é sempre um obstáculo específico, nunca dificuldade difusa.
export function histogram(values, opts = {}) {
  const { binSize = 25, max = null, unit = 'm', height = 220, color = PALETTE.red } = opts;
  const top = max !== null ? max : Math.max(binSize, ...values);
  const bins = Math.max(1, Math.ceil(top / binSize));
  const counts = new Array(bins).fill(0);
  for (const v of values) {
    const i = Math.min(bins - 1, Math.max(0, Math.floor(v / binSize)));
    counts[i]++;
  }

  const W = 720;
  const H = height;
  const L = 42;
  const R = 10;
  const T = 14;
  const B = 30;
  const s = svg(W, H);
  const cMax = niceMax(Math.max(1, ...counts));
  gridY(s, L, W - R, T, H - B, cMax, 4);

  const span = W - L - R;
  const plot = H - B - T;
  const bw = span / bins;
  counts.forEach((c, i) => {
    const h = (c / cMax) * plot;
    const rect = n('rect', {
      x: L + bw * i + 0.5, y: H - B - h, width: Math.max(1, bw - 1),
      height: Math.max(0, h), fill: color, opacity: 0.85,
    });
    s.append(tip(rect, `${i * binSize}–${(i + 1) * binSize}${unit}\n${c} corridas`));
  });

  const ticks = counts.map((_, i) => `${i * binSize}`);
  xLabels(s, ticks, (i) => L + bw * i, H - B + 15, [L, W - R]);
  return s;
}

// ------------------------------------------------------------------ heatmap
// Matriz colorida: cruza duas dimensões que hoje só existem separadas (causa
// da morte × faixa de distância). É onde aparece "a torre só mata no fim".
export function heatmap(rows, cols, matrix, opts = {}) {
  const { height = null, fmt = (v) => `${v}` } = opts;
  const W = 720;
  const L = 130;
  const T = 26;
  const cell = Math.min(52, (W - L - 8) / Math.max(1, cols.length));
  const rh = 30;
  const H = height || T + rows.length * rh + 6;
  const s = svg(W, H);

  let peak = 0;
  for (const row of matrix) for (const v of row) peak = Math.max(peak, v);

  cols.forEach((c, j) => {
    s.append(n('text', {
      x: L + cell * j + cell / 2, y: T - 9, 'text-anchor': 'middle',
      fill: PALETTE.muted, 'font-size': 11,
    }, c));
  });

  rows.forEach((r, i) => {
    s.append(n('text', {
      x: L - 8, y: T + rh * i + rh / 2 + 4, 'text-anchor': 'end',
      fill: PALETTE.ink, 'font-size': 12,
    }, r));
    cols.forEach((c, j) => {
      const v = (matrix[i] && matrix[i][j]) || 0;
      // Raiz quadrada na intensidade: sem ela, um único pico deixa o resto
      // do mapa preto e a comparação entre células médias se perde
      const t = peak > 0 ? Math.sqrt(v / peak) : 0;
      const rect = n('rect', {
        x: L + cell * j + 1, y: T + rh * i + 1,
        width: cell - 2, height: rh - 2, rx: 3,
        fill: PALETTE.orange, opacity: 0.08 + t * 0.85,
      });
      s.append(tip(rect, `${r} · ${c}\n${fmt(v)}`));
      if (v > 0) {
        s.append(n('text', {
          x: L + cell * j + cell / 2, y: T + rh * i + rh / 2 + 4,
          'text-anchor': 'middle', fill: t > 0.55 ? '#1a1a1a' : PALETTE.ink,
          'font-size': 11, 'font-weight': 'bold',
        }, `${v}`));
      }
    });
  });
  return s;
}

// -------------------------------------------------------------------- donut
export function donut(entries, opts = {}) {
  const { size = 180, thickness = 30 } = opts;
  const total = entries.reduce((a, [, v]) => a + v, 0) || 1;
  // Largura = anel + legenda. Fixar em 460 fazia o donut pequeno da grade
  // encolher junto com a coluna e o texto da legenda virar pó.
  const W = size + 16 + 190;
  const s = svg(W, Math.max(size, 18 + Math.min(6, entries.length) * 22));
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 6;
  const ri = r - thickness;

  let angle = -Math.PI / 2;
  entries.forEach(([label, value], i) => {
    const slice = (value / total) * Math.PI * 2;
    const color = PALETTE.series[i % PALETTE.series.length];
    // Fatia única de 100%: o arco degenera (início = fim) e some. Anel cheio.
    if (entries.length === 1 || slice >= Math.PI * 2 - 1e-6) {
      s.append(tip(n('circle', {
        cx, cy, r: (r + ri) / 2, fill: 'none',
        stroke: color, 'stroke-width': thickness,
      }), `${label}\n${value} (100%)`));
    } else {
      const [x0, y0] = [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
      const [x1, y1] = [cx + r * Math.cos(angle + slice), cy + r * Math.sin(angle + slice)];
      const [x2, y2] = [cx + ri * Math.cos(angle + slice), cy + ri * Math.sin(angle + slice)];
      const [x3, y3] = [cx + ri * Math.cos(angle), cy + ri * Math.sin(angle)];
      const large = slice > Math.PI ? 1 : 0;
      const path = n('path', {
        d: `M${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} ` +
           `A${ri} ${ri} 0 ${large} 0 ${x3} ${y3} Z`,
        fill: color,
      });
      s.append(tip(path, `${label}\n${value} (${((value / total) * 100).toFixed(1)}%)`));
    }
    angle += slice;
  });

  s.append(n('text', {
    x: cx, y: cy + 2, 'text-anchor': 'middle', fill: PALETTE.ink,
    'font-size': 22, 'font-weight': 'bold',
  }, `${total}`));

  // Legenda ao lado, dentro do mesmo SVG (fica junto no scroll horizontal)
  entries.slice(0, 6).forEach(([label, value], i) => {
    const y = 18 + i * 22;
    s.append(n('rect', {
      x: size + 16, y: y - 9, width: 11, height: 11, rx: 2,
      fill: PALETTE.series[i % PALETTE.series.length],
    }));
    s.append(n('text', {
      x: size + 34, y, fill: PALETTE.ink, 'font-size': 12,
    }, `${label} — ${value}`));
  });
  return s;
}

// ----------------------------------------------------------------- stepArea
// Funil: área em degraus. A queda entre degraus é o que interessa, e uma área
// mostra a perda muito melhor que barras soltas.
export function stepArea(entries, opts = {}) {
  const { height = 220, highlight = null } = opts;
  const W = 720;
  const H = height;
  const L = 42;
  const R = 12;
  const T = 14;
  const B = 34;
  const s = svg(W, H);
  const max = niceMax(Math.max(1, ...entries.map(([, v]) => v)));
  gridY(s, L, W - R, T, H - B, max, 4);

  const span = W - L - R;
  const plot = H - B - T;
  const step = span / Math.max(1, entries.length);

  // O contorno em degraus e a área preenchida são o MESMO traço; a área só
  // fecha de volta na linha de base
  const outline = [];
  entries.forEach(([, v], i) => {
    const y = H - B - (v / max) * plot;
    if (i === 0) outline.push(`M${L} ${y}`);
    else outline.push(`L${L + step * i} ${y}`);
    outline.push(`L${L + step * (i + 1)} ${y}`);
  });
  s.append(n('path', {
    d: `${outline.join(' ')} L${L + span} ${H - B} L${L} ${H - B} Z`,
    fill: PALETTE.accent, opacity: 0.22,
  }));
  s.append(n('path', {
    d: outline.join(' '), fill: 'none',
    stroke: PALETTE.accent, 'stroke-width': 2, 'stroke-linejoin': 'round',
  }));

  entries.forEach(([label, v], i) => {
    const y = H - B - (v / max) * plot;
    const isHi = highlight !== null && label.includes(highlight);
    s.append(tip(n('rect', {
      x: L + step * i, y: T, width: step, height: plot,
      fill: 'transparent',
    }), `${label}\n${v}`));
    if (isHi) {
      s.append(n('line', {
        x1: L + step * i, x2: L + step * i, y1: T, y2: H - B,
        stroke: PALETTE.gold, 'stroke-width': 2, 'stroke-dasharray': '4 3',
      }));
      s.append(n('circle', { cx: L + step * i, cy: y, r: 4, fill: PALETTE.gold }));
    }
  });

  xLabels(s, entries.map(([l]) => l.split(' ')[0]),
    (i) => L + step * i + step / 2, H - B + 16, [L, W - R]);
  return s;
}

// ---------------------------------------------------------------- lineChart
export function lineChart(labels, values, opts = {}) {
  const { height = 200, color = PALETTE.gold, fmt = (v) => `${v}` } = opts;
  const W = 720;
  const H = height;
  const L = 46;
  const R = 12;
  const T = 14;
  const B = 30;
  const s = svg(W, H);
  const max = niceMax(Math.max(1, ...values));
  gridY(s, L, W - R, T, H - B, max, 4);

  const span = W - L - R;
  const plot = H - B - T;
  const step = span / Math.max(1, values.length - 1 || 1);
  const pts = values.map((v, i) => [L + step * i, H - B - (v / max) * plot]);

  s.append(n('polyline', {
    points: pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '),
    fill: 'none', stroke: color, 'stroke-width': 2.5, 'stroke-linejoin': 'round',
  }));
  pts.forEach(([x, y], i) => {
    s.append(tip(n('circle', { cx: x, cy: y, r: 3.4, fill: color }),
      `${labels[i]}\n${fmt(values[i])}`));
  });

  xLabels(s, labels, (i) => L + step * i, H - B + 15, [L, W - R]);
  return s;
}

// ------------------------------------------------------------------ treemap
// Retângulos proporcionais: para cidades/países cabe muito mais coisa numa
// altura fixa do que uma lista de barras.
export function treemap(entries, opts = {}) {
  const { width = 720, height = 260 } = opts;
  const s = svg(width, height);
  const total = entries.reduce((a, [, v]) => a + v, 0);
  if (total <= 0) return s;

  // Squarify simplificado: fatia em faixas alternando horizontal/vertical.
  // Não é ótimo, mas é estável e curto — e a leitura é por área, não por forma.
  let [x, y, w, h] = [0, 0, width, height];
  let rest = total;
  entries.forEach(([label, value], i) => {
    const frac = value / rest;
    const horizontal = w >= h;
    const cw = horizontal ? Math.round(w * frac) : w;
    const ch = horizontal ? h : Math.round(h * frac);
    const color = PALETTE.series[i % PALETTE.series.length];
    const rect = n('rect', {
      x: x + 1, y: y + 1, width: Math.max(0, cw - 2), height: Math.max(0, ch - 2),
      fill: color, opacity: 0.8, rx: 3,
    });
    s.append(tip(rect, `${label}\n${value} (${((value / total) * 100).toFixed(1)}%)`));
    if (cw > 58 && ch > 22) {
      s.append(n('text', {
        x: x + 8, y: y + 18, fill: '#12222b', 'font-size': 12, 'font-weight': 'bold',
      }, label.length > Math.floor(cw / 7) ? `${label.slice(0, Math.floor(cw / 7))}…` : label));
      if (ch > 38) {
        s.append(n('text', { x: x + 8, y: y + 34, fill: '#12222b', 'font-size': 11 }, `${value}`));
      }
    }
    if (horizontal) { x += cw; w -= cw; } else { y += ch; h -= ch; }
    rest -= value;
  });
  return s;
}

// ---------------------------------------------------------------- sparkline
// Miniatura sem eixo, para caber ao lado de um número.
export function sparkline(values, opts = {}) {
  const { width = 200, height = 40, color = PALETTE.accent, markAt = null } = opts;
  const s = svg(width, height, 'sparkline');
  if (!values.length) return s;
  const max = Math.max(1, ...values);
  const step = width / Math.max(1, values.length);

  values.forEach((v, i) => {
    const h = Math.max(1.5, (v / max) * (height - 4));
    s.append(n('rect', {
      x: i * step, y: height - h, width: Math.max(1, step - 1), height: h,
      fill: markAt !== null && v >= markAt ? PALETTE.gold : color,
      opacity: 0.9, rx: 1,
    }));
  });
  return s;
}

// ------------------------------------------------------------------- helpers

// Legenda em DOM (fora do SVG): quebra linha sozinha em tela estreita
function withLegend(node, entries) {
  const box = document.createElement('div');
  box.className = 'chart-box';
  box.append(node);
  const legend = document.createElement('div');
  legend.className = 'chart-legend';
  for (const [color, label] of entries) {
    const item = document.createElement('span');
    const dot = document.createElement('i');
    dot.style.background = color;
    item.append(dot, document.createTextNode(label)); // texto sempre como nó
    legend.append(item);
  }
  box.append(legend);
  return box;
}

// Envolve qualquer gráfico numa caixa que rola na horizontal em tela estreita
export function chartBox(node, caption = null) {
  const box = document.createElement('div');
  box.className = 'chart-box';
  box.append(node);
  if (caption) {
    const cap = document.createElement('p');
    cap.className = 'chart-caption';
    cap.textContent = caption;
    box.append(cap);
  }
  return box;
}
