// E2E das rampas num navegador real (Playwright/Chromium):
//   node tools/e2e-ramp.mjs   (requer o jogo servido em localhost:3000)
//
// A rampa não tem corpo de física — é terreno resolvido à mão a cada frame
// (ver js/entities/Ramp.js). Um teste de "estados soltos" não provaria nada:
// o que interessa é a TRAVESSIA inteira. Por isso o teste instala um
// amostrador em `postupdate` que grava {x, bottom, surf, down, vy} por frame
// e valida o traço.
//
// O assert nº 4 ("nunca trava") é o que mataria a rota descartada de escada
// de corpos estáticos: lá o rino fica tremendo parado na lateral do degrau.
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const results = [];
const ok = (name, cond, extra = '') =>
  results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
// Sem alerta de PWA no caminho e sem dicas da abertura sobrepondo a tela
await context.addInitScript(() => {
  localStorage.setItem('furious_rhino_attempts', '50');
  // Id curto DE PROPÓSITO: as rules exigem >= 16 chars para criar, então
  // esta suíte nunca consegue gravar um doc na coleção de produção
  localStorage.setItem('furious_rhino_player_id', 'e2e-ramp-local');
  // A suíte inicia dezenas de corridas: sem isto, cada uma vira um push no
  // celular do dono
  localStorage.setItem('furious_rhino_notify_off', '1');
});

const errors = [];
const page = await context.newPage();
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`${BASE}/?debug=1`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

async function startGame() {
  const pwa = page.locator('#pwa-modal');
  if (await pwa.isVisible().catch(() => false)) {
    await page.click('#pwa-skip');
    await page.waitForTimeout(200);
  }
  await page.locator('#start-screen').click({ position: { x: 640, y: 650 } });
  await page.waitForTimeout(600);
}
await startGame();
// Sem isto, o leão do teste 9 mata o rino e a física fica pausada — todos os
// testes seguintes rodam com o jogo já encerrado (o update tem early-return)
await page.evaluate(() => { window.game.scene.keys.GameScene.invincible = true; });

// Coloca o rino num trecho limpo, planta UMA rampa da variante pedida e grava
// o traço até ele passar do fim dela. Nada de esperar a roleta.
async function traverse({ variant, rampX, startX, dash = false, fps = null, animal = false }) {
  return page.evaluate(async (o) => {
    const s = window.game.scene.keys.GameScene;
    const sprite = s.rhino.getSprite();

    // Zona limpa: desativa tudo que a roleta já tenha posto na frente
    ['getWallsGroup', 'getSpikesGroup', 'getAnimalsGroup', 'getTowersGroup',
      'getDartsGroup', 'getRampsGroup'].forEach((g) => {
      s.spawnManager[g]().children.entries.forEach((e) => e.deactivate());
    });
    // E impede que ela reponha algo dentro da janela do teste
    s.spawnManager.nextSpawnX = o.rampX + 20000;
    s.spawnManager.openingIndex = 999;

    if (o.fps) s.physics.world.setFPS(o.fps);
    // No CHÃO (origin do rino é o pé), não no ar: largá-lo em y=400 poluiria
    // a medida de altura ganha na rampa
    sprite.body.reset(o.startX, 620);
    // A câmera PRECISA vir junto: ela segue com lerp 0.1 e, vindo de um teste
    // anterior lá na frente, recycleOffscreen (limit = scrollX - 200) apagaria
    // a rampa recém-plantada antes do primeiro frame
    s.cameras.main.setScroll(o.startX - 640, 0);
    const ramp = s.spawnManager.getRampsGroup().getFirst(false);
    ramp.reset(o.rampX, o.variant);
    if (o.animal) s.spawnManager.spawnAnimal(o.rampX + ramp.spec.asc + 20, 'lion');

    const trace = [];
    const animalTrace = [];
    const sample = () => {
      const b = sprite.body;
      const r = s.spawnManager.getRampAt(b.center.x);
      trace.push({
        t: s.time.now, x: b.center.x, bottom: b.bottom,
        surf: r ? r.surfaceY(b.center.x) : null,
        down: b.blocked.down, vy: Math.round(b.velocity.y), vx: Math.round(b.velocity.x),
      });
      if (o.animal) {
        const a = s.spawnManager.getAnimalsGroup().children.entries.find((e) => e.active);
        if (a) {
          const ar = s.spawnManager.getRampAt(a.body.center.x);
          animalTrace.push({ bottom: a.body.bottom, surf: ar ? ar.surfaceY(a.body.center.x) : null });
        }
      }
    };
    s.events.on('postupdate', sample);

    // A investida dura 200ms (~165px): disparar de longe demais acabaria
    // antes da base. Aciona quando o rino chega perto da entrada.
    const endX = ramp.exitX + 700;
    await new Promise((resolve) => {
      const started = s.time.now;
      let dashed = false;
      const tick = () => {
        const cx = sprite.body.center.x;
        if (o.dash && !dashed && cx > ramp.x - 130) { dashed = true; s.rhino.onRightPress(); }
        if (cx > endX || s.time.now - started > 12000) return resolve();
        requestAnimationFrame(tick);
      };
      tick();
    });
    s.events.off('postupdate', sample);
    if (o.fps) s.physics.world.setFPS(60);

    return {
      trace, animalTrace,
      spec: ramp.spec, rampX: ramp.x, exitX: ramp.exitX,
      destroyed: ramp.destroyed, textureKey: ramp.texture.key,
      groundTop: 620,
    };
  }, { variant, rampX, startX, dash, fps, animal });
}

// ---------- 1-5. Morro grande: subir, ficar no chão, descer ----------
{
  const r = await traverse({ variant: 'big', rampX: 3000, startX: 2400 });
  const on = r.trace.filter((s) => s.surf !== null);
  const settled = on.filter((s) => s.vy === 0);
  const worst = settled.reduce((m, s) => Math.max(m, Math.abs(s.bottom - s.surf)), 0);
  ok('1. o pé segue a superfície da rampa', settled.length > 20 && worst <= 3,
    `n=${settled.length} maior desvio=${worst.toFixed(1)}px`);

  const minBottom = Math.min(...r.trace.map((s) => s.bottom));
  ok('2. sobe de verdade', minBottom <= r.groundTop - r.spec.rise + 4,
    `topo alcançado=${minBottom.toFixed(0)} (esperado <= ${r.groundTop - r.spec.rise + 4})`);

  const asc = on.filter((s) => s.x - r.rampX > 20 && s.x - r.rampX < r.spec.asc);
  const grounded = asc.filter((s) => s.down).length / (asc.length || 1);
  ok('3. fica no chão durante a subida', asc.length > 10 && grounded >= 0.9,
    `${(grounded * 100).toFixed(0)}% de ${asc.length} amostras`);

  // O teste que mataria a rota de escada de corpos estáticos: lá o rino fica
  // tremendo parado na lateral do degrau. Medido em JANELAS de 6 amostras —
  // frame a frame, `x` e `s.time.now` não vêm do mesmo passo de física e a
  // razão sai ruidosa. Limiar 250px/s: a corrida base é 300 e a fúria só a
  // leva a 450 no fim, então qualquer coisa abaixo de 250 é freada de verdade.
  // Descarta as 5 primeiras amostras (acomodação do body.reset).
  const tr = r.trace.slice(5);
  let backwards = 0;
  for (let i = 1; i < tr.length; i++) if (tr[i].x < tr[i - 1].x) backwards++;
  const minVx = Math.min(...tr.map((s) => s.vx));
  // Velocidade MÉDIA na travessia inteira, uma medida só: frame a frame, `x`
  // e `s.time.now` não vêm do mesmo passo de física e a razão sai ruidosa
  const inside = tr.filter((s) => s.x >= r.rampX && s.x <= r.exitX);
  const avg = inside.length > 1
    ? (inside[inside.length - 1].x - inside[0].x) /
      ((inside[inside.length - 1].t - inside[0].t) / 1000)
    : 0;
  ok('4. nunca trava na rampa', backwards === 0 && minVx >= 250 && avg >= 250,
    `${backwards} recuos, vx mínimo=${minVx}, média na travessia=${avg.toFixed(0)}px/s`);

  const after = r.trace.filter((s) => s.x > r.exitX + 40);
  const landed = after.filter((s) => Math.abs(s.bottom - r.groundTop) <= 2 && s.down);
  ok('5. desce e reencontra o chão plano', after.length > 5 && landed.length > 0,
    `${landed.length}/${after.length} amostras em y=620`);
}

// ---------- 6. A altura da rampa empilha com o pulo ----------
{
  const apex = await page.evaluate(async () => {
    const s = window.game.scene.keys.GameScene;
    const sprite = s.rhino.getSprite();
    s.spawnManager.getRampsGroup().children.entries.forEach((e) => e.deactivate());
    s.spawnManager.nextSpawnX = 900000;
    s.spawnManager.openingIndex = 999;
    sprite.body.reset(9400, 620);
    s.cameras.main.setScroll(9400 - 640, 0);
    const ramp = s.spawnManager.getRampsGroup().getFirst(false);
    ramp.reset(10000, 'big');
    let min = 720;
    const sample = () => { min = Math.min(min, sprite.body.bottom); };
    s.events.on('postupdate', sample);
    // Pula ao chegar no platô e SEGURA (pulo carregado)
    await new Promise((resolve) => {
      let jumped = false;
      const tick = () => {
        const t = sprite.body.center.x - ramp.x;
        if (!jumped && t > ramp.spec.asc + 20) { jumped = true; s.rhino.onLeftPress(); }
        if (jumped && sprite.body.center.x > ramp.exitX + 200) return resolve();
        requestAnimationFrame(tick);
      };
      tick();
    });
    s.events.off('postupdate', sample);
    return min;
  });
  ok('6. a altura do morro soma com o pulo', apex < 620 - 150 - 300,
    `ápice=${apex.toFixed(0)} (esperado < ${620 - 150 - 300})`);
}

// ---------- 7. Trampolim: a crista lança ----------
{
  const r = await traverse({ variant: 'jump', rampX: 3000, startX: 2400 });
  const past = r.trace.filter((s) => s.x >= r.exitX);
  const takeoff = past.findIndex((s) => !s.down);
  const landIdx = takeoff >= 0 ? past.findIndex((s, i) => i > takeoff && s.down) : -1;
  const flightPx = landIdx > 0 ? past[landIdx].x - past[takeoff].x : 0;
  // Sobe ACIMA da crista: é o que separa "trampolim" de "queda do penhasco"
  const crest = r.groundTop - r.spec.rise;
  const apex = Math.min(...past.map((s) => s.bottom));
  ok('7. o trampolim lança o rino no ar', flightPx >= 200 && apex < crest - 40,
    `${flightPx.toFixed(0)}px de voo, ápice ${(crest - apex).toFixed(0)}px acima da crista`);
}

// ---------- 8. Destruição pela investida rasante ----------
{
  const r = await traverse({ variant: 'big', rampX: 3000, startX: 2700, dash: true });
  ok('8a. investida rasante destrói a rampa', r.destroyed === true, `destroyed=${r.destroyed}`);
  ok('8b. textura vira entulho', /-rubble$/.test(r.textureKey), r.textureKey);
  const inside = r.trace.filter((s) => s.x > r.rampX + 20 && s.x < r.exitX);
  const flat = inside.filter((s) => Math.abs(s.bottom - r.groundTop) <= 4);
  ok('8c. o vão vira passagem plana', inside.length > 10 && flat.length === inside.length,
    `${flat.length}/${inside.length} amostras em y=620`);
}

// ---------- 9. Animais também pisam no morro ----------
{
  const r = await traverse({ variant: 'big', rampX: 3400, startX: 2400, animal: true });
  const onRamp = r.animalTrace.filter((s) => s.surf !== null);
  const worst = onRamp.reduce((m, s) => Math.max(m, Math.abs(s.bottom - s.surf)), 0);
  ok('9. o leão anda sobre o morro (não o atravessa)', onRamp.length > 10 && worst <= 4,
    `n=${onRamp.length} maior desvio=${worst.toFixed(1)}px`);
}

// ---------- 10. Frame longo (catch-up de vários steps por frame) ----------
{
  const r = await traverse({ variant: 'big', rampX: 3000, startX: 2400, fps: 20 });
  const settled = r.trace.filter((s) => s.surf !== null && s.vy === 0);
  const worst = settled.reduce((m, s) => Math.max(m, Math.abs(s.bottom - s.surf)), 0);
  const minBottom = Math.min(...r.trace.map((s) => s.bottom));
  ok('10. o encaixe não se importa com 20fps',
    settled.length > 5 && worst <= 3 && minBottom <= r.groundTop - r.spec.rise + 6,
    `n=${settled.length} desvio=${worst.toFixed(1)}px topo=${minBottom.toFixed(0)}`);
}

// ---------- 12-14. Abertura guiada, numa corrida de verdade ----------
{
  const p2 = await context.newPage();
  const err2 = [];
  p2.on('pageerror', (e) => err2.push(String(e)));
  p2.on('console', (m) => { if (m.type() === 'error') err2.push(m.text()); });
  // Jogador estreante: é quem recebe as dicas
  await p2.addInitScript(() => {
    localStorage.setItem('furious_rhino_attempts', '0');
    localStorage.setItem('furious_rhino_player_id', 'e2e-ramp-novato');
  });
  await p2.goto(`${BASE}/?debug=1`, { waitUntil: 'networkidle' });
  await p2.waitForTimeout(1500);
  const pwa2 = p2.locator('#pwa-modal');
  if (await pwa2.isVisible().catch(() => false)) { await p2.click('#pwa-skip'); await p2.waitForTimeout(200); }
  await p2.locator('#start-screen').click({ position: { x: 640, y: 650 } });
  await p2.waitForTimeout(400);

  const opening = await p2.evaluate(async () => {
    const s = window.game.scene.keys.GameScene;
    s.invincible = true;
    const sp = s.rhino.getSprite();
    const live = () => {
      const out = [];
      const add = (g, kind) => s.spawnManager[g]().children.entries
        .forEach((e) => { if (e.active) out.push({ kind, x: Math.round(e.x) }); });
      add('getWallsGroup', 'wall'); add('getSpikesGroup', 'spike');
      add('getTowersGroup', 'tower'); add('getAnimalsGroup', 'animal');
      add('getRampsGroup', 'ramp');
      return out;
    };
    let hints = 0;
    const origToast = s.showToast.bind(s);
    s.showToast = (t, o) => { hints++; return origToast(t, o); };

    const atStart = live();
    await new Promise((r) => { const tick = () => (sp.x > 3400 ? r() : requestAnimationFrame(tick)); tick(); });
    const beforeFirst = live();
    // Acumula tudo que apareceu: os obstáculos são reciclados assim que a
    // câmera passa, então uma foto no fim não veria o espinho dos 125m
    const seen = new Map();
    await new Promise((r) => {
      const tick = () => {
        live().forEach((o) => seen.set(`${o.kind}@${o.x}`, o));
        return sp.x > 6800 ? r() : requestAnimationFrame(tick);
      };
      tick();
    });
    return {
      atStart, beforeFirst, hints, x: Math.round(sp.x),
      seen: [...seen.values()].sort((a, b) => a.x - b.x),
    };
  });

  ok('12. nada é gerado nos primeiros ~3s de corrida',
    opening.atStart.length === 0, JSON.stringify(opening.atStart));

  const first = opening.beforeFirst;
  ok('13. o primeiro obstáculo é a rampa aos 90m',
    first.length === 1 && first[0].kind === 'ramp' && first[0].x === 3600,
    JSON.stringify(first));

  const script = opening.seen.filter((o) => o.x <= 6400);
  const roteiro = script.map((o) => `${o.kind}@${o.x}`).join(',');
  ok('14. o roteiro entrega rampa → espinho → parede, nessa ordem',
    roteiro === 'ramp@3600,spike@5000,wall@6400' && opening.hints >= 3,
    `${roteiro} dicas=${opening.hints}`);

  errors.push(...err2);
  await p2.close();
}

// ---------- 15-17. Marcas na pista (seu recorde / rival / líder) ----------
{
  const p3 = await context.newPage();
  const err3 = [];
  p3.on('pageerror', (e) => err3.push(String(e)));
  p3.on('console', (m) => { if (m.type() === 'error') err3.push(m.text()); });
  await p3.addInitScript(() => {
    localStorage.setItem('furious_rhino_attempts', '50');
    localStorage.setItem('furious_rhino_player_id', 'e2e-ramp-marcas');
    localStorage.setItem('furious_rhino_record', '100');
    localStorage.setItem('furious_rhino_rivals', JSON.stringify({
      leader: { name: 'Thomas', score: 300 },
      rival: { name: 'Teco', score: 200 },
    }));
  });
  await p3.goto(`${BASE}/?debug=1`, { waitUntil: 'networkidle' });
  await p3.waitForTimeout(1500);
  const pwa3 = p3.locator('#pwa-modal');
  if (await pwa3.isVisible().catch(() => false)) { await p3.click('#pwa-skip'); await p3.waitForTimeout(200); }
  await p3.locator('#start-screen').click({ position: { x: 640, y: 650 } });
  await p3.waitForTimeout(400);

  const marks = await p3.evaluate(async () => {
    const s = window.game.scene.keys.GameScene;
    s.invincible = true;
    const planted = s.trackMarks.map((m) => m.x);
    const toasts = [];
    const orig = s.showToast.bind(s);
    s.showToast = (t, o) => { toasts.push(t); return orig(t, o); };
    const sp = s.rhino.getSprite();
    await new Promise((r) => { const tick = () => (sp.x > 12600 ? r() : requestAnimationFrame(tick)); tick(); });
    return { planted, toasts, ticks: document.querySelectorAll('#progress-marks .rival-mark').length };
  });

  ok('15. as três estacas são plantadas na distância certa',
    JSON.stringify(marks.planted) === JSON.stringify([4000, 8000, 12000]),
    JSON.stringify(marks.planted));
  ok('16. a barra do HUD espelha as três marcas', marks.ticks === 3, `${marks.ticks} marcas`);
  const provoc = marks.toasts.filter((t) => /RECORDE FICOU|VOCÊ PASSOU|NOVO LÍDER/.test(t));
  ok('17. ultrapassar cada marca provoca o jogador', provoc.length === 3,
    JSON.stringify(provoc));

  errors.push(...err3);
  await p3.close();
}

// ---------- 18-21. Portão a 1000m: explosão, cidade, paredes-prédio ----------
{
  const p4 = await context.newPage();
  const err4 = [];
  p4.on('pageerror', (e) => err4.push(String(e)));
  p4.on('console', (m) => { if (m.type() === 'error') err4.push(m.text()); });
  await p4.addInitScript(() => {
    localStorage.setItem('furious_rhino_attempts', '50');
    localStorage.setItem('furious_rhino_player_id', 'e2e-ramp-portao');
  });
  await p4.goto(`${BASE}/?debug=1`, { waitUntil: 'networkidle' });
  await p4.waitForTimeout(1500);
  const pwa4 = p4.locator('#pwa-modal');
  if (await pwa4.isVisible().catch(() => false)) { await p4.click('#pwa-skip'); await p4.waitForTimeout(200); }
  await p4.locator('#start-screen').click({ position: { x: 640, y: 650 } });
  await p4.waitForTimeout(400);

  const gate = await p4.evaluate(async () => {
    const s = window.game.scene.keys.GameScene;
    s.invincible = true;
    s.spawnManager.openingIndex = 999;
    const missing = [];
    ['jaulas', 'aviario', 'savana', 'floresta', 'pantano', 'cidade'].forEach((b) => {
      ['bg-far-', 'bg-near-'].forEach((pre) => {
        if (!s.textures.exists(pre + b)) missing.push(pre + b);
      });
    });
    ['ground', 'mid', 'high'].forEach((h) => ['', '-city'].forEach((sk) => {
      [`cracked-${h}${sk}`, `cracked-${h}${sk}-broken`].forEach((k) => {
        if (!s.textures.exists(k)) missing.push(k);
      });
    }));
    if (!s.textures.exists('zoo-gate-broken')) missing.push('zoo-gate-broken');
    // Skins de cidade dos demais obstáculos (v1.6, 3ª rodada)
    ['small', 'big', 'jump'].forEach((v) => {
      [`ramp-${v}-city`, `ramp-${v}-city-rubble`].forEach((k) => {
        if (!s.textures.exists(k)) missing.push(k);
      });
    });
    ['spike-tower-city', 'tranq-tower-city'].forEach((k) => {
      if (!s.textures.exists(k)) missing.push(k);
    });

    // Paredes dos dois lados do portão
    s.spawnManager.getWallsGroup().children.entries.forEach((w) => w.deactivate());
    s.spawnManager.nextSpawnX = 900000;
    s.spawnManager.spawnWall(38000, 'mid');
    s.spawnManager.spawnWall(42000, 'mid');
    const walls = s.spawnManager.getWallsGroup().children.entries
      .filter((w) => w.active).map((w) => w.texture.key).sort();

    const sp = s.rhino.getSprite();
    sp.body.reset(39500, 620);
    s.cameras.main.setScroll(39500 - 440, 0);
    await new Promise((r) => { const tick = () => (s.gateReached ? r() : requestAnimationFrame(tick)); tick(); });
    const pausedNoInstante = s.physics.world.isPaused;
    await new Promise((r) => setTimeout(r, 700));

    return {
      missing, walls, pausedNoInstante,
      gateTex: s.gateSprite.texture.key,
      biome: s.biomeIndex,
      escaped: s.escaped,
      pausedDepois: s.physics.world.isPaused,
      cars: s.bgCars.alpha,
      confete: Boolean(s.confettiEmitter),
    };
  });

  ok('18. todas as texturas dos 6 biomas e dos 2 skins de parede existem',
    gate.missing.length === 0, gate.missing.slice(0, 4).join(', '));
  ok('19. o portão explode e o bioma vira cidade',
    gate.gateTex === 'zoo-gate-broken' && gate.biome === 5 && gate.escaped &&
    gate.cars > 0.5 && gate.confete,
    `tex=${gate.gateTex} bioma=${gate.biome} carros=${gate.cars.toFixed(2)}`);
  ok('20. a fuga NÃO pausa a física (a corrida não para)',
    gate.pausedNoInstante === false && gate.pausedDepois === false,
    `instante=${gate.pausedNoInstante} depois=${gate.pausedDepois}`);
  ok('21. parede vira prédio depois do portão',
    JSON.stringify(gate.walls) === JSON.stringify(['cracked-mid', 'cracked-mid-city']),
    JSON.stringify(gate.walls));

  // ---------- 25-27. Espinho, rampa e torre também mudam de skin ----------
  const skins = await p4.evaluate(() => {
    const s = window.game.scene.keys.GameScene;
    const live = (g) => s.spawnManager[g]().children.entries.filter((e) => e.active);
    const clear = (g) => s.spawnManager[g]().children.entries.forEach((e) => e.deactivate());

    clear('getSpikesGroup');
    s.spawnManager.spawnSpike(38000, 'tower');
    s.spawnManager.spawnSpike(42000, 'tower');
    const spikes = live('getSpikesGroup').map((e) => e.texture.key).sort();

    clear('getTowersGroup');
    s.spawnManager.spawnTower(38000);
    s.spawnManager.spawnTower(42000);
    const towers = live('getTowersGroup').map((e) => e.texture.key).sort();

    clear('getRampsGroup');
    s.spawnManager.spawnRamp(38000, 'big');
    s.spawnManager.spawnRamp(42000, 'big');
    const ramps = live('getRampsGroup').map((e) => e.texture.key).sort();
    // A rampa de cidade destruída tem de virar entulho de cidade
    const cityRamp = live('getRampsGroup').find((e) => /-city$/.test(e.texture.key));
    cityRamp.smash();
    const smashed = cityRamp.texture.key;

    clear('getSpikesGroup'); clear('getTowersGroup'); clear('getRampsGroup');
    return { spikes, towers, ramps, smashed };
  });

  ok('25. pedestal do espinho vira concreto depois do portão',
    JSON.stringify(skins.spikes) === JSON.stringify(['spike-tower', 'spike-tower-city']),
    JSON.stringify(skins.spikes));
  ok('26. torre vira equipamento urbano depois do portão',
    JSON.stringify(skins.towers) === JSON.stringify(['tranq-tower', 'tranq-tower-city']),
    JSON.stringify(skins.towers));
  ok('27. rampa vira concreto/asfalto, e o entulho acompanha',
    JSON.stringify(skins.ramps) === JSON.stringify(['ramp-big', 'ramp-big-city']) &&
    skins.smashed === 'ramp-big-city-rubble',
    `${JSON.stringify(skins.ramps)} smash=${skins.smashed}`);

  // ---------- 28. O trampolim domina o sorteio de rampa ----------
  const pool = await p4.evaluate(() => {
    const s = window.game.scene.keys.GameScene;
    const sample = (x) => {
      const counts = {};
      for (let i = 0; i < 200; i++) {
        s.spawnManager.getRampsGroup().children.entries.forEach((e) => e.deactivate());
        s.spawnManager.spawnRamp(x);
        const r = s.spawnManager.getRampsGroup().children.entries.find((e) => e.active);
        counts[r.variant] = (counts[r.variant] || 0) + 1;
      }
      return counts;
    };
    const t1 = sample(4000);   // tier 1 → pool "early"
    const t2 = sample(12000);  // tier 2 → pool "full"
    s.spawnManager.getRampsGroup().children.entries.forEach((e) => e.deactivate());
    return { t1, t2 };
  });
  ok('28. trampolim já no tier 1 e maioria em todos',
    (pool.t1.jump || 0) >= 100 && !pool.t1.big &&
    (pool.t2.jump || 0) >= 90 && (pool.t2.big || 0) > 0,
    `t1=${JSON.stringify(pool.t1)} t2=${JSON.stringify(pool.t2)}`);

  errors.push(...err4);
  await p4.close();
}

// ---------- 22-24. Teclas de PC, pausa e convite do apelido ----------
{
  const p5 = await context.newPage();
  const err5 = [];
  p5.on('pageerror', (e) => err5.push(String(e)));
  p5.on('console', (m) => { if (m.type() === 'error') err5.push(m.text()); });
  await p5.addInitScript(() => {
    localStorage.setItem('furious_rhino_attempts', '50');
    localStorage.setItem('furious_rhino_player_id', 'e2e-ramp-teclas');
    // Jogador com nome AUTOMÁTICO: é quem deve receber o convite
    localStorage.setItem('furious_rhino_player_name', 'Anonimo_99');
    localStorage.setItem('furious_rhino_name_is_auto', '1');
    localStorage.setItem('furious_rhino_name_asked_at', '0');
    localStorage.setItem('furious_rhino_last_rank', '7');
  });
  await p5.goto(`${BASE}/?debug=1`, { waitUntil: 'networkidle' });
  await p5.waitForTimeout(1500);
  const pwa5 = p5.locator('#pwa-modal');
  if (await pwa5.isVisible().catch(() => false)) { await p5.click('#pwa-skip'); await p5.waitForTimeout(200); }

  // P na tela inicial é pausa, não "começar"
  await p5.keyboard.press('p');
  await p5.waitForTimeout(250);
  const startedByP = await p5.evaluate(() => window.game.scene.keys.GameScene.started);

  await p5.locator('#start-screen').click({ position: { x: 640, y: 650 } });
  await p5.waitForTimeout(600);
  await p5.evaluate(() => { window.game.scene.keys.GameScene.invincible = true; });

  await p5.keyboard.press('Space');
  await p5.waitForTimeout(100);
  const vy = await p5.evaluate(() => window.game.scene.keys.GameScene.rhino.getSprite().body.velocity.y);
  await p5.keyboard.press('Enter');
  await p5.waitForTimeout(60);
  const dashState = await p5.evaluate(() => window.game.scene.keys.GameScene.rhino.dashState);
  ok('22. ESPAÇO pula e ENTER investe (setas continuam valendo)',
    !startedByP && vy < 0 && dashState === 'active', `vy=${Math.round(vy)} dash=${dashState}`);

  // Pausa congela o mundo e o tempo parado não entra na telemetria
  await p5.keyboard.press('p');
  await p5.waitForTimeout(300);
  const xa = await p5.evaluate(() => window.game.scene.keys.GameScene.rhino.getSprite().x);
  await p5.waitForTimeout(1200);
  const pausedState = await p5.evaluate(() => {
    const s = window.game.scene.keys.GameScene;
    return {
      paused: s.paused,
      x: s.rhino.getSprite().x,
      modal: getComputedStyle(document.getElementById('pause-modal')).display,
    };
  });
  await p5.keyboard.press('p');
  await p5.waitForTimeout(400);
  const after = await p5.evaluate(() => {
    const s = window.game.scene.keys.GameScene;
    return { paused: s.paused, pausedMs: s.pausedMs, x: s.rhino.getSprite().x };
  });
  ok('23. P pausa e retoma, e o tempo parado é descontado',
    pausedState.paused && pausedState.modal === 'block' &&
    Math.abs(pausedState.x - xa) < 1 && !after.paused &&
    after.pausedMs > 1000 && after.x > pausedState.x,
    `parado=${(pausedState.x - xa).toFixed(1)}px pausedMs=${after.pausedMs}`);

  // Convite do apelido no momento do orgulho
  const invite = await p5.evaluate(async () => {
    const s = window.game.scene.keys.GameScene;
    s.openNicknameModal(true, true);
    const title = document.getElementById('nickname-title').textContent;
    const skip = document.getElementById('nickname-skip');
    const skipTxt = skip.textContent;
    skip.click();
    await new Promise((r) => setTimeout(r, 200));
    return {
      title, skipTxt,
      nomeDepois: localStorage.getItem('furious_rhino_player_name'),
      aindaAuto: localStorage.getItem('furious_rhino_name_is_auto'),
      fechou: getComputedStyle(document.getElementById('nickname-modal')).display,
    };
  });
  ok('24. convite do apelido usa a posição e "Agora não" não regrava nada',
    /#7 do mundo/.test(invite.title) && invite.skipTxt === 'Agora não' &&
    invite.nomeDepois === 'Anonimo_99' && invite.aindaAuto === '1' &&
    invite.fechou === 'none',
    `"${invite.title}" / "${invite.skipTxt}" / nome=${invite.nomeDepois}`);

  errors.push(...err5);
  await p5.close();
}

// ---------- 11. Zero erro de JS ----------
const fatal = errors.filter((e) => !/net::|Failed to load resource|ERR_/.test(e));
ok('11. nenhum erro de JS', fatal.length === 0, fatal.slice(0, 3).join(' | '));

await browser.close();
console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} OK`);
process.exit(failed ? 1 : 0);
