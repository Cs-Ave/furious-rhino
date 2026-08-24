// Testes dos detectores da linha de investigação — sem rede.
//
// Os detectores decidem o que vira "suspeita" num relatório que o dono vai
// ler para julgar jogadores. Um falso positivo aqui acusa gente inocente, e
// um falso negativo esconde o bug. Por isso as fixtures são corridas
// VERBATIM de produção — não casos inventados.
import { DETECTORES, analisar, resumir, diff, camadas } from './investiga.mjs';

let pass = 0;
let fail = 0;
function eq(nome, obtido, esperado) {
  const a = JSON.stringify(obtido);
  const b = JSON.stringify(esperado);
  if (a === b) { pass++; console.log(`PASS  ${nome}`); }
  else { fail++; console.log(`FAIL  ${nome}\n      esperado ${b}\n      obtido   ${a}`); }
}

// `flattenRuns` normaliza toda letra ausente para 0 — as fixtures abaixo
// seguem essa forma, que é a que os detectores recebem de verdade.
const linha = (o) => ({
  id: 'x', t: 0, m: 0, s: 0, c: '', v: '', j: 0, d: 0, w: 0, r: 0, a: 0,
  b: 0, e: 0, u: 0, y: 0, l: 0, z: 0, h: 0, i: 0, f: 0, n: 0, p: 0, q: 0, x: 0, k: 0, g: '',
  ...o,
});

// ---------- corridas REAIS de produção ----------
// kukur, 24/08: 10.000 m em 44 s = 227 m/s, com a sonda dizendo i = s = 44.
const saltoDistancia = linha({ m: 10000, s: 44, i: 44, c: 'win', v: '1.9.3', w: 12, r: 6, o: 1, a: 7, f: 1 });
// nikolinhasss, 23/08: 10.000 m em 898 s = 11 m/s — velocidade NORMAL. É o
// caso que a guarda por velocidade não pega e que motivou o D2/D3.
const cascataLenta = linha({ m: 10000, s: 898, c: 'win', v: '1.9.0', w: 80, a: 94, d: 4, z: 2, h: 1 });
// Ícaroo brabo: corrida HONESTA — 1.262 pulos e 3 camadas do portão.
const honestaLonga = linha({ m: 5185, s: 524, c: 'tower', v: '1.9.0', j: 1262, b: 3, z: 4 });
// Thomas: outra honesta.
const honestaThomas = linha({ m: 4606, s: 464, c: 'wall', v: '1.9.0', j: 1391, b: 3, z: 5 });
// O caso mais comum do portão: entrou na arena e MORREU ali, sem quebrar
// nada. É jogo legítimo e não pode acender nada.
const morreuNaArena = linha({ m: 990, s: 102, c: 'dart', v: '1.7.2', j: 167, z: 4 });
// nikolinhasss, 24/08: os dois relógios discordando (loop = metade da parede).
const relogiosTortos = linha({ m: 56, s: 14, i: 7, c: 'animal', v: '1.9.2' });
// Corrida curta comum — a esmagadora maioria da base.
const curtaNormal = linha({ m: 122, s: 16, i: 15, c: 'spike', v: '1.9.3', j: 8, d: 4 });

// ---------- o que cada corrida real tem de acender ----------
eq('salto de distância: velocidade + sem interação + vitória sem chefe',
  analisar(saltoDistancia).sort(),
  ['D1-velocidade', 'D2-sem-interacao', 'D3-vitoria-sem-chefe']);

eq('cascata lenta (11 m/s, a que a velocidade NÃO pega)',
  analisar(cascataLenta).sort(),
  ['D2-sem-interacao', 'D3-vitoria-sem-chefe', 'D5-arena-sem-quebra']);

eq('relógios discordantes acendem só o D4', analisar(relogiosTortos), ['D4-relogios']);

// ---------- e, sobretudo, o que NÃO pode acender ----------
eq('corrida honesta longa (1.262 pulos, 3 camadas) não acende NADA',
  analisar(honestaLonga), []);
eq('outra honesta (1.391 pulos) não acende NADA', analisar(honestaThomas), []);
eq('morrer na arena sem quebrar camada é LEGÍTIMO — não acende',
  analisar(morreuNaArena), []);
eq('corrida curta comum não acende nada', analisar(curtaNormal), []);

// ---------- bordas de cada detector ----------
eq('D2 não julga corrida curta (antes do portão dá para ir longe sem pular)',
  analisar(linha({ m: 999, s: 120, j: 0 })), []);
eq('D2 acende a partir dos 1000 m sem pulo',
  analisar(linha({ m: 1000, s: 120, j: 0 })), ['D2-sem-interacao']);
eq('D3 só olha vitória — morrer sem camada não é suspeito',
  analisar(linha({ m: 3000, s: 300, c: 'wall', j: 400 })), []);
eq('D4 ignora corrida sem a sonda (i ausente = 0)',
  analisar(linha({ m: 500, s: 60, i: 0, j: 60 })), []);
eq('D4 aceita divergência pequena (10%)',
  analisar(linha({ m: 500, s: 60, i: 54, j: 60 })), []);
eq('D5 exige ter ATRAVESSADO (m > 1050), não só entrado',
  analisar(linha({ m: 1040, s: 110, z: 3, j: 200 })), []);

// ---------- robustez: dado de terceiros não derruba a varredura ----------
for (const lixo of [{}, { m: NaN, s: NaN }, { m: -5, s: -5 }, { c: null }]) {
  const nome = `lixo ${JSON.stringify(lixo)} não lança`;
  let ok = true;
  try { analisar(linha(lixo)); } catch (e) { ok = false; }
  eq(nome, ok, true);
}

// ---------- o resumo ----------
{
  const rows = [saltoDistancia, cascataLenta, honestaLonga, honestaThomas, morreuNaArena, curtaNormal];
  const res = resumir(rows);
  eq('resumo conta as corridas', res.corridas, 6);
  eq('resumo conta quem tem a sonda i', res.comSondaI, 2);
  eq('resumo conta as suspeitas (as 2 vitórias falsas)', res.suspeitas, 2);
  eq('D3 acendeu para as duas vitórias sem chefe', res.porDetector['D3-vitoria-sem-chefe'], 2);
  eq('as honestas ficaram de fora do detalhe',
    res.detalhe.some((x) => x.j > 1000), false);
  eq('o resumo avisa da rotação da janela (senão "melhorou" mente)',
    /rota/i.test(res.aviso), true);
}

// ---------- o diff entre coletas: é o que faz a linha ser perene ----------
{
  const agora = { porDetector: { 'D1-velocidade': 3, 'D2-sem-interacao': 25,
    'D3-vitoria-sem-chefe': 4, 'D4-relogios': 1, 'D5-arena-sem-quebra': 6 } };
  eq('sem coleta anterior não há diff', diff(agora, null), null);

  const antes = { dia: '2026-08-24', porDetector: { 'D1-velocidade': 1, 'D2-sem-interacao': 25,
    'D3-vitoria-sem-chefe': 4, 'D4-relogios': 1, 'D5-arena-sem-quebra': 6 } };
  const d = diff(agora, antes);
  eq('o diff cita a data da coleta anterior', d.desde, '2026-08-24');
  eq('detector que subiu aparece com o delta',
    d.linhas.some((l) => l.includes('D1-velocidade') && l.includes('+2')), true);
  eq('detector estável também aparece (zero é informação)',
    d.linhas.some((l) => l.includes('D2-sem-interacao') && l.includes('+0')), true);

  // Detector novo não pode virar "+N" falso contra uma coleta que não o tinha
  const semD5 = { dia: '2026-08-20', porDetector: { 'D1-velocidade': 1 } };
  const d2 = diff(agora, semD5);
  eq('detector que não existia na coleta anterior é marcado como novo',
    d2.linhas.filter((l) => /detector novo/.test(l)).length, 4);
}

// ---------- contrato dos detectores ----------
eq('todo detector tem nome, o_que e testa',
  DETECTORES.every((d) => d.nome && d.o_que && typeof d.testa === 'function'), true);
eq('nomes de detector são únicos',
  new Set(DETECTORES.map((d) => d.nome)).size, DETECTORES.length);
eq('camadas() soma os cinco chefes',
  camadas({ b: 3, e: 4, u: 4, y: 5, l: 5 }), 21);

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exitCode = fail ? 1 : 0;
