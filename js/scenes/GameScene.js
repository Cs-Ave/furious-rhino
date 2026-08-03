import { Constants } from '../utils/Constants.js';
import { StorageManager } from '../utils/StorageManager.js';
import { Rhino } from '../entities/Rhino.js';
import { SpawnManager } from '../systems/SpawnManager.js';
import { FurySystem } from '../systems/FurySystem.js';
import { AudioSystem } from '../systems/AudioSystem.js';
import { initTuningPanel } from '../systems/TuningPanel.js';
import { LeaderboardSystem } from '../systems/LeaderboardSystem.js';
import { MedalSystem, MEDALS } from '../systems/MedalSystem.js';
import { StatsSystem } from '../systems/StatsSystem.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.physics.world.setFPS(60);
    // Ceiling-only world bounds: stops the infinite jump from flying the
    // rhino out of the scene (no side walls, no world floor).
    // O mundo vai até WORLD_END_PX (modo infinito) — float32 preciso até lá.
    this.physics.world.setBounds(
      0, 0, Constants.WORLD_END_PX + 1000, Constants.GAME_HEIGHT,
      false, false, true, false
    );
    this.cameras.main.setBounds(0, 0, Constants.WORLD_END_PX + 1000, Constants.GAME_HEIGHT);
    this.cameras.main.setLerp(0.1, 0);

    this.createBackground();

    this.rhino = new Rhino(this, 100, Constants.GAME_HEIGHT - 100);
    this.spawnManager = new SpawnManager(this);
    this.furySystem = new FurySystem(this);

    this.createGround();

    // Marco visual da fuga: o portão fica exatamente na linha dos 800m
    this.add.image(Constants.WIN_DISTANCE_PX, Constants.GAME_HEIGHT - 100, 'zoo-gate')
      .setOrigin(0.5, 1).setDepth(-1);

    this.setupInput();
    this.setupCollisions();
    this.createDashIcon();

    this.gameOver = false;
    this.won = false;
    // Contadores da corrida atual (critérios de medalha)
    this.runWallsBroken = 0;
    this.runAnimalsHit = 0;
    // Modo infinito: estado do portão dos 800m
    this.gateReached = false; // já cruzou a linha (dispara 1x)
    this.escaped = false;     // cruzou 800m = fugiu, saindo ou continuando
    this.winCounted = false;  // addWin só 1x por corrida
    this.legend = false;      // chegou ao fim do mundo (10.000m)

    // Hold everything until the start-screen tap (which also unlocks audio)
    this.started = false;
    this.audio = new AudioSystem();
    this.audio.bindMuteButton(document.getElementById('mute-btn'));
    this.physics.pause();
    this.setupStartScreen();
    this.setupShareButtons();

    // Manual-emission wind streaks trailing the rhino during a dash
    this.windEmitter = this.add.particles(0, 0, 'wind-streak', {
      speedX: { min: -350, max: -220 },
      speedY: { min: -30, max: 30 },
      alpha: { start: 0.9, end: 0 },
      scaleX: { start: 1, end: 1.6 },
      lifespan: 250,
      frequency: -1,
    });
    this.windEmitter.setDepth(4);

    this.cameras.main.startFollow(this.rhino.getSprite(), true, 0.1, 0, -200);

    if (this.registry.get('debug')) initTuningPanel(this);
  }

  setupStartScreen() {
    document.getElementById('start-record').textContent = StorageManager.getRecord();
    document.getElementById('start-attempts').textContent = StorageManager.getAttempts();

    // Última posição conhecida no ranking (cacheada — zero rede no load)
    const rank = StorageManager.getLastRank();
    if (rank > 0) {
      document.getElementById('start-rank-pos').textContent = rank;
      document.getElementById('start-rank').hidden = false;
    }
    this.setupMedalStrip();

    // Reenvia os totais com a página parada: o envio do fim de corrida
    // morre se o jogador clicar "Jogar Novamente" rápido (reload mata o
    // fetch em voo) — aqui ele sempre completa e cura docs defasados
    if (StorageManager.getAttempts() > 0) StatsSystem.send();

    // Handler nomeado com guarda em vez de {once:true}: com um modal aberto
    // (ranking/apelido), nenhuma tecla ou toque pode iniciar a corrida
    const overlay = document.getElementById('start-screen');
    const start = () => {
      if (document.body.classList.contains('modal-open')) return;
      overlay.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
      this.startRun();
    };
    overlay.addEventListener('pointerdown', start);
    window.addEventListener('keydown', start);

    this.setupLeaderboardUI();
  }

  setupLeaderboardUI() {
    const rankingBtn = document.getElementById('ranking-btn');
    const rankingModal = document.getElementById('ranking-modal');
    const nickModal = document.getElementById('nickname-modal');
    const nickInput = document.getElementById('nickname-input');

    // Toques nos modais/botão não podem vazar para o start do overlay
    // (mesmo padrão do #install-hint)
    rankingBtn.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    rankingModal.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    nickModal.addEventListener('pointerdown', (ev) => ev.stopPropagation());

    rankingBtn.addEventListener('click', () => this.openRanking());
    document.getElementById('ranking-close').addEventListener('click', () => {
      this.closeModal(rankingModal);
    });

    document.getElementById('nickname-save').addEventListener('click', () => this.saveNickname());
    document.getElementById('nickname-skip').addEventListener('click', () => this.stayAnonymous());
    nickInput.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Enter') this.saveNickname();
    });
  }

  // Faixa de medalhas na tela de início + modal com nomes/descrições
  setupMedalStrip() {
    const strip = document.getElementById('medal-strip');
    const modal = document.getElementById('medals-modal');
    const list = document.getElementById('medals-list');
    const owned = new Set(StorageManager.getMedals());

    strip.textContent = '';
    list.textContent = '';
    for (const medal of MEDALS) {
      const span = document.createElement('span');
      span.textContent = medal.emoji;
      span.title = medal.name;
      if (!owned.has(medal.id)) span.classList.add('locked');
      strip.appendChild(span);

      const li = document.createElement('li');
      if (!owned.has(medal.id)) li.classList.add('locked');
      const emoji = document.createElement('span');
      emoji.className = 'm-emoji';
      emoji.textContent = medal.emoji;
      const text = document.createElement('span');
      const name = document.createElement('b');
      name.textContent = `${medal.name} — `;
      const desc = document.createElement('span');
      desc.className = 'm-desc';
      desc.textContent = medal.desc;
      text.append(name, desc);
      li.append(emoji, text);
      list.appendChild(li);
    }

    // Toques na faixa/modal não podem vazar para o start do overlay
    strip.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    modal.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    strip.addEventListener('click', () => this.openModal(modal));
    document.getElementById('medals-close').addEventListener('click', () => this.closeModal(modal));
  }

  openModal(el) {
    el.style.display = 'block';
    document.body.classList.add('modal-open');
  }

  closeModal(el) {
    el.style.display = 'none';
    document.body.classList.remove('modal-open');
  }

  async openRanking() {
    const modal = document.getElementById('ranking-modal');
    const list = document.getElementById('ranking-list');
    const me = document.getElementById('ranking-me');
    const status = document.getElementById('ranking-status');
    this.openModal(modal);
    list.innerHTML = '';
    me.textContent = '';

    if (!LeaderboardSystem.isConfigured()) {
      status.textContent = 'Ranking online ainda não configurado.';
      return;
    }
    status.textContent = 'Carregando…';
    const data = await LeaderboardSystem.fetchTop10();
    if (!data) {
      status.textContent = 'Sem conexão — tente de novo.';
      return;
    }
    if (data.entries.length === 0) {
      status.textContent = 'Ninguém no ranking ainda. Seja o primeiro!';
      return;
    }
    status.textContent = '';

    const myId = StorageManager.getOrCreatePlayerId();
    data.entries.forEach((entry, i) => {
      const li = document.createElement('li');
      if (entry.id === myId) li.classList.add('me');
      const name = document.createElement('span');
      name.textContent = `${i + 1}. ${entry.name}`; // textContent: nome vem de terceiros
      const score = document.createElement('span');
      score.textContent = `${entry.score}m`;
      li.append(name, score);
      list.appendChild(li);
    });

    if (data.myBest > 0) {
      me.textContent = data.myRank !== null
        ? `Sua posição: #${data.myRank} — ${data.myBest}m`
        : `Seu melhor: ${data.myBest}m`;
    } else {
      me.textContent = 'Jogue para entrar no ranking!';
    }
  }

  async submitScore(distance) {
    this.pendingScore = distance;
    if (!StorageManager.getPlayerName()) {
      this.openNicknameModal();
      return;
    }
    const ok = await LeaderboardSystem.submit(distance);
    if (ok) this.showOnlineStatus('🌍 Enviado ao ranking mundial!');
  }

  showOnlineStatus(msg) {
    const id = this.won ? 'win-online-status' : 'online-status';
    document.getElementById(id).textContent = msg;
  }

  setupShareButtons() {
    // Sem nenhuma API (ex.: LAN via http, sem contexto seguro): esconde
    const supported = Boolean(navigator.share || navigator.clipboard);
    for (const id of ['share-btn', 'win-share-btn']) {
      const btn = document.getElementById(id);
      if (!supported) {
        btn.style.display = 'none';
      } else {
        btn.addEventListener('click', () => this.shareResult());
      }
    }
  }

  showShareStatus(msg) {
    const id = this.won ? 'win-share-status' : 'share-status';
    document.getElementById(id).textContent = msg;
  }

  // Folha nativa de compartilhar no celular; sem ela, copia o convite.
  // A mensagem conta a história da corrida: lenda > fuga > tentativa.
  async shareResult() {
    const url = location.origin + location.pathname; // sem ?debug etc.
    const d = this.finalDistance;
    let text;
    if (this.legend) {
      text = `👑 SOU LENDA no FURIOUS RHINO: cheguei ao FIM DO MUNDO — ${d}m! Alguém mais consegue? Jogue de graça:`;
    } else if (this.escaped || this.won) {
      text = `🦏💨 EU ESCAPEI DO ZOOLÓGICO no FURIOUS RHINO — ${d}m! Duvido você chegar ao portão dos 800m. Jogue de graça:`;
    } else {
      text = `🦏 Corri ${d}m fugindo do zoológico no FURIOUS RHINO (morri tentando 💀). Consegue me superar? Jogue de graça:`;
    }
    if (navigator.share) {
      try {
        await navigator.share({ text, url });
      } catch (e) { /* usuário cancelou (AbortError) — silêncio */ }
    } else if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(`${text} ${url}`);
        this.showShareStatus('🔗 Link copiado!');
      } catch (e) {
        this.showShareStatus('Não foi possível copiar.');
      }
    }
  }

  openNicknameModal() {
    const input = document.getElementById('nickname-input');
    document.getElementById('nickname-error').textContent = '';
    input.value = StorageManager.getPlayerName();
    this.openModal(document.getElementById('nickname-modal'));
    // O Phaser captura setas/espaço globalmente e quebraria a digitação
    this.input.keyboard.disableGlobalCapture();
    input.focus();
  }

  saveNickname() {
    const input = document.getElementById('nickname-input');
    const name = input.value.trim();
    if (name.length < 3 || name.length > 12) {
      document.getElementById('nickname-error').textContent =
        'O apelido precisa ter de 3 a 12 caracteres.';
      return;
    }
    StorageManager.setPlayerName(name);
    this.closeNicknameModal(true);
  }

  closeNicknameModal(submit) {
    this.closeModal(document.getElementById('nickname-modal'));
    this.input.keyboard.enableGlobalCapture();
    if (submit && this.pendingScore) {
      LeaderboardSystem.submit(this.pendingScore).then((ok) => {
        if (ok) this.showOnlineStatus('🌍 Enviado ao ranking mundial!');
      });
    }
  }

  // "Ficar anônimo": TODO jogador entra no ranking — gera Anonimo_N
  // (N = jogadores no ranking + 1), salva como nome do aparelho e envia
  async stayAnonymous() {
    this.closeNicknameModal(false);
    const name = await LeaderboardSystem.anonymousName();
    StorageManager.setPlayerName(name);
    if (this.pendingScore) {
      const ok = await LeaderboardSystem.submit(this.pendingScore);
      if (ok) this.showOnlineStatus(`🌍 No ranking como ${name}!`);
    }
  }

  startRun() {
    if (this.startTriggered) return;
    this.startTriggered = true;

    // Persiste JÁ: "Jogar Novamente" recarrega a página e apagaria memória
    StorageManager.addAttempt();
    this.runStartedAt = Date.now();
    const overlay = document.getElementById('start-screen');
    if (overlay) overlay.style.display = 'none';
    document.body.classList.add('started');

    // Audio must init synchronously inside the user gesture
    this.audio.init();
    this.audio.startMusic();

    this.physics.resume();
    // Small grace so a stray click right after the overlay hides can't jump
    this.time.delayedCall(150, () => { this.started = true; });

    // Fullscreen + landscape lock: fire-and-forget, silently ignored on iOS
    (async () => {
      try {
        await document.documentElement.requestFullscreen();
        await screen.orientation.lock('landscape');
      } catch (e) { /* unsupported (iOS/desktop) — portrait CSS overlay covers it */ }
    })();
  }

  createBackground() {
    // Céus empilhados: dia embaixo; entardecer e noite por cima com alpha
    // dirigido pela distância (updateAtmosphere) — fuga aos 800m = pôr do
    // sol, modo infinito corre sob as estrelas
    this.skyDay = this.add.image(640, 360, 'bg-sky-day').setScrollFactor(0).setDepth(-20);
    this.skyDusk = this.add.image(640, 360, 'bg-sky-dusk').setScrollFactor(0).setDepth(-19.9).setAlpha(0);
    this.skyNight = this.add.image(640, 360, 'bg-sky-night').setScrollFactor(0).setDepth(-19.8).setAlpha(0);

    // Fixed-to-camera tileSprites scrolled manually in update() — avoids
    // creating world-width objects for a 400000px level
    this.bgMountains = this.add.tileSprite(640, 480, 1280, 300, 'bg-mountains')
      .setScrollFactor(0).setDepth(-19.7);
    this.bgClouds = this.add.tileSprite(640, 130, 1280, 200, 'bg-clouds')
      .setScrollFactor(0).setDepth(-19.5);

    // Biomas por trecho de 200m: cada camada é um PAR de tileSprites — A é
    // a base, B recebe a textura nova e faz o crossfade (switchBiome)
    this.biomeIndex = 0;
    const b0 = Constants.BIOMES[0];
    this.bgFarA = this.add.tileSprite(640, 410, 1280, 420, `bg-far-${b0}`)
      .setScrollFactor(0).setDepth(-19);
    this.bgFarB = this.add.tileSprite(640, 410, 1280, 420, `bg-far-${b0}`)
      .setScrollFactor(0).setDepth(-18.9).setAlpha(0);
    this.bgNearA = this.add.tileSprite(640, 490, 1280, 260, `bg-near-${b0}`)
      .setScrollFactor(0).setDepth(-18);
    this.bgNearB = this.add.tileSprite(640, 490, 1280, 260, `bg-near-${b0}`)
      .setScrollFactor(0).setDepth(-17.9).setAlpha(0);

    // Camadas que recebem o tint atmosférico — NUNCA elementos de gameplay
    // (obstáculos/animais/rino ficam legíveis em qualquer hora do dia)
    this.atmoLayers = [
      this.bgClouds, this.bgMountains,
      this.bgFarA, this.bgFarB, this.bgNearA, this.bgNearB,
    ];
    this.lastAtmoTint = -1;

    this.createSkyLife();
  }

  // Vida no cenário: pássaros distantes cruzando o céu + folhas ao vento
  createSkyLife() {
    this.skyBirds = [];
    for (let i = 0; i < 3; i++) {
      const b = this.add.image(0, 0, 'animal-bird-jay')
        .setScrollFactor(0).setDepth(-18.5).setScale(0.2); // textura 2x → ~22px
      b.flapT = 0;
      b.flapped = false;
      this.resetSkyBird(b, true);
      this.skyBirds.push(b);
      this.atmoLayers.push(b);
    }

    this.leafEmitter = this.add.particles(0, 0, 'leaf', {
      x: { min: 0, max: 1380 },
      y: -10,
      lifespan: 7000,
      speedX: { min: -70, max: -30 },
      speedY: { min: 18, max: 42 },
      rotate: { start: 0, end: 360 },
      alpha: { start: 0.9, end: 0.35 },
      scale: { min: 0.8, max: 1.3 },
      frequency: 900,
      quantity: 1,
    });
    this.leafEmitter.setScrollFactor(0).setDepth(-17.5);
  }

  resetSkyBird(b, initial = false) {
    b.species = Phaser.Utils.Array.GetRandom(Constants.BIRD_SPECIES);
    b.dir = Math.random() < 0.65 ? 1 : -1; // maioria foge do zoo, como o rino
    b.setTexture(`animal-bird-${b.species}`);
    b.setFlipX(b.dir < 0);
    b.speed = 20 + Math.random() * 25;
    b.y = 60 + Math.random() * 200;
    b.x = initial ? Math.random() * 1280 : (b.dir > 0 ? -60 : 1340);
    b.bobPhase = Math.random() * Math.PI * 2;
  }

  createGround() {
    // Um único quad com fill-pattern — largura de 404000px não aloca bitmap
    const width = Constants.WORLD_END_PX + 4000;
    const ground = this.add.tileSprite(width / 2, Constants.GAME_HEIGHT - 50, width, 100, 'ground');
    this.physics.add.existing(ground, true);
    this.atmoLayers.push(ground); // o chão também escurece ao anoitecer

    this.physics.add.collider(this.rhino.getSprite(), ground);

    // Animais terrestres pisam no chão (pulos do macaco/zebra com arco real);
    // abatidos pelo dash e o pássaro atravessam e reciclam fora da tela
    this.physics.add.collider(
      this.spawnManager.getAnimalsGroup(), ground, null,
      (animal) => animal.active && !animal.knockedOut && animal.animalType !== 'bird',
      this
    );
  }

  // Céu, luz e bioma acompanham a distância; pássaros distantes cruzam o
  // céu. Roda por frame no update (barato: 2 alphas, 1 tint, comparação int)
  updateAtmosphere(time, delta) {
    const x = this.rhino.getSprite().x;

    // Dia pleno até ~650m; entardecer 650–850m; noite 850–1300m em diante
    const dusk = Phaser.Math.Clamp((x - 26000) / 8000, 0, 1);
    const night = Phaser.Math.Clamp((x - 34000) / 18000, 0, 1);
    this.skyDusk.setAlpha(dusk);
    this.skyNight.setAlpha(night);

    // Luz ambiente das camadas de fundo: esfria e escurece com a noite
    const light = 1 - 0.18 * dusk * (1 - night) - 0.45 * night;
    const r = Math.round(255 * light);
    const gch = Math.round(255 * (light * 0.97 + 0.03));
    const bch = Math.round(255 * Math.min(1, light + 0.14 * night));
    const tint = (r << 16) | (gch << 8) | bch;
    if (tint !== this.lastAtmoTint) {
      this.lastAtmoTint = tint;
      this.atmoLayers.forEach((l) => l.setTint(tint));
    }

    // Bioma do trecho atual (crossfade a cada 200m até a liberdade)
    const idx = Constants.getBiomeIndex(x);
    if (idx !== this.biomeIndex) this.switchBiome(idx);

    // Pássaros distantes: deriva própria + batida de asas por troca de textura
    const dt = delta / 1000;
    for (const b of this.skyBirds) {
      b.x += b.dir * b.speed * dt;
      b.y += Math.sin(time * 0.002 + b.bobPhase) * 9 * dt;
      b.flapT += delta;
      if (b.flapT > 260) {
        b.flapT = 0;
        b.flapped = !b.flapped;
        b.setTexture(`animal-bird-${b.species}${b.flapped ? '-flap' : ''}`);
        b.setFlipX(b.dir < 0);
      }
      if ((b.dir > 0 && b.x > 1360) || (b.dir < 0 && b.x < -80)) this.resetSkyBird(b);
    }
  }

  switchBiome(idx) {
    this.biomeIndex = idx;
    const key = Constants.BIOMES[idx];
    // Teleportes de debug podem pular vários biomas com o tween anterior no
    // ar: mata o tween e recomeça o crossfade da camada B do zero
    this.tweens.killTweensOf([this.bgFarB, this.bgNearB]);
    this.bgFarB.setTexture(`bg-far-${key}`).setAlpha(0);
    this.bgNearB.setTexture(`bg-near-${key}`).setAlpha(0);
    this.tweens.add({
      targets: [this.bgFarB, this.bgNearB],
      alpha: 1,
      duration: 900,
      onComplete: () => {
        // Consolida na base A e libera B para a próxima fronteira
        this.bgFarA.setTexture(`bg-far-${key}`).setAlpha(1);
        this.bgNearA.setTexture(`bg-near-${key}`).setAlpha(1);
        this.bgFarB.setAlpha(0);
        this.bgNearB.setAlpha(0);
      },
    });
  }

  setupInput() {
    this.leftPointerId = null;

    this.input.on('pointerdown', (pointer) => {
      if (!this.started || this.gameOver || this.won) return;

      if (pointer.x < this.scale.width / 2) {
        this.leftPointerId = pointer.id;
        this.rhino.onLeftPress();
        this.audio.playJump(this.rhino.jumpCount);
      } else {
        if (this.rhino.onRightPress()) this.audio.playDash();
      }
    });

    this.input.on('pointerup', (pointer) => {
      if (pointer.id === this.leftPointerId) {
        this.leftPointerId = null;
        this.rhino.onLeftRelease();
      }
    });

    // Keyboard for desktop: left arrow = jump, right arrow = dash
    this.input.keyboard.on('keydown-LEFT', (event) => {
      if (event.repeat || !this.started || this.gameOver || this.won) return;
      this.rhino.onLeftPress();
      this.audio.playJump(this.rhino.jumpCount);
    });
    this.input.keyboard.on('keyup-LEFT', () => {
      this.rhino.onLeftRelease();
    });
    this.input.keyboard.on('keydown-RIGHT', (event) => {
      if (event.repeat || !this.started || this.gameOver || this.won) return;
      if (this.rhino.onRightPress()) this.audio.playDash();
    });
  }

  setupCollisions() {
    this.physics.add.overlap(
      this.rhino.getSprite(),
      this.spawnManager.getWallsGroup(),
      this.onWallHit,
      null,
      this
    );

    this.physics.add.overlap(
      this.rhino.getSprite(),
      this.spawnManager.getSpikesGroup(),
      this.onSpikeHit,
      null,
      this
    );

    this.physics.add.overlap(
      this.rhino.getSprite(),
      this.spawnManager.getAnimalsGroup(),
      this.onAnimalHit,
      null,
      this
    );

    this.physics.add.overlap(
      this.rhino.getSprite(),
      this.spawnManager.getTowersGroup(),
      this.onTowerHit,
      null,
      this
    );

    this.physics.add.overlap(
      this.rhino.getSprite(),
      this.spawnManager.getDartsGroup(),
      this.onDartHit,
      null,
      this
    );
  }

  onTowerHit(rhino, tower) {
    if (this.gameOver || this.won) return;

    if (this.rhino.dashState === 'active') {
      // Dash derruba a torre — para de atirar na hora
      this.audio.playBreak();
      this.createExplosion(tower.x, tower.y + 60);
      tower.deactivate();
    } else {
      if (this.invincible) return; // modo debug: atravessa sem morrer
      this.endGame(false, 'tower');
    }
  }

  onDartHit(rhino, dart) {
    if (this.gameOver || this.won) return;

    if (this.rhino.dashState === 'active') {
      // O dardo estoura no chifre: mini flash sem shake de câmera
      const flash = this.add.image(dart.x, dart.y, 'explosion-flash')
        .setScale(0.35).setDepth(6);
      this.tweens.add({
        targets: flash,
        scale: 1.2,
        alpha: 0,
        duration: 200,
        onComplete: () => flash.destroy(),
      });
      dart.deactivate();
    } else {
      if (this.invincible) { dart.deactivate(); return; } // debug
      this.endGame(false, 'dart');
    }
  }

  onWallHit(rhino, wall) {
    if (this.gameOver || this.won) return;
    if (wall.broken) return;

    const bounds = wall.getCrackBounds();
    // Rhino sprite origin is (0.5, 1): y is the bottom edge
    const rhinoTop = rhino.y - rhino.displayHeight;
    const rhinoBottom = rhino.y;

    const aligned = rhinoBottom > bounds.top && rhinoTop < bounds.bottom;
    const isDashing = this.rhino.dashState === 'active';

    if (aligned && isDashing) {
      wall.break();
      this.runWallsBroken++;
      const crackCenterY = (bounds.top + bounds.bottom) / 2;
      this.audio.playBreak();
      this.createExplosion(wall.x, crackCenterY);
      this.createBreakParticles(wall.x, crackCenterY);
    } else {
      if (this.invincible) return; // debug: atravessa a parede
      this.endGame(false, 'wall');
    }
  }

  onSpikeHit(rhino, spike) {
    if (this.gameOver || this.won) return;
    if (this.invincible) return; // debug
    this.endGame(false, 'spike');
  }

  onAnimalHit(rhino, animal) {
    if (this.gameOver || this.won) return;
    if (animal.knockedOut) return;

    const isDashing = this.rhino.dashState === 'active';
    if (isDashing) {
      animal.knockback();
      this.runAnimalsHit++;
      this.audio.playSqueal();
      this.createExplosion(animal.x, animal.y);
    } else {
      if (this.invincible) return; // debug
      this.endGame(false, 'animal');
    }
  }

  createExplosion(x, y) {
    const flash = this.add.image(x, y, 'explosion-flash')
      .setScale(0.5).setDepth(6);
    this.tweens.add({
      targets: flash,
      scale: 2.5,
      alpha: 0,
      duration: 300,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });

    // radial debris burst
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 + Phaser.Math.FloatBetween(-0.3, 0.3);
      const speed = Phaser.Math.Between(150, 300);
      const chunk = this.add.image(x, y, 'debris-chunk')
        .setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
      this.physics.add.existing(chunk);
      chunk.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed - 150);
      chunk.body.setAngularVelocity(Phaser.Math.Between(-500, 500));
      this.tweens.add({
        targets: chunk,
        alpha: 0,
        duration: 500,
        onComplete: () => chunk.destroy(),
      });
    }

    this.cameras.main.shake(150, 0.03);
  }

  createBreakParticles(x, y) {
    for (let i = 0; i < 10; i++) {
      const px = x + Phaser.Math.Between(-20, 20);
      const py = y + Phaser.Math.Between(-50, 50);
      const particle = this.add.image(px, py, 'debris-chunk')
        .setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2))
        .setScale(Phaser.Math.FloatBetween(0.7, 1.4));
      this.physics.add.existing(particle);
      particle.body.setVelocity(
        Phaser.Math.Between(-200, 200),
        Phaser.Math.Between(-300, -100)
      );
      particle.body.setAngularVelocity(Phaser.Math.Between(-500, 500));
      this.tweens.add({
        targets: particle,
        alpha: 0,
        duration: 600,
        onComplete: () => particle.destroy(),
      });
    }
  }

  createDashIcon() {
    const baseIconX = Constants.GAME_WIDTH - Constants.HUD_MARGIN - 60;
    const baseIconY = Constants.HUD_MARGIN + 30;

    // Texturas 2x: exibe a 1/2 (o setCrop do updateDashIcon usa px de textura)
    const iconScale = 1 / Constants.ART_RASTER_SCALE;
    this.dashIconEmpty = this.add.sprite(baseIconX, baseIconY, 'rhino-face-empty');
    this.dashIconEmpty.setOrigin(0.5, 0.5).setScale(iconScale);
    this.dashIconEmpty.setScrollFactor(0);
    this.dashIconEmpty.setDepth(100);

    this.dashIconFull = this.add.sprite(baseIconX, baseIconY, 'rhino-face-full');
    this.dashIconFull.setOrigin(0.5, 0.5).setScale(iconScale);
    this.dashIconFull.setScrollFactor(0);
    this.dashIconFull.setDepth(101);
  }

  updateDashIcon() {
    const progress = this.rhino.getDashCooldownRatio();
    // setCrop opera em px de TEXTURA (rasterizada a 2x)
    const size = Constants.DASH_ICON_SIZE * Constants.ART_RASTER_SCALE;
    const h = size * progress;
    const y = size - h;

    this.dashIconFull.setCrop(0, y, size, h);
  }

  update(time, delta) {
    if (!this.started || this.gameOver || this.won) return;

    this.bgClouds.tilePositionX = this.cameras.main.scrollX * 0.05 + time * 0.005;
    this.bgMountains.tilePositionX = this.cameras.main.scrollX * 0.06;
    const farX = this.cameras.main.scrollX * 0.15;
    this.bgFarA.tilePositionX = farX;
    this.bgFarB.tilePositionX = farX;
    const nearX = this.cameras.main.scrollX * 0.4;
    this.bgNearA.tilePositionX = nearX;
    this.bgNearB.tilePositionX = nearX;

    this.updateAtmosphere(time, delta);

    this.rhino.update(time, delta);

    // Wind streaks while dashing
    if (this.rhino.dashState === 'active') {
      const sprite = this.rhino.getSprite();
      for (let i = 0; i < 3; i++) {
        this.windEmitter.emitParticleAt(
          sprite.x - Phaser.Math.Between(20, 60),
          sprite.y - Phaser.Math.Between(8, 56)
        );
      }
    }
    this.furySystem.update(this.rhino);
    this.audio.setIntensity(this.rhino.getFuryRatio());
    // Animais leem o multiplicador do tier vigente por frame (padrão live)
    Constants.TIER_STATE.animalSpeedMult =
      Constants.getTierFor(this.rhino.getSprite().x).animalSpeedMult;
    this.spawnManager.update(this.cameras.main);
    this.updateDashIcon();

    this.updateScoreDisplay();

    // Portão dos 800m (1x por corrida): cruza SEM PARAR — a fuga conta na
    // hora e o modo infinito começa na mesma passada
    if (!this.gateReached && this.rhino.getSprite().x >= Constants.WIN_DISTANCE_PX) {
      this.gateReached = true;
      this.crossGate();
    } else if (this.gateReached && this.rhino.getSprite().x >= Constants.WORLD_END_PX) {
      // Fim físico do mundo (10.000m): ninguém corre para sempre
      this.legend = true;
      this.endGame(true);
    }

    if (this.rhino.getSprite().y > Constants.GAME_HEIGHT + 100) {
      if (this.invincible) {
        // debug: volta para o ar em vez de morrer de queda
        this.rhino.getSprite().body.reset(this.rhino.getSprite().x, 400);
      } else {
        this.endGame(false, 'fall');
      }
    }
  }

  // Cruzou os 800m: NÃO para a corrida (parar ali quebraria o ritmo).
  // Cruzar JÁ é a fuga — conta win/medalha/stats — e o modo infinito
  // começa na mesma passada; a vitória formal fica para o fim do mundo.
  crossGate() {
    const fill = document.getElementById('progress-fill');
    fill.style.width = '100%';
    fill.classList.add('infinite');
    document.getElementById('progress-infinity').hidden = false;
    this.progressInfinite = true;

    this.escaped = true;
    this.winCounted = true;
    StorageManager.addWin();
    StatsSystem.send(); // garante a fuga no servidor mesmo se fechar a aba

    // Aviso rápido fixo na tela, sem modal: a corrida não espera
    const toast = this.add.text(640, 300, '🗽 VOCÊ ESCAPOU!', {
      fontFamily: '"Arial Black", Arial, sans-serif',
      fontSize: '44px',
      color: '#ffd700',
      stroke: '#5e3618',
      strokeThickness: 7,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(60);
    this.tweens.add({
      targets: toast,
      y: 230,
      alpha: 0,
      duration: 2200,
      ease: 'Cubic.easeOut',
      onComplete: () => toast.destroy(),
    });
  }

  updateScoreDisplay() {
    document.getElementById('score').textContent = this.rhino.getDistance();
    const record = StorageManager.getRecord();
    document.getElementById('record').textContent = record;

    // Barra de progresso da fuga (0–800m; as marcas são os tiers).
    // Pós-portão ela já ficou dourada com ∞ (ver crossGate) — não mexe mais.
    if (!this.gateReached) {
      const pct = Math.min(100, (this.rhino.getSprite().x / Constants.WIN_DISTANCE_PX) * 100);
      document.getElementById('progress-fill').style.width = `${pct}%`;
    }
  }

  // cause: 'wall' | 'spike' | 'animal' | 'dart' | 'tower' | 'fall' (só derrotas)
  endGame(won, cause = null) {
    if (this.gameOver) return; // reentrada dobraria mortes/envios
    this.gameOver = true;
    this.won = won;
    this.deathCause = cause;
    this.physics.pause();

    this.audio.stopMusic();
    if (won) this.audio.playFanfare();
    else this.audio.playDeathSting();

    const distance = this.rhino.getDistance();
    const isNewRecord = StorageManager.isNewRecord(distance);
    // Antes do saveRecord, senão "tinha recorde anterior" seria sempre true
    const hadPreviousRecord = StorageManager.getRecord() > 0;
    StorageManager.saveRecord(distance);
    this.finalDistance = distance; // usado pelo botão Compartilhar

    // Overlays são só PREENCHIDOS aqui; a exibição fica no showEndOverlay
    // (o fim por dardo espera o rino adormecer; a vitória, a cutscene)
    if (won) {
      document.getElementById('win-final-score').textContent = distance;
      if (this.legend) {
        document.getElementById('win-record-message').textContent =
          '🏆 LENDA! Você chegou ao fim do mundo!';
      } else if (isNewRecord) {
        document.getElementById('win-record-message').textContent = '🎉 NOVO RECORDE!';
      } else {
        document.getElementById('win-record-message').textContent = 'Você escapou!';
      }
    } else {
      document.getElementById('game-over-title').textContent =
        cause === 'dart' ? 'TRANQUILIZADO! 💤' : 'GAME OVER';
      document.getElementById('final-score').textContent = distance;
      if (isNewRecord) {
        document.getElementById('record-message').textContent = '🎉 NOVO RECORDE!';
      } else {
        const record = StorageManager.getRecord();
        document.getElementById('record-message').textContent = `Recorde: ${record}m`;
      }
      // Morreu no modo infinito: a fuga em si já estava garantida
      document.getElementById('gate-escape-message').textContent =
        this.escaped ? `🗽 Você escapou e ainda correu até ${distance}m!` : '';
    }

    // Medalhas: avaliar e anunciar (persistidas — "Jogar Novamente" recarrega)
    const animalsTotal = StorageManager.addAnimalsHit(this.runAnimalsHit);
    const newMedals = MedalSystem.evaluateRun({
      distance, won, isNewRecord, hadPreviousRecord,
      escaped: this.escaped,
      wallsBroken: this.runWallsBroken, animalsTotal,
    });
    if (newMedals.length) {
      const id = won ? 'win-medal-message' : 'medal-message';
      document.getElementById(id).textContent =
        '🏅 Medalha nova: ' + newMedals.map((m) => `${m.emoji} ${m.name}`).join(' · ');
      if (!won) this.audio.playFanfare(); // na vitória a fanfarra já tocou acima
    }

    if (LeaderboardSystem.shouldSubmit(distance)) {
      this.submitScore(distance); // fire-and-forget: rede nunca trava o fim de jogo
    }

    // Telemetria: acumula os totais locais e espelha no Firestore
    const runS = Math.min(7200, Math.max(0,
      Math.round((Date.now() - (this.runStartedAt || Date.now())) / 1000)));
    StorageManager.addPlayTimeS(runS);
    StorageManager.addRun(distance); // histórico das últimas 50 execuções
    if (won && !this.winCounted) StorageManager.addWin(); // o portão já contou
    if (!won) StorageManager.addDeath(Constants.getTierIndex(this.rhino.getSprite().x), cause || 'wall');
    // Acumula aparelho/local/versão desta corrida ANTES do envio (o send
    // roda várias vezes por sessão; o recordRun, uma por corrida)
    StatsSystem.recordRun().then(() => StatsSystem.send());

    // Nº da corrida que acabou de terminar (o addAttempt do startRun já contou)
    const attemptId = won ? 'win-attempt-message' : 'attempt-message';
    document.getElementById(attemptId).textContent =
      `Tentativa nº ${StorageManager.getAttempts()}`;

    if (won) {
      this.playVictoryCutscene();
    } else if (cause === 'dart') {
      this.playTranqSleep();
      this.time.delayedCall(600, () => this.showEndOverlay());
    } else {
      this.showEndOverlay();
    }
  }

  // Comemoração da fuga (~4s, pulável com 1 toque). Física pausada — a
  // coreografia roda só em tweens/timers/particles, que continuam vivos.
  playVictoryCutscene() {
    this.cutsceneTweens = [];
    this.cutsceneTimers = [];
    const sprite = this.rhino.getSprite();
    sprite.anims.pause();

    // Skip: o handler normal de input early-returna com won=true
    this.cutsceneSkip = () => this.endVictoryCutscene();
    this.input.once('pointerdown', this.cutsceneSkip);

    // Freada: poeira nos pés
    for (let i = 0; i < 8; i++) {
      const p = this.add.image(
        sprite.x - Phaser.Math.Between(0, 50),
        Constants.GAME_HEIGHT - 100 + Phaser.Math.Between(-6, 4),
        'debris-chunk'
      ).setTint(0xb08454).setDepth(5);
      this.cutsceneTweens.push(this.tweens.add({
        targets: p,
        x: p.x - Phaser.Math.Between(30, 90),
        y: p.y - Phaser.Math.Between(10, 40),
        alpha: 0,
        duration: 500,
        onComplete: () => p.destroy(),
      }));
    }

    // 3 pulinhos com squash & stretch
    this.cutsceneTweens.push(this.tweens.add({
      targets: sprite,
      y: sprite.y - 90,
      duration: 280,
      yoyo: true,
      repeat: 2,
      ease: 'Quad.easeOut',
    }));
    this.cutsceneTweens.push(this.tweens.add({
      targets: sprite,
      scaleY: 1.12,
      scaleX: 0.92,
      duration: 280,
      yoyo: true,
      repeat: 2,
      ease: 'Quad.easeOut',
    }));

    // Confete em coordenadas de tela (cai por ~2,5s)
    this.confettiEmitter = this.add.particles(0, 0, 'confetti', {
      x: { min: 0, max: Constants.GAME_WIDTH },
      y: -10,
      speedY: { min: 150, max: 300 },
      speedX: { min: -40, max: 40 },
      rotate: { min: 0, max: 360 },
      scale: { min: 0.7, max: 1.3 },
      lifespan: 2600,
      quantity: 4,
      frequency: 40,
      tint: [0xff4444, 0xffcc00, 0x4ecdc4, 0x6aae3a, 0xff9944, 0xffffff],
    }).setScrollFactor(0).setDepth(150);
    this.cutsceneTimers.push(this.time.delayedCall(2500, () => this.confettiEmitter.stop()));

    // Fogos: flashes coloridos no alto, escalonados (sem debris/shake)
    const fireworkTints = [0xff5555, 0xffd94a, 0x4ecdc4, 0xbb77ff, 0x6aae3a];
    [600, 1100, 1500, 1900, 2300].forEach((delay, i) => {
      this.cutsceneTimers.push(this.time.delayedCall(delay, () => {
        const fx = this.add.image(
          Phaser.Math.Between(200, Constants.GAME_WIDTH - 200),
          Phaser.Math.Between(80, 300),
          'explosion-flash'
        ).setScrollFactor(0).setDepth(151).setScale(0.5).setTint(fireworkTints[i]);
        this.tweens.add({
          targets: fx,
          scale: 3,
          alpha: 0,
          duration: 500,
          ease: 'Cubic.easeOut',
          onComplete: () => fx.destroy(),
        });
      }));
    });

    const banner = document.getElementById('victory-banner');
    banner.textContent = this.legend ? '🏆 LENDA!' : '🎉 LIVRE!';
    banner.hidden = false;

    this.cutsceneTimers.push(this.time.delayedCall(4000, () => this.endVictoryCutscene()));
  }

  // Fim natural OU skip: mata tweens/timers/emitter e abre o overlay.
  // Idempotente — o delayedCall final e o toque podem correr juntos.
  endVictoryCutscene() {
    if (this.cutsceneDone) return;
    this.cutsceneDone = true;

    this.input.off('pointerdown', this.cutsceneSkip);
    this.cutsceneTweens.forEach((t) => t.stop());
    this.cutsceneTimers.forEach((t) => t.remove(false));
    if (this.confettiEmitter) this.confettiEmitter.destroy();
    document.getElementById('victory-banner').hidden = true;

    this.showEndOverlay();
  }

  showEndOverlay() {
    document.getElementById(this.won ? 'game-win' : 'game-over').style.display = 'block';
  }

  // O rino apaga: tint azulado e tomba devagar antes do overlay.
  // Física pausada — tweens e timers da cena continuam rodando.
  playTranqSleep() {
    const sprite = this.rhino.getSprite();
    sprite.anims.pause();
    sprite.setTint(0x9db8ff);
    this.tweens.add({ targets: sprite, angle: -80, duration: 550, ease: 'Quad.easeIn' });
  }
}
