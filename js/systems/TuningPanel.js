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

  // Abaixo do #mute-btn (top:20 right:20); toques no painel não podem
  // vazar para o start screen nem para o input do jogo
  Object.assign(gui.domElement.style, { top: '70px', right: '10px', zIndex: 600 });
  gui.domElement.addEventListener('pointerdown', (ev) => ev.stopPropagation());

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
  dificuldade.add(Constants, 'INITIAL_GAP', 400, 1600, 10);
  dificuldade.add(Constants, 'SPAWN_LOOKAHEAD_PX', 200, 1500, 25);
  dificuldade.add(Constants, 'ANIMAL_EXTRA_LEAD_PX', 0, 800, 25);

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
  furia.add(Constants, 'FURY_FULL_DISTANCE_PX', 2000, 32000, 500);

  const debug = gui.addFolder('Debug');
  const state = { hitboxes: false, pausado: false };
  debug.add(state, 'hitboxes').name('Hitboxes').onChange((on) => setHitboxes(scene, on));

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

  debug.add({ reiniciar: () => location.reload() }, 'reiniciar').name('Reiniciar (?debug=1)');
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
