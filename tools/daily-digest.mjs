// Resumo diário do FURIOUS RHINO no ntfy (v1.6.1).
//   node tools/daily-digest.mjs              → imprime e envia
//   node tools/daily-digest.mjs --dry-run    → só imprime (não envia)
//
// Roda no GitHub Actions (.github/workflows/daily-digest.yml) num cron, e à
// mão a qualquer momento. Sem dependências: usa fetch do Node 18+.
//
// Por que um cron e não o navegador do jogador: o resumo tem de sair mesmo
// nos dias em que NINGUÉM jogou — que é justamente a informação mais
// importante para quem cuida do jogo.
//
// Variáveis de ambiente:
//   NTFY_TOPIC   (obrigatória para enviar)
//   NTFY_SERVER  (opcional, padrão https://ntfy.sh)
//   DIGEST_TZ    (opcional, padrão America/Sao_Paulo)
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TZ = process.env.DIGEST_TZ || 'America/Sao_Paulo';
const DRY = process.argv.includes('--dry-run');

// A apiKey sai do próprio repositório: ela é pública por design (a proteção
// são as rules), então não faz sentido guardá-la como secret.
function apiKey() {
  const src = readFileSync(join(ROOT, 'js', 'firebase-config.js'), 'utf8');
  const m = src.match(/apiKey:\s*'([^']+)'/);
  if (!m) throw new Error('apiKey não encontrada em js/firebase-config.js');
  return m[1];
}

function projectId() {
  const src = readFileSync(join(ROOT, 'js', 'firebase-config.js'), 'utf8');
  const m = src.match(/projectId:\s*'([^']+)'/);
  if (!m) throw new Error('projectId não encontrado em js/firebase-config.js');
  return m[1];
}

// O REST do Firestore devolve valores TIPADOS ({integerValue: "3"}); isto
// converte de volta para JS puro, recursivamente.
function decode(v) {
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

async function fetchCollection(name) {
  const base = `https://firestore.googleapis.com/v1/projects/${projectId()}` +
    `/databases/(default)/documents/${name}`;
  const out = [];
  let token = '';
  // Paginação: o painel do jogo baixa tudo de uma vez, mas aqui é código de
  // servidor e a base só cresce
  for (let page = 0; page < 40; page++) {
    const url = `${base}?pageSize=300&key=${apiKey()}${token ? `&pageToken=${token}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    const data = await res.json();
    for (const doc of data.documents || []) {
      const id = doc.name.split('/').pop();
      if (/^claude-/.test(id)) continue; // sondas de rules/e2e: nunca entram
      const row = { id };
      for (const [k, v] of Object.entries(doc.fields || {})) row[k] = decode(v);
      out.push(row);
    }
    token = data.nextPageToken || '';
    if (!token) break;
  }
  return out;
}

// 'AAAA-MM-DD' no fuso do resumo — o MESMO recorte que StorageManager.dayKey
// usa no cliente (data local, não UTC)
function dayKey(ms, tz = TZ) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(ms));
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function num(v) {
  return typeof v === 'number' && isFinite(v) ? v : 0;
}

export function buildDigest(stats, scores, nowMs = Date.now()) {
  const today = dayKey(nowMs);
  const yesterday = dayKey(nowMs - 86400000);

  const perDay = (day) => {
    let players = 0;
    let runs = 0;
    let best = 0;
    let bestId = null;
    for (const d of stats) {
      const hist = (d.history && typeof d.history === 'object') ? d.history : {};
      const days = (hist.days && typeof hist.days === 'object') ? hist.days : null;
      let r = 0;
      let b = 0;

      if (days && days[day]) {
        // Cliente v1.6.1+: contagem exata, sem o teto de 50 corridas
        r = num(days[day].r);
        b = num(days[day].b);
      } else if (Array.isArray(d.runs)) {
        // Cliente antigo: reconstrói pela janela de execuções. Subestima quem
        // fez mais de 50 corridas no dia — o relatório avisa quando usa isto.
        for (const run of d.runs) {
          if (!run || dayKey(num(run.t) * 1000) !== day) continue;
          r++;
          b = Math.max(b, num(run.m));
        }
      }
      if (r > 0) {
        players++;
        runs += r;
      }
      if (b > best) { best = b; bestId = d.id; }
    }
    return { players, runs, best, bestId };
  };

  const legacy = stats.filter((d) => {
    const h = (d.history && typeof d.history === 'object') ? d.history : {};
    return !h.days;
  }).length;

  const names = new Map(scores.map((s) => [s.id, String(s.name || '')]));
  // O RANKING (`scores`) só tem quem escolheu apelido: `submitScore` sai cedo
  // com o nome vazio. Já `stats.bestM` tem todo mundo. As duas marcas podem
  // divergir — e a divergência é informação útil (tem gente boa fora do
  // ranking), então o resumo mostra as duas em vez de fingir que é uma só.
  const world = scores.reduce(
    (acc, s) => (num(s.score) > acc.score ? { score: num(s.score), name: String(s.name || '???') } : acc),
    { score: 0, name: '' }
  );
  const anyBest = stats.reduce((a, d) => Math.max(a, num(d.bestM)), 0);

  const t = perDay(today);
  const y = perDay(yesterday);
  const totalRuns = stats.reduce((a, d) => a + num(d.attempts), 0);
  const totalWins = stats.reduce((a, d) => a + num(d.wins), 0);

  const delta = (a, b) => (b === 0 ? '' : ` (${a - b >= 0 ? '+' : ''}${a - b} vs ontem)`);
  const lines = [];
  if (t.players === 0) {
    lines.push('😴 Ninguém jogou hoje.');
  } else {
    lines.push(`👥 ${t.players} jogador${t.players === 1 ? '' : 'es'}${delta(t.players, y.players)}`);
    lines.push(`🎮 ${t.runs} execuç${t.runs === 1 ? 'ão' : 'ões'}${delta(t.runs, y.runs)}`);
    const who = t.bestId ? (names.get(t.bestId) || 'Anônimo') : '';
    lines.push(`🥇 melhor do dia: ${t.best}m${who ? ` (${who})` : ''}`);
  }
  lines.push('');
  lines.push(`🏆 recorde do ranking: ${world.score}m${world.name ? ` — ${world.name}` : ''}`);
  if (anyBest > world.score) {
    lines.push(`📈 maior marca já registrada: ${anyBest}m (fora do ranking, sem apelido)`);
  }
  lines.push(`🌍 ${stats.length} jogadores · ${totalRuns} execuções · ${totalWins} fugas`);
  if (legacy > 0) {
    lines.push(`ℹ️ ${legacy} doc(s) pré-1.6.1: contagem do dia estimada pela janela de 50`);
  }

  const [, mm, dd] = today.split('-');
  return {
    title: `🦏 FURIOUS RHINO — ${dd}/${mm}`,
    message: lines.join('\n'),
    tags: ['rhinoceros'],
  };
}

async function publish(payload) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) {
    console.error('NTFY_TOPIC não definido — nada enviado.');
    return false;
  }
  const server = (process.env.NTFY_SERVER || 'https://ntfy.sh').replace(/\/+$/, '');
  const res = await fetch(`${server}/`, {
    method: 'POST',
    body: JSON.stringify({ topic, ...payload }),
  });
  if (!res.ok) throw new Error(`ntfy: HTTP ${res.status} ${await res.text()}`);
  return true;
}

// Só executa quando chamado direto (o buildDigest é importado pelos testes)
if (process.argv[1] && process.argv[1].endsWith('daily-digest.mjs')) {
  const [stats, scores] = await Promise.all([
    fetchCollection('stats'),
    fetchCollection('scores'),
  ]);
  const payload = buildDigest(stats, scores);
  console.log(`${payload.title}\n${payload.message}`);
  if (!DRY) await publish(payload);
}
