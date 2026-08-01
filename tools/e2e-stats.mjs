// E2E num navegador real (Playwright/Chromium):
//   node tools/e2e-stats.mjs   (requer o jogo servido em localhost:3000)
// Cobre: telemetria (escrita real no Firestore com o playerId de sonda
// 'claude-rules-check-01' — não cria poluição nova), portão dos 800m
// (continuar E sair) e a página /?stats (filtro, recorde, funil dinâmico).
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const results = [];
const ok = (name, cond, extra = '') =>
  results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });

// Totais locais MAIORES que os do doc-sonda: as regras exigem monotonia e
// o doc acumula a cada execução da suíte — sementes fixas quebrariam na
// rodada seguinte. Derivar do relógio garante crescimento entre rodadas.
await context.addInitScript(() => {
  const base = Math.floor(Date.now() / 1000) - 1753000000; // cresce 1/s
  localStorage.setItem('furious_rhino_player_id', 'claude-rules-check-01');
  // record gigante → bestM trava no teto (10000) em toda rodada: monotonia
  // garantida no servidor e nenhuma corrida do teste gera "novo recorde"
  localStorage.setItem('furious_rhino_record', String(base));
  localStorage.setItem('furious_rhino_attempts', String(base));
  localStorage.setItem('furious_rhino_playtime_s', String(base));
  localStorage.setItem('furious_rhino_wins', String(base));
  localStorage.setItem('furious_rhino_deaths', JSON.stringify(
    { t1: 2, t2: 2, t3: 1, t4: 0, t5: 1, t6: 0, wall: 1, spike: 1, animal: 1, dart: 1, tower: 2, fall: 0 }
  ));
  localStorage.setItem('furious_rhino_geo', JSON.stringify(
    { ok: true, country: 'BR', region: 'Rio de Janeiro', city: 'Rio de Janeiro', fetchedAt: Date.now() }
  ));
});

async function newGamePage() {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${BASE}/?debug=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  return { page, errors };
}
const fatal = (errors) => errors.filter((e) => !/net::|Failed to load resource|ERR_/.test(e));

// ---------- 1. Tela de início dispara o reenvio e o Firestore aceita ----------
{
  // Listener de rede ANTES do goto — a escrita pode sair nos primeiros ms
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const writes = [];
  page.on('response', async (res) => {
    if (res.url().includes('firestore.googleapis.com') && res.request().method() === 'POST') {
      let body = '';
      if (!res.ok()) { try { body = (await res.text()).slice(0, 200); } catch (e) { /* stream */ } }
      writes.push({ status: res.status(), body });
    }
  });
  await page.goto(`${BASE}/?debug=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000); // SDK dinâmico + reenvio da tela de início

  ok('reenvio na tela de início disparou', writes.length > 0,
    writes.map((w) => `${w.status}${w.body ? ' ' + w.body : ''}`).join(' | ') || 'NENHUMA escrita');
  ok('Firestore aceitou a escrita (200)', writes.some((w) => w.status === 200));
  ok('sem erros de JS na tela de início', fatal(errors).length === 0, fatal(errors).slice(0, 2).join(' | '));
  await page.close();
}

// ---------- 2. Portão dos 800m: CONTINUAR (modo infinito) ----------
{
  const { page, errors } = await newGamePage();
  await page.locator('#start-screen').click({ position: { x: 640, y: 650 } });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const s = window.game.scene.keys.GameScene;
    s.rhino.getSprite().body.reset(31600, 500);
  });

  let modalOk = true;
  try {
    await page.waitForSelector('#gate-modal', { state: 'visible', timeout: 6000 });
  } catch (e) { modalOk = false; }
  ok('portão: modal de escolha abriu ao cruzar 800m', modalOk);

  const frozen = await page.evaluate(() => {
    const s = window.game.scene.keys.GameScene;
    return s.physics.world.isPaused && s.atGate;
  });
  ok('portão: física pausada durante a escolha', frozen);

  const infinity = await page.evaluate(() =>
    document.getElementById('progress-infinity').offsetParent !== null);
  ok('portão: selo ∞ apareceu na barra', infinity);

  await page.click('#gate-continue');
  // Checagem RÁPIDA (300ms): antes de o rino alcançar os obstáculos do t5
  // (spawns retomam em 33000) — esperar demais deixa ele morrer sozinho
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => {
    const s = window.game.scene.keys.GameScene;
    return {
      resumed: !s.physics.world.isPaused && !s.atGate && !s.gameOver,
      spawnResumed: s.spawnManager.nextSpawnX >= 33000,
      x: Math.round(s.rhino.getSprite().x),
    };
  });
  ok('portão: física retomou após Continuar', after.resumed, `x=${after.x}`);
  ok('portão: spawn retomou no modo infinito (nextSpawnX >= 33000)', after.spawnResumed);

  // Morte no modo infinito → tier t5 + reconhecimento da fuga
  await page.evaluate(() => {
    const s = window.game.scene.keys.GameScene;
    s.rhino.getSprite().body.reset(33500, 500);
    s.endGame(false, 'spike');
  });
  await page.waitForTimeout(800);
  const deaths = await page.evaluate(() => localStorage.getItem('furious_rhino_deaths'));
  ok('portão: morte no infinito registrada em t5', /"t5":2/.test(deaths || ''), deaths || '');
  const escapeMsg = await page.locator('#gate-escape-message').textContent();
  ok('portão: game over reconhece a fuga', /escapou/.test(escapeMsg), escapeMsg);
  ok('sem erros de JS (continuar)', fatal(errors).length === 0, fatal(errors).slice(0, 2).join(' | '));
  await page.close();
}

// ---------- 3. Portão dos 800m: SAIR (vitória com cutscene) ----------
{
  const { page, errors } = await newGamePage();
  await page.locator('#start-screen').click({ position: { x: 640, y: 650 } });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const s = window.game.scene.keys.GameScene;
    s.rhino.getSprite().body.reset(31600, 500);
  });
  await page.waitForSelector('#gate-modal', { state: 'visible', timeout: 6000 });
  await page.click('#gate-exit');

  const banner = await page.evaluate(() => !document.getElementById('victory-banner').hidden);
  ok('sair: cutscene com banner LIVRE!', banner);

  let winOk = true;
  try {
    await page.waitForSelector('#game-win', { state: 'visible', timeout: 8000 });
  } catch (e) { winOk = false; }
  ok('sair: overlay de vitória após a cutscene', winOk);
  if (winOk) {
    const dist = await page.locator('#win-final-score').textContent();
    ok('sair: distância ~800m', parseInt(dist, 10) >= 790, `${dist}m`);
  }
  ok('sem erros de JS (sair)', fatal(errors).length === 0, fatal(errors).slice(0, 2).join(' | '));
  await page.close();
}

// ---------- 4. Página /?stats: filtro, recorde e funil dinâmico ----------
{
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/?stats`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  const body = await page.locator('#stats-page').textContent();
  ok('painel: renderizou dados', /Visão geral/.test(body), body.slice(0, 60));
  ok('painel: select de jogador presente', await page.locator('#stats-player').count() === 1);
  ok('painel: card de recorde com nome', /recorde —/.test(body));
  ok('painel: funil com degrau do portão (800m)', /800m/.test(body));
  ok('painel: categoria Torre', /Torre/.test(body));
  ok('painel: tiers do modo infinito', /Tier 5/.test(body) && /Tier 6/.test(body));

  // Filtrar por um jogador muda a visão (agregado → individual)
  const options = await page.locator('#stats-player option').count();
  if (options > 1) {
    await page.selectOption('#stats-player', { index: 1 });
    await page.waitForTimeout(400);
    const one = await page.locator('#stats-page').textContent();
    ok('painel: filtro individual renderiza', /Visão geral/.test(one));
  } else {
    ok('painel: filtro individual renderiza', false, 'sem jogadores no select');
  }
  ok('sem erros de JS no /?stats', errors.filter((e) => !/net::|ERR_/.test(e)).length === 0);
  await page.close();
}

await browser.close();
console.log(results.join('\n'));
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
