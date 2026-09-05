import { Constants } from '../utils/Constants.js';
import { ScoreSystem } from '../systems/ScoreSystem.js';

// RADIOGRAFIA VIVA (ideia K) — o agregador puro da análise de usabilidade.
//
// A radiografia de 16/08 (docs/IDEIAS-FUTURAS.md §2) foi gerada por um script
// apagado de propósito; o §3 do documento era a receita para recriá-lo à mão.
// Este módulo é o titular permanente: recebe as coleções JÁ decodificadas
// ({stats, scores, challenges}) e devolve { meta, metricas, insights,
// markdown } — SEM fetch, SEM DOM, SEM node API, SEM localStorage. É essa
// pureza que o deixa rodar idêntico no navegador (aba do /?setup, via
// SetupAnalytics.js) e no node (tools/radiografia.mjs, npm run radiografia).
//
// Imports permitidos: só Constants e ScoreSystem — ambos comprovadamente
// puros (é o mesmo contrato que deixa tools/test-score.mjs rodar no node).
// PROIBIDO importar StatsDashboard (arrasta LeaderboardSystem→StorageManager
// →localStorage) — e desde a v1.9.12 o allRuns() de lá decodifica TODAS as chaves (era a lacuna L2).
//
// Determinismo é contrato: `nowS` é INJETADO (nunca Date.now() aqui dentro) e
// toda iteração de mapa sai ordenada — duas chamadas sobre o mesmo dado
// produzem o MESMO markdown byte a byte (tools/test-radiografia.mjs guarda).

// ---------------------------------------------------------------- decodifica
// O REST do Firestore devolve valores tipados ({integerValue: "3"}); isto
// converte de volta para JS puro, recursivamente. Mesmo shape nos dois mundos:
// timestamps viram epoch em SEGUNDOS (a moeda de t/firstSeenS/geo.at).
// Molde: tools/daily-digest.mjs (os outros tools mantêm cópias próprias — a
// unificação deles ficou registrada como decisão em aberto da ideia K).
export function decode(v) {
  if (v === null || v === undefined) return null;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return Boolean(v.booleanValue);
  if ('stringValue' in v) return v.stringValue;
  if ('timestampValue' in v) return Math.floor(new Date(v.timestampValue).getTime() / 1000);
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decode);
  if ('mapValue' in v) {
    const out = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) out[k] = decode(val);
    return out;
  }
  return null;
}

// Letras-contador de runs[] — espelho de StorageManager.RUN_COUNTERS (que não
// pode ser importado aqui: localStorage). O teste assere que esta lista cobre
// TODAS as chaves de lá: letra nova gravada sem leitor aqui = teste vermelho.
export const RUN_LETTER_KEYS = ['w', 'r', 'o', 'a', 'j', 'd', 'x', 'p', 'f', 'n', 'b', 'q', 'z', 'e', 'h', 'l', 'u', 'y', 'i',
  // v1.9.5: as 7 de 2 caracteres — o alfabeto de 1 letra acabou no `i`
  'zu', 'zy', 'zl', 'qe', 'qu', 'qy', 'ql',
  // v1.10 Escola do Rino: o experimento viaja na corrida
  'fc', 'cj',
  // v1.12.1 Régua: a fricção entre uma corrida e a seguinte
  'rs', 'rt'];

// Significado curto de cada letra (imprime na cobertura do relatório)
export const RUN_LETTER_DESC = {
  w: 'paredes', r: 'rampas', o: 'torres', a: 'animais', j: 'pulos',
  d: 'investidas', x: 'inv. negadas', p: 'pausas', f: 'fúria usada',
  n: 'fúria negada na arena', b: 'camadas do portão', q: 'quiques do portão',
  z: 'segundos de luta (portão)', e: 'camadas do boss 2000m',
  h: 'segundos de luta (2000m)', l: 'camadas do Guardião',
  // v1.8.10 — os dois combates do deserto (As Areias do Tempo)
  u: 'camadas da Barreira (3650m)', y: 'camadas do Faraó (4700m)',
  // v1.9.2 — a sonda do cronômetro: segundos medidos pelo LOOP do jogo, para
  // comparar com o `s` (relógio de parede). Divergência grande entre os dois
  // é o bug do tempo encolhido de agosto/26.
  i: 'segundos pelo loop (vs `s` de parede)',
  // v1.9.5 — os chefes que eram cegos: ate aqui so o portao (`z`) e a
  // Muralha (`h`) tinham cronometro, e os quiques so existiam no portao
  zu: 'segundos de luta (Barreira 3650m)',
  zy: 'segundos de luta (Farao 4700m)',
  zl: 'segundos de luta (Cacador-Mor 9995m)',
  qe: 'quiques (Muralha)', qu: 'quiques (Barreira)',
  qy: 'quiques (Farao)', ql: 'quiques (Cacador-Mor)',
  fc: 'fator da curva do novato x100 (v1.10; ausente = veterano)',
  cj: 'pulos carregados (segurou >= CHARGED_JUMP_MIN_MS, v1.10)',
  // v1.12.1 — como a corrida COMECOU (o jogo era cego para isso)
  rs: 'origem do reinicio (bitmask: 1 botao, 2 share, 4 rolou extras)',
  rt: 'segundos entre a morte anterior e esta largada (so com rs&1)',
};

const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
const str = (v) => (typeof v === 'string' ? v : '');

// ------------------------------------------------------------------- semver
// Comparação NUMÉRICA parte a parte ('1.10.0' > '1.9.0' — string mentiria).
export function semverCmp(a, b) {
  const pa = String(a || '0').split('.').map((x) => parseInt(x, 10) || 0);
  const pb = String(b || '0').split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

// -------------------------------------------------------------- dia e semana
// 'AAAA-MM-DD' num fuso FIXO (o do resumo diário) — nunca o da máquina que
// roda, senão a mesma base geraria relatórios diferentes por timezone.
export function dayKeySeconds(epochS, tz = 'America/Sao_Paulo') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(num(epochS) * 1000));
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

// Índice de dias (para aritmética de retenção) e semana (segunda-feira)
const dayIndexOf = (dayKey) => {
  const [y, m, d] = String(dayKey).split('-').map((x) => parseInt(x, 10));
  return Math.floor(Date.UTC(y, (m || 1) - 1, d || 1) / 86400000);
};
const dayKeyOfIndex = (idx) => {
  const d = new Date(idx * 86400000);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
};
const weekKeyOf = (dayKey) => {
  const idx = dayIndexOf(dayKey);
  const dow = new Date(idx * 86400000).getUTCDay(); // 0=domingo
  return dayKeyOfIndex(idx - ((dow + 6) % 7)); // segunda-feira da semana
};

// -------------------------------------------------------------- estatística
// Mediana/quantis obrigatórios; média só onde a soma tem sentido físico
// (as distribuições daqui têm cauda pesada — um pico de 168 exec/dia
// destruiria qualquer média).
export function quantil(values, p) {
  const arr = values.filter((v) => typeof v === 'number' && isFinite(v)).slice().sort((a, b) => a - b);
  if (!arr.length) return 0;
  const idx = (arr.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return lo === hi ? arr[lo] : arr[lo] + (arr[hi] - arr[lo]) * (idx - lo);
}
export const mediana = (values) => quantil(values, 0.5);

// Spearman = correlação de postos (com empate por posto médio). É a régua
// registrada da pontuação composta: alvo >= 0,9 (§5-A das ideias).
export function spearman(pairs) {
  const n = pairs.length;
  if (n < 3) return null;
  const ranks = (vals) => {
    const idx = vals.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
    const out = new Array(n);
    let i = 0;
    while (i < n) {
      let j = i;
      while (j + 1 < n && idx[j + 1][0] === idx[i][0]) j++;
      const rank = (i + j) / 2 + 1; // posto médio do empate
      for (let k = i; k <= j; k++) out[idx[k][1]] = rank;
      i = j + 1;
    }
    return out;
  };
  const ra = ranks(pairs.map((p) => p[0]));
  const rb = ranks(pairs.map((p) => p[1]));
  const ma = ra.reduce((a, b) => a + b, 0) / n;
  const mb = rb.reduce((a, b) => a + b, 0) / n;
  let cov = 0; let va = 0; let vb = 0;
  for (let i = 0; i < n; i++) {
    cov += (ra[i] - ma) * (rb[i] - mb);
    va += (ra[i] - ma) ** 2;
    vb += (rb[i] - mb) ** 2;
  }
  return va && vb ? cov / Math.sqrt(va * vb) : null;
}

// ------------------------------------------------------------------ flatten
// A janela de runs[] achatada, com TODAS as letras (zero omitido = 0) e o
// número da tentativa reconstruído (attempts − runs.length + i + 1 — a mesma
// conta do painel). `era`: 'A' = ≤1.8.3 (abertura universal de 190 m),
// 'B' = ≥1.8.4 (roleta cheia aos 60 m da 3ª tentativa em diante), '?' = sem
// `v` na corrida e doc multi-era — densidade/curva NUNCA se comparam entre
// eras (ressalva §2.10 do documento).
export function flattenRuns(docs) {
  const out = [];
  for (const d of docs) {
    if (!Array.isArray(d.runs)) continue;
    const attempts = num(d.attempts);
    const base = attempts > d.runs.length ? attempts - d.runs.length : 0;
    const histVers = (d.history && d.history.versions && typeof d.history.versions === 'object')
      ? Object.keys(d.history.versions) : [];
    d.runs.forEach((run, i) => {
      if (!run || typeof run !== 'object') return;
      const row = {
        id: d.id,
        attemptIndex: base + i + 1,
        t: num(run.t), m: num(run.m), s: num(run.s),
        c: str(run.c), k: num(run.k), v: str(run.v), g: str(run.g),
      };
      for (const key of RUN_LETTER_KEYS) row[key] = num(run[key]);
      if (row.v) {
        row.era = semverCmp(row.v, '1.8.4') >= 0 ? 'B' : 'A';
      } else if (histVers.length && histVers.every((v) => semverCmp(v, '1.8.4') >= 0)) {
        row.era = 'B';
      } else if (histVers.length && histVers.every((v) => semverCmp(v, '1.8.4') < 0)) {
        row.era = 'A';
      } else {
        row.era = '?';
      }
      out.push(row);
    });
  }
  return out;
}

// ------------------------------------------------------- baseline congelada
// A fotografia de 16/08/2026 (§2 do documento), embutida como constante para
// todo relatório nascer com a coluna Δ. NUNCA reescrever — o §2 é datado por
// contrato; medição nova entra como seção nova ao lado dele.
export const BASELINE_20260816 = Object.freeze({
  quando: '2026-08-16',
  jogadores: 51, execucoes: 1810, fugas: 118, horasJogadas: 25.2,
  ranking: 45, recordeM: 5185,
  corridasJanela: 895, docsComHistory: 34, mensuraveisDias: 42,
  funilBestM: { 100: 46, 200: 41, 300: 34, 500: 33, 800: 22, 1000: 17, 1400: 7, 2000: 5, 3000: 3, 5000: 1, 10000: 0 },
  funilCorridas: { 100: 785, 200: 634, 300: 490, 500: 323, 800: 129, 1000: 61, 1400: 23, 2000: 10, 3000: 3, 5000: 1, 10000: 0 },
  posPortao: { n: 61, medianaM: 1224, p90M: 2336, maxM: 5185 },
  umDiaSo: 0.69, retorno2oDia: 0.31, corridasPorSessao: 4.6,
  curva15: { medianaM: 178, p90M: 607 },
  boss1: { lutas: 48, fullClear: 41, medianaS: 4, mortes: 6 },
  atritoDash: 0.39, precisaoMediana: 0.50, furiaNegada: 0,
  skinsJogadores: 5,
  bonusSimulado: { medianaPct: 0, p95Pct: 13.7, spearman: 0.993 },
});

// ------------------------------------------- segunda baseline congelada
// A fotografia de 05/09/2026 — o "antes" da revisão geral (3 feedbacks +
// queda de ritmo). Mesma disciplina da de 16/08: NUNCA reescrever. A de
// 16/08 responde "o que mudou desde o levantamento fundador"; esta responde
// "o que mudou desde a revisão", que é a pergunta das leituras de 12/09,
// 26/09 e 03/10. O JSON cru do dia vive em tools/snapshots/.
export const BASELINE_20260905 = Object.freeze({
  quando: '2026-09-05',
  jogadores: 75, execucoes: 2350, fugas: 131, horasJogadas: 30.9,
  ranking: 66, recordeM: 5185,
  corridasJanela: 1164, docsComHistory: 56, mensuraveisDias: 56,
  funilBestM: { 100: 64, 200: 55, 300: 46, 500: 41, 800: 25, 1000: 18, 1400: 8, 2000: 5, 3000: 4, 5000: 1, 10000: 0 },
  posPortao: { n: 57, medianaM: 1198, p90M: 2581, maxM: 5185 },
  umDiaSo: 0.57, retorno2oDia: 0.43, corridasPorSessao: 3.9,
  ritmo7d: { atual: 44, anterior: 235 },
  ativos7d: 12, ativos30d: 67,
  boss1: { lutas: 51, fullClear: 36, medianaS: 4, mortes: 20 },
  atritoDash: 0.64, precisaoMediana: 0.50, furiaNegada: 3,
  skinsJogadores: 21,
  // O corte manual de 05/09 que motivou o passe de legibilidade (F1): na
  // faixa 1000–1400 m o dardo TRIPLICA de participação nas mortes.
  dardo1000a1400: { participacao: 0.27, n: 37 },
  // Ainda não medidos em 05/09 (nascem com a v1.12.1) — ficam null para o
  // relatório dizer "sem baseline" em vez de inventar zero.
  latenciaPosMorteS: null, taxaRejogo: null, novosPorSrc: null,
});

// Marcas do funil — as MESMAS do §2.2, para comparação célula a célula
export const FUNIL_MARCAS = [100, 200, 300, 500, 800, 1000, 1400, 2000, 3000, 5000, 10000];

// v1.12.1 — bandas de distância com as fronteiras que IMPORTAM para leitura
// de conteúdo: os 5 trechos do zoo, os 3 distritos da cidade e o deserto.
// O heatmap do painel para em "1000m+" e o mapa `deaths` é vitalício sem
// distância: cruzar causa × lugar só era possível à mão (foi assim em 05/09).
export const BANDAS_DISTANCIA = [
  { rot: '0–200', de: 0, ate: 200 },
  { rot: '200–400', de: 200, ate: 400 },
  { rot: '400–600', de: 400, ate: 600 },
  { rot: '600–800', de: 600, ate: 800 },
  { rot: '800–1000', de: 800, ate: 1000 },
  { rot: '1000–1400 🚦', de: 1000, ate: 1400 },
  { rot: '1400–1800 📡', de: 1400, ate: 1800 },
  { rot: '1800–2200 🚨', de: 1800, ate: 2200 },
  { rot: '2200–3650 🐫', de: 2200, ate: 3650 },
  { rot: '3650+ 🏺', de: 3650, ate: Infinity },
];

export const CAUSAS_CONHECIDAS = ['wall', 'spike', 'animal', 'dart', 'tower',
  'boss', 'boss2', 'cerco', 'farao', 'boss3', 'fall', 'crash'];

// ------------------------------------------------------------- formatadores
const fmtInt = (n) => ScoreSystem.fmtNum(n);
const fmtDec = (v, d = 1) => (Number(v) || 0).toFixed(d).replace('.', ',');
const fmtPct = (v, d = 0) => `${fmtDec((Number(v) || 0) * 100, d)}%`;
const fmtDelta = (atual, base) => {
  const d = atual - base;
  return d === 0 ? '=' : (d > 0 ? `+${fmtInt(d)}` : `−${fmtInt(-d)}`);
};
const sortEntries = (obj, desc = true) => Object.entries(obj)
  .sort((a, b) => (desc ? b[1] - a[1] : a[1] - b[1]) || (a[0] < b[0] ? -1 : 1));

// ================================================================== NÚCLEO
export function radiografia({ stats = [], scores = [], challenges = [] } = {}, opts = {}) {
  const nowS = num(opts.nowS);
  if (!nowS) throw new Error('radiografia: opts.nowS é obrigatório (determinismo)');
  const tz = opts.tz || 'America/Sao_Paulo';
  const versaoJogo = opts.versaoJogo || Constants.VERSION;
  const hoje = dayKeySeconds(nowS, tz);
  const hojeIdx = dayIndexOf(hoje);
  const B = BASELINE_20260816;

  // Ordenação estável de entrada (a ordem de chegada do REST não é contrato)
  stats = stats.slice().sort((a, b) => (a.id < b.id ? -1 : 1));
  scores = scores.slice().sort((a, b) => (a.id < b.id ? -1 : 1));
  challenges = challenges.slice().sort((a, b) => (a.id < b.id ? -1 : 1));

  const runs = flattenRuns(stats);
  const nomes = new Map(scores.map((s) => [s.id, str(s.name)]));

  // ------------------------------------------------------------- 1. totais
  // Mesmas expressões do buildDigest (daily-digest.mjs) — é o que faz a
  // conferência do §3 ("os totais têm de bater com o npm run digest") valer.
  const totais = {
    jogadores: stats.length,
    execucoes: stats.reduce((a, d) => a + num(d.attempts), 0),
    fugas: stats.reduce((a, d) => a + num(d.wins), 0),
    horasJogadas: stats.reduce((a, d) => a + num(d.playTimeS), 0) / 3600,
    ranking: scores.length,
    recorde: scores.reduce((acc, s) => (num(s.score) > acc.score
      ? { score: num(s.score), m: num(ScoreSystem.metersOf(s)), nome: str(s.name) || '???' } : acc),
      { score: 0, m: 0, nome: '' }),
    maiorBestM: stats.reduce((a, d) => Math.max(a, num(d.bestM)), 0),
    corridasJanela: runs.length,
    docsComRuns: stats.filter((d) => Array.isArray(d.runs) && d.runs.length).length,
    docsComHistory: stats.filter((d) => d.history && d.history.days && typeof d.history.days === 'object'
      && Object.keys(d.history.days).length > 0).length,
  };

  // -------------------------------------------------------------- 2. funil
  const funilBestM = {};
  const funilCorridas = {};
  for (const marca of FUNIL_MARCAS) {
    funilBestM[marca] = stats.filter((d) => num(d.bestM) >= marca).length;
    funilCorridas[marca] = runs.filter((r) => r.m >= marca).length;
  }
  const posPortaoRuns = runs.filter((r) => r.m >= 1000).map((r) => r.m);
  const funil = {
    bestM: funilBestM,
    corridas: funilCorridas,
    posPortao: {
      n: posPortaoRuns.length,
      medianaM: Math.round(mediana(posPortaoRuns)),
      p90M: Math.round(quantil(posPortaoRuns, 0.9)),
      maxM: posPortaoRuns.length ? Math.max(...posPortaoRuns) : 0,
    },
    top5: stats
      .map((d) => ({ m: num(d.bestM), nome: nomes.get(d.id) || `(sem apelido ${String(d.id).slice(0, 6)}…)` }))
      .sort((a, b) => b.m - a.m || (a.nome < b.nome ? -1 : 1))
      .slice(0, 5),
  };

  // ------------------------------------------------- 3. aquisição/atividade
  const novosPorSemana = {};
  let semData = 0;
  for (const d of stats) {
    const first = num(d.history && d.history.firstSeenS);
    const fallback = Array.isArray(d.runs) && d.runs.length
      ? Math.min(...d.runs.map((r) => num(r && r.t)).filter((t) => t > 0)) : 0;
    const s = first || fallback;
    if (!s || !isFinite(s)) { semData++; continue; }
    const wk = weekKeyOf(dayKeySeconds(s, tz));
    novosPorSemana[wk] = (novosPorSemana[wk] || 0) + 1;
  }

  // Execuções/dia (últimos 14 dias): prefere history.days (contagem exata);
  // fallback pela janela SUBESTIMA dias com >50 corridas — contado à parte.
  const execPorDia = [];
  let diasComFallback = 0;
  for (let i = 13; i >= 0; i--) {
    const key = dayKeyOfIndex(hojeIdx - i);
    let exec = 0;
    let jogadores = 0;
    let usouFallback = false;
    for (const d of stats) {
      const days = d.history && d.history.days && typeof d.history.days === 'object' ? d.history.days : null;
      let r = 0;
      if (days && days[key]) {
        r = num(days[key].r);
      } else if (Array.isArray(d.runs)) {
        for (const run of d.runs) {
          if (run && dayKeySeconds(num(run.t), tz) === key) r++;
        }
        if (r > 0) usouFallback = true;
      }
      if (r > 0) { exec += r; jogadores++; }
    }
    if (usouFallback) diasComFallback++;
    execPorDia.push({ dia: key, exec, jogadores });
  }
  const ult7 = execPorDia.slice(7).reduce((a, d) => a + d.exec, 0);
  const ant7 = execPorDia.slice(0, 7).reduce((a, d) => a + d.exec, 0);

  const aquisicao = {
    // Ordem CRONOLÓGICA (por chave) — série temporal nunca ordena por valor
    novosPorSemana: Object.entries(novosPorSemana)
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([semana, n]) => ({ semana, n })),
    semData,
    execPorDia,
    diasComFallback,
    ritmo7d: { ult7, ant7, razao: ant7 > 0 ? ult7 / ant7 : null },
  };

  // ----------------------------------------------------------- 4. retenção
  const comDias = stats.filter((d) => d.history && d.history.days && typeof d.history.days === 'object'
    && Object.keys(d.history.days).length > 0);
  const distDias = { '1': 0, '2-3': 0, '4-7': 0, '8-14': 0, '15+': 0 };
  for (const d of comDias) {
    const n = Object.keys(d.history.days).length;
    if (n <= 1) distDias['1']++;
    else if (n <= 3) distDias['2-3']++;
    else if (n <= 7) distDias['4-7']++;
    else if (n <= 14) distDias['8-14']++;
    else distDias['15+']++;
  }
  const mensuraveis = comDias.length;
  const umDiaSo = mensuraveis ? distDias['1'] / mensuraveis : 0;

  // Coortes por semana de firstSeenS: D1/D7/D30 em dias de CALENDÁRIO.
  // days poda aos 60 — D30 só é honesto para coortes com <= 60 dias de idade.
  const coortesMap = {};
  for (const d of comDias) {
    const first = num(d.history.firstSeenS);
    if (!first) continue;
    const firstIdx = dayIndexOf(dayKeySeconds(first, tz));
    const played = Object.keys(d.history.days).map(dayIndexOf).sort((a, b) => a - b);
    const wk = weekKeyOf(dayKeySeconds(first, tz));
    const c = coortesMap[wk] || (coortesMap[wk] = {
      semana: wk, n: 0, d1: 0, d7: 0, d30: 0, elegD1: 0, elegD7: 0, elegD30: 0,
    });
    c.n++;
    const idade = hojeIdx - firstIdx;
    const voltouEm = (jan) => played.some((p) => p > firstIdx && p <= firstIdx + jan);
    if (idade >= 1) { c.elegD1++; if (voltouEm(1)) c.d1++; }
    if (idade >= 7) { c.elegD7++; if (voltouEm(7)) c.d7++; }
    if (idade >= 30 && idade <= 60) { c.elegD30++; if (voltouEm(30)) c.d30++; }
  }
  const retencao = {
    mensuraveis,
    distDias,
    umDiaSo,
    retorno2oDia: mensuraveis ? 1 - umDiaSo : 0,
    corridasPorSessao: (() => {
      let r = 0; let s = 0;
      for (const d of comDias) {
        for (const day of Object.values(d.history.days)) {
          r += num(day && day.r);
          s += num(day && day.s);
        }
      }
      return s > 0 ? r / s : 0;
    })(),
    coortes: Object.values(coortesMap).sort((a, b) => (a.semana < b.semana ? -1 : 1)),
  };

  // -------------------------------------------------- 5. curva de aprendizado
  const CURVA_FAIXAS = [[1, 5], [6, 15], [16, 30], [31, 50], [51, 100], [101, Infinity]];
  const curvaDe = (era) => CURVA_FAIXAS.map(([lo, hi]) => {
    const ms = runs.filter((r) => r.era === era && r.attemptIndex >= lo && r.attemptIndex <= hi).map((r) => r.m);
    return {
      faixa: hi === Infinity ? `${lo}+` : `${lo}–${hi}`,
      n: ms.length,
      medianaM: Math.round(mediana(ms)),
      p90M: Math.round(quantil(ms, 0.9)),
    };
  });
  const curva = {
    eraA: curvaDe('A'),
    eraB: curvaDe('B'),
    incertas: runs.filter((r) => r.era === '?').length,
    // Onboarding comparável entre eras: SÓ tentativas 1–3 (o roteiro de
    // abertura é preservado até a 3ª tentativa na era B)
    onboarding13B: (() => {
      const ms = runs.filter((r) => r.era === 'B' && r.attemptIndex <= 3).map((r) => r.m);
      return { n: ms.length, medianaM: Math.round(mediana(ms)), p90M: Math.round(quantil(ms, 0.9)) };
    })(),
  };

  // ------------------------------------------------------- 6. mecânicas
  const MEC_FAIXAS = [[0, 200], [200, 500], [500, 1000], [1000, 2000], [2000, Infinity]];
  const MEC_LETRAS = ['w', 'r', 'o', 'a', 'j', 'd', 'x'];
  const mecanicas = MEC_FAIXAS.map(([lo, hi]) => {
    const fr = runs.filter((r) => r.m >= lo && r.m < hi);
    const somaM = fr.reduce((a, r) => a + r.m, 0);
    const media = {};
    const por100m = {};
    for (const k of MEC_LETRAS) {
      const soma = fr.reduce((a, r) => a + r[k], 0);
      media[k] = fr.length ? soma / fr.length : 0;
      por100m[k] = somaM > 0 ? (soma / somaM) * 100 : 0;
    }
    return { faixa: hi === Infinity ? `${lo}+` : `${lo}–${hi}`, n: fr.length, media, por100m };
  });

  // ------------------------------------------------- 7. investida e pausas
  const comDash = runs.filter((r) => r.d > 0);
  const precisoes = comDash.map((r) => (r.w + r.r + r.o + r.a) / r.d);
  const totalD = runs.reduce((a, r) => a + r.d, 0);
  const totalX = runs.reduce((a, r) => a + r.x, 0);
  const investida = {
    corridasComDash: comDash.length,
    corridasComInput: runs.filter((r) => r.d + r.x > 0).length,
    precisao: { p10: quantil(precisoes, 0.1), mediana: mediana(precisoes), p90: quantil(precisoes, 0.9) },
    atrito: { negadas: totalX, disparadas: totalD, taxa: totalD + totalX > 0 ? totalX / (totalD + totalX) : 0 },
  };
  const comPausa = runs.filter((r) => r.p > 0);
  const pausas = {
    corridasComPausa: comPausa.length,
    totalCorridas: runs.length,
    medianaP: mediana(comPausa.map((r) => r.p)),
  };

  // ------------------------------------------------------------ 8. bosses
  const somaDeaths = (causa) => stats.reduce((a, d) => a + num(d.deaths && d.deaths[causa]), 0);
  const distDe = (letra, max) => {
    const dist = {};
    for (let i = 0; i <= max; i++) dist[i] = 0;
    return dist;
  };
  const lutasB1 = runs.filter((r) => r.z > 0);
  const distB1 = distDe('b', 3);
  for (const r of lutasB1) distB1[Math.min(r.b, 3)]++;
  const chegadasB2 = runs.filter((r) => r.m >= 2000 || r.e > 0 || r.h > 0 || r.c === 'boss2');
  const distB2 = distDe('e', 4);
  for (const r of chegadasB2) distB2[Math.min(r.e, 4)]++;
  // v1.9.5: mesma regra dos anteriores — chegou na ancora, quebrou camada,
  // marcou tempo de luta ou morreu ali.
  const chegadasBarreira = runs.filter((r) => r.m >= 3650 || r.u > 0 || r.zu > 0 || r.c === 'cerco');
  const distBarreira = distDe('u', 4);
  for (const r of chegadasBarreira) distBarreira[Math.min(r.u, 4)]++;
  const chegadasFarao = runs.filter((r) => r.m >= 4700 || r.y > 0 || r.zy > 0 || r.c === 'farao');
  const distFarao = distDe('y', 5);
  for (const r of chegadasFarao) distFarao[Math.min(r.y, 5)]++;
  const bosses = {
    b1: {
      lutas: lutasB1.length,
      dist: distB1,
      fullClear: lutasB1.filter((r) => r.b >= 3).length,
      medianaS: Math.round(mediana(lutasB1.map((r) => r.z))),
      mortes: somaDeaths('boss'),
      fugasJanela: runs.filter((r) => r.c === 'win' || r.m >= 1000).length,
    },
    b2: {
      chegadas: chegadasB2.length,
      dist: distB2,
      fullClear: chegadasB2.filter((r) => r.e >= 4).length,
      medianaS: Math.round(mediana(chegadasB2.filter((r) => r.h > 0).map((r) => r.h))),
      mortes: somaDeaths('boss2'),
    },
    // v1.9.5: a Barreira e o Farao existiam no jogo desde a v1.8.10 e NAO
    // tinham metrica nenhuma aqui — o relatorio pulava de b2 para b3. Com os
    // cronometros novos (`zu`/`zy`) da para separar "lutou e perdeu" de
    // "passou direto", que era exatamente a cegueira registrada na ideia M.
    barreira: {
      chegadas: chegadasBarreira.length,
      dist: distBarreira,
      fullClear: chegadasBarreira.filter((r) => r.u >= 4).length,
      medianaS: Math.round(mediana(chegadasBarreira.filter((r) => r.zu > 0).map((r) => r.zu))),
      mortes: somaDeaths('cerco'),
    },
    farao: {
      chegadas: chegadasFarao.length,
      dist: distFarao,
      fullClear: chegadasFarao.filter((r) => r.y >= 5).length,
      medianaS: Math.round(mediana(chegadasFarao.filter((r) => r.zy > 0).map((r) => r.zy))),
      mortes: somaDeaths('farao'),
    },
    b3: {
      corridasComCamada: runs.filter((r) => r.l > 0).length,
      medianaS: Math.round(mediana(runs.filter((r) => r.zl > 0).map((r) => r.zl))),
      mortes: somaDeaths('boss3'),
      lendas: runs.filter((r) => r.c === 'win' && r.m >= 10000).length,
    },
    furiaUsada: runs.filter((r) => r.f > 0).length,
    furiaNegada: runs.reduce((a, r) => a + r.n, 0),
  };

  // ------------------------------------------- 9. pontuação composta em campo
  const comScoreM = scores.filter((s) => typeof s.scoreM === 'number' && s.scoreM > 0);
  const bonusRankingPcts = comScoreM
    .filter((s) => num(s.score) >= num(s.scoreM))
    .map((s) => (num(s.score) - num(s.scoreM)) / num(s.score));
  const runsPts = runs.filter((r) => r.m > 0).map((r) => {
    const bonus = ScoreSystem.runBonus(r);
    const total = ScoreSystem.total(r.m, bonus);
    return { m: r.m, bonus, total, pct: total > 0 ? (total - r.m) / total : 0, v17: r.v && semverCmp(r.v, '1.7.0') >= 0 };
  });
  const runsPts17 = runsPts.filter((r) => r.v17);
  const pontuacao = {
    adocaoScoreM: { com: comScoreM.length, total: scores.length },
    bonusRanking: { n: bonusRankingPcts.length, medianaPct: mediana(bonusRankingPcts), p95Pct: quantil(bonusRankingPcts, 0.95) },
    bonusJanela: {
      n: runsPts.length,
      n17: runsPts17.length,
      medianaPct: mediana(runsPts17.map((r) => r.pct)),
      p95Pct: quantil(runsPts17.map((r) => r.pct), 0.95),
      capAtivo: runsPts.filter((r) => r.bonus > r.m).length,
    },
    spearman: spearman(runsPts.map((r) => [r.m, r.total])),
  };

  // -------------------------------------------------------------- 10. skins
  const porSkin = {};
  for (const r of runs) if (r.g) porSkin[r.g] = (porSkin[r.g] || 0) + 1;
  const podioSkin = {};
  for (const s of scores) if (str(s.skin) && s.skin !== 'default') podioSkin[s.skin] = (podioSkin[s.skin] || 0) + 1;
  const skins = {
    corridasComSkin: runs.filter((r) => r.g).length,
    porSkin,
    jogadoresComSkin: new Set(runs.filter((r) => r.g).map((r) => r.id)).size,
    podio: podioSkin,
  };

  // ------------------------------------------------------------ 11. desafios
  // Recusa NÃO é gravada (o "recusar" é só local) — impossível separar
  // "recusou" de "nunca viu". O criador nasce aceito: sempre descontado.
  let convites = 0;
  let aceites = 0;
  const latenciasH = [];
  const porDuracao = {};
  const porTamanho = {};
  const envolvidos = new Set();
  let ativos = 0;
  for (const c of challenges) {
    const fromId = str(c.from && c.from.id);
    const parts = Array.isArray(c.participants) ? c.participants.map(String) : [];
    const acc = (c.accepted && typeof c.accepted === 'object') ? c.accepted : {};
    if (num(c.endAt) > nowS) ativos++;
    const durD = Math.round((num(c.endAt) - num(c.startAt)) / 86400);
    porDuracao[`${durD}d`] = (porDuracao[`${durD}d`] || 0) + 1;
    porTamanho[parts.length] = (porTamanho[parts.length] || 0) + 1;
    for (const p of parts) if (!/^claude-/.test(p)) envolvidos.add(p);
    if (fromId) envolvidos.add(fromId);
    convites += parts.filter((p) => p !== fromId).length;
    for (const [id, atS] of Object.entries(acc)) {
      if (id === fromId) continue;
      aceites++;
      if (num(atS) >= num(c.startAt)) latenciasH.push((num(atS) - num(c.startAt)) / 3600);
    }
  }
  const desafios = {
    criados: challenges.length,
    ativos,
    expirados: challenges.length - ativos,
    porDuracao,
    porTamanho,
    convites,
    aceites,
    taxaAceite: convites > 0 ? aceites / convites : null,
    latenciaMedianaH: mediana(latenciasH),
    envolvidos: envolvidos.size,
  };

  // -------------------------------------------------------------- 12. mortes
  const mortes = { porTier: {}, porCausa: {} };
  for (const key of ['t1', 't2', 't3', 't4', 't5', 't6']) mortes.porTier[key] = somaDeaths(key);
  // v1.9.5: `cerco` e `farao` eram gravados desde a v1.8.10 e nunca
  // somados aqui — as mortes dos dois chefes do deserto nao apareciam
  // em relatorio nenhum.
  for (const key of ['wall', 'spike', 'animal', 'dart', 'tower', 'boss', 'boss2', 'cerco', 'farao', 'boss3', 'fall']) {
    mortes.porCausa[key] = somaDeaths(key);
  }

  // ------------------------------------------------------- 13. base/contexto
  const versoes = {};
  for (const d of stats) {
    const v = str(d.gameVersion) || '(sem versão)';
    versoes[v] = (versoes[v] || 0) + 1;
  }
  const preScoreM = stats.filter((d) => str(d.gameVersion) && semverCmp(d.gameVersion, '1.8.4') < 0).length;
  const preLetras = stats.filter((d) => str(d.gameVersion) && semverCmp(d.gameVersion, '1.6.1') < 0).length;
  const aparelhos = {};
  const paises = {};
  let standalone = 0;
  for (const d of stats) {
    const dev = d.client && str(d.client.device);
    if (dev) aparelhos[dev] = (aparelhos[dev] || 0) + 1;
    const pais = d.geo && str(d.geo.country);
    if (pais) paises[pais] = (paises[pais] || 0) + 1;
    if (d.standalone === true) standalone++;
  }
  const base = {
    versoes,
    preScoreM,
    preLetras,
    aparelhos,
    paises,
    standalone,
    teclado: runs.filter((r) => r.k > 0).length,
    ativos7d: stats.filter((d) => num(d.updatedAt) >= nowS - 7 * 86400).length,
    ativos30d: stats.filter((d) => num(d.updatedAt) >= nowS - 30 * 86400).length,
  };

  // ------------------------------------------------------ 14. cobertura/letras
  const cobertura = {};
  for (const key of RUN_LETTER_KEYS) cobertura[key] = runs.filter((r) => r[key] > 0).length;

  // ============================================ v1.12.1 "RÉGUA" — as seções
  // que faltavam para as leituras de 12/09 e 26/09 saírem do SCRIPT em vez
  // de conta avulsa. Todas cortam por `v` da corrida (nunca por firstSeen —
  // 52% dos aparelhos rodam versões velhas) e todas dizem o n.

  // O corte: default = a versão corrente. Uma corrida é "depois" quando o
  // `v` dela é ≥ corte; "antes" quando é menor; "?" quando não há `v` e o
  // histórico do doc não desempata (cliente pré-1.6.1).
  const corte = str(opts.corte) || versaoJogo;
  const ladoDoCorte = (r) => {
    if (r.v) return semverCmp(r.v, corte) >= 0 ? 'depois' : 'antes';
    return r.era === 'A' ? 'antes' : '?';
  };
  const fatiaCorte = (rows) => {
    const out = { antes: [], depois: [], indef: [] };
    for (const r of rows) {
      const lado = ladoDoCorte(r);
      if (lado === 'depois') out.depois.push(r);
      else if (lado === 'antes') out.antes.push(r);
      else out.indef.push(r);
    }
    return out;
  };

  // ------------------------------------ 15. Escola do Rino (pré-registrada)
  // As 5 métricas EXATAS do pré-registro (IDEIAS-FUTURAS §Escola). Honestidade
  // embutida: no ritmo de 1-2 novatos/semana a primária sai ⚪ — a seção existe
  // para o dia em que houver n, e para registrar o silêncio enquanto não houver.
  const porAparelho = new Map();
  for (const r of runs) {
    if (!porAparelho.has(r.id)) porAparelho.set(r.id, []);
    porAparelho.get(r.id).push(r);
  }
  const escolaLado = (rows) => {
    // (1) PRIMÁRIA — % de novatos que passam de 400 m em ≤10 tentativas.
    // "Novato" = aparelho com alguma corrida marcada pela curva (`fc`), que é
    // como cada corrida se autodescreve desde a v1.10; nas eras sem `fc` o
    // proxy é o próprio attemptIndex ≤ 10.
    const ids = new Set(rows.map((r) => r.id));
    let comJanela = 0;
    let passaram400 = 0;
    let vidasJ0 = 0;
    let vidasCedo = 0;
    for (const id of [...ids].sort()) {
      const doAparelho = rows.filter((r) => r.id === id);
      const dez = doAparelho.filter((r) => r.attemptIndex <= 10);
      if (dez.length >= 3) { // ⚪ para quem mal começou: 3 corridas visíveis
        comJanela++;
        if (dez.some((r) => r.m >= 400)) passaram400++;
      }
      const cinco = doAparelho.filter((r) => r.attemptIndex <= 5);
      for (const r of cinco) { vidasCedo++; if (r.j === 0) vidasJ0++; }
    }
    // (2) CURVA — a mediana das tentativas 16-30 tem de alcançar a das 1-5
    const medPorFaixa = (de, ate) => mediana(rows
      .filter((r) => r.attemptIndex >= de && r.attemptIndex <= ate).map((r) => r.m));
    const n15 = rows.filter((r) => r.attemptIndex <= 5).length;
    const n1630 = rows.filter((r) => r.attemptIndex >= 16 && r.attemptIndex <= 30).length;
    // (3) NEGAÇÃO DO DASH na faixa 0-200 m — a fricção que a v1.10 atacou
    const cedo = rows.filter((r) => r.m < 200);
    const negadas = cedo.reduce((a, r) => a + r.x, 0);
    const disparadas = cedo.reduce((a, r) => a + r.d, 0);
    // (5) GUARDA-CORPO — as corridas SEM `fc` são de veterano: a distribuição
    // delas tem de ficar INALTERADA (a promessa "bit-idêntico" da v1.10)
    const vet = rows.filter((r) => !r.fc);
    return {
      n: rows.length,
      primaria: {
        aparelhos: comJanela, passaram: passaram400,
        taxa: comJanela ? passaram400 / comJanela : null,
      },
      curva: { n15, medianaM15: medPorFaixa(1, 5), n1630, medianaM1630: medPorFaixa(16, 30) },
      dash0a200: {
        n: cedo.length, negadas, disparadas,
        taxa: (negadas + disparadas) ? negadas / (negadas + disparadas) : null,
      },
      semPular: { vidas: vidasCedo, comJ0: vidasJ0, taxa: vidasCedo ? vidasJ0 / vidasCedo : null },
      guardaCorpo: { n: vet.length, medianaM: mediana(vet.map((r) => r.m)), p90M: quantil(vet.map((r) => r.m), 0.9) },
    };
  };
  // O corte da ESCOLA é o da release medida (v1.10.0), não o da versão
  // corrente: a pergunta pré-registrada é "a Escola desinverteu a curva?".
  // O corte genérico (`corte`) responde outra pergunta — "o que mudou na
  // última release" — e governa as demais seções novas.
  const corteEscola = str(opts.corteEscola) || '1.10.0';
  const ladoEscola = (r) => {
    if (r.v) return semverCmp(r.v, corteEscola) >= 0 ? 'depois' : 'antes';
    return r.era === 'A' ? 'antes' : '?';
  };
  const fatiaEscola = { antes: [], depois: [], indef: [] };
  for (const r of runs) {
    const lado = ladoEscola(r);
    if (lado === 'depois') fatiaEscola.depois.push(r);
    else if (lado === 'antes') fatiaEscola.antes.push(r);
    else fatiaEscola.indef.push(r);
  }
  const escola = {
    corte: corteEscola,
    antes: escolaLado(fatiaEscola.antes),
    depois: escolaLado(fatiaEscola.depois),
    indefinidas: fatiaEscola.indef.length,
    // Mínimos declarados ANTES de olhar o número (pré-registro é isso)
    minimos: { primaria: 15, curva: 15, dash: 40, semPular: 20, guardaCorpo: 40 },
  };

  // ------------------------------------------------- 16. Streaks (v1.11)
  // Recomputados do `history.days` com a MESMA regra do cliente ("ontem
  // mantém a chama"): o streak nunca sobe ao servidor, então a única forma de
  // medir a alavanca F é reconstruí-la aqui.
  const streakDe = (dias) => {
    const chaves = Object.keys(dias || {}).filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
    if (!chaves.length) return { atual: 0, melhor: 0 };
    const set = new Set(chaves);
    let melhor = 0;
    let corrida = 0;
    let anterior = null;
    for (const k of chaves) {
      corrida = (anterior && dayIndexOf(k) === dayIndexOf(anterior) + 1) ? corrida + 1 : 1;
      if (corrida > melhor) melhor = corrida;
      anterior = k;
    }
    // Corrente: conta para trás a partir de hoje ou de ontem (a graça)
    let ancora = null;
    if (set.has(hoje)) ancora = hoje;
    else if (set.has(dayKeyOfIndex(hojeIdx - 1))) ancora = dayKeyOfIndex(hojeIdx - 1);
    let atual = 0;
    if (ancora) {
      let idx = dayIndexOf(ancora);
      while (set.has(dayKeyOfIndex(idx))) { atual++; idx--; }
    }
    return { atual, melhor };
  };
  const streaksPorDoc = stats
    .filter((d) => d.history && d.history.days && Object.keys(d.history.days).length)
    .map((d) => ({ id: d.id, ...streakDe(d.history.days), ativo: num(d.updatedAt) >= nowS - 7 * 86400 }));
  const streaks = {
    mensuraveis: streaksPorDoc.length,
    atualDist: { um: 0, doisTres: 0, quatroSeis: 0, seteMais: 0 },
    melhor3: streaksPorDoc.filter((s) => s.melhor >= 3).length,
    melhor7: streaksPorDoc.filter((s) => s.melhor >= 7).length,
    melhor30: streaksPorDoc.filter((s) => s.melhor >= 30).length,
    ativosComChama: streaksPorDoc.filter((s) => s.ativo && s.atual >= 2).length,
    ativos: streaksPorDoc.filter((s) => s.ativo).length,
    maiorMelhor: streaksPorDoc.reduce((a, s) => Math.max(a, s.melhor), 0),
    // Coorte da v1.11 (publicada 30/08) vs anteriores — só existência até n≥15
    coorte: { novos: 0, novosVoltaram: 0, antigos: 0, antigosVoltaram: 0 },
  };
  for (const s of streaksPorDoc) {
    if (s.atual >= 7) streaks.atualDist.seteMais++;
    else if (s.atual >= 4) streaks.atualDist.quatroSeis++;
    else if (s.atual >= 2) streaks.atualDist.doisTres++;
    else if (s.atual === 1) streaks.atualDist.um++;
  }
  const CORTE_STREAK_S = Math.floor(new Date('2026-08-30T00:00:00Z').getTime() / 1000);
  for (const d of stats) {
    if (!d.history || !d.history.days) continue;
    const nDias = Object.keys(d.history.days).length;
    const novo = num(d.history.firstSeenS) >= CORTE_STREAK_S;
    if (novo) { streaks.coorte.novos++; if (nDias >= 2) streaks.coorte.novosVoltaram++; } else { streaks.coorte.antigos++; if (nDias >= 2) streaks.coorte.antigosVoltaram++; }
  }

  // -------------------------------------- 17. Causa × lugar (o corte de 05/09)
  // O mapa `deaths` é vitalício e sem distância; o heatmap do painel para em
  // "1000m+". Isto cruza as duas coisas na janela, com as fronteiras dos
  // distritos — é a seção que enxerga o dardo do Subúrbio (F1).
  const causaLugar = BANDAS_DISTANCIA.map((b) => {
    const naBanda = runs.filter((r) => r.m >= b.de && r.m < b.ate);
    const porCausa = {};
    for (const c of CAUSAS_CONHECIDAS) porCausa[c] = naBanda.filter((r) => r.c === c).length;
    const semCausa = naBanda.filter((r) => !r.c || !CAUSAS_CONHECIDAS.includes(r.c)).length;
    const top = sortEntries(porCausa)[0];
    return {
      faixa: b.rot, n: naBanda.length, porCausa, semCausa,
      topCausa: top && top[1] > 0 ? top[0] : null,
      topPart: (top && naBanda.length) ? top[1] / naBanda.length : null,
      // o mesmo recorte, só nas corridas da versão corrente (a leitura por `v`)
      nDepois: fatiaCorte(naBanda).depois.length,
      dartDepois: fatiaCorte(naBanda).depois.filter((r) => r.c === 'dart').length,
    };
  });

  // ----------------------------------------- 18. Fricção pós-morte (UI)
  // Duas leituras: a RECONSTRUÍDA (pares consecutivos de runs[] do mesmo
  // aparelho — funciona no passado inteiro, mas mistura pausa longa com
  // "foi embora") e a MEDIDA (letras rs/rt da v1.12.1, que só existem daqui
  // para frente e sabem se veio do botão).
  const paresLatencia = [];
  for (const [, lista] of [...porAparelho.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const ord = lista.slice().sort((a, b) => a.t - b.t);
    for (let i = 1; i < ord.length; i++) {
      const fim = ord[i - 1].t;
      const largada = ord[i].t - ord[i].s;
      const dt = largada - fim;
      // Só conta o par quando os DOIS relógios existem: sem `s` (corridas
      // pré-1.6) a largada é indeterminável, e aceitar isso encheria a série
      // de zeros falsos. dt < 0 = timestamps sintéticos/embaralhados; > 1 h
      // não é "só mais uma", é outra sessão.
      if (fim > 0 && ord[i].t > 0 && ord[i].s > 0 && dt >= 0 && dt < 3600) {
        paresLatencia.push({ dt, v: ord[i].v });
      }
    }
  }
  const comRs = runs.filter((r) => r.rs > 0);
  const friccao = {
    pares: paresLatencia.length,
    medianaS: mediana(paresLatencia.map((p) => p.dt)),
    ate60s: paresLatencia.length
      ? paresLatencia.filter((p) => p.dt <= 60).length / paresLatencia.length : null,
    medido: {
      n: comRs.length,
      viaBotao: runs.filter((r) => r.rs & 1).length,
      comShare: runs.filter((r) => r.rs & 2).length,
      rolouExtras: runs.filter((r) => r.rs & 4).length,
      medianaRtS: mediana(runs.filter((r) => r.rt > 0).map((r) => r.rt)),
    },
    // Classe de viewport: o overflow do fim de corrida estoura em lado curto
    // ≤ 520 px CSS — é a população que o F3 conserta. O `screen` do cliente
    // vem como "402x874@3" (o @dpr faz parte do formato desde a v1.6.1).
    telaCurta: stats.filter((d) => {
      const m = /^(\d+)[x×](\d+)/.exec(str(d.client && d.client.screen));
      return m ? Math.min(+m[1], +m[2]) <= 520 : false;
    }).length,
    telaConhecida: stats.filter((d) => /^\d+[x×]\d+/.test(str(d.client && d.client.screen))).length,
  };

  // --------------------------------------------- 19. Atribuição (origem)
  const atribuicao = { porSrc: {}, semSrc: 0, novos7d: { link: 0, org: 0, sem: 0 } };
  for (const d of stats) {
    const src = (d.history && str(d.history.src)) || '';
    if (src) atribuicao.porSrc[src] = (atribuicao.porSrc[src] || 0) + 1;
    else atribuicao.semSrc++;
    if (num(d.history && d.history.firstSeenS) >= nowS - 7 * 86400) {
      const balde = src === 'link' ? 'link' : (src ? 'org' : 'sem');
      atribuicao.novos7d[balde]++;
    }
  }

  const metricas = {
    totais, funil, aquisicao, retencao, curva, mecanicas, investida, pausas,
    bosses, pontuacao, skins, desafios, mortes, base, cobertura,
    escola, streaks, causaLugar, friccao, atribuicao,
  };

  const insights = buildInsights(metricas, { B, anterior: opts.anterior || null, versaoJogo, corte });
  const meta = {
    geradoEmS: nowS,
    dia: hoje,
    versaoScript: '1.1.0',
    versaoJogo,
    baseline: B.quando,
    // v1.12.1: a segunda baseline (o "antes" da revisão geral) e o corte de
    // versão que TODA seção nova respeita
    baseline2: BASELINE_20260905.quando,
    corte,
    origem: opts.origem || 'cli',
    // Mesmos Σ do buildDigest — a linha de conferência do §3
    conferenciaDigest: { jogadores: totais.jogadores, execucoes: totais.execucoes, fugas: totais.fugas },
  };
  const markdown = buildMarkdown(meta, metricas, insights);
  return { meta, metricas, insights, markdown };
}

// =========================================================== MOTOR DE INSIGHTS
// Regras determinísticas no molde do §4: cada uma com gatilho numérico,
// AMOSTRA MÍNIMA (abaixo dela sai "⚪ amostra insuficiente" — nunca silêncio)
// e texto em 3 partes: o dado → o problema (ou a vitória) → a sugestão,
// apontando a ideia do banco que ataca aquilo. Com n≈51 jogadores o IC95 de
// uma proporção é ±14 p.p. — deltas menores são SINAL, não prova, e os
// textos dizem isso.
const SEV_ORDEM = { critico: 0, atencao: 1, observar: 2, vitoria: 3, 'sem-amostra': 4 };
const SEV_ICONE = { critico: '🔴', atencao: '🟠', observar: '🟡', vitoria: '🟢', 'sem-amostra': '⚪' };

function buildInsights(M, { B, anterior, versaoJogo }) {
  const out = [];
  const add = (id, titulo, min, n, corpo) => {
    if (n < min) {
      out.push({ id, sev: 'sem-amostra', titulo, dado: `n=${n} (mínimo ${min}) — sem base para afirmar; o motivo do silêncio fica registrado.`, problema: '', sugestao: '', n, min });
      return;
    }
    const r = corpo();
    if (r) out.push({ id, titulo, n, min, ...r });
  };
  const pp = (v) => `${fmtDec(v * 100, 0)} p.p.`;

  // R-01 retenção estrutural (crônica desde 16/08 — só escala em piora)
  add('R-01', 'Retenção: jogadores de um dia só', 30, M.retencao.mensuraveis, () => {
    const v = M.retencao.umDiaSo;
    if (v >= 0.60) {
      const piorou = v > B.umDiaSo + 0.05;
      return {
        sev: piorou ? 'critico' : 'observar',
        dado: `${M.retencao.distDias['1']} de ${M.retencao.mensuraveis} mensuráveis (${fmtPct(v)}) jogaram um único dia — baseline 69%.`,
        problema: piorou ? 'Piorou além do ruído (IC95 ±14 p.p.): o problema nº 1 do §4 está crescendo.'
          : 'Crônico e conhecido desde 16/08 (§4.1) — segue sendo o problema nº 1, sem piora mensurável.',
        sugestao: 'As alavancas desenhadas são E (campanha), F (streaks) e I (arena, já no ar) — medir se I moveu este número antes de puxar as outras.',
      };
    }
    return {
      sev: 'vitoria',
      dado: `${fmtPct(v)} de um dia só — era 69% na baseline.`,
      problema: 'O problema nº 1 do levantamento cedeu (queda além de qualquer ajuste fino).',
      sugestao: 'Identificar o que mudou desde 16/08 (v1.8.4–1.8.6) e dobrar a aposta.',
    };
  });

  // R-02 retorno ao 2º dia (Δ vs baseline)
  add('R-02', 'Retorno ao segundo dia', 30, M.retencao.mensuraveis, () => {
    const v = M.retencao.retorno2oDia;
    const d = v - B.retorno2oDia;
    if (Math.abs(d) < 0.05) return null; // dentro do ruído — não afirmar nada
    return {
      sev: d > 0 ? 'vitoria' : 'atencao',
      dado: `${fmtPct(v)} voltaram ao menos um segundo dia (baseline 31%; Δ ${d > 0 ? '+' : '−'}${pp(Math.abs(d))}).`,
      problema: d > 0 ? 'Movimento na direção certa — mas com n≈50 é sinal, não prova (IC95 ±14 p.p.).'
        : 'Queda além de 5 p.p. — sinal de piora, não prova (IC95 ±14 p.p.).',
      sugestao: 'Cruzar com a data das releases; repetir a leitura em 2 semanas antes de reagir.',
    };
  });

  // R-03 aquisição parada
  add('R-03', 'Aquisição de jogadores novos', 1, M.aquisicao.novosPorSemana.length, () => {
    const semanas = M.aquisicao.novosPorSemana;
    const ultima = semanas.length >= 2 ? semanas[semanas.length - 2] : null; // última semana CHEIA
    if (!ultima) return null;
    if (ultima.n >= 3) {
      return {
        sev: 'vitoria',
        dado: `${ultima.n} novos na última semana cheia (${ultima.semana}).`,
        problema: 'A aquisição, parada desde §4.2, voltou a respirar.',
        sugestao: 'Descobrir a origem (convite? desafio por link G?) e alimentar o canal.',
      };
    }
    return {
      sev: ultima.n === 0 ? 'critico' : 'atencao',
      dado: `${ultima.n} novo(s) na última semana cheia (${ultima.semana}) — pico histórico: 30/semana (03/08).`,
      problema: 'Todo crescimento veio de convite pessoal e o canal secou (§4.2).',
      sugestao: 'A única alavanca de aquisição desenhada é a ideia G (desafio por link no WhatsApp).',
    };
  });

  // R-04 ritmo de execuções em queda (mínimo: 8 dos 14 dias com atividade —
  // série mais curta não separa "esfriou" de "acabou de nascer")
  add('R-04', 'Ritmo de jogo (últimos 7 dias vs 7 anteriores)',
    8, M.aquisicao.execPorDia.filter((d) => d.exec > 0).length, () => {
    const { ult7, ant7, razao } = M.aquisicao.ritmo7d;
    if (razao === null || razao >= 0.5) return null;
    return {
      sev: 'atencao',
      dado: `${fmtInt(ult7)} execuções nos últimos 7 dias vs ${fmtInt(ant7)} nos 7 anteriores (${fmtPct(razao)}).`,
      problema: 'A base ativa esfriou à metade — atenção à janela de 50: parte pode ser rotação, o history.days aqui é contagem exata.',
      sugestao: 'Se não houver release recente para reengajar, é o momento de puxar uma ideia de retenção (E/F).',
    };
  });

  // R-05 o deserto pós-2000m
  add('R-05', 'O deserto depois dos 2000 m', 300, M.totais.corridasJanela, () => {
    const pct2000 = M.totais.corridasJanela ? M.funil.corridas[2000] / M.totais.corridasJanela : 0;
    if (pct2000 > 0.02 || M.funil.bestM[2000] > B.funilBestM[2000]) {
      if (M.funil.bestM[2000] > B.funilBestM[2000]) {
        return {
          sev: 'vitoria',
          dado: `${M.funil.bestM[2000]} aparelhos já passaram dos 2000 m (baseline: 5).`,
          problema: 'O paredão dos 2000 m começou a ceder.',
          sugestao: 'Medir o funil fino (ideia H) e acompanhar o boss dos 2000 m de perto.',
        };
      }
      return null;
    }
    return {
      sev: 'atencao',
      dado: `${M.funil.corridas[2000]} corridas (${fmtPct(pct2000, 1)}) passaram dos 2000 m; mediana pós-portão ${fmtInt(M.funil.posPortao.medianaM)} m (baseline 1.224 m).`,
      problema: 'O deserto do §4.3 segue intacto: quem vence o portão não tem próximo objetivo alcançável.',
      sugestao: 'As ideias J (cidade em 3 distritos) e H (funil fino no /?stats) atacam exatamente isto.',
    };
  });

  // R-06 boss do portão como pedágio
  add('R-06', 'Boss do portão: pedágio ou clímax?', 20, M.bosses.b1.lutas, () => {
    const b1 = M.bosses.b1;
    const full = b1.lutas ? b1.fullClear / b1.lutas : 0;
    const mortesRatio = b1.lutas ? b1.mortes / b1.lutas : 0;
    if (full >= 0.8 && b1.medianaS <= 8 && mortesRatio <= 0.15) {
      const piorou = full > 41 / 48 && b1.medianaS <= 4;
      return {
        sev: piorou ? 'atencao' : 'observar',
        dado: `${b1.fullClear} de ${b1.lutas} lutas com full-clear (${fmtPct(full)}), mediana ${b1.medianaS} s, ${b1.mortes} mortes.`,
        problema: 'Diagnóstico conhecido (§4.4): o portão é pedágio, não clímax.',
        sugestao: 'Qualquer redesenho de boss novo (ideia J) deve mirar mortes > 6 e mediana de luta > 8 s.',
      };
    }
    return null;
  });

  // R-07 boss dos 2000m: pedágio OU muro
  add('R-07', 'Boss dos 2000 m (letras e/h)', 15, M.bosses.b2.chegadas, () => {
    const b2 = M.bosses.b2;
    const full = b2.chegadas ? b2.fullClear / b2.chegadas : 0;
    if (full >= 0.8 && b2.medianaS <= 8) {
      return {
        sev: 'atencao',
        dado: `${b2.fullClear} de ${b2.chegadas} chegadas com as 4 camadas (mediana ${b2.medianaS} s, ${b2.mortes} mortes).`,
        problema: 'O segundo boss está repetindo o destino do portão: pedágio.',
        sugestao: 'Rever cadência/telegraphs da def antes de investir no 3º boss; meta da ideia J: mortes > 6.',
      };
    }
    if (b2.chegadas && b2.mortes / b2.chegadas >= 0.7) {
      return {
        sev: 'atencao',
        dado: `${b2.mortes} mortes em ${b2.chegadas} chegadas (${fmtPct(b2.mortes / b2.chegadas)}).`,
        problema: 'O boss dos 2000 m está operando como MURO — filosofia da casa é "justo, telegrafado, nunca muro de morte".',
        sugestao: 'Aliviar a última camada ou o enrage; validar com o funil fino (ideia H).',
      };
    }
    return {
      sev: 'vitoria',
      dado: `${b2.chegadas} chegadas · full-clear ${fmtPct(full)} · mediana ${b2.medianaS} s · ${b2.mortes} mortes.`,
      problema: 'Nem pedágio nem muro: o boss dos 2000 m está no meio-termo que o portão nunca teve.',
      sugestao: 'Registrar estes números como baseline do segundo boss.',
    };
  });

  // R-08 atrito do cooldown
  add('R-08', 'Atrito do cooldown da investida', 100, M.investida.corridasComInput, () => {
    const taxa = M.investida.atrito.taxa;
    if (taxa < 0.35) return null;
    return {
      sev: taxa >= 0.45 || taxa >= B.atritoDash + 0.06 ? 'atencao' : 'observar',
      dado: `${fmtInt(M.investida.atrito.negadas)} investidas negadas vs ${fmtInt(M.investida.atrito.disparadas)} disparadas (${fmtPct(taxa)}; baseline 39%).`,
      problema: 'A única fricção presente em TODAS as faixas de distância (§4.5) — não é defeito por si (o cooldown dá peso à investida), mas subiu.',
      sugestao: 'Antes de mexer no cooldown, medir a precisão exata (a letra livre `i` é a correção definitiva do proxy).',
    };
  });

  // R-09 precisão de investida
  add('R-09', 'Precisão de investida (proxy)', 100, M.investida.corridasComDash, () => {
    const med = M.investida.precisao.mediana;
    if (med >= 0.40) return null;
    return {
      sev: 'observar',
      dado: `Mediana de ${fmtPct(med)} acertos/investida (baseline 50%). Proxy: fúria e multi-quebra superestimam.`,
      problema: 'Metade dos toques de investida não acerta nada — spam ou leitura ruim de alcance.',
      sugestao: 'Sinalizar melhor o alcance da investida; medir de novo antes de qualquer nerf.',
    };
  });

  // R-10 skins invisíveis
  add('R-10', 'Adoção de skins', 30, M.totais.docsComRuns, () => {
    const share = M.totais.docsComRuns ? M.skins.jogadoresComSkin / M.totais.docsComRuns : 0;
    if (share >= 0.20) {
      return {
        sev: 'vitoria',
        dado: `${M.skins.jogadoresComSkin} de ${M.totais.docsComRuns} jogadores com corrida de skin não-default (${fmtPct(share)}; baseline ≈10%).`,
        problema: 'A adoção dobrou desde a baseline.',
        sugestao: 'Manter a esteira de skins de façanha.',
      };
    }
    if (share < 0.15) {
      return {
        sev: 'atencao',
        dado: `${M.skins.jogadoresComSkin} de ${M.totais.docsComRuns} jogadores usaram skin (${fmtPct(share)}).`,
        problema: 'Muito sistema (registry, estúdio, desbloqueio) para pouquíssimo alcance — problema de descoberta e de motivo, não de conteúdo (§4.6).',
        sugestao: 'Anunciar skin bloqueada no guarda-roupa/pódio antes de produzir skin nova.',
      };
    }
    return null;
  });

  // R-11 base presa no passado
  add('R-11', 'Versões velhas na base', 30, M.totais.jogadores, () => {
    const pctPreScoreM = M.totais.jogadores ? M.base.preScoreM / M.totais.jogadores : 0;
    return {
      sev: pctPreScoreM >= 0.25 ? 'observar' : 'vitoria',
      dado: `${M.base.preScoreM} de ${M.totais.jogadores} aparelhos (${fmtPct(pctPreScoreM)}) na última visita rodavam < 1.8.4 (gravam score sem scoreM); ${M.base.preLetras} ainda < 1.6.1 (sem letras).`,
      problema: pctPreScoreM >= 0.25
        ? 'Clientes que talvez nunca atualizem (§4.7): qualquer mudança de contrato de dados tem de continuar aceitando a forma velha.'
        : 'A maioria da base ativa já vê a versão corrente.',
      sugestao: `Manter a regra da casa: retrocompatibilidade sem migração (versão corrente: ${versaoJogo}).`,
    };
  });

  // R-12 pontuação composta: o campo vs a simulação
  add('R-12', 'Pontuação composta em campo', 200, M.pontuacao.bonusJanela.n17, () => {
    const p95 = M.pontuacao.bonusJanela.p95Pct * 100;
    const medianaP = M.pontuacao.bonusJanela.medianaPct * 100;
    const rho = M.pontuacao.spearman;
    if (rho !== null && rho < 0.9) {
      return {
        sev: 'critico',
        dado: `Spearman metros × total = ${fmtDec(rho, 3)} (alvo documentado ≥ 0,9; simulação: 0,993).`,
        problema: 'O ranking deixou de ser "distância com desempate por habilidade" — a fórmula virou outra coisa.',
        sugestao: 'Recalibrar SCORE_WEIGHTS (sliders do ?debug=1) antes de qualquer outra mudança de pontuação.',
      };
    }
    if (p95 > 25) {
      return {
        sev: 'atencao',
        dado: `Bônus/total p95 = ${fmtDec(p95, 1)}% (alvo documentado: p95 ≤ 25%; simulação: 13,7%).`,
        problema: 'O bônus em campo pesa mais do que a simulação previa.',
        sugestao: 'Recalibrar os pesos; conferir se o cap (R-13) está agindo.',
      };
    }
    return {
      sev: 'vitoria',
      dado: `Bônus/total: mediana ${fmtDec(medianaP, 1)}% · p95 ${fmtDec(p95, 1)}% (alvos: mediana 8–15%, p95 ≤ 25%) · Spearman ${rho === null ? '—' : fmtDec(rho, 3)}.`,
      problema: `O campo confirmou a simulação de 16/08 no p95. Nota crônica: a mediana simulada já nascera em 0%, fora do alvo 8–15% — o bônus só existe onde há combate.`,
      sugestao: 'A parcela adiada (eficiência de investida, §5-A) é o caminho registrado para subir a mediana com segurança.',
    };
  });

  // R-13 cap de bônus agindo (na simulação: nunca agiu)
  add('R-13', 'Teto do bônus (bonus ≤ m)', 200, M.pontuacao.bonusJanela.n, () => {
    const capA = M.pontuacao.bonusJanela.capAtivo;
    if (capA / M.pontuacao.bonusJanela.n <= 0.01) return null;
    return {
      sev: 'atencao',
      dado: `O teto agiu em ${capA} de ${fmtInt(M.pontuacao.bonusJanela.n)} corridas (${fmtPct(capA / M.pontuacao.bonusJanela.n, 1)}) — na simulação de 16/08, em nenhuma.`,
      problema: 'Comportamento novo: corrida curta com farm de combate encostando no teto.',
      sugestao: 'Olhar as corridas capadas antes de julgar — pode ser exploit, pode ser estilo de jogo novo.',
    };
  });

  // R-14 arena de desafios
  add('R-14', 'Arena de Desafios (v1.8.6)', 5, M.desafios.criados, () => {
    const taxa = M.desafios.taxaAceite;
    if (taxa !== null && taxa >= 0.7) {
      return {
        sev: 'vitoria',
        dado: `${M.desafios.criados} desafios criados, aceite ${fmtPct(taxa)}, ${M.desafios.envolvidos} jogadores envolvidos.`,
        problema: 'A arena pegou: pressão social por prazo funcionando.',
        sugestao: 'Considerar a revanche a um toque (ficou de fora da v1.8.6).',
      };
    }
    return {
      sev: 'atencao',
      dado: `${M.desafios.criados} desafios, aceite ${taxa === null ? '—' : fmtPct(taxa)} (recusa não é gravada: parte pode ser "nunca viu").`,
      problema: 'A arena está morna — o motivo social de voltar amanhã não está circulando.',
      sugestao: 'Dar visibilidade ao botão ⚔️ do top 10; a ideia G (desafio por link) seria a porta de entrada.',
    };
  });

  // R-15 fúria negada na arena (evento, não taxa)
  add('R-15', 'Fúria negada na arena de boss (letra n)', 1, 1, () => {
    const n = M.bosses.furiaNegada;
    if (n === 0) return null;
    const taxaLutas = M.bosses.b1.lutas ? n / M.bosses.b1.lutas : 0;
    return {
      sev: taxaLutas > 0.05 ? 'atencao' : 'observar',
      dado: `${n} ativações de fúria negadas dentro de arena (baseline: 0).`,
      problema: 'Jogadores voltaram a tentar o truque antigo de estourar a fúria no boss.',
      sugestao: 'Se crescer, reforçar o feedback visual de "fúria bloqueada aqui".',
    };
  });

  // R-16 onboarding pós-veterania (SÓ tentativas 1–3 — comparável entre eras)
  add('R-16', 'Onboarding (tentativas 1–3, era ≥1.8.4)', 40, M.curva.onboarding13B.n, () => {
    const med = M.curva.onboarding13B.medianaM;
    if (med >= 150) return null;
    return {
      sev: 'atencao',
      dado: `Mediana de ${fmtInt(med)} m nas tentativas 1–3 da era atual (baseline 1–5 da era anterior: 178 m — réguas próximas, não idênticas).`,
      problema: 'O primeiro contato piorou — e as 3 primeiras tentativas ainda têm a abertura roteirizada, então não é a roleta.',
      sugestao: 'Rever o que mudou na faixa 0–200 m desde a última release.',
    };
  });

  // ---------------------------------------- v1.12.1: as regras da revisão
  // R-18 o dardo do Subúrbio — a assinatura numérica do feedback F1
  // ("cenário confunde com inimigo"): na cidade noturna o dardo passa de 7%
  // para 27% das mortes. A régua vale para a faixa 1000–1400 m.
  const bandaSub = (M.causaLugar || []).find((b) => b.faixa.startsWith('1000–1400')) || { n: 0, porCausa: {} };
  add('R-18', 'Legibilidade da cidade: o dardo no Subúrbio', 15, bandaSub.n, () => {
    const part = bandaSub.n ? (bandaSub.porCausa.dart || 0) / bandaSub.n : 0;
    if (part < 0.2) {
      return {
        sev: 'vitoria',
        dado: `Dardo em ${fmtPct(part)} das mortes de 1000–1400 m (n=${bandaSub.n}; em 05/09 eram 27%).`,
        problema: 'A torre voltou a ser lida na cidade escura.',
        sugestao: 'Registrar a versão que fez isso — e conferir se o resto da faixa não piorou no lugar.',
      };
    }
    return {
      sev: 'atencao',
      dado: `Dardo responde por ${fmtPct(part)} das mortes de 1000–1400 m (n=${bandaSub.n}) — no zoo inteiro é ~7%.`,
      problema: 'É a assinatura do F1: torre de dardo como poste entre postes, inimigo escuro sobre fundo escuro tintado pela noite.',
      sugestao: 'Passe de legibilidade (rim claro nos inimigos, reserva de matiz, torre com assinatura própria) — e comparar por `v`.',
    };
  });

  // R-19 fricção pós-morte — a tela de fim de corrida como funil
  add('R-19', 'Fricção pós-morte (o fim de corrida como funil)', 100, M.friccao.pares, () => {
    const med = M.friccao.medianaS;
    const p60 = M.friccao.ate60s;
    if (p60 !== null && p60 >= 0.6 && med <= 30) {
      return {
        sev: 'vitoria',
        dado: `Mediana de ${fmtInt(med)} s entre uma corrida e a seguinte · ${fmtPct(p60)} recorrem em ≤60 s (n=${fmtInt(M.friccao.pares)} pares).`,
        problema: 'O "só mais uma" está funcionando: quem morre volta rápido.',
        sugestao: 'Guardar como régua — qualquer mudança no fim de corrida se julga contra este número.',
      };
    }
    return {
      sev: 'atencao',
      dado: `Mediana de ${fmtInt(med)} s até a próxima corrida · ${p60 === null ? '—' : fmtPct(p60)} recorrem em ≤60 s (n=${fmtInt(M.friccao.pares)} pares reconstruídos).`,
      problema: `A tela de fim de corrida é onde a sessão decide continuar — e ${fmtInt(M.friccao.telaCurta)} de ${fmtInt(M.friccao.telaConhecida)} aparelhos conhecidos têm lado curto ≤520 px, onde o overlay transborda.`,
      sugestao: 'Resultado + 1 CTA grande acima da dobra; medir depois pelas letras `rs`/`rt` (que dizem se veio do botão).',
    };
  });

  // R-20 atribuição — de onde vem gente nova (a pergunta de 05/09)
  add('R-20', 'Atribuição: de onde vêm os jogadores novos', 1, 1, () => {
    const n7 = M.atribuicao.novos7d;
    const totalNovos = n7.link + n7.org + n7.sem;
    if (totalNovos === 0) {
      return {
        sev: 'atencao',
        dado: `Nenhum aparelho novo nos últimos 7 dias (aparelhos com origem carimbada: ${fmtInt(M.totais.jogadores - M.atribuicao.semSrc)}/${fmtInt(M.totais.jogadores)}).`,
        problema: 'A entrada secou — e retenção só se mede sobre quem entra.',
        sugestao: 'A alavanca registrada é o desafio por link (ideia G): 1 link por jogador é a única porta que não depende do dono.',
      };
    }
    return {
      sev: n7.link > 0 ? 'vitoria' : 'observar',
      dado: `Novos em 7 dias: ${n7.link} por link · ${n7.org} orgânicos · ${n7.sem} sem carimbo (aparelhos anteriores à v1.12.1).`,
      problema: n7.link > 0 ? 'O link está trazendo gente — é a primeira aquisição não-boca-a-boca do jogo.' : 'Todos os novos chegaram sem link: o canal viral ainda não existe na prática.',
      sugestao: 'n≥5 dá existência; n≥20 dá direção de D7 por origem.',
    };
  });

  // R-21 cota de leitura do Firestore — o teto que ninguém está olhando
  add('R-21', 'Cota de leitura do Firestore (plano gratuito)', 1, 1, () => {
    // Cada boot lê o pódio + o rank + rivais; o /?stats e o diretório leem a
    // coleção INTEIRA (O(N) por chamada). Estimativa grosseira e conservadora.
    const docs = M.totais.jogadores;
    const visitasDia = Math.max(M.base.ativos7d, 1) * 3;
    const leiturasDia = visitasDia * 12 + docs * 2;
    if (leiturasDia < 10000) return null;
    return {
      sev: 'atencao',
      dado: `Estimativa de ~${fmtInt(leiturasDia)} leituras/dia (${docs} docs × varreduras + ${visitasDia} visitas).`,
      problema: 'As varreduras de coleção inteira (checkName, diretório, /?stats) são O(N) — crescem com a base, não com o uso.',
      sugestao: 'Antes de qualquer canal de tráfego novo, paginar ou cachear as varreduras.',
    };
  });

  // R-17 Δ vs última execução salva (aba passa `anterior`; CLI é stateless)
  if (anterior && typeof anterior === 'object') {
    add('R-17', 'O que mudou desde a última análise', 1, 1, () => {
      const dj = M.totais.jogadores - num(anterior.jogadores);
      const de = M.totais.execucoes - num(anterior.execucoes);
      const df = M.totais.fugas - num(anterior.fugas);
      return {
        sev: dj > 0 || de > 0 ? 'vitoria' : 'observar',
        dado: `Desde ${str(anterior.dia) || 'a última análise'}: ${dj >= 0 ? '+' : ''}${dj} jogadores · ${de >= 0 ? '+' : ''}${fmtInt(de)} execuções · ${df >= 0 ? '+' : ''}${df} fugas.`,
        problema: 'Métricas de JANELA (corridas, skins, desafios) podem cair só por rotação da janela de 50 — os totais acima são vitalícios e monotônicos.',
        sugestao: 'Usar este delta como régua de "o que aconteceu desde a última vez que olhei".',
      };
    });
  }

  return out.sort((a, b) => (SEV_ORDEM[a.sev] - SEV_ORDEM[b.sev]) || (a.id < b.id ? -1 : 1));
}

// ================================================================= MARKDOWN
// Seção nova datada, no MESMO esqueleto do §2 (comparação célula a célula),
// pronta para colar em docs/IDEIAS-FUTURAS.md AO LADO da fotografia de 16/08.
function buildMarkdown(meta, M, insights) {
  const B = BASELINE_20260816;
  const L = [];
  const push = (s = '') => L.push(s);

  push(`## Radiografia dos dados — ${meta.dia}`);
  push();
  push('> Gerada por `tools/radiografia.mjs` / aba 📊 do `/?setup` (leitura pública,');
  push('> zero writes; sondas `claude-*` filtradas na busca). Baseline de comparação:');
  push(`> a fotografia de ${B.quando} (§2). Conferência: os totais abaixo usam as`);
  push('> mesmas somas do `npm run digest` do dia.');
  push();

  // ---- resumo executivo (5 linhas, composição determinística)
  const melhor = insights.find((i) => i.sev === 'vitoria');
  const pior = insights.find((i) => i.sev === 'critico') || insights.find((i) => i.sev === 'atencao');
  push('### Resumo executivo');
  push();
  push(`1. Base: **${M.totais.jogadores} jogadores** (${fmtDelta(M.totais.jogadores, B.jogadores)} vs 16/08) · `
    + `**${fmtInt(M.totais.execucoes)} execuções** (${fmtDelta(M.totais.execucoes, B.execucoes)}) · `
    + `**${M.totais.fugas} fugas** (${fmtDelta(M.totais.fugas, B.fugas)}) · ${fmtDec(M.totais.horasJogadas, 1)} h.`);
  push(`2. Retenção: **${fmtPct(M.retencao.umDiaSo)} um dia só** (era 69%) · ${fmtPct(M.retencao.retorno2oDia)} voltaram (era 31%) · ${fmtDec(M.retencao.corridasPorSessao, 1)} corridas/sessão.`);
  push(`3. Funil: **${M.funil.bestM[2000]} aparelhos ≥ 2000 m** (era 5) · mediana pós-portão **${fmtInt(M.funil.posPortao.medianaM)} m** (era 1.224) · recorde ${fmtInt(M.totais.maiorBestM)} m.`);
  push(`4. ${melhor ? `${SEV_ICONE.vitoria} ${melhor.titulo}: ${melhor.dado}` : `${SEV_ICONE.observar} Nenhuma vitória clara nesta leitura.`}`);
  push(`5. ${pior ? `${SEV_ICONE[pior.sev]} ${pior.titulo}: ${pior.dado}` : '🟢 Nenhum alerta disparado nesta leitura.'}`);
  push();

  // ---- totais
  push('### Totais (vitalícios, por aparelho)');
  push();
  push('| | Agora | 16/08 | Δ |');
  push('|---|---|---|---|');
  push(`| Jogadores (\`stats/\`) | ${M.totais.jogadores} | ${B.jogadores} | ${fmtDelta(M.totais.jogadores, B.jogadores)} |`);
  push(`| Execuções | ${fmtInt(M.totais.execucoes)} | ${fmtInt(B.execucoes)} | ${fmtDelta(M.totais.execucoes, B.execucoes)} |`);
  push(`| Fugas | ${M.totais.fugas} | ${B.fugas} | ${fmtDelta(M.totais.fugas, B.fugas)} |`);
  push(`| Horas jogadas | ${fmtDec(M.totais.horasJogadas, 1)} | ${fmtDec(B.horasJogadas, 1)} | — |`);
  push(`| Ranking (com apelido) | ${M.totais.ranking} | ${B.ranking} | ${fmtDelta(M.totais.ranking, B.ranking)} |`);
  push(`| Corridas na janela | ${fmtInt(M.totais.corridasJanela)} | ${fmtInt(B.corridasJanela)} | ${fmtDelta(M.totais.corridasJanela, B.corridasJanela)} |`);
  push(`| Docs com \`history.days\` | ${M.totais.docsComHistory}/${M.totais.jogadores} | ${B.docsComHistory}/${B.jogadores} | — |`);
  push();
  push(`Recorde do ranking: **${fmtInt(M.totais.recorde.m)} m** (${M.totais.recorde.nome}, ${fmtInt(M.totais.recorde.score)} pts) · maior \`bestM\`: ${fmtInt(M.totais.maiorBestM)} m.`);
  push();

  // ---- funil
  push('### Funil de distância');
  push();
  push('| Marca | Jogadores (bestM ≥) | 16/08 | Corridas (m ≥) | 16/08 |');
  push('|---|---|---|---|---|');
  for (const marca of FUNIL_MARCAS) {
    const jb = B.funilBestM[marca];
    const cb = B.funilCorridas[marca];
    push(`| ${fmtInt(marca)} m | ${M.funil.bestM[marca]} | ${jb} | ${M.funil.corridas[marca]} | ${cb} |`);
  }
  push();
  push(`Pós-portão: **${M.funil.posPortao.n}** corridas · mediana ${fmtInt(M.funil.posPortao.medianaM)} m · p90 ${fmtInt(M.funil.posPortao.p90M)} m · máx ${fmtInt(M.funil.posPortao.maxM)} m `
    + `(16/08: ${B.posPortao.n} · ${fmtInt(B.posPortao.medianaM)} · ${fmtInt(B.posPortao.p90M)} · ${fmtInt(B.posPortao.maxM)}).`);
  push();
  push(`Top 5 \`bestM\`: ${M.funil.top5.map((t) => `${fmtInt(t.m)} m (${t.nome})`).join(' · ')}.`);
  push();

  // ---- aquisição × atividade
  push('### Aquisição × atividade');
  push();
  push('| Semana de | Novos |');
  push('|---|---|');
  for (const { semana, n } of M.aquisicao.novosPorSemana) push(`| ${semana} | ${n} |`);
  if (M.aquisicao.semData) push(`| (sem data visível) | ${M.aquisicao.semData} |`);
  push();
  push('| Dia | Execuções | Jogadores |');
  push('|---|---|---|');
  for (const d of M.aquisicao.execPorDia) push(`| ${d.dia} | ${d.exec} | ${d.jogadores} |`);
  push();
  if (M.aquisicao.diasComFallback) {
    push(`ℹ️ ${M.aquisicao.diasComFallback} dia(s) usaram o fallback da janela de 50 para docs pré-1.6.1 (subestima quem fez > 50 corridas no dia).`);
    push();
  }

  // ---- retenção
  push('### Retenção');
  push();
  push(`Dias distintos com corrida (${M.retencao.mensuraveis} mensuráveis): `
    + `**1 dia: ${M.retencao.distDias['1']} (${fmtPct(M.retencao.umDiaSo)})** · 2–3: ${M.retencao.distDias['2-3']} · `
    + `4–7: ${M.retencao.distDias['4-7']} · 8–14: ${M.retencao.distDias['8-14']} · 15+: ${M.retencao.distDias['15+']} `
    + `→ **${fmtPct(M.retencao.retorno2oDia)} voltaram ao menos um segundo dia** (16/08: 31%). `
    + `Corridas por sessão: ${fmtDec(M.retencao.corridasPorSessao, 1)} (16/08: 4,6).`);
  push();
  if (M.retencao.coortes.length) {
    push('Coortes por semana do primeiro acesso (D1/D7/D30 em dias de calendário; D30 só para coortes de 30–60 dias — o `history.days` poda aos 60):');
    push();
    push('| Coorte (semana) | n | D1 | D7 | D30 |');
    push('|---|---|---|---|---|');
    for (const c of M.retencao.coortes) {
      const cell = (num2, den) => (den >= 3 ? `${fmtPct(den ? num2 / den : 0)} (${num2}/${den})` : '⚪');
      push(`| ${c.semana} | ${c.n} | ${cell(c.d1, c.elegD1)} | ${cell(c.d7, c.elegD7)} | ${cell(c.d30, c.elegD30)} |`);
    }
    push();
    push('⚪ = menos de 3 elegíveis na célula — existência sim, taxa não.');
    push();
  }

  // ---- curva de aprendizado
  push('### Curva de aprendizado (mediana de metros por nº da tentativa)');
  push();
  push('Separada por ERA (§2.10): era A = abertura universal (≤ 1.8.3), era B = roleta cheia aos 60 m da 3ª tentativa (≥ 1.8.4). **Não comparar entre eras** além das tentativas 1–3.');
  push();
  push('| Tentativa | Era A: n / mediana / p90 | Era B: n / mediana / p90 |');
  push('|---|---|---|');
  for (let i = 0; i < M.curva.eraA.length; i++) {
    const a = M.curva.eraA[i];
    const b = M.curva.eraB[i];
    push(`| ${a.faixa} | ${a.n} / ${fmtInt(a.medianaM)} m / ${fmtInt(a.p90M)} m | ${b.n} / ${fmtInt(b.medianaM)} m / ${fmtInt(b.p90M)} m |`);
  }
  push();
  push(`Onboarding comparável (tentativas 1–3, era B): n=${M.curva.onboarding13B.n} · mediana ${fmtInt(M.curva.onboarding13B.medianaM)} m · p90 ${fmtInt(M.curva.onboarding13B.p90M)} m. Corridas de era indeterminada: ${M.curva.incertas}.`);
  push();

  // ---- mecânicas
  push('### Mecânicas por corrida (média por corrida; por 100 m entre parênteses)');
  push();
  push('| Faixa | n | paredes | rampas | torres | animais | pulos | investidas | inv. negadas |');
  push('|---|---|---|---|---|---|---|---|---|');
  for (const f of M.mecanicas) {
    const c = (k) => `${fmtDec(f.media[k], 1)} (${fmtDec(f.por100m[k], 1)})`;
    push(`| ${f.faixa} m | ${f.n} | ${c('w')} | ${c('r')} | ${c('o')} | ${c('a')} | ${c('j')} | ${c('d')} | ${c('x')} |`);
  }
  push();

  // ---- investida
  push('### Precisão e atrito de investida');
  push();
  push(`Corridas com investida: ${fmtInt(M.investida.corridasComDash)}/${fmtInt(M.totais.corridasJanela)}. `
    + `Acertos/investida (PROXY — fúria e multi-quebra superestimam; a letra livre \`i\` é a correção definitiva): `
    + `p10 ${fmtPct(M.investida.precisao.p10, 1)} · mediana ${fmtPct(M.investida.precisao.mediana, 1)} · p90 ${fmtPct(M.investida.precisao.p90, 1)} (16/08: mediana 50%).`);
  push();
  push(`Atrito do cooldown: **${fmtInt(M.investida.atrito.negadas)} negadas** vs ${fmtInt(M.investida.atrito.disparadas)} disparadas (**${fmtPct(M.investida.atrito.taxa)}** dos toques; 16/08: 39%). `
    + `Pausas: ${fmtInt(M.pausas.corridasComPausa)} corridas com pausa (letra \`p\`, lida pela primeira vez).`);
  push();

  // ---- bosses
  push('### Bosses');
  push();
  const b1 = M.bosses.b1;
  const b2 = M.bosses.b2;
  const b3 = M.bosses.b3;
  push(`**Portão (1000 m):** ${b1.lutas} lutas na janela · fugas na janela: ${b1.fugasJanela} · camadas (0/1/2/3): `
    + `${b1.dist[0]} / ${b1.dist[1]} / ${b1.dist[2]} / ${b1.dist[3]} · mediana ${b1.medianaS} s · mortes por \`boss\`: ${b1.mortes} `
    + `(16/08: ${B.boss1.lutas} lutas, ${B.boss1.fullClear} full, ${B.boss1.medianaS} s, ${B.boss1.mortes} mortes).`);
  push();
  push(`**Boss dos 2000 m (letras \`e\`/\`h\`, lidas pela primeira vez):** ${b2.chegadas} chegadas · camadas (0/1/2/3/4): `
    + `${b2.dist[0]} / ${b2.dist[1]} / ${b2.dist[2]} / ${b2.dist[3]} / ${b2.dist[4]} · mediana ${b2.medianaS} s · mortes por \`boss2\`: ${b2.mortes}.`);
  push();
  push(`**Guardião do Fim (letra \`l\`):** ${b3.corridasComCamada} corridas com camada quebrada · mortes: ${b3.mortes} · LENDAS: ${b3.lendas} — existência, nunca taxa (recorde ${fmtInt(M.totais.maiorBestM)} m).`);
  push();
  push(`Fúria Total usada em ${fmtInt(M.bosses.furiaUsada)} corridas · fúria negada em arena (\`n\`): **${M.bosses.furiaNegada}** (16/08: 0 — sempre citar).`);
  push();

  // ---- pontuação composta
  push('### Pontuação composta em campo (v1.8.4)');
  push();
  push(`Adoção: ${M.pontuacao.adocaoScoreM.com}/${M.pontuacao.adocaoScoreM.total} docs do ranking com \`scoreM\` (marca cravada por cliente ≥ 1.8.4 — adoção baixa é esperada, a base é majoritariamente antiga).`);
  push();
  push(`Bônus recomputado na janela (\`ScoreSystem.runBonus\`, corridas v ≥ 1.7, n=${fmtInt(M.pontuacao.bonusJanela.n17)}): `
    + `mediana ${fmtPct(M.pontuacao.bonusJanela.medianaPct, 1)} · p95 ${fmtPct(M.pontuacao.bonusJanela.p95Pct, 1)} `
    + `(simulação de 16/08: mediana 0% · p95 13,7%; alvos: mediana 8–15% · p95 ≤ 25%). `
    + `Spearman metros × total: ${M.pontuacao.spearman === null ? '—' : fmtDec(M.pontuacao.spearman, 3)} (alvo ≥ 0,9; simulado 0,993). `
    + `Teto \`bonus ≤ m\` agiu em ${M.pontuacao.bonusJanela.capAtivo} corrida(s) (simulação: 0).`);
  push();

  // ---- skins
  push('### Skins (letra `g`; ausente = default)');
  push();
  const skinList = sortEntries(M.skins.porSkin).map(([k, v]) => `\`${k}\` ${v}`).join(' · ') || '(nenhuma corrida com skin)';
  push(`${skinList} → **${M.skins.jogadoresComSkin} de ${M.totais.docsComRuns} jogadores** com corrida de skin não-default (16/08: 5/51). `
    + `No pódio (\`scores.skin\`): ${sortEntries(M.skins.podio).map(([k, v]) => `\`${k}\` ${v}`).join(' · ') || '—'}.`);
  push();

  // ---- desafios
  push('### Arena de Desafios (v1.8.6, coleção `challenges`)');
  push();
  if (M.desafios.criados === 0) {
    push('Nenhum desafio criado ainda.');
  } else {
    push(`${M.desafios.criados} desafios (${M.desafios.ativos} ativos, ${M.desafios.expirados} expirados) · `
      + `duração: ${sortEntries(M.desafios.porDuracao).map(([k, v]) => `${k}×${v}`).join(' · ')} · `
      + `tamanho: ${sortEntries(M.desafios.porTamanho).map(([k, v]) => `${k} part.×${v}`).join(' · ')}.`);
    push();
    push(`Aceite: ${M.desafios.aceites}/${M.desafios.convites} convites (${M.desafios.taxaAceite === null ? '—' : fmtPct(M.desafios.taxaAceite)}) — o criador nasce aceito e é descontado; `
      + `**recusa não é gravada** (pode ser "nunca viu"). Latência mediana de aceite: ${fmtDec(M.desafios.latenciaMedianaH, 1)} h `
      + `(mede hábito de abrir o jogo, não interesse — a descoberta tem TTL de 1 h). Jogadores envolvidos: ${M.desafios.envolvidos}.`);
  }
  push();

  // ---- mortes
  push('### Mortes (vitalícias, mapa `deaths`)');
  push();
  push(`Por tier: ${Object.entries(M.mortes.porTier).map(([k, v]) => `${k} ${fmtInt(v)}`).join(' · ')}.`);
  push(`Por causa: ${sortEntries(M.mortes.porCausa).map(([k, v]) => `\`${k}\` ${fmtInt(v)}`).join(' · ')}.`);
  push();

  // ---- contexto da base
  push('### Contexto da base');
  push();
  push(`Última versão vista: ${sortEntries(M.base.versoes).map(([k, v]) => `${k}×${v}`).join(' · ')}.`);
  push(`Aparelhos: ${sortEntries(M.base.aparelhos).map(([k, v]) => `${k}×${v}`).join(' · ') || '—'} · PWA instalado (standalone): ${M.base.standalone} · corridas com teclado: ${fmtInt(M.base.teclado)}.`);
  push(`Países: ${sortEntries(M.base.paises).map(([k, v]) => `${k}×${v}`).join(' · ') || '—'} (geo tem TTL de 12 h e pode estar velho).`);
  push(`Ativos (por \`updatedAt\`): ${M.base.ativos7d} nos últimos 7 dias · ${M.base.ativos30d} nos últimos 30.`);
  push();

  // ======================= v1.12.1 "Régua" — as seções da leitura por versão
  const B2 = BASELINE_20260905;
  const cmp = (n, min) => (n < min ? ` ⚪ (n=${n}, mínimo ${min})` : '');
  const pctOu = (v, d = 0) => (v === null || v === undefined ? '—' : fmtPct(v, d));
  const intOu = (v) => (v === null || v === undefined ? '—' : fmtInt(v));

  // ---- Escola do Rino (pré-registro)
  push(`### Leituras pré-registradas — Escola do Rino (corte \`v ≥ ${M.escola.corte}\`)`);
  push();
  push('> As cinco métricas foram escritas ANTES da v1.10 sair (IDEIAS-FUTURAS §Escola)');
  push('> e não mudam. O corte é sempre por `v` da CORRIDA — nunca por data de');
  push('> primeiro acesso: metade dos aparelhos roda versão velha. Onde o n não');
  push('> alcança o mínimo pré-registrado a célula sai ⚪ — o silêncio também é');
  push('> resultado, e fica registrado.');
  push();
  const eA = M.escola.antes;
  const eD = M.escola.depois;
  push(`| Métrica | Antes (\`v < ${M.escola.corte}\`) | Depois (\`v ≥ ${M.escola.corte}\`) | Alvo |`);
  push('|---|---|---|---|');
  push(`| **PRIMÁRIA** — novatos que passam de 400 m em ≤10 tentativas | ${pctOu(eA.primaria.taxa)} (${eA.primaria.passaram}/${eA.primaria.aparelhos})${cmp(eA.primaria.aparelhos, M.escola.minimos.primaria)} | ${pctOu(eD.primaria.taxa)} (${eD.primaria.passaram}/${eD.primaria.aparelhos})${cmp(eD.primaria.aparelhos, M.escola.minimos.primaria)} | subir claramente |`);
  push(`| Curva: mediana tent. 16–30 vs 1–5 | ${intOu(eA.curva.medianaM1630)} m vs ${intOu(eA.curva.medianaM15)} m${cmp(Math.min(eA.curva.n15, eA.curva.n1630), M.escola.minimos.curva)} | ${intOu(eD.curva.medianaM1630)} m vs ${intOu(eD.curva.medianaM15)} m${cmp(Math.min(eD.curva.n15, eD.curva.n1630), M.escola.minimos.curva)} | desinverter (16–30 ≥ 1–5) |`);
  push(`| Negação do dash em 0–200 m | ${pctOu(eA.dash0a200.taxa)}${cmp(eA.dash0a200.n, M.escola.minimos.dash)} | ${pctOu(eD.dash0a200.taxa)}${cmp(eD.dash0a200.n, M.escola.minimos.dash)} | < 30% |`);
  push(`| Vidas com \`j=0\` nas 5 primeiras corridas | ${pctOu(eA.semPular.taxa)} (${eA.semPular.comJ0}/${eA.semPular.vidas})${cmp(eA.semPular.vidas, M.escola.minimos.semPular)} | ${pctOu(eD.semPular.taxa)} (${eD.semPular.comJ0}/${eD.semPular.vidas})${cmp(eD.semPular.vidas, M.escola.minimos.semPular)} | < 20% |`);
  push(`| **GUARDA-CORPO** — corridas sem \`fc\` (veterano) | mediana ${intOu(eA.guardaCorpo.medianaM)} m · p90 ${intOu(eA.guardaCorpo.p90M)} m (n=${eA.guardaCorpo.n}) | mediana ${intOu(eD.guardaCorpo.medianaM)} m · p90 ${intOu(eD.guardaCorpo.p90M)} m (n=${eD.guardaCorpo.n}) | distribuição INALTERADA |`);
  push();
  push(`Corridas sem lado definido (sem \`v\` e histórico ambíguo): ${M.escola.indefinidas}.`);
  push();

  // ---- Streaks
  push('### Streaks (v1.11) — recomputados do `history.days`');
  push();
  push(`Aparelhos mensuráveis: ${M.streaks.mensuraveis} · com melhor streak ≥3: **${M.streaks.melhor3}** · ≥7: ${M.streaks.melhor7} · ≥30: ${M.streaks.melhor30} · maior de todos: ${M.streaks.maiorMelhor} dias.`);
  push(`Chama acesa entre os ativos (7d): ${M.streaks.ativosComChama}/${M.streaks.ativos}. `
    + `Sequência corrente: 1 dia ${M.streaks.atualDist.um} · 2–3 ${M.streaks.atualDist.doisTres} · 4–6 ${M.streaks.atualDist.quatroSeis} · 7+ ${M.streaks.atualDist.seteMais}.`);
  push(`Coorte da v1.11 (primeiro acesso ≥ 30/08): ${M.streaks.coorte.novosVoltaram}/${M.streaks.coorte.novos} voltaram a um 2º dia · anteriores: ${M.streaks.coorte.antigosVoltaram}/${M.streaks.coorte.antigos}.`);
  push();
  push('> O streak nunca sobe ao servidor (é local por decisão) — estes números são');
  push('> **reconstruídos** do `history.days` com a mesma regra do cliente ("ontem');
  push('> mantém a chama"). Servem para a leitura pré-registrada dos 57% de um-dia-só.');
  push();

  // ---- causa × lugar
  push('### Causa da morte × lugar (janela; as fronteiras que importam)');
  push();
  push('| Faixa | n | 1ª causa | parede | espinho | animal | dardo | torre | chefes |');
  push('|---|---|---|---|---|---|---|---|---|');
  for (const b of M.causaLugar) {
    const c = b.porCausa;
    const chefes = (c.boss || 0) + (c.boss2 || 0) + (c.cerco || 0) + (c.farao || 0) + (c.boss3 || 0);
    const top = b.topCausa ? `\`${b.topCausa}\` ${pctOu(b.topPart)}` : '—';
    push(`| ${b.faixa} m | ${b.n} | ${top} | ${c.wall || 0} | ${c.spike || 0} | ${c.animal || 0} | ${c.dart || 0} | ${c.tower || 0} | ${chefes} |`);
  }
  push();
  push(`> O mapa \`deaths\` é vitalício e sem distância; o heatmap do painel para em`);
  push(`> "1000m+". Esta tabela é a única que enxerga o Subúrbio separado do deserto —`);
  push(`> em 05/09 o dardo respondia por ${fmtPct(B2.dardo1000a1400.participacao)} das mortes de 1000–1400 m (n=${B2.dardo1000a1400.n}),`);
  push('> contra ~7% no zoo: a assinatura numérica do feedback de contraste da cidade.');
  push();

  // ---- fricção pós-morte
  push('### Fricção pós-morte (a tela de fim de corrida como funil)');
  push();
  push(`Reconstruída de \`runs[]\` (pares consecutivos do mesmo aparelho, ≤1 h): n=${fmtInt(M.friccao.pares)} · `
    + `mediana **${intOu(M.friccao.medianaS)} s** até a próxima corrida · ${pctOu(M.friccao.ate60s)} recorrem em ≤60 s.`);
  push(`Medida pelas letras \`rs\`/\`rt\` (v1.12.1+): ${fmtInt(M.friccao.medido.n)} corridas com origem · `
    + `via botão ${fmtInt(M.friccao.medido.viaBotao)} · com share antes ${fmtInt(M.friccao.medido.comShare)} · `
    + `rolaram os extras ${fmtInt(M.friccao.medido.rolouExtras)} · mediana \`rt\` ${intOu(M.friccao.medido.medianaRtS)} s.`);
  push(`Aparelhos com tela de lado curto ≤520 px (onde o fim de corrida transbordava antes da v1.12.1): `
    + `**${fmtInt(M.friccao.telaCurta)}** de ${fmtInt(M.friccao.telaConhecida)} com resolução conhecida.`);
  push();

  // ---- atribuição
  push('### Atribuição — de onde vêm os aparelhos');
  push();
  const srcList = sortEntries(M.atribuicao.porSrc).map(([k, v]) => `\`${k}\` ${v}`).join(' · ') || '(nenhum carimbado ainda)';
  push(`Origem carimbada: ${srcList} · sem carimbo (anteriores à v1.12.1): ${M.atribuicao.semSrc}.`);
  push(`Novos nos últimos 7 dias: ${M.atribuicao.novos7d.link} por link · ${M.atribuicao.novos7d.org} orgânicos · ${M.atribuicao.novos7d.sem} sem carimbo.`);
  push();

  // ---- ressalvas (regeradas com os n do dia)
  push('### Ressalvas de leitura (sem elas as tabelas mentem)');
  push();
  push(`- \`runs[]\` é a **janela das últimas 50** por jogador (veterano tem passado truncado) e \`history.days\` poda aos 60 dias — deltas de métricas de janela podem ser só rotação.`);
  push(`- Totais vitalícios são **por aparelho** (1 doc = 1 aparelho, não 1 pessoa).`);
  push(`- Cobertura por letra (corridas com a letra > 0): ${RUN_LETTER_KEYS.map((k) => `\`${k}\` ${M.cobertura[k]}`).join(' · ')}.`);
  push(`- Com ~${M.totais.jogadores} jogadores, o IC95 de proporções por jogador é ≈ ±14 p.p.: deltas menores são SINAL, não prova. Por corrida (n≈${fmtInt(M.totais.corridasJanela)}) o IC95 é ≈ ±3 p.p.`);
  push('- NÃO concluir daqui: causalidade (curva de aprendizado mistura sobrevivência com aprendizado); comparações de densidade entre eras A/B; taxas sobre subgrupos com n < 15 (existência sim, taxa não); "retenção de pessoas" (é de aparelhos).');
  push('- Fora de escopo declarado: coleção `config/` (conteúdo editorial do dono — news/notify —, não telemetria de jogador).');
  push();

  // ---- insights
  push('### Insights automáticos (motor de regras, molde do §4)');
  push();
  for (const i of insights) {
    push(`- ${SEV_ICONE[i.sev]} **[${i.id}] ${i.titulo}** — ${i.dado}${i.problema ? ` ${i.problema}` : ''}${i.sugestao ? ` **Sugestão:** ${i.sugestao}` : ''}`);
  }
  push();
  push(`*Gerado em ${meta.dia} · script v${meta.versaoScript} · jogo v${meta.versaoJogo} · origem: ${meta.origem}.*`);
  push();

  return L.join('\n');
}
