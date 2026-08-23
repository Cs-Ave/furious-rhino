import { Constants } from '../utils/Constants.js';

// ARMADILHA TEMPORIZADA da cidade (v1.8.7 "Estado de Alerta") — UMA entidade
// para as três armadilhas da ideia J: caçamba de entulho (D1), hidrante
// rompido (D2) e arco voltaico (D3). Molde estrutural: TranqTower (corpo
// estático imóvel, pool com reset/deactivate), com UMA diferença crítica: a
// torre early-returna no preUpdate quando `!body.enable`; aqui o TIMER
// precisa rodar com o corpo DESLIGADO — a fase OFF é exatamente isso. As
// guardas certas são `!this.active` e `physics.world.isPaused`.
//
// Contrato com a cena (o GameScene registra o overlap e chama o handler
// canônico; aqui não mora decisão de morte nem de pontuação):
//   reset(x, kind)   kind ∈ 'cacamba' | 'hidrante' | 'arco'
//   this.kind        para a cena decidir o counterplay
//   this.lethal      true = contato mata AGORA. Nos temporizados, só na
//                    fase ON; na caçamba, sempre — até o smash()
//   this.deathCause  'wall' (caçamba) | 'spike' (hidrante e arco)
//   smash()          só caçamba: destruída no dash — vira entulho, corpo off
//                    (quem decide se o dash resolve é a cena)
//
// Zero física móvel, zero conflito com o FurySystem. Texturas do agente C
// (TextureFactory); setTexture só roda se a chave existir — fallback
// silencioso para rodar antes de a arte chegar, mas o código escreve contra
// os NOMES do contrato.
export class TimedHazard extends Phaser.Physics.Arcade.Sprite {
  // Números da ideia J. Os canvases devem PISAR NO CHÃO (origem 0.5, 1 em
  // GROUND_TOP, escala 1) — o corpo é posto pelo TOPO NO MUNDO via
  // sizeBody, qualquer que seja a altura da textura desenhada.
  static KINDS = {
    // Bloco 100×64 no chão: a primeira barreira BAIXA do jogo — pulável OU
    // destrutível no dash. Corpo SEMPRE ligado; mata como parede.
    cacamba: {
      tex: 'hazard-cacamba', cause: 'wall',
      bodyW: 100, bodyH: 64, bodyTop: Constants.GROUND_TOP - 64,
    },
    // Coluna d'água 48×220 saindo do chão; 900 OFF / 600 ON, borbulha nos
    // 400 ms finais do OFF. Letal só no ON; timing puro, sem exigir dash.
    hidrante: {
      tex: 'hazard-hidrante', texOn: 'hazard-hidrante-on', cause: 'spike',
      bodyW: 48, bodyH: 220, bodyTop: Constants.GROUND_TOP - 220,
      offMs: 900, onMs: 600, telegraphMs: 400,
    },
    // Arco elétrico na faixa AÉREA y 400–500 (vão de 140 px entre postes);
    // 600 ON / 900 OFF, brilho crescente 300 ms antes. O chão fica LIVRE —
    // armadilha anti-pulo: correr por baixo é a resposta.
    arco: {
      tex: 'hazard-arco', texOn: 'hazard-arco-on', cause: 'spike',
      bodyW: 140, bodyH: 100, bodyTop: 400,
      offMs: 900, onMs: 600, telegraphMs: 300,
    },
  };

  constructor(scene, x, y) {
    super(scene, x, y, 'hazard-cacamba');
    this.scene.physics.world.enable(this);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.setOrigin(0.5, 1);
    this.kind = 'cacamba';
    this.lethal = false;
    this.deathCause = 'wall';
    this.phaseOn = false;       // fase atual dos temporizados
    this.smashed = false;  // caçamba já virou entulho?
    this.phaseMs = 0;      // contagem regressiva da fase (padrão -= delta)
    this.scene.add.existing(this);
  }

  // Fallback silencioso enquanto a arte do agente C não existe
  trySetTexture(key) {
    if (key && this.scene.textures.exists(key)) this.setTexture(key);
  }

  // Corpo pelo TOPO NO MUNDO: com origem (0.5, 1) no chão, o canto superior
  // esquerdo da textura está em GROUND_TOP - altura da textura — o offset
  // sai daí, para qualquer canvas (escala 1, sem setScale: offset em pixel
  // de textura = pixel de mundo).
  sizeBody(w, h, topY) {
    this.body.setSize(w, h);
    this.body.setOffset((this.width - w) / 2, topY - (Constants.GROUND_TOP - this.height));
  }

  reset(x, kind) {
    this.kind = TimedHazard.KINDS[kind] ? kind : 'cacamba';
    const cfg = TimedHazard.KINDS[this.kind];
    this.deathCause = cfg.cause;
    this.smashed = false;
    // Lição do CrackedWall.clearCollapse: crop e tint jamais vazam no pool
    this.setCrop();
    this.clearTint();
    this.setAlpha(1);
    this.trySetTexture(cfg.tex);
    this.setPosition(x, Constants.GROUND_TOP);
    this.sizeBody(cfg.bodyW, cfg.bodyH, cfg.bodyTop);
    if (cfg.onMs) {
      // Temporizado nasce em OFF com o ciclo cheio: a 1ª leitura é justa
      this.phaseOn = false;
      this.phaseMs = cfg.offMs;
      this.body.enable = false;
      this.lethal = false;
    } else {
      // Caçamba: corpo sempre on — a cena decide pulo/smash/morte
      this.phaseOn = true;
      this.body.enable = true;
      this.lethal = true;
    }
    this.setActive(true).setVisible(true);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    // NÃO retornar por !body.enable (a torre faz): OFF é corpo desligado
    // COM o timer correndo. As guardas certas:
    if (!this.active) return;
    if (this.scene.physics.world.isPaused) return;
    const cfg = TimedHazard.KINDS[this.kind];
    if (!cfg.onMs || this.smashed) return; // caçamba/entulho: sem ciclo
    this.phaseMs -= delta;
    if (this.phaseOn) {
      if (this.phaseMs <= 0) this.setPhase(false, cfg);
      return;
    }
    if (this.phaseMs <= 0) {
      this.setPhase(true, cfg);
      return;
    }
    // Telegraph no fim do OFF — a linguagem da seteira da torre. Hidrante:
    // "borbulha" (tint fraco piscando). Arco: brilho CRESCENTE — o pisca em
    // fill acelera de ~140 ms a ~40 ms conforme o disparo chega (tint
    // multiplicativo não clareia; setTintFill sim).
    if (this.phaseMs <= cfg.telegraphMs) {
      const period = this.kind === 'arco' ? 40 + this.phaseMs / 3 : 90;
      if (Math.floor(time / period) % 2 === 0) {
        if (this.kind === 'arco') this.setTintFill(0xcfe0ff);
        else this.setTint(0x9fd8ff);
      } else {
        this.clearTint();
      }
    }
  }

  setPhase(on, cfg) {
    this.phaseOn = on;
    this.clearTint();
    this.phaseMs = on ? cfg.onMs : cfg.offMs;
    this.body.enable = on;
    this.lethal = on;
    this.trySetTexture(on ? cfg.texOn : cfg.tex);
  }

  // Só caçamba: o dash a destrói (+5, contagem e morte como `wall` são da
  // cena — aqui só o efeito físico/visual). Vira entulho: corpo off, sobra
  // a metade de baixo da textura com tint de poeira. Crop e tint limpos no
  // reset/deactivate (CrackedWall.clearCollapse).
  smash() {
    if (this.kind !== 'cacamba' || this.smashed) return;
    this.smashed = true;
    this.lethal = false;
    this.body.enable = false;
    this.setCrop(0, this.height * 0.45, this.width, this.height * 0.55);
    this.setTint(0x9a938b);
  }

  deactivate() {
    this.body.enable = false;
    this.phaseOn = false;
    this.lethal = false;
    this.smashed = false;
    this.phaseMs = 0;
    this.setCrop();
    this.clearTint();
    this.setAlpha(1);
    this.setActive(false).setVisible(false);
  }
}
