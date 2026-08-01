import { getDb } from '../systems/LeaderboardSystem.js';

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

  // Filtro por jogador (padrão: agregado geral)
  const bar = el('div', 'stats-filter');
  const label = el('label', null, 'Jogador: ');
  label.htmlFor = 'stats-player';
  const select = document.createElement('select');
  select.id = 'stats-player';
  const optAll = document.createElement('option');
  optAll.value = '';
  optAll.textContent = `🌍 Todos (${cache.docs.length} jogador${cache.docs.length > 1 ? 'es' : ''})`;
  select.append(optAll);
  for (const doc of cache.docs) {
    const opt = document.createElement('option');
    opt.value = doc.id;
    // textContent: nomes vêm de terceiros
    opt.textContent = cache.names.get(doc.id) || `Anônimo (${doc.id.slice(0, 8)})`;
    select.append(opt);
  }
  bar.append(label, select);
  root.append(bar);

  const content = el('div', 'stats-content', '');
  root.append(content);

  const drawSelection = () => {
    content.textContent = '';
    const sel = select.value;
    const docs = sel ? cache.docs.filter((d) => d.id === sel) : cache.docs;
    // Card do recorde: geral (top-1 do ranking) ou do jogador filtrado
    const record = sel
      ? {
          name: cache.names.get(sel) || 'Anônimo',
          score: Math.max(0, ...docs.map((d) => num(d.bestM))),
        }
      : cache.topScore;
    // Modo individual: histórico das últimas execuções do jogador
    const runs = sel && docs[0] && Array.isArray(docs[0].runs) ? docs[0].runs : null;
    draw(content, aggregate(docs), record, runs);
  };
  select.addEventListener('change', drawSelection);
  drawSelection();
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
  const top = Math.max(800, Math.ceil(maxBest / 200) * 200);
  for (let m = 200; m <= top; m += 200) {
    const label = m === 800 ? '800m 🗽 (o portão!)' : `${m}m`;
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
    ['Tier 5 (800–1000m ∞)', agg.deathsTier[4]],
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
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}min`;
}

function el(tag, className = null, text = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null) node.textContent = text;
  return node;
}
