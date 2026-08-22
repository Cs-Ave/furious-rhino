import { getDb } from '../systems/LeaderboardSystem.js';
import { ScoreSystem } from '../systems/ScoreSystem.js';
import { Constants } from '../utils/Constants.js';
import {
  comboChart, histogram, heatmap, donut, stepArea, lineChart, treemap, chartBox,
} from './Charts.js';

// v1.8.4 — de onde vem o número decide a UNIDADE:
//   coleção `scores` (ranking)  -> PONTOS, via ScoreSystem.fmtScore/fmtPts;
//   coleção `stats` (telemetria: bestM, runs[].m, histogramas, funil)
//                               -> METROS, intocados. São medidas físicas de
//                                  progressão, e o funil dos 200m/1000m só
//                                  faz sentido em distância.
// As duas convivem lado a lado na tabela e na ficha de propósito: um jogador
// com muitos pontos e poucos metros é exatamente a informação nova da v1.8.4.
//
// Portão da fuga em metros, derivado da fonte única (v1.6: 1000m). O painel
// destaca esse degrau no funil e marca as corridas que passaram dele.
const GATE_M = Constants.WIN_DISTANCE_PX / Constants.PIXELS_PER_METER;

// Modo detalhado (lista de jogadores + ficha individual) atrás de uma chave
// na URL: `/?stats=<chave>`. Sem chave, a página mostra só os agregados.
// Guardamos o SHA-256 porque o repositório é público — o texto da chave
// ficaria à vista. NÃO é segurança de verdade (a leitura da coleção é
// pública, é o que faz o painel funcionar): serve para tirar curiosos.
// Trocar a chave: node -e "console.log(require('crypto').createHash('sha256').update('NOVA').digest('hex'))"
const STATS_KEY_HASH = '58f80cb81ed4b05cedac165d4ab30fd9e307d17d0f142ca708dd999ab479b238';

async function hasDetailAccess() {
  const key = new URLSearchParams(location.search).get('stats');
  if (!key || !crypto.subtle) return false; // http em LAN não tem subtle
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
    const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    return hex === STATS_KEY_HASH;
  } catch (e) {
    return false;
  }
}

// Painel público /?stats: baixa as coleções `stats` e `scores` (leitura
// liberada nas rules) e agrega TUDO no cliente — sem lib de gráfico, só
// DOM + SVG desenhado à mão (Charts.js), no mesmo espírito zero-build do
// jogo. Conteúdo de terceiros (nomes, cidades, modelos) entra sempre via
// textContent. Trocar de aba ou de período NÃO refaz rede (cache).
let cache = null; // { docs, names, scores, topScore }
let detail = false; // acesso ao modo detalhado (decidido 1x por carga)
let periodDays = 0; // 0 = tudo; 7 e 30 filtram o que vem de runs[]/history.days

const TABS = [
  { id: 'visao', label: '🦏 Visão geral', draw: tabOverview },
  { id: 'dificuldade', label: '💀 Dificuldade', draw: tabDifficulty },
  { id: 'engajamento', label: '📈 Engajamento', draw: tabEngagement },
  { id: 'mecanicas', label: '💨 Mecânicas', draw: tabMechanics },
  { id: 'publico', label: '🌍 Público', draw: tabAudience },
  { id: 'jogadores', label: '👥 Jogadores', draw: tabPlayers, detailOnly: true },
];

export async function render() {
  const root = document.getElementById('stats-page');
  root.hidden = false;
  root.textContent = '';

  root.append(
    el('h1', null, '📊 FURIOUS RHINO — Estatísticas'),
    el('div', 'stats-sub', 'Telemetria anônima agregada de todos os aparelhos · '),
  );
  const back = el('a', null, '← voltar ao jogo');
  back.href = './';
  root.querySelector('.stats-sub').append(back);

  const status = el('p', 'stats-status', 'Carregando estatísticas…');
  root.append(status);

  if (!cache) {
    try {
      const { fs, db } = await getDb();
      const [statsSnap, scoresSnap] = await Promise.all([
        fs.getDocs(fs.collection(db, 'stats')),
        fs.getDocs(fs.collection(db, 'scores')),
      ]);

      // Docs de sonda (validação de rules/testes e2e) NÃO entram nas
      // estatísticas públicas — têm contadores sintéticos gigantes
      const isProbe = (id) => /^claude-/.test(id);

      // v1.8.4: guardamos a ENTRADA de ranking inteira por jogador, não só o
      // nome — `score` (total) e `m` (metros da marca, scoreM ?? score). É
      // o que permite a tabela e a ficha mostrarem os pontos ao lado do
      // bestM da telemetria, que é outra grandeza e continua em metros.
      const names = new Map();
      const scores = new Map();
      let topScore = null;
      for (const d of scoresSnap.docs) {
        if (isProbe(d.id)) continue;
        const data = d.data();
        names.set(d.id, String(data.name || ''));
        const score = Number(data.score) || 0;
        const entry = { name: String(data.name || '???'), score, m: Number(ScoreSystem.metersOf(data)) || 0 };
        scores.set(d.id, entry);
        if (!topScore || score > topScore.score) topScore = entry;
      }
      cache = {
        docs: statsSnap.docs.filter((d) => !isProbe(d.id)).map((d) => ({ id: d.id, ...d.data() })),
        names,
        scores,
        topScore,
      };
    } catch (e) {
      status.textContent = 'Não foi possível carregar as estatísticas. Verifique a conexão e tente de novo.';
      const retry = el('button', null, 'Tentar novamente');
      retry.addEventListener('click', () => { cache = null; render(); });
      root.append(retry);
      return;
    }
  }

  status.remove();
  if (cache.docs.length === 0) {
    root.append(el('p', 'stats-status', 'Nenhum dado ainda — jogue uma corrida!'));
    return;
  }

  detail = await hasDetailAccess();
  const tabs = TABS.filter((t) => detail || !t.detailOnly);

  // ---- barra de controles (abas + período + atualizar)
  const nav = el('nav', 'stats-tabs');
  const tools = el('div', 'stats-tools');
  const content = el('div', 'stats-content');
  root.append(nav, tools, content);

  const periods = [[0, 'tudo'], [30, '30 dias'], [7, '7 dias']];
  const periodBox = el('div', 'stats-period');
  periodBox.append(el('span', null, 'Período:'));
  for (const [days, label] of periods) {
    const b = el('button', days === periodDays ? 'on' : null, label);
    b.addEventListener('click', () => { periodDays = days; paint(); });
    periodBox.append(b);
  }
  const refresh = el('button', 'stats-refresh', '🔄 Atualizar');
  refresh.addEventListener('click', () => { cache = null; render(); });
  tools.append(periodBox, refresh);

  const hash = location.hash.replace('#', '');
  let active = tabs.some((t) => t.id === hash) ? hash : tabs[0].id;

  function paint() {
    nav.textContent = '';
    for (const tab of tabs) {
      const b = el('button', tab.id === active ? 'on' : null, tab.label);
      b.addEventListener('click', () => {
        active = tab.id;
        history.replaceState(null, '', `#${tab.id}`);
        paint();
      });
      nav.append(b);
    }
    // O filtro de período não faz sentido na aba Jogadores (que é navegação)
    periodBox.hidden = active === 'jogadores';
    [...periodBox.querySelectorAll('button')].forEach((b, i) => {
      b.className = periods[i][0] === periodDays ? 'on' : '';
    });
    content.textContent = '';
    tabs.find((t) => t.id === active).draw(content);
    // Rola até a NAV, não até o conteúdo: a nav é sticky, então parar no topo
    // do conteúdo deixaria a primeira seção escondida atrás dela
    nav.scrollIntoView({ block: 'start' });
  }
  paint();
}

// ============================================================ derivações

// Corte do período em epoch/segundos (0 = sem corte)
function since() {
  return periodDays ? Math.floor(Date.now() / 1000) - periodDays * 86400 : 0;
}

// Todas as corridas de todos os jogadores, achatadas. `attemptIndex` é o
// número da tentativa na VIDA do jogador: `runs` é a janela das últimas 50,
// então a primeira delas é a de número (attempts - runs.length + 1).
function allRuns(docs, sinceS = since()) {
  const out = [];
  for (const d of docs) {
    if (!Array.isArray(d.runs)) continue;
    const base = Math.max(0, num(d.attempts) - d.runs.length);
    d.runs.forEach((r, i) => {
      if (!r || typeof r !== 'object') return;
      const t = num(r.t);
      if (sinceS && t < sinceS) return;
      out.push({
        id: d.id, t, m: num(r.m), s: num(r.s), c: str(r.c) || null,
        w: num(r.w), r: num(r.r), o: num(r.o), a: num(r.a),
        j: num(r.j), d: num(r.d), x: num(r.x), f: num(r.f), k: num(r.k),
        b: num(r.b), q: num(r.q), z: num(r.z), n: num(r.n),
        attemptIndex: base + i + 1,
      });
    });
  }
  return out;
}

function dayKeyOf(epochS) {
  const d = new Date(epochS * 1000);
  const p = (v) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Série diária de jogadores únicos × execuções. Preferimos `history.days`
// (contagem exata, v1.6.1+) e caímos para `runs[]` nos docs antigos — que
// SUBESTIMA quem fez mais de 50 corridas no dia; a aba avisa quando isso
// ainda está pesando.
function daySeries(docs, days = 30) {
  const runsBy = new Map();
  const playersBy = new Map();
  let legacy = 0;

  const add = (day, id, runs) => {
    runsBy.set(day, (runsBy.get(day) || 0) + runs);
    if (!playersBy.has(day)) playersBy.set(day, new Set());
    playersBy.get(day).add(id);
  };

  for (const d of docs) {
    const hist = (d.history && typeof d.history === 'object') ? d.history : {};
    const map = (hist.days && typeof hist.days === 'object') ? hist.days : null;
    if (map && Object.keys(map).length) {
      for (const [day, v] of Object.entries(map)) {
        const r = num(v && v.r);
        if (r > 0) add(day, d.id, r);
      }
    } else if (Array.isArray(d.runs) && d.runs.length) {
      legacy++;
      for (const run of d.runs) {
        const t = num(run && run.t);
        if (t > 0) add(dayKeyOf(t), d.id, 1);
      }
    }
  }

  // Preenche os dias VAZIOS: sem isso o gráfico esconde os buracos e mente
  // sobre a cadência
  const labels = [];
  const runs = [];
  const players = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const p = (v) => String(v).padStart(2, '0');
    const key = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    labels.push(`${p(d.getDate())}/${p(d.getMonth() + 1)}`);
    runs.push(runsBy.get(key) || 0);
    players.push((playersBy.get(key) || new Set()).size);
  }
  return { labels, runs, players, legacy };
}

// Retenção: dos jogadores cujo 1º dia foi há pelo menos K dias, quantos
// voltaram no dia +K. Só dá para calcular com `history.days` (v1.6.1+).
function retention(docs) {
  const marks = [1, 3, 7, 14, 30];
  const hit = marks.map(() => 0);
  const elig = marks.map(() => 0);
  let covered = 0;
  const todayMs = Date.now();

  for (const d of docs) {
    const hist = (d.history && typeof d.history === 'object') ? d.history : {};
    const map = (hist.days && typeof hist.days === 'object') ? hist.days : null;
    if (!map || !Object.keys(map).length) continue;
    covered++;
    const keys = Object.keys(map).sort();
    const first = new Date(`${keys[0]}T12:00:00`);
    const set = new Set(keys);
    marks.forEach((k, i) => {
      const target = new Date(first.getTime() + k * 86400000);
      if (target.getTime() > todayMs) return; // ainda não deu tempo de voltar
      elig[i]++;
      const p = (v) => String(v).padStart(2, '0');
      const key = `${target.getFullYear()}-${p(target.getMonth() + 1)}-${p(target.getDate())}`;
      if (set.has(key)) hit[i]++;
    });
  }
  return { marks, hit, elig, covered };
}

// ============================================================ abas

function tabOverview(root) {
  const agg = aggregate(cache.docs);
  const record = cache.topScore;
  const runs = allRuns(cache.docs);

  root.append(el('h2', null, '🦏 Visão geral'));
  const cards = el('div', 'stat-cards');
  const winRate = agg.attempts > 0 ? (agg.wins / agg.attempts) * 100 : 0;
  // Vem da coleção `scores`: é o RANKING, logo PONTOS. Os metros da mesma
  // marca vão no rótulo — o cartão tem 140px e o fmtScore inteiro
  // ('1.234 pts · 987 m') quebraria em três linhas nos 24px do valor.
  if (record && record.score > 0) {
    cards.append(card(ScoreSystem.fmtPts(record.score), `🏆 recorde — ${record.name} · ${record.m}m`));
  }
  cards.append(
    card(agg.players, 'jogadores'),
    card(agg.attempts, 'execuções'),
    card(agg.wins, 'fugas (cruzaram o portão)'),
    card(`${winRate.toFixed(1)}%`, 'fugas por execução'),
    card(formatTime(agg.playTimeS), 'tempo total jogado'),
    card(formatTime(agg.playTimeS / agg.players), 'tempo médio/jogador'),
    card((agg.attempts / agg.players).toFixed(1), 'tentativas médias/jogador'),
    card(`${((agg.standalone / agg.players) * 100).toFixed(0)}%`, 'com PWA instalado'),
  );
  root.append(cards);
  root.append(el('p', 'stats-note',
    'Os cartões acima são totais VITALÍCIOS por aparelho — não respondem ao filtro de período.'));

  // O pedido explícito: jogadores únicos/dia contra execuções/dia
  const window = periodDays || 30;
  const series = daySeries(cache.docs, window);
  root.append(el('h2', null, `📅 Jogadores únicos × execuções por dia (${window} dias)`));
  root.append(comboChart(series.labels, series.runs, series.players, {
    barLabel: 'execuções', lineLabel: 'jogadores únicos',
  }));
  if (series.legacy > 0) {
    root.append(el('p', 'stats-note',
      `${series.legacy} aparelho(s) ainda em versão anterior à 1.6.1: para eles o dia é ` +
      'reconstruído pela janela das últimas 50 corridas, o que subestima dias muito ativos.'));
  }

  root.append(el('h2', null, '🏁 Progresso: quantos jogadores já alcançaram…'));
  root.append(chartBox(stepArea(agg.funnelSteps, { highlight: '🗽' }),
    `De ${agg.players} jogadores. O degrau destacado é o portão dos ${GATE_M}m.`));

  // Recorde mundial ao longo do tempo — máximo acumulado sobre todas as corridas
  const sorted = runs.slice().sort((a, b) => a.t - b.t);
  if (sorted.length > 4) {
    let best = 0;
    const labels = [];
    const values = [];
    let lastDay = '';
    for (const r of sorted) {
      best = Math.max(best, r.m);
      const day = dayKeyOf(r.t).slice(5).replace('-', '/');
      if (day === lastDay) { values[values.length - 1] = best; continue; }
      lastDay = day;
      labels.push(day);
      values.push(best);
    }
    root.append(el('h2', null, '📈 Melhor marca registrada, dia a dia'));
    root.append(chartBox(lineChart(labels, values, { fmt: (v) => `${v}m` }),
      'Máximo acumulado sobre TODAS as corridas conhecidas (inclui quem não está no ranking).'));
  }
}

function tabDifficulty(root) {
  const agg = aggregate(cache.docs);
  const runs = allRuns(cache.docs);
  const deaths = runs.filter((r) => r.c && r.c !== 'win');

  root.append(el('h2', null, '💀 Onde as corridas terminam'));
  if (deaths.length) {
    // Cortar a cauda: uma única corrida de 3161m esticava o eixo e espremia
    // a região de 0–1000m, que é onde 95% das mortes acontecem
    const values = deaths.map((r) => r.m).sort((a, b) => a - b);
    const p97 = values[Math.min(values.length - 1, Math.floor(values.length * 0.97))];
    const top = Math.max(200, Math.ceil(p97 / 100) * 100);
    const cut = values.filter((m) => m > top).length;
    root.append(chartBox(
      histogram(values, { binSize: 25, unit: 'm', max: top }),
      `${deaths.length} mortes, em faixas de 25m. Um PICO num valor único é sempre um ` +
      'obstáculo específico — não dificuldade difusa.' +
      (cut ? ` (${cut} corrida(s) acima de ${top}m ficaram na última faixa.)` : '')));
  } else {
    root.append(el('p', 'stats-status',
      'Sem causa registrada nas corridas do período (gravada a partir da v1.6).'));
  }

  // O cruzamento que hoje não existe: as duas dimensões vivem separadas
  root.append(el('h2', null, '🎯 Causa × faixa de distância'));
  const bands = ['0–200', '200–400', '400–600', '600–800', '800–1000', '1000m+'];
  const causeKeys = ['wall', 'spike', 'animal', 'dart', 'tower', 'boss', 'boss2', 'boss3', 'fall'];
  const rows = causeKeys.map((k) => Constants.CAUSE_LABELS[k] || k);
  const matrix = causeKeys.map(() => bands.map(() => 0));
  for (const r of deaths) {
    const ci = causeKeys.indexOf(r.c);
    if (ci < 0) continue;
    const bi = Math.min(bands.length - 1, Math.floor(r.m / 200));
    matrix[ci][bi]++;
  }
  root.append(chartBox(heatmap(rows, bands, matrix, { fmt: (v) => `${v} mortes` }),
    'Conteúdo caro que só mata numa faixa onde quase ninguém chega é conteúdo invisível.'));

  root.append(el('h2', null, '💀 Mortes por etapa do jogo (total vitalício)'));
  root.append(barChart([
    ['Tier 1 (0–200m)', agg.deathsTier[0]],
    ['Tier 2 (200–400m)', agg.deathsTier[1]],
    ['Tier 3 (400–600m)', agg.deathsTier[2]],
    ['Tier 4 (600–800m)', agg.deathsTier[3]],
    ['Tier 5 (800–1000m)', agg.deathsTier[4]],
    ['Tier 6 (1000m+ ∞)', agg.deathsTier[5]],
  ]));

  root.append(el('h2', null, '⚔️ Mortes por causa (total vitalício)'));
  root.append(barChart(
    Object.entries(Constants.CAUSE_LABELS)
      .filter(([k]) => k !== 'win')
      .map(([k, label]) => [label, agg.causes[k] || 0])
  ));

  // Curva de aprendizado: o jogo ENSINA ou sorteia?
  const buckets = [[1, 5], [6, 15], [16, 30], [31, 50], [51, 100], [101, 1e9]];
  const labels = ['1–5', '6–15', '16–30', '31–50', '51–100', '100+'];
  const sums = buckets.map(() => [0, 0]);
  for (const r of runs) {
    const i = buckets.findIndex(([a, b]) => r.attemptIndex >= a && r.attemptIndex <= b);
    if (i < 0) continue;
    sums[i][0] += r.m;
    sums[i][1]++;
  }
  const usable = sums.map(([sum, n], i) => [labels[i], n ? Math.round(sum / n) : 0])
    .filter((_, i) => sums[i][1] > 0);
  if (usable.length > 1) {
    root.append(el('h2', null, '🎓 Curva de aprendizado'));
    root.append(chartBox(
      lineChart(usable.map(([l]) => l), usable.map(([, v]) => v), { fmt: (v) => `${v}m` }),
      'Distância média por faixa de tentativa. Curva PLANA = o jogo sorteia em vez de ensinar.'));
  }
}

function tabEngagement(root) {
  const runs = allRuns(cache.docs);
  const agg = aggregate(cache.docs);

  const ret = retention(cache.docs);
  root.append(el('h2', null, '🔁 Retenção'));
  if (ret.covered === 0) {
    root.append(el('p', 'stats-status',
      'A retenção depende do histórico diário, gravado a partir da v1.6.1 — ' +
      'ela aparece conforme os aparelhos forem atualizando.'));
  } else {
    root.append(barChart(
      ret.marks.map((k, i) => [`D${k}`, ret.elig[i] ? Math.round((ret.hit[i] / ret.elig[i]) * 100) : 0]),
      100, (v) => `${v}%`));
    root.append(el('p', 'stats-note',
      `Base: ${ret.covered} aparelho(s) com histórico diário. "D7" = voltou exatamente ` +
      '7 dias depois do primeiro dia.'));
  }

  // Hora do dia: quando o jogo é jogado (relógio de QUEM ABRE este painel)
  const hours = new Array(24).fill(0);
  for (const r of runs) if (r.t) hours[new Date(r.t * 1000).getHours()]++;
  if (runs.length) {
    root.append(el('h2', null, '🕒 Execuções por hora do dia'));
    root.append(chartBox(
      comboChart(hours.map((_, h) => `${h}h`), hours, [],
        { barLabel: 'execuções', height: 200 }),
      'No seu fuso horário — é o relógio de quem abre este painel, não o do jogador.'));
  }

  const durations = runs.map((r) => r.s).filter((s) => s > 0);
  if (durations.length) {
    root.append(el('h2', null, '⏱️ Duração das corridas'));
    root.append(chartBox(
      histogram(durations, { binSize: 10, unit: 's', color: '#4ecdc4' }),
      `${durations.length} corridas com duração registrada (a partir da v1.6).`));
  }

  root.append(el('h2', null, '🚪 Quem fica e quem sai'));
  const churn = cache.docs.filter((d) => num(d.attempts) <= 2).length;
  const loyal = cache.docs.filter((d) => num(d.attempts) >= 20).length;
  const cards = el('div', 'stat-cards');
  cards.append(
    card(`${((churn / agg.players) * 100).toFixed(0)}%`, 'saíram com ≤2 tentativas'),
    card(`${((loyal / agg.players) * 100).toFixed(0)}%`, 'com 20+ tentativas'),
    card(runs.length, `execuções no período (${periodDays ? `${periodDays}d` : 'tudo'})`),
    card(new Set(runs.map((r) => r.id)).size, 'jogadores ativos no período'),
  );
  root.append(cards);

  root.append(el('h2', null, '📊 Distribuição dos recordes pessoais'));
  root.append(chartBox(
    histogram(cache.docs.map((d) => num(d.bestM)), { binSize: 100, unit: 'm', color: '#ffcc00' }),
    'Onde está o teto real da base de jogadores.'));
}

function tabMechanics(root) {
  const runs = allRuns(cache.docs);
  const withData = runs.filter((r) => r.j > 0 || r.d > 0 || r.w > 0);

  if (!withData.length) {
    root.append(el('h2', null, '💨 Mecânicas'));
    root.append(el('p', 'stats-status',
      'As mecânicas por corrida (investidas, pulos, paredes, rampas, torres) começam a ser ' +
      'gravadas na v1.6.1. Esta aba se preenche conforme os aparelhos forem atualizando.'));
    return;
  }

  // A pergunta central: quem morre cedo é quem não descobriu a investida?
  const byPlayer = new Map();
  for (const r of withData) {
    const p = byPlayer.get(r.id) || { runs: 0, d: 0, best: 0, r: 0, o: 0, x: 0, f: 0 };
    p.runs++;
    p.d += r.d;
    p.r += r.r;
    p.o += r.o;
    p.x += r.x;
    p.f += r.f;
    p.best = Math.max(p.best, r.m);
    byPlayer.set(r.id, p);
  }
  const players = [...byPlayer.values()];
  const pct = (n) => `${Math.round((n / players.length) * 100)}%`;

  root.append(el('h2', null, '💨 Quem descobriu cada mecânica'));
  root.append(barChart([
    ['💨 já investiu', players.filter((p) => p.d > 0).length],
    ['🏔️ já destruiu rampa', players.filter((p) => p.r > 0).length],
    ['🏰 já derrubou torre', players.filter((p) => p.o > 0).length],
    ['🔥 Fúria Total', players.filter((p) => p.f > 0).length],
  ], players.length, (v) => `${v} (${pct(v)})`));

  const noDash = players.filter((p) => p.d === 0);
  const withDash = players.filter((p) => p.d > 0);
  if (noDash.length && withDash.length) {
    const avg = (arr) => Math.round(arr.reduce((a, p) => a + p.best, 0) / arr.length);
    root.append(el('h2', null, '🎯 Investida × desempenho'));
    root.append(barChart([
      [`usa a investida (${withDash.length})`, avg(withDash)],
      [`nunca investiu (${noDash.length})`, avg(noDash)],
    ], null, (v) => `${v}m`));
    root.append(el('p', 'stats-note',
      'Melhor marca média de cada grupo. Uma diferença grande diz que o problema não é ' +
      'dificuldade — é ENSINO da mecânica.'));
  }

  // Investida pedida durante o cooldown: atrito direto com a espera
  const wasted = withData.reduce((a, r) => a + r.x, 0);
  const fired = withData.reduce((a, r) => a + r.d, 0);
  root.append(el('h2', null, '⏳ Atrito com o cooldown'));
  const cards = el('div', 'stat-cards');
  cards.append(
    card(fired, 'investidas que saíram'),
    card(wasted, 'pedidas durante a recarga'),
    card(fired + wasted > 0 ? `${Math.round((wasted / (fired + wasted)) * 100)}%` : '0%',
      'dos toques de investida foram negados'),
    card((withData.reduce((a, r) => a + r.j, 0) / withData.length).toFixed(1), 'pulos por corrida'),
  );
  root.append(cards);

  // Uso por faixa de distância: o conteúdo está onde as pessoas chegam?
  const bands = ['0–200', '200–400', '400–600', '600–800', '800–1000', '1000m+'];
  const rows = ['🧱 paredes', '🏔️ rampas', '🏰 torres', '🦁 animais'];
  const keys = ['w', 'r', 'o', 'a'];
  const matrix = keys.map(() => bands.map(() => 0));
  for (const run of withData) {
    const bi = Math.min(bands.length - 1, Math.floor(run.m / 200));
    keys.forEach((k, i) => { matrix[i][bi] += run[k]; });
  }
  root.append(el('h2', null, '🗺️ O que é destruído, e onde'));
  root.append(chartBox(heatmap(rows, bands, matrix, { fmt: (v) => `${v}` }),
    'Cada corrida cai na faixa em que TERMINOU, então as faixas altas somam o caminho inteiro.'));

  // A luta do portão (v1.7): tentativa = qualquer corrida que entrou na
  // arena (z conta a partir do WIN-1100); fuga = as 3 camadas quebradas
  const fights = runs.filter((r) => r.z > 0 || r.b > 0 || r.q > 0);
  if (fights.length) {
    const bossWins = fights.filter((r) => r.b >= 3).length;
    const bossDeaths = fights.filter((r) => r.c === 'boss').length;
    const avg = (f) => fights.reduce((a, r) => a + f(r), 0) / fights.length;
    root.append(el('h2', null, '⚔️ A luta do portão'));
    const bossCards = el('div', 'stat-cards');
    bossCards.append(
      card(fights.length, 'lutas contra o caçador'),
      card(`${Math.round((bossWins / fights.length) * 100)}%`, 'terminaram em fuga (3 camadas)'),
      card(bossDeaths, 'mortes pelo rifle'),
      card(`${avg((r) => r.z).toFixed(0)}s · ${avg((r) => r.q).toFixed(1)}`, 'duração média · quiques médios'),
    );
    root.append(bossCards);
    root.append(el('p', 'stats-note',
      'Muitos quiques com poucas camadas quebradas = o loop "recue e invista na fresta" ' +
      'não está sendo lido. A régua de calibragem do boss vive aqui.'));
  }

  const keyboard = withData.filter((r) => r.k).length;
  root.append(el('h2', null, '⌨️ Teclado × toque'));
  root.append(chartBox(donut([
    ['teclado (desktop)', keyboard],
    ['toque', withData.length - keyboard],
  ], { size: 150 })));
}

function tabAudience(root) {
  const agg = aggregate(cache.docs);

  root.append(el('h2', null, '📱 Dispositivos, sistema e navegador'));
  const grid = el('div', 'donut-grid');
  for (const [title, map] of [
    ['Dispositivo', agg.device], ['Sistema', agg.os], ['Navegador', agg.browser],
  ]) {
    const box = el('div');
    box.append(el('h3', null, title), donut(topEntries(map, 6), { size: 150 }));
    grid.append(box);
  }
  root.append(grid);

  if (agg.model.size) {
    root.append(el('h2', null, '📲 Modelos (Android/Chromium)'));
    root.append(barChart(topEntries(agg.model, 10)));
  }
  root.append(el('h2', null, '🔳 Resoluções de tela'));
  root.append(barChart(topEntries(agg.screen, 8)));

  root.append(el('h2', null, '🌍 Países'));
  root.append(chartBox(treemap(topEntries(agg.country, 12), { height: 180 })));
  if (agg.city.size) {
    root.append(el('h2', null, '🏙️ Cidades (última localização conhecida)'));
    root.append(chartBox(treemap(topEntries(agg.city, 16), { height: 240 }),
      'A cidade é revalidada a cada 12h — é sempre a mais recente, não a mais frequente.'));
  }
  if (agg.tz.size) {
    root.append(el('h2', null, '🕰️ Fusos horários'));
    root.append(barChart(topEntries(agg.tz, 8)));
  }

  root.append(el('h2', null, '🏷️ Versões do jogo'));
  root.append(chartBox(donut(topEntries(agg.version, 6), { size: 150 })));
}

function tabPlayers(root) {
  const playersBox = el('div', 'stats-players');
  const body = el('div');
  root.append(playersBox, body);

  const showList = () => {
    playersBox.textContent = '';
    body.textContent = '';
    drawPlayerList(playersBox, showPlayer);
  };
  const showPlayer = (id) => {
    playersBox.textContent = '';
    body.textContent = '';
    const back = el('button', 'stats-back', '← voltar à lista');
    back.addEventListener('click', showList);
    playersBox.append(back);
    drawPlayerCard(body, cache.docs.find((d) => d.id === id));
    body.scrollIntoView({ block: 'start' });
  };
  showList();
}

// ============================================================ modo detalhado

// Resumo de 1 jogador para a tabela (aceita doc v1.3.0 achatado, v1.3.1
// aninhado e v1.5.0 com history)
function playerRow(doc) {
  const client = (doc.client && typeof doc.client === 'object') ? doc.client : doc;
  const geo = (doc.geo && typeof doc.geo === 'object') ? doc.geo : doc;
  const hist = (doc.history && typeof doc.history === 'object') ? doc.history : {};
  const device = topKey(hist.clients) ||
    [str(client.device), str(client.os), str(client.browser)].filter(Boolean).join(' · ') ||
    'desconhecido';
  // ⚠️ v1.8.4: `best` é `stats.bestM` — METROS de telemetria, NÃO o ranking.
  // Os pontos são outra coleção (`scores`) e entram como campo próprio:
  // sobrescrever um pelo outro apagaria a distância real do jogador, que é o
  // que alimenta funil, histograma e a evolução das corridas.
  const rank = cache.scores.get(doc.id) || null;
  return {
    id: doc.id,
    name: cache.names.get(doc.id) || `Anônimo (${doc.id.slice(0, 8)})`,
    best: num(doc.bestM),
    // Ranking: total em pontos e os metros DA MARCA (podem divergir do bestM
    // — a marca enviada é uma corrida específica). 0 = nunca pontuou.
    pts: rank ? rank.score : 0,
    rankM: rank ? rank.m : 0,
    attempts: num(doc.attempts),
    wins: num(doc.wins),
    playTimeS: num(doc.playTimeS),
    lastSeenS: tsSeconds(doc.updatedAt),
    firstSeenS: num(hist.firstSeenS),
    device,
    // ÚLTIMA localização (o mapa `geo` é reescrito a cada envio), não a mais
    // frequente: `topKey(hist.geos)` respondia "onde ele mais jogou", que é
    // outra pergunta — essa virou a seção "de onde jogou" da ficha.
    place: lastPlace(geo) || topKey(hist.geos) || '??',
    placeAtS: num(geo.at),
    version: str(doc.gameVersion) || 'pré-1.3.0',
  };
}

function topKey(obj) {
  const entries = Object.entries(obj || {}).filter(([, v]) => typeof v === 'number');
  if (!entries.length) return '';
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

// "Cidade (Região) · BR" a partir do mapa `geo` do doc
function lastPlace(geo) {
  const city = str(geo.city);
  const region = str(geo.region);
  const country = str(geo.country);
  const place = city ? (region ? `${city} (${region})` : city) : '';
  if (place) return country ? `${place} · ${country}` : place;
  return country;
}

// Idade da medição de localização — "agora", "há 3h", "há 12 dias"
function ageLabel(epochS) {
  if (!epochS) return '';
  const s = Math.max(0, Math.floor(Date.now() / 1000) - epochS);
  if (s < 3600) return 'agora há pouco';
  if (s < 86400) return `há ${Math.floor(s / 3600)}h`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'ontem' : `há ${d} dias`;
}

// Timestamp do Firestore (lite) → epoch em segundos
function tsSeconds(ts) {
  if (!ts) return 0;
  if (typeof ts.seconds === 'number') return ts.seconds;
  if (typeof ts._seconds === 'number') return ts._seconds;
  if (typeof ts.toDate === 'function') return Math.floor(ts.toDate().getTime() / 1000);
  return 0;
}

function fmtDate(epochS, withTime = false) {
  if (!epochS) return '—';
  const d = new Date(epochS * 1000);
  return withTime ? d.toLocaleString('pt-BR') : d.toLocaleDateString('pt-BR');
}

const COLUMNS = [
  { key: 'name', label: 'Jogador', text: (r) => r.name, num: false },
  // 'Recorde' segue em METROS (stats.bestM, façanha física); 'Pontos' é a
  // coluna de RANKING (scores.score) — as duas ordenam de forma diferente e
  // é justamente essa diferença que a v1.8.4 quis expor.
  { key: 'best', label: 'Recorde', text: (r) => `${r.best}m` },
  { key: 'pts', label: 'Pontos', text: (r) => (r.pts ? ScoreSystem.fmtPts(r.pts) : '—') },
  { key: 'attempts', label: 'Execuções', text: (r) => `${r.attempts}` },
  { key: 'wins', label: 'Fugas', text: (r) => `${r.wins}` },
  { key: 'playTimeS', label: 'Tempo', text: (r) => formatTime(r.playTimeS) },
  { key: 'lastSeenS', label: 'Último acesso', text: (r) => fmtDate(r.lastSeenS) },
  { key: 'device', label: 'Aparelho', text: (r) => r.device, num: false },
  { key: 'place', label: 'Local (último)', text: (r) => r.place, num: false },
];

function drawPlayerList(root, onSelect) {
  const rows = cache.docs.map(playerRow);
  let sortKey = 'best';
  let sortDesc = true;
  let filter = '';

  root.append(el('h2', null, `👥 Jogadores (${rows.length})`));
  const search = document.createElement('input');
  search.id = 'stats-search';
  search.placeholder = 'Buscar por apelido…';
  search.autocomplete = 'off';
  root.append(search);

  const table = el('table', 'players-table');
  const thead = el('thead');
  const headRow = el('tr');
  for (const col of COLUMNS) {
    const th = el('th', null, col.label);
    th.addEventListener('click', () => {
      if (sortKey === col.key) sortDesc = !sortDesc;
      else { sortKey = col.key; sortDesc = col.num !== false; }
      paint();
    });
    headRow.append(th);
  }
  thead.append(headRow);
  const tbody = el('tbody');
  table.append(thead, tbody);
  const wrap = el('div', 'table-wrap');
  wrap.append(table);
  root.append(wrap);

  const paint = () => {
    [...headRow.children].forEach((th, i) => {
      th.className = COLUMNS[i].key === sortKey ? (sortDesc ? 'sort-desc' : 'sort-asc') : '';
    });
    tbody.textContent = '';
    const col = COLUMNS.find((c) => c.key === sortKey);
    const visible = rows
      .filter((r) => !filter || r.name.toLowerCase().includes(filter))
      .sort((a, b) => {
        const [x, y] = [a[sortKey], b[sortKey]];
        const cmp = col.num === false ? String(x).localeCompare(String(y)) : x - y;
        return sortDesc ? -cmp : cmp;
      });
    for (const r of visible) {
      const tr = el('tr');
      for (const c of COLUMNS) tr.append(el('td', null, c.text(r)));
      tr.addEventListener('click', () => onSelect(r.id));
      tbody.append(tr);
    }
    if (!visible.length) {
      const empty = el('tr');
      const td = el('td', null, 'Nenhum jogador com esse apelido.');
      td.colSpan = COLUMNS.length;
      empty.append(td);
      tbody.append(empty);
    }
  };
  search.addEventListener('input', () => { filter = search.value.trim().toLowerCase(); paint(); });
  paint();
}

// Ficha completa: quem é, evolução, aparelhos/locais/versões e mortes
function drawPlayerCard(root, doc) {
  if (!doc) return;
  const r = playerRow(doc);
  const agg = aggregate([doc]);
  const hist = (doc.history && typeof doc.history === 'object') ? doc.history : null;
  const runs = Array.isArray(doc.runs) ? doc.runs : [];

  root.append(el('h2', null, `👤 ${r.name}`));
  const age = ageLabel(r.placeAtS);
  root.append(el('p', 'stats-sub',
    `id ${doc.id.slice(0, 8)} · ${r.device} · ${r.place}${age ? ` (${age})` : ''} · versão ${r.version}`));

  const cards = el('div', 'stat-cards');
  const days = hist && hist.days ? Object.keys(hist.days).length
    : new Set(runs.map((x) => fmtDate(num(x && x.t)))).size;
  cards.append(
    card(`${r.best}m`, '🏆 recorde'),
    // Ranking (coleção `scores`) ao lado do recorde de telemetria (bestM):
    // grandezas diferentes, e a marca enviada é uma corrida específica, então
    // os metros dela podem ser menores que o bestM da janela local
    ...(r.pts ? [card(ScoreSystem.fmtPts(r.pts), `🥇 pontos no ranking · ${r.rankM}m`)] : []),
    card(r.attempts, 'execuções'),
    card(r.wins, 'fugas'),
    card(`${r.attempts ? ((r.wins / r.attempts) * 100).toFixed(1) : '0.0'}%`, 'fugas por execução'),
    card(formatTime(r.playTimeS), 'tempo jogado'),
    card(formatTime(r.attempts ? r.playTimeS / r.attempts : 0), 'tempo médio/execução'),
    card(fmtDate(r.firstSeenS), '1º acesso'),
    card(fmtDate(r.lastSeenS), 'último acesso'),
    card(days || '—', 'dias com registro'),
    card(doc.standalone === true ? 'sim' : 'não', 'PWA instalado'),
  );
  root.append(cards);

  // Evolução: uma barra por execução registrada (as últimas 50)
  root.append(el('h2', null, `📈 Evolução das últimas execuções (${runs.length})`));
  if (!runs.length) {
    root.append(el('p', 'stats-status', 'Sem histórico ainda — registrado a partir da v1.4.0.'));
  } else {
    root.append(runsChart(runs));

    // v1.8.4: o bônus de cada corrida RECOMPUTADO aqui, a partir dos
    // contadores que já viajavam em runs[] (w/r/o/a/b/c/z). Sai de graça e
    // vale para o histórico INTEIRO — inclusive corridas anteriores à
    // v1.8.4, que nunca tiveram pontuação calculada. Como os pesos são
    // mutáveis (Constants.SCORE_WEIGHTS), este número é sempre o que a
    // tabela de pesos ATUAL diria — é leitura de calibração, não o total
    // histórico que foi de fato enviado ao ranking.
    const bonusOf = (run) => Math.max(0, Math.floor(Number(ScoreSystem.runBonus(run)) || 0));
    const bonusTotal = runs.reduce((a, run) => a + bonusOf(run), 0);
    if (bonusTotal > 0) {
      root.append(el('p', 'stats-note',
        `🥇 Bônus recomputado destas ${runs.length} corridas: ${ScoreSystem.fmtPts(bonusTotal)}` +
        ` · média ${Math.round(bonusTotal / runs.length)} por corrida` +
        ' (pesos atuais do Constants.SCORE_WEIGHTS — não é o que já foi enviado ao ranking)'));
    }

    const list = el('ul', 'runs-list', '');
    for (const run of runs.slice().reverse()) {
      const bonus = bonusOf(run);
      const extra = [
        num(run && run.s) ? `${num(run.s)}s` : '',
        str(run && run.c) ? (Constants.CAUSE_LABELS[run.c] || run.c) : '',
        num(run && run.d) ? `💨${num(run.d)}` : '',
        num(run && run.w) ? `🧱${num(run.w)}` : '',
        num(run && run.r) ? `🏔️${num(run.r)}` : '',
        bonus ? `🥇+${bonus}` : '',
      ].filter(Boolean).join(' · ');
      list.append(el('li', null,
        `${fmtDate(num(run && run.t), true)} — ${num(run && run.m)}m${extra ? ` · ${extra}` : ''}`));
    }
    const details = el('details');
    details.append(el('summary', null, 'ver cada execução em detalhe'), list);
    root.append(details);
  }

  // Atividade diária deste jogador (v1.6.1)
  if (hist && hist.days && Object.keys(hist.days).length > 1) {
    const keys = Object.keys(hist.days).sort();
    root.append(el('h2', null, '📅 Atividade por dia'));
    root.append(chartBox(comboChart(
      keys.map((k) => k.slice(5).replace('-', '/')),
      keys.map((k) => num(hist.days[k] && hist.days[k].r)),
      keys.map((k) => num(hist.days[k] && hist.days[k].b)),
      { barLabel: 'execuções', lineLabel: 'melhor marca (m)', height: 200 }
    )));
  }

  // Histórico acumulado (v1.5.0)
  if (hist && (Object.keys(hist.clients || {}).length || Object.keys(hist.geos || {}).length)) {
    root.append(el('h2', null, '📱 Aparelhos usados'));
    root.append(barChart(topEntries(new Map(Object.entries(hist.clients || {})), 12), null, (v) => `${v} exec.`));
    if (Object.keys(hist.geos || {}).length) {
      root.append(el('h2', null, '🌍 De onde já jogou (histórico)'));
      root.append(barChart(topEntries(new Map(Object.entries(hist.geos || {})), 10), null, (v) => `${v} exec.`));
    }
    if (Object.keys(hist.versions || {}).length) {
      root.append(el('h2', null, '🏷️ Versões jogadas'));
      root.append(barChart(topEntries(new Map(Object.entries(hist.versions || {})), 10), null, (v) => `${v} exec.`));
    }
  } else {
    root.append(el('h2', null, '📱 Aparelhos usados'));
    root.append(el('p', 'stats-status', 'O histórico acumulado começa na v1.5.0 — este jogador só tem o último aparelho registrado.'));
  }

  root.append(el('h2', null, '💀 Mortes por etapa'));
  root.append(barChart([
    ['Tier 1 (0–200m)', agg.deathsTier[0]], ['Tier 2 (200–400m)', agg.deathsTier[1]],
    ['Tier 3 (400–600m)', agg.deathsTier[2]], ['Tier 4 (600–800m)', agg.deathsTier[3]],
    ['Tier 5 (800–1000m)', agg.deathsTier[4]], ['Tier 6 (1000m+ ∞)', agg.deathsTier[5]],
  ]));
  root.append(el('h2', null, '⚔️ Mortes por causa'));
  root.append(barChart(
    Object.entries(Constants.CAUSE_LABELS)
      .filter(([k]) => k !== 'win')
      .map(([k, label]) => [label, agg.causes[k] || 0])
  ));
}

// Barras verticais das execuções, em ordem cronológica; a marca do portão
// vira uma linha de referência quando o jogador chegou perto dela
function runsChart(runs) {
  const wrap = el('div', 'runs-chart');
  const max = Math.max(1, ...runs.map((r) => num(r && r.m)));
  for (const run of runs) {
    const m = num(run && run.m);
    const bar = el('div', 'run-bar');
    bar.style.height = `${Math.max(2, (m / max) * 100)}%`;
    if (m >= GATE_M) bar.classList.add('escaped');
    bar.title = `${fmtDate(num(run && run.t), true)} — ${m}m`;
    wrap.append(bar);
  }
  const box = el('div', 'runs-chart-box');
  box.append(wrap, el('div', 'runs-chart-max', `máx ${max}m`));
  return box;
}

// ============================================================ agregação

// Exportada para o grupo de testes (tools/test-stats.mjs). A FORMA do retorno
// é contrato desse teste — chaves novas podem entrar, as antigas não saem.
export function aggregate(docs) {
  const agg = {
    players: docs.length,
    attempts: 0,
    wins: 0,
    playTimeS: 0,
    standalone: 0,
    deathsTier: [0, 0, 0, 0, 0, 0],
    causes: { wall: 0, spike: 0, animal: 0, dart: 0, tower: 0, boss: 0, boss2: 0, boss3: 0, fall: 0 },
    funnelSteps: [],
    escaped: 0,
    device: new Map(),
    os: new Map(),
    browser: new Map(),
    model: new Map(),
    screen: new Map(),
    country: new Map(),
    city: new Map(),
    tz: new Map(), // v1.6.1
    version: new Map(),
  };

  const inc = (map, key) => map.set(key, (map.get(key) || 0) + 1);
  const bests = [];

  for (const d of docs) {
    // Dois formatos convivem: docs v1.3.1+ aninham deaths/client/geo em
    // mapas; docs v1.3.0 têm tudo achatado (deathsT1, device, country...)
    const deaths = (d.deaths && typeof d.deaths === 'object') ? d.deaths : {
      t1: d.deathsT1, t2: d.deathsT2, t3: d.deathsT3, t4: d.deathsT4,
      wall: d.deathWall, spike: d.deathSpike, animal: d.deathAnimal,
      dart: d.deathDart, tower: d.deathTower, fall: d.deathFall,
    };
    const client = (d.client && typeof d.client === 'object') ? d.client : d;
    const geo = (d.geo && typeof d.geo === 'object') ? d.geo : d;

    agg.attempts += num(d.attempts);
    agg.wins += num(d.wins);
    agg.playTimeS += num(d.playTimeS);
    if (d.standalone === true) agg.standalone++;

    agg.deathsTier[0] += num(deaths.t1);
    agg.deathsTier[1] += num(deaths.t2);
    agg.deathsTier[2] += num(deaths.t3);
    agg.deathsTier[3] += num(deaths.t4);
    agg.deathsTier[4] += num(deaths.t5); // modo infinito (docs antigos → 0)
    agg.deathsTier[5] += num(deaths.t6);
    agg.causes.wall += num(deaths.wall);
    agg.causes.spike += num(deaths.spike);
    agg.causes.animal += num(deaths.animal);
    agg.causes.dart += num(deaths.dart);
    agg.causes.tower += num(deaths.tower);
    agg.causes.boss += num(deaths.boss);
    agg.causes.boss2 += num(deaths.boss2); // v1.8.5 — Capturador do Cerco
    agg.causes.boss3 += num(deaths.boss3); // v1.8.5 — Caçador-Mor
    agg.causes.fall += num(deaths.fall);

    bests.push(num(d.bestM));
    if (num(d.wins) > 0) agg.escaped++;

    inc(agg.device, str(client.device) || 'desconhecido');
    inc(agg.os, str(client.os) ? `${str(client.os)} ${majorVersion(client.osVersion)}`.trim() : 'desconhecido');
    inc(agg.browser, str(client.browser) || 'desconhecido');
    if (str(client.model)) inc(agg.model, str(client.model));
    if (str(client.screen)) inc(agg.screen, str(client.screen));
    if (str(client.tz)) inc(agg.tz, str(client.tz));
    inc(agg.country, str(geo.country) || '??');
    if (str(geo.city)) inc(agg.city, str(geo.region) ? `${str(geo.city)} (${str(geo.region)})` : str(geo.city));
    inc(agg.version, str(d.gameVersion) || 'pré-1.3.0');
  }

  // Funil dinâmico: degraus de 200m até o MÁXIMO percorrido (modo infinito)
  const maxBest = Math.max(0, ...bests, 0);
  const top = Math.max(GATE_M, Math.ceil(maxBest / 200) * 200);
  for (let m = 200; m <= top; m += 200) {
    const label = m === GATE_M ? `${GATE_M}m 🗽 (o portão!)` : `${m}m`;
    agg.funnelSteps.push([label, bests.filter((b) => b >= m).length]);
  }

  return agg;
}

// ============================================================ utilitários

function num(v) {
  return typeof v === 'number' && isFinite(v) ? v : 0;
}

function str(v) {
  return typeof v === 'string' ? v : '';
}

function majorVersion(v) {
  return str(v).split('.')[0] || '';
}

// entries: [label, count][] já ordenadas; max define a barra cheia
function barChart(entries, max = null, fmt = (v) => `${v}`) {
  const wrap = el('div', null, '');
  const top = max !== null ? max : Math.max(1, ...entries.map(([, v]) => v));
  for (const [label, value] of entries) {
    const row = el('div', 'bar-row');
    row.append(el('div', 'bar-label', label));
    const track = el('div', 'bar-track');
    const fill = el('div', 'bar-fill');
    fill.style.width = `${Math.min(100, (value / top) * 100)}%`;
    track.append(fill);
    row.append(track, el('div', 'bar-value', fmt(value)));
    wrap.append(row);
  }
  return wrap;
}

function topEntries(map, limit = 6) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function card(value, label) {
  const c = el('div', 'stat-card');
  c.append(el('div', 'v', `${value}`), el('div', 'l', label));
  return c;
}

function formatTime(totalS) {
  const s = Math.round(totalS);
  if (s < 60) return `${s}s`; // corridas duram segundos: "0min" escondia tudo
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}min`;
}

function el(tag, className = null, text = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null) node.textContent = text;
  return node;
}
