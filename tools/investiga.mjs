// A LINHA DE INVESTIGAÇÃO — coleta, detecta e compara ao longo do tempo.
//
//   node tools/investiga.mjs              → relatório da coleta de hoje
//   node tools/investiga.mjs --salvar     → grava o snapshot datado (diff na próxima)
//   node tools/investiga.mjs --json       → o mesmo, em JSON
//
// POR QUE EXISTE: um relatório solto responde "como está hoje". Uma
// investigação precisa responder "o que MUDOU desde a última vez" — e o
// projeto não tinha nada assim (o CLI da radiografia é stateless por
// contrato). Este tool grava um snapshot datado e, havendo um anterior,
// mostra o diff. É o que faz a linha ser perene em vez de uma fotografia.
//
// COMO EVOLUI: cada hipótese que amadurece vira um DETECTOR aqui embaixo e
// passa a varrer o passado inteiro automaticamente. O documento vivo é o
// `docs/INVESTIGACOES.md`; a saída daqui entra lá como entrada datada.
//
// Leitura pública, ZERO writes no Firestore. Sondas de teste são filtradas.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decode, flattenRuns } from '../js/stats/RadiografiaCore.js';
import { LeaderboardSystem } from '../js/systems/LeaderboardSystem.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SNAP_DIR = join(ROOT, 'tools', 'snapshots');
// Mesmo padrão do fix-ranking: sonda de teste nunca entra na análise.
const SONDA = /^(claude-|repro-|sonda-|perf-teste|skin-check|freeze-teste|fernanda-teste|teco-teste|33d79c0e-repro)/;

export function camadas(r) {
  return (r.b || 0) + (r.e || 0) + (r.u || 0) + (r.y || 0) + (r.l || 0);
}

// ------------------------------------------------------------- DETECTORES
// Cada um responde a UMA pergunta e diz por quê. `nome` é a chave estável que
// aparece no snapshot — não renomear sem migrar os snapshots antigos.
export const DETECTORES = [
  {
    nome: 'D1-velocidade',
    desde: 'v1.9.1',
    o_que: 'velocidade média acima do teto físico do motor (35,16 m/s)',
    testa: (r) => r.m > 0 && r.s > 0 && !LeaderboardSystem.isPlausible(r.m, r.s),
  },
  {
    nome: 'D2-sem-interacao',
    desde: '24/08',
    o_que: 'foi longe quase sem pular — quem joga de verdade pula ~12x por 100 m',
    // Só a partir de 1000 m: antes do portão dá para ir longe sem pular.
    testa: (r) => r.m >= 1000 && (r.j / r.m) * 100 < 0.5,
  },
  {
    nome: 'D3-vitoria-sem-chefe',
    desde: '24/08',
    o_que: 'venceu sem quebrar UMA camada de chefe (são 21 no caminho)',
    testa: (r) => r.c === 'win' && camadas(r) === 0,
  },
  {
    nome: 'D4-relogios',
    desde: 'v1.9.2',
    o_que: 'o relógio do loop (i) e o de parede (s) discordam em mais de 30%',
    testa: (r) => r.i > 0 && r.s > 0 && Math.abs(r.i - r.s) / r.s > 0.3,
  },
  {
    nome: 'D5-arena-sem-quebra',
    desde: '24/08',
    o_que: 'ATRAVESSOU a arena do chefe sem quebrar camada (entrar e morrer ali é normal)',
    // O `z > 0 && camadas === 0` sozinho dá falso positivo: quem entra na
    // arena e MORRE sem quebrar nada é jogo legítimo — e é o caso mais comum
    // do portão. Só é suspeito quem entrou, não quebrou nada e mesmo assim
    // SEGUIU em frente (o portão fica em 1000 m).
    testa: (r) => r.z > 0 && camadas(r) === 0 && r.m > 1050,
  },
];

// Aplica todos os detectores a uma corrida. Devolve os nomes que acenderam.
export function analisar(run) {
  const acesos = [];
  for (const d of DETECTORES) {
    // Dado torto (vem de terceiros) não pode derrubar a varredura inteira.
    try { if (d.testa(run)) acesos.push(d.nome); } catch (e) { /* segue */ }
  }
  return acesos;
}

// O resumo de uma coleta inteira — é isto que vai para o snapshot.
export function resumir(rows) {
  const porDetector = {};
  for (const d of DETECTORES) porDetector[d.nome] = 0;
  const suspeitas = [];
  let comI = 0;
  for (const r of rows) {
    if (r.i > 0) comI++;
    const acesos = analisar(r);
    for (const n of acesos) porDetector[n]++;
    if (acesos.length) {
      suspeitas.push({ id: r.id, t: r.t, m: r.m, s: r.s, i: r.i, c: r.c, v: r.v,
        j: r.j, camadas: camadas(r), acesos });
    }
  }
  suspeitas.sort((a, b) => b.t - a.t);
  return {
    corridas: rows.length,
    comSondaI: comI,
    porDetector,
    suspeitas: suspeitas.length,
    // A janela de runs[] guarda 50 corridas por jogador: o passado ROTACIONA.
    // Sem este aviso, um detector "melhorando" pode ser só corrida velha
    // caindo da janela — e não o bug tendo parado.
    aviso: 'a janela de runs[] guarda 50 corridas por jogador — queda pode ser rotação, não melhora',
    detalhe: suspeitas.slice(0, 40),
  };
}

// ------------------------------------------------------------------ REDE
function config(chave) {
  const src = readFileSync(join(ROOT, 'js', 'firebase-config.js'), 'utf8');
  const m = src.match(new RegExp(chave + ":\\s*'([^']+)'"));
  if (!m) throw new Error(chave + ' não encontrado em js/firebase-config.js');
  return m[1];
}

async function fetchCollection(nome) {
  const base = `https://firestore.googleapis.com/v1/projects/${config('projectId')}`
    + `/databases/(default)/documents/${nome}`;
  const out = [];
  let token = '';
  for (let p = 0; p < 40; p++) {
    const url = `${base}?pageSize=300&key=${config('apiKey')}${token ? `&pageToken=${token}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${nome}: HTTP ${res.status}`);
    const j = await res.json();
    for (const d of j.documents || []) {
      const id = d.name.split('/').pop();
      if (SONDA.test(id)) continue;
      const row = { id };
      for (const [k, v] of Object.entries(d.fields || {})) row[k] = decode(v);
      out.push(row);
    }
    token = j.nextPageToken || '';
    if (!token) break;
  }
  return out;
}

// -------------------------------------------------------------- SNAPSHOT
function ultimoSnapshot() {
  if (!existsSync(SNAP_DIR)) return null;
  const arqs = readdirSync(SNAP_DIR)
    .filter((f) => /^investiga-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  if (!arqs.length) return null;
  try { return JSON.parse(readFileSync(join(SNAP_DIR, arqs[arqs.length - 1]), 'utf8')); }
  catch (e) { return null; }
}

export function diff(agora, anterior) {
  if (!anterior) return null;
  const linhas = [];
  for (const d of DETECTORES) {
    const a = (anterior.porDetector || {})[d.nome];
    if (a === undefined) {
      linhas.push(`\`${d.nome}\`: ${agora.porDetector[d.nome]} (detector novo desde a última coleta)`);
      continue;
    }
    const delta = agora.porDetector[d.nome] - a;
    linhas.push(`\`${d.nome}\`: ${a} → ${agora.porDetector[d.nome]} (${delta >= 0 ? '+' : ''}${delta})`);
  }
  return { desde: anterior.dia, linhas };
}

// ------------------------------------------------------------- RELATÓRIO
function markdown(res, d, dia) {
  const L = [];
  const p = (s = '') => L.push(s);
  p(`### Coleta — ${dia}`);
  p();
  p(`${res.corridas} corridas analisadas · ${res.comSondaI} com a sonda \`i\` · **${res.suspeitas} suspeitas**`);
  p();
  p('| Detector | Acendeu | O que detecta |');
  p('|---|---|---|');
  for (const det of DETECTORES) {
    p(`| \`${det.nome}\` | **${res.porDetector[det.nome]}** | ${det.o_que} |`);
  }
  if (d) {
    p();
    p(`**Desde a coleta de ${d.desde}:**`);
    p();
    for (const l of d.linhas) p(`- ${l}`);
  }
  if (res.detalhe.length) {
    p();
    p('**As suspeitas mais recentes:**');
    p();
    p('| quando | m | s | i | m/s | pulos | camadas | versão | detectores |');
    p('|---|---|---|---|---|---|---|---|---|');
    for (const x of res.detalhe.slice(0, 15)) {
      const q = x.t ? new Date(x.t * 1000).toISOString().slice(0, 16).replace('T', ' ') : '?';
      p(`| ${q} | ${x.m} | ${x.s || '?'} | ${x.i || '—'} | ${x.s ? Math.round(x.m / x.s) : '?'} `
        + `| ${x.j} | ${x.camadas} | ${x.v || '?'} | ${x.acesos.join(', ')} |`);
    }
  }
  p();
  p(`*${res.aviso}.*`);
  return L.join('\n');
}

async function main() {
  const SALVAR = process.argv.includes('--salvar');
  const stats = await fetchCollection('stats');
  const rows = flattenRuns(stats);
  const res = resumir(rows);
  const dia = new Date().toISOString().slice(0, 10);
  const anterior = ultimoSnapshot();
  const d = diff(res, anterior);

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ dia, ...res, diff: d }, null, 2));
  } else {
    console.log(markdown(res, d, dia));
    console.error(`\n✔ ${stats.length} jogadores lidos · zero writes`);
  }

  if (SALVAR) {
    mkdirSync(SNAP_DIR, { recursive: true });
    const arq = join(SNAP_DIR, `investiga-${dia}.json`);
    // O snapshot guarda só CONTADORES e as suspeitas — nunca a telemetria
    // inteira (o backup do fix-ranking é o lugar do dado bruto).
    writeFileSync(arq, JSON.stringify({
      dia, corridas: res.corridas, comSondaI: res.comSondaI,
      porDetector: res.porDetector, suspeitas: res.suspeitas, detalhe: res.detalhe,
    }, null, 1), 'utf8');
    console.error(`✔ snapshot: ${arq}`);
  } else {
    console.error('  (rode com --salvar para gravar o snapshot e ter o diff na próxima coleta)');
  }
}

const invocado = process.argv[1] || '';
if (invocado && import.meta.url === `file:///${invocado.replace(/\\/g, '/')}`) {
  await main();
}
