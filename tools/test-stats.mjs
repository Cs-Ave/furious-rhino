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
const { aggregate } = await import('../js/stats/StatsDashboard.js');

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
eq('tier aos 800m — modo infinito (x=32000)', Constants.getTierIndex(32000), 4);
eq('tier aos 999m (x=39999)', Constants.getTierIndex(39999), 4);
eq('tier aos 1000m — teto (x=40000)', Constants.getTierIndex(40000), 5);
eq('tier muito além (clamp no teto)', Constants.getTierIndex(999999), 5);

// ---------- 2. Contagem local de mortes ----------
localStorage.removeItem(StorageManager.DEATHS_KEY);
StorageManager.addDeath(0, 'wall');
StorageManager.addDeath(1, 'tower');
StorageManager.addDeath(1, 'dart');
StorageManager.addDeath(3, 'dart');
StorageManager.addDeath(2, 'fall');
StorageManager.addDeath(4, 'spike'); // modo infinito: 800-1000m
StorageManager.addDeath(5, 'animal'); // teto: 1000m+
const d = StorageManager.getDeaths();
eq('mortes por tier t1..t6', [d.t1, d.t2, d.t3, d.t4, d.t5, d.t6], [1, 2, 1, 1, 1, 1]);
eq('mortes por causa', [d.wall, d.spike, d.animal, d.dart, d.tower, d.fall], [1, 1, 1, 2, 1, 1]);

StorageManager.addDeath(0, 'causa-desconhecida'); // não explode nem cria chave
const d2 = StorageManager.getDeaths();
eq('causa desconhecida: tier conta, chave nova NÃO nasce', [d2.t1, 'causa-desconhecida' in d2], [2, false]);

localStorage.setItem(StorageManager.DEATHS_KEY, '{lixo');
eq('JSON corrompido volta zerado', StorageManager.getDeaths().t1, 0);

// ---------- 3. Consistência entre camadas ----------
const causas = Object.keys(StorageManager.getDeaths()).filter((k) => !/^t\d$/.test(k)).sort();
eq('mesmas causas no storage e na página', causas, Object.keys(aggregate([]).causes).sort());

const rules = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'firestore.rules'), 'utf8'
);
// Esquema aninhado: as rules validam o MAPA deaths (não cada causa) com um
// teto de chaves — o storage precisa caber nesse teto
eq('rules aceitam o mapa deaths', rules.includes("'deaths'"), true);
eq('mapa de mortes cabe no teto das rules (size <= 14)',
  Object.keys(StorageManager.getDeaths()).length <= 14, true);

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
  { wall: 1, spike: 0, animal: 1, dart: 1, tower: 1, fall: 1 });
// Funil dinâmico: degraus de 200m até o máximo percorrido (1150 → 1200)
eq('funil: nº de degraus (200..1200)', agg.funnelSteps.length, 6);
eq('funil: contagens por degrau', agg.funnelSteps.map(([, v]) => v), [2, 2, 1, 1, 1, 0]);
eq('funil: degrau dos 800m destacado', agg.funnelSteps[3][0].includes('800m'), true);
eq('funil: escaparam (cruzaram o portão)', agg.escaped, 2);
eq('PWA instalado', agg.standalone, 1);
eq('cidade formatada com região', agg.city.get('Rio de Janeiro (Rio de Janeiro)'), 1);
eq('país ausente vira ??', agg.country.get('??'), 2);
eq('versão ausente rotulada pré-1.3.0', agg.version.get('pré-1.3.0'), 2);

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
