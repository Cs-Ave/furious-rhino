// Testes da rede de proteção da v1.9.1 — sem navegador.
//
// O que motivou (produção, 23/08): jogadores relataram "o jogo trava".
// Comprovado: uma exceção qualquer dentro do update() mata o loop de rAF do
// Phaser — o jogo congela na tela para sempre, sem aviso, sem gravar a
// corrida, e com a tentativa já contada. E 26 de 85 corridas da v1.9.0
// chegaram ao ranking mundial com velocidade fisicamente impossível (até
// 217 m/s), contra ZERO em ~820 corridas de todas as versões anteriores.
//
// Estes testes fixam as quatro defesas: guarda de plausibilidade, ordem do
// endGame, try/catch do update e os handlers globais.
import { readFileSync } from 'node:fs';
import { LeaderboardSystem } from '../js/systems/LeaderboardSystem.js';
import { Constants } from '../js/utils/Constants.js';

let pass = 0;
let fail = 0;
function eq(nome, obtido, esperado) {
  const a = JSON.stringify(obtido);
  const b = JSON.stringify(esperado);
  if (a === b) { pass++; console.log(`PASS  ${nome}`); }
  else { fail++; console.log(`FAIL  ${nome}\n      esperado ${b}\n      obtido   ${a}`); }
}
const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// ---------- 1. guarda de plausibilidade ----------
// O teto FÍSICO do motor é DASH_SPEED * furyFactor(1.5) * SPECIAL(1.25) /
// PIXELS_PER_METER — os três simultâneos, o que ninguém sustenta na prática.
const tetoFisico = (Constants.DASH_SPEED * 1.5 * Constants.SPECIAL_SPEED_MULT)
  / Constants.PIXELS_PER_METER;
eq('o teto de sanidade fica ACIMA do teto físico (folga p/ não barrar inocente)',
  Constants.RUN_SANITY_MAX_MPS > tetoFisico, true);
eq('...e o teto físico é o esperado de 35,16 m/s', Math.round(tetoFisico * 100) / 100, 35.16);

// As corridas REAIS do bug (dados de produção): têm de ser barradas
eq('bug: ben — 10.003 m em 50 s (200 m/s)', LeaderboardSystem.isPlausible(10003, 50), false);
eq('bug: gozaimasu — 10.002 m em 47 s (213 m/s)', LeaderboardSystem.isPlausible(10002, 47), false);
eq('bug: a mais rápida vista — 10.002 m em 46 s (217 m/s)',
  LeaderboardSystem.isPlausible(10002, 46), false);

// As vitórias LEGÍTIMAS do mesmo dia: não podem ser barradas de jeito nenhum
eq('honesta: nikolinhasss — 10.000 m em 898 s (11 m/s)',
  LeaderboardSystem.isPlausible(10000, 898), true);
eq('honesta: kukur — 10.000 m em 429 s (23 m/s)',
  LeaderboardSystem.isPlausible(10000, 429), true);
eq('honesta: kukur — 10.000 m em 365 s (27 m/s)',
  LeaderboardSystem.isPlausible(10000, 365), true);

// Zona cega deliberada: o playTime é gravado em segundos INTEIROS, então uma
// corrida de 1,4 s vira "1 s" e a média medida infla até 2x. Abaixo do
// limiar, aceitar é obrigatório — barrar seria punir o arredondamento.
eq('arredondamento: 57 m em 1 s (o caso repetido do nikolinhasss)',
  LeaderboardSystem.isPlausible(57, 1), true);
eq('arredondamento: 122 m em 2 s', LeaderboardSystem.isPlausible(122, 2), true);
eq('pior caso do limiar (321 m em 8 s) é barrado com folga sobre o teto físico',
  LeaderboardSystem.isPlausible(321, 8), false);

// Bordas numéricas
eq('borda: exatamente o teto de sanidade passa',
  LeaderboardSystem.isPlausible(Constants.RUN_SANITY_MAX_MPS * 25, 25), true);
eq('borda: um passo acima do teto é barrado',
  LeaderboardSystem.isPlausible(Constants.RUN_SANITY_MAX_MPS * 25 + 25, 25), false);

// Dado ruim NUNCA barra: sem tempo confiável não se julga ninguém
for (const [rotulo, s] of [['0', 0], ['ausente', undefined], ['negativo', -5],
  ['NaN', NaN], ['texto', 'abc'], ['Infinity', Infinity]]) {
  eq(`sem tempo confiável (${rotulo}) aceita — retrocompatível`,
    LeaderboardSystem.isPlausible(10000, s), true);
}
for (const [rotulo, m] of [['0', 0], ['ausente', undefined], ['negativo', -3], ['NaN', NaN]]) {
  eq(`sem metros (${rotulo}) não há o que barrar`, LeaderboardSystem.isPlausible(m, 100), true);
}

// Contrato de retrocompatibilidade: a assinatura antiga (sem `seconds`)
// continua valendo e aceita tudo — nenhum chamador antigo quebra.
eq('submit sem `seconds` mantém o comportamento de antes',
  LeaderboardSystem.isPlausible(10000, undefined), true);

// ---------- 2. a costura: o tempo CHEGA à guarda ----------
// Sem isto a guarda existe mas nunca dispara (seconds ficaria sempre 0).
{
  const gs = ler('../js/scenes/GameScene.js');
  eq('endGame passa o runS ao submitScore',
    /this\.submitScore\(total, distance, runS\)/.test(gs), true);
  eq('submitScore aceita e repassa o tempo',
    /async submitScore\(total, meters, seconds = 0\)/.test(gs)
    && /LeaderboardSystem\.submit\(total, meters, seconds\)/.test(gs), true);
  eq('o envio ADIADO (apelido definido depois) também leva o tempo',
    (gs.match(/pendingScore\.seconds/g) || []).length >= 2, true);
  eq('pendingScore guarda o tempo junto', /pendingScore = \{ total, meters, seconds \}/.test(gs), true);

  const ls = ler('../js/systems/LeaderboardSystem.js');
  eq('a guarda roda ANTES de qualquer rede (nada de write inútil)',
    ls.indexOf('isPlausible(meters, seconds)') < ls.indexOf('await getDb()'), true);
  eq('marca barrada NÃO grava bestSent local (a próxima honesta ainda sobe)',
    ls.indexOf('isPlausible(meters, seconds)') < ls.indexOf('setBestSent('), true);

  // ---------- 3. ordem do endGame ----------
  // A corrida tem de ser consolidada ANTES de recorde e pódio: assim o pior
  // caso de uma exceção no meio é uma corrida gravada que não subiu — e não
  // uma marca no ranking mundial sem corrida por trás.
  const iAddRun = gs.indexOf('StorageManager.addRun(distance, runS');
  const iRecorde = gs.indexOf('StorageManager.saveRecord(distance)');
  const iSubmit = gs.indexOf('this.submitScore(total, distance, runS)');
  eq('addRun acontece ANTES de saveRecord', iAddRun > 0 && iAddRun < iRecorde, true);
  eq('addRun acontece ANTES do envio ao pódio', iAddRun > 0 && iAddRun < iSubmit, true);
  eq('addPlayTimeS também subiu junto',
    gs.indexOf('StorageManager.addPlayTimeS(runS)') < iRecorde, true);

  // ---------- 4. o update não pode mais congelar o jogo ----------
  // Ancorado por ÍNDICE, não por regex de proximidade: os comentários entre
  // o `update(` e o `try {` (e entre o `catch` e a chamada) são longos de
  // propósito, e um limite de caracteres quebraria ao primeiro reparo neles.
  {
    const iUpd = gs.indexOf('update(time, delta) {');
    const iCatchCrash = gs.indexOf("this.crashToHome('update')");
    const corpo = gs.slice(iUpd, iCatchCrash);
    eq('update() tem try/catch', iUpd > 0 && corpo.includes('try {'), true);
    eq('o catch do update encerra a sessão pelo caminho digno',
      iCatchCrash > iUpd && /\}\s*catch\s*\([\s\S]{0,400}$/.test(corpo), true);
    const iEarly = corpo.indexOf('if (!this.started || this.gameOver || this.won) return;');
    eq('o early-return fica FORA do try (caminho mais quente do jogo)',
      iEarly > 0 && iEarly < corpo.indexOf('try {'), true);
  }
  eq('crashToHome existe e é idempotente',
    /crashToHome\(motivo\) \{[\s\S]{0,300}?if \(this\.gameOver\) return/.test(gs), true);
  // Ancorado por ÍNDICE: um limite de caracteres quebra sempre que o método
  // cresce (foi o que aconteceu na v1.9.5, ao gravar a corrida).
  {
    const iC = gs.indexOf('crashToHome(motivo) {');
    const iFim = gs.indexOf('\n  }', iC);
    eq('crashToHome devolve a tentativa contada no startRun',
      gs.slice(iC, iFim).includes('removeAttempt()'), true);
  }

  // Regra de ouro: sessão quebrada NÃO PONTUA.
  //
  // v1.9.5 — o assert "NÃO grava a corrida" MUDOU DE SENTIDO, de propósito.
  // Ele afirmava uma regra que se mostrou errada: não pontuar e não
  // registrar viraram a mesma coisa por acidente, e a corrida ANÔMALA — a
  // que a investigação precisa ver — apagava a própria evidência. Agora a
  // corrida É gravada com a causa `crash`, e tudo o mais continua valendo.
  const iCrash = gs.indexOf('crashToHome(motivo) {');
  const corpoCrash = gs.slice(iCrash, iCrash + 2600);
  eq('crashToHome NÃO grava recorde', /saveRecord/.test(corpoCrash), false);
  eq('crashToHome NÃO envia ao pódio', /submitScore|LeaderboardSystem/.test(corpoCrash), false);
  eq('crashToHome NÃO manda telemetria ao servidor', /StatsSystem/.test(corpoCrash), false);
  eq('crashToHome GRAVA a corrida (a anômala não pode mais sumir)',
    /StorageManager\.addRun\(/.test(corpoCrash), true);
  eq('...com a causa `crash`', /'crash'/.test(corpoCrash), true);
  eq('...e levando a sonda do loop junto (é o par que denuncia o bug)',
    /loopS/.test(corpoCrash), true);
  eq('...sem deixar de devolver a tentativa',
    /removeAttempt\(\)/.test(corpoCrash), true);
  eq('a gravação é blindada — o handler de pânico não pode entrar em pânico',
    /try \{[\s\S]{0,700}?StorageManager\.addRun\([\s\S]{0,400}?\} catch/.test(corpoCrash), true);

  eq('a cena publica a ponte para os handlers globais',
    /window\.__frCrash\s*=/.test(gs), true);
}

// ---------- 5. rede de proteção global ----------
{
  const gj = ler('../js/game.js');
  eq('window.onerror registrado', /addEventListener\('error'/.test(gj), true);
  eq('unhandledrejection registrado', /addEventListener\('unhandledrejection'/.test(gj), true);
  eq('os handlers chamam a ponte da cena', /__frCrash/.test(gj), true);
  // A flag é de MÓDULO e tem de ser checada antes de agir: um erro em loop
  // no update dispararia isto ~60x por segundo.
  eq('a rede global age UMA vez só (um erro em loop não pode disparar 60x/s)',
    /let sessaoDerrubada = false/.test(gj) && /if \(sessaoDerrubada\) return/.test(gj), true);
  eq('...e a flag é marcada logo na entrada, antes de qualquer trabalho',
    gj.indexOf('sessaoDerrubada = true') - gj.indexOf('if (sessaoDerrubada) return') < 120, true);
  eq('erro de RECURSO (svg da arte que não carregou) não derruba a sessão',
    /ev\.target && ev\.target !== window/.test(gj), true);
  eq('unhandledrejection só age com a corrida em andamento (telemetria da home fica muda)',
    /classList\.contains\('started'\)/.test(gj), true);
  eq('...e distingue falha de REDE de bug de programação',
    /fetch|network|firestore/i.test(gj) && /TypeError/.test(gj), true);

  const html = ler('../index.html');
  eq('overlay de falha existe no HTML', /id="crash-overlay"/.test(html), true);
  eq('...nasce escondido', /crash-overlay[\s\S]{0,400}?display:\s*none/.test(html)
    || /#crash-overlay[\s\S]{0,300}?display:\s*none/.test(html), true);
  eq('...e diz ao jogador que a corrida não foi salva',
    /crash-overlay[\s\S]{0,900}?(não foi salva|nao foi salva|não valeu|devolvid)/i.test(html), true);
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
