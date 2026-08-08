import { getDb } from '../systems/LeaderboardSystem.js';
import { Constants } from '../utils/Constants.js';

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
// DOM + barras CSS, no mesmo espírito zero-build do jogo. Conteúdo de
// terceiros (nomes, cidades, modelos) entra sempre via textContent.
// Filtro por jogador: padrão agregado; trocar não refaz rede (cache).
let cache = null; // { docs, names, topScore }

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

      const names = new Map();
      let topScore = null;
      for (const d of scoresSnap.docs) {
        if (isProbe(d.id)) continue;
        const data = d.data();
        names.set(d.id, String(data.name || ''));
        const score = Number(data.score) || 0;
        if (!topScore || score > topScore.score) {
          topScore = { name: String(data.name || '???'), score };
        }
      }
      cache = {
        docs: statsSnap.docs.filter((d) => !isProbe(d.id)).map((d) => ({ id: d.id, ...d.data() })),
        names,
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

  const content = el('div', 'stats-content', '');

  // Modo detalhado: lista de jogadores + ficha individual (a visão que serve
  // para analisar). Sem a chave, só os agregados.
  if (await hasDetailAccess()) {
    const playersBox = el('div', 'stats-players');
    root.append(playersBox, content);

    const showList = () => {
      playersBox.textContent = '';
      content.textContent = '';
      drawPlayerList(playersBox, (id) => showPlayer(id));
      content.append(el('h2', null, '🌍 Agregado de todos os jogadores'));
      draw(content, aggregate(cache.docs), cache.topScore);
    };
    const showPlayer = (id) => {
      playersBox.textContent = '';
      content.textContent = '';
      const back = el('button', 'stats-back', '← voltar à lista');
      back.addEventListener('click', showList);
      playersBox.append(back);
      drawPlayerCard(content, cache.docs.find((d) => d.id === id));
      root.scrollIntoView({ block: 'start' });
    };
    showList();
    return;
  }

  root.append(content);
  draw(content, aggregate(cache.docs), cache.topScore);
}

// --------------------------------------------------------- modo detalhado

// Resumo de 1 jogador para a tabela (aceita doc v1.3.0 achatado, v1.3.1
// aninhado e v1.5.0 com history)
function playerRow(doc) {
  const client = (doc.client && typeof doc.client === 'object') ? doc.client : doc;
  const geo = (doc.geo && typeof doc.geo === 'object') ? doc.geo : doc;
  const hist = (doc.history && typeof doc.history === 'object') ? doc.history : {};
  const topKey = (obj) => {
    const entries = Object.entries(obj || {}).filter(([, v]) => typeof v === 'number');
    if (!entries.length) return '';
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  };
  const device = topKey(hist.clients) ||
    [str(client.device), str(client.os), str(client.browser)].filter(Boolean).join(' · ') ||
    'desconhecido';
  return {
    id: doc.id,
    name: cache.names.get(doc.id) || `Anônimo (${doc.id.slice(0, 8)})`,
    best: num(doc.bestM),
    attempts: num(doc.attempts),
    wins: num(doc.wins),
    playTimeS: num(doc.playTimeS),
    lastSeenS: tsSeconds(doc.updatedAt),
    firstSeenS: num(hist.firstSeenS),
    device,
    place: topKey(hist.geos) || str(geo.country) || '??',
    version: str(doc.gameVersion) || 'pré-1.3.0',
  };
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
  { key: 'best', label: 'Recorde', text: (r) => `${r.best}m` },
  { key: 'attempts', label: 'Execuções', text: (r) => `${r.attempts}` },
  { key: 'wins', label: 'Fugas', text: (r) => `${r.wins}` },
  { key: 'playTimeS', label: 'Tempo', text: (r) => formatTime(r.playTimeS) },
  { key: 'lastSeenS', label: 'Último acesso', text: (r) => fmtDate(r.lastSeenS) },
  { key: 'device', label: 'Aparelho', text: (r) => r.device, num: false },
  { key: 'place', label: 'Local', text: (r) => r.place, num: false },
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
  root.append(el('p', 'stats-sub', `id ${doc.id.slice(0, 8)} · ${r.device} · ${r.place} · versão ${r.version}`));

  const cards = el('div', 'stat-cards');
  const days = new Set(runs.map((x) => fmtDate(num(x && x.t)))).size;
  cards.append(
    card(`${r.best}m`, '🏆 recorde'),
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
    const list = el('ul', 'runs-list', '');
    for (const run of runs.slice().reverse()) {
      list.append(el('li', null, `${fmtDate(num(run && run.t), true)} — ${num(run && run.m)}m`));
    }
    const details = el('details');
    details.append(el('summary', null, 'ver data e hora de cada execução'), list);
    root.append(details);
  }

  // Histórico acumulado (v1.5.0)
  if (hist && (Object.keys(hist.clients || {}).length || Object.keys(hist.geos || {}).length)) {
    root.append(el('h2', null, '📱 Aparelhos usados'));
    root.append(barChart(topEntries(new Map(Object.entries(hist.clients || {})), 12), null, (v) => `${v} exec.`));
    if (Object.keys(hist.geos || {}).length) {
      root.append(el('h2', null, '🌍 De onde jogou'));
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
  root.append(barChart([
    ['🧱 Parede', agg.causes.wall], ['🔺 Espinho', agg.causes.spike],
    ['🦁 Animal', agg.causes.animal], ['💉 Dardo', agg.causes.dart],
    ['🏰 Torre', agg.causes.tower], ['🕳️ Anomalias de física', agg.causes.fall],
  ]));
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

// Exportada para o grupo de testes (tools/test-stats.mjs)
export function aggregate(docs) {
  const agg = {
    players: docs.length,
    attempts: 0,
    wins: 0,
    playTimeS: 0,
    standalone: 0,
    deathsTier: [0, 0, 0, 0, 0, 0],
    causes: { wall: 0, spike: 0, animal: 0, dart: 0, tower: 0, fall: 0 },
    funnelSteps: [],
    escaped: 0,
    device: new Map(),
    os: new Map(),
    browser: new Map(),
    model: new Map(),
    screen: new Map(),
    country: new Map(),
    city: new Map(),
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
    agg.causes.fall += num(deaths.fall);

    bests.push(num(d.bestM));
    if (num(d.wins) > 0) agg.escaped++;

    inc(agg.device, str(client.device) || 'desconhecido');
    inc(agg.os, str(client.os) ? `${str(client.os)} ${majorVersion(client.osVersion)}`.trim() : 'desconhecido');
    inc(agg.browser, str(client.browser) || 'desconhecido');
    if (str(client.model)) inc(agg.model, str(client.model));
    if (str(client.screen)) inc(agg.screen, str(client.screen));
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

function num(v) {
  return typeof v === 'number' && isFinite(v) ? v : 0;
}

function str(v) {
  return typeof v === 'string' ? v : '';
}

function majorVersion(v) {
  return str(v).split('.')[0] || '';
}

function draw(root, agg, record, runs = null) {
  // 1. Visão geral
  root.append(el('h2', null, '🦏 Visão geral'));
  const cards = el('div', 'stat-cards');
  const avgAttempts = agg.attempts / agg.players;
  const winRate = agg.attempts > 0 ? (agg.wins / agg.attempts) * 100 : 0;
  if (record && record.score > 0) {
    cards.append(card(`${record.score}m`, `🏆 recorde — ${record.name}`));
  }
  cards.append(
    card(agg.players, 'jogadores'),
    card(agg.attempts, 'execuções'),
    card(agg.wins, 'fugas (cruzaram o portão)'),
    card(`${winRate.toFixed(1)}%`, 'fugas por execução'),
    card(formatTime(agg.playTimeS), 'tempo total jogado'),
    card(formatTime(agg.playTimeS / agg.players), 'tempo médio/jogador'),
    card(avgAttempts.toFixed(1), 'tentativas médias/jogador'),
    card(`${((agg.standalone / agg.players) * 100).toFixed(0)}%`, 'com PWA instalado'),
  );
  root.append(cards);

  // 1b. Modo individual: data/hora e distância das últimas execuções
  if (runs !== null) {
    root.append(el('h2', null, '🕒 Últimas execuções'));
    if (runs.length === 0) {
      root.append(el('p', 'stats-status', 'Sem histórico ainda — registrado a partir da v1.4.0.'));
    } else {
      const list = el('ul', 'runs-list', '');
      for (const run of runs.slice().reverse()) {
        const t = num(run && run.t);
        const m = num(run && run.m);
        const when = t > 0 ? new Date(t * 1000).toLocaleString('pt-BR') : '—';
        list.append(el('li', null, `${when} — ${m}m`));
      }
      root.append(list);
    }
  }

  // 2. Funil dinâmico por 200m: até onde os jogadores chegam
  root.append(el('h2', null, '🏁 Progresso: quantos jogadores já alcançaram…'));
  root.append(barChart(
    agg.funnelSteps,
    agg.players,
    (v) => `${v} (${((v / agg.players) * 100).toFixed(0)}%)`
  ));

  // 3. Onde o jogo mata
  root.append(el('h2', null, '💀 Mortes por etapa do jogo'));
  root.append(barChart([
    ['Tier 1 (0–200m)', agg.deathsTier[0]],
    ['Tier 2 (200–400m)', agg.deathsTier[1]],
    ['Tier 3 (400–600m)', agg.deathsTier[2]],
    ['Tier 4 (600–800m)', agg.deathsTier[3]],
    ['Tier 5 (800–1000m)', agg.deathsTier[4]],
    ['Tier 6 (1000m+ ∞)', agg.deathsTier[5]],
  ]));

  root.append(el('h2', null, '⚔️ Mortes por causa'));
  root.append(barChart([
    ['🧱 Parede', agg.causes.wall],
    ['🔺 Espinho', agg.causes.spike],
    ['🦁 Animal', agg.causes.animal],
    ['💉 Dardo', agg.causes.dart],
    ['🏰 Torre', agg.causes.tower],
    ['🕳️ Anomalias de física', agg.causes.fall],
  ]));

  // 4. Dispositivos
  root.append(el('h2', null, '📱 Dispositivos'));
  root.append(barChart(topEntries(agg.device)));
  root.append(el('h2', null, '🖥️ Sistema operacional'));
  root.append(barChart(topEntries(agg.os, 10)));
  root.append(el('h2', null, '🌐 Navegadores'));
  root.append(barChart(topEntries(agg.browser, 8)));
  if (agg.model.size) {
    root.append(el('h2', null, '📲 Modelos (Android/Chromium)'));
    root.append(barChart(topEntries(agg.model, 10)));
  }
  root.append(el('h2', null, '🔳 Resoluções de tela'));
  root.append(barChart(topEntries(agg.screen, 8)));

  // 5. Geografia
  root.append(el('h2', null, '🌍 Países'));
  root.append(barChart(topEntries(agg.country, 12)));
  if (agg.city.size) {
    root.append(el('h2', null, '🏙️ Cidades'));
    root.append(barChart(topEntries(agg.city, 10)));
  }

  // 6. Adoção de versão
  root.append(el('h2', null, '🏷️ Versões do jogo'));
  root.append(barChart(topEntries(agg.version, 8)));

  const refresh = el('button', null, '🔄 Atualizar');
  refresh.addEventListener('click', () => { cache = null; render(); });
  root.append(refresh);
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
