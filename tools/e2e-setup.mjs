// E2E da página /?setup (v1.8.1) num navegador real:
//   node tools/e2e-setup.mjs   (requer o jogo servido em localhost:3000)
//
// Cobre o roteamento e o gate: sem chave/chave errada → acesso restrito;
// chave certa → estúdio montado SEM Phaser; com o servidor local do gerador
// no ar (3210), a lista das skins reais aparece com as originais travadas.
// O pipeline de escrita (integrate/update/remove) é coberto por
// test-integrate + o smoke do roteiro de release — aqui é só leitura.
//
// Sonda claude-* sem opt-in de escrita: em ambiente local nada grava no
// Firestore (StorageManager.allowsRemoteWrite), regra 5 do CLAUDE.md.
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const results = [];
const ok = (name, cond, extra = '') =>
  results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);

// O cenário 3 muda de cara com o servidor do gerador no ar ou não
let generatorUp = false;
try {
  const r = await fetch('http://localhost:3210/api/status', { signal: AbortSignal.timeout(1500) });
  generatorUp = (await r.json()).ok === true;
} catch (e) { /* parado */ }

const browser = await chromium.launch();
const errors = [];

async function boot(query) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript(() => {
    localStorage.setItem('furious_rhino_player_id', 'claude-e2e-setup');
    localStorage.setItem('furious_rhino_notify_off', '1');
  });
  const page = await context.newPage();
  const googleReqs = []; // v1.8.7: a aba Radiografia só pode tocar o Firestore no ▶
  page.on('request', (r) => { if (r.url().includes('firestore.googleapis.com')) googleReqs.push(r.url()); });
  const apiPosts = []; // v1.8.9: nenhum POST espontâneo à API local (só GETs de status)
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().includes('localhost:3210')) apiPosts.push(r.url());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource|net::ERR_/.test(m.text())) {
      errors.push(m.text());
    }
  });
  await page.goto(`${BASE}/${query}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  return { context, page, googleReqs, apiPosts };
}

// ---------- 1. Sem chave / chave errada: acesso restrito ----------
{
  const { context, page } = await boot('?setup');
  ok('1. sem chave: página monta em modo restrito',
    await page.locator('#setup-page').isVisible()
    && (await page.textContent('#setup-page')).includes('Acesso restrito'));
  ok('1b. Phaser não foi baixado no modo setup',
    await page.evaluate(() => typeof window.Phaser === 'undefined'));
  ok('1c. o jogo (start-screen) está suprimido',
    await page.evaluate(() => {
      const el = document.getElementById('start-screen');
      return !el || getComputedStyle(el).display === 'none';
    }));
  await context.close();
}
{
  const { context, page } = await boot('?setup=1234');
  ok('2. chave errada: continua restrito',
    (await page.textContent('#setup-page')).includes('Acesso restrito'));
  await context.close();
}

// ---------- 2. Chave certa: estúdio completo ----------
{
  const { context, page, googleReqs, apiPosts } = await boot('?setup=0929');
  const text = await page.textContent('#setup-page');
  ok('3. chave 0929: estúdio montado', text.includes('Estúdio de skins')
    && !text.includes('Acesso restrito'));
  ok('3b. sem Phaser também no modo liberado',
    await page.evaluate(() => typeof window.Phaser === 'undefined'));
  ok('3c. cards do fluxo presentes (servidor, folha, desbloqueio)',
    await page.evaluate(() => Boolean(
      document.getElementById('su-server-text')
      && document.getElementById('su-drop')
      && document.getElementById('su-card-unlock')
      && document.getElementById('su-skin-list'))));

  // O formulário de desbloqueio gera a copy do cadeado ao vivo (o card só
  // aparece depois de gerar um sprite — para o teste, revela direto)
  await page.evaluate(() => { document.getElementById('su-card-unlock').hidden = false; });
  await page.check('#setup-page input[name=su-access][value="achievement"]');
  await page.fill('#su-c-meters', '2000');
  await page.check('#su-c-escaped');
  await page.waitForTimeout(100);
  ok('3d. preview do requisito gerado da condição',
    (await page.textContent('#su-req-preview')).includes('Corra 2000m e escape do zoológico'),
    await page.textContent('#su-req-preview'));

  // Nome de skin original é criticado ENQUANTO digita (não só no aplicar)
  await page.evaluate(() => { document.getElementById('su-card-options').hidden = false; });
  await page.fill('#su-name', 'Silver');
  await page.waitForTimeout(100);
  ok('3e. nome de skin original é barrado ao vivo, com sugestão',
    (await page.textContent('#su-name-hint')).includes('skin original')
    && (await page.textContent('#su-name-hint')).includes('silver-2'),
    await page.textContent('#su-name-hint'));
  await page.fill('#su-name', 'lava');
  await page.waitForTimeout(100);
  ok('3f. nome livre limpa a crítica',
    !(await page.textContent('#su-name-hint')).includes('skin original'));

  // v1.8.7 (ideia K): a aba 📊 Radiografia existe, monta no clique — e NÃO
  // toca a rede sozinha (análise só roda quando o dono aperta o ▶)
  ok('3g. abas montadas: Skins ativa por padrão, Radiografia presente e oculta',
    await page.evaluate(() => Boolean(
      document.getElementById('su-tabs')
      && document.getElementById('su-tab-skins').hidden === false
      && document.getElementById('su-tab-radiografia')
      && document.getElementById('su-tab-radiografia').hidden === true)));
  await page.click('#su-tab-btn-radiografia');
  await page.waitForTimeout(400); // import dinâmico do módulo da aba
  ok('3h. clicar na aba monta o card da análise (sem rodar nada)',
    await page.evaluate(() => Boolean(
      document.getElementById('su-card-radiografia')
      && document.getElementById('su-radio-run')
      && document.getElementById('su-tab-skins').hidden === true)));
  await page.click('#su-tab-btn-skins'); // o cenário 4 depende da lista visível
  ok('3i. nenhuma requisição ao Firestore antes do ▶',
    googleReqs.length === 0, googleReqs.join(' | '));

  await page.waitForTimeout(2500); // um ciclo de polling do servidor

  // v1.8.8: card "Servidores locais" — linha do jogo + botão ⏻ Parar.
  // NUNCA clicar no ⏻ aqui: no modo unificado ele mataria o servidor que
  // serve o próprio teste (e no modo separado, o gerador no meio da suíte).
  // O emoji do dot é o contrato; a frase fica livre para o dono ajustar.
  ok('3j. linha do jogo verde (a 3000 no ar é pré-condição de todo e2e)',
    (await page.textContent('#su-game-dot')) === '🟢');
  ok('3k. botão ⏻ Parar existe e segue a visibilidade do gerador',
    await page.evaluate((genUp) => {
      const b = document.getElementById('su-btn-stop');
      return Boolean(b) && b.hidden === !genUp;
    }, generatorUp));

  // v1.8.9 (aba 🖼️ Sprites): catálogo monta dos módulos ES, sem rede, e o
  // e2e NUNCA clica em Salvar/Excluir/Atribuir (escrita é dos gates node)
  await page.click('#su-tab-btn-sprites');
  await page.waitForTimeout(400); // import dinâmico do módulo da aba
  ok('3l. aba Sprites monta o catálogo (sub-views + card)',
    await page.evaluate(() => Boolean(
      document.getElementById('sp-subtabs') && document.getElementById('sp-catalogo'))));
  ok('3m. catálogo lista as espécies (≥ 38 linhas)',
    (await page.locator('#sp-catalogo .sp-row').count()) >= 38);
  ok('3n. órfão sinalizado (boss2-hunter, grupo Bosses)', await page.evaluate(() => {
    const grupos = [...document.querySelectorAll('#sp-catalogo details')];
    const bosses = grupos.find((g) => g.querySelector('summary').textContent.includes('Bosses'));
    bosses.open = true; // dispara a montagem preguiçosa
    return new Promise((res) => setTimeout(() =>
      res(bosses.textContent.includes('órfão')), 100));
  }));
  ok('3o. nenhum POST espontâneo à API local', apiPosts.length === 0, apiPosts.join(' | '));
  await page.click('#su-tab-btn-skins'); // o cenário 4 depende da lista visível

  if (generatorUp) {
    const rows = await page.locator('.su-skin-row').count();
    ok('4. [gerador no ar] lista as skins do registry', rows >= 7, `rows=${rows}`);
    // v3 (15/08): só o default é intocável; TODAS as outras (originais
    // incluídas) editam, alternam a flag e têm o Remover físico
    const locked = await page.locator('.su-skin-row:has-text("original")').count();
    const withEdit = await page.locator('.su-skin-row:has(button:has-text("Editar"))').count();
    const withToggle = await page.locator(
      '.su-skin-row:has(button:has-text("Tirar do jogo")), .su-skin-row:has(button:has-text("Pôr no jogo"))').count();
    const withRemove = await page.locator('.su-skin-row:has(button:has-text("Remover"))').count();
    const defaultWithRemove = await page.locator(
      '.su-skin-row[data-skin-id="default"]:has(button:has-text("Remover"))').count();
    ok('4b. [gerador no ar] só o default é original travado; o resto edita e alterna',
      locked === 1 && withEdit === rows - 1 && withToggle === rows - 1,
      `locked=${locked} edit=${withEdit} toggle=${withToggle} rows=${rows}`);
    ok('4b2. [gerador no ar] Remover em toda linha, menos no default (v3)',
      withRemove === rows - 1 && defaultWithRemove === 0,
      `comRemover=${withRemove}/${rows} defaultComRemover=${defaultWithRemove}`);
    const badges = await page.locator(
      '.su-skin-row:has-text("✅ no jogo"), .su-skin-row:has-text("🚫 fora do jogo")').count();
    ok('4b3. [gerador no ar] badge de visibilidade em toda linha', badges === rows,
      `badges=${badges}/${rows}`);
    ok('4c. [gerador no ar] status verde no painel',
      (await page.textContent('#su-server-text')) === 'estúdio no ar');
  } else {
    ok('4. [gerador parado] instruções de subida visíveis',
      await page.evaluate(() => !document.getElementById('su-server-help').hidden));
    ok('4b. [gerador parado] status vermelho no painel',
      (await page.textContent('#su-server-text')) === 'parado');
    ok('4c. [gerador parado] lista explica a ausência',
      (await page.textContent('#su-skin-list')).includes('Servidor parado'));
  }
  await context.close();
}

// ---------- 3. O modo jogo segue intacto ----------
{
  const { context, page } = await boot('');
  ok('5. sem parâmetro: o jogo boota com Phaser',
    await page.evaluate(() => typeof window.Phaser !== 'undefined'
      && !document.body.classList.contains('setup-mode')));
  await context.close();
}

ok('6. nenhum erro de JS nas sessões', errors.length === 0, errors.join(' | '));

await browser.close();
console.log(results.join('\n'));
const fails = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - fails}/${results.length} OK`);
process.exit(fails ? 1 : 0);
