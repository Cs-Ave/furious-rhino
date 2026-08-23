// Grupo de testes da RADIOGRAFIA VIVA (núcleo + casca CLI + casca da aba).
//   npm run test-radiografia
// Sem navegador e SEM REDE: fixture sintética inline cobrindo as 3 eras
// (pré-letras, 1.7.x, ≥1.8.4), todas as letras (incl. e/h/l/g/v/p), doc
// legado sem history e challenge com aceite parcial. Guarda também, por
// text-assert, a higiene dos dois fetchers (filtro ^claude-, zero writes) —
// o mesmo estilo dos asserts de firestore.rules no test-stats.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

globalThis.localStorage = {
  _m: new Map(),
  getItem(k) { return this._m.has(k) ? this._m.get(k) : null; },
  setItem(k, v) { this._m.set(k, String(v)); },
  removeItem(k) { this._m.delete(k); },
};

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const {
  radiografia, flattenRuns, decode, semverCmp, dayKeySeconds, mediana, quantil,
  spearman, RUN_LETTER_KEYS, BASELINE_20260816,
} = await import('../js/stats/RadiografiaCore.js');
const { StorageManager } = await import('../js/utils/StorageManager.js'); // via shim, só p/ RUN_COUNTERS
const { ScoreSystem } = await import('../js/systems/ScoreSystem.js');
const { buildDigest } = await import('./daily-digest.mjs');

let pass = 0;
let fail = 0;
function eq(name, got, want) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) {
    pass++;
    console.log(`PASS  ${name}`);
  } else {
    fail++;
    console.log(`FAIL  ${name}\n      esperado ${w}\n      obtido   ${g}`);
  }
}
function ok(name, cond) { eq(name, Boolean(cond), true); }

// ---------- 1. Helpers puros ----------
eq('semver: 1.10.0 > 1.9.0 (numérico, nunca string)', semverCmp('1.10.0', '1.9.0') > 0, true);
eq('semver: 1.8.4 == 1.8.4', semverCmp('1.8.4', '1.8.4'), 0);
eq('semver: 1.6 < 1.6.1 (parte ausente = 0)', semverCmp('1.6', '1.6.1') < 0, true);
eq('dayKey: epoch 0 em America/Sao_Paulo (UTC−3)', dayKeySeconds(0), '1969-12-31');
eq('mediana de [1,2,3,4]', mediana([1, 2, 3, 4]), 2.5);
eq('quantil p90 de [0..10]', quantil([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.9), 9);
eq('spearman de relação monotônica perfeita', spearman([[1, 10], [2, 20], [3, 30], [4, 41]]), 1);

// ---------- 2. O mapa de letras cobre RUN_COUNTERS inteiro ----------
// Letra nova gravada no cliente sem leitor aqui = FAIL (a razão de existir
// da ferramenta é não deixar dado sem leitor).
const contadores = Object.keys(StorageManager.RUN_COUNTERS).sort();
eq('RUN_LETTER_KEYS ⊇ RUN_COUNTERS (nenhuma letra sem leitor)',
  contadores.filter((k) => !RUN_LETTER_KEYS.includes(k)), []);
eq('RUN_LETTER_KEYS sem letra fantasma (todas existem no cliente)',
  RUN_LETTER_KEYS.filter((k) => !contadores.includes(k)), []);

// ---------- 3. decode (shape do REST → JS puro, epoch em SEGUNDOS) ----------
eq('decode integer', decode({ integerValue: '42' }), 42);
eq('decode timestamp → epoch em segundos', decode({ timestampValue: '2026-08-22T12:00:00Z' }),
  Math.floor(Date.UTC(2026, 7, 22, 12) / 1000));
eq('decode mapa aninhado', decode({ mapValue: { fields: { a: { integerValue: '1' } } } }), { a: 1 });

// ---------- 4. Fixture sintética ----------
const NOW = Math.floor(Date.UTC(2026, 7, 22, 15) / 1000); // 2026-08-22 12:00 em SP
const D = (n) => NOW - n * 86400;
const dk = (s) => dayKeySeconds(s);

const statsFix = [
  { // veterano da era A (1.7.1), com boss do portão e fuga
    id: 'a1',
    attempts: 10, wins: 1, playTimeS: 3600, bestM: 1500,
    deaths: { t1: 1, t2: 1, wall: 1, animal: 1, boss: 1 },
    runs: [
      { t: D(2), m: 1200, s: 300, c: 'win', w: 4, r: 1, o: 1, a: 2, j: 50, d: 10, x: 4, b: 3, z: 10, f: 1, v: '1.7.1' },
      { t: D(2), m: 300, s: 60, c: 'wall', w: 1, j: 10, d: 2, x: 1, v: '1.7.1' },
      { t: D(1), m: 80, s: 20, c: 'animal', j: 3, d: 1, v: '1.7.1' },
    ],
    history: {
      firstSeenS: D(40),
      days: { [dk(D(2))]: { r: 2, s: 1, b: 1200 }, [dk(D(1))]: { r: 1, s: 1, b: 300 } },
      versions: { '1.7.1': 3 }, clients: {}, geos: {},
    },
    gameVersion: '1.7.1', standalone: true, updatedAt: D(2),
    client: { device: 'mobile' }, geo: { country: 'BR' },
  },
  { // novato da era B (1.8.5), chegou ao boss dos 2000m com skin e fúria negada
    id: 'b2',
    attempts: 4, wins: 0, playTimeS: 600, bestM: 2100,
    deaths: { t1: 2, t6: 1, wall: 1, spike: 1, boss2: 1 },
    runs: [
      { t: D(1), m: 150, s: 30, c: 'wall', j: 5, d: 2, v: '1.8.5' },
      { t: D(1), m: 200, s: 40, c: 'spike', j: 8, d: 3, x: 2, v: '1.8.5' },
      { t: D(1), m: 180, s: 35, c: 'animal', j: 6, d: 2, v: '1.8.5' },
      { t: D(0), m: 2100, s: 400, c: 'boss2', w: 6, r: 2, o: 1, a: 3, j: 80, d: 15, x: 5, f: 1, b: 3, z: 12, e: 2, h: 20, p: 1, n: 1, g: 'robot', v: '1.8.5' },
    ],
    history: {
      firstSeenS: D(1),
      days: { [dk(D(1))]: { r: 3, s: 1, b: 200 }, [dk(D(0))]: { r: 1, s: 1, b: 2100 } },
      versions: { '1.8.5': 4 }, clients: {}, geos: {},
    },
    gameVersion: '1.8.5', standalone: false, updatedAt: D(0),
    client: { device: 'mobile' }, geo: { country: 'BR' },
  },
  { // legado pré-1.6.1: sem history, sem letras, sem `v` → era indeterminada
    id: 'c3',
    attempts: 5, wins: 0, playTimeS: 500, bestM: 220,
    deaths: { t1: 2, wall: 2 },
    runs: [{ t: D(50), m: 220 }, { t: D(50), m: 100 }],
    gameVersion: '1.5.0', updatedAt: D(40),
  },
];
const scoresFix = [
  { id: 'a1', name: 'Alice', nameLower: 'alice', score: 1300, scoreM: 1200, scoreAt: D(2) },
  { id: 'b2', name: 'Bob', nameLower: 'bob', score: 2100, scoreAt: D(0) }, // pré-1.8.4: sem scoreM
];
const challengesFix = [
  { // expirado, aceite total (criador a1 nasce aceito e é descontado)
    id: 'ch1', from: { id: 'a1', name: 'Alice' }, participants: ['a1', 'b2'], names: {},
    startAt: D(3), endAt: D(1), accepted: { a1: D(3), b2: D(2) }, createdAt: D(3),
  },
  { // ativo, ninguém aceitou ainda além do criador
    id: 'ch2', from: { id: 'b2', name: 'Bob' }, participants: ['b2', 'a1', 'c3'], names: {},
    startAt: D(1), endAt: NOW + 86400, accepted: { b2: D(1) }, createdAt: D(1),
  },
];

// ---------- 5. flattenRuns: letras completas, tentativa e era ----------
const flat = flattenRuns(statsFix);
eq('flatten: 9 corridas', flat.length, 9);
const b2run4 = flat.find((r) => r.id === 'b2' && r.m === 2100);
eq('flatten: letras novas decodificadas (e/h/p/n/g)',
  [b2run4.e, b2run4.h, b2run4.p, b2run4.n, b2run4.g], [2, 20, 1, 1, 'robot']);
eq('flatten: attemptIndex reconstruído (attempts − janela)', flat.find((r) => r.id === 'a1' && r.m === 1200).attemptIndex, 8);
eq('flatten: era por `v` (1.7.1 → A, 1.8.5 → B)',
  [flat.find((r) => r.m === 1200).era, b2run4.era], ['A', 'B']);
eq('flatten: sem `v` e sem history.versions → era ?', flat.find((r) => r.m === 220).era, '?');

// ---------- 6. radiografia: totais, funil, blocos ----------
const r1 = radiografia({ stats: statsFix, scores: scoresFix, challenges: challengesFix }, { nowS: NOW, versaoJogo: '1.8.8' });
const M = r1.metricas;
eq('totais: jogadores/execuções/fugas', [M.totais.jogadores, M.totais.execucoes, M.totais.fugas], [3, 19, 1]);
eq('totais: corridas na janela', M.totais.corridasJanela, 9);
eq('totais: docs com history.days', M.totais.docsComHistory, 2);
eq('funil bestM: 100/1000/2000', [M.funil.bestM[100], M.funil.bestM[1000], M.funil.bestM[2000]], [3, 2, 1]);
eq('funil corridas: 100/300/2000', [M.funil.corridas[100], M.funil.corridas[300], M.funil.corridas[2000]], [8, 3, 1]);
eq('pós-portão: n/mediana/máx', [M.funil.posPortao.n, M.funil.posPortao.medianaM, M.funil.posPortao.maxM], [2, 1650, 2100]);
eq('curva era A: 3 corridas na faixa 6–15', M.curva.eraA.find((f) => f.faixa === '6–15').n, 3);
eq('curva era B: 4 corridas na faixa 1–5', M.curva.eraB.find((f) => f.faixa === '1–5').n, 4);
eq('onboarding comparável (tent. 1–3 era B): mediana', M.curva.onboarding13B.medianaM, 180);
eq('corridas de era indeterminada', M.curva.incertas, 2);
eq('boss portão: lutas/full/mortes', [M.bosses.b1.lutas, M.bosses.b1.fullClear, M.bosses.b1.mortes], [2, 2, 1]);
eq('boss 2000m: chegadas/dist e=2/mortes', [M.bosses.b2.chegadas, M.bosses.b2.dist[2], M.bosses.b2.mortes], [1, 1, 1]);
eq('fúria negada (letra n) somada', M.bosses.furiaNegada, 1);
eq('skins: jogadores com skin na janela', M.skins.jogadoresComSkin, 1);
eq('desafios: criados/ativos/expirados', [M.desafios.criados, M.desafios.ativos, M.desafios.expirados], [2, 1, 1]);
eq('desafios: aceite desconta o criador (1 de 3 convites)', [M.desafios.aceites, M.desafios.convites], [1, 3]);
eq('desafios: latência mediana de aceite (24 h)', M.desafios.latenciaMedianaH, 24);
eq('retenção: coorte de b2 tem D1 = 1/1', (() => {
  const c = M.retencao.coortes.find((x) => x.elegD1 > 0 && x.d1 > 0);
  return c ? [c.d1, c.elegD1] : null;
})(), [1, 1]);
eq('mortes por causa: boss2 agregado', M.mortes.porCausa.boss2, 1);
eq('base: pré-1.8.4 na última visita', M.base.preScoreM, 2); // a1 (1.7.1) e c3 (1.5.0)
eq('cobertura: letra n citada mesmo rara', M.cobertura.n, 1);

// ---------- 7. Recomputo de bônus === ScoreSystem (contrato vivo) ----------
const rawB2Run4 = statsFix[1].runs[3];
eq('runBonus da corrida de 2100m (conta feita à mão: 189 combate + 150 fim)',
  ScoreSystem.runBonus(rawB2Run4), 339);
eq('teto do bônus não agiu na fixture', M.pontuacao.bonusJanela.capAtivo, 0);
eq('adoção de scoreM no ranking', [M.pontuacao.adocaoScoreM.com, M.pontuacao.adocaoScoreM.total], [1, 2]);

// ---------- 8. Conferência com o digest (a letra do §3, automatizada) ----------
const digest = buildDigest(statsFix, scoresFix, NOW * 1000);
const linhaTotais = digest.message.split('\n').find((l) => l.startsWith('🌍'));
const nums = (linhaTotais.match(/\d+/g) || []).map(Number);
eq('conferência: mesmos totais do npm run digest (jogadores/execuções/fugas)',
  nums, [r1.meta.conferenciaDigest.jogadores, r1.meta.conferenciaDigest.execucoes, r1.meta.conferenciaDigest.fugas]);

// ---------- 9. Insights: gatilhos e amostra mínima ----------
const insightIds = Object.fromEntries(r1.insights.map((i) => [i.id, i.sev]));
eq('R-15 (fúria negada > 0) dispara', insightIds['R-15'] !== undefined, true);
eq('R-01 com 2 mensuráveis = ⚪ amostra insuficiente (nunca silêncio)', insightIds['R-01'], 'sem-amostra');
eq('R-05 com 9 corridas = ⚪ amostra insuficiente', insightIds['R-05'], 'sem-amostra');
ok('insights ordenados por severidade (críticos antes de ⚪)', (() => {
  const ordem = { critico: 0, atencao: 1, observar: 2, vitoria: 3, 'sem-amostra': 4 };
  const sevs = r1.insights.map((i) => ordem[i.sev]);
  return sevs.every((s, i) => i === 0 || s >= sevs[i - 1]);
})());
// R-17 só existe quando a aba passa a execução anterior
const r2 = radiografia({ stats: statsFix, scores: scoresFix, challenges: challengesFix },
  { nowS: NOW, versaoJogo: '1.8.8', anterior: { dia: '2026-08-20', jogadores: 2, execucoes: 15, fugas: 1 } });
ok('R-17 (delta local) aparece quando `anterior` é passado', r2.insights.some((i) => i.id === 'R-17'));
ok('R-17 ausente sem `anterior` (CLI é stateless)', !r1.insights.some((i) => i.id === 'R-17'));

// ---------- 10. Markdown: determinismo e esqueleto ----------
const r1b = radiografia({ stats: statsFix, scores: scoresFix, challenges: challengesFix }, { nowS: NOW, versaoJogo: '1.8.8' });
eq('determinismo: duas chamadas → markdown byte a byte', r1.markdown === r1b.markdown, true);
ok('markdown: cabeçalho datado', r1.markdown.startsWith('## Radiografia dos dados — 2026-08-22'));
ok('markdown: resumo executivo presente', r1.markdown.includes('### Resumo executivo'));
ok('markdown: funil com as marcas do §2.2', r1.markdown.includes('| 1.400 m |') && r1.markdown.includes('| 10.000 m |'));
ok('markdown: ressalvas regeradas com cobertura por letra', r1.markdown.includes('Cobertura por letra'));
ok('markdown: baseline citada', r1.markdown.includes(BASELINE_20260816.quando));
ok('markdown: nunca vaza NaN/undefined', !/NaN|undefined/.test(r1.markdown));

// ---------- 11. Higiene dos fetchers (text-asserts, molde do test-stats) ----------
const cliSrc = readFileSync(join(ROOT, 'tools', 'radiografia.mjs'), 'utf8');
ok('CLI: filtro ^claude- presente', cliSrc.includes('^claude-'));
ok('CLI: zero writes (sem POST/setDoc/delete)', !/method:\s*'POST'|setDoc|firestore:delete/.test(cliSrc));
const abaSrc = readFileSync(join(ROOT, 'js', 'setup', 'SetupAnalytics.js'), 'utf8');
ok('aba: filtro ^claude- presente', abaSrc.includes('^claude-'));
ok('aba: zero writes (sem POST/setDoc/delete)', !/method:\s*'POST'|setDoc|firestore:delete/.test(abaSrc));
ok('aba: nunca fala com o servidor :3210', !abaSrc.includes('3210') && !abaSrc.includes('guardServer'));
// Pureza avaliada sobre o CÓDIGO (comentários fora — o cabeçalho do núcleo
// cita as proibições pelo nome)
const coreCode = readFileSync(join(ROOT, 'js', 'stats', 'RadiografiaCore.js'), 'utf8')
  .replace(/\/\/[^\n]*/g, '');
ok('núcleo: puro (sem fetch/DOM/localStorage/Date.now no código)',
  !/fetch\(|document\.|localStorage|Date\.now\(\)/.test(coreCode));
ok('núcleo: não importa StatsDashboard (arrastaria localStorage)', !coreCode.includes('StatsDashboard'));

// ---------- resultado ----------
console.log(`\n${pass} PASS · ${fail} FAIL`);
if (fail > 0) process.exit(1);
