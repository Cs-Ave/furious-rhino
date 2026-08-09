import { Constants } from '../utils/Constants.js';
import { StorageManager } from '../utils/StorageManager.js';
import { HunterSniper } from '../entities/HunterSniper.js';

// BOSSFIGHT do portão-fortaleza (v1.7): aos 1000m o portão está BLINDADO,
// com um caçador de rifle na plataforma do topo. O rino quebra 3 camadas com
// investidas alinhadas às frestas (ordem fixa chão → meio → alto), quicando
// para trás a cada contato, sob fogo letal do rifle. Quebrou tudo →
// GameScene.crossGate() faz a festa de sempre.
//
// A decisão estrutural que governa tudo aqui: o portão NÃO tem corpo físico.
// Um corpo sólido + o FurySystem reescrevendo velocityX todo frame é a
// receita do soft-lock documentado das rampas (Constants.js). O contato é
// uma banda de x em altura total + CLAMP posicional, e o recuo é o
// beginKnockback do Rhino (que abre a janela sem reescrita no FurySystem).
export class BossFight {
  constructor(scene, gateSprite) {
    this.scene = scene;
    this.gate = gateSprite;
    this.state = 'dormant'; // dormant | fight | defeated
    this.layerIdx = 0;      // índice em BOSS_LAYERS da camada ATUAL
    this.contactCdMs = 0;   // cooldown de contato (contador por delta)
    this.fightMs = 0;       // duração da luta (telemetria z)
    this.cameraLocked = false;
    this.hintsOn = false;
    this.bounceHintShown = false;

    // O caçador já está de pé na plataforma quando o portão entra em cena —
    // parte do cenário na aproximação, boss quando a luta começa.
    // Plataforma no alto do canvas blindado (240x620): pés em y≈96 do mundo;
    // à DIREITA da plataforma para não cobrir os 3 pips de escudo.
    this.hunter = new HunterSniper(scene, Constants.WIN_DISTANCE_PX + 58, 96);

    // Glow pulsante na fresta da camada atual: é a MIRA da luta (permanente,
    // não dica). Cobre a largura do vão do portão na banda da camada.
    this.glow = scene.add.rectangle(
      Constants.WIN_DISTANCE_PX, 0, 152, Constants.CRACK_BAND_HALF * 2,
      0xffd24a, 0.3
    ).setDepth(-0.5).setVisible(false);
    // ADD: sobre a placa de aço clara, alpha puro quase não aparece
    this.glow.setBlendMode(Phaser.BlendModes.ADD);
    this.glowTween = null;

    // 3 escudos sobre o portão = camadas restantes (HUD de mundo, não de
    // tela). Apagam da esquerda para a direita, na ordem de quebra.
    this.pips = [-84, -42, 0].map((dx) =>
      scene.add.text(Constants.WIN_DISTANCE_PX + dx, 34, '🛡️', { fontSize: '30px' })
        .setOrigin(0.5).setDepth(-0.5)
    );
  }

  layersLeft() {
    return Constants.BOSS_LAYERS.length - this.layerIdx;
  }

  // Banda de acerto da camada atual — a MESMA conta do CrackedWall
  // .getCrackBounds (fração de 720, topo do mundo em y=0)
  layerBounds() {
    const name = Constants.BOSS_LAYERS[this.layerIdx];
    const center = Constants.CRACK_HEIGHTS[name.toUpperCase()] * 720;
    return {
      top: center - Constants.CRACK_BAND_HALF,
      bottom: center + Constants.CRACK_BAND_HALF,
      center,
    };
  }

  update(time, delta) {
    if (this.state === 'defeated') return;
    const scene = this.scene;
    const sprite = scene.rhino.getSprite();

    // Bypass: o gatilho legado do GameScene disparou o crossGate sem luta
    // (modo invencível de debug ou teleporte além do portão). O boss recolhe.
    if (scene.gateReached) {
      this.standDown();
      return;
    }

    if (this.state === 'dormant') {
      if (sprite.x < Constants.WIN_DISTANCE_PX - Constants.BOSS_ARENA_PX) return;
      this.startFight();
    }

    this.fightMs += delta;
    if (this.contactCdMs > 0) this.contactCdMs -= delta;
    this.hunter.updateFight(time, delta, this.layersLeft());

    // Debug invencível: atravessa sem clamp — o gatilho legado assume
    if (scene.invincible) return;

    const rb = sprite.body;
    const faceX = Constants.WIN_DISTANCE_PX - Constants.BOSS_GATE_FACE_HALF;
    if (rb.right < faceX) return;

    // Anti-tunneling primeiro: CLAMP de POSIÇÃO (nunca de velocidade — é a
    // velocidade zerada + reescrita que trava; posição clampada não).
    // A banda ignora y de propósito: o portão blindado é full-height e o
    // teto do mundo já colide — não existe "por cima".
    rb.x = Math.min(rb.x, faceX - rb.width);

    if (this.contactCdMs > 0) return; // contato repetido pós-quique
    this.contactCdMs = Constants.BOSS_LAYER_COOLDOWN_MS;

    const bounds = this.layerBounds();
    const rhinoTop = rb.y;
    const aligned = rb.bottom > bounds.top && rhinoTop < bounds.bottom;
    const rampage = scene.furySystem.rampage;
    const smash = scene.rhino.dashState === 'active' || rampage;

    if (smash && (aligned || rampage)) {
      this.breakLayer();
    } else {
      // Errou (sem dash, ou dash fora da fresta): quique cheio + clang.
      // A morte não mora aqui — mora no rifle. O custo é tempo sob fogo.
      this.bounce(1);
      scene.runBossBounces++;
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

    // Câmera TRAVADA na arena: o portão encosta na borda direita e o
    // caçador fica sempre visível. Com follow, o vai-e-vem do quique faria
    // a câmera "respirar" atrás do rino. Bônus estrutural: com a câmera
    // parada, o lookahead do spawn não alcança WIN+1000 — zero spawns
    // durante a luta, sem código novo.
    // Alvo WIN-1040: o portão fica na borda direita SEM entrar embaixo dos
    // ícones do HUD (fúria/dash/pausa vivem em x>=1100 da tela) — o caçador
    // na plataforma precisa ficar visível o tempo todo
    const cam = scene.cameras.main;
    cam.stopFollow();
    this.cameraLocked = true;
    scene.tweens.add({
      targets: cam,
      scrollX: Constants.WIN_DISTANCE_PX - 1040,
      duration: 600,
      ease: 'Sine.easeOut',
    });

    this.positionGlow();
    this.glow.setVisible(true);
    scene.audio.playBossHorn();
    this.hunter.engage();

    const seen = StorageManager.getBossEncounters();
    StorageManager.addBossEncounter();
    this.hintsOn = seen < Constants.BOSS_HINT_MAX_ENCOUNTERS;
    if (this.hintsOn) {
      scene.showToast('⚔️ O PORTÃO ESTÁ BLINDADO!', { y: 200, size: 34, duration: 2000 });
      scene.time.delayedCall(1100, () => {
        if (!scene.gameOver && this.state === 'fight') {
          scene.showToast('💥 INVISTA na fresta que brilha!', { y: 260, size: 28, duration: 2000, color: '#ffe9a8' });
        }
      });
    }
  }

  positionGlow() {
    const bounds = this.layerBounds();
    this.glow.setPosition(Constants.WIN_DISTANCE_PX, bounds.center);
    if (this.glowTween) this.glowTween.stop();
    this.glow.setAlpha(0.3);
    this.glowTween = this.scene.tweens.add({
      targets: this.glow,
      alpha: { from: 0.18, to: 0.55 },
      duration: 450,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  breakLayer() {
    const scene = this.scene;
    scene.runBossLayers++;
    const bounds = this.layerBounds();
    const gx = Constants.WIN_DISTANCE_PX;
    scene.audio.playBreak();
    scene.createExplosion(gx - 80, bounds.center);
    scene.createBreakParticles(gx - 80, bounds.center);

    // Pip da camada que caiu apaga
    const pip = this.pips[this.layerIdx];
    if (pip) pip.setAlpha(0.25);

    this.layerIdx++;
    if (this.layerIdx >= Constants.BOSS_LAYERS.length) {
      this.defeat();
      return;
    }
    this.gate.setTexture(`zoo-gate-armored-${this.layersLeft()}`);
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

  // Última camada caiu: o caçador tomba do portão e a festa de sempre roda.
  // O crossGate seta gateReached — o gatilho legado do update não redispara.
  defeat() {
    this.state = 'defeated';
    const scene = this.scene;
    this.hideFightUi();
    this.hunter.defeat();
    this.restoreCamera();
    scene.crossGate();
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
