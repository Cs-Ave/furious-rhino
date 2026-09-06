import { Constants } from '../utils/Constants.js';
import { StorageManager } from '../utils/StorageManager.js';
import { HunterSniper } from '../entities/HunterSniper.js';

// v1.12.3 — A VOZ DE CADA CHEFE. Feedback de 05/09: "boss fight todos muito
// parecidos, sempre sendo o chefe da muralha". A queixa estava certa e a
// causa era estrutural: os cinco chefes dividiam o MESMO chamado
// (playBossHorn), a MESMA cor de mira (0xffd24a), a MESMA dica ("INVISTA na
// fresta que brilha") e nenhum marco no meio da luta. Eram cinco instâncias
// visualmente idênticas de uma classe paramétrica — e o jogador leu isso.
// A def de cada um agora declara `callSfx`, `glowColor`, `hints.how` própria
// e um `midpoint` cosmético. Zero mecânica muda: cadência, tabelas, camadas,
// hitbox e ordem de quebra ficam exatamente como estavam (o congelamento até
// 26/09 vale, e a Muralha só podia receber cosmético/legibilidade).
//
// Chamado → método do AudioSystem. Método ausente cai na buzina de sempre:
// áudio jamais derruba a luta.
const CALL_SFX = {
  horn: 'playBossHorn',
  siren: 'playBossSiren',
  klaxon: 'playKlaxon',
  gong: 'playBossGong',
  drums: 'playBossDrums',
};

// BOSSFIGHT genérico (v1.7 no portão-fortaleza, parametrizado desde então):
// um alvo BLINDADO plantado numa âncora de x, com um atirador na plataforma
// do topo. O rino quebra N camadas com investidas alinhadas às frestas (ordem
// fixa vinda da definição), quicando para trás a cada contato, sob fogo
// letal. Quebrou tudo → o `onDefeat` da definição faz a festa (no portão,
// GameScene.crossGate(), como sempre).
//
// A decisão estrutural que governa tudo aqui: o alvo NÃO tem corpo físico.
// Um corpo sólido + o FurySystem reescrevendo velocityX todo frame é a
// receita do soft-lock documentado das rampas (Constants.js). O contato é
// uma banda de x em altura total + CLAMP posicional, e o recuo é o
// beginKnockback do Rhino (que abre a janela sem reescrita no FurySystem).
//
// A `def` (objeto de definição, montado no GameScene) diz TUDO que muda de
// um boss para outro — nada de constante do portão hard-coded aqui dentro:
//   id            identificador curto ('gate', 'cerco'...)
//   anchorX       x do mundo onde o alvo mora (era WIN_DISTANCE_PX)
//   layers        ['ground'|'mid'|'high', ...] na ORDEM de quebra
//   rifle         tabela de padrões de tiro por camadas restantes (a MESMA
//                 referência de Constants: os sliders do ?debug=1 seguem vivos)
//   arenaPx       distância antes da âncora em que a luta começa
//   gateFaceHalf  meia-largura do canvas do alvo (banda de contato/clamp)
//   texturePrefix textura vira `${prefix}-${camadasRestantes}` a cada quebra
//   hunterTexture / hunterAimTexture   arte do atirador (parado / mirando)
//   camLockOffsetPx  a câmera trava em anchorX - isto
//   layersProp / bouncesProp  nomes dos contadores da corrida na cena
//   enrageMs      0 = sem enrage; >0 = depois disso a cadência sobe 1 degrau
//   rasanteStyle  (v1.8.7; v1.8.10 vira mapa) chave de RASANTE_TEX no
//                 HunterSniper — 'k9' (Muralha) ou 'falcao' (Mergulho de
//                 Hórus do Faraó); ausente/fora do mapa = dardo padrão
//   hints         { intro, how } dos toasts de ensino
//   encounters    { get, add } do contador de encontros (o portão injeta os
//                 métodos legados do StorageManager); na falta, cai em
//                 `hintStorageKey` (localStorage cru) e, sem os dois, ensina sempre
//   isBypassed(scene)  true = o gatilho legado já resolveu → standDown()
//   onDefeat(fight)    a festa da vitória
//   callSfx       (v1.12.3) chave de CALL_SFX — o chamado de abertura
//   glowColor     (v1.12.3) cor da mira/moldura (default: o dourado do portão)
//   midpoint      (v1.12.3) { left, sfx, toast } — o beat COSMÉTICO que marca
//                 a virada da luta quando restam `left` camadas
export class BossFight {
  constructor(scene, targetSprite, def) {
    this.scene = scene;
    this.gate = targetSprite;
    this.def = def;
    this.state = 'dormant'; // dormant | fight | defeated
    this.layerIdx = 0;      // índice em def.layers da camada ATUAL
    this.contactCdMs = 0;   // cooldown de contato (contador por delta)
    this.fightMs = 0;       // duração da luta (telemetria z)
    this.cameraLocked = false;
    this.hintsOn = false;
    this.bounceHintShown = false;
    this.midpointDone = false;
    this.aimOn = null;      // moldura branca acesa? (null = ainda não pintada)
    this.timerShownS = -1;  // último segundo já escrito no cronômetro
    this.bestMs = 0;        // melhor tempo da vida NESTE chefe (lido em startFight)

    const ax = def.anchorX;
    // A cor da mira é a identidade visual do chefe. O portão fica com o
    // dourado histórico; os outros quatro têm a sua.
    this.glowColor = def.glowColor ?? 0xffd24a;

    // O atirador já está de pé na plataforma quando o alvo entra em cena —
    // parte do cenário na aproximação, boss quando a luta começa.
    // Plataforma no alto do canvas blindado (240x620): pés em y≈96 do mundo;
    // à DIREITA da plataforma para não cobrir os pips de escudo.
    this.hunter = new HunterSniper(
      scene, ax + (def.hunterOffsetX ?? 58), def.hunterY ?? 96, def
    );

    // Glow pulsante na fresta da camada atual: é a MIRA da luta (permanente,
    // não dica). Cobre a largura do vão do alvo na banda da camada.
    this.glow = scene.add.rectangle(
      ax, 0, 152, Constants.CRACK_BAND_HALF * 2, this.glowColor, 0.3
    ).setDepth(-0.5).setVisible(false);
    // ADD: sobre a placa de aço clara, alpha puro quase não aparece
    this.glow.setBlendMode(Phaser.BlendModes.ADD);
    // v1.12.3 — CONTORNO ESCURO sob a moldura. A moldura clara em modo ADD
    // sobre placa de aço clara (Muralha à noite, Faraó no bronze) sumia: o
    // mesmo diagnóstico do rim do elenco urbano na v1.12.2, mesma resposta.
    // Vem ANTES da moldura na ordem de criação = fica atrás dentro do depth.
    this.glowOutline = scene.add.rectangle(
      ax, 0, 164, Constants.CRACK_BAND_HALF * 2 + 12
    ).setDepth(-0.5).setVisible(false);
    this.glowOutline.setFillStyle();
    this.glowOutline.setStrokeStyle(12, 0x12151c, 0.85);
    // Moldura pulsante em volta da banda-alvo: o preenchimento sozinho lia
    // suave demais — a MIRA da luta tem de gritar
    this.glowFrame = scene.add.rectangle(
      ax, 0, 164, Constants.CRACK_BAND_HALF * 2 + 12
    ).setDepth(-0.5).setVisible(false);
    this.glowFrame.setFillStyle();
    this.glowFrame.setStrokeStyle(6, this.glowColor, 1);
    this.glowTween = null;

    // Cronômetro de mundo da luta (v1.12.3): a mesma luta repetida vira uma
    // marca pessoal a bater. Fica ACIMA dos pips, no mundo — nada de HUD de
    // tela novo, que teria de caber nos 7 viewports da Régua.
    this.timerText = scene.add.text(ax, 66, '', {
      fontSize: '22px', fontFamily: 'monospace', color: '#e6eef7',
      stroke: '#12151c', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(-0.5).setVisible(false);

    // Um escudo por camada sobre o alvo = camadas restantes (HUD de mundo,
    // não de tela). Apagam da esquerda para a direita, na ordem de quebra —
    // o ÚLTIMO fica em dx=0 (para 3 camadas: -84, -42, 0, como sempre foi).
    const n = def.layers.length;
    this.pips = def.layers.map((_, i) =>
      scene.add.text(ax - (n - 1 - i) * 42, 34, '🛡️', { fontSize: '30px' })
        .setOrigin(0.5).setDepth(-0.5)
    );
  }

  layersLeft() {
    return this.def.layers.length - this.layerIdx;
  }

  // Banda de acerto da camada atual — a MESMA conta do CrackedWall
  // .getCrackBounds (fração de 720, topo do mundo em y=0)
  layerBounds() {
    const name = this.def.layers[this.layerIdx];
    const center = Constants.CRACK_HEIGHTS[name.toUpperCase()] * 720;
    return {
      top: center - Constants.CRACK_BAND_HALF,
      bottom: center + Constants.CRACK_BAND_HALF,
      center,
    };
  }

  // Contador de encontros da vida: o portão usa o par legado do
  // StorageManager (injetado em def.encounters); um boss novo pode só
  // declarar uma chave própria de localStorage. Sem nenhum dos dois, ensina
  // sempre — telemetria/dica jamais derruba o jogo (try/catch no acesso).
  getEncounters() {
    const enc = this.def.encounters;
    if (enc && enc.get) return enc.get();
    const key = this.def.hintStorageKey;
    if (!key) return 0;
    try {
      return parseInt(localStorage.getItem(key), 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  addEncounter() {
    const enc = this.def.encounters;
    if (enc && enc.add) { enc.add(); return; }
    const key = this.def.hintStorageKey;
    if (!key) return;
    try {
      localStorage.setItem(key, String(this.getEncounters() + 1));
    } catch (e) { /* modo privado: sem contador, sem drama */ }
  }

  update(time, delta) {
    if (this.state === 'defeated') return;
    const scene = this.scene;
    const def = this.def;
    const sprite = scene.rhino.getSprite();

    // Bypass: o gatilho legado do GameScene disparou o crossGate sem luta
    // (modo invencível de debug ou teleporte além do alvo). O boss recolhe.
    if (def.isBypassed && def.isBypassed(scene)) {
      this.standDown();
      return;
    }

    if (this.state === 'dormant') {
      if (sprite.x < def.anchorX - def.arenaPx) return;
      this.startFight();
    }

    this.fightMs += delta;
    if (this.contactCdMs > 0) this.contactCdMs -= delta;
    this.hunter.updateFight(time, delta, this.layersLeft(), this.fightMs);
    // Leitura pura (não mexe em nada): a moldura responde à altura do rino e
    // o cronômetro corre. Antes da guarda de invencível de propósito — em
    // debug a moldura também tem de ser conferível.
    this.updateAim(sprite);
    this.updateTimer();

    // Debug invencível: atravessa sem clamp — o gatilho legado assume
    if (scene.invincible) return;

    const rb = sprite.body;
    const faceX = def.anchorX - def.gateFaceHalf;
    if (rb.right < faceX) return;

    // Anti-tunneling primeiro: CLAMP de POSIÇÃO (nunca de velocidade — é a
    // velocidade zerada + reescrita que trava; posição clampada não).
    // A banda ignora y de propósito: o alvo blindado é full-height e o
    // teto do mundo já colide — não existe "por cima".
    rb.x = Math.min(rb.x, faceX - rb.width);

    if (this.contactCdMs > 0) return; // contato repetido pós-quique
    this.contactCdMs = Constants.BOSS_LAYER_COOLDOWN_MS;

    const bounds = this.layerBounds();
    const rhinoTop = rb.y;
    const aligned = rb.bottom > bounds.top && rhinoTop < bounds.bottom;
    const rampage = scene.furySystem.rampage;
    const smash = scene.rhino.dashState === 'active' || rampage;

    // v1.8: rampage dispensa o DASH (smash), mas não mais o alinhamento —
    // era o exploit que anulava a luta (120 camadas × 6 quiques × 8 mortes)
    if (smash && aligned) {
      this.breakLayer();
    } else {
      // Errou (sem dash, ou dash fora da fresta): quique cheio + clang.
      // A morte não mora aqui — mora no rifle. O custo é tempo sob fogo.
      this.bounce(1);
      if (def.bouncesProp) scene[def.bouncesProp]++;
      scene.audio.playClang();
      const fx = scene.add.image(rb.right, rb.center.y, 'explosion-flash')
        .setScale(0.3).setTint(0xffe9a8).setDepth(6);
      scene.tweens.add({
        targets: fx, scale: 0.9, alpha: 0, duration: 180,
        onComplete: () => fx.destroy(),
      });
      if (this.hintsOn && !this.bounceHintShown) {
        this.bounceHintShown = true;
        scene.showToast('↩️ Recue e invista na fresta!', { y: 250, size: 30, duration: 1800 });
      }
    }
  }

  // v1.12.3 — A MOLDURA BRANCA. A luta era cega: o jogador só descobria que
  // estava na altura errada DEPOIS de investir e quicar (450ms de cooldown +
  // knockback, sob fogo). Agora a moldura fica BRANCA enquanto o corpo do
  // rino cruza a banda da fresta — a resposta chega antes da investida, não
  // depois. É a MESMA conta de `aligned` do contato, só que lida para
  // desenhar: nenhuma tolerância nova, nenhuma folga de hitbox, nada de
  // mecânica. E é o que faz a ORDEM DE CAMADAS de cada chefe (chão→alto no
  // portão, alto→chão→meio na Muralha, os cinco degraus do Faraó) virar algo
  // que o jogador percebe — a raiz do "todos muito parecidos".
  updateAim(sprite) {
    if (this.state !== 'fight') return;
    const rb = sprite.body;
    if (!rb) return;
    const b = this.layerBounds();
    const on = rb.bottom > b.top && rb.y < b.bottom;
    if (on === this.aimOn) return; // só pinta na TROCA — nada por frame
    this.aimOn = on;
    this.glowFrame.setStrokeStyle(on ? 8 : 6, on ? 0xffffff : this.glowColor, 1);
    this.glow.setFillStyle(on ? 0xffffff : this.glowColor, 0.3);
  }

  // Cronômetro da luta, em segundos inteiros (o texto só é reescrito quando o
  // segundo vira — setText por frame recria a textura do canvas).
  updateTimer() {
    if (this.state !== 'fight') return;
    const s = Math.floor(this.fightMs / 1000);
    if (s === this.timerShownS) return;
    this.timerShownS = s;
    this.timerText.setText(this.bestMs > 0 ? `${s}s · melhor ${Math.round(this.bestMs / 1000)}s` : `${s}s`);
  }

  startFight() {
    this.state = 'fight';
    const scene = this.scene;
    const def = this.def;

    // Câmera TRAVADA na arena: o alvo encosta na borda direita e o
    // atirador fica sempre visível. Com follow, o vai-e-vem do quique faria
    // a câmera "respirar" atrás do rino. Bônus estrutural: com a câmera
    // parada, o lookahead do spawn não alcança a âncora +1000 — zero spawns
    // durante a luta, sem código novo.
    // Alvo âncora-1040: o alvo fica na borda direita SEM entrar embaixo dos
    // ícones do HUD (fúria/dash/pausa vivem em x>=1100 da tela) — o atirador
    // na plataforma precisa ficar visível o tempo todo
    const cam = scene.cameras.main;
    cam.stopFollow();
    this.cameraLocked = true;
    scene.tweens.add({
      targets: cam,
      scrollX: def.anchorX - def.camLockOffsetPx,
      duration: 600,
      ease: 'Sine.easeOut',
    });

    // INEGOCIÁVEL da v1.8.7: silenciar quem JÁ NASCEU no corredor da arena.
    // inNoSpawnZone só bloqueia spawn NOVO — uma camionete nascida aos
    // 1960 m atiraria durante a intro por cima dos telegraphs do boss.
    // muzzleHostiles (SpawnManager) desativa torres e animais atiradores no
    // intervalo; vale para os TRÊS bosses — seguro e correto em todos.
    // O retorno fica guardado só para debug (quantos foram calados).
    this.muzzledCount = scene.spawnManager.muzzleHostiles(
      def.anchorX - 1500, def.anchorX + 500
    );

    this.positionGlow();
    this.glow.setVisible(true);
    this.glowOutline.setVisible(true);
    this.glowFrame.setVisible(true);

    // O CHAMADO. Método ausente (áudio antigo em cache do PWA, mock de teste)
    // cai na buzina — e se nem ela existir, silêncio: som não derruba luta.
    const audio = scene.audio;
    const call = CALL_SFX[def.callSfx] || 'playBossHorn';
    if (typeof audio[call] === 'function') audio[call]();
    else if (typeof audio.playBossHorn === 'function') audio.playBossHorn();

    this.hunter.engage();

    this.bestMs = StorageManager.getBossBest(def.id);
    this.timerText.setVisible(true);
    this.timerShownS = -1;

    const seen = this.getEncounters();
    this.addEncounter();
    this.hintsOn = seen < Constants.BOSS_HINT_MAX_ENCOUNTERS;
    if (this.hintsOn) {
      scene.showToast(def.hints.intro, { y: 200, size: 34, duration: 2000 });
      scene.time.delayedCall(1100, () => {
        if (!scene.gameOver && this.state === 'fight') {
          scene.showToast(def.hints.how, { y: 260, size: 28, duration: 2000, color: '#ffe9a8' });
        }
      });
    } else if (seen >= 2) {
      // O VETERANO também merece uma frase. Passados os dois encontros de
      // ensino, o chefe virava silêncio — e silêncio é exatamente o que faz
      // cinco lutas parecerem uma só. A placa diz de quem é a luta, quantas
      // vezes já foi e qual é a marca a bater.
      const marca = this.bestMs > 0 ? ` · melhor ${Math.round(this.bestMs / 1000)} s` : '';
      scene.showToast(`${def.emoji || '⚔️'} ${def.nome || def.id} — ${seen + 1}ª vez${marca}`,
        { y: 200, size: 26, duration: 1800, color: '#cfd8e6' });
    }
  }

  positionGlow() {
    const bounds = this.layerBounds();
    this.glow.setPosition(this.def.anchorX, bounds.center);
    this.glowOutline.setPosition(this.def.anchorX, bounds.center);
    this.glowFrame.setPosition(this.def.anchorX, bounds.center);
    // A fresta mudou de altura: a moldura branca tem de reavaliar do zero
    this.aimOn = null;
    if (this.glowTween) this.glowTween.stop();
    this.glow.setAlpha(0.45);
    this.glowFrame.setAlpha(1);
    this.glowOutline.setAlpha(0.9);
    this.glowTween = this.scene.tweens.add({
      targets: [this.glow, this.glowFrame],
      alpha: { from: 0.35, to: 0.9 },
      duration: 380,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // v1.12.3 — O BEAT DA VIRADA. Cosmético, uma vez por luta, quando restam
  // `def.midpoint.left` camadas: o chamado do chefe volta, a moldura dá um
  // pulso de 1,2× e um farol pisca no deck. Antes disso a luta era uma reta
  // sem marco — quebrar a 2ª de 4 camadas era igual a quebrar a 1ª.
  fireMidpoint() {
    const def = this.def;
    const mid = def.midpoint;
    if (!mid || this.midpointDone || this.layersLeft() !== mid.left) return;
    this.midpointDone = true;
    const scene = this.scene;

    const audio = scene.audio;
    const call = CALL_SFX[mid.sfx] || CALL_SFX[def.callSfx] || 'playBossHorn';
    if (typeof audio[call] === 'function') audio[call]();

    // Pulso da moldura: escala, não cor — a cor está reservada para a leitura
    // de altura (branco = alinhado) e não pode ser gasta em festa.
    scene.tweens.add({
      targets: [this.glowFrame, this.glowOutline],
      scaleX: 1.2, scaleY: 1.2,
      duration: 220, yoyo: true, repeat: 2, ease: 'Sine.easeInOut',
    });

    // Farol no deck do atirador: elipse vermelha estroboscópica, ADD, some
    // sozinha. Objeto próprio e efêmero — nada de tint em sprite de gameplay.
    const beacon = scene.add.ellipse(
      def.anchorX + (def.hunterOffsetX ?? 58), (def.hunterY ?? 96) - 78, 54, 20, 0xff4a5e, 0.9
    ).setDepth(-0.45).setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({
      targets: beacon,
      alpha: { from: 0.9, to: 0.1 },
      duration: 180, yoyo: true, repeat: 7, ease: 'Sine.easeInOut',
      onComplete: () => beacon.destroy(),
    });

    if (mid.toast) {
      scene.showToast(mid.toast, { y: 250, size: 30, duration: 1600, color: '#ffd0d6' });
    }
  }

  breakLayer() {
    const scene = this.scene;
    const def = this.def;
    if (def.layersProp) scene[def.layersProp]++;
    const bounds = this.layerBounds();
    const gx = def.anchorX;
    // v1.8.4: cada camada vale pontos (o "+N" nasce na camada)
    scene.addScore('bossLayer', gx - 80, bounds.center);
    scene.audio.playBreak();
    scene.createExplosion(gx - 80, bounds.center);
    scene.createBreakParticles(gx - 80, bounds.center);
    // Peso na quebra: curto e fraco de propósito (120ms/0,006) — o suficiente
    // para o acerto ter corpo sem embaralhar a leitura da próxima fresta.
    scene.cameras.main.shake(120, 0.006);

    // Pip da camada que caiu apaga
    const pip = this.pips[this.layerIdx];
    if (pip) pip.setAlpha(0.25);

    this.layerIdx++;
    if (this.layerIdx >= def.layers.length) {
      this.defeat();
      return;
    }
    this.gate.setTexture(`${def.texturePrefix}-${this.layersLeft()}`);
    scene.audio.playSectorPass();
    this.positionGlow();
    this.fireMidpoint();
    // Quique REDUZIDO no acerto: o recuo é o ritmo da luta, não o castigo
    this.bounce(0.6);
    if (this.hintsOn) {
      scene.showToast(`💥 ${this.layersLeft()} camada${this.layersLeft() > 1 ? 's' : ''}!`, { y: 250, size: 30, duration: 1200 });
    }
  }

  bounce(factor) {
    this.scene.rhino.beginKnockback(
      -Constants.BOSS_KNOCKBACK_VX * factor,
      Constants.BOSS_KNOCKBACK_VY * factor,
      Constants.BOSS_KNOCKBACK_MS
    );
  }

  // Última camada caiu: o atirador tomba do alvo e a festa da definição roda.
  // No portão o onDefeat é o crossGate, que seta gateReached — o gatilho
  // legado do update não redispara.
  defeat() {
    this.state = 'defeated';
    const scene = this.scene;
    const def = this.def;

    // Marca pessoal por chefe (local, sem rede): é o que transforma a mesma
    // luta repetida em algo com que valha a pena voltar a se medir. Só grava
    // quando MELHORA — e nunca em debug, que teleporta e invencibiliza.
    const ms = Math.round(this.fightMs);
    if (ms > 0 && !scene.registry.get('debug')
      && (this.bestMs <= 0 || ms < this.bestMs)) {
      const anterior = this.bestMs;
      StorageManager.setBossBest(def.id, ms);
      if (anterior > 0) {
        scene.showToast(`⏱️ NOVA MARCA — ${Math.round(ms / 1000)} s`,
          { y: 300, size: 28, duration: 1600, color: '#9be89b' });
      }
    }
    // "Sem um arranhão": venceu o portão sem quicar uma vez. Lido pelo
    // MedalSystem no fim da corrida (o bouncesProp já era contado).
    if (def.bouncesProp && scene[def.bouncesProp] === 0) scene[`${def.id}Clean`] = true;

    this.hideFightUi();
    this.hunter.defeat();
    this.restoreCamera();
    if (def.onDefeat) def.onDefeat(this);
  }

  // Bypass de debug/teleporte: recolhe a luta sem festa própria
  standDown() {
    this.state = 'defeated';
    this.hideFightUi();
    this.hunter.standDown();
    this.restoreCamera();
  }

  hideFightUi() {
    if (this.glowTween) this.glowTween.stop();
    this.glow.setVisible(false);
    this.glowOutline.setVisible(false);
    this.glowFrame.setVisible(false);
    this.timerText.setVisible(false);
    this.pips.forEach((p) => p.setAlpha(0.25));
  }

  restoreCamera() {
    if (!this.cameraLocked) return;
    this.cameraLocked = false;
    const scene = this.scene;
    scene.tweens.killTweensOf(scene.cameras.main);
    // Mesmos parâmetros do create(): lerp 0.1 recola a câmera suave
    scene.cameras.main.startFollow(scene.rhino.getSprite(), true, 0.1, 0, -200);
  }
}
