// Grupo de testes da ARENA DE DESAFIOS (v1.8.6 — desafios 1v1/grupo em que o
// doc é metadado e o placar é DERIVADO das janelas de runs[] em stats/{id}).
//   node tools/test-challenge.mjs
//
// Node puro, sem navegador: as funções puras do ChallengeSystem recebem
// nowMs/nowS parametrizáveis exatamente para caber aqui, e os guardas do
// create são a função pura validateCreate. A parte de rede não é exercitada
// (contrato de silêncio: engole erro e degrada para cache) — o que se testa
// dela é o estado local (cache semeado, visto/recusado).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

globalThis.localStorage = {
  _m: new Map(),
  getItem(k) { return this._m.has(k) ? this._m.get(k) : null; },
  setItem(k, v) { this._m.set(k, String(v)); },
  removeItem(k) { this._m.delete(k); },
};

// Identidade semeada ANTES de qualquer chamada: getOrCreatePlayerId não pode
// minerar um UUID novo no meio do teste (o cache semeado referencia este id)
const MEU_ID = 'teste-agente-a-0000-0000-000000000001';
localStorage.setItem('furious_rhino_player_id', MEU_ID);
localStorage.setItem('furious_rhino_player_name', 'Teco');

const { Constants } = await import('../js/utils/Constants.js');
const { ScoreSystem } = await import('../js/systems/ScoreSystem.js');
const { ChallengeSystem } = await import('../js/systems/ChallengeSystem.js');

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

// ---------- 1. bestInWindow: a melhor corrida da janela ----------
const J0 = 1700000000;          // início da janela (epoch s)
const J1 = J0 + 3 * 86400;      // fim (3 dias)

eq('run dentro da janela vira a melhor',
  ChallengeSystem.bestInWindow([{ t: J0 + 100, m: 500 }], J0, J1),
  { pts: 500, m: 500, t: J0 + 100 });
eq('run ANTES da janela não conta',
  ChallengeSystem.bestInWindow([{ t: J0 - 1, m: 500 }], J0, J1), null);
eq('run DEPOIS da janela não conta',
  ChallengeSystem.bestInWindow([{ t: J1 + 1, m: 500 }], J0, J1), null);
eq('borda EXATA t == startS conta',
  ChallengeSystem.bestInWindow([{ t: J0, m: 300 }], J0, J1).t, J0);
eq('borda EXATA t == endS conta',
  ChallengeSystem.bestInWindow([{ t: J1, m: 300 }], J0, J1).t, J1);
eq('janela vazia -> null',
  [ChallengeSystem.bestInWindow([], J0, J1), ChallengeSystem.bestInWindow(undefined, J0, J1)],
  [null, null]);
// A métrica é PONTOS, não metros: 900m com muito combate bate 990m sem nada
// (900 + 10×5 + 8×15 + 5×3 = 1085 > 990). A comparação usa 990 e não 1000
// porque 1000m JÁ deriva a fuga (+100) no runBonus — e não seria "sem nada".
eq('escolha por PONTOS: 900m com combate bate 990m limpa',
  ChallengeSystem.bestInWindow(
    [{ t: J0 + 10, m: 990 }, { t: J0 + 20, m: 900, w: 10, o: 8, a: 5 }], J0, J1),
  { pts: 1085, m: 900, t: J0 + 20 });
eq('empate em pts: a mais ANTIGA vence (ordem do array não decide)',
  ChallengeSystem.bestInWindow(
    [{ t: J0 + 500, m: 800 }, { t: J0 + 100, m: 800 }], J0, J1).t,
  J0 + 100);
// Contadores de boss (b portão, e Cerco, l Guardião — v1.8.5) pontuam via
// runBonus: 2500 + (3+4+2)×25 + 150 (Cerco vencido) + 100 (fuga, m >= 1000)
eq('runs com contadores de boss (b/e/l) pontuam via runBonus',
  ChallengeSystem.bestInWindow(
    [{ t: J0 + 50, m: 2500, c: 'dart', b: 3, e: 4, l: 2, z: 30 }], J0, J1),
  { pts: 2975, m: 2500, t: J0 + 50 });
eq('...e o pts bate com ScoreSystem.total(m, runBonus(run)) — mesma régua',
  ChallengeSystem.bestInWindow(
    [{ t: J0 + 50, m: 2500, c: 'dart', b: 3, e: 4, l: 2, z: 30 }], J0, J1).pts,
  ScoreSystem.total(2500, ScoreSystem.runBonus({ m: 2500, c: 'dart', b: 3, e: 4, l: 2, z: 30 })));
eq('item malformado no meio não derruba a leitura (dado de terceiros)',
  ChallengeSystem.bestInWindow(
    [null, 'lixo', { t: 'x', m: 100 }, { t: J0 + 5, m: 200 }], J0, J1),
  { pts: 200, m: 200, t: J0 + 5 });

// ---------- 2. countdownText ----------
const AGORA_MS = 1700000000000; // = J0 em ms
const emS = (s) => Math.floor(AGORA_MS / 1000) + s;

eq('mais de 24h: dias e horas',
  ChallengeSystem.countdownText(emS(2 * 86400 + 14 * 3600), AGORA_MS), 'termina em 2d 14h');
eq('borda de 24h EXATAS entra no formato de dias',
  ChallengeSystem.countdownText(emS(24 * 3600), AGORA_MS), 'termina em 1d 0h');
eq('menos de 24h: só horas',
  ChallengeSystem.countdownText(emS(5 * 3600), AGORA_MS), 'termina em 5h');
eq('borda de 1h EXATA ainda é horas',
  ChallengeSystem.countdownText(emS(3600), AGORA_MS), 'termina em 1h');
eq('menos de 1h: minutos',
  ChallengeSystem.countdownText(emS(12 * 60), AGORA_MS), 'termina em 12min');
eq('menos de 1min arredonda para 1min (0min pareceria bug)',
  ChallengeSystem.countdownText(emS(30), AGORA_MS), 'termina em 1min');
eq('no gongo e depois dele: encerrado',
  [ChallengeSystem.countdownText(emS(0), AGORA_MS), ChallengeSystem.countdownText(emS(-500), AGORA_MS)],
  ['encerrado', 'encerrado']);

// ---------- 3. isActive / statusOf / leaderOf ----------
const chBase = { startAt: J0, endAt: J1 };
eq('isActive dentro da janela', ChallengeSystem.isActive(chBase, J0 + 100), true);
eq('isActive na borda do início (startAt <= now)', ChallengeSystem.isActive(chBase, J0), true);
eq('isActive antes do início', ChallengeSystem.isActive(chBase, J0 - 1), false);
eq('isActive na borda do fim (now < endAt: fim exclusivo)',
  ChallengeSystem.isActive(chBase, J1), false);
eq('isActive de doc malformado não explode',
  [ChallengeSystem.isActive({}, J0), ChallengeSystem.isActive(null, J0)], [false, false]);

const chPapeis = {
  from: { id: 'A', name: 'Ana' },
  participants: ['A', 'B', 'C'],
  accepted: { A: J0, B: J0 + 10 },
  startAt: J0, endAt: J1,
};
eq('statusOf: criador', ChallengeSystem.statusOf(chPapeis, 'A'), 'creator');
eq('statusOf: aceito', ChallengeSystem.statusOf(chPapeis, 'B'), 'accepted');
eq('statusOf: convidado (participante que não aceitou)',
  ChallengeSystem.statusOf(chPapeis, 'C'), 'invited');
eq('statusOf: de fora', ChallengeSystem.statusOf(chPapeis, 'Z'), 'out');

eq('leaderOf: pts máximo lidera',
  ChallengeSystem.leaderOf([
    { id: 'a', best: { pts: 100, t: 5 } },
    { id: 'b', best: { pts: 300, t: 9 } },
  ]).id, 'b');
eq('leaderOf: empate -> corrida mais ANTIGA lidera',
  ChallengeSystem.leaderOf([
    { id: 'a', best: { pts: 500, t: 200 } },
    { id: 'b', best: { pts: 500, t: 100 } },
  ]).id, 'b');
eq('leaderOf: lista vazia -> null', ChallengeSystem.leaderOf([]), null);
eq('leaderOf: ninguém correu na janela (best null) -> null',
  ChallengeSystem.leaderOf([{ id: 'a', best: null }, { id: 'b', best: null }]), null);
eq('leaderOf: linha sem best não lidera, mas não anula quem tem',
  ChallengeSystem.leaderOf([{ id: 'a', best: null }, { id: 'b', best: { pts: 40, t: 1 } }]).id, 'b');

// ---------- 4. unseenInvites com cache semeado ----------
const nowS = Math.floor(Date.now() / 1000);
const ativo = (id, extra = {}) => ({
  id,
  from: { id: 'outro-1', name: 'Ana' },
  participants: ['outro-1', MEU_ID],
  names: { 'outro-1': 'Ana', [MEU_ID]: 'Teco' },
  startAt: nowS - 100,
  endAt: nowS + 86400,
  accepted: { 'outro-1': nowS - 100 },
  ...extra,
});
localStorage.setItem('furious_rhino_chal_cache', JSON.stringify({
  at: Date.now(),
  list: [
    ativo('c-novo'),
    ativo('c-visto'),
    ativo('c-recusado'),
    ativo('c-aceito', { accepted: { 'outro-1': nowS - 100, [MEU_ID]: nowS - 50 } }),
    ativo('c-expirado', { startAt: nowS - 90000, endAt: nowS - 3600 }),
    ativo('c-meu', { from: { id: MEU_ID, name: 'Teco' } }),
  ],
}));
localStorage.removeItem('furious_rhino_chal_seen');
ChallengeSystem.markSeen('c-visto');
ChallengeSystem.declineLocal('c-recusado');

eq('unseenInvites: só o convite ativo, não aceito e nunca visto aparece',
  ChallengeSystem.unseenInvites().map((ch) => ch.id), ['c-novo']);
eq('cached() devolve { at, list }',
  [typeof ChallengeSystem.cached().at, ChallengeSystem.cached().list.length], ['number', 6]);
ChallengeSystem.markSeen('c-novo');
eq('markSeen esconde o convite sem apagá-lo do cache',
  [ChallengeSystem.unseenInvites().length, ChallengeSystem.cached().list.length], [0, 6]);
eq('declineLocal fica SÓ neste aparelho (nada no doc — ninguém é exposto)',
  ChallengeSystem.seenMap()['c-recusado'].d, 1);
eq('cache corrompido degrada para vazio, sem lançar',
  (() => {
    localStorage.setItem('furious_rhino_chal_cache', '{lixo');
    return [ChallengeSystem.cached(), ChallengeSystem.unseenInvites()];
  })(), [null, []]);

// ---------- 5. validateCreate: os guardas locais do create (função PURA) ----------
// O create chama estes guardas ANTES de qualquer rede/allowsRemoteWrite —
// cada reason vira mensagem específica na UI.
const argsOk = {
  myId: 'eu', myName: 'Teco', isAuto: false,
  participants: ['eu', 'b'], days: 3, activeCreated: 0,
};
eq('argumentos válidos passam (null = sem erro)',
  ChallengeSystem.validateCreate(argsOk), null);
eq('sem apelido -> name', ChallengeSystem.validateCreate({ ...argsOk, myName: '' }), 'name');
eq('apelido automático (Anonimo_N) -> name',
  ChallengeSystem.validateCreate({ ...argsOk, isAuto: true }), 'name');
eq('teto de ativos criados -> cap',
  ChallengeSystem.validateCreate({ ...argsOk, activeCreated: Constants.CHALLENGE_MAX_ACTIVE_CREATED }), 'cap');
eq('abaixo do teto ainda cria',
  ChallengeSystem.validateCreate({ ...argsOk, activeCreated: Constants.CHALLENGE_MAX_ACTIVE_CREATED - 1 }), null);
eq('days fora de CHALLENGE_DURATIONS_D -> invalid',
  [ChallengeSystem.validateCreate({ ...argsOk, days: 2 }),
    ChallengeSystem.validateCreate({ ...argsOk, days: 0 }),
    ChallengeSystem.validateCreate({ ...argsOk, days: undefined })],
  ['invalid', 'invalid', 'invalid']);
eq('todas as durações oficiais passam',
  Constants.CHALLENGE_DURATIONS_D.map((d) => ChallengeSystem.validateCreate({ ...argsOk, days: d })),
  [null, null, null]);
eq('sozinho não é desafio (2 participantes no mínimo) -> invalid',
  ChallengeSystem.validateCreate({ ...argsOk, participants: ['eu'] }), 'invalid');
eq('acima do teto de participantes -> invalid',
  ChallengeSystem.validateCreate({
    ...argsOk,
    participants: ['eu', '1', '2', '3', '4', '5', '6', '7', '8'],
  }), 'invalid');
eq('teto EXATO de participantes passa',
  ChallengeSystem.validateCreate({
    ...argsOk,
    participants: ['eu', '1', '2', '3', '4', '5', '6', '7'],
  }), null);
eq('precedência: sem apelido fala mais alto que o teto',
  ChallengeSystem.validateCreate({ ...argsOk, myName: '', activeCreated: 9 }), 'name');

// ---------- 6. Constantes: o contrato numérico ----------
eq('durações oficiais: 1, 3 e 7 dias', Constants.CHALLENGE_DURATIONS_D, [1, 3, 7]);
eq('teto de participantes bate com o das rules (8)',
  Constants.CHALLENGE_MAX_PARTICIPANTS, 8);
eq('teto de desafios ativos criados', Constants.CHALLENGE_MAX_ACTIVE_CREATED, 3);
eq('TTLs do cache (1h) e do standings (30min)',
  [Constants.CHALLENGE_CACHE_TTL_MS, Constants.CHALLENGE_STANDINGS_TTL_MS],
  [3600000, 1800000]);
eq('a maior duração cabe na janela máxima das rules (7d = 604800s)',
  Math.max(...Constants.CHALLENGE_DURATIONS_D) * 86400, 604800);

// ---------- 7. firestore.rules: o bloco challenges ----------
const rules = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'firestore.rules'), 'utf8'
);
const chalBlock = (rules.split('match /challenges/{challengeId}')[1] || '').split('match /')[0];
eq('rules têm o bloco challenges', chalBlock.length > 0, true);

// Whitelist COMPLETA (os 7 campos, em qualquer ordem) — mesmo estilo do
// assert da whitelist de scores no test-stats: campo fora dela = write
// negado EM SILÊNCIO
const chalHasOnly = (chalBlock.match(/hasOnly\(\[([^\]]*)\]\)/) || [])[1] || '';
eq('whitelist COMPLETA do challenges (7 campos)',
  chalHasOnly.split(',').map((f) => f.trim().replace(/'/g, '')).filter(Boolean).sort(),
  ['accepted', 'createdAt', 'endAt', 'from', 'names', 'participants', 'startAt']);
eq('rules limitam participants a 8',
  /participants\.size\(\) <= 8/.test(chalBlock), true);
eq('rules exigem no mínimo 2 participantes',
  /participants\.size\(\) >= 2/.test(chalBlock), true);
eq('rules limitam a janela a 7 dias (604800s)',
  /endAt - request\.resource\.data\.startAt <= 604800/.test(chalBlock), true);
eq('rules exigem endAt > startAt',
  /endAt > request\.resource\.data\.startAt/.test(chalBlock), true);
eq('update: o accepted só pode CRESCER (hasAll das chaves antigas)',
  /accepted\.keys\(\)\.hasAll\(resource\.data\.accepted\.keys\(\)\)/.test(chalBlock), true);
eq('update: só o campo accepted pode mudar (diff.affectedKeys hasOnly)',
  /diff\(resource\.data\)\.affectedKeys\(\)\.hasOnly\(\['accepted'\]\)/.test(chalBlock), true);
eq('update: accepted respeita o teto de 8 também no aceite',
  (chalBlock.match(/accepted\.size\(\) <= 8/g) || []).length >= 2, true);
eq('delete proibido para sempre', /allow delete: if false/.test(chalBlock), true);
eq('id do doc no mesmo regime do resto (16..40 chars — UUID tem 36)',
  /challengeId\.size\(\) >= 16 && challengeId\.size\(\) <= 40/.test(chalBlock), true);
eq('leitura pública (o placar é derivado no cliente)',
  /allow read: if true/.test(chalBlock), true);
// ⚠️ A armadilha da release: createdAt == request.time SÓ pode valer no
// create — o aceite regrava o doc inteiro relido e o createdAt antigo
// jamais seria == request.time. A cláusula tem de morar na validChallenge
// (usada só no create) e NUNCA na linha do update.
const updateClause = (chalBlock.match(/allow update:[\s\S]*?;/) || [''])[0];
eq('a cláusula do update NÃO exige createdAt == request.time',
  updateClause.includes('createdAt'), false);
eq('o create (validChallenge) exige createdAt == request.time',
  /createdAt == request\.time/.test(chalBlock), true);
eq('validChallenge é usada SÓ no create (1 chamada além da definição)',
  (chalBlock.match(/validChallenge\(\)/g) || []).length, 2);

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
