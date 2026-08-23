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
  recorde: +localStorage.getItem('furious_rhino_record'),
  recordePts: +localStorage.getItem('furious_rhino_record_pts'),
  enviado: localStorage.getItem('furious_rhino_best_sent'),
  texto: document.getElementById('crash-overlay').textContent.replace(/\s+/g, ' ').trim().slice(0, 110),
  temBotao: !!document.querySelector('#crash-overlay button'),
}));
ok('3. o jogador VE o overlay (nao fica com a tela morta)', depois.overlay === 'flex', `display=${depois.overlay}`);
ok('4. ...com saida clicavel', depois.temBotao);
ok('5. ...e texto honesto', /não foi salva|devolvid/i.test(depois.texto), `"${depois.texto}"`);
ok('6. a tentativa foi DEVOLVIDA', depois.tentativas === 40, `att=${depois.tentativas}`);
ok('7. sessao quebrada NAO grava corrida', depois.runs === antes.runs, `runs=${depois.runs}`);
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

console.log(`\n${pass}/${pass + fail} OK`);
await browser.close();
process.exit(fail ? 1 : 0);
