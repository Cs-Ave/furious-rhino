// E2E do DESAFIO POR LINK (v1.12.4) num navegador real:
//   node tools/e2e-desafio.mjs   (requer o jogo servido em localhost:3000)
//
// O que se prova aqui: que a URL hostil vira um banner seguro (textContent,
// nunca <a>, nome com <script> vira "um amigo"), que o CTA está FORA da
// faixa do toque (640,650) nos três viewports, que aceitar inicia a corrida
// com a estaca do amigo na pista, que passar a estaca provoca, que o fim de
// corrida mostra "faltaram X m" ou vira o 📤 em DEVOLVER (sem estourar o
// rodapé fixo da Régua), que DEVOLVER sem apelido abre o #nickname-modal e
// retoma com o link certo, que o desafio expira em 7 dias, que a home diz
// "corra de novo" depois do JOGAR DE NOVO e que os cards de novidades saem
// para quem estava em versão antiga.
//
// Sonda `claude-*` de id curto (as rules exigem >= 16 chars para criar) +
// notify_off: nada aqui grava no Firestore — `?debug=1` já é ambiente local.
import { chromium } from 'playwright';

const BASE = process.env.ALVO || 'http://localhost:3000';
const results = [];
const ok = (name, cond, extra = '') =>
  results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
const errors = [];
const DIA = 86400000;

// Um cenário que estoura (timeout do Playwright) não pode engolir o placar
// dos anteriores: imprime o que já passou, o erro, e sai vermelho.
const morrer = (e) => {
  console.log(results.join('\n'));
  console.log(`\nABORTADO: ${e && e.message ? e.message.split('\n')[0] : e}`);
  process.exit(1);
};
process.on('uncaughtException', morrer);
process.on('unhandledRejection', morrer);

const browser = await chromium.launch();

// Página nova por cenário: contexto limpo (localStorage/sessionStorage
// zerados), SW bloqueado (senão a suíte mede a versão em cache), sondas.
async function abrir({ query = '', seeds = {}, session = {}, viewport = { width: 1280, height: 720 }, stubShare = false } = {}) {
  const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
  await context.addInitScript(({ seeds, session, stubShare }) => {
    localStorage.setItem('furious_rhino_player_id', 'claude-e2e-desafio');
    localStorage.setItem('furious_rhino_notify_off', '1');
    localStorage.setItem('furious_rhino_attempts', '50');
    for (const [k, v] of Object.entries(seeds)) {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
    for (const [k, v] of Object.entries(session)) {
      sessionStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
    if (stubShare) {
      // Folha nativa falsa: guarda o que seria compartilhado
      navigator.share = async (data) => { window.__shared = data; };
    }
  }, { seeds, session, stubShare });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const q = String(query || '').replace(/^\?/, '');
  await page.goto(`${BASE}/?${q ? `${q}&` : ''}debug=1`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#start-screen');
  await page.waitForTimeout(900);
  return { context, page };
}

// Espera o motor: window.game + GameScene com o spawn pronto
async function esperarMotor(page) {
  await page.waitForFunction(() => {
    const s = window.game && window.game.scene.getScene('GameScene');
    return Boolean(s && s.spawnManager && s.rhino);
  }, null, { timeout: 60000 });
}

// Aceita pelo CTA do banner e espera a corrida nascer
async function aceitar(page) {
  await esperarMotor(page);
  await page.click('#desafio-aceitar');
  await page.waitForFunction(() => {
    const s = window.game && window.game.scene.getScene('GameScene');
    return Boolean(s && s.startTriggered && s.audio);
  }, null, { timeout: 30000 });
  await page.waitForTimeout(700);
}

// Leva o rino a `metros` com a cena viva (o updateTrackMarks lê a posição)
async function teleportar(page, metros) {
  await page.evaluate((m) => {
    const s = window.game.scene.keys.GameScene;
    ['getWallsGroup', 'getSpikesGroup', 'getAnimalsGroup', 'getTowersGroup',
      'getDartsGroup', 'getRampsGroup'].forEach((g) => {
      s.spawnManager[g]().children.entries.forEach((e) => e.deactivate());
    });
    s.invincible = true;
    const sp = s.rhino.getSprite();
    sp.body.reset(m * 40, 450);
    // Congelado: sem isso o rino corre ~4 m entre o teleporte e o endGame e
    // o "faltaram X m" sai com X errado por poucos metros
    sp.body.moves = false;
    s.cameras.main.setScroll(m * 40 - 440, 0);
  }, metros);
  await page.waitForTimeout(500);
}

const lerStorage = (page, k) => page.evaluate((key) => localStorage.getItem(key), k);
const lerJson = async (page, k) => { const v = await lerStorage(page, k); return v ? JSON.parse(v) : null; };

// ---------- 1. Link hostil → banner seguro (3 viewports) ----------
for (const vp of [{ width: 1280, height: 720 }, { width: 874, height: 402 }, { width: 640, height: 304 }]) {
  const { context, page } = await abrir({ query: '?desafio=1198&de=%3Cscript%3E', viewport: vp });
  const r = await page.evaluate(() => {
    const banner = document.getElementById('desafio-banner');
    const texto = document.getElementById('desafio-text');
    const rb = banner.getBoundingClientRect();
    const bottom = document.querySelector('.home-bottom').getBoundingClientRect();
    // o ponto do toque em espaço de jogo (1280x720) mapeado para o viewport
    const px = 640 * innerWidth / 1280;
    const py = 650 * innerHeight / 720;
    const alvo = document.elementFromPoint(px, py);
    return {
      visivel: !banner.hidden && getComputedStyle(banner).display !== 'none',
      texto: texto.textContent,
      perigosos: banner.querySelectorAll('script, a').length,
      search: location.search,
      dentroDoBanner: Boolean(alvo && alvo.closest('#desafio-banner')),
      acimaDoRodape: rb.bottom <= bottom.top,
      cabe: rb.right <= innerWidth && rb.left >= 0,
      cta: document.getElementById('desafio-aceitar').getBoundingClientRect().height,
    };
  });
  const tag = `${vp.width}×${vp.height}`;
  ok(`1. ${tag}: banner visível com o nome hostil neutralizado`,
    r.visivel && r.texto === 'um amigo correu 1.198 m. Passa?', `"${r.texto}"`);
  ok(`1b. ${tag}: sem <script>/<a> dentro do banner`, r.perigosos === 0);
  ok(`1c. ${tag}: a URL perdeu ?desafio/de e manteve debug=1`,
    /debug=1/.test(r.search) && !/desafio|de=/.test(r.search), r.search);
  ok(`1d. ${tag}: o toque (640,650) NÃO cai no banner, e o banner fica acima do rodapé`,
    !r.dentroDoBanner && r.acimaDoRodape && r.cabe, `cta=${Math.round(r.cta)}px`);
  if (vp.width === 1280) {
    const guardado = await lerJson(page, 'furious_rhino_desafio');
    const hist = await lerJson(page, 'furious_rhino_history');
    ok('1e. desafio guardado com o nome já neutralizado',
      guardado && guardado.m === 1198 && guardado.de === 'um amigo', JSON.stringify(guardado));
    ok('1f. history.src = link no primeiro boot', hist && hist.src === 'link', JSON.stringify(hist && hist.src));
    await esperarMotor(page);
    await page.waitForTimeout(800);
    const pwa = await page.evaluate(() => {
      const m = document.getElementById('pwa-modal');
      return m ? getComputedStyle(m).display : 'ausente';
    });
    ok('1g. o prompt do PWA não rouba o primeiro toque de quem veio por link', pwa === 'none' || pwa === 'ausente', pwa);

    // ---------- 4-6. Aceitar → estaca → passou → DEVOLVER ----------
    await aceitar(page);
    const estaca = await page.evaluate(() => {
      const s = window.game.scene.keys.GameScene;
      window.__toasts = [];
      const orig = s.showToast.bind(s);
      s.showToast = (t, o) => { window.__toasts.push(String(t)); return orig(t, o); };
      return { started: s.startTriggered, estaca: s.trackMarks.some((m) => Math.abs(m.x - 1198 * 40) < 1) };
    });
    ok('4. ACEITAR E CORRER inicia a corrida', estaca.started);
    ok('4b. a estaca do amigo está na pista aos 1198 m', estaca.estaca);
    await teleportar(page, 1230);
    const toasts = await page.evaluate(() => window.__toasts);
    ok('5. passar a estaca provoca "VOCÊ PASSOU UM AMIGO"',
      toasts.some((t) => /VOCÊ PASSOU UM AMIGO/.test(t)), toasts.join(' | '));
    await page.evaluate(() => { window.game.scene.keys.GameScene.endGame(false, 'wall'); });
    await page.waitForTimeout(1800);
    const fim = await page.evaluate(() => {
      const btn = document.getElementById('share-btn');
      const rb = btn.getBoundingClientRect();
      const rr = document.getElementById('restart-btn').getBoundingClientRect();
      const runs = JSON.parse(localStorage.getItem('furious_rhino_runs') || '[]');
      return {
        share: btn.textContent, msg: document.getElementById('record-message').textContent,
        storage: localStorage.getItem('furious_rhino_desafio'),
        md: runs.length ? runs[runs.length - 1].md : null,
        restartH: rr.height, restartDentro: rr.bottom <= innerHeight && rr.top >= 0,
        devolverDentro: rb.bottom <= innerHeight && rb.right <= innerWidth,
      };
    });
    ok('6. passou → o 📤 virou DEVOLVER O DESAFIO', /DEVOLVER/.test(fim.share), fim.share);
    ok('6b. a linha do delta comemora a marca batida', /passou um amigo/.test(fim.msg), fim.msg);
    ok('6c. o desafio batido some do storage', fim.storage === null);
    ok('6d. a corrida leva a letra md=1', fim.md === 1, `md=${fim.md}`);
    ok('6e. JOGAR DE NOVO segue ≥44 px e dentro da tela; DEVOLVER cabe',
      fim.restartH >= 44 && fim.restartDentro && fim.devolverDentro,
      `restart=${Math.round(fim.restartH)}px`);
  }
  await context.close();
}

// ---------- 2. Nome com acento passa ----------
{
  const { context, page } = await abrir({ query: '?desafio=1198&de=Jo%C3%A3o' });
  const texto = await page.evaluate(() => document.getElementById('desafio-text').textContent);
  ok('2. nome com acento passa inteiro', texto === 'João correu 1.198 m. Passa?', texto);
  await context.close();
}

// ---------- 3. Metros inválidos → home normal ----------
{
  const { context, page } = await abrir({ query: '?desafio=abc&de=Thomas' });
  const r = await page.evaluate(() => ({
    hidden: document.getElementById('desafio-banner').hidden,
    storage: localStorage.getItem('furious_rhino_desafio'),
    search: location.search,
  }));
  ok('3. desafio=abc → sem banner, sem chave, URL limpa',
    r.hidden && r.storage === null && !/desafio/.test(r.search), JSON.stringify(r));
  await context.close();
}

// ---------- 6f. Layout do DEVOLVER nos viewports baixos ----------
for (const vp of [{ width: 874, height: 402 }, { width: 640, height: 304 }]) {
  const { context, page } = await abrir({
    viewport: vp,
    seeds: { furious_rhino_desafio: { m: 300, de: 'Thomas', at: Date.now() } },
  });
  await aceitar(page);
  await teleportar(page, 340);
  await page.evaluate(() => { window.game.scene.keys.GameScene.endGame(false, 'wall'); });
  await page.waitForTimeout(1800);
  const r = await page.evaluate(() => {
    const rb = document.getElementById('share-btn').getBoundingClientRect();
    const rr = document.getElementById('restart-btn').getBoundingClientRect();
    return {
      share: document.getElementById('share-btn').textContent,
      restartH: rr.height, restartDentro: rr.bottom <= innerHeight && rr.top >= 0,
      devolverDentro: rb.bottom <= innerHeight && rb.right <= innerWidth && rb.width > 60,
      semScrollX: document.documentElement.scrollWidth <= innerWidth,
    };
  });
  ok(`6f. ${vp.width}×${vp.height}: DEVOLVER cabe e JOGAR DE NOVO segue ≥44 px na tela`,
    /DEVOLVER/.test(r.share) && r.restartH >= 44 && r.restartDentro && r.devolverDentro && r.semScrollX,
    `restart=${Math.round(r.restartH)}px`);
  await context.close();
}

// ---------- 7. Não passou → "faltaram X m", 📤 intacto, desafio segue ----------
{
  const { context, page } = await abrir({
    seeds: { furious_rhino_desafio: { m: 1198, de: 'Thomas', at: Date.now() } },
  });
  const banner = await page.evaluate(() => ({
    hidden: document.getElementById('desafio-banner').hidden,
    texto: document.getElementById('desafio-text').textContent,
  }));
  ok('7. o desafio guardado (sem URL) pinta o banner', !banner.hidden && /Thomas/.test(banner.texto), banner.texto);
  await aceitar(page);
  await teleportar(page, 500);
  await page.evaluate(() => { window.game.scene.keys.GameScene.endGame(false, 'spike'); });
  await page.waitForTimeout(1800);
  const r = await page.evaluate(() => {
    const runs = JSON.parse(localStorage.getItem('furious_rhino_runs') || '[]');
    return {
      msg: document.getElementById('record-message').textContent,
      share: document.getElementById('share-btn').textContent,
      storage: localStorage.getItem('furious_rhino_desafio'),
      md: runs.length ? runs[runs.length - 1].md : null,
    };
  });
  ok('7b. não passou → "faltaram 698 m para passar Thomas"',
    r.msg === '🎯 Faltaram 698 m para passar Thomas', r.msg);
  ok('7c. o 📤 continua sendo compartilhar', r.share === '📤', r.share);
  ok('7d. o desafio continua guardado (7 dias ou até bater)', r.storage !== null);
  ok('7e. a corrida sob desafio leva md=1 mesmo sem passar', r.md === 1, `md=${r.md}`);
  await context.close();
}

// ---------- 8. DEVOLVER sem apelido → #nickname-modal → link com o nome ----------
{
  const { context, page } = await abrir({
    seeds: { furious_rhino_desafio: { m: 300, de: 'Thomas', at: Date.now() }, furious_rhino_player_name: null },
    stubShare: true,
  });
  await aceitar(page);
  await teleportar(page, 340);
  await page.evaluate(() => { window.game.scene.keys.GameScene.endGame(false, 'wall'); });
  await page.waitForTimeout(1800);
  // Dois caminhos reais para quem não tem apelido: (a) o fim de corrida já
  // abriu o #nickname-modal sozinho (submitScore pede o nome para entrar no
  // ranking) — o DEVOLVER fica atrás dele até a pessoa escolher; (b) o modal
  // não abriu (marca não submetível) e é o DEVOLVER que o abre e retoma ao
  // salvar (devolverPendente). Os dois terminam no mesmo lugar: o link com
  // o nome novo.
  const modalAberto = () => page.evaluate(() =>
    getComputedStyle(document.getElementById('nickname-modal')).display !== 'none');
  const jaAberto = await modalAberto();
  if (!jaAberto) {
    await page.click('#share-btn');
    await page.waitForTimeout(600);
  }
  ok(`8. sem apelido, o #nickname-modal aparece (${jaAberto ? 'pelo fim de corrida' : 'pelo DEVOLVER'})`,
    await modalAberto());
  await page.fill('#nickname-input', 'Sonda');
  await page.click('#nickname-save');
  await page.waitForFunction(() =>
    getComputedStyle(document.getElementById('nickname-modal')).display === 'none', null, { timeout: 15000 })
    .catch(() => {});
  if (jaAberto) {
    // caminho (a): o nome entrou; agora o DEVOLVER compartilha direto
    await page.waitForTimeout(400);
    await page.click('#share-btn');
  }
  await page.waitForFunction(() => Boolean(window.__shared), null, { timeout: 15000 }).catch(() => {});
  const shared = await page.evaluate(() => window.__shared || null);
  ok('8b. ao salvar o apelido, o DEVOLVER segue com o link certo',
    shared && /\?desafio=\d+&de=Sonda$/.test(shared.url), shared && shared.url);
  ok('8c. o texto devolve o desafio a quem mandou',
    shared && /Thomas/.test(shared.text) && /Devolvo o desafio/.test(shared.text), shared && shared.text);
  await context.close();
}

// ---------- 9. Expiração: 8 dias → some; 6 dias → vale ----------
{
  const a = await abrir({ seeds: { furious_rhino_desafio: { m: 1198, de: 'Thomas', at: Date.now() - 8 * DIA } } });
  const h8 = await a.page.evaluate(() => document.getElementById('desafio-banner').hidden);
  await a.context.close();
  const b = await abrir({ seeds: { furious_rhino_desafio: { m: 1198, de: 'Thomas', at: Date.now() - 6 * DIA } } });
  const h6 = await b.page.evaluate(() => document.getElementById('desafio-banner').hidden);
  await b.context.close();
  ok('9. desafio de 8 dias expirou; o de 6 dias ainda vale', h8 === true && h6 === false, `8d=${h8} 6d=${h6}`);
}

// ---------- 10. Modo re-jogo: o CTA diz "corra de novo" ----------
{
  const a = await abrir({ session: { fr_replay: { at: Date.now() - 5000, bits: 1 } } });
  const c1 = await a.page.evaluate(() => document.querySelector('.start-cta').textContent);
  await a.context.close();
  const b = await abrir({ session: { fr_replay: { at: Date.now() - 120000, bits: 1 } } });
  const c2 = await b.page.evaluate(() => document.querySelector('.start-cta').textContent);
  await b.context.close();
  ok('10. JOGAR DE NOVO há 5 s → "TOQUE PARA CORRER DE NOVO"', c1 === 'TOQUE PARA CORRER DE NOVO', c1);
  ok('10b. há 120 s → CTA normal', c2 === 'TOQUE PARA INICIAR', c2);
}

// ---------- 11. Novidades desde a última visita ----------
{
  const a = await abrir({ seeds: { furious_rhino_last_version: '1.11.0' } });
  const r = await a.page.evaluate(() => ({
    feed: document.getElementById('news-list').textContent,
    last: localStorage.getItem('furious_rhino_last_version'),
    keys: JSON.parse(localStorage.getItem('furious_rhino_news') || '[]').map((i) => i.k),
  }));
  await a.context.close();
  ok('11. de 1.11.0 para cá: o card da versão nova aparece no Diário',
    /desafie um amigo por link/.test(r.feed) && r.keys.includes('nv:1.12.4'), r.keys.join(','));
  ok('11b. a última versão vista passa a ser a corrente', r.last === '1.12.4', r.last);
  const b = await abrir({});
  const novo = await b.page.evaluate(() =>
    JSON.parse(localStorage.getItem('furious_rhino_news') || '[]').map((i) => i.k).filter((k) => k.startsWith('nv:')));
  await b.context.close();
  ok('11c. aparelho novo não recebe "novidades" (não tem passado)', novo.length === 0, novo.join(','));
}

ok('12. nenhum erro de JS', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();
console.log(results.join('\n'));
const fails = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - fails}/${results.length} OK`);
process.exit(fails ? 1 : 0);
