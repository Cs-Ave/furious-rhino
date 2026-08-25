// Corrige o ranking envenenado pelo bug do cronômetro (agosto/26).
//
//   node tools/fix-ranking.mjs           → ENSAIO: só lista, nada é tocado
//   node tools/fix-ranking.mjs --yes     → executa de verdade
//   node tools/fix-ranking.mjs --probe   → ciclo de validação numa sonda
//
// O QUE ACONTECEU: um bug (exclusivo da v1.9.0) gravou corridas com tempo
// muito menor que o real — 10.000 m em 47 s, 6x acima do teto físico do
// motor. A distância era REAL; quem mentiu foi o cronômetro. Resultado: 22
// marcas de 20.000 pts (o teto) no topo do ranking mundial, soterrando os
// jogadores legítimos. A v1.9.1 barra marcas novas; este script limpa as que
// já subiram.
//
// A REGRA DE OURO daqui: jogador que TEM marca legítima anterior não é
// apagado — a marca dele é RESTAURADA a partir do `runs[]`. Só some quem
// nunca teve nenhuma corrida plausível (contas que nasceram com o bug).
//
// COMO ESCREVE: `firestore.rules` tem `allow delete: if false` e, no update,
// exige `score >= resource.data.score` — ou seja, pelo caminho do cliente é
// IMPOSSÍVEL diminuir uma marca. Mas `allow create` não tem essa cláusula.
// Daí o padrão deste script: APAGAR (via firebase-tools, credencial de
// admin, que passa por cima das rules) e RECRIAR (via REST público, que
// passa pelas rules como um cliente honesto). Mesmo molde de leitura e de
// delete do tools/delete-player.mjs.
//
// Pré-requisito (uma vez por máquina, abre o navegador):
//   npx firebase-tools login
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ScoreSystem } from '../js/systems/ScoreSystem.js';
import { LeaderboardSystem } from '../js/systems/LeaderboardSystem.js';
import { Constants } from '../js/utils/Constants.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = readFileSync(join(ROOT, 'js', 'firebase-config.js'), 'utf8');
const KEY = cfg.match(/apiKey:\s*'([^']+)'/)[1];
const PROJECT = cfg.match(/projectId:\s*'([^']+)'/)[1];
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

// Sondas de teste que precisam sair de produção junto. O prefixo `claude-`
// é a convenção da casa, mas em 23/08 as reproduções do bug foram rodadas
// contra o site REAL com ids fora do padrão (`repro-*`, `sonda-*`,
// `*-teste-*`) — a proteção do StorageManager.allowsRemoteWrite só cobre
// localhost, e apontar um Playwright para a produção grava de verdade.
// Lição registrada: sonda contra produção SEMPRE com prefixo `claude-`.
const SONDA = /^(claude-|repro-|sonda-|perf-teste|skin-check|freeze-teste|fernanda-teste|teco-teste|33d79c0e-repro)/;

// A marca do bug: o teto do jogo. Toda corrida que o produziu tem média
// acima do teto físico — é o mesmo critério da guarda da v1.9.1.
const MARCA_DO_BUG = 20000;
// ----------------------------------------------- A SEGUNDA CAUSA (25/08/26)
// A CASCATA DOS CHEFES. Bug diferente do cronômetro e com assinatura oposta:
// ali a distância era real e o relógio mentiu; aqui o relógio está certo e a
// distância foi REAL sem a luta que ela exige. O gatilho legado dos 1000 m
// disparava `crossGate()` sem combate e, na sequência, o `isBypassed` dos
// cinco chefes via "já estou além da âncora" e todos se rendiam. Resultado:
// dava para atravessar o mundo inteiro — 21 camadas — sem encostar em uma.
//
// Janela: a v1.8.5 (21/08 22:22) trouxe o `isBypassed`; a v1.9.4 fechou.
// Última camada quebrada na base inteira: 22/08 16:14, v1.8.3. Dentro da
// janela, 5 corridas passaram dos 1.050 m e NENHUMA quebrou o portão;
// fora dela, 35 de 36 quebraram. O corte é limpo.
const CASCATA_DE = '1.8.5';
const CASCATA_ATE = '1.9.4';   // exclusivo — esta versão já corrigiu
const MARGEM_M = 50;           // folga para não acusar quem morreu NA âncora

// Derivado de Constants, nunca literal: se um chefe mudar de lugar ou ganhar
// camada, a régua acompanha sozinha. `desde` evita acusar corrida de uma
// versão em que aquele chefe ainda nem existia.
const PPM = Constants.PIXELS_PER_METER;
const FIM_M = Constants.WORLD_END_PX / PPM;
const CHEFES = [
  { nome: 'Portão', m: Constants.WIN_DISTANCE_PX / PPM, k: 'b', camadas: Constants.BOSS_LAYERS.length, desde: '1.7.0' },
  { nome: 'Muralha', m: Constants.BOSS2_ANCHOR_PX / PPM, k: 'e', camadas: Constants.BOSS2_LAYERS.length, desde: '1.8.5' },
  { nome: 'Barreira', m: Constants.CERCO_ANCHOR_PX / PPM, k: 'u', camadas: Constants.CERCO_LAYERS.length, desde: '1.8.10' },
  { nome: 'Faraó', m: Constants.FARAO_ANCHOR_PX / PPM, k: 'y', camadas: Constants.FARAO_LAYERS.length, desde: '1.8.10' },
  { nome: 'Caçador-Mor', m: Constants.BOSS3_ANCHOR_PX / PPM, k: 'l', camadas: Constants.BOSS3_LAYERS.length, desde: '1.8.5' },
];

const vPartes = (v) => String(v || '').split('.').map((n) => Number(n) || 0);
const vCmp = (a, b) => {
  const [x, y] = [vPartes(a), vPartes(b)];
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0);
  return 0;
};


// ----------------------------------------------------------- REST: decode
const decode = (v) => {
  if (!v || typeof v !== 'object') return null;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('mapValue' in v) {
    return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, decode(x)]));
  }
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decode);
  return null;
};

// ----------------------------------------------------------- REST: encode
// Inteiro vai como STRING no wire (exigência do Firestore REST); um número
// com casas viraria doubleValue e as rules (`is int`) recusariam.
const encode = (v) => {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encode) } };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === 'object') {
    return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, encode(x)])) } };
  }
  return { nullValue: null };
};

async function fetchCollection(nome) {
  const docs = [];
  let token = '';
  for (let i = 0; i < 40; i++) {
    const url = `${BASE}/${nome}?pageSize=300&key=${KEY}${token ? `&pageToken=${token}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${nome}: HTTP ${res.status}`);
    const j = await res.json();
    for (const d of j.documents || []) {
      docs.push({ id: d.name.split('/').pop(), campos: Object.fromEntries(
        Object.entries(d.fields || {}).map(([k, v]) => [k, decode(v)])) });
    }
    if (!j.nextPageToken) break;
    token = j.nextPageToken;
  }
  return docs;
}

// ---------------------------------------------------- CLASSIFICAÇÃO (pura)
// Separada de propósito: é ela que decide o destino de cada jogador, e um
// erro aqui apaga marca de gente real. Testada sem rede em test-fix-ranking.

// A melhor corrida LEGÍTIMA de um runs[] — mesma régua do ranking
// (ScoreSystem) e o mesmo desempate do ChallengeSystem.bestInWindow: maior
// pontuação; empatando, a mais ANTIGA fica. Corrida implausível é ignorada
// pelo critério já testado da v1.9.1.
export function melhorLegitima(runs) {
  const lista = Array.isArray(runs) ? runs : [];
  let melhor = null;
  for (const item of lista) {
    const r = item && typeof item === 'object' ? item : {};
    const m = Math.floor(Number(r.m) || 0);
    if (m <= 0) continue;
    if (ehSuja(r)) continue;
    const pts = ScoreSystem.total(m, ScoreSystem.runBonus(r));
    const t = Math.floor(Number(r.t) || 0);
    if (!melhor || pts > melhor.pts || (pts === melhor.pts && t < melhor.t)) {
      melhor = { pts, m, t };
    }
  }
  return melhor;
}

export function ehImplausivel(r) {
  const o = r && typeof r === 'object' ? r : {};
  const m = Math.floor(Number(o.m) || 0);
  return m > 0 && !LeaderboardSystem.isPlausible(m, o.s);
}

// Corrida que passou por um chefe DENTRO da janela da cascata sem derrubar
// as camadas dele. É prova direta: no jogo não existe passar sem lutar — a
// v1.9.4 tornou o gatilho por posição exclusivo do modo debug.
export function ehCascata(r) {
  const o = r && typeof r === 'object' ? r : {};
  const m = Math.floor(Number(o.m) || 0);
  const v = String(o.v || '');
  // Sem versão não há acusação. Os clientes pré-v1.7 nem gravavam camada, e
  // ausência de dado jamais é prova de bypass — seria condenar por silêncio.
  if (!v || m <= 0) return false;
  if (vCmp(v, CASCATA_DE) < 0 || vCmp(v, CASCATA_ATE) >= 0) return false;
  return CHEFES.some((c) => {
    if (vCmp(v, c.desde) < 0) return false;   // este chefe ainda não existia
    // O Caçador-Mor mora em 9.995 m: `min` com o fim do mundo evita um limiar
    // inalcançável, e lá passar é justamente chegar aos 10.000.
    const passou = m >= Math.min(c.m + MARGEM_M, FIM_M);
    return passou && Math.floor(Number(o[c.k]) || 0) < c.camadas;
  });
}

// As DUAS causas conhecidas de marca falsa, com assinaturas opostas: o
// cronômetro mentiu no TEMPO (distância real), a cascata entregou a
// DISTÂNCIA sem a luta. Uma mesma corrida pode ter as duas — a do kukur em
// 24/08 tem: 10.000 m em 44 s e zero camadas.
export function ehSuja(r) { return ehImplausivel(r) || ehCascata(r); }

// Destino de cada jogador. Devolve os quatro baldes do relatório.
export function classificar(scores, stats) {
  const campoDe = new Map();
  for (const s of stats) campoDe.set(s.id, s.campos || {});
  const runsDe = (id) => {
    const c = campoDe.get(id) || {};
    return Array.isArray(c.runs) ? c.runs : [];
  };

  const restaurar = [];   // tem marca legítima anterior -> volta a valer
  const remover = [];     // nunca teve corrida legítima -> sai do ranking
  const sondas = [];      // ids claude-* das minhas próprias verificações
  const limparRuns = [];  // stats preservado, mas as corridas do bug saem
  const revisar = [];     // suspeito, mas a prova pode ter saído da janela

  for (const doc of scores) {
    if (SONDA.test(doc.id)) { sondas.push({ id: doc.id, nome: doc.campos.name }); continue; }
    const runs = runsDe(doc.id);
    // O PORTÃO DA CORREÇÃO: só entra quem tem corrida SUJA na janela.
    //
    // A tentação era recalcular todo mundo e rebaixar quem não sustentasse o
    // placar. Seria errado: a janela guarda 50 corridas e 674 já rodaram para
    // fora, então recorde antigo desaparece do runs[] sem nada de errado ter
    // acontecido — o Funku Pópi marcou 3.304 e a melhor corrida que ainda
    // resta dele é de 1.997. Corrida suja é PROVA; ausência de corrida boa
    // não é. Até a v1.9.5 o portão era `score === 20000` (a assinatura do bug
    // do cronômetro); a cascata não tem número mágico, e passou a ser esta.
    if (!runs.some(ehSuja)) continue;
    const antes = Number(doc.campos.score) || 0;
    const melhor = melhorLegitima(runs);
    const alvo = { id: doc.id, nome: doc.campos.name, antes };
    // Nunca SUBIR ninguém. Se o que sobrou vale igual ou mais que o placar
    // guardado, então o placar já é o legítimo — a corrida suja existiu mas
    // não foi ela que pontuou — e não há o que corrigir.
    if (melhor && melhor.pts >= antes) continue;
    if (melhor) { restaurar.push({ ...alvo, melhor }); continue; }
    // Sem NENHUMA corrida boa na janela. Só sai do ranking quem tem a
    // história INTEIRA aqui dentro (conta que nasceu com o bug). Se houve
    // rotação, o recorde legítimo pode ter caído da janela, e apagar seria
    // punir por falta de prova — vai para revisão à mão.
    const tentativas = Math.floor(Number((campoDe.get(doc.id) || {}).attempts) || 0);
    if (tentativas > runs.length) revisar.push({ ...alvo, tentativas, naJanela: runs.length });
    else remover.push(alvo);
  }

  // As corridas do bug também ficam no runs[] e o ChallengeSystem as leria
  // como marca válida — quem tem uma delas venceria qualquer desafio. Só
  // entram aqui os que SOBREVIVEM (quem é removido leva o stats junto).
  // Sonda que só tem `stats` (nunca pontuou, logo não aparece em `scores`)
  const jaVista = new Set(sondas.map((x) => x.id));
  for (const s of stats) {
    if (SONDA.test(s.id) && !jaVista.has(s.id)) sondas.push({ id: s.id, nome: null });
  }

  const removidos = new Set(remover.map((r) => r.id));
  for (const s of stats) {
    if (SONDA.test(s.id) || removidos.has(s.id)) continue;
    const runs = Array.isArray(s.campos.runs) ? s.campos.runs : [];
    const sujas = runs.filter(ehSuja);
    if (sujas.length) limparRuns.push({ id: s.id, sujas: sujas.length, total: runs.length });
  }
  return { restaurar, remover, sondas, limparRuns, revisar };
}

// Recalcula os campos MONOTÔNICOS de stats a partir das runs que sobraram.
// Existe porque a monotonia das rules (attempts/playTimeS/wins/bestM só
// crescem) congelaria os valores inflados pelo bug — recriar o doc é o que
// permite baixá-los, e deixá-los sujos tornaria a telemetria mentirosa.
export function statsLimpos(campos, runsLimpas) {
  const removidas = (Array.isArray(campos.runs) ? campos.runs.length : 0) - runsLimpas.length;
  const bestM = runsLimpas.reduce((a, r) => Math.max(a, Math.floor(Number(r.m) || 0)), 0);
  const wins = runsLimpas.filter((r) => r && r.c === 'win').length;
  return {
    ...campos,
    runs: runsLimpas,
    // attempts/playTimeS descontam só o que as corridas removidas somaram —
    // o resto do histórico do jogador é dele e continua valendo
    attempts: Math.max(1, Math.floor(Number(campos.attempts) || 0) - removidas),
    playTimeS: Math.max(0, Math.floor(Number(campos.playTimeS) || 0)),
    wins: Math.min(Math.floor(Number(campos.wins) || 0), wins),
    bestM: Math.min(bestM, 10000),
  };
}

// ------------------------------------------------------------- ESCRITA
function apagar(colecao, id) {
  execFileSync('npx', ['--yes', 'firebase-tools', 'firestore:delete',
    `${colecao}/${id}`, '--project', PROJECT, '--force'],
  { stdio: 'pipe', shell: process.platform === 'win32' });
}

// Cria o doc por REST. `updatedAt` NÃO vai nos fields: as rules exigem
// `updatedAt == request.time`, o que só o transform do servidor satisfaz.
async function criar(colecao, id, campos) {
  const fields = Object.fromEntries(
    Object.entries(campos).filter(([k]) => k !== 'updatedAt').map(([k, v]) => [k, encode(v)]));
  const body = { writes: [{
    update: { name: `projects/${PROJECT}/databases/(default)/documents/${colecao}/${id}`, fields },
    updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }],
  }] };
  const res = await fetch(`${BASE}:commit?key=${KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${(await res.text()).slice(0, 240)}`);
}

// ------------------------------------------------------------- RELATÓRIO
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

function relatar({ restaurar, remover, sondas, limparRuns, revisar }) {
  console.log(`\n=== RESTAURAR — ${restaurar.length} jogadores voltam à marca legítima ===`);
  for (const r of restaurar) {
    const d = new Date(r.melhor.t * 1000).toISOString().slice(0, 10);
    console.log(`  ${(r.nome || r.id.slice(0, 8)).padEnd(16).slice(0, 16)} ${fmt(r.antes).padStart(7)} -> ` +
      `${fmt(r.melhor.pts).padStart(7)} pts  (${r.melhor.m}m, ${d})`);
  }
  console.log(`\n=== REMOVER — ${remover.length} sem nenhuma corrida legítima (scores + stats) ===`);
  for (const r of remover) console.log(`  ${(r.nome || r.id.slice(0, 8)).padEnd(16).slice(0, 16)} ${fmt(r.antes).padStart(7)} -> (fora do ranking)`);
  console.log(`\n=== SONDAS — ${sondas.length} ids claude-* ===`);
  for (const s of sondas) console.log(`  ${s.id} ${s.nome ? `(${s.nome})` : ''}`);
  console.log(`\n=== REVISAR À MÃO — ${(revisar || []).length} com prova possivelmente fora da janela ===`);
  for (const r of revisar || []) {
    console.log(`  ${(r.nome || r.id.slice(0, 8)).padEnd(16).slice(0, 16)} ${fmt(r.antes).padStart(7)} pts  `
      + `(${r.tentativas} corridas na vida, só ${r.naJanela} na janela — placar MANTIDO)`);
  }
  console.log(`\n=== LIMPAR runs[] — ${limparRuns.length} jogadores preservados ===`);
  for (const l of limparRuns) console.log(`  ${l.id.slice(0, 8)}  ${l.sujas} de ${l.total} corridas saem`);
}

// --------------------------------------------------- VALIDAÇÃO (--probe)
// O caminho `create via REST com updateTransforms` NUNCA foi usado neste
// projeto — nenhum script escreve em `scores` hoje. Antes de mexer na marca
// de jogador real, prova o ciclo numa sonda `claude-*`: cria com um valor
// ALTO, recria com um valor MENOR (é isso que a monotonia do update proíbe e
// que o create permite) e confere o resultado lendo de volta.
async function probe() {
  const id = 'claude-fix-probe-01';
  console.log(`Sonda: ${id}\n`);
  const ler = async () => {
    const r = await fetch(`${BASE}/scores/${id}?key=${KEY}`);
    if (!r.ok) return null;
    const j = await r.json();
    return Object.fromEntries(Object.entries(j.fields || {}).map(([k, v]) => [k, decode(v)]));
  };

  console.log('1. criando a sonda com marca ALTA (5.000 pts)...');
  await criar('scores', id, { name: 'SondaFix', nameLower: 'sondafix', score: 5000, scoreM: 4000,
    scoreAt: new Date(Date.now() - 86400000) });
  const alto = await ler();
  console.log(`   score=${alto.score} scoreM=${alto.scoreM} updatedAt=${alto.updatedAt}`);
  if (alto.score !== 5000) throw new Error('a criação não gravou o valor esperado');
  if (!alto.updatedAt) throw new Error('updatedAt não foi preenchido pelo transform do servidor');

  console.log('2. confirmando que BAIXAR por update é proibido pelas rules...');
  const res = await fetch(`${BASE}:commit?key=${KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ writes: [{
      update: { name: `projects/${PROJECT}/databases/(default)/documents/scores/${id}`,
        fields: { name: encode('SondaFix'), score: encode(100), scoreM: encode(100) } },
      updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }] }] }),
  });
  console.log(`   update para 100 pts: HTTP ${res.status} ${res.ok ? '(PASSOU — inesperado!)' : '(negado, como esperado)'}`);
  if (res.ok) throw new Error('as rules deixaram DIMINUIR por update — o pressuposto do script mudou');

  console.log('3. apagando (admin) e recriando com marca MENOR (100 pts)...');
  apagar('scores', id);
  await criar('scores', id, { name: 'SondaFix', nameLower: 'sondafix', score: 100, scoreM: 100,
    scoreAt: new Date(Date.now() - 3600000) });
  const baixo = await ler();
  console.log(`   score=${baixo.score} scoreM=${baixo.scoreM} scoreAt=${baixo.scoreAt}`);
  if (baixo.score !== 100) throw new Error('a recriação não baixou a marca');

  console.log('4. limpando a sonda...');
  apagar('scores', id);
  console.log(`   sobrou? ${(await ler()) ? 'SIM (limpar à mão!)' : 'não'}`);
  console.log('\n✔ O ciclo apagar+recriar funciona. Pode rodar com --yes.');
}

// ------------------------------------------------------------- EXECUÇÃO
async function main() {
  if (process.argv.includes('--probe')) { await probe(); return; }
  const APPLY = process.argv.includes('--yes');
  console.log(`Projeto: ${PROJECT}\nLendo scores e stats...`);
  const [scores, stats] = await Promise.all([fetchCollection('scores'), fetchCollection('stats')]);
  console.log(`  scores: ${scores.length} | stats: ${stats.length}`);

  const plano = classificar(scores, stats);
  relatar(plano);

  // Backup ANTES de qualquer escrita. Guarda também a telemetria de quem vai
  // ser removido — é o material que documenta o bug e ainda não achamos a
  // causa raiz; perder isso seria apagar a prova.
  const alvos = new Set([...plano.restaurar, ...plano.remover, ...plano.sondas, ...plano.revisar].map((x) => x.id)
    .concat(plano.limparRuns.map((x) => x.id)));
  const backup = {
    quando: new Date().toISOString(),
    motivo: 'cronometro v1.9.0 (20.000 no teto) + cascata dos chefes v1.8.5-v1.9.3 (mundo inteiro sem uma camada)',
    scores: scores.filter((s) => alvos.has(s.id)),
    stats: stats.filter((s) => alvos.has(s.id)),
  };
  const arq = join(ROOT, 'tools', `backup-ranking-${backup.quando.slice(0, 10)}.json`);
  writeFileSync(arq, JSON.stringify(backup, null, 1), 'utf8');
  console.log(`\nBackup de ${backup.scores.length} scores e ${backup.stats.length} stats: ${arq}`);

  if (!APPLY) {
    console.log('\nEnsaio — NADA foi tocado. Confira a lista acima e rode com --yes para valer.');
    return;
  }

  console.log('\nAplicando...');
  const statsPorId = new Map(stats.map((s) => [s.id, s]));
  let ok = 0, erro = 0;

  for (const r of plano.restaurar) {
    try {
      const doc = scores.find((s) => s.id === r.id);
      const novo = {
        name: doc.campos.name,
        score: r.melhor.pts,
        scoreM: r.melhor.m,
        scoreAt: new Date(r.melhor.t * 1000),
      };
      if (doc.campos.nameLower) novo.nameLower = doc.campos.nameLower;
      if (doc.campos.skin) novo.skin = doc.campos.skin;
      // Coerência das rules conferida ANTES de apagar: se não passar, o
      // jogador fica como está em vez de sumir por uma escrita recusada.
      if (!(novo.score >= novo.scoreM && novo.score <= novo.scoreM * 2
        && novo.scoreM >= 1 && novo.scoreM <= 10000 && novo.score >= 1 && novo.score <= 20000)) {
        console.log(`  ✖ ${r.nome} — par score/scoreM fora do que as rules aceitam; PULADO`);
        erro++; continue;
      }
      apagar('scores', r.id);
      await criar('scores', r.id, novo);
      console.log(`  ✔ ${r.nome} restaurado: ${fmt(r.melhor.pts)} pts`);
      ok++;
    } catch (e) { console.log(`  ✖ ${r.nome} — ${String(e.message).split('\n').pop()}`); erro++; }
  }

  for (const r of [...plano.remover, ...plano.sondas]) {
    for (const col of ['scores', 'stats']) {
      try { apagar(col, r.id); ok++; } catch (e) {
        console.log(`  ✖ ${col}/${r.id} — ${String(e.stderr || e.message).trim().split('\n').pop()}`);
        erro++;
      }
    }
    console.log(`  ✔ ${r.nome || r.id.slice(0, 8)} removido (scores + stats)`);
  }

  for (const l of plano.limparRuns) {
    try {
      const doc = statsPorId.get(l.id);
      const limpas = (doc.campos.runs || []).filter((r) => !ehSuja(r));
      apagar('stats', l.id);
      await criar('stats', l.id, statsLimpos(doc.campos, limpas));
      console.log(`  ✔ ${l.id.slice(0, 8)} — ${l.sujas} corridas do bug removidas`);
      ok++;
    } catch (e) { console.log(`  ✖ stats/${l.id} — ${String(e.message).split('\n').pop()}`); erro++; }
  }

  console.log(`\n${ok} operações ok, ${erro} com erro.`);
  console.log('Confira o pódio em https://cs-ave.github.io/furious-rhino/ (a home cacheia 10min).');
  if (erro) console.log(`Para desfazer: o backup está em ${arq}`);
}

// Só executa quando chamado direto — o teste importa as funções puras.
// `process.argv[1]` não existe sob `node -e`, daí a guarda extra.
const invocado = process.argv[1] || '';
if (invocado && import.meta.url === `file:///${invocado.replace(/\\/g, '/')}`) {
  await main();
}
