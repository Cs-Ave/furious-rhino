import { Constants } from '../utils/Constants.js';
import { StorageManager } from '../utils/StorageManager.js';
import { Rhino } from '../entities/Rhino.js';
import { TimedHazard } from '../entities/TimedHazard.js';
import { SpawnManager } from '../systems/SpawnManager.js';
import { FurySystem } from '../systems/FurySystem.js';
import { BossFight } from '../systems/BossFight.js';
import { AudioSystem } from '../systems/AudioSystem.js';
import { initTuningPanel } from '../systems/TuningPanel.js';
import { LeaderboardSystem } from '../systems/LeaderboardSystem.js';
import { ScoreSystem } from '../systems/ScoreSystem.js';
import { MedalSystem } from '../systems/MedalSystem.js';
import { SkinSystem, SKINS } from '../systems/SkinSystem.js';
import { StatsSystem } from '../systems/StatsSystem.js';
import { NotifySystem } from '../systems/NotifySystem.js';
import { NewsSystem } from '../systems/NewsSystem.js';
import { ChallengeSystem } from '../systems/ChallengeSystem.js';

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

    // v1.8: skins — o retro-scan concede a Catisquick a quem já fez a façanha
    // nas últimas 50 corridas; a skin efetiva é resolvida a cada boot (o
    // "Jogar Novamente" recarrega a página, então toda corrida nasce válida).
    // v1.8.1: desbloqueio no boot vira notícia no Diário da Fuga (antes era
    // um aviso órfão — ninguém ficava sabendo)
    for (const s of [...SkinSystem.migrateFromRuns(), ...SkinSystem.evaluateTotals()]) {
      NewsSystem.push(`skin:${s.id}`, `🎨 Você desbloqueou a skin ${s.name}!`, 'gold');
    }
    this.skin = SkinSystem.resolveEquipped();
    this.rhino = new Rhino(this, 100, Constants.GROUND_TOP, this.skin);
    // v1.8.4: a abertura roteirizada é uma LIÇÃO — quem já correu algumas
    // vezes não precisa mais dela (e ficava com 190m de pista vazia, sem
    // nada para fazer nem pontuar). Mesma régua das dicas da abertura.
    const skipOpening = StorageManager.getAttempts() >= Constants.VETERAN_MIN_ATTEMPTS;
    this.spawnManager = new SpawnManager(this, { skipOpening });
    this.furySystem = new FurySystem(this);

    this.createGround();

    // Marco visual da fuga: o portão fica exatamente na linha dos 1000m.
    // v1.7: ele amanhece BLINDADO (o boss) — full-height, canvas 240x620.
    // Guardado numa referência porque o BossFight troca as texturas e o
    // crossGate o explode.
    this.gateSprite = this.add.image(Constants.WIN_DISTANCE_PX, Constants.GROUND_TOP, 'zoo-gate-armored-3')
      .setOrigin(0.5, 1).setDepth(-1);
    // A luta do portão é a primeira entrada da LISTA de lutas: o BossFight
    // é paramétrico e tudo que é do portão vive nesta `def` (âncora, camadas,
    // arte, contadores, festa da vitória). Bosses novos entram em bossFights
    // sem tocar no sistema. `this.bossFight` continua sendo o do portão —
    // telemetria (fightMs) e os e2e leem por esse nome.
    this.bossFight = new BossFight(this, this.gateSprite, {
      id: 'gate',
      anchorX: Constants.WIN_DISTANCE_PX,
      layers: Constants.BOSS_LAYERS,
      rifle: Constants.BOSS_RIFLE, // MESMA referência: sliders do ?debug=1 vivos
      arenaPx: Constants.BOSS_ARENA_PX,
      gateFaceHalf: Constants.BOSS_GATE_FACE_HALF,
      texturePrefix: 'zoo-gate-armored',
      hunterTexture: 'boss-hunter',
      hunterAimTexture: 'boss-hunter-aim',
      camLockOffsetPx: 1040,
      layersProp: 'runBossLayers',
      bouncesProp: 'runBossBounces',
      enrageMs: 0, // o portão nunca enfureceu — e continua assim
      hints: { intro: '⚔️ O PORTÃO ESTÁ BLINDADO!', how: '💥 INVISTA na fresta que brilha!' },
      hintStorageKey: null, // o portão usa o contador legado abaixo
      encounters: {
        get: () => StorageManager.getBossEncounters(),
        add: () => StorageManager.addBossEncounter(),
      },
      // v1.8.5: além do gatilho legado, o "já estou depois da âncora" — um
      // teleporte de debug direto para o Cerco/Guardião cruza o portão DENTRO
      // do mesmo frame, ANTES do check do crossGate no update; sem esta
      // guarda o portão dormente acordava e clampava o rino de volta
      isBypassed: (scene) => scene.gateReached ||
        scene.rhino.getSprite().x >= Constants.WIN_DISTANCE_PX,
      onDefeat: (fight) => fight.scene.crossGate(),
    });
    // v1.8.7 — BOSS 2, a MURALHA (2000m): a Operação Muralha fechou o
    // viaduto com viaturas empilhadas + torre de holofote. Mesma anatomia do
    // portão (canvas 240x620, contato por banda + clamp); a vitória NÃO
    // encerra nada — a barricada desaba e a Brecha começa. O CERCO, antes
    // declarado sem wiring, virou a Barreira da Escavação (v1.8.10, abaixo).
    this.boss2Sprite = this.add.image(Constants.BOSS2_ANCHOR_PX, Constants.GROUND_TOP, 'muralha-gate-4')
      .setOrigin(0.5, 1).setDepth(-1);
    this.boss2Fight = new BossFight(this, this.boss2Sprite, {
      id: 'muralha',
      anchorX: Constants.BOSS2_ANCHOR_PX,
      layers: Constants.BOSS2_LAYERS, // ['high','ground','mid','high'] — abre no ALTO (exame do D3)
      rifle: Constants.BOSS_MURALHA, // MESMA referência: sliders do ?debug=1 vivos
      arenaPx: Constants.BOSS_ARENA_PX,
      gateFaceHalf: Constants.BOSS_GATE_FACE_HALF,
      texturePrefix: 'muralha-gate',
      hunterTexture: 'muralha-hunter',
      hunterAimTexture: 'muralha-hunter-aim',
      camLockOffsetPx: 1040,
      layersProp: 'runBoss2Layers',
      bouncesProp: 'runBoss2Bounces',
      enrageMs: Constants.MURALHA_ENRAGE_MS, // luta arrastada desce UM degrau de cadência
      rasanteStyle: 'k9', // o rasante anti-camping é um dardo-cão (k9-projectile)
      hints: { intro: '🚧 A MURALHA! A CIDADE FECHOU O VIADUTO!', how: '💥 INVISTA na fresta que brilha!' },
      hintStorageKey: 'furious_rhino_muralha_seen',
      deathCause: 'boss2', // herda a POSIÇÃO dos 2000m — a série do funil continua
      // Rino já além da âncora sem a luta ter acontecido: só possível em
      // invencível de debug ou teleporte — o boss recolhe sem festa
      isBypassed: (scene) => scene.rhino.getSprite().x >= Constants.BOSS2_ANCHOR_PX,
      onDefeat: (fight) => fight.scene.defeatMuralha(),
    });

    // v1.8.10 — "AS AREIAS DO TEMPO": os DOIS combates do deserto.
    // A BARREIRA DA ESCAVAÇÃO (3650m): o CERCO declarado desde a v1.8.5
    // finalmente ganha wiring — vira o miniboss que fecha o Sítio da
    // Escavação. Mecânica 100% das tabelas CERCO_* (sliders vivos), paleta
    // nova `escavacao` nas texturas e o Capturador REUSA o rig boss2-hunter.
    this.cercoSprite = this.add.image(Constants.CERCO_ANCHOR_PX, Constants.GROUND_TOP, 'cerco-gate-4')
      .setOrigin(0.5, 1).setDepth(-1);
    this.cercoFight = new BossFight(this, this.cercoSprite, {
      id: 'cerco',
      anchorX: Constants.CERCO_ANCHOR_PX,
      layers: Constants.CERCO_LAYERS, // ['mid','ground','high','mid'] — abre no MEIO
      rifle: Constants.CERCO_NET, // MESMA referência: sliders do ?debug=1 vivos
      arenaPx: Constants.BOSS_ARENA_PX,
      gateFaceHalf: Constants.BOSS_GATE_FACE_HALF,
      texturePrefix: 'cerco-gate',
      hunterTexture: 'boss2-hunter',        // REUSO: o rig do Capturador (v1.8.5)
      hunterAimTexture: 'boss2-hunter-aim',
      camLockOffsetPx: 1040,
      layersProp: 'runCercoLayers',
      bouncesProp: 'runCercoBounces',
      // 45s = o enrage padrão da casa. LITERAL de propósito: MURALHA_ENRAGE_MS
      // é da Muralha (o agente B migra a constante — depois um dos dois morre)
      enrageMs: 45000,
      rasanteStyle: 'k9', // o rasante anti-camping segue sendo o cão de choque
      hints: { intro: '🕸️ A BARREIRA DA ESCAVAÇÃO!', how: '💥 INVISTA na fresta que brilha!' },
      hintStorageKey: 'furious_rhino_cerco_seen',
      deathCause: 'cerco', // causa PRÓPRIA (rules já com 17 chaves — agente B)
      isBypassed: (scene) => scene.rhino.getSprite().x >= Constants.CERCO_ANCHOR_PX,
      onDefeat: (fight) => fight.scene.defeatCerco(),
    });

    // O FARAÓ DE BRONZE (4700m): o defensor da muralha de arenito no fim da
    // Necrópole — o exame mais agressivo do jogo POR TABELA (5 camadas,
    // cadência 1200→700ms, Espelho de Rá, Mergulho de Hórus, enrage 30s).
    this.faraoSprite = this.add.image(Constants.FARAO_ANCHOR_PX, Constants.GROUND_TOP, 'farao-gate-5')
      .setOrigin(0.5, 1).setDepth(-1);
    this.faraoFight = new BossFight(this, this.faraoSprite, {
      id: 'farao',
      anchorX: Constants.FARAO_ANCHOR_PX,
      layers: Constants.FARAO_LAYERS, // 5 camadas — abre no MEIO (3ª gramática)
      rifle: Constants.BOSS_FARAO, // MESMA referência: sliders do ?debug=1 vivos
      arenaPx: Constants.BOSS_ARENA_PX,
      gateFaceHalf: Constants.BOSS_GATE_FACE_HALF,
      texturePrefix: 'farao-gate',
      hunterTexture: 'farao-hunter',        // rig próprio: máscara de Anúbis
      hunterAimTexture: 'farao-hunter-aim',
      camLockOffsetPx: 1040,
      layersProp: 'runFaraoLayers',
      bouncesProp: 'runFaraoBounces',
      enrageMs: Constants.FARAO_ENRAGE_MS, // 30s — quem chegou aqui executa rápido
      rasanteStyle: 'falcao', // Mergulho de Hórus: projétil-falcão rente ao chão
      hints: { intro: '🏺 O FARAÓ DE BRONZE GUARDA A MURALHA!', how: '💥 INVISTA na fresta que brilha!' },
      hintStorageKey: 'furious_rhino_farao_seen',
      deathCause: 'farao',
      isBypassed: (scene) => scene.rhino.getSprite().x >= Constants.FARAO_ANCHOR_PX,
      onDefeat: (fight) => fight.scene.defeatFarao(),
    });

    // v1.8.5 — BOSS 3, o CAÇADOR-MOR (fim do mundo): a última cerca. Vencer
    // É virar LENDA — o onDefeat entrega a cutscene que já existia; o gatilho
    // legado x >= WORLD_END_PX segue como rede de segurança para bypass.
    this.boss3Sprite = this.add.image(Constants.BOSS3_ANCHOR_PX, Constants.GROUND_TOP, 'boss3-gate-5')
      .setOrigin(0.5, 1).setDepth(-1);
    this.boss3Fight = new BossFight(this, this.boss3Sprite, {
      id: 'guardiao',
      anchorX: Constants.BOSS3_ANCHOR_PX,
      layers: Constants.BOSS3_LAYERS,
      rifle: Constants.BOSS3_RIFLE, // MESMA referência: sliders do ?debug=1 vivos
      arenaPx: Constants.BOSS_ARENA_PX,
      gateFaceHalf: Constants.BOSS_GATE_FACE_HALF,
      texturePrefix: 'boss3-gate',
      hunterTexture: 'boss3-hunter',
      hunterAimTexture: 'boss3-hunter-aim',
      camLockOffsetPx: 1040,
      layersProp: 'runBoss3Layers',
      bouncesProp: 'runBoss3Bounces',
      enrageMs: 0, // 5 camadas já são a prova — sem relógio por cima
      hints: { intro: '🏹 A ÚLTIMA CERCA DO MUNDO!', how: '💥 INVISTA na fresta que brilha!' },
      hintStorageKey: 'furious_rhino_boss3_seen',
      deathCause: 'boss3', // o Caçador-Mor também usa tranquilizante
      isBypassed: (scene) => scene.rhino.getSprite().x >= Constants.BOSS3_ANCHOR_PX,
      onDefeat: (fight) => {
        // A festa é a cutscene de LENDA que sempre existiu
        fight.scene.legend = true;
        fight.scene.endGame(true);
      },
    });

    // Ordem por âncora (portão 40000 → Muralha 80000 → Cerco 146000 →
    // Faraó 188000 → Guardião 400000); o update itera todos por frame.
    this.bossFights = [this.bossFight, this.boss2Fight,
      this.cercoFight, this.faraoFight, this.boss3Fight];
    this.createSectorArches();
    this.createTrackMarks();

    // v1.8.7 — armadilhas dos distritos: pool de 4 TimedHazard num ARRAY
    // plano (nunca physics group: a entidade liga/desliga o próprio body
    // estático por timer, e um physics group reescreveria isso no add).
    // ARMADILHA: nem add.group() serve — o TimedHazard usa `this.on` como
    // flag de fase, o que SOMBREIA EventEmitter.on, e Group.add chama
    // child.on(DESTROY, ...) → TypeError. O overlap do Arcade aceita array
    // e lê o conteúdo ao vivo, então o array cobre tudo que o grupo daria.
    // O spawn é por POSIÇÃO fixa (HAZARD_SPOTS), não pela roleta do
    // SpawnManager — armadilha é ARQUITETURA do distrito.
    this.hazards = [];
    for (let i = 0; i < 4; i++) {
      const hz = new TimedHazard(this, -500, Constants.GROUND_TOP);
      hz.deactivate();
      this.hazards.push(hz);
    }
    this.nextHazardIdx = 0;

    // Polilinha da superfície das rampas (elas não têm corpo, então o debug
    // de hitboxes do TuningPanel não as mostraria)
    this.terrainDebug = this.add.graphics().setDepth(7);

    this.setupInput();
    this.setupPause();
    this.setupCollisions();
    this.createDashIcon();

    this.gameOver = false;
    this.won = false;
    // Contadores da corrida atual (critérios de medalha)
    this.runWallsBroken = 0;
    this.runAnimalsHit = 0;
    // Separado do runWallsBroken: senão a medalha "Demolidor: quebre 5
    // paredes" mudaria de significado sem aviso
    this.runRampsSmashed = 0;
    this.runTowersDowned = 0;
    // v1.8.4: bônus acumulado da corrida (pontos das façanhas). Os metros
    // NÃO entram aqui — o total só é composto no HUD e no fim de jogo.
    this.runBonus = 0;
    // Empilhamento dos "+N": dois ganhos quase juntos (parede + animal na
    // mesma investida) não podem nascer no mesmo pixel
    this.lastGainAt = 0;
    this.gainStack = 0;
    // Contadores de INPUT (telemetria v1.6.1): dizem se o jogador achou a
    // investida, e o `runDashWasted` mede a frustração com o cooldown
    this.runJumps = 0;
    this.runDashes = 0;
    this.runDashWasted = 0;
    this.runPauses = 0;
    // v1.7: usos do especial FÚRIA TOTAL (contador `f` do runs[])
    this.runSpecials = 0;
    // v1.8: ativações negadas na arena do boss (contador `n` — mede quantos
    // ainda tentam o exploit antigo)
    this.runFuryDenied = 0;
    // v1.7: a luta do portão — camadas quebradas (b) e quiques (q)
    this.runBossLayers = 0;
    this.runBossBounces = 0;
    // v1.8.5: os bosses novos — camadas do Cerco (letra `e` do runs[], com a
    // duração em `h`) e do Guardião (`l`). Os quiques deles são contados mas
    // NÃO persistidos: `q` segue exclusivo do portão (baseline da v1.8).
    this.runBoss2Layers = 0;
    this.runBoss2Bounces = 0;
    this.runBoss3Layers = 0;
    this.runBoss3Bounces = 0;
    // v1.8.10: os combates do deserto — camadas da Barreira da Escavação
    // (letra `u` do runs[]) e do Faraó de Bronze (`y`). Os quiques deles são
    // contados mas NÃO persistidos: `q` segue exclusivo do portão.
    this.runCercoLayers = 0;
    this.runCercoBounces = 0;
    this.runFaraoLayers = 0;
    this.runFaraoBounces = 0;
    // v1.8: skin concedida NESTA corrida (para a mensagem do fim de jogo)
    this.runSkinUnlocked = null;
    this.usedKeyboard = false;
    this.terrainRamp = null; // rampa em que o rino pisou no frame anterior
    // Tweens/timers de festa (fuga e cutscene de LENDA), para poderem ser
    // interrompidos de uma vez. Inicializados AQUI porque a fuga acontece
    // muito antes da cutscene do fim do mundo.
    this.cutsceneTweens = [];
    this.cutsceneTimers = [];
    // Dicas da abertura: só nas primeiras corridas da vida
    this.openingHintIndex = 0;
    this.showOpeningHints =
      StorageManager.getAttempts() < Constants.OPENING_HINT_MAX_ATTEMPTS;
    // Modo infinito: estado do portão dos 1000m
    this.gateReached = false; // já cruzou a linha (dispara 1x)
    this.escaped = false;     // cruzou o portão = fugiu, saindo ou continuando
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

  // Telemetria e ranking são ACESSÓRIOS: um erro deles (rede, regra do
  // servidor ou — já aconteceu — um arquivo antigo no cache do navegador
  // sem a função nova) não pode derrubar o jogo. Engole tudo, síncrono
  // e assíncrono.
  safeTelemetry(fn) {
    try {
      const p = fn();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (e) { /* nunca interrompe a corrida */ }
  }

  setupStartScreen() {
    document.getElementById('start-record').textContent = StorageManager.getRecord();
    document.getElementById('start-attempts').textContent = StorageManager.getAttempts();
    // v1.8.1 — box Campanha: fugas, maior inimigo e o minigráfico
    document.getElementById('start-wins').textContent = StorageManager.getWins();
    document.getElementById('start-cause').textContent = this.topCauseLabel();
    this.renderStartChart();

    // Última posição conhecida no ranking (cacheada — zero rede no load).
    // Guardada como bootRank: o refresh da rede compara e vira notícia
    // quando o jogador ENTRA ou PERDE o pódio.
    this.bootRank = StorageManager.getLastRank();
    this.showRank(this.bootRank);

    // v1.8.1 — pódio: pinta o cache na hora; a rede atualiza depois (e o
    // TTL de 6h segura o custo de reads no plano gratuito)
    this.renderPodium();
    if (LeaderboardSystem.isConfigured()) {
      this.safeTelemetry(() => LeaderboardSystem.fetchPodium().then(() => this.renderPodium()));
    }

    // v1.8.1 — Diário da Fuga: cache primeiro, config/news do dono depois
    NewsSystem.renderInto(document.getElementById('news-list'));
    this.safeTelemetry(() => NewsSystem.refresh().then((changed) => {
      if (changed) NewsSystem.renderInto(document.getElementById('news-list'));
    }));

    this.setupIdentityUI();
    this.setupPwaPrompt();
    this.alignInstallHint();
    window.addEventListener('resize', () => this.alignInstallHint());

    // v1.8.6 — Arena de Desafios: card na home (cache primeiro, rede
    // fire-and-forget — padrão do pódio) e o popup de convite. O convite vem
    // DEPOIS do PWA de propósito: se o #pwa-modal abriu neste boot, o
    // maybeShowChallengeInvite vê o modal-open e adia para o próximo boot
    // (sem markSeen — o convite não se perde).
    this.setupChallengeUI();
    this.renderChallenges();
    this.maybeShowChallengeInvite();

    // Reenvia os totais com a página parada: o envio do fim de corrida
    // morre se o jogador clicar "Jogar Novamente" rápido (reload mata o
    // fetch em voo) — aqui ele sempre completa e cura docs defasados
    if (StorageManager.getAttempts() > 0) this.safeTelemetry(() => StatsSystem.send());

    // Revalida a localização AQUI, com a página parada: assim o fim de corrida
    // sempre acerta o cache e o write da telemetria nunca espera rede. Com o
    // TTL de 12h isto é no máximo uma requisição por sessão longa.
    this.safeTelemetry(() => StatsSystem.refreshGeo());

    // ?ntfy=test manda um exemplo de cada push sem precisar jogar;
    // ?ntfy=off silencia ESTE aparelho para sempre (e ?ntfy=on reativa)
    const ntfyArg = new URLSearchParams(location.search).get('ntfy');
    if (ntfyArg === 'test') this.safeTelemetry(() => NotifySystem.selfTest());
    if (ntfyArg === 'off' || ntfyArg === 'on') {
      NotifySystem.setSilenced(ntfyArg === 'off');
      this.showInviteStatus(ntfyArg === 'off'
        ? '🔕 Notificações silenciadas neste aparelho.'
        : '🔔 Notificações reativadas neste aparelho.');
    }

    // Quem provocar na pista nesta sessão. Fire-and-forget: as estacas já
    // foram plantadas com o cache anterior — o resultado desta consulta vale
    // para a PRÓXIMA corrida, e falhar não custa nada.
    if (LeaderboardSystem.isConfigured()) {
      this.safeTelemetry(() => LeaderboardSystem.fetchRivals());
    }

    // v1.8: preview do rino da abertura veste a skin, e o pódio é revalidado
    // no boot (antes o last_rank só atualizava pós-submit/ranking — um
    // destronado manteria a skin de ouro até abrir o ranking por acaso)
    this.updateRhinoPreview(this.skin);
    if (LeaderboardSystem.isConfigured() && StorageManager.getBestSent() > 0) {
      this.safeTelemetry(() => LeaderboardSystem.fetchMyRank().then((rank) => {
        if (rank) this.onRankRefreshed(rank);
      }));
    }

    // Handler nomeado com guarda em vez de {once:true}: com um modal aberto
    // (ranking/apelido), nenhuma tecla ou toque pode iniciar a corrida
    const overlay = document.getElementById('start-screen');
    const start = (ev) => {
      // P e ESC são pausa: não podem iniciar a corrida
      if (ev && (ev.key === 'p' || ev.key === 'P' || ev.key === 'Escape')) return;
      if (document.body.classList.contains('modal-open')) return;
      overlay.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
      this.startRun();
    };
    overlay.addEventListener('pointerdown', start);
    window.addEventListener('keydown', start);

    this.setupLeaderboardUI();
  }

  // Apelido visível na tela inicial + troca no lugar, e o convite para
  // chamar amigos (v1.5.0). Todo clique aqui precisa de stopPropagation:
  // o overlay inteiro é "toque para começar".
  setupIdentityUI() {
    const idBtn = document.getElementById('identity-btn');
    const inviteBtn = document.getElementById('invite-btn');
    this.updateIdentityLine();

    idBtn.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    idBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this.openNicknameModal(true);
    });

    inviteBtn.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    inviteBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this.shareInvite();
    });
    // Sem Web Share nem clipboard (LAN http): o botão não teria o que fazer
    if (!navigator.share && !navigator.clipboard) inviteBtn.style.display = 'none';

    this.setupMyStatsUI();
    this.setupSkinsUI();
  }

  // "📊 Minhas estatísticas": o módulo é carregado por import DINÂMICO, só no
  // primeiro clique — o load do jogo não paga por uma tela que a maioria das
  // sessões nunca abre.
  setupMyStatsUI() {
    const btn = document.getElementById('mystats-btn');
    const modal = document.getElementById('mystats-modal');
    if (!btn || !modal) return;
    const stop = (ev) => ev.stopPropagation();

    btn.addEventListener('pointerdown', stop);
    modal.addEventListener('pointerdown', stop);
    btn.addEventListener('click', async (ev) => {
      stop(ev);
      document.getElementById('mystats-status').textContent = '';
      const body = document.getElementById('mystats-body');
      try {
        const mod = await import('../stats/MyStats.js');
        this.myStats = mod;
        mod.renderMyStats(body);
      } catch (e) {
        body.textContent = 'Não foi possível montar o resumo.';
      }
      this.openModal(modal);
    });

    document.getElementById('mystats-close').addEventListener('click', (ev) => {
      stop(ev);
      this.closeModal(modal);
    });

    const shareBtn = document.getElementById('mystats-share');
    if (!navigator.share && !navigator.clipboard) {
      shareBtn.style.display = 'none';
    } else {
      shareBtn.addEventListener('click', (ev) => {
        stop(ev);
        this.shareSummary(null, 'mystats-status');
      });
    }
  }

  updateIdentityLine() {
    const label = document.getElementById('identity-name');
    if (!label) return;
    const name = StorageManager.getPlayerName();
    // Com nome automático, o convite fica visível na tela inicial — sem
    // isso o jogador nem percebe que está aparecendo como "Anonimo_12"
    const suffix = name && StorageManager.isNameAuto() ? ' — escolher um nome' : '';
    label.textContent = (name || 'Escolher apelido') + suffix; // textContent: nome livre
  }

  // Convite para amigos — pensado para colar no WhatsApp: gancho, o que é
  // o jogo, provocação com o recorde (quando existe) e o link.
  async shareInvite() {
    const url = location.origin + location.pathname;
    const record = StorageManager.getRecord();
    const brag = record > 0
      ? `Meu recorde: *${record}m*. Duvido você passar disso 😏`
      : 'Ainda estou treinando — vem tentar antes de mim 😏';
    const text =
      '🦏💨 Entrei numa fuga do zoológico e não consigo parar!\n\n' +
      '*FURIOUS RHINO*: você é um rinoceronte furioso que corre, pula e INVESTE contra tudo. ' +
      'A meta é escapar pelo portão dos 1000m — depois dele o jogo vira infinito, até você virar LENDA.\n\n' +
      `${brag}\n\nGrátis e abre direto no navegador:`;
    try {
      if (navigator.share) {
        await navigator.share({ text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      this.showInviteStatus('🔗 Convite copiado — cole no WhatsApp!');
    } catch (e) { /* cancelou o compartilhamento */ }
  }

  showInviteStatus(msg) {
    const el = document.getElementById('invite-status');
    if (el) el.textContent = msg;
  }

  // Alerta de instalação: 1x por SESSÃO (o "Jogar Novamente" recarrega a
  // página — mostrar a cada morte afastaria o jogador). Nunca bloqueia:
  // "Continuar sem instalar" fecha e o jogo segue.
  // v1.8.7-fix2: o #install-hint fica fora do fluxo (absoluto, esquerda da
  // tela) — alinha o topo dele com a fileira de botoes da Campanha, no mesmo
  // espirito do alignHudButtons (fallback de CSS so vale ate aqui rodar)
  alignInstallHint() {
    const hint = document.getElementById('install-hint');
    const row = document.querySelector('.home-col-camp .home-headrow');
    if (!hint || !row) return;
    const r = row.getBoundingClientRect();
    if (r.height > 0) hint.style.top = `${Math.round(r.top)}px`;
  }

  setupPwaPrompt() {
    const modal = document.getElementById('pwa-modal');
    if (!modal) return;
    const installed =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      navigator.standalone === true;
    const SEEN = 'furious_rhino_pwa_prompted';
    let seen = false;
    try { seen = sessionStorage.getItem(SEEN) === '1'; } catch (e) { seen = true; }

    modal.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    const close = () => {
      this.closeModal(modal);
      try { sessionStorage.setItem(SEEN, '1'); } catch (e) { /* privado */ }
    };
    document.getElementById('pwa-skip').addEventListener('click', (ev) => {
      ev.stopPropagation();
      close();
    });
    document.getElementById('pwa-install').addEventListener('click', async (ev) => {
      ev.stopPropagation();
      // Android/Chrome: o prompt nativo foi capturado pelo IIFE do index
      const prompt = window.deferredInstallPrompt;
      if (prompt) {
        prompt.prompt();
        await prompt.userChoice.catch(() => {});
        window.deferredInstallPrompt = null;
        close();
        return;
      }
      // iOS (e qualquer navegador sem prompt): instruções na tela
      document.getElementById('pwa-ios-steps').hidden = false;
      document.getElementById('pwa-install').hidden = true;
    });

    if (installed || seen) return;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS) {
      document.getElementById('pwa-ios-steps').hidden = false;
      document.getElementById('pwa-install').hidden = true;
    }
    this.openModal(modal);
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
    document.getElementById('nickname-skip').addEventListener('click', () => this.nicknameSkip());
    nickInput.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Enter') this.saveNickname();
    });
  }

  // v1.8.1: a faixa de medalhas saiu da home (decisão do dono) — as medalhas
  // seguem visíveis no "Minhas estatísticas". Abaixo, os montadores da home
  // nova: rank/degrau VOCÊ, box Campanha e pódio mundial.

  // Mostra a posição no degrau VOCÊ (ou o convite, para quem não tem rank)
  showRank(rank) {
    const has = rank > 0;
    if (has) document.getElementById('start-rank-pos').textContent = rank;
    document.getElementById('start-rank').hidden = !has;
    document.getElementById('you-norank').hidden = has;
    this.updatePodiumGap(rank);
  }

  // "💀 Maior inimigo" do box Campanha: a causa de morte mais comum
  topCauseLabel() {
    const deaths = StorageManager.getDeaths();
    let best = null;
    for (const [key, n] of Object.entries(deaths)) {
      if (/^t\d$/.test(key) || key === 'win') continue;
      if (n > 0 && (!best || n > best.n)) best = { key, n };
    }
    return best ? (Constants.CAUSE_LABELS[best.key] || best.key) : '—';
  }

  // Minigráfico SVG das últimas 10 corridas (barra dourada = a melhor;
  // linha tracejada = o recorde). Sem corridas: o gráfico se esconde.
  renderStartChart() {
    const svg = document.getElementById('start-chart');
    const label = document.getElementById('start-chart-label');
    const runs = StorageManager.getRuns().filter(Boolean).slice(-10);
    const values = runs.map((r) => Number(r.m) || 0);
    if (!values.length) {
      svg.style.display = 'none';
      label.style.display = 'none';
      return;
    }
    const NS = 'http://www.w3.org/2000/svg';
    const max = Math.max(...values, StorageManager.getRecord(), 1);
    const shape = (tag, attrs) => {
      const el = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      svg.appendChild(el);
    };
    svg.textContent = '';
    shape('line', { class: 'axis', x1: 0, y1: 62, x2: 300, y2: 62 });
    const recordY = 62 - (StorageManager.getRecord() / max) * 55;
    shape('line', { class: 'goal', x1: 0, y1: recordY, x2: 300, y2: recordY });
    const bestIdx = values.indexOf(Math.max(...values));
    const slot = 300 / Math.max(values.length, 1);
    values.forEach((v, i) => {
      const h = Math.max(2, (v / max) * 55);
      shape('rect', {
        class: `bar${i === bestIdx ? ' best' : ''}`,
        x: (i * slot + 3).toFixed(1), y: (62 - h).toFixed(1),
        width: Math.max(4, slot - 6).toFixed(1), height: h.toFixed(1),
      });
    });
  }

  // O pódio mundial (2·1·3) a partir do cache — skins de quem cravou cada
  // marca (docs antigos: rino original) e dias de POSSE DA POSIÇÃO (cascata).
  renderPodium() {
    const box = document.getElementById('podium-steps');
    const cached = StorageManager.getPodium();
    const entries = cached ? cached.entries : null;
    // v1.8.4: o degrau VOCÊ também tem nome, marca e posse (antes do return
    // do pódio vazio — a sua marca não depende do cache mundial)
    this.renderYouStep();
    box.textContent = '';
    if (!entries || !entries.length) {
      const p = document.createElement('div');
      p.className = 'podium-empty';
      p.textContent = navigator.onLine === false
        ? 'O pódio aparece quando houver internet.'
        : 'Escapem do zoológico — o pódio espera pelos 3 primeiros!';
      box.appendChild(p);
      return;
    }
    const days = LeaderboardSystem.holdDays(entries, Date.now(), { cascade: true });
    const medals = ['👑', '🥈', '🥉'];
    const classes = ['first', 'second', 'third'];
    // ordem visual 2 · 1 · 3 (índices 1, 0, 2 do top 3)
    for (const i of [1, 0, 2].filter((n) => n < entries.length)) {
      const e = entries[i];
      const step = document.createElement('div');
      step.className = `step ${classes[i]}`;
      if (i === 0) {
        const glow = document.createElement('div');
        glow.className = 'glow';
        step.appendChild(glow);
      }
      const anim = document.createElement('div');
      anim.className = 'podium-anim';
      const skin = SkinSystem.get(e.skin || 'default');
      for (let f = 0; f < 3; f++) {
        const img = document.createElement('img');
        img.className = `f${f}`;
        img.alt = '';
        img.src = `art/${SkinSystem.textureKey(skin, f)}.svg`;
        anim.appendChild(img);
      }
      step.appendChild(anim);
      const medal = document.createElement('div');
      medal.className = 'medal';
      medal.textContent = medals[i];
      const name = document.createElement('div');
      name.className = 'pname';
      name.textContent = e.name; // textContent: nome vem de terceiros
      const score = document.createElement('div');
      score.className = 'pscore';
      score.textContent = ScoreSystem.fmtScore(e); // pontos · metros (v1.8.4)
      const hold = document.createElement('div');
      hold.className = 'pdays';
      const d = days[i];
      hold.textContent = d === null ? '' : d === 0 ? 'desde hoje'
        : i === 0 ? `no trono há ${d}d` : `no posto há ${d}d`;
      const base = document.createElement('div');
      base.className = 'base';
      base.textContent = i + 1;
      step.append(medal, name, score, hold, base);
      box.appendChild(step);
    }
    this.updatePodiumGap(StorageManager.getLastRank());
  }

  // v1.8.4: o degrau VOCÊ ganhou as mesmas três linhas dos degraus 1·2·3 —
  // nome, marca (pontos · metros) e há quanto tempo ela está no ar.
  renderYouStep() {
    const nameEl = document.getElementById('you-name');
    const scoreEl = document.getElementById('you-score');
    const daysEl = document.getElementById('you-days');
    if (!nameEl || !scoreEl || !daysEl) return;

    const name = StorageManager.getPlayerName();
    nameEl.textContent = name || 'escolha seu apelido'; // textContent: nome livre
    nameEl.style.opacity = name ? '' : '0.55';

    const meters = StorageManager.getRecord();
    scoreEl.textContent = meters > 0
      ? ScoreSystem.fmtScore({ score: StorageManager.getRecordPts(), m: meters })
      : 'sem marca';

    const sinceMs = StorageManager.getBestSentAt();
    const d = sinceMs ? LeaderboardSystem.holdDays([{ sinceMs }])[0] : null;
    daysEl.textContent = d === null ? '' : d === 0 ? 'desde hoje' : `sua marca há ${d}d`;
  }

  // A provocação sob o degrau VOCÊ: quanto falta para o pódio (ou a defesa).
  // v1.8.4: a comparação é em PONTOS — o ranking mundial passou a ser deles.
  updatePodiumGap(rank) {
    const el = document.getElementById('podium-gap');
    const cached = StorageManager.getPodium();
    const third = cached && cached.entries[2] ? cached.entries[2].score : 0;
    const recordPts = StorageManager.getRecordPts();
    if (rank > 0 && rank <= 3) {
      el.textContent = '🛡️ defenda o seu posto!';
    } else if (third > recordPts) {
      el.textContent = `faltam ${third - recordPts + 1} pts p/ 🥉`;
    } else {
      el.textContent = '';
    }
  }

  openModal(el) {
    el.style.display = 'block';
    document.body.classList.add('modal-open');
  }

  closeModal(el) {
    el.style.display = 'none';
    document.body.classList.remove('modal-open');
  }

  // ------------------------------------------------------------- skins v1.8
  // Hub de skins: botão na tela inicial → modal com a grade. Mesmo contrato
  // dos outros modais do overlay: stopPropagation em pointerdown E click,
  // senão o toque inicia a corrida.
  setupSkinsUI() {
    const btn = document.getElementById('skins-btn');
    const modal = document.getElementById('skins-modal');
    if (!btn || !modal) return;
    const stop = (ev) => ev.stopPropagation();

    btn.addEventListener('pointerdown', stop);
    modal.addEventListener('pointerdown', stop);
    btn.addEventListener('click', (ev) => {
      stop(ev);
      this.renderSkinsGrid();
      this.openModal(modal);
      // Revalida o pódio com o modal aberto — fire-and-forget; a grade se
      // redesenha quando (e se) a resposta chegar
      if (LeaderboardSystem.isConfigured() && StorageManager.getBestSent() > 0) {
        this.safeTelemetry(() => LeaderboardSystem.fetchMyRank().then((rank) => {
          if (rank) this.renderSkinsGrid();
        }));
      }
    });
    document.getElementById('skins-close').addEventListener('click', (ev) => {
      stop(ev);
      this.closeModal(modal);
    });
  }

  renderSkinsGrid() {
    const grid = document.getElementById('skins-grid');
    const status = document.getElementById('skins-status');
    grid.innerHTML = '';
    const equipped = SkinSystem.resolveEquipped();
    const chosenId = StorageManager.getSelectedSkin();
    const myRank = StorageManager.getLastRank();

    for (const skin of SKINS) {
      // "fora do jogo" (flag do /?setup): nem célula ganha — como se não existisse
      if (skin.hidden) continue;
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'skin-cell';
      const img = document.createElement('img');
      img.alt = skin.name;
      // Célula "em produção" mostra a silhueta do rino base (a arte da skin
      // ainda não existe; o CSS .pending escurece)
      img.src = `art/${skin.pending ? 'rhino-run-0' : SkinSystem.textureKey(skin, 0)}.svg`;
      const name = document.createElement('b');
      name.textContent = skin.name;
      const state = document.createElement('span');
      state.className = 'skin-state';

      if (skin.pending) {
        cell.classList.add('locked', 'pending');
        state.textContent = SkinSystem.isUnlocked(skin)
          ? '🎨 conquistada — arte em produção!' : '🎨 em produção';
      } else if (skin.id === equipped.id) {
        cell.classList.add('equipped');
        state.textContent = '✓ Equipada';
      } else if (SkinSystem.isEquippable(skin)) {
        state.textContent = 'Toque para vestir';
      } else {
        cell.classList.add('locked');
        state.textContent = skin.access.type === 'rank'
          ? `🔒 só do nº ${skin.access.rank} do mundo`
            + (myRank > 0 ? ` — você está em #${myRank}` : '')
          // Conquista/total: o requisito é gerado da condition (a desc fica
          // livre para o texto de "vitrine" da skin)
          : `🔒 ${SkinSystem.requirementText(skin) || skin.desc}`;
      }

      cell.append(img, name, state);
      cell.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this.equipSkin(skin);
      });
      grid.appendChild(cell);
    }

    // A escolhida ficou inacessível (perdeu o pódio): explicar que ela volta
    // sozinha — a seleção nunca é apagada
    const chosen = SkinSystem.get(chosenId);
    status.textContent = (chosen.id !== equipped.id && chosen.access.type === 'rank')
      ? `${chosen.name} fica guardada para o nº ${chosen.access.rank} — recupere o pódio e ela volta sozinha.`
      : '';
  }

  equipSkin(skin) {
    if (!SkinSystem.isEquippable(skin)) return;
    StorageManager.setSelectedSkin(skin.id);
    this.skin = SkinSystem.resolveEquipped();
    this.rhino.setSkin(this.skin);
    this.updateRhinoPreview(this.skin);
    this.renderSkinsGrid();
  }

  // O rino animado da abertura são 3 <img> HTML fora do Phaser — trocar os
  // src é o preview "de graça" da skin equipada
  updateRhinoPreview(skin) {
    const imgs = document.querySelectorAll('.rhino-anim img');
    imgs.forEach((img, i) => {
      img.src = `art/${SkinSystem.textureKey(skin, i)}.svg`;
    });
  }

  // Pódio revalidado no boot: se a skin efetiva mudou (destronado ou de
  // volta ao topo), o rino da tela inicial troca na hora — com aviso quando
  // é perda, para a reversão nunca parecer bug
  onRankRefreshed(rank) {
    this.showRank(rank);
    // v1.8.1: cruzou a fronteira do pódio desde o último rank conhecido?
    // Vira notícia no Diário (a chave por posição deduplica o repeteco).
    const prev = this.bootRank || 0;
    if (rank <= 3 && (prev === 0 || prev > 3)) {
      NewsSystem.push(`podium:in:${rank}`, `👑 Você entrou no pódio mundial — #${rank} do mundo!`, 'gold');
      NewsSystem.renderInto(document.getElementById('news-list'));
    } else if (prev > 0 && prev <= 3 && rank > 3) {
      NewsSystem.push(`podium:out:${prev}>${rank}`,
        `⚠️ Você perdeu o pódio — caiu de #${prev} para #${rank}. Recupere o seu posto!`, 'red');
      NewsSystem.renderInto(document.getElementById('news-list'));
    }
    this.bootRank = rank;
    const effective = SkinSystem.resolveEquipped();
    if (effective.id === this.skin.id) return;
    const lost = effective.id === 'default';
    this.skin = effective;
    if (!this.started) this.rhino.setSkin(effective);
    this.updateRhinoPreview(effective);
    if (lost) {
      const chosen = SkinSystem.get(StorageManager.getSelectedSkin());
      const notice = document.getElementById('skin-notice');
      if (notice && chosen.access.type === 'rank') {
        notice.textContent = `${chosen.name} é só do nº ${chosen.access.rank} do mundo — `
          + `você está em #${rank}. Recupere o pódio para vesti-la de volta.`;
      }
    }
  }

  // Conquistas por corrida (ex.: Catisquick = 5 torres + caçador vencido NA
  // MESMA corrida). Chamado no crossGate (o momento da festa) e de novo no
  // endGame (rede de segurança para o caso raro de a façanha fechar só no
  // modo infinito) — idempotente. As condições vivem no SkinRegistry.
  maybeUnlockSkins() {
    const news = SkinSystem.evaluateRun({
      meters: this.rhino ? this.rhino.getDistance() : 0,
      towersDowned: this.runTowersDowned,
      bossLayers: this.runBossLayers,
      escaped: Boolean(this.escaped),
    });
    if (news.length) this.runSkinUnlocked = news[0];
    // v1.8.1: a conquista também vira notícia da home (dedupe por skin)
    for (const s of news) {
      NewsSystem.push(`skin:${s.id}`, `🎨 Você desbloqueou a skin ${s.name}!`, 'gold');
    }
    return news;
  }

  // v1.8.6: `selectMode` = aberto pelo "⚔️ Desafiar" da home — o top 10 É o
  // diretório de adversários (sem tela de busca); a dica aponta as espadas.
  async openRanking(selectMode = false) {
    const modal = document.getElementById('ranking-modal');
    const list = document.getElementById('ranking-list');
    const me = document.getElementById('ranking-me');
    const status = document.getElementById('ranking-status');
    this.openModal(modal);
    this.updateChallengeBar();
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
    status.textContent = selectMode
      ? '⚔️ toque na espada para escolher os adversários'
      : '';

    const myId = StorageManager.getOrCreatePlayerId();
    // v1.8: há quantos dias cada um está com a marca exibida
    const days = LeaderboardSystem.holdDays(data.entries);
    data.entries.forEach((entry, i) => {
      const li = document.createElement('li');
      if (entry.id === myId) li.classList.add('me');
      const name = document.createElement('span');
      name.textContent = `${i + 1}. ${entry.name}`; // textContent: nome vem de terceiros
      const right = document.createElement('span');
      right.className = 'rank-right';
      const score = document.createElement('span');
      score.textContent = ScoreSystem.fmtScore(entry); // pontos · metros (v1.8.4)
      right.append(score);
      if (days[i] !== null) {
        const hold = document.createElement('span');
        hold.className = 'rank-days';
        hold.textContent = days[i] === 0 ? 'hoje' : `há ${days[i]}d`;
        hold.title = 'há quanto tempo com esta marca';
        right.append(hold);
      }
      // v1.8.6: cada OUTRO jogador ganha a espadinha de desafio — o clique
      // alterna a seleção e acende a barra "⚔️ Desafiar (N)" do rodapé
      if (entry.id && entry.id !== myId) {
        const chBtn = document.createElement('button');
        chBtn.type = 'button';
        chBtn.className = 'challenge-btn';
        chBtn.textContent = '⚔️';
        chBtn.title = `Desafiar ${entry.name}`;
        const on = this.challengeSel.has(entry.id);
        chBtn.classList.toggle('sel', on);
        chBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
        chBtn.addEventListener('pointerdown', (ev) => ev.stopPropagation());
        chBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          this.toggleChallengeSel(entry.id, entry.name, chBtn);
        });
        right.append(chBtn);
      }
      li.append(name, right);
      list.appendChild(li);
    });

    if (data.myBest > 0) {
      // v1.8.4: myBest já vem como TOTAL de pontos do LeaderboardSystem
      me.textContent = data.myRank !== null
        ? `Sua posição: #${data.myRank} — ${ScoreSystem.fmtPts(data.myBest)}`
        : `Seu melhor: ${ScoreSystem.fmtPts(data.myBest)}`;
    } else {
      me.textContent = 'Jogue para entrar no ranking!';
    }
  }

  // ------------------------------------------------- ⚔️ Desafios (v1.8.6)
  // Regras da casa valem dobrado aqui: todo clique tem stopPropagation em
  // pointerdown E click (o overlay inteiro é "toque para começar"), nome de
  // terceiro só via textContent, e rede NUNCA bloqueia a UI — pinta do cache
  // síncrono e redesenha se o refresh trouxer novidade (padrão do pódio).

  setupChallengeUI() {
    // Seleção viva entre ranking ↔ modal de criação (id → nome)
    this.challengeSel = new Map();
    const durations = Constants.CHALLENGE_DURATIONS_D || [1, 3, 7];
    this.challengeDays = durations.includes(3) ? 3 : durations[0];
    this.pendingInvite = null;
    const stop = (ev) => ev.stopPropagation();

    // Botão "⚔️ Desafiar" da home (v1.8.7-fix): abre o modal de criação com
    // o DIRETÓRIO de adversários — todos os cadastrados, em ordem alfabética,
    // com busca aproximada. O top 10 continua sendo um atalho (⚔️ por linha),
    // mas deixou de ser a única porta.
    const newBtn = document.getElementById('challenge-new');
    newBtn.addEventListener('pointerdown', stop);
    newBtn.addEventListener('click', (ev) => {
      stop(ev);
      this.openChallengeCreate();
    });

    // Busca aproximada do diretório: filtra por slug (sem acento/caixa)
    const search = document.getElementById('challenge-search');
    search.addEventListener('pointerdown', stop);
    search.addEventListener('input', () => this.renderChallengeDirectory(search.value));

    // O card da home engole toques (regra de ouro 1)
    const card = document.getElementById('challenge-card');
    card.addEventListener('pointerdown', stop);
    card.addEventListener('click', stop);

    // Barra do rodapé do ranking → modal de criação
    document.getElementById('challenge-bar-btn').addEventListener('click', (ev) => {
      stop(ev);
      this.closeModal(document.getElementById('ranking-modal'));
      this.openChallengeCreate();
    });

    // Modal de criação
    const createModal = document.getElementById('challenge-create-modal');
    createModal.addEventListener('pointerdown', stop);
    document.getElementById('challenge-send').addEventListener('click', (ev) => {
      stop(ev);
      this.sendChallenge();
    });
    document.getElementById('challenge-cancel').addEventListener('click', (ev) => {
      stop(ev);
      this.closeModal(createModal);
    });

    // Popup de convite
    const inviteModal = document.getElementById('challenge-invite-modal');
    inviteModal.addEventListener('pointerdown', stop);
    document.getElementById('challenge-accept').addEventListener('click', async (ev) => {
      stop(ev);
      const ch = this.pendingInvite;
      this.pendingInvite = null;
      this.closeModal(inviteModal);
      if (!ch) return;
      let ok = false;
      try { ok = await ChallengeSystem.accept(ch.id); } catch (e) { /* acessório */ }
      this.showHomeToast(ok
        ? '⚔️ Desafio aceito — boa corrida!'
        : 'Não deu para aceitar — sem conexão? Tente pelo card.');
      if (ok) this.renderChallenges();
    });
    document.getElementById('challenge-decline').addEventListener('click', (ev) => {
      stop(ev);
      const ch = this.pendingInvite;
      this.pendingInvite = null;
      try { if (ch) ChallengeSystem.declineLocal(ch.id); } catch (e) { /* acessório */ }
      this.closeModal(inviteModal);
    });
  }

  // btn é opcional (v1.8.7-fix): as linhas do DIRETÓRIO no modal chamam sem
  // botão do ranking — quem repinta a seleção lá é o renderChallengeDirectory
  toggleChallengeSel(id, name, btn) {
    const cap = (Constants.CHALLENGE_MAX_PARTICIPANTS || 8) - 1; // -1: eu
    if (this.challengeSel.has(id)) {
      this.challengeSel.delete(id);
    } else if (this.challengeSel.size >= cap) {
      const msg = `⚔️ no máximo ${cap} adversários por desafio.`;
      const status = document.getElementById('ranking-status');
      if (status) status.textContent = msg;
      const err = document.getElementById('challenge-error');
      if (err) err.textContent = msg;
      return;
    } else {
      this.challengeSel.set(id, name);
    }
    const on = this.challengeSel.has(id);
    if (btn) {
      btn.classList.toggle('sel', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    this.updateChallengeBar();
  }

  updateChallengeBar() {
    const bar = document.getElementById('challenge-bar');
    if (!bar) return;
    const n = this.challengeSel ? this.challengeSel.size : 0;
    bar.hidden = n === 0;
    document.getElementById('challenge-bar-btn').textContent = `⚔️ Desafiar (${n})`;
  }

  openChallengeCreate() {
    document.getElementById('challenge-error').textContent = '';
    const search = document.getElementById('challenge-search');
    search.value = '';
    this.renderChallengeChips();
    this.renderChallengeDirectory('');
    this.renderChallengeDays();
    this.openModal(document.getElementById('challenge-create-modal'));
    // Rede depois do cache: o modal abre na hora e a lista completa chega
    // quando a coleção responder (padrão do pódio)
    this.safeTelemetry(() => ChallengeSystem.fetchDirectory().then(() => {
      const modal = document.getElementById('challenge-create-modal');
      if (modal.style.display !== 'none') this.renderChallengeDirectory(search.value);
    }));
  }

  // O diretório de adversários dentro do modal: todos os cadastrados (menos
  // eu), alfabético, com a seleção espelhada nos chips. Nome de terceiro
  // SEMPRE via textContent.
  renderChallengeDirectory(query) {
    const box = document.getElementById('challenge-directory');
    box.textContent = '';
    const cached = ChallengeSystem.directoryCached();
    const list = cached ? cached.list : [];
    if (!list.length) {
      const p = document.createElement('span');
      p.className = 'dir-empty';
      p.textContent = navigator.onLine === false
        ? 'Sem internet — a lista de jogadores aparece quando a rede voltar.'
        : 'Carregando jogadores...';
      box.appendChild(p);
      return;
    }
    const slug = ChallengeSystem.dirSlug(query);
    const vistos = list.filter((e) => !slug || ChallengeSystem.dirSlug(e.name).includes(slug));
    if (!vistos.length) {
      const p = document.createElement('span');
      p.className = 'dir-empty';
      p.textContent = 'Ninguém com esse nome — tente outra busca.';
      box.appendChild(p);
      return;
    }
    for (const e of vistos) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'dir-row' + (this.challengeSel.has(e.id) ? ' sel' : '');
      const name = document.createElement('span');
      name.textContent = e.name;
      const mark = document.createElement('span');
      mark.textContent = this.challengeSel.has(e.id) ? '✓' : '⚔️';
      row.append(name, mark);
      row.addEventListener('pointerdown', (ev) => ev.stopPropagation());
      row.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this.toggleChallengeSel(e.id, e.name, null);
        this.renderChallengeChips();
        this.renderChallengeDirectory(document.getElementById('challenge-search').value);
      });
      box.appendChild(row);
    }
  }

  renderChallengeChips() {
    const box = document.getElementById('challenge-players');
    box.textContent = '';
    if (!this.challengeSel.size) {
      const p = document.createElement('span');
      p.className = 'chal-none';
      p.textContent = 'Ninguém escolhido — toque nos nomes da lista abaixo.';
      box.appendChild(p);
      return;
    }
    for (const [id, name] of this.challengeSel) {
      const chip = document.createElement('span');
      chip.className = 'chal-chip';
      const label = document.createElement('span');
      label.textContent = name; // textContent: nome vem de terceiros
      const x = document.createElement('button');
      x.type = 'button';
      x.textContent = '✕';
      x.setAttribute('aria-label', `Remover ${name}`);
      x.addEventListener('pointerdown', (ev) => ev.stopPropagation());
      x.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this.challengeSel.delete(id);
        this.renderChallengeChips();
        this.updateChallengeBar(); // o ranking pode reabrir com a barra certa
      });
      chip.append(label, x);
      box.appendChild(chip);
    }
  }

  renderChallengeDays() {
    const box = document.getElementById('challenge-days');
    box.textContent = '';
    for (const d of Constants.CHALLENGE_DURATIONS_D || [1, 3, 7]) {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'chal-pill';
      pill.classList.toggle('sel', d === this.challengeDays);
      pill.setAttribute('aria-pressed', d === this.challengeDays ? 'true' : 'false');
      pill.textContent = `${d}d`;
      pill.addEventListener('pointerdown', (ev) => ev.stopPropagation());
      pill.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this.challengeDays = d;
        this.renderChallengeDays();
      });
      box.appendChild(pill);
    }
  }

  async sendChallenge() {
    const err = document.getElementById('challenge-error');
    const btn = document.getElementById('challenge-send');
    const modal = document.getElementById('challenge-create-modal');
    if (!this.challengeSel.size) {
      err.textContent = 'Escolha pelo menos um adversário no top 10.';
      return;
    }
    const myId = StorageManager.getOrCreatePlayerId();
    const participants = [myId, ...this.challengeSel.keys()];
    const names = { [myId]: StorageManager.getPlayerName() || '' };
    for (const [id, name] of this.challengeSel) names[id] = name;

    err.textContent = 'Enviando…';
    btn.disabled = true;
    let res = null;
    try {
      res = await ChallengeSystem.create({ participants, names, days: this.challengeDays });
    } catch (e) { /* o contrato diz que não lança — cinto e suspensório */ }
    btn.disabled = false;

    if (res && res.ok) {
      err.textContent = '';
      this.challengeSel.clear();
      this.updateChallengeBar();
      this.closeModal(modal);
      this.showHomeToast('⚔️ Desafio enviado!');
      this.renderChallenges();
      return;
    }
    const reason = res && res.reason;
    if (reason === 'name') {
      // Criar exige apelido próprio (não Anonimo_N): manda para o modal de
      // apelido explicando O PORQUÊ — sem isso parece um fecha-abre aleatório
      this.closeModal(modal);
      this.showHomeToast('👤 Escolha um apelido para desafiar!');
      this.openNicknameModal(true);
      return;
    }
    err.textContent = reason === 'cap'
      ? `Limite de ${Constants.CHALLENGE_MAX_ACTIVE_CREATED || 3} desafios ativos atingido — encerre ou exclua um para incluir um novo.`
      : reason === 'local'
        ? 'Ambiente local não envia desafios (proteção de teste). Para testar de verdade: ?debug=1 → Debug → "📡 Escrita local".'
        : reason === 'offline'
          ? 'Sem conexão — tente de novo.'
          : 'Não deu para criar o desafio — tente de novo.';
  }

  // 1 popup por boot, sempre DEPOIS do PWA: se qualquer modal já está aberto
  // (o #pwa-modal deste boot), adia SEM markSeen — o convite volta no próximo.
  maybeShowChallengeInvite() {
    try {
      if (document.body.classList.contains('modal-open')) return;
      const invites = ChallengeSystem.unseenInvites() || [];
      if (!invites.length) return;
      const ch = invites[0];
      const end = new Date(ch.endAt * 1000);
      const dd = String(end.getDate()).padStart(2, '0');
      const mm = String(end.getMonth() + 1).padStart(2, '0');
      const who = (ch.from && ch.from.name) || 'Alguém';
      // textContent: nome vem de terceiros
      document.getElementById('challenge-invite-text').textContent =
        `⚔️ ${who} te desafiou! Melhor corrida em pontos até ${dd}/${mm}. Topa?`;
      this.pendingInvite = ch;
      ChallengeSystem.markSeen(ch.id);
      this.openModal(document.getElementById('challenge-invite-modal'));
    } catch (e) { /* desafio é acessório — nunca derruba a home */ }
  }

  // O card da home: pinta do cache SÍNCRONO na hora e dispara o refresh
  // fire-and-forget (padrão do pódio) — se vier novidade, repinta.
  renderChallenges() {
    const box = document.getElementById('challenge-card');
    if (!box) return;
    try { this.paintChallenges(box); } catch (e) { box.hidden = true; }
    this.safeTelemetry(() => ChallengeSystem.refresh().then(() => {
      try { this.paintChallenges(box); } catch (e) { /* acessório */ }
    }));
  }

  paintChallenges(box) {
    const myId = StorageManager.getOrCreatePlayerId();
    const nowS = Math.floor(Date.now() / 1000);
    const cached = ChallengeSystem.cached();
    const list = (cached && cached.list) || [];
    const mine = list.filter((ch) => {
      const st = ChallengeSystem.statusOf(ch, myId);
      return st === 'creator' || st === 'accepted';
    });
    // v1.8.7-fix4: cancelado vira AVISO para o desafiado (até dispensar ou o
    // prazo vencer); para o próprio criador ele some na hora
    const cancelled = mine.filter((ch) => ChallengeSystem.isCancelled(ch)
      && nowS < ch.endAt
      && !(ch.from && String(ch.from.id) === myId)
      && !ChallengeSystem.isDismissed(ch.id));
    // Encerrados há <24h viram card de RESULTADO; depois somem sozinhos
    const ended = mine.filter((ch) => !ChallengeSystem.isCancelled(ch)
      && nowS >= ch.endAt && nowS - ch.endAt < 24 * 3600);
    const active = mine.filter((ch) => ChallengeSystem.isActive(ch, nowS));
    const show = [...active, ...cancelled, ...ended];

    box.textContent = '';
    box.hidden = show.length === 0;
    // v1.8.7-fix4 (pedido do dono): com desafios na tela, o box Campanha sai
    // de cena e os cards ocupam o lugar dele, um abaixo do outro (máx 3)
    const camp = document.querySelector('.camp-card');
    if (camp) camp.style.display = show.length ? 'none' : '';
    if (!show.length) return;
    const MAX = 3;
    for (const ch of show.slice(0, MAX)) {
      box.appendChild(this.buildChallengeCard(ch, myId, nowS >= ch.endAt));
    }
    if (show.length > MAX) {
      const more = document.createElement('div');
      more.className = 'chal-more';
      more.textContent = `+${show.length - MAX} desafios`;
      box.appendChild(more);
    }
  }

  buildChallengeCard(ch, myId, ended) {
    const card = document.createElement('div');
    card.className = 'chal-card';
    const head = document.createElement('div');
    head.className = 'chal-head';
    const title = document.createElement('b');
    title.textContent = ch.from && ch.from.id === myId
      ? '⚔️ seu desafio'
      : `⚔️ Desafio de ${(ch.from && ch.from.name) || '?'}`; // textContent
    const cd = document.createElement('span');
    cd.className = 'chal-count';
    cd.textContent = ChallengeSystem.countdownText(ch.endAt, Date.now());
    head.append(title, cd);

    // v1.8.7-fix4: desafio CANCELADO — o card é o próprio aviso; toque
    // dispensa (ou ele morre sozinho no endAt original). Nada de placar.
    if (ChallengeSystem.isCancelled(ch)) {
      card.classList.add('cancelled');
      title.textContent = `❌ ${(ch.from && ch.from.name) || '?'} cancelou o desafio`;
      cd.textContent = 'toque para dispensar';
      card.addEventListener('click', (ev) => {
        ev.stopPropagation();
        ChallengeSystem.dismissLocal(ch.id);
        this.renderChallenges();
      });
      card.append(head);
      return card;
    }

    const rowsBox = document.createElement('div');
    rowsBox.className = 'chal-rows';
    rowsBox.textContent = '…'; // o placar chega quando standings resolver
    card.append(head, rowsBox);

    // v1.8.7-fix4: o CRIADOR pode encerrar o desafio ativo — dois toques
    // (o segundo confirma) para não cancelar por engano
    if (!ended && ch.from && ch.from.id === myId) {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'chal-del';
      del.textContent = '🗑 Encerrar';
      let armado = 0;
      del.addEventListener('pointerdown', (ev) => ev.stopPropagation());
      del.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        if (Date.now() - armado > 3000) {
          armado = Date.now();
          del.textContent = 'confirmar?';
          setTimeout(() => { del.textContent = '🗑 Encerrar'; }, 3000);
          return;
        }
        del.disabled = true;
        const r = await ChallengeSystem.cancel(ch.id);
        if (r.ok) {
          this.showHomeToast(r.ghost
            ? '🗑 Esse desafio já não existia — removido da lista.'
            : '🗑 Desafio encerrado.');
          this.renderChallenges();
        } else {
          del.disabled = false;
          del.textContent = '🗑 Encerrar';
          this.showHomeToast(r.reason === 'local'
            ? 'Ambiente local não encerra desafios — ligue "📡 Escrita local" no ?debug=1.'
            : 'Não deu para encerrar — confira a internet (e se as rules novas foram publicadas).');
        }
      });
      card.append(del);
    }

    // standings tem TTL de 30min e nunca lança — mas o card já está no ar
    this.safeTelemetry(() => ChallengeSystem.standings(ch).then((rows) => {
      this.paintChallengeRows(card, rowsBox, ch, rows || [], myId, ended);
    }));
    return card;
  }

  paintChallengeRows(card, rowsBox, ch, rows, myId, ended) {
    rowsBox.textContent = '';
    const leader = ChallengeSystem.leaderOf(rows);

    // Encerrado: o card vira resultado — e o veredito vai para o Diário
    // (NewsSystem.push deduplica pela chave 'chal:'+id sozinho)
    if (ended && rows.length) {
      const verdict = document.createElement('div');
      verdict.className = 'chal-result';
      const won = leader && leader.id === myId;
      verdict.textContent = won
        ? '🏆 Você venceu!'
        : leader ? `😤 ${leader.name} venceu` : '🤝 Ninguém correu — deu empate';
      card.insertBefore(verdict, rowsBox);
      const news = won ? '🏆 Você VENCEU um desafio da arena!'
        : leader ? `⚔️ Desafio encerrado: ${leader.name} venceu.`
          : '⚔️ Desafio encerrado sem corridas.';
      if (NewsSystem.push(`chal:${ch.id}`, news, 'gold')) {
        NewsSystem.renderInto(document.getElementById('news-list'));
      }
    }

    // As rows do standings SÓ têm quem aceitou (contrato do ChallengeSystem)
    for (const row of rows) {
      const line = document.createElement('div');
      line.className = 'chal-row';
      if (row.id === myId) line.classList.add('me');
      const left = document.createElement('span');
      const right = document.createElement('span');
      right.className = 'chal-pts';
      const crown = leader && leader.id === row.id && row.best ? '👑 ' : '';
      left.textContent = crown + row.name; // textContent: nome de terceiros
      right.textContent = row.best
        ? ScoreSystem.fmtPts(row.best.pts)
        : 'ainda não correu';
      line.append(left, right);
      rowsBox.appendChild(line);
    }

    // Convidados que ainda não responderam: participants fora do accepted
    const accepted = (ch.accepted && typeof ch.accepted === 'object') ? ch.accepted : {};
    for (const pid of ch.participants || []) {
      if (pid in accepted) continue;
      const line = document.createElement('div');
      line.className = 'chal-row waiting';
      const left = document.createElement('span');
      const name = (ch.names && ch.names[pid]) || '???';
      left.textContent = `aguardando ${name}`; // textContent
      line.appendChild(left);
      rowsBox.appendChild(line);
    }
  }

  // Toast DOM da home: o showToast do Phaser fica ATRÁS do overlay inicial.
  showHomeToast(msg) {
    const t = document.createElement('div');
    t.className = 'home-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2700);
  }

  // v1.8.4: `total` é a pontuação composta (o que ranqueia) e `meters` a
  // façanha física (viaja junto para as estacas da pista dos rivais).
  async submitScore(total, meters) {
    this.pendingScore = { total, meters };
    if (!StorageManager.getPlayerName()) {
      this.openNicknameModal();
      return;
    }
    const ok = await LeaderboardSystem.submit(total, meters);
    if (ok) this.showOnlineStatus('🌍 Enviado ao ranking mundial!');
    // v1.8.1: recorde novo vira notícia da home (dedupe pela própria marca)
    if (ok) NewsSystem.push(`rec:${Math.floor(total)}`,
      `🏅 Novo recorde pessoal: ${ScoreSystem.fmtPts(Math.floor(total))} (${Math.floor(meters)}m)!`, 'gold');
    // Só depois de o servidor aceitar: a confirmação do topo é uma consulta
    // nova, para nunca anunciar um "recorde mundial" a partir de cache velho
    if (ok) this.safeTelemetry(() => NotifySystem.maybeWorldRecord(total, meters));

    // Momento do orgulho: o score acabou de SUBIR no ranking mundial. Se o
    // apelido é automático, é agora que o convite tem chance de pegar.
    if (ok && this.shouldAskName()) {
      // Marca o convite ANTES de abrir: salvando ou recusando, o próximo só
      // vem daqui a 3 corridas
      StorageManager.setNameAskedAt(StorageManager.getAttempts());
      this.openNicknameModal(true, true);
    }
  }

  // Convite para trocar o nome automático: só com a marca ligada e no
  // máximo 1 a cada 3 corridas — insistir a cada morte viraria praga.
  shouldAskName() {
    if (!StorageManager.isNameAuto()) return false;
    return StorageManager.getAttempts() - StorageManager.getNameAskedAt() >= 3;
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

  shareResult() {
    return this.shareSummary({
      distance: this.finalDistance,
      legend: this.legend,
      escaped: Boolean(this.escaped || this.won),
      isNewRecord: Boolean(this.finalIsRecord),
    });
  }

  // Compartilhamento (v1.6.1): em vez de uma frase, um RESUMO formatado em
  // markdown do WhatsApp (*negrito* + quebras de linha), montado pelo mesmo
  // módulo que desenha o modal — assim os dois nunca discordam.
  //
  // `run` = resultado de uma corrida; `null` = o perfil inteiro.
  // Três caminhos, nesta ordem: folha nativa (celular) → wa.me (desktop, que
  // não tem navigator.share) → área de transferência.
  async shareSummary(run = null, statusId = null) {
    const url = location.origin + location.pathname; // sem ?debug etc.
    const show = (msg) => {
      if (statusId) document.getElementById(statusId).textContent = msg;
      else this.showShareStatus(msg);
    };

    let text;
    try {
      const mod = this.myStats || (this.myStats = await import('../stats/MyStats.js'));
      text = mod.shareText(run);
    } catch (e) {
      const d = run ? run.distance : StorageManager.getRecord();
      text = `🦏 *FURIOUS RHINO* — ${d}m! Duvido você passar disso 😏`;
    }
    const full = `${text}\n${url}`;

    if (navigator.share) {
      try {
        await navigator.share({ text, url });
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return; // cancelou: silêncio
        // Share falhou por outro motivo — cai nos caminhos abaixo
      }
    }

    // Desktop sem Web Share: o wa.me abre o WhatsApp Web/desktop já com o
    // texto pronto, que é exatamente o destino pedido
    const wa = `https://wa.me/?text=${encodeURIComponent(full)}`;
    const win = window.open(wa, '_blank', 'noopener');
    if (win) {
      show('📲 Abrindo o WhatsApp…');
      return;
    }

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(full);
        show('🔗 Resumo copiado — cole no WhatsApp!');
      } catch (e) {
        show('Não foi possível copiar.');
      }
    }
  }

  // rename=true: troca pela tela inicial (sem score pendente para enviar)
  // proud=true: convite disparado logo depois de o score subir no ranking —
  // o texto DIZ o que está em jogo em vez de perguntar no vazio.
  openNicknameModal(rename = false, proud = false) {
    const input = document.getElementById('nickname-input');
    const current = StorageManager.getPlayerName();
    this.renamingNickname = rename;
    this.proudAsk = proud;
    document.getElementById('nickname-error').textContent = '';

    let title;
    let sub;
    if (proud) {
      const rank = StorageManager.getLastRank();
      title = rank > 0 && rank <= 10
        ? `🏆 Você é o #${rank} do mundo!`
        : `🎉 Novo recorde: ${StorageManager.getRecord()}m!`;
      sub = `Com que nome anunciamos? Hoje você aparece como "${current}".`;
    } else if (rename) {
      title = current ? '✏️ Trocar apelido' : '👤 Escolher apelido';
      sub = 'Como você aparece no ranking mundial:';
    } else {
      title = '🌍 Novo recorde!';
      sub = 'Qual seu apelido para o ranking mundial?';
    }
    document.getElementById('nickname-title').textContent = title;
    document.getElementById('nickname-sub').textContent = sub;

    // O botão de recusa só some no rename comum de quem já escolheu um nome
    const skip = document.getElementById('nickname-skip');
    skip.hidden = rename && !proud && Boolean(current) && !StorageManager.isNameAuto();
    // "Ficar anônimo" só faz sentido quando ainda não existe nome nenhum;
    // no convite ele vira "Agora não" e não regrava coisa alguma
    skip.textContent = current ? 'Agora não' : 'Ficar anônimo';
    input.value = proud ? '' : current;
    this.openModal(document.getElementById('nickname-modal'));
    // O Phaser captura setas/espaço globalmente e quebraria a digitação
    this.input.keyboard.disableGlobalCapture();
    input.focus();
  }

  async saveNickname() {
    const input = document.getElementById('nickname-input');
    const error = document.getElementById('nickname-error');
    const saveBtn = document.getElementById('nickname-save');
    const name = input.value.trim();
    if (name.length < 3 || name.length > 12) {
      error.textContent = 'O apelido precisa ter de 3 a 12 caracteres.';
      return;
    }
    if (name === StorageManager.getPlayerName()) { // nada mudou
      this.closeNicknameModal(!this.renamingNickname);
      return;
    }

    // Duplicidade: consulta o ranking pelo apelido normalizado (sem acento
    // nem caixa). Offline (ou versão antiga do módulo em cache) devolve
    // false — nunca deixar o jogador preso no modal.
    error.textContent = 'Verificando apelido…';
    saveBtn.disabled = true;
    let verdict = 'unknown';
    try {
      verdict = await LeaderboardSystem.checkName(name);
    } catch (e) { /* segue como 'unknown' */ }
    saveBtn.disabled = false;
    if (verdict === 'taken') {
      error.textContent = 'Esse apelido já está em uso — escolha outro.';
      input.focus();
      input.select();
      return;
    }

    error.textContent = '';
    // Não dá para bloquear quem está sem rede, mas o jogador precisa saber
    // que ninguém conferiu (senão parece que o apelido estava livre)
    if (verdict === 'unknown') {
      this.showInviteStatus('⚠️ Apelido salvo, mas não deu para conferir se já existe.');
    } else if (this.renamingNickname) {
      this.showInviteStatus('');
    }
    StorageManager.setPlayerName(name);
    // Escolheu um nome de verdade: o jogo para de convidar
    StorageManager.setNameAuto(false);
    this.proudAsk = false;
    if (this.renamingNickname) {
      this.closeNicknameModal(false);
      this.updateIdentityLine();
      // Já está no ranking? Reescreve o doc mantendo o score (isso libera
      // o apelido anterior para outra pessoa)
      if (StorageManager.getBestSent() > 0) {
        this.safeTelemetry(() => LeaderboardSystem.rename(name));
      }
      return;
    }
    this.closeNicknameModal(true);
  }

  closeNicknameModal(submit) {
    this.closeModal(document.getElementById('nickname-modal'));
    this.input.keyboard.enableGlobalCapture();
    // v1.8.4: pendingScore é { total, meters } (o ranking é por pontos)
    if (submit && this.pendingScore) {
      LeaderboardSystem.submit(this.pendingScore.total, this.pendingScore.meters).then((ok) => {
        if (ok) this.showOnlineStatus('🌍 Enviado ao ranking mundial!');
      });
    }
  }

  // Botão de recusa do modal. Ele tem DOIS papéis:
  //  - sem nome nenhum ainda → "Ficar anônimo": gera Anonimo_N e entra no
  //    ranking assim mesmo (ninguém fica de fora por não querer se nomear)
  //  - já tem nome (convite do momento do orgulho) → "Agora não": só fecha,
  //    sem regravar nada e sem apagar a marca de nome automático
  nicknameSkip() {
    if (StorageManager.getPlayerName()) {
      StorageManager.setNameAskedAt(StorageManager.getAttempts());
      this.closeNicknameModal(false);
      return;
    }
    this.stayAnonymous();
  }

  // "Ficar anônimo": TODO jogador entra no ranking — gera Anonimo_N
  // (N = jogadores no ranking + 1), salva como nome do aparelho e envia.
  // A marca `name_is_auto` é o que faz o jogo voltar a convidar depois.
  async stayAnonymous() {
    this.closeNicknameModal(false);
    const name = await LeaderboardSystem.anonymousName();
    StorageManager.setPlayerName(name);
    StorageManager.setNameAuto(true);
    StorageManager.setNameAskedAt(StorageManager.getAttempts());
    this.updateIdentityLine();
    if (this.pendingScore) {
      const ok = await LeaderboardSystem.submit(this.pendingScore.total, this.pendingScore.meters);
      if (ok) this.showOnlineStatus(`🌍 No ranking como ${name}!`);
    }
  }

  startRun() {
    if (this.startTriggered) return;
    this.startTriggered = true;

    // Persiste JÁ: "Jogar Novamente" recarrega a página e apagaria memória
    StorageManager.addAttempt();
    // Sessão = aba aberta, não corrida. Só a PRIMEIRA chamada devolve true
    // (o sessionStorage sobrevive ao reload do "Jogar Novamente").
    this.firstRunOfSession = StorageManager.beginSession();
    if (this.firstRunOfSession) {
      this.safeTelemetry(() => NotifySystem.sessionStarted());
    }
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

    // v1.8.6 — a meta do desafio na largada: as estacas na pista marcam ONDE
    // (metros), mas quem decide é PONTOS — este toast diz o número a bater.
    // Tudo do cache síncrono (standingsCached); rede nenhuma na corrida.
    this.safeTelemetry(() => {
      const myId = StorageManager.getOrCreatePlayerId();
      const nowS = Math.floor(Date.now() / 1000);
      const cachedC = ChallengeSystem.cached();
      for (const ch of (cachedC && cachedC.list) || []) {
        if (!ChallengeSystem.isActive(ch, nowS)) continue;
        const st = ChallengeSystem.statusOf(ch, myId);
        if (st !== 'creator' && st !== 'accepted') continue;
        const rows = ChallengeSystem.standingsCached(ch.id);
        const leader = rows && ChallengeSystem.leaderOf(rows);
        if (leader && leader.id !== myId && leader.best) {
          this.time.delayedCall(700, () => this.showToast(
            `⚔️ a bater: ${ScoreSystem.fmtPts(leader.best.pts)} de ${leader.name}`,
            { y: 205, size: 24, duration: 2600, color: '#ff9a6c' }));
          break;
        }
      }
    });

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
    // dirigido pela distância (updateAtmosphere) — fuga aos 1000m = pôr do
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
    // v1.8.7 — distritos da cidade (Estado de Alerta): -1 = fora da régua
    // da cidade (o rino nasce no zoo); switchArea assume dali em diante
    this.cityAreaIndex = Constants.getCityAreaIndex(0);
    const b0 = Constants.BIOMES[0];
    this.bgFarA = this.add.tileSprite(640, 410, 1280, 420, `bg-far-${b0}`)
      .setScrollFactor(0).setDepth(-19);
    this.bgFarB = this.add.tileSprite(640, 410, 1280, 420, `bg-far-${b0}`)
      .setScrollFactor(0).setDepth(-18.9).setAlpha(0);
    this.bgNearA = this.add.tileSprite(640, 490, 1280, 260, `bg-near-${b0}`)
      .setScrollFactor(0).setDepth(-18);
    this.bgNearB = this.add.tileSprite(640, 490, 1280, 260, `bg-near-${b0}`)
      .setScrollFactor(0).setDepth(-17.9).setAlpha(0);

    // Tráfego da cidade: entre o fundo e o plano médio, com scroll próprio
    // (0,55 — mais rápido que o fundo, mais lento que a calçada). Fica em
    // alpha 0 fora da cidade; quem acende é o switchBiome.
    this.bgCars = this.add.tileSprite(640, 550, 1280, 120, 'bg-cars')
      .setScrollFactor(0).setDepth(-18.4).setAlpha(0);

    // Primeiro plano: passa NA FRENTE do rino, mas só na faixa abaixo da
    // linha do chão (y 660..720) — é o que garante que ele jamais esconda um
    // obstáculo. Fator > 1 (1,5): passa mais rápido que o rino, e é isso que
    // vende a profundidade.
    this.bgFg = this.add.tileSprite(640, 720, 1280, 120, 'bg-fg')
      .setScrollFactor(0).setDepth(3);

    // Camadas que recebem o tint atmosférico — NUNCA elementos de gameplay
    // (obstáculos/animais/rino ficam legíveis em qualquer hora do dia)
    this.atmoLayers = [
      this.bgClouds, this.bgMountains,
      this.bgFarA, this.bgFarB, this.bgNearA, this.bgNearB,
      this.bgCars, this.bgFg,
    ];
    this.lastAtmoTint = -1;

    this.createWeather();
    this.createSkyLife();
  }

  // Chuva, neblina e tempestade. Tudo preso à câmera e SEMPRE atrás do plano
  // de jogo (o relâmpago é a única exceção, e dura 140ms).
  createWeather() {
    this.fog = this.add.tileSprite(640, 470, 1280, 320, 'bg-fog')
      .setScrollFactor(0).setDepth(-17.6).setAlpha(0);
    this.atmoLayers.push(this.fog);

    this.rain = this.add.particles(0, 0, 'raindrop', {
      x: { min: -120, max: 1420 },
      y: -30,
      lifespan: 1300,
      speedX: { min: -260, max: -180 },
      speedY: { min: 720, max: 900 },
      scale: { min: 0.7, max: 1.3 },
      alpha: { start: 0.55, end: 0.2 },
      quantity: 2,
      frequency: 40,
    });
    this.rain.setScrollFactor(0).setDepth(-17.4);
    this.rain.stop();

    this.lightning = this.add.rectangle(640, 360, 1280, 720, 0xffffff)
      .setScrollFactor(0).setDepth(50).setAlpha(0);

    this.weather = 'limpo';
    this.nextThunderAt = 0;
  }

  setWeather(kind) {
    this.weather = kind;
    const rainy = kind === 'chuva' || kind === 'tempestade';
    if (rainy) {
      this.rain.frequency = kind === 'tempestade' ? 18 : 40;
      this.rain.start();
    } else {
      this.rain.stop();
    }
    // Neblina com TETO de alpha: acima disso ela esconde obstáculo
    const target = kind === 'neblina' ? Constants.FOG_MAX_ALPHA
      : kind === 'tempestade' ? 0.14 : 0;
    this.tweens.killTweensOf(this.fog);
    this.tweens.add({ targets: this.fog, alpha: target, duration: 1400 });
  }

  updateWeather(x, time) {
    const kind = Constants.weatherFor(x);
    if (kind !== this.weather) this.setWeather(kind);

    if (this.fog.alpha > 0.001) {
      this.fog.tilePositionX = this.cameras.main.scrollX * 0.22 + time * 0.012;
    }

    if (this.weather === 'tempestade' && time > this.nextThunderAt) {
      // Primeira passada só arma o relógio: nada de trovão no frame de entrada
      if (this.nextThunderAt) {
        this.lightning.setAlpha(0.4);
        this.tweens.add({ targets: this.lightning, alpha: 0, duration: 140 });
        this.audio.playThunder();
      }
      this.nextThunderAt = time + 3500 + Math.random() * 5500;
    }
  }

  // Marcas na pista: estacas com nome e distância de quem você tem de passar.
  // Lidas do CACHE (LeaderboardSystem.fetchRivals grava na tela inicial) —
  // a corrida jamais espera a rede; sem cache, aparecem menos marcas.
  createTrackMarks() {
    this.trackMarks = [];
    const rivals = StorageManager.getRivals();
    const record = StorageManager.getRecord();
    const bar = document.getElementById('progress-marks');

    // ARMADILHA v1.8.4: a estaca é POSIÇÃO FÍSICA na pista, então ela é
    // plantada em METROS — nunca no `score`, que virou pontuação composta.
    const add = (meters, label, color, msg, fanfare = false) => {
      if (!meters || meters < 5) return; // marca colada na largada não provoca
      const x = meters * Constants.PIXELS_PER_METER;
      if (x >= Constants.WORLD_END_PX) return;
      // Duas marcas na mesma distância viram uma só (a primeira registrada)
      if (this.trackMarks.some((m) => Math.abs(m.x - x) < 90)) return;

      this.add.image(x, Constants.GROUND_TOP, 'track-flag')
        .setOrigin(0.5, 1).setDepth(-0.6).setTint(color);
      this.add.text(x, Constants.GROUND_TOP - 236, label, {
        fontFamily: '"Arial Black", Arial, sans-serif',
        fontSize: '18px',
        color: '#ffffff',
        stroke: '#3a2a14',
        strokeThickness: 5,
        align: 'center',
      }).setOrigin(0.5, 1).setDepth(-0.55);

      // Espelho no HUD: a barra cobre 0–1000m, só as marcas de dentro entram
      if (x <= Constants.WIN_DISTANCE_PX && bar) {
        const tick = document.createElement('i');
        tick.className = 'rival-mark';
        tick.style.left = `${(x / Constants.WIN_DISTANCE_PX) * 100}%`;
        tick.style.background = `#${color.toString(16).padStart(6, '0')}`;
        bar.appendChild(tick);
      }

      this.trackMarks.push({ x, msg, fanfare, passed: false });
    };

    add(record, `🏅 SEU RECORDE\n${record}m`, 0xffd95e,
      '🏅 SEU RECORDE FICOU PRA TRÁS!');
    // Rival e líder: os metros vêm do campo `m` das entradas (cache velho,
    // sem `m`, cai no `score` pelo metersOf — era metro antes da v1.8.4)
    if (rivals.rival) {
      const rm = ScoreSystem.metersOf(rivals.rival);
      add(rm, `⚔️ ${rivals.rival.name}\n${rm}m`, 0xff9a6c,
        `⚔️ VOCÊ PASSOU ${rivals.rival.name.toUpperCase()}!`);
    }
    if (rivals.leader) {
      const lm = ScoreSystem.metersOf(rivals.leader);
      add(lm, `👑 ${rivals.leader.name}\n${lm}m`, 0xb79cff,
        '👑 VOCÊ É O NOVO LÍDER DO MUNDO!', true);
    }

    // v1.8.6 — adversários dos desafios ativos que aceitei/criei, SÓ do
    // cache síncrono (standingsCached — a corrida jamais espera rede).
    // NOTA: a estaca marca ONDE (metros) foi a melhor corrida do adversário;
    // quem DECIDE o desafio são os PONTOS — o toast da largada diz o número
    // que vale. O anti-colisão de 90px do add() resolve sobreposições.
    try {
      const myId = StorageManager.getOrCreatePlayerId();
      const nowS = Math.floor(Date.now() / 1000);
      const cachedC = ChallengeSystem.cached();
      for (const ch of (cachedC && cachedC.list) || []) {
        if (!ChallengeSystem.isActive(ch, nowS)) continue;
        const st = ChallengeSystem.statusOf(ch, myId);
        if (st !== 'creator' && st !== 'accepted') continue;
        const rows = ChallengeSystem.standingsCached(ch.id);
        if (!rows) continue;
        for (const row of rows) {
          if (row.id === myId || !row.best) continue;
          add(row.best.m, `⚔️ ${row.name}\n${row.best.m}m`, 0xff6b6b,
            `⚔️ VOCÊ PASSOU ${row.name.toUpperCase()} NO DESAFIO!`);
        }
      }
    } catch (e) { /* desafio é acessório — a pista nasce sem as estacas */ }
  }

  updateTrackMarks() {
    const x = this.rhino.getSprite().x;
    for (const m of this.trackMarks) {
      if (m.passed || x < m.x) continue;
      m.passed = true;
      this.showToast(m.msg, { y: 260, size: 30, duration: 1900 });
      if (m.fanfare) this.audio.playFanfare();
      else this.audio.playSectorPass();
    }
  }

  // Marcos de setor: um objeto que ATRAVESSA a tela em cada fronteira. O
  // crossfade sozinho passava despercebido — é o marco que faz a troca virar
  // acontecimento. v1.8.7: generalizado para uma TABELA de marcos — os arcos
  // de bioma do zoo (i×8000; os 32000 já têm o portão) + os três portais dos
  // distritos, cada um com textura própria e um efeito ao cruzar (fx).
  createSectorArches() {
    const marks = [];
    for (let i = 1; i < Constants.BIOMES.length - 1; i++) {
      marks.push({
        x: i * 8000, tex: 'biome-arch',
        label: Constants.BIOMES[i].toUpperCase(), labelDy: 274,
      });
    }
    // Portais do Estado de Alerta (labelDy acompanha a altura de cada canvas)
    marks.push({
      x: 56000, tex: 'portal-viaduto',
      label: 'VIADUTO DO CENTRO', labelDy: 294, fx: 'siren',
    });
    marks.push({
      x: 72000, tex: 'portal-checkpoint',
      label: 'CHECKPOINT DA CONTENÇÃO', labelDy: 274, fx: 'klaxon',
    });
    marks.push({
      x: 88000, tex: 'portal-rodovia',
      label: 'RODOVIA — KM 0', labelDy: 294, fx: 'fanfare',
    });
    // v1.8.10 — obeliscos de fronteira das etapas do deserto, SEM fx (o
    // flash/sting/toast é do switchArea; os bosses são os marcos físicos
    // das outras fronteiras — Cerco 146000 e Faraó 188000). O label vem da
    // própria tabela de áreas (fonte única com o toast do agente A).
    for (const bx of [108000, 128000, 148000, 168000]) {
      const area = Constants.CITY_DISTRICTS.find((a) => a.from === bx);
      marks.push({
        x: bx, tex: 'marco-obelisco',
        label: (area && area.label) || '', labelDy: 316,
      });
    }

    this.portalMarks = [];
    for (const m of marks) {
      this.add.image(m.x, Constants.GROUND_TOP, m.tex)
        .setOrigin(0.5, 1).setDepth(-1);
      this.add.text(m.x, Constants.GROUND_TOP - m.labelDy, m.label, {
        fontFamily: '"Arial Black", Arial, sans-serif',
        fontSize: '22px',
        color: m.fx ? '#e8e9ec' : '#5e3618',
        stroke: m.fx ? '#1f2531' : undefined,
        strokeThickness: m.fx ? 5 : 0,
      }).setOrigin(0.5).setDepth(-0.9);
      // Só os portais novos têm efeito de passagem (molde do updateTrackMarks)
      if (m.fx) this.portalMarks.push({ x: m.x, fx: m.fx, passed: false });
    }
  }

  // v1.8.7 — o efeito ao CRUZAR cada portal (os toasts de área ficam com o
  // switchArea; aqui é o evento pontual do marco físico).
  updatePortals() {
    const x = this.rhino.getSprite().x;
    for (const m of this.portalMarks) {
      if (m.passed || x < m.x) continue;
      m.passed = true;
      if (m.fx === 'siren') {
        // Viaduto do Centro: o semáforo fecha — sirene curta de presságio
        this.audio.playSirenShort();
      } else if (m.fx === 'klaxon') {
        // Checkpoint: klaxon + strobe vermelho/ciano (2 pulsos alternados)
        this.audio.playKlaxon();
        const strobe = this.add.rectangle(640, 360, 1280, 720, 0xff4a5e)
          .setScrollFactor(0).setDepth(50).setAlpha(0.22);
        this.tweens.add({
          targets: strobe, alpha: 0, duration: 480,
          onUpdate: (tw) => {
            // alterna a cor no meio do fade — o "gira-gira" da viatura
            strobe.fillColor = tw.progress > 0.5 ? 0x4ad1ff : 0xff4a5e;
          },
          onComplete: () => strobe.destroy(),
        });
      } else if (m.fx === 'fanfare') {
        // Pórtico da Rodovia: a saída triunfal de quem atravessou a cidade
        this.audio.playFanfare();
        this.showToast('🛣️ VOCÊ ATRAVESSOU A CIDADE!', { y: 250, size: 34, duration: 2400 });
      }
    }
  }

  // Vida no cenário: pássaros distantes cruzando o céu + folhas ao vento.
  // A população muda com o bioma — é o que faz o aviário PARECER um aviário
  // e o pântano parecer parado. O pool tem sempre o tamanho máximo; quem
  // sobra fica invisível (SKY_LIFE define quantos entram em cada trecho).
  static SKY_LIFE = {
    jaulas: { n: 2, species: ['jay', 'cockatiel'], speed: [18, 40] },
    aviario: { n: 7, species: Constants.BIRD_SPECIES, speed: [26, 60] },
    savana: { n: 3, species: ['toucan', 'owl'], speed: [14, 30] },
    floresta: { n: 4, species: ['macaw', 'toucan'], speed: [20, 44] },
    pantano: { n: 1, species: ['owl'], speed: [10, 22] },
    cidade: { n: 5, species: ['jay', 'cockatiel'], speed: [30, 66] },
    // v1.8.10 — deserto (skyLife das áreas, não do bioma): ABUTRES circulam
    // ao longe, lentos. texPrefix troca a família de textura (o rig do
    // abutre é enemy-abutre/-flap, não animal-bird-*).
    deserto: { n: 3, species: ['abutre'], speed: [8, 22], texPrefix: 'enemy-' },
  };

  skyLifeFor(key) {
    return GameScene.SKY_LIFE[key] || GameScene.SKY_LIFE.jaulas;
  }

  createSkyLife() {
    this.skyBirds = [];
    const max = Math.max(...Object.values(GameScene.SKY_LIFE).map((v) => v.n));
    for (let i = 0; i < max; i++) {
      const b = this.add.image(0, 0, 'animal-bird-jay')
        .setScrollFactor(0).setDepth(-18.5).setScale(0.2); // textura 2x → ~22px
      b.flapT = 0;
      b.flapped = false;
      this.resetSkyBird(b, true);
      this.skyBirds.push(b);
      this.atmoLayers.push(b);
    }
    this.applySkyLife(Constants.BIOMES[0]);

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

  // Liga/desliga aves do pool conforme o bioma e reespecia as que ficam
  applySkyLife(key) {
    const cfg = this.skyLifeFor(key);
    this.skyLife = cfg;
    this.skyBirds.forEach((b, i) => {
      const on = i < cfg.n;
      b.setVisible(on);
      if (on) this.resetSkyBird(b, true);
    });
  }

  resetSkyBird(b, initial = false) {
    const cfg = this.skyLife || this.skyLifeFor(Constants.BIOMES[0]);
    b.species = Phaser.Utils.Array.GetRandom(cfg.species);
    b.dir = Math.random() < 0.65 ? 1 : -1; // maioria foge do zoo, como o rino
    // v1.8.10: base de textura resolvida AQUI (texPrefix opcional do cfg —
    // o abutre do deserto vive em enemy-*, os pássaros em animal-bird-*)
    b.texBase = `${cfg.texPrefix || 'animal-bird-'}${b.species}`;
    b.setTexture(b.texBase);
    b.setFlipX(b.dir < 0);
    b.speed = cfg.speed[0] + Math.random() * (cfg.speed[1] - cfg.speed[0]);
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
    // Guardado para o switchBiome trocar grama por asfalto ao entrar na cidade
    // (mesmo canvas 1280x100, então é só um setTexture — nada é recriado)
    this.ground = ground;

    this.physics.add.collider(this.rhino.getSprite(), ground);

    // Animais terrestres pisam no chão (pulos do macaco/zebra com arco real);
    // abatidos pelo dash e os voadores atravessam e reciclam fora da tela
    this.physics.add.collider(
      this.spawnManager.getAnimalsGroup(), ground, null,
      (animal) => animal.active && !animal.knockedOut && !animal.isFlyer(),
      this
    );
  }

  // Alphas dos três céus empilhados (dia embaixo, entardecer e noite por
  // cima). Até 1450m segue a curva narrativa: dia pleno, entardecer chegando
  // junto com o portão (a fuga acontece no pôr do sol) e noite no modo
  // infinito. Dali em diante CICLA — na v1.5 a noite fechava e nunca mais
  // mudava, justo onde os melhores jogadores estão. Zero textura nova: o céu
  // do entardecer serve de amanhecer.
  skyPhase(x) {
    const S = Constants.SKY_CYCLE_START_PX;
    if (x < S) {
      const d0 = Constants.SKY_DUSK_FROM, d1 = Constants.SKY_DUSK_TO;
      return {
        dusk: Phaser.Math.Clamp((x - d0) / (d1 - d0), 0, 1),
        night: Phaser.Math.Clamp((x - d1) / (Constants.SKY_NIGHT_TO - d1), 0, 1),
      };
    }
    // Em x = S o ciclo começa exatamente em noite fechada (dusk 1, night 1),
    // que é onde a curva narrativa termina — a emenda é contínua
    const p = ((x - S) / Constants.SKY_CYCLE_PX) % 1;
    if (p < 0.25) return { dusk: 1, night: 1 - p / 0.25 };          // amanhecer
    if (p < 0.5) return { dusk: 1 - (p - 0.25) / 0.25, night: 0 };  // manhã
    if (p < 0.75) return { dusk: (p - 0.5) / 0.25, night: 0 };      // entardecer
    return { dusk: 1, night: (p - 0.75) / 0.25 };                   // anoitecer
  }

  // Céu, luz e bioma acompanham a distância; pássaros distantes cruzam o
  // céu. Roda por frame no update (barato: 2 alphas, 1 tint, comparação int)
  updateAtmosphere(time, delta) {
    const x = this.rhino.getSprite().x;

    const { dusk, night } = this.skyPhase(x);
    this.skyDusk.setAlpha(dusk);
    this.skyNight.setAlpha(night);

    this.updateWeather(x, time);

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

    // v1.8.7 — distrito da cidade (a régua CITY_DISTRICTS só governa visual
    // e spawn; tier/clima continuam na régua de 8000px)
    const aIdx = Constants.getCityAreaIndex(x);
    if (aIdx !== this.cityAreaIndex) this.switchArea(aIdx);

    // Pássaros distantes: deriva própria + batida de asas por troca de textura
    const dt = delta / 1000;
    for (const b of this.skyBirds) {
      if (!b.visible) continue; // fora da população do bioma atual
      b.x += b.dir * b.speed * dt;
      b.y += Math.sin(time * 0.002 + b.bobPhase) * 9 * dt;
      b.flapT += delta;
      if (b.flapT > 260) {
        b.flapT = 0;
        b.flapped = !b.flapped;
        b.setTexture(`${b.texBase}${b.flapped ? '-flap' : ''}`);
        b.setFlipX(b.dir < 0);
      }
      if ((b.dir > 0 && b.x > 1360) || (b.dir < 0 && b.x < -80)) this.resetSkyBird(b);
    }
  }

  switchBiome(idx) {
    const first = this.biomeIndex === undefined;
    this.biomeIndex = idx;
    const key = Constants.BIOMES[idx];

    // A troca vira ACONTECIMENTO: o arco passa pela tela (createSectorArches),
    // a luz estoura e o nome do setor aparece. Na v1.5 era só um crossfade
    // silencioso de 900ms — ninguém percebia que o cenário tinha mudado.
    // A entrada na CIDADE é a fuga: o crossGate faz a festa toda (portão
    // explodindo, fogos, confete, dois toasts). Um segundo flash e um terceiro
    // toast aqui só atropelariam.
    if (!first && this.started && key !== 'cidade') {
      const flash = this.add.rectangle(640, 360, 1280, 720, 0xffffff)
        .setScrollFactor(0).setDepth(50).setAlpha(0.35);
      this.tweens.add({
        targets: flash, alpha: 0, duration: 260,
        onComplete: () => flash.destroy(),
      });
      this.showToast(Constants.BIOME_LABELS[key] || key, { y: 200, size: 32, duration: 1800 });
      this.audio.playSectorPass();
    }

    // Na cidade o chão vira asfalto. A troca é seca de propósito: ela
    // acontece no mesmo frame do estouro do portão, escondida pelo flash.
    // v1.8.10: chão/fg/carros/céu-vida saem do applyAreaEnvironment — a
    // ÁREA vence quando define os campos (um teleporte pode trocar bioma E
    // área no mesmo frame; consultar a área por x aqui garante a ordem).
    this.applyAreaEnvironment(Constants.cityAreaFor(this.rhino.getSprite().x));

    // Teleportes de debug podem pular vários biomas com o tween anterior no
    // ar: mata o tween e recomeça o crossfade da camada B do zero
    this.tweens.killTweensOf([this.bgFarB, this.bgNearB]);
    this.bgFarB.setTexture(`bg-far-${key}`).setAlpha(0);
    this.bgNearB.setTexture(`bg-near-${key}`).setAlpha(0);
    this.tweens.add({
      targets: [this.bgFarB, this.bgNearB],
      alpha: 1,
      // 500ms para casar com a passagem do arco pela tela
      duration: 500,
      onComplete: () => {
        // Consolida na base A e libera B para a próxima fronteira
        this.bgFarA.setTexture(`bg-far-${key}`).setAlpha(1);
        this.bgNearA.setTexture(`bg-near-${key}`).setAlpha(1);
        this.bgFarB.setAlpha(0);
        this.bgNearB.setAlpha(0);
      },
    });
  }

  // v1.8.7 — quais distritos trocam o backdrop e para qual chave. A BRECHA
  // fica FORA de propósito: a contenção continua no horizonte (a cidade
  // ficando para trás) — só o toast marca a entrada. A rodovia devolve o
  // backdrop genérico da cidade (é ele que assume o infinito pós-2200).
  static AREA_BACKDROP = {
    suburbio: 'suburbio', vidro: 'vidro', contencao: 'contencao', rodovia: 'cidade',
    // v1.8.10 — as 5 etapas do deserto; o infinito pós-Faraó (`deserto`)
    // REUSA o backdrop do vale (as pirâmides ficam no horizonte para
    // sempre), escurecido de graça pelo ciclo do céu
    duna: 'duna', oasis: 'oasis', escavacao: 'escavacao', vale: 'vale',
    necropole: 'necropole', deserto: 'vale',
  };
  // O flash de cada distrito é COLORIDO (âmbar/ciano/vermelho) — a
  // identidade da área no lugar do branco fixo dos biomas.
  // v1.8.10 — deserto: areia clara → turquesa do oásis → poeira ocre →
  // dourado do Vale → âmbar fúnebre da Necrópole. `deserto` fica FORA de
  // propósito (sem flash/sting — a fronteira física é a muralha do Faraó).
  static AREA_FLASH = {
    suburbio: 0xffb066, vidro: 0x4ad1ff, contencao: 0xff4a5e,
    duna: 0xe8c98a, oasis: 0x4ecdc4, escavacao: 0xd9a441,
    vale: 0xffd24a, necropole: 0xc9852a,
  };

  // v1.8.10 — chão, primeiro plano, tráfego e céu-vida por ÁREA. Os campos
  // são OPCIONAIS na tabela (ground/fg/cars/skyLife): a área VENCE quando
  // define; ausente, vale o default do BIOMA vigente (comportamento antigo,
  // byte a byte, para as 4 áreas da cidade + Brecha). Chamado pelo
  // switchArea E pelo switchBiome — nos teleportes de debug os dois disparam
  // no mesmo frame e, sem o funil único, o bioma sobrescreveria a área.
  applyAreaEnvironment(area) {
    const biome = Constants.BIOMES[this.biomeIndex] || Constants.BIOMES[0];
    const city = biome === 'cidade';
    this.ground.setTexture((area && area.ground) || (city ? 'ground-city' : 'ground'));
    this.bgFg.setTexture((area && area.fg) || (city ? 'bg-fg-city' : 'bg-fg'));
    this.applySkyLife((area && area.skyLife) || biome);
    // Tráfego só existe na cidade — e some quando a área diz cars:false
    // (não há carros na areia); religa sozinho ao voltar a uma área com cars
    const carsOn = city && !(area && area.cars === false);
    this.tweens.killTweensOf(this.bgCars);
    this.tweens.add({
      targets: this.bgCars, alpha: carsOn ? 1 : 0, duration: 500,
    });
  }

  // Gêmeo do switchBiome para os DISTRITOS (Estado de Alerta): crossfade de
  // 500ms nas mesmas camadas B, flash colorido, toast com o label da área e
  // o sting de 3 notas próprio. Consultado no updateAtmosphere ao lado da
  // troca de bioma; a régua CITY_DISTRICTS nunca toca tier/clima.
  // v1.8.10: também aplica os campos novos da área (ground/fg/cars/skyLife)
  // via applyAreaEnvironment — os toasts de etapa do deserto saem daqui
  // (labels da tabela do agente A).
  switchArea(areaIdx) {
    this.cityAreaIndex = areaIdx;
    if (areaIdx < 0) return; // voltou para fora da régua (teleporte de debug)
    const area = Constants.CITY_DISTRICTS[areaIdx];
    if (!area) return;

    // Campos novos (v1.8.10): chão/fg/carros/céu-vida da área, quando houver
    this.applyAreaEnvironment(area);

    if (this.started) {
      const color = GameScene.AREA_FLASH[area.key];
      if (color !== undefined) {
        const flash = this.add.rectangle(640, 360, 1280, 720, color)
          .setScrollFactor(0).setDepth(50).setAlpha(0.3);
        this.tweens.add({
          targets: flash, alpha: 0, duration: 300,
          onComplete: () => flash.destroy(),
        });
        this.audio.playAreaSting(areaIdx);
      }
      // Brecha e as etapas do deserto também anunciam (o label da área);
      // o triunfo do pórtico em si fica com o updatePortals. Áreas sem
      // label (rodovia legada, deserto profundo) trocam em silêncio.
      if (area.label) this.showToast(area.label, { y: 200, size: 32, duration: 1800 });
    }

    const bg = GameScene.AREA_BACKDROP[area.key];
    if (!bg) return; // brecha: o horizonte não muda
    // Mesmo protocolo anti-teleporte do switchBiome: mata o tween em voo e
    // recomeça o crossfade da camada B do zero
    this.tweens.killTweensOf([this.bgFarB, this.bgNearB]);
    this.bgFarB.setTexture(`bg-far-${bg}`).setAlpha(0);
    this.bgNearB.setTexture(`bg-near-${bg}`).setAlpha(0);
    this.tweens.add({
      targets: [this.bgFarB, this.bgNearB],
      alpha: 1,
      duration: 500,
      onComplete: () => {
        this.bgFarA.setTexture(`bg-far-${bg}`).setAlpha(1);
        this.bgNearA.setTexture(`bg-near-${bg}`).setAlpha(1);
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
        this.doJump();
      } else {
        this.doDash();
      }
    });

    this.input.on('pointerup', (pointer) => {
      if (pointer.id === this.leftPointerId) {
        this.leftPointerId = null;
        this.rhino.onLeftRelease();
      }
    });

    // Teclado (desktop). Pulo: ← ou ESPAÇO. Investida: → ou ENTER.
    // Duas teclas por ação porque a mão esquerda no ESPAÇO e a direita no
    // ENTER é a pegada natural de quem joga no teclado — as setas continuam
    // valendo para quem já se acostumou.
    const jumpKeys = ['LEFT', 'SPACE'];
    const dashKeys = ['RIGHT', 'ENTER'];

    jumpKeys.forEach((k) => {
      this.input.keyboard.on(`keydown-${k}`, (event) => {
        if (event.repeat || !this.canPlay()) return;
        event.preventDefault(); // ESPAÇO rolaria a página
        this.doJump(true);
      });
      // Sem guarda: só desarma a carga do pulo, é inofensivo fora da corrida
      this.input.keyboard.on(`keyup-${k}`, () => this.rhino.onLeftRelease());
    });

    dashKeys.forEach((k) => {
      this.input.keyboard.on(`keydown-${k}`, (event) => {
        if (event.repeat || !this.canPlay()) return;
        this.doDash(true);
      });
    });

    // Especial FÚRIA TOTAL: ↓ ou SHIFT (paridade desktop do toque no ícone)
    ['DOWN', 'SHIFT'].forEach((k) => {
      this.input.keyboard.on(`keydown-${k}`, (event) => {
        if (event.repeat || !this.canPlay()) return;
        event.preventDefault();
        this.doSpecial(true);
      });
    });

    // O toque no medidor de fúria chega por aqui (o stopPropagation dentro do
    // FurySystem garante que ele não vira um doDash da metade direita)
    this.furySystem.onActivate = () => {
      if (this.canPlay()) this.doSpecial();
    };
    this.furySystem.onFull = () => {
      this.showToast('🔥 FÚRIA CHEIA — TOQUE NO MEDIDOR!', { y: 210, size: 30, duration: 2200, color: '#ffb347' });
      this.audio.playFuryReady();
    };
    this.furySystem.onEnd = () => {
      this.audio.playFizzle();
    };
  }

  // Funil único das duas ações. São QUATRO pontos de entrada (ponteiro
  // esquerdo/direito e as duas listas de teclas) — contar em cada um deles
  // seria esquecer em um na próxima vez que alguém mexer aqui.
  doJump(fromKeyboard = false) {
    if (fromKeyboard) this.usedKeyboard = true;
    this.runJumps++;
    this.rhino.onLeftPress();
    this.audio.playJump(this.rhino.jumpCount);
  }

  doDash(fromKeyboard = false) {
    if (fromKeyboard) this.usedKeyboard = true;
    if (this.rhino.onRightPress()) {
      this.runDashes++;
      this.audio.playDash();
    } else {
      // Investida pedida durante o cooldown: o jogador QUIS investir e o jogo
      // disse não. É a medida direta de atrito com a espera do dash.
      this.runDashWasted++;
    }
  }

  // Especial FÚRIA TOTAL (v1.7): só transforma com o medidor cheio; toque
  // com medidor vazio é silencioso de propósito (o pulso do ícone já diz
  // quando dá). O modo em si vive no FurySystem (drenagem/velocidade/sprite).
  doSpecial(fromKeyboard = false) {
    if (fromKeyboard) this.usedKeyboard = true;
    // v1.8: na arena do boss a fúria não pega — feedback só quando o jogador
    // tinha carga para gastar (toque com medidor vazio segue silencioso)
    if (this.furySystem.isBlocked() && this.furySystem.charge >= 1) {
      this.runFuryDenied++;
      this.showToast('🔒 A fúria não pega no portão!', { y: 250, size: 30, duration: 1500 });
      return;
    }
    if (!this.furySystem.activate(this.rhino)) return;
    this.runSpecials++;
    // O estouro da transformação: flash alaranjado + tremida + trovão
    const flash = this.add.rectangle(640, 360, 1280, 720, 0xff8a2a)
      .setScrollFactor(0).setDepth(50).setAlpha(0.5);
    this.tweens.add({ targets: flash, alpha: 0, duration: 420, onComplete: () => flash.destroy() });
    this.cameras.main.shake(250, 0.012);
    this.audio.playThunder();
    this.showToast('🔥 FÚRIA TOTAL!', { y: 250, size: 40, duration: 1500, color: '#ffb347' });
  }

  // A corrida está em andamento e aceita comando?
  canPlay() {
    return this.started && !this.gameOver && !this.won && !this.paused;
  }

  // ------------------------------------------------------------------ pausa
  // Tudo em DOM de propósito: scene.pause() desliga o input do Phaser, então
  // um botão feito com sprite nunca conseguiria retomar o jogo.
  setupPause() {
    this.paused = false;
    this.pausedMs = 0;
    const btn = document.getElementById('pause-btn');
    const modal = document.getElementById('pause-modal');
    const stop = (ev) => ev.stopPropagation();

    btn.addEventListener('pointerdown', stop);
    btn.addEventListener('click', (ev) => { stop(ev); this.togglePause(); });
    modal.addEventListener('pointerdown', stop);
    document.getElementById('pause-resume').addEventListener('click', (ev) => {
      stop(ev);
      this.togglePause();
    });
    // Desistir: a run é CANCELADA — o endGame nunca roda (nada de runs[],
    // morte, playtime ou telemetria) e a tentativa contada no startRun é
    // devolvida. O reload é o mesmo caminho do "Jogar Novamente": cai na
    // start screen limpa.
    document.getElementById('pause-quit').addEventListener('click', (ev) => {
      stop(ev);
      StorageManager.removeAttempt();
      location.reload();
    });

    // Tecla no WINDOW, não no Phaser: com a cena pausada o input dela morre
    window.addEventListener('keydown', (ev) => {
      if (ev.key !== 'p' && ev.key !== 'P' && ev.key !== 'Escape') return;
      if (!this.started || this.gameOver || this.won) return;
      ev.preventDefault();
      this.togglePause();
    });

    // Trocar de aba/bloquear o celular pausa sozinho — e de quebra conserta a
    // inflação do playTimeS, que sempre contou tempo de tela apagada
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pauseGame();
    });

    this.alignHudButtons();
    this.scale.on('resize', () => this.alignHudButtons());
  }

  // Som/pausa são DOM fixos no viewport, mas os ícones de fúria e dash vivem
  // no canvas escalado por Scale.FIT — um top de CSS não acompanha. Alinha os
  // botões logo ABAIXO da linha dos ícones usando o retângulo real do canvas
  // (o fallback top:20px do CSS só vale até o boot chegar aqui).
  alignHudButtons() {
    const canvas = this.game && this.game.canvas;
    if (!canvas) return;
    const b = canvas.getBoundingClientRect();
    // base dos ícones: HUD_MARGIN + 30 (centro) + 30 (meia altura do ícone)
    const iconsBottom = Constants.HUD_MARGIN + 60;
    const top = Math.round(b.top + (iconsBottom / Constants.GAME_HEIGHT) * b.height + 8);
    for (const id of ['pause-btn', 'mute-btn']) {
      const el = document.getElementById(id);
      if (el) el.style.top = `${top}px`;
    }
  }

  pauseGame() {
    if (this.paused || !this.started || this.gameOver || this.won) return;
    this.paused = true;
    this.pauseStartedAt = Date.now();
    this.runPauses++;
    this.audio.duckMusic(true);
    this.openModal(document.getElementById('pause-modal'));
    this.scene.pause();
  }

  resumeGame() {
    if (!this.paused) return;
    this.paused = false;
    // O tempo parado NÃO conta na telemetria (runS usa relógio de parede)
    this.pausedMs += Date.now() - this.pauseStartedAt;
    this.closeModal(document.getElementById('pause-modal'));
    this.scene.resume();
    this.audio.duckMusic(false);
  }

  togglePause() {
    if (this.paused) this.resumeGame();
    else this.pauseGame();
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

    // v1.8.7 — hazards dos distritos. O pool é um array plano (ver create),
    // e o Arcade o aceita direto; body desligado = sem overlap, que é
    // exatamente o ciclo do hidrante/arco.
    this.physics.add.overlap(
      this.rhino.getSprite(),
      this.hazards,
      this.onHazardHit,
      null,
      this
    );
  }

  // v1.8.7 — handler canônico dos hazards de distrito. Ordem das guardas:
  // fim de jogo → rampage (pulveriza: caçamba vira smash com pontos de
  // parede; temporizado só estoura se está LETAL) → invincible de debug →
  // caçamba (dash quebra e pontua como parede; sem dash, mata) →
  // temporizado (mata SÓ no pulso letal — fora dele o corpo nem deveria
  // estar ligado, o lethal é o cinto-e-suspensório).
  onHazardHit(rhino, hazard) {
    if (this.gameOver || this.won) return;
    const smashable = hazard.kind === 'cacamba';

    if (this.furySystem.rampage) {
      if (smashable) {
        hazard.smash();
        this.runWallsBroken++;
        this.addScore('wall', hazard.x, hazard.y - 32);
        this.audio.playBreak();
        this.createExplosion(hazard.x, hazard.y - 32);
        this.createBreakParticles(hazard.x, hazard.y - 32, 6);
      } else if (hazard.lethal) {
        this.audio.playBreak();
        this.createExplosion(hazard.x, hazard.y - 80);
        hazard.deactivate();
      }
      return;
    }
    if (this.invincible) return; // debug: atravessa

    if (smashable) {
      if (this.rhino.dashState === 'active') {
        // A primeira barreira BAIXA do jogo: pulável OU destrutível —
        // conta e pontua como PAREDE (contrato de pontuação: zero peso novo)
        hazard.smash();
        this.runWallsBroken++;
        this.addScore('wall', hazard.x, hazard.y - 32);
        this.audio.playBreak();
        this.createExplosion(hazard.x, hazard.y - 32);
        this.createBreakParticles(hazard.x, hazard.y - 32, 6);
      } else {
        this.endGame(false, hazard.deathCause);
      }
      return;
    }
    if (hazard.lethal) this.endGame(false, hazard.deathCause);
  }

  // Janelas FIXAS por distrito (determinísticas — armadilha é arquitetura):
  // D1 3 caçambas (1150/1250/1350m), D2 2 hidrantes (1500/1650m), D3 2 arcos
  // (1850/1925m — antes da arena da Muralha, que trava em ~78900). Todas
  // fora dos ±300px sem-spawn dos portais (56000/72000/88000).
  static HAZARD_SPOTS = [
    { x: 46000, kind: 'cacamba' },
    { x: 50000, kind: 'cacamba' },
    { x: 54000, kind: 'cacamba' },
    { x: 60000, kind: 'hidrante' },
    { x: 66000, kind: 'hidrante' },
    { x: 74000, kind: 'arco' },
    { x: 77000, kind: 'arco' },
    // v1.8.10 — deserto (ordenado global, janelas >= 3000px — pool de 4
    // aguenta; longe das arenas: Cerco trava aos ~144960, Faraó ~186960).
    // E1/E2: areia movediça — a lição nova (pular; nem o dash salva)
    { x: 92000, kind: 'movedica' },
    { x: 104000, kind: 'movedica' },
    { x: 112000, kind: 'movedica' },
    { x: 120000, kind: 'movedica' },
    // E3: caixotes do sítio — irmãos menores da caçamba (smash no dash)
    { x: 130000, kind: 'caixote' },
    { x: 136000, kind: 'caixote' },
    { x: 142000, kind: 'caixote' },
    // E4: flecheiras nas ruínas do Vale (timing na altura do corpo)
    { x: 152000, kind: 'flecheira' },
    { x: 158000, kind: 'flecheira' },
    { x: 164000, kind: 'flecheira' },
    // E5: o exame da Necrópole mistura os três tipos
    { x: 169000, kind: 'movedica' },
    { x: 172000, kind: 'flecheira' },
    { x: 175000, kind: 'caixote' },
    { x: 178000, kind: 'flecheira' },
  ];

  // Spawn por POSIÇÃO: quando o lookahead da câmera cruza a janela, o
  // próximo membro livre do pool é plantado ali. Recicla quem ficou para
  // trás. Pool de 4 cobre com folga: os pontos distam >= 3000px.
  updateHazards() {
    const spots = GameScene.HAZARD_SPOTS;
    const camX = this.cameras.main.scrollX;

    // recicla os que já ficaram para trás da tela
    this.hazards.forEach((hz) => {
      if (hz.active && hz.x < camX - 300) hz.deactivate();
    });

    const look = camX + 1280 + 600; // mesma folga de lookahead do spawn
    while (this.nextHazardIdx < spots.length && spots[this.nextHazardIdx].x <= look) {
      const spot = spots[this.nextHazardIdx];
      // Teleporte de debug pode pular janelas inteiras: as que já ficaram
      // para trás da câmera são simplesmente puladas
      if (spot.x < camX - 300) { this.nextHazardIdx++; continue; }
      const hz = this.hazards.find((h) => !h.active);
      if (!hz) break; // pool cheio: tenta no próximo frame
      hz.reset(spot.x, spot.kind);
      this.nextHazardIdx++;
    }
  }

  onTowerHit(rhino, tower) {
    if (this.gameOver || this.won) return;

    if (this.rhino.dashState === 'active' || this.furySystem.rampage) {
      // Dash derruba a torre — para de atirar na hora.
      // A investida volta NA HORA: até a v1.5 derrubar a torre custava o dash
      // (1s de cooldown, justo a janela da próxima parede) e não devolvia
      // nada — o jogador racional pulava os dardos e ignorava a torre, que
      // por isso respondia por 1% das mortes. Agora ela é uma OPORTUNIDADE:
      // derruba → dash de volta → quebra a parede logo à frente.
      this.audio.playBreak();
      this.createExplosion(tower.x, tower.y + 60);
      tower.deactivate();
      this.runTowersDowned++;
      this.addScore('tower', tower.x, tower.y + 60);
      this.rhino.resetDash();
      this.showToast('⚡ TORRE DERRUBADA!', { y: 250, size: 34, duration: 1200 });
    } else {
      if (this.invincible) return; // modo debug: atravessa sem morrer
      this.endGame(false, 'tower');
    }
  }

  onDartHit(rhino, dart) {
    if (this.gameOver || this.won) return;

    if (this.rhino.dashState === 'active' || this.furySystem.rampage) {
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
      // Tiro de boss conta como causa própria: fromBoss é a STRING da causa
      // ('boss'|'boss2'|'boss3', v1.8.5) — é o que separa "morreu em qual
      // luta" de "morreu de torre" no painel
      this.endGame(false, dart.fromBoss || 'dart');
    }
  }

  onWallHit(rhino, wall) {
    if (this.gameOver || this.won) return;
    if (wall.broken) return;

    const bounds = wall.getCrackBounds();
    // Rhino sprite origin is (0.5, 1): y is the bottom edge. RHINO_H (rig em
    // px de mundo) e não displayHeight: a escala VISUAL não pode alargar a
    // janela de alinhamento da fresta (gameplay invariante ao +15% da v1.8.1)
    const rhinoTop = rhino.y - Constants.RHINO_H;
    const rhinoBottom = rhino.y;

    const aligned = rhinoBottom > bounds.top && rhinoTop < bounds.bottom;
    const isDashing = this.rhino.dashState === 'active';

    // Em FÚRIA TOTAL a parede explode mesmo desalinhado da fresta — é a
    // invencibilidade que destrói (diferente do debug, que só atravessa)
    if (this.furySystem.rampage || (aligned && isDashing)) {
      wall.break();
      this.collapseWallTop(wall);
      this.runWallsBroken++;
      const crackCenterY = (bounds.top + bounds.bottom) / 2;
      this.addScore('wall', wall.x, crackCenterY);
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
    // O espinho sempre foi o único obstáculo 100% letal (nem o dash o
    // destrói). O rino em chamas é a exceção: pulveriza no contato.
    if (this.furySystem.rampage) {
      this.audio.playBreak();
      this.createExplosion(spike.x, spike.y);
      spike.deactivate();
      return;
    }
    if (this.invincible) return; // debug
    this.endGame(false, 'spike');
  }

  onAnimalHit(rhino, animal) {
    if (this.gameOver || this.won) return;
    if (animal.knockedOut) return;

    const isDashing = this.rhino.dashState === 'active';
    if (isDashing || this.furySystem.rampage) {
      animal.knockback();
      this.runAnimalsHit++;
      this.addScore('animal', animal.x, animal.y);
      this.audio.playSqueal();
      this.createExplosion(animal.x, animal.y);
    } else {
      if (this.invincible) return; // debug
      this.endGame(false, 'animal');
    }
  }

  // Dicas da abertura guiada, só nas primeiras corridas da vida do jogador.
  // Cada uma aparece ~600px antes do obstáculo do OPENING_SCRIPT que ela
  // explica — tempo de ler e agir a 300px/s.
  updateOpeningHints() {
    if (!this.showOpeningHints) return;
    const x = this.rhino.getSprite().x;
    const step = Constants.OPENING_SCRIPT[this.openingHintIndex];
    if (!step) { this.showOpeningHints = false; return; }
    if (x < step.x - 600) return;
    this.openingHintIndex++;
    if (step.hint) this.showToast(step.hint, { y: 210, size: 30, duration: 1800 });
  }

  // ---------------------------------------------------------------- terreno
  // A rampa não é um corpo de colisão — é terreno. Ver Ramp.js para o porquê
  // (uma escada de corpos estáticos trava o rino na lateral do degrau).
  // Chamado no update ANTES de rhino.update: o step de física já rodou (e já
  // limpou os flags), então o blocked.down escrito aqui sobrevive e é lido
  // corretamente por Rhino.update/onRightPress. Rhino.js não muda uma linha.
  updateTerrain() {
    const rb = this.rhino.getSprite().body;
    const ramp = this.spawnManager.getRampAt(rb.center.x);

    // Investida RASANTE destrói; investida já na subida só acelera a escalada.
    // Em FÚRIA TOTAL a mesma janela rasante vale sem precisar do dash.
    if (ramp && (this.rhino.dashState === 'active' || this.furySystem.rampage) &&
        rb.bottom > Constants.GROUND_TOP - Constants.RAMP_SMASH_MAX_H) {
      this.smashRamp(ramp);
      this.snapToTerrain(rb, null);
      return;
    }
    this.snapToTerrain(rb, ramp);

    // Trampolim: ao deixar a crista do penhasco, um impulso de verdade. Só a
    // queda daria ~106px de voo — pouco para se chamar trampolim. Dispara uma
    // única vez porque terrainRamp já foi zerado quando o teste passa.
    const prev = this.terrainRamp;
    this.terrainRamp = ramp && rb.blocked.down ? ramp : null;
    if (!this.terrainRamp && prev && prev.spec.launchV &&
        rb.center.x >= prev.exitX && rb.velocity.y >= 0) {
      rb.setVelocityY(prev.spec.launchV);
      this.audio.playJump();
    }

    // Inclinação na ladeira, puramente cosmética: o corpo Arcade ignora a
    // rotação do sprite (o AABB continua alinhado ao eixo) e a origem (0.5, 1)
    // faz o giro acontecer nos pés — o pivô certo. Teto de 0,35rad porque a
    // encosta do morro grande tem 30° e o rino deitado fica ridículo.
    const sprite = this.rhino.getSprite();
    const onRamp = ramp && rb.blocked.down;
    const sA = onRamp ? ramp.surfaceY(rb.center.x - 20) : null;
    const sB = onRamp ? ramp.surfaceY(rb.center.x + 20) : null;
    if (sA !== null && sB !== null) {
      sprite.setRotation(Phaser.Math.Clamp(Math.atan2(sB - sA, 40), -0.35, 0.35));
    } else if (sprite.rotation) {
      sprite.setRotation(Phaser.Math.Linear(sprite.rotation, 0, 0.25));
    }

    // O collider do chão é global e plano: sem isto o leão atravessa o morro
    // e passa POR BAIXO do rino elevado. Mesmo filtro do collider (createGround)
    this.spawnManager.getAnimalsGroup().children.entries.forEach((a) => {
      if (!a.active || a.knockedOut || a.isFlyer()) return;
      this.snapToTerrain(a.body, this.spawnManager.getRampAt(a.body.center.x));
    });
  }

  // Recebe o BODY (não a entidade) para servir rino e animais sem caso especial
  snapToTerrain(body, ramp) {
    if (!ramp) return;
    const surf = ramp.surfaceY(body.center.x); // center, não right: na crista
    if (surf === null) return;                 // a borda faria ele "flutuar"
    const dy = body.bottom - surf;             // > 0 = afundado no terreno
    if (dy < -Constants.RAMP_STICK_PX) return; // voando bem acima: ignora
    if (dy < 0 && body.velocity.y < 0) return; // subindo num pulo: deixa subir
    body.y = surf - body.height;               // postUpdate leva o sprite junto
    if (body.velocity.y > 0) body.setVelocityY(0);
    body.blocked.down = true;  body.blocked.none = false;
    body.touching.down = true; body.touching.none = false;
  }

  smashRamp(ramp) {
    if (ramp.destroyed) return;
    ramp.smash();
    this.runRampsSmashed++;
    const cx = ramp.x + Math.min(120, ramp.spanW / 2);
    this.addScore('ramp', cx, Constants.GROUND_TOP - 40);
    this.audio.playBreak();
    this.createExplosion(cx, Constants.GROUND_TOP - 40);
    this.createBreakParticles(cx, Constants.GROUND_TOP - 40);
    this.cameras.main.shake(160, 0.008);
  }

  // A rampa não tem corpo, então o debug de hitboxes do TuningPanel não
  // mostraria nada. Física invisível é física indepurável.
  drawTerrainDebug() {
    if (!this.terrainDebug) return;
    const g = this.terrainDebug;
    g.clear();
    if (!this.physics.world.drawDebug) return;
    g.lineStyle(2, 0x00ff88, 1);
    this.spawnManager.getRampsGroup().children.entries.forEach((r) => {
      if (!r.active || r.destroyed) return;
      const pts = [];
      for (let t = 0; t <= r.spanW; t += 8) pts.push({ x: r.x + t, y: r.surfaceY(r.x + t) });
      g.strokePoints(pts);
    });
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

    // Em FÚRIA TOTAL as explosões saem em cadeia — shake pleno em cada uma
    // (0.03 é forte) viraria enjoo: no modo, no máximo 1 tremida leve a cada
    // 300ms. Fora dele, comportamento de sempre.
    if (this.furySystem && this.furySystem.rampage) {
      if (this.time.now - (this.lastRampageShakeAt || 0) > 300) {
        this.lastRampageShakeAt = this.time.now;
        this.cameras.main.shake(120, 0.012);
      }
    } else {
      this.cameras.main.shake(150, 0.03);
    }
  }

  // v1.8: o topo da parede/prédio desaba quando o rino a quebra — um clone
  // da textura INTACTA, recortado do topo até o centro da fresta, tomba em
  // torno da própria base (o break() já escondeu essa faixa no sprite real
  // via setCrop). Tomba para a ESQUERDA (−x = ângulo NEGATIVO no Phaser),
  // contra o sentido da corrida — pedido do dono em 15/08.
  collapseWallTop(wall) {
    const cy = Constants.CRACK_HEIGHTS[wall.crackHeight.toUpperCase()] * wall.wallHeight;
    if (cy < 40) return; // nada relevante acima da fresta
    const piece = this.add.image(wall.x, wall.y + cy, `cracked-${wall.crackHeight}${wall.skin}`)
      // Origem em fração do FRAME de 720px (não do recorte): pivô na base do
      // pedaço, senão o tombo giraria em raio de parede inteira
      .setOrigin(0.5, cy / wall.wallHeight)
      .setCrop(0, 0, 100, cy)
      .setDepth(wall.depth);
    wall.topPiece = piece;
    this.tweens.add({
      targets: piece,
      angle: Phaser.Math.Between(-96, -78),
      y: piece.y + 30,
      alpha: 0,
      duration: 900, // mesmo tempo do tombo do caçador (HunterSniper.defeat)
      ease: 'Quad.easeIn',
      onComplete: () => {
        if (wall.topPiece === piece) wall.topPiece = null;
        piece.destroy();
      },
    });
    // Esfarelamento: duas levas curtas na linha de ruptura, escalonadas para
    // acompanhar o tombo sem dobrar o pico de partículas da quebra
    for (const ms of [180, 420]) {
      this.time.delayedCall(ms, () => {
        if (piece.active) this.createBreakParticles(wall.x, wall.y + cy, 5);
      });
    }
  }

  createBreakParticles(x, y, count = 10) {
    for (let i = 0; i < count; i++) {
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
    // Fator > 1: o primeiro plano passa MAIS RÁPIDO que o rino
    this.bgFg.tilePositionX = this.cameras.main.scrollX * 1.5;
    if (this.bgCars.alpha > 0.001) {
      this.bgCars.tilePositionX = this.cameras.main.scrollX * 0.55;
    }

    this.updateAtmosphere(time, delta);

    // ANTES do rhino.update: o step de física já rodou e limpou os flags, então
    // o blocked.down escrito pelo terreno chega intacto em quem o lê
    this.updateTerrain();
    this.drawTerrainDebug();
    this.updateOpeningHints();
    this.updateTrackMarks();
    this.updatePortals();
    this.updateHazards();

    this.rhino.update(time, delta);

    // Wind streaks while dashing (e durante a FÚRIA TOTAL — rastro contínuo)
    if (this.rhino.dashState === 'active' || this.furySystem.rampage) {
      const sprite = this.rhino.getSprite();
      // faixa do rastro acompanha a escala visual (senão o lombo fica sem vento)
      const k = sprite.scaleX * Constants.ART_RASTER_SCALE;
      for (let i = 0; i < 3; i++) {
        this.windEmitter.emitParticleAt(
          sprite.x - Phaser.Math.Between(20 * k, 60 * k),
          sprite.y - Phaser.Math.Between(8 * k, 56 * k)
        );
      }
    }
    this.furySystem.update(this.rhino, delta);
    // v1.7: a música segue a CARGA (não mais a posição); no rampage trava no teto
    this.audio.setIntensity(this.furySystem.getIntensityRatio());
    // A luta do portão (v1.7): banda de contato, clamp, quique, caçador.
    // Depois do furySystem (que fixa a velocidade do frame) e antes do
    // spawnManager (a câmera travada da luta é o que suprime spawns).
    for (const bf of this.bossFights) bf.update(time, delta);
    // Animais leem o multiplicador do tier vigente por frame (padrão live)
    Constants.TIER_STATE.animalSpeedMult =
      Constants.getTierFor(this.rhino.getSprite().x).animalSpeedMult;
    this.spawnManager.update(this.cameras.main);
    this.updateDashIcon();

    this.updateScoreDisplay();

    // Portão dos 1000m (1x por corrida): cruza SEM PARAR — a fuga conta na
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

  // Cruzou os 1000m: NÃO para a corrida (parar ali quebraria o ritmo — regra
  // da v1.4). Cruzar JÁ é a fuga — conta win/medalha/stats — e o modo infinito
  // começa na mesma passada; a vitória formal fica para o fim do mundo.
  //
  // Até a v1.5 isto era só um toast dourado: a cutscene de fogos e confete só
  // rodava no fim do mundo (10.000m), que nenhum jogador jamais viu. Agora o
  // clímax acontece onde o jogador chega.
  crossGate() {
    // v1.7: quem chama normalmente é o BossFight.defeat() (a vitória é a 3ª
    // camada, não a linha de x). Setar aqui cobre os dois caminhos e impede
    // o gatilho legado do update de disparar uma segunda festa.
    this.gateReached = true;

    const fill = document.getElementById('progress-fill');
    fill.style.width = '100%';
    fill.classList.add('infinite');
    document.getElementById('progress-infinity').hidden = false;
    this.progressInfinite = true;

    this.escaped = true;
    this.winCounted = true;
    StorageManager.addWin();
    // garante a fuga no servidor mesmo se o jogador fechar a aba
    this.safeTelemetry(() => StatsSystem.send());

    // O PORTÃO EXPLODE. A câmera segue o rino com offset -200, então tanto ele
    // quanto o portão estão em x=440 da tela neste frame: o estouro acontece
    // exatamente em cima da ação.
    const gx = Constants.WIN_DISTANCE_PX;
    if (this.gateSprite) this.gateSprite.setTexture('zoo-gate-broken');
    this.createExplosion(gx, Constants.GROUND_TOP - 110);
    this.createBreakParticles(gx, Constants.GROUND_TOP - 110);
    this.createBreakParticles(gx - 70, Constants.GROUND_TOP - 40);
    this.createBreakParticles(gx + 70, Constants.GROUND_TOP - 70);
    this.cameras.main.shake(320, 0.014);
    this.audio.playBreak();
    this.audio.playFanfare();

    const flash = this.add.rectangle(640, 360, 1280, 720, 0xffffff)
      .setScrollFactor(0).setDepth(50).setAlpha(0.55);
    this.tweens.add({
      targets: flash, alpha: 0, duration: 420,
      onComplete: () => flash.destroy(),
    });

    this.launchConfetti(2800);
    this.launchFireworks([260, 700, 1080, 1460, 1880, 2300]);

    this.showToast('🗽 VOCÊ ESCAPOU!');
    // O 2º aviso deixa explícito que o jogo NÃO acabou — ele continua
    this.time.delayedCall(1500, () => {
      if (this.gameOver) return;
      this.showToast('∞ MODO INFINITO', { y: 250, size: 34, color: '#ffe9a8', duration: 2000 });
    });

    // v1.8: a Catisquick sai na festa do portão (depois dos 2 toasts da fuga)
    const newSkins = this.maybeUnlockSkins();
    if (newSkins.length) {
      this.time.delayedCall(3600, () => {
        if (this.gameOver) return;
        this.showToast(`🎨 SKIN NOVA: ${newSkins[0].name}!`,
          { y: 250, size: 34, color: '#ffd23f', duration: 2500 });
        this.audio.playFanfare();
      });
    }
  }

  // v1.8.7 — a MURALHA caiu (2000m): a corrida CONTINUA. Nada de crossGate
  // nem gameOver aqui — a barricada de viaturas DESABA PARA A ESQUERDA
  // (padrão v1.8: contra o sentido da corrida), os holofotes apagam em
  // flashes decrescentes (os feixes de verdade vivem assados nas texturas do
  // fundo — inacessíveis, então a queda de luz é encenada na tela) e a
  // Brecha amanhece pelo ciclo de céu vigente. A medalha sai no endGame.
  defeatMuralha() {
    const gx = Constants.BOSS2_ANCHOR_PX;

    // O tombo: um clone da textura ATUAL gira sobre a própria base para a
    // esquerda enquanto o sprite real já vira o estado destruído (mesmo
    // truque do collapseWallTop — o BossFight deixou o sprite em
    // muralha-gate-1 quando a última camada caiu)
    if (this.boss2Sprite) {
      const piece = this.add.image(gx, Constants.GROUND_TOP, this.boss2Sprite.texture.key)
        .setOrigin(0.5, 1).setDepth(this.boss2Sprite.depth);
      this.boss2Sprite.setTexture('muralha-gate-broken');
      this.tweens.add({
        targets: piece,
        angle: Phaser.Math.Between(-96, -78),
        y: piece.y + 30,
        alpha: 0,
        duration: 900, // mesmo tempo do tombo do caçador/parede
        ease: 'Quad.easeIn',
        onComplete: () => piece.destroy(),
      });
    }

    this.createExplosion(gx, Constants.GROUND_TOP - 110);
    this.createBreakParticles(gx, Constants.GROUND_TOP - 110);
    this.createBreakParticles(gx - 70, Constants.GROUND_TOP - 40);
    this.createBreakParticles(gx + 70, Constants.GROUND_TOP - 70);
    this.cameras.main.shake(320, 0.014);
    // O prêmio da vitória nasce na barricada (o breakdown recomputa a MESMA
    // regra a partir de e >= 4 — nada é somado duas vezes)
    this.addScore('boss2', gx - 80, 300);
    this.audio.playBreak();
    this.audio.playFanfare();

    // Holofotes apagando um a um: 3 flashes de luz fria cada vez mais
    // fracos, escalonados — a leitura de "a operação desligou"
    [[300, 0.28], [800, 0.16], [1300, 0.08]].forEach(([ms, a]) => {
      this.time.delayedCall(ms, () => {
        if (this.gameOver) return;
        const glow = this.add.rectangle(640, 360, 1280, 720, 0xfff3c4)
          .setScrollFactor(0).setDepth(50).setAlpha(a);
        this.tweens.add({
          targets: glow, alpha: 0, duration: 380,
          onComplete: () => glow.destroy(),
        });
      });
    });

    this.showToast('🚧 A MURALHA CAIU!');
    // O 2º aviso deixa explícito que a pista abriu — padrão do crossGate
    this.time.delayedCall(1500, () => {
      if (this.gameOver) return;
      this.showToast('🌅 A BRECHA ESTÁ ABERTA!', { y: 250, size: 34, color: '#ffe9a8', duration: 2000 });
    });
  }

  // v1.8.10 — a BARREIRA DA ESCAVAÇÃO caiu (3650m): molde do defeatMuralha.
  // A corrida CONTINUA — a pilha de sacos de areia/andaime desaba para a
  // ESQUERDA (contra o sentido da corrida, padrão v1.8) e o Vale espera.
  // O +150 nasce ao vivo (pointsFor 'cerco'); o breakdown recomputa a MESMA
  // regra a partir de u >= 4 — nada é somado duas vezes.
  defeatCerco() {
    const gx = Constants.CERCO_ANCHOR_PX;

    if (this.cercoSprite) {
      const piece = this.add.image(gx, Constants.GROUND_TOP, this.cercoSprite.texture.key)
        .setOrigin(0.5, 1).setDepth(this.cercoSprite.depth);
      this.cercoSprite.setTexture('cerco-gate-broken');
      this.tweens.add({
        targets: piece,
        angle: Phaser.Math.Between(-96, -78),
        y: piece.y + 30,
        alpha: 0,
        duration: 900, // mesmo tempo do tombo do caçador/parede
        ease: 'Quad.easeIn',
        onComplete: () => piece.destroy(),
      });
    }

    this.createExplosion(gx, Constants.GROUND_TOP - 110);
    this.createBreakParticles(gx, Constants.GROUND_TOP - 110);
    this.createBreakParticles(gx - 70, Constants.GROUND_TOP - 40);
    this.createBreakParticles(gx + 70, Constants.GROUND_TOP - 70);
    this.cameras.main.shake(320, 0.014);
    this.addScore('cerco', gx - 80, 300);
    this.audio.playBreak();
    this.audio.playFanfare();

    this.showToast('🕸️ A BARREIRA CAIU!');
    // O 2º aviso deixa explícito que a pista abriu — padrão do crossGate
    this.time.delayedCall(1500, () => {
      if (this.gameOver) return;
      this.showToast('🔺 O VALE DOS FARAÓS ESPERA!', { y: 250, size: 34, color: '#ffe9a8', duration: 2000 });
    });
  }

  // v1.8.10 — o FARAÓ DE BRONZE caiu (4700m): a muralha de arenito desaba
  // para a esquerda e a TEMPESTADE DE AREIA ABRE — encenada como flashes
  // cor-de-areia DECRESCENTES (o clima roteirizado do corredor pós-boss já
  // é limpo; aqui é só a dramaturgia da abertura, molde dos holofotes da
  // Muralha). +250 ao vivo (pointsFor 'farao'); breakdown recomputa y >= 5.
  defeatFarao() {
    const gx = Constants.FARAO_ANCHOR_PX;

    if (this.faraoSprite) {
      const piece = this.add.image(gx, Constants.GROUND_TOP, this.faraoSprite.texture.key)
        .setOrigin(0.5, 1).setDepth(this.faraoSprite.depth);
      this.faraoSprite.setTexture('farao-gate-broken');
      this.tweens.add({
        targets: piece,
        angle: Phaser.Math.Between(-96, -78),
        y: piece.y + 30,
        alpha: 0,
        duration: 900,
        ease: 'Quad.easeIn',
        onComplete: () => piece.destroy(),
      });
    }

    this.createExplosion(gx, Constants.GROUND_TOP - 110);
    this.createBreakParticles(gx, Constants.GROUND_TOP - 110);
    this.createBreakParticles(gx - 70, Constants.GROUND_TOP - 40);
    this.createBreakParticles(gx + 70, Constants.GROUND_TOP - 70);
    this.cameras.main.shake(320, 0.014);
    this.addScore('farao', gx - 80, 300);
    this.audio.playBreak();
    this.audio.playFanfare();

    // A tempestade abrindo: véus de areia cada vez mais fracos (flash
    // decrescente cor-de-areia — a leitura de "o ar limpou")
    [[300, 0.3], [800, 0.18], [1300, 0.09]].forEach(([ms, a]) => {
      this.time.delayedCall(ms, () => {
        if (this.gameOver) return;
        const veil = this.add.rectangle(640, 360, 1280, 720, 0xe8c98a)
          .setScrollFactor(0).setDepth(50).setAlpha(a);
        this.tweens.add({
          targets: veil, alpha: 0, duration: 380,
          onComplete: () => veil.destroy(),
        });
      });
    });

    this.showToast('🏺 O FARAÓ CAIU!');
    this.time.delayedCall(1500, () => {
      if (this.gameOver) return;
      this.showToast('🏜️ A TEMPESTADE ABRIU — O DESERTO PROFUNDO!', { y: 250, size: 32, color: '#ffe9a8', duration: 2000 });
    });
  }

  // Confete em coordenadas de tela. Usado pela fuga (1000m) e pela cutscene
  // de LENDA (fim do mundo).
  launchConfetti(durationMs) {
    if (this.confettiEmitter) this.confettiEmitter.destroy();
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
    const t = this.time.delayedCall(durationMs, () => {
      if (this.confettiEmitter) this.confettiEmitter.stop();
    });
    this.cutsceneTimers.push(t);
    return this.confettiEmitter;
  }

  // Flashes coloridos no alto, escalonados (sem debris nem shake)
  launchFireworks(delays) {
    const tints = [0xff5555, 0xffd94a, 0x4ecdc4, 0xbb77ff, 0x6aae3a, 0xff9944];
    delays.forEach((delay, i) => {
      this.cutsceneTimers.push(this.time.delayedCall(delay, () => {
        const fx = this.add.image(
          Phaser.Math.Between(200, Constants.GAME_WIDTH - 200),
          Phaser.Math.Between(80, 300),
          'explosion-flash'
        ).setScrollFactor(0).setDepth(151).setScale(0.5).setTint(tints[i % tints.length]);
        this.cutsceneTweens.push(this.tweens.add({
          targets: fx,
          scale: 3,
          alpha: 0,
          duration: 500,
          ease: 'Cubic.easeOut',
          onComplete: () => fx.destroy(),
        }));
      }));
    });
  }

  // Aviso rápido fixo na tela, sem modal: a corrida nunca espera o jogador
  showToast(text, { y = 300, size = 44, color = '#ffd700', duration = 2200 } = {}) {
    const toast = this.add.text(640, y, text, {
      fontFamily: '"Arial Black", Arial, sans-serif',
      fontSize: `${size}px`,
      color,
      stroke: '#5e3618',
      strokeThickness: 7,
      align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(60);
    this.tweens.add({
      targets: toast,
      y: y - 70,
      alpha: 0,
      duration,
      ease: 'Cubic.easeOut',
      onComplete: () => toast.destroy(),
    });
    return toast;
  }

  // v1.8.4: uma façanha vale pontos. Chamado ao lado do contador que já
  // existia para cada evento — a física não sabe de pontuação.
  addScore(evt, x, y) {
    const pts = ScoreSystem.pointsFor(evt);
    if (!pts) return;
    this.runBonus += pts;
    this.showScoreGain(x, y, pts);
  }

  // O "+N" dourado sobe do LUGAR da façanha (ancorado no mundo, ao contrário
  // do showToast, que é fixo na tela com scrollFactor 0).
  showScoreGain(x, y, pts) {
    // Ganhos em rajada empilham para cima; o degrau decai sozinho em 600ms
    const now = this.time.now;
    this.gainStack = now - this.lastGainAt < 600 ? this.gainStack + 1 : 0;
    this.lastGainAt = now;
    const gy = y - this.gainStack * 34;

    const label = this.add.text(x, gy, `+${pts}`, {
      fontFamily: '"Arial Black", Arial, sans-serif',
      fontSize: '28px',
      color: '#ffd700',
      stroke: '#5e3618',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(60);
    // Sobe com desaceleração, mas o APAGAR é adiado de propósito: com o alpha
    // no mesmo Cubic.easeOut o "+N" já estava quase invisível aos 200ms — o
    // prêmio precisa ser LIDO antes de sumir. 250ms de leitura + fade curto.
    this.tweens.add({
      targets: label,
      y: gy - 40,
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy(),
    });
    this.tweens.add({
      targets: label,
      alpha: 0,
      delay: 250,
      duration: 450,
      ease: 'Quad.easeIn',
    });
    return label;
  }

  updateScoreDisplay() {
    // v1.8.4: a linha em destaque é a PONTUAÇÃO (metros + bônus da corrida);
    // os metros seguem logo abaixo, discretos. Barra e ∞ não mudam — são
    // físicos (x / WIN_DISTANCE_PX).
    const meters = this.rhino.getDistance();
    document.getElementById('score').textContent =
      ScoreSystem.fmtPts(ScoreSystem.total(meters, this.runBonus));
    document.getElementById('score-m').textContent = meters;
    document.getElementById('record').textContent =
      ScoreSystem.fmtPts(StorageManager.getRecordPts());

    // Barra de progresso da fuga (0–1000m; as marcas são as trocas de bioma).
    // Pós-portão ela já ficou dourada com ∞ (ver crossGate) — não mexe mais.
    if (!this.gateReached) {
      const pct = Math.min(100, (this.rhino.getSprite().x / Constants.WIN_DISTANCE_PX) * 100);
      document.getElementById('progress-fill').style.width = `${pct}%`;
    }
  }

  // cause: 'wall' | 'spike' | 'animal' | 'dart' | 'tower' | 'fall' |
  //        'boss' | 'boss2' | 'boss3' | 'cerco' | 'farao' (só derrotas)
  endGame(won, cause = null) {
    if (this.gameOver) return; // reentrada dobraria mortes/envios
    this.gameOver = true;
    this.won = won;
    this.deathCause = cause;
    // Todo tiro de boss é tranquilizante (ninguém morre neste jogo): o fim
    // por qualquer um deles segue o fluxo do sono — a rede do Cerco e a luz
    // do Faraó também adormecem, só o título do overlay muda
    const tranqCause = cause === 'dart' || cause === 'boss' ||
      cause === 'boss2' || cause === 'boss3' ||
      cause === 'cerco' || cause === 'farao';
    this.physics.pause();

    this.audio.stopMusic();
    if (won) this.audio.playFanfare();
    else this.audio.playDeathSting();

    const distance = this.rhino.getDistance();
    // v1.8.4: pontuação composta = metros + bônus das façanhas. Os METROS
    // seguem sendo a marca física (medalhas, skins, estacas da pista).
    const bossFightS = Math.round((this.bossFight ? this.bossFight.fightMs : 0) / 1000);
    // v1.8.5: duração da luta do Cerco (letra `h` do runs[])
    const boss2FightS = Math.round((this.boss2Fight ? this.boss2Fight.fightMs : 0) / 1000);
    const escaped = won || distance >= (Constants.WIN_DISTANCE_PX / Constants.PIXELS_PER_METER);
    const bonus = this.runBonus + ScoreSystem.endBonus({
      escaped, bossLayers: this.runBossLayers, bossFightS, legend: !!this.legend,
    });
    const total = ScoreSystem.total(distance, bonus);
    const isNewRecord = StorageManager.isNewRecord(distance);
    // Antes do saveRecord, senão "tinha recorde anterior" seria sempre true
    const hadPreviousRecord = StorageManager.getRecord() > 0;
    StorageManager.saveRecord(distance);
    StorageManager.saveRecordPts(total); // recorde de PONTOS, em paralelo
    this.finalDistance = distance; // usado pelo botão Compartilhar (metros)
    this.finalTotal = total;
    this.finalIsRecord = isNewRecord; // idem — depois do saveRecord seria tarde

    // Detalhamento mostrado sob a distância nos dois overlays. O `blitz`
    // chega resolvido ao breakdown, com a MESMA regra que o endBonus aplica
    // por dentro (todas as camadas do portão em até SCORE_BLITZ_MAX_S) —
    // senão a lista contaria um bônus que o total não tem.
    const blitz = this.runBossLayers >= Constants.BOSS_LAYERS.length &&
      bossFightS > 0 && bossFightS <= Constants.SCORE_BLITZ_MAX_S;
    const detail = ScoreSystem.breakdown({
      meters: distance, walls: this.runWallsBroken, ramps: this.runRampsSmashed,
      towers: this.runTowersDowned, animals: this.runAnimalsHit,
      bossLayers: this.runBossLayers,
      // v1.8.5: as camadas dos bosses novos pontuaram AO VIVO (addScore
      // 'bossLayer' no breakLayer genérico; a vitória do Cerco, no
      // defeatMuralha) — aqui elas só viram LINHAS do detalhamento
      boss2Layers: this.runBoss2Layers, boss3Layers: this.runBoss3Layers,
      // v1.8.10: idem para os combates do deserto (vitórias ao vivo nos
      // defeatCerco/defeatFarao; aqui só as LINHAS do detalhamento)
      cercoLayers: this.runCercoLayers, faraoLayers: this.runFaraoLayers,
      escaped, blitz, legend: !!this.legend,
    });
    const ptsId = won ? 'win-final-points' : 'final-points';
    const brkId = won ? 'win-final-breakdown' : 'final-breakdown';
    // O número em destaque é o `total` que foi SALVO e enviado, nunca o
    // detail.total: as duas contas batem por construção (cada contador tem
    // um addScore ao lado), mas quem manda é o que foi para o ranking. O
    // bônus exibido é o que sobreviveu ao teto (total − metros), para a
    // linha fechar a conta na tela mesmo quando o SCORE_BONUS_CAP corta.
    document.getElementById(ptsId).textContent =
      `🏆 ${ScoreSystem.fmtPts(total)} — ${distance} m + ${Math.max(0, total - distance)} de bônus`;
    document.getElementById(brkId).textContent =
      detail.lines.map((l) => `${l.label} +${l.pts}`).join('\n');

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
        // Todo tiro de boss é tranquilizante (ninguém mata o rino); Muralha,
        // Barreira e Faraó detêm em nome próprio — mesmo sono, título próprio
        cause === 'boss2' ? 'DETIDO NA MURALHA! 🚧'
          : cause === 'cerco' ? 'CAPTURADO NA BARREIRA! 🕸️'
            : cause === 'farao' ? 'DETIDO PELO FARAÓ! 🏺'
              : tranqCause ? 'TRANQUILIZADO! 💤' : 'GAME OVER';
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
      rampsSmashed: this.runRampsSmashed, towersDowned: this.runTowersDowned,
      // v1.8.5: Fura-Bloqueio (Cerco vencido) e Lenda do Mundo (Guardião)
      boss2Layers: this.runBoss2Layers, legend: !!this.legend,
      // v1.8.10: a Barreira (boss2_win re-batizada: cercoLayers >= 4) e o
      // Quebra-Faraó (faraoLayers >= 5) — critérios no MedalSystem
      cercoLayers: this.runCercoLayers, faraoLayers: this.runFaraoLayers,
    });
    if (newMedals.length) {
      const id = won ? 'win-medal-message' : 'medal-message';
      document.getElementById(id).textContent =
        '🏅 Medalha nova: ' + newMedals.map((m) => `${m.emoji} ${m.name}`).join(' · ');
      if (!won) this.audio.playFanfare(); // na vitória a fanfarra já tocou acima
    }

    // v1.8: rede de segurança da Catisquick (caso raro: a 5ª torre caiu só
    // no modo infinito, depois do crossGate) + anúncio na tela de fim
    this.maybeUnlockSkins();
    if (this.runSkinUnlocked) {
      const id = won ? 'win-medal-message' : 'medal-message';
      const el = document.getElementById(id);
      const line = `🎨 Skin nova: ${this.runSkinUnlocked.name}!`;
      el.textContent = el.textContent ? `${el.textContent} · ${line}` : line;
    }

    // v1.8.4: o ranking mundial passa a ser por PONTOS (os metros viajam
    // junto, para as estacas da pista de quem te tem como rival)
    if (LeaderboardSystem.shouldSubmit(total)) {
      this.submitScore(total, distance); // fire-and-forget: rede nunca trava o fim de jogo
    }

    // Telemetria: acumula os totais locais e espelha no Firestore
    // Desconta o tempo pausado: runS é relógio de parede, então sem isto uma
    // pausa (ou a aba escondida) entraria inteira no playTimeS
    const paused = this.pausedMs + (this.paused ? Date.now() - this.pauseStartedAt : 0);
    const runS = Math.min(7200, Math.max(0,
      Math.round((Date.now() - (this.runStartedAt || Date.now()) - paused) / 1000)));
    StorageManager.addPlayTimeS(runS);
    // Histórico das últimas 50 execuções: duração, desfecho e — a partir da
    // v1.6.1 — as MECÂNICAS usadas. Os quatro primeiros contadores já eram
    // mantidos para julgar medalha e eram jogados fora aqui.
    StorageManager.addRun(distance, runS, won ? 'win' : (cause || 'wall'), {
      wallsBroken: this.runWallsBroken,
      rampsSmashed: this.runRampsSmashed,
      towersDowned: this.runTowersDowned,
      animalsHit: this.runAnimalsHit,
      jumps: this.runJumps,
      dashes: this.runDashes,
      dashesWasted: this.runDashWasted,
      pauses: this.runPauses,
      specialsUsed: this.runSpecials,
      furyDeniedBoss: this.runFuryDenied,
      bossLayersBroken: this.runBossLayers,
      bossBounces: this.runBossBounces,
      bossFightS: Math.round((this.bossFight ? this.bossFight.fightMs : 0) / 1000),
      // v1.8.5: os bosses novos (letras e/h/l do RUN_COUNTERS)
      boss2LayersBroken: this.runBoss2Layers,
      boss2FightS,
      boss3LayersBroken: this.runBoss3Layers,
      // v1.8.10: os combates do deserto (letras u/y do RUN_COUNTERS — agente
      // A; sem letras de segundos, precedente do boss3)
      cercoLayersBroken: this.runCercoLayers,
      faraoLayersBroken: this.runFaraoLayers,
      keyboard: this.usedKeyboard,
      version: Constants.VERSION,
      skin: this.skin ? this.skin.id : 'default',
    });
    if (won && !this.winCounted) StorageManager.addWin(); // o portão já contou
    // Skins por totais de vida: avaliadas DEPOIS de addAnimalsHit/addWin
    // contarem esta corrida (attempts já entrou no startRun)
    const totalSkins = SkinSystem.evaluateTotals();
    if (totalSkins.length) {
      const msgId = won ? 'win-medal-message' : 'medal-message';
      const msgEl = document.getElementById(msgId);
      const line = `🎨 Skin nova: ${totalSkins.map((s) => s.name).join(' · ')}!`;
      msgEl.textContent = msgEl.textContent ? `${msgEl.textContent} · ${line}` : line;
    }
    if (!won) StorageManager.addDeath(Constants.getTierIndex(this.rhino.getSprite().x), cause || 'wall');
    // Acumula aparelho/local/versão desta corrida ANTES do envio (o send
    // roda várias vezes por sessão; o recordRun, uma por corrida)
    this.safeTelemetry(() => StatsSystem.recordRun(distance).then(() => StatsSystem.send()));
    // Acumula no resumo da sessão (o push sai na saída ou no tempo configurado)
    this.safeTelemetry(() => NotifySystem.noteRun({
      meters: distance, cause: won ? 'win' : (cause || 'wall'), escaped: this.escaped,
    }));

    // Nº da corrida que acabou de terminar (o addAttempt do startRun já contou)
    const attemptId = won ? 'win-attempt-message' : 'attempt-message';
    document.getElementById(attemptId).textContent =
      `Tentativa nº ${StorageManager.getAttempts()}`;

    if (won) {
      this.playVictoryCutscene();
    } else if (tranqCause) {
      this.playTranqSleep();
      this.time.delayedCall(600, () => this.showEndOverlay());
    } else {
      this.showEndOverlay();
    }
  }

  // Comemoração da fuga (~4s, pulável com 1 toque). Física pausada — a
  // coreografia roda só em tweens/timers/particles, que continuam vivos.
  playVictoryCutscene() {
    // NÃO zerar os arrays: os timers da festa do portão podem estar vivos
    const sprite = this.rhino.getSprite();
    sprite.anims.pause();

    // Skip: o handler normal de input early-returna com won=true
    this.cutsceneSkip = () => this.endVictoryCutscene();
    this.input.once('pointerdown', this.cutsceneSkip);

    // Freada: poeira nos pés
    for (let i = 0; i < 8; i++) {
      const p = this.add.image(
        sprite.x - Phaser.Math.Between(0, 50),
        Constants.GROUND_TOP + Phaser.Math.Between(-6, 4),
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
    // Squash & stretch RELATIVO à escala base do sprite (que é k/2 por causa
    // do supersampling) — com valores absolutos o rino inflava ~2.2x na festa
    this.cutsceneTweens.push(this.tweens.add({
      targets: sprite,
      scaleY: sprite.scaleY * 1.12,
      scaleX: sprite.scaleX * 0.92,
      duration: 280,
      yoyo: true,
      repeat: 2,
      ease: 'Quad.easeOut',
    }));

    this.launchConfetti(2500);
    this.launchFireworks([600, 1100, 1500, 1900, 2300]);

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
