// Regressão de performance da tela inicial.
//
//   node tools/perf-home.mjs              → mede localhost:3000
//   ALVO=https://... node tools/perf-home.mjs → mede outro alvo
//
// POR QUE EXISTE: até a v1.9.2 a home só era pintada dentro do
// GameScene.create(), que roda depois de o Phaser baixar 150 SVGs — dos quais
// a home usa 4, e por <img> HTML. No celular isso deixava a tela VAZIA por 4,6
// segundos DEPOIS de a página estar pronta (pódio aos 6.136 ms, página
// carregada aos 1.499 ms). Este script trava esse ganho: se alguém voltar a
// pendurar a home no boot do motor, o teste fica vermelho.
//
// Mede com throttling de celular real (4G + CPU 4x mais lenta), porque no
// desktop com rede boa o problema simplesmente não aparece.
import { chromium } from 'playwright';

const ALVO = process.env.ALVO || 'http://localhost:3000/';
// O CRITÉRIO é RELATIVO, e de propósito: o que estamos protegendo é "a home
// aparece junto com a PÁGINA, não junto com o MOTOR". Um limite absoluto
// mediria outra coisa — quanto o `document.write` do phaser.min.js atrasa o
// parser —, que varia com a máquina e com a rede e não é o que esta mudança
// trata. Antes da v1.9.3 esta distância era de 6.003 ms no localhost com
// throttling; depois, ~595 ms.
const LIMITE_ESPERA_MS = 1500;
// Rede de segurança: se o número absoluto explodir, outra coisa quebrou.
const LIMITE_ABSOLUTO_MS = 8000;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 780, height: 445 } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions', {
  offline: false,
  downloadThroughput: 9 * 1024 * 1024 / 8,
  uploadThroughput: 3 * 1024 * 1024 / 8,
  latency: 150,
});
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

await page.addInitScript(() => {
  localStorage.setItem('furious_rhino_player_id', 'claude-perf-home-01');
  localStorage.setItem('furious_rhino_player_name', 'PerfHome');
  localStorage.setItem('furious_rhino_notify_off', '1');
  localStorage.setItem('furious_rhino_record', '2500');
  localStorage.setItem('furious_rhino_record_pts', '3100');
  localStorage.setItem('furious_rhino_attempts', '42');
  localStorage.setItem('furious_rhino_wins', '3');
  localStorage.setItem('furious_rhino_best_sent', '3100');
  localStorage.setItem('furious_rhino_last_rank', '4');
  sessionStorage.setItem('furious_rhino_pwa_prompted', '1');
  // O Diário só tem o que pintar se houver notícia — sem isto a métrica dele
  // mediria "não havia nada", não "demorou".
  localStorage.setItem('furious_rhino_news', JSON.stringify([
    { k: 'perf:1', t: Date.now() - 3600000, x: 'Você bateu seu recorde: 2.500 m!', c: 'gold' },
    { k: 'perf:2', t: Date.now() - 7200000, x: 'Fuga do zoológico concluída.', c: '' },
  ]));
  localStorage.setItem('furious_rhino_podium', JSON.stringify({ at: Date.now(), entries: [
    { id: 'a', name: 'Alfa', score: 9000, m: 8000, sinceMs: Date.now() - 3 * 86400000, skin: null },
    { id: 'b', name: 'Beta', score: 7000, m: 6000, sinceMs: Date.now() - 2 * 86400000, skin: null },
    { id: 'c', name: 'Gama', score: 5000, m: 4000, sinceMs: Date.now() - 86400000, skin: null },
  ] }));

  // Sonda de pintura: roda ANTES de qualquer script da página e vigia por
  // rAF. Um MutationObserver instalado no DOMContentLoaded perderia uma
  // pintura anterior a ele — que é exatamente o caso que queremos medir.
  window.__marcos = {};
  // `#start-record` já nasce com "0" no HTML estático: medir "tem texto"
  // daria um falso positivo. O critério é o dado REAL do jogador aparecer.
  const alvos = {
    podio: () => document.getElementById('podium-steps'),
    diario: () => document.getElementById('news-list'),
    recorde: () => {
      const el = document.getElementById('start-record');
      return el && el.textContent.trim() !== '0' ? el : null;
    },
  };
  const olhar = () => {
    for (const [chave, achar] of Object.entries(alvos)) {
      if (window.__marcos[chave]) continue;
      const el = achar();
      if (el && el.textContent.trim()) window.__marcos[chave] = Math.round(performance.now());
    }
    requestAnimationFrame(olhar);
  };
  requestAnimationFrame(olhar);
});

await page.goto(ALVO, { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(14000);

const r = await page.evaluate(() => {
  const rec = performance.getEntriesByType('resource');
  const t = performance.getEntriesByType('navigation')[0] || {};
  const art = rec.filter((x) => /\/art\//.test(x.name));
  const mark = performance.getEntriesByName('home-pintada')[0];
  return {
    fcp: Math.round((performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime || 0),
    paginaCarregada: Math.round(t.loadEventEnd || 0),
    podio: window.__marcos.podio || 0,
    diario: window.__marcos.diario || 0,
    recorde: window.__marcos.recorde || 0,
    marcaHomePintada: mark ? Math.round(mark.startTime) : null,
    preloadArteTerminou: art.length ? Math.round(Math.max(...art.map((x) => x.responseEnd))) : 0,
    assetsArte: art.length,
  };
});

const p = (n) => String(n).padStart(6);
console.log(`Alvo: ${ALVO}   (4G + CPU 4x)\n`);
console.log(`  primeira pintura        ${p(r.fcp)} ms`);
console.log(`  página carregada        ${p(r.paginaCarregada)} ms`);
console.log(`  RECORDE na tela         ${p(r.recorde)} ms`);
console.log(`  PÓDIO na tela           ${p(r.podio)} ms  <= é este que conta`);
console.log(`  diário na tela          ${p(r.diario)} ms`);
console.log(`  preload das artes       ${p(r.preloadArteTerminou)} ms  (${r.assetsArte} arquivos)`);
if (r.marcaHomePintada !== null) console.log(`  marca 'home-pintada'    ${p(r.marcaHomePintada)} ms`);

// O sintoma que originou tudo: a distância entre a página estar pronta e o
// conteúdo aparecer. Era de 4,6 segundos.
const espera = r.podio - r.paginaCarregada;
console.log(`\n  espera depois de a página estar pronta: ${espera} ms`);

const ok = r.podio > 0 && espera <= LIMITE_ESPERA_MS && r.podio <= LIMITE_ABSOLUTO_MS;
if (ok) {
  console.log(`\nPASS  a home aparece ${espera} ms depois da página (limite ${LIMITE_ESPERA_MS} ms)`);
} else if (!r.podio) {
  console.log('\nFAIL  o pódio NUNCA foi pintado.');
} else if (espera > LIMITE_ESPERA_MS) {
  console.log(`\nFAIL  a home demorou ${espera} ms depois de a página estar pronta`
    + ` — o limite é ${LIMITE_ESPERA_MS} ms.`
    + '\n      A home voltou a esperar o boot do Phaser? O js/game.js tem de chamar'
    + '\n      HomeScreen.paintFromCache() ANTES do Promise.all das cenas.');
} else {
  console.log(`\nFAIL  pódio em ${r.podio} ms — acima do teto absoluto de ${LIMITE_ABSOLUTO_MS} ms.`);
}
await browser.close();
process.exitCode = ok ? 0 : 1;
