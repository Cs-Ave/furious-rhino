import { Constants } from '../utils/Constants.js';
import { StorageManager } from '../utils/StorageManager.js';
import { Rhino } from '../entities/Rhino.js';
import { SpawnManager } from '../systems/SpawnManager.js';
import { FurySystem } from '../systems/FurySystem.js';
import { AudioSystem } from '../systems/AudioSystem.js';
import { initTuningPanel } from '../systems/TuningPanel.js';
import { LeaderboardSystem } from '../systems/LeaderboardSystem.js';
import { MedalSystem, MEDALS } from '../systems/MedalSystem.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.physics.world.setFPS(60);
    // Ceiling-only world bounds: stops the infinite jump from flying the
    // rhino out of the scene (no side walls, no world floor)
    this.physics.world.setBounds(
      0, 0, Constants.WIN_DISTANCE_PX + 1000, Constants.GAME_HEIGHT,
      false, false, true, false
    );
    this.cameras.main.setBounds(0, 0, Constants.WIN_DISTANCE_PX + 1000, Constants.GAME_HEIGHT);
    this.cameras.main.setLerp(0.1, 0);

    this.createBackground();

    this.rhino = new Rhino(this, 100, Constants.GAME_HEIGHT - 100);
    this.spawnManager = new SpawnManager(this);
    this.furySystem = new FurySystem(this);

    this.createGround();
    this.setupInput();
    this.setupCollisions();
    this.createDashIcon();

    this.gameOver = false;
    this.won = false;
    // Contadores da corrida atual (critérios de medalha)
    this.runWallsBroken = 0;
    this.runAnimalsHit = 0;

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

    // Última posição conhecida no ranking (cacheada — zero rede no load)
    const rank = StorageManager.getLastRank();
    if (rank > 0) {
      document.getElementById('start-rank-pos').textContent = rank;
      document.getElementById('start-rank').hidden = false;
    }
    this.setupMedalStrip();

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
    document.getElementById('nickname-skip').addEventListener('click', () => this.closeNicknameModal(false));
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

  // Folha nativa de compartilhar no celular; sem ela, copia o convite
  async shareResult() {
    const url = location.origin + location.pathname; // sem ?debug etc.
    const text = `Corri ${this.finalDistance}m fugindo do zoológico no FURIOUS RHINO! 🦏 Consegue me vencer?`;
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
    // "Agora não": bestSent não avança — repergunta no próximo recorde
    if (submit && this.pendingScore) {
      LeaderboardSystem.submit(this.pendingScore).then((ok) => {
        if (ok) this.showOnlineStatus('🌍 Enviado ao ranking mundial!');
      });
    }
  }

  startRun() {
    if (this.startTriggered) return;
    this.startTriggered = true;
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
    this.add.image(640, 360, 'bg-sky').setScrollFactor(0).setDepth(-20);
    // Fixed-to-camera tileSprites scrolled manually in update() — avoids
    // creating world-width objects for a 32000px level
    this.bgFar = this.add.tileSprite(640, 410, 1280, 420, 'bg-far')
      .setScrollFactor(0).setDepth(-19);
    this.bgNear = this.add.tileSprite(640, 490, 1280, 260, 'bg-near')
      .setScrollFactor(0).setDepth(-18);
    this.bgClouds = this.add.tileSprite(640, 130, 1280, 200, 'bg-clouds')
      .setScrollFactor(0).setDepth(-19.5);
  }

  createGround() {
    const width = Constants.WIN_DISTANCE_PX + 4000;
    const ground = this.add.tileSprite(width / 2, Constants.GAME_HEIGHT - 50, width, 100, 'ground');
    this.physics.add.existing(ground, true);

    this.physics.add.collider(this.rhino.getSprite(), ground);

    // Animais terrestres pisam no chão (pulos do macaco/zebra com arco real);
    // abatidos pelo dash e o pássaro atravessam e reciclam fora da tela
    this.physics.add.collider(
      this.spawnManager.getAnimalsGroup(), ground, null,
      (animal) => animal.active && !animal.knockedOut && animal.animalType !== 'bird',
      this
    );
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
      this.endGame(false, 'wall');
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
      this.endGame(false, 'wall');
    }
  }

  onSpikeHit(rhino, spike) {
    if (this.gameOver || this.won) return;
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

    this.dashIconEmpty = this.add.sprite(baseIconX, baseIconY, 'rhino-face-empty');
    this.dashIconEmpty.setOrigin(0.5, 0.5);
    this.dashIconEmpty.setScrollFactor(0);
    this.dashIconEmpty.setDepth(100);

    this.dashIconFull = this.add.sprite(baseIconX, baseIconY, 'rhino-face-full');
    this.dashIconFull.setOrigin(0.5, 0.5);
    this.dashIconFull.setScrollFactor(0);
    this.dashIconFull.setDepth(101);
  }

  updateDashIcon() {
    const progress = this.rhino.getDashCooldownRatio();
    const h = Constants.DASH_ICON_SIZE * progress;
    const y = Constants.DASH_ICON_SIZE - h;

    this.dashIconFull.setCrop(0, y, Constants.DASH_ICON_SIZE, h);
  }

  update(time, delta) {
    if (!this.started || this.gameOver || this.won) return;

    this.bgClouds.tilePositionX = this.cameras.main.scrollX * 0.05 + time * 0.005;
    this.bgFar.tilePositionX = this.cameras.main.scrollX * 0.15;
    this.bgNear.tilePositionX = this.cameras.main.scrollX * 0.4;

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

    if (this.rhino.getSprite().x >= Constants.WIN_DISTANCE_PX) {
      this.endGame(true);
    }

    if (this.rhino.getSprite().y > Constants.GAME_HEIGHT + 100) {
      this.endGame(false, 'fall');
    }
  }

  updateScoreDisplay() {
    document.getElementById('score').textContent = this.rhino.getDistance();
    const record = StorageManager.getRecord();
    document.getElementById('record').textContent = record;
  }

  // cause: 'wall' | 'spike' | 'animal' | 'dart' | 'fall' (só derrotas)
  endGame(won, cause = null) {
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
      if (isNewRecord) {
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
    }

    // Medalhas: avaliar e anunciar (persistidas — "Jogar Novamente" recarrega)
    const animalsTotal = StorageManager.addAnimalsHit(this.runAnimalsHit);
    const newMedals = MedalSystem.evaluateRun({
      distance, won, isNewRecord, hadPreviousRecord,
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

    if (!won && cause === 'dart') {
      this.playTranqSleep();
      this.time.delayedCall(600, () => this.showEndOverlay());
    } else {
      this.showEndOverlay();
    }
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
