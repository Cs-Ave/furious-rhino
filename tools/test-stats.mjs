// Grupo de testes da contabilização de estatísticas (página /?stats).
//   npm run test-stats
// Sem navegador: valida a cadeia morte -> localStorage -> campos -> agregação,
// e a consistência entre StorageManager, StatsDashboard e firestore.rules.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

globalThis.localStorage = {
  _m: new Map(),
  getItem(k) { return this._m.has(k) ? this._m.get(k) : null; },
  setItem(k, v) { this._m.set(k, String(v)); },
  removeItem(k) { this._m.delete(k); },
};

const { Constants } = await import('../js/utils/Constants.js');
const { StorageManager } = await import('../js/utils/StorageManager.js');
const { aggregate, allRuns, aggregateBosses } = await import('../js/stats/StatsDashboard.js');

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

// ---------- 1. Tier da posição da morte ----------
eq('tier aos 0m (x=0)', Constants.getTierIndex(0), 0);
eq('tier aos 199m (x=7999)', Constants.getTierIndex(7999), 0);
eq('tier aos 200m (x=8000)', Constants.getTierIndex(8000), 1);
eq('tier aos 400m (x=16000)', Constants.getTierIndex(16000), 2);
eq('tier aos 600m (x=24000)', Constants.getTierIndex(24000), 3);
eq('tier aos 799m (x=31999)', Constants.getTierIndex(31999), 3);
eq('tier aos 800m — reta do portão (x=32000)', Constants.getTierIndex(32000), 4);
eq('tier aos 999m (x=39999)', Constants.getTierIndex(39999), 4);
eq('tier aos 1000m — portão e teto (x=40000)', Constants.getTierIndex(40000), 5);
eq('tier muito além (clamp no teto)', Constants.getTierIndex(999999), 5);

// ---------- 2. Contagem local de mortes ----------
localStorage.removeItem(StorageManager.DEATHS_KEY);
StorageManager.addDeath(0, 'wall');
StorageManager.addDeath(1, 'tower');
StorageManager.addDeath(1, 'dart');
StorageManager.addDeath(3, 'dart');
StorageManager.addDeath(2, 'fall');
StorageManager.addDeath(4, 'spike'); // reta do portão: 800-1000m
StorageManager.addDeath(5, 'animal'); // teto: 1000m+ (modo infinito)
const d = StorageManager.getDeaths();
eq('mortes por tier t1..t6', [d.t1, d.t2, d.t3, d.t4, d.t5, d.t6], [1, 2, 1, 1, 1, 1]);
eq('mortes por causa', [d.wall, d.spike, d.animal, d.dart, d.tower, d.fall], [1, 1, 1, 2, 1, 1]);

StorageManager.addDeath(0, 'causa-desconhecida'); // não explode nem cria chave
const d2 = StorageManager.getDeaths();
eq('causa desconhecida: tier conta, chave nova NÃO nasce', [d2.t1, 'causa-desconhecida' in d2], [2, false]);

localStorage.setItem(StorageManager.DEATHS_KEY, '{lixo');
eq('JSON corrompido volta zerado', StorageManager.getDeaths().t1, 0);

// ---------- 2a. O boss do portão (v1.7) ----------
localStorage.removeItem(StorageManager.DEATHS_KEY);
StorageManager.addDeath(4, 'boss'); // rifle do caçador na reta do portão
const db = StorageManager.getDeaths();
eq('boss: morte pelo rifle conta em deaths.boss e no tier', [db.boss, db.t5], [1, 1]);
eq('boss: mapa de mortes segue no teto das rules (17 <= 17)',
  Object.keys(db).length <= 17, true);

localStorage.removeItem(StorageManager.BOSS_SEEN_KEY);
StorageManager.addBossEncounter();
StorageManager.addBossEncounter();
eq('boss: encontros contados (dicas só nos primeiros)',
  StorageManager.getBossEncounters(), 2);

// ---------- 2a-ter. Os bosses do deserto (v1.8.5) ----------
// Cada boss assina a própria causa: 'boss2' (a rede do Capturador, 2000m) e
// 'boss3' (o Caçador-Mor, 9995m) — o funil separa "morreu em qual luta"
StorageManager.addDeath(5, 'boss2');
StorageManager.addDeath(5, 'boss3');
const db2 = StorageManager.getDeaths();
eq('bosses novos: boss2/boss3 contam nas chaves próprias', [db2.boss2, db2.boss3], [1, 1]);
eq('bosses novos: mapa de mortes segue no teto das rules (<= 17)',
  Object.keys(db2).length <= 17, true);

// Últimas execuções: janela deslizante de 50 (v1.5.0; era 10)
localStorage.removeItem(StorageManager.RUNS_KEY);
for (let i = 1; i <= 52; i++) StorageManager.addRun(i * 10);
const runs = StorageManager.getRuns();
eq('últimas execuções: mantém só 50', runs.length, 50);
eq('últimas execuções: mais antigas caem (janela)', [runs[0].m, runs[49].m], [30, 520]);
eq('últimas execuções: entradas com timestamp', runs.every((r) => r.t > 0), true);

// ---------- 2a-bis. Mecânicas por corrida (v1.6.1) ----------
// A forma do elemento de runs[] é LIVRE nas rules — é onde cabe telemetria
// de comportamento sem gastar campo de primeiro nível.
localStorage.removeItem(StorageManager.RUNS_KEY);
StorageManager.addRun(940, 63, 'wall', {
  wallsBroken: 3, rampsSmashed: 1, towersDowned: 0, animalsHit: 0,
  jumps: 44, dashes: 9, dashesWasted: 5, pauses: 1,
  keyboard: true, version: '1.6.1',
});
const rich = StorageManager.getRuns()[0];
eq('mecânicas: contadores gravados', [rich.w, rich.r, rich.j, rich.d, rich.x, rich.p], [3, 1, 44, 9, 5, 1]);
eq('mecânicas: ZERO é omitido (bytes no doc)', ['o' in rich, 'a' in rich], [false, false]);
eq('mecânicas: teclado e versão', [rich.k, rich.v], [1, '1.6.1']);

StorageManager.addRun(100, 10, 'spike');
eq('mecânicas: corrida sem extras não ganha chaves',
  Object.keys(StorageManager.getRuns()[1]).sort().join(','), 'c,m,s,t');

StorageManager.addRun(50, 5, 'fall', { wallsBroken: 99999, jumps: -3 });
const clamped = StorageManager.getRuns()[2];
eq('mecânicas: contador com teto', clamped.w, 9999);
eq('mecânicas: valor negativo é ignorado', 'j' in clamped, false);

// v1.7: o especial FÚRIA TOTAL entra no runs[] como `f` (e zero é omitido)
StorageManager.addRun(1200, 90, 'win', { specialsUsed: 2 });
eq('mecânicas: especiais usados gravados (f)', StorageManager.getRuns().at(-1).f, 2);
StorageManager.addRun(80, 8, 'wall', { specialsUsed: 0 });
eq('mecânicas: especial zero é omitido', 'f' in StorageManager.getRuns().at(-1), false);

// v1.7: a luta do portão entra como b (camadas), q (quiques) e z (segundos)
StorageManager.addRun(1000, 80, 'win', { bossLayersBroken: 3, bossBounces: 4, bossFightS: 21 });
const luta = StorageManager.getRuns().at(-1);
eq('mecânicas: luta do boss gravada (b/q/z)', [luta.b, luta.q, luta.z], [3, 4, 21]);
StorageManager.addRun(500, 40, 'wall', { bossLayersBroken: 0, bossBounces: 0, bossFightS: 0 });
const semLuta = StorageManager.getRuns().at(-1);
eq('mecânicas: corrida que nem chegou ao boss não ganha chaves',
  ['b', 'q', 'z'].some((k) => k in semLuta), false);

// v1.8.5: os bosses do deserto entram como e/h (camadas e segundos do Cerco)
// e l (camadas do Guardião) — `q` segue EXCLUSIVO do portão (baseline v1.8)
StorageManager.addRun(2100, 130, 'boss2', {
  boss2LayersBroken: 4, boss2FightS: 38, boss3LayersBroken: 5,
});
const deserto = StorageManager.getRuns().at(-1);
eq('mecânicas: lutas dos bosses novos gravadas (e/h/l)',
  [deserto.e, deserto.h, deserto.l], [4, 38, 5]);
StorageManager.addRun(600, 50, 'wall', {
  boss2LayersBroken: 0, boss2FightS: 0, boss3LayersBroken: 0,
});
eq('mecânicas: corrida que nem viu os bosses novos não ganha e/h/l',
  ['e', 'h', 'l'].some((k) => k in StorageManager.getRuns().at(-1)), false);

// ---------- 2b. Histórico acumulado do jogador (v1.5.0) ----------
localStorage.removeItem(StorageManager.HISTORY_KEY);
StorageManager.addHistory({ clientSig: 'mobile · Android 13 · Chrome', geoLabel: 'Rio (RJ) · BR', version: '1.5.0' });
StorageManager.addHistory({ clientSig: 'mobile · Android 13 · Chrome', geoLabel: 'Rio (RJ) · BR', version: '1.5.0' });
StorageManager.addHistory({ clientSig: 'desktop · Windows 11 · Edge', geoLabel: '', version: '1.5.0' });
const hist = StorageManager.getHistory();
eq('histórico: conta execuções por aparelho',
  [hist.clients['mobile · Android 13 · Chrome'], hist.clients['desktop · Windows 11 · Edge']], [2, 1]);
eq('histórico: rótulo vazio não vira chave', Object.keys(hist.geos).length, 1);
eq('histórico: versões acumuladas', hist.versions['1.5.0'], 3);
eq('histórico: primeiro acesso registrado', hist.firstSeenS > 0, true);

const firstSeen = hist.firstSeenS;
StorageManager.addHistory({ clientSig: 'mobile · iOS 18 · Safari', version: '1.5.0' });
eq('histórico: primeiro acesso NÃO é reescrito', StorageManager.getHistory().firstSeenS, firstSeen);

// Teto por bucket aplicado no cliente (as rules só contam o mapa de topo)
for (let i = 0; i < 20; i++) StorageManager.addHistory({ clientSig: `aparelho-${i}` });
const capped = StorageManager.getHistory();
eq('histórico: aparelhos respeitam o teto do cliente',
  Object.keys(capped.clients).length <= StorageManager.HISTORY_CAPS.clients, true);
eq('histórico: poda mantém o aparelho mais usado',
  'mobile · Android 13 · Chrome' in capped.clients, true);

localStorage.setItem(StorageManager.HISTORY_KEY, '{lixo');
eq('histórico: JSON corrompido volta vazio',
  [Object.keys(StorageManager.getHistory().clients).length, StorageManager.getHistory().firstSeenS], [0, 0]);

// ---------- 2c. Atividade diária (v1.6.1) ----------
// É o que alimenta o gráfico de jogadores únicos/dia × execuções/dia com
// contagem EXATA — runs[] só guarda 50 e falsearia dias muito ativos.
localStorage.removeItem(StorageManager.HISTORY_KEY);
const hoje = StorageManager.dayKey();
StorageManager.addHistory({ clientSig: 'x', version: '1.6.1', meters: 300 });
StorageManager.addHistory({ clientSig: 'x', version: '1.6.1', meters: 940 });
StorageManager.addHistory({ clientSig: 'x', version: '1.6.1', meters: 120 });
const dia = StorageManager.getHistory().days[hoje];
eq('dias: conta execuções', dia.r, 3);
eq('dias: guarda a MELHOR marca, não a última', dia.b, 940);

eq('history cabe no teto das rules mesmo com days',
  Object.keys(StorageManager.getHistory()).length <= 6, true);

// Poda por IDADE (o mais velho sai) — e não por menos usado, que abriria
// buracos no meio da série temporal
const h = StorageManager.getHistory();
for (let i = 1; i <= 70; i++) {
  h.days[`2025-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`] = { r: 99 };
}
StorageManager.bumpDay(h, { runs: 1 });
const chaves = Object.keys(h.days).sort();
eq('dias: teto de 60 respeitado', chaves.length, StorageManager.HISTORY_CAPS.days);
eq('dias: o dia de HOJE sobrevive à poda', chaves.includes(hoje), true);
eq('dias: chave é AAAA-MM-DD ordenável', /^\d{4}-\d{2}-\d{2}$/.test(hoje), true);

// Sessão: sem sessionStorage (Node), beginSession não pode inflar contagem
eq('sessão: sem sessionStorage não conta sessão', StorageManager.beginSession(), false);

// ---------- 3. Consistência entre camadas ----------
const causas = Object.keys(StorageManager.getDeaths()).filter((k) => !/^t\d$/.test(k)).sort();
eq('mesmas causas no storage e na página', causas, Object.keys(aggregate([]).causes).sort());

const rules = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'firestore.rules'), 'utf8'
);
// Esquema aninhado: as rules validam o MAPA deaths (não cada causa) com um
// teto de chaves — o storage precisa caber nesse teto
eq('rules aceitam o mapa deaths', rules.includes("'deaths'"), true);
eq('mapa de mortes cabe no teto das rules (size <= 17)',
  Object.keys(StorageManager.getDeaths()).length <= 17, true);

// v1.5.0: history é UM mapa (orçamento de avaliação) e runs vai até 50
eq('rules aceitam o mapa history', rules.includes("'history'"), true);
eq('rules aceitam a janela de 50 execuções', /runs\.size\(\) <= 50/.test(rules), true);
eq('history cabe no teto do mapa de topo (size <= 6)',
  Object.keys(StorageManager.getHistory()).length <= 6, true);
eq('janela local de runs bate com o teto das rules', StorageManager.RUNS_WINDOW, 50);

// ---------- 3b. Top 10: "há X dias segurando a posição" (v1.8) ----------
// Rules: scoreAt entrou na whitelist de scores e é timestamp <= request.time
// (trava o esquecimento de publicar as rules novas na release)
eq('rules de scores aceitam o scoreAt', rules.includes("'scoreAt'"), true);
eq('rules validam scoreAt como timestamp passado',
  /scoreAt is timestamp\s*&&\s*request\.resource\.data\.scoreAt <= request\.time/.test(rules), true);

// holdDays é pura: idade da PRÓPRIA marca de cada linha (v2 da regra — a
// versão por posição reiniciava todo mundo abaixo de uma entrada nova e a
// coluna inteira convergia para a mesma data; o dono trocou em 15/08)
const { LeaderboardSystem } = await import('../js/systems/LeaderboardSystem.js');
const DIA_MS = 86400000;
const hojeMeioDia = new Date(2026, 7, 15, 12).getTime(); // meio-dia local: sem beira de dia
const marcaHa = (d) => hojeMeioDia - d * DIA_MS;
eq('marca: cada linha mostra a idade da própria marca',
  LeaderboardSystem.holdDays([{ sinceMs: marcaHa(10) }, { sinceMs: marcaHa(30) }], hojeMeioDia), [10, 30]);
eq('marca: vizinhos não se contaminam (sem cascata)',
  LeaderboardSystem.holdDays([{ sinceMs: marcaHa(2) }, { sinceMs: marcaHa(7) }, { sinceMs: marcaHa(5) }], hojeMeioDia),
  [2, 7, 5]);
eq('marca: sem timestamp → null, sem afetar os demais',
  LeaderboardSystem.holdDays([{ sinceMs: marcaHa(3) }, { sinceMs: null }, { sinceMs: marcaHa(20) }], hojeMeioDia),
  [3, null, 20]);
eq('marca: de hoje devolve 0',
  LeaderboardSystem.holdDays([{ sinceMs: hojeMeioDia }], hojeMeioDia), [0]);

// v1.8.1: o PÓDIO usa o modo cascata (posse da POSIÇÃO — ultrapassagem
// reinicia quem caiu), enquanto a lista segue por marca (asserts acima)
eq('cascata: marca mais nova ACIMA reinicia quem está abaixo',
  LeaderboardSystem.holdDays([{ sinceMs: marcaHa(2) }, { sinceMs: marcaHa(30) }], hojeMeioDia, { cascade: true }),
  [2, 2]);
eq('cascata: marca mais nova ABAIXO não afeta quem está acima',
  LeaderboardSystem.holdDays([{ sinceMs: marcaHa(10) }, { sinceMs: marcaHa(5) }], hojeMeioDia, { cascade: true }),
  [10, 5]);
eq('cascata: sem timestamp → null, sem contaminar os de baixo',
  LeaderboardSystem.holdDays([{ sinceMs: marcaHa(3) }, { sinceMs: null }, { sinceMs: marcaHa(20) }], hojeMeioDia, { cascade: true }),
  [3, null, 3]);
// Rules: o campo skin (vitrine do pódio) entrou na whitelist de scores
eq('rules de scores aceitam o skin', rules.includes("'skin'"), true);
eq('rules validam skin como string curta',
  /skin is string\s*&&[\s\S]{0,80}skin\.size\(\) >= 1/.test(rules), true);

// ---------- 3c. Pontuação composta: whitelist e coerência (v1.8.4) ----------
// A whitelist de `scores` nunca teve assert nenhum — foi ESSE furo que deixou
// invisível o risco de o cliente gravar um campo fora dela e o write ser
// negado EM SILÊNCIO. Agora ela é conferida INTEIRA (os 7 campos, em qualquer
// ordem), e não mais campo a campo.
const scoresHasOnly = (rules.match(/scores\/\{playerId\}[\s\S]*?hasOnly\(\[([^\]]*)\]\)/) || [])[1] || '';
eq('whitelist COMPLETA de scores (7 campos)',
  scoresHasOnly.split(',').map((f) => f.trim().replace(/'/g, '')).filter(Boolean).sort(),
  ['name', 'nameLower', 'score', 'scoreAt', 'scoreM', 'skin', 'updatedAt']);
// v1.8.4: score virou o TOTAL (metros + bônus) e scoreM guarda os metros
eq('rules de scores aceitam o scoreM', rules.includes("'scoreM'"), true);
eq('rules abrem o teto do TOTAL em 20000', /score <= 20000/.test(rules), true);
eq('teto das rules bate com Constants.SCORE_MAX_TOTAL', Constants.SCORE_MAX_TOTAL, 20000);
// Cliente velho (1.3-1.5, ainda em cache) grava só o score: segue no teto de metros
eq('rules mantêm o teto de 10000 para quem não manda scoreM',
  /\('scoreM' in request\.resource\.data\)\s*\|\|\s*request\.resource\.data\.score <= 10000/.test(rules), true);
eq('rules exigem bônus >= 0 (score >= scoreM)',
  /score >= request\.resource\.data\.scoreM/.test(rules), true);
eq('rules exigem bônus <= 100% dos metros (score <= scoreM * 2)',
  /score <= request\.resource\.data\.scoreM \* 2/.test(rules), true);

// ---------- 4. Agregação da página ----------
const docs = [
  { // doc LEGADO achatado (v1.3.0): sem deathTower, sem device/país
    attempts: 5, wins: 1, playTimeS: 120, bestM: 400,
    deathsT1: 2, deathsT2: 0, deathsT3: 0, deathsT4: 0,
    deathWall: 1, deathSpike: 0, deathAnimal: 0, deathDart: 0, deathFall: 1,
  },
  { // doc NOVO aninhado (v1.4+): corredor do modo infinito (1150m)
    attempts: 3, wins: 1, playTimeS: 90, bestM: 1150, standalone: true,
    gameVersion: '1.4.0',
    deaths: { t1: 0, t2: 2, t3: 1, t4: 0, t5: 1, t6: 0, wall: 0, spike: 0, animal: 1, dart: 1, tower: 1, fall: 0 },
    client: { device: 'desktop', os: 'Windows', osVersion: '11', browser: 'Chrome' },
    geo: { country: 'BR', region: 'Rio de Janeiro', city: 'Rio de Janeiro' },
  },
  { // doc malformado: valores errados não podem contaminar as somas
    attempts: 'abc', wins: null, playTimeS: NaN, bestM: 'x',
    deaths: 'lixo', deathsT1: '5', deathWall: {}, client: 42, geo: null,
  },
];
const agg = aggregate(docs);
eq('jogadores', agg.players, 3);
eq('execuções somadas', agg.attempts, 8);
eq('fugas somadas', agg.wins, 2);
eq('tempo total somado', agg.playTimeS, 210);
eq('mortes por etapa [t1..t6]', agg.deathsTier, [2, 2, 1, 0, 1, 0]);
eq('mortes por causa (objeto)', agg.causes,
  { wall: 1, spike: 0, animal: 1, dart: 1, tower: 1, boss: 0, boss2: 0, boss3: 0, cerco: 0, farao: 0, fall: 1 });
// Funil dinâmico: degraus de 200m. v1.8.10 (Areias do Tempo): o teto mínimo
// subiu para 4800 (fim do deserto) — os marcos existem antes de alguém chegar.
eq('funil: nº de degraus (200..4800 — teto mínimo do deserto)', agg.funnelSteps.length, 24);
eq('funil: contagens por degrau', agg.funnelSteps.map(([, v]) => v),
  [2, 2, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
eq('funil: degrau do portão destacado', agg.funnelSteps[4][0].includes('1000m 🗽'), true);
eq('funil: marcos da cidade rotulados (viaduto/checkpoint/Muralha/rodovia)',
  [agg.funnelSteps[6][0].includes('1400m 🚦'), agg.funnelSteps[8][0].includes('1800m 🚨'),
    agg.funnelSteps[9][0].includes('2000m 🧱'), agg.funnelSteps[10][0].includes('2200m 🛣')],
  [true, true, true, true]);
eq('funil: marcos do deserto rotulados (oásis/escavação/Barreira/necrópole/Faraó/fim)',
  [agg.funnelSteps[13][0].includes('2800m 🌴'), agg.funnelSteps[15][0].includes('3200m ⛏️'),
    agg.funnelSteps[17][0].includes('3600m 🕸'), agg.funnelSteps[20][0].includes('4200m ⚰️'),
    agg.funnelSteps[22][0].includes('4600m 🏺'), agg.funnelSteps[23][0].includes('4800m 🏜')],
  [true, true, true, true, true, true]);
eq('funil: escaparam (cruzaram o portão)', agg.escaped, 2);
eq('PWA instalado', agg.standalone, 1);
eq('cidade formatada com região', agg.city.get('Rio de Janeiro (Rio de Janeiro)'), 1);
eq('país ausente vira ??', agg.country.get('??'), 2);
eq('versão ausente rotulada pré-1.3.0', agg.version.get('pré-1.3.0'), 2);

// ---------- 5. Novidades da agregação (v1.6.1) ----------
const aggTz = aggregate([
  { attempts: 1, client: { device: 'mobile', tz: 'America/Sao_Paulo' }, geo: { country: 'BR', city: 'Americana', at: 1 } },
  { attempts: 1, client: { device: 'mobile', tz: 'America/Sao_Paulo' } },
  { attempts: 1, client: { device: 'desktop' } },
]);
eq('fuso horário agregado', aggTz.tz.get('America/Sao_Paulo'), 2);
eq('fuso ausente não vira chave', aggTz.tz.size, 1);

// Rótulos de causa: fonte única em Constants, e as CHAVES têm de bater com
// o que o StorageManager grava (o painel e o resumo do jogador leem daqui)
const rotulos = Object.keys(Constants.CAUSE_LABELS).filter((k) => k !== 'win').sort();
eq('rótulos de causa cobrem exatamente as causas do storage', rotulos, causas);
// v1.8.5: os bosses novos têm rótulo próprio (o assert genérico acima já
// exige a paridade de CHAVES; este fixa que o texto existe e não é vazio)
eq('rótulos: boss2 e boss3 têm rótulo em CAUSE_LABELS',
  [Boolean(Constants.CAUSE_LABELS.boss2), Boolean(Constants.CAUSE_LABELS.boss3)], [true, true]);

// ---------- 6. Resumo diário (tools/daily-digest.mjs) ----------
const { buildDigest } = await import('../tools/daily-digest.mjs');
const agora = Date.parse('2026-08-08T15:00:00-03:00');
const ontem = Math.floor((agora - 86400000) / 1000);
const digest = buildDigest(
  [
    { id: 'a', attempts: 12, wins: 1, bestM: 940, history: { days: { '2026-08-08': { r: 5, b: 940 } } } },
    { id: 'b', attempts: 3, wins: 0, bestM: 300, runs: [{ t: Math.floor(agora / 1000), m: 300 }] },
    { id: 'c', attempts: 9, wins: 0, bestM: 1800, runs: [{ t: ontem, m: 1800 }] }, // só ontem
  ],
  [{ id: 'a', name: 'Ana', score: 940 }],
  agora
);
eq('digest: título com a data', digest.title.includes('08/08'), true);
eq('digest: conta só quem jogou HOJE', /👥 2 jogador/.test(digest.message), true);
eq('digest: soma as execuções do dia', /🎮 6 execuç/.test(digest.message), true);
eq('digest: melhor do dia com apelido', /🥇 melhor do dia: 940m \(Ana\)/.test(digest.message), true);
eq('digest: separa ranking de marca fora do ranking',
  /recorde do ranking: 940m/.test(digest.message) && /1800m \(fora do ranking/.test(digest.message), true);
eq('digest: avisa quando ainda estima por runs\\[\\]', /pré-1\.6\.1/.test(digest.message), true);

const vazio = buildDigest([{ id: 'a', attempts: 1, bestM: 10, history: { days: {} } }], [], agora);
eq('digest: dia sem jogadores tem mensagem própria', /Ninguém jogou hoje/.test(vazio.message), true);

// ---------- 7. Arena de Desafios (v1.8.6): rules ----------
// O placar dos desafios é DERIVADO da leitura pública de stats/{id} — este
// assert trava o esquecimento de publicar as rules novas na release (a suíte
// dedicada é tools/test-challenge.mjs; aqui só o vínculo com as rules)
eq('rules têm o bloco challenges com leitura pública',
  /match \/challenges\/\{challengeId\}[\s\S]*?allow read: if true/.test(rules), true);


// ---------- v1.9.2: a letra `i`, o relógio do LOOP ----------
// Existe para responder UMA pergunta: quando o tempo gravado sai muito menor
// que o real (o bug de agosto/26 — 10.000 m em 47 s), foi o jogo que rodou
// acelerado ou o cronômetro que mentiu? `s` é relógio de parede, `i` é a
// soma dos deltas do loop. Os dois lado a lado entregam o veredito.
{
  localStorage.removeItem('furious_rhino_runs');
  StorageManager.addRun(900, 120, 'wall', { loopS: 118 });
  const r = StorageManager.getRuns().pop();
  eq('corrida saudável: o relógio do loop acompanha o de parede',
    [r.s, r.i], [120, 118]);

  StorageManager.addRun(900, 47, 'win', { loopS: 940 });
  const bug = StorageManager.getRuns().pop();
  eq('assinatura do BUG: loop muito maior que a parede fica registrada',
    [bug.s, bug.i], [47, 940]);

  // zero é omitido como todo contador (byte-budget da janela)
  localStorage.removeItem('furious_rhino_runs');
  StorageManager.addRun(100, 10, 'wall', { loopS: 0 });
  eq('loopS 0 é OMITIDO (mesma regra dos outros contadores)',
    'i' in StorageManager.getRuns().pop(), false);

  // o teto de 9999 é o motivo de gravar SEGUNDOS e não frames: 15min a 60fps
  // seriam ~54.000 frames e saturariam, destruindo justamente o sinal
  localStorage.removeItem('furious_rhino_runs');
  StorageManager.addRun(100, 10, 'wall', { loopS: 999999 });
  eq('loopS respeita o teto de 9999 dos contadores',
    StorageManager.getRuns().pop().i, 9999);
  eq('...e o teto de uma corrida (7200s) cabe com folga', 7200 < 9999, true);

  // a letra nova não pode inventar chave em corrida sem extras
  localStorage.removeItem('furious_rhino_runs');
  StorageManager.addRun(50, 5, 'spike');
  eq('corrida sem extras segue sem a letra nova',
    Object.keys(StorageManager.getRuns().pop()).sort().join(','), 'c,m,s,t');
  localStorage.removeItem('furious_rhino_runs');
}


// ---------- v1.9.5: os 5 chefes deixam de ser 1 chefe medido + 4 cegos ----------
// A auditoria de 24/08 achou 7 chegadas na Barreira, 6 no Farao e 4 no
// Cacador-Mor — TODAS cegas: sem cronometro, nao havia como distinguir
// "lutou 40s e perdeu" de "passou direto". O dado ja era calculado (o
// fightMs roda nos 5 chefes) e morria com a cena.
{
  localStorage.removeItem('furious_rhino_runs');
  StorageManager.addRun(4000, 300, 'farao', {
    cercoFightS: 18, faraoFightS: 42, boss3FightS: 0,
    boss2Bounces: 5, cercoBounces: 3, faraoBounces: 9, boss3Bounces: 0,
    cercoLayersBroken: 4, faraoLayersBroken: 2,
  });
  const r = StorageManager.getRuns().pop();
  eq('cronometro da Barreira e do Farao chegam ao runs[]', [r.zu, r.zy], [18, 42]);
  eq('quiques dos chefes novos chegam ao runs[]', [r.qe, r.qu, r.qy], [5, 3, 9]);
  eq('zero segue OMITIDO tambem nas chaves novas (byte-budget)',
    ['zl' in r, 'ql' in r], [false, false]);
  eq('as camadas seguem no lugar (contrato do runBonus intacto)', [r.u, r.y], [4, 2]);

  // O teto de 9999 vale para elas como para todas
  localStorage.removeItem('furious_rhino_runs');
  StorageManager.addRun(100, 10, 'wall', { faraoFightS: 999999, faraoBounces: 999999 });
  const t = StorageManager.getRuns().pop();
  eq('as chaves novas respeitam o teto de 9999', [t.zy, t.qy], [9999, 9999]);

  // A garantia que protege o byte-budget da janela inteira
  localStorage.removeItem('furious_rhino_runs');
  StorageManager.addRun(50, 5, 'spike');
  eq('corrida sem extras continua com so c,m,s,t (7 chaves novas nao incham)',
    Object.keys(StorageManager.getRuns().pop()).sort().join(','), 'c,m,s,t');
  localStorage.removeItem('furious_rhino_runs');
}

// ---------- v1.9.5: a corrida que TRAVA passa a ser registrada ----------
// Ate a v1.9.4 o crashToHome nao chamava addRun: "nao pontuar" e "nao
// registrar" viraram a mesma coisa por acidente, e a corrida ANOMALA — a que
// a investigacao precisa ver — apagava a propria evidencia.
{
  localStorage.removeItem('furious_rhino_runs');
  StorageManager.addRun(640, 47, 'crash', { loopS: 46, version: '1.9.5' });
  const c = StorageManager.getRuns().pop();
  eq('a corrida travada entra no runs[] com causa `crash`', c.c, 'crash');
  eq('...levando os dois relogios (e o par que denuncia o bug)', [c.s, c.i], [47, 46]);
  eq('...e a versao, para saber em qual build travou', c.v, '1.9.5');
  localStorage.removeItem('furious_rhino_runs');
}
// ---------- v1.9.12: a aba Chefes (lacunas L2 + L4) ----------
// Corridas VERBATIM de produção (regra da casa desde o fix-ranking: fixture
// de gente real se copia, não se imagina — já erramos duas vezes inventando).
{
  // A primeira vitória legítima do Portão na era pós-cascata: Caio Lindão,
  // 28/08 — 10s de luta, 2 quiques, morreu num dardo aos 1228m.
  const caioPortao = { t: 1787785138, m: 1228, s: 135, c: 'dart', w: 6, r: 3,
    a: 5, j: 102, d: 24, x: 2, f: 1, b: 3, q: 2, z: 10, i: 135, v: '1.9.5' };
  // O calça larga morrendo NA Muralha com 2 camadas e 1 quique (25/08).
  const muralhaMorte = { m: 1990, s: 194, c: 'boss2', w: 18, r: 7, o: 15,
    a: 20, j: 9552, d: 59, x: 265, f: 2, z: 3, e: 2, h: 6, i: 194, qe: 1,
    k: 1, v: '1.9.5', g: 'rinorob', t: 1787695000 };
  // O congelamento do Palito (D4): loop 6s, parede 9s — a sonda i em campo.
  const paletoFreeze = { t: 1787681800, m: 57, s: 9, i: 6, c: 'animal', j: 10, v: '1.9.5' };
  // Corrida antiga sem letra nova nenhuma: o decodificador zera, não quebra.
  const velha = { t: 100, m: 500, s: 60, c: 'wall' };
  // Morrer NO CHEFE aquém da âncora: calça larga aos 990m com 2 camadas
  // (verbatim). Com a âncora exata, é o ramo camada/cronômetro/causa que o
  // classifica — a corrida que prova que os ORs não são decorativos.
  const boss990 = { m: 990, s: 98, c: 'boss', w: 1, r: 4, o: 2, a: 3, j: 15,
    d: 48, x: 451, b: 2, z: 6, i: 91, k: 1, v: '1.9.5', g: 'rinorob', t: 1787695100 };
  // SINTÉTICA rotulada (caso-limite): fúria negada em arena. O n real existe
  // na base (2 registros), mas em corridas longas demais para fixture.
  const furiaNegadaRun = { t: 1787695200, m: 1005, s: 110, c: 'boss', z: 4, n: 2, v: '1.9.5' };

  const docs = [{ id: 'x1', attempts: 6, runs: [caioPortao, muralhaMorte, paletoFreeze, velha, boss990, furiaNegadaRun] }];
  const rs = allRuns(docs, 0); // sinceS=0: sem filtro de período

  eq('allRuns decodifica as letras que faltavam (e/h/i/qe)',
    [rs[1].e, rs[1].h, rs[1].i, rs[1].qe], [2, 6, 194, 1]);
  eq('allRuns decodifica versão e skin como texto',
    [rs[1].v, rs[1].g], ['1.9.5', 'rinorob']);
  eq('corrida antiga: letra ausente vira 0, não undefined',
    [rs[3].e, rs[3].zu, rs[3].ql, rs[3].i], [0, 0, 0, 0]);

  const agg = aggregateBosses(rs);
  eq('a aba tem os cinco chefes, na ordem da estrada',
    agg.chefes.map((c) => c.nome), ['Portão', 'Muralha', 'Barreira', 'Faraó', 'Caçador-Mor']);
  const portao = agg.chefes[0];
  eq('Portão: os 990m do calça larga chegam pelo ramo da LUTA (âncora exata)',
    portao.chegaram, 4);
  eq('Portão: a vitória do Caio conta (b=3); mediana só de quem lutou',
    [portao.venceram, portao.lutaram, portao.medianaLutaS], [1, 4, 5]);
  const muralha = agg.chefes[1];
  eq('Muralha: morrer NA arena é chegada (c=boss2), não invisibilidade',
    [muralha.chegaram, muralha.venceram, muralha.quiques, muralha.mortes], [1, 0, 1, 1]);
  eq('Barreira/Faraó/Caçador-Mor: ninguém chegou — zeros honestos',
    agg.chefes.slice(2).map((c) => c.chegaram), [0, 0, 0]);
  eq('a fúria ganha leitor (lacuna L4): usada em 2, NEGADA em 2 (n somado)',
    [agg.furiaUsada, agg.furiaNegada], [2, 2]);
  eq('o contrato do vazio: cinco chefes zerados, fúria zerada',
    (() => { const z = aggregateBosses([]); return [
      z.chefes.map((c) => c.chegaram + c.lutaram + c.venceram + c.medianaLutaS),
      z.furiaUsada, z.furiaNegada]; })(), [[0, 0, 0, 0, 0], 0, 0]);
}


console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
