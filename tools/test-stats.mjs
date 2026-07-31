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
eq('tier além do fim (clamp)', Constants.getTierIndex(99999), 3);

// ---------- 2. Contagem local de mortes ----------
localStorage.removeItem(StorageManager.DEATHS_KEY);
StorageManager.addDeath(0, 'wall');
StorageManager.addDeath(1, 'tower');
StorageManager.addDeath(1, 'dart');
StorageManager.addDeath(3, 'dart');
StorageManager.addDeath(2, 'fall');
const d = StorageManager.getDeaths();
eq('mortes por tier t1..t4', [d.t1, d.t2, d.t3, d.t4], [1, 2, 1, 1]);
eq('mortes por causa', [d.wall, d.spike, d.animal, d.dart, d.tower, d.fall], [1, 0, 0, 2, 1, 1]);

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
const nomeCampo = {
  wall: 'deathWall', spike: 'deathSpike', animal: 'deathAnimal',
  dart: 'deathDart', tower: 'deathTower', fall: 'deathFall',
};
eq('todas as causas existem nas firestore.rules',
  causas.filter((c) => rules.includes(nomeCampo[c])).sort(), causas);

// ---------- 4. Agregação da página ----------
const docs = [
  { // doc antigo (pré-1.3.1): sem deathTower, sem device/país
    attempts: 5, wins: 1, playTimeS: 120, bestM: 400,
    deathsT1: 2, deathsT2: 0, deathsT3: 0, deathsT4: 0,
    deathWall: 1, deathSpike: 0, deathAnimal: 0, deathDart: 0, deathFall: 1,
  },
  { // doc novo com torre, geo e device
    attempts: 3, wins: 0, playTimeS: 90, bestM: 337, standalone: true,
    deathsT1: 0, deathsT2: 2, deathsT3: 1, deathsT4: 0,
    deathWall: 0, deathSpike: 0, deathAnimal: 1, deathDart: 1, deathTower: 1, deathFall: 0,
    device: 'desktop', os: 'Windows', osVersion: '11', browser: 'Chrome',
    country: 'BR', region: 'Rio de Janeiro', city: 'Rio de Janeiro', gameVersion: '1.3.1',
  },
  { // doc malformado: valores errados não podem contaminar as somas
    attempts: 'abc', wins: null, playTimeS: NaN, bestM: 'x',
    deathsT1: '5', deathWall: {}, deathTower: '9',
  },
];
const agg = aggregate(docs);
eq('jogadores', agg.players, 3);
eq('execuções somadas', agg.attempts, 8);
eq('fugas somadas', agg.wins, 1);
eq('tempo total somado', agg.playTimeS, 210);
eq('mortes por etapa [t1,t2,t3,t4]', agg.deathsTier, [2, 2, 1, 0]);
eq('mortes por causa (objeto)', agg.causes,
  { wall: 1, spike: 0, animal: 1, dart: 1, tower: 1, fall: 1 });
eq('funil 200m', agg.funnel.m200, 2);
eq('funil 400m', agg.funnel.m400, 1);
eq('funil 600m', agg.funnel.m600, 0);
eq('funil escapou', agg.funnel.escaped, 1);
eq('PWA instalado', agg.standalone, 1);
eq('cidade formatada com região', agg.city.get('Rio de Janeiro (Rio de Janeiro)'), 1);
eq('país ausente vira ??', agg.country.get('??'), 2);
eq('versão ausente rotulada pré-1.3.0', agg.version.get('pré-1.3.0'), 2);

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
