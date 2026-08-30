// E2E das AREIAS DO TEMPO (v1.8.10) num navegador real:
//   node tools/e2e-deserto.mjs   (requer o jogo servido em localhost:3000)
//
// O deserto tem DOIS combates no framework paramétrico (e2e-boss.mjs é a
// suíte-mãe da física; e2e-boss2.mjs, da Muralha). O que ESTA suíte guarda:
//   - as 5 etapas existem como ÁREAS (skin de parede por etapa, elenco);
//   - a BARREIRA DA ESCAVAÇÃO (3650m): o Cerco enfim ligado — 4 camadas
//     MID → GROUND → HIGH → MID, vitória sem encerrar (+150, letra u);
//   - o FARAÓ DE BRONZE (4700m): 5 camadas MID → HIGH → GROUND → MID → HIGH,
//     a cadência mais agressiva do jogo, enrage 30s, rasante 'falcao',
//     vitória sem encerrar (+250, letra y);
//   - causas próprias ('cerco'/'farao') e startFight silenciando atiradores.
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const CERCO = 146000;  // Constants.CERCO_ANCHOR_PX (3650m)
const FARAO = 188000;  // Constants.FARAO_ANCHOR_PX (4700m)
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
  // Sonda claude-*, id curto DE PROPÓSITO (rules exigem >= 16 p/ criar doc)
  localStorage.setItem('furious_rhino_player_id', 'claude-e2e-desert');
  localStorage.setItem('furious_rhino_notify_off', '1');
  sessionStorage.setItem('furious_rhino_pwa_prompted', '1');
});
const errors = [];
const page = await context.newPage();
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`${BASE}/?debug=1`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1800);
const pwa = page.locator('#pwa-modal');
if (await pwa.isVisible().catch(() => false)) { await page.click('#pwa-skip'); }
await page.locator('#start-screen').click({ position: { x: 640, y: 650 } });
await page.waitForTimeout(500);

// ---------- 1. Texturas do deserto existem ----------
{
  const missing = await page.evaluate(() => {
    const s = window.game.scene.keys.GameScene;
    const out = [];
    ['cerco-gate-4', 'cerco-gate-1', 'cerco-gate-broken',
      'farao-gate-5', 'farao-gate-1', 'farao-gate-broken',
      'farao-hunter', 'farao-hunter-aim', 'arrow-projectile', 'falcao-projectile',
      'cracked-mid-ruina', 'cracked-mid-piramide', 'tranq-tower-egito',
      'hazard-movedica', 'hazard-flecheira', 'hazard-caixote',
      'bg-far-duna', 'bg-far-vale', 'ground-desert', 'marco-obelisco'].forEach((k) => {
      if (!s.textures.exists(k)) out.push(k);
    });
    return out;
  });
  ok('1. texturas do deserto (muralhas, projéteis, famílias, hazards, fundos) existem',
    missing.length === 0, missing.join(', '));
}

// ---------- 2. As 5 etapas: área, skin de parede e elenco ----------
{
  const areas = await page.evaluate(async () => {
    const { Constants } = await import('./js/utils/Constants.js');
    const probe = (m) => {
      const x = m * 40;
      const a = Constants.cityAreaFor(x);
      return { key: a ? a.key : null, wall: Constants.skinFor(x, 'wall'), prop: Constants.skinFor(x, 'tower') };
    };
    return {
      e1: probe(2450), e2: probe(2950), e3: probe(3450), e4: probe(3950), e5: probe(4450),
      inf: probe(5200), muralhaAindaCidade: probe(1990),
    };
  });
  ok('2. etapas 1-5 + infinito com as áreas certas',
    areas.e1.key === 'duna' && areas.e2.key === 'oasis' && areas.e3.key === 'escavacao' &&
    areas.e4.key === 'vale' && areas.e5.key === 'necropole' && areas.inf.key === 'deserto',
    JSON.stringify([areas.e1.key, areas.e2.key, areas.e3.key, areas.e4.key, areas.e5.key, areas.inf.key]));
  ok('2b. paredes por família (ruina nas 3 primeiras, piramide no Vale+) e props -egito',
    areas.e1.wall === '-ruina' && areas.e3.wall === '-ruina' &&
    areas.e4.wall === '-piramide' && areas.e5.wall === '-piramide' &&
    areas.e1.prop === '-egito' && areas.e5.prop === '-egito' &&
    areas.muralhaAindaCidade.prop === '-city',
    `${areas.e1.wall}/${areas.e4.wall}/${areas.e1.prop} cidade=${areas.muralhaAindaCidade.prop}`);
}

// ---------- 3-8. A BARREIRA DA ESCAVAÇÃO (o Cerco vive) ----------
{
  const r = await page.evaluate(async (CERCO) => {
    const s = window.game.scene.keys.GameScene;
    const sp = s.rhino.getSprite();
    ['getWallsGroup', 'getSpikesGroup', 'getAnimalsGroup', 'getTowersGroup',
      'getDartsGroup', 'getRampsGroup'].forEach((g) => {
      s.spawnManager[g]().children.entries.forEach((e) => e.deactivate());
    });
    s.spawnManager.openingIndex = 999;
    s.spawnManager.nextSpawnX = CERCO + 1000;
    s.gateReached = true;
    s.escaped = true;
    // torre viva na arena ANTES da luta: o startFight tem de silenciá-la
    const torre = s.spawnManager.getTowersGroup().children.entries[0];
    torre.reset(CERCO - 800);
    const torreAntes = torre.active;
    s.invincible = true;

    const fight = s.bossFights.find((f) => f.def.anchorX === CERCO);
    sp.body.reset(CERCO - 1400, 620);
    s.cameras.main.setScroll(CERCO - 1400 - 440, 0);
    await new Promise((resolve) => {
      const t0 = performance.now();
      const tick = () => (fight.state === 'fight' || performance.now() - t0 > 8000
        ? resolve() : requestAnimationFrame(tick));
      tick();
    });
    const fightStarted = fight.state === 'fight';
    s.invincible = false;
    const torreDepois = torre.active;
    fight.hunter.engaged = false;
    fight.hunter.laser.clear();
    s.spawnManager.getDartsGroup().children.entries.forEach((d) => d.deactivate());
    await new Promise((r2) => setTimeout(r2, 900));

    const bonus0 = s.runBonus;
    const faceX = fight.def.anchorX - fight.def.gateFaceHalf;
    const dashAt = async (y, esperado) => {
      s.rhino.knockbackMsLeft = 0;
      s.rhino.dashState = 'idle';
      fight.contactCdMs = 0;
      sp.body.reset(faceX - 160, y);
      s.rhino.onRightPress();
      await new Promise((resolve) => {
        const t0 = performance.now();
        const tick = () => ((s.runCercoLayers >= esperado || performance.now() - t0 > 5000)
          ? resolve() : requestAnimationFrame(tick));
        tick();
      });
      await new Promise((r2) => setTimeout(r2, 450));
      return { layer: s.runCercoLayers, tex: fight.gate.texture.key };
    };
    // MID → GROUND → HIGH → MID (a ordem do Cerco original)
    const meio1 = await dashAt(400, 1);
    const chao = await dashAt(620, 2);
    const alto = await dashAt(200, 3);
    const meio2 = await dashAt(400, 4);
    await new Promise((r2) => setTimeout(r2, 700));
    return {
      fightStarted, torreAntes, torreDepois,
      meio1, chao, alto, meio2,
      state: fight.state, gameOver: s.gameOver,
      gateTex: fight.gate.texture.key,
      layers: s.runCercoLayers,
      bonusDelta: s.runBonus - bonus0,
      deathCause: fight.def.deathCause,
    };
  }, CERCO);

  ok('3. a Barreira da Escavação começa a luta (o Cerco VIVE)',
    r.fightStarted, `state=${r.state}`);
  ok('4. startFight silencia a torre viva na arena',
    r.torreAntes === true && r.torreDepois === false,
    `antes=${r.torreAntes} depois=${r.torreDepois}`);
  ok('5. camadas na ordem MID → GROUND → HIGH → MID (cerco-gate-*)',
    r.meio1.layer === 1 && r.meio1.tex === 'cerco-gate-3' &&
    r.chao.layer === 2 && r.chao.tex === 'cerco-gate-2' &&
    r.alto.layer === 3 && r.alto.tex === 'cerco-gate-1' && r.meio2.layer === 4,
    `${r.meio1.tex} → ${r.chao.tex} → ${r.alto.tex} → ${r.meio2.layer}`);
  ok('6. vitória SEM encerrar: +250 ao vivo (100 camadas + 150 barreira), letra u = 4',
    r.state === 'defeated' && !r.gameOver && r.gateTex === 'cerco-gate-broken' &&
    r.layers === 4 && r.bonusDelta === 250,
    `state=${r.state} tex=${r.gateTex} u=${r.layers} Δ=${r.bonusDelta}`);
  ok('7. causa de morte própria declarada (cerco)',
    r.deathCause === 'cerco', r.deathCause);
}

// ---------- 9-13. O FARAÓ DE BRONZE ----------
{
  const r = await page.evaluate(async (FARAO) => {
    const s = window.game.scene.keys.GameScene;
    const sp = s.rhino.getSprite();
    ['getWallsGroup', 'getSpikesGroup', 'getAnimalsGroup', 'getTowersGroup',
      'getDartsGroup', 'getRampsGroup'].forEach((g) => {
      s.spawnManager[g]().children.entries.forEach((e) => e.deactivate());
    });
    s.spawnManager.nextSpawnX = FARAO + 2000;
    s.invincible = true;
    const fight = s.bossFights.find((f) => f.def.anchorX === FARAO);
    sp.body.reset(FARAO - 1400, 620);
    s.cameras.main.setScroll(FARAO - 1400 - 440, 0);
    await new Promise((resolve) => {
      const t0 = performance.now();
      const tick = () => (fight.state === 'fight' || performance.now() - t0 > 8000
        ? resolve() : requestAnimationFrame(tick));
      tick();
    });
    const fightStarted = fight.state === 'fight';
    s.invincible = false;
    fight.hunter.engaged = false;
    fight.hunter.laser.clear();
    s.spawnManager.getDartsGroup().children.entries.forEach((d) => d.deactivate());
    await new Promise((r2) => setTimeout(r2, 900));

    const bonus0 = s.runBonus;
    const faceX = fight.def.anchorX - fight.def.gateFaceHalf;
    const dashAt = async (y, esperado) => {
      s.rhino.knockbackMsLeft = 0;
      s.rhino.dashState = 'idle';
      fight.contactCdMs = 0;
      sp.body.reset(faceX - 160, y);
      s.rhino.onRightPress();
      await new Promise((resolve) => {
        const t0 = performance.now();
        const tick = () => ((s.runFaraoLayers >= esperado || performance.now() - t0 > 5000)
          ? resolve() : requestAnimationFrame(tick));
        tick();
      });
      await new Promise((r2) => setTimeout(r2, 450));
      return { layer: s.runFaraoLayers, tex: fight.gate.texture.key };
    };
    // MID → HIGH → GROUND → MID → HIGH (a 3ª gramática)
    const c1 = await dashAt(400, 1);
    const c2 = await dashAt(200, 2);
    const c3 = await dashAt(620, 3);
    const c4 = await dashAt(400, 4);
    const c5 = await dashAt(200, 5);
    await new Promise((r2) => setTimeout(r2, 700));
    return {
      fightStarted, c1, c2, c3, c4, c5,
      state: fight.state, gameOver: s.gameOver,
      gateTex: fight.gate.texture.key,
      layers: s.runFaraoLayers,
      bonusDelta: s.runBonus - bonus0,
      enrage: fight.def.enrageMs,
      rasante: fight.def.rasanteStyle,
      cause: fight.def.deathCause,
    };
  }, FARAO);

  ok('9. o Faraó de Bronze começa a luta', r.fightStarted, `state=${r.state}`);
  ok('10. 5 camadas na ordem MID → HIGH → GROUND → MID → HIGH (farao-gate-*)',
    r.c1.layer === 1 && r.c1.tex === 'farao-gate-4' &&
    r.c2.layer === 2 && r.c2.tex === 'farao-gate-3' &&
    r.c3.layer === 3 && r.c3.tex === 'farao-gate-2' &&
    r.c4.layer === 4 && r.c4.tex === 'farao-gate-1' && r.c5.layer === 5,
    `${r.c1.tex}→${r.c2.tex}→${r.c3.tex}→${r.c4.tex}→${r.c5.layer}`);
  ok('11. vitória SEM encerrar: +375 ao vivo (125 camadas + 250 faraó), letra y = 5',
    r.state === 'defeated' && !r.gameOver && r.gateTex === 'farao-gate-broken' &&
    r.layers === 5 && r.bonusDelta === 375,
    `state=${r.state} tex=${r.gateTex} y=${r.layers} Δ=${r.bonusDelta}`);
  ok('12. o defensor mais agressivo: enrage 30s + rasante falcao + causa farao',
    r.enrage === 30000 && r.rasante === 'falcao' && r.cause === 'farao',
    `enrage=${r.enrage} rasante=${r.rasante} causa=${r.cause}`);
}

// ---------- 14. Morte pelo Faraó: causa e título ----------
{
  const r = await page.evaluate(async (FARAO) => {
    const s = window.game.scene.keys.GameScene;
    // dardo do boss direto no rino (padrão do e2e-boss2)
    const sp = s.rhino.getSprite();
    s.spawnManager.fireDart(sp.x + 60, sp.y, -500, 0, false, 'farao');
    await new Promise((r2) => setTimeout(r2, 1200));
    return {
      gameOver: s.gameOver,
      cause: s.deathCause,
      title: document.querySelector('#game-over h1')?.textContent || '',
      deaths: (JSON.parse(localStorage.getItem('furious_rhino_deaths') || '{}').farao) || 0,
    };
  }, FARAO);
  ok('14. dardo do Faraó mata com causa "farao", título próprio e deaths.farao',
    r.gameOver && r.cause === 'farao' && /FARA/i.test(r.title) && r.deaths >= 1,
    `cause=${r.cause} title="${r.title}" deaths=${r.deaths}`);
}

// ---------- 15. Zero erro de JS ----------
const fatal = errors.filter((e) => !/net::|Failed to load resource|ERR_/.test(e));
ok('15. nenhum erro de JS', fatal.length === 0, fatal.slice(0, 3).join(' | '));

await browser.close();
console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} OK`);
process.exit(failed ? 1 : 0);
