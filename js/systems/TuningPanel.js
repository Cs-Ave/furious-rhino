import { Constants } from '../utils/Constants.js';
import { SkinSystem, SKINS } from './SkinSystem.js';

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

  // v1.8.7-fix3: com pastas abertas o conteúdo passava da tela e o fim do
  // menu (Debug, exportar, escrita local) ficava inalcançável — o lil-gui
  // rola no `.children` INTERNO (não no root) e esconde a barra. Aqui:
  // altura presa à janela + barra PERMANENTE e visível (pedido do dono).
  gui.domElement.style.maxHeight = 'calc(100vh - 150px)';
  const scroller = gui.domElement.querySelector(':scope > .children');
  Object.assign(scroller.style, {
    maxHeight: 'calc(100vh - 180px)', // janela menos top(140) + título(~28)
    overflowY: 'scroll',
    overscrollBehavior: 'contain', // a roda do mouse não vaza para o jogo
  });
  const scrollCss = document.createElement('style');
  scrollCss.textContent = `
    .lil-gui.root > .children::-webkit-scrollbar { width: 9px; }
    .lil-gui.root > .children::-webkit-scrollbar-track { background: rgba(255,255,255,0.06); }
    .lil-gui.root > .children::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.35); border-radius: 5px; }
    .lil-gui.root > .children { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.35) rgba(255,255,255,0.06); }
  `;
  document.head.appendChild(scrollCss);

  // Foto dos valores iniciais — base do exportador de ajustes.
  // ⚠️ Toda coleção com slider TEM de estar aqui E no exportTuning: o
  // BOSS_RIFLE ganhou sliders na v1.7 e ficou de fora das duas listas, então
  // calibrar a cadência do rifle no ?debug=1 e clicar em "Exportar ajustes"
  // devolvia um arquivo sem ela — o ajuste se perdia no reload, em silêncio.
  // v1.8.4 fecha o furo e já entra com SCORE_WEIGHTS incluído.
  const baseline = JSON.parse(JSON.stringify({
    root: Object.fromEntries(ROOT_KEYS.map((k) => [k, Constants[k]])),
    tiers: Constants.DIFFICULTY_TIERS,
    behavior: Constants.ANIMAL_BEHAVIOR,
    weights: Constants.SCORE_WEIGHTS,
    rifle: Constants.BOSS_RIFLE,
    // v1.8.5: os arsenais dos bosses novos também exportam.
    // v1.8.7: a Muralha assumiu o slot dos 2000m (BOSS_MURALHA); a tabela do
    // Cerco (CERCO_NET) segue declarada mas sem luta ligada — sem slider e
    // sem export até ele reabrir no deserto.
    muralha: Constants.BOSS_MURALHA,
    rifle3: Constants.BOSS3_RIFLE,
    // v1.8.7: pesos por distrito da cidade (só os números exportam)
    districts: Constants.CITY_DISTRICTS,
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
    f.add(t, 'gapRand', 0, 300, 10);
    f.add(t, 'animalSpeedMult', 0.5, 2.5, 0.05);
    f.add(t, 'animalLeadPx', 0, 800, 25);
    // A roleta: fatia do animal = 1 − (wallW+spikeW+towerW+rampW) — baixar
    // pesos = mais bicho; o par soma um segundo animal por cima do sorteio
    f.add(t, 'wallW', 0, 0.6, 0.01);
    f.add(t, 'spikeW', 0, 0.6, 0.01);
    f.add(t, 'towerW', 0, 0.6, 0.01);
    f.add(t, 'rampW', 0, 0.6, 0.01);
    f.add(t, 'comboChance', 0, 1, 0.05);
    f.add(t, 'animalPackChance', 0, 1, 0.05).name('🐾 par de animais');
    f.add(t, 'animalEscortChance', 0, 1, 0.05).name('🐾 escolta (junto de obstáculo)');
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
  // Knockback da investida (lido no momento do atropelo — efeito ao vivo)
  animais.add(Constants, 'ANIMAL_KB_VX_MIN', 0, 1000, 10).name('voo: vx mín');
  animais.add(Constants, 'ANIMAL_KB_VX_MAX', 0, 1200, 10).name('voo: vx máx');
  animais.add(Constants, 'ANIMAL_KB_VY_MIN', -1200, 0, 10).name('voo: vy mín');
  animais.add(Constants, 'ANIMAL_KB_VY_MAX', -1200, 0, 10).name('voo: vy máx');
  animais.close();

  // v1.8: vestir qualquer skin sem desbloqueio, para teste visual (rino,
  // preview da abertura e fúria própria). SÓ nesta sessão — nada persiste:
  // não passa por isEquippable nem grava furious_rhino_skin, então o reload
  // volta à skin realmente equipada do jogador.
  const skinsFolder = gui.addFolder('Skins');
  const skinState = { skin: scene.skin ? scene.skin.id : 'default' };
  skinsFolder.add(skinState, 'skin', SKINS.map((s) => s.id)).name('🎨 vestir (teste)')
    .onChange((id) => {
      const skin = SkinSystem.get(id);
      scene.skin = skin;
      scene.rhino.setSkin(skin);
      if (scene.updateRhinoPreview) scene.updateRhinoPreview(skin);
    });
  // v1.8.1: calibrar a escala VISUAL em campo (hitbox segue 76×54 — a
  // compensação vive em Rhino.applyVisualScale). Não persiste; o valor de
  // release é RHINO_VISUAL_SCALE em Constants.js.
  skinsFolder.add(Constants, 'RHINO_VISUAL_SCALE', 1.0, 1.3, 0.01)
    .name('📏 escala visual')
    .onChange((k) => scene.rhino.applyVisualScale(k));
  skinsFolder.close();

  const furia = gui.addFolder('Fúria');
  furia.add(Constants, 'FURY_FULL_DISTANCE_PX', 2000, 40000, 500);
  furia.add(Constants, 'SPECIAL_DURATION_MS', 1000, 15000, 250).name('especial: duração');
  furia.add(Constants, 'SPECIAL_SPEED_MULT', 1, 2, 0.05).name('especial: boost');
  // Testar o especial sem correr 900m: enche o medidor na hora
  furia.add({
    encher: () => { scene.furySystem.charge = 1; },
  }, 'encher').name('🔥 Encher fúria');

  // Quique e rifle são lidos NO MOMENTO do contato/tiro — efeito ao vivo
  // v1.8.7-fix: os três bosses moram numa pasta-mãe (menu mais enxuto), e
  // cada um tem o próprio "pular para 50m antes" — o teleporte de teste vive
  // junto dos sliders da luta, não mais solto no Debug.
  const bosses = gui.addFolder('Bosses');
  const pularParaBoss = (anchorPx) => {
    const sprite = scene.rhino.getSprite();
    // 50m = 2000px antes da âncora — ANTES do gatilho da arena (1100px),
    // então dá para ver a câmera travar, o horn e o primeiro telegraph.
    // body.reset zera a velocidade; o FurySystem reaplica no frame seguinte.
    sprite.body.reset(anchorPx - 50 * Constants.PIXELS_PER_METER, Constants.GAME_HEIGHT - 200);
  };
  const boss = bosses.addFolder('Portão (1000m)');
  boss.add(Constants, 'BOSS_KNOCKBACK_VX', 100, 1000, 20).name('quique: vx');
  boss.add(Constants, 'BOSS_KNOCKBACK_VY', -800, 0, 20).name('quique: vy');
  boss.add(Constants, 'BOSS_KNOCKBACK_MS', 100, 2000, 50).name('quique: janela ms');
  boss.add(Constants, 'BOSS_SHOT_SPEED', 200, 1000, 20).name('rifle: velocidade');
  // v1.8: lido no momento da ativação — dá para testar o exploit antigo
  boss.add(Constants, 'BOSS_BLOCKS_FURY').name('🔒 bloquear fúria na arena');
  for (const layers of [3, 2, 1]) {
    boss.add(Constants.BOSS_RIFLE[layers], 'intervalMs', 400, 4000, 50)
      .name(`rifle: cadência ${layers} camada${layers > 1 ? 's' : ''}`);
  }
  boss.close();

  // v1.8.5: os bosses novos. As tabelas são as MESMAS referências lidas a
  // cada tiro — sliders ao vivo, como no portão. v1.8.7: o slot dos 2000m é
  // a MURALHA (BOSS_MURALHA); o Cerco realocado não tem luta ligada.
  boss.add({ ir: () => pularParaBoss(Constants.WIN_DISTANCE_PX) }, 'ir')
    .name('⚔️ Pular p/ 50m antes');
  const boss2 = bosses.addFolder('Muralha (2000m)');
  for (const layers of [4, 3, 2, 1]) {
    boss2.add(Constants.BOSS_MURALHA[layers], 'intervalMs', 400, 4000, 50)
      .name(`arsenal: cadência ${layers} camada${layers > 1 ? 's' : ''}`);
  }
  // O enrage foi COPIADO para a def no create (número, não referência):
  // o onChange espelha na luta viva para o slider valer na hora
  boss2.add(Constants, 'MURALHA_ENRAGE_MS', 0, 120000, 1000)
    .name('enrage: ms de luta')
    .onChange((v) => { if (scene.boss2Fight) scene.boss2Fight.def.enrageMs = v; });
  boss2.close();

  // v1.8.7: pesos de spawn por DISTRITO da cidade (override sobre o tier).
  // Chave nova em weights ganha slider sozinha no próximo reload.
  const distritos = gui.addFolder('Distritos da cidade');
  Constants.CITY_DISTRICTS.forEach((d, i) => {
    const keys = Object.keys(d.weights || {}).filter((k) => typeof d.weights[k] === 'number');
    if (!keys.length) return;
    const f = distritos.addFolder(`D${i + 1} ${d.key}`);
    for (const k of keys) f.add(d.weights, k, 0, 1, 0.01).name(`peso: ${k}`);
    f.close();
  });
  distritos.close();

  boss2.add({ ir: () => pularParaBoss(Constants.BOSS2_ANCHOR_PX) }, 'ir')
    .name('⚔️ Pular p/ 50m antes');
  const boss3 = bosses.addFolder('Guardião (fim do mundo)');
  for (const layers of [5, 4, 3, 2, 1]) {
    boss3.add(Constants.BOSS3_RIFLE[layers], 'intervalMs', 400, 4000, 50)
      .name(`rifle: cadência ${layers} camada${layers > 1 ? 's' : ''}`);
  }
  boss3.add({ ir: () => pularParaBoss(Constants.BOSS3_ANCHOR_PX) }, 'ir')
    .name('⚔️ Pular p/ 50m antes');
  boss3.close();
  bosses.close();

  // v1.8.4: pesos da PONTUAÇÃO COMPOSTA. Cada peso é lido NO MOMENTO do
  // evento (ScoreSystem soma o bônus enquanto a corrida acontece), então
  // mover um slider vale na hora — inclusive no meio da corrida em curso:
  // as paredes quebradas ANTES valeram o peso antigo, as de depois valem o
  // novo. Para calibrar de verdade, mexa e comece uma corrida limpa.
  const pontos = gui.addFolder('🏆 Pontuação');
  for (const k of Object.keys(Constants.SCORE_WEIGHTS)) {
    // `legend` é o prêmio de chegar ao fim do mundo (10.000m) e vive numa
    // ordem de grandeza própria; o resto é evento de corrida
    const max = k === 'legend' ? 1000 : 100;
    pontos.add(Constants.SCORE_WEIGHTS, k, 0, max, 1).name(WEIGHT_LABELS[k] || k);
  }
  pontos.close();

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

  // v1.8.7-fix: os teleportes de boss migraram para a pasta Bosses (um
  // "pular p/ 50m antes" dentro de cada luta) — o Debug ficou só com o que é
  // ferramenta genérica.

  // Baixa um .txt SÓ com o que mudou, no formato do Constants.js e com
  // instruções de onde aplicar — colar direto no VS Code
  // v1.8.7-fix2: opt-in de escrita local (o MESMO dos e2e) — permite testar
  // envio/aceite de desafio no localhost. Vale para writes de Firestore em
  // geral (stats/scores/challenges); desligue depois do teste.
  const writeState = { escritaLocal: false };
  try { writeState.escritaLocal = localStorage.getItem('furious_rhino_allow_local_write') === '1'; } catch (e) { /* privado */ }
  debug.add(writeState, 'escritaLocal').name('📡 Escrita local (Firestore)').onChange((on) => {
    try {
      if (on) localStorage.setItem('furious_rhino_allow_local_write', '1');
      else localStorage.removeItem('furious_rhino_allow_local_write');
    } catch (e) { /* privado */ }
  });

  debug.add({ exportar: () => exportTuning(baseline) }, 'exportar').name('💾 Exportar ajustes');

  debug.add({ reiniciar: () => location.reload() }, 'reiniciar').name('Reiniciar (?debug=1)');
}

// Rótulos PT-BR dos pesos de pontuação. Chave desconhecida cai no próprio
// nome — um peso novo em Constants.SCORE_WEIGHTS ganha slider sozinho.
const WEIGHT_LABELS = {
  wall: '🧱 parede quebrada',
  ramp: '🏔️ rampa destruída',
  tower: '🏰 torre derrubada',
  animal: '🦁 animal atropelado',
  bossLayer: '🎯 camada do portão',
  escape: '🗽 fuga pelo portão',
  blitz: '⚡ blitz (portão rápido)',
  legend: '👑 lenda (fim do mundo)',
};

// Constantes de raiz expostas nos sliders (o exportador compara só estas)
const ROOT_KEYS = [
  'RUN_SPEED', 'JUMP_MIN_V', 'JUMP_MAX_V', 'JUMP_CHARGE_MS',
  'FALL_EXTRA_GRAVITY', 'DASH_SPEED', 'DASH_ACTIVE_MS', 'DASH_COOLDOWN_MS',
  'MIN_SAFE_GAP', 'SPAWN_LOOKAHEAD_PX', 'FURY_FULL_DISTANCE_PX',
  'SPECIAL_DURATION_MS', 'SPECIAL_SPEED_MULT',
  'BOSS_KNOCKBACK_VX', 'BOSS_KNOCKBACK_VY', 'BOSS_KNOCKBACK_MS', 'BOSS_SHOT_SPEED',
  'MURALHA_ENRAGE_MS',
  'ANIMAL_KB_VX_MIN', 'ANIMAL_KB_VX_MAX', 'ANIMAL_KB_VY_MIN', 'ANIMAL_KB_VY_MAX',
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
  // v1.8.4: pesos da pontuação composta
  for (const [k, v] of Object.entries(Constants.SCORE_WEIGHTS)) {
    if (typeof v === 'number' && v !== baseline.weights[k]) {
      lines.push(`${pad(`SCORE_WEIGHTS.${k}: ${v},`)}// era ${baseline.weights[k]} — objeto SCORE_WEIGHTS`);
    }
  }
  // Conserto do furo antigo: o rifle do boss tem slider desde a v1.7 e nunca
  // era exportado
  for (const [layers, pattern] of Object.entries(Constants.BOSS_RIFLE)) {
    for (const [k, v] of Object.entries(pattern)) {
      if (typeof v === 'number' && v !== baseline.rifle[layers][k]) {
        lines.push(`${pad(`BOSS_RIFLE[${layers}].${k}: ${v},`)}// era ${baseline.rifle[layers][k]} — objeto BOSS_RIFLE, chave ${layers}`);
      }
    }
  }
  // v1.8.5: os arsenais dos bosses novos, no mesmo padrão do BOSS_RIFLE
  // (v1.8.7: o slot dos 2000m exporta como BOSS_MURALHA)
  for (const [layers, pattern] of Object.entries(Constants.BOSS_MURALHA)) {
    for (const [k, v] of Object.entries(pattern)) {
      if (typeof v === 'number' && v !== baseline.muralha[layers][k]) {
        lines.push(`${pad(`BOSS_MURALHA[${layers}].${k}: ${v},`)}// era ${baseline.muralha[layers][k]} — objeto BOSS_MURALHA, chave ${layers}`);
      }
    }
  }
  // v1.8.7: pesos por distrito (3 níveis — laço próprio; strings ficam fora)
  Constants.CITY_DISTRICTS.forEach((d, i) => {
    for (const [k, v] of Object.entries(d.weights || {})) {
      if (typeof v === 'number' && v !== (baseline.districts[i].weights || {})[k]) {
        lines.push(`${pad(`CITY_DISTRICTS[${i}].weights.${k}: ${v},`)}// era ${baseline.districts[i].weights[k]} — distrito ${d.key}`);
      }
    }
  });
  for (const [layers, pattern] of Object.entries(Constants.BOSS3_RIFLE)) {
    for (const [k, v] of Object.entries(pattern)) {
      if (typeof v === 'number' && v !== baseline.rifle3[layers][k]) {
        lines.push(`${pad(`BOSS3_RIFLE[${layers}].${k}: ${v},`)}// era ${baseline.rifle3[layers][k]} — objeto BOSS3_RIFLE, chave ${layers}`);
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
