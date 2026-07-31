import { getDb } from '../systems/LeaderboardSystem.js';

// Painel público /?stats: baixa a coleção `stats` (leitura liberada nas
// rules) e agrega TUDO no cliente — sem lib de gráfico, só DOM + barras CSS,
// no mesmo espírito zero-build do jogo. Conteúdo de terceiros (cidades,
// modelos) entra sempre via textContent.
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

  let docs;
  try {
    const { fs, db } = await getDb();
    const snap = await fs.getDocs(fs.collection(db, 'stats'));
    docs = snap.docs.map((d) => d.data());
  } catch (e) {
    status.textContent = 'Não foi possível carregar as estatísticas. Verifique a conexão e tente de novo.';
    const retry = el('button', null, 'Tentar novamente');
    retry.addEventListener('click', () => render());
    root.append(retry);
    return;
  }

  status.remove();
  if (docs.length === 0) {
    root.append(el('p', 'stats-status', 'Nenhum dado ainda — jogue uma corrida!'));
    return;
  }
  draw(root, aggregate(docs));
}

// Exportada para o grupo de testes (tools/test-stats.mjs)
export function aggregate(docs) {
  const agg = {
    players: docs.length,
    attempts: 0,
    wins: 0,
    playTimeS: 0,
    standalone: 0,
    deathsTier: [0, 0, 0, 0],
    causes: { wall: 0, spike: 0, animal: 0, dart: 0, tower: 0, fall: 0 },
    funnel: { m200: 0, m400: 0, m600: 0, escaped: 0 },
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
  const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);

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
    agg.causes.wall += num(deaths.wall);
    agg.causes.spike += num(deaths.spike);
    agg.causes.animal += num(deaths.animal);
    agg.causes.dart += num(deaths.dart);
    agg.causes.tower += num(deaths.tower); // docs pré-1.3.1 não têm
    agg.causes.fall += num(deaths.fall);

    const best = num(d.bestM);
    if (best >= 200) agg.funnel.m200++;
    if (best >= 400) agg.funnel.m400++;
    if (best >= 600) agg.funnel.m600++;
    if (num(d.wins) > 0) agg.funnel.escaped++;

    inc(agg.device, str(client.device) || 'desconhecido');
    inc(agg.os, str(client.os) ? `${str(client.os)} ${majorVersion(client.osVersion)}`.trim() : 'desconhecido');
    inc(agg.browser, str(client.browser) || 'desconhecido');
    if (str(client.model)) inc(agg.model, str(client.model));
    if (str(client.screen)) inc(agg.screen, str(client.screen));
    inc(agg.country, str(geo.country) || '??');
    if (str(geo.city)) inc(agg.city, str(geo.region) ? `${str(geo.city)} (${str(geo.region)})` : str(geo.city));
    inc(agg.version, str(d.gameVersion) || 'pré-1.3.0');
  }
  return agg;
}

function str(v) {
  return typeof v === 'string' ? v : '';
}

function majorVersion(v) {
  return str(v).split('.')[0] || '';
}

function draw(root, agg) {
  // 1. Visão geral
  root.append(el('h2', null, '🦏 Visão geral'));
  const cards = el('div', 'stat-cards');
  const avgAttempts = agg.attempts / agg.players;
  const winRate = agg.attempts > 0 ? (agg.wins / agg.attempts) * 100 : 0;
  cards.append(
    card(agg.players, 'jogadores'),
    card(agg.attempts, 'execuções'),
    card(agg.wins, 'fugas (vitórias)'),
    card(`${winRate.toFixed(1)}%`, 'vitórias por execução'),
    card(formatTime(agg.playTimeS), 'tempo total jogado'),
    card(formatTime(agg.playTimeS / agg.players), 'tempo médio/jogador'),
    card(avgAttempts.toFixed(1), 'tentativas médias/jogador'),
    card(`${((agg.standalone / agg.players) * 100).toFixed(0)}%`, 'com PWA instalado'),
  );
  root.append(cards);

  // 2. Funil por etapa: até onde os jogadores chegam
  root.append(el('h2', null, '🏁 Progresso: quantos jogadores já alcançaram…'));
  root.append(barChart([
    ['200m (fim do tier 1)', agg.funnel.m200],
    ['400m (fim do tier 2)', agg.funnel.m400],
    ['600m (fim do tier 3)', agg.funnel.m600],
    ['800m (escapou!)', agg.funnel.escaped],
  ], agg.players, (v) => `${v} (${((v / agg.players) * 100).toFixed(0)}%)`));

  // 3. Onde o jogo mata
  root.append(el('h2', null, '💀 Mortes por etapa do jogo'));
  root.append(barChart([
    ['Tier 1 (0–200m)', agg.deathsTier[0]],
    ['Tier 2 (200–400m)', agg.deathsTier[1]],
    ['Tier 3 (400–600m)', agg.deathsTier[2]],
    ['Tier 4 (600–800m)', agg.deathsTier[3]],
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
  refresh.addEventListener('click', () => render());
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
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}min`;
}

function el(tag, className = null, text = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null) node.textContent = text;
  return node;
}
