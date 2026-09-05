// e2e dos OVERLAYS em tela curta (v1.12.1 "Régua").
//
//   node tools/e2e-overlays.mjs
//
// POR QUE EXISTE. O feedback do dono em 05/09: "as mensagens de pop up que
// aparecem na tela do celular estão maiores que a tela, tendo que rolar para
// achar os botões — exemplo da tela de game over no iPhone 17 Pro". A sonda
// reproduziu: em 874×402 o #game-over pedia ~440 px numa caixa de 354, e o
// "Jogar Novamente" nascia em y 371-434 — fora da tela. E não era caso raro:
// 48 dos 75 aparelhos da base têm lado curto ≤ 520 px (radiografia de 05/09,
// seção "Fricção pós-morte").
//
// O QUE ELA TRANCA. Em CADA viewport da lista: o botão primário inteiro
// dentro da tela e com altura de alvo tocável; a caixa sem transbordar; a
// página sem rolagem horizontal; e no top 10, a coluna dos pontos começando
// no MESMO x em todas as linhas (era um flex por linha, com o x decidido
// pelo tamanho do bloco da direita — nome longo ainda quebrava em duas).
//
// Sonda: player_id `claude-*` + notify_off (regra 5 do CLAUDE.md). Não grava
// no Firestore — nenhum contexto pede o opt-in de escrita local.
import { chromium } from 'playwright';

const ALVO = process.env.ALVO || 'http://localhost:3000/';
let pass = 0;
let fail = 0;
const ok = (n, c, det = '') => {
  if (c) { pass++; console.log(`PASS ${n}`); } else { fail++; console.log(`FAIL ${n} ${det}`); }
};

// As telas que importam. As duas primeiras são o aparelho do feedback (com e
// sem a barra do Safari); 640×304 é o pior caso real (Chrome Android com a
// barra); 1024×768 é o iPad, onde a caixa NÃO pode virar uma tira estreita.
const VIEWPORTS = [
  { nome: 'iPhone 17 Pro standalone', w: 874, h: 402, dpr: 3, touch: true },
  { nome: 'iPhone 17 Pro + barra Safari', w: 874, h: 360, dpr: 3, touch: true },
  { nome: 'iPhone 11/X', w: 812, h: 375, dpr: 2, touch: true },
  { nome: 'Android médio', w: 640, h: 360, dpr: 2, touch: true },
  { nome: 'Android + barra (pior caso)', w: 640, h: 304, dpr: 2, touch: true },
  { nome: 'desktop', w: 1280, h: 720, dpr: 1, touch: false },
  { nome: 'iPad paisagem', w: 1024, h: 768, dpr: 2, touch: true },
];

const semear = () => {
  localStorage.setItem('furious_rhino_player_id', 'claude-e2e-overlays');
  localStorage.setItem('furious_rhino_player_name', 'SondaOverlay');
  localStorage.setItem('furious_rhino_notify_off', '1');
  localStorage.setItem('furious_rhino_record', '1225');
  localStorage.setItem('furious_rhino_record_pts', '1380');
  localStorage.setItem('furious_rhino_attempts', '40');
  localStorage.setItem('furious_rhino_last_rank', '12');
  sessionStorage.setItem('furious_rhino_pwa_prompted', '1');
  // top 10 com o pior caso de largura: nome comprido + marca antiga + os dois
  // formatos de fmtScore (com e sem metros)
  localStorage.setItem('furious_rhino_podium', JSON.stringify({
    at: Date.now(),
    entries: [
      { id: 'p1', name: 'Constantinopla', score: 5185, m: 5185, sinceMs: Date.now() - 23 * 86400000, skin: null },
      { id: 'p2', name: 'Thomas', score: 4606, scoreM: 4100, m: 4100, sinceMs: Date.now() - 20 * 86400000, skin: null },
      { id: 'p3', name: 'Zé', score: 1274, m: 1274, sinceMs: Date.now() - 86400000, skin: null },
    ],
  }));
};

const browser = await chromium.launch();
const erros = [];

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    deviceScaleFactor: vp.dpr,
    isMobile: vp.touch,
    hasTouch: vp.touch,
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => erros.push(`${vp.nome}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') erros.push(`${vp.nome}: ${m.text()}`); });
  await page.addInitScript(semear);
  await page.goto(`${ALVO}?debug=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.game && window.game.scene.getScene('GameScene'), null, { timeout: 30000 });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    document.querySelectorAll('.lil-gui, #pwa-modal').forEach((e) => e.remove());
  });

  // ---------- 1. FIM DE CORRIDA (derrota, o caso do feedback) ----------
  await page.evaluate(() => {
    const s = window.game.scene.getScene('GameScene');
    s.startRun();
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const s = window.game.scene.getScene('GameScene');
    // dardo: a causa com a dica mais longa (2 linhas) + medalhas + breakdown
    s.rhino.getSprite().body.reset(430 * 40, 450);
    s.endGame(false, 'dart');
  });
  await page.waitForTimeout(1400);

  const go = await page.evaluate(() => {
    const box = document.getElementById('game-over');
    const btn = document.getElementById('restart-btn');
    const share = document.getElementById('share-btn');
    const r = box.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    const sh = share.getBoundingClientRect();
    const extra = box.querySelector('.go-extra');
    return {
      visivel: getComputedStyle(box).display === 'block',
      caixa: [Math.round(r.top), Math.round(r.bottom), Math.round(r.width)],
      btn: [Math.round(b.top), Math.round(b.bottom), Math.round(b.height)],
      share: [Math.round(sh.top), Math.round(sh.bottom)],
      inner: [window.innerWidth, window.innerHeight],
      scrollW: document.documentElement.scrollWidth,
      heroRola: (() => { const h = box.querySelector('.go-hero'); return h.scrollHeight > h.clientHeight + 1; })(),
      extraRola: extra.scrollHeight > extra.clientHeight + 1,
      guiasSumiram: getComputedStyle(document.querySelector('.touch-guides')).display === 'none',
    };
  });

  ok(`[${vp.nome}] fim de corrida: display block (contrato do e2e-stats)`, go.visivel);
  ok(`[${vp.nome}] a caixa inteira cabe na tela`,
    go.caixa[0] >= 0 && go.caixa[1] <= go.inner[1], JSON.stringify(go.caixa) + ' em ' + go.inner[1]);
  ok(`[${vp.nome}] JOGAR DE NOVO visível SEM rolar (a queixa do dono)`,
    go.btn[0] >= 0 && go.btn[1] <= go.inner[1], `botão ${JSON.stringify(go.btn)} em ${go.inner[1]}`);
  ok(`[${vp.nome}] o botão é alvo tocável (≥44px)`, go.btn[2] >= 44, `${go.btn[2]}px`);
  ok(`[${vp.nome}] compartilhar também está acima da dobra`,
    go.share[1] <= go.inner[1], JSON.stringify(go.share));
  ok(`[${vp.nome}] o herói (resultado + delta + dica) nunca rola`, !go.heroRola);
  ok(`[${vp.nome}] sem rolagem horizontal na página`,
    go.scrollW <= go.inner[0], `${go.scrollW} > ${go.inner[0]}`);
  ok(`[${vp.nome}] guias de toque saem da frente no fim de corrida`, go.guiasSumiram);

  // ---------- 2. TOP 10 ----------
  await page.evaluate(() => {
    document.getElementById('game-over').style.display = 'none';
    document.body.classList.remove('ended');
  });
  const abriu = await page.evaluate(async () => {
    const s = window.game.scene.getScene('GameScene');
    if (typeof s.openRanking !== 'function') return false;
    s.openRanking();
    return true;
  });
  if (abriu) {
    await page.waitForTimeout(1800);
    const rk = await page.evaluate(() => {
      const modal = document.getElementById('ranking-modal');
      const lis = [...document.querySelectorAll('#ranking-list li')];
      const scores = lis.map((li) => {
        const sc = li.querySelector('.rank-score');
        return sc ? Math.round(sc.getBoundingClientRect().left) : null;
      }).filter((x) => x !== null);
      const alturas = lis.map((li) => Math.round(li.getBoundingClientRect().height));
      const nomes = lis.map((li) => {
        const n = li.querySelector('.rank-name');
        return n ? Math.round(n.getBoundingClientRect().height) : 0;
      });
      const r = modal.getBoundingClientRect();
      return {
        n: lis.length,
        colunaX: scores.length ? Math.max(...scores) - Math.min(...scores) : -1,
        maiorLinha: alturas.length ? Math.max(...alturas) : 0,
        maiorNome: nomes.length ? Math.max(...nomes) : 0,
        cabe: r.top >= 0 && r.bottom <= window.innerHeight,
        caixa: [Math.round(r.top), Math.round(r.bottom)],
        inner: window.innerHeight,
      };
    });
    if (rk.n > 0) {
      ok(`[${vp.nome}] top 10: pontos começam no MESMO x em todas as linhas`,
        rk.colunaX <= 1, `desvio de ${rk.colunaX}px`);
      ok(`[${vp.nome}] top 10: nome longo trunca em vez de quebrar em 2 linhas`,
        rk.maiorNome <= 26, `${rk.maiorNome}px de altura no nome`);
      ok(`[${vp.nome}] top 10: a caixa cabe na tela`, rk.cabe,
        `${JSON.stringify(rk.caixa)} em ${rk.inner}`);
    } else {
      ok(`[${vp.nome}] top 10: lista pintada`, false, 'nenhuma linha');
    }
    await page.evaluate(() => {
      const b = document.getElementById('ranking-close');
      if (b) b.click();
      else document.getElementById('ranking-modal').style.display = 'none';
    });
  }

  // ---------- 3. VITÓRIA (o bug latente da LENDA) ----------
  await page.evaluate(() => {
    const s = window.game.scene.getScene('GameScene');
    s.gameOver = false;
    s.legend = true;
    s.endGame(true, null);
    document.getElementById('game-win').style.display = 'block';
  });
  await page.waitForTimeout(700);
  const win = await page.evaluate(() => {
    const box = document.getElementById('game-win');
    const btn = document.getElementById('win-restart-btn');
    const r = box.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    return {
      caixa: [Math.round(r.top), Math.round(r.bottom)],
      btn: [Math.round(b.top), Math.round(b.bottom), Math.round(b.height)],
      inner: window.innerHeight,
    };
  });
  ok(`[${vp.nome}] vitória: a caixa cabe (antes não tinha max-height nenhum)`,
    win.caixa[0] >= 0 && win.caixa[1] <= win.inner, JSON.stringify(win.caixa));
  ok(`[${vp.nome}] vitória: o botão de recomeçar está na tela`,
    win.btn[0] >= 0 && win.btn[1] <= win.inner && win.btn[2] >= 44, JSON.stringify(win.btn));

  await ctx.close();
}

// ---------- 4. O rastro do reinício (letras rs/rt) ----------
{
  const ctx = await browser.newContext({ viewport: { width: 874, height: 402 }, hasTouch: true });
  const page = await ctx.newPage();
  await page.addInitScript(semear);
  await page.goto(`${ALVO}?debug=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.game && window.game.scene.getScene('GameScene'), null, { timeout: 30000 });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    document.querySelectorAll('.lil-gui, #pwa-modal').forEach((e) => e.remove());
    const s = window.game.scene.getScene('GameScene');
    s.startRun();
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => window.game.scene.getScene('GameScene').endGame(false, 'wall'));
  await page.waitForTimeout(900);
  // o botão marca o rastro ANTES de recarregar — lemos o sessionStorage sem
  // deixar o reload acontecer (o teste não precisa do boot inteiro de novo)
  const rastro = await page.evaluate(() => {
    const s = window.game.scene.getScene('GameScene');
    s.marcarReinicio(1);
    s.marcarReinicio(4);
    const bruto = sessionStorage.getItem('fr_replay');
    return bruto ? JSON.parse(bruto) : null;
  });
  ok('rastro: o botão grava bitmask no sessionStorage (sobrevive ao reload)',
    rastro && rastro.bits === 5, JSON.stringify(rastro));
  const consumido = await page.evaluate(() => {
    const s = window.game.scene.getScene('GameScene');
    s.startTriggered = false;
    s.startRun();
    return { info: s.replayInfo, sobrou: sessionStorage.getItem('fr_replay') };
  });
  ok('rastro: a largada seguinte CONSOME o rastro (vale uma vez só)',
    consumido.info && consumido.info.bits === 5 && consumido.sobrou === null,
    JSON.stringify(consumido));
  await ctx.close();
}

ok('nenhum erro de JS em nenhum viewport', erros.length === 0, erros.slice(0, 3).join(' | '));

console.log(`\n${pass}/${pass + fail} OK`);
await browser.close();
process.exitCode = fail ? 1 : 0;
