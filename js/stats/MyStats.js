import { Constants } from '../utils/Constants.js';
import { StorageManager } from '../utils/StorageManager.js';
import { MEDALS } from '../systems/MedalSystem.js';
import { sparkline } from './Charts.js';

// "📊 Minhas estatísticas" — o espelho do jogador (v1.6.1).
//
// TUDO sai do localStorage: abre instantâneo, funciona offline e nunca
// segura a tela inicial esperando rede. A comparação mundial usa o rank e os
// rivais que o jogo JÁ cacheia (StorageManager.getLastRank/getRivals), então
// ela também é de graça — some quando não houver cache, em vez de travar.
const GATE_M = Constants.WIN_DISTANCE_PX / Constants.PIXELS_PER_METER;

function el(tag, className = null, text = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null) node.textContent = text; // textContent: apelido é livre
  return node;
}

function card(value, label) {
  const c = el('div', 'stat-card');
  c.append(el('div', 'v', `${value}`), el('div', 'l', label));
  return c;
}

function formatTime(totalS) {
  const s = Math.round(totalS);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}min`;
}

function bars(entries, fmt = (v) => `${v}`) {
  const wrap = el('div');
  const top = Math.max(1, ...entries.map(([, v]) => v));
  for (const [label, value] of entries) {
    if (!value) continue;
    const row = el('div', 'bar-row');
    row.append(el('div', 'bar-label', label));
    const track = el('div', 'bar-track');
    const fill = el('div', 'bar-fill');
    fill.style.width = `${(value / top) * 100}%`;
    track.append(fill);
    row.append(track, el('div', 'bar-value', fmt(value)));
    wrap.append(row);
  }
  return wrap;
}

// Números crus do aparelho, reaproveitados pelo modal E pelo texto de
// compartilhamento — para os dois nunca discordarem
export function mySummary() {
  const runs = StorageManager.getRuns();
  const deaths = StorageManager.getDeaths();
  const history = StorageManager.getHistory();
  const attempts = StorageManager.getAttempts();
  const playTimeS = StorageManager.getPlayTimeS();

  const totals = { w: 0, r: 0, o: 0, a: 0, j: 0, d: 0, x: 0, f: 0, b: 0 };
  for (const run of runs) {
    for (const k of Object.keys(totals)) totals[k] += Number(run && run[k]) || 0;
  }

  const medals = StorageManager.getMedals();
  return {
    record: StorageManager.getRecord(),
    attempts,
    wins: StorageManager.getWins(),
    playTimeS,
    runs,
    deaths,
    totals,
    days: Object.keys(history.days || {}).length,
    firstSeenS: history.firstSeenS || 0,
    medals: medals.length,
    medalsTotal: MEDALS.length,
    animalsTotal: StorageManager.getAnimalsTotal(),
    rank: StorageManager.getLastRank(),
    rivals: StorageManager.getRivals(),
    name: StorageManager.getPlayerName(),
  };
}

export function renderMyStats(root) {
  const s = mySummary();
  root.textContent = '';

  if (s.attempts === 0) {
    root.append(el('p', 'stats-status',
      'Você ainda não correu nenhuma vez. Jogue uma partida e volte aqui! 🦏'));
    return;
  }

  // ---- cartões
  const cards = el('div', 'stat-cards');
  cards.append(
    card(`${s.record}m`, '🏆 recorde'),
    card(s.attempts, '🎮 execuções'),
    card(s.wins, '🗽 fugas'),
    card(formatTime(s.playTimeS), '⏱️ tempo jogado'),
    card(formatTime(s.attempts ? s.playTimeS / s.attempts : 0), 'tempo médio'),
    card(s.days || 1, (s.days || 1) === 1 ? 'dia jogando' : 'dias jogando'),
  );
  root.append(cards);

  // ---- evolução
  if (s.runs.length > 1) {
    root.append(el('h3', null, `📈 Suas últimas ${s.runs.length} corridas`));
    const chart = sparkline(s.runs.map((r) => Number(r && r.m) || 0), {
      width: 320, height: 54, markAt: GATE_M,
    });
    const box = el('div', 'chart-box');
    box.append(chart);
    root.append(box);
    const best = Math.max(...s.runs.map((r) => Number(r && r.m) || 0));
    const last5 = s.runs.slice(-5);
    const avg5 = last5.reduce((a, r) => a + (Number(r && r.m) || 0), 0) / last5.length;
    root.append(el('p', 'stats-note',
      `máx ${best}m · média das últimas 5: ${Math.round(avg5)}m` +
      (s.runs.some((r) => (Number(r && r.m) || 0) >= GATE_M)
        ? ` · em dourado, as que passaram do portão dos ${GATE_M}m`
        : '')));
  }

  // ---- onde você morre
  const causes = Object.entries(Constants.CAUSE_LABELS)
    .filter(([k]) => k !== 'win')
    .map(([k, label]) => [label, Number(s.deaths[k]) || 0])
    .sort((a, b) => b[1] - a[1]);
  if (causes.some(([, v]) => v > 0)) {
    root.append(el('h3', null, '💀 Onde você morre'));
    root.append(bars(causes));
  }

  // ---- mecânicas (só a partir da v1.6.1: as corridas antigas não têm)
  const t = s.totals;
  if (t.w || t.r || t.o || t.d) {
    root.append(el('h3', null, '💨 Suas mecânicas'));
    root.append(bars([
      ['🧱 paredes quebradas', t.w],
      ['🏔️ rampas destruídas', t.r],
      ['🏰 torres derrubadas', t.o],
      ['🦁 animais atropelados', t.a],
      ['💨 investidas', t.d],
      ['🔥 especiais usados', t.f],
      ['🎯 camadas do portão quebradas', t.b],
      ['⬆️ pulos', t.j],
    ]));
    if (t.d === 0) {
      root.append(el('p', 'stats-note',
        '💡 Você ainda não usou a INVESTIDA (→ ou ENTER). É ela que quebra as paredes trincadas!'));
    } else if (t.x > t.d) {
      root.append(el('p', 'stats-note',
        `💡 Você pediu investida ${t.x}× enquanto ela recarregava — espere o ícone encher.`));
    }
  }

  // ---- medalhas
  root.append(el('h3', null, `🏅 Medalhas: ${s.medals}/${s.medalsTotal}`));
  const strip = el('div', 'my-medals');
  const owned = new Set(StorageManager.getMedals());
  for (const medal of MEDALS) {
    const got = owned.has(medal.id);
    const chip = el('span', got ? 'medal-chip' : 'medal-chip locked', medal.emoji);
    chip.title = got ? `${medal.name} — ${medal.desc}` : `🔒 ${medal.name}: ${medal.desc}`;
    strip.append(chip);
  }
  root.append(strip);

  // ---- comparação mundial (só com cache; nunca espera rede)
  const world = [];
  if (s.rank > 0) world.push(`🌍 você é o #${s.rank} do mundo`);
  const leader = s.rivals && s.rivals.leader;
  const rival = s.rivals && s.rivals.rival;
  if (leader && leader.score > 0) {
    world.push(leader.score > s.record
      ? `👑 líder: ${leader.name} com ${leader.score}m — faltam ${leader.score - s.record}m`
      : `👑 você é o líder mundial!`);
  }
  if (rival && rival.score > s.record) {
    world.push(`🎯 logo à frente: ${rival.name} com ${rival.score}m`);
  }
  if (world.length) {
    root.append(el('h3', null, '🌍 No mundo'));
    const list = el('ul', 'world-list');
    for (const line of world) list.append(el('li', null, line));
    root.append(list);
  }
}

// Resumo em markdown do WhatsApp (*negrito*), pronto para colar.
// `run` presente = compartilhando o resultado de UMA corrida; ausente = o
// perfil inteiro, a partir do modal.
export function shareText(run = null) {
  const s = mySummary();
  const lines = [];

  if (run) {
    if (run.legend) {
      lines.push(`👑 *SOU LENDA no FURIOUS RHINO!*`, `Cheguei ao FIM DO MUNDO — *${run.distance}m*`);
    } else if (run.escaped) {
      lines.push('🦏💨 *ESCAPEI DO ZOOLÓGICO!*', `Cheguei a *${run.distance}m* no FURIOUS RHINO`);
    } else {
      lines.push('🦏 *FURIOUS RHINO*', `Corri *${run.distance}m* fugindo do zoológico (morri tentando 💀)`);
    }
    if (run.isNewRecord) lines.push('🎉 novo recorde pessoal!');
    lines.push('');
  } else {
    lines.push(`🦏 *FURIOUS RHINO* — minhas marcas${s.name ? ` (${s.name})` : ''}`, '');
  }

  lines.push(`🏆 Recorde: *${s.record}m*`);
  lines.push(`🎮 ${s.attempts} execuç${s.attempts === 1 ? 'ão' : 'ões'} · ⏱️ ${formatTime(s.playTimeS)}`);
  if (s.wins > 0) lines.push(`🗽 Escapei do portão dos ${GATE_M}m ${s.wins}×`);
  if (s.medals > 0) lines.push(`🏅 ${s.medals}/${s.medalsTotal} medalhas`);
  if (s.rank > 0) lines.push(`🌍 #${s.rank} do mundo`);

  const leader = s.rivals && s.rivals.leader;
  if (leader && leader.score > s.record) {
    lines.push('', `Duvido você passar disso 😏 (o líder tem ${leader.score}m)`);
  } else {
    lines.push('', 'Duvido você passar disso 😏');
  }
  lines.push('', 'Grátis, abre direto no navegador:');
  return lines.join('\n');
}
