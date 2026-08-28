// Testes da classificação do fix-ranking — sem rede.
//
// Este é o código que decide QUEM perde a marca e QUEM tem a dele
// restaurada. Um erro aqui apaga a conquista de um jogador real, então os
// casos abaixo são os dados de PRODUÇÃO de 23-24/08, não fixtures inventadas.
import { melhorLegitima, ehImplausivel, ehSuja, classificar, statsLimpos } from './fix-ranking.mjs';
// v1.9.6: a regra da cascata mora no BossProof (o jogo também a usa). Os
// casos-limite dela vivem em test-bossproof.mjs; aqui fica só o que este
// arquivo decide — quem perde a marca e quem tem a dele restaurada.
import { ehCascata } from '../js/systems/BossProof.js';

let pass = 0;
let fail = 0;
function eq(nome, obtido, esperado) {
  const a = JSON.stringify(obtido);
  const b = JSON.stringify(esperado);
  if (a === b) { pass++; console.log(`PASS  ${nome}`); }
  else { fail++; console.log(`FAIL  ${nome}\n      esperado ${b}\n      obtido   ${a}`); }
}

// ---------- corridas reais de produção ----------
// ATENÇÃO, LIÇÃO CARA: até a v1.9.5 esta corrida se chamava aqui
// `vitoriaHonesta` e o teste EXIGIA que ela fosse eleita. Era a crença de que
// velocidade média bastava para julgar — 10.000 m em 898 s dá 11 m/s, o ritmo
// de qualquer jogador comum, e por isso ela passava em qualquer teto físico.
// O que denuncia é OUTRA coisa: `z: 2` e `h: 2` (dois segundos de "luta" no
// Portão e na Muralha) com NENHUMA camada quebrada — nem b, nem e, nem u, y
// ou l — e mesmo assim o mundo inteiro atravessado. São 21 camadas no
// caminho e ele não encostou em uma. É a cascata dos chefes, não uma façanha.
const vitoriaDaCascata = { h: 2, m: 10000, o: 92, c: 'win', k: 1, v: '1.9.0', a: 94,
  g: 'mecacolo', d: 4, w: 80, r: 83, z: 2, t: 1787521581, s: 898 };
// A mesma pessoa, corrida do bug do CRONÔMETRO: 10.002 m em 60 s = 167 m/s.
// Tem as duas doenças ao mesmo tempo — tempo impossível E zero camadas.
const corridaDoBug = { s: 60, t: 1787522221, w: 92, r: 68, g: 'mecacolo', d: 1,
  a: 353, v: '1.9.0', k: 1, p: 1, o: 82, c: 'win', m: 10002 };
// A melhor corrida LEGÍTIMA que resta ao nikolinhasss na janela: 544 m, longe
// do primeiro chefe, nada a suspeitar. É ela que a restauração precisa achar.
const nikoLegitima = { w: 3, v: '1.9.0', k: 1, d: 5, m: 544, c: 'wall', s: 34,
  g: 'party', t: 1787516576, j: 25 };
// O kukur em 16/08, antes de tudo: 472 m na v1.8.1, fora da janela da cascata.
const kukurLegitima = { t: 1786888968, m: 472, s: 52, c: 'animal', w: 6, j: 56,
  d: 12, x: 4, p: 2, v: '1.8.1' };
// E a corrida dele que envenenou o pódio: 10.000 m em 429 s = 23 m/s. Rápida,
// mas ABAIXO do teto físico do motor (35,16 m/s) — o cronômetro não mentiu.
const kukurDaCascata = { t: 1787520660, m: 10000, s: 429, c: 'win', v: '1.9.0',
  w: 6, r: 10, o: 3, a: 7, j: 3, d: 5, x: 20, f: 3, z: 1, h: 1, g: 'catisqui' };
// A melhor corrida do Funku Pópi que ainda resta na janela dele: 1.997 m com
// o PORTÃO DERRUBADO (`b: 3`). Ela existe aqui por dois motivos. O primeiro é
// provar que placar acima do que a janela sustenta (ele marcou 3.304) não
// basta para acusar ninguém. O segundo é uma lição repetida: a primeira versão
// deste caso INVENTOU a corrida, sem o `b`, e o teste passou a acusá-lo de
// cascata — exatamente o erro que a nota lá embaixo já registrava sobre os
// contadores inventados. Fixture de gente real se copia, não se imagina.
const funkuReal = { t: 1786617476, m: 1997, s: 206, c: 'wall', w: 20, j: 514,
  d: 25, x: 1, f: 1, b: 3, z: 4, v: '1.7.2' };
// Corrida curta comum (ele morria sempre no mesmo obstáculo dos ~57 m)
const curtaNormal = { t: 1787520000, m: 57, s: 7, c: 'wall' };
// A MESMA corrida curta com o tempo encolhido pelo bug — na zona cega do
// arredondamento, tem de ser tratada como legítima (barrar seria punir o
// jogador pelo playTime ser gravado em segundos inteiros)
const curtaZonaCega = { t: 1787520100, m: 57, s: 1, c: 'wall' };

// ---------- ehImplausivel: o cronômetro ----------
eq('a corrida do bug é reconhecida como implausível', ehImplausivel(corridaDoBug), true);
eq('corrida curta na zona cega do arredondamento NÃO é implausível',
  ehImplausivel(curtaZonaCega), false);
eq('lixo não quebra o julgamento', [ehImplausivel(null), ehImplausivel({}), ehImplausivel({ m: 0 })],
  [false, false, false]);

// ---------- ehCascata: a distância sem a luta ----------
// A prova de que os dois detectores são INDEPENDENTES: as duas vitórias da
// cascata passam folgadas no teto de velocidade e mesmo assim são falsas.
eq('a vitória da cascata passa no teto de velocidade (11 m/s)',
  ehImplausivel(vitoriaDaCascata), false);
eq('...mas a cascata a pega: mundo inteiro, zero camadas', ehCascata(vitoriaDaCascata), true);
eq('a do kukur também: 23 m/s é possível, atravessar sem lutar não',
  [ehImplausivel(kukurDaCascata), ehCascata(kukurDaCascata)], [false, true]);
eq('a corrida do cronômetro tem as duas doenças',
  [ehImplausivel(corridaDoBug), ehCascata(corridaDoBug)], [true, true]);
eq('corrida curta nem chega em chefe nenhum e não é cascata',
  [ehCascata(curtaNormal), ehCascata(nikoLegitima)], [false, false]);
{
  // v1.9.6: a janela deixou de ter limite SUPERIOR. Até aqui a régua parava
  // na v1.9.4 (a versão que corrigiu a cascata) — mas justamente de lá em
  // diante passar sem lutar virou impossível, então uma corrida NOVA nessa
  // condição é o que mais interessa pegar. O caso real que motivou: um
  // jogador de produção passou do portão três vezes em v1.9.5, com zero
  // camadas, usando o ?debug=1.
  const semLuta = (v) => ({ m: 10000, s: 500, c: 'win', v });
  eq('corrida NOVA que passa sem lutar também é pega',
    [ehCascata(semLuta('1.9.4')), ehCascata(semLuta('1.9.5'))], [true, true]);
  eq('e as da janela original seguem pegas',
    [ehCascata(semLuta('1.8.5')), ehCascata(semLuta('1.9.3'))], [true, true]);
  eq('quem DERRUBOU os cinco chefes não é acusado, em versão nenhuma',
    ehCascata({ m: 10000, s: 500, c: 'win', v: '1.9.5', b: 3, e: 4, u: 4, y: 5, l: 5 }), false);
}
eq('ehSuja é a união das duas causas',
  [ehSuja(corridaDoBug), ehSuja(vitoriaDaCascata), ehSuja(nikoLegitima)], [true, true, false]);

// ---------- melhorLegitima ----------
{
  const m = melhorLegitima([curtaNormal, corridaDoBug, vitoriaDaCascata, nikoLegitima]);
  eq('ignora as duas falsas e elege a melhor corrida real', [m.m, m.pts], [544, 559]);
}
eq('sem nenhuma corrida legítima devolve null',
  melhorLegitima([corridaDoBug, vitoriaDaCascata]), null);
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
    { id: 'niko-000000000000001', campos: { name: 'nikolinhasss', score: 12977 } },
    { id: 'ben-0000000000000001', campos: { name: 'ben', score: 20000 } },
    { id: 'kukur-00000000000001', campos: { name: 'kukur', score: 13700 } },
    { id: 'claude-sonda-000001', campos: { name: 'CacheVelho', score: 10 } },
  ];
  const stats = [
    { id: 'niko-000000000000001', campos: { attempts: 4, runs: [curtaNormal, corridaDoBug, vitoriaDaCascata, nikoLegitima] } },
    { id: 'ben-0000000000000001', campos: { attempts: 1, runs: [{ t: 1, m: 10003, s: 50, c: 'win' }] } },
    { id: 'kukur-00000000000001', campos: { attempts: 2, runs: [kukurDaCascata, kukurLegitima] } },
    { id: 'claude-sonda-000001', campos: { runs: [] } },
  ];
  const p = classificar(scores, stats);

  eq('quem TEM marca anterior é restaurado, não apagado',
    p.restaurar.map((r) => [r.nome, r.melhor.pts]),
    [['nikolinhasss', 559], ['kukur', 502]]);
  eq('quem NUNCA teve corrida legítima é removido', p.remover.map((r) => r.nome), ['ben']);
  eq('sondas claude-* saem por conta própria', p.sondas.map((s) => s.id), ['claude-sonda-000001']);
  eq('as corridas falsas de quem SOBREVIVE entram na limpeza do runs[]',
    p.limparRuns.map((l) => [l.id.slice(0, 4), l.sujas]), [['niko', 2], ['kuku', 1]]);
  eq('quem foi REMOVIDO não entra na limpeza (o stats dele já some inteiro)',
    p.limparRuns.some((l) => l.id.startsWith('ben')), false);
}

// A GUARDA QUE IMPORTA: sem corrida suja, ninguém é tocado — nem quem tem
// placar muito acima do que as corridas restantes justificam. A janela guarda
// 50 corridas e 674 já rodaram para fora da base: o Funku Pópi marcou 3.304 e
// a melhor que ainda resta dele é de 1.997. Recalcular todo mundo rebaixaria
// jogador honesto. Corrida suja é prova; ausência de corrida boa não é.
{
  const p = classificar(
    [{ id: 'funku-00000000000001', campos: { name: 'Funku Pópi', score: 3304 } }],
    [{ id: 'funku-00000000000001', campos: { attempts: 92, runs: [funkuReal] } }]);
  eq('placar acima da janela, sem corrida suja: intocado',
    [p.restaurar.length, p.remover.length, p.revisar.length], [0, 0, 0]);
}

// Corrida suja existe, mas não foi ela que pontuou: nada a corrigir, e jamais
// SUBIR alguém — a restauração só desce.
{
  const p = classificar(
    [{ id: 'misto-00000000000001', campos: { name: 'Misto', score: 300 } }],
    [{ id: 'misto-00000000000001', campos: { attempts: 2, runs: [corridaDoBug, { t: 5, m: 900, s: 100, c: 'wall' }] } }]);
  eq('marca legítima já é a que vale: não restaura para não subir', p.restaurar.length, 0);
  eq('...mas a corrida suja sai do runs[] mesmo assim',
    p.limparRuns.map((l) => l.sujas), [1]);
}

// Sem corrida boa na janela E com histórico rotacionado: NÃO apagar. O
// recorde legítimo pode ter caído da janela, e remover seria punir por falta
// de prova. Vai para revisão à mão com o placar mantido.
{
  const p = classificar(
    [{ id: 'velho-00000000000001', campos: { name: 'Velho', score: 5000 } }],
    [{ id: 'velho-00000000000001', campos: { attempts: 120, runs: [vitoriaDaCascata] } }]);
  eq('histórico maior que a janela vai para revisão, não para o lixo',
    [p.remover.length, p.revisar.map((r) => [r.nome, r.tentativas, r.naJanela])],
    [0, [['Velho', 120, 1]]]);
}

// ---------- statsLimpos ----------
{
  const campos = {
    attempts: 50, playTimeS: 3600, wins: 2, bestM: 10002,
    runs: [curtaNormal, corridaDoBug, vitoriaDaCascata, nikoLegitima], gameVersion: '1.9.0',
    deaths: { wall: 1 }, history: { firstSeenS: 1 },
  };
  const limpas = campos.runs.filter((r) => !ehSuja(r));
  const novo = statsLimpos(campos, limpas);
  eq('as corridas falsas saem do runs[]', novo.runs.length, 2);
  eq('bestM cai para a melhor marca REAL (a monotonia das rules o congelaria)',
    novo.bestM, 544);
  eq('wins conta só as vitórias que sobraram', novo.wins, 0);
  eq('attempts desconta as corridas removidas', novo.attempts, 48);
  eq('os demais campos passam intactos (o setDoc de stats é destrutivo)',
    [novo.gameVersion, novo.deaths.wall, novo.history.firstSeenS], ['1.9.0', 1, 1]);
  eq('bestM respeita o teto de 10.000 das rules',
    statsLimpos({ ...campos, bestM: 99999 }, [{ m: 99999, s: 9000 }]).bestM, 10000);
  eq('attempts nunca fica abaixo de 1 (as rules exigem >= 1)',
    statsLimpos({ attempts: 1, runs: [corridaDoBug] }, []).attempts, 1);
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exitCode = fail ? 1 : 0;
