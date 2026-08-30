// e2e da rede de protecao (v1.9.1): injeta uma excecao real no update e
// exige que (a) o jogador veja o overlay, (b) a tentativa seja devolvida e
// (c) NADA seja gravado — nem run, nem recorde, nem pódio.
import { chromium } from 'playwright';
// ?debug=1 e a unica via para alcancar a cena de fora (window.game)
const ALVO = process.env.ALVO || 'http://localhost:3000/?debug=1';
let pass = 0, fail = 0;
const ok = (n, c, det = '') => { if (c) { pass++; console.log(`PASS ${n}`); }
  else { fail++; console.log(`FAIL ${n} ${det}`); } };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1360, height: 768 } });
const page = await ctx.newPage();
await page.addInitScript(() => {
  localStorage.setItem('furious_rhino_player_id', 'claude-e2e-crash-01');
  localStorage.setItem('furious_rhino_player_name', 'CrashE2E');
  localStorage.setItem('furious_rhino_notify_off', '1');
  localStorage.setItem('furious_rhino_attempts', '40');
  localStorage.setItem('furious_rhino_record', '900');
  localStorage.setItem('furious_rhino_record_pts', '1200');
  localStorage.setItem('furious_rhino_runs', JSON.stringify([{ t: 1, m: 900, s: 120, c: 'wall' }]));
  sessionStorage.setItem('furious_rhino_pwa_prompted', '1');
});
await page.goto(ALVO, { waitUntil: 'load' });
await page.waitForTimeout(3500);
await page.mouse.click(680, 400);
await page.waitForTimeout(1500);

const antes = await page.evaluate(() => ({
  tentativas: +localStorage.getItem('furious_rhino_attempts'),
  runs: JSON.parse(localStorage.getItem('furious_rhino_runs') || '[]').length,
  recorde: +localStorage.getItem('furious_rhino_record'),
  overlay: getComputedStyle(document.getElementById('crash-overlay')).display,
}));
ok('1. o overlay de falha comeca escondido', antes.overlay === 'none', `display=${antes.overlay}`);
ok('2. a tentativa da corrida foi contada no startRun', antes.tentativas === 41, `att=${antes.tentativas}`);

// dispara a excecao REAL dentro do update (nao chama crashToHome na mao)
await page.evaluate(() => {
  const sc = window.game.scene.getScene('GameScene');
  sc.updateTerrain = function () { throw new TypeError('falha injetada pelo e2e'); };
});
await page.waitForTimeout(2500);

const depois = await page.evaluate(() => ({
  overlay: getComputedStyle(document.getElementById('crash-overlay')).display,
  tentativas: +localStorage.getItem('furious_rhino_attempts'),
  runs: JSON.parse(localStorage.getItem('furious_rhino_runs') || '[]').length,
  ultima: JSON.parse(localStorage.getItem('furious_rhino_runs') || '[]').pop() || null,
  recorde: +localStorage.getItem('furious_rhino_record'),
  recordePts: +localStorage.getItem('furious_rhino_record_pts'),
  enviado: localStorage.getItem('furious_rhino_best_sent'),
  texto: document.getElementById('crash-overlay').textContent.replace(/\s+/g, ' ').trim().slice(0, 110),
  textoCompleto: document.getElementById('crash-overlay').textContent.replace(/\s+/g, ' ').trim(),
  temBotao: !!document.querySelector('#crash-overlay button'),
}));
ok('3. o jogador VE o overlay (nao fica com a tela morta)', depois.overlay === 'flex', `display=${depois.overlay}`);
ok('4. ...com saida clicavel', depois.temBotao);
// v1.9.5: o texto mudou de "nao foi salva" para "nao valeu pontos" — a
// corrida AGORA e registrada (para diagnostico), so nao pontua. Dizer
// "nao foi salva" passaria a mentir para quem visse a corrida no historico.
ok('5. ...e texto honesto sobre o que aconteceu',
  /não valeu pontos/i.test(depois.texto) && /devolvid/i.test(depois.textoCompleto || depois.texto),
  `"${depois.texto}"`);
ok('6. a tentativa foi DEVOLVIDA', depois.tentativas === 40, `att=${depois.tentativas}`);
// v1.9.5: INVERTIDO de proposito. A corrida quebrada agora E gravada (com a
// causa `crash`) — o que ela nao faz e PONTUAR. A regra antiga apagava
// justamente a corrida anomala, que e a que a investigacao precisa ver.
ok('7. a corrida quebrada E gravada, com causa `crash`',
  depois.runs === antes.runs + 1 && depois.ultima && depois.ultima.c === 'crash',
  `runs=${antes.runs}->${depois.runs} c=${depois.ultima && depois.ultima.c}`);
ok('7b. ...levando a sonda do loop junto (o par que denuncia o bug)',
  Boolean(depois.ultima && depois.ultima.i !== undefined),
  `i=${depois.ultima && depois.ultima.i}`);
ok('8. sessao quebrada NAO mexe no recorde', depois.recorde === 900 && depois.recordePts === 1200,
  `rec=${depois.recorde}/${depois.recordePts}`);
ok('9. sessao quebrada NAO envia ao podio', !depois.enviado, `best_sent=${depois.enviado}`);

// idempotencia: o update roda 60x/s e o crash nao pode repetir efeito
const rep = await page.evaluate(() => {
  const sc = window.game.scene.getScene('GameScene');
  for (let i = 0; i < 50; i++) sc.crashToHome('teste-repetido');
  return +localStorage.getItem('furious_rhino_attempts');
});
ok('10. 50 crashes seguidos devolvem UMA tentativa so (idempotente)', rep === 40, `att=${rep}`);

// ============ v1.10.1 — o pacote do CASO 1 (H2 + H3) ============
{
  const pC1 = await ctx.newPage();
  const errC1 = [];
  pC1.on('pageerror', (e) => errC1.push(String(e)));
  await pC1.goto(ALVO, { waitUntil: 'networkidle' });
  await pC1.waitForFunction(() => window.game && window.game.scene.getScene('GameScene'), null, { timeout: 20000 });
  await pC1.waitForTimeout(500);

  // H2: um quadro de 3 SEGUNDOS nao pode teleportar — o teto de 50ms o
  // transforma em UM passo de camera lenta (~15px a 300px/s, nao ~900px).
  const h2 = await pC1.evaluate(async () => {
    const s = window.game.scene.getScene('GameScene');
    if (!s.startTriggered) s.startRun();
    await new Promise((r) => setTimeout(r, 250)); // graca de 150ms do started
    const x0 = s.rhino.getSprite().x;
    s.physics.world.update(0, 3000);
    return { andou: Math.round(s.rhino.getSprite().x - x0) };
  });
  ok('11. H2: quadro de 3s vira camera lenta, nao teleporte (<= 30px)',
    h2.andou >= 0 && h2.andou <= 30, `${h2.andou}px`);
  await pC1.close();

  // H3: contexto NASCIDO em retrato (resize de janela e bloqueado neste
  // launch) — cobre tambem a lacuna real: LARGAR em pe tem de pausar.
  const ctxRetrato = await browser.newContext({ viewport: { width: 500, height: 900 } });
  const pR = await ctxRetrato.newPage();
  await pR.goto(ALVO, { waitUntil: 'networkidle' });
  await pR.waitForFunction(() => window.game && window.game.scene.getScene('GameScene'), null, { timeout: 20000 });
  await pR.waitForTimeout(400);
  await pR.evaluate(() => { window.game.scene.getScene('GameScene').startRun(); });
  await pR.waitForTimeout(400); // a graca de 150ms + folga
  const h3 = await pR.evaluate(() => {
    const s = window.game.scene.getScene('GameScene');
    return { paused: s.paused, started: s.started };
  });
  ok('12. H3: largar em RETRATO pausa de verdade (nada de correr as cegas)',
    h3.started === true && h3.paused === true, JSON.stringify(h3));
  const h3b = await pR.evaluate(() => {
    const s = window.game.scene.getScene('GameScene');
    s.resumeGame(); // a retomada e decisao humana — e funciona
    return { depois: s.paused };
  });
  ok('13. H3b: a retomada humana funciona', h3b.depois === false, JSON.stringify(h3b));
  ok('14. CASO 1: sem erros de JS nas paginas do pacote', errC1.length === 0, errC1.slice(0, 2).join(' | '));
  await ctxRetrato.close();
}

console.log(`\n${pass}/${pass + fail} OK`);
await browser.close();
process.exit(fail ? 1 : 0);
