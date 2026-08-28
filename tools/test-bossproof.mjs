// Testes da PROVA DO CHEFE — sem rede, sem navegador.
//
// É a regra que decide se uma marca sobe ao ranking mundial, se vence um
// desafio e se sobrevive à faxina. Um erro aqui barra jogador honesto, então
// as corridas abaixo são de PRODUÇÃO, copiadas verbatim.
import { passouSemLutar, chefesDaCorrida, chefesDaCena, ehCascata, vCmp, CHEFES } from '../js/systems/BossProof.js';

let pass = 0;
let fail = 0;
function eq(nome, obtido, esperado) {
  const a = JSON.stringify(obtido);
  const b = JSON.stringify(esperado);
  if (a === b) { pass++; console.log(`PASS  ${nome}`); }
  else { fail++; console.log(`FAIL  ${nome}\n      esperado ${b}\n      obtido   ${a}`); }
}

// ---------- as âncoras saem de Constants, não de literais ----------
eq('os cinco chefes, nas âncoras certas e com as camadas certas',
  CHEFES.map((c) => [c.m, c.exigidas]),
  [[1000, 3], [2000, 4], [3650, 4], [4700, 5], [9995, 5]]);

// ---------- vCmp: 1.8.10 é MAIOR que 1.8.9 (string erraria) ----------
eq('compara versão campo a campo',
  [vCmp('1.8.10', '1.8.9') > 0, vCmp('1.9.4', '1.9.4'), vCmp('1.7.0', '1.7.1') < 0],
  [true, 0, true]);

// ---------- corridas REAIS de produção ----------
// O caso que motivou a v1.9.6: o `calça larga` (cadaec9e) em 25-26/08, todas
// em v1.9.5 — a versão em que a cascata JÁ estava corrigida. As três que
// passaram do portão têm ZERO camadas e `z` de 1 a 3 segundos. No código de
// hoje só há dois caminhos para cruzar: derrotar o chefe (gravaria b=3) ou o
// `standDown()` via `isBypassed`, que exige `registry.get('debug')` — e essa
// flag vem de um lugar só, o `?debug=1` da URL (js/game.js:189).
const cl1996 = { m: 1996, s: 175, c: 'boss2', w: 15, r: 5, o: 6, a: 8, j: 9999, d: 36,
  x: 6439, f: 1, z: 1, e: 1, h: 8, i: 174, qe: 3, k: 1, v: '1.9.5', g: 'rinorob' };
const cl1990 = { m: 1990, s: 194, c: 'boss2', w: 18, r: 7, o: 15, a: 20, j: 9552, d: 59,
  x: 265, f: 2, z: 3, e: 2, h: 6, i: 194, qe: 1, k: 1, v: '1.9.5', g: 'rinorob' };
const cl1952 = { m: 1952, s: 189, c: 'spike', w: 9, r: 3, o: 13, a: 18, j: 69, d: 55,
  x: 14, f: 1, z: 2, i: 189, k: 1, v: '1.9.5', g: 'rinorob' };
// ...e a MESMA pessoa jogando limpo: morreu no portão aos 990 m com 2 camadas
// derrubadas. É a prova de que a v1.9.4 funciona — e o teste que garante que a
// guarda não vai punir quem lutou e perdeu.
const cl990 = { m: 990, s: 98, c: 'boss', w: 1, r: 4, o: 2, a: 3, j: 9999, d: 39,
  x: 7318, b: 2, q: 1, z: 6, i: 98, k: 1, v: '1.9.5', g: 'rinorob' };

eq('as três que passaram do portão sem camada são reprovadas',
  [ehCascata(cl1996), ehCascata(cl1990), ehCascata(cl1952)], [true, true, true]);
eq('lutar e MORRER no portão passa — o preço é a morte, não a suspeita',
  ehCascata(cl990), false);

// As vitórias da cascata (kukur e nikolinhasss, agosto/26): mundo inteiro
// atravessado, zero das 21 camadas.
const kukur10000 = { t: 1787520660, m: 10000, s: 429, c: 'win', v: '1.9.0', w: 6, r: 10,
  o: 3, a: 7, j: 3, d: 5, x: 20, f: 3, z: 1, h: 1, g: 'catisqui' };
const niko10000 = { h: 2, m: 10000, o: 92, c: 'win', k: 1, v: '1.9.0', a: 94,
  g: 'mecacolo', d: 4, w: 80, r: 83, z: 2, t: 1787521581, s: 898 };
eq('as vitórias da cascata continuam reprovadas',
  [ehCascata(kukur10000), ehCascata(niko10000)], [true, true]);

// ---------- o `desde`: não acusar por dado que não existia ----------
// Duas corridas de v1.7.0 na base passaram dos 1.050 m sem `b`. A letra ainda
// não era gravada — silêncio não é prova.
eq('v1.7.0 sem `b` é ABSOLVIDA (a letra ainda não existia)',
  [ehCascata({ m: 1681, s: 328, c: 'wall', v: '1.7.0' }),
    ehCascata({ m: 1085, s: 99, c: 'wall', v: '1.7.0' })], [false, false]);
eq('mas da v1.7.1 em diante o portão é cobrado',
  ehCascata({ m: 1106, s: 139, c: 'wall', v: '1.7.2' }), true);
eq('quem derrubou o portão na v1.7.2 passa',
  ehCascata({ m: 1894, s: 200, c: 'wall', v: '1.7.2', b: 3 }), false);
eq('a Muralha só é cobrada da v1.8.5 em diante',
  [ehCascata({ m: 3000, s: 400, c: 'wall', v: '1.8.3', b: 3 }),
    ehCascata({ m: 3000, s: 400, c: 'wall', v: '1.8.5', b: 3 })], [false, true]);
eq('Barreira e Faraó só da v1.8.10 em diante',
  [ehCascata({ m: 4800, s: 600, c: 'wall', v: '1.8.9', b: 3, e: 4 }),
    ehCascata({ m: 4800, s: 600, c: 'wall', v: '1.8.10', b: 3, e: 4 })], [false, true]);
eq('SEM versão nunca acusa — ausência de dado não é prova',
  [ehCascata({ m: 10000, s: 500, c: 'win' }), chefesDaCorrida({ m: 10000 })], [false, []]);
eq('lixo não quebra o julgamento',
  [ehCascata(null), ehCascata({}), ehCascata({ m: 0, v: '1.9.5' }), ehCascata('nada')],
  [false, false, false, false]);

// ---------- a régua não acusa quem chegou perto ----------
eq('morrer NA âncora do portão não é acusação (a margem existe para isso)',
  [ehCascata({ m: 1000, s: 120, c: 'boss', v: '1.9.5' }),
    ehCascata({ m: 1049, s: 120, c: 'boss', v: '1.9.5' })], [false, false]);
eq('um metro depois da margem, é',
  ehCascata({ m: 1050, s: 120, c: 'wall', v: '1.9.5' }), true);
eq('o Caçador-Mor mora em 9.995 m: passar por ele é CHEGAR aos 10.000',
  [ehCascata({ m: 9994, s: 900, c: 'boss3', v: '1.9.5', b: 3, e: 4, u: 4, y: 5 }),
    ehCascata({ m: 10000, s: 900, c: 'win', v: '1.9.5', b: 3, e: 4, u: 4, y: 5 })],
  [false, true]);
eq('a LENDA legítima — os cinco derrubados — passa',
  ehCascata({ m: 10000, s: 900, c: 'win', v: '1.9.5', b: 3, e: 4, u: 4, y: 5, l: 5 }), false);
eq('derrubar quatro e passar pelo quinto ainda reprova',
  ehCascata({ m: 10000, s: 900, c: 'win', v: '1.9.5', b: 3, e: 4, u: 4, y: 5, l: 4 }), true);

// ---------- passouSemLutar puro: a regra não conhece chefe nem versão ----------
eq('lista vazia nunca acusa', passouSemLutar(10000, []), false);
eq('lista inválida nunca acusa',
  [passouSemLutar(10000, null), passouSemLutar(10000, 'nada')], [false, false]);
eq('sem metros não há o que julgar',
  [passouSemLutar(0, CHEFES), passouSemLutar(-5, CHEFES), passouSemLutar(NaN, CHEFES)],
  [false, false, false]);
eq('chefe sem camadas exigidas é ignorado',
  passouSemLutar(5000, [{ m: 1000, exigidas: 0, quebradas: 0 }]), false);
eq('chefe sem âncora é ignorado',
  passouSemLutar(5000, [{ exigidas: 3, quebradas: 0 }]), false);

// ---------- chefesDaCena: a lista sai do elenco REAL ----------
// É o que impede a guarda de envelhecer. Precedente real: o Cerco ficou
// DECLARADO SEM LUTA da v1.8.5 à v1.8.9 — um chefe fora do elenco não pode
// barrar ninguém.
{
  const cena = { runBossLayers: 3, runBoss2Layers: 1 };
  const fights = [
    { def: { id: 'gate', anchorX: 40000, layers: ['a', 'b', 'c'], layersProp: 'runBossLayers' } },
    { def: { id: 'muralha', anchorX: 80000, layers: ['a', 'b', 'c', 'd'], layersProp: 'runBoss2Layers' } },
  ];
  const chefes = chefesDaCena(fights, cena);
  eq('monta âncora em metros, camadas exigidas e as quebradas da cena',
    chefes.map((c) => [c.nome, c.m, c.exigidas, c.quebradas]),
    [['gate', 1000, 3, 3], ['muralha', 2000, 4, 1]]);
  eq('portão derrubado + morreu na Muralha: aprovado',
    passouSemLutar(1996, chefes), false);
  eq('mas passar da Muralha com 1 de 4 camadas: reprovado',
    passouSemLutar(2050, chefes), true);
  eq('um chefe FORA do elenco não cobra ninguém (o caso do Cerco 1.8.5-1.8.9)',
    passouSemLutar(9000, chefesDaCena([fights[0]], cena)), false);
}
eq('SEM contador (`layersProp`), sem acusação',
  chefesDaCena([{ def: { id: 'x', anchorX: 40000, layers: ['a'] } }], {}), []);
eq('def incompleta ou lixo não entra na régua',
  [chefesDaCena([null, {}, { def: null }], {}), chefesDaCena(null, {}), chefesDaCena([], null)],
  [[], [], []]);
eq('contador ausente na cena conta como zero — e aí reprova',
  passouSemLutar(2000, chefesDaCena(
    [{ def: { id: 'gate', anchorX: 40000, layers: ['a', 'b', 'c'], layersProp: 'runBossLayers' } }], {})), true);

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exitCode = fail ? 1 : 0;
