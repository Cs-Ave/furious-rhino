// E2E da bossfight do portão-fortaleza (v1.7) num navegador real:
//   node tools/e2e-boss.mjs   (requer o jogo servido em localhost:3000)
//
// O portão do boss NÃO tem corpo de física — contato por banda de x + clamp
// posicional + quique via Rhino.beginKnockback (ver js/systems/BossFight.js).
// O assert nº 3 ("quica e volta a correr sozinho") é o que mataria a rota
// descartada de corpo sólido: lá o FurySystem reescreve velocityX contra a
// separação do Arcade e o rino fica tremendo parado (o soft-lock das rampas).
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const WIN = 40000;
const results = [];
const ok = (name, cond, extra = '') =>
  results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await context.addInitScript(() => {
  localStorage.setItem('furious_rhino_attempts', '50');
  // Sonda claude-*, id curto DE PROPÓSITO: as rules exigem >= 16 chars para
  // criar, então esta suíte nunca grava um doc na coleção de produção
  localStorage.setItem('furious_rhino_player_id', 'claude-e2e-boss');
  // Sem pushes no celular do dono a cada corrida da suíte
  localStorage.setItem('furious_rhino_notify_off', '1');
  // Encontros já "vistos": os toasts de ensino não entram na medição
  localStorage.setItem('furious_rhino_boss_seen', '9');
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

// ---------- 1. Texturas e arte do boss existem ----------
{
  const missing = await page.evaluate(() => {
    const s = window.game.scene.keys.GameScene;
    const out = [];
    ['zoo-gate-armored-3', 'zoo-gate-armored-2', 'zoo-gate-armored-1',
      'zoo-gate-broken', 'boss-hunter', 'boss-hunter-aim'].forEach((k) => {
      if (!s.textures.exists(k)) out.push(k);
    });
    return out;
  });
  ok('1. texturas do portão blindado e do caçador existem',
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
    s.spawnManager.nextSpawnX = 40000 + 1000;

    sp.body.reset(40000 - 1400, 620);
    s.cameras.main.setScroll(40000 - 1400 - 440, 0);

    // Espera a luta começar (gatilho em WIN - BOSS_ARENA_PX)
    await new Promise((resolve) => {
      const t0 = performance.now();
      const tick = () => (s.bossFight.state === 'fight' || performance.now() - t0 > 8000
        ? resolve() : requestAnimationFrame(tick));
      tick();
    });
    const fightStarted = s.bossFight.state === 'fight';
    const hunterEngaged = s.bossFight.hunter.engaged;
    // Isola a física do quique: o rifle fica de fora deste teste (a morte
    // pelo rifle tem teste próprio, determinístico, no fim)
    s.bossFight.hunter.engaged = false;
    s.bossFight.hunter.laser.clear();
    s.spawnManager.getDartsGroup().children.entries.forEach((d) => d.deactivate());

    // Câmera travada: espera o tween de 600ms assentar
    await new Promise((r2) => setTimeout(r2, 900));
    const camFollowing = Boolean(s.cameras.main._follow);
    const scrollX = s.cameras.main.scrollX;

    // Traça o loop SEM dash até 2 quiques: contato → quique → retomada
    const trace = [];
    const sample = () => trace.push({
      t: s.time.now, x: sp.body.center.x, vx: Math.round(sp.body.velocity.x),
      q: s.runBossBounces, over: s.gameOver,
    });
    // Até o 3º quique: o 1º pode acontecer antes de o traço começar, e o
    // último precisa de cauda para a RETOMADA aparecer no traço
    s.events.on('postupdate', sample);
    await new Promise((resolve) => {
      const t0 = s.time.now;
      const tick = () => ((s.runBossBounces >= 3 || s.gameOver || s.time.now - t0 > 20000)
        ? resolve() : requestAnimationFrame(tick));
      tick();
    });
    await new Promise((r2) => setTimeout(r2, 1500));
    s.events.off('postupdate', sample);

    // Nada nasceu na arena durante a luta
    const spawnsNaArena = [];
    ['getWallsGroup', 'getSpikesGroup', 'getAnimalsGroup', 'getTowersGroup'].forEach((g) => {
      s.spawnManager[g]().children.entries.forEach((e) => {
        if (e.active && e.x > 40000 - 1300 && e.x < 40000 + 1000) spawnsNaArena.push(e.x);
      });
    });

    return {
      fightStarted, hunterEngaged, camFollowing, scrollX, trace,
      bounces: s.runBossBounces, gameOver: s.gameOver,
      layerIdx: s.bossFight.layerIdx, spawnsNaArena,
    };
  });

  ok('2. a luta começa e trava a câmera na arena',
    r.fightStarted && r.hunterEngaged && !r.camFollowing &&
    Math.abs(r.scrollX - (WIN - 1040)) < 10,
    `fight=${r.fightStarted} rifle=${r.hunterEngaged} follow=${r.camFollowing} scrollX=${r.scrollX.toFixed(0)}`);

  // O assert que mataria a rota de corpo sólido: depois de CADA quique o
  // rino desacelera, volta e re-acelera sozinho para a frente em < 60 frames
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

  ok('4. o recuo fica dentro da arena e nada atravessa o portão',
    minX > WIN - 1150 && Math.max(...tr.map((s) => s.x)) < WIN - 60,
    `x=[${minX.toFixed(0)}, ${Math.max(...tr.map((s) => s.x)).toFixed(0)}]`);

  ok('5. contato sem dash não quebra camada e nada spawna na arena',
    r.layerIdx === 0 && r.spawnsNaArena.length === 0,
    `camadas=${r.layerIdx} spawns=${JSON.stringify(r.spawnsNaArena)}`);
}

// ---------- 6-8. As 3 investidas alinhadas: chão → meio → alto → fuga ----------
{
  const r = await page.evaluate(async () => {
    const s = window.game.scene.keys.GameScene;
    const sp = s.rhino.getSprite();
    const faceX = 40000 - 120;

    // Dash de curta distância: alinhado à banda, a 160px da face o dash de
    // 200ms (1125px/s com fúria cheia) encosta ainda ATIVO
    const dashAt = async (feetY, wantLayer) => {
      s.rhino.knockbackMsLeft = 0;
      s.rhino.dashState = 'idle';
      // O rino pode ter quicado AGORA MESMO (loop perpétuo entre os testes):
      // zera o cooldown de contato, senão o dash de 200ms expira na espera
      s.bossFight.contactCdMs = 0;
      sp.body.reset(faceX - 160, feetY);
      s.rhino.onRightPress();
      await new Promise((resolve) => {
        const t0 = performance.now();
        const tick = () => ((s.bossFight.layerIdx >= wantLayer || s.gameOver ||
          performance.now() - t0 > 4000) ? resolve() : requestAnimationFrame(tick));
        tick();
      });
      return { layer: s.bossFight.layerIdx, tex: s.gateSprite.texture.key };
    };

    const chao = await dashAt(620, 1);   // banda ground (feet no chão)
    const meio = await dashAt(400, 2);   // banda mid (dash aéreo: gravidade off)
    const alto = await dashAt(200, 3);   // banda high
    await new Promise((r2) => setTimeout(r2, 400));

    return {
      chao, meio, alto,
      escaped: s.escaped,
      gateReached: s.gateReached,
      gateTex: s.gateSprite.texture.key,
      hunterEngaged: s.bossFight.hunter.engaged,
      camFollowing: Boolean(s.cameras.main._follow),
      layers: s.runBossLayers,
      state: s.bossFight.state,
      gameOver: s.gameOver,
    };
  });

  ok('6. investida alinhada quebra na ordem chão → meio → alto',
    r.chao.layer === 1 && r.chao.tex === 'zoo-gate-armored-2' &&
    r.meio.layer === 2 && r.meio.tex === 'zoo-gate-armored-1' &&
    r.alto.layer === 3,
    `${r.chao.layer}/${r.chao.tex} → ${r.meio.layer}/${r.meio.tex} → ${r.alto.layer}`);

  ok('7. a 3ª camada dispara a fuga (crossGate) sem matar a corrida',
    r.escaped && r.gateReached && r.gateTex === 'zoo-gate-broken' &&
    r.state === 'defeated' && !r.gameOver && r.layers === 3,
    `escaped=${r.escaped} tex=${r.gateTex} state=${r.state} b=${r.layers}`);

  ok('8. o caçador cai e a câmera volta a seguir o rino',
    !r.hunterEngaged && r.camFollowing,
    `rifle=${r.hunterEngaged} follow=${r.camFollowing}`);
}

// ---------- 9. Morte pelo rifle = causa própria 'boss' ----------
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
    sp.body.reset(41500, 620);
    s.cameras.main.setScroll(41500 - 440, 0);
    await new Promise((r2) => setTimeout(r2, 300));
    // Dardo do boss disparado direto contra o rino (sem esperar cadência)
    s.spawnManager.fireDart(sp.x + 260, sp.y - 30, -600, 0, false, true);
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
      bossDeaths: deaths.boss || 0,
    };
  });
  ok('9. dardo do caçador mata com causa "boss" e título de tranquilizado',
    r.gameOver && r.cause === 'boss' && /TRANQUILIZADO/.test(r.title) && r.bossDeaths >= 1,
    `cause=${r.cause} title="${r.title}" deaths.boss=${r.bossDeaths}`);
}

// ---------- 10. Zero erro de JS ----------
const fatal = errors.filter((e) => !/net::|Failed to load resource|ERR_/.test(e));
ok('10. nenhum erro de JS', fatal.length === 0, fatal.slice(0, 3).join(' | '));

await browser.close();
console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} OK`);
process.exit(failed ? 1 : 0);
