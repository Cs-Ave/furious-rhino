// E2E da telemetria num navegador real (Playwright/Chromium):
//   node tools/e2e-stats.mjs   (requer o jogo servido em localhost:3000)
// Semeia localStorage com o playerId de teste 'claude-rules-check-01'
// (doc de sonda já existente — não cria poluição nova no banco),
// observa a escrita real no Firestore e confere a página /?stats.
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const results = [];
const ok = (name, cond, extra = '') =>
  results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });

// Totais locais MAIORES que os do doc-sonda (regras exigem monotonia)
await context.addInitScript(() => {
  localStorage.setItem('furious_rhino_player_id', 'claude-rules-check-01');
  localStorage.setItem('furious_rhino_record', '500');
  localStorage.setItem('furious_rhino_attempts', '7');
  localStorage.setItem('furious_rhino_playtime_s', '300');
  localStorage.setItem('furious_rhino_wins', '1');
  localStorage.setItem('furious_rhino_deaths', JSON.stringify(
    { t1: 2, t2: 2, t3: 1, t4: 0, wall: 1, spike: 1, animal: 1, dart: 1, tower: 2, fall: 0 }
  ));
  localStorage.setItem('furious_rhino_geo', JSON.stringify(
    { ok: true, country: 'BR', region: 'Rio de Janeiro', city: 'Rio de Janeiro', fetchedAt: Date.now() }
  ));
});

// ---------- 1. Tela de início dispara o reenvio e o Firestore aceita ----------
{
  const page = await context.newPage();
  const errors = [];
  const writes = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', async (res) => {
    if (res.url().includes('firestore.googleapis.com') && res.request().method() === 'POST') {
      let body = '';
      if (!res.ok()) { try { body = (await res.text()).slice(0, 300); } catch (e) { /* stream */ } }
      writes.push({ url: res.url().split('?')[0].split('/').pop(), status: res.status(), body });
    }
  });

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(6000); // SDK dinâmico + reenvio da tela de início

  const stats = writes.filter((w) => w.url.includes('commit') || w.status);
  ok('reenvio na tela de início disparou', writes.length > 0,
    writes.map((w) => `${w.url}:${w.status}${w.body ? ' ' + w.body : ''}`).join(' | ') || 'NENHUMA escrita');
  ok('Firestore aceitou a escrita (200)', writes.some((w) => w.status === 200),
    stats.map((w) => w.status).join(','));
  const fatal = errors.filter((e) => !/net::|Failed to load resource|ERR_/.test(e));
  ok('sem erros de JS na tela de início', fatal.length === 0, fatal.slice(0, 3).join(' | '));
  await page.close();
}

// ---------- 2. Página /?stats agrega e mostra a categoria Torre ----------
{
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/?stats`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  const body = await page.locator('#stats-page').textContent();
  ok('página renderizou dados', /Visão geral/.test(body), body.slice(0, 80));
  ok('categoria Torre presente', /Torre/.test(body));
  const zerado = /Mortes por etapa/.test(body) &&
    !(await page.locator('.bar-value').allTextContents()).some((t) => parseInt(t, 10) > 0);
  ok('barras NÃO estão zeradas', !zerado);
  const fatal = errors.filter((e) => !/net::|Failed to load resource|ERR_/.test(e));
  ok('sem erros de JS no /?stats', fatal.length === 0, fatal.slice(0, 3).join(' | '));
  await page.close();
}

await browser.close();
console.log(results.join('\n'));
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
