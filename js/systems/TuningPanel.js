import { Constants } from '../utils/Constants.js';

// Painel de ajuste ao vivo (lil-gui via CDN), ativo só com ?debug=1.
// Constants é um objeto mutável lido por frame nos pontos expostos aqui,
// então mover um slider muda a física imediatamente. Valores lidos uma
// única vez no boot (GRAVITY, WIN_DISTANCE_PX, pools, trincas) ficam fora.
export async function initTuningPanel(scene) {
  let mod;
  try {
    mod = await import('https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm');
  } catch (e) {
    return; // offline: sem painel, jogo segue normal
  }
  const GUI = mod.GUI ?? mod.default;
  const gui = new GUI({ title: 'Tuning' });

  // À ESQUERDA (pedido do usuário), abaixo do HUD (#ui em top:20 left:20,
  // ~110px de altura com a barra de progresso); toques no painel não podem
  // vazar para o start screen nem para o input do jogo
  Object.assign(gui.domElement.style, { top: '140px', left: '10px', right: 'auto', zIndex: 600 });
  gui.domElement.addEventListener('pointerdown', (ev) => ev.stopPropagation());

  // Foto dos valores iniciais — base do exportador de ajustes
  const baseline = JSON.parse(JSON.stringify({
    root: Object.fromEntries(ROOT_KEYS.map((k) => [k, Constants[k]])),
    tiers: Constants.DIFFICULTY_TIERS,
    behavior: Constants.ANIMAL_BEHAVIOR,
  }));

  const fisica = gui.addFolder('Física do Rino');
  fisica.add(Constants, 'RUN_SPEED', 100, 600, 10);
  fisica.add(Constants, 'JUMP_MIN_V', -1200, -300, 10);
  fisica.add(Constants, 'JUMP_MAX_V', -1400, -500, 10);
  fisica.add(Constants, 'JUMP_CHARGE_MS', 200, 4000, 50);
  fisica.add(Constants, 'FALL_EXTRA_GRAVITY', 0, 2000, 50);
  fisica.add(Constants, 'DASH_SPEED', 300, 1500, 25);
  fisica.add(Constants, 'DASH_ACTIVE_MS', 50, 600, 10);
  fisica.add(Constants, 'DASH_COOLDOWN_MS', 100, 3000, 50);

  const dificuldade = gui.addFolder('Dificuldade');
  dificuldade.add(Constants, 'MIN_SAFE_GAP', 300, 1200, 10);
  dificuldade.add(Constants, 'SPAWN_LOOKAHEAD_PX', 200, 1500, 25);

  // Cada tier é um objeto mutável lido a cada spawn/frame — efeito ao vivo
  const tiers = gui.addFolder('Tiers');
  Constants.DIFFICULTY_TIERS.forEach((t, i) => {
    const f = tiers.addFolder(`Tier ${i + 1} (${i * 200}-${(i + 1) * 200}m)`);
    f.add(t, 'gapMin', 300, 1200, 10);
    f.add(t, 'animalSpeedMult', 0.5, 2.5, 0.05);
    f.add(t, 'animalLeadPx', 0, 800, 25);
    f.add(t, 'comboChance', 0, 1, 0.05);
    f.add(t, 'towerIntervalMs', 400, 4000, 100);
    f.add(t, 'dartSpeed', 200, 1000, 20);
    f.close();
  });
  tiers.close();

  // Velocidades/pulos são lidos por frame em Animal.preUpdate — os sliders
  // valem na hora até para animais já em tela
  const animais = gui.addFolder('Animais');
  for (const t of Constants.ANIMAL_TYPES) {
    animais.add(Constants.ANIMAL_BEHAVIOR[t], 'speed', 0, 400, 5).name(`${t} vel`);
  }
  animais.add(Constants.ANIMAL_BEHAVIOR.monkey, 'jumpV', -900, -200, 10).name('macaco pulo');
  animais.add(Constants.ANIMAL_BEHAVIOR.monkey, 'jumpIntervalMs', 0, 2000, 50).name('macaco intervalo');
  animais.add(Constants.ANIMAL_BEHAVIOR.zebra, 'jumpV', -1100, -400, 10).name('zebra pulo');
  animais.add(Constants.ANIMAL_BEHAVIOR.zebra, 'jumpIntervalMs', 0, 2000, 50).name('zebra intervalo');
  animais.close();

  const furia = gui.addFolder('Fúria');
  furia.add(Constants, 'FURY_FULL_DISTANCE_PX', 2000, 40000, 500);

  const debug = gui.addFolder('Debug');
  const state = { hitboxes: false, pausado: false, invencivel: false };
  debug.add(state, 'hitboxes').name('Hitboxes').onChange((on) => setHitboxes(scene, on));

  // Testar mecânica sem morrer: mortes ignoradas; queda teleporta de volta
  debug.add(state, 'invencivel').name('🛡️ Invencível').onChange((on) => {
    scene.invincible = on;
  });

  // scene.pause() congela update/física/animações/tweens da cena, mas o
  // render continua — a tela fica visível, e o painel (DOM) segue clicável
  const pauseCtrl = debug.add(state, 'pausado').name('Pausar').onChange((on) => {
    if (on) scene.scene.pause();
    else scene.scene.resume();
  });

  debug.add({
    passo: () => {
      if (!state.pausado) {
        // primeiro clique fora da pausa: entra no modo pausado
        state.pausado = true;
        pauseCtrl.updateDisplay();
        scene.scene.pause();
        return;
      }
      // religa a cena por exatamente 1 tick e pausa de novo após o update
      scene.scene.resume();
      scene.events.once('postupdate', () => scene.scene.pause());
    },
  }, 'passo').name('Avançar 1 frame');

  // Teleporte para testar o tier 4 sem jogar 60s. body.reset zera a
  // velocidade — o FurySystem reaplica a horizontal no frame seguinte
  debug.add({
    pular: () => {
      const sprite = scene.rhino.getSprite();
      sprite.body.reset(24000, Constants.GAME_HEIGHT - 200);
    },
  }, 'pular').name('Pular p/ 600m');

  debug.add({
    pular790: () => {
      const sprite = scene.rhino.getSprite();
      sprite.body.reset(Constants.WIN_DISTANCE_PX - 400, Constants.GAME_HEIGHT - 200);
    },
  }, 'pular790').name('Pular p/ 990m (portão)');

  // Baixa um .txt SÓ com o que mudou, no formato do Constants.js e com
  // instruções de onde aplicar — colar direto no VS Code
  debug.add({ exportar: () => exportTuning(baseline) }, 'exportar').name('💾 Exportar ajustes');

  debug.add({ reiniciar: () => location.reload() }, 'reiniciar').name('Reiniciar (?debug=1)');
}

// Constantes de raiz expostas nos sliders (o exportador compara só estas)
const ROOT_KEYS = [
  'RUN_SPEED', 'JUMP_MIN_V', 'JUMP_MAX_V', 'JUMP_CHARGE_MS',
  'FALL_EXTRA_GRAVITY', 'DASH_SPEED', 'DASH_ACTIVE_MS', 'DASH_COOLDOWN_MS',
  'MIN_SAFE_GAP', 'SPAWN_LOOKAHEAD_PX', 'FURY_FULL_DISTANCE_PX',
];

function exportTuning(baseline) {
  const lines = [];
  const pad = (s) => s.padEnd(44);

  for (const k of Object.keys(baseline.root)) {
    if (Constants[k] !== baseline.root[k]) {
      lines.push(`${pad(`${k}: ${Constants[k]},`)}// era ${baseline.root[k]} — raiz do objeto Constants`);
    }
  }
  Constants.DIFFICULTY_TIERS.forEach((tier, i) => {
    for (const [k, v] of Object.entries(tier)) {
      if (typeof v === 'number' && v !== baseline.tiers[i][k]) {
        lines.push(`${pad(`DIFFICULTY_TIERS[${i}].${k}: ${v},`)}// era ${baseline.tiers[i][k]} — tier ${i + 1} do array DIFFICULTY_TIERS`);
      }
    }
  });
  for (const [species, behavior] of Object.entries(Constants.ANIMAL_BEHAVIOR)) {
    for (const [k, v] of Object.entries(behavior)) {
      if (typeof v === 'number' && v !== baseline.behavior[species][k]) {
        lines.push(`${pad(`ANIMAL_BEHAVIOR.${species}.${k}: ${v},`)}// era ${baseline.behavior[species][k]} — objeto ANIMAL_BEHAVIOR`);
      }
    }
  }

  const texto = [
    `// FURIOUS RHINO — ajustes do TuningPanel (${new Date().toLocaleString('pt-BR')})`,
    '// Como aplicar: abra js/utils/Constants.js no VS Code e substitua o valor',
    '// de cada parâmetro abaixo no lugar indicado no comentário da linha.',
    '',
    ...(lines.length ? lines : ['// Nenhum parâmetro foi alterado nesta sessão.']),
    '',
  ].join('\n');

  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([texto], { type: 'text/plain' }));
  a.download = 'furious-rhino-tuning.txt';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function setHitboxes(scene, on) {
  const world = scene.physics.world;
  world.drawDebug = on;
  if (on && !world.debugGraphic) world.createDebugGraphic();
  if (world.debugGraphic) {
    world.debugGraphic.clear();
    world.debugGraphic.setVisible(on);
  }
  // Bodies criados com debug:false na config nascem com debugShowBody=false —
  // é preciso retrofitar tanto os defaults quanto os bodies já existentes
  world.defaults.debugShowBody = on;
  world.defaults.debugShowStaticBody = on;
  world.defaults.debugShowVelocity = on;
  world.bodies.iterate((b) => { b.debugShowBody = on; b.debugShowVelocity = on; });
  world.staticBodies.iterate((b) => { b.debugShowBody = on; });
}
