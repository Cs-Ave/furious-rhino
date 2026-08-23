// Grupo de testes da recuperação de identidade (v1.9.0 — o caso "Teco").
//   npm run test-reassign
// Sem navegador e SEM rede: valida o mergeIdentity puro (a invariante da
// monotonia das rules de stats: totais somados são sempre >= servidor), a
// janela de runs, a fusão do history, a inferência de medalhas e as guardas
// do fluxo (claim/cooldown/notice) com o ntfy silenciado.
globalThis.localStorage = {
  _m: new Map(),
  getItem(k) { return this._m.has(k) ? this._m.get(k) : null; },
  setItem(k, v) { this._m.set(k, String(v)); },
  removeItem(k) { this._m.delete(k); },
};
// sessionStorage: o NotifySystem consulta o orçamento por aba
globalThis.sessionStorage = {
  _m: new Map(),
  getItem(k) { return this._m.has(k) ? this._m.get(k) : null; },
  setItem(k, v) { this._m.set(k, String(v)); },
  removeItem(k) { this._m.delete(k); },
};
// ntfy silenciado ANTES do import: nenhum teste daqui pode gerar push real
localStorage.setItem('furious_rhino_notify_off', '1');

const { ReassignSystem } = await import('../js/systems/ReassignSystem.js');
const { StorageManager } = await import('../js/utils/StorageManager.js');

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

const virgem = () => ({
  record: 0, recordPts: 0, attempts: 0, playtimeS: 0, wins: 0, animalsTotal: 0,
  deaths: {}, runs: [], history: { clients: {}, geos: {}, versions: {}, days: {}, firstSeenS: 0 },
  geo: null, medals: [],
});

// O doc órfão do "Teco" (valores da radiografia real: 1907 pts / 1533 m, 6º)
const SCORES_TECO = {
  name: 'Teco', nameLower: 'teco', score: 1907, scoreM: 1533,
  scoreAt: '2026-08-10T14:00:00.000Z', skin: 'default',
};
const STATS_TECO = {
  attempts: 40, playTimeS: 3600, wins: 3, bestM: 1533,
  deaths: { t1: 5, wall: 4, boss: 2 },
  runs: [
    { t: 1754000000, m: 320, c: 'wall', w: 5, a: 3 },
    { t: 1754100000, m: 1533, c: 'dart', r: 3, o: 2, a: 4, e: 4 },
    { t: 1754200000, m: 980, c: 'boss', a: 2 },
  ],
  history: {
    clients: { 'Android 14 · Chrome': 40 }, geos: { 'São Paulo (SP) · BR': 40 },
    versions: { '1.8.3': 40 }, days: { '2026-08-10': { r: 12, s: 2, b: 1533 } },
    firstSeenS: 1750000000,
  },
  geo: { country: 'BR', region: 'SP', city: 'São Paulo', at: 1754000000 },
};

// ---------- 1. Aparelho virgem adota o Teco inteiro ----------
const p1 = ReassignSystem.mergeIdentity(virgem(), SCORES_TECO, STATS_TECO, 1755000000000);
eq('apelido restaurado', p1.set['furious_rhino_player_name'], 'Teco');
eq('name_is_auto removido (nome é escolha de verdade)',
  p1.remove.includes('furious_rhino_name_is_auto'), true);
eq('best_sent = score do doc (sem ele o rename() recusa)',
  p1.set['furious_rhino_best_sent'], '1907');
eq('best_sent_m = scoreM', p1.set['furious_rhino_best_sent_m'], '1533');
eq('best_sent_at = scoreAt em ms', p1.set['furious_rhino_best_sent_at'],
  String(Date.parse('2026-08-10T14:00:00.000Z')));
eq('best_sent_skin preservada', p1.set['furious_rhino_best_sent_skin'], 'default');
eq('record = bestM do servidor', p1.set['furious_rhino_record'], '1533');
eq('record_pts = score do doc', p1.set['furious_rhino_record_pts'], '1907');
eq('totais copiados do servidor (local zerado)',
  [p1.set['furious_rhino_attempts'], p1.set['furious_rhino_playtime_s'], p1.set['furious_rhino_wins']],
  ['40', '3600', '3']);
eq('deaths do servidor', JSON.parse(p1.set['furious_rhino_deaths']).wall, 4);
eq('runs do servidor, em ordem', JSON.parse(p1.set['furious_rhino_runs']).length, 3);
eq('geo reconstruído do servidor (local não tinha)',
  JSON.parse(p1.set['furious_rhino_geo']).city, 'São Paulo');
eq('history: firstSeenS preservado',
  JSON.parse(p1.set['furious_rhino_history']).firstSeenS, 1750000000);
eq('animais: piso da janela (3+4+2)', p1.set['furious_rhino_animals_total'], '9');

// ---------- 2. Medalhas inferidas da janela ----------
const meds1 = new Set(JSON.parse(p1.set['furious_rhino_medals']));
eq('medalhas: first_run (attempts>0) e escape (wins>0)',
  [meds1.has('first_run'), meds1.has('escape')], [true, true]);
eq('medalhas de distância até 1400m (corrida de 1533m)',
  [meds1.has('dist_100'), meds1.has('dist_1000'), meds1.has('dist_1400')], [true, true, true]);
eq('medalha dist_1600 NÃO (nenhuma corrida chegou)', meds1.has('dist_1600'), false);
eq('mecânicas: walls_5 (w=5), ramps_3 (r=3), towers_2 (o=2)',
  [meds1.has('walls_5'), meds1.has('ramps_3'), meds1.has('towers_2')], [true, true, true]);
eq('city_boss_win pela letra e=4 (Muralha)', meds1.has('city_boss_win'), true);
eq('boss2_win NÃO (u ausente — Barreira nunca vencida)', meds1.has('boss2_win'), false);
eq('record_2x NÃO é inferível (perda honesta)', meds1.has('record_2x'), false);
eq('animals_10 NÃO (piso 9 < 10)', meds1.has('animals_10'), false);

// ---------- 3. Aparelho COM progresso local: soma, nunca copia ----------
const local3 = {
  ...virgem(),
  record: 2000, recordPts: 2400, attempts: 3, playtimeS: 200, wins: 1, animalsTotal: 15,
  deaths: { t1: 1, wall: 1, farao: 1 },
  runs: [{ t: 1754900000, m: 2000, c: 'win', a: 15 }],
  medals: ['record_2x'],
};
const p3 = ReassignSystem.mergeIdentity(local3, SCORES_TECO, STATS_TECO, 1755000000000);
eq('monotonia: attempts local+servidor (3+40)', p3.set['furious_rhino_attempts'], '43');
eq('monotonia: playtime somado (200+3600)', p3.set['furious_rhino_playtime_s'], '3800');
eq('monotonia: wins somado (1+3)', p3.set['furious_rhino_wins'], '4');
const d3 = JSON.parse(p3.set['furious_rhino_deaths']);
eq('deaths somados chave a chave (wall 1+4; farao só local)', [d3.wall, d3.farao, d3.boss], [5, 1, 2]);
eq('record fica com o MAIOR lado (local 2000 > servidor 1533)',
  p3.set['furious_rhino_record'], '2000');
eq('record_pts idem (2400 > 1907)', p3.set['furious_rhino_record_pts'], '2400');
eq('animais: máximo, não soma (15 > piso 24? não: 15+9 NÃO — max(15, 24))',
  p3.set['furious_rhino_animals_total'], '24');
const runs3 = JSON.parse(p3.set['furious_rhino_runs']);
eq('runs concatenadas em ordem cronológica (servidor + local)',
  [runs3.length, runs3[runs3.length - 1].m], [4, 2000]);
eq('medalha local preservada na união (record_2x)',
  JSON.parse(p3.set['furious_rhino_medals']).includes('record_2x'), true);
eq('animals_10 agora sim (24 >= 10)',
  JSON.parse(p3.set['furious_rhino_medals']).includes('animals_10'), true);

// A invariante que as rules cobram em silêncio: NENHUM total pode encolher
const srv = { attempts: 40, playTimeS: 3600, wins: 3, bestM: 1533 };
eq('INVARIANTE monotonia: todos os totais >= servidor', [
  parseInt(p3.set['furious_rhino_attempts'], 10) >= srv.attempts,
  parseInt(p3.set['furious_rhino_playtime_s'], 10) >= srv.playTimeS,
  parseInt(p3.set['furious_rhino_wins'], 10) >= srv.wins,
  parseInt(p3.set['furious_rhino_record'], 10) >= srv.bestM,
], [true, true, true, true]);

// ---------- 4. Janela de runs: teto 50, mais novas vencem ----------
const manyRuns = Array.from({ length: 48 }, (_, i) => ({ t: 1754000000 + i * 100, m: 100 + i }));
const localRuns = Array.from({ length: 5 }, (_, i) => ({ t: 1754900000 + i * 100, m: 900 + i }));
const p4 = ReassignSystem.mergeIdentity(
  { ...virgem(), runs: localRuns }, null, { ...STATS_TECO, runs: manyRuns }, 0);
const runs4 = JSON.parse(p4.set['furious_rhino_runs']);
eq('janela de 50 respeitada (48+5 → 50)', runs4.length, 50);
eq('as mais VELHAS saem (t crescente; última é local)',
  [runs4[0].m, runs4[49].m], [103, 904]);

// ---------- 5. Só stats (nunca pontuou com nome): sem apelido, sem best_sent ----------
const p5 = ReassignSystem.mergeIdentity(virgem(), null, STATS_TECO, 0);
eq('sem doc de scores: apelido não é tocado',
  'furious_rhino_player_name' in p5.set, false);
eq('sem doc de scores: best_sent não nasce',
  'furious_rhino_best_sent' in p5.set, false);
eq('totais vêm do stats mesmo assim', p5.set['furious_rhino_attempts'], '40');

// ---------- 6. Doc antigo sem scoreM/scoreAt (pré-v1.8.4) ----------
const p6 = ReassignSystem.mergeIdentity(virgem(),
  { name: 'Teco', score: 800 }, null, 0);
eq('scoreM ausente: metros caem no score (era total==metros)',
  p6.set['furious_rhino_best_sent_m'], '800');
eq('scoreAt ausente: chave não nasce', 'furious_rhino_best_sent_at' in p6.set, false);
eq('record herda o scoreM implícito? NÃO (só bestM/scoreM explícitos)',
  'furious_rhino_record' in p6.set, false);

// ---------- 7. toMillis: os três formatos do scoreAt ----------
eq('toMillis: Timestamp do SDK (toMillis)',
  ReassignSystem.toMillis({ toMillis: () => 123456 }), 123456);
eq('toMillis: ISO do REST', ReassignSystem.toMillis('2026-08-10T14:00:00.000Z'),
  Date.parse('2026-08-10T14:00:00.000Z'));
eq('toMillis: número passa direto', ReassignSystem.toMillis(1755000000000), 1755000000000);
eq('toMillis: lixo vira 0', [ReassignSystem.toMillis(null), ReassignSystem.toMillis('lixo')], [0, 0]);

// ---------- 8. History: fusão e tetos ----------
const hLocal = {
  clients: { 'iPhone · Safari': 2 }, geos: {}, versions: { '1.9.0': 2 },
  days: { '2026-08-10': { r: 1, s: 1, b: 400 }, '2026-08-22': { r: 2, s: 1, b: 900 } },
  firstSeenS: 1754800000,
};
const p8 = ReassignSystem.mergeIdentity({ ...virgem(), history: hLocal }, null, STATS_TECO, 0);
const h8 = JSON.parse(p8.set['furious_rhino_history']);
eq('history: dia comum soma corridas/sessões e fica com a melhor marca',
  h8.days['2026-08-10'], { r: 13, s: 3, b: 1533 });
eq('history: dia só local sobrevive', h8.days['2026-08-22'], { r: 2, s: 1, b: 900 });
eq('history: aparelhos dos dois lados convivem',
  [h8.clients['Android 14 · Chrome'], h8.clients['iPhone · Safari']], [40, 2]);
eq('history: firstSeenS = o mais antigo', h8.firstSeenS, 1750000000);

const manyDays = {};
for (let i = 0; i < 70; i++) manyDays[`2026-06-${String((i % 30) + 1).padStart(2, '0')}x${i}`] = { r: 1 };
const p8b = ReassignSystem.mergeIdentity(
  { ...virgem(), history: { ...hLocal, days: manyDays } }, null, null, 0);
eq('history: teto de 60 dias reaplicado (poda por idade)',
  Object.keys(JSON.parse(p8b.set['furious_rhino_history']).days).length, 60);

// ---------- 9. Guardas do fluxo (sem rede: ntfy silenciado no topo) ----------
localStorage.removeItem('furious_rhino_claim');
const r1 = await ReassignSystem.requestClaim('Teco');
eq('requestClaim: marca gravada e push suprimido → saved', r1, 'saved');
eq('claim persistido com slug normalizado',
  JSON.parse(localStorage.getItem('furious_rhino_claim')).slug, 'teco');
const r1b = await ReassignSystem.requestClaim('Teco');
eq('push que falhou NÃO arma cooldown (retry offline permitido)', r1b, 'saved');
localStorage.setItem('furious_rhino_claim',
  JSON.stringify({ slug: 'teco', at: Date.now(), sent: 1 }));
const r2 = await ReassignSystem.requestClaim('  TÉCO ');
eq('cooldown de 24h: mesmo slug JÁ ENVIADO (acento/caixa) → again', r2, 'again');
const r3 = await ReassignSystem.requestClaim('Fernanda');
eq('slug DIFERENTE fura o cooldown (pedido novo)', r3, 'saved');

// maybeRestore sem par no cache e sem rede: não explode, devolve false
localStorage.setItem('furious_rhino_reassign_cfg',
  JSON.stringify({ at: Date.now(), pairs: {} }));
eq('maybeRestore: com pedido mas sem par no mapa → false',
  await ReassignSystem.maybeRestore(), false);
localStorage.removeItem('furious_rhino_claim');
localStorage.removeItem('furious_rhino_reassign_cfg');
eq('maybeRestore: sem pedido pendente → false, zero consulta',
  await ReassignSystem.maybeRestore(), false);

// consumeRestoredNotice: 1× e só 1× (o push sai silenciado)
localStorage.setItem('furious_rhino_reassigned_from',
  JSON.stringify({ from: 'novo-1', to: 'antigo-1', name: 'Teco', at: 1 }));
const n1 = ReassignSystem.consumeRestoredNotice();
eq('notice: devolve o nome UMA vez', n1 && n1.name, 'Teco');
eq('notice: segunda chamada é nula (announced)',
  ReassignSystem.consumeRestoredNotice(), null);

// ---------- 10. Idempotência do fluxo: id adotado não é chave do mapa ----------
// Depois da adoção o player_id É o id antigo; a entrada {novo: antigo} pode
// mofar no doc sem re-disparar migração (pairs[antigo] não existe).
localStorage.setItem('furious_rhino_player_id', 'antigo-1');
localStorage.setItem('furious_rhino_claim', JSON.stringify({ slug: 'teco', at: Date.now() }));
localStorage.setItem('furious_rhino_reassign_cfg',
  JSON.stringify({ at: Date.now(), pairs: { 'novo-1': 'antigo-1' } }));
eq('par velho no mapa não re-migra quem já adotou o id',
  await ReassignSystem.maybeRestore(), false);
// autopar (novo == antigo) também é ignorado
localStorage.setItem('furious_rhino_player_id', 'novo-2');
localStorage.setItem('furious_rhino_reassign_cfg',
  JSON.stringify({ at: Date.now(), pairs: { 'novo-2': 'novo-2' } }));
eq('par apontando para si mesmo é ignorado', await ReassignSystem.maybeRestore(), false);

// ---------- resumo ----------
console.log(`\n${pass + fail} asserts — ${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
console.log('test-reassign: OK');
