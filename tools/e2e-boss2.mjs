// E2E da bossfight do CERCO (v1.8.5, 2000m) num navegador real:
//   node tools/e2e-boss2.mjs   (requer o jogo servido em localhost:3000)
//
// O Cerco é o BossFight paramétrico do portão (tools/e2e-boss.mjs é a
// suíte-mãe — mesma física: contato por banda de x + clamp posicional +
// quique via Rhino.beginKnockback). O que ESTA suíte guarda de específico:
//   - as 4 camadas fora da ordem "de baixo para cima" (MID → GROUND → HIGH
//     → MID): decorar a sequência do portão não serve, é preciso ler o glow;
//   - a vitória que NÃO encerra nada (defeatBoss2: sem crossGate, sem
//     gameOver — a barricada vira boss2-gate-broken, o +150 nasce ao vivo e
//     o rino segue avenida adentro);
//   - a causa de morte própria ('boss2', título CAPTURADO) e o enrage de
//     45s que desce a cadência UM degrau (BOSS2_ENRAGE_MS).
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const ANCHOR = 80000; // Constants.BOSS2_ANCHOR_PX (~2000m)
const results = [];
const ok = (name, cond, extra = '') =>
  results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await context.addInitScript(() => {
  localStorage.setItem('furious_rhino_attempts', '50');
  // Sonda claude-*, id curto DE PROPÓSITO: as rules exigem >= 16 chars para
  // criar, então esta suíte nunca grava um doc na coleção de produção
  localStorage.setItem('furious_rhino_player_id', 'claude-e2e-boss2');
  // Sem pushes no celular do dono a cada corrida da suíte
  localStorage.setItem('furious_rhino_notify_off', '1');
  // Encontros já "vistos" nos DOIS bosses do caminho: os toasts de ensino
  // não entram na medição (o portão fica para trás no teleporte, mas a
  // chave dele também é semeada por higiene)
  localStorage.setItem('furious_rhino_boss_seen', '9');
  localStorage.setItem('furious_rhino_boss2_seen', '9');
});

const errors = [];
const page = await context.newPage();
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`${BASE}/?debug=1`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

{
  const pwa = page.locator('#pwa-modal');
  if (await pwa.isVisible().catch(() => false)) {
    await page.click('#pwa-skip');
    await page.waitForTimeout(200);
  }
  await page.locator('#start-screen').click({ position: { x: 640, y: 650 } });
  await page.waitForTimeout(600);
}

// ---------- 1. Texturas e arte do Cerco existem ----------
{
  const missing = await page.evaluate(() => {
    const s = window.game.scene.keys.GameScene;
    const out = [];
    ['boss2-gate-4', 'boss2-gate-3', 'boss2-gate-2', 'boss2-gate-1',
      'boss2-gate-broken', 'boss2-hunter', 'boss2-hunter-aim'].forEach((k) => {
      if (!s.textures.exists(k)) out.push(k);
    });
    return out;
  });
  ok('1. texturas da barricada do Cerco e do Capturador existem',
    missing.length === 0, missing.join(', '));
}

// ---------- 2-5. Entrada na arena + o loop do quique (anti-soft-lock) ----------
{
  const r = await page.evaluate(async () => {
    const s = window.game.scene.keys.GameScene;
    const sp = s.rhino.getSprite();

    // Zona limpa e sem roleta dentro da janela do teste
    ['getWallsGroup', 'getSpikesGroup', 'getAnimalsGroup', 'getTowersGroup',
      'getDartsGroup', 'getRampsGroup'].forEach((g) => {
      s.spawnManager[g]().children.entries.forEach((e) => e.deactivate());
    });
    s.spawnManager.openingIndex = 999;
    s.spawnManager.nextSpawnX = 80000 + 1000;

    // Simula quem já passou pelo portão dos 1000m ANTES do teleporte: o
    // isBypassed do portão lê gateReached e recolhe a luta legada — sem
    // isto o portão dormente acordaria e clamparia o rino de volta
    s.gateReached = true;
    s.escaped = true;

    sp.body.reset(80000 - 1400, 620);
    s.cameras.main.setScroll(80000 - 1400 - 440, 0);

    // Espera a luta começar (gatilho em ANCHOR - BOSS_ARENA_PX)
    await new Promise((resolve) => {
      const t0 = performance.now();
      const tick = () => (s.boss2Fight.state === 'fight' || performance.now() - t0 > 8000
        ? resolve() : requestAnimationFrame(tick));
      tick();
    });
    const fightStarted = s.boss2Fight.state === 'fight';
    const hunterEngaged = s.boss2Fight.hunter.engaged;
    // Isola a física do quique: o canhão de redes fica de fora deste teste
    // (a morte pela rede tem teste próprio, determinístico, no fim)
    s.boss2Fight.hunter.engaged = false;
    s.boss2Fight.hunter.laser.clear();
    s.spawnManager.getDartsGroup().children.entries.forEach((d) => d.deactivate());

    // Câmera travada: espera o tween de 600ms assentar
    await new Promise((r2) => setTimeout(r2, 900));
    const camFollowing = Boolean(s.cameras.main._follow);
    const scrollX = s.cameras.main.scrollX;

    // Traça o loop SEM dash até 3 quiques: contato → quique → retomada
    const trace = [];
    const sample = () => trace.push({
      t: s.time.now, x: sp.body.center.x, vx: Math.round(sp.body.velocity.x),
      q: s.runBoss2Bounces, over: s.gameOver,
    });
    s.events.on('postupdate', sample);
    await new Promise((resolve) => {
      const t0 = s.time.now;
      const tick = () => ((s.runBoss2Bounces >= 3 || s.gameOver || s.time.now - t0 > 20000)
        ? resolve() : requestAnimationFrame(tick));
      tick();
    });
    await new Promise((r2) => setTimeout(r2, 1500));
    s.events.off('postupdate', sample);

    // Nada nasceu na arena durante a luta
    const spawnsNaArena = [];
    ['getWallsGroup', 'getSpikesGroup', 'getAnimalsGroup', 'getTowersGroup'].forEach((g) => {
      s.spawnManager[g]().children.entries.forEach((e) => {
        if (e.active && e.x > 80000 - 1300 && e.x < 80000 + 1000) spawnsNaArena.push(e.x);
      });
    });

    return {
      fightStarted, hunterEngaged, camFollowing, scrollX, trace,
      bounces: s.runBoss2Bounces, gameOver: s.gameOver,
      layerIdx: s.boss2Fight.layerIdx, spawnsNaArena,
    };
  });

  ok('2. a luta do Cerco começa e trava a câmera na arena',
    r.fightStarted && r.hunterEngaged && !r.camFollowing &&
    Math.abs(r.scrollX - (ANCHOR - 1040)) < 10,
    `fight=${r.fightStarted} rede=${r.hunterEngaged} follow=${r.camFollowing} scrollX=${r.scrollX.toFixed(0)}`);

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
  ok('3. quica sem morrer e volta a correr sozinho (anti-soft-lock)',
    r.bounces >= 3 && !r.gameOver && bouncesSeen === recovered && bouncesSeen >= 2,
    `${r.bounces} quiques, ${recovered}/${bouncesSeen} retomadas de vx>=250`);

  ok('4. o recuo fica dentro da arena e nada atravessa a barricada',
    minX > ANCHOR - 1150 && Math.max(...tr.map((s) => s.x)) < ANCHOR - 60,
    `x=[${minX.toFixed(0)}, ${Math.max(...tr.map((s) => s.x)).toFixed(0)}]`);

  ok('5. contato sem dash não quebra camada e nada spawna na arena',
    r.layerIdx === 0 && r.spawnsNaArena.length === 0,
    `camadas=${r.layerIdx} spawns=${JSON.stringify(r.spawnsNaArena)}`);
}

// ---------- 5b. Fúria negada na arena do Cerco ----------
// O FurySystem.isBlocked varre a LISTA scene.bossFights — o bloqueio da v1.8
// tem de valer em QUALQUER arena, não só na do portão
{
  const r = await page.evaluate(async () => {
    const s = window.game.scene.keys.GameScene;
    s.furySystem.charge = 1;
    // o tranca/destranca do medidor assenta no próximo update
    await new Promise((r2) => setTimeout(r2, 150));
    const denied0 = s.runFuryDenied;
    s.doSpecial();
    return {
      state: s.boss2Fight.state,
      rampage: s.furySystem.rampage,
      charge: s.furySystem.charge,
      denied0,
      denied: s.runFuryDenied,
    };
  });
  ok('5b. doSpecial na arena do Cerco é negado: sem rampage, contador n sobe',
    r.state === 'fight' && !r.rampage && r.charge === 1 && r.denied === r.denied0 + 1,
    `state=${r.state} rampage=${r.rampage} charge=${r.charge} denied=${r.denied0}→${r.denied}`);
}

// ---------- 6-8. As 4 investidas na ordem NÃO-monotônica + a vitória que continua ----------
{
  const r = await page.evaluate(async () => {
    const s = window.game.scene.keys.GameScene;
    const sp = s.rhino.getSprite();
    const faceX = 80000 - 120;
    // O bônus da corrida ANTES da luta: a vitória do Cerco tem de somar
    // 4 camadas + o prêmio, ao vivo, exatamente como o breakdown recomputa
    const bonus0 = s.runBonus;

    // Dash de curta distância: alinhado à banda, a 160px da face o dash de
    // 200ms encosta ainda ATIVO (mesma técnica da suíte-mãe)
    const dashAt = async (feetY, wantLayer) => {
      s.rhino.knockbackMsLeft = 0;
      s.rhino.dashState = 'idle';
      // O rino pode ter quicado AGORA MESMO (loop perpétuo entre os testes)
      s.boss2Fight.contactCdMs = 0;
      sp.body.reset(faceX - 160, feetY);
      s.rhino.onRightPress();
      await new Promise((resolve) => {
        const t0 = performance.now();
        const tick = () => ((s.boss2Fight.layerIdx >= wantLayer || s.gameOver ||
          performance.now() - t0 > 4000) ? resolve() : requestAnimationFrame(tick));
        tick();
      });
      return { layer: s.boss2Fight.layerIdx, tex: s.boss2Sprite.texture.key };
    };

    // A ordem do Cerco é MID → GROUND → HIGH → MID (não-monotônica: obriga a
    // ler o glow em vez de decorar o chão → meio → alto do portão)
    const meio1 = await dashAt(400, 1);  // banda mid (dash aéreo: gravidade off)
    const chao = await dashAt(620, 2);   // banda ground (feet no chão)
    const alto = await dashAt(200, 3);   // banda high
    const meio2 = await dashAt(400, 4);  // MID de novo — a última camada
    await new Promise((r2) => setTimeout(r2, 700));

    // Pós-vitória o rino tem de voltar a correr SOZINHO (a corrida continua)
    let vxBack = 0;
    await new Promise((resolve) => {
      const t0 = performance.now();
      const tick = () => {
        vxBack = Math.max(vxBack, sp.body.velocity.x);
        return (vxBack >= 250 || performance.now() - t0 > 4000)
          ? resolve() : requestAnimationFrame(tick);
      };
      tick();
    });

    return {
      meio1, chao, alto, meio2,
      state: s.boss2Fight.state,
      gameOver: s.gameOver,
      gateTex: s.boss2Sprite.texture.key,
      layers: s.runBoss2Layers,
      bonusDelta: s.runBonus - bonus0,
      hunterEngaged: s.boss2Fight.hunter.engaged,
      camFollowing: Boolean(s.cameras.main._follow),
      vxBack,
    };
  });

  ok('6. investida alinhada quebra na ordem MID → GROUND → HIGH → MID',
    r.meio1.layer === 1 && r.meio1.tex === 'boss2-gate-3' &&
    r.chao.layer === 2 && r.chao.tex === 'boss2-gate-2' &&
    r.alto.layer === 3 && r.alto.tex === 'boss2-gate-1' &&
    r.meio2.layer === 4,
    `${r.meio1.layer}/${r.meio1.tex} → ${r.chao.layer}/${r.chao.tex} → ${r.alto.layer}/${r.alto.tex} → ${r.meio2.layer}`);

  // O CONTRASTE com o portão: a 4ª camada NÃO chama crossGate e NÃO encerra
  // a corrida. O bônus ao vivo sobe 4×25 (camadas, SCORE_WEIGHTS.bossLayer)
  // + 150 (vitória, SCORE_WEIGHTS.boss2) = 250 — a MESMA conta que o
  // runBonus recomputa de e >= 4 (guardada em tools/test-score.mjs).
  ok('7. a 4ª camada derruba a barricada SEM encerrar a corrida (+250 ao vivo)',
    r.state === 'defeated' && !r.gameOver && r.gateTex === 'boss2-gate-broken' &&
    r.layers === 4 && r.bonusDelta === 4 * 25 + 150 && r.vxBack >= 250,
    `state=${r.state} over=${r.gameOver} tex=${r.gateTex} e=${r.layers} Δbonus=${r.bonusDelta} vx=${r.vxBack.toFixed(0)}`);

  ok('8. o Capturador cai e a câmera volta a seguir o rino',
    !r.hunterEngaged && r.camFollowing,
    `rede=${r.hunterEngaged} follow=${r.camFollowing}`);
}

// ---------- 8b. Derrotado o Cerco, a fúria libera de novo ----------
{
  const r = await page.evaluate(async () => {
    const s = window.game.scene.keys.GameScene;
    s.furySystem.charge = 1;
    await new Promise((r2) => setTimeout(r2, 150));
    s.doSpecial();
    const rampage = s.furySystem.rampage;
    // Apaga o fogo: a seção 9 precisa que a rede MATE (em rampage ela estoura)
    s.furySystem.charge = 0;
    s.furySystem.endRampage(s.rhino);
    return { state: s.boss2Fight.state, rampage };
  });
  ok('8b. pós-vitória a fúria ativa normalmente',
    r.state === 'defeated' && r.rampage,
    `state=${r.state} rampage=${r.rampage}`);
}

// ---------- 9. Morte pela rede = causa própria 'boss2' ----------
{
  const r = await page.evaluate(async () => {
    const s = window.game.scene.keys.GameScene;
    const sp = s.rhino.getSprite();
    // Isola a morte: zona limpa e rino ASSENTADO no chão (pós-vitória ele
    // ainda pode estar no ar do quique — o dardo passaria por cima)
    ['getWallsGroup', 'getSpikesGroup', 'getAnimalsGroup', 'getTowersGroup',
      'getDartsGroup', 'getRampsGroup'].forEach((g) => {
      s.spawnManager[g]().children.entries.forEach((e) => e.deactivate());
    });
    s.spawnManager.nextSpawnX = 900000;
    sp.body.reset(81500, 620);
    s.cameras.main.setScroll(81500 - 440, 0);
    await new Promise((r2) => setTimeout(r2, 300));
    // Rede do Capturador disparada direto contra o rino (sem esperar
    // cadência): a CAUSA viaja no dardo — fromBoss = 'boss2'
    s.spawnManager.fireDart(sp.x + 260, sp.y - 30, -600, 0, false, 'boss2');
    await new Promise((resolve) => {
      const t0 = performance.now();
      const tick = () => ((s.gameOver || performance.now() - t0 > 4000)
        ? resolve() : requestAnimationFrame(tick));
      tick();
    });
    let deaths = {};
    try { deaths = JSON.parse(localStorage.getItem('furious_rhino_deaths')) || {}; } catch (e) { /* n/a */ }
    return {
      gameOver: s.gameOver,
      cause: s.deathCause,
      title: document.getElementById('game-over-title').textContent,
      boss2Deaths: deaths.boss2 || 0,
    };
  });
  ok('9. rede do Capturador mata com causa "boss2" e título de capturado',
    r.gameOver && r.cause === 'boss2' && /CAPTURADO/.test(r.title) && r.boss2Deaths >= 1,
    `cause=${r.cause} title="${r.title}" deaths.boss2=${r.boss2Deaths}`);
}

// ---------- 10. Enrage: luta arrastada desce UM degrau de cadência ----------
// currentConfig é pura (tabela por camadas restantes + fightMs), então o
// assert vale mesmo com a luta já encerrada. def.rifle É a MESMA referência
// de Constants.BOSS2_NET (sliders do ?debug=1 vivos) — comparar por
// identidade é comparar com Constants.BOSS2_NET[3].
{
  const r = await page.evaluate(() => {
    const s = window.game.scene.keys.GameScene;
    const f = s.boss2Fight;
    f.fightMs = f.def.enrageMs + 5000; // acima de BOSS2_ENRAGE_MS (45s)
    const enraged = f.hunter.currentConfig(4, f.fightMs);
    const calm = f.hunter.currentConfig(4, 1000);
    return {
      enrageMs: f.def.enrageMs,
      enragedIsStepDown: enraged === f.def.rifle[3], // Constants.BOSS2_NET[3]
      calmIsOwnStep: calm === f.def.rifle[4],        // Constants.BOSS2_NET[4]
      interval: enraged.intervalMs,
    };
  });
  ok('10. enrage acima de BOSS2_ENRAGE_MS desce para o padrão BOSS2_NET[3]',
    r.enrageMs === 45000 && r.enragedIsStepDown && r.calmIsOwnStep,
    `enrageMs=${r.enrageMs} degrau=${r.enragedIsStepDown} calmo=${r.calmIsOwnStep} intervalMs=${r.interval}`);
}

// ---------- 11. Zero erro de JS ----------
const fatal = errors.filter((e) => !/net::|Failed to load resource|ERR_/.test(e));
ok('11. nenhum erro de JS', fatal.length === 0, fatal.slice(0, 3).join(' | '));

await browser.close();
console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} OK`);
process.exit(failed ? 1 : 0);
