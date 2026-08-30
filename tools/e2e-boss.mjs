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
  // v1.10: veterano é RECORDE (>= 400m pula a aula; >= 800m joga o
  // tier cheio) — a contagem de tentativas deixou de ser a régua
  localStorage.setItem('furious_rhino_record', '2000');
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
      q: s.runBossBounces, over: s.gameOver, dash: s.rhino.dashState,
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

  // A regressão relatada em teste de campo: o stun do quique deixava o dash
  // em cooldown CHEIO e o jogador nunca conseguia investir de novo. O stun
  // agora termina junto com o knockback — o dash tem de estar 'idle' de novo
  // dentro da mesma janela pós-quique.
  let dashBack = 0;
  let dashWindows = 0;
  for (let i = 1; i < tr.length; i++) {
    if (tr[i].q > tr[i - 1].q) {
      if (i + 60 > tr.length) continue;
      dashWindows++;
      if (tr.slice(i, i + 60).some((s) => s.dash === 'idle')) dashBack++;
    }
  }
  ok('3b. a investida volta junto com o controle (dá para tentar de novo)',
    dashWindows >= 2 && dashBack === dashWindows,
    `${dashBack}/${dashWindows} janelas pós-quique com dash liberado`);

  ok('4. o recuo fica dentro da arena e nada atravessa o portão',
    minX > WIN - 1150 && Math.max(...tr.map((s) => s.x)) < WIN - 60,
    `x=[${minX.toFixed(0)}, ${Math.max(...tr.map((s) => s.x)).toFixed(0)}]`);

  ok('5. contato sem dash não quebra camada e nada spawna na arena',
    r.layerIdx === 0 && r.spawnsNaArena.length === 0,
    `camadas=${r.layerIdx} spawns=${JSON.stringify(r.spawnsNaArena)}`);
}

// ---------- 5b-5e. v1.8: fúria bloqueada na arena ----------
{
  const r1 = await page.evaluate(async () => {
    const s = window.game.scene.keys.GameScene;
    s.furySystem.charge = 1;
    // o tranca/destranca do medidor assenta no próximo update
    await new Promise((r2) => setTimeout(r2, 150));
    const denied0 = s.runFuryDenied;
    s.doSpecial();
    return {
      state: s.bossFight.state,
      rampage: s.furySystem.rampage,
      charge: s.furySystem.charge,
      denied0,
      denied: s.runFuryDenied,
      lockVisible: s.furySystem.lockIcon.visible,
      pulsing: Boolean(s.furySystem.pulseTween),
    };
  });
  ok('5b. doSpecial na arena é negado: sem rampage, carga intacta, contador n sobe',
    r1.state === 'fight' && !r1.rampage && r1.charge === 1 && r1.denied === r1.denied0 + 1,
    `state=${r1.state} rampage=${r1.rampage} charge=${r1.charge} denied=${r1.denied0}→${r1.denied}`);
  ok('5c. medidor trancado: cadeado visível e sem pulso',
    r1.lockVisible && !r1.pulsing, `lock=${r1.lockVisible} pulso=${r1.pulsing}`);

  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(150);
  const r2 = await page.evaluate(() => {
    const s = window.game.scene.keys.GameScene;
    return { rampage: s.furySystem.rampage, denied: s.runFuryDenied };
  });
  ok('5d. paridade de teclado: ↓ na arena também é negado',
    !r2.rampage && r2.denied >= r1.denied + 1,
    `rampage=${r2.rampage} denied=${r2.denied}`);

  // Quem ativou ANTES da arena mantém o fogo — mas o fogo não dispensa mais
  // o alinhamento: contato desalinhado quica em vez de quebrar (o exploit
  // da v1.7 morreu aqui)
  const r3 = await page.evaluate(async () => {
    const s = window.game.scene.keys.GameScene;
    const sp = s.rhino.getSprite();
    // Simula a ativação pré-arena (equivale a ativar 1px antes do gatilho)
    s.bossFight.state = 'dormant';
    s.furySystem.charge = 1;
    const activated = s.furySystem.activate(s.rhino);
    s.bossFight.state = 'fight';
    s.rhino.dashState = 'idle';
    s.rhino.knockbackMsLeft = 0;
    s.bossFight.contactCdMs = 0;
    const q0 = s.runBossBounces;
    const l0 = s.bossFight.layerIdx;
    // Contato no ALTO com a camada atual sendo a do chão = desalinhado
    sp.body.reset(40000 - 160, 200);
    await new Promise((resolve) => {
      const t0 = performance.now();
      const tick = () => ((s.runBossBounces > q0 || performance.now() - t0 > 3000)
        ? resolve() : requestAnimationFrame(tick));
      tick();
    });
    const res = {
      activated,
      rampage: s.furySystem.rampage,
      layerHeld: s.bossFight.layerIdx === l0,
      bounced: s.runBossBounces > q0,
    };
    // Apaga o fogo e afasta o rino: a seção 6 conta com fúria cheia (sem
    // rampage) e posição própria
    sp.body.reset(40000 - 600, 620);
    s.furySystem.endRampage(s.rhino);
    s.furySystem.charge = 1;
    return res;
  });
  ok('5e. rampage prévio sobrevive na arena mas NÃO quebra desalinhado (quica)',
    r3.activated && r3.rampage && r3.layerHeld && r3.bounced,
    `ativou=${r3.activated} fogo=${r3.rampage} camadaIntacta=${r3.layerHeld} quicou=${r3.bounced}`);
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

// ---------- 8b. v1.8: derrotado o boss, a fúria libera de novo ----------
{
  const r = await page.evaluate(async () => {
    const s = window.game.scene.keys.GameScene;
    s.furySystem.charge = 1;
    await new Promise((r2) => setTimeout(r2, 150));
    const lockVisible = s.furySystem.lockIcon.visible;
    s.doSpecial();
    const rampage = s.furySystem.rampage;
    // Apaga o fogo: a seção 9 precisa que o dardo MATE (em rampage ele estoura)
    s.furySystem.charge = 0;
    s.furySystem.endRampage(s.rhino);
    return { state: s.bossFight.state, lockVisible, rampage };
  });
  ok('8b. pós-derrota a fúria ativa normalmente e o cadeado some',
    r.state === 'defeated' && !r.lockVisible && r.rampage,
    `state=${r.state} lock=${r.lockVisible} rampage=${r.rampage}`);
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

// ---------- 11. A CASCATA (v1.9.4) — o portão não pode ser contornado ----------
// O BUG QUE ISTO PEGA: até a v1.9.3 o gatilho legado dos 1000m rodava no
// update NORMAL. Bastava o rino ultrapassar a face do portão UMA vez (a
// janela é de 120px — um frame de 85ms a atravessa) para a fuga contar SEM
// luta; daí o `isBypassed` de cada chefe seguinte via "já estou além da
// âncora" e todos se rendiam, em cascata, até a vitória. Em produção isso
// deixou as 4 vitórias da base com ZERO das 21 camadas possíveis.
//
// Nenhum e2e pegava: os três testes de chefe TELEPORTAM para dentro da
// arena e validam a luta — nunca o caminho de chegada.
{
  // Pagina LIMPA: os asserts acima ja venceram o portao nesta corrida
  // (camadas=3, estado=defeated) — reusar a mesma pagina mediria o estado
  // errado. Mesmo contexto, corrida nova.
  const p11 = await context.newPage();
  await p11.goto(`${BASE}/?debug=1`, { waitUntil: 'networkidle' });
  await p11.waitForTimeout(1500);
  const pwa11 = p11.locator('#pwa-modal');
  if (await pwa11.isVisible().catch(() => false)) {
    await p11.click('#pwa-skip');
    await p11.waitForTimeout(200);
  }
  await p11.locator('#start-screen').click({ position: { x: 640, y: 650 } });
  await p11.waitForTimeout(600);

  const r = await p11.evaluate(async () => {
    const s = window.game.scene.getScene('GameScene');
    // Vira JOGADOR REAL: sem debug, sem invencibilidade. O `?debug=1` da URL
    // serviu só para alcançar a cena — o comportamento testado é o de campo.
    s.registry.set('debug', false);
    s.invincible = false;
    // O estado que um frame longo produz: o rino ALÉM do gatilho, sem ter lutado
    s.rhino.getSprite().body.reset(40050, 620);  // WIN + 50
    await new Promise((r) => setTimeout(r, 1200));
    return {
      cruzou: s.gateReached,
      escapou: Boolean(s.escaped),
      estado: s.bossFight.state,
      camadas: s.runBossLayers,
      x: Math.round(s.rhino.getSprite().x),
    };
  });
  ok('11. ultrapassar a face NÃO cruza o portão sem luta (a cascata está fechada)',
    !r.cruzou && !r.escapou && r.camadas === 0,
    `cruzou=${r.cruzou} escapou=${r.escapou} camadas=${r.camadas}`);
  ok('11b. o chefe segue de pé e o clamp devolve o rino para a arena',
    r.estado === 'fight' && r.x < WIN,
    `estado=${r.estado} x=${r.x}`);
  await p11.close();
}

// ---------- 10. Zero erro de JS ----------
const fatal = errors.filter((e) => !/net::|Failed to load resource|ERR_/.test(e));
ok('10. nenhum erro de JS', fatal.length === 0, fatal.slice(0, 3).join(' | '));

await browser.close();
console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} OK`);
process.exit(failed ? 1 : 0);
