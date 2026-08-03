// E2E num navegador real (Playwright/Chromium):
//   node tools/e2e-stats.mjs   (requer o jogo servido em localhost:3000)
// Cobre: telemetria (escrita real no Firestore com o playerId de sonda
// 'claude-rules-check-01' — não cria poluição nova), portão dos 800m
// (continuar E sair) e a página /?stats (filtro, recorde, funil dinâmico).
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
// Chave do modo detalhado do painel (o código guarda só o SHA-256 dela —
// ver STATS_KEY_HASH em js/stats/StatsDashboard.js)
const STATS_KEY = '0929';
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

// v1.5.0: o alerta de instalação abre sobre a tela inicial e, enquanto
// houver modal aberto, nenhum toque inicia a corrida (guarda `modal-open`)
async function startGame(page) {
  const pwa = page.locator('#pwa-modal');
  if (await pwa.isVisible().catch(() => false)) {
    await page.click('#pwa-skip');
    await page.waitForTimeout(200);
  }
  await page.locator('#start-screen').click({ position: { x: 640, y: 650 } });
  await page.waitForTimeout(800);
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

// ---------- 2. Portão dos 800m: cruzamento DIRETO (sem parada) ----------
{
  const { page, errors } = await newGamePage();
  await startGame(page);
  await page.evaluate(() => {
    const s = window.game.scene.keys.GameScene;
    s.rhino.getSprite().body.reset(31600, 500);
  });

  // v1.4: sem modal — o rino cruza os 800m e o endless começa na passada
  let crossed = true;
  try {
    await page.waitForFunction(() => {
      const s = window.game.scene.keys.GameScene;
      return s.gateReached;
    }, { timeout: 6000 });
  } catch (e) { crossed = false; }
  ok('portão: cruzou os 800m', crossed);

  // Checagem RÁPIDA: antes de o rino alcançar os obstáculos do t5
  // (spawns retomam em 33000) — esperar demais deixa ele morrer sozinho
  const state = await page.evaluate(() => {
    const s = window.game.scene.keys.GameScene;
    return {
      noModal: document.getElementById('gate-modal') === null,
      running: !s.physics.world.isPaused && !s.gameOver,
      escaped: s.escaped === true,
      infinity: document.getElementById('progress-infinity').offsetParent !== null,
      x: Math.round(s.rhino.getSprite().x),
    };
  });
  ok('portão: modal de escolha não existe mais', state.noModal);
  ok('portão: corrida segue sem pausa ao cruzar', state.running, `x=${state.x}`);
  ok('portão: fuga registrada no cruzamento', state.escaped);
  ok('portão: selo ∞ apareceu na barra', state.infinity);

  // O corte do spawn é uma janela avaliada quando a câmera alcança a região:
  // esperar (poucos frames) em vez de fotografar o exato frame do cruzamento
  let spawnOk = true;
  try {
    await page.waitForFunction(() => {
      const s = window.game.scene.keys.GameScene;
      return s.spawnManager.nextSpawnX >= 33000;
    }, { timeout: 4000 });
  } catch (e) { spawnOk = false; }
  ok('portão: spawn retomou no modo infinito (nextSpawnX >= 33000)', spawnOk);

  // Morte no modo infinito → tier t5 + reconhecimento da fuga
  await page.evaluate(() => {
    const s = window.game.scene.keys.GameScene;
    s.rhino.getSprite().body.reset(33500, 500);
    s.endGame(false, 'spike');
  });
  await page.waitForTimeout(800);
  const deaths = await page.evaluate(() => localStorage.getItem('furious_rhino_deaths'));
  // Sem a parada do modal, o rino pode morrer sozinho no t5 antes da morte
  // forçada (endGame tem guard de reentrada) — exigir apenas t5 >= 1
  ok('portão: morte no infinito registrada em t5', /"t5":[1-9]/.test(deaths || ''), deaths || '');
  const escapeMsg = await page.locator('#gate-escape-message').textContent();
  ok('portão: game over reconhece a fuga', /escapou/.test(escapeMsg), escapeMsg);
  ok('sem erros de JS (cruzamento)', fatal(errors).length === 0, fatal(errors).slice(0, 2).join(' | '));
  await page.close();
}

// ---------- 3. Fim do mundo (10.000m): LENDA com cutscene ----------
{
  const { page, errors } = await newGamePage();
  await startGame(page);
  await page.evaluate(() => {
    const s = window.game.scene.keys.GameScene;
    s.rhino.getSprite().body.reset(399500, 500);
  });

  // 1º frame cruza o portão (sem parar); no frame seguinte bate no fim do
  // mundo e a vitória formal (cutscene) dispara
  let legendOk = true;
  try {
    await page.waitForFunction(() => {
      const s = window.game.scene.keys.GameScene;
      return s.legend && s.won;
    }, { timeout: 6000 });
  } catch (e) { legendOk = false; }
  ok('lenda: fim do mundo encerra com vitória', legendOk);

  const banner = await page.evaluate(() => {
    const el = document.getElementById('victory-banner');
    return { shown: !el.hidden, text: el.textContent };
  });
  ok('lenda: banner da cutscene é LENDA', banner.shown && /LENDA/.test(banner.text), banner.text);

  let winOk = true;
  try {
    await page.waitForSelector('#game-win', { state: 'visible', timeout: 8000 });
  } catch (e) { winOk = false; }
  ok('lenda: overlay de vitória após a cutscene', winOk);
  if (winOk) {
    const dist = await page.locator('#win-final-score').textContent();
    ok('lenda: distância ~10000m', parseInt(dist, 10) >= 9980, `${dist}m`);
  }
  ok('sem erros de JS (lenda)', fatal(errors).length === 0, fatal(errors).slice(0, 2).join(' | '));
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
  ok('painel: card de recorde com nome', /recorde —/.test(body));
  ok('painel: funil com degrau do portão (800m)', /800m/.test(body));
  ok('painel: categoria Torre', /Torre/.test(body));
  ok('painel: tiers do modo infinito', /Tier 5/.test(body) && /Tier 6/.test(body));
  // v1.5.0: sem a chave, nada de lista de jogadores nem fichas
  ok('painel: sem chave não expõe a lista de jogadores',
    await page.locator('.players-table').count() === 0);
  ok('sem erros de JS no /?stats', errors.filter((e) => !/net::|ERR_/.test(e)).length === 0);
  await page.close();
}

// ---------- 4b. Resiliência: telemetria quebrada NÃO trava o jogo ----------
// Cenário real da v1.5.0: cache do navegador servindo módulos antigos (sem
// as funções novas) — o TypeError acontecia dentro do endGame e o jogo
// congelava sem overlay. Telemetria e ranking são acessórios.
{
  const { page, errors } = await newGamePage();
  await page.evaluate(async () => {
    const a = await import('./js/systems/StatsSystem.js');
    delete a.StatsSystem.recordRun;
    const l = await import('./js/systems/LeaderboardSystem.js');
    delete l.LeaderboardSystem.isNameTaken;
    delete l.LeaderboardSystem.rename;
  });
  await page.click('#pwa-skip');

  await page.click('#identity-btn');
  await page.waitForTimeout(300);
  await page.fill('#nickname-input', 'CacheVelho');
  await page.click('#nickname-save');
  await page.waitForTimeout(2500);
  const saved = await page.evaluate(() => ({
    modalOpen: document.body.classList.contains('modal-open'),
    name: localStorage.getItem('furious_rhino_player_name'),
  }));
  ok('resiliência: salvar apelido não prende o modal', !saved.modalOpen && saved.name === 'CacheVelho');

  await startGame(page);
  await page.evaluate(() => { window.game.scene.keys.GameScene.endGame(false, 'wall'); });
  await page.waitForTimeout(1200);
  const over = await page.evaluate(() =>
    getComputedStyle(document.getElementById('game-over')).display);
  ok('resiliência: game over aparece mesmo com telemetria quebrada', over === 'block', over);
  ok('sem erros de JS (resiliência)', fatal(errors).length === 0, fatal(errors).slice(0, 2).join(' | '));
  await page.close();
}

// ---------- 5. Painel detalhado (/?stats=<chave>): lista + ficha ----------
{
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/?stats=${STATS_KEY}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  const rows = page.locator('.players-table tbody tr');
  ok('detalhado: tabela de jogadores renderizou', await rows.count() > 0, `${await rows.count()} linhas`);
  ok('detalhado: campo de busca presente', await page.locator('#stats-search').count() === 1);

  // Ordenação: clicar em "Recorde" inverte a ordem (padrão é desc)
  const firstBefore = await rows.first().textContent();
  await page.locator('.players-table th').nth(1).click();
  await page.waitForTimeout(300);
  const firstAfter = await rows.first().textContent();
  ok('detalhado: ordenar por coluna reordena', firstBefore !== firstAfter);

  // Busca por um apelido inexistente esvazia a tabela
  await page.fill('#stats-search', 'zzz-nao-existe-zzz');
  await page.waitForTimeout(300);
  const emptyMsg = await page.locator('.players-table tbody').textContent();
  ok('detalhado: busca filtra a tabela', /Nenhum jogador/.test(emptyMsg), emptyMsg.slice(0, 40));
  await page.fill('#stats-search', '');
  await page.waitForTimeout(300);

  // Ficha individual
  await rows.first().click();
  await page.waitForTimeout(600);
  const ficha = await page.locator('#stats-page').textContent();
  ok('ficha: evolução das execuções', /Evolução das últimas execuções/.test(ficha));
  ok('ficha: aparelhos usados', /Aparelhos usados/.test(ficha));
  ok('ficha: mortes por etapa e causa', /Mortes por etapa/.test(ficha) && /Mortes por causa/.test(ficha));
  ok('ficha: botão de voltar presente', await page.locator('.stats-back').count() === 1);
  await page.click('.stats-back');
  await page.waitForTimeout(500);
  ok('ficha: voltar reconstrói a lista', await page.locator('.players-table').count() === 1);
  ok('sem erros de JS no painel detalhado', errors.filter((e) => !/net::|ERR_/.test(e)).length === 0,
    errors.slice(0, 2).join(' | '));
  await page.close();
}

await browser.close();
console.log(results.join('\n'));
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
