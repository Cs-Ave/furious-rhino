import { Constants } from '../utils/Constants.js';
import { HunterSniper } from '../entities/HunterSniper.js';

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
//   hints         { intro, how } dos toasts de ensino
//   encounters    { get, add } do contador de encontros (o portão injeta os
//                 métodos legados do StorageManager); na falta, cai em
//                 `hintStorageKey` (localStorage cru) e, sem os dois, ensina sempre
//   isBypassed(scene)  true = o gatilho legado já resolveu → standDown()
//   onDefeat(fight)    a festa da vitória
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

    const ax = def.anchorX;

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
      ax, 0, 152, Constants.CRACK_BAND_HALF * 2, 0xffd24a, 0.3
    ).setDepth(-0.5).setVisible(false);
    // ADD: sobre a placa de aço clara, alpha puro quase não aparece
    this.glow.setBlendMode(Phaser.BlendModes.ADD);
    // Moldura dourada pulsante em volta da banda-alvo: o preenchimento
    // sozinho lia suave demais — a MIRA da luta tem de gritar
    this.glowFrame = scene.add.rectangle(
      ax, 0, 164, Constants.CRACK_BAND_HALF * 2 + 12
    ).setDepth(-0.5).setVisible(false);
    this.glowFrame.setFillStyle();
    this.glowFrame.setStrokeStyle(6, 0xffd24a, 1);
    this.glowTween = null;

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

    this.positionGlow();
    this.glow.setVisible(true);
    this.glowFrame.setVisible(true);
    scene.audio.playBossHorn();
    this.hunter.engage();

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
    }
  }

  positionGlow() {
    const bounds = this.layerBounds();
    this.glow.setPosition(this.def.anchorX, bounds.center);
    this.glowFrame.setPosition(this.def.anchorX, bounds.center);
    if (this.glowTween) this.glowTween.stop();
    this.glow.setAlpha(0.45);
    this.glowFrame.setAlpha(1);
    this.glowTween = this.scene.tweens.add({
      targets: [this.glow, this.glowFrame],
      alpha: { from: 0.35, to: 0.9 },
      duration: 380,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
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
    this.hideFightUi();
    this.hunter.defeat();
    this.restoreCamera();
    if (this.def.onDefeat) this.def.onDefeat(this);
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
    this.glowFrame.setVisible(false);
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
