// e2e da home desacoplada (v1.9.3): a tela pinta antes do motor, e o toque
// dado nessa janela nao se perde.
import { chromium } from 'playwright';
const ALVO = process.env.ALVO || 'http://localhost:3000/';
let pass = 0, fail = 0;
const ok = (n, c, det = '') => { if (c) { pass++; console.log(`PASS ${n}`); }
  else { fail++; console.log(`FAIL ${n} ${det}`); } };

const browser = await chromium.launch();
const semear = () => {
  localStorage.setItem('furious_rhino_player_id', 'claude-e2e-home-001');
  localStorage.setItem('furious_rhino_player_name', 'HomeE2E');
  localStorage.setItem('furious_rhino_notify_off', '1');
  localStorage.setItem('furious_rhino_record', '2500');
  localStorage.setItem('furious_rhino_record_pts', '3100');
  localStorage.setItem('furious_rhino_attempts', '40');
  localStorage.setItem('furious_rhino_last_rank', '4');
  sessionStorage.setItem('furious_rhino_pwa_prompted', '1');
  localStorage.setItem('furious_rhino_podium', JSON.stringify({ at: Date.now(), entries: [
    { id: 'a', name: 'Alfa', score: 9000, m: 8000, sinceMs: Date.now() - 3 * 86400000, skin: null },
    { id: 'b', name: 'Beta', score: 7000, m: 6000, sinceMs: Date.now() - 2 * 86400000, skin: null },
    { id: 'c', name: 'Gama', score: 5000, m: 4000, sinceMs: Date.now() - 86400000, skin: null } ] }));
};

// ---------- 1. a home pinta ANTES de o Phaser existir ----------
{
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  await page.addInitScript(semear);
  await page.goto(ALVO, { waitUntil: 'domcontentloaded' });
  // espera a pintura, mas NAO o motor
  await page.waitForFunction(() => document.getElementById('podium-steps').textContent.trim(), null,
    { timeout: 20000 }).catch(() => {});
  const r = await page.evaluate(() => ({
    nomes: [...document.querySelectorAll('#podium-steps .pname')].map((x) => x.textContent),
    degraus: document.querySelectorAll('#podium-steps .step').length,
    voce: document.getElementById('you-name').textContent,
    marca: document.getElementById('you-score').textContent,
    gap: document.getElementById('podium-gap').textContent,
    rank: document.getElementById('start-rank-pos').textContent,
    recorde: document.getElementById('start-record').textContent,
    // o motor ja subiu?
    temCanvas: !!document.querySelector('canvas'),
  }));
  ok('1. pódio pintado', r.degraus === 3, `degraus=${r.degraus}`);
  ok('2. ordem visual 2·1·3 preservada', r.nomes.join(',') === 'Beta,Alfa,Gama', r.nomes.join(','));
  ok('3. degrau VOCÊ com nome e marca', r.voce === 'HomeE2E' && /3\.100 pts/.test(r.marca),
    `${r.voce} / ${r.marca}`);
  ok('4. provocação do gap calculada', /faltam .* pts/.test(r.gap), r.gap);
  ok('5. posição no ranking', r.rank === '4', r.rank);
  ok('6. campanha (recorde)', r.recorde === '2500', r.recorde);
  await page.context().close();
}

// ---------- 2. o toque dado ANTES do motor nao se perde ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  await page.addInitScript(semear);
  // segura os SVGs: simula o celular lento, com a home ja pintada e o
  // preload do Phaser ainda em curso
  await page.route('**/art/*.svg', async (route) => {
    await new Promise((r) => setTimeout(r, 2500));
    await route.continue();
  });
  await page.goto(ALVO, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.getElementById('podium-steps').textContent.trim(), null,
    { timeout: 30000 });
  const antes = await page.evaluate(() => ({
    temCanvas: !!document.querySelector('canvas'),
    started: document.body.classList.contains('started'),
  }));
  ok('7. a home está pronta com o motor ainda carregando', !antes.started, JSON.stringify(antes));

  await page.locator('#start-screen').click({ position: { x: 640, y: 650 } });
  const logo = await page.evaluate(() => ({
    cta: (document.querySelector('.start-cta') || {}).textContent,
    started: document.body.classList.contains('started'),
  }));
  ok('8. o toque antecipado dá retorno visual', /preparando/i.test(logo.cta || '') || logo.started,
    `cta="${logo.cta}" started=${logo.started}`);

  // sem NENHUM toque novo, a corrida tem de comecar sozinha
  const comecou = await page.waitForFunction(
    () => document.body.classList.contains('started'), null, { timeout: 40000 }
  ).then(() => true).catch(() => false);
  ok('9. a corrida começa SOZINHA quando o motor fica pronto (sem 2º toque)', comecou);
  const uma = await page.evaluate(() => +localStorage.getItem('furious_rhino_attempts'));
  ok('10. contou UMA tentativa só (toque pendente + real não duplicam)', uma === 41, `att=${uma}`);
  await ctx.close();
}

console.log(`\n${pass}/${pass + fail} OK`);

// ---------- v1.11 "Streaks": a pílula da chama na home ----------
{
  const ctxSt = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const pSt = await ctxSt.newPage();
  await pSt.addInitScript(() => {
    const UM = 86400000; const hoje = Date.now();
    const dk = (ms) => { const d = new Date(ms); const p = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
    localStorage.setItem('furious_rhino_history', JSON.stringify({
      days: { [dk(hoje)]: { r: 2 }, [dk(hoje - UM)]: { r: 3 }, [dk(hoje - 2 * UM)]: { r: 1 } } }));
    localStorage.setItem('furious_rhino_notify_off', '1');
  });
  await pSt.goto(ALVO, { waitUntil: 'networkidle' });
  await pSt.waitForTimeout(1200);
  const pill = await pSt.evaluate(() => {
    const w = document.getElementById('start-streak-wrap');
    return { visivel: w && !w.hidden, texto: (document.getElementById('start-streak') || {}).textContent };
  });
  ok('streaks: a pílula da chama aparece com 3 dias seguidos',
    pill.visivel === true && /3 dias seguidos/.test(pill.texto || ''), JSON.stringify(pill));
  await ctxSt.close();
}

await browser.close();
process.exitCode = fail ? 1 : 0;
