// Testes da classificação do fix-ranking — sem rede.
//
// Este é o código que decide QUEM perde a marca e QUEM tem a dele
// restaurada. Um erro aqui apaga a conquista de um jogador real, então os
// casos abaixo são os dados de PRODUÇÃO de 23/08, não fixtures inventadas.
import { melhorLegitima, ehImplausivel, classificar, statsLimpos } from './fix-ranking.mjs';

let pass = 0;
let fail = 0;
function eq(nome, obtido, esperado) {
  const a = JSON.stringify(obtido);
  const b = JSON.stringify(esperado);
  if (a === b) { pass++; console.log(`PASS  ${nome}`); }
  else { fail++; console.log(`FAIL  ${nome}\n      esperado ${b}\n      obtido   ${a}`); }
}

// ---------- corridas reais de produção ----------
// A vitória HONESTA do nikolinhasss: 10.000 m em 898 s = 11 m/s. É o caso que
// justifica restaurar em vez de apagar — apagá-lo destruiria a conquista.
// (copiada VERBATIM do stats de produção — contadores inclusive, porque é a
// soma deles que produz os 12.977 pts)
const vitoriaHonesta = { h: 2, m: 10000, o: 92, c: 'win', k: 1, v: '1.9.0', a: 94,
  g: 'mecacolo', d: 4, w: 80, r: 83, z: 2, t: 1787521581, s: 898 };
// A mesma pessoa, corrida do BUG: 10.002 m em 60 s = 167 m/s.
const corridaDoBug = { s: 60, t: 1787522221, w: 92, r: 68, g: 'mecacolo', d: 1,
  a: 353, v: '1.9.0', k: 1, p: 1, o: 82, c: 'win', m: 10002 };
// Corrida curta comum (ele morria sempre no mesmo obstáculo dos ~57 m)
const curtaNormal = { t: 1787520000, m: 57, s: 7, c: 'wall' };
// A MESMA corrida curta com o tempo encolhido pelo bug — na zona cega do
// arredondamento, tem de ser tratada como legítima (barrar seria punir o
// jogador pelo playTime ser gravado em segundos inteiros)
const curtaZonaCega = { t: 1787520100, m: 57, s: 1, c: 'wall' };

eq('a corrida do bug é reconhecida como implausível', ehImplausivel(corridaDoBug), true);
eq('a vitória honesta NÃO é implausível', ehImplausivel(vitoriaHonesta), false);
eq('corrida curta na zona cega do arredondamento NÃO é implausível',
  ehImplausivel(curtaZonaCega), false);
eq('lixo não quebra o julgamento', [ehImplausivel(null), ehImplausivel({}), ehImplausivel({ m: 0 })],
  [false, false, false]);

// ---------- melhorLegitima ----------
{
  const m = melhorLegitima([curtaNormal, corridaDoBug, vitoriaHonesta]);
  eq('elege a vitória honesta e IGNORA a do bug', [m.m, m.pts > 12000], [10000, true]);
  eq('...e a pontuação bate com a régua do ranking (12.977 pts)', m.pts, 12977);
}
eq('sem nenhuma corrida legítima devolve null', melhorLegitima([corridaDoBug]), null);
eq('runs vazio ou inválido devolve null',
  [melhorLegitima([]), melhorLegitima(null), melhorLegitima('nada')], [null, null, null]);
{
  // Empate em pontos: a mais ANTIGA fica (mesma regra do bestInWindow)
  const a = { t: 100, m: 500, s: 60 };
  const b = { t: 900, m: 500, s: 60 };
  eq('empate em pontos: a corrida mais antiga vence', melhorLegitima([b, a]).t, 100);
}

// ---------- classificar ----------
{
  const scores = [
    { id: 'niko-000000000000001', campos: { name: 'nikolinhasss', score: 20000 } },
    { id: 'ben-0000000000000001', campos: { name: 'ben', score: 20000 } },
    { id: 'kukur-00000000000001', campos: { name: 'kukur', score: 13700 } },
    { id: 'claude-sonda-000001', campos: { name: 'CacheVelho', score: 10 } },
  ];
  const stats = [
    { id: 'niko-000000000000001', campos: { runs: [curtaNormal, corridaDoBug, vitoriaHonesta] } },
    { id: 'ben-0000000000000001', campos: { runs: [{ t: 1, m: 10003, s: 50, c: 'win' }] } },
    { id: 'kukur-00000000000001', campos: { runs: [{ t: 2, m: 10000, s: 429, c: 'win' }] } },
    { id: 'claude-sonda-000001', campos: { runs: [] } },
  ];
  const p = classificar(scores, stats);

  eq('quem TEM marca anterior é restaurado, não apagado',
    p.restaurar.map((r) => r.nome), ['nikolinhasss']);
  eq('...com a marca legítima dele', p.restaurar[0].melhor.pts, 12977);
  eq('quem NUNCA teve corrida legítima é removido', p.remover.map((r) => r.nome), ['ben']);
  eq('jogador SEM a marca do bug não é tocado',
    [...p.restaurar, ...p.remover].some((r) => r.nome === 'kukur'), false);
  eq('sondas claude-* saem por conta própria', p.sondas.map((s) => s.id), ['claude-sonda-000001']);
  eq('as corridas do bug de quem SOBREVIVE entram na limpeza do runs[]',
    p.limparRuns.map((l) => [l.id.slice(0, 4), l.sujas]), [['niko', 1]]);
  eq('quem foi REMOVIDO não entra na limpeza (o stats dele já some inteiro)',
    p.limparRuns.some((l) => l.id.startsWith('ben')), false);
}

// Guarda dura: só a marca EXATA do teto é alvo. Uma pontuação alta legítima
// (o kukur com 13.700) jamais pode entrar na peneira.
{
  const p = classificar(
    [{ id: 'alto-000000000000001', campos: { name: 'Alto', score: 19999 } }],
    [{ id: 'alto-000000000000001', campos: { runs: [] } }]);
  eq('19.999 pts não é a marca do bug e não é tocado',
    [p.restaurar.length, p.remover.length], [0, 0]);
}

// ---------- statsLimpos ----------
{
  const campos = {
    attempts: 50, playTimeS: 3600, wins: 2, bestM: 10002,
    runs: [curtaNormal, corridaDoBug, vitoriaHonesta], gameVersion: '1.9.0',
    deaths: { wall: 1 }, history: { firstSeenS: 1 },
  };
  const limpas = campos.runs.filter((r) => !ehImplausivel(r));
  const novo = statsLimpos(campos, limpas);
  eq('as corridas do bug saem do runs[]', novo.runs.length, 2);
  eq('bestM cai para a melhor marca REAL (a monotonia das rules o congelaria)',
    novo.bestM, 10000);
  eq('wins conta só as vitórias que sobraram', novo.wins, 1);
  eq('attempts desconta as corridas removidas', novo.attempts, 49);
  eq('os demais campos passam intactos (o setDoc de stats é destrutivo)',
    [novo.gameVersion, novo.deaths.wall, novo.history.firstSeenS], ['1.9.0', 1, 1]);
  eq('bestM respeita o teto de 10.000 das rules',
    statsLimpos({ ...campos, bestM: 99999 }, [{ m: 99999, s: 9000 }]).bestM, 10000);
  eq('attempts nunca fica abaixo de 1 (as rules exigem >= 1)',
    statsLimpos({ attempts: 1, runs: [corridaDoBug] }, []).attempts, 1);
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exitCode = fail ? 1 : 0;
