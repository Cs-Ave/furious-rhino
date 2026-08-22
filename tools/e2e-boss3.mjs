// E2E da bossfight do GUARDIÃO DO FIM (v1.8.5, 9995m) num navegador real:
//   node tools/e2e-boss3.mjs   (requer o jogo servido em localhost:3000)
//
// O Guardião é a terceira instância do BossFight paramétrico (tools/
// e2e-boss.mjs é a suíte-mãe — mesma física de banda + clamp + quique). O
// que ESTA suíte guarda de específico:
//   - as 5 camadas em palíndromo (GROUND → MID → HIGH → MID → GROUND);
//   - a arena que vive DENTRO dos 1500px finais da LENDA (zona sem spawn do
//     fim do mundo — nada pode nascer ali);
//   - a vitória que É a LENDA: legend = true + endGame(true) + cutscene,
//     com a linha do Guardião (5×25) no detalhamento;
//   - a causa de morte própria ('boss3', título TRANQUILIZADO).
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const ANCHOR = 399800; // Constants.BOSS3_ANCHOR_PX (~9995m)
const results = [];
const ok = (name, cond, extra = '') =>
  results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await context.addInitScript(() => {
  localStorage.setItem('furious_rhino_attempts', '50');
  // Sonda claude-*, id curto DE PROPÓSITO: as rules exigem >= 16 chars para
  // criar, então esta suíte nunca grava um doc na coleção de produção
  localStorage.setItem('furious_rhino_player_id', 'claude-e2e-boss3');
  // Sem pushes no celular do dono a cada corrida da suíte
  localStorage.setItem('furious_rhino_notify_off', '1');
  // Encontros já "vistos" nos TRÊS bosses: os toasts de ensino não entram
  // na medição (portão e Cerco ficam para trás no teleporte)
  localStorage.setItem('furious_rhino_boss_seen', '9');
  localStorage.setItem('furious_rhino_boss2_seen', '9');
  localStorage.setItem('furious_rhino_boss3_seen', '9');
});

const errors = [];
const page = await context.newPage();
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

// Começar (e recomeçar, na seção 8) uma corrida do zero
const startRun = async () => {
  await page.waitForTimeout(1500);
  const pwa = page.locator('#pwa-modal');
  if (await pwa.isVisible().catch(() => false)) {
    await page.click('#pwa-skip');
    await page.waitForTimeout(200);
  }
  await page.locator('#start-screen').click({ position: { x: 640, y: 650 } });
  await page.waitForTimeout(600);
};

// Teleporte para a boca da arena do Guardião, simulando quem já passou pelo
// portão (gateReached/escaped) — o Cerco se recolhe sozinho pelo isBypassed
// (x >= BOSS2_ANCHOR_PX). Zona limpa, roleta desligada, spawn além do mundo.
const teleportToArena = async () => page.evaluate(async () => {
  const s = window.game.scene.keys.GameScene;
  const sp = s.rhino.getSprite();
  ['getWallsGroup', 'getSpikesGroup', 'getAnimalsGroup', 'getTowersGroup',
    'getDartsGroup', 'getRampsGroup'].forEach((g) => {
    s.spawnManager[g]().children.entries.forEach((e) => e.deactivate());
  });
  s.spawnManager.openingIndex = 999;
  s.spawnManager.nextSpawnX = 399800 + 1200;
  s.gateReached = true;
  s.escaped = true;
  sp.body.reset(399800 - 1400, 620);
  s.cameras.main.setScroll(399800 - 1400 - 440, 0);
  // Espera a luta começar (gatilho em ANCHOR - BOSS_ARENA_PX)
  await new Promise((resolve) => {
    const t0 = performance.now();
    const tick = () => (s.boss3Fight.state === 'fight' || performance.now() - t0 > 8000
      ? resolve() : requestAnimationFrame(tick));
    tick();
  });
  const fightStarted = s.boss3Fight.state === 'fight';
  const hunterEngaged = s.boss3Fight.hunter.engaged;
  // Isola a física: o rifle fica de fora (a morte tem teste próprio)
  s.boss3Fight.hunter.engaged = false;
  s.boss3Fight.hunter.laser.clear();
  s.spawnManager.getDartsGroup().children.entries.forEach((d) => d.deactivate());
  // Câmera travada: espera o tween de 600ms assentar
  await new Promise((r2) => setTimeout(r2, 900));
  return {
    fightStarted,
    hunterEngaged,
    camFollowing: Boolean(s.cameras.main._follow),
    scrollX: s.cameras.main.scrollX,
  };
});

await page.goto(`${BASE}/?debug=1`, { waitUntil: 'networkidle' });
await startRun();

// ---------- 1. Texturas e arte do Guardião existem ----------
{
  const missing = await page.evaluate(() => {
    const s = window.game.scene.keys.GameScene;
    const out = [];
    ['boss3-gate-5', 'boss3-gate-4', 'boss3-gate-3', 'boss3-gate-2',
      'boss3-gate-1', 'boss3-hunter', 'boss3-hunter-aim'].forEach((k) => {
      if (!s.textures.exists(k)) out.push(k);
    });
    return out;
  });
  ok('1. texturas da última cerca e do Caçador-Mor existem',
    missing.length === 0, missing.join(', '));
}

// ---------- 2-4. Entrada na arena + o loop do quique (anti-soft-lock) ----------
{
  const e = await teleportToArena();
  ok('2. a luta do Guardião começa e trava a câmera na arena',
    e.fightStarted && e.hunterEngaged && !e.camFollowing &&
    Math.abs(e.scrollX - (ANCHOR - 1040)) < 10,
    `fight=${e.fightStarted} rifle=${e.hunterEngaged} follow=${e.camFollowing} scrollX=${e.scrollX.toFixed(0)}`);

  const r = await page.evaluate(async () => {
    const s = window.game.scene.keys.GameScene;
    const sp = s.rhino.getSprite();

    // Traça o loop SEM dash até 3 quiques: contato → quique → retomada
    const trace = [];
    const sample = () => trace.push({
      t: s.time.now, x: sp.body.center.x, vx: Math.round(sp.body.velocity.x),
      q: s.runBoss3Bounces, over: s.gameOver,
    });
    s.events.on('postupdate', sample);
    await new Promise((resolve) => {
      const t0 = s.time.now;
      const tick = () => ((s.runBoss3Bounces >= 3 || s.gameOver || s.time.now - t0 > 20000)
        ? resolve() : requestAnimationFrame(tick));
      tick();
    });
    await new Promise((r2) => setTimeout(r2, 1500));
    s.events.off('postupdate', sample);

    // Nada nasceu na arena durante a luta (ela mora nos 1500px da LENDA —
    // a zona sem spawn do fim do mundo vai de WORLD_END-1500 até o infinito)
    const spawnsNaArena = [];
    ['getWallsGroup', 'getSpikesGroup', 'getAnimalsGroup', 'getTowersGroup'].forEach((g) => {
      s.spawnManager[g]().children.entries.forEach((e2) => {
        if (e2.active && e2.x > 399800 - 1300 && e2.x < 399800 + 1000) spawnsNaArena.push(e2.x);
      });
    });

    return {
      trace,
      bounces: s.runBoss3Bounces,
      gameOver: s.gameOver,
      layerIdx: s.boss3Fight.layerIdx,
      spawnsNaArena,
    };
  });

  // O assert que mataria a rota de corpo sólido (o soft-lock das rampas):
  // depois de CADA quique o rino desacelera, volta e re-acelera sozinho
  // para a frente em < 60 frames
  const tr = r.trace;
  let recovered = 0;
  let bouncesSeen = 0;
  for (let i = 1; i < tr.length; i++) {
    if (tr[i].q > tr[i - 1].q) {
      // Quique colado no fim do traço não tem janela para medir a retomada
      if (i + 60 > tr.length) continue;
      bouncesSeen++;
      const win = tr.slice(i, i + 60);
      if (win.some((s) => s.vx >= 250)) recovered++;
    }
  }
  const minX = Math.min(...tr.map((s) => s.x));
  const maxX = Math.max(...tr.map((s) => s.x));
  ok('3. quica sem morrer e volta a correr sozinho (anti-soft-lock)',
    r.bounces >= 3 && !r.gameOver && bouncesSeen === recovered && bouncesSeen >= 2 &&
    minX > ANCHOR - 1150 && maxX < ANCHOR - 60,
    `${r.bounces} quiques, ${recovered}/${bouncesSeen} retomadas, x=[${minX.toFixed(0)}, ${maxX.toFixed(0)}]`);

  ok('4. contato sem dash não quebra camada e nada spawna na arena da LENDA',
    r.layerIdx === 0 && r.spawnsNaArena.length === 0,
    `camadas=${r.layerIdx} spawns=${JSON.stringify(r.spawnsNaArena)}`);
}

// ---------- 5. Fúria negada na arena do Guardião ----------
// O FurySystem.isBlocked varre a LISTA scene.bossFights — qualquer boss em
// combate tranca o medidor, não só o do portão
{
  const r = await page.evaluate(async () => {
    const s = window.game.scene.keys.GameScene;
    s.furySystem.charge = 1;
    // o tranca/destranca do medidor assenta no próximo update
    await new Promise((r2) => setTimeout(r2, 150));
    const denied0 = s.runFuryDenied;
    s.doSpecial();
    return {
      state: s.boss3Fight.state,
      rampage: s.furySystem.rampage,
      charge: s.furySystem.charge,
      denied0,
      denied: s.runFuryDenied,
    };
  });
  ok('5. doSpecial na arena do Guardião é negado: sem rampage, contador n sobe',
    r.state === 'fight' && !r.rampage && r.charge === 1 && r.denied === r.denied0 + 1,
    `state=${r.state} rampage=${r.rampage} charge=${r.charge} denied=${r.denied0}→${r.denied}`);
}

// ---------- 6-7. O palíndromo de 5 investidas + a LENDA ----------
{
  const r = await page.evaluate(async () => {
    const s = window.game.scene.keys.GameScene;
    const sp = s.rhino.getSprite();
    const faceX = 399800 - 120;

    // Dash de curta distância: alinhado à banda, a 160px da face o dash de
    // 200ms encosta ainda ATIVO (mesma técnica da suíte-mãe)
    const dashAt = async (feetY, wantLayer) => {
      s.rhino.knockbackMsLeft = 0;
      s.rhino.dashState = 'idle';
      // O rino pode ter quicado AGORA MESMO (loop perpétuo entre os testes)
      s.boss3Fight.contactCdMs = 0;
      sp.body.reset(faceX - 160, feetY);
      s.rhino.onRightPress();
      await new Promise((resolve) => {
        const t0 = performance.now();
        const tick = () => ((s.boss3Fight.layerIdx >= wantLayer || s.gameOver ||
          performance.now() - t0 > 4000) ? resolve() : requestAnimationFrame(tick));
        tick();
      });
      return { layer: s.boss3Fight.layerIdx, tex: s.boss3Sprite.texture.key };
    };

    // A ordem do Guardião é o palíndromo GROUND → MID → HIGH → MID → GROUND
    const chao1 = await dashAt(620, 1);  // banda ground (feet no chão)
    const meio1 = await dashAt(400, 2);  // banda mid (dash aéreo: gravidade off)
    const alto = await dashAt(200, 3);   // banda high
    const meio2 = await dashAt(400, 4);  // MID de novo, descendo
    const chao2 = await dashAt(620, 5);  // GROUND fecha o palíndromo → LENDA
    await new Promise((r2) => setTimeout(r2, 400));

    return {
      chao1, meio1, alto, meio2, chao2,
      state: s.boss3Fight.state,
      legend: s.legend,
      won: s.won,
      gameOver: s.gameOver,
      layers: s.runBoss3Layers,
      hunterEngaged: s.boss3Fight.hunter.engaged,
      banner: {
        text: document.getElementById('victory-banner').textContent,
        hidden: document.getElementById('victory-banner').hidden,
      },
      recordMsg: document.getElementById('win-record-message').textContent,
      breakdown: document.getElementById('win-final-breakdown').textContent,
    };
  });

  ok('6. investida alinhada quebra o palíndromo GROUND → MID → HIGH → MID → GROUND',
    r.chao1.layer === 1 && r.chao1.tex === 'boss3-gate-4' &&
    r.meio1.layer === 2 && r.meio1.tex === 'boss3-gate-3' &&
    r.alto.layer === 3 && r.alto.tex === 'boss3-gate-2' &&
    r.meio2.layer === 4 && r.meio2.tex === 'boss3-gate-1' &&
    r.chao2.layer === 5,
    `${r.chao1.layer}/${r.chao1.tex} → ${r.meio1.layer}/${r.meio1.tex} → ${r.alto.layer}/${r.alto.tex} → ${r.meio2.layer}/${r.meio2.tex} → ${r.chao2.layer}`);

  // O CONTRASTE com o Cerco: aqui a última camada É o fim — legend + won +
  // gameOver, cutscene com o banner de LENDA e a linha do Guardião (5×25 =
  // 125, peso bossLayer) no detalhamento da vitória
  ok('7. a 5ª camada dispara a LENDA (endGame won) com a linha do Guardião no detalhamento',
    r.state === 'defeated' && !r.hunterEngaged &&
    r.legend === true && r.won === true && r.gameOver === true && r.layers === 5 &&
    !r.banner.hidden && /LENDA/.test(r.banner.text) &&
    /LENDA/.test(r.recordMsg) && /Camadas do Guardião ×5 \+125/.test(r.breakdown),
    `legend=${r.legend} won=${r.won} over=${r.gameOver} l=${r.layers} banner="${r.banner.text}" msg="${r.recordMsg}"`);

  // O overlay de vitória abre depois da cutscene (~4s, pulável) — o skip por
  // toque é o caminho do jogador apressado, então é o que o teste usa
  await page.mouse.click(640, 360);
  const overlayShown = await page.waitForFunction(
    () => document.getElementById('game-win').style.display === 'block',
    null, { timeout: 8000 }
  ).then(() => true).catch(() => false);
  ok('7b. overlay de vitória aberto (cutscene pulada com 1 toque)',
    overlayShown, `overlay=${overlayShown}`);
}

// ---------- 8. Morte pelo rifle = causa própria 'boss3' ----------
// A vitória encerrou a corrida, então a morte precisa de uma corrida nova:
// recarrega a página (o initScript re-semeia a sonda) e volta à arena
{
  await page.goto(`${BASE}/?debug=1`, { waitUntil: 'networkidle' });
  await startRun();
  const e = await teleportToArena();
  const r = await page.evaluate(async () => {
    const s = window.game.scene.keys.GameScene;
    const sp = s.rhino.getSprite();
    let deaths0 = {};
    try { deaths0 = JSON.parse(localStorage.getItem('furious_rhino_deaths')) || {}; } catch (err) { /* n/a */ }
    // Rino ASSENTADO no chão da arena, longe da face (sem quique no meio)
    sp.body.reset(399800 - 900, 620);
    await new Promise((r2) => setTimeout(r2, 300));
    // Dardo do Caçador-Mor disparado direto contra o rino (sem esperar
    // cadência): a CAUSA viaja no dardo — fromBoss = 'boss3'
    s.spawnManager.fireDart(sp.x + 260, sp.y - 30, -600, 0, false, 'boss3');
    await new Promise((resolve) => {
      const t0 = performance.now();
      const tick = () => ((s.gameOver || performance.now() - t0 > 4000)
        ? resolve() : requestAnimationFrame(tick));
      tick();
    });
    let deaths = {};
    try { deaths = JSON.parse(localStorage.getItem('furious_rhino_deaths')) || {}; } catch (err) { /* n/a */ }
    return {
      fightWasOn: true,
      gameOver: s.gameOver,
      cause: s.deathCause,
      title: document.getElementById('game-over-title').textContent,
      before: deaths0.boss3 || 0,
      after: deaths.boss3 || 0,
    };
  });
  ok('8. dardo do Caçador-Mor mata com causa "boss3" e título de tranquilizado',
    e.fightStarted && r.gameOver && r.cause === 'boss3' &&
    /TRANQUILIZADO/.test(r.title) && r.after === r.before + 1,
    `fight=${e.fightStarted} cause=${r.cause} title="${r.title}" deaths.boss3=${r.before}→${r.after}`);
}

// ---------- 9. Zero erro de JS ----------
const fatal = errors.filter((e) => !/net::|Failed to load resource|ERR_/.test(e));
ok('9. nenhum erro de JS', fatal.length === 0, fatal.slice(0, 3).join(' | '));

await browser.close();
console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} OK`);
process.exit(failed ? 1 : 0);
