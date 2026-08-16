// E2E do especial FÚRIA TOTAL + spawn por bioma (v1.7.0), num navegador real:
//   node tools/e2e-special.mjs   (requer o jogo servido em localhost:3000)
//
// Cobre o que test-stats não alcança: a carga por distância, o toque no
// ícone SEM disparar dash (stopPropagation), a invencibilidade que explode
// (espinho e parede desalinhada), a drenagem até reverter, e o sorteio de
// espécie respeitando BIOME_ANIMALS.
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const results = [];
const ok = (name, cond, extra = '') =>
  results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await context.addInitScript(() => {
  localStorage.setItem('furious_rhino_attempts', '50');
  // Sonda claude-* (regra do CLAUDE.md), pra ficar filtrada do painel/digest
  // se algum dia escrever. Esta suíte não precisa validar a escrita real —
  // sem o opt-in furious_rhino_allow_local_write, StorageManager.allowsRemoteWrite()
  // já bloqueia qualquer gravação em ambiente local, então nem depende mais
  // do tamanho do id pra nunca sujar produção
  localStorage.setItem('furious_rhino_player_id', 'claude-e2e-special');
  localStorage.setItem('furious_rhino_notify_off', '1');
});

const errors = [];
const page = await context.newPage();
page.on('pageerror', (e) => errors.push(String(e)));
// Rede: StorageManager.allowsRemoteWrite() já impede a suíte de sequer
// tentar escrever no Firestore em ambiente local — filtro mantido como
// defesa extra caso alguém rode com o opt-in ligado — só erro de JS interessa
page.on('console', (m) => {
  if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) {
    errors.push(m.text());
  }
});
await page.goto(`${BASE}/?debug=1`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const pwa = page.locator('#pwa-modal');
if (await pwa.isVisible().catch(() => false)) {
  await page.click('#pwa-skip');
  await page.waitForTimeout(200);
}
await page.locator('#start-screen').click({ position: { x: 640, y: 650 } });
await page.waitForTimeout(600);

// ---------- 1. Sorteio de espécie respeita o bioma ----------
const biomePicks = await page.evaluate(async () => {
  const s = window.game.scene.keys.GameScene;
  const { Constants } = await import('./js/utils/Constants.js');
  const out = {};
  for (const [i, biome] of Constants.BIOMES.entries()) {
    const x = i * 8000 + 4000; // centro da faixa (cidade: 44000, pós-portão)
    const picks = new Set();
    for (let n = 0; n < 60; n++) picks.add(s.spawnManager.pickBiomeAnimal(x));
    out[biome] = {
      picks: [...picks],
      valid: [...picks].every((t) => Constants.BIOME_ANIMALS[biome].includes(t)),
      variety: picks.size > 1 || Constants.BIOME_ANIMALS[biome].length === 1,
    };
  }
  // voador sob demanda: floresta não tem voador próprio → cai no pássaro
  out.flyFallback = s.spawnManager.pickBiomeAnimal(3 * 8000 + 4000, 'fly');
  return out;
});
for (const [biome, r] of Object.entries(biomePicks)) {
  if (biome === 'flyFallback') continue;
  ok(`bioma ${biome}: só espécies do elenco local`, r.valid && r.variety, r.picks.join(','));
}
ok('floresta sem voador cai no pássaro genérico', biomePicks.flyFallback === 'bird',
  biomePicks.flyFallback);

// ---------- 2. Carga por distância + sinalização ----------
const charge = await page.evaluate(async () => {
  const s = window.game.scene.keys.GameScene;
  const sprite = s.rhino.getSprite();
  // limpa a pista e teleporta 36000px à frente: dx entra na carga
  ['getWallsGroup', 'getSpikesGroup', 'getAnimalsGroup', 'getTowersGroup',
    'getDartsGroup', 'getRampsGroup'].forEach((g) =>
    s.spawnManager[g]().children.entries.forEach((e) => e.deactivate()));
  s.spawnManager.nextSpawnX = 999999;
  s.spawnManager.openingIndex = 999;
  const before = s.furySystem.charge;
  sprite.body.reset(sprite.x + 36000, 620);
  s.cameras.main.setScroll(sprite.x - 640, 0);
  await new Promise((r) => setTimeout(r, 300)); // alguns frames
  return { before, after: s.furySystem.charge, pulsing: !!s.furySystem.pulseTween };
});
ok('carga: enche após FURY_FULL_DISTANCE_PX de corrida', charge.after >= 1,
  `antes=${charge.before.toFixed(2)} depois=${charge.after.toFixed(2)}`);
ok('carga cheia: ícone pulsando (sinalização)', charge.pulsing);

// ---------- 3. Toque no ícone ativa SEM disparar dash ----------
const iconTap = await page.evaluate(async () => {
  const s = window.game.scene.keys.GameScene;
  const canvas = window.game.canvas.getBoundingClientRect();
  // ícone da fúria em coords de jogo (1280x720 → coords de página via rect)
  const gx = 1280 - 20 - 130, gy = 20 + 30;
  return {
    dashesBefore: s.runDashes,
    px: canvas.left + (gx / 1280) * canvas.width,
    py: canvas.top + (gy / 720) * canvas.height,
  };
});
await page.mouse.click(iconTap.px, iconTap.py);
await page.waitForTimeout(250);
const afterTap = await page.evaluate(() => {
  const s = window.game.scene.keys.GameScene;
  return {
    rampage: s.furySystem.rampage,
    anim: s.rhino.getSprite().anims.currentAnim?.key,
    dashes: s.runDashes,
    specials: s.runSpecials,
  };
});
ok('toque no ícone: FÚRIA TOTAL ativa', afterTap.rampage);
ok('toque no ícone: NÃO virou dash (stopPropagation)',
  afterTap.dashes === iconTap.dashesBefore, `dashes=${afterTap.dashes}`);
ok('transformação: anim do rino em chamas', afterTap.anim === 'rhino-fire-run', afterTap.anim);
ok('telemetria: runSpecials contou', afterTap.specials === 1);

// ---------- 4. Invencível explode: espinho e parede desalinhada ----------
const smash = await page.evaluate(async () => {
  const s = window.game.scene.keys.GameScene;
  const sprite = s.rhino.getSprite();
  const x = sprite.x;
  s.spawnManager.spawnSpike(x + 400, 'ground');
  s.spawnManager.spawnWall(x + 800, 'high'); // fresta ALTA: no chão = desalinhado
  await new Promise((r) => setTimeout(r, 2000)); // atravessa os dois
  const spikeAlive = s.spawnManager.getSpikesGroup().children.entries.some((e) => e.active);
  const wall = s.spawnManager.getWallsGroup().children.entries.find((e) => e.active);
  return {
    spikeAlive,
    wallBroken: wall ? wall.broken : 'reciclada',
    gameOver: s.gameOver,
    walls: s.runWallsBroken,
  };
});
ok('rampage: espinho explodiu (era 100% letal)', smash.spikeAlive === false);
ok('rampage: parede quebrou mesmo desalinhado da fresta',
  smash.wallBroken === true || smash.wallBroken === 'reciclada', String(smash.wallBroken));
ok('rampage: rino continua vivo', smash.gameOver === false);

// ---------- 4b. v1.8: o topo da parede desaba (crop + tombo + pool limpo) ----------
const collapse = await page.evaluate(async () => {
  const s = window.game.scene.keys.GameScene;
  const sprite = s.rhino.getSprite();
  // Parede do zoo à frente — o rampage ainda está ativo, quebra no contato
  s.spawnManager.spawnWall(sprite.x + 700, 'ground');
  const wall = s.spawnManager.getWallsGroup().children.entries
    .find((e) => e.active && !e.broken);
  await new Promise((resolve) => {
    const t0 = performance.now();
    const tick = () => ((wall.broken || performance.now() - t0 > 4000)
      ? resolve() : requestAnimationFrame(tick));
    tick();
  });
  const justBroken = {
    broken: wall.broken,
    cropped: wall.isCropped,
    hasPiece: Boolean(wall.topPiece),
    pieceActive: wall.topPiece ? wall.topPiece.active : false,
  };
  await new Promise((r) => setTimeout(r, 350));
  const midAngle = wall.topPiece ? wall.topPiece.angle : -1;
  await new Promise((r) => setTimeout(r, 950));
  const pieceGone = wall.topPiece === null;
  // Reciclagem do pool de 8: deactivate + reset DEVEM limpar crop e pedaço
  wall.deactivate();
  wall.reset(999000);
  const recycled = { cropped: wall.isCropped, piece: wall.topPiece, broken: wall.broken };
  wall.deactivate();
  return { justBroken, midAngle, pieceGone, recycled };
});
ok('desabamento: parede quebrada vira toco cropado com pedaço animando',
  collapse.justBroken.broken && collapse.justBroken.cropped &&
  collapse.justBroken.hasPiece && collapse.justBroken.pieceActive,
  JSON.stringify(collapse.justBroken));
// v1.8 (15/08): o tombo virou para a ESQUERDA — ângulo negativo crescendo em
// módulo (o sentinela "sem pedaço" é -1, que segue reprovando: -1 > -5)
ok('desabamento: o topo tomba para a esquerda (ângulo negativo crescendo)',
  collapse.midAngle < -5, `angle=${collapse.midAngle.toFixed(1)}`);
ok('desabamento: pedaço se autodestrói ao fim do tombo', collapse.pieceGone);
ok('desabamento: reciclagem limpa crop e pedaço (sem vazamento no pool)',
  !collapse.recycled.cropped && collapse.recycled.piece === null && !collapse.recycled.broken,
  JSON.stringify(collapse.recycled));

// Prédio da cidade (pós-portão): mesma família de contrato, sem depender de
// atravessar a arena do boss — quebra direta na entidade
const city = await page.evaluate(() => {
  const s = window.game.scene.keys.GameScene;
  s.spawnManager.spawnWall(50000, 'high');
  const w = s.spawnManager.getWallsGroup().children.entries
    .find((e) => e.active && e.x === 50000);
  const tex = w.texture.key;
  const skin = w.skin;
  w.break();
  const brokenTex = w.texture.key;
  const cropped = w.isCropped;
  w.deactivate();
  return { tex, skin, brokenTex, cropped };
});
ok('cidade: parede pós-portão é prédio (-city) e o toco cropa igual',
  city.skin === '-city' && city.tex === 'cracked-high-city' &&
  city.brokenTex === 'cracked-high-city-broken' && city.cropped,
  JSON.stringify(city));

// ---------- 5. Drenagem reverte a transformação ----------
const drained = await page.evaluate(async () => {
  const { Constants } = await import('./js/utils/Constants.js');
  const s = window.game.scene.keys.GameScene;
  // acelera o relógio do teste, não o do jogo: encurta a duração restante
  s.furySystem.charge = Math.min(s.furySystem.charge, 0.12);
  await new Promise((r) => setTimeout(r, Constants.SPECIAL_DURATION_MS * 0.12 + 600));
  const sprite = s.rhino.getSprite();
  return {
    rampage: s.furySystem.rampage,
    charge: s.furySystem.charge,
    anim: sprite.anims.currentAnim?.key,
    alpha: sprite.alpha,
  };
});
ok('drenagem: modo terminou sozinho', drained.rampage === false);
// o rino segue correndo depois do fim: a carga já recomeça a subir por dx
ok('drenagem: medidor esvaziou (e recomeça do zero)', drained.charge < 0.1,
  `charge=${drained.charge.toFixed(3)}`);
ok('drenagem: rino voltou ao normal', drained.anim === 'rhino-run' && drained.alpha === 1,
  `anim=${drained.anim} alpha=${drained.alpha}`);

// ---------- 6. Sem erros de JS ----------
ok('nenhum erro de JS', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();
console.log(results.join('\n'));
const fails = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - fails}/${results.length} OK`);
process.exit(fails ? 1 : 0);
