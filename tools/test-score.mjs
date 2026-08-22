// Grupo de testes da PONTUAÇÃO COMPOSTA (v1.8.4 — `score` do ranking deixa de
// ser metros e vira metros + bônus por façanha; `scoreM` guarda os metros).
//   npm run test-score
//
// Node puro, sem navegador: o ScoreSystem é um módulo sem Phaser e sem DOM
// exatamente para caber aqui. O assert mais importante da suíte é o da
// seção 7 — runBonus(run) TEM de bater com a soma feita ao vivo na corrida;
// é essa igualdade que dispensa gravar o bônus dentro de runs[].
globalThis.localStorage = {
  _m: new Map(),
  getItem(k) { return this._m.has(k) ? this._m.get(k) : null; },
  setItem(k, v) { this._m.set(k, String(v)); },
  removeItem(k) { this._m.delete(k); },
};

const { Constants } = await import('../js/utils/Constants.js');
const { ScoreSystem } = await import('../js/systems/ScoreSystem.js');

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

const W = Constants.SCORE_WEIGHTS;

// ---------- 1. pointsFor: a tabela de pesos ----------
eq('peso da parede', ScoreSystem.pointsFor('wall'), 5);
eq('peso do morro', ScoreSystem.pointsFor('ramp'), 5);
eq('peso da torre', ScoreSystem.pointsFor('tower'), 15);
eq('peso do animal', ScoreSystem.pointsFor('animal'), 3);
eq('peso da camada do portão', ScoreSystem.pointsFor('bossLayer'), 25);
eq('pointsFor lê a tabela mutável (não uma cópia)',
  [ScoreSystem.pointsFor('wall'), ScoreSystem.pointsFor('bossLayer')],
  [W.wall, W.bossLayer]);
eq('evento desconhecido vale 0', ScoreSystem.pointsFor('jump'), 0);
eq('evento ausente vale 0 (nada de NaN vazando para o total)',
  [ScoreSystem.pointsFor(), ScoreSystem.pointsFor(null), ScoreSystem.pointsFor('')], [0, 0, 0]);

// ---------- 2. endBonus: o que só o fim da corrida sabe ----------
eq('corrida sem façanha nenhuma: bônus zero', ScoreSystem.endBonus({}), 0);
eq('sem argumento não explode', ScoreSystem.endBonus(), 0);
eq('fuga paga o peso escape', ScoreSystem.endBonus({ escaped: true }), W.escape);
eq('morrer antes do portão não paga fuga',
  ScoreSystem.endBonus({ escaped: false, bossLayers: 2, bossFightS: 5 }), 0);

// ---------- 3. Blitz: a BORDA é a regra ----------
eq('blitz na borda EXATA (3 camadas em 20s) paga',
  ScoreSystem.endBonus({ escaped: true, bossLayers: 3, bossFightS: 20 }), W.escape + W.blitz);
eq('1 segundo além da borda (21s) NÃO paga',
  ScoreSystem.endBonus({ escaped: true, bossLayers: 3, bossFightS: 21 }), W.escape);
eq('2 camadas, por mais rápido que seja, NÃO é blitz',
  ScoreSystem.endBonus({ escaped: true, bossLayers: 2, bossFightS: 3 }), W.escape);
eq('cronômetro zerado (dado velho / luta que não houve) NÃO paga',
  ScoreSystem.endBonus({ escaped: true, bossLayers: 3, bossFightS: 0 }), W.escape);
eq('cronômetro ausente NÃO paga',
  ScoreSystem.endBonus({ escaped: true, bossLayers: 3 }), W.escape);
eq('blitz sozinho (sem fuga registrada) ainda paga',
  ScoreSystem.endBonus({ bossLayers: 3, bossFightS: 12 }), W.blitz);
eq('o teto do blitz vem de Constants', Constants.SCORE_BLITZ_MAX_S, 20);

// ---------- 4. LENDA ----------
eq('LENDA paga o peso legend', ScoreSystem.endBonus({ legend: true }), W.legend);
eq('as três façanhas somam',
  ScoreSystem.endBonus({ escaped: true, bossLayers: 3, bossFightS: 8, legend: true }),
  W.escape + W.blitz + W.legend);

// ---------- 5. total(): teto do bônus e clamp das rules ----------
eq('corrida normal: metros + bônus', ScoreSystem.total(1200, 277), 1477);
eq('teto do bônus agindo: 10m com 999 de bônus vira 20',
  ScoreSystem.total(10, 999), 20);
eq('bônus exatamente no teto passa inteiro', ScoreSystem.total(100, 100), 200);
eq('1 ponto além do teto é aparado', ScoreSystem.total(100, 101), 200);
eq('clamp em SCORE_MAX_TOTAL', ScoreSystem.total(19500, 900), Constants.SCORE_MAX_TOTAL);
eq('clamp nunca deixa passar do teto das rules',
  ScoreSystem.total(20000, 20000), 20000);
eq('metros fracionários são truncados', ScoreSystem.total(999.9, 10.9), 1009);
eq('zero metro: total zero, sem bônus', ScoreSystem.total(0, 500), 0);
eq('metros negativos devolvem os próprios metros', ScoreSystem.total(-5, 100), -5);
eq('bônus negativo/lixo não subtrai',
  [ScoreSystem.total(500, -50), ScoreSystem.total(500, NaN), ScoreSystem.total(500)],
  [500, 500, 500]);

// ---------- 6. metersOf: leitura universal das 3 formas ----------
eq('metersOf: scoreM manda (ranking v1.8.4)',
  ScoreSystem.metersOf({ score: 1477, scoreM: 1200 }), 1200);
eq('metersOf: cópia local / item de runs[] usa m',
  ScoreSystem.metersOf({ score: 1477, m: 1200 }), 1200);
eq('metersOf: doc ANTIGO cai no próprio score (era metros)',
  ScoreSystem.metersOf({ score: 940 }), 940);
eq('metersOf: scoreM tem prioridade sobre m',
  ScoreSystem.metersOf({ score: 9, scoreM: 2, m: 3 }), 2);
eq('metersOf: scoreM = 0 é valor válido (?? e não ||)',
  ScoreSystem.metersOf({ score: 100, scoreM: 0 }), 0);
eq('metersOf: entrada vazia não explode',
  [ScoreSystem.metersOf({}), ScoreSystem.metersOf()], [undefined, undefined]);

// ---------- 7. ASSERT-CHAVE: runBonus == soma ao vivo ----------
// Uma corrida sintética no formato de runs[] (letras de 1 char). A soma "ao
// vivo" é feita como a cena faz: um laço de pointsFor por contador + o
// endBonus do fim. Se este assert cair, o bônus recomputado do histórico
// passa a divergir do que o jogador viu no HUD.
function somaAoVivo(run) {
  const eventos = [['wall', run.w], ['ramp', run.r], ['tower', run.o],
    ['animal', run.a], ['bossLayer', run.b]];
  let pts = 0;
  for (const [evt, n] of eventos) {
    for (let i = 0; i < (n || 0); i++) pts += ScoreSystem.pointsFor(evt);
  }
  return pts + ScoreSystem.endBonus({
    escaped: run.c === 'win' || (run.m || 0) >= 1000,
    bossLayers: run.b || 0,
    bossFightS: run.z || 0,
    legend: run.c === 'win' && (run.m || 0) >= 10000,
  });
}
const runFuga = { m: 1200, c: 'win', w: 3, r: 2, o: 1, a: 4, b: 3, z: 15 };
eq('runBonus == soma ao vivo (fuga com blitz)',
  ScoreSystem.runBonus(runFuga), somaAoVivo(runFuga));
eq('...e o número é o esperado à mão (15+10+15+12+75 +100 +50)',
  ScoreSystem.runBonus(runFuga), 277);

const runCurta = { m: 450, c: 'wall', w: 5, a: 2 };
eq('runBonus == soma ao vivo (corrida curta, sem fuga)',
  ScoreSystem.runBonus(runCurta), somaAoVivo(runCurta));
eq('...e vale só o combate (25+6)', ScoreSystem.runBonus(runCurta), 31);

const runLenda = { m: 10500, c: 'win', w: 40, r: 12, o: 3, a: 30, b: 3, z: 60 };
eq('runBonus == soma ao vivo (LENDA, luta longa: sem blitz)',
  ScoreSystem.runBonus(runLenda), somaAoVivo(runLenda));
eq('...LENDA paga, blitz não (z=60 > 20)',
  ScoreSystem.runBonus(runLenda), 200 + 60 + 45 + 90 + 75 + W.escape + W.legend);

const runSemWin = { m: 1600, c: 'spike', o: 2 };
eq('runBonus == soma ao vivo (fuga derivada de m >= 1000, sem c=win)',
  ScoreSystem.runBonus(runSemWin), somaAoVivo(runSemWin));
eq('...fuga sem c=win vale', ScoreSystem.runBonus(runSemWin), 30 + W.escape);

const runVazia = { m: 34, c: 'wall' };
eq('runBonus == soma ao vivo (corrida sem nenhum contador)',
  ScoreSystem.runBonus(runVazia), somaAoVivo(runVazia));
eq('...corrida velha de 34m vale bônus ZERO (doc antigo continua válido)',
  ScoreSystem.runBonus(runVazia), 0);
eq('runBonus sem argumento não explode', ScoreSystem.runBonus(), 0);

// LENDA exige a fuga completa: 10.000m sem c=win não é lenda
eq('LENDA exige c=win (10.000m sem vitória não paga legend)',
  ScoreSystem.runBonus({ m: 12000, c: 'spike' }), W.escape);

// ---------- 8. breakdown: a tela de fim de corrida ----------
const bd = ScoreSystem.breakdown({
  meters: 1200, walls: 3, ramps: 2, towers: 1, animals: 4,
  bossLayers: 3, escaped: true, blitz: true,
});
eq('breakdown: bônus bate com o runBonus da MESMA corrida',
  bd.bonus, ScoreSystem.runBonus(runFuga));
eq('breakdown: total é metros + bônus', bd.total, 1477);
eq('breakdown: uma linha por façanha que pontuou', bd.lines.length, 7);
eq('breakdown: rótulos e pontos das linhas',
  bd.lines.map((l) => [l.label, l.pts]),
  [['🧱 Paredes ×3', 15], ['🏔️ Morros ×2', 10], ['🏰 Torres ×1', 15],
    ['🦁 Animais ×4', 12], ['🎯 Camadas do portão ×3', 75],
    ['🗽 Fuga', W.escape], ['⚡ Blitz', W.blitz]]);
eq('breakdown: contador zerado não vira linha (ruído)',
  ScoreSystem.breakdown({ meters: 300, walls: 2, ramps: 0, animals: 0 }).lines.map((l) => l.label),
  ['🧱 Paredes ×2']);
eq('breakdown: corrida sem nada rende lista vazia e bônus zero',
  (() => { const b = ScoreSystem.breakdown({ meters: 34 }); return [b.lines, b.bonus, b.total]; })(),
  [[], 0, 34]);
eq('breakdown: sem argumento não explode',
  (() => { const b = ScoreSystem.breakdown(); return [b.lines.length, b.bonus, b.total]; })(),
  [0, 0, 0]);
eq('breakdown: LENDA aparece como linha própria',
  ScoreSystem.breakdown({ meters: 10500, legend: true, escaped: true }).lines.map((l) => l.pts),
  [W.escape, W.legend]);
eq('breakdown: o teto do bônus age no total, não nas linhas',
  (() => {
    const b = ScoreSystem.breakdown({ meters: 10, animals: 40, escaped: true });
    return [b.bonus, b.total];
  })(), [220, 20]);

// ---------- 9. Formatação pt-BR ----------
eq('fmtPts com separador de milhar', ScoreSystem.fmtPts(1234), '1.234 pts');
eq('fmtPts sem separador abaixo de mil', ScoreSystem.fmtPts(987), '987 pts');
eq('fmtPts na borda dos mil', ScoreSystem.fmtPts(1000), '1.000 pts');
eq('fmtPts com dois separadores', ScoreSystem.fmtPts(1234567), '1.234.567 pts');
eq('fmtPts arredonda para baixo e aceita lixo',
  [ScoreSystem.fmtPts(12.9), ScoreSystem.fmtPts(0), ScoreSystem.fmtPts(), ScoreSystem.fmtPts('x')],
  ['12 pts', '0 pts', '0 pts', '0 pts']);

eq('fmtScore no formato do top 10',
  ScoreSystem.fmtScore({ score: 1234, scoreM: 987 }), '1.234 pts · 987 m');
eq('fmtScore de marca ANTIGA (só score) mostra um número só',
  ScoreSystem.fmtScore({ score: 987 }), '987 pts');
eq('fmtScore com números IGUAIS não repete ("987 pts · 987 m" parece bug)',
  ScoreSystem.fmtScore({ score: 987, scoreM: 987 }), '987 pts');
eq('fmtScore usa o m da cópia local quando não há scoreM',
  ScoreSystem.fmtScore({ score: 1477, m: 1200 }), '1.477 pts · 1.200 m');
// os dois lados do "·" usam o MESMO separador — "5.804 pts · 5185 m" saía com
// dois padrões de número na mesma linha (pego no smoke visual da v1.8.4)
eq('fmtScore separa o milhar dos METROS também',
  ScoreSystem.fmtScore({ score: 5804, scoreM: 5185 }), '5.804 pts · 5.185 m');
eq('fmtScore: entrada vazia não explode',
  [ScoreSystem.fmtScore({}), ScoreSystem.fmtScore()], ['0 pts', '0 pts']);

// ---------- 10. Constantes do orçamento (contrato com as rules) ----------
eq('SCORE_MAX_TOTAL bate com o teto das firestore.rules',
  Constants.SCORE_MAX_TOTAL, 20000);
eq('SCORE_BONUS_CAP = 1 é o que sustenta score <= scoreM * 2 nas rules',
  Constants.SCORE_BONUS_CAP, 1);
eq('todo peso é inteiro positivo',
  Object.values(W).every((v) => Number.isInteger(v) && v > 0), true);

// ---------- 11. v1.8.5: os bosses do deserto (Cerco e Guardião) ----------
// Camada de boss vale o MESMO bossLayer nos três (b portão, e Cerco,
// l Guardião — a habilidade premiada é uma só); a vitória do Cerco
// (e >= BOSS2_LAYERS.length) paga o peso boss2 por cima. O Guardião não tem
// bônus próprio: a vitória dele JÁ paga o legend.
eq('Cerco vencido: e=4 paga as camadas + a vitória (4×25 + 150)',
  ScoreSystem.runBonus({ m: 400, c: 'dart', e: 4 }), 4 * W.bossLayer + W.boss2);
eq('Cerco perdido: e=3 paga só as camadas (75, sem vitória)',
  ScoreSystem.runBonus({ m: 400, c: 'dart', e: 3 }), 3 * W.bossLayer);
eq('Guardião: l=5 soma as 5 camadas (125)',
  ScoreSystem.runBonus({ m: 400, c: 'wall', l: 5 }), 5 * W.bossLayer);
eq('b+e+l somam juntos no mesmo peso (e a vitória do Cerco por cima)',
  ScoreSystem.runBonus({ m: 2500, c: 'dart', b: 3, e: 4, l: 2, z: 30 }),
  (3 + 4 + 2) * W.bossLayer + W.boss2 + W.escape);

// breakdown: as linhas novas da tela de fim de corrida
const bd2 = ScoreSystem.breakdown({ meters: 2100, boss2Layers: 4 });
eq('breakdown: Cerco vencido rende as DUAS linhas (camadas + vitória)',
  bd2.lines.map((l) => [l.label, l.pts]),
  [['🕸️ Camadas do Cerco ×4', 4 * W.bossLayer], ['🕸️ Cerco vencido', W.boss2]]);
eq('breakdown: Cerco a meio caminho NÃO ganha a linha de vitória',
  ScoreSystem.breakdown({ meters: 2050, boss2Layers: 3 }).lines.map((l) => l.label),
  ['🕸️ Camadas do Cerco ×3']);
eq('breakdown: as 5 camadas do Guardião viram linha própria',
  ScoreSystem.breakdown({ meters: 9995, boss3Layers: 5 }).lines.map((l) => [l.label, l.pts]),
  [['🏹 Camadas do Guardião ×5', 5 * W.bossLayer]]);

// ASSERT-GUARDA do contrato, versão v1.8.5: runBonus(run) TEM de bater com a
// soma feita ao vivo na corrida — as camadas de Cerco/Guardião nascem no
// MESMO addScore('bossLayer') do BossFight genérico e a vitória do Cerco no
// defeatBoss2; aqui a soma manual refaz exatamente esses eventos.
function somaAoVivoDeserto(run) {
  let pts = somaAoVivo(run); // w/r/o/a/b por pointsFor + endBonus
  for (const n of [run.e, run.l]) {
    for (let i = 0; i < (n || 0); i++) pts += ScoreSystem.pointsFor('bossLayer');
  }
  if ((run.e || 0) >= Constants.BOSS2_LAYERS.length) pts += ScoreSystem.pointsFor('boss2');
  return pts;
}
const runDeserto = { m: 2400, c: 'dart', w: 6, r: 2, o: 1, a: 5, b: 3, z: 12, e: 4, l: 1 };
eq('runBonus == soma ao vivo (deserto: w/r/o/a/b/e/l, m >= 2000)',
  ScoreSystem.runBonus(runDeserto), somaAoVivoDeserto(runDeserto));
eq('...e o número é o esperado à mão (30+10+15+15+200 +150 +100 +50)',
  ScoreSystem.runBonus(runDeserto), 570);

const runLendaCheia = { m: 10200, c: 'win', w: 10, r: 4, o: 2, a: 12, b: 3, e: 4, l: 5, z: 40 };
eq('runBonus == soma ao vivo (LENDA com os três bosses vencidos)',
  ScoreSystem.runBonus(runLendaCheia), somaAoVivoDeserto(runLendaCheia));
eq('...LENDA + Cerco pagam, blitz não (z=40 > 20)',
  ScoreSystem.runBonus(runLendaCheia),
  50 + 20 + 30 + 36 + 12 * W.bossLayer + W.boss2 + W.escape + W.legend);

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
