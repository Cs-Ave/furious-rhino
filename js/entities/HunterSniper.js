import { Constants } from '../utils/Constants.js';

// O atirador no topo do alvo blindado (o chefe da fuga, v1.7; parametrizado
// para servir a qualquer boss desde então).
// Não é pooled nem tem corpo físico: fica fora do alcance do rino por
// POSIÇÃO (nem o rampage o atinge), e o dano dele sai pelos dardos do pool.
// Toda a lógica roda por updateFight(), dirigido pelo BossFight.update — que
// por construção respeita pausa, cutscene e fim de jogo (o GameScene.update
// early-returna nesses estados), então não precisa das guardas isPaused do
// preUpdate da TranqTower.
//
// A `def` é a MESMA do BossFight; daqui só se lê:
//   rifle        tabela de padrões por camadas restantes (referência viva);
//                flags por degrau: burst, fan, mortar, rasante e (v1.8.7)
//                holo — granada-de-luz: balística de morteiro, telegraph de
//                holofote no chão (a Muralha)
//   hunterTexture / hunterAimTexture   arte parado / mirando
//   enrageMs     0 = sem enrage; >0 = passado esse tempo de luta a cadência
//                desce UM degrau na tabela (nunca um muro de morte)
//   rasanteStyle (v1.8.7; v1.8.10 generalizado) chave do MAPA RASANTE_TEX
//                abaixo — 'k9' (cão de choque da Muralha) ou 'falcao' (o
//                Mergulho de Hórus do Faraó de Bronze); ausente/fora do
//                mapa = dardo padrão

// rasanteStyle → textura do projétil do rasante. Era o literal 'k9'
// (v1.8.7); o Faraó trouxe o segundo estilo e o if virou tabela. As
// texturas são do agente C — sem elas, o tint próprio do estilo assume
// (fallback silencioso, o código escreve contra os nomes do contrato). O
// TranqDart.deactivate devolve textura E tint no descarte (higiene de
// pool), então qualquer chave nova aqui já nasce com o restore garantido.
const RASANTE_TEX = { k9: 'k9-projectile', falcao: 'falcao-projectile' };
const RASANTE_TINT = { k9: 0x9db4ff, falcao: 0xd9a441 };

export class HunterSniper extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, def) {
    super(scene, x, y, def.hunterTexture);
    this.def = def;
    this.setOrigin(0.5, 1);
    // Textura rasterizada a 2x, exibida a 1/2 (padrão de toda arte SVG)
    this.setScale(1 / Constants.ART_RASTER_SCALE);
    // Na frente do alvo (-1), atrás do plano de jogo
    this.setDepth(-0.4);
    scene.add.existing(this);

    // Mira laser do telegraph: redesenhada por frame apontando o rino —
    // é o aviso legível em mobile de que o tiro vem
    this.laser = scene.add.graphics().setDepth(5);

    this.engaged = false;
    this.phase = 'cooldown'; // cooldown | telegraph
    this.phaseMs = 0;
    this.shotIndex = 0;
    this.burstLeft = 0;
    this.burstMs = 0;
    this.burstFan = false; // a rajada em curso é leque? (lida da cfg do disparo)
  }

  // Boca do rifle (apontado para a esquerda, de onde o rino vem)
  muzzle() {
    return { x: this.x - 26, y: this.y - 42 };
  }

  engage() {
    this.engaged = true;
    this.phase = 'cooldown';
    this.phaseMs = 900; // respiro de leitura antes do 1º telegraph
    this.shotIndex = 0;
  }

  // Padrão vigente. layersLeft escala a dificuldade; com enrageMs > 0, uma
  // luta que se arrasta desce UM degrau só (o de layersLeft-1, mínimo 1):
  // acelera o desfecho sem virar muro de morte para quem ainda está lutando.
  currentConfig(layersLeft, fightMs) {
    const rifle = this.def.rifle;
    let key = layersLeft;
    if (this.def.enrageMs > 0 && fightMs > this.def.enrageMs) {
      key = Math.max(1, layersLeft - 1);
    }
    return rifle[key] || rifle[1];
  }

  // Chamado pelo BossFight todo frame de luta.
  updateFight(time, delta, layersLeft, fightMs = 0) {
    if (!this.engaged) return;
    const cfg = this.currentConfig(layersLeft, fightMs);
    const rhino = this.scene.rhino.getSprite();
    this.phaseMs -= delta;

    if (this.phase === 'cooldown' && this.phaseMs <= 0) {
      this.phase = 'telegraph';
      this.phaseMs = cfg.telegraphMs;
      this.setTexture(this.def.hunterAimTexture);
    }

    if (this.phase === 'telegraph') {
      // O tiro que este telegraph anuncia é o de índice shotIndex+1 (o
      // incremento acontece no disparo, logo abaixo). Se ele vai ser um
      // holo, o aviso é o HOLOFOTE varrendo até a zona de pouso — o
      // jogador lê a luz no chão, não uma linha abstrata
      if ((this.shotIndex + 1) % 2 === 0 && cfg.holo) {
        this.drawHoloTelegraph(time, rhino);
      } else {
        this.drawLaser(time, rhino);
      }
      if (this.phaseMs <= 0) {
        this.laser.clear();
        this.shotIndex++;
        this.phase = 'cooldown';
        this.phaseMs = cfg.intervalMs;
        // Regra dos ALTERNADOS (tiros de índice par): holo (granada-de-luz)
        // tem precedência sobre o morteiro, que tem sobre o rasante; sem
        // nenhum dos três, cai na rajada normal. Índice ímpar é sempre
        // rajada. O portão só configura `mortar`, então o comportamento
        // dele fica idêntico ao de sempre.
        if (this.shotIndex % 2 === 0 && cfg.holo) {
          this.fireHolo(rhino);
          this.setTexture(this.def.hunterTexture);
        } else if (this.shotIndex % 2 === 0 && cfg.mortar) {
          this.fireMortar(rhino);
          this.setTexture(this.def.hunterTexture);
        } else if (this.shotIndex % 2 === 0 && cfg.rasante) {
          this.fireRasante(rhino);
          this.setTexture(this.def.hunterTexture);
        } else {
          // Rajada: o 1º tiro sai já; os demais em cadência de 120ms
          this.burstLeft = cfg.burst;
          this.burstMs = 0;
          this.burstFan = Boolean(cfg.fan);
        }
      }
    }

    if (this.burstLeft > 0) {
      this.burstMs -= delta;
      if (this.burstMs <= 0) {
        this.fireStraight(rhino, this.burstFan);
        this.burstLeft--;
        this.burstMs = 120;
        if (!this.burstLeft) this.setTexture(this.def.hunterTexture);
      }
    }
  }

  drawLaser(time, rhino) {
    const m = this.muzzle();
    const g = this.laser;
    g.clear();
    // Pisca acelerando perto do disparo (mesma linguagem do telegraph da torre)
    const blink = Math.floor(time / 90) % 2 === 0;
    g.lineStyle(2, 0xff3b30, blink ? 0.75 : 0.35);
    g.lineBetween(m.x, m.y, rhino.x, rhino.y - 30);
    g.fillStyle(0xff3b30, 0.9);
    g.fillCircle(m.x, m.y, 3);
  }

  // Telegraph do HOLO: em vez do laser reto, um CONE de holofote da boca do
  // rifle até a zona de pouso — mirada como a do morteiro (o x ATUAL do
  // rino), então o cone varre a arena acompanhando quem se move. Sem
  // gradiente (SwiftShader): 3 triângulos concêntricos de alpha decrescente
  // + linha central + a ELIPSE âmbar pulsando no chão. É a elipse que o
  // jogador lê — "não esteja aqui quando a luz apagar".
  drawHoloTelegraph(time, rhino) {
    const m = this.muzzle();
    const g = this.laser;
    g.clear();
    const tx = rhino.x;
    const ty = Constants.GROUND_TOP;
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.012);
    const base = 0.08 + 0.1 * pulse; // pico ~0.18 no triângulo interno
    const halves = [70, 44, 20];     // meia-largura do pé do cone no chão
    const alphas = [base * 0.55, base * 0.8, base * 1.05];
    for (let i = 0; i < halves.length; i++) {
      g.fillStyle(0xffe9b8, alphas[i]);
      g.fillTriangle(m.x, m.y, tx - halves[i], ty, tx + halves[i], ty);
    }
    g.lineStyle(2, 0xfff0a8, 0.3 + 0.4 * pulse);
    g.lineBetween(m.x, m.y, tx, ty);
    // A zona de pouso no chão — o coração do aviso
    g.fillStyle(0xfff0a8, 0.18 + 0.22 * pulse);
    g.fillEllipse(tx, ty, 150, 26);
    g.lineStyle(3, 0xffd24a, 0.45 + 0.4 * pulse);
    g.strokeEllipse(tx, ty, 150, 26);
  }

  // GRANADA-DE-LUZ (holo, v1.8.7 — a Muralha): mecanicamente um morteiro
  // (MESMA balística do fireMortar), com dardo âmbar. O clearTint garantido
  // do TranqDart.deactivate limpa o âmbar no reuso — precedente do dardo
  // dourado de boss.
  fireHolo(rhino) {
    this.fireMortar(rhino);
    const d = this.lastFiredDart();
    if (d) d.setTint(0xfff0a8);
  }

  // O fireDart do SpawnManager não retorna o dardo (pool de fogo-e-esquece).
  // O recém-disparado é o único ATIVO ainda parado exatamente na boca do
  // rifle — a física não deu passo entre o fire e esta chamada (mesmo frame
  // síncrono). Pool lotado = tiro silencioso = null (quem chama guarda).
  lastFiredDart() {
    const m = this.muzzle();
    const darts = this.scene.spawnManager.getDartsGroup().getChildren();
    for (let i = darts.length - 1; i >= 0; i--) {
      const d = darts[i];
      if (d.active && d.x === m.x && d.y === m.y) return d;
    }
    return null;
  }

  // Tiro reto mirado no corpo do rino. Com `fan`, vira leque de 3: o do meio
  // mantém a mira exata e os outros dois abrem ±0.21 rad (~12°) — cobre a
  // esquiva vertical sem virar parede de dardos.
  // v1.8.5: cada boss assina o próprio dardo — a causa de morte vem da def
  // ('boss2'/'boss3'); sem ela, o legado 'boss' do portão
  shotCause() {
    return this.def.deathCause || 'boss';
  }

  fireStraight(rhino, fan = false) {
    const m = this.muzzle();
    const dx = rhino.x - m.x;
    const dy = (rhino.y - 30) - m.y; // centro do corpo (origem do rino é o pé)
    const len = Math.hypot(dx, dy) || 1;
    const v = Constants.BOSS_SHOT_SPEED;
    if (fan) {
      const base = Math.atan2(dy, dx);
      for (const spread of [-0.21, 0, 0.21]) {
        const a = base + spread;
        this.scene.spawnManager.fireDart(
          m.x, m.y, Math.cos(a) * v, Math.sin(a) * v, false, this.shotCause()
        );
      }
    } else {
      this.scene.spawnManager.fireDart(m.x, m.y, (dx / len) * v, (dy / len) * v, false, this.shotCause());
    }
    this.scene.audio.playRifleShot(); // 1 estampido por tiro, leque incluído
  }

  // Morteiro que cai onde o rino ESTÁ — a zona de pouso do quique. Resolve o
  // tempo de queda da altura do rifle até o chão e mira o x com ele.
  fireMortar(rhino) {
    const m = this.muzzle();
    const vy0 = -260;
    const g = Constants.GRAVITY;
    const drop = Constants.GROUND_TOP - m.y;
    const t = (-vy0 + Math.sqrt(vy0 * vy0 + 2 * g * drop)) / g;
    const vx = Phaser.Math.Clamp((rhino.x - m.x) / t, -820, -120);
    this.scene.spawnManager.fireDart(m.x, m.y, vx, vy0, true, this.shotCause());
    this.scene.audio.playRifleShot();
  }

  // RASANTE (anti-camping): dardo reto, sem gravidade, saindo da boca do
  // rifle e descendo até a altura dos PÉS do rino — quem fica plantado no
  // chão esperando o padrão passar leva. Mira a linha do chão, não o corpo:
  // pular é a resposta, e pular é o que o camper não estava fazendo.
  fireRasante(rhino) {
    const m = this.muzzle();
    const dx = rhino.x - m.x;
    const dy = (Constants.GROUND_TOP - 24) - m.y;
    const len = Math.hypot(dx, dy) || 1;
    const v = Constants.BOSS_SHOT_SPEED;
    this.scene.spawnManager.fireDart(m.x, m.y, (dx / len) * v, (dy / len) * v, false, this.shotCause());
    // rasanteStyle (campo da def): o rasante veste a textura do estilo — o
    // K9 de choque da Muralha ou o falcão do Mergulho de Hórus (Faraó de
    // Bronze) cruzando a arena rente ao chão. O MESMO dardo, reskinado.
    // Textura ausente = tint do estilo; restore no TranqDart.deactivate.
    const rasTex = RASANTE_TEX[this.def.rasanteStyle];
    if (rasTex) {
      const d = this.lastFiredDart();
      if (d) {
        if (this.scene.textures.exists(rasTex)) {
          d.clearTint(); // sem o dourado de boss por cima do sprite próprio
          d.setTexture(rasTex);
        } else {
          d.setTint(RASANTE_TINT[this.def.rasanteStyle]);
        }
      }
    }
    this.scene.audio.playRifleShot();
  }

  // A última camada derruba o atirador do alvo: tomba, cai e some (comédia,
  // como o knockback dos animais — ninguém morre neste jogo além do rino)
  defeat() {
    this.engaged = false;
    this.burstLeft = 0;
    this.laser.clear();
    this.scene.audio.playSqueal();
    this.scene.createExplosion(this.x, this.y - 30);
    this.scene.tweens.add({
      targets: this,
      y: Constants.GROUND_TOP + 60,
      angle: 150,
      alpha: 0,
      duration: 900,
      ease: 'Quad.easeIn',
      onComplete: () => this.setVisible(false),
    });
  }

  standDown() {
    this.engaged = false;
    this.burstLeft = 0;
    this.laser.clear();
    this.setTexture(this.def.hunterTexture);
  }
}
