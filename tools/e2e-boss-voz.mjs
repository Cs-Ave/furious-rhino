// E2E da VOZ DOS CHEFES (v1.12.3) num navegador real:
//   node tools/e2e-boss-voz.mjs   (requer o jogo servido em localhost:3000)
//
// POR QUE ESTA SUÍTE EXISTE. O feedback de 05/09 foi "boss fight todos muito
// parecidos, sempre sendo o chefe da muralha". Não era impressão: os cinco
// chefes são instâncias da MESMA classe paramétrica (BossFight) e, até aqui,
// as cinco defs pediam o mesmo chamado (playBossHorn), a mesma cor de mira
// (0xffd24a) e a mesma dica ("INVISTA na fresta que brilha"). A diferença
// entre eles vivia só na tabela de tiro — que o jogador sente, mas não vê
// nem ouve.
//
// O `test-stats` já guarda o FONTE (nenhuma def repete chamado/cor/nome/dica).
// Esta suíte guarda o COMPORTAMENTO: que o chamado declarado é o método que
// de fato toca, que a moldura fica branca quando o rino está na altura da
// fresta, que a virada dispara uma vez só e na camada certa, e que o
// cronômetro corre. Sem isto, uma def podia declarar `callSfx: 'gongo'`
// (com o), cair no fallback da buzina em silêncio e a queixa voltaria
// idêntica — com os testes todos verdes.
//
// Nada aqui grava no Firestore: sonda `claude-*` de id curto (as rules
// exigem >= 16 chars para criar) + notify_off, como manda o CLAUDE.md §5.
import { chromium } from 'playwright';

const BASE = process.env.ALVO || 'http://localhost:3000';
const results = [];
const ok = (name, cond, extra = '') =>
  results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  // O service worker serve `js/*` do cache (network-first, mas o cache ganha
  // quando a rede demora): a suíte mediria a versão anterior. Mesmo remédio
  // do e2e-legibilidade.
  serviceWorkers: 'block',
});
await context.addInitScript(() => {
  localStorage.setItem('furious_rhino_attempts', '50');
  localStorage.setItem('furious_rhino_record', '5000');
  localStorage.setItem('furious_rhino_player_id', 'claude-e2e-voz');
  localStorage.setItem('furious_rhino_notify_off', '1');
  // Encontros já "vistos" nos cinco: os toasts de ensino não entram na conta
  // (e o caminho do veterano — a placa com a marca — é o que fica exposto)
  ['boss', 'muralha', 'cerco', 'farao', 'boss3'].forEach((k) => {
    localStorage.setItem(`furious_rhino_${k}_seen`, '9');
  });
  // Sem marca anterior: o cronômetro começa sem o sufixo "· melhor"
  ['gate', 'muralha', 'cerco', 'farao', 'guardiao'].forEach((id) => {
    localStorage.removeItem(`furious_rhino_boss_best_${id}`);
  });
});

const errors = [];
const page = await context.newPage();
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`${BASE}/?debug=1`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => {
  const s = window.game && window.game.scene.getScene('GameScene');
  return Boolean(s && s.audio && s.rhino && s.spawnManager);
}, null, { timeout: 60000 });
await page.waitForTimeout(900);

{
  const pwa = page.locator('#pwa-modal');
  if (await pwa.isVisible().catch(() => false)) {
    await page.click('#pwa-skip');
    await page.waitForTimeout(200);
  }
  await page.locator('#start-screen').click({ position: { x: 640, y: 650 } });
  await page.waitForTimeout(600);
}

// Instrumenta o AudioSystem: cada método de chamado passa a contar as
// chamadas em vez de sintetizar. Feito UMA vez, vale para os cinco.
//
// E liga o INVENCÍVEL de debug. Sem ele a suíte morria no meio: o rino fica
// congelado (ver `entrarNaArena`) e, durante os 2,2 s da medição do
// cronômetro na Muralha, os dardos do atirador acertam um alvo parado. Morto
// o rino, o `GameScene.update` early-returna e os três chefes seguintes
// ficavam `dormant` — sem que nada estivesse errado com eles. O
// `BossFight.update` lê a moldura e o relógio ANTES da guarda de invencível
// exatamente para que a medição continue possível aqui.
await page.evaluate(() => {
  const s = window.game.scene.keys.GameScene;
  s.invincible = true;
  window.__voz = {};
  ['playBossHorn', 'playBossSiren', 'playKlaxon', 'playBossGong', 'playBossDrums']
    .forEach((m) => {
      window.__voz[m] = { existe: typeof s.audio[m] === 'function', n: 0 };
      s.audio[m] = () => { window.__voz[m].n++; };
    });
});

// ---------- 1. Os cinco métodos de chamado existem de verdade ----------
{
  const faltando = await page.evaluate(() =>
    Object.entries(window.__voz).filter(([, v]) => !v.existe).map(([m]) => m));
  ok('1. os 5 métodos de chamado existem no AudioSystem',
    faltando.length === 0, faltando.join(', ') || 'todos presentes');
}

// Leva o rino até a arena de um chefe e espera a luta começar.
//
// DUAS armadilhas de sonda, ambas descobertas com a suíte vermelha:
//
// 1. O rino CONGELA (`body.moves = false`). Sem isso ele continua correndo
//    durante as esperas, passa a âncora e o `isBypassed` (que em debug basta
//    x >= âncora) recolhe o chefe: as leituras seguintes eram de uma luta já
//    morta — moldura sem repintar, cronômetro parado. Com `moves = false` o
//    Arcade não integra a posição, mas o update da cena roda inteiro.
// 2. A aproximação é em DUAS ETAPAS. Um salto único até a linha da arena
//    cruza os marcos do caminho, e o Checkpoint da Contenção (1800 m) toca
//    `playKlaxon` — que é também o chamado da Barreira. A primeira etapa
//    absorve as travessias; os contadores só zeram depois dela.
//
// A geografia é de mão única: visitar os chefes em ordem crescente de âncora
// e fazer TODA a medição de cada um enquanto se está nele.
async function entrarNaArena(idx) {
  return page.evaluate(async (i) => {
    const s = window.game.scene.keys.GameScene;
    const f = s.bossFights[i];
    const sp = s.rhino.getSprite();

    // Arena limpa: nada nascido antes pode atirar durante a medição
    ['getWallsGroup', 'getSpikesGroup', 'getAnimalsGroup', 'getTowersGroup',
      'getDartsGroup', 'getRampsGroup'].forEach((g) => {
      s.spawnManager[g]().children.entries.forEach((e) => e.deactivate());
    });
    s.spawnManager.openingIndex = 999;
    s.spawnManager.nextSpawnX = f.def.anchorX + 2000;
    sp.body.moves = false;

    // Etapa 1: fora da arena, só para absorver as travessias de área
    const espera = f.def.anchorX - f.def.arenaPx - 900;
    sp.body.reset(espera, 620);
    s.cameras.main.setScroll(espera - 440, 0);
    await new Promise((r) => setTimeout(r, 450));
    Object.values(window.__voz).forEach((v) => { v.n = 0; });

    // Etapa 2: dentro da linha — o próximo update dispara o startFight
    const x = f.def.anchorX - f.def.arenaPx + 10;
    sp.body.reset(x, 620);
    s.cameras.main.setScroll(x - 440, 0);
    await new Promise((r) => setTimeout(r, 600));
    return {
      id: f.def.id, estado: f.state,
      chamado: f.def.callSfx, cor: f.glowColor,
      nome: f.def.nome, como: f.def.hints.how,
    };
  }, idx);
}

// ---------- 2. Cada chefe toca O SEU chamado ----------
const CHAMADO_METODO = {
  horn: 'playBossHorn', siren: 'playBossSiren', klaxon: 'playKlaxon',
  gong: 'playBossGong', drums: 'playBossDrums',
};
const vistos = [];
for (let i = 0; i < 5; i++) {
  const info = await entrarNaArena(i);
  const contagem = await page.evaluate(() =>
    Object.fromEntries(Object.entries(window.__voz).map(([m, v]) => [m, v.n])));
  const esperado = CHAMADO_METODO[info.chamado];
  const tocados = Object.entries(contagem).filter(([, n]) => n > 0).map(([m]) => m);
  ok(`2.${i + 1} ${info.nome}: entrou em luta e tocou SÓ o próprio chamado (${info.chamado})`,
    info.estado === 'fight' && tocados.length === 1 && tocados[0] === esperado,
    `estado=${info.estado} tocou=[${tocados}] esperado=${esperado}`);
  vistos.push(info);

  // ---------- 6. Cronômetro de mundo (medido NA Muralha) ----------
  if (i === 1) {
    const r = await page.evaluate(async () => {
      const s = window.game.scene.keys.GameScene;
      const f = s.bossFights[1];
      const inicio = f.timerText.text;
      const visivel = f.timerText.visible;
      await new Promise((res) => setTimeout(res, 2200));
      return {
        inicio, visivel, depois: f.timerText.text,
        comMarca: /melhor/.test(f.timerText.text), estado: f.state,
      };
    });
    ok('6. o cronômetro da luta está visível e correndo',
      r.visivel && /^\d+s$/.test(r.depois) && r.depois !== r.inicio,
      `"${r.inicio}" → "${r.depois}" estado=${r.estado}`);
    ok('6b. sem marca anterior o cronômetro não promete "melhor"',
      !r.comMarca, r.depois);
  }

  // ---------- 4 e 5. Moldura e virada (medidas NO FARAÓ) ----------
  // O Faraó é quem tem CINCO alturas diferentes — é nele que a leitura de
  // altura (a coisa que torna a ordem de camadas perceptível, e portanto os
  // chefes distinguíveis) mais importa.
  if (i === 3) {
    const r = await page.evaluate(() => {
      const s = window.game.scene.keys.GameScene;
      const f = s.bossFights[3];
      const sp = s.rhino.getSprite();
      const b = f.layerBounds();
      const h = sp.body.height;
      const ler = () => ({ cor: f.glowFrame.strokeColor, largura: f.glowFrame.lineWidth });

      // A origem do rino é o PÉ: o y do reset é a linha do chão do corpo.
      // Bem abaixo da banda = fora; pé logo abaixo do centro = dentro.
      sp.body.reset(f.def.anchorX - 300, b.bottom + h + 60);
      f.updateAim(sp);
      const fora = ler();

      sp.body.reset(f.def.anchorX - 300, b.center + h / 2);
      f.updateAim(sp);
      const dentro = ler();

      sp.body.reset(f.def.anchorX - 300, b.bottom + h + 60);
      f.updateAim(sp);
      const saiu = f.glowFrame.strokeColor;

      return { fora, dentro, saiu, cor: f.glowColor, estado: f.state };
    });
    ok('4. fora da fresta a moldura usa a cor do chefe',
      r.fora.cor === r.cor && r.estado === 'fight',
      `0x${r.fora.cor.toString(16)} vs 0x${r.cor.toString(16)} estado=${r.estado}`);
    ok('4b. na altura da fresta a moldura fica BRANCA e mais grossa',
      r.dentro.cor === 0xffffff && r.dentro.largura > r.fora.largura,
      `cor=0x${r.dentro.cor.toString(16)} largura ${r.fora.largura}→${r.dentro.largura}`);
    ok('4c. ao sair da fresta a moldura volta à cor do chefe (não fica presa)',
      r.saiu === r.cor, `0x${r.saiu.toString(16)}`);

    const m = await page.evaluate(async () => {
      const s = window.game.scene.keys.GameScene;
      const f = s.bossFights[3]; // Faraó: 5 camadas, virada em 2 restantes
      Object.values(window.__voz).forEach((v) => { v.n = 0; });
      const alvo = f.def.midpoint.left;
      const trilha = [];
      // Para em 1 camada: chamar defeat aqui encerraria a luta antes da hora
      while (f.layersLeft() > 1) {
        f.breakLayer();
        trilha.push({ restam: f.layersLeft(), virou: f.midpointDone });
      }
      const antes = trilha.filter((t) => t.restam > alvo).every((t) => !t.virou);
      const noAlvo = trilha.find((t) => t.restam === alvo);
      return {
        alvo, antes, noAlvo: Boolean(noAlvo && noAlvo.virou),
        chamadasGong: window.__voz.playBossGong.n, trilha,
      };
    });
    ok('5. a virada não dispara antes da camada declarada',
      m.antes, JSON.stringify(m.trilha));
    ok('5b. a virada dispara exatamente ao chegar na camada declarada',
      m.noAlvo, `left=${m.alvo}`);
    ok('5c. a virada toca o chamado UMA vez só (não repete a cada camada)',
      m.chamadasGong === 1, `chamadas=${m.chamadasGong}`);
  }
}

// ---------- 3. Nenhuma voz se repete entre os cinco (em runtime) ----------
{
  const u = (k) => new Set(vistos.map((v) => v[k])).size;
  ok('3. em runtime os 5 chefes têm chamado, cor, nome e dica distintos',
    u('chamado') === 5 && u('cor') === 5 && u('nome') === 5 && u('como') === 5,
    `chamados=${u('chamado')} cores=${u('cor')} nomes=${u('nome')} dicas=${u('como')}`);
  ok('3b. nenhuma dica ficou com o texto genérico antigo',
    vistos.every((v) => !/INVISTA na fresta que brilha/.test(v.como)),
    vistos.map((v) => v.nome).join(', '));
}

// ---------- 7. A marca pessoal: guardada fora do debug, nunca dentro ----------
{
  const r = await page.evaluate(async () => {
    const s = window.game.scene.keys.GameScene;
    const SM = s.storage || window.StorageManager;
    const ler = (id) => parseInt(localStorage.getItem(`furious_rhino_boss_best_${id}`), 10) || 0;
    const f = s.bossFights[1]; // Muralha: onDefeat é a Brecha, não encerra a corrida

    // (a) em debug NÃO grava — o painel teleporta e invencibiliza
    s.registry.set('debug', true);
    f.state = 'fight'; f.fightMs = 7000; f.bestMs = 0;
    f.defeat();
    const emDebug = ler('muralha');

    // (b) fora do debug grava
    s.registry.set('debug', false);
    f.state = 'fight'; f.fightMs = 7000; f.bestMs = 0;
    f.defeat();
    const semDebug = ler('muralha');

    // (c) tempo PIOR não sobrescreve a marca
    f.state = 'fight'; f.fightMs = 20000; f.bestMs = semDebug;
    f.defeat();
    const depoisDePior = ler('muralha');

    // (d) tempo melhor sobrescreve
    f.state = 'fight'; f.fightMs = 4000; f.bestMs = semDebug;
    f.defeat();
    const depoisDeMelhor = ler('muralha');

    s.registry.set('debug', true);
    return { emDebug, semDebug, depoisDePior, depoisDeMelhor, temSM: Boolean(SM) };
  });
  ok('7. em ?debug=1 a marca NÃO é gravada (teleporte não vira recorde)',
    r.emDebug === 0, `gravou=${r.emDebug}`);
  ok('7b. fora do debug a marca é gravada', r.semDebug === 7000, `ms=${r.semDebug}`);
  ok('7c. tempo pior não sobrescreve a marca',
    r.depoisDePior === 7000, `ms=${r.depoisDePior}`);
  ok('7d. tempo melhor sobrescreve a marca',
    r.depoisDeMelhor === 4000, `ms=${r.depoisDeMelhor}`);
}

// ---------- 8. "Sem Um Arranhão": vencer o portão sem quicar ----------
{
  const r = await page.evaluate(() => {
    const s = window.game.scene.keys.GameScene;
    const f = s.bossFights[0];

    s.gateClean = false;
    s.runBossBounces = 2;
    f.state = 'fight'; f.fightMs = 5000;
    f.defeat();
    const comQuique = Boolean(s.gateClean);

    s.gateClean = false;
    s.runBossBounces = 0;
    f.state = 'fight'; f.fightMs = 5000;
    f.defeat();
    return { comQuique, semQuique: Boolean(s.gateClean) };
  });
  ok('8. quicando, a medalha do portão limpo NÃO é marcada', !r.comQuique);
  ok('8b. sem quicar nenhuma vez, a flag gateClean é marcada', r.semQuique);
}

// ---------- 9. A UI da luta some no desfecho ----------
{
  const r = await page.evaluate(() => {
    const s = window.game.scene.keys.GameScene;
    const f = s.bossFights[1];
    return {
      glow: f.glow.visible, contorno: f.glowOutline.visible,
      moldura: f.glowFrame.visible, relogio: f.timerText.visible,
    };
  });
  ok('9. vencido o chefe, mira/contorno/moldura/cronômetro somem juntos',
    !r.glow && !r.contorno && !r.moldura && !r.relogio, JSON.stringify(r));
}

ok('10. nenhum erro de JS', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();
console.log(results.join('\n'));
const fails = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - fails}/${results.length} OK`);
process.exit(fails ? 1 : 0);
