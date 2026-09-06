// Retrato dos cinco chefes em luta (v1.12.3), um PNG cada:
//   node tools/fotos-chefes.mjs   (requer o jogo servido em localhost:3000)
//
// Para quê: o conserto do F2 ("boss fight todos muito parecidos") é visual e
// sonoro. O som não cabe num arquivo do repositório, mas a mira colorida, a
// moldura branca do alinhamento e o cronômetro cabem — e é a foto lado a
// lado que mostra em dois segundos o que o texto leva um parágrafo para
// dizer. Saída em `tools/snapshots/chefes-<versao>/`.
//
// Cada chefe é fotografado DUAS vezes: fora da fresta (mira na cor dele) e
// na altura da fresta (moldura branca). Sonda claude-* + notify_off.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.ALVO || 'http://localhost:3000';
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  serviceWorkers: 'block',
});
await context.addInitScript(() => {
  localStorage.setItem('furious_rhino_attempts', '50');
  localStorage.setItem('furious_rhino_record', '5000');
  localStorage.setItem('furious_rhino_player_id', 'claude-fotos');
  localStorage.setItem('furious_rhino_notify_off', '1');
  ['boss', 'muralha', 'cerco', 'farao', 'boss3'].forEach((k) => {
    localStorage.setItem(`furious_rhino_${k}_seen`, '9');
  });
});

const page = await context.newPage();
await page.goto(`${BASE}/?debug=1`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => {
  const s = window.game && window.game.scene.getScene('GameScene');
  return Boolean(s && s.audio && s.rhino && s.spawnManager);
}, null, { timeout: 60000 });
await page.waitForTimeout(900);

const pwa = page.locator('#pwa-modal');
if (await pwa.isVisible().catch(() => false)) {
  await page.click('#pwa-skip');
  await page.waitForTimeout(200);
}
await page.locator('#start-screen').click({ position: { x: 640, y: 650 } });
await page.waitForTimeout(600);

const versao = await page.evaluate(() => window.game.scene.keys.GameScene.registry.get('versao')
  || document.getElementById('game-version')?.textContent || 'dev');
const DIR = join(RAIZ, 'tools', 'snapshots', `chefes-${String(versao).replace(/^v/, '')}`);
mkdirSync(DIR, { recursive: true });

// O invencível existe porque o rino fica parado sob fogo enquanto a foto é
// tirada (mesma razão do e2e-boss-voz).
await page.evaluate(() => { window.game.scene.keys.GameScene.invincible = true; });

const feitas = [];
for (let i = 0; i < 5; i++) {
  const info = await page.evaluate(async (idx) => {
    const s = window.game.scene.keys.GameScene;
    const f = s.bossFights[idx];
    const sp = s.rhino.getSprite();
    ['getWallsGroup', 'getSpikesGroup', 'getAnimalsGroup', 'getTowersGroup',
      'getDartsGroup', 'getRampsGroup'].forEach((g) => {
      s.spawnManager[g]().children.entries.forEach((e) => e.deactivate());
    });
    s.spawnManager.openingIndex = 999;
    s.spawnManager.nextSpawnX = f.def.anchorX + 2000;
    sp.body.moves = false;
    const x = f.def.anchorX - f.def.arenaPx + 10;
    sp.body.reset(x, 620);
    s.cameras.main.setScroll(x - 440, 0);
    await new Promise((r) => setTimeout(r, 1400));
    return { id: f.def.id, nome: f.def.nome, cor: f.glowColor.toString(16) };
  }, i);

  // (a) fora da fresta — a mira na cor do chefe
  await page.evaluate((idx) => {
    const s = window.game.scene.keys.GameScene;
    const f = s.bossFights[idx];
    const sp = s.rhino.getSprite();
    const b = f.layerBounds();
    sp.body.reset(f.def.anchorX - 320, b.bottom + sp.body.height + 60);
    f.updateAim(sp);
  }, i);
  await page.waitForTimeout(400);
  const a = join(DIR, `${i + 1}-${info.id}-fora.png`);
  await page.screenshot({ path: a });

  // (b) na altura da fresta — a moldura branca
  await page.evaluate((idx) => {
    const s = window.game.scene.keys.GameScene;
    const f = s.bossFights[idx];
    const sp = s.rhino.getSprite();
    const b = f.layerBounds();
    sp.body.reset(f.def.anchorX - 320, b.center + sp.body.height / 2);
    f.updateAim(sp);
  }, i);
  await page.waitForTimeout(400);
  const b = join(DIR, `${i + 1}-${info.id}-alinhado.png`);
  await page.screenshot({ path: b });

  feitas.push(`${info.nome.padEnd(13)} mira 0x${info.cor}  → ${a.split(/[\\/]/).pop()} + ${b.split(/[\\/]/).pop()}`);
}

await browser.close();
console.log(feitas.join('\n'));
console.log(`\n10 fotos em ${DIR}`);
