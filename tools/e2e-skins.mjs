// E2E do sistema de skins (v1.8.0) num navegador real:
//   node tools/e2e-skins.mjs   (requer o jogo servido em localhost:3000)
//
// Cobre o que test-skins (node puro) não alcança: o preview da abertura, o
// sprite em jogo vestindo a skin, o hub (modal que NÃO inicia a corrida),
// a persistência através de reload, a volta à anim da skin pós-rampage e a
// concessão da Catisquick pelo crossGate de verdade.
//
// Sonda claude-* sem opt-in de escrita: em ambiente local nada grava no
// Firestore (StorageManager.allowsRemoteWrite), regra 5 do CLAUDE.md.
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const results = [];
const ok = (name, cond, extra = '') =>
  results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);

const browser = await chromium.launch();
const errors = [];
const trackErrors = (page) => {
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) {
      errors.push(m.text());
    }
  });
};

// REGISTRY CANÔNICO injetado por interceptação de rede: o dono edita/esconde
// skins à vontade pelo /?setup, e esta suíte (que valida COMPORTAMENTO no
// navegador) não pode depender do estado do momento. O SW é bloqueado no
// contexto para a rota interceptar sempre. A consistência do registry REAL
// fica com o test-skins.
const CANON_SKINS = [
  { id: 'default', name: 'Furious Rhino', prefix: null, access: { type: 'default' }, desc: 'O original.' },
  { id: 'party', name: 'Thanks for playing', prefix: 'rhino-party-run', access: { type: 'default' }, desc: 'grátis' },
  { id: 'robot', name: 'Rino Robô', prefix: 'rhino-robot-run', access: { type: 'default' }, desc: 'grátis' },
  { id: 'gold', name: 'Rino de Ouro', prefix: 'rhino-gold-run', access: { type: 'rank', rank: 1 }, desc: 'nº 1' },
  { id: 'silver', name: 'Rino de Prata', prefix: 'rhino-silver-run', access: { type: 'rank', rank: 2 }, desc: 'nº 2' },
  { id: 'bronze', name: 'Rino de Bronze', prefix: 'rhino-bronze-run', access: { type: 'rank', rank: 3 }, desc: 'nº 3' },
  // v1.8.2: a skin de conquista canônica usa arte do NÚCLEO do jogo
  // (rhino-run / rhino-fire-run) — o dono pode remover QUALQUER skin real
  // pelo /?setup (aconteceu: a Catisquick's Rhino foi removida com a arte,
  // e a entrada canônica antiga apontava para os SVGs apagados)
  { id: 'catisquick', name: "Catisquick's Rhino", prefix: 'rhino-run',
    firePrefix: 'rhino-fire-run',
    access: { type: 'achievement', condition: { towersDowned: 5, bossLayers: 3 } }, desc: '5 torres + caçador' },
];
const CANON_MODULE = `export const SKINS = ${JSON.stringify(CANON_SKINS)};\n`;

// Cada cenário abre um contexto próprio: o seed do localStorage muda entre eles
async function boot(seed = {}) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    serviceWorkers: 'block',
  });
  await context.route('**/js/systems/SkinRegistry.js*', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: CANON_MODULE }));
  await context.addInitScript((s) => {
    localStorage.setItem('furious_rhino_attempts', '50');
    localStorage.setItem('furious_rhino_player_id', 'claude-e2e-skins');
    localStorage.setItem('furious_rhino_notify_off', '1');
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
  }, seed);
  const page = await context.newPage();
  trackErrors(page);
  await page.goto(`${BASE}/?debug=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const pwa = page.locator('#pwa-modal');
  if (await pwa.isVisible().catch(() => false)) {
    await page.click('#pwa-skip');
    await page.waitForTimeout(200);
  }
  return { context, page };
}

const previewSrcs = (page) => page.evaluate(() =>
  [...document.querySelectorAll('.rhino-anim img')].map((i) => i.getAttribute('src')));

// ---------- 1. Skin de pódio equipada + rank válido: veste em todo lugar ----------
{
  const { context, page } = await boot({
    furious_rhino_skin: 'gold',
    furious_rhino_last_rank: '1',
  });
  const srcs = await previewSrcs(page);
  ok('1. preview da abertura veste a skin de ouro',
    srcs.every((s) => s.includes('rhino-gold-run')), srcs.join(','));

  await page.locator('#start-screen').click({ position: { x: 640, y: 650 } });
  await page.waitForTimeout(600);
  const inGame = await page.evaluate(() => {
    const s = window.game.scene.keys.GameScene;
    return {
      tex: s.rhino.getSprite().texture.key,
      anim: s.rhino.getSprite().anims.currentAnim?.key,
      skin: s.skin.id,
    };
  });
  ok('1b. sprite em jogo nasce com a textura e anim da skin',
    inGame.tex.startsWith('rhino-gold-run') && inGame.anim === 'rhino-gold-run'
    && inGame.skin === 'gold', JSON.stringify(inGame));

  // v1.8.1: a escala VISUAL (RHINO_VISUAL_SCALE) não pode tocar a física —
  // body compensado segue 76×54 px de MUNDO com o fundo colado nos pés.
  // Congela a compensação: escala futura sem compensar fica vermelha aqui.
  const bodyGuard = await page.evaluate(() => {
    const s = window.game.scene.keys.GameScene;
    const sprite = s.rhino.getSprite();
    const b = sprite.body;
    return {
      w: +b.width.toFixed(2), h: +b.height.toFixed(2),
      feetGap: +(b.bottom - sprite.y).toFixed(2),
      visualW: +sprite.displayWidth.toFixed(1),
    };
  });
  ok('1b2. hitbox invariante à escala visual (76×54, pés no chão)',
    Math.abs(bodyGuard.w - 76) < 0.05 && Math.abs(bodyGuard.h - 54) < 0.05
    && Math.abs(bodyGuard.feetGap) < 0.5,
    JSON.stringify(bodyGuard));

  // Pós-rampage volta para a anim DA SKIN, não para rhino-run
  const postFury = await page.evaluate(async () => {
    const s = window.game.scene.keys.GameScene;
    s.furySystem.charge = 1;
    await new Promise((r) => setTimeout(r, 120));
    s.doSpecial();
    const fireAnim = s.rhino.getSprite().anims.currentAnim?.key;
    s.furySystem.charge = 0.01;
    await new Promise((r) => setTimeout(r, 500));
    return { fireAnim, backAnim: s.rhino.getSprite().anims.currentAnim?.key };
  });
  ok('1c. rampage usa a arte de fogo compartilhada e devolve a anim da skin',
    postFury.fireAnim === 'rhino-fire-run' && postFury.backAnim === 'rhino-gold-run',
    JSON.stringify(postFury));
  await context.close();
}

// ---------- 2. Rank caiu: default na leitura, escolha preservada ----------
{
  const { context, page } = await boot({
    furious_rhino_skin: 'gold',
    furious_rhino_last_rank: '5',
  });
  const srcs = await previewSrcs(page);
  const r = await page.evaluate(() => ({
    skin: window.game.scene.keys.GameScene.skin.id,
    stored: localStorage.getItem('furious_rhino_skin'),
    notice: document.getElementById('skins-status')?.textContent ?? '',
  }));
  ok('2. destronado: preview e skin efetiva voltam ao default',
    srcs.every((s) => s.includes('art/rhino-run')) && r.skin === 'default',
    `skin=${r.skin} srcs=${srcs[0]}`);
  ok('2b. a escolha NÃO foi regravada (volta sozinha com o pódio)',
    r.stored === 'gold', `stored=${r.stored}`);
  await context.close();
}

// ---------- 3. Hub: modal não inicia corrida; bloqueada não equipa; grátis equipa e persiste ----------
{
  const { context, page } = await boot({ furious_rhino_last_rank: '4' });
  await page.click('#skins-btn');
  await page.waitForTimeout(300);
  // O dono cria/esconde skins pelo /?setup — os números esperados saem do
  // REGISTRY da página, nunca de constantes (senão toda skin nova do dono
  // derrubaria a suíte)
  const opened = await page.evaluate(async () => {
    const { SKINS } = await import('./js/systems/SkinRegistry.js');
    const visible = SKINS.filter((s) => !s.hidden);
    return {
      visible: document.getElementById('skins-modal').style.display === 'block',
      started: window.game.scene.keys.GameScene.started,
      cells: document.querySelectorAll('.skin-cell').length,
      lockedCells: document.querySelectorAll('.skin-cell.locked').length,
      pendingCells: document.querySelectorAll('.skin-cell.pending').length,
      wantCells: visible.length,
      wantPending: visible.filter((s) => s.pending).length,
    };
  });
  ok('3. o botão abre o hub SEM iniciar a corrida',
    opened.visible && !opened.started, JSON.stringify(opened));
  // rank 4 no seed: só default + skins grátis/conquistadas ficam livres —
  // bloqueadas = células que não são equipáveis; o mínimo garantido são as
  // do pódio (o resto depende do registry do dono)
  ok('3b. grade cobre o registry (sem hidden) e nada pendente inesperado',
    opened.cells === opened.wantCells && opened.pendingCells === opened.wantPending
    && opened.lockedCells >= 3,
    `cells=${opened.cells}/${opened.wantCells} locked=${opened.lockedCells} pending=${opened.pendingCells}`);

  // Clicar numa bloqueada (ouro, rank 4) não muda nada
  await page.evaluate(() => {
    [...document.querySelectorAll('.skin-cell')]
      .find((c) => c.querySelector('b').textContent === 'Rino de Ouro').click();
  });
  await page.waitForTimeout(200);
  const afterLocked = await page.evaluate(() => localStorage.getItem('furious_rhino_skin'));
  ok('3c. célula bloqueada não equipa', afterLocked === null, `stored=${afterLocked}`);

  // Equipar a grátis (Thanks for playing) — persiste e sobrevive ao reload
  await page.evaluate(() => {
    [...document.querySelectorAll('.skin-cell')]
      .find((c) => c.querySelector('b').textContent === 'Thanks for playing').click();
  });
  await page.waitForTimeout(300);
  const equipped = await page.evaluate(() => ({
    stored: localStorage.getItem('furious_rhino_skin'),
    tex: window.game.scene.keys.GameScene.rhino.getSprite().texture.key,
  }));
  ok('3d. a skin grátis equipa sem seed algum (party)',
    equipped.stored === 'party' && equipped.tex.startsWith('rhino-party-run'),
    JSON.stringify(equipped));

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const srcs = await previewSrcs(page);
  ok('3e. reload: a seleção persiste no preview',
    srcs.every((s) => s.includes('rhino-party-run')), srcs[0]);
  await context.close();
}

// ---------- 4. Catisquick: 5 torres + caçador na MESMA corrida ----------
{
  const { context, page } = await boot({});
  await page.locator('#start-screen').click({ position: { x: 640, y: 650 } });
  await page.waitForTimeout(600);
  const granted = await page.evaluate(() => {
    const s = window.game.scene.keys.GameScene;
    // Contra-prova primeiro: 4 torres não bastam
    s.runTowersDowned = 4;
    s.runBossLayers = 3;
    s.maybeUnlockSkins();
    const notYet = localStorage.getItem('furious_rhino_skins');
    // A façanha de verdade
    s.runTowersDowned = 5;
    s.maybeUnlockSkins();
    const now = JSON.parse(localStorage.getItem('furious_rhino_skins') || '[]');
    s.maybeUnlockSkins(); // idempotente
    const again = JSON.parse(localStorage.getItem('furious_rhino_skins') || '[]');
    return { notYet, now, again };
  });
  ok('4. contra-prova: 4 torres + caçador NÃO concede', granted.notYet === null,
    `stored=${granted.notYet}`);
  ok('4b. 5 torres + caçador concede a Catisquick (e não duplica)',
    granted.now.includes('catisquick') && granted.again.length === granted.now.length,
    JSON.stringify(granted.now));

  // Recém-conquistada: equipa na hora e o rampage vira o Rino Vulcão
  const vulcao = await page.evaluate(async () => {
    const s = window.game.scene.keys.GameScene;
    const { SkinSystem } = await import('./js/systems/SkinSystem.js');
    s.equipSkin(SkinSystem.get('catisquick'));
    const runTex = s.rhino.getSprite().texture.key;
    s.furySystem.charge = 1;
    await new Promise((r) => setTimeout(r, 120));
    s.doSpecial();
    const fireAnim = s.rhino.getSprite().anims.currentAnim?.key;
    s.furySystem.charge = 0.01;
    await new Promise((r) => setTimeout(r, 500));
    return { runTex, fireAnim, backAnim: s.rhino.getSprite().anims.currentAnim?.key };
  });
  ok('4c. conquista equipada: corrida própria e fúria com firePrefix próprio',
    vulcao.runTex.startsWith('rhino-run')
    && vulcao.fireAnim === 'rhino-fire-run'
    && vulcao.backAnim === 'rhino-run',
    JSON.stringify(vulcao));
  await context.close();
}

// ---------- 5. Zero erro de JS ----------
const fatal = errors.filter((e) => !/net::|Failed to load resource|ERR_/.test(e));
ok('5. nenhum erro de JS nas 4 sessões', fatal.length === 0, fatal.slice(0, 3).join(' | '));

await browser.close();
console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} OK`);
process.exit(failed ? 1 : 0);
